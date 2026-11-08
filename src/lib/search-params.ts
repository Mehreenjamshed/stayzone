import { z } from "zod";
import { isIsoDate, todayPK } from "@/lib/dates";
import type { PropertyCategory, SpaceType } from "@/types/db";

export const CATEGORIES: PropertyCategory[] = [
  "APARTMENT", "VILLA", "FARMHOUSE", "HOTEL", "GUEST_HOUSE", "RESORT", "MOUNTAIN_CABIN",
  "PRIVATE_ROOM", "HOSTEL", "ENTIRE_HOME", "SERVICED_APARTMENT", "COTTAGE", "SHARED_ROOM",
];
export const CATEGORY_SLUGS: Record<string, PropertyCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.toLowerCase().replace(/_/g, "-"), c]),
);
export const categorySlug = (c: PropertyCategory) => c.toLowerCase().replace(/_/g, "-");
export const SORTS = ["recommended", "price_asc", "price_desc", "rating", "reviews"] as const;
export const FILTER_AMENITIES = ["wifi", "air_conditioning", "heating", "parking", "kitchen", "pool", "generator", "breakfast", "family_friendly", "pet_friendly"] as const;
export const PAGE_SIZE = 18;

const int = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(min).max(max).optional());
const list = (v: unknown) => (v == null || v === "" ? [] : Array.isArray(v) ? v : String(v).split(","));

const schema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  where: z.string().regex(/^[a-z0-9-]+$/).max(60).optional().catch(undefined),
  checkin: z.string().optional().catch(undefined),
  checkout: z.string().optional().catch(undefined),
  adults: int(1, 30).catch(undefined),
  children: int(0, 20).catch(undefined),
  infants: int(0, 10).catch(undefined),
  type: z.preprocess(list, z.array(z.enum(CATEGORIES as [PropertyCategory, ...PropertyCategory[]]))).catch([]),
  space: z.preprocess(list, z.array(z.enum(["ENTIRE_PLACE", "PRIVATE_ROOM", "SHARED_ROOM"] as [SpaceType, ...SpaceType[]]))).catch([]),
  min: int(0, 10_000_000).catch(undefined),
  max: int(0, 10_000_000).catch(undefined),
  beds: int(0, 20).catch(undefined),
  baths: int(0, 20).catch(undefined),
  amenity: z.preprocess(list, z.array(z.enum(FILTER_AMENITIES))).catch([]),
  instant: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  verified: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  rating: z.preprocess((v) => (v ? Number(v) : undefined), z.number().min(1).max(5).optional()).catch(undefined),
  sort: z.enum(SORTS).catch("recommended"),
  page: int(1, 500).catch(undefined),
});

export type SearchParams = z.infer<typeof schema> & { checkin?: string; checkout?: string };

export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const p = schema.parse(raw);
  // Dates must be valid ISO, not in the past, and checkout after checkin; otherwise ignore both.
  const today = todayPK();
  if (!(isIsoDate(p.checkin) && isIsoDate(p.checkout) && p.checkin >= today && p.checkout > p.checkin)) {
    p.checkin = undefined;
    p.checkout = undefined;
  }
  if (p.min != null && p.max != null && p.min > p.max) [p.min, p.max] = [p.max, p.min];
  return p;
}

export function toQueryString(p: Partial<SearchParams>, overrides: Record<string, string | number | undefined | null> = {}) {
  const u = new URLSearchParams();
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "" && v !== false && !(Array.isArray(v) && !v.length)) u.set(k, Array.isArray(v) ? v.join(",") : String(v === true ? 1 : v)); };
  for (const [k, v] of Object.entries(p)) set(k, v);
  for (const [k, v] of Object.entries(overrides)) { u.delete(k); set(k, v); }
  if (u.get("sort") === "recommended") u.delete("sort");
  return u.toString();
}
