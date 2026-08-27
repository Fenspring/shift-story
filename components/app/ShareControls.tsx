"use client";

import { useState } from "react";

export function ShareControls({ url, qrSvg, unitName }: { url: string; qrSvg: string; unitName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Built client-side from the SVG the server rendered — no network round trip,
  // and it downloads as a real vector file that scales to a printed poster.
  const svgHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
  const fileName = `shift-story-${unitName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-qr.svg`;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={copy}
        className="bg-amber text-ink hover:bg-amber-bright rounded-sharp cursor-pointer border-none px-5 py-3 text-[14.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EFE7]"
      >
        {copied ? "Link copied" : "Share with your team"}
      </button>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={svgHref}
          download={fileName}
          className="text-teal hover:text-amber text-[13.5px] no-underline transition-colors"
        >
          Download QR
        </a>
        <button
          type="button"
          onClick={copy}
          className="text-dim hover:text-teal cursor-pointer border-none bg-transparent p-0 text-[13.5px] transition-colors"
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
