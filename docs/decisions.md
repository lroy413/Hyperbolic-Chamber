# Decisions

Every real fork in this project, what was chosen, and what was rejected. Newest sections are not necessarily last — this is grouped by area, because that is how you will look things up.

---

## Architecture

### One self-contained HTML file

**Chosen:** the app ships as a single `index.html` with all CSS and JS inlined, buildable to a file you can email to someone and open from a USB stick.

**Rejected:** a framework (React/Svelte) with a bundler. The app's defining property is that it works with no network, no install, no account and no server. A framework adds a build-time dependency graph and a runtime that has to be downloaded, for a UI that is a few dozen screens of strings. There is no state complexity here that a framework would solve.

**Consequence you have to live with:** no components, no reactivity, no type checking. The discipline that replaces them is the primitive rule (one ring, one icon set, one row) and the test suite.

### Course bodies live outside the HTML

**Chosen:** the built HTML embeds only the catalogue *index* — the store summaries. Each course body is a separate JSON file fetched on demand and then kept locally forever.

**Rejected:** embedding all courses. Six courses are ~2 MB of JSON; the HTML would be 4 MB and would grow with the catalogue, so every visitor would download every course they will never take.

**Consequence:** a catalogue summary and a full course are *different shapes*, and the app has to handle both. See the `modules`-is-a-number trap in CLAUDE.md.

**Chosen since:** every test for "is this a whole course" is `Array.isArray(c.modules) && c.modules.length`, never `c.modules`. The truthiness form was correct while summaries had no such field, and went silently wrong the day summaries gained a module *count* — `9` is truthy, so `migrateLibrary` restored bodyless summaries into people's libraries and then suppressed the re-fetch that would have healed them. **Rejected:** renaming the count field on summaries to something like `moduleCount` so the two shapes could never collide. It is the cleaner fix and it is a breaking change to the catalogue format, every persisted body and every store card at once, to buy what one correct predicate already buys. Revisit if the shapes collide a third time.

### IndexedDB for bodies, localStorage for state

**Chosen:** course bodies in IndexedDB (`oboros_courses`/`bodies`), everything small and frequently written in localStorage under `courseapp_v1`.

**Why:** localStorage is about 5 MB per origin and one course can be 800 KB. The original code kept everything in localStorage, where `setItem` threw on quota and the exception was swallowed — a real library would have silently stopped saving progress.

**Rejected:** all-IndexedDB. Progress is written on nearly every interaction and localStorage is synchronous and trivial; making the hot path async for no benefit is a poor trade.

**Fallback kept:** if IndexedDB is unavailable, the old behaviour returns, but quota now warns instead of failing silently.

### The backend is optional and inert by default

**Chosen:** `window.COURSEAPP_BACKEND = {url:"", anonKey:""}` ships blank. With it blank, no sign-in UI exists, no script is loaded, and the app never touches the network after first load. Filling in two values switches on accounts, cross-device sync and a database-served store.

**Rejected:** requiring an account. The product promise is that your progress is yours and works on a plane.

### Sync sends state, never course bodies

**Chosen:** `syncPayload()` sends everything except `imported`, substituting an `importedIds` array. The other device re-fetches bodies from the catalogue.

**Why:** pushing the library on every XP tick would be megabytes per save. The payload is a few kilobytes regardless of library size.

### `supabase-js` errors must be converted to rejections

**Chosen:** `pullState`/`pushState` inspect `{data, error}` and throw. `pgErr()` maps Postgres codes to human sentences.

**Why:** supabase-js *resolves* on failure. A missing table or a blocking RLS policy therefore looked like success, and the app reported "up to date" while writing nothing. This is the worst class of bug this project has had — silent, and it looked like everything was fine.

### Hash routing, no history API

**Chosen:** `#c/<course>/<page>` style hashes, one `render()` switch.

**Why:** the app must work from `file://`, where path-based routing does not exist.

### The catalogue index has exactly one owner

**Chosen:** `make-catalog.js` derives `catalog/index.json` from the course files. Nothing hand-edits it, and the build calls the same script the CI does.

