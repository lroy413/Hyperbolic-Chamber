# Oboros

## What it is

Oboros is a self-paced learning app: a catalogue of long-form courses with lessons, knowledge checks, quizzes, spaced repetition, streaks and a transcript. It ships as **one self-contained HTML file** that works with no network — course bodies are downloaded on demand and kept in IndexedDB, progress lives in the browser, and a service worker makes the app itself open offline. It is deployed to **oboros.app** as a Cloudflare Worker serving static assets.

## Stack

No framework, no bundler, no runtime dependencies. Plain ES5-flavoured JavaScript, hand-written CSS, and a Node build script that concatenates the parts into one file. Node 20+ is needed only to build and to run the tests; the shipped artifact needs nothing but a browser.

The only runtime dependency is optional: `@supabase/supabase-js`, loaded from a CDN *at runtime and only if* a backend is configured. With no backend the app never touches the network after first load.

Playwright drives the test suite and the two audits. Wrangler deploys.

## File structure

```
CLAUDE.md                 this file
package.json              every command you need is a script here
package-lock.json         pinned devDependencies, so CI installs what you tested
.gitignore                dist/ and node_modules/
wrangler.toml             Cloudflare Worker config — [assets] directory = "./dist"
.github/workflows/        deploy.yml — build → lint → test → audit → deploy

src/                      everything a person wrote
  build.js                THE BUILD. Assembles dist/ from everything below.
  engine.js               the app: routing, state, rendering, gamification, sync
  renderers.js            block renderers + the shared course validation rules
  style.css               base stylesheet and the design tokens
  appinner.html           the static shell that ships inside <div id="app">
  sw.src.js               service worker template; __BUILD__ is stamped by build.js
  make-catalog.js         derives catalog/index.json from the course files
  lint-course.js          validates course JSON (shares rules with renderers.js)
  make-icons.js           rasterises the PWA icons from the one vector mark
  data/
    store-courses.json    THE COURSE CONTENT. ~2 MB, six courses. Source of truth.
    courses.json          courses bundled into the library on first run (empty [])
    tracks.json           the six specializations
    warmup.json           245 daily warm-up questions
  brand/
    logo_vector.svg       the ouroboros-apple mark
    tile_uri.txt          the same mark as a base64 PNG data URI, 256×256

static/                   copied verbatim into dist/
  _headers                caching + security headers for Cloudflare

tests/                    31 suites + 2 audits, ~990 assertions
scripts/                  run-tests.js, serve.js, copy-static.js
docs/                     decisions.md, status.md, and the older reference docs

dist/                     GENERATED. Never committed, never hand-edited.
  index.html              the app
  sw.js                   service worker
  manifest.webmanifest    PWA manifest
  icons/                  192, 512, maskable 512, apple-touch
  catalog/                index.json + one file per course
  _headers
```

## How the pieces connect

`src/build.js` is the whole build. It reads every source file, concatenates about twenty CSS blocks in a fixed order into one `<style>`, inlines `renderers.js` and `engine.js` as two `<script>` tags, embeds the catalogue *index* (summaries only, no bodies) as `window.STORE_CATALOG`, writes `dist/index.html`, then writes the service worker stamped with a SHA of that HTML, the manifest, and one JSON file per course into `dist/catalog/`.

At runtime the app reads `window.STORE_CATALOG` for the store listing, and fetches `./catalog/<id>.json` only when someone adds that course. So `index.html` stays around 1.3 MB regardless of how many courses exist, and a course you have not added costs nothing.

State lives in `localStorage` under one key, **`courseapp_v1`** — progress, XP, streak, notes, highlights, bookmarks, settings, custom paths. Course *bodies* are too big for localStorage (a single course is up to 800 KB against a ~5 MB origin limit), so they live in IndexedDB (`oboros_courses` / `bodies`, keyed by course id) with a localStorage fallback that warns on quota.

Routing is hash-based, handled by `render()` in engine.js. There is no history API, no server-side routing, and every route change calls `jumpTop()`.

## Supabase

**There is no live Supabase project.** The app ships backend-ready and is currently running in offline mode: `window.COURSEAPP_BACKEND = { url: "", anonKey: "" }` is written into `index.html` by the build, and with those blank the entire accounts/sync layer is inert — no network calls, no sign-in UI, nothing. Everything below is the schema the code *expects* if you ever fill those in. It is documented in full in `docs/SUPABASE-SETUP.md`; this is the shape, so you can reason about the code without opening that file.

### `public.user_state` — one row per learner

| column | type | notes |
|---|---|---|
| `user_id` | `uuid` | primary key, `references auth.users(id) on delete cascade` |
| `data` | `jsonb` | not null, default `'{}'` — the whole sync payload as one blob |
| `updated_at` | `timestamptz` | not null, default `now()` |

RLS **enabled**, three policies, all keyed on `auth.uid() = user_id`:

- `"own state select"` — `for select using (auth.uid() = user_id)`
- `"own state insert"` — `for insert with check (auth.uid() = user_id)`
- `"own state update"` — `for update using (auth.uid() = user_id) with check (auth.uid() = user_id)`

