// Hand-maintained row types for the tables the app reads.
// Regenerate full types later with: npx supabase gen types typescript --project-id <id>
export type PropertyCategory =
  | "ENTIRE_HOME" | "PRIVATE_ROOM" | "SHARED_ROOM" | "APARTMENT" | "SERVICED_APARTMENT" | "VILLA"
  | "FARMHOUSE" | "GUEST_HOUSE" | "HOTEL" | "RESORT" | "COTTAGE" | "MOUNTAIN_CABIN" | "HOSTEL";
export type SpaceType = "ENTIRE_PLACE" | "PRIVATE_ROOM" | "SHARED_ROOM";
export type BookingMode = "INSTANT" | "REQUEST";

export type Profile = {
  id: string; full_name: string; email: string | null; phone: string | null; avatar_url: string | null;
  bio: string | null; preferred_language: "en" | "ur"; preferred_currency: string; country: string | null;
  is_host: boolean; is_admin: boolean; is_suspended: boolean; created_at: string;
};

export type HostProfile = {
  id: string; display_name: string; about: string | null; business_name: string | null; host_type: string;
  languages: string[]; verification_status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  onboarding_completed_at: string | null;
};

export type Location = {
  id: string; slug: string; name: string; name_ur: string | null; province: string;
  latitude: number; longitude: number; intro: string | null; hero_image_url: string | null;
  popular_areas: string[]; is_featured: boolean; sort_order: number;
};

export type SearchResult = {
  id: string; slug: string; title: string; category: PropertyCategory; space_type: SpaceType;
  city: string; province: string; area: string | null; location_slug: string | null;
  latitude: number | null; longitude: number | null; cover_url: string | null;
  price_from_minor: number; currency: string; max_guests: number; bedrooms: number; bathrooms: number;
  rating_avg: number; rating_count: number; booking_mode: BookingMode; host_verified: boolean;
  is_demo: boolean; is_featured: boolean; total_count: number;
};

export type Listing = {
  id: string; name: string; unit_group: string; space_type: SpaceType; base_guests: number; max_guests: number;
  bedrooms: number; beds: number; bathrooms: number; nightly_price_minor: number; weekend_price_minor: number | null;
  cleaning_fee_minor: number; extra_guest_fee_minor: number; security_deposit_minor: number;
  min_nights: number; max_nights: number; sort_order: number;
};

export type PropertyDetail = {
  id: string; slug: string; title: string; description: string; category: PropertyCategory; space_type: SpaceType;
  area: string | null; city: string; province: string; latitude: number | null; longitude: number | null;
  check_in_time: string; check_out_time: string; smoking_allowed: boolean; pets_allowed: boolean;
  parties_allowed: boolean; children_allowed: boolean; infants_allowed: boolean; id_required: boolean;
  house_rules: string | null; currency: string; cancellation_policy: string; booking_mode: BookingMode;
  rating_avg: number; rating_count: number; is_demo: boolean; host_id: string;
  location: { slug: string; name: string } | null;
  listings: Listing[];
  property_photos: { id: string; url: string; alt: string; sort_order: number; is_cover: boolean }[];
  listing_amenities: { listing_id: string | null; amenities: { code: string; name: string; name_ur: string | null; icon: string; grp: string } }[];
};

export type Review = {
  id: string; overall: number; cleanliness: number | null; accuracy: number | null; location: number | null;
  communication: number | null; value: number | null; body: string | null; host_response: string | null;
  is_demo: boolean; demo_author_name: string | null; created_at: string;
};
