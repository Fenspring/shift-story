import Link from "next/link";

export function Founder() {
  return (
    <section className="border-hairline mx-auto max-w-[760px] border-t px-[clamp(20px,5vw,64px)] py-[clamp(60px,8vw,100px)]">
      <h2 className="text-bone font-display m-0 mb-5 text-[clamp(24px,2.8vw,32px)] leading-[1.3] font-normal italic">
        Built by a nurse who understands the shift.
      </h2>

      <p className="text-secondary m-0 mb-5 text-base leading-[1.7]">
        Shift Story is being built by a nurse with clinical and
        healthcare-administration experience who believes frontline teams should
        not have to carry broken processes silently. The goal is simple: help
        leaders see the friction their teams feel—and make it easier to act on
        it.
      </p>

      <Link href="#top" className="text-dim hover:text-teal text-[13px] no-underline transition-colors">
        Built by MydBrain
      </Link>
    </section>
  );
}
