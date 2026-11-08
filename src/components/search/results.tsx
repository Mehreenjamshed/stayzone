import Link from "next/link";
import { SearchX } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { getDictionary, getDisplayCurrency } from "@/lib/i18n/server";
import { getFavoriteIds, getFxRates, searchProperties } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/auth/dal";
import { PAGE_SIZE, toQueryString, type SearchParams } from "@/lib/search-params";
import { Alert } from "@/components/ui/field";

export async function Results({ p, basePath }: { p: SearchParams; basePath: string }) {
  const [{ t, locale }, display, user, rates] = await Promise.all([getDictionary(), getDisplayCurrency(), getSessionUser(), getFxRates()]);
  let data;
  try {
    data = await searchProperties(p);
  } catch {
    return <Alert tone="error">We couldn’t load stays right now. Refresh the page to try again.</Alert>;
  }
  const favs = await getFavoriteIds(user?.id);
  const page = p.page ?? 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  // Carry dates & guests into the property page so its price check is pre-filled.
  const carry = toQueryString({ checkin: p.checkin, checkout: p.checkout, adults: p.adults, children: p.children, infants: p.infants });

  if (!data.results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <SearchX className="mx-auto h-8 w-8 text-muted" aria-hidden />
        <p className="mt-3 text-lg font-medium">{t.search.noResults}</p>
        <p className="mt-1 text-muted">{t.search.noResultsHint}</p>
        <Link href={basePath} className="mt-5 inline-block text-forest underline">{t.search.clear}</Link>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-5 text-muted" aria-live="polite">{t.search.results(data.total)}{display !== "PKR" && <span className="ms-2 text-xs">· {t.common.indicative}</span>}</p>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {data.results.map((r, i) => (
          <PropertyCard key={r.id} p={r} t={t} display={display} rates={rates} locale={locale} saved={favs.has(r.id)} signedIn={!!user} query={carry} priority={i < 3} />
        ))}
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-4">
          {page > 1 ? <Link className="rounded-xl border border-line bg-white px-4 py-2 hover:border-charcoal/40" href={`${basePath}?${toQueryString(p, { page: page - 1 })}`}>{t.search.prev}</Link> : <span />}
          <span className="num text-sm text-muted">{t.search.page(page, pages)}</span>
          {page < pages ? <Link className="rounded-xl border border-line bg-white px-4 py-2 hover:border-charcoal/40" href={`${basePath}?${toQueryString(p, { page: page + 1 })}`}>{t.search.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading stays">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse"><div className="aspect-[4/3] rounded-[var(--radius-card)] bg-sand" /><div className="mt-3 h-4 w-3/4 rounded bg-sand" /><div className="mt-2 h-4 w-1/2 rounded bg-sand/70" /></div>
      ))}
    </div>
  );
}
