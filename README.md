# RentMitra

Rent & property management for Indian landlords. Next.js + Supabase, built to
stay on free tiers.

## Stack

- **Next.js (App Router, plain JavaScript)** — pages + the one server route this app needs
- **Supabase** — Postgres database, Google sign-in auth, and file storage (all one project, one free tier)
- **Tailwind CSS** — styling
- **jsPDF** — client-side PDF report generation
- **Vercel** — hosting + a daily Cron Job that creates each month's rent records

There's intentionally no custom backend/API layer for CRUD: pages talk to
Supabase directly from the browser, and Postgres Row-Level-Security (every
table's `user_id = auth.uid()` policy) is what keeps one user's data away
from another's. The only server route is the monthly rent-generation cron.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. Open the **SQL Editor** and run, in order:
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   [`supabase/migrations/0002_google_auth.sql`](supabase/migrations/0002_google_auth.sql),
   [`supabase/migrations/0003_move_in_anchored_due_dates.sql`](supabase/migrations/0003_move_in_anchored_due_dates.sql),
   [`supabase/migrations/0004_tenant_billing_start_date.sql`](supabase/migrations/0004_tenant_billing_start_date.sql), then
   [`supabase/migrations/0005_rooms_beds_billing_mode.sql`](supabase/migrations/0005_rooms_beds_billing_mode.sql), then
   [`supabase/migrations/0006_drop_property_total_rent.sql`](supabase/migrations/0006_drop_property_total_rent.sql), then
   [`supabase/migrations/0007_per_room_billing_mode.sql`](supabase/migrations/0007_per_room_billing_mode.sql).
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-only)

## 2. Set up Google sign-in (free)

