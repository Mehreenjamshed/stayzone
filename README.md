# StayZone — accommodation marketplace for Pakistan

*Your Journey. Your Stay. Your Pakistan.*

A full-stack booking marketplace: guests search and book stays, hosts list properties, admins verify and moderate. Built with Next.js 16, TypeScript, Tailwind CSS v4 and Supabase (PostgreSQL + Auth + Storage).

> The brand name is configurable — set `NEXT_PUBLIC_BRAND_NAME` (e.g. to `Manzil`) and it changes everywhere.

---

## What works today (Phase 1 + early Phase 2)

| Area | Status |
|---|---|
| Database: 29 tables, constraints, indexes, Row Level Security, storage buckets | ✅ Done & tested |
| Booking engine: server-side pricing, holds, expiry, double-booking prevention | ✅ Done & tested (incl. 10 simultaneous bookings) |
| Sign up, email verification, log in/out, forgot/reset password | ✅ Done |
| Roles: guest → host (one account), admin checked on the server | ✅ Done & tested |
| Homepage, search with filters/sorting/pagination, categories, destinations | ✅ Done |
| Property page with live price check, reserve / request-to-book | ✅ Done |
| Guest account: profile, trips, trip details, cancel unpaid, saved stays | ✅ Done |
| English + Urdu (right-to-left), PKR + indicative display currencies | ✅ Done |
| Demo dataset (20 properties) for presentations, removable in one step | ✅ Done |
| Online demo with no database needed (real photos, live prices) | ✅ Done |
| Host listing creation, photo upload, calendar, pricing tools | ⏳ Phase 3 |
| Payments (Safepay / PayFast / JazzCash / Easypaisa adapters), refunds, payouts | ⏳ Phase 5 |
| Admin approval tools, user management, audit-log viewer | ⏳ Phase 6 |
| Messaging, reviews UI, subscriptions | ⏳ Phases 4–7 |

**Payments are not live.** Reservations hold dates and show "Awaiting payment", but no money is collected and no booking can become "Confirmed" yet. That is deliberate: a booking is only confirmed after a payment provider verifies payment on the server.

---

## Setup — step by step

