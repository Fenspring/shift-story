import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WEEKLY_QUESTION } from "@/lib/cycle-policy";
import { ensureToken } from "@/lib/cycles/actions";
import { renderQrSvg, responseUrl } from "@/lib/cycles/qr";
import { requireManager } from "@/lib/auth/session";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Print", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PosterPage({ params }: Props) {
  await requireManager();
  const { id } = await params;

  const supabase = createClient(await cookies());
  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("id", id)
    .single<{ id: string; name: string }>();

  if (!unit) notFound();

  const token = await ensureToken(unit.id);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || `${proto}://${host}`;
  const url = responseUrl(origin, token);
  const qr = await renderQrSvg(url);

  return (
    <>
      {/* Printed on a ward printer onto white paper: force the light palette
          and drop the app chrome, rather than burning a page of toner on the
          product's ink-dark ground. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <div className="no-print border-hairline flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <Link href={`/app/units/${unit.id}`} className="text-dim hover:text-teal text-[13px] no-underline">
          ← {unit.name}
        </Link>
        <p className="text-dim m-0 text-[13px]">Print this and put it where your team stands.</p>
      </div>

      <div className="mx-auto flex max-w-[760px] flex-col items-center gap-10 bg-[#F3EFE7] px-10 py-16 text-center text-[#0B1118] print:max-w-none print:px-0">
        <p className="m-0 font-mono text-[11px] tracking-[0.16em] text-[#8a6a3f] uppercase">
          Anonymous · takes under a minute
        </p>

        <h1 className="font-display m-0 max-w-[18ch] text-[clamp(30px,5vw,46px)] leading-[1.2] font-medium text-balance italic">
          &ldquo;{WEEKLY_QUESTION}&rdquo;
        </h1>

        <div
          className="h-[260px] w-[260px] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />

        <div className="flex flex-col gap-2">
          <p className="m-0 text-[16px] font-semibold">Scan with your phone camera</p>
          <p className="m-0 font-mono text-[12px] break-all text-[#3a3530]">{url}</p>
        </div>

        <div className="flex max-w-[46ch] flex-col gap-2 border-t border-[rgb(11_17_24/0.15)] pt-6">
          <p className="m-0 text-[14px] leading-[1.6] text-[#3a3530]">
            No name, no login. Your manager sees a count while the week is open —
            never who answered, never any single answer.
          </p>
          <p className="m-0 text-[13px] leading-[1.6] text-[#5c554c]">
            Not for safety events or anything involving a patient — use your
            existing incident channel for those.
          </p>
        </div>

        <p className="m-0 font-display text-[15px] text-[#8a6a3f]">
          {unit.name} · Shift Story
        </p>
      </div>
    </>
  );
}
