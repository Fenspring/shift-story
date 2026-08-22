import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the team building Shift Story.",
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@shiftstory.app";

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro="Questions about the founding cohort, a pilot on your unit, or how anonymity works? Reach out directly."
    >
      <LegalSection heading="Email">
        <p className="m-0">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-teal hover:text-amber font-display text-[19px]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="Joining the waitlist">
        <p className="m-0">
          The fastest way in is the{" "}
          <Link href="/#waitlist" className="text-teal hover:text-amber">
            waitlist form
          </Link>{" "}
          on the home page — it tells us your role and unit, which is what we use
          to shape the first cohort.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
