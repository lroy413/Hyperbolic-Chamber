# Oboros — Universal Collegiate Track Prompt

A subject-agnostic prompt for generating **a full college-level specialization** (4–6 sequenced courses) on any topic, in Oboros course JSON. Each course is scoped to **3–5 weeks of real study (30–50 hours)**, with weekly pacing, assigned readings, and assessments hard enough to actually certify knowledge.

## How to use it

1. Open a fresh chat with a strong model. Paste **STEP 1** to design the track. Review and adjust the plan it returns.
2. Then paste **STEP 2** once per course, filling in the two placeholder lines. One course per conversation is best — they're large.
3. Import each course into Oboros (Library → Add a course → paste JSON), review, then publish to your store.
4. Add the track to `tracks.json` using the map STEP 1 produced.

If a model truncates mid-JSON, say **"continue the JSON exactly where you left off, no preamble."** For very large courses, ask for **one module at a time** using the same schema and concatenate them into the `modules` array.

---

# ▶ STEP 1 — DESIGN THE TRACK

```
You are a curriculum director who builds degree-level programs. I want a rigorous, university-grade
specialization in: <<<SUBJECT>>>

Design a track of 4–6 sequenced courses. Total workload should equal roughly one serious semester:
each course 3–5 weeks at ~10 hours/week (30–50 hours), so the whole track is 150–250 hours.

Rules:
- Sequence by dependency, not by topic popularity. Course 1 must establish the vocabulary and
  mental models every later course assumes. The final course must be an integrative capstone.
- Each course needs a defensible reason to exist. If two could merge without loss, merge them.
- Cover the field's real breadth: theory AND method AND application. Include the parts practitioners
  find hard, not just the parts that are easy to teach.
- Be honest about prerequisites and about what this track does NOT cover.

Return:
1. Track title, a one-line tagline, and a 4–6 sentence "about" paragraph describing the discipline
   and how the sequence is built.
2. For each course: id (kebab-case, prefixed consistently), title, one-line subtitle, week count,
   estimated hours, 6–10 module titles, and its capstone deliverable.
3. 4–6 real-world roles this track serves, each with one line on what that person actually does.
4. 5–7 genuine canonical readings (real books/papers/references that exist), each with why it matters.
5. What a graduate can demonstrably DO at the end.

Format as clean markdown. No JSON yet.
```

---

# ▶ STEP 2 — GENERATE ONE COURSE

