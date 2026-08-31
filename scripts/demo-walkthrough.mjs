/**
 * Automated product walkthrough of the real Shift Story application.
 *
 *   npm run demo
 *
 * Drives the actual UI in a real browser against a real Supabase project. It
 * does not stub, mock, or fast-path anything: every screen is the shipped
 * screen, every write goes through the real routes, and the privacy threshold
 * is enforced by the database exactly as it is in production.
 *
 * Produces numbered screenshots at every stage and, when ffmpeg is available,
 * a single MP4 of the whole run.
 *
 * Requires SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY and a
 * dev server on DEMO_BASE_URL (default http://localhost:3000).
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

const BASE = (process.env.DEMO_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const URL_ = process.env.SUPABASE_URL?.trim();
const SECRET = process.env.SUPABASE_SECRET_KEY?.trim();

if (!URL_ || !SECRET) {
  console.error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY. Run via `npm run demo`.");
  process.exit(1);
}

const OUT = path.resolve("demo-output");
const SHOTS = path.join(OUT, "screenshots");
const CLIPS = path.join(OUT, "clips");

// Fixed viewport across every context so the clips concatenate without scaling.
const VIEWPORT = { width: 1280, height: 800 };

const MANAGER_EMAIL = "demo.manager@demo-medical-center.test";
const MANAGER_PASSWORD = "shift-story-demo-password-2026";
const ORG_NAME = "Demo Medical Center";
const UNIT_NAME = "ICU";

/**
 * Synthetic staff responses. Entirely fictional, and written to exercise the
 * operational themes the classifier knows about. Two of them name a person or a
 * room so the de-identifier visibly withholds them from the excerpt panel.
 */
const STAFF_RESPONSES = [
  "Spent twenty minutes hunting for an IV pump during an admission again.",
  "Admissions keep arriving before the rooms have been cleaned and turned over.",
  "Handoff at seven slipped every night because the day team was still charting.",
  "We ran out of clean linens overnight for the third week running.",
  "Double charting every admission between the flowsheet and the paper packet.",
  "Nobody told us transport was down two people until we were already waiting.",
  "The supply cart was empty at the start of two night shifts this week.",
  "Pharmacy turnaround on stat orders was slow every evening.",
  "Marcus never restocks the admission cart before he leaves for the night.",
  "The call light in room 412 has been broken for over a week now.",
];

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

let step = 0;
const notes = [];
async function shot(page, label) {
  step += 1;
  const file = path.join(SHOTS, `${String(step).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${String(step).padStart(2, "0")}. ${label}`);
  return file;
}

/** Fails loudly rather than screenshotting a page that never loaded. */
async function expectVisible(page, locator, description) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    const file = path.join(SHOTS, `FAILED-${description.replace(/\W+/g, "-")}.png`);
    await page.screenshot({ path: file }).catch(() => {});
    throw new Error(`expected to see ${description} — screenshot: ${file}`);
  }
}

async function preflight() {
  for (const [what, url] of [["dev server", BASE], ["Supabase", `${URL_}/rest/v1/`]]) {
    try {
      const res = await fetch(url, {
        headers: what === "Supabase" ? { apikey: SECRET } : {},
        signal: AbortSignal.timeout(15_000),
      });
      if (what === "Supabase" && !(res.headers.get("content-type") ?? "").includes("json")) {
        throw new Error(`got ${res.status} from something that is not Supabase`);
      }
    } catch (err) {
      console.error(
        `\nCannot reach ${what} at ${url}\n  ${err instanceof Error ? err.message : err}\n\n` +
          (what === "dev server"
            ? "  Start it first:  npm run dev\n"
            : "  Check .env.local and your network access to the project.\n"),
      );
      process.exit(1);
    }
  }
}

/** Removes anything a previous run left, so the walkthrough is repeatable. */
async function resetDemoData() {
  const { data: existing } = await admin.auth.admin.listUsers();
  const prior = (existing?.users ?? []).find((u) => u.email === MANAGER_EMAIL);
  if (prior) await admin.auth.admin.deleteUser(prior.id).catch(() => {});
  // organizations does not cascade from auth.users, so clear it explicitly.
  await admin.from("organizations").delete().eq("name", ORG_NAME);
}

async function createManager() {
  const { data, error } = await admin.auth.admin.createUser({
    email: MANAGER_EMAIL,
    password: MANAGER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "Alex Rivera",
      organization: ORG_NAME,
      job_title: "Nurse Manager",
    },
  });
  if (error) throw new Error(`could not create the demo manager: ${error.message}`);
  return data.user.id;
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", MANAGER_EMAIL);
  await page.fill("#password", MANAGER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/app/, { timeout: 20_000 });
}

