/**
 * Fixed scanline texture drifting behind the page — the paper / night-shift
 * grain from the design. Pure CSS, no asset.
 */
export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="animate-grain pointer-events-none fixed inset-0 z-0 opacity-5"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, #F3EFE7 0px, transparent 1px, transparent 3px)",
      }}
    />
  );
}