**Rejected:** maintaining `index.json` by hand. A hand-kept index drifting out of sync with the files is the classic way to break a store — a course listed but missing, or present but unlisted.

### Service worker: network-first shell, stale-while-revalidate catalogue

**Chosen:** the shell tries the network and falls back to cache, so a deploy lands the moment you are online. The cache name carries a SHA of the built HTML, so every deploy invalidates the old precache.

**Rejected:** cache-first for the shell. It is faster, and it strands people on an old build until something explicitly clears the cache — which for a self-contained app can mean forever.

---

## The course model

### Blocks use `t`, not `type`

Historical, and now load-bearing across ~1,584 blocks in six courses. Not worth a migration; worth remembering, because every crash of the form "renderer did nothing" traces back to someone writing `type`.

### Credits are derived from hours, not one per module

**Chosen:** `moduleCredits(m) = moduleHours(m) / 10`, and `moduleHours` is derived from the module's own lesson count when not authored.

**Rejected:** the original one-credit-per-module. The transcript states "one credit for every ten hours of coursework" and then awarded a 38-hour course nine credits instead of 3.8. The app contradicted its own stated rule on the same screen.

**Still open:** the hours figure itself is a guess of 1.15 hours per lesson and is not supported by the content. See `status.md`.

### Modules can be taken on their own, and strung into paths

**Chosen:** any module can be opened individually ("take this module on its own"), and modules from any courses can be assembled into a named path with its own progress and ordering.

**Rejected (explicitly, by you):** a path as a filter or a view over existing progress. You asked for "a saved path with its own progress."

**Consequence:** locked content is never hidden, only locked — including in search results, which show the match and offer the module-on-its-own route rather than pretending the passage does not exist.

### The tutor uses the learner's own key

**Chosen (explicitly, by you):** "Your key, stored on device." The key lives in this device's localStorage in the clear, and Settings says so in those words rather than glossing it.

**Rejected:** a proxy service. It would mean running a server, holding someone else's key, and breaking the offline promise.

**Design constraint:** with no key stored there is no button. The feature is built to be *absent* rather than broken, and offline it says so plainly instead of failing.

---

## Design

The full argument is in `VISUAL-DIRECTION.md`; these are the decisions that came out of it, all of which are now implemented.

### The general rule

**A container may hold cards, or be a card, but not both.** Nesting a card inside a card of the same weight destroys the reading order. This was the actual cause of "the quests look bigger than the Today's Quests card" — a section header was a full card sitting above items that were also full cards, at the same width, outside it.

### The scale is finite, and enforced by a test

Six type sizes, four weights, three radii plus pills, three elevations, three lit edges, four ink tones. **Rejected:** treating this as a style guide. Style guides drift one reasonable exception at a time and no per-screen review catches it, because the eighteenth font size looks fine on the screen that introduced it. `tests/test40.js` counts every rendered value across twelve routes and fails when a number grows.

Before this: 18 type sizes, 13 radii, 11 shadows, weight 800 on 295 elements against weight 400 on 148, and the muted grey on 482 text elements against primary ink on 210.

### The lit edge has three strengths

Seven hand-picked white-inset opacities (.05 through .24) were consolidated into `--edge`, `--edge2`, `--edge3` with a stated meaning: plain surface, filled disc, accent-filled.

### One accent per page

Each course carries an accent, set once on the page wrapper as `--ga`, with a contrast-safe solid derived from it (`solidOf()` darkens until it reaches 4.5:1 against white). Everything on the page — cover, ring, button — reads from that one place rather than three.

### The mark generates the cover art

Course covers were deterministic gradient rectangles, so a library was a wall of coloured slabs. They are now a seeded coil drawn from the ouroboros mark — same `hashStr` seed, different drawing. **Rejected:** stock imagery or per-course illustration. Neither survives a growing catalogue.

### Three celebration moments, and no more

Closing the day's ring, completing a quest, passing a module. Each is one ring drawing itself shut behind a sentence, gone in under two seconds, never able to eat a tap, announced once politely to a screen reader.