async function main() {
  await preflight();
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(SHOTS, { recursive: true });
  await fs.mkdir(CLIPS, { recursive: true });

  console.log("\nResetting demo data…");
  await resetDemoData();
  await createManager();
  console.log(`  manager ready: ${MANAGER_EMAIL} (org "${ORG_NAME}")`);

  const browser = await chromium.launch({
    executablePath: process.env.DEMO_CHROMIUM || undefined,
  });
  const clips = [];
  let responseUrl = null;

  /* ---- Act 1: the manager sets the unit up ------------------------------ */
  console.log("\nAct 1 — manager sets up the unit");
  {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: CLIPS, size: VIEWPORT },
    });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await shot(page, "manager-login");

    await signIn(page);
    await expectVisible(page, page.getByRole("heading", { name: /your units/i }), "the units page");
    await shot(page, "units-empty");

    await page.getByRole("link", { name: /new unit/i }).click();
    await page.waitForURL(/\/app\/units\/new/);
    await page.fill("#name", UNIT_NAME);
    await page.selectOption("#unitType", { label: "ICU / Critical care" });
    await page.fill("#staffCount", "42");
    await shot(page, "create-unit-filled");

    await page.getByRole("button", { name: /create unit/i }).click();
    await page.waitForURL(/\/app\/units\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    // The weekly question is on screen before a cycle is even open.
    await expectVisible(page, page.getByText(/what made it harder/i), "the weekly question");
    await shot(page, "weekly-question");

    // Curly apostrophe in the rendered label, so match on a stable prefix.
    await page.getByRole("button", { name: /start this week/i }).click();
    await page.waitForLoadState("networkidle");
    await expectVisible(page, page.getByText(/taking shape/i), "the protected pre-threshold panel");
    await shot(page, "cycle-open-protected");

    // Grab the live response link straight off the dashboard.
    responseUrl = (await page.locator("code").first().innerText()).trim();
    if (!/\/respond\/.+/.test(responseUrl)) {
      throw new Error(`could not read the response link from the dashboard, got "${responseUrl}"`);
    }
    await shot(page, "qr-code-and-link");

    await ctx.close();
    clips.push(await page.video().path());
    notes.push(`response link: ${responseUrl}`);
  }

  /* ---- Act 2: staff answer anonymously ---------------------------------- */
  console.log("\nAct 2 — staff answer anonymously");
  {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: CLIPS, size: VIEWPORT },
    });
    const page = await ctx.newPage();

    await page.goto(responseUrl, { waitUntil: "networkidle" });
    await expectVisible(page, page.getByText(/before you write/i), "the patient-safety notice");
    await shot(page, "staff-response-form");

    await page.fill("#body", STAFF_RESPONSES[0]);
    await page.getByRole("button", { name: /^night$/i }).click();
    await page.getByRole("button", { name: /a lot/i }).click();
    await shot(page, "staff-response-filled");

    await page.getByRole("button", { name: /send anonymously/i }).click();
    await expectVisible(page, page.getByText(/thank you/i), "the confirmation");
    await shot(page, "staff-response-sent");

    await ctx.close();
    clips.push(await page.video().path());
  }

  // The remaining responses go through the same endpoint the form posts to —
  // same validation, same classification, same de-identification. Driving eight
  // separate browser sessions would add nothing but minutes to the recording.
  console.log("\n  submitting the rest through the same API the form uses…");
  const token = responseUrl.split("/respond/")[1];
  let accepted = 1;
  for (const body of STAFF_RESPONSES.slice(1)) {
    const res = await fetch(`${BASE}/api/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        body,
        shift: ["day", "evening", "night"][accepted % 3],
        impact: ["a_little", "some", "a_lot"][accepted % 3],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(`response rejected: ${res.status} ${JSON.stringify(json)}`);
    accepted += 1;
  }
  console.log(`  ${accepted} responses submitted — threshold is 8`);
  notes.push(`${accepted} anonymous responses submitted through /api/respond`);

  /* ---- Act 3: the manager acts and closes the loop ---------------------- */
  console.log("\nAct 3 — manager sees the signal and closes the loop");
  {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: CLIPS, size: VIEWPORT },
    });
    const page = await ctx.newPage();

    await signIn(page);
    await page.getByRole("link", { name: new RegExp(UNIT_NAME, "i") }).first().click();
    await page.waitForURL(/\/app\/units\/[0-9a-f-]{36}$/);
    await page.waitForLoadState("networkidle");

    await expectVisible(page, page.getByText(/making the shift harder/i), "the aggregate themes");
    await shot(page, "themes-revealed");

    await expectVisible(page, page.getByText(/in their words/i), "the de-identified excerpts");
    await shot(page, "deidentified-excerpts");

    // Act on Equipment & supplies specifically.
    const equipmentRow = page.locator("li").filter({ hasText: /equipment & supplies/i }).first();
    await equipmentRow.getByRole("link", { name: /act on this/i }).click();
    await page.waitForURL(/\/actions\/new/);
    await expectVisible(page, page.locator("#description"), "the action form");

    await page.selectOption("#themeKey", "equipment");
    await page.fill("#description", "Create a dedicated IV pump location for admissions.");
    await page.fill("#owner", "Unit educator");
    await page.selectOption("#status", "in_progress");
    await shot(page, "action-filled");

    await page.getByRole("button", { name: /save action/i }).click();
    await page.waitForURL(/\/app\/units\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expectVisible(page, page.getByText(/create a dedicated iv pump/i), "the saved action");
    await shot(page, "action-saved");

    await page.getByRole("link", { name: /write you said/i }).first().click();
    await page.waitForURL(/\/updates\/new/);
    await page.fill("#youSaid", "Staff are having difficulty finding IV pumps during admissions.");
    await page.fill("#weDid", "We created a dedicated pump location and added it to the admission workflow.");
    await expectVisible(page, page.getByText(/how the unit will see it/i), "the live preview");
    await shot(page, "you-said-we-did-draft");

    await page.getByRole("button", { name: /publish to the unit/i }).click();
    await page.waitForURL(/\/app\/units\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expectVisible(page, page.getByText(/published to the unit/i), "the published update");
    await shot(page, "loop-closed");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await shot(page, "dashboard-full");

    await ctx.close();
    clips.push(await page.video().path());
  }

  await browser.close();
  return clips;
}

/**
 * Stitches the per-act clips into one video.
 *
 * Playwright ships an ffmpeg, but it is a purpose-built stripped binary with
 * exactly two encoders and only the WebM muxer — it physically cannot write
 * MP4. So a complete ffmpeg is preferred (ffmpeg-static, a devDependency, or
 * one already on PATH), and the bundled one is the last resort that still
 * produces a single stitched .webm.
 */
async function resolveFfmpeg() {
  try {
    const { default: staticPath } = await import("ffmpeg-static");
    if (staticPath && existsSync(staticPath)) return { bin: staticPath, mp4: true };
  } catch {
    // not installed — fall through
  }

  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return { bin: process.env.FFMPEG_PATH, mp4: true };
  }

  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return { bin: "ffmpeg", mp4: true };
  } catch {
    // no system ffmpeg
  }

  const bundled = "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux";
  if (existsSync(bundled)) return { bin: bundled, mp4: false };

  return null;
}

async function stitch(clips) {
  const ff = await resolveFfmpeg();
  if (!ff) {
    console.log("\n  No ffmpeg found — per-act .webm clips are in demo-output/clips/.");
    return null;
  }

  const listFile = path.join(CLIPS, "clips.txt");
  await fs.writeFile(listFile, clips.map((c) => `file '${path.resolve(c)}'`).join("\n"));

  const output = path.join(OUT, ff.mp4 ? "shift-story-walkthrough.mp4" : "shift-story-walkthrough.webm");
  const codec = ff.mp4
    ? ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "24"]
    : ["-c", "copy"];

  try {
    await execFileAsync(ff.bin, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, ...codec, output]);
    if (!ff.mp4) {
      console.log("\n  Only Playwright's stripped ffmpeg was available, so this is WebM, not MP4.");
      console.log("  For MP4:  npm i -D ffmpeg-static");
    }
    return output;
  } catch (err) {
    console.log(`\n  ffmpeg failed: ${String(err.stderr ?? err.message).slice(-300)}`);
    console.log("  The per-act .webm clips are still in demo-output/clips/.");
    return null;
  }
}

const clips = await main();
const mp4 = await stitch(clips);

console.log("\n─────────────────────────────────────────────");
console.log(`Screenshots:  ${SHOTS}  (${step} stages)`);
console.log(`Clips:        ${CLIPS}  (${clips.length} .webm)`);
console.log(mp4 ? `Video:        ${mp4}` : "Video:        not produced — see the message above");
for (const n of notes) console.log(`  · ${n}`);
console.log("─────────────────────────────────────────────\n");
