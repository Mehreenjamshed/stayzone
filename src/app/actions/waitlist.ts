"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/config/env";
import { rateLimit } from "@/lib/rate-limit";
import { CATEGORIES } from "@/lib/search-params";
import type { PropertyCategory } from "@/types/db";

export type WaitlistState = { ok?: boolean; already?: boolean; message?: string; errors?: Record<string, string> };

const base = {
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email address").trim().toLowerCase().max(200),
  consent: z.literal("on", { error: "Please agree so we can contact you" }),
  source: z.string().max(60).optional(),
};
const hostSchema = z.object({
  ...base,
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/, "Enter a phone number, e.g. +92 300 1234567"),
  whatsapp_ok: z.string().optional(),
  city: z.string().trim().min(2, "Enter the city or area").max(80),
  property_type: z.enum(CATEGORIES as [PropertyCategory, ...PropertyCategory[]], { error: "Choose a property type" }),
  units: z.coerce.number().int().min(1, "At least 1").max(500),
  nightly_price_pkr: z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(/[, ]/g, ""))),
    z.number().int().min(500, "Too low").max(2_000_000).optional()),
  message: z.string().trim().max(1000).optional(),
});
const guestSchema = z.object({ ...base, city: z.string().trim().max(80).optional() });

async function guard(fd: FormData): Promise<WaitlistState | null> {
  if (fd.get("website")) return { ok: true }; // honeypot: bots fill hidden fields; pretend success
  if (!isConfigured()) return { message: "Sign-ups open as soon as the site's database is connected. Please try again soon." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`waitlist:${ip}`, 8, 60 * 60_000)) return { message: "Too many sign-ups from this network. Please try again later." };
  return null;
}
const errorsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

async function insert(row: Record<string, unknown>): Promise<WaitlistState> {
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_signups").insert(row);
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: true, already: true };
  return { message: "We couldn't save your details. Check them and try again." };
}

export async function joinAsHost(_: WaitlistState, fd: FormData): Promise<WaitlistState> {
  const g = await guard(fd); if (g) return g;
  const v = hostSchema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { errors: errorsOf(v.error) };
  const d = v.data;
  return insert({
    kind: "HOST", full_name: d.full_name, email: d.email, phone: d.phone, whatsapp_ok: d.whatsapp_ok === "on",
    city: d.city, property_type: d.property_type, units: d.units, nightly_price_pkr: d.nightly_price_pkr ?? null,
    message: d.message || null, source: d.source || null, consent: true,
  });
}

export async function joinAsGuest(_: WaitlistState, fd: FormData): Promise<WaitlistState> {
  const g = await guard(fd); if (g) return g;
  const v = guestSchema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { errors: errorsOf(v.error) };
  const d = v.data;
  return insert({ kind: "GUEST", full_name: d.full_name, email: d.email, city: d.city || null, source: d.source || null, consent: true });
}