1. In [Supabase Dashboard → Authentication → Providers → Google](https://supabase.com/dashboard),
   click to enable it — this screen shows you the exact **Callback URL** to use in the next step
   (looks like `https://<project-ref>.supabase.co/auth/v1/callback`). Leave this tab open.
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create a project (or use an existing one) — free.
   - **OAuth consent screen**: set it up as "External", app name "RentMitra", your email as support/contact.
     You can leave it in "Testing" mode while developing — add your own Google account under **Test users**.
   - **Credentials → Create Credentials → OAuth client ID** → Application type **Web application**.
   - Under **Authorized redirect URIs**, paste the Supabase callback URL from step 1.
   - Save, then copy the generated **Client ID** and **Client Secret**.
3. Back in Supabase's Google provider screen, paste the Client ID + Client Secret, and save.
4. In Supabase Dashboard → **Authentication → URL Configuration**, add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://<your-vercel-domain>/auth/callback` (once deployed)

That's it — no SMS provider, no per-message cost. Signing in with Google is free at any volume.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the four values (the fourth, `CRON_SECRET`, is just a random string you make up —
it's what stops anyone but Vercel Cron from calling the rent-generation endpoint).

## 4. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/login`.

> **Note:** this project folder's name contains `&` (`PRO&PG`), which Windows'
> `cmd.exe` treats as a command separator and breaks npm's generated `.cmd`
> shims. `npm run dev`/`build`/`start` are set up to call Next.js's bin script
> directly through `node` to route around that — if you ever rename or move
> the project, this still works fine, but you could also simplify the
> scripts back to plain `next dev` etc. if the folder name no longer has `&`
> in it.

## 5. Deploy

Push this repo to GitHub and import it into [Vercel](https://vercel.com) (free/Hobby tier).
Add the same four environment variables in the Vercel project settings. `vercel.json` already
declares the daily cron job — Vercel wires it up automatically on deploy. Once you have the
Vercel domain, add its `/auth/callback` URL to Supabase's Redirect URLs (step 2.4 above).

## Project layout

```
app/            pages (App Router)
components/     shared UI pieces
lib/            supabase clients + small business-logic helpers (due dates, WhatsApp links, CSV/PDF export)
supabase/       SQL migrations (schema + RLS policies)
middleware.js   redirects signed-out users to /login and signed-in users away from it
```

## Property types & billing

Three property types: **Rental** (no rooms/beds concept — a fixed number of units, one
tenant per unit, free-text room field, unchanged from V1), **PG**, and **Hostel**. There's no
"Property Total Rent" field — a property's rent is always the sum of its active tenants'
individual `monthly_rent`, computed on the fly rather than entered upfront.

Billing mode (**bed-wise** or **room-wise**) is chosen **per room**, not per property — a
single PG (or hostel) can mix private rooms with shared/dorm rooms in the same building,
which is how real PGs actually work. It's set when adding a room via **Manage Rooms**
([app/properties/[id]/rooms/page.jsx](<app/properties/[id]/rooms/page.jsx>)) — real `rooms`
and `beds` records ([lib/rooms.js](lib/rooms.js)), created before tenants can be added, so a
bed shows as vacant even before anyone's ever been assigned to it. A property's occupancy
total sums every bed (in bed-wise rooms) and every whole room (in room-wise rooms) as one
"slot" so the numbers stay meaningful even when a property's rooms are mixed. Room-wise
billing is one tenant record per room (no per-occupant tracking, matching how the rest of
the app already treats tenants).

## Rent due dates

Each tenant's rent cycle is independent: the first payment is due **30 days after their
move-in date**, and every cycle after that is another 30 days on from the last one — not
tied to the calendar month. Overdue counting starts immediately once a due date passes
(no grace period), and At-Risk severity is: **Medium** = 1–15 days overdue, **Critical** =
16+ days overdue. A daily cron job ([app/api/cron/generate-rent/route.js](app/api/cron/generate-rent/route.js))
creates each tenant's next cycle once their current one's due date arrives.

An owner can override a tenant's cycle anchor with a **Billing Start Date** (set from the
Tenant Payment History page) — useful after a mid-month move-in with a partial first
payment, where the regular cycle should start from, say, the 1st of the next month instead
of 30 days after the actual move-in date. If set, it replaces `move_in_date` as the anchor
for all future due dates; the tenant's current unpaid cycle is realigned immediately.

## Revising a tenant's rent

Monthly rent is editable from the Tenant Payment History page at any time. Any cycle that's
already **paid** is never touched (it's historical fact, frozen at whatever was actually
charged). Any cycle that's still **unpaid** is immediately corrected to the new amount —
covers both "I typed the wrong number" and "rent went up," since in both cases the
outstanding bill should reflect the current rate. Future cycles pick up the new rate
automatically (the cron reads `monthly_rent` fresh each time it generates one). Every
amount change is logged to `payment_audit_log`. Dashboard and Reports need no special
handling since they always read live payment amounts.

## Payments tab actions

Mark Paid is available on both pending and overdue cycles — a tenant who pays early
shouldn't have to wait until it's overdue to be marked. Remind only shows on overdue cycles
(no nudge needed before something's actually due).

## Multi-month overdue

A tenant who misses more than one cycle accumulates a separate unpaid `payments` row per
missed cycle (nothing is merged or overwritten). Dashboard, Property Detail, and At-Risk all
sum **every** unpaid cycle for a tenant — not just their most recent one — so a tenant behind
by 2 months shows the full ₹ total owed, with a "(N months)" note wherever that matters (the
tenant row's status pill, the At-Risk card, the WhatsApp reminder amount). The Payments tab
already shows each cycle as its own card, so multi-month tenants were always visible there.

## Navigation & performance

Bottom tabs: **Home / Payments / Reports / Settings**. There's no separate Alerts tab —
overdue/pending are already visible on the Payments tab (with a banner linking to the
At-Risk breakdown when anything's overdue), so a dedicated Alerts screen was redundant.
Settings is the existing Profile screen.

Each tab's data is cached in memory for the session ([lib/useCachedQuery.js](lib/useCachedQuery.js)) —
revisiting a tab you've already seen renders instantly from cache while quietly refetching
in the background, instead of blocking on a fresh "Loading…" every time.

## Known V1 scope cuts (see project plan for the full reasoning)

- Reminders open a pre-filled WhatsApp (`wa.me`) link — the owner still presses Send. No WhatsApp Business API.
- No online rent collection — payments are marked paid manually; UPI ID is just displayed for tenants to pay externally.
- No real push notifications — the Payments/At-Risk tabs compute everything live from due dates, which covers the same information.
