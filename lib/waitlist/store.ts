import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { createSupabaseContext } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";

import type { WaitlistInput } from "./schema";

export type SignupResult = { created: boolean };

export interface WaitlistStore {
  /**
   * Persists a signup. Returns `created: false` when the email is already on
   * the list — a duplicate is not an error, the caller shows the same success
   * panel either way so the form never leaks who has already signed up.
   */
  add(entry: WaitlistInput): Promise<SignupResult>;
  readonly kind: "supabase" | "postgres" | "file";
}

/* -------------------------------------------------------------------------- */
/* Supabase                                                                   */
/* -------------------------------------------------------------------------- */

const TABLE = "waitlist_signups";

/** Postgres unique-violation. Raised when the email is already on the list. */
const UNIQUE_VIOLATION = "23505";

/** PostgREST: relation missing from the schema cache. */
const UNDEFINED_TABLE = "PGRST205";

class SupabaseStore implements WaitlistStore {
  readonly kind = "supabase" as const;

  constructor(private readonly client: SupabaseClient) {}

  async add(entry: WaitlistInput): Promise<SignupResult> {
    // No `.select()` on purpose: the row is never read back, so the insert
    // needs no read path and nothing about existing signups is returned.
    const { error } = await this.client.from(TABLE).insert({
      first_name: entry.firstName,
      last_name: entry.lastName,
      email: entry.email,
      organization: entry.org,
      role: entry.role,
      unit: entry.unit || null,
      issue: entry.issue || null,
    });

    if (!error) return { created: true };

    if (error.code === UNIQUE_VIOLATION) return { created: false };

    if (error.code === UNDEFINED_TABLE) {
      throw new Error(
        `Supabase has no "${TABLE}" table. Run supabase/migrations/0001_waitlist_signups.sql ` +
          "in the SQL Editor, then try again.",
      );
    }

    throw new Error(`Supabase insert failed (${error.code ?? "unknown"}): ${error.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Postgres                                                                   */
/* -------------------------------------------------------------------------- */

const CREATE_TABLE = `
  create table if not exists waitlist_signups (
    id            bigint generated always as identity primary key,
    first_name    text        not null,
    last_name     text        not null,
    email         text        not null unique,
    organization  text        not null,
    role          text        not null,
    unit          text,
    issue         text,
    created_at    timestamptz not null default now()
  )
`;

function createPool(url: string): Pool {
  // Hosted Postgres (Supabase, Neon, Heroku, RDS) terminates TLS with a chain
  // node does not trust by default. DATABASE_SSL=false opts out for a local
  // server or a provider with a proper chain.
  const useSsl = (process.env.DATABASE_SSL ?? "true").toLowerCase() !== "false";
  return new Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
}

class PostgresStore implements WaitlistStore {
  readonly kind = "postgres" as const;
  private ready: Promise<void> | null = null;

  constructor(private readonly pool: Pool) {}

  private ensureSchema(): Promise<void> {
    // Run the DDL once per process, and let a failure clear the memo so the
    // next request retries instead of latching a rejected promise forever.
    this.ready ??= this.pool.query(CREATE_TABLE).then(
      () => undefined,
      (err) => {
        this.ready = null;
        throw err;
      },
    );
    return this.ready;
  }

  async add(entry: WaitlistInput): Promise<SignupResult> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `insert into waitlist_signups
         (first_name, last_name, email, organization, role, unit, issue)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (email) do nothing`,
      [
        entry.firstName,
        entry.lastName,
        entry.email,
        entry.org,
        entry.role,
        entry.unit || null,
        entry.issue || null,
      ],
    );
    return { created: (result.rowCount ?? 0) > 0 };
  }
}

/* -------------------------------------------------------------------------- */
/* Local file (development only)                                              */
/* -------------------------------------------------------------------------- */

class FileStore implements WaitlistStore {
  readonly kind = "file" as const;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  async add(entry: WaitlistInput): Promise<SignupResult> {
    // Serialize writes through a promise chain so two concurrent submissions
    // cannot interleave a read-check-append and duplicate an email.
    const run = this.queue.then(() => this.append(entry));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async append(entry: WaitlistInput): Promise<SignupResult> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });

    let existing = "";
    try {
      existing = await fs.readFile(this.file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }

    const alreadyListed = existing
      .split("\n")
      .filter(Boolean)
      .some((line) => {
        try {
          return (JSON.parse(line) as { email?: string }).email === entry.email;
        } catch {
          return false;
        }
      });

    if (alreadyListed) return { created: false };

    const row = {
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email,
      organization: entry.org,
      role: entry.role,
      unit: entry.unit || null,
      issue: entry.issue || null,
      createdAt: new Date().toISOString(),
    };

    await fs.appendFile(this.file, `${JSON.stringify(row)}\n`, "utf8");
    return { created: true };
  }
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

let fallbackStore: WaitlistStore | null = null;

function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim());
}

/**
 * Resolves the backend for a request, in priority order:
 *
 *   1. Supabase, when `SUPABASE_URL` is set.
 *   2. Direct Postgres, when `DATABASE_URL` is set.
 *   3. A local JSONL file — development only.
 */
export async function getWaitlistStore(request: Request): Promise<WaitlistStore> {
  if (supabaseConfigured()) {
    if (!process.env.SUPABASE_SECRET_KEY?.trim()) {
      // Falling back to the publishable key would hit RLS and fail with an
      // opaque permission error, so say plainly what is missing instead.
      throw new Error(
        "SUPABASE_SECRET_KEY is not set. Waitlist writes use the secret key so they " +
          "bypass Row-Level Security; the publishable key cannot write this table. " +
          "Copy the full key from Supabase → Project Settings → API Keys.",
      );
    }

    // `auth: "none"` because there is no user to verify — this is an
    // unauthenticated public form. The write goes through `supabaseAdmin`,
    // which uses the secret key and bypasses RLS.
    const { data, error } = await createSupabaseContext(request, { auth: "none" });
    if (error) throw error;

    return new SupabaseStore(data.supabaseAdmin);
  }

  if (fallbackStore) return fallbackStore;

  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    fallbackStore = new PostgresStore(createPool(url));
  } else {
    if (process.env.NODE_ENV === "production") {
      // Serverless filesystems are ephemeral and per-instance: writing signups
      // there loses them. Fail loudly at the first request rather than accept
      // submissions into a file that is about to disappear.
      throw new Error(
        "No waitlist storage configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY " +
          "(or DATABASE_URL) — the local file store is for development only.",
      );
    }
    console.warn(
      "[waitlist] No Supabase or Postgres configured — writing signups to .data/waitlist.jsonl (development only).",
    );
    fallbackStore = new FileStore(path.join(process.cwd(), ".data", "waitlist.jsonl"));
  }

  return fallbackStore;
}
