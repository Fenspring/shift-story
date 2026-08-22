import { ActionLoop } from "@/components/ActionLoop";
import { Founder } from "@/components/Founder";
import { Footer } from "@/components/Footer";
import { Grain } from "@/components/Grain";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Nav } from "@/components/Nav";
import { Problem } from "@/components/Problem";
import { Trust } from "@/components/Trust";
import { Waitlist } from "@/components/Waitlist";
import { WhoItsFor } from "@/components/WhoItsFor";

export default function Home() {
  return (
    <div id="top" className="relative overflow-hidden">
      <Grain />

      <a
        href="#main"
        className="bg-amber text-ink sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main" className="relative z-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <ActionLoop />
        <Trust />
        <WhoItsFor />
        <Founder />
        <Waitlist />
      </main>

      <Footer />
    </div>
  );
}
