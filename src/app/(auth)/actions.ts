"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isConfigured, siteUrl } from "@/config/env";
import { safeNext } from "@/lib/utils";
import { forgotSchema, loginSchema, registerSchema, resetSchema, type FormState } from "./schemas";
import { rateLimit } from "@/lib/rate-limit";
import type { z } from "zod";

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}
async function clientKey(scope: string) {
  const h = await headers();
  return `${scope}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown"}`;
}
const notConfigured: FormState = { message: "Sign-in isn't available yet: the site's Supabase keys are not configured." };

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured()) return notConfigured;
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!rateLimit(await clientKey("login"), 10, 15 * 60_000)) return { message: "Too many attempts. Wait a few minutes and try again.", values };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { message: "Confirm your email first — check your inbox for the verification link.", values };
    return { message: "That email and password don't match. Check them and try again.", values };
  }
  redirect(safeNext(formData.get("next"), "/"));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured()) return notConfigured;
  const values = { email: String(formData.get("email") ?? ""), fullName: String(formData.get("fullName") ?? "") };
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"), email: formData.get("email"),
    password: formData.get("password"), terms: formData.get("terms") === "on",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!rateLimit(await clientKey("signup"), 5, 60 * 60_000)) return { message: "Too many sign-ups from this network. Try again later.", values };
  const supabase = await createClient();
  const next = safeNext(formData.get("next"), "/account");
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { errors: { password: "Choose a stronger password" }, values };
    if (error.code === "over_email_send_rate_limit") return { message: "We've sent too many emails recently. Try again in a few minutes.", values };
    return { message: "We couldn't create your account. Check your details and try again.", values };
  }
  // Same response whether or not the email already exists (prevents account enumeration).
  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured()) return notConfigured;
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (!rateLimit(await clientKey("reset"), 5, 60 * 60_000)) return { message: "Too many requests. Try again later." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured()) return notConfigured;
  const parsed = resetSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { message: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: error.code === "same_password" ? "Choose a password you haven't used before." : "We couldn't update your password. Try again." };
  redirect("/account?updated=password");
}

export async function signOut() {
  if (isConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
