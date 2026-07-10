# Basecamp — Company Wellness Tracker

A React + Supabase app for running monthly wellness competitions: steps, weight loss,
water, and nutrition challenges, with a company-wide dashboard and a prize board.

## What's inside

- **Dashboard** (`/`) — company-wide stats and a "trail map" showing everyone's combined step progress.
- **Tracker** (`/tracker`) — daily log-in page for steps / water / nutrition.
- **Challenges** (`/challenges`) — enroll each month: pick a step level (8k/10k/12k/20k),
  log start/end weight, or set a water/calorie target using the built-in calculators.
- **Prizes** (`/prizes`) — what's up for the monthly drawing; admins can add/remove prizes.

Anyone who hits their daily goal on **more than 90% of the days in the month** (or, for the
weight challenge, ends the month lighter than they started) qualifies for that month's drawing.

### About the two calculators
The water and calorie calculators you linked are rebuilt natively in-app (in
`src/lib/calculators.js`) instead of embedded, because most sites block being framed and it's
a smoother experience to keep people on your site. The water calculator mirrors the published
logic (weight × factor, plus activity and climate adjustments) from your linked calculator. The
calorie calculator uses the Mifflin–St Jeor equation, the standard formula behind most modern
BMR/TDEE calculators. Both are just starting points — the person can always type in their own
number instead of using the calculated one.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** → paste in the contents of `supabase/schema.sql` → **Run**.
   This creates all tables, security policies, and the auto-profile trigger.
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.
4. (Recommended) Under **Authentication → Providers → Email**, you can turn off "Confirm email"
   during testing so people can sign in immediately, then turn it back on later.
5. After your first sign-up, make yourself an admin so you can manage prizes:
   ```sql
   update profiles set is_admin = true where full_name = 'Your Name';
   ```

## 2. Run it locally

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
npm run dev
```

## 3. Deploy

**Push to GitHub**, then in **Netlify**:
1. "Add new site" → "Import an existing project" → pick your repo.
2. Build command: `npm run build`, publish directory: `dist` (already set in `netlify.toml`).
3. Under **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Netlify will rebuild automatically on every push to your repo.

## Notes / things you may want to tweak

- **Monthly reset**: enrollments and logs are keyed by month automatically (`YYYY-MM`), so a
  new month just means people re-enroll — no manual reset needed.
- **Trail milestone**: the "500 miles" company milestone on the dashboard is just a fun default —
  change `TRAIL_MILESTONE_MILES` in `src/pages/Dashboard.jsx` to whatever fits your team size.
- **Drawing itself**: this app tracks *who qualifies*, but doesn't auto-pick a winner — that's
  intentionally left as a manual step (query the `monthly_qualification` view in Supabase, or
  just check the dashboard's "on track" counts) so someone runs the actual drawing.
- **Prize images**: paste any public image URL when adding a prize (e.g. from Google Drive
  set to "anyone with the link," or an image host).
