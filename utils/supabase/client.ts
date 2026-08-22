import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for Client Components. Uses the publishable key, which is
 * public by design — every query it makes is governed by Row-Level Security.
 */
export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
