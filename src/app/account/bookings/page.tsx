import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatStayDate, todayPK } from "@/lib/dates";
import { StatusPill } from "@/components/property/status-pill";

export const metadata: Metadata = { title: "Your trips" };

type Row = { id: string; code: string; check_in: string; check_out: string; status: string; total_minor: number; currency: string; property: { title: string; slug: string; city: string } | null };

export default async function TripsPage() {
  const { user } = await requireUser("/account/bookings");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings")
    .select("id, code, check_in, check_out, status, total_minor, currency, property:properties(title, slug, city)")
    .eq("guest_id", user.id).order("check_in", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Row[];
  const today = todayPK();
  const upcoming = rows.filter((r) => r.check_out >= today && !["CANCELLED", "REJECTED", "EXPIRED", "REFUNDED"].includes(r.status));
  const past = rows.filter((r) => !upcoming.includes(r));
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">Your trips</h1>
      <section><h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length ? <List items={upcoming} /> : <p className="text-muted">No upcoming trips. <Link href="/search" className="text-forest underline">Find a stay</Link></p>}</section>
      {past.length > 0 && <section><h2 className="mb-3 text-lg font-semibold">Past and cancelled</h2><List items={past} /></section>}
    </div>
  );
}

function List({ items }: { items: Row[] }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={`/account/bookings/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-ivory">
            <div><p className="font-medium">{r.property?.title}</p><p className="num text-sm text-muted">{r.property?.city} · {formatStayDate(r.check_in)} – {formatStayDate(r.check_out)} · #{r.code}</p></div>
            <div className="flex items-center gap-3"><span className="num text-sm">{formatMoney(r.total_minor, r.currency)}</span><StatusPill status={r.status} /></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
