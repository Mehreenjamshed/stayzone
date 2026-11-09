import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/dal";

const COLS = ["created_at", "kind", "full_name", "email", "phone", "whatsapp_ok", "city", "property_type", "units", "nightly_price_pkr", "message", "status", "source"] as const;

/** Spreadsheet-safe CSV cell (also neutralises formula injection like =HYPERLINK). */
function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile?.is_admin || profile.is_suspended) return new NextResponse("Not found", { status: 404 });
  const kind = req.nextUrl.searchParams.get("kind") === "GUEST" ? "GUEST" : "HOST";
  const supabase = await createClient();
  const { data, error } = await supabase.from("waitlist_signups").select(COLS.join(",")).eq("kind", kind).order("created_at");
  if (error) return new NextResponse("Export failed", { status: 500 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const csv = "﻿" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stayzone-${kind.toLowerCase()}s-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