Postgres has no `create policy if not exists`, so the setup SQL drops each policy before creating it. Without those drops a second run fails with `42710` and rolls back the whole script.

### `public.catalog_courses` — the store, if you ever serve it from the database

| column | type | notes |
|---|---|---|
| `id` | `text` | primary key; must equal the `id` inside `data` |
| `title` | `text` | not null |
| `subtitle`, `tagline`, `accent`, `author` | `text` | store-card fields |
| `price` | `numeric` | not null, default `0` |
| `published` | `boolean` | not null, default `false` |
| `data` | `jsonb` | not null — the entire course body |
| `updated_at` | `timestamptz` | not null, default `now()` |

RLS **enabled**, one policy: `"public read published"` — `for select using (published = true)`. Anyone may read published rows; only the dashboard or a service-role key can write. There is no insert/update/delete policy, which is deliberate.

### Relationships

`user_state.user_id` → `auth.users.id`, cascade on delete. That is the only foreign key. `catalog_courses` stands alone — the app joins nothing; a learner's `data` blob carries an `importedIds` array of course ids and re-fetches the bodies.

### What actually crosses the wire

`syncPayload()` in engine.js sends every key of the store **except `imported`**, and replaces it with `importedIds`. Course bodies are never synced — pushing an 800 KB course on every XP tick would be megabytes per save. The other device re-fetches the bodies from the catalogue it can already reach. The payload stays a few KB no matter how large the library.

Merging is in `R.mergeState` (renderers.js): furthest-along wins per field — max for XP and monotonic counters, union for id lists and highlights, longest string for a note, and `assignments` merged rather than replaced (dropping it once wiped every completed assignment on sign-in).

### The trap the code already works around

`supabase-js` **resolves** with `{data, error}` rather than rejecting. Before that was handled, a missing table or a blocking RLS policy looked like success and the app cheerfully reported "up to date" while writing nothing. Both `pullState` and `pushState` now throw on `error`, and `pgErr()` converts Postgres codes into something actionable: `42P01` → "the user_state table is missing", `42501` → "blocked by row-level security", `PGRST301` → "your session expired". If you touch the adapter, keep that.

## Conventions actually in use

**JavaScript.** ES5 style throughout — `var`, `function`, string concatenation, no arrow functions, no template literals, no `const`/`let` in engine.js or renderers.js. This is not nostalgia; the file is served to whatever browser shows up and there is no transpiler in the chain. Test files and build scripts are Node-only and use modern syntax freely.

**HTML is built as strings.** Every renderer returns a string, and the page is assembled by `app.innerHTML = h`. There is no virtual DOM and no templating library. Everything user- or content-supplied goes through `R.esc()`; content that is *meant* to carry markup goes through `R.rich()`.

**One primitive per idea.** There is exactly one progress ring (`snakeRing`), one icon set (the 34 stroke glyphs in `G{}`, reached via `gi('name')`), one row primitive (`.row`), one collapsible section (`collSection`), one card. If you find yourself writing a second version of one of these, that is the bug.

**Design tokens, not values.** Colours, elevations and edges come from CSS custom properties: `--bg --panel --panel2 --panel3 --pill --line --hairline --ink --ink2 --muted --accent --accent-solid --accent-t --accent2 --warn --bad --e1 --e2 --e3 --edge --edge2 --edge3 --sheen --glow --cta --ga --gk --topbarh --tabh`. A literal hex in a rule is almost always a mistake.

**The scale is finite and enforced.** Six type sizes (11.5, 13, 15, 17, 20, 27), four weights (400/600/700/800 with 800 rationed to at most four elements per screen), three radii (10, 14, 20) plus pills, three elevations (`--e1` raised, `--e2` floating, `--e3` overlay), three lit edges (`--edge`, `--edge2`, `--edge3`), four ink tones (`--ink` titles and prose, `--ink2` secondary content that still says something, `--muted` chrome only, plus accents). `tests/test40.js` counts every rendered value across twelve routes and fails if any of those numbers grows. It is not a style guide; it is a test.

**Course JSON.** Blocks use `t` for their type, never `type`. Valid values are listed in `BLOCK_TYPES` in renderers.js. A course's `modules` is an array; a *catalogue summary* carries `modules` as a **number**. Confusing the two is the single most common crash in this codebase — guard with `Array.isArray(c.modules)` before iterating.

**Comments explain the decision, not the mechanics.** The codebase is heavily commented, and the comments say why a thing is the way it is and what broke before. Match that. A comment that restates the code is noise.

**Copy.** Sentence case, no exclamation marks, no emoji anywhere in the interface, em dashes for asides. The app never claims something it has not verified — Settings says "the browser declined" when the browser declined. Tone is plain and slightly dry.

**Tests read like sentences.** Assertions are named as prose: `ok('a toast waits rather than competing', ...)`. Each suite opens with a comment explaining what class of bug it exists to catch.

## Fragile areas

**The CSS assembly order in `src/build.js` is load-bearing.** Around twenty CSS constants are concatenated in one fixed order, and later blocks override earlier ones by source order, not specificity. The order today is:

