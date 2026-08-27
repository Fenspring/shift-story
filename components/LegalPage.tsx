import Link from "next/link";

/** Shared shell for the standalone legal / contact pages. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <main className="mx-auto max-w-[760px] px-[clamp(20px,5vw,64px)] py-[clamp(80px,10vw,140px)]">
        <Link
          href="/"
          className="text-dim hover:text-teal mb-10 inline-block text-[13px] no-underline transition-colors"
        >
          ← Shift Story
        </Link>

        <h1 className="text-bone font-display m-0 mb-5 text-[clamp(30px,3.8vw,44px)] leading-[1.18] font-medium text-pretty">
          {title}
        </h1>

        <p className="text-secondary m-0 mb-12 text-[17px] leading-[1.6]">{intro}</p>

        <div className="flex flex-col gap-8">{children}</div>
      </main>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-bone font-display m-0 mb-3 text-[22px] font-medium">
        {heading}
      </h2>
      <div className="text-secondary flex flex-col gap-3 text-[15.5px] leading-[1.7]">
        {children}
      </div>
    </section>
  );
}
