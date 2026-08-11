# Oboros against the field — what's fixed, and what's actually missing

Two parts. First what the app-wide work changed, measured. Then an honest comparison against what leading learning platforms shipped, and the gaps that remain.

**Bias disclosure:** I built it and I chose the metrics. The second half matters more than the first.

---

## Part 1 — what changed

### The course landing page

The highest-traffic screen in the app, and the worst laid out. It put a 244-pixel legal disclaimer between the header and the Resume button, so every study session began by scrolling past "not individualised financial advice."

| | Before | After |
|---|---|---|
| Scroll height | 3.22 screens | **2.38** |
| Panels | 42 | **31** |
| First control at | **860px** | **262px** |

Resume now sits directly under the cover. The notice is one line that expands. Locked modules — six of them contributing 420px of untappable rows — fold into a single "6 more modules · they unlock as you pass each quiz" line that remembers whether you opened it. The page also got generated cover art, so a course opened from a specialization no longer lands on a bare text header.

### The specialization page

Two prose blocks totalling 1,048px sat above the list of courses. Courses in order now leads and opens; About and Outcomes follow, collapsed.

| | Before | After |
|---|---|---|
| Scroll height | 2.85 screens | **1.74** |
| Words before the course list | 340 | **94** |

### A finding I got wrong, and one I nearly missed

**The lesson page was not nested four deep.** My metric was counting a 10-pixel radio dot as a container level. Corrected, the deepest chain is `pagecard > kcheck > option` — three, and legitimate. I did not "fix" it, because there was nothing wrong.

**Four of the seven colour palettes could not legibly carry white text on a solid button.** Ember 3.26:1, Verdant 3.30:1, Bloom 4.12:1, Classic 3.16:1, against a 4.5:1 requirement. This predates all of today's work and affects every primary button in the app, and no per-screen review would ever find it — the audit only samples the palette you happen to be using. There is now an `--accent-solid` token, computed per palette to clear 4.5:1, and `test34` checks all twelve palette-and-theme combinations on every run.

### App-wide state

Sixteen screens, all measured: **zero controls under 44px, no screen with more than three container levels, five to six type sizes per screen from one six-step scale, two corner radii, both audits clean across repeated runs, 706 checks passing.**

The two remaining outliers are honest ones. The **daily warm-up spends 27.7% of its height on padding** — but that padding is five questions' worth of 44px answer options, which is what it should be. The **lesson page runs 4.42 screens** because the content is genuinely that long.

---

## Part 2 — the gaps against the field

Here the news is less comfortable. Oboros is now well built. It is competing against products that have shipped things it has not.

### 1. There is no AI tutor, and that is now table stakes

This is the biggest gap and it opened recently.

Khan Academy's Khanmigo is deployed free to roughly 50 million students, and Khan reports a [32% increase in concept mastery speed and a 24% reduction in time spent on already-mastered material](https://callsphere.ai/blog/ai-agents-education-khan-academy-duolingo-autonomous-tutoring). Duolingo Max ships four specialised agents — immersive scenarios, pronunciation coaching, cultural context, and weekly progress synthesis — and claims Max users reach conversational proficiency 2.3× faster.

Oboros has none of this. When a learner does not understand a paragraph in Module 4, there is nobody to ask. The written explanations are good — the `why` arrays on every wrong option are better than most platforms bother with — but they are static. A learner who is confused in a way the author did not anticipate is stuck.

**What is achievable here:** the app is one offline HTML file, so a bundled model is out. But an optional "explain this" that calls an API when online, with the lesson text as context, would close most of the gap and degrade gracefully offline. That matches the existing architecture — the Supabase backend is already optional in exactly this way.

### 2. Nothing creates a deadline, and deadlines are what finish courses

