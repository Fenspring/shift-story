const COMMITMENTS = [
  "No names, employee IDs, emails, or staff logins required",
  "No patient information or clinical-event reporting",
  "Minimum response thresholds before unit insights appear",
  "De-identified themes and comments only",
  "No raw-response downloads for leaders",
  "Clear routing to existing safety-event and HR channels",
];

export function Trust() {
  return (
    <section
      id="why-anonymity"
      className="text-ink scroll-mt-24 bg-[#F3EFE7] px-[clamp(20px,5vw,64px)] py-[clamp(70px,9vw,120px)]"
    >
      <div className="mx-auto max-w-[900px]">
        <p className="text-parchment-accent m-0 mb-[22px] font-mono text-[11px] tracking-[0.14em] uppercase">
          Privacy, by design
        </p>

        <h2 className="font-display m-0 mb-5 text-[clamp(30px,3.8vw,44px)] leading-[1.18] font-medium text-pretty">
          Safe enough for staff to tell the truth.
        </h2>

        <p className="text-parchment-text m-0 mb-12 max-w-[560px] text-[17px] leading-[1.6]">
          Shift Story is designed to protect the signal, not identify the person.
        </p>

        <ol className="border-hairline-ink m-0 list-none border-t p-0">
          {COMMITMENTS.map((text, i) => (
            <li
              key={text}
              className={`flex gap-6 py-5 ${
                i < COMMITMENTS.length - 1 ? "border-hairline-ink border-b" : ""
              }`}
            >
              <span className="text-parchment-accent font-display w-6 flex-none text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15.5px] leading-[1.5]">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