```
You are a tenured professor and working practitioner writing the definitive self-paced version of a
course you have taught for years. You write with authority, precision, and opinion. You never pad.

SUBJECT AREA: <<<SUBJECT>>>
COURSE TO GENERATE: <<<COURSE N: TITLE — from the STEP 1 plan, with its module list>>>

Produce ONE complete Oboros course as a single valid JSON object. Output ONLY the JSON — no prose
before or after, no markdown fences. It must parse with JSON.parse.

═══════════════════════════════════════════
SCOPE — this is a real course, not a summary
═══════════════════════════════════════════
- 6–10 modules. Each module = one week of study (~10 hours). Set "week" and "hours" on every module.
- Each module: 3–5 lessons, 3–5 objectives, a readings list, an assignment, and a module exam.
- Each lesson: 8–16 blocks. Substantial prose — a lesson should take 20–40 minutes to work through.
  Vary the block types; never write a lesson that is only paragraphs.
- Course total: 25–40 lessons. A final exam of 30–45 questions drawing on the whole course.

═══════════════════════════════════════════
INTELLECTUAL STANDARDS
═══════════════════════════════════════════
- Teach mechanisms, not vocabulary. The learner should understand WHY something is true well enough
  to derive it, predict edge cases, and recognise when it fails.
- Be concrete and specific. Name real people, works, studies, cases, systems, dates, and numbers.
  Vague generalities are the failure mode to avoid above all others.
- Include the disagreements. Where the field genuinely disputes something, present the strongest
  version of each side and say what would settle it. Never flatten controversy into consensus.
- State limits honestly: what the method assumes, where it breaks, what it cannot tell you.
- Have a point of view, and defend it. Mark your opinions as opinions.
- Difficulty should escalate across modules. Module 8 must be genuinely harder than module 2.

═══════════════════════════════════════════
READINGS (required — this is what makes it collegiate)
═══════════════════════════════════════════
Every module gets a "resources" block of 3–5 assigned readings. Use REAL, VERIFIABLE works —
books, seminal papers, standards, primary sources, official documentation. For each, say precisely
what to read it FOR ("read §3 for the derivation, skip the historical preamble"). Mark whether it is
required or optional. NEVER invent a title, author, or citation. If you are unsure a source exists,
use one you are certain about instead.

═══════════════════════════════════════════
ASSESSMENT — must be genuinely hard
═══════════════════════════════════════════
Per module exam: 8–14 questions, "pick" ~8, "pass" 0.75–0.8, "timeLimit" 15–25 minutes.
Final exam: 30–45 questions, "pick" 25, "pass" 0.75, "timeLimit" 60–90 minutes.

Question mix per exam — enforce roughly this distribution:
- 30% recall/comprehension (difficulty 1)
- 45% application and analysis (difficulty 2)
- 25% synthesis, evaluation, or multi-step reasoning (difficulty 3)

Use the FULL range of types. An exam of only single-choice questions is a failing exam:
- at least ONE "case" scenario set per module exam (a rich stem + 2–4 questions hanging off it)
- at least ONE "free" written question per module exam (with a model answer)
- "numeric" wherever the subject involves calculation
- "order" for processes, sequences, chronology, or procedure
- "match" for taxonomies, term↔definition, cause↔effect, figure↔contribution
- "multi" (select-all) for questions with several defensible answers

Every single/multi question MUST include a "why" array explaining what is wrong with EACH
distractor individually. Distractors must be plausible — each should represent a specific,
realistic misconception, never filler. Every question gets a teaching "explain".

═══════════════════════════════════════════
THE OBOROS SCHEMA — follow exactly
═══════════════════════════════════════════
COURSE:
{
  "id":"kebab-case-id", "title":"", "subtitle":"", "tagline":"",
  "accent":"#hex", "author":"Oboros", "category":"<one word>",
  "weeks":8, "hours":45,
  "certificateDesc":"has completed ... and can ...",
  "modules":[ ... ],
  "finalExam":{"pick":25,"pass":0.75,"timeLimit":75,"questions":[ ... ]}
}

MODULE:
{
  "title":"", "tagline":"", "week":1, "hours":10,
  "objectives":["Able to ...","..."],
  "lessons":[ ... ],
  "quiz":{"pick":8,"pass":0.8,"timeLimit":20,"questions":[ ... ]}
}

LESSON:
{ "title":"", "glossary":[["term","definition"]], "blocks":[ ... ] }

CONTENT BLOCKS (html fields accept inline <b> <em> <code> <mark> <sub> <sup> <br> and MathML):
 {"t":"p","html":"A substantial teaching paragraph."}
 {"t":"h","text":"A subheading"}
 {"t":"callout","kind":"tip|warn","label":"Note","html":"..."}
 {"t":"analogy","html":"An analogy that makes an abstract idea click."}
 {"t":"list","ordered":false,"items":["...","..."]}
 {"t":"table","head":["A","B"],"rows":[["1","2"]]}
 {"t":"stepper","title":"","steps":[["Step name","what happens"]]}
 {"t":"flip","title":"","cards":[{"label":"Term","html":"definition"}]}
 {"t":"tabs","title":"","tabs":[{"label":"View A","html":"..."}]}
 {"t":"explorer","title":"","items":[{"label":"Part","html":"...","color":"#7356f0"}]}
 {"t":"code","lang":"text","code":"..."}
 {"t":"formula","label":"Bayes' theorem","math":"<math display=\"block\">...</math>","caption":"..."}
 {"t":"image","svg":"<svg viewBox=\"0 0 560 300\" role=\"img\" aria-label=\"...\">...</svg>","caption":"..."}
 {"t":"image","src":"PLACEHOLDER","alt":"exactly what to source","caption":"...","wide":true}
 {"t":"compare","before":{"src":"PLACEHOLDER","label":"..."},"after":{"src":"PLACEHOLDER","label":"..."},"caption":"..."}
 {"t":"annotate","src":"PLACEHOLDER","alt":"...","caption":"...","points":[{"x":30,"y":40,"label":"","html":""}]}
 {"t":"kcheck","q":"","options":["",""],"answer":1,"explain":""}
 {"t":"resources","title":"Assigned reading","items":[["Work — Author","Required. Read ch. 2–4 for X."]]}
 {"t":"rubric","title":"Assignment: ...","brief":"What to produce.","items":["A strong result shows ..."]}

QUESTION TYPES:
 single:  {"q":"","options":["","","",""],"answer":2,"why":["why A is wrong","...","why C is right","..."],"explain":"","difficulty":2}
 multi:   {"type":"multi","q":"","options":[],"answers":[0,2],"why":[],"explain":"","difficulty":2}
 text:    {"type":"text","q":"","accept":["variant a","variant b"],"explain":"","difficulty":1}
 numeric: {"type":"numeric","q":"","answer":386.66,"tolerance":0.5,"unit":"USD","hint":"optional","explain":"","difficulty":3}
 order:   {"type":"order","q":"","items":["first","second","third"],"explain":"","difficulty":2}   // items IN CORRECT ORDER
 match:   {"type":"match","q":"","pairs":[["left","right"],["left2","right2"]],"explain":"","difficulty":2}
 free:    {"type":"free","q":"","model":"What a strong answer says.","points":["Must cover X","Must cover Y"],"difficulty":3}   // model+points replace "explain" here
 case:    {"type":"case","stem":"A rich scenario, dataset, passage, or excerpt.","qs":[ <any of the above> ]}

═══════════════════════════════════════════
MATH & VISUALS
═══════════════════════════════════════════
MATH: write equations as **MathML** (renders natively). Inline inside any html field, or as a
"formula" block for display equations. Example:
<math><mi>σ</mi><mo>=</mo><msqrt><mfrac><mrow><mo>∑</mo><msup><mrow><mo>(</mo><mi>x</mi><mo>−</mo><mi>μ</mi><mo>)</mo></mrow><mn>2</mn></msup></mrow><mi>N</mi></mfrac></msqrt></math>
Never write equations as plain ASCII if MathML can express them.

DIAGRAMS: for anything schematic (models, flows, structures, plots, timelines, comparisons) emit an
INLINE SVG in an image block's "svg" field, themed with the app's variables so it works in light and
dark: text `fill="var(--ink)"`, secondary `fill="var(--muted)"`, lines `stroke="var(--line)"`, the
emphasis colour `var(--fig)` (use fill-opacity 0.06/0.10/0.17/1.0 for depth; white text on solid
accent = #fff). Semantic colours only for genuinely distinct categories: #2fb57f positive,
#ef5f6b negative, #eaa93c warning, #4f8cf0 info, #8b7bf0 violet. viewBox width EXACTLY 560, height
180–330, no width/height attributes, role="img" + aria-label, transparent (no background rect),
content within x:24..536, no <style>/scripts/external refs, escape & as &amp;.

PHOTOS/CLIPS you cannot draw: use "src":"PLACEHOLDER" (or "id":"PLACEHOLDER" for video) with a
precise caption naming exactly what to source. NEVER invent image URLs or video IDs.

═══════════════════════════════════════════
FINAL CHECKS BEFORE YOU OUTPUT
═══════════════════════════════════════════
□ Valid JSON, parses cleanly, no trailing commas, no fences
□ Every module has week, hours, objectives, a resources block, a rubric assignment, and an exam
□ Every exam has a case set, a written question, and the difficulty mix above
□ Every single/multi question has a per-distractor "why"
□ Every reading is real — no invented titles, authors, or citations
□ Difficulty escalates across modules; the final exam is the hardest thing in the course
□ No placeholder prose ("in this lesson we will explore...") — teach from the first sentence

Generate the course now.
```

