import { Suspense } from "react";
import type { Metadata } from "next";
import { searchBarLabels } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { getLocations } from "@/lib/data/catalog";
import { parseSearchParams, toQueryString } from "@/lib/search-params";
import { todayPK } from "@/lib/dates";
import { SearchBar } from "@/components/search/search-bar";
import { Filters } from "@/components/search/filters";
import { Results, ResultsSkeleton } from "@/components/search/results";

export const metadata: Metadata = { title: "Search stays" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseSearchParams(await searchParams);
  const [{ t }, locations] = await Promise.all([getDictionary(), getLocations()]);
  const where = locations.find((l) => l.slug === p.where);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SearchBar variant="compact" today={todayPK()} locations={locations.map(({ slug, name, province }) => ({ slug, name, province }))} labels={searchBarLabels(t)}
        initial={{ where: p.where, q: p.q, checkin: p.checkin, checkout: p.checkout, adults: p.adults, children: p.children, infants: p.infants }} />
      <h1 className="mt-8 text-2xl font-semibold sm:text-3xl">{where ? `Stays in ${where.name}` : p.q ? `Stays matching “${p.q}”` : "All stays in Pakistan"}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside><Filters p={p} t={t} action="/search" /></aside>
        <Suspense key={toQueryString(p)} fallback={<ResultsSkeleton />}>
          <Results p={p} basePath="/search" />
        </Suspense>
      </div>
    </div>
  );
}
