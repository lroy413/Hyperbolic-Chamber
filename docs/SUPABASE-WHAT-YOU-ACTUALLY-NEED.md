# Supabase — what you actually need, and what you don't

## The short answer

**You do not need Supabase to put courses in the store.** The store is served by files, not by a database. Supabase is only for accounts and cross-device sync.

Your screenshot shows an empty Table Editor, which means the SQL from Step 2 of `SUPABASE-SETUP.md` was never run. So right now the project exists and the keys are connected, but there are no tables.

## What each piece does

| | Runs on | Needed for the store? | Needed for accounts? |
|---|---|---|---|
| `catalog/*.json` files | Cloudflare, static | **Yes — this IS the store** | No |
| `catalog_courses` table | Supabase | No — optional alternative | No |
| `user_state` table | Supabase | No | **Yes** |
| Auth providers | Supabase | No | **Yes** |

## Adding a course to the store — the actual procedure

No database involved:

1. Generate the course JSON.
2. Save it in your repo as `catalog/<course-id>.json` — for example `catalog/surv-1-physiology.json`.
3. Open `catalog/index.json` and add one entry to the array:

```json
{
  "id": "surv-1-physiology",
  "title": "The Survival Equation: Physiology, Risk & Decision",
  "subtitle": "What actually kills people, in what order, and how to compute it",
  "tagline": "Shown on the store card",
  "accent": "#d1483f",
  "price": 0,
  "author": "Oboros",
  "category": "Survival",
  "weeks": 4,
  "hours": 40
}
```

4. Commit both files and push. Cloudflare redeploys; the course appears in the Store within a minute. No app rebuild, no dashboard.

That's the whole thing. The store already works this way — the five courses on oboros.app right now are served from those files.

## A bug your screenshot uncovered

Because your Supabase keys are baked into the app, the app was treating Supabase as the authority on the catalogue. `catalog_courses` doesn't exist, so the query came back empty — and the app took that as "the catalogue is empty" and **discarded the working file-based catalogue**. Your store on oboros.app has almost certainly been showing "Nothing here yet" since Supabase was connected.

Fixed in this build: a backend catalogue now only wins when it actually returns something. Empty, missing table, blocked by row-level security, or offline — any of those and the app falls back to the shipped files. Four regression tests cover it.

**Deploy the new `index.html` and your store comes back.**

## If you do want accounts and cross-device sync

That part genuinely needs the tables. In Supabase open **SQL Editor → New query**, paste this, click **Run**:

```sql
-- Per-user saved state: one JSON blob per user, only they can read/write it
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own state select" on public.user_state
  for select using (auth.uid() = user_id);
create policy "own state insert" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: a database-backed store. You do NOT need this if you publish
-- courses as files in catalog/. Anyone can read published rows; only you
-- (dashboard / service role) can write.
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
create policy "public read published" on public.catalog_courses
  for select using (published = true);
```

Then in **Authentication → URL Configuration**, set **Site URL** to `https://oboros.app` and add `https://oboros.app` to **Redirect URLs**. Without this, sign-in emails and Google OAuth will bounce people to localhost.

Under **Authentication → Providers**, Email is on by default. While you're testing, turning off "Confirm email" saves a lot of friction — turn it back on before anyone else uses it.

### How to tell it worked

Open oboros.app, go to the menu → the account row at the bottom → create an account. Then finish a lesson, sign in on your phone, and check that the progress is there. If it is, `user_state` is doing its job.

## Should you ever use `catalog_courses`?

Only if you want to add or edit courses without touching Git — pasting JSON into a dashboard row instead of committing a file. That's a real convenience if you end up with dozens of courses or want someone non-technical publishing them.

Two things to know if you go that way. First, it's all-or-nothing: as soon as that table has published rows, it becomes the store and the files are ignored. Second, the whole course body lives in the `data` column, and the audio acoustics course alone is 800 KB of JSON — pasting that into a dashboard textarea on a phone is not a good time.

My honest recommendation: leave the table empty and keep publishing from `catalog/`. It's versioned, diffable, and it works offline.