You need: a computer with **Node.js 20 or newer** ([nodejs.org](https://nodejs.org)), a free **Supabase** account, and (for going live) a free **Vercel** account.

### 1. Install the project

```bash
cd stayzone
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a name, a strong database password (save it somewhere safe), and the region closest to Pakistan (e.g. *Mumbai* or *Singapore*).
3. Wait about two minutes for it to finish.

### 3. Add your keys

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in, from Supabase → **Project Settings → API Keys**:

- `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the *publishable* (or *anon*) key
- `SUPABASE_SECRET_KEY` — the *secret* (or *service_role*) key. **Never share this or put it in browser code.**

### 4. Create the database

Easiest way (no extra tools):

```bash
npm run db:bundle
```

This creates `supabase/bundle/all_migrations.sql`. In Supabase open **SQL Editor → New query**, paste the whole file, and click **Run**. You should see "Success. No rows returned".

*(Alternative for developers: `npx supabase link --project-ref YOUR-ID` then `npx supabase db push`.)*

### 5. Configure sign-in emails

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (change to your real domain when you go live)
- **Redirect URLs**: add `http://localhost:3000/**` and later `https://YOUR-DOMAIN/**`

In **Authentication → Providers → Email**, keep **Confirm email** turned on.

> Supabase's built-in email sender is limited to a few emails per hour — fine for testing. Before launch, connect your own SMTP (e.g. Resend) under **Authentication → SMTP Settings**.

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000. Sign up, click the link in your email, and you're in.

### 7. Make yourself an admin

After you've signed up, in the Supabase **SQL Editor** run (with your email):

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Log out and in again, then open http://localhost:3000/admin. Admin rights can only be granted this way — never from the website.

---

## Quickest way to show it: online demo with no database

See **[DEPLOY-DEMO.md](DEPLOY-DEMO.md)**. One command (`npx vercel --prod`) puts the site online with real photos and the 20 demo listings. When no database is connected, the site automatically runs from the built-in demo catalogue (`src/data/demo-catalog.json`) — read-only, clearly labelled, nothing can be booked. Prices on property pages use the same formula as the database engine (an automated test checks they match).

To refresh that catalogue after editing the demo seed: `./scripts/demo/export-demo-catalog.sh` (needs local PostgreSQL).

## Demo data (for presentations and mentors)

The demo adds 20 example properties across Lahore, Islamabad, Murree, Hunza, Skardu, Swat, Naran, Karachi, Peshawar, Quetta, Chitral and Gilgit, with photos, prices, room types and reviews.

**Turn it on**

1. In Supabase SQL Editor, paste and run `supabase/demo/demo_seed.sql`.
2. In `.env.local` set `NEXT_PUBLIC_DEMO_MODE=true` and restart `npm run dev`.

**How it stays honest**

- Every demo property shows a **"Demo listing"** badge and a notice on its page; a banner across the site says it's a preview.
- Demo listings **can't be booked** (the database refuses), and demo hosts can't log in.
- Photos are free-licence illustrations from Unsplash, not the actual places.
- With `NEXT_PUBLIC_DEMO_MODE=false`, demo listings are invisible everywhere.

**Remove it before launch** — run `supabase/demo/demo_remove.sql` in the SQL Editor and set `NEXT_PUBLIC_DEMO_MODE=false`.

**Showing it to someone:** browse a destination (e.g. Hunza), open a property, pick dates — the price breakdown (nights, cleaning fee, 4% service fee, total) is calculated live by the server. Sign up and become a host to show the host dashboard.

---

## Deploy to Vercel

1. Push this folder to a GitHub repository (`.env.local` is ignored automatically — good).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repository.
3. Under **Environment Variables**, add every variable from your `.env.local`, but set `NEXT_PUBLIC_SITE_URL` to your Vercel address (e.g. `https://stayzone.vercel.app`).
4. Click **Deploy**.
5. Back in Supabase → Authentication → URL Configuration, set **Site URL** to that address and add `https://stayzone.vercel.app/**` to Redirect URLs.

---

## Testing

```bash
npm run typecheck   # TypeScript
npm run lint        # code quality
npm test            # unit tests (money, dates, search parsing, redirects)
npm run build       # production build
```

**Database tests** run the real migrations against a local PostgreSQL 16 and check the booking engine and security rules (34 tests, including simultaneous-booking races):

```bash
# needs a local PostgreSQL with user postgres / password postgres
npm run test:db
```

---

## Business settings (no code changes needed)

Stored in the `platform_settings` table, editable in Supabase Table Editor (admin screen coming in Phase 6):

| Key | Default | Meaning |
|---|---|---|
| `fees.host_commission_bps` | `800` | Host commission, in basis points (800 = 8%) |
| `fees.guest_service_bps` | `400` | Guest service fee (400 = 4%) |
| `fees.tax_bps` | `0` | Tax on the guest total — set per your tax adviser |
| `booking.payment_hold_minutes` | `20` | How long dates are held while a guest pays |
| `booking.request_response_hours` | `24` | Time a host has to accept a request |
| `public.fx_rates` | indicative | Display-only conversion rates. Guests are always charged in PKR |

Example: PKR 20,000 / night × 1 night → guest pays PKR 20,800; host receives PKR 18,400; platform earns PKR 2,400. (This exact example is an automated test.)

---

## Important decisions, in plain English

- **No double bookings, guaranteed by the database.** Even if two people click "Reserve" at the same millisecond, PostgreSQL refuses the second one (an *exclusion constraint*). Tested with 10 simultaneous attempts.
- **Prices are calculated only on the server**, and a copy of the full price is saved with each booking, so later price changes never affect existing bookings.
- **Money is stored in paisa** (whole numbers) to avoid rounding errors.
- **Stay dates use Pakistan time** (Asia/Karachi). "Today" means today in Pakistan.
- **A hotel with 5 identical rooms = 5 bookable units** in one room type. Guests choose the room type; the system assigns a free room.
- **Every table has Row Level Security.** Guests see only their own bookings; hosts only their own properties; identity documents are in a private storage bucket.
- **Legal pages are drafts** and must be reviewed by a Pakistani lawyer before launch. Compliance rules (licences per province/category) are stored in `compliance_requirements` and editable.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
