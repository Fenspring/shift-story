export function Problem() {
  return (
    <section className="border-hairline mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[clamp(40px,6vw,64px)] border-t px-[clamp(20px,5vw,64px)] py-[clamp(60px,8vw,110px)]">
      <h2 className="text-bone font-display m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.22] font-medium text-pretty">
        The most valuable operational intelligence in your hospital is already
        happening in the break room.
      </h2>

      <div>
        <p className="text-secondary m-0 mb-7 max-w-[480px] text-base leading-[1.7]">
          Your team sees the small failures before they become normalized: the
          missing supplies, the delayed assignments, the workarounds, the
          handoffs that break down at 7 p.m. But those signals disappear into
          busy shifts, group texts, and surveys that arrive too late.
        </p>

        <div aria-hidden="true" className="flex flex-wrap items-center gap-[14px]">
          <span className="text-dim text-[11px] tracking-[0.1em] uppercase">
            Noise
          </span>
          <div
            className="h-px min-w-20 flex-1"
            style={{
              background:
                "repeating-linear-gradient(90deg, #3d4c5a 0 3px, transparent 3px 7px)",
            }}
          />
          <span className="text-teal text-sm">→</span>
          <div className="bg-teal h-px min-w-20 flex-1" />
          <span className="text-teal text-[11px] tracking-[0.1em] uppercase">
            Signal
          </span>
        </div>
      </div>
    </section>
  );
}
