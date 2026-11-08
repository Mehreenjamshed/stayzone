import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl lg:grid-cols-[1fr_1.1fr]">
      <div className="flex items-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
        </div>
      </div>
      <div aria-hidden className="relative hidden overflow-hidden rounded-s-[2rem] bg-forest lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1579196900052-a6034632c042?auto=format&fit=crop&w=1400&q=80" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent" />
      </div>
    </div>
  );
}
