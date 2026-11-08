import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, book, day, makeProperty, makeUser, pool } from "./helpers";

let hostA: string, hostB: string, guestA: string, guestB: string;
let propA: { pid: string; listingIds: string[] };

beforeAll(async () => {
  hostA = await makeUser({ host: true });
  hostB = await makeUser({ host: true });
  guestA = await makeUser();
  guestB = await makeUser();
  propA = await makeProperty(hostA);
});
afterAll(async () => { await pool.end(); });

describe("profiles & roles", () => {
  it("a user cannot make themselves admin", async () => {
    await expect(asUser(guestA, "update profiles set is_admin = true where id = auth.uid()"))
      .rejects.toThrow(/protected profile fields/);
  });
  it("a user cannot lift their own suspension", async () => {
    await admin("update profiles set is_suspended = true where id = $1", [guestB]);
    await expect(asUser(guestB, "update profiles set is_suspended = false where id = auth.uid()"))
      .rejects.toThrow(/protected profile fields/);
    await admin("update profiles set is_suspended = false where id = $1", [guestB]);
  });
  it("a user can update their own name and turn on host mode", async () => {
    const u = await makeUser();
    await asUser(u, "update profiles set full_name = 'New Name', is_host = true where id = auth.uid()");
    const [p] = await admin<{ full_name: string; is_host: boolean }>("select full_name, is_host from profiles where id = $1", [u]);
    expect(p).toEqual({ full_name: "New Name", is_host: true });
  });
  it("users cannot read other users' profiles", async () => {
    const rows = await asUser(guestA, "select id from profiles where id = $1", [guestB]);
    expect(rows).toHaveLength(0);
  });
  it("hosts cannot self-approve their verification", async () => {
    await asUser(hostB, "insert into host_profiles (id, display_name, verification_status) values (auth.uid(), 'Bee', 'APPROVED')");
    const [hp] = await admin<{ verification_status: string }>("select verification_status from host_profiles where id = $1", [hostB]);
    expect(hp.verification_status).toBe("PENDING");
    await expect(asUser(hostB, "update host_profiles set verification_status = 'APPROVED' where id = auth.uid()"))
      .rejects.toThrow(/review team/);
  });
});

describe("properties", () => {
  it("a host cannot approve or feature their own property", async () => {
    const [p] = await asUser<{ id: string; status: string; is_featured: boolean }>(hostB,
      `insert into properties (host_id, slug, title, category, city, province, status, is_featured)
       values (auth.uid(), 'sec-test-${Date.now()}', 'Sneaky approved listing', 'VILLA', 'Lahore', 'Punjab', 'APPROVED', true)
       returning id, status, is_featured`);
    expect(p.status).toBe("DRAFT");
    expect(p.is_featured).toBe(false);
    await expect(asUser(hostB, "update properties set status = 'APPROVED' where id = $1", [p.id]))
      .rejects.toThrow(/not allowed/);
  });
  it("non-hosts cannot create properties", async () => {
    await expect(asUser(guestA,
      `insert into properties (host_id, slug, title, category, city, province) values (auth.uid(), 'nope-${Date.now()}', 'Not a host', 'VILLA', 'Lahore', 'Punjab')`))
      .rejects.toThrow(/row-level security/);
  });
  it("unapproved properties are invisible to the public and other hosts", async () => {
    const { pid } = await makeProperty(hostA, { status: "PENDING" });
    expect(await asUser(null, "select id from properties where id = $1", [pid])).toHaveLength(0);
    expect(await asUser(hostB, "select id from properties where id = $1", [pid])).toHaveLength(0);
    expect(await asUser(hostA, "select id from properties where id = $1", [pid])).toHaveLength(1);
    const search = await asUser<{ id: string }>(null, "select id from search_properties(p_limit => 60)");
    expect(search.map((r) => r.id)).not.toContain(pid);
  });
  it("a host cannot edit another host's property or listing prices", async () => {
    const r1 = await asUser(hostB, "update properties set title = 'Hijacked title' where id = $1 returning id", [propA.pid]);
    expect(r1).toHaveLength(0);
    const r2 = await asUser(hostB, "update listings set nightly_price_minor = 100 where id = $1 returning id", [propA.listingIds[0]]);
    expect(r2).toHaveLength(0);
  });
  it("a host cannot read another host's pricing rules or blocks", async () => {
    await admin("insert into pricing_rules (listing_id, name, starts_on, ends_on, adjustment_bps) values ($1, 'Secret', $2::date, $3::date, 2000)",
      [propA.listingIds[0], day(1), day(3)]);
    expect(await asUser(hostB, "select id from pricing_rules where listing_id = $1", [propA.listingIds[0]])).toHaveLength(0);
    expect(await asUser(hostA, "select id from pricing_rules where listing_id = $1", [propA.listingIds[0]])).toHaveLength(1);
  });
});

describe("bookings & money", () => {
  it("a guest cannot see another guest's booking; the host can", async () => {
    const b = await book(guestA, propA.pid, day(200), day(201));
    expect(await asUser(guestB, "select id from bookings where id = $1", [b.id])).toHaveLength(0);
    expect(await asUser(guestA, "select id from bookings where id = $1", [b.id])).toHaveLength(1);
    expect(await asUser(hostA, "select id from bookings where id = $1", [b.id])).toHaveLength(1);
    expect(await asUser(hostB, "select id from bookings where id = $1", [b.id])).toHaveLength(0);
  });
  it("nobody can write bookings or payments directly from the browser", async () => {
    await expect(asUser(guestA, "update bookings set status = 'CONFIRMED' where guest_id = auth.uid()"))
      .rejects.toThrow(/permission denied/);
    await expect(asUser(guestA,
      "insert into payments (payer_id, provider, idempotency_key, amount_minor, currency, status) values (auth.uid(),'x','k',1,'PKR','PAID')"))
      .rejects.toThrow(/permission denied/);
    await expect(asUser(hostA, "insert into ledger_entries (entry_group, account, amount_minor, currency) values (gen_random_uuid(),'PAYOUT',1,'PKR')"))
      .rejects.toThrow(/permission denied/);
  });
  it("guests can't review a booking that isn't completed", async () => {
    const b = await book(guestB, propA.pid, day(210), day(211));
    await expect(asUser(guestB,
      "insert into reviews (booking_id, property_id, guest_id, host_id, overall) values ($1, $2, auth.uid(), $3, 5)",
      [b.id, propA.pid, hostA])).rejects.toThrow(/row-level security/);
  });
  it("admin-only data is hidden from regular users", async () => {
    expect(await asUser(guestA, "select id from audit_logs")).toHaveLength(0);
    expect(await asUser(guestA, "select key from platform_settings where key like 'booking.%'")).toHaveLength(0);
  });
  it("an admin can read everything", async () => {
    const adm = await makeUser({ admin: true });
    const rows = await asUser(adm, "select count(*)::int n from bookings");
    expect((rows[0] as { n: number }).n).toBeGreaterThan(0);
  });
});
