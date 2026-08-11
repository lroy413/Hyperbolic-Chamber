# Oboros — App & Course-Structure Analysis, with a Film-School Program Design

This is a full read of where Oboros stands as a learning platform, what would make it genuinely competitive, and a concrete plan for a director/cinematographer specialization built to rival a top conservatory. It's organized as: (1) what the app does well, (2) the content model and its gaps, (3) pedagogy and assessment, (4) structure and the missing "program" layer, (5) a prioritized roadmap, and (6) the film specialization design that the generation prompt is built around.

---

## 1. What Oboros already does well

The foundation is unusually strong for a solo build. It's genuinely offline-first (everything works with no backend, then syncs when Supabase is connected), the content is fully data-driven (courses are JSON, so new material needs no code), and the interaction model is richer than most commercial LMS products: interactive knowledge checks, spaced-repetition review on a real Leitner schedule, randomized question pools, three question types, study modes (flashcards, match, practice test), a token/power-up economy, badges, streaks, and a certificate. The rebuild around a clean topbar, slide-out nav, serif hero, and raised "3D" cards gives it a premium feel that most educational apps lack. That polish matters: it signals seriousness to a paying student.

The important takeaway is that the *plumbing* is done. What separates Oboros from a top-tier learning product now is not infrastructure — it's the depth of the content model, the assessment philosophy, and the missing layer that turns a pile of courses into a *curriculum*.

---

## 2. The content model — strengths and the gaps that matter for film

Today a lesson is built from these blocks: `p`, `h`, `callout`, `analogy`, `list`, `table`, `kcheck`, `explorer`, `stepper`, `flip`, `tabs`, `chart`, `code`, `html`. That's a strong toolkit for *text and logic*, which is why the coding and trading courses feel complete. But three gaps become glaring the moment the subject is visual craft:

**No first-class media.** There is no image, figure, video, or comparison block. You can smuggle an `<img>` into a raw `html` block, but there's no captioned figure, no responsive/lazy-loaded image, no video embed, and — most painful for film — no before/after comparison. Cinematography *is* the study of images: a lighting ratio, a lens's compression, a color grade, a blocking diagram, a shot's composition. Teaching that in prose alone is like teaching music theory with no audio. **This is the single highest-leverage fix, and it's the one we're building first.**

**The `chart` block is domain-locked.** It renders candlesticks for the trading course. It should either be generalized or simply ignored for film; film gets its value from images and video instead.

**No practice/assignment artifact.** Every assessment is auto-graded recall (pick an answer, type a short string). There is no way for a student to *do* the thing — shoot a frame, light a face, block a scene — and get structured feedback. For a craft discipline this is the biggest pedagogical gap after media. More on this under assessment.

Recommended new blocks (the first three ship in this pass):

- **`image`** — a responsive figure with caption and alt text; optional `wide` and a click-to-zoom lightbox. The workhorse for frames, diagrams, and reference stills.
- **`video`** — YouTube/Vimeo embed or direct `mp4`, with caption. For shot breakdowns, movement, and technique demos.
- **`compare`** — a before/after slider with two labeled images. Purpose-built for lighting setups, color grades, lens choices, exposure, and blocking revisions. This one block will carry more cinematography pedagogy than any other.
- *(later)* **`annotate`** — an image with tappable hotspots (an "explorer" for a frame): name the key light, the negative fill, the eyeline, the leading line. High value, slightly more work.
- *(later)* **`gallery`** — a small set of stills for shot-comparison studies (e.g., how five DPs shoot a two-shot).

---

## 3. Pedagogy & assessment — from recall to craft

The recall layer is excellent and should stay: knowledge checks, quizzes, spaced repetition, and the final exam are exactly right for locking in terminology and principles (focal length, inverse-square law, the 180-degree rule, three-point lighting, color temperature). Keep and lean on them.

What's missing is the *craft* layer. Film is learned by doing and by critique, and the app has no equivalent. The highest-value additions:

- **Practical assignments with self-assessment rubrics.** After a module, prompt the student to shoot/light/block something specific ("light a face at a 4:1 ratio; shoot the same subject at 24mm and 85mm from the same framing"), then walk them through a **rubric-based self-critique** — a checklist of what a strong result shows, so they learn to *see* their own work. This needs only a light new block (a checklist/rubric the student ticks) plus a "mark assignment complete" state; no human grader required to be valuable.
- **Frame-analysis exercises.** Show a still or clip and ask the student to identify the lighting scheme, lens, and intent. This is exactly what `compare`, `annotate`, and `image` unlock — the assessment becomes visual, not verbal.
- **A portfolio / capstone artifact.** Each course should culminate in a small deliverable (a lit portrait, a blocked scene, a 60-second sequence) that the certificate actually attests to. This is what makes the credential feel earned rather than clicked-through.

