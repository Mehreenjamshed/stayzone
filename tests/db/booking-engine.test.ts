import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, book, bookConcurrently, day, makeProperty, makeUser, pool } from "./helpers";

let host: string, guest: string, guest2: string;

beforeAll(async () => {
  host = await makeUser({ host: true, name: "Host" });
  guest = await makeUser({ name: "Guest A" });
  guest2 = await makeUser({ name: "Guest B" });
});
afterAll(async () => { await pool.end(); });

describe("pricing (server-side)", () => {
  it("matches the business example: PKR 20,000 night → 800 guest fee, 1,600 commission", async () => {
    const { listingIds } = await makeProperty(host, { price: 2_000_000 });
    const [{ q }] = await asUser<{ q: Record<string, number> }>(null,
      "select public.quote_booking($1, $2::date, $3::date, 2) as q", [listingIds[0], day(10), day(11)]);
    expect(q.accommodation_minor).toBe(2_000_000);
    expect(q.guest_fee_minor).toBe(80_000);
    expect(q.total_minor).toBe(2_080_000);
    expect(q.host_commission_minor).toBe(160_000);
    expect(q.host_payout_minor).toBe(1_840_000);
  });

  it("uses commission settings from platform_settings, not hardcoded values", async () => {
    const { listingIds } = await makeProperty(host, { price: 1_000_000 });
    await admin("update platform_settings set value = '1000' where key = 'fees.host_commission_bps'");
    try {
      const [{ q }] = await asUser<{ q: Record<string, number> }>(null,
        "select public.quote_booking($1, $2::date, $3::date, 2) as q", [listingIds[0], day(10), day(12)]);
      expect(q.host_commission_bps).toBe(1000);
      expect(q.host_commission_minor).toBe(200_000); // 10% of 2 nights × 10,000
    } finally {
      await admin("update platform_settings set value = '800' where key = 'fees.host_commission_bps'");
    }
  });

  it("applies seasonal pricing rules per night", async () => {
    const { listingIds } = await makeProperty(host, { price: 1_000_000 });
    await admin(`insert into pricing_rules (listing_id, name, starts_on, ends_on, nightly_price_minor)
                 values ($1, 'Eid', $2::date, $3::date, 1_500_000)`, [listingIds[0], day(20), day(21)]);
    const [{ q }] = await asUser<{ q: Record<string, number> }>(null,
      "select public.quote_booking($1, $2::date, $3::date, 2) as q", [listingIds[0], day(19), day(22)]);
    expect(q.accommodation_minor).toBe(1_000_000 + 1_500_000 + 1_000_000);
  });

  it("rejects invalid dates and capacity", async () => {
    const { listingIds } = await makeProperty(host, { maxGuests: 2 });
    const quote = (ci: string, co: string, adults = 2) =>
      asUser(null, "select public.quote_booking($1, $2::date, $3::date, $4)", [listingIds[0], ci, co, adults]);
    await expect(quote(day(5), day(5))).rejects.toThrow(/CHECKOUT_BEFORE_CHECKIN/);
    await expect(quote(day(6), day(5))).rejects.toThrow(/CHECKOUT_BEFORE_CHECKIN/);
    await expect(quote(day(-2), day(1))).rejects.toThrow(/CHECKIN_IN_PAST/);
    await expect(quote(day(5), day(6), 3)).rejects.toThrow(/TOO_MANY_GUESTS/);
  });

  it("stores the price snapshot on the booking (browser can't change it)", async () => {
    const { pid } = await makeProperty(host, { price: 2_000_000 });
    const b = await book(guest, pid, day(30), day(32));
    const [row] = await admin<{ total_minor: string; host_payout_minor: string }>(
      "select total_minor, host_payout_minor from bookings where id = $1", [b.id]);
    expect(Number(row.total_minor)).toBe(4_160_000);
    expect(Number(row.host_payout_minor)).toBe(3_680_000);
  });
});

