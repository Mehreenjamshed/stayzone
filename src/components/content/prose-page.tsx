import type { ReactNode } from "react";

export function ProsePage({ title, intro, draft, children }: { title: string; intro?: ReactNode; draft?: boolean; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold">{title}</h1>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      {draft && (
        <p className="mt-6 rounded-xl border border-gold/50 bg-sand/60 px-4 py-3 text-sm">
          Draft for review. This text must be checked by a qualified Pakistani lawyer before launch.
        </p>
      )}
      <div className="mt-10 space-y-5 text-[17px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ms-5 [&_li]:list-disc [&_ul]:space-y-2 [&_a]:text-forest [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
