import "server-only";

/**
 * Simple in-memory sliding-window limiter. Good enough for a single instance;
 * on Vercel each instance has its own memory, so for production scale swap the
 * store for Upstash Redis / Vercel KV (same function signature).
 * Supabase Auth also applies its own server-side rate limits.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
