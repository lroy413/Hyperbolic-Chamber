# Status

Written at the point development moved into Claude Code. Numbers here are measured, not estimated — every count came from running the thing.

---

## Finished

**The app.** Six courses, 54 modules, 171 lessons, 1,584 content blocks, 222 knowledge checks — every lesson has at least one. 245 daily warm-up questions. Six specializations defined.

**The repo.** Development happened in a flat working directory; this is the tidied form — sources under `src/`, suites under `tests/`, generated output in `dist/` and not committed. The deployed repo used to hold the built `index.html`, `sw.js` and `catalog/` at its root; those are gone, and the build makes them. They had already drifted, in two ways worth knowing about. The committed `catalog/` held five course files where the source has six — `mkt-2-statements.json` was absent from both the directory and `index.json`, so a written course was not in the store anyone could reach. And the deployed root carried no `manifest.webmanifest` and no `icons/` at all, though `index.html` links to both: install and the PWA icons were 404ing in production. A built `dist/` has all of it, which is the argument for building rather than uploading.

**Content pipeline.** `src/data/store-courses.json` is the single source of truth; the build derives `dist/catalog/` and the store index from it, and `lint-course.js` validates every course against the same rules the in-app importer uses.

**Reading and study.** Lessons with sixteen block types, figures with a full-screen viewer that rotates with the phone, bookmarks, per-lesson notes, text highlighting, a per-course glossary with an A–Z rail, flashcards, a matching game, practice tests, module quizzes at 80% to pass, a final exam, a certificate, and a transcript with credits and a GPA.

**Progress and habit.** XP with a daily goal, streaks with earnable freezes, daily quests, spaced repetition with a review queue, badges, milestones, and a rewards page.

**Learner control.** Any module can be taken on its own, and modules from any courses can be assembled into named paths with their own progress and ordering.

**Optional tutor.** Uses the learner's own API key, stored on the device, stated plainly in Settings. Absent entirely when no key is set; says so plainly when offline.

**Offline and installable.** Service worker (network-first shell, stale-while-revalidate catalogue, cache keyed to a SHA of the build), IndexedDB for course bodies, a web app manifest, four PWA icons rasterised from the vector mark including a maskable one, iOS meta, per-theme theme-colour, and `navigator.storage.persist()` requested at boot with the true answer reported in Settings.

**Search and time.** In-course search over lesson titles, headings, prose, tables, figure captions and glossary terms, grouped by lesson with the match highlighted, reachable from the course home, from every lesson's study bar and from the desktop rail. Per-lesson read time computed from the lesson's own words.

**Design system.** Six type sizes, four weights, three radii plus pills, three elevations, three lit edges, four ink tones, one icon set, one progress ring, one accent per page, mark-generated course covers, a focal home layout, and three celebration moments. Enforced by `tests/test40.js` rather than by discipline.

**Verification.** 31 Playwright suites and two audits — 990 checks, all passing from a clean clone. Both audits sit at zero issues across twelve routes, both themes, four viewport widths — contrast, tap targets, text size, overflow and line length.

---

## Half-built

### CI and deploy wiring (written, never run)

`wrangler.toml`, `.github/workflows/deploy.yml` and `.gitignore` now exist, and `package-lock.json` is committed so CI installs the versions the suites were run against. The workflow is one job: `npm ci` → install Chromium → build → lint → test → audit → `wrangler deploy`, with the deploy step gated on a push to `main` so pull requests get everything except the upload. It is one job rather than two so the artifact that ships is the exact `dist/` the suites just ran against.

**Not yet proven.** No run has happened. Before the first one:

- `CLOUDFLARE_API_TOKEN` (the *Edit Cloudflare Workers* template) and `CLOUDFLARE_ACCOUNT_ID` must exist as GitHub repository secrets. Without them the deploy step fails; everything before it still runs.
- Confirm `name = "oboros"` in `wrangler.toml` matches the existing Worker exactly. A mismatch creates a second Worker and oboros.app keeps serving the old build, with no error anywhere.
- Verify by pushing a trivially visible change and watching it reach oboros.app.

The old `.github/workflows/catalog.yml` from the deployed repo was **not** carried over and must not be: it regenerates `catalog/index.json` and commits it, but the catalogue is generated output now, so it would fight the build.

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

## Fixed since the handoff

