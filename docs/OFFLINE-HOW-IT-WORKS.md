# Offline

## The short answer to your question

**Adding a course from the Store already IS the download.** The full course text — every lesson, quiz, glossary and diagram — is written to your device the moment you add it, and it stays there. That part has always worked.

What did **not** work was the app itself. I tested it: with the network off, oboros.app failed to open at all. `ERR_INTERNET_DISCONNECTED`. Your downloaded courses were sitting right there on the device and you couldn't reach them, because the page they live in comes from a server.

So a separate "download for offline" button wouldn't have fixed anything. The fix was to make the app itself installable. That's done.

I also found a storage ceiling you were about to hit, which is covered further down.

---

## What works offline now

Open oboros.app once with a connection. From then on, with no connection at all:

- The app opens.
- Every course in your library is fully readable — lessons, diagrams, glossary.
- Quizzes and exams work and grade normally.
- Flashcards, match, practice tests, review — all work.
- XP, streaks, progress and notes all save.
- A small bar appears at the bottom: *Offline — your downloaded courses still work.*

When you reconnect, anything you did syncs up to your account on its own.

The only things that need a connection are the **Store** (browsing courses you haven't added yet) and **signing in** the first time on a new device.

## Adding it to your home screen

On iPhone, open oboros.app in Safari, tap Share, then **Add to Home Screen**. It opens without browser chrome and behaves like an installed app. Android is the same through Chrome's menu. Not required for offline to work — just nicer.

---

## What I changed

### A service worker

`sw.js` now sits next to `index.html`. It keeps a copy of the app shell and serves it when the network is unavailable.

The strategy matters: the shell is **network-first**, so whenever you're online you get the newest deploy immediately, with the cached copy only as a fallback. That means offline support doesn't come at the cost of you seeing stale builds after a push — the problem you had earlier with the app flashing the new version and reverting.

The cache is stamped with a hash of the build, so every deploy invalidates the old one. If a new version activates while you have the app open, you get a toast: *A new version is ready — reload to use it.*

`_headers` now marks `/sw.js` as `no-cache`. Without that, a cached service worker can strand people on an old build indefinitely — it's the classic way to brick a PWA.

### Course text moved to IndexedDB

This one you were going to hit soon. I measured the browser's localStorage ceiling: **about 4.6 MB**. Your current catalogue is 1.45 MB, and the acoustics course alone is 800 KB. Once the eight survival courses land, adding a normal-sized library would have blown past the limit — and the old code caught the resulting error and threw it away, so **progress would have silently stopped saving** with no message at all.

Course bodies now live in IndexedDB, where the quota is measured in hundreds of megabytes. localStorage keeps only lightweight summaries plus the small, frequently-written state — progress, XP, notes, settings.

Measured with two courses in the library: localStorage went from **366 KB to 1 KB**. That number stays flat however many courses you add.

If a browser doesn't support IndexedDB, the app falls back to the old behaviour and now surfaces a real message when it runs out of room instead of failing silently.

**Your existing data migrates automatically** the first time you open the new build. Tested: a library saved in the old format loads, moves its bodies across, keeps progress, XP, assignments and notes, and the course opens normally afterward.

### Storage panel in Settings

Settings now has an **Offline** section showing how many courses are on the device and how much space they take, whether the app itself is saved for offline use, which storage backend is in play, and your current connection state.

---

## Deploying this

`sw.js` is new and **must sit at the repo root**, next to `index.html`. A service worker can only control pages at or below its own path, so putting it in a subfolder silently does nothing.

1. Upload `index.html`, `sw.js` and `_headers` to the repo root.
2. Commit and push.

First load after deploying installs the worker. Offline works from the second load onward — a service worker can't control the page that installed it.

### Checking it worked

On a computer: open oboros.app, then DevTools → Application → Service Workers. You should see one activated and running. Tick "Offline" in that panel and reload — the app should still come up.

On a phone, easier: open oboros.app, add a course, put the phone in airplane mode, then reopen the app. It should open and the course should be readable.

Settings → Offline will also tell you: **App saved for offline use: Yes ✓**.

---

## Testing

Two new test files, run against a real HTTP server with the browser's network genuinely switched off:

`test26` — the service worker registers and takes control; course bodies land in IndexedDB and are *not* duplicated into localStorage; localStorage stays under 80 KB with two courses owned; the app opens with the network off; the interface renders; the library lists downloaded courses; a lesson is fully readable; a quiz works; progress still saves; the offline notice appears; Settings reports correctly; everything survives coming back online. Plus the legacy migration path and the no-IndexedDB fallback.

`test25` — the cross-device sync scenario from the previous round.

**396 checks pass across 15 files.** Both accessibility audits are clean at phone and desktop widths.
