"use client";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { getQuote, reserve, type Quote } from "@/app/actions/booking";
import { formatMoney } from "@/lib/money";
import { Alert } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Group = { key: string; name: string; maxGuests: number; fromMinor: number; units: number };

function addDay(iso: string) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

export function BookingWidget({ propertyId, groups, currency, today, mode, isDemo, waitlist, initial, labels }: {
  propertyId: string; groups: Group[]; currency: string; today: string; mode: "INSTANT" | "REQUEST"; isDemo: boolean; waitlist?: boolean;
  initial: { checkin?: string; checkout?: string; adults?: number; children?: number; infants?: number };
  labels: { perNight: string; checkIn: string; checkOut: string; adults: string; children: string; infants: string; instant: string; request: string; demo: string };
}) {
  const path = usePathname();
  const [group, setGroup] = useState(groups[0]?.key ?? "default");
  const [checkin, setCheckin] = useState(initial.checkin ?? "");
  const [checkout, setCheckout] = useState(initial.checkout ?? "");
  const [g, setG] = useState({ adults: initial.adults ?? Math.min(2, groups[0]?.maxGuests ?? 2), children: initial.children ?? 0, infants: initial.infants ?? 0 });
  const [res, setRes] = useState<{ quote?: Quote; error?: string }>({});
  const [checking, startCheck] = useTransition();
  const [state, action, submitting] = useActionState(reserve, {});
  const sel = groups.find((x) => x.key === group);
  const ready = !!(checkin && checkout && checkout > checkin);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => startCheck(async () => setRes(await getQuote({ propertyId, unitGroup: group, checkin, checkout, ...g }))), 250);
    return () => clearTimeout(id);
  }, [propertyId, group, checkin, checkout, g, ready]);

  const shown = ready ? res : {};
  const q = shown.quote;
  const rows = useMemo(() => q ? ([
    [`${formatMoney(Math.round(q.accommodation_minor / q.nights), currency)} × ${q.nights} ${q.nights === 1 ? "night" : "nights"}`, q.accommodation_minor],
    q.discount_minor > 0 ? [`Length-of-stay discount (${q.discount_bps / 100}%)`, -q.discount_minor] : null,
    q.cleaning_fee_minor > 0 ? ["Cleaning fee", q.cleaning_fee_minor] : null,
    q.extra_guest_fee_minor > 0 ? ["Extra guest fee", q.extra_guest_fee_minor] : null,
    ["Service fee", q.guest_fee_minor],
    q.tax_minor > 0 ? ["Taxes", q.tax_minor] : null,
  ].filter(Boolean) as [string, number][]) : [], [q, currency]);

  const num = "w-full rounded-lg border border-line bg-white px-2 py-2 text-[15px] font-sans";
  return (
    <div className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-lg"><span className="num font-semibold">{formatMoney(sel?.fromMinor ?? 0, currency)}</span> <span className="text-muted">/ {labels.perNight}</span></p>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="returnTo" value={`${path}?checkin=${checkin}&checkout=${checkout}&adults=${g.adults}`} />
        {groups.length > 1 && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Room type</span>
            <select name="unitGroup" value={group} onChange={(e) => setGroup(e.target.value)} className={num}>
              {groups.map((x) => <option key={x.key} value={x.key}>{x.name} · up to {x.maxGuests} guests</option>)}
            </select>
          </label>
        )}
        {groups.length <= 1 && <input type="hidden" name="unitGroup" value={group} />}
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line">
          <label className="border-e border-line p-2.5 text-xs font-semibold">{labels.checkIn}
            <input name="checkin" type="date" required min={today} value={checkin} className="mt-0.5 block w-full bg-transparent text-[15px] font-normal font-sans focus:outline-none"
              onChange={(e) => { setCheckin(e.target.value); if (!checkout || checkout <= e.target.value) setCheckout(e.target.value ? addDay(e.target.value) : ""); }} /></label>
          <label className="p-2.5 text-xs font-semibold">{labels.checkOut}
            <input name="checkout" type="date" required min={checkin ? addDay(checkin) : today} value={checkout} className="mt-0.5 block w-full bg-transparent text-[15px] font-normal font-sans focus:outline-none"
              onChange={(e) => setCheckout(e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
          {(["adults", "children", "infants"] as const).map((k) => (
            <label key={k}>{labels[k]}
              <input name={k} type="number" inputMode="numeric" min={k === "adults" ? 1 : 0} max={k === "infants" ? 10 : sel?.maxGuests ?? 30} value={g[k]}
                onChange={(e) => setG({ ...g, [k]: Math.max(k === "adults" ? 1 : 0, Number(e.target.value) || 0) })} className={`mt-1 ${num}`} />
            </label>
          ))}
        </div>

        {shown.error && <Alert tone="error">{shown.error}</Alert>}
        {state.error && <Alert tone="error">{state.error}</Alert>}

        {waitlist ? (
          <a href="/waitlist" className="flex h-13 w-full items-center justify-center rounded-[14px] bg-forest px-7 font-medium text-white hover:bg-forest-deep">Bookings open soon: join the launch list</a>
        ) : isDemo ? (
          <Button type="button" disabled className="w-full">{labels.demo}: can’t be booked</Button>
        ) : (
          <Button type="submit" className="w-full" size="lg" disabled={!q || checking || submitting}>
            {submitting ? "Reserving…" : mode === "INSTANT" ? "Reserve" : "Request to book"}
          </Button>
        )}
        <p className="text-center text-xs text-muted">
          {waitlist ? "This is how prices will be shown when bookings open." : mode === "INSTANT" ? "Your dates are held while you complete payment." : "The host has 24 hours to respond. You won't be charged unless they accept."}
        </p>
      </form>

      <div aria-live="polite" className={checking ? "opacity-60" : ""}>
        {q && (
          <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-[15px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-charcoal/80">{k}</dt><dd className="num">{v < 0 ? "−" : ""}{formatMoney(Math.abs(v), currency)}</dd></div>
            ))}
            <div className="flex justify-between gap-3 border-t border-line pt-3 font-semibold"><dt>Total ({currency})</dt><dd className="num">{formatMoney(q.total_minor, currency)}</dd></div>
            {q.security_deposit_minor > 0 && <p className="text-xs text-muted">Refundable security deposit of {formatMoney(q.security_deposit_minor, currency)} may be collected by the host.</p>}
          </dl>
        )}
      </div>
    </div>
  );
}
