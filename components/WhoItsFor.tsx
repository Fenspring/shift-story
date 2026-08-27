const ROLES = [
  "Chief Nursing Officers",
  "Directors of Nursing",
  "Nurse Managers",
  "Assistant Nurse Managers",
  "Clinical Educators",
  "Quality and Operations Leaders",
];

export function WhoItsFor() {
  return (
    <section className="mx-auto max-w-[1100px] px-[clamp(20px,5vw,64px)] py-[clamp(70px,9vw,120px)]">
      <h2 className="text-bone font-display m-0 mb-3 text-[clamp(28px,3.6vw,42px)] leading-[1.2] font-medium text-pretty">
        Built for the leaders closest to the work.
      </h2>

      <p className="text-muted m-0 mb-11 max-w-[480px] text-[15px]">
        Begin with one unit. Build trust. Make visible improvements. Expand when
        the team asks for more.
      </p>

      <div className="border-y border-[rgb(243_239_231/0.14)] py-9">
        <p className="text-bone font-display m-0 text-[clamp(19px,2.4vw,27px)] leading-[1.75] font-normal italic text-pretty">
          {ROLES.map((role, i) => (
            <span key={role}>
              {role}
              {i < ROLES.length - 1 ? (
                <span className="text-rule not-italic">&nbsp;·&nbsp;</span>
              ) : null}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
