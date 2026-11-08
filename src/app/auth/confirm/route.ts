import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

/**
 * Handles links from Supabase emails (signup verification, password recovery).
 * Supports both the token_hash template (recommended) and the PKCE ?code= flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), "/account");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);
  const dest = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(`${origin}${dest}${type === "signup" || type === "email" ? (dest.includes("?") ? "&" : "?") + "welcome=1" : ""}`);
}
