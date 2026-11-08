import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getFxRates, searchProperties } from "@/lib/data/catalog";
import { parseSearchParams } from "@/lib/search-params";
import { PropertyCard } from "@/components/property/property-card";

export const metadata: Metadata = { title: "Saved stays" };

export default async function FavoritesPage() {
  const { user } = await requireUser("/account/favorites");
  const supabase = await createClient();
  const [{ t, locale }, display, rates, favs] = await Promise.all([
    getDictionary(), getDisplayCurrency(), getFxRates(),
    supabase.from("favorites").select("property_id").eq("user_id", user.id),
  ]);
  const ids = new Set((favs.data ?? []).map((f) => f.property_id as string));
  // Reuse public search so only currently-approved stays show, with live prices.
  const all = ids.size ? (await searchProperties(parseSearchParams({}), { limit: 60 })).results.filter((r) => ids.has(r.id)) : [];
  return (
    <div>
      <h1 className="text-3xl font-semibold">Saved stays</h1>
      {all.length ? (
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((p) => <PropertyCard key={p.id} p={p} t={t} display={display} rates={rates} locale={locale} saved signedIn />)}
        </div>
      ) : <p className="mt-4 text-muted">Tap the heart on any stay to save it here. <Link href="/search" className="text-forest underline">Browse stays</Link></p>}
    </div>
  );
}
