# The rest of the app, measured the same way

Sixteen screens at 393×852, dark theme, with three courses owned and a realistic profile. Same metrics that diagnosed the library.

**Bias disclosure:** I built all of it. The praise is worth less than the criticism.

---

## What the design-system work fixed everywhere

The library changes were mostly token changes, so they landed across all sixteen screens at once.

| | Before | After |
|---|---|---|
| Surface ladder, base → top | 1.298:1 | **1.619:1** |
| Distinct font sizes, worst screen | 13 | **6** |
| Distinct corner radii, worst screen | 6 | **2** (plus `50%` for rings) |
| Card outlines doing the separating | 125 hairlines | moved to a near-invisible `--hairline`; luminance and shadow separate now |
| Controls under 44px | 40 across the app | **0** |
| Images | 0 | generated covers on every specialization |

Three of those were not on the plan and turned up in the measurement:

**`button` does not inherit type.** Any button without an explicit `font-size` was rendering at the UA default 13.33px in Arial — off the type scale and off the typeface. It had been that way from the start.

**The `--pill` and `--line` tokens were doing two jobs.** Card outlines and content dividers shared one colour, so softening the outlines would have erased the dividers. They are separate tokens now.

**Ten module-lookup sites assumed a course body was loaded.** Catalogue summaries now carry a module *count* where whole courses carry an *array*, and several places tested `if (c.modules)` — truthy for both. That produced an intermittent `reading 'lessons'` crash the audit caught only about one run in three. All guarded; six consecutive clean audits since.

---

## Where every screen now stands

| Screen | Screens | Panels | Nest | Types | Padding | First control at |
|---|---|---|---|---|---|---|
| Home | 2.25 | 29 | 2 | 5 | 14.6% | 77px |
| Library | 2.04 | 20 | 3 | 6 | 16.1% | 164px |
| Store | 2.38 | 24 | 2 | 6 | 23.8% | 164px |
| Specialization | 2.85 | 17 | 3 | 6 | 10.9% | 381px |
| Choose path | 1.71 | 13 | 2 | 4 | 19.9% | 309px |
| **Course landing** | **3.22** | **42** | 2 | 6 | 15.0% | **860px** |
| Lesson | 4.42 | 18 | **4** | 5 | 8.2% | 143px |
| Module quiz | 3.09 | 30 | 3 | 6 | 23.3% | 342px |
| Review | 1.09 | 6 | 3 | 4 | 15.1% | 346px |
| Rewards | 2.35 | 26 | 2 | 6 | 18.3% | 444px |
| Transcript | 1.10 | 4 | 3 | 5 | 3.4% | 356px |
| Daily warm-up | 2.82 | 27 | 2 | 4 | **26.8%** | 400px |
| Saved & notes | 1.07 | 5 | 2 | 5 | 9.7% | 226px |
| Settings | 2.37 | 18 | 3 | 6 | 11.6% | 177px |
| Account | 0.95 | 3 | 2 | 4 | 11.4% | 413px |
| Add a course | 1.19 | 9 | 3 | 3 | 18.1% | 0px |

---

## The worst screen in the app is the one you open most

**The course landing page.** 3.22 screens, 42 panels — nearly twice as many as any other screen — and the first control sits **860 pixels down**. Here is what occupies the space above it:

```
  67px   228px   header.hero        PERSONAL FINANCE: A QUANTITATIVE FOUNDATION
 308px   244px   div.callout        IMPORTANT — Educational content only, not…
 565px   147px   div.landprog       22% · 2 of 9 modules complete
 726px    64px   div.milerow        25% · 50% · 75% · 100%
 799px    42px   p.milecap          2 of 9 credits earned
 841px    84px   div.resumebar      Resume where you left off  →
```

**A 244-pixel legal disclaimer sits above the Resume button.** Every time you sit down to study, you scroll past a quarter-screen of "not individualised financial advice" to reach the one control you came for. It is the single worst piece of information architecture left in the app, and it is on the highest-traffic screen.

Below that, nine module cards at ~70px each — six of them locked, contributing 420px of rows that cannot be tapped — then a locked final exam and a locked certificate.

**Fix, in order:** Resume goes directly under the header, because it is why the page was opened. The disclaimer collapses to one line with a "read the full notice" affordance — it needs to be present, not prominent. Locked modules collapse into a single "6 more modules unlock as you go" row. That reclaims roughly 900px and takes the page from 3.22 screens to under 2.

## The specialization page has the same priority inversion the home screen used to

```
  81px   186px   the cover
 277px   153px   progress + "Make this my specialization"
 444px   455px   ABOUT THIS SPECIALIZATION      ← open
 917px   593px   WHAT YOU'LL BE ABLE TO DO      ← open
1524px   388px   COURSES IN ORDER               ← the actual navigation
```

Two prose blocks totalling 1,048px sit above the list of courses. Someone arriving here wants to know what to take and in what order; they get an essay first. **Courses in order should be first and open; About and Outcomes should follow, collapsed.** That is a two-line change and it moves the useful content 1,000px up.

## Three smaller structural findings

**The lesson page nests four containers deep** — deepest in the app. A content block sits inside a section inside a card inside a page shell. Two is the target; the middle layer is almost certainly redundant.

**The daily warm-up spends 26.8% of its height on panel padding**, the highest in the app, across 27 panels for five questions.

**The course landing page has no cover art** while its specialization now has one. A course opened from a group whose header carries generated art lands on a text header. That inconsistency is more visible now than it was before the covers existed — the fix is to run the same `coverSVG` on the course id.

---

## What is genuinely good, and measurably so

**Transcript**: 4 panels, 3.4% padding, 1.10 screens. The leanest screen in the app and the one that most looks like a finished product. Worth using as the reference for what the others should feel like.

**Lesson**: 8.2% padding across 4.42 screens of actual reading. Long because the content is long, which is the right reason.

**Account and Saved**: under one screen each, 3–5 panels. Nothing to fix.

**Type and shape discipline is now real.** Five or six sizes per screen from one six-step scale, two radii, no control under 44px, and no screen with more than three levels of nesting except the lesson. That was thirteen sizes and six radii two hours ago.

---

## What I would do next, in order

1. **Rebuild the course landing page.** Resume first, disclaimer collapsed, locked modules folded. Highest traffic, worst layout, biggest win available anywhere in the app.
2. **Flip the specialization page** so Courses in order leads. Two lines.
3. **Cover art on course pages**, matching the specializations.
4. **Flatten the lesson page** from four nesting levels to two.
5. **Thin the warm-up padding** and the home screen's 29 panels.

Item 1 is worth more than the other four combined.

---

## Verification

669 checks across 22 suites, zero failures. Both accessibility audits at zero issues across six consecutive runs — the earlier intermittency was the hydration crash, now fixed. Every control in the app measures at least 44px. Screenshots captured at phone and desktop in both themes.
