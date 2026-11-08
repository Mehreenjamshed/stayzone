"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Loc = { slug: string; name: string; province: string };
type Labels = { where: string; wherePlaceholder: string; checkIn: string; checkOut: string; guests: string; search: string; adults: string; children: string; infants: string };

function addDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10);
}

export function SearchBar({ locations, labels, today, initial, variant = "hero" }: {
  locations: Loc[]; labels: Labels; today: string; variant?: "hero" | "compact";
  initial?: { where?: string; q?: string; checkin?: string; checkout?: string; adults?: number; children?: number; infants?: number };
}) {
  const router = useRouter();
  const initialText = initial?.where ? locations.find((l) => l.slug === initial.where)?.name ?? "" : initial?.q ?? "";
  const [text, setText] = useState(initialText);
  const [checkin, setCheckin] = useState(initial?.checkin ?? "");
  const [checkout, setCheckout] = useState(initial?.checkout ?? "");
  const [g, setG] = useState({ adults: initial?.adults ?? 2, children: initial?.children ?? 0, infants: initial?.infants ?? 0 });
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!pop.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    const match = locations.find((l) => l.name.toLowerCase() === text.trim().toLowerCase());
    if (match) p.set("where", match.slug); else if (text.trim()) p.set("q", text.trim());
    if (checkin && checkout && checkout > checkin) { p.set("checkin", checkin); p.set("checkout", checkout); }
    p.set("adults", String(g.adults));
    if (g.children) p.set("children", String(g.children));
    if (g.infants) p.set("infants", String(g.infants));
    router.push(`/search?${p}`);
  }

  const total = g.adults + g.children;
  const hero = variant === "hero";
  const cell = cn("flex min-w-0 flex-col justify-center px-4 text-start", hero ? "py-2.5" : "py-1.5");
  const lab = "text-xs font-semibold text-charcoal";
  const inp = "w-full min-w-0 bg-transparent text-[15px] text-charcoal placeholder:text-muted focus:outline-none font-sans";
  const step = (k: keyof typeof g, min: number, max: number, label: string) => (
    <div className="flex items-center justify-between py-2.5">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} disabled={g[k] <= min} onClick={() => setG({ ...g, [k]: g[k] - 1 })}
          className="grid h-8 w-8 place-items-center rounded-full border border-line disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
        <span className="num w-5 text-center" aria-live="polite">{g[k]}</span>
        <button type="button" aria-label={`More ${label}`} disabled={g[k] >= max} onClick={() => setG({ ...g, [k]: g[k] + 1 })}
          className="grid h-8 w-8 place-items-center rounded-full border border-line disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} role="search"
      className={cn("grid w-full grid-cols-2 items-stretch divide-line bg-white text-charcoal md:flex md:divide-x rtl:md:divide-x-reverse",
        hero ? "rounded-[22px] p-1.5 shadow-[var(--shadow-lift)]" : "rounded-2xl border border-line p-1")}>
      <label className={cn(cell, "col-span-2 md:flex-[1.6] border-b border-line md:border-b-0")}>
        <span className={lab}>{labels.where}</span>
        <input className={inp} list="sz-locations" value={text} onChange={(e) => setText(e.target.value)} placeholder={labels.wherePlaceholder} autoComplete="off" />
        <datalist id="sz-locations">{locations.map((l) => <option key={l.slug} value={l.name}>{l.province}</option>)}</datalist>
      </label>
      <label className={cn(cell, "md:flex-1 border-e border-line md:border-e-0")}>
        <span className={lab}>{labels.checkIn}</span>
        <input type="date" className={inp} min={today} value={checkin}
          onChange={(e) => { setCheckin(e.target.value); if (!checkout || checkout <= e.target.value) setCheckout(e.target.value ? addDay(e.target.value) : ""); }} />
      </label>
      <label className={cn(cell, "md:flex-1")}>
        <span className={lab}>{labels.checkOut}</span>
        <input type="date" className={inp} min={checkin ? addDay(checkin) : today} value={checkout} onChange={(e) => setCheckout(e.target.value)} />
      </label>
      <div ref={pop} className={cn(cell, "relative col-span-2 border-t border-line md:col-span-1 md:flex-1 md:border-t-0")}>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-start">
          <span className={cn(lab, "block")}>{labels.guests}</span>
          <span className="num text-[15px]">{total} {labels.guests.toLowerCase()}{g.infants ? `, ${g.infants} ${labels.infants.toLowerCase()}` : ""}</span>
        </button>
        {open && (
          <div className="absolute end-0 top-full z-30 mt-3 w-72 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lift)]">
            {step("adults", 1, 30, labels.adults)}
            {step("children", 0, 20, labels.children)}
            {step("infants", 0, 10, labels.infants)}
          </div>
        )}
      </div>
      <div className="col-span-2 p-1 md:p-0 md:ps-1.5">
        <button type="submit" className={cn("flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 font-medium text-white hover:bg-forest-deep",
          hero ? "min-h-13" : "min-h-11")}>
          <Search className="h-[18px] w-[18px]" aria-hidden /> {labels.search}
        </button>
      </div>
    </form>
  );
}
