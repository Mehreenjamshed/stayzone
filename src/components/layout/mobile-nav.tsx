"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ links, signedIn, labels, prefs }: {
  links: { href: string; label: string }[]; signedIn: boolean; prefs: ReactNode;
  labels: { menu: string; login: string; signup: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-sand/60 group-data-[clear]:hover:bg-white/15" aria-label={labels.menu} aria-expanded={open}>
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-charcoal/40" onClick={() => setOpen(false)}>
          <nav aria-label={labels.menu} onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 end-0 flex w-[min(20rem,85vw)] flex-col gap-1 bg-ivory p-5 text-charcoal shadow-[var(--shadow-lift)]">
            <button onClick={() => setOpen(false)} className="mb-3 grid h-10 w-10 place-items-center self-end rounded-full hover:bg-sand/60" aria-label="Close"><X className="h-5 w-5" /></button>
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg hover:bg-sand/60">{l.label}</Link>
            ))}
            {!signedIn && (
              <div className="mt-4 grid gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-line bg-white px-4 py-3 text-center">{labels.login}</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="rounded-xl bg-forest px-4 py-3 text-center text-white">{labels.signup}</Link>
              </div>
            )}
            <div className="mt-auto border-t border-line pt-4">{prefs}</div>
          </nav>
        </div>
      )}
    </div>
  );
}
