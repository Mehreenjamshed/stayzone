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
export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