**Rejected:** confetti, sound, streak-loss guilt mechanics, and anything that fires more often than these three. **Also decided:** a toast underneath a celebration is clutter, so a toast fired during one waits its turn, and a toast already on screen is postponed and re-shown rather than lost.

### Trends deliberately not chased

- **Neo-brutalism** — wrong register for a study app; it is designed to be *read*, not looked at.
- **Voice-first visuals** — there is no voice surface here.
- **Generative/adaptive UI that rearranges itself** — an app whose selling point is that it is honest and predictable should not move its own furniture.

### No emoji in the interface

Arrows, ticks, chevrons, quotes and middots are typography and are allowed. A pictograph is a picture and does not belong in an app with a drawn icon set. `tests/test37.js` enforces this with an explicit allowlist.

### Reduced motion keeps the words

Under `prefers-reduced-motion` the celebration still says what happened; the ring simply does not draw. The information is never the thing that gets removed.

---

## Copy and tone

- Sentence case. No exclamation marks. Em dashes for asides.
- The app never claims something it has not verified. Settings reports "the browser declined" when the browser declined, and "not supported here" when the API is missing, rather than a cheerful green tick.
- Disclaimers are one line with the full text one tap away — the old layout put a 244px legal notice between the header and the Resume button, so every study session began by scrolling past a disclaimer.
- Reading time is labelled "min read" and is never presented as the same quantity as the module's study hours.

---

## Testing

### Assertions are named as sentences

`ok('a toast waits rather than competing', ...)`. A failing test should read as a description of the broken behaviour, not as a symbol name.

### Suites are organised by the class of bug they catch, not by feature

Each opens with a comment explaining what it exists to prevent. `test40` guards the design system against drift; `test41` proves the app installs and opens with the network cut; `test42` proves read time is measured rather than typed and that search does not index colour codes.

### Both audits must be at zero before anything ships

`audit.js` (mobile, light and dark, twelve routes) and `audit-desktop.js` (three widths) check contrast against WCAG, 44px tap targets, text below 11.5px, horizontal overflow and line length. Zero issues is the bar, not "few issues."

### Tests must exercise the artifact that ships

Learned the hard way — see the `test23` entry in `status.md`. A suite pointed at a stale fixture passes forever and protects nothing.

---

## Deployment (decided this session)

- **The GitHub Action runs `wrangler deploy`.** Rejected: letting Cloudflare's git integration deploy whatever `index.html` is committed, which would mean committing a 1.3 MB generated file and a bot commit on every deploy. Nothing generated is committed now.
- **Source lives in the same repo, under `src/`.** Rejected: a separate private source repo, which costs a cross-repo publish step and two things to keep in sync.
- **The full suite gates deploys on `main`.** Rejected: a fast subset on push with a nightly full run — a regression could sit in production for a day. Accepted cost: 15–25 minutes per deploy.

---

## Standing instructions you gave me

Things to keep doing, and things not to do. These are your words or direct paraphrases, not my inferences.

- **Preserve the localStorage key `courseapp_v1`.** Renaming it wipes every learner's progress.
- **It must work offline as a single file.** This constraint outranks features.
- **Premium look and feel, everywhere.** Applied to every surface, not just the ones being worked on.
- **Test rigorously with Playwright before delivering anything.** Full suite plus both audits.
- **Deliver actual files, not text in chat.**
- **Give honest, critical feedback rather than flattery.** You explicitly asked to be told what a top developer would change about the aesthetics, and to have the app's own numbers used as evidence rather than adjectives.
- **When you reject a direction, keep only the useful part.** You cut short a broad UI/UX audit with "ignore last one except ideas how to improve what we built" — the report was not wanted; the improvements were.
- **Do not decide what the certificate is for.** You deferred it deliberately: "that requires deeper thought." It is upstream of the credits and hours question, so both are on hold together.
- **Documentation-only changes when asked for documentation.** This handoff was written under an explicit instruction not to touch application code.
