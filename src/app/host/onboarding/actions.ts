"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  display_name: z.string().trim().min(2, "Enter the name guests will see").max(80),
  host_type: z.enum(["INDIVIDUAL", "PROPERTY_MANAGER", "HOTEL", "COMPANY"]),
  business_name: z.string().trim().max(120),
  about: z.string().trim().max(2000),
  languages: z.array(z.enum(["en", "ur", "pa", "ps", "sd", "bal", "ar"])).min(1, "Choose at least one language"),
});

export type HostState = { errors?: Record<string, string>; message?: string };

export async function activateHost(_: HostState, fd: FormData): Promise<HostState> {
  const { user, profile } = await requireUser("/host/onboarding");
  const v = schema.safeParse({
    display_name: fd.get("display_name"), host_type: fd.get("host_type"), business_name: fd.get("business_name") ?? "",
    about: fd.get("about") ?? "", languages: fd.getAll("languages"),
  });
  if (!v.success) return { errors: Object.fromEntries(v.error.issues.map((i) => [String(i.path[0]), i.message])) };
  if (!user.email_confirmed_at) return { message: "Verify your email before you start hosting." };
  const supabase = await createClient();
  if (!profile.is_host) {
    const { error } = await supabase.from("profiles").update({ is_host: true }).eq("id", user.id);
    if (error) return { message: "We couldn't turn on hosting. Try again." };
  }
  const { error } = await supabase.from("host_profiles").upsert({
    id: user.id, ...v.data, business_name: v.data.business_name || null, about: v.data.about || null,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (error) return { message: "We couldn't save your host profile. Try again." };
  redirect("/host?welcome=1");
}
