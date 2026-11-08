import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { searchBarLabels } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { getDestinationCounts, getLocations } from "@/lib/data/catalog";
import { parseSearchParams, toQueryString } from "@/lib/search-params";
import { todayPK } from "@/lib/dates";
import { ELEVATION_M } from "@/config/geo";
import { SearchBar } from "@/components/search/search-bar";
import { Filters } from "@/components/search/filters";
import { Results, ResultsSkeleton } from "@/components/search/results";
import { LocationMap } from "@/components/property/location-map";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = (await getLocations()).find((l) => l.slug === slug);
  return loc ? { title: `Stays in ${loc.name}`, description: loc.intro ?? undefined } : {};
}

export default async function DestinationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [{ t, locale }, locations, counts] = await Promise.all([getDictionary(), getLocations(), getDestinationCounts()]);
  const loc = locations.find((l) => l.slug === slug);
  if (!loc) notFound();
  const p = parseSearchParams({ ...(await searchParams), where: slug });
  const n = counts.get(slug) ?? 0;
  const name = locale === "ur" && loc.name_ur ? loc.name_ur : loc.name;
  return (
    <>
      <section className="relative isolate overflow-hidden bg-forest-deep">
        {loc.hero_image_url && <Image src={loc.hero_image_url} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-70" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep via-forest-deep/40 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-24 text-white sm:px-6 sm:pt-36">
          <p className="flex items-center gap-1.5 text-white/80"><MapPin className="h-4 w-4" aria-hidden />{loc.province}{ELEVATION_M[slug] != null && <span className="num">, {ELEVATION_M[slug].toLocaleString("en")} m</span>}</p>
          <h1 className="mt-1 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-none">{name}</h1>
          {loc.intro && <p className="mt-4 max-w-2xl text-lg text-white/85">{loc.intro}</p>}
          <p className="num mt-3 text-white/70">{n === 0 ? "No stays listed here yet." : `${n} ${n === 1 ? "stay" : "stays"} available`}</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-7 relative z-10">
          <SearchBar variant="hero" today={todayPK()} locations={locations.map(({ slug, name, province }) => ({ slug, name, province }))} labels={searchBarLabels(t)}
            initial={{ where: slug, checkin: p.checkin, checkout: p.checkout, adults: p.adults, children: p.children, infants: p.infants }} />
        </div>
        {loc.popular_areas.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">Popular areas</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {loc.popular_areas.map((a) => (
                <li key={a}><Link href={`/search?${toQueryString({ q: a })}`} className="inline-block rounded-full border border-line bg-white px-4 py-1.5 text-sm hover:border-forest/50">{a}</Link></li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className="space-y-6">
            <Filters p={p} t={t} action={`/destinations/${slug}`} />
            <LocationMap lat={Number(loc.latitude)} lng={Number(loc.longitude)} label={loc.name} zoom={11} />
          </aside>
          <Suspense key={toQueryString(p)} fallback={<ResultsSkeleton />}><Results p={p} basePath={`/destinations/${slug}`} /></Suspense>
        </div>
      </div>
    </>
  );
}