The completion data is unambiguous. Free MOOCs finish at [5–15%; cohort-based courses at 72%](https://www.skillademia.com/statistics/online-course-completion-statistics/). Paid certificates complete at roughly 8× the rate of free auditing. Social features and peer accountability raise completion by about 28%.

Oboros is free, solo, and entirely self-paced — three of the strongest predictors of non-completion, stacked. Its courses are also 38–80 hours, and the same data shows completion falling to about 20% at the 20-hour mark.

**This is the deepest strategic problem in the product,** and it is not a design problem. The honest options are a self-imposed commitment (pick an end date, get a schedule, see whether you are ahead or behind), a cohort feature (real deadlines with other people), or accepting that the app is for the minority who finish things unaided and optimising for them rather than pretending otherwise.

There is a mitigating fact worth knowing: [measuring completion by learner *intent* rather than by enrolment](https://openpraxis.org/articles/10.55982/openpraxis.16.3.606) moves the figure from 30% to 48%, because roughly 30% of enrollees never open the material. Everyone who installs an Oboros course has already self-selected past that filter.

### 3. Course length is fighting the evidence

Optimal completion sits at 1–2 hour courses (80%), falling to 35% at 10 hours and 20% beyond 20. Oboros courses are 38 to 80 hours.

The depth is the product's genuine advantage — a 40-hour course with real assigned readings and a 40-question case-based exam is not what Duolingo sells. But nothing in the app lets a learner take a *slice*. There is no "just the working capital module", no two-hour path, no way in for someone who wants one specific thing.

**Cheapest high-value fix in this document:** let modules be enrolled in individually. The content already supports it — each module has objectives, three lessons and its own quiz. That turns one 38-hour commitment into nine 4-hour ones without writing a word of new material.

### 4. Interactive checkpoints are too far apart

Interactive quizzes every 3–5 minutes are reported to lift retention 40% and completion 18%. Oboros lessons run 20–40 minutes with one `kcheck` block, sometimes none. The module quiz at the end is excellent and comes an hour late.

**Fix:** two or three knowledge checks per lesson rather than zero or one. This is a content-generation change, and the course pipeline already produces `kcheck` blocks — it is a prompt adjustment, not an engineering one.

### 5. The certificate means nothing to anyone else

Coursera certificates carry weight because a named institution stands behind them and they are verifiable at a URL. An Oboros certificate is a printable page with a name typed into it, unverifiable and unshareable.

That may be fine — the credits and transcript are honestly framed as a personal record, not a credential. But if the certificate is meant to motivate, it currently cannot, and the transcript work would be better spent on something that does.

### 6. Small, concrete things the field does that Oboros does not

**No search inside a course.** You can search your library; you cannot find the lesson that mentioned "cash conversion cycle". For a 27-lesson course this is a real omission and it is not hard.

**No estimated time per lesson.** The store now says a course is 38 hours; a lesson says nothing. "About 12 minutes" is the single most useful label for someone deciding whether to start now or later, and it is derivable from word count.

**No download-for-offline distinction.** Everything is offline, which is a genuine advantage, and the app never says so at the moment it would matter.

**No notes export.** Notes and highlights are trapped in the app.

**No dark-pattern-free positioning.** Oboros has no ads, no streak-repair purchases, no engagement notifications, and no gating. That is a real differentiator against the category and it is stated nowhere a user would see it.

---

## Where it genuinely leads

These are the ones I can defend against specific competitors rather than assert.

**Mastery decay.** Almost nothing in consumer learning models forgetting at course level. Anki does it per card with a punishing interface; Duolingo retreated from cracked skills; Coursera and Khan do not attempt it. Showing a certified course sitting at 35% after 79 days is honest in a way the category is structurally disincentivised to be.

**Spaced repetition as a first-class surface**, without Anki's barrier to entry.

**Full offline including assessments.** Duolingo needs per-unit downloads; Coursera's offline support is partial and video-focused.

**Content depth and honesty.** A course that argues with the folklore in its own field — the rule of threes, the universal edibility test, EBITDA — and says so in the text is not what the category ships.

**A curriculum you can see.** The store now shows sequence position, hours and module count grouped by specialization. Most commercial catalogues optimise that screen for conversion instead.

---

## What I would do next, in order

1. **Let modules be taken individually.** Turns 38-hour commitments into 4-hour ones using content that already exists. Directly addresses the strongest predictor of non-completion.
2. **An optional online "explain this".** Closes the largest capability gap; degrades gracefully offline; fits the architecture already in place.
3. **Two or three knowledge checks per lesson.** A prompt change in the course pipeline, with the best-evidenced effect size available.
4. **Per-lesson time estimates and in-course search.** Small, cheap, immediately useful.
5. **Decide what the certificate is for.** Either make it verifiable or stop implying it is a credential.

Item 1 is worth more than the rest combined, and it requires no new content.

---

## Verification

706 checks across 23 suites, zero failures. Both accessibility audits clean across repeated runs. `test34` is new: 37 checks covering the rebuilt course page, the specialization order, deterministic cover art, and white-on-accent contrast across all twelve palette-and-theme combinations.

## Sources

- [Online Course Completion Statistics](https://www.skillademia.com/statistics/online-course-completion-statistics/) — completion by course type and length, and intervention effect sizes
- [Uncovering MOOC Completion](https://openpraxis.org/articles/10.55982/openpraxis.16.3.606) — Open Praxis, on intent-based versus enrolment-based measurement
- [AI Agents in Education: Khan Academy and Duolingo](https://callsphere.ai/blog/ai-agents-education-khan-academy-duolingo-autonomous-tutoring) — what the two largest players actually shipped
- [Mobile Navigation: Image Grids or Text Lists?](https://www.nngroup.com/articles/image-vs-list-mobile-navigation/) — Nielsen Norman Group, used for the cover-art decision
