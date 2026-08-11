# Oboros Film Specialization — Course Generation Prompt

This is a reusable prompt that generates one **conservatory-grade** film course at a time, as valid Oboros course JSON you can import directly (Settings → Add a course → paste, or upload to your Supabase `catalog_courses` table). The specialization is a five-course **Directing & Cinematography** track; run the prompt once per course, changing only the `COURSE TO GENERATE` line.

## How to use it
1. Open Claude (or ChatGPT) in a fresh chat. Paste the entire **PROMPT** block below.
2. On the `COURSE TO GENERATE` line, set which of the five courses you want (start with Course 1).
3. It returns one complete course as JSON. Save it as `course-N.json`.
4. Import it into Oboros to review, then publish it to your store (Supabase) when happy.
5. Replace any remaining media placeholders (real stills/clips) with real assets before publishing — most figures will already be inline SVG diagrams and need nothing.

**Keep the `id`s exact** (`film-1-visual-language`, `film-2-camera-lens-exposure`, `film-3-lighting-color`, `film-4-directing-actors-staging`, `film-5-production-post`) so each course automatically slots into the **Directing & Cinematography** specialization track already in the app — and completing all five unlocks the program certificate.

Because a full conservatory course is large, if a model truncates, tell it "continue the JSON exactly where you left off," or ask it to generate **one module at a time** using the same schema and you concatenate them into the `modules` array.

---

## ▶ THE PROMPT (copy everything below this line)

You are a senior conservatory film educator — think a working director-cinematographer who also teaches the core craft sequence at a top program (AFI / USC / NYU / UCLA caliber). You write rigorous, specific, opinionated curriculum. You never pad with fluff, never speak in generic "film is magic" platitudes, and always teach through concrete technique, real film examples, and hands-on practice. Your standard is: a motivated beginner who completes this course should be able to hold their own on a professional set and articulate *why* every choice was made.

**COURSE TO GENERATE:** Course 1 of 5 — "Visual Language & Film Analysis"
(Change this line to generate a different course. The full program map is at the end of this prompt; generate exactly the course named here, following its module blueprint.)

### Your output
Return **only** a single valid JSON object — a complete Oboros course matching the schema below. No prose before or after, no markdown fences around it. It must parse with `JSON.parse`.

### Pedagogical standards (non-negotiable)
- **Conservatory depth.** Assume 20–30 hours of study for the course. Teach the *why* and the *how*, not just definitions. Where a real course would show technique, show it (diagrams, before/after comparisons, shot breakdowns).
- **Specificity over generality.** Every principle is anchored to named films, directors, and DPs, and to concrete numbers (focal lengths, T-stops, ratios, color temperatures, frame rates). "Use a long lens to compress" is weak; "shoot the confrontation on a 135mm so the background street compresses and traps them together, the way Deakins isolates figures in *Sicario*" is the standard.
- **Craft, not trivia.** Prefer questions and content that build judgment ("given this emotional beat, which lens and height and why?") over rote recall, though some terminology recall is fine and useful.
- **Practice.** Every module ends its teaching with a **practical assignment** the learner can do with a phone or a basic camera and one light or a window, written as a **`rubric` block** — a clear `brief` plus a self-critique checklist of what a strong result shows. The course's final module is a **capstone** with a bigger `rubric` (the program thesis).
- **A canon.** Each module includes a **`resources` block** ("Watch for a reason") — 3–5 films/scenes to study, each paired with the *specific thing* to watch for.
- **Voice.** Confident, precise, working-professional. Address the learner directly. Opinions are welcome when defended.

### Scope targets (aim for these)
- **7–10 modules** per course, ordered so each builds on the last.
- Each module: a `tagline`, 3–5 `objectives`, **3–5 lessons**, and a `quiz` of 6–10 questions (set `"pick"` to show ~5).
- Each lesson: **6–14 blocks** mixing teaching prose with visuals and at least one `kcheck`. Vary the block types — don't make every lesson a wall of `p`.
- A `glossary` on lessons that introduce terms (array of `[term, definition]`).
- A `finalExam` of 18–25 questions (`"pick": 15`) drawing on the whole course.
- Rich, correct `explain` text on every quiz/kcheck question — the explanation should teach, not just confirm.

### The Oboros course JSON schema (follow exactly)

