import { WaitlistForm } from "./WaitlistForm";

export function Waitlist() {
  return (
    <section
      id="waitlist"
      className="border-hairline scroll-mt-24 border-t bg-[linear-gradient(180deg,#0B1118,#0d151f)] px-[clamp(20px,5vw,64px)] py-[clamp(70px,9vw,120px)]"
    >
      <div className="mx-auto grid max-w-[960px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-14">
        <div>
          <h2 className="text-bone font-display m-0 mb-5 text-[clamp(28px,3.6vw,40px)] leading-[1.2] font-medium text-pretty">
            Be among the first nurse leaders to hear the real story of the shift.
          </h2>

          <p className="text-secondary m-0 mb-6 text-[15.5px] leading-[1.65]">
            We are inviting a limited founding cohort to shape the first version
            of Shift Story. Join the waitlist for early access, founding pricing,
            and priority access to the first 90-day unit launch.
          </p>

          <p className="text-dim m-0 text-[13px]">
            We’ll only use your information to share Shift Story early-access
            updates. We will not sell your contact information.
          </p>
        </div>

        <WaitlistForm />
      </div>
    </section>
  );
}