---

## Appendix — plugging the track into the app

After generating the courses, add an entry to `tracks.json`:

```json
{
  "id": "your-track-id",
  "title": "Track Title",
  "tagline": "One line.",
  "accent": "#7356f0",
  "about": "The 4–6 sentence paragraph from STEP 1.",
  "outcomes": ["Able to ...", "..."],
  "careers": [["Role", "What they actually do and which modules map to it."]],
  "reading": [["Work — Author", "Why it matters."]],
  "related": ["another-track-id"],
  "courseIds": ["course-1-id", "course-2-id", "course-3-id"]
}
```

Courses appear in the Store; adding one puts it in the library. A course listed in a track but not yet
generated shows as "Coming soon"; one that exists but isn't added shows "In the Store". Completing
every course in a track awards the program certificate.

### Subjects this works well for
Anything with real intellectual structure: statistics, macroeconomics, constitutional law, organic
chemistry, music theory, epidemiology, machine learning, art history, logic, microbiology, urban
planning, supply chain, cognitive psychology, screenwriting, accounting, political theory.

### Tuning knobs
- **Harder:** raise the difficulty-3 share to 35%, lower `pick` relative to pool size, cut `timeLimit`, raise `pass` to 0.85.
- **Longer:** more modules (10–12) rather than longer lessons — pacing stays weekly.
- **More quantitative:** require a numeric question in every exam and a `formula` block in most lessons.
- **More discursive:** two `free` questions per exam and a written argument as the capstone rubric.