```
ROW_CSS, style.css, GAM, NOTE, QUIZ, STUDY, BACKEND, MEDIA, GLOSS, ICON,
MOTION, PATHS, RW, TUTOR, DEPTH, SEARCH, READ, CHEER, BENTO, TEXT, BRAND, DESKTOP
```

`TEXT_CSS` is late on purpose — it applies the `--ink2` tone and must win against component defaults. `DEPTH_CSS` sits after `RW_CSS` for the same reason. Move a block and something two screens away changes colour. Any rule defined in more than one block will be decided by this list.

**`dist/catalog/` is generated output.** `build.js` deletes every `catalog/*.json` and regenerates them from `src/data/store-courses.json` on every build. Editing a file in `dist/catalog/` accomplishes nothing — the change is silently gone on the next build. Edit `store-courses.json`. This has cost real time more than once.

**Mechanical CSS edits need a brace check afterwards.** A script that rewrote CSS by string replacement once produced `.navitem{transition:bac.trow{...}` — two rules spliced together — which killed the desktop contents rail. It was caught by a test rather than by eye. After any programmatic edit to a CSS block, verify brace balance across the assembled `<style>`.

**`localStorage` key `courseapp_v1`.** Never rename it, never change the shape without a migration in `load()`. Renaming it wipes every existing learner's progress, streak and notes with no warning and no recovery.

**Ring and glyph CSS must use the child combinator.** `.snkring svg` leaks into nested SVGs — the glyph inside a ring inherits the ring's animation and transform, which is what produced an 11px offset on every quest icon. Write `.snkring > svg`.

**The figure viewer clones artwork, not the frame.** `.figsvg` has `max-width:560px` and `height:auto`; letting those into the full-screen viewer breaks the fit. The viewer draws its own frame and inflates natural height by `FVPAD`. The `--fig` custom property must be carried across explicitly via `getComputedStyle`, or figures lose their accent inside the viewer.

**Locked modules hide most of the content from tests.** Any suite that sweeps every lesson must seed `passed` for all modules first, or it silently tests module 1 and reports success. One clipping sweep reported 1 problem where there were 13.

**Quiz option text collides across the catalogue.** Matching an answer by its visible text finds `No` and `Yes` in a dozen courses. Use `window.OB.revCard()` or an explicit index.

**`scroll-behavior: smooth` applies to route changes.** `jumpTop()` forces `scroll-behavior:auto`, reflows, scrolls, then restores it on the next frame. Without the forced reflow the browser animates a 4000px scroll on every navigation. Do not "simplify" it.

**Two class-name collisions have already happened** (`.bsub` for a badge subheading and a bento subtitle; `.grp .stbtn` overriding a shared button size). New class names go in the block that owns the component, and the name should carry the component prefix.

## Running it locally

```sh
npm install                 # playwright + wrangler; also: npx playwright install chromium
npm run build               # writes dist/
npm run serve               # http://localhost:8787 — needed for SW, manifest, install
npm test                    # all 31 suites, ~990 checks, 15–25 minutes
npm test 40 42              # just those suites
npm run audit               # contrast, tap targets, line length, overflow — mobile + desktop
npm run lint                # validate every course in dist/catalog
npm run check               # build + lint + test + audit, i.e. what CI does
```

`dist/index.html` opened directly from disk (`file://`) is a complete working app — that is the point of the project — but the service worker, the manifest, install and `navigator.storage.persist()` all need an origin, so use `npm run serve` when touching any of those.

`npx playwright install chromium` and the suites find their own browser — they launch with `executablePath: process.env.CHROMIUM_PATH || undefined`, so Playwright resolves it. That path used to be hardcoded to `/opt/pw-browsers/chromium` in all 32 files, which made a fresh clone fail at the first `chromium.launch` on any other machine.

Set `CHROMIUM_PATH` when you want a specific binary instead. You need it in this container: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` holds a Chromium older than the pinned Playwright expects, so leaving the variable unset sends it looking for a build that is not there. `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test` is the working incantation here; CI installs a matching build and needs nothing.

## How it deploys

Push to `main`. The GitHub Action builds `dist/` from source, runs the linter, the full suite and both audits, and only then runs `wrangler deploy`, which uploads `dist/` to the Cloudflare Worker named in `wrangler.toml`. Nothing generated is committed.

Two things must be true or the deploy goes somewhere harmless and confusing:

- `name` in `wrangler.toml` must **exactly** match the existing Worker's name in the Cloudflare dashboard. A mismatch creates a second Worker and oboros.app keeps serving the old build.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` must exist as GitHub repository secrets. The token needs the *Edit Cloudflare Workers* template.

`sw.js` must sit at the root of what is deployed. A service worker only controls pages at or below its own path, so moving it into a subfolder silently disables offline mode without any error.

The service worker is network-first for the shell and stale-while-revalidate for the catalogue, and its cache name carries a SHA of the built HTML — so every deploy invalidates the old precache instead of stranding people on a stale build.
