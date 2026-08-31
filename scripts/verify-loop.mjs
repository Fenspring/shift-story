/**
 * End-to-end verification of the Shift Story privacy guarantees against a real
 * Supabase project.
 *
 * Run it from a machine that can reach your project:
 *
 *   npm run verify
 *
 * It creates two temporary leaders at two different hospitals, drives the whole
 * loop through the real API with real signed-in sessions, and deletes
 * everything it made. Nothing here trusts the application layer: every check
 * goes through PostgREST exactly as a browser would, so RLS and the threshold
 * functions are what is actually being tested.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.SUPABASE_URL?.trim();
const SECRET = process.env.SUPABASE_SECRET_KEY?.trim();
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

if (!URL || !SECRET || !PUBLISHABLE) {
  console.error(
    "Missing config. SUPABASE_URL, SUPABASE_SECRET_KEY and SUPABASE_PUBLISHABLE_KEY\n" +
      "must all be set — run via `npm run verify`, which loads .env.local.",
  );
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

const tag = randomUUID().slice(0, 8);
const emailA = `verify-a-${tag}@example.test`;
const emailB = `verify-b-${tag}@example.test`;
const password = `verify-${randomUUID()}`;
const created = { users: [], orgs: [] };

/** Signs a leader in and returns a client scoped to their session. */
async function leaderClient(email) {
  const client = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function cleanup() {
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  // organizations has no FK to auth.users, so removing the user does not
  // remove the org. Delete explicitly or the data is orphaned.
  for (const id of created.orgs) {
    await admin.from("organizations").delete().eq("id", id);
  }
}

try {
  console.log(`\nVerifying ${URL}\n`);

  // Preflight. Without this, an unreachable host surfaces as a JSON parse error
  // from deep inside the client, which reads like a bug in this script.
  try {
    const probe = await fetch(`${URL}/rest/v1/`, {
      headers: { apikey: SECRET },
      signal: AbortSignal.timeout(15_000),
    });
    // A proxy or captive portal answers with text/plain rather than the JSON
    // PostgREST always returns, so content type is the reliable signal that we
    // reached Supabase and not something in between.
    const type = probe.headers.get("content-type") ?? "";
    if (!type.includes("json")) {
      const body = (await probe.text()).slice(0, 200);
      throw new Error(`got ${probe.status} ${type || "no content-type"} — ${body}`);
    }
  } catch (err) {
    console.error(
      `  Cannot reach ${URL}\n` +
        `  ${err instanceof Error ? err.message : String(err)}\n\n` +
        "  Run this from a machine with network access to your Supabase project.\n" +
        "  If you are on a restricted network, allow the project host and retry.",
    );
    process.exit(1);
  }

  /* -- setup ------------------------------------------------------------- */
  console.log("Setup");
  for (const [email, org, name] of [
    [emailA, `Verify Hospital A ${tag}`, "Leader A"],
    [emailB, `Verify Hospital B ${tag}`, "Leader B"],
  ]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, organization: org, job_title: "Nurse Manager" },
    });
    if (error) throw new Error(`could not create ${email}: ${error.message}`);
    created.users.push(data.user.id);
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, org_id, organizations(name)")
    .in("id", created.users);
  created.orgs = (profiles ?? []).map((p) => p.org_id);

  check("signup trigger provisioned an org + profile per leader", profiles?.length, 2);

  const A = await leaderClient(emailA);
  const B = await leaderClient(emailB);

  /* -- unit + tenant isolation ------------------------------------------- */
  console.log("\nUnits and tenant isolation");
  const { data: unit, error: unitErr } = await A.from("units")
    .insert({
      org_id: profiles.find((p) => p.id === created.users[0]).org_id,
      name: `Verify ICU ${tag}`,
      unit_type: "ICU / Critical care",
      staff_count: 42,
      timezone: "America/New_York",
    })
    .select("id")
    .single();
  check("leader A creates a unit", unitErr?.message ?? "ok", "ok");
  if (!unit) throw new Error("no unit — cannot continue");

  const { data: aUnits } = await A.from("units").select("id");
  const { data: bUnits } = await B.from("units").select("id");
  check("leader A sees their own unit", aUnits?.length, 1);
  check("leader B sees none of A's units", bUnits?.length, 0);

  /* -- cycle + below threshold ------------------------------------------- */
  console.log("\nBelow the threshold");
  const { data: closesAt } = await admin.rpc("next_cycle_close", { tz: "America/New_York" });
  const { data: cycle } = await admin
    .from("cycles")
    .insert({
      unit_id: unit.id,
      question: "What made it harder to deliver a good shift this week?",
      closes_at: closesAt,
      min_responses: 8,
    })
    .select("id")
    .single();

  const seed = async (n, body, theme, excerpt) => {
    const { data: rows } = await admin
      .from("responses")
      .insert(Array.from({ length: n }, (_, i) => ({
        cycle_id: cycle.id,
        body: `${body} ${i}`,
        safe_excerpt: excerpt,
      })))
      .select("id");
    await admin
      .from("response_themes")
      .insert((rows ?? []).map((r) => ({ response_id: r.id, theme_key: theme })));
  };

  await seed(5, "short staffed on nights", "staffing", "We were short staffed on nights this week");

  const themesAt5 = await A.rpc("cycle_theme_counts", { p_cycle_id: cycle.id });
  const excerptsAt5 = await A.rpc("cycle_safe_excerpts", { p_cycle_id: cycle.id });
  check("themes withheld at 5 responses", themesAt5.data?.length ?? 0, 0);
  check("excerpts withheld at 5 responses", excerptsAt5.data?.length ?? 0, 0);

  const rawRead = await A.from("responses").select("id");
  const linkRead = await A.from("response_themes").select("response_id");
  check("leader cannot read raw responses", rawRead.data?.length ?? 0, 0);
  check("leader cannot count around the gate via response_themes", linkRead.data?.length ?? 0, 0);

  /* -- above threshold ---------------------------------------------------- */
  console.log("\nAt the threshold");
  await seed(5, "no working iv pump for admissions", "equipment", "Could not find a working IV pump during admissions");

  const themesAt10 = await A.rpc("cycle_theme_counts", { p_cycle_id: cycle.id });
  const excerptsAt10 = await A.rpc("cycle_safe_excerpts", { p_cycle_id: cycle.id });
  check("themes appear at 10 responses", (themesAt10.data?.length ?? 0) > 0, true);
  check("excerpts appear at 10 responses", (excerptsAt10.data?.length ?? 0) > 0, true);
  check("still no path to raw responses", (await A.from("responses").select("id")).data?.length ?? 0, 0);

  const crossThemes = await B.rpc("cycle_theme_counts", { p_cycle_id: cycle.id });
  const crossExcerpts = await B.rpc("cycle_safe_excerpts", { p_cycle_id: cycle.id });
  check("leader B gets nothing from A's cycle (themes)", crossThemes.data?.length ?? 0, 0);
  check("leader B gets nothing from A's cycle (excerpts)", crossExcerpts.data?.length ?? 0, 0);

  /* -- action + you said / we did ---------------------------------------- */
  console.log("\nClosing the loop");
  const { data: action, error: actionErr } = await A.from("leader_actions")
    .insert({
      unit_id: unit.id,
      cycle_id: cycle.id,
      theme_key: "equipment",
      description: "Create a dedicated IV pump location for admissions.",
      owner: "Unit educator",
      status: "in_progress",
    })
    .select("id")
    .single();
  check("leader A creates an action", actionErr?.message ?? "ok", "ok");

  const { error: updateErr } = await A.from("team_updates").insert({
    unit_id: unit.id,
    action_id: action?.id ?? null,
    you_said: "Several of you said finding an IV pump during an admission slowed the shift down.",
    we_did: "We created a dedicated IV pump location in the east equipment room.",
    status: "published",
    published_at: new Date().toISOString(),
  });
  check("leader A publishes a You said / We did", updateErr?.message ?? "ok", "ok");

  check("leader B sees none of A's actions", (await B.from("leader_actions").select("id")).data?.length ?? 0, 0);
  check("leader B sees none of A's updates", (await B.from("team_updates").select("id")).data?.length ?? 0, 0);

  /* -- anonymous surface -------------------------------------------------- */
  console.log("\nAnonymous surface");
  const anon = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const destructive = await anon.rpc("finalize_story", {
    p_cycle_id: cycle.id,
    p_model: "verify",
    p_themes: [],
  });
  check("anon is refused on finalize_story", Boolean(destructive.error), true);
  check("anon reads no units", (await anon.from("units").select("id")).data?.length ?? 0, 0);
  check("anon reads no responses", (await anon.from("responses").select("id")).data?.length ?? 0, 0);
} catch (err) {
  failed++;
  console.error(`\n  ERROR  ${err instanceof Error ? err.message : String(err)}`);
} finally {
  console.log("\nCleaning up test data…");
  await cleanup();
  const { count } = await admin
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .like("name", `%${tag}%`);
  console.log(`  leftover verification orgs: ${count ?? 0}`);
}

console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}  (${passed} passed)\n`);
process.exit(failed === 0 ? 0 : 1);
