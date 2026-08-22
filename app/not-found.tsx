import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center px-[clamp(20px,5vw,64px)]">
      <main className="mx-auto max-w-[560px]">
        <p className="text-teal m-0 mb-4 text-xs tracking-[0.14em] uppercase">
          404
        </p>

        <h1 className="text-bone font-display m-0 mb-5 text-[clamp(28px,3.6vw,42px)] leading-[1.2] font-medium text-pretty">
          That page is off the schedule.
        </h1>

        <p className="text-secondary m-0 mb-8 text-base leading-[1.7]">
          The link may be out of date. Everything about Shift Story lives on the
          home page.
        </p>

        <Link
          href="/"
          className="bg-amber text-ink hover:bg-amber-bright rounded-sharp inline-block px-7 py-4 text-[15px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7]"
        >
          Back to Shift Story
        </Link>
      </main>
    </div>
  );
}
