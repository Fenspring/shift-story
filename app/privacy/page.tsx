import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Shift Story handles waitlist information and how the product is designed to protect staff anonymity.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="Shift Story is designed to protect the signal, not identify the person. This page covers the waitlist you can sign up for today."
    >
      <LegalSection heading="What the waitlist form collects">
        <p className="m-0">
          Your name, work email, organization, role, and optionally your primary
          unit and a free-text description of an operational issue. Nothing else
          is collected from that form.
        </p>
      </LegalSection>

      <LegalSection heading="How it is used">
        <p className="m-0">
          To contact you about Shift Story early access and to understand which
          roles and settings the founding cohort should serve. We do not sell
          contact information, and we do not share it with third parties for
          their own marketing.
        </p>
      </LegalSection>

      <LegalSection heading="Anonymity in the product">
        <p className="m-0">
          The waitlist is separate from the product itself. Staff responses in
          Shift Story are collected without names, employee IDs, emails, or staff
          logins; unit-level insights appear only above a minimum response
          threshold; leaders see de-identified themes rather than raw responses.
        </p>
        <p className="m-0">
          Shift Story is not a safety-event reporting system and does not collect
          patient information. Anything that belongs in an incident report or an
          HR channel is routed to those existing channels.
        </p>
      </LegalSection>

      <LegalSection heading="Removing your information">
        <p className="m-0">
          Email us and we will remove your waitlist entry. See the{" "}
          <Link href="/contact" className="text-teal hover:text-amber">
            contact page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Status of this page">
        <p className="m-0">
          Shift Story is pre-launch. This notice describes current practice for
          the waitlist and will be replaced by a full privacy policy, along with
          the applicable data-processing terms, before the product handles
          customer data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
