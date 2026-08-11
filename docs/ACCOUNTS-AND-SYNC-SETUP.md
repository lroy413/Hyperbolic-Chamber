# Turning on accounts + cross-device sync

Everything below happens in the Supabase dashboard. It works fine from a phone, but the SQL step is much less painful on a computer — that's one long paste.

Your project is already connected to the app; the keys are baked into `index.html`. What's missing is the database table and the URL configuration.

---

## Step 1 — Create the table

Supabase dashboard → **SQL Editor** → **New query**. Paste this whole block and hit **Run**.

```sql
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "own state select" on public.user_state;
drop policy if exists "own state insert" on public.user_state;
drop policy if exists "own state update" on public.user_state;

create policy "own state select" on public.user_state
  for select using (auth.uid() = user_id);
create policy "own state insert" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "own state update" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

You should see **Success. No rows returned.** Go to **Table Editor** and `user_state` will be there, empty.

The three `drop policy if exists` lines matter: Postgres has no `create policy if not exists`, so without them a second run fails with `42710: policy ... already exists` and — because the SQL editor runs the whole block as one transaction — everything after it rolls back too. With the drops in place this script is safe to run as many times as you like.

Row-level security is what makes this safe to ship with a public key: those three policies mean a signed-in user can only ever touch the row whose `user_id` matches their own login. Without them the anon key would let anyone read everyone's progress.

You do **not** need `catalog_courses`. The store is served from the `catalog/` files, so leave it out — it's just more SQL to get wrong on a phone.

### Checking what you've actually got

Paste this and Run. It tells you where you stand without changing anything.

```sql
select
  (select count(*) from pg_tables
     where schemaname = 'public' and tablename = 'user_state')   as table_exists,
  (select relrowsecurity from pg_class
     where oid = 'public.user_state'::regclass)                  as rls_on,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'user_state')   as policy_count;
```

You want `table_exists = 1`, `rls_on = true`, `policy_count = 3`. That's the whole database side done.

---

## Step 2 — Point auth at oboros.app

This is the step people skip, and it's the one that breaks sign-in.

**Authentication → URL Configuration:**

- **Site URL:** `https://oboros.app`
- **Redirect URLs:** add `https://oboros.app` and `https://oboros.app/`

If Site URL is still `http://localhost:3000`, every confirmation email and password-reset link will send you to a page that doesn't exist.

---

## Step 3 — Email sign-in

**Authentication → Providers → Email** is on by default. Nothing to do.

One decision: under **Authentication → Sign In / Providers**, there's **Confirm email**. Leave it **off** while you're setting up — you'll be creating throwaway accounts to test, and waiting on confirmation emails each time is miserable. Turn it back on before anyone else uses the app.

Supabase's built-in email sender is rate-limited to a handful of messages per hour. That's fine for you and a few people. If Oboros ever gets real users, wire up a proper SMTP provider under **Project Settings → Authentication → SMTP Settings**.

---

## Step 4 — Google sign-in (optional, do it later)

Email works on its own. Google is nicer but takes a detour through the Google Cloud console:

1. Supabase → **Authentication → Providers → Google** → toggle on. Copy the **Callback URL** it shows you.
2. Google Cloud console → **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
3. Paste Supabase's callback URL into **Authorized redirect URIs**. Add `https://oboros.app` to **Authorized JavaScript origins**.
4. Google gives you a **Client ID** and **Client secret**. Paste both back into Supabase and save.

---

## Step 5 — Deploy and test

Push the new `index.html`, then:

1. On your phone, open oboros.app → menu → the account row at the bottom → **Create account**.
2. Add a course, do a lesson, bookmark something.
3. On your computer, open oboros.app → sign in with the same email.
4. Your XP, progress, bookmarks and notes should all be there, and the course should appear in your library within a second or two.

The account row in the menu shows a coloured dot: green means up to date, amber means syncing, red means the last push failed. If it's red, the usual cause is that Step 1 didn't run.

---

## Two things I fixed before you switch this on

Testing the sync path end to end turned up two problems that would have bitten you immediately.

**Course bodies were being synced.** The app pushed your entire local state to Supabase on every save, and that state includes the full text of every course you own. The acoustics course alone is 800 KB. Every time you earned XP, the app would have shipped a megabyte or more to the database — slow on mobile data, and it would have eaten through the free tier quickly.

Now it syncs the course **id list** instead, and the other device re-fetches the bodies from the catalogue it can already reach. Measured payload with a course owned and real progress: **1 KB**. That number stays flat no matter how many courses you add.

**Assignment completions were being dropped.** The merge that runs on sign-in rebuilt your state field by field and simply never carried `assignments` across — so every rubric assignment you'd marked complete was silently wiped the moment you signed in. Fixed, and pinned by a test.

A new test file (`test25`) plays out the actual scenario: add a course and make progress on a phone, sign in on a computer, and check that XP, progress, bookmarks, notes and assignment completions all arrive, that the course body gets re-fetched and is genuinely usable, and that the round trip back to the phone works. 366 checks pass across 14 files.

---

## How the merge behaves, so nothing surprises you

When you sign in, local and remote states are merged rather than one overwriting the other:

- **XP, streak, badges** — the higher value wins.
- **Module completions** — a pass on either device counts as a pass.
- **Review schedule** — the earlier due date wins, so nothing gets skipped.
- **Notes** — the longer version wins. This is the one lossy rule: if you edit the same lesson's note on two devices while offline, the shorter edit loses. Worth knowing.
- **Bookmarks, highlights, course order, assignments** — union of both.
- **Settings** — local wins, so your theme doesn't jump around when you sign in.

Sync is push-on-change with a 1.5-second debounce, and pull-on-sign-in. It is not live: if you have the app open on both devices at once, the second one won't see changes until you reload. For one person moving between a phone and a computer, that's the right trade — no polling, no battery cost.
