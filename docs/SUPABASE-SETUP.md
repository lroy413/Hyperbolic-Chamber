# Oboros — Backend Setup (Supabase) for oboros.app

Your app ships **backend-ready**. With the config left blank it runs fully offline (everything saved on the device). The moment you paste a Supabase URL + key into the config block and redeploy, three things switch on:

- **Accounts** — email + password and "Continue with Google."
- **Cross-device sync** — progress, XP, streaks, badges, notes, highlights, and imported courses merge across every device a user signs in on (furthest-along value wins, so nothing is lost).
- **A live Course Store** — the store reads your published catalog from Supabase instead of the bundled samples.

This is a one-time setup, ~30–45 minutes. Your live address is **https://oboros.app** — that exact URL is used in Steps 3 and 5, so keep it handy.

---

## Step 1 — Create the Supabase project

1. Go to **supabase.com**, create a free account, and click **New project**.
2. Name it `oboros`, set a strong database password (save it somewhere safe), pick the region closest to most of your users.
3. When it finishes provisioning, open **Project Settings → API** and copy two values:
   - **Project URL** — looks like `https://abcd1234.supabase.co`
   - **anon public** key — a long string starting `eyJ...`

The anon key is *meant* to be public — it's safe in the HTML. Your data is protected by the security rules in Step 2, not by hiding the key.

## Step 2 — Create the tables + security rules

Open **SQL Editor → New query**, paste this, click **Run**:

```sql
-- Per-user saved state: one JSON blob per user, only they can read/write it
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
-- Postgres has no "create policy if not exists", so drop first. Without these
-- three lines a second run dies with 42710 and rolls the whole script back.
drop policy if exists "own state select" on public.user_state;
drop policy if exists "own state insert" on public.user_state;
drop policy if exists "own state update" on public.user_state;
create policy "own state select" on public.user_state
  for select using (auth.uid() = user_id);
create policy "own state insert" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Course catalog (the store). Anyone can READ published courses;
-- only you (via the dashboard / service role) can add or edit them.
create table if not exists public.catalog_courses (
  id text primary key,
  title text not null,
  subtitle text,
  tagline text,
  accent text,
  author text,
  price numeric not null default 0,
  published boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.catalog_courses enable row level security;
drop policy if exists "public read published" on public.catalog_courses;
create policy "public read published" on public.catalog_courses
  for select using (published = true);
```

`user_state` holds each learner's progress; `catalog_courses` is your store.

## Step 3 — Turn on sign-in + point it at oboros.app

In **Authentication → Providers**:

- **Email** is on by default. (Optional: toggle off "Confirm email" while testing; turn it back on for production.)
- **Google**: enable it, then follow Supabase's link to create a Google OAuth client in the Google Cloud console. Google gives you a **Client ID** and **Client secret** to paste back into Supabase. In Google's console, set the **Authorized redirect URI** to the one Supabase shows you — it looks like:

  ```
  https://<your-project>.supabase.co/auth/v1/callback
  ```

In **Authentication → URL Configuration**, set:

- **Site URL:**
  ```
  https://oboros.app
  ```
- **Redirect allow list** — add both of these (the second covers every path/hash):
  ```
  https://oboros.app
  https://oboros.app/**
  ```
  If you also want to test on the Cloudflare preview address before the domain is attached, add your `https://<project>.pages.dev` and `https://<project>.pages.dev/**` here too.

This is what makes email confirmation links and "Continue with Google" return to **oboros.app**.

## Step 4 — Paste your keys into the app

Open `index.html` in a text editor, find this block near the top:

```html
<script>
/* ===== BACKEND CONFIG ===== ... */
window.COURSEAPP_BACKEND = { url: "", anonKey: "" };
</script>
```

Fill in the two values from Step 1:

```html
window.COURSEAPP_BACKEND = { url: "https://abcd1234.supabase.co", anonKey: "eyJhbGc...your-anon-key..." };
```

Save. That single edit flips the app from offline to connected. (Leaving them blank keeps it offline — handy for a downloadable demo build.)

## Step 5 — Deploy to Cloudflare + attach oboros.app

1. In **Cloudflare → Workers & Pages**, open your Oboros Pages project (or create one and upload `index.html` + `_headers`). Upload the edited `index.html` from Step 4 as a new deployment.
2. In the project's **Custom domains** tab → **Set up a custom domain** → enter `oboros.app`. If the domain's DNS is already on Cloudflare, the record is added automatically; HTTPS is issued for you within a few minutes. (Optional: add `www.oboros.app` too and let it redirect to the apex.)
3. Once `https://oboros.app` loads your app, confirm it matches the Supabase **Site URL** from Step 3. Done — sign-in and sync are live.

**Order of operations:** it's fine to attach the domain first and paste the Supabase keys second (or vice-versa). Just make sure the *final* `index.html` you deploy has your keys in it, and that Supabase's Site URL is exactly `https://oboros.app`.

---

## Publishing courses to the Store

Your store reads every row in `catalog_courses` where `published = true`. To add one:

1. In the app, build or import the course, then **menu → Settings → Manage courses → Export** to download its `.json`.
2. In Supabase, open **Table editor → catalog_courses → Insert row** and fill:
   - `id`, `title`, `subtitle`, `tagline`, `accent`, `author` — the course metadata (shown on the store card).
   - `price` — leave `0` for free (all the app offers today).
   - `published` — set **true** to make it visible.
   - `data` — paste the **entire course JSON** from the export.
3. Save. It appears in every user's store instantly. To update later, edit `data`; to pull it, set `published = false`.

---

## Selling courses later (when you're ready)

The app already carries a `price` field end-to-end, so turning on sales later is additive:

- A `purchases` table (`user_id`, `course_id`, `created_at`) with a policy so users read their own purchases.
- A **Stripe** account + a small **Supabase Edge Function** that creates a Stripe Checkout session, and a webhook that inserts into `purchases` on payment success.
- A one-line change in the download handler: if `price > 0` and not yet purchased, send to Checkout; otherwise download.

None of that disturbs the free store.

---

## Good to know

- **Security:** Row-level security means a signed-in user can only touch their own `user_state` row, even though the anon key is public. The catalog is read-only to everyone, writable only by you via the dashboard.
- **Merging:** On sign-in the app pulls the cloud copy, merges with the device copy keeping the furthest-along value for every field (highest XP, longest streak, all passed modules, union of notes/bookmarks/badges), then pushes the merged result back. Offline changes sync up next time online.
- **Privacy:** You're now storing an email + learning progress, so add a short privacy policy to the site (a simple page at `oboros.app/privacy` is fine). Supabase can delete a user, which cascades and removes their `user_state`, to honor deletion requests.
- **Email sender:** Supabase's built-in email works for testing but has low limits and generic sender. Before real launch, add a custom SMTP sender (Resend, Postmark, etc.) in **Authentication → Emails** so confirmation mail comes from oboros.app and lands reliably.
