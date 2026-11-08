"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/dal";
import { bookingErrorMessage } from "@/lib/booking-errors";
import { isIsoDate } from "@/lib/dates";

const input = z.object({
  propertyId: z.uuid(),
  unitGroup: z.string().min(1).max(60),
  checkin: z.string().refine(isIsoDate),
  checkout: z.string().refine(isIsoDate),
  adults: z.coerce.number().int().min(1).max(30),
  children: z.coerce.number().int().min(0).max(20),
  infants: z.coerce.number().int().min(0).max(10),
});

export type Quote = {
  nights: number; currency: string; nightly: { date: string; price_minor: number }[];
  accommodation_minor: number; discount_minor: number; discount_bps: number; cleaning_fee_minor: number;
  extra_guest_fee_minor: number; guest_fee_minor: number; tax_minor: number; total_minor: number;
  security_deposit_minor: number; booking_mode: "INSTANT" | "REQUEST";
};

/** Price check. The server computes everything; the browser only sends dates and guest counts. */
export async function getQuote(raw: z.input<typeof input>): Promise<{ quote?: Quote; error?: string }> {
  const v = input.safeParse(raw);
  if (!v.success) return { error: "Choose valid dates and guests." };
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id")
    .eq("property_id", v.data.propertyId).eq("unit_group", v.data.unitGroup).eq("is_active", true).is("deleted_at", null)
    .order("sort_order").limit(1).maybeSingle();
  if (!listing) return { error: bookingErrorMessage("LISTING_NOT_FOUND") };
  const { data, error } = await supabase.rpc("quote_booking", {
    p_listing: listing.id, p_check_in: v.data.checkin, p_check_out: v.data.checkout,
    p_adults: v.data.adults, p_children: v.data.children, p_infants: v.data.infants,
  });
  if (error) return { error: bookingErrorMessage(error.message) };
  // Is any unit in the group free for these dates?
  const { data: units } = await supabase.from("listings").select("id")
    .eq("property_id", v.data.propertyId).eq("unit_group", v.data.unitGroup).eq("is_active", true).is("deleted_at", null);
  let free = false;
  for (const u of units ?? []) {
    const { data: ok } = await supabase.rpc("listing_is_available", { p_listing: u.id, p_check_in: v.data.checkin, p_check_out: v.data.checkout });
    if (ok) { free = true; break; }
  }
  if (!free) return { error: bookingErrorMessage("DATES_UNAVAILABLE") };
  return { quote: data as Quote };
}

export async function reserve(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const v = input.safeParse(Object.fromEntries(formData));
  if (!v.success) return { error: "Choose valid dates and guests." };
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(String(formData.get("returnTo") ?? "/"))}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_property: v.data.propertyId, p_unit_group: v.data.unitGroup,
    p_check_in: v.data.checkin, p_check_out: v.data.checkout,
    p_adults: v.data.adults, p_children: v.data.children, p_infants: v.data.infants,
    p_message: String(formData.get("message") ?? "").slice(0, 2000) || null,
  });
  if (error) return { error: bookingErrorMessage(error.message) };
  redirect(`/account/bookings/${(data as { id: string }).id}?new=1`);
}
