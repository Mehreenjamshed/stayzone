"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { DISPLAY_CURRENCIES } from "@/lib/money";
import { bookingErrorMessage } from "@/lib/booking-errors";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/, "Enter a valid phone number, e.g. +92 300 1234567").or(z.literal("")),
  country: z.string().trim().regex(/^[A-Z]{2}$/).or(z.literal("")),
  bio: z.string().trim().max(1000),
  preferred_language: z.enum(["en", "ur"]),
  preferred_currency: z.enum(DISPLAY_CURRENCIES),
});

export type ProfileState = { ok?: boolean; errors?: Record<string, string>; message?: string };

export async function updateProfile(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const { user } = await requireUser();
  const v = profileSchema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { errors: Object.fromEntries(v.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    ...v.data, phone: v.data.phone || null, country: v.data.country || null, bio: v.data.bio || null,
  }).eq("id", user.id);
  if (error) return { message: "We couldn't save your profile. Try again." };
  revalidatePath("/account");
  return { ok: true };
}

export async function cancelUnpaid(bookingId: string) {
  await requireUser();
  const id = z.uuid().parse(bookingId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_unpaid_booking", { p_booking: id, p_reason: "Cancelled by guest" });
  revalidatePath(`/account/bookings/${id}`);
  return error ? { error: bookingErrorMessage(error.message) } : { ok: true };
}
