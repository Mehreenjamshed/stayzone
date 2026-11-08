import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/config/env";
import type { HostProfile, Profile } from "@/types/db";

/**
 * Data Access Layer: the ONE place that decides who the caller is.
 * Every protected page and server action must go through these helpers.
 * Roles come from the database (profiles), never from the browser.
 */
export const getSessionUser = cache(async () => {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(); // verified with the Auth server
  if (error || !data.user) return null;
  return data.user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});

export async function requireUser(next = "/account") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile.is_suspended) redirect("/suspended");
  return { user, profile };
}

export async function requireHost(next = "/host") {
  const ctx = await requireUser(next);
  if (!ctx.profile.is_host) redirect("/host/onboarding");
  const supabase = await createClient();
  const { data } = await supabase.from("host_profiles").select("*").eq("id", ctx.user.id).maybeSingle();
  return { ...ctx, hostProfile: (data as HostProfile | null) ?? null };
}

export async function requireAdmin() {
  const ctx = await requireUser("/admin");
  if (!ctx.profile.is_admin) redirect("/");
  return ctx;
}
