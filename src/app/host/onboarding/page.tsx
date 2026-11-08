import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { HostForm } from "./host-form";
import type { HostProfile } from "@/types/db";

export const metadata: Metadata = { title: "Start hosting" };

export default async function HostOnboardingPage() {
  const { user, profile } = await requireUser("/host/onboarding");
  const supabase = await createClient();
  const { data } = await supabase.from("host_profiles").select("*").eq("id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">{data ? "Your host profile" : "Start hosting"}</h1>
      <p className="mt-2 text-muted">Tell guests who they’ll be staying with. Next, you’ll add your property and submit your documents for verification.</p>
      <ol className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
        {["Host profile", "Add your property", "Verification review"].map((s, i) => (
          <li key={s} className={`rounded-xl border px-3 py-2 ${i === 0 ? "border-forest bg-forest-tint" : "border-line bg-white text-muted"}`}><span className="num">{i + 1}.</span> {s}</li>
        ))}
      </ol>
      <div className="mt-8"><HostForm initial={data as HostProfile | null} defaultName={profile.full_name.split(" ")[0] ?? ""} /></div>
    </div>
  );
}
