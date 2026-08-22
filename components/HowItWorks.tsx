type Step = {
  numeral: string;
  numeralClass: string;
  title: string;
  quote?: string;
  body: string;
};

const STEPS: Step[] = [
  {
    numeral: "01",
    numeralClass: "text-[rgb(114_182_173/0.28)]",
    title: "Ask one question",
    quote: "“What made it harder to deliver a good shift this week?”",
    body: "Staff respond from a QR code or secure link in under a minute.",
  },
  {
    numeral: "02",
    numeralClass: "text-[rgb(114_182_173/0.28)]",
    title: "See the pattern",
    body: "Shift Story organizes anonymous feedback into recurring operational themes, trends, and de-identified signals.",
  },
  {
    numeral: "03",
    numeralClass: "text-[rgb(242_166_90/0.35)]",
    title: "Close the loop",
    body: "Turn a theme into an action, then share a clear “You said / We did” update with the team.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative mx-auto max-w-[1000px] scroll-mt-24 px-[clamp(20px,5vw,64px)] py-[clamp(70px,9vw,120px)]"
    >
      <p className="text-teal m-0 mb-4 text-xs tracking-[0.14em] uppercase">
        How Shift Story works
      </p>

      <div>
        {STEPS.map((step, i) => (
          <div
            key={step.numeral}
            className={[
              "flex gap-8",
              i === 0 ? "pb-[52px]" : i === STEPS.length - 1 ? "pt-[52px]" : "py-[52px]",
              i < STEPS.length - 1 ? "border-hairline border-b" : "",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`font-display w-[70px] flex-none text-[60px] leading-none ${step.numeralClass}`}
            >
              {step.numeral}
            </span>

            <div className="pt-2">
              <h3 className="text-bone font-display m-0 mb-2.5 text-[clamp(22px,2.4vw,28px)] font-medium">
                {step.title}
              </h3>
              {step.quote ? (
                <p className="text-bone m-0 mb-2 text-base italic">{step.quote}</p>
              ) : null}
              <p className="text-secondary m-0 max-w-[520px] text-[15px] leading-[1.6]">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
