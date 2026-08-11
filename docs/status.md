# Status

Written at the point development moved into Claude Code. Numbers here are measured, not estimated — every count came from running the thing.

---

## Finished

**The app.** Six courses, 54 modules, 171 lessons, 1,584 content blocks, 222 knowledge checks — every lesson has at least one. 245 daily warm-up questions. Six specializations defined.

**Content pipeline.** `src/data/store-courses.json` is the single source of truth; the build derives `dist/catalog/` and the store index from it, and `lint-course.js` validates every course against the same rules the in-app importer uses.

**Reading and study.** Lessons with sixteen block types, figures with a full-screen viewer that rotates with the phone, bookmarks, per-lesson notes, text highlighting, a per-course glossary with an A–Z rail, flashcards, a matching game, practice tests, module quizzes at 80% to pass, a final exam, a certificate, and a transcript with credits and a GPA.

**Progress and habit.** XP with a daily goal, streaks with earnable freezes, daily quests, spaced repetition with a review queue, badges, milestones, and a rewards page.

**Learner control.** Any module can be taken on its own, and modules from any courses can be assembled into named paths with their own progress and ordering.

**Optional tutor.** Uses the learner's own API key, stored on the device, stated plainly in Settings. Absent entirely when no key is set; says so plainly when offline.

**Offline and installable.** Service worker (network-first shell, stale-while-revalidate catalogue, cache keyed to a SHA of the build), IndexedDB for course bodies, a web app manifest, four PWA icons rasterised from the vector mark including a maskable one, iOS meta, per-theme theme-colour, and `navigator.storage.persist()` requested at boot with the true answer reported in Settings.

**Search and time.** In-course search over lesson titles, headings, prose, tables, figure captions and glossary terms, grouped by lesson with the match highlighted, reachable from the course home, from every lesson's study bar and from the desktop rail. Per-lesson read time computed from the lesson's own words.

**Design system.** Six type sizes, four weights, three radii plus pills, three elevations, three lit edges, four ink tones, one icon set, one progress ring, one accent per page, mark-generated course covers, a focal home layout, and three celebration moments. Enforced by `tests/test40.js` rather than by discipline.

**Verification.** 31 Playwright suites and two audits. Both audits sit at zero issues across twelve routes, both themes, four viewport widths — contrast, tap targets, text size, overflow and line length.

---

## Half-built

### The repo migration (this session, incomplete)

Development happened in a flat working directory; this repo is the tidied form of it — sources under `src/`, suites under `tests/`, generated output in `dist/`. The build and 29 of 31 suites were verified in the new layout: **937 checks pass**. Two suites do not run, for path reasons only, and are described under Known bugs. In the flat layout the same code scored 989 across all 31 — 937 + 12 + 40 accounts for every check, so nothing has been lost, only two files left pointing at the old shape.

### CI and deploy wiring (not written yet)

`package.json` exists with `build`, `lint`, `test`, `audit`, `check`, `serve` and `deploy` scripts, and `scripts/` holds the runner, the static copier and a local server. Still missing:

- `wrangler.toml` at the repo root with `name` matching the existing Worker exactly and `[assets] directory = "./dist"`.
- `.github/workflows/deploy.yml` — build → lint → test → audit → `wrangler deploy` on `main`, the same run without deploying on pull requests.
- `.gitignore` for `dist/` and `node_modules/`.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets.
- The old `.github/workflows/catalog.yml` from the deployed repo is now **obsolete and would fight the build** — it regenerates `catalog/index.json` and commits it, but the catalogue is generated output now. Do not carry it over.

### Specializations, mostly unwritten

| Track | Courses defined | Written | Showing "coming soon" |
|---|---|---|---|
| Software & Web Engineering | 1 | 1 | 0 |
| Markets & Money | 3 | 3 | 0 |
| Communication & Influence | 1 | 1 | 0 |
| Directing & Cinematography | 5 | 0 | 5 |
| Audio Engineering | 5 | 1 | 4 |
| Survival | 8 | 0 | 8 |

Eighteen course slots have a title, an id and a place in a track, and no content. They render honestly as "coming soon" and flip to "in the Store" on their own when a course with that id lands. `docs/SURVIVAL-TRACK-PROMPT.md` and `docs/UNIVERSAL-TRACK-PROMPT.md` are the generation prompts.

### Accounts and sync

Fully implemented in the client — sign-in, Google OAuth, pull/push, conflict merge, error surfacing, retry with backoff — and **never once run against a real database**. There is no Supabase project. The schema in `CLAUDE.md` and the setup steps in `docs/SUPABASE-SETUP.md` describe what the code expects. Treat this whole layer as untested until someone provisions a project and signs in twice on two devices.

### The certificate

Deliberately unresolved. You deferred deciding what it is *for*, and that decision is upstream of the credits-and-hours problem below.

---

## Known bugs

### 1. `test23.js` has been testing a fossil (12 checks)

