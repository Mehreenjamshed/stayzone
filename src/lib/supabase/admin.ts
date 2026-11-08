import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * SERVICE ROLE client — bypasses RLS. Server-only (the "server-only" import makes
 * the build fail if this file is ever imported into browser code).
 * Use ONLY after verifying the caller's permissions (see lib/auth/dal.ts).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
