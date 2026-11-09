import { describe, expect, it } from "vitest";
import { demoDestinationCounts, demoProperties, demoSearch } from "./demo-store";
import { parseSearchParams } from "@/lib/search-params";
import { quote } from "@/lib/pricing";

const s = (raw: Record<string, string>) => demoSearch(parseSearchParams(raw));

describe("demo catalogue search", () => {
  it("has the 20 demo properties, all flagged as demo", () => {
    expect(demoProperties).toHaveLength(20);
    expect(s({}).total).toBe(20);
    expect(s({}).results.every((r) => r.is_demo)).toBe(true);
  });
  it("filters by destination, type, guests and amenities", () => {
    expect(s({ where: "hunza" }).results.map((r) => r.city)).toEqual(["Hunza", "Hunza"]);
    expect(s({ type: "HOTEL" }).results.every((r) => r.category === "HOTEL")).toBe(true);
    expect(s({ adults: "12" }).results.every((r) => r.max_guests >= 12)).toBe(true);
    expect(s({ amenity: "pool" }).total).toBeGreaterThan(0);
    expect(s({ q: "Gulberg" }).results[0].slug).toBe("demo-gulberg-apt");
  });
  it("sorts by price and paginates", () => {
    const prices = s({ sort: "price_asc" }).results.map((r) => r.price_from_minor);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(s({ page: "2" }).results.length).toBe(2); // 18 per page
  });
  it("counts stays per destination", () => {
    expect(demoDestinationCounts().get("lahore")).toBe(3);
  });
});

describe("pricing", () => {
  const base = { base_guests: 2, max_guests: 4, nightly_price_minor: 2_000_000, weekend_price_minor: null, cleaning_fee_minor: 0,
    extra_guest_fee_minor: 0, security_deposit_minor: 0, weekly_discount_bps: 0, monthly_discount_bps: 0, min_nights: 1, max_nights: 90 };
  it("matches the business example (PKR 20,000 night)", () => {
    const q = quote(base, "2030-01-07", "2030-01-08", 2, 0, { guestBps: 400, commissionBps: 800, taxBps: 0 }, { today: "2030-01-01" });
    expect([q.total_minor, q.host_payout_minor]).toEqual([2_080_000, 1_840_000]);
  });
  it("rejects bad input", () => {
    expect(() => quote(base, "2030-01-08", "2030-01-07", 2, 0, { guestBps: 400, commissionBps: 800, taxBps: 0 }, { today: "2030-01-01" })).toThrow("CHECKOUT_BEFORE_CHECKIN");
    expect(() => quote(base, "2030-01-07", "2030-01-08", 5, 0, { guestBps: 400, commissionBps: 800, taxBps: 0 }, { today: "2030-01-01" })).toThrow("TOO_MANY_GUESTS");
  });
});
