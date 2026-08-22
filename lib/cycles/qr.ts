import "server-only";

import QRCode from "qrcode";

/**
 * Renders the response URL as an inline SVG.
 *
 * SVG rather than a PNG data URI because these get printed and taped to a
 * huddle board — vector survives being scaled up to A4, and it inherits the
 * page's colors instead of baking in a palette.
 *
 * Error-correction level M tolerates a smudge or a thumbtack through a corner
 * without becoming unscannable.
 */
export async function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0B1118", light: "#F3EFE7" },
  });
}

export function responseUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/r/${token}`;
}
