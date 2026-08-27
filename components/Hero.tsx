"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";

const PHRASES = [
  "I know something is off, but I do not know where to start.",
  "My team thinks leadership does not listen.",
  "I only hear about problems when they become a crisis.",
];

const TYPE_MS = 45;
const HOLD_MS = 2400;
const DELETE_MS = 22;
const GAP_MS = 400;
const BLINK_MS = 500;

function useTypewriter() {
  const reduced = useReducedMotion();
  const [text, setText] = useState("");
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    // Under reduced motion the first phrase is rendered statically below, so
    // there is no timer to start and no state to push from here.
    if (reduced) return;

    let timeout: ReturnType<typeof setTimeout>;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    const step = () => {
      const phrase = PHRASES[phraseIdx];
      let delay: number;

      if (deleting) {
        charIdx -= 1;
        setText(phrase.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % PHRASES.length;
          delay = GAP_MS;
        } else {
          delay = DELETE_MS;
        }
      } else {
        charIdx += 1;
        setText(phrase.slice(0, charIdx));
        if (charIdx >= phrase.length) {
          deleting = true;
          delay = HOLD_MS;
        } else {
          delay = TYPE_MS;
        }
      }

      timeout = setTimeout(step, delay);
    };

    timeout = setTimeout(step, TYPE_MS);
    const blink = setInterval(() => setCursorOn((on) => !on), BLINK_MS);

    return () => {
      clearTimeout(timeout);
      clearInterval(blink);
    };
  }, [reduced]);

  return {
    text: reduced ? PHRASES[0] : text,
    cursorOn: reduced ? false : cursorOn,
  };
}

/** Entrance delays from the design, in seconds. */
const STAGGER = { headline: 0.2, support: 0.32, cta: 0.42, micro: 0.5 };

export function Hero() {
  const { text, cursorOn } = useTypewriter();

  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,64px)] pt-[clamp(130px,16vw,180px)]">
      <h1
        className="animate-slide-up text-bone font-display m-0 mb-9 max-w-[17ch] min-h-[clamp(120px,18vw,208px)] text-[clamp(30px,4.6vw,52px)] leading-[1.28] font-normal tracking-[-0.01em]"
        style={{ animationDelay: `${STAGGER.headline}s` }}
      >
        <span className="text-dim mb-[0.3em] block text-[0.5em]">
          A nurse manager says…
        </span>

        {/*
          Assistive tech and crawlers get one stable sentence; the animated copy
          is hidden from them. An aria-live region here would announce every
          keystroke of the typewriter.
        */}
        <span className="sr-only">“{PHRASES[0]}”</span>
        <span aria-hidden="true">
          “{text}
          <span className="text-amber" style={{ opacity: cursorOn ? 1 : 0 }}>
            |
          </span>
          ”
        </span>
      </h1>

      <p
        className="animate-slide-up text-secondary m-0 mb-9 max-w-[460px] text-[clamp(16px,1.4vw,19px)] leading-[1.6]"
        style={{ animationDelay: `${STAGGER.support}s` }}
      >
        Shift Story turns one anonymous weekly question into a clear view of the
        operational friction your team is carrying—and the next action that can
        make work better.
      </p>

      <div
        className="animate-slide-up flex flex-wrap items-center gap-4"
        style={{ animationDelay: `${STAGGER.cta}s` }}
      >
        <Link
          href="#waitlist"
          className="bg-amber text-ink hover:bg-amber-bright rounded-sharp px-7 py-4 text-[15px] font-semibold tracking-[0.01em] no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7]"
        >
          Join the founding waitlist
        </Link>
        <Link
          href="#how-it-works"
          className="text-bone hover:border-teal hover:text-teal border-b border-[rgb(243_239_231/0.3)] px-6 py-4 text-[15px] no-underline transition-colors"
        >
          See how it works
        </Link>
      </div>

      <p
        className="animate-slide-up text-dim m-0 mt-5 text-[13px]"
        style={{ animationDelay: `${STAGGER.micro}s` }}
      >
        Built for nurse leaders. No EHR integration. No patient data required.
      </p>
    </section>
  );
}
