import Link from "next/link";

import { signOut } from "@/lib/auth/actions";
import { requireManager } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const manager = await requireManager();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-hairline flex flex-wrap items-center justify-between gap-3 border-b px-[clamp(20px,5vw,48px)] py-4">
        <div className="flex items-baseline gap-4">
          <Link href="/app" className="text-bone font-display text-[19px] font-medium no-underline">
            Shift Story
          </Link>
          <span className="text-dim text-[13px]">{manager.orgName}</span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-muted text-[13px]">{manager.fullName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-dim hover:text-teal cursor-pointer border-none bg-transparent p-0 text-[13px] transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-[clamp(20px,5vw,48px)] py-[clamp(36px,6vw,64px)]">
        {children}
      </main>
    </div>
  );
}
