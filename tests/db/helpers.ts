import { Client, Pool } from "pg";
import { randomUUID } from "node:crypto";

export const DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/stayzone_test";

export const pool = new Pool({ connectionString: DB_URL, max: 30 });

/** Run SQL as the database owner (like a migration / service role). */
export async function admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

/**
 * Run SQL exactly like a logged-in Supabase user: role `authenticated`
 * with the JWT `sub` claim set, so auth.uid() and RLS apply.
 * Pass uid = null to act as an anonymous visitor.
 */
export async function asUser<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${uid ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [
      uid ?? "",
      uid ? "authenticated" : "anon",
    ]);
    const r = await c.query(sql, params);
    await c.query("commit");
    return r.rows as T[];
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function makeUser(opts: { verified?: boolean; host?: boolean; admin?: boolean; name?: string } = {}) {
  const id = randomUUID();
  await admin(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
     values ($1, $2, $3, jsonb_build_object('full_name', $4::text))`,
    [id, `${id}@test.local`, opts.verified === false ? null : new Date(), opts.name ?? "Test User"],
  );
  if (opts.host || opts.admin) {
    await admin(`update public.profiles set is_host = $2, is_admin = $3 where id = $1`, [id, !!opts.host, !!opts.admin]);
  }
  return id;
}

/** Creates an APPROVED property with `units` listings in one unit group. */
export async function makeProperty(hostId: string, o: {
  units?: number; price?: number; mode?: "INSTANT" | "REQUEST"; status?: string; maxGuests?: number;
} = {}) {
  const pid = randomUUID();
  await admin(
    `insert into public.properties (id, host_id, slug, title, category, city, province, status, booking_mode)
     values ($1, $2, $3, 'Test property for bookings', 'APARTMENT', 'Lahore', 'Punjab', $4, $5)`,
    [pid, hostId, "t-" + pid.slice(0, 18), o.status ?? "APPROVED", o.mode ?? "INSTANT"],
  );
  const listingIds: string[] = [];
  for (let i = 0; i < (o.units ?? 1); i++) {
    const [row] = await admin<{ id: string }>(
      `insert into public.listings (property_id, name, max_guests, base_guests, nightly_price_minor, sort_order)
       values ($1, $2, $3, 2, $4, $5) returning id`,
      [pid, `Unit ${i + 1}`, o.maxGuests ?? 4, o.price ?? 2_000_000, i],
    );
    listingIds.push(row.id);
  }
  return { pid, listingIds };
}

/** Date string `n` days after today in Asia/Karachi. */
export function day(n: number) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  now.setDate(now.getDate() + n);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function book(guest: string, pid: string, ci: string, co: string, adults = 2, group = "default") {
  return asUser<{ r: { id: string; status: string; quote: Record<string, number> } }>(
    guest,
    `select public.create_booking($1, $2, $3::date, $4::date, $5) as r`,
    [pid, group, ci, co, adults],
  ).then((rows) => rows[0].r);
}

/** Opens N independent connections and fires all bookings at the same instant. */
export async function bookConcurrently(guests: string[], pid: string, ci: string, co: string) {
  const clients = await Promise.all(guests.map(async (g) => {
    const c = new Client({ connectionString: DB_URL });
    await c.connect();
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role','authenticated', true)", [g]);
    return c;
  }));
  const results = await Promise.allSettled(clients.map(async (c) => {
    const r = await c.query("select public.create_booking($1, 'default', $2::date, $3::date, 2) as r", [pid, ci, co]);
    await c.query("commit");
    return r.rows[0].r;
  }));
  await Promise.all(clients.map((c) => c.query("rollback").catch(() => {}).then(() => c.end())));
  return results;
}
