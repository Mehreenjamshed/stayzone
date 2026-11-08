import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatStayDate } from "@/lib/dates";
import { StatusPill } from "@/components/property/status-pill";
import { Alert } from "@/components/ui/field";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Trip details" };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { user } = await requireUser(`/account/bookings/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings")
    .select("*, property:properties(title, slug, city, area), listing:listings(name)")
    .eq("id", id).eq("guest_id", user.id).maybeSingle(); // RLS also enforces this
  if (!b) notFound();
  const isNew = (await searchParams).new;
  const rows: [string, number][] = [
    [`Accommodation (${b.nights} ${b.nights === 1 ? "night" : "nights"})`, b.accommodation_minor],
    ...(b.discount_minor > 0 ? [["Discount", -b.discount_minor] as [string, number]] : []),
    ...(b.cleaning_fee_minor > 0 ? [["Cleaning fee", b.cleaning_fee_minor] as [string, number]] : []),
    ...(b.extra_guest_fee_minor > 0 ? [["Extra guest fee", b.extra_guest_fee_minor] as [string, number]] : []),
    ["Service fee", b.guest_fee_minor],
    ...(b.tax_minor > 0 ? [["Taxes", b.tax_minor] as [string, number]] : []),
  ];
  const holdUntil = b.hold_expires_at ? new Date(b.hold_expires_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : null;
  return (
    <div className="space-y-8">
      <Link href="/account/bookings" className="text-sm text-forest underline">All trips</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{b.property?.title}</h1>
          <p className="num mt-1 text-muted">{b.listing?.name} · {formatStayDate(b.check_in)} – {formatStayDate(b.check_out)} · Booking #{b.code}</p>
        </div>
        <StatusPill status={b.status} />
      </div>

      {b.status === "PENDING" && <Alert tone="info">{isNew ? "Request sent. " : ""}The host has until {holdUntil} (Pakistan time) to respond. You won’t be charged unless they accept.</Alert>}
      {b.status === "AWAITING_PAYMENT" && (
        <Alert tone="warning">
          {isNew ? "Your dates are held. " : ""}Complete payment by {holdUntil} (Pakistan time) to confirm, or the dates will be released.
          <span className="mt-1 block">Online payment is being connected and isn’t live yet. Please don’t send money to anyone outside the platform.</span>
        </Alert>
      )}

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Price details</h2>
        <dl className="mt-4 max-w-md space-y-2.5 text-[15px]">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="num">{v < 0 ? "−" : ""}{formatMoney(Math.abs(v), b.currency)}</dd></div>)}
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><dt>Total ({b.currency})</dt><dd className="num">{formatMoney(b.total_minor, b.currency)}</dd></div>
        </dl>
        <p className="num mt-4 text-sm text-muted">{b.adults} adults{b.children ? `, ${b.children} children` : ""}{b.infants ? `, ${b.infants} infants` : ""}</p>
      </section>

      {["PENDING", "AWAITING_PAYMENT"].includes(b.status) && <CancelButton bookingId={b.id} />}
      {b.property && <Link href={`/property/${b.property.slug}`} className="inline-block text-forest underline">View listing</Link>}
    </div>
  );
}
