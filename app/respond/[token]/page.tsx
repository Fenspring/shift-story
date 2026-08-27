import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ResponseForm } from "@/components/respond/ResponseForm";
import { respondedCookieName } from "@/lib/cycles/cookie";
import { hashResponseToken } from "@/lib/cycles/tokens";
import { isCollecting } from "@/lib/cycles/queries";
import { createAdminClient } from "@/utils/supabase/admin";

// Staff must never land on a cached page — whether a unit is collecting, and
// which cycle is current, changes week to week.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shift Story",
  // Nothing here should ever surface in search results.
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[clamp(20px,6vw,40px)] py-14">
      <div className="flex w-full max-w-[560px] flex-col gap-8">{children}</div>
    </div>
  );
}

function Closed({ headline, detail }: { headline: string; detail: string }) {
  return (
    <Shell>
      <p className="text-bone font-display m-0 text-[21px] font-medium">Shift Story</p>
      <div className="border-hairline rounded-sharp flex flex-col gap-3 border p-7">
        <p className="text-bone font-display m-0 text-[20px]">{headline}</p>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">{detail}</p>
      </div>
    </Shell>
  );
}

export default async function RespondPage({ params }: Props) {
  const { token } = await params;

  try {
    return await RespondContent({ token });
  } catch (err) {
    // The one page a nurse reaches by scanning a poster. A stack trace here
    // costs the product its credibility with the person it most needs to
    // trust it, so misconfiguration and outages read as "come back later"
    // while still being loud in the logs.
    console.error("[respond] page failed:", err);
    return (
      <Closed
        headline="This isn't loading right now."
        detail="Something on our end is having trouble. Please try again in a few minutes — nothing you typed was lost, because nothing was sent."
      />
    );
  }
}

async function RespondContent({ token }: { token: string }) {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("response_tokens")
    .select("unit_id, units(name)")
    .eq("token_hash", hashResponseToken(token))
    .is("revoked_at", null)
    .maybeSingle<{ unit_id: string; units: { name: string } | null }>();

  if (!tokenRow) {
    return (
      <Closed
        headline="This link is no longer active."
        detail="Your unit may have a new code. Ask your manager for the current one."
      />
    );
  }

  const { data: cycle } = await admin
    .from("cycles")
    .select("id, question, closes_at, status")
    .eq("unit_id", tokenRow.unit_id)
    .eq("status", "open")
    .maybeSingle<{ id: string; question: string; closes_at: string; status: "open" }>();

  if (!cycle || !isCollecting(cycle)) {
    return (
      <Closed
        headline="Nothing to answer right now."
        detail="This week's question has closed, or hasn't opened yet. Check back after the weekend."
      />
    );
  }

  const cookieStore = await cookies();
  const alreadyResponded = cookieStore.has(respondedCookieName(cycle.id));

  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <p className="text-bone font-display m-0 text-[21px] font-medium">Shift Story</p>
        <p className="text-dim m-0 text-[13px]">{tokenRow.units?.name ?? "Your unit"}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-bone font-display m-0 text-[clamp(23px,4.5vw,30px)] leading-[1.3] font-normal italic">
          &ldquo;{cycle.question}&rdquo;
        </h1>
        <p className="text-secondary m-0 text-[15px] leading-[1.65]">
          Takes under a minute. No name, no login, no way to trace it back to you.
        </p>
      </div>

      <div className="rounded-sharp border border-[rgb(242_166_90/0.35)] bg-[rgb(242_166_90/0.07)] p-5">
        <p className="text-amber m-0 mb-2 text-[11px] tracking-[0.14em] uppercase">
          Before you write
        </p>
        <p className="text-secondary m-0 text-[14.5px] leading-[1.6]">
          Please do not include patient names, employee names, medical record
          numbers, or reportable event details. Shift Story is not a
          patient-safety event-reporting or HR grievance system.
        </p>
      </div>

      <ResponseForm token={token} alreadyResponded={alreadyResponded} />

      <div className="border-hairline flex flex-col gap-2 border-t pt-5">
        <p className="text-dim m-0 text-[13px] leading-[1.6]">
          Your manager sees a count while the week is open — never who answered,
          never any single answer. After Friday, responses are grouped into
          themes and the originals are deleted.
        </p>
        <p className="text-dim m-0 text-[13px] leading-[1.6]">
          For anything urgent, or anything involving a patient, use your
          existing incident channel instead.
        </p>
      </div>
    </Shell>
  );
}