Two smaller assessment upgrades worth noting: text answers are exact-match today (brittle — "85mm" vs "85 mm" fails), so accept-lists need to be generous or the type should be reserved for truly unambiguous answers; and there's no difficulty signal per question, which spaced repetition could use to resurface harder items more often.

---

## 4. Structure — the missing "program" layer

This is the strategic gap your multi-course decision exposes. Right now the store is a flat list of independent courses. A film *specialization* is not a list — it's an ordered path with prerequisites, a throughline, and a capstone. Top conservatories (AFI organizes the whole conservatory around disciplines like Cinematography and Directing; UCLA and USC run cinematography as a sequenced MFA track) succeed because the sequence is deliberate: language and analysis first, then craft fundamentals, then integration, then a thesis.

Recommended additions to support a real curriculum:

- **A "Track" (specialization) concept** that groups an ordered set of courses under one banner ("Directing & Cinematography"), shows overall progress across the track, enforces or suggests order, and awards a **program certificate** on completion. This is a modest data + UI addition (a track is just an ordered list of course IDs plus metadata) and it's what converts "some courses" into "a film school."
- **Per-lesson metadata**: estimated time, difficulty, and a short "gear/prep needed" note. Film lessons especially need "what you'll need to try this" (a camera or phone, one light or a window, a subject).
- **Reading/watch lists** per module — the film canon is part of the pedagogy. A lightweight `resources` block (or a lesson section) pointing to films to watch *for a specific reason* ("watch the diner scene in *Heat* for how eyelines carry a two-hander") is high value and cheap.
- **An instructor voice.** Top courses have a point of view. Giving the program a consistent authorial persona (opinionated, specific, working-professional tone) is a content choice the prompt will bake in.

On monetization: the `price` field is already threaded through, so the natural model is to sell the **track as a bundle** (or subscription) with the first course free as a funnel. Nothing here requires new plumbing beyond the Stripe step already documented.

---

## 5. Prioritized roadmap

**P0 — do now (unlocks film at all):**
1. Ship `image`, `video`, `compare` blocks. *(building in this pass)*
2. Write the generation prompt around the full schema incl. the new blocks. *(this pass)*

**P1 — makes it feel like a real program:**
3. Add the **Track/specialization** grouping with cross-course progress + a program certificate.
4. Add a **rubric/checklist block** and an "assignment complete" state for practical exercises + a capstone per course.
5. Add `annotate` (image hotspots) and a `resources`/watch-list block.

**P2 — polish and depth:**
6. Per-lesson time/difficulty/gear metadata; difficulty-weighted spaced repetition.
7. Generalize or retire the trading-specific `chart` block.
8. Optional media niceties: `gallery`, image lightbox, lazy-loading, and (if you host video) a simple self-hosted player to avoid YouTube branding.

---

## 6. The film specialization program (what the prompt builds toward)

Designed to mirror a conservatory's logic — language → craft → integration → thesis — with directing and cinematography as the two braided spines. Five courses, each a full Oboros course (7–12 modules), sequenced:

**Course 1 — Visual Language & Film Analysis (the foundation).** How film means: shot grammar, the frame, continuity and the 180/30-degree rules, montage vs. mise-en-scène, coverage logic, and reading films like a director. Establishes the vocabulary everything else uses. *Capstone: a shot-by-shot analysis of a scene.*

**Course 2 — Camera, Lens & Exposure (the cinematographer's instrument).** Sensors and formats, exposure and the tools that control it (aperture, shutter, ISO/gain, ND), dynamic range and the histogram/false-color/waveform, focal length and perspective, depth of field, focus, and the expressive *choice* behind each. *Capstone: a lens/exposure study — same subject, deliberate variations.*

**Course 3 — Lighting & Color (painting with light).** The physics of light (quality, direction, intensity, inverse-square, color temperature), three-point and motivated/naturalistic lighting, ratios and contrast, hard vs. soft, color theory and the grade, day-for-night, and building a look. Maximum use of `compare`. *Capstone: light a portrait to a defined ratio and mood.*

**Course 4 — Directing: Story, Actors & Staging (the director's craft).** Script analysis and the director's vision, working with actors (objectives, blocking from character, the rehearsal), staging and the where-does-the-camera-go decision, coverage and editing in-camera, and the director–DP collaboration. *Capstone: block and shot-list a scene.*

**Course 5 — Production & Post: From Set to Screen (integration/thesis).** Prep and the shot list/floor plan, on-set workflow and the camera department, continuity, editing and rhythm, color grading, sound's role in the image, and delivering a finished sequence. *Capstone: a 60–90 second finished sequence — the program thesis.*

A student who completes all five has covered the substance of a conservatory cinematography track with a directing spine, and — critically — has *five artifacts* to show for it.

---

*Bottom line: the app's engine is ready; the wins are media blocks (now), a program/track layer, and a craft-assessment layer. The prompt is written to produce content at conservatory depth within that model, starting with the media blocks we're adding in this pass.*
