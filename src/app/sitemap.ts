import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/env";
import { getLocations, searchProperties } from "@/lib/data/catalog";
import { CATEGORIES, categorySlug, parseSearchParams } from "@/lib/search-params";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages = ["", "/search", "/waitlist", "/become-a-host", "/how-it-works", "/about", "/help", "/contact", "/terms", "/privacy", "/cancellation-policy"]
    .map((p) => ({ url: base + p, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const [locations, props] = await Promise.all([
    getLocations().catch(() => []),
    searchProperties(parseSearchParams({}), { limit: 60 }).then((r) => r.results).catch(() => []),
  ]);
  return [
    ...pages,
    ...locations.map((l) => ({ url: `${base}/destinations/${l.slug}`, lastModified: now, priority: 0.8 })),
    ...CATEGORIES.map((c) => ({ url: `${base}/categories/${categorySlug(c)}`, lastModified: now, priority: 0.5 })),
    ...props.map((p) => ({ url: `${base}/property/${p.slug}`, lastModified: now, priority: 0.7 })),
  ];
}