**What:** the suite served a stale directory containing a build from several versions ago. It passed continuously while asserting things that stopped being true — that the store shows five courses (there are six), and using selectors `.storetitle` and `.storebtn` that the store hierarchy rework replaced. Its first assertion, `STORE_CATALOG.every(c => !c.modules)`, is also now wrong on its own terms: summaries legitimately carry `modules` as a *count*, so `!9` is `false`.

**Repro:** `node tests/test23.js` → three failures, then a 30-second timeout waiting for `.storebtn[data-getcourse="audio-1-acoustics"]`.

**Fix:** re-point the three assertions at the current markup and derive the expected count from `dist/catalog/` rather than hardcoding it. Do not delete the suite — what it checks (that the store fetches the catalogue over HTTP rather than reading the inlined index, and that downloading stores the full body) is not covered anywhere else.

**Lesson worth keeping:** a suite pointed at anything other than the artifact that ships will pass forever and protect nothing.

### 2. `test28.js` cannot resolve `renderers.js` (40 checks)

**What:** it does `require('./renderers.js')`, which was correct in the flat layout and is not now.

**Repro:** `node tests/test28.js` → `MODULE_NOT_FOUND`.

**Fix:** one line — `require('../src/renderers.js')`. `test-merge.js` already has this change; `test28.js` was missed.

### 3. Every suite hardcodes a Chromium path

**What:** all 32 test files launch with `executablePath: '/opt/pw-browsers/chromium'`, which is this build environment's system Chromium.

**Repro:** run any suite on a machine without that path → launch fails immediately.

**Fix:** read it from an env var with a fallback, e.g. `executablePath: process.env.CHROMIUM_PATH || undefined`, letting Playwright use its own download when unset. This is the single thing most likely to make the handoff feel broken on first run.

### 4. Study hours are not supported by the content

**What:** each course claims 37–48 hours. Actual reading time, measured from the words, is 1.2–4 hours. The ratio runs 11× to 37×.

| Course | Reading | Stated | Ratio |
|---|---|---|---|
| app-builder | 2.6 h | 47 h | 19× |
| audio-1-acoustics | 4.0 h | 45 h | 11× |
| everyday-negotiation | 1.2 h | 43 h | 37× |
| mkt-2-statements | 3.0 h | 41 h | 14× |
| personal-finance | 1.3 h | 37 h | 28× |
| stock-charts | 2.1 h | 41 h | 19× |

Hours come from a guess of 1.15 hours per lesson, and hours drive credits, which drive the transcript and the certificate. "The rest is exercises" is not a defence: only 13 of 171 lessons carry an assignment.

**Not a crash — a claim the app cannot support.** Both numbers are now visible in the interface, though never joined by a sentence connecting them, which is the most honest thing available short of deciding. Resolving it means deciding what the certificate attests to.

### 5. `manifest.webmanifest` sets `"id": "/"`

Correct while the app is served from the origin root, which it is. It would silently split the install identity if the app were ever served from a subpath. Worth knowing before anyone hosts a staging copy under a path.

---

## The next five things, in order

**1. Make the repo run on a machine that is not this one.** Fix the two path bugs (#1, #2) and the hardcoded Chromium path (#3), then run `npm run check` end to end and confirm 989. Nothing else matters until a clean clone builds, tests and audits green. Half a day.

**2. Write the deploy wiring and prove it.** `wrangler.toml`, `.github/workflows/deploy.yml`, `.gitignore`, the two GitHub secrets. Verify by pushing a trivial visible change and watching it reach oboros.app. Confirm `name` matches the existing Worker before the first run — a mismatch creates a second Worker and oboros.app keeps serving the old build with no error anywhere. Do not carry over the old `catalog.yml`.

**3. Decide what the certificate is for, then fix hours and credits.** This is one decision with three dependent numbers (hours → credits → GPA → certificate). The options are roughly: make hours honest and accept that a course is worth a fraction of a credit; keep hours as a study estimate and add the practice that would justify them; or drop the academic framing and let the certificate attest to completion rather than to hours. Everything in #4 is easier once this is settled.

**4. Write the eighteen missing courses, or cut the tracks that have none.** Two specializations are entirely empty and one is 20% written. "Coming soon" is honest but a Survival track with eight placeholders reads as abandonment. Either generate them from the existing prompts or reduce the tracks to what exists.

**5. Provision Supabase and actually test sync.** The whole accounts layer has never met a database. At minimum: run the setup SQL, fill in the two config values, sign in on two devices, verify the merge does not lose progress, and verify the error paths — drop the table and confirm the app says "the user_state table is missing" rather than "up to date."

---

## Things worth knowing that aren't bugs

- A full `npm run check` takes 15–25 minutes. `npm test 40 42` runs individual suites.
- `dist/` can be deleted at any time; nothing in it is authored.
- The app is usable straight from `file://`, which is the fastest way to eyeball a change — but the service worker, the manifest, install and persistent storage all need `npm run serve`.
- `src/data/courses.json` is an empty array on purpose: no course is bundled into the library, everything is added deliberately from the store.
