import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Launch list", robots: { index: false } };

type Row = { id: string; kind: "HOST" | "GUEST"; full_name: string; email: string; phone: string | null; whatsapp_ok: boolean;
  city: string | null; property_type: string | null; units: number | null; nightly_price_pkr: number | null; message: string | null; status: string; created_at: string };

export default async function AdminWaitlist({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireAdmin();
  const kind = (await searchParams).kind === "GUEST" ? "GUEST" : "HOST";
  const supabase = await createClient();
  const [{ data }, hosts, guests] = await Promise.all([
    supabase.from("waitlist_signups").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(500),
    supabase.from("waitlist_signups").select("id", { count: "exact", head: true }).eq("kind", "HOST"),
    supabase.from("waitlist_signups").select("id", { count: "exact", head: true }).eq("kind", "GUEST"),
  ]);
  const rows = (data ?? []) as Row[];
  const byCity = new Map<string, number>();
  for (const r of rows) if (r.city) byCity.set(r.city.trim(), (byCity.get(r.city.trim()) ?? 0) + 1);
  const top = [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const tab = (k: string, label: string, n: number | null) => (
    <Link href={`/admin/waitlist?kind=${k}`} aria-current={kind === k} className={`rounded-full border px-4 py-2 text-sm ${kind === k ? "border-forest bg-forest text-white" : "border-line bg-white"}`}>
      {label} <span className="num">({n ?? 0})</span>
    </Link>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Launch list</h1><p className="mt-1 text-muted">People who registered before launch.</p></div>
        <a href={`/admin/waitlist/export?kind=${kind}`} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm hover:border-forest/50">
          <Download className="h-4 w-4" aria-hidden /> Download {kind === "HOST" ? "hosts" : "guests"} (CSV)
        </a>
      </div>
      <div className="mt-6 flex gap-2">{tab("HOST", "Property owners", hosts.count)}{tab("GUEST", "Travellers", guests.count)}</div>
      {top.length > 0 && (
        <p className="mt-6 text-sm text-muted">Top cities: {top.map(([c, n]) => `${c} (${n})`).join(", ")}</p>
      )}
      {rows.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center text-muted">No sign-ups yet. Share your site link to start collecting them.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-ivory text-muted">
              <tr><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Contact</th><th className="p-3 font-medium">City</th>
                {kind === "HOST" && <><th className="p-3 font-medium">Property</th><th className="p-3 font-medium">Units</th><th className="p-3 font-medium">PKR/night</th></>}
                <th className="p-3 font-medium">Joined</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="p-3 font-medium">{r.full_name}{r.message && <p className="mt-1 max-w-xs font-normal text-muted">{r.message}</p>}</td>
                  <td className="p-3"><span className="select-all">{r.email}</span>{r.phone && <p className="num select-all text-muted">{r.phone}{r.whatsapp_ok ? " · WhatsApp" : ""}</p>}</td>
                  <td className="p-3">{r.city ?? "—"}</td>
                  {kind === "HOST" && <><td className="p-3">{r.property_type?.replace(/_/g, " ").toLowerCase()}</td><td className="num p-3">{r.units}</td><td className="num p-3">{r.nightly_price_pkr?.toLocaleString("en-PK") ?? "—"}</td></>}
                  <td className="num p-3 text-muted">{new Date(r.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
