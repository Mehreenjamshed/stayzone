import { z } from "zod";

/** Public env — safe for the browser. Validated lazily so pages can show a setup notice. */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("false"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function getPublicEnv(): PublicEnv | null {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || undefined,
  });
  return parsed.success ? parsed.data : null;
}

export const isConfigured = () => getPublicEnv() !== null;
/**
 * Demo listings are shown when NEXT_PUBLIC_DEMO_MODE=true, or automatically when no
 * database is connected yet (unless explicitly set to "false"). For the real launch,
 * connect Supabase and set NEXT_PUBLIC_DEMO_MODE=false.
 */
export const isDemoMode = () => {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  return flag === "true" || (flag !== "false" && !isConfigured());
};
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Launch phase. "waitlist" (default) = soft launch: browsing + sign-up forms, no bookings.
 * "live" = bookings open (after host tools, admin approval and payments are ready).
 */
export const launchPhase = (): "waitlist" | "live" => (process.env.NEXT_PUBLIC_LAUNCH_PHASE === "live" ? "live" : "waitlist");
export const isWaitlistPhase = () => launchPhase() === "waitlist";
