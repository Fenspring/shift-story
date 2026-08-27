import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shiftstory.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shift Story — Hear the shift. Fix the work.",
    template: "%s — Shift Story",
  },
  description:
    "Shift Story turns one anonymous weekly question into a clear view of the operational friction your team is carrying—and the next action that can make work better.",
  keywords: [
    "nurse leaders",
    "anonymous staff feedback",
    "nursing operations",
    "hospital operations",
    "employee listening",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Shift Story",
    title: "Shift Story — Hear the shift. Fix the work.",
    description:
      "Anonymous operational listening for nurse leaders. One weekly question, recurring themes, and visible follow-through.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shift Story — Hear the shift. Fix the work.",
    description:
      "Anonymous operational listening for nurse leaders. One weekly question, recurring themes, and visible follow-through.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B1118",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-ink text-bone font-sans">{children}</body>
    </html>
  );
}