```json
{
  "id": "kebab-case-unique-id",
  "title": "Course Title",
  "subtitle": "One-line summary",
  "tagline": "Shown on the library/store card",
  "accent": "#7b61ff",
  "author": "Oboros Film",
  "category": "Film",
  "certificateDesc": "has completed [course] and can ...",
  "modules": [
    {
      "title": "Module title",
      "tagline": "What this module covers",
      "objectives": ["Able to ...", "Able to ...", "Able to ..."],
      "lessons": [
        {
          "title": "Lesson title",
          "glossary": [["term","definition"], ["term","definition"]],
          "blocks": [ /* see block types */ ]
        }
      ],
      "quiz": { "pick": 5, "questions": [ /* see question types */ ] }
    }
  ],
  "finalExam": { "pick": 15, "questions": [ /* see question types */ ] }
}
```

**Block types** (each is an object in a lesson's `blocks` array; `html` fields may use inline `<b> <em> <code> <mark>` and `<br>`):
- `{"t":"p","html":"A teaching paragraph."}`
- `{"t":"h","text":"A subheading"}`
- `{"t":"callout","kind":"tip","label":"Assignment","html":"Brief + self-critique checklist."}` (kind: `"tip"` or `"warn"`)
- `{"t":"analogy","html":"An <b>analogy</b> that makes an abstract idea click."}`
- `{"t":"list","ordered":false,"items":["<b>Heat</b> (1995) — watch the diner two-hander for eyelines.","..."]}`
- `{"t":"table","head":["Focal length","Feels like","Use it when"],"rows":[["24mm","wide, immersive","..."],["85mm","compressed, intimate","..."]]}`
- `{"t":"stepper","title":"Setting a 4:1 ratio","steps":[["Place the key","..."],["Add fill","..."],["Meter both","..."]]}`
- `{"t":"flip","title":"Reveal the terms","cards":[{"label":"Chiaroscuro","html":"definition"},{"label":"Motivated light","html":"definition"}]}`
- `{"t":"tabs","title":"Three ways to shoot a two-shot","tabs":[{"label":"Single","html":"..."},{"label":"Over-the-shoulder","html":"..."},{"label":"Clean single","html":"..."}]}`
- `{"t":"explorer","title":"Anatomy of the frame","items":[{"label":"Headroom","html":"...","color":"#7b61ff"},{"label":"Lead room","html":"..."}]}`
- `{"t":"code","lang":"text","code":"A shot list line or timecode block, if useful."}`
- `{"t":"resources","title":"Watch for a reason","items":[["Heat (1995) — the diner two-hander","Watch how eyelines carry a scene with no cutting-in."],["..."]]}` — the film canon / go-deeper list.
- `{"t":"rubric","title":"Assignment: light a portrait to 4:1","brief":"Shoot the same face at 1:1 and 4:1.","items":["A visible key/fill ratio near 4:1","Motivated direction","No blown highlights","..."]}` — a practical assignment with a self-check list (persists + awards XP). Use this for each module's assignment and the course capstone.
- **`{"t":"image","svg":"<svg viewBox=\"0 0 560 300\" ...>...</svg>","caption":"Teaching caption."}`** — an INLINE themed SVG diagram (see Media rules). This is the preferred figure for anything you can draw: framing/composition, lighting plots, blocking floor plans, focal-length/DOF comparisons, the color wheel, exposure triangle, a shot-flow timeline.
- **`{"t":"image","src":"PLACEHOLDER","alt":"exactly the frame/still to source","caption":"Teaching caption.","wide":true}`** — for a real photographic still/film frame you cannot draw.
- **`{"t":"video","provider":"youtube","id":"PLACEHOLDER","caption":"exactly which scene/clip + what to watch."}`** (or `"provider":"vimeo","id":"..."`, or `"provider":"file","src":"..."`)
- **`{"t":"compare","before":{"src":"PLACEHOLDER","label":"1:1 flat"},"after":{"src":"PLACEHOLDER","label":"4:1 dramatic"},"caption":"What changed and why.","ratio":"16/9"}`** — before/after slider, for two real stills.
- `{"t":"kcheck","q":"An inline check question?","options":["a","b","c"],"answer":1,"explain":"Why — and the underlying principle."}`

**Question types** (used in `quiz.questions` and `finalExam.questions`):
- Single choice: `{"q":"...?","options":["a","b","c","d"],"answer":2,"explain":"..."}`
- Select-all: `{"type":"multi","q":"...?","options":["a","b","c","d"],"answers":[0,2],"explain":"..."}`
- Typed answer: `{"type":"text","q":"...?","accept":["85mm","85 mm"],"explain":"..."}` (give generous `accept` variants; only use for unambiguous answers)

### Media rules (important)
Two kinds of visual, handled differently:

**A) Diagrams you can draw → inline themed SVG (preferred, and there are many in film).** Put the SVG markup in an `image` block's `svg` field. It renders inside the app's theme, so it MUST use these CSS variables (do NOT hard-code light/dark colors):
- text/titles `fill="var(--ink)"`; secondary labels `fill="var(--muted)"`; strokes/gridlines `stroke="var(--line)"`; **the accent** (the one thing to emphasize) `var(--fig)` (nested/depth via `fill-opacity` 0.06/0.10/0.17/1.0; white text on a solid accent fill = `#fff`).
- semantic mid-tones only when categories differ (legible on both themes): warm/key `#eaa93c`, cool/shadow `#4f8cf0`, positive `#2fb57f`, negative `#ef5f6b`, violet `#8b7bf0`.
- viewBox width **560**, height ~180–330, **no** width/height attributes, `role="img"` + a short `aria-label`. Transparent (no full-bleed background rect — the app frames it in a card). Content within x:24..536. System sans (the app sets the font). No `<style>`, no scripts, no external refs. Escape `&` as `&amp;`.
- Great candidates: rule-of-thirds/framing grids, the exposure triangle, focal-length & depth-of-field comparisons, three-point lighting plots (key/fill/back positions), blocking floor plans, the color wheel/complementary schemes, a shot-flow/coverage timeline, aspect-ratio comparisons.

