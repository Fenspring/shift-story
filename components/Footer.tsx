import Link from "next/link";

import { LogoMark } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-hairline flex flex-wrap items-center justify-between gap-4 border-t px-[clamp(20px,5vw,64px)] py-12">
      <div>
        <p className="text-bone font-display m-0 mb-1 flex items-center gap-2 text-lg">
          <LogoMark className="h-[0.9em] w-[0.9em] shrink-0" />
          Shift Story
        </p>
        <p className="text-dim m-0 text-[13px]">Hear the shift. Fix the work.</p>
      </div>

      <div className="flex flex-wrap gap-6 text-[13px]">
        <Link href="#top" className="text-dim hover:text-teal no-underline transition-colors">
          Built by MydBrain
        </Link>
        <Link href="/privacy" className="text-dim hover:text-teal no-underline transition-colors">
          Privacy
        </Link>
        <Link href="/contact" className="text-dim hover:text-teal no-underline transition-colors">
          Contact
        </Link>
      </div>
    </footer>
  );
}
