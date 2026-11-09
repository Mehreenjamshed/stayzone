import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { admin, asUser, makeUser, pool } from "./helpers";

afterAll(async () => { await pool.end(); });

const host = (email: string) => asUser(null,
  `insert into waitlist_signups (kind, full_name, email, phone, city, property_type, units, consent)
   values ('HOST', 'Owner Name', $1, '+92 300 1234567', 'Hunza', 'GUEST_HOUSE', 4, true)`, [email]);

describe("launch waitlist", () => {
  it("lets anonymous visitors sign up, but not read the list", async () => {
    const email = `${randomUUID()}@example.com`;
    await host(email);
    await expect(asUser(null, "select id from waitlist_signups")).rejects.toThrow(/permission denied/);
    const guest = await makeUser();
    expect(await asUser(guest, "select id from waitlist_signups")).toHaveLength(0);
    const adm = await makeUser({ admin: true });
    const rows = await asUser<{ email: string }>(adm, "select email from waitlist_signups where email = $1", [email]);
    expect(rows).toHaveLength(1);
  });

  it("rejects duplicates, bad emails, missing consent and incomplete host forms", async () => {
    const email = `${randomUUID()}@example.com`;
    await host(email);
    await expect(host(email.toUpperCase())).rejects.toThrow(/duplicate key/);
    await expect(host("not-an-email")).rejects.toThrow(/check constraint/);
    await expect(asUser(null, "insert into waitlist_signups (kind, full_name, email, consent) values ('GUEST','Guest Name','g@example.com', false)"))
      .rejects.toThrow(/check constraint/);
    await expect(asUser(null, "insert into waitlist_signups (kind, full_name, email, consent) values ('HOST','Host Name','h@example.com', true)"))
      .rejects.toThrow(/check constraint/);
  });

  it("stops visitors from pre-setting admin fields", async () => {
    await expect(asUser(null,
      "insert into waitlist_signups (kind, full_name, email, consent, status) values ('GUEST','Guest Name',$1, true, 'ONBOARDED')",
      [`${randomUUID()}@example.com`])).rejects.toThrow(/row-level security/);
  });

  it("lets admins update status; others cannot", async () => {
    const email = `${randomUUID()}@example.com`;
    await host(email);
    const adm = await makeUser({ admin: true });
    await asUser(adm, "update waitlist_signups set status = 'CONTACTED' where email = $1", [email]);
    const u = await makeUser();
    expect(await asUser(u, "update waitlist_signups set status = 'NOT_A_FIT' where email = $1 returning id", [email])).toHaveLength(0);
    const [r] = await admin<{ status: string }>("select status from waitlist_signups where email = $1", [email]);
    expect(r.status).toBe("CONTACTED");
  });
});
