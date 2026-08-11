# Building a course, and building out a specialization

This is the process that produced `mkt-2-statements` — *Reading Financial Statements*, the second course in the Markets & Money track. It is written so you can repeat it for any of the courses in `SPECIALIZATIONS-PLAN.md`.

---

## Why a course cannot be written in one pass

A finished Oboros course is 150–350 KB of JSON: nine modules, twenty-seven lessons, four to five hundred content blocks, and well over a hundred assessment questions. Nothing writes that in a single generation without truncating somewhere in module six, and a truncated 300 KB JSON file is miserable to repair — you cannot even parse it to find where it broke.

So the unit of work is **one module**, about 15 KB, and three small scripts staple the modules together.

```
node new-course.js <id> --modules 9 --lessons 3   # scaffold
node course-status.js <id>                        # what is still stubbed
node merge-course.js <id>                         # assemble, lint, write to catalog/
```

`new-course.js` creates `build/<id>/` containing `course.json` (metadata plus the module plan), `m01.json` … `m09.json`, and `final.json`.

`course-status.js` prints one row per module — lessons, blocks, quiz questions, word count — and marks a module as unwritten if it contains the string `TODO` or runs under 1,200 words. That word count is the honest column: a module with three lesson titles and 400 words is a stub wearing a hat.

`merge-course.js` reads the spine and every `m*.json` in order, assembles the course object, runs it through the same linter the app uses (`R.lintCourse` in `renderers.js`), and **refuses to write to `catalog/` if there are errors or if any `TODO` placeholder survives**. That refusal is the point: a broken course can never reach the catalog, and therefore never reaches the GitHub Action or the store.

---

## The thing that made the biggest difference: one worked company

`gen/meridian.js` defines Meridian Tools plc — a full two-year set of financial statements — and *computes* every derived figure rather than stating it. The balance sheet balances because the script checks that it does. The cash flow statement is derived from the movement between the two balance sheets. The PP&E note ties to the depreciation charge and the disposal. The forecast in Module 5 balances to zero because the model builds it that way.

Every lesson then imports that module and interpolates the numbers:

```js
{t:'formula', html:`Net debt = (${p(BS.FY2.debtCurrent)} + ${p(BS.FY2.debtLongTerm)})
   &minus; ${p(BS.FY2.cash)} = <b>$${p(T.FY2.netDebt)}m</b>`}
```

This matters more than it sounds. It means a learner who adds the printed column gets the printed total, in every module, and that a change to one assumption propagates everywhere at once. When the effective tax rate produced `79.344` where the lessons printed `79.3`, one edit to the model fixed the roll-forward, the cash balance, and eleven derived ratios simultaneously.

It also means the whole course teaches one company. Module 2 reads its balance sheet, Module 4 derives its cash flow, Module 6 decomposes its working capital, Module 7 computes its returns, and Module 9 writes a view on it. That continuity is not available if each module invents fresh numbers.

**Write the model before writing the first lesson.** It took about forty minutes and it was the highest-leverage forty minutes in the build.

---

## Writing modules as JavaScript, not JSON

Each module lives in `gen/mNN.js` and ends with `fs.writeFileSync(OUT, JSON.stringify(mod, null, 1))`. Authoring in JS rather than hand-writing JSON buys three things:

Backtick template literals hold HTML containing double quotes with no escaping, which removes an entire category of error. Arithmetic can be computed inline rather than typed, so a quiz answer is `answer: M.T.FY2.netDebt` rather than a number that might drift out of agreement with the lesson. And tables can be generated from the model with a small helper, so a nine-row balance sheet is a loop rather than nine hand-typed rows.

The cost is one extra command (`node gen/m04.js`) before merging. Worth it.

---

## Verify every number

Every module in this course had its arithmetic checked in a separate `node -e` pass before being accepted:

```
OK  gym 500*840*9/12 = 315000 (want 315000)
OK  net debt (40+390)-88 = 342 (want 342)
BAD ROIC 180*.78/840 = 16.714 (want 16.42)   ← caught and fixed
```

Two real errors were caught this way — a return-on-invested-capital answer that had been divided by the wrong denominator, and a gain on disposal that did not reconcile with the PP&E note. Both would have shipped and both would have been quoted back at you by a learner. **A course that teaches financial analysis and gets its own arithmetic wrong is worse than no course.**

---

## The shape that worked

For a 40-hour collegiate course:

| | Target | This course |
|---|---|---|
| Modules | 9 | 9 |
| Lessons per module | 3 | 3 |
| Blocks per lesson | 12–20 | 17 average |
| Words per module | 4,000–5,500 | 4,600 average |
| Quiz questions per module | 8–10 | 10 |
| Final exam pool | 40+, draw 20 | 43 items, 47 graded, draw 20 |
| Total | | 41,000 words, 137 questions, 313 KB |

Every module quiz mixes types — multiple choice with a `why` array explaining each wrong option, multi-select, numeric with tolerance, match, order, and one long-form question with a model answer to self-grade against. The `why` arrays are the difference between a quiz and a teaching instrument; the linter warns when they are missing, and it should.

The final exam includes one multi-part `case` question, which is the format that most resembles what the skill is actually for.

---

## Checklist for the next course

1. **Design the module list first**, in `build/<id>/course.json`, and sanity-check the sequence for dependency rather than topic popularity.
2. **Build the worked example** — a company, a dataset, a piece of equipment, whatever the subject needs — as a script that computes rather than states.
3. **Write modules one at a time.** Run `node course-status.js <id>` between each to see the shape of what remains.
4. **Verify the arithmetic** of every module before moving on.
5. **`node merge-course.js <id>`** — it will refuse to write if anything is wrong.
6. **`node lint-course.js catalog/<id>.json`** to confirm clean.
7. **Add to `store-courses.json`** in track order, add the id to the track's `courseIds` in `tracks.json`, and refresh the track's `about` and `outcomes` to reflect the new sequence.
8. **`node build13.js`**, then the test suite and both audits.
9. **Screenshot the course landing page, one lesson and the track page** at phone and desktop widths, in both themes.

Steps 7 through 9 took about fifteen minutes. Steps 2 through 4 are the work.

---

## Where Markets stands now

| # | Course | Status |
|---|---|---|
| 1 | `personal-finance` — Personal Finance: A Quantitative Foundation | **built**, 9 modules |
| 2 | `mkt-2-statements` — Reading Financial Statements | **built**, 9 modules, 27 lessons, 137 questions |
| 3 | `stock-charts` — Reading Stock Charts | **built**, 9 modules |
| 4 | `mkt-4-valuation` — Valuation & Company Analysis | next |
| 5 | `mkt-5-portfolio` — Portfolio Construction & Risk | |
| 6 | `mkt-6-derivatives` — Options & Derivatives | |
| 7 | `mkt-7-macro` — Macro for Investors | |
| 8 | `mkt-8-behaviour` — Behavioural Finance & Decision Errors | |

Three of eight, and the three that exist now form a coherent sequence: your own money, a company's money, a market's money. Valuation is the natural fourth, because Module 9 of this course deliberately stops short of it — it establishes what a business *is* and explicitly declines to say what it is *worth*, which is the handoff that course would pick up.

The Meridian model in `gen/meridian.js` should be reused for valuation. A learner who has spent forty hours reading Meridian's accounts and is then asked to value the same company gets a genuinely rare thing: continuity across the seam where most finance education breaks.
