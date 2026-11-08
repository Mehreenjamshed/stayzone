import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { SearchResult } from "@/types/db";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { DisplayCurrency } from "@/lib/money";
import { DemoBadge, VerifiedBadge } from "./badges";
import { Price } from "./price";
import { FavoriteButton } from "./favorite-button";

export function PropertyCard({ p, t, display, rates, locale, saved, signedIn, query, priority }: {
  p: SearchResult; t: Dictionary; display: DisplayCurrency; rates: Partial<Record<DisplayCurrency, number>>;
  locale: string; saved?: boolean; signedIn?: boolean; query?: string; priority?: boolean;
}) {
  const href = `/property/${p.slug}${query ? `?${query}` : ""}`;
  return (
    <article className="card-lift group relative">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-sand">
        {p.cover_url ? (
          <Image src={p.cover_url} alt={p.title} fill priority={priority} sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : <div className="grid h-full place-items-center text-sm text-muted">{p.title}</div>}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          {p.is_demo ? <DemoBadge label={t.property.demo} /> : <span />}
          <FavoriteButton propertyId={p.id} initialSaved={!!saved} signedIn={!!signedIn} labels={{ save: t.property.save, saved: t.property.saved }} />
        </div>
      </div>
      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-medium">
            <Link href={href} className="after:absolute after:inset-0 focus:outline-none">{p.title}</Link>
          </h3>
          {p.rating_count > 0 ? (
            <span className="num flex shrink-0 items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-charcoal" aria-hidden />{Number(p.rating_avg).toFixed(2)} <span className="text-muted">({p.rating_count})</span></span>
          ) : <span className="shrink-0 text-sm text-muted">{t.property.new}</span>}
        </div>
        <p className="text-sm text-muted">{[p.area, p.city].filter(Boolean).join(", ")} · {t.categories[p.category]}</p>
        <p className="text-sm text-muted">{t.property.guests(p.max_guests)}{p.host_verified && <> · <VerifiedBadge label={t.property.verifiedHost} className="relative z-10 align-middle" /></>}</p>
        <p className="pt-1 text-[15px]">
          <span className="text-sm text-muted">{t.property.from} </span>
          <Price minor={p.price_from_minor} currency={p.currency} display={display} rates={rates} locale={locale} />
          <span className="text-sm text-muted"> / {t.property.perNight}</span>
        </p>
      </div>
    </article>
  );
}
