"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";

const STAGE_MS = 2000;

const STAGES = [
  {
    label: "Staff signal",
    body: (
      <p className="text-secondary font-display m-0 text-[17px] leading-[1.45] italic">
        “Admissions arrive before rooms are ready.”
      </p>
    ),
  },
  {
    label: "Recurring theme",
    body: (
      <p className="text-secondary m-0 text-[15.5px] leading-[1.5]">
        Admission flow is the top friction point for the third week.
      </p>
    ),
  },
  {
    label: "Leader action",
    body: (
      <p className="text-bone m-0 text-[15.5px] leading-[1.5]">
        Admission kits stocked in both pods by{" "}
        <span className="border-amber border-b">6:45 p.m.</span>
      </p>
    ),
  },
  {
    label: "Visible update",
    body: (
      <p className="text-bone font-display m-0 text-[19px] leading-[1.4]">
        <span className="text-teal">You said</span> /{" "}
        <span className="text-amber">We did</span>: admission kits are now
        available in both pods.
      </p>
    ),
  },
];

/**
 * Four columns only have room to sit side by side on a wide viewport. Below
 * `lg` they stack, and the vertical dividers and inner gutters are dropped so
 * the stack does not inherit stray rules and a ragged left edge.
 */
const COLUMN_CLASS = [
  "pt-8 lg:pr-6",
  "pt-8 lg:px-6",
  "pt-8 lg:px-6",
  "pt-8 lg:pl-6",
];

export function ActionLoop() {
  const reduced = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (reduced) return;

    const id = setInterval(
      () => setActiveStage((s) => (s + 1) % STAGES.length),
      STAGE_MS,
    );
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section className="border-hairline bg-panel border-y px-[clamp(20px,5vw,64px)] py-[clamp(70px,9vw,120px)]">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-bone font-display m-0 mb-4 max-w-[760px] text-[clamp(28px,3.6vw,42px)] leading-[1.22] font-medium text-pretty">
          Feedback is only useful when staff can see what changed.
        </h2>

        <p className="text-secondary m-0 mb-14 max-w-[560px] text-base leading-[1.6]">
          Shift Story helps leaders earn trust through visible follow-through—not
          another report.
        </p>

        <div className="grid grid-cols-1 border-t border-[rgb(243_239_231/0.12)] lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
          {STAGES.map((stage, i) => {
            const isLast = i === STAGES.length - 1;
            return (
              <div
                key={stage.label}
                className={[
                  COLUMN_CLASS[i],
                  isLast
                    ? ""
                    : "border-b border-[rgb(243_239_231/0.1)] pb-8 lg:border-r lg:border-b-0 lg:pb-0",
                ].join(" ")}
              >
                <p
                  className={`m-0 mb-3 text-[10.5px] tracking-[0.12em] uppercase transition-colors ${
                    activeStage === i ? "text-amber" : "text-dim"
                  }`}
                >
                  {stage.label}
                </p>
                {stage.body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
