import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { CATEGORY_SLUGS, parseSearchParams, toQueryString } from "@/lib/search-params";
import { Filters } from "@/components/search/filters";
import { Results, ResultsSkeleton } from "@/components/search/results";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = CATEGORY_SLUGS[(await params).slug];
  const { t } = await getDictionary();
  return cat ? { title: `${t.categories[cat]} in Pakistan` } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = CATEGORY_SLUGS[slug];
  if (!cat) notFound();
  const { t } = await getDictionary();
  const p = parseSearchParams({ ...(await searchParams), type: cat });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t.categories[cat]}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside><Filters p={p} t={t} action={`/categories/${slug}`} lockedCategory={cat} /></aside>
        <Suspense key={toQueryString(p)} fallback={<ResultsSkeleton />}><Results p={p} basePath={`/categories/${slug}`} /></Suspense>
      </div>
    </div>
  );
}
