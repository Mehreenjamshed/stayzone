import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Headphones, Lock, ReceiptText, Wallet } from "lucide-react";
import { brand } from "@/config/brand";
import { CATEGORY_TILES, img } from "@/config/geo";
import { searchBarLabels } from "@/lib/i18n/dictionaries";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getDestinationCounts, getFavoriteIds, getFxRates, getIntSetting, getLocations, searchProperties } from "@/lib/data/catalog";
import { HeroSlideshow, type Slide } from "@/components/home/hero-slideshow";
import { EarningsCalculator } from "@/components/home/earnings-calculator";
import { Reveal } from "@/components/motion/reveal";
import { GuestWaitlistForm } from "@/components/waitlist/forms";
import { isWaitlistPhase } from "@/config/env";
import { getSessionUser } from "@/lib/auth/dal";
import { parseSearchParams, categorySlug } from "@/lib/search-params";
import { todayPK } from "@/lib/dates";
import { SearchBar } from "@/components/search/search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { DestinationTrail } from "@/components/home/destination-trail";
import { ButtonLink } from "@/components/ui/button";
import type { PropertyCategory } from "@/types/db";

const SLIDES: Slide[] = [
  { photo: img("1514558427911-8e293bebf18c", 2400), place: "Hunza", region: "Gilgit-Baltistan", elevation: 2438, alt: "The Hunza river winding between mountains" },
  { photo: img("1784223011681-30a45846cd6f", 2400), place: "Skardu", region: "Gilgit-Baltistan", elevation: 2228, alt: "A turquoise lake beneath snowy peaks" },
  { photo: img("1624087267589-41ea77e28b1a", 2400), place: "Swat", region: "Khyber Pakhtunkhwa", elevation: 980, alt: "Forested valley and river in Swat" },
  { photo: img("1608020932658-d0e19a69580b", 2400), place: "Islamabad", region: "Capital Territory", elevation: 540, alt: "Faisal Mosque before the Margalla Hills" },
  { photo: img("1603491656337-3b491147917c", 2400), place: "Lahore", region: "Punjab", elevation: 217, alt: "Badshahi Mosque's red sandstone and white domes" },
];

export default async function HomePage() {
  const [{ t, locale }, display, user] = await Promise.all([getDictionary(), getDisplayCurrency(), getSessionUser()]);
  const [locations, counts, rates, featured, favs, commissionBps] = await Promise.all([
    getLocations(), getDestinationCounts(), getFxRates(),
    searchProperties(parseSearchParams({}), { limit: 8 }).catch(() => ({ results: [], total: 0 })),
    getFavoriteIds(user?.id),
    getIntSetting("fees.host_commission_bps", 800),
  ]);
  const trust = [
    { icon: BadgeCheck, c: t.trust.verified }, { icon: ReceiptText, c: t.trust.pricing }, { icon: Lock, c: t.trust.secure },
    { icon: Wallet, c: t.trust.local }, { icon: Headphones, c: t.trust.support },
  ];
  return (
    <>
      {/* Hero: cinematic landscapes of Pakistan */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        <HeroSlideshow slides={SLIDES} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/15 to-forest-deep/85" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/35 via-transparent to-transparent rtl:bg-gradient-to-l" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-40 sm:px-6 sm:pt-36">
          <div className="max-w-3xl text-white">
            <h1 className="text-[clamp(2.6rem,7vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.04em] [text-shadow:0_2px_30px_rgb(0_0_0/0.25)]">
              {t.hero.title.split(" ").map((w, i) => (
                <span key={i} className="hero-word" style={{ ["--i" as string]: i }}>{w}&nbsp;</span>
              ))}
            </h1>
            <p className="hero-after mt-6 max-w-xl text-lg text-white/90 sm:text-xl" style={{ ["--d" as string]: 650 }}>{t.hero.subtitle}</p>
          </div>
          <div className="hero-after mt-10 max-w-5xl" style={{ ["--d" as string]: 850 }}>
            <SearchBar today={todayPK()} locations={locations.map(({ slug, name, province }) => ({ slug, name, province }))}
              labels={searchBarLabels(t)} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 id="categories" className="reveal scroll-mt-24 text-2xl font-semibold sm:text-3xl">{t.home.categories}</h2>
        <ul className="reveal-stagger scrollbar-none -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:grid lg:grid-cols-5 lg:overflow-visible">
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
      </Reveal>

      {/* Destinations, north to south */}
      {locations.length > 0 && <section id="destinations" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24 sm:px-6">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.destinations}</h2>
          <p className="mt-1.5 text-muted">{t.home.destinationsSub}</p>
        </div>
        <DestinationTrail locations={locations.filter((l) => l.is_featured)} counts={counts} locale={locale}
          staysLabel={(n) => (n === 0 ? (locale === "ur" ? "جلد آ رہا ہے" : "Opening soon") : locale === "ur" ? `${n} قیام` : `${n} ${n === 1 ? "stay" : "stays"}`)} />
      </section>}

      {/* Featured stays (approved, database-backed) */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="reveal mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t.home.featured}</h2>
          {featured.results.length > 0 && <Link href="/search" className="shrink-0 text-forest underline-offset-4 hover:underline">{t.home.seeAll}</Link>}
        </div>
        {featured.results.length ? (
          <div className="reveal-stagger grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.results.map((p, i) => (
              <PropertyCard key={p.id} p={p} t={t} display={display} rates={rates} locale={locale} saved={favs.has(p.id)} signedIn={!!user} priority={i < 2} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">{t.home.featuredEmpty}</p>
        )}
      </Reveal>

      {/* Launch list (soft launch) */}
      {isWaitlistPhase() && (
        <Reveal as="section" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <div className="reveal grid gap-8 rounded-[2rem] border border-line bg-white p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Be first to book when we open</h2>
              <p className="mt-3 text-muted">We’re onboarding verified hosts across Pakistan. Join the list for early access.</p>
            </div>
            <GuestWaitlistForm source="home" />
          </div>
        </Reveal>
      )}

      {/* Trust */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <h2 className="reveal text-2xl font-semibold sm:text-3xl">{t.home.trustTitle}</h2>
        <dl className="reveal-stagger mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {trust.map(({ icon: Icon, c }) => (
            <div key={c[0]}>
              <dt className="flex items-center gap-2 font-medium"><Icon className="h-5 w-5 text-gold" aria-hidden />{c[0]}</dt>
              <dd className="mt-1.5 text-sm text-muted">{c[1]}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* Host acquisition with live earnings estimate */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="reveal relative isolate overflow-hidden rounded-[2rem] bg-forest-deep text-ivory">
          <Image src={img("1596178067639-5c6e68aea6dc", 1800)} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-deep via-forest-deep/85 to-forest-deep/40 rtl:bg-gradient-to-l" />
          <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:p-16">
            <div>
              <h2 className="text-3xl font-semibold sm:text-[2.6rem] sm:leading-tight">{t.home.hostTitle}</h2>
              <p className="mt-4 max-w-md text-lg text-ivory/80">{t.home.hostSub.replace("{brand}", brand.name)}</p>
              <ButtonLink href={isWaitlistPhase() ? "/become-a-host#list" : "/become-a-host"} size="lg" className="mt-8 bg-gold text-charcoal hover:bg-[#d4b57e]">{isWaitlistPhase() ? "Register your property" : t.home.hostCta}</ButtonLink>
            </div>
            <div className="text-charcoal"><EarningsCalculator commissionBps={commissionBps} /></div>
          </div>
        </div>
      </Reveal>
    </>
  );
}
