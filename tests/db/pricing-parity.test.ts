import { afterAll, describe, expect, it } from "vitest";
import { admin, day, pool } from "./helpers";
import { quote, type PriceListing } from "@/lib/pricing";
import { todayPK } from "@/lib/dates";

afterAll(async () => { await pool.end(); });

// The demo site prices in TypeScript; the real app prices in PostgreSQL. They must agree.
describe("TypeScript demo pricing matches the database engine", () => {
  it("for every demo listing across weekday, weekend, long-stay and extra-guest cases", async () => {
    const listings = await admin<PriceListing & { id: string; children_allowed: boolean }>(
      `select l.*, p.children_allowed from listings l join properties p on p.id = l.property_id where p.is_demo`);
    expect(listings.length).toBeGreaterThan(0);
    const cases: [number, number, number, number][] = [[3, 4, 1, 0], [5, 8, 2, 0], [10, 20, 2, 1], [12, 42, 1, 0]];
    let compared = 0;
    for (const l of listings) {
      for (const [a, b, adults, children] of cases) {
        if (adults + children > l.max_guests || b - a < l.min_nights || b - a > l.max_nights) continue;
        const [{ q }] = await admin<{ q: Record<string, number> }>(
          "select quote_booking($1, $2::date, $3::date, $4, $5) as q", [l.id, day(a), day(b), adults, children]);
        const ts = quote({ ...l, nightly_price_minor: Number(l.nightly_price_minor), weekend_price_minor: l.weekend_price_minor == null ? null : Number(l.weekend_price_minor),
          cleaning_fee_minor: Number(l.cleaning_fee_minor), extra_guest_fee_minor: Number(l.extra_guest_fee_minor), security_deposit_minor: Number(l.security_deposit_minor) },
          day(a), day(b), adults, children, { guestBps: 400, commissionBps: 800, taxBps: 0 }, { today: todayPK() });
        for (const k of ["accommodation_minor", "discount_minor", "extra_guest_fee_minor", "guest_fee_minor", "total_minor", "host_commission_minor", "host_payout_minor"] as const) {
          expect(ts[k], `${l.id} ${k}`).toBe(Number(q[k]));
        }
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(40);
  });
});
