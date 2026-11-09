import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import * as Icons from "lucide-react";
import { Star } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { getHostCard, getFavoriteIds, getPropertyBySlug, getPropertyReviews } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/auth/dal";
import { parseSearchParams } from "@/lib/search-params";
import { todayPK } from "@/lib/dates";
import { DemoBadge, InstantBadge, VerifiedBadge } from "@/components/property/badges";
import { FavoriteButton } from "@/components/property/favorite-button";
import { BookingWidget } from "@/components/property/booking-widget";
import { LocationMap } from "@/components/property/location-map";
import { Alert } from "@/components/ui/field";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const POLICY: Record<string, string> = {
  FLEXIBLE: "Free cancellation up to 24 hours before check-in.",
  MODERATE: "Free cancellation up to 5 days before check-in. After that, the first night is non-refundable.",
  STRICT: "50% refund up to 7 days before check-in. No refund after that.",
  NON_REFUNDABLE: "This booking is non-refundable.",
};

function AmenityIcon({ name }: { name: string }) {
  const key = name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("") as keyof typeof Icons;
  const I = (Icons[key] ?? Icons.Check) as Icons.LucideIcon;
  return <I className="h-5 w-5 text-forest" aria-hidden />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPropertyBySlug((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.description.slice(0, 160), openGraph: { images: p.property_photos[0]?.url ? [p.property_photos[0].url] : [] } };
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) notFound();
  const sp = parseSearchParams(await searchParams);
  const [{ t, locale }, user, reviews, host] = await Promise.all([getDictionary(), getSessionUser(), getPropertyReviews(p.id), getHostCard(p.host_id)]);
  const favs = await getFavoriteIds(user?.id);
  const photos = p.property_photos;
  const first = p.listings[0];

  // Group identical units (e.g. 4 × Deluxe room) into one choice.
  const groupsMap = new Map<string, { key: string; name: string; maxGuests: number; fromMinor: number; units: number }>();
  for (const l of p.listings) {
    const g = groupsMap.get(l.unit_group);
    if (g) { g.units++; g.fromMinor = Math.min(g.fromMinor, Number(l.nightly_price_minor)); }
    else groupsMap.set(l.unit_group, { key: l.unit_group, name: l.name.replace(/\s\d+$/, ""), maxGuests: l.max_guests, fromMinor: Number(l.nightly_price_minor), units: 1 });
  }
  const groups = [...groupsMap.values()];
  const amenities = [...new Map(p.listing_amenities.map((a) => [a.amenities.code, a.amenities])).values()];
  const rules = [
    [t.property.checkInAfter, p.check_in_time.slice(0, 5)], [t.property.checkOutBefore, p.check_out_time.slice(0, 5)],
    ["Smoking", p.smoking_allowed ? "Allowed" : "Not allowed"], ["Pets", p.pets_allowed ? "Allowed" : "Not allowed"],
    ["Parties or events", p.parties_allowed ? "Allowed" : "Not allowed"], ["Children", p.children_allowed ? "Welcome" : "Not suitable"],
  ];
  const sub = (k: "cleanliness" | "accuracy" | "location" | "communication" | "value") => {
    const v = reviews.map((r) => r[k]).filter((x): x is number => x != null);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {p.is_demo && <div className="mb-5"><Alert tone="warning">{t.property.demoNote}</Alert></div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-[2.1rem] sm:leading-tight">{p.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
            {p.rating_count > 0 && <span className="num flex items-center gap-1 text-charcoal"><Star className="h-4 w-4 fill-charcoal" aria-hidden />{Number(p.rating_avg).toFixed(2)} <a href="#reviews" className="underline">{t.property.reviews(p.rating_count)}</a></span>}
            <span>{[p.area, p.city, p.province].filter(Boolean).join(", ")}</span>
            {p.location && <Link className="text-forest underline-offset-4 hover:underline" href={`/destinations/${p.location.slug}`}>More in {p.location.name}</Link>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {p.is_demo && <DemoBadge label={t.property.demo} />}
          <FavoriteButton propertyId={p.id} initialSaved={favs.has(p.id)} signedIn={!!user} labels={{ save: t.property.save, saved: t.property.saved }} className="border border-line" />
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6 grid h-[min(62vw,30rem)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[1.5rem]">
        {photos.slice(0, 5).map((ph, i) => (
          <div key={ph.id} className={`relative bg-sand ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"}`}>
            <Image src={ph.url} alt={ph.alt || p.title} fill priority={i === 0} sizes={i === 0 ? "(min-width:640px) 50vw, 100vw" : "25vw"} className="object-cover" />
          </div>
        ))}
        {photos.length === 0 && <div className="col-span-4 row-span-2 grid place-items-center bg-sand text-muted">No photos yet</div>}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <div className="border-b border-line pb-8">
            <h2 className="text-xl font-semibold">{t.categoryOne[p.category]}{host ? ` ${t.property.hostedBy.toLowerCase()} ${host.display_name}` : ""}</h2>
            {first && <p className="num mt-1 text-muted">{[t.property.guests(Math.max(...p.listings.map((l) => l.max_guests))), t.property.bedrooms(first.bedrooms), t.property.beds(first.beds), t.property.baths(Number(first.bathrooms))].join(" · ")}</p>}
            <div className="mt-3 flex flex-wrap gap-4">
              {host?.is_verified && <VerifiedBadge label={t.property.verifiedHost} className="text-sm" />}
              {p.booking_mode === "INSTANT" && <InstantBadge label={t.property.instant} />}
            </div>
          </div>
          <div className="max-w-[68ch] border-b border-line py-8 whitespace-pre-line text-charcoal/90">{p.description}</div>

          {groups.length > 1 && (
            <section className="border-b border-line py-8">
              <h2 className="text-xl font-semibold">{t.property.units}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <li key={g.key} className="rounded-2xl border border-line bg-white p-4">
                    <p className="font-medium">{g.name}</p>
                    <p className="num text-sm text-muted">Up to {g.maxGuests} guests · {g.units} {g.units === 1 ? "room" : "rooms"}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {amenities.length > 0 && (
            <section className="border-b border-line py-8">
              <h2 className="text-xl font-semibold">{t.property.amenities}</h2>
              <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {amenities.map((a) => <li key={a.code} className="flex items-center gap-3"><AmenityIcon name={a.icon} />{locale === "ur" && a.name_ur ? a.name_ur : a.name}</li>)}
              </ul>
            </section>
          )}

          <section id="reviews" className="border-b border-line py-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              {p.rating_count > 0 ? <><Star className="h-5 w-5 fill-charcoal" aria-hidden /><span className="num">{Number(p.rating_avg).toFixed(2)}</span> · {t.property.reviews(p.rating_count)}</> : "No reviews yet"}
            </h2>
            {reviews.length > 0 && (
              <>
                <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-5">
                  {(["cleanliness", "accuracy", "location", "communication", "value"] as const).map((k) => sub(k) && (
                    <div key={k}><dt className="capitalize text-muted">{k}</dt><dd className="num font-medium">{sub(k)}</dd></div>
                  ))}
                </dl>
                <ul className="mt-8 grid gap-8 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <li key={r.id}>
                      <p className="font-medium">{r.demo_author_name ?? "Verified guest"}{r.is_demo && <span className="ms-2 text-xs font-normal text-muted">(demo review)</span>}</p>
                      <p className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString(locale === "ur" ? "ur-PK" : "en-GB", { month: "long", year: "numeric" })} · <span className="num">{"★".repeat(r.overall)}</span></p>
                      {r.body && <p className="mt-2 text-charcoal/90">{r.body}</p>}
                      {r.host_response && <p className="mt-3 border-s-2 border-sand-deep ps-3 text-sm text-muted">Host response: {r.host_response}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="border-b border-line py-8">
            <h2 className="text-xl font-semibold">{t.property.location}</h2>
            <div className="mt-5 max-w-2xl">
              {p.latitude != null && p.longitude != null
                ? <LocationMap lat={Number(p.latitude)} lng={Number(p.longitude)} label={p.title} zoom={13} approximate />
                : <p className="text-muted">{[p.area, p.city].filter(Boolean).join(", ")}</p>}
            </div>
          </section>

          <section className="grid gap-8 py-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold">{t.property.rules}</h2>
              <dl className="mt-4 space-y-2 text-[15px]">
                {rules.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2"><dt className="text-muted">{k}</dt><dd className="num">{v}</dd></div>)}
              </dl>
              {p.id_required && <p className="mt-3 text-sm text-muted">Guests must show an original CNIC or passport at check-in.</p>}
              {p.house_rules && <p className="mt-3 whitespace-pre-line text-sm">{p.house_rules}</p>}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t.property.cancellation}</h2>
              <p className="mt-4 text-[15px]">{POLICY[p.cancellation_policy]}</p>
              <Link href="/cancellation-policy" className="mt-2 inline-block text-sm text-forest underline">How cancellations work</Link>
            </div>
          </section>

          {host && (
            <section className="rounded-[1.5rem] bg-sand/60 p-6">
              <h2 className="text-xl font-semibold">{t.property.hostedBy} {host.display_name}</h2>
              <p className="mt-1 text-sm text-muted">Hosting since {new Date(host.hosting_since).getFullYear()}{host.response_time_hours ? ` · Usually responds within ${host.response_time_hours} ${host.response_time_hours === 1 ? "hour" : "hours"}` : ""}</p>
              {host.about && <p className="mt-3 max-w-[65ch]">{host.about}</p>}
              <p className="mt-4 text-sm text-muted">To keep your payment and booking protected, always pay and message through {""}the platform.</p>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingWidget propertyId={p.id} groups={groups} currency={p.currency} today={todayPK()} mode={p.booking_mode} isDemo={p.is_demo}
            initial={{ checkin: sp.checkin, checkout: sp.checkout, adults: sp.adults, children: sp.children, infants: sp.infants }}
            labels={{ perNight: t.property.perNight, checkIn: t.search.checkIn, checkOut: t.search.checkOut, adults: t.search.adults, children: t.search.children, infants: t.search.infants, instant: t.property.instant, request: t.property.request, demo: t.property.demo }} />
        </aside>
      </div>
    </div>
  );
}
