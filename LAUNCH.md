# Soft launch guide — StayZone

The soft launch puts StayZone online so you can start collecting **property owners** (who register to list) and **travellers** (who join the launch list). Visitors can browse the example stays and see how prices work, but **no bookings are taken and no money changes hands** until bookings open.

Total time: about 45 minutes. Everything here is on free plans.

---

## Step 1 — Create your database (Supabase, 15 min)

1. Go to **https://supabase.com** → *Start your project* → sign in with GitHub or email.
2. Click **New project**:
   - Name: `stayzone`
   - Database password: click *Generate a password* and **save it somewhere safe**
   - Region: **Mumbai (ap-south-1)** — the closest to Pakistan
   - Click **Create new project** and wait about 2 minutes.
3. In the left menu open **SQL Editor** → **New query**.
4. On your computer, open the project folder → `supabase` → `bundle` → `all_migrations.sql`. Open it with Notepad, press **Ctrl+A**, **Ctrl+C**.
5. Paste into the Supabase SQL Editor and click **Run**. You should see *"Success. No rows returned"*.
6. Open **Authentication → URL Configuration**. You'll fill this in at Step 3 once you have your web address.

## Step 2 — Copy your keys (2 min)

In Supabase open **Project Settings → API Keys** (or **Data API**) and copy these three values into a Notepad file for the next step:

| Name in Vercel | Where in Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (looks like `https://abcd.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the **publishable** key (older projects: **anon public**) |
| `SUPABASE_SECRET_KEY` | the **secret** key (older projects: **service_role**). Never share it. |

## Step 3 — Put the site online (Vercel, 15 min)

1. Unzip `stayzone-phase1.zip`. Open the `stayzone` folder, click the address bar, type `cmd`, press **Enter**.
2. Run:
   ```
   npx vercel
   ```
   Log in when your browser opens (free *Hobby* plan), then answer: *Set up and deploy?* **y** · *scope* Enter · *link to existing?* **n** · *name* `stayzone` · *directory* Enter · *modify settings?* **n**.
3. Open **https://vercel.com** → your **stayzone** project → **Settings → Environment Variables**. Add each of these (tick all environments):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Step 2 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from Step 2 |
   | `SUPABASE_SECRET_KEY` | from Step 2 |
   | `NEXT_PUBLIC_SITE_URL` | your Vercel address, e.g. `https://stayzone.vercel.app` (no `/` at the end) |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` |
   | `NEXT_PUBLIC_LAUNCH_PHASE` | `waitlist` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | the email you want people to contact |

4. Back in the black window run:
   ```
   npx vercel --prod
   ```
   It prints your live address.
5. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your live address
   - **Redirect URLs**: add `https://YOUR-ADDRESS/**`

## Step 4 — Make yourself the admin (5 min)

1. Open `https://YOUR-ADDRESS/register`, create your account, and click the link in the verification email.
2. In **Supabase → SQL Editor** run (with your email):
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```
3. Log in at `https://YOUR-ADDRESS/login`, then open **`/admin/waitlist`**. Every sign-up appears here, and **Download (CSV)** opens in Excel or Google Sheets.

## Step 5 — Test it (5 min)

- On your phone, open the site → **List your property** → fill the form → you should see *"You're on the list!"*.
- Refresh `/admin/waitlist` — your test entry appears. (You can delete test rows in **Supabase → Table Editor → waitlist_signups**.)

## Step 6 — Your own domain (optional)

Buy a domain such as `stayzone.pk` (from a PKNIC-accredited registrar) or `stayzone.com.pk` / `.com`. In **Vercel → Settings → Domains** add it and follow the DNS instructions. Then update `NEXT_PUBLIC_SITE_URL` in Vercel and the **Site URL** in Supabase to the new domain, and redeploy (`npx vercel --prod`).

> Supabase's built-in email sender only sends a few emails per hour. Before you invite many people to create accounts, connect a sender like Resend under **Authentication → SMTP Settings**. The waitlist forms don't send emails, so they're not affected.

---

## Start these now (they take weeks)

These aren't code, but bookings can't open without them. This is general information, not legal or financial advice — confirm with a lawyer/accountant.

- **Business registration** — register a company with SECP (or start as a sole proprietor) and get an **NTN** from FBR. Payment providers ask for these.
- **Business bank account** in the business name.
- **Payment gateway** — apply for a merchant account with one or more of Safepay, PayFast, JazzCash or Easypaisa. Ask each one specifically about **marketplace / split payments** (paying hosts their share) and **refunds**.
- **Legal pages** — have a Pakistani lawyer review the draft Terms, Privacy and Cancellation pages on the site.
- **Tourism rules** — check hotel/guest-house registration requirements with each provincial tourism department where your first hosts are.
- **Name** — no booking site in Pakistan uses "StayZone" today, but an Australian holiday-rental brand called *Stayz* exists. Consider a trademark search/registration with IPO-Pakistan before spending on branding.

## When you're ready for the next build phase

Tell Claude, and the next phase adds: hosts creating listings (photos, prices, calendar), your approval screens, then online payments. When those are done, set `NEXT_PUBLIC_LAUNCH_PHASE` to `live` and `NEXT_PUBLIC_DEMO_MODE` to `false`.
