import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireHost } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { todayPK } from "@/lib/dates";
import { Alert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Host dashboard" };

export default async function HostDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, hostProfile } = await requireHost();
  if (!hostProfile) redirect("/host/onboarding");
  const supabase = await createClient();
  const monthStart = todayPK().slice(0, 8) + "01";
  const [props, bookings] = await Promise.all([
    supabase.from("properties").select("status").eq("host_id", user.id).is("deleted_at", null),
    supabase.from("bookings").select("status, check_in, check_out, total_minor, host_commission_minor, host_payout_minor, guest_fee_minor").eq("host_id", user.id),
  ]);
  const P = props.data ?? [];
  const B = bookings.data ?? [];
  const today = todayPK();
  const live = (s: string) => ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(s);
  const month = B.filter((b) => live(b.status) && b.check_in >= monthStart);
  const stats: [string, string][] = [
    ["Properties", String(P.length)],
    ["Published", String(P.filter((p) => p.status === "APPROVED").length)],
    ["Pending review", String(P.filter((p) => p.status === "PENDING").length)],
    ["Upcoming stays", String(B.filter((b) => ["CONFIRMED"].includes(b.status) && b.check_in >= today).length)],
    ["Requests waiting", String(B.filter((b) => b.status === "PENDING").length)],
    ["Booked this month", formatMoney(month.reduce((s, b) => s + Number(b.total_minor) - Number(b.guest_fee_minor), 0))],
    ["Commission this month", formatMoney(month.reduce((s, b) => s + Number(b.host_commission_minor), 0))],
    ["Your earnings this month", formatMoney(month.reduce((s, b) => s + Number(b.host_payout_minor), 0))],
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {(await searchParams).welcome && <div className="mb-6"><Alert tone="success">You’re a host now. Welcome!</Alert></div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Hello, {hostProfile.display_name}</h1>
          <p className="mt-1 text-muted">Verification: <strong className="text-charcoal">{hostProfile.verification_status === "APPROVED" ? "Verified" : hostProfile.verification_status === "PENDING" ? "Not yet reviewed" : hostProfile.verification_status.toLowerCase()}</strong></p>
        </div>
        <Link href="/host/onboarding" className="text-forest underline">Edit host profile</Link>
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="rounded-2xl border border-line bg-white p-4"><dt className="text-sm text-muted">{k}</dt><dd className="num mt-1 text-2xl font-semibold">{v}</dd></div>)}
      </dl>
      <section className="mt-10 rounded-2xl bg-sand/60 p-6">
        <h2 className="text-lg font-semibold">What’s next</h2>
        <p className="mt-1 max-w-2xl text-sm">Listing creation, photo upload, calendar and pricing tools are the next build phase. Your account, host profile and these figures are live now and come straight from your bookings.</p>
      </section>
    </div>
  );
}
