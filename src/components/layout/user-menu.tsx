"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

type Labels = { account: string; hostDashboard: string; admin: string; logout: string; becomeHost: string };

export function UserMenu({ name, isHost, isAdmin, labels }: { name: string; isHost: boolean; isAdmin: boolean; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, []);
  const initial = (name.trim()[0] || "?").toUpperCase();
  const item = "block rounded-lg px-3 py-2 text-[15px] hover:bg-sand/60";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white ps-1 pe-2.5 hover:border-charcoal/30">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-forest font-sans text-sm font-semibold text-white">{initial}</span>
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
          <p className="truncate px-3 py-2 text-sm text-muted">{name}</p>
          <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}>{labels.account}</Link>
          <Link role="menuitem" href={isHost ? "/host" : "/host/onboarding"} className={item} onClick={() => setOpen(false)}>{isHost ? labels.hostDashboard : labels.becomeHost}</Link>
          {isAdmin && <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>{labels.admin}</Link>}
          <form action={signOut}><button role="menuitem" className={`${item} w-full text-start text-danger`}>{labels.logout}</button></form>
        </div>
      )}
    </div>
  );
}
