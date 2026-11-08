import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isConfigured, isDemoMode } from "@/config/env";
import { PAGE_SIZE, type SearchParams } from "@/lib/search-params";
import type { DisplayCurrency } from "@/lib/money";
import type { Location, PropertyDetail, Review, SearchResult } from "@/types/db";

export class DataError extends Error {}

export const getLocations = cache(async (): Promise<Location[]> => {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("locations").select("*").order("sort_order");
  if (error) throw new DataError(error.message);
  return (data ?? []) as Location[];
});

export const getFxRates = cache(async (): Promise<Partial<Record<DisplayCurrency, number>>> => {
  if (!isConfigured()) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "public.fx_rates").maybeSingle();
  return (data?.value as Partial<Record<DisplayCurrency, number>>) ?? {};
});

export async function searchProperties(p: SearchParams, opts: { limit?: number } = {}) {
  if (!isConfigured()) return { results: [] as SearchResult[], total: 0 };
  const supabase = await createClient();
  const limit = opts.limit ?? PAGE_SIZE;
  const page = p.page ?? 1;
  const guests = (p.adults ?? 1) + (p.children ?? 0);
  const { data, error } = await supabase.rpc("search_properties", {
    p_query: p.q ?? null,
    p_location_slug: p.where ?? null,
    p_check_in: p.checkin ?? null,
    p_check_out: p.checkout ?? null,
    p_guests: Math.max(guests, 1),
    p_categories: p.type.length ? p.type : null,
    p_space_types: p.space.length ? p.space : null,
    p_min_price: p.min != null ? p.min * 100 : null,
    p_max_price: p.max != null ? p.max * 100 : null,
    p_bedrooms: p.beds ?? null,
    p_bathrooms: p.baths ?? null,
    p_amenities: p.amenity.length ? p.amenity : null,
    p_instant_only: p.instant,
    p_verified_only: p.verified,
    p_min_rating: p.rating ?? null,
    p_include_demo: isDemoMode(),
    p_sort: p.sort,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });
  if (error) throw new DataError(error.message);
  const results = (data ?? []) as SearchResult[];
  return { results, total: Number(results[0]?.total_count ?? 0) };
}

export const getPropertyBySlug = cache(async (slug: string): Promise<PropertyDetail | null> => {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(`id, slug, title, description, category, space_type, area, city, province, latitude, longitude,
      check_in_time, check_out_time, smoking_allowed, pets_allowed, parties_allowed, children_allowed, infants_allowed,
      id_required, house_rules, currency, cancellation_policy, booking_mode, rating_avg, rating_count, is_demo, host_id, status,
      location:locations(slug, name),
      listings(id, name, unit_group, space_type, base_guests, max_guests, bedrooms, beds, bathrooms, nightly_price_minor,
        weekend_price_minor, cleaning_fee_minor, extra_guest_fee_minor, security_deposit_minor, min_nights, max_nights, sort_order, is_active, deleted_at),
      property_photos(id, url, alt, sort_order, is_cover),
      listing_amenities(listing_id, amenities(code, name, name_ur, icon, grp))`)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new DataError(error.message);
  if (!data) return null;
  type RawListing = PropertyDetail["listings"][number] & { is_active: boolean; deleted_at: string | null };
  const d = data as unknown as Omit<PropertyDetail, "listings"> & { status: string; listings: RawListing[] };
  // Public visitors only see approved listings; demo listings only in demo mode.
  if (d.status !== "APPROVED") return null;
  if (d.is_demo && !isDemoMode()) return null;
  d.property_photos.sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  return { ...d, listings: d.listings.filter((l) => l.is_active && !l.deleted_at).sort((a, b) => a.sort_order - b.sort_order) };
});

export async function getPropertyReviews(propertyId: string, limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, overall, cleanliness, accuracy, location, communication, value, body, host_response, is_demo, demo_author_name, created_at")
    .eq("property_id", propertyId).eq("status", "PUBLISHED")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Review[];
}

export async function getHostCard(hostId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("public_host_cards").select("*").eq("id", hostId).maybeSingle();
  return data as { id: string; display_name: string; about: string | null; languages: string[]; response_time_hours: number | null; is_verified: boolean; hosting_since: string; avatar_url: string | null } | null;
}

export async function getFavoriteIds(userId: string | undefined) {
  if (!userId) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("property_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.property_id as string));
}

/** Count of approved, bookable stays per destination (database-backed). */
export async function getDestinationCounts() {
  if (!isConfigured()) return new Map<string, number>();
  const supabase = await createClient();
  let q = supabase.from("properties").select("location:locations(slug)").eq("status", "APPROVED").is("deleted_at", null);
  if (!isDemoMode()) q = q.eq("is_demo", false);
  const { data } = await q;
  const m = new Map<string, number>();
  for (const r of (data ?? []) as unknown as { location: { slug: string } | null }[]) {
    if (r.location) m.set(r.location.slug, (m.get(r.location.slug) ?? 0) + 1);
  }
  return m;
}
