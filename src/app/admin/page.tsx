import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin(); // server-side check against profiles.is_admin
  const supabase = await createClient();
  const count = async (table: string, f?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const q = base(table);
    const { count } = await (f ? f(q) : q);
    return count ?? 0;
  };
  function base(table: string) { return supabase.from(table).select("*", { count: "exact", head: true }); }
  const [users, hosts, live, pending, demo, bookings, confirmed, money] = await Promise.all([
    count("profiles"), count("profiles", (q) => q.eq("is_host", true)),
    count("properties", (q) => q.eq("status", "APPROVED").eq("is_demo", false)),
    count("properties", (q) => q.eq("status", "PENDING")),
    count("properties", (q) => q.eq("is_demo", true)),
    count("bookings"),
    count("bookings", (q) => q.in("status", ["CONFIRMED", "CHECKED_IN", "COMPLETED"])),
    supabase.from("bookings").select("total_minor, guest_fee_minor, host_commission_minor").in("status", ["CONFIRMED", "CHECKED_IN", "COMPLETED"]),
  ]);
  const rows = money.data ?? [];
  const gbv = rows.reduce((s, r) => s + Number(r.total_minor), 0);
  const revenue = rows.reduce((s, r) => s + Number(r.guest_fee_minor) + Number(r.host_commission_minor), 0);
  const { data: queue } = await supabase.from("properties").select("id, title, city, submitted_at").eq("status", "PENDING").order("submitted_at").limit(10);
  const stats: [string, string][] = [
    ["Registered users", String(users)], ["Hosts", String(hosts)], ["Live listings (real)", String(live)], ["Awaiting review", String(pending)],
    ["Demo listings", String(demo)], ["Bookings (all)", String(bookings)], ["Confirmed / completed", String(confirmed)],
    ["Gross booking value", formatMoney(gbv)], ["Platform revenue", formatMoney(revenue)],
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Admin overview</h1>
      <p className="mt-1 text-sm text-muted">Figures include demo bookings while the demo dataset is loaded.</p>
      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map(([k, v]) => <div key={k} className="rounded-2xl border border-line bg-white p-4"><dt className="text-sm text-muted">{k}</dt><dd className="num mt-1 text-2xl font-semibold">{v}</dd></div>)}
      </dl>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Properties awaiting review</h2>
        {queue?.length ? (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">{queue.map((p) => <li key={p.id} className="p-4"><p className="font-medium">{p.title}</p><p className="text-sm text-muted">{p.city}</p></li>)}</ul>
        ) : <p className="mt-2 text-muted">Nothing waiting. New submissions appear here.</p>}
        <p className="mt-3 text-sm text-muted">Approve/reject tools, user management and audit logs arrive with the admin build phase.</p>
      </section>
    </div>
  );
}
