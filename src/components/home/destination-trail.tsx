import Link from "next/link";
import Image from "next/image";
import { ELEVATION_M } from "@/config/geo";
import type { Location } from "@/types/db";

/**
 * Destinations ordered north → south (by latitude). The bar under each card is
 * that place's elevation on a shared scale — the trip from the Karakoram to the sea.
 */
export function DestinationTrail({ locations, counts, locale, staysLabel }: {
  locations: Location[]; counts: Map<string, number>; locale: string; staysLabel: (n: number) => string;
}) {
  const ordered = [...locations].sort((a, b) => Number(b.latitude) - Number(a.latitude));
  const maxElev = Math.max(...ordered.map((l) => ELEVATION_M[l.slug] ?? 0), 1);
  return (
    <ol className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      {ordered.map((l) => {
        const elev = ELEVATION_M[l.slug];
        const n = counts.get(l.slug) ?? 0;
        return (
          <li key={l.slug} className="w-[13.5rem] shrink-0 snap-start">
            <Link href={`/destinations/${l.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-forest to-forest-deep">
                {l.hero_image_url && (
                  <Image src={l.hero_image_url} alt="" fill sizes="216px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <p className="text-xl font-semibold leading-tight">{locale === "ur" && l.name_ur ? l.name_ur : l.name}</p>
                  <p className="text-[13px] text-white/80">{l.province}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="flex h-10 w-1.5 flex-col justify-end overflow-hidden rounded-full bg-sand" aria-hidden>
                  <div className="w-full rounded-full bg-forest" style={{ height: `${Math.max(6, ((elev ?? 0) / maxElev) * 100)}%` }} />
                </div>
                <div className="text-sm leading-tight">
                  {elev != null && <p className="num font-medium">{elev.toLocaleString("en")} m</p>}
                  <p className="text-muted">{staysLabel(n)}</p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
