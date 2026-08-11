# Deploying Oboros → oboros.app

## What's in this folder

```
index.html          the app (~960 KB — no course content inside)
sw.js               service worker — MUST sit at the root, next to index.html
catalog/
  index.json        the list the Store reads
  <course-id>.json  one file per course, fetched only when someone adds it
_headers            caching + security headers
wrangler.toml       Worker config — rename `name` to match your Worker exactly
SUPABASE-SETUP.md   accounts + cross-device sync reference
```

**Keep this structure.** `index.html` and the `catalog/` folder must sit at the same level, because the app fetches `./catalog/index.json` relative to itself.

## What changed in this build

Two things, on top of the previous desktop release.

The **Survival specialization** is now wired in — an eight-course track covering wilderness,
maritime and castaway, and long-term infrastructure collapse. None of the courses are
generated yet, so all eight show as "Coming soon" on the specialization page. They flip to
"In the Store" on their own as each course JSON lands in `catalog/`.

A track can now carry a `courseTitles` map, so a course that hasn't been written yet shows
its real title instead of a prettified version of its id.

## Deploying (Git — your current setup)

This time `index.html`, `_headers` and the **new `sw.js`** all need to go up. `sw.js` must sit at the repo root — a service worker only controls pages at or below its own path, so a subfolder silently does nothing. Commit it (plus anything new under `catalog/`) to the repo root and push; Cloudflare rebuilds automatically.

`wrangler.toml` publishes everything in the directory, so the catalog folder goes up alongside the app. The `name` field must match your Worker's name exactly or the deploy creates a second Worker.

## Adding a survival course (or any course)

1. Generate the course JSON — for survival, use `SURVIVAL-TRACK-PROMPT.md`; for anything else, `UNIVERSAL-TRACK-PROMPT.md`.
2. Save it as `catalog/<course-id>.json`. For the survival track the ids are fixed: `surv-1-physiology`, `surv-2-core-craft`, `surv-3-medicine`, `surv-4-navigation`, `surv-5-food`, `surv-6-environments`, `surv-7-sea`, `surv-8-collapse`.
3. Add a summary entry to `catalog/index.json`:

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

4. Commit and push. It appears in the Store immediately — no app rebuild — and the specialization page updates itself.

To **update** a course, replace its JSON file. Learners who already added it keep their copy until they remove and re-add it; their progress is stored separately and survives either way.

To **remove** a course from the store, delete its entry from `index.json` (leave the file, or delete both).

## Moving the catalogue to Supabase later (optional)

Nothing here needs a database. But if you ever want the catalogue managed from a dashboard instead of Git, upload the same course JSON into the `catalog_courses` table (see `SUPABASE-SETUP.md`) — the app prefers the Supabase catalogue automatically when one is configured, and the static files become the fallback.

## Notes

- **Opening `index.html` straight from your downloads** shows the app but an empty Store — browsers block file-to-file fetches. That's expected; it works as soon as it's served over HTTP.
- **Hash routing** means no `_redirects` file is needed.
- **Accounts**: Supabase keys are already baked into the config block; make sure `https://oboros.app` is set as the Site URL in Supabase (see `SUPABASE-SETUP.md`).
