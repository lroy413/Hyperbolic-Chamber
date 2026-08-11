# Publishing courses to the store

## The workflow, now

**Commit one JSON file. That's it.**

```
catalog/surv-1-physiology.json   ← you add this
catalog/index.json               ← rebuilt for you, automatically
```

A GitHub Action validates the course and regenerates `catalog/index.json` on every push. Cloudflare redeploys. The course appears in the store within a minute, and any specialization that lists it flips that row from "Coming soon" to "In the Store" on its own.

You no longer hand-edit `index.json`. That was the fragile part — a hand-maintained index drifts out of sync with the files, and a single misplaced comma takes down the whole store.

---

## What's in the repo now

| File | What it does |
|---|---|
| `lint-course.js` | Validates course JSON. Errors block publishing; warnings advise. |
| `make-catalog.js` | Regenerates `catalog/index.json` from the course files. |
| `.github/workflows/catalog.yml` | Runs both on every push and commits the rebuilt index. |

Both scripts share their rule set with the app itself (`R.lintCourse` in `renderers.js`), so what the linter accepts is exactly what the app accepts. One source of truth.

## Step by step

1. **Generate the course.** Use `SURVIVAL-TRACK-PROMPT.md` for survival, `UNIVERSAL-TRACK-PROMPT.md` for anything else.
2. **Check it** before committing. Two ways:
   - In the app: **Course Library → Add a course**, paste the JSON, press **Check only**. You get the errors listed by module and question number, and nothing is installed. Works on a phone.
   - On a computer: `node lint-course.js path/to/course.json`
3. **Save it** as `catalog/<course-id>.json`. The filename must match the `id` inside the file — that's how the store fetches it.
4. **Commit and push.** The Action does the rest.

If the Action fails, the course does not go live and you get the reason in the run log. That's the point: a broken course never reaches anyone.

### Doing it from a phone

GitHub's mobile site can upload files: repo → `catalog` → Add file → Upload files. Paste-checking in the app first is worth the extra minute, because a failed Action is slower to diagnose on a phone than a red panel in front of you.

---

## What the validator catches

These are the things that install fine but break for real learners:

- An `answer` index pointing past the end of `options` — the question becomes unanswerable
- Negative or fractional answer indices
- `answers` outside range on a select-all question
- Fewer than two options
- `pick` larger than the question pool — the quiz throws
- `pass` written as `80` instead of `0.8` — nobody ever passes
- `numeric` answers given as strings
- `order` with one item, `match` with a malformed pair
- `text` with no accepted answers
- A `case` set with no sub-questions, or a broken question inside one
- Lessons with no blocks, blocks with no type, image blocks with neither `svg` nor `src`
- Modules with no lessons or no quiz, a course with no final exam
- Malformed glossary entries
- Duplicate ids across the catalogue
- A filename that doesn't match the id

And it warns about things that are legal but weak: no `why` array on graded questions, no `explain`, a missing `tolerance` on a numeric, a non-hex accent, a missing category, an id that isn't kebab-case, a course large enough to be slow on mobile data.

Inline knowledge checks are deliberately held to a lower standard than graded questions — they show one explanation rather than per-distractor feedback, so they aren't nagged about `why`.

Running it against the five courses currently shipping: **zero errors.** The warnings are all about missing `why` arrays on the older courses, which is a quality note, not a defect.

---

## Setting up the Action

Copy `.github/workflows/catalog.yml` into your repo at that exact path. One repo setting needs changing so it can commit the rebuilt index:

**Settings → Actions → General → Workflow permissions → Read and write permissions.**

Without that, the validation still runs but the index rebuild can't be pushed back, and you'll see a permissions error on the commit step.

---

## Course ids for the survival track

Fixed, so the specialization page picks them up automatically:

```
surv-1-physiology     surv-5-food
surv-2-core-craft     surv-6-environments
surv-3-medicine       surv-7-sea
surv-4-navigation     surv-8-collapse
```

---

## Answering "for anyone who uses it"

Worth being clear about who sees what.

**Everyone sees the same store.** `catalog/index.json` is a public file; every visitor gets the same list. There's no per-user catalogue and no gating.

**A course is only "theirs" once they add it.** Adding downloads the full course to their device, where it works offline forever. Their progress is theirs alone — stored locally, and synced to their own Supabase row if they're signed in.

**Updating a course doesn't disturb anyone.** Replace the JSON and push. People who already added it keep the copy on their device until they remove and re-add it, and their progress survives either way because progress is stored separately, keyed by course and module id. That means you can fix a typo without resetting anyone's certificate — but it also means a substantive rewrite won't reach existing learners automatically. For a real revision, bump to a new id.

**Removing a course** from `index.json` takes it out of the store. Anyone who already has it keeps it.

**Cost:** the whole store is static files on Cloudflare. Courses are cached for a day, the index isn't cached at all, so updates appear immediately while course bodies are cheap to serve. Supabase only ever stores progress — roughly a kilobyte per person — so a large catalogue costs nothing extra there.
