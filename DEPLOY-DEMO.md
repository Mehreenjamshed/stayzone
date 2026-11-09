# Put the StayZone demo online (about 10 minutes, free)

This puts the website on the internet with real photos and the 20 demo listings, so you can share a link with your mentor or a group. **No database or settings are needed** — when no database is connected, the site automatically shows the demo listings (each marked "Demo listing", none can be booked).

You need: a Windows computer with **Node.js** installed. To check, open *Command Prompt* and type `node -v`. If you see a version number like `v20.x` or higher, you're ready. If not, install the "LTS" version from https://nodejs.org first (Next → Next → Finish).

## Steps

1. **Unzip** `stayzone-phase1.zip`, for example to `Documents\stayzone`.

2. **Open a terminal in that folder.** Open the `stayzone` folder in File Explorer, click the address bar, type `cmd` and press Enter. A black window opens in the right place.

3. **Run this command:**

   ```
   npx vercel --prod
   ```

   - If it asks *"Ok to proceed? (y)"* → press **y** then Enter.
   - It opens your browser to **log in to Vercel**. Choose *Continue with Google* or *Continue with Email* and finish signing up (free "Hobby" plan).
   - Back in the black window, answer the questions:
     - *Set up and deploy?* → **y**
     - *Which scope?* → press Enter
     - *Link to existing project?* → **n**
     - *Project name?* → type `stayzone` (or press Enter)
     - *In which directory is your code located?* → press Enter
     - *Want to modify these settings?* → **n**

4. **Wait 2–3 minutes** while Vercel builds the site. When it finishes it prints a line like:

   ```
   ✅  Production: https://stayzone-abc123.vercel.app
   ```

   That's your live website. Open it on your phone, send it to your mentor, post it in your group.

## Updating it later

After I send you a newer version, unzip it over the same folder and run `npx vercel --prod` again. The link stays the same.

## Using your own name instead of "StayZone"

In Vercel → your project → **Settings → Environment Variables**, add `NEXT_PUBLIC_BRAND_NAME` with the value `Manzil` (or any name), then **Deployments → ⋯ → Redeploy**.

## When you're ready for the real launch

Follow the main `README.md`: create the Supabase database, add the keys in Vercel's Environment Variables, and set `NEXT_PUBLIC_DEMO_MODE` to `false`. The demo listings disappear and real sign-ups and listings take over.

## If something goes wrong

- *"npx is not recognized"* → Node.js isn't installed. Install it from nodejs.org, close the black window, and start again at step 2.
- *Build failed* → copy the last 20 lines from the black window and send them to Claude.