describe("availability & double-booking", () => {
  it("prevents overlapping bookings on the same unit", async () => {
    const { pid } = await makeProperty(host);
    const b = await book(guest, pid, day(40), day(43));
    expect(b.status).toBe("AWAITING_PAYMENT");
    await expect(book(guest2, pid, day(42), day(44))).rejects.toThrow(/DATES_UNAVAILABLE/);
    // Back-to-back stays are fine (check-out day = next check-in day)
    const b2 = await book(guest2, pid, day(43), day(45));
    expect(b2.status).toBe("AWAITING_PAYMENT");
  });

  it("allows only ONE winner when 10 guests book the same unit at the same instant", async () => {
    const { pid } = await makeProperty(host);
    const guests = await Promise.all(Array.from({ length: 10 }, () => makeUser()));
    const results = await bookConcurrently(guests, pid, day(60), day(63));
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    const [{ n }] = await admin<{ n: string }>(
      "select count(*) n from bookings where property_id = $1 and status in ('AWAITING_PAYMENT','CONFIRMED')", [pid]);
    expect(Number(n)).toBe(1);
  });

  it("fills a multi-room hotel exactly to capacity under concurrency (3 rooms, 8 guests)", async () => {
    const { pid } = await makeProperty(host, { units: 3 });
    const guests = await Promise.all(Array.from({ length: 8 }, () => makeUser()));
    const results = await bookConcurrently(guests, pid, day(70), day(72));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const rows = await admin<{ listing_id: string }>(
      "select distinct listing_id from bookings where property_id = $1 and status = 'AWAITING_PAYMENT'", [pid]);
    expect(rows).toHaveLength(3); // each room booked once
  });

  it("releases inventory when a payment hold expires", async () => {
    const { pid } = await makeProperty(host);
    const b = await book(guest, pid, day(80), day(82));
    await admin("update bookings set hold_expires_at = now() - interval '1 minute' where id = $1", [b.id]);
    const b2 = await book(guest2, pid, day(80), day(82));
    expect(b2.status).toBe("AWAITING_PAYMENT");
    const [old] = await admin<{ status: string }>("select status from bookings where id = $1", [b.id]);
    expect(old.status).toBe("EXPIRED");
  });

  it("respects host-blocked dates", async () => {
    const { pid, listingIds } = await makeProperty(host);
    await admin("insert into availability_blocks (listing_id, starts_on, ends_on) values ($1, $2::date, $3::date)",
      [listingIds[0], day(90), day(92)]);
    await expect(book(guest, pid, day(91), day(93))).rejects.toThrow(/DATES_UNAVAILABLE/);
  });

  it("search hides properties that are unavailable for the dates", async () => {
    const { pid } = await makeProperty(host);
    await book(guest, pid, day(100), day(103));
    const busy = await asUser<{ id: string }>(null,
      "select id from search_properties(p_check_in => $1::date, p_check_out => $2::date, p_limit => 60)", [day(101), day(102)]);
    expect(busy.map((r) => r.id)).not.toContain(pid);
    const free = await asUser<{ id: string }>(null,
      "select id from search_properties(p_check_in => $1::date, p_check_out => $2::date, p_limit => 60)", [day(110), day(111)]);
    expect(free.map((r) => r.id)).toContain(pid);
  });
});

describe("booking rules", () => {
  it("a host cannot book their own property", async () => {
    const { pid } = await makeProperty(host);
    await expect(book(host, pid, day(10), day(11))).rejects.toThrow(/CANNOT_BOOK_OWN_PROPERTY/);
  });

  it("unverified emails cannot book", async () => {
    const { pid } = await makeProperty(host);
    const unverified = await makeUser({ verified: false });
    await expect(book(unverified, pid, day(10), day(11))).rejects.toThrow(/EMAIL_NOT_VERIFIED/);
  });

  it("anonymous visitors cannot book", async () => {
    const { pid } = await makeProperty(host);
    await expect(asUser(null, "select create_booking($1,'default',$2::date,$3::date,2)", [pid, day(10), day(11)]))
      .rejects.toThrow(/permission denied/);
  });

  it("unapproved properties cannot be booked", async () => {
    const { pid } = await makeProperty(host, { status: "PENDING" });
    await expect(book(guest, pid, day(10), day(11))).rejects.toThrow(/PROPERTY_NOT_BOOKABLE/);
  });

  it("demo listings cannot be booked (unless an admin enables demo bookings)", async () => {
    const [{ id }] = await admin<{ id: string }>("select id from properties where is_demo limit 1");
    if (!id) return; // demo seed not loaded
    await expect(book(guest, id, day(10), day(11))).rejects.toThrow(/DEMO_LISTING/);
  });

  it("request-to-book: host rejection releases the dates", async () => {
    const { pid } = await makeProperty(host, { mode: "REQUEST" });
    const [guest, guest2] = [await makeUser(), await makeUser()];
    const b = await book(guest, pid, day(120), day(122));
    expect(b.status).toBe("PENDING");
    await expect(book(guest2, pid, day(120), day(122))).rejects.toThrow(/DATES_UNAVAILABLE/);
    await expect(asUser(guest2, "select host_respond_booking($1, true)", [b.id])).rejects.toThrow(/NOT_FOUND/);
    await asUser(host, "select host_respond_booking($1, false, 'Maintenance')", [b.id]);
    const b2 = await book(guest2, pid, day(120), day(122));
    expect(b2.status).toBe("PENDING");
  });

  it("guests can cancel an unpaid hold, which frees the dates", async () => {
    const { pid } = await makeProperty(host);
    const [guest, guest2] = [await makeUser(), await makeUser()];
    const b = await book(guest, pid, day(130), day(131));
    await asUser(guest, "select cancel_unpaid_booking($1, 'Changed plans')", [b.id]);
    expect((await book(guest2, pid, day(130), day(131))).status).toBe("AWAITING_PAYMENT");
  });

  it("limits open unpaid holds per guest", async () => {
    const { pid } = await makeProperty(host, { units: 5 });
    const g = await makeUser();
    for (let i = 0; i < 3; i++) await book(g, pid, day(140 + i * 2), day(141 + i * 2));
    await expect(book(g, pid, day(150), day(151))).rejects.toThrow(/TOO_MANY_OPEN_HOLDS/);
  });
});
