import Link from "next/link";

import { LogoMark } from "@/components/Logo";

export function Nav() {
  return (
    <nav className="border-hairline fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b bg-[rgb(11_17_24/0.86)] px-[clamp(20px,5vw,64px)] py-[18px] backdrop-blur-[10px]">
      <Link
        href="#top"
        className="text-bone font-display inline-flex items-center gap-2 text-[clamp(18px,2vw,21px)] font-medium tracking-[0.01em] no-underline"
      >
        <LogoMark className="h-[1em] w-[1em] shrink-0" />
        Shift Story
      </Link>

      <div className="flex flex-wrap items-center gap-[clamp(16px,3vw,32px)]">
        <Link
          href="#how-it-works"
          className="text-secondary hover:text-teal text-sm whitespace-nowrap no-underline transition-colors"
        >
          How it works
        </Link>
        <Link
          href="#why-anonymity"
          className="text-secondary hover:text-teal text-sm whitespace-nowrap no-underline transition-colors"
        >
          Why anonymity
        </Link>
        <Link
          href="#waitlist"
          className="bg-amber text-ink hover:bg-amber-bright rounded-sharp px-5 py-2.5 text-sm font-semibold whitespace-nowrap no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7]"
        >
          Join waitlist
        </Link>
      </div>
    </nav>
  );
}
