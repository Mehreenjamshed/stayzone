import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Headphones, Lock, ReceiptText, Wallet } from "lucide-react";
import { brand } from "@/config/brand";
import { CATEGORY_TILES, img } from "@/config/geo";
import { searchBarLabels } from "@/lib/i18n/dictionaries";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getDestinationCounts, getFavoriteIds, getFxRates, getLocations, searchProperties } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/auth/dal";
import { parseSearchParams, categorySlug } from "@/lib/search-params";
import { todayPK } from "@/lib/dates";
import { SearchBar } from "@/components/search/search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { DestinationTrail } from "@/components/home/destination-trail";
import { ButtonLink } from "@/components/ui/button";
import type { PropertyCategory } from "@/types/db";

export default async function HomePage() {
  const [{ t, locale }, display, user] = await Promise.all([getDictionary(), getDisplayCurrency(), getSessionUser()]);
  const [locations, counts, rates, featured, favs] = await Promise.all([
    getLocations(), getDestinationCounts(), getFxRates(),
    searchProperties(parseSearchParams({}), { limit: 8 }).catch(() => ({ results: [], total: 0 })),
    getFavoriteIds(user?.id),
  ]);
  const trust = [
    { icon: BadgeCheck, c: t.trust.verified }, { icon: ReceiptText, c: t.trust.pricing }, { icon: Lock, c: t.trust.secure },
    { icon: Wallet, c: t.trust.local }, { icon: Headphones, c: t.trust.support },
  ];
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image src={img("1514558427911-8e293bebf18c", 2400)} alt="The Hunza valley from above, with the river winding between mountains" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-deep/70 via-forest-deep/35 to-forest-deep/80" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-32">
          <div className="hero-rise max-w-3xl text-white">
            <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{t.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">{t.hero.subtitle}</p>
          </div>
          <div className="mt-10 max-w-5xl">
            <SearchBar today={todayPK()} locations={locations.map(({ slug, name, province }) => ({ slug, name, province }))}
              labels={searchBarLabels(t)} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.categories}</h2>
        <ul className="scrollbar-none -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {CATEGORY_TILES.map((c) => (
            <li key={c.cat} className="w-48 shrink-0 lg:w-auto">
              <Link href={`/categories/${categorySlug(c.cat as PropertyCategory)}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-2 pe-4 transition-colors hover:border-forest/40">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                  <Image src={img(c.photo, 200)} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <span className="text-[15px] font-medium leading-tight">{"label" in c && locale === "en" ? c.label : t.categories[c.cat as PropertyCategory]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Destinations, north to south */}
      {locations.length > 0 && <section id="destinations" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.destinations}</h2>
          <p className="mt-1.5 text-muted">{t.home.destinationsSub}</p>
        </div>
        <DestinationTrail locations={locations.filter((l) => l.is_featured)} counts={counts} locale={locale}
          staysLabel={(n) => (n === 0 ? (locale === "ur" ? "جلد آ رہا ہے" : "Opening soon") : locale === "ur" ? `${n} قیام` : `${n} ${n === 1 ? "stay" : "stays"}`)} />
      </section>}

      {/* Featured stays (approved, database-backed) */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.featured}</h2>
          {featured.results.length > 0 && <Link href="/search" className="shrink-0 text-forest underline-offset-4 hover:underline">{t.home.seeAll}</Link>}
        </div>
        {featured.results.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.results.map((p, i) => (
              <PropertyCard key={p.id} p={p} t={t} display={display} rates={rates} locale={locale} saved={favs.has(p.id)} signedIn={!!user} priority={i < 2} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">{t.home.featuredEmpty}</p>
        )}
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.trustTitle}</h2>
        <dl className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {trust.map(({ icon: Icon, c }) => (
            <div key={c[0]}>
              <dt className="flex items-center gap-2 font-medium"><Icon className="h-5 w-5 text-gold" aria-hidden />{c[0]}</dt>
              <dd className="mt-1.5 text-sm text-muted">{c[1]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Host acquisition */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="grid overflow-hidden rounded-[2rem] bg-sand md:grid-cols-[1.1fr_1fr]">
          <div className="p-8 sm:p-12">
            <h2 className="text-3xl font-semibold sm:text-4xl">{t.home.hostTitle}</h2>
            <p className="mt-4 max-w-md text-charcoal/80">{t.home.hostSub.replace("{brand}", brand.name)}</p>
            <ButtonLink href="/become-a-host" size="lg" className="mt-8">{t.home.hostCta}</ButtonLink>
          </div>
          <div className="relative min-h-64">
            <Image src={img("1596178067639-5c6e68aea6dc", 1400)} alt="" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>
    </>
  );
}
