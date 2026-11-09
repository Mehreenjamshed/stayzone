import "server-only";
/**
 * Database-free demo catalogue (src/data/demo-catalog.json, exported from the
 * real database by scripts/demo/export-demo-catalog.sh). Used only when Supabase
 * isn't configured AND NEXT_PUBLIC_DEMO_MODE=true, so the site can be shown
 * online before a database exists. Read-only: nothing can be booked.
 */
import raw from "@/data/demo-catalog.json";
import { PAGE_SIZE, type SearchParams } from "@/lib/search-params";
import type { Listing, Location, PropertyDetail, Review, SearchResult } from "@/types/db";

export type DemoListing = Listing & { weekly_discount_bps: number; monthly_discount_bps: number; is_active: boolean };
type DemoProperty = Omit<PropertyDetail, "listings"> & {
  is_featured: boolean; approved_at: string; host_verified: boolean;
  listings: DemoListing[];
  reviews: Review[];
};
type HostCard = { id: string; display_name: string; about: string | null; languages: string[]; response_time_hours: number | null; is_verified: boolean; hosting_since: string; avatar_url: string | null };

const data = raw as unknown as {
  settings: Record<string, unknown>;
  locations: Location[];
  properties: DemoProperty[];
  hosts: Record<string, HostCard>;
};

export const demoSettings = data.settings;
export const demoLocations = data.locations;
export const demoProperties = data.properties;
export const demoHost = (id: string) => data.hosts[id] ?? null;
export const demoPropertyBySlug = (slug: string) => data.properties.find((p) => p.slug === slug) ?? null;
export const demoListing = (propertyId: string, unitGroup: string) =>
  data.properties.find((p) => p.id === propertyId)?.listings.filter((l) => l.unit_group === unitGroup).sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;

function toResult(p: DemoProperty, eligible: DemoListing[]): SearchResult {
  const cover = [...p.property_photos].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)[0];
  return {
    id: p.id, slug: p.slug, title: p.title, category: p.category, space_type: p.space_type, city: p.city, province: p.province,
    area: p.area, location_slug: p.location?.slug ?? null, latitude: p.latitude, longitude: p.longitude, cover_url: cover?.url ?? null,
    price_from_minor: Math.min(...eligible.map((l) => Number(l.nightly_price_minor))), currency: p.currency,
    max_guests: Math.max(...eligible.map((l) => l.max_guests)), bedrooms: Math.max(...eligible.map((l) => l.bedrooms)),
    bathrooms: Math.max(...eligible.map((l) => Number(l.bathrooms))), rating_avg: Number(p.rating_avg), rating_count: p.rating_count,
    booking_mode: p.booking_mode, host_verified: p.host_verified, is_demo: true, is_featured: p.is_featured, total_count: 0,
  };
}

/** Same filters and ordering as public.search_properties(). Demo data has no bookings, so all dates are free. */
export function demoSearch(p: SearchParams, limit = PAGE_SIZE) {
  const guests = Math.max(1, (p.adults ?? 1) + (p.children ?? 0));
  const nights = p.checkin && p.checkout ? Math.round((Date.parse(p.checkout) - Date.parse(p.checkin)) / 86_400_000) : null;
  const q = p.q?.toLowerCase();
  const rows: SearchResult[] = [];
  for (const prop of data.properties) {
    const eligible = prop.listings.filter((l) => l.is_active && l.max_guests >= guests && (nights == null || (nights >= l.min_nights && nights <= l.max_nights)));
    if (!eligible.length) continue;
    const r = toResult(prop, eligible);
    const amen = new Set(prop.listing_amenities.map((a) => a.amenities.code));
    if (p.where && r.location_slug !== p.where) continue;
    if (q && ![prop.city, prop.title, prop.area ?? "", prop.province, prop.location?.name ?? ""].some((s) => s.toLowerCase().includes(q))) continue;
    if (p.type.length && !p.type.includes(prop.category)) continue;
    if (p.space.length && !p.space.includes(prop.space_type)) continue;
    if (p.min != null && r.price_from_minor < p.min * 100) continue;
    if (p.max != null && r.price_from_minor > p.max * 100) continue;
    if (p.beds != null && r.bedrooms < p.beds) continue;
    if (p.baths != null && r.bathrooms < p.baths) continue;
    if (p.amenity.length && !p.amenity.every((a) => amen.has(a))) continue;
    if (p.instant && prop.booking_mode !== "INSTANT") continue;
    if (p.verified && !prop.host_verified) continue;
    if (p.rating != null && r.rating_avg < p.rating) continue;
    rows.push(r);
  }
  const score = (r: SearchResult) => Number(r.is_featured) * 2 + Number(r.host_verified) + r.rating_avg * Math.min(r.rating_count, 20) / 20;
  const cmp: Record<string, (a: SearchResult, b: SearchResult) => number> = {
    price_asc: (a, b) => a.price_from_minor - b.price_from_minor,
    price_desc: (a, b) => b.price_from_minor - a.price_from_minor,
    rating: (a, b) => b.rating_avg - a.rating_avg,
    reviews: (a, b) => b.rating_count - a.rating_count,
    recommended: (a, b) => score(b) - score(a),
  };
  rows.sort((a, b) => (cmp[p.sort] ?? cmp.recommended)(a, b) || a.id.localeCompare(b.id));
  const page = p.page ?? 1;
  const slice = rows.slice((page - 1) * limit, page * limit).map((r) => ({ ...r, total_count: rows.length }));
  return { results: slice, total: rows.length };
}

export function demoDestinationCounts() {
  const m = new Map<string, number>();
  for (const p of data.properties) if (p.location) m.set(p.location.slug, (m.get(p.location.slug) ?? 0) + 1);
  return m;
}