**The two suites that would not run.** `test28.js` required `./renderers.js`, correct in the flat layout and not here — now `../src/renderers.js`, 40 checks. `test23.js` had already been re-pointed at `dist/` but still asserted against the pre-rework store: `.storetitle`/`.storebtn` are `.sttitle`/`.stbtn`, and the course count was hardcoded at five, which outlived the fifth course and asserted nothing afterwards — it now reads `dist/catalog/`. Two of its assertions were also still reading course bodies out of `localStorage`, where they have not lived since bodies moved to IndexedDB. 13 checks, one of them new.

*The lesson worth keeping:* a suite pointed at anything other than the artifact that ships will pass forever and protect nothing.

**The hardcoded Chromium path.** All 32 files launched with `executablePath: '/opt/pw-browsers/chromium'`; they now read `process.env.CHROMIUM_PATH || undefined` and let Playwright resolve its own browser when the variable is unset. `src/make-icons.js` had the same line and got the same change.

**A real bug that the fossilised suite was hiding.** Re-pointing `test23` at where course bodies actually live turned its last failure into a genuine one. `migrateLibrary()` restores a course you have progress in by filtering the catalogue with `c && c.modules`. That was a correct test for "this is a whole course" until catalogue summaries started carrying a module *count* — at which point `9` was truthy, and a learner with existing progress got a bodyless summary pushed into their library. Worse, the same pass sets `have[id] = 1`, which suppressed the async re-fetch that would have healed it: the course page rendered a title, a category and nothing to read, permanently. Four sibling call sites had the same trap and were fixed with it — `persistCourses()` (which is how the summary reached the IndexedDB bodies store), the legacy-body check in `hydrateCourses()`, the post-sign-in re-fetch, and the async branch of `migrateLibrary` itself. `staticCatalogGet()` already carried the `Array.isArray` guard and a comment explaining exactly this; it was the one place that got it.

Two further changes fell out of fixing it. `hydrateCourses()` now ignores bodyless rows coming *out* of IndexedDB, so an install poisoned by the older build heals on the next load instead of carrying the empty course forward — `test23` seeds exactly that state and asserts the real course replaces it. And `persistCourses()` now answers "what do I write" and "what do I keep" separately: bodies only for the first, the whole library for the second. Deriving both from the bodies would have deleted courses during the window where `boot()` hits its 900 ms first-paint deadline and calls `migrateLibrary()` before the IndexedDB read has returned — `imported` is still summaries at that moment, and reading it as the keep-list means "the learner removed five courses".

*The lesson worth keeping:* this is the `modules`-array-versus-count trap named in CLAUDE.md, and it did not announce itself as a crash. It made the app quietly claim to have something it did not have.

---

## Known bugs

### 1. Study hours are not supported by the content

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

### 2. `manifest.webmanifest` sets `"id": "/"`

Correct while the app is served from the origin root, which it is. It would silently split the install identity if the app were ever served from a subpath. Worth knowing before anyone hosts a staging copy under a path.

---

## The next four things, in order

**1. Prove the deploy.** The wiring is written; nothing has run it. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, confirm `name = "oboros"` matches the existing Worker in the Cloudflare dashboard, then push a trivially visible change and watch it reach oboros.app. Until that has happened once, the deploy path is untested — and a `name` mismatch fails by silently creating a second Worker rather than by erroring.

**2. Decide what the certificate is for, then fix hours and credits.** This is one decision with three dependent numbers (hours → credits → GPA → certificate). The options are roughly: make hours honest and accept that a course is worth a fraction of a credit; keep hours as a study estimate and add the practice that would justify them; or drop the academic framing and let the certificate attest to completion rather than to hours. Everything in #3 is easier once this is settled.

**3. Write the eighteen missing courses, or cut the tracks that have none.** Two specializations are entirely empty and one is 20% written. "Coming soon" is honest but a Survival track with eight placeholders reads as abandonment. Either generate them from the existing prompts or reduce the tracks to what exists.

**4. Provision Supabase and actually test sync.** The whole accounts layer has never met a database. At minimum: run the setup SQL, fill in the two config values, sign in on two devices, verify the merge does not lose progress, and verify the error paths — drop the table and confirm the app says "the user_state table is missing" rather than "up to date."

---

## Things worth knowing that aren't bugs

- A full `npm run check` takes 15–25 minutes. `npm test 40 42` runs individual suites.
- `dist/` can be deleted at any time; nothing in it is authored.
- The app is usable straight from `file://`, which is the fastest way to eyeball a change — but the service worker, the manifest, install and persistent storage all need `npm run serve`.
- `src/data/courses.json` is an empty array on purpose: no course is bundled into the library, everything is added deliberately from the store.