**B) Real photographs, film frames, and clips → placeholders with precise sourcing notes.** You cannot produce these. For a still/frame use `image` with `"src":"PLACEHOLDER"` and a precise `alt`/`caption` naming the exact film+scene or the setup to shoot. For a `compare`, set both `before.src` and `after.src` to `"PLACEHOLDER"`. For `video` set `"id":"PLACEHOLDER"` and name the exact scene + what to watch. **Never invent YouTube/Vimeo IDs or image URLs.** Use `compare` for exposure, lens choice, lighting ratio, hard vs soft, color grade, day-for-night, blocking before/after — the highest-value photographic comparisons in cinematography.

Aim to teach with **inline SVG diagrams wherever the idea is geometric/schematic**, and reserve placeholders for things that genuinely require a real image or clip.

Now generate the course named on the `COURSE TO GENERATE` line, in full, as one JSON object.

---

## ◼ Program map (blueprint for each of the five courses)

Generate them in order; later courses assume earlier vocabulary. Suggested `id`s: `film-1-visual-language`, `film-2-camera-lens-exposure`, `film-3-lighting-color`, `film-4-directing-actors-staging`, `film-5-production-post`.

**Course 1 — Visual Language & Film Analysis.** Shot grammar & the frame; scale (wide→ECU) and what each is *for*; composition (thirds, balance, lead room, headroom, symmetry, depth); continuity & the 180° and 30° rules; eyeline & screen direction; mise-en-scène vs montage; coverage logic & how scenes are built; camera height & angle as psychology; reading a film like a director. *Capstone assignment: a shot-by-shot breakdown of one scene.*

**Course 2 — Camera, Lens & Exposure.** Sensors, formats & aspect ratios; the exposure triangle for motion (aperture/T-stop, shutter angle, ISO/gain) + ND; dynamic range, the histogram, waveform & false color; focal length, perspective & compression; depth of field & the circle of confusion; focus & focus-pulling; frame rate & motion (24/48/slow-mo); the *expressive* choice behind each. *Capstone: a lens & exposure study — same subject, deliberate variations.*

**Course 3 — Lighting & Color.** The physics of light (quality, direction, intensity, inverse-square law, falloff); color temperature & white balance; hard vs soft & how to shape it; three-point and, beyond it, motivated & naturalistic lighting; ratios & contrast; building a look; color theory, the grade & LUTs; day-for-night & practical-driven scenes. Heavy `compare` use. *Capstone: light a portrait to a defined ratio and mood.*

**Course 4 — Directing: Story, Actors & Staging.** Script analysis & the director's vision/throughline; objectives, actions & subtext; casting & the rehearsal; blocking that comes from character; staging & the where-does-the-camera-go decision; coverage & editing in-camera; tone & performance calibration; the director–DP language & the shot list. *Capstone: block and shot-list a scene, with a floor plan.*

**Course 5 — Production & Post: From Set to Screen.** Prep (breakdown, shot list, floor plan, shot logic); the camera & G&E departments and set workflow; continuity & script supervision; on-set problem solving; editing & rhythm; color grading; sound design's role in the image; delivery. *Capstone (program thesis): a finished 60–90 second sequence.*

Award a **program certificate** once all five are complete (this maps to the "Track" concept recommended in the analysis — until that ships, the five individual course certificates stand in).
