"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/dal";

export async function toggleFavorite(propertyId: string) {
  const id = z.uuid().safeParse(propertyId);
  const user = await getSessionUser();
  if (!id.success || !user) return { ok: false };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("favorites").select("property_id").eq("user_id", user.id).eq("property_id", id.data).maybeSingle();
  if (existing) await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", id.data);
  else await supabase.from("favorites").insert({ user_id: user.id, property_id: id.data });
  revalidatePath("/account/favorites");
  return { ok: true, saved: !existing };
}
