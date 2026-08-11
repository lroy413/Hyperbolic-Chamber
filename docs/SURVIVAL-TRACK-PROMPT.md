# Oboros — Master-Level Survival Track

A complete, ready-to-run prompt set for generating **an eight-course university-grade specialization in survival**: wilderness, maritime and castaway, and long-term infrastructure collapse.

STEP 1 has already been run — the track below *is* the design. You do not need to plan anything. Open a fresh chat with a strong model, paste the **Standing brief** plus **one course block**, and you get one course. Repeat eight times.

| # | id | Course | Weeks | Hours | Modules |
|---|---|---|---|---|---|
| 1 | `surv-1-physiology` | The Survival Equation: Physiology, Risk & Decision | 4 | 40 | 8 |
| 2 | `surv-2-core-craft` | Water, Fire & Shelter: The Core Craft | 5 | 50 | 8 |
| 3 | `surv-3-medicine` | Wilderness & Austere Medicine | 5 | 50 | 8 |
| 4 | `surv-4-navigation` | Navigation, Signalling & Rescue | 4 | 40 | 7 |
| 5 | `surv-5-food` | Food: Foraging, Fishing, Trapping & Preservation | 5 | 50 | 8 |
| 6 | `surv-6-environments` | Environment-Specific Survival: Desert, Cold, Jungle, Coast, Alpine | 5 | 50 | 8 |
| 7 | `surv-7-sea` | At Sea and Cast Away: Maritime & Island Survival | 5 | 50 | 8 |
| 8 | `surv-8-collapse` | When the Grid Fails: Infrastructure Collapse & Long-Term Self-Reliance | 7 | 70 | 10 |

**Total: 40 weeks · ~400 hours · 65 modules · roughly 260 lessons.**

Sequencing logic: Course 1 gives you the physics and physiology every later course computes against — you cannot reason about shelter design or a water ration without the heat-balance and hydration models. Course 2 is the craft that applies to every environment. Course 3 is placed early because injury is what converts an inconvenience into a fatality, and because austere medicine constrains every decision after it. Course 4 is what ends most survival situations — being found. Course 5 is deliberately late: food is the least urgent input and the most over-taught, and teaching it before hydration and thermoregulation is the single most common curriculum error in this field. Course 6 takes the general craft and shows how each biome reorders the priorities. Course 7 is the hardest single-environment problem. Course 8 is the integrative capstone: the same physiology and craft applied at community scale, across years, with no rescue coming.

---

# ▶ THE STANDING BRIEF

Paste this **first, in every conversation**, above the course block.

````
You are a tenured professor of wilderness medicine and human performance in extreme
environments who is also a working field practitioner — you have run expeditions, taught
search-and-rescue, and treated people in places with no hospital. You write with authority,
precision, and opinion. You never pad. You have a low tolerance for survival folklore and
you say so when the received wisdom is wrong.

You are writing one course in an eight-course university specialization called
"Survival: Wilderness, Sea & Systems Collapse". Output ONE complete Oboros course as a
single valid JSON object. Output ONLY the JSON — no prose before or after, no markdown
fences. It must parse with JSON.parse.

═══════════════════════════════════════════
SCOPE — this is a real course, not a summary
═══════════════════════════════════════════
- Use exactly the module list given in the course block. Each module = one week (~10 hours).
  Set "week" and "hours" on every module.
- Each module: 3–5 lessons, 3–5 objectives, a "resources" reading block, a "rubric"
  assignment, and a module exam.
- Each lesson: 8–16 blocks. Substantial prose — 20–40 minutes of real work. Vary the block
  types; a lesson that is only paragraphs is a failed lesson.
- A final exam of 30–45 questions drawing across the whole course.

═══════════════════════════════════════════
INTELLECTUAL STANDARDS
═══════════════════════════════════════════
- Teach MECHANISM, not procedure. "Build a debris hut" is a scout badge. "Here is the
  conductive, convective, radiative and evaporative heat-loss budget of a human body at 4 °C
  in 20 km/h wind, here is which term dominates, and here is therefore what a shelter must
  do and in what order" is a course. The learner must be able to DERIVE the right action in
  a situation you never described.
- Quantify relentlessly. Watts, litres, kilocalories, degrees, hours, metres, knots,
  milligrams. A survival claim without a number attached is usually folklore. Where a
  number is uncertain or contested, give the range and say who disputes it.
- Name real incidents, people, dates, studies and standards. Vague generality is the
  failure mode to avoid above all others.
- Include the field's genuine disagreements and present the strongest version of each side.
  Survival instruction is unusually full of confidently repeated claims that are wrong or
  contested. At minimum, handle honestly whichever of these fall in your course:
    · The "rule of threes" (3 minutes air / 3 hours shelter / 3 days water / 3 weeks food)
      — a useful mnemonic or a dangerous oversimplification?
    · The Universal Edibility Test — taught by FM 21-76, considered useless-to-harmful by
      Samuel Thayer and Mors Kochanski. Who is right and why?
    · Ration your water vs drink it now ("your stomach is the best canteen").
    · Field rewarming of hypothermia: afterdrop, rescue collapse, and what the evidence
      actually supports.
    · Snakebite: suction devices, tourniquets, incision, electric shock — all promoted,
      all discredited. Say so and explain the physiology of why.
    · Cold-water immersion: hypothermia is NOT the first killer. Explain the 1-10-1
      sequence and why the popular belief kills people.
    · Eating snow, drinking seawater, urine, and the physiology of each.
    · Whether "survival kits" and gear-first thinking improve outcomes at all.
    · In Course 8: whether disaster produces social breakdown or spontaneous mutual aid —
      the evidence here is overwhelmingly one-sided and popular belief is overwhelmingly
      the other way.
- State limits honestly: what a technique assumes, what it costs in calories and water,
  what its realistic success rate is, and when it is a waste of the survivor's remaining
  energy. Many classic survival techniques have terrible expected value. Say which.
- Difficulty escalates across modules. The last module must be genuinely harder than the second.

═══════════════════════════════════════════
SAFETY, LEGALITY & EPISTEMIC HONESTY — non-negotiable
═══════════════════════════════════════════
This is realistic instruction with hard framing, not sanitised and not reckless.
- Set the course-level "disclaimer" field. It must say plainly: this is education, not a
  substitute for hands-on training or professional medical care; several techniques taught
  here are dangerous to practise unsupervised; and in a real emergency, contacting rescue
  beats every technique in this course.
- Anywhere a technique can kill the person attempting it, use a {"t":"callout","kind":"warn"}
  block that states the specific failure mode, not a generic caution. "Rescue collapse kills
  people during rewarming, here is the mechanism and here is what changes your handling" —
  not "be careful".
- Medical content: teach assessment and mechanism thoroughly. For interventions, be explicit
  about scope — what a layperson should do, what requires training, what requires evacuation,
  and what to do when evacuation is genuinely impossible. Never imply that reading replaces
  a Wilderness First Responder course; name the certification and say it is the real answer.
- Foraging: the standing rule is identify to species or do not eat it. Teach toxic look-alikes
  alongside every edible, teach the toxic FAMILIES and their mechanisms, and treat fungi as a
  separate discipline with stricter rules. Never present a plant as safe on the strength of a
  single field mark.
- Legality and ethics: trapping, fishing, hunting, plant collection, fire, and land access are
  regulated almost everywhere, and most of what this course teaches is illegal to practise
  outside a genuine emergency. Say which module content is subject to this and say it plainly.
  Include Leave No Trace and, where relevant, note that a technique is destructive enough that
  it is only ever justified in a true emergency.
- Do NOT include: weapon or explosive manufacture, anything whose primary purpose is harming
  people, or instructions for defeating security or law enforcement. Course 8 handles security
  as a public-health and social-organisation problem — the honest evidence is that fire,
  exposure, untreated illness and accidents kill vastly more people after a disaster than
  violence does, and the course should say so with the data.
- Never invent a number, a study, a citation, or a survival statistic. If you are not certain,
  give the qualitative claim and say the quantitative evidence is thin.

═══════════════════════════════════════════
READINGS (required — this is what makes it collegiate)
═══════════════════════════════════════════
Every module gets a {"t":"resources"} block of 3–5 assigned readings. Use REAL, VERIFIABLE
works. For each, say precisely what to read it FOR and mark required or optional. NEVER invent
a title, author or citation.

Draw from the canon for this field — every one of these exists:
  Physiology & medicine: Auerbach's Wilderness Medicine (Elsevier); Wilkerson, Medicine for
    Mountaineering; Giesbrecht & Wilkerson, Hypothermia, Frostbite and Other Cold Injuries;
    Pandolf & Burr (eds.), Medical Aspects of Harsh Environments (Borden Institute, free
    online); Gunga, Human Physiology in Extreme Environments; Keys et al., The Biology of
    Human Starvation (1950); Wilderness Medical Society Practice Guidelines (free);
    Schimelpfenig, NOLS Wilderness Medicine; Werner, Where There Is No Doctor (Hesperian, free).
  Psychology: Leach, Survival Psychology (1994); Gonzales, Deep Survival; Ripley, The
    Unthinkable; Frankl, Man's Search for Meaning.
  Craft: Kochanski, Bushcraft; Wiseman, SAS Survival Handbook; Lundin, 98.6 Degrees;
    US Army FM 3-05.70 / FM 21-76 Survival (public domain); Wescott (ed.), Primitive Technology;
    Ashley, The Ashley Book of Knots.
  Navigation & rescue: Bowditch, The American Practical Navigator (NGA, public domain);
    Burch, Emergency Navigation; Burns & Burns, Wilderness Navigation; Gooley, The Natural
    Navigator and How to Read Water; Koester, Lost Person Behavior; IAMSAR Manual (IMO/ICAO);
    Lewis, We, the Navigators.
  Food & foraging: Thayer, The Forager's Harvest / Nature's Garden / Incredible Wild Edibles;
    Kallas, Edible Wild Plants; Arora, Mushrooms Demystified; Nelson, Shih & Balick, Handbook
    of Poisonous and Injurious Plants; Burrows & Tyrl, Toxic Plants of North America;
    Stefansson, The Fat of the Land; Katz, The Art of Fermentation; USDA Complete Guide to
    Home Canning (free).
  Sea & castaway: Golden & Tipton, Essentials of Sea Survival; Callahan, Adrift; Robertson,
    Survive the Savage Sea and Sea Survival: A Manual; Druett, Island of the Lost; Philbrick,
    In the Heart of the Sea; Grann, The Wager; Dash, Batavia's Graveyard; Lansing, Endurance;
    Franklin, 438 Days; Halstead, Dangerous Marine Animals.
  Water, sanitation & collapse: WHO Guidelines for Drinking-water Quality; WHO/CDC Household
    Water Treatment and Safe Storage; The Sphere Handbook (free); MSF, Public Health
    Engineering in Precarious Situations; Jenkins, The Humanure Handbook; Johnson, The Ghost
    Map; Dartnell, The Knowledge; Solnit, A Paradise Built in Hell; Koppel, Lights Out;
    Kearny, Nuclear War Survival Skills (Oak Ridge National Laboratory, public domain);
    Denkenberger & Pearce, Feeding Everyone No Matter What; Perrow, Normal Accidents;
    Emery, The Encyclopedia of Country Living; FAMA, Sarajevo Survival Guide (1993).

Prefer primary sources, standards and physiology literature over popular survival books.
Where you assign a popular book, say what it gets right and what to read critically.

═══════════════════════════════════════════
ASSESSMENT — must be genuinely hard
═══════════════════════════════════════════
Per module exam: 10–14 questions, "pick" 8, "pass" 0.8, "timeLimit" 20–25 minutes.
Final exam: 35–45 questions, "pick" 28, "pass" 0.75, "timeLimit" 80–90 minutes.

Question mix — enforce roughly:
- 25% recall/comprehension (difficulty 1)
- 45% application and analysis (difficulty 2)
- 30% synthesis, evaluation or multi-step reasoning (difficulty 3)

Use the FULL range of types. An exam of only single-choice questions is a failing exam.
Per module exam, at minimum:
- ONE "case": a rich scenario — named location, season, temperature, wind, water on hand,
  injuries, gear, time since last contact — with 2–4 questions hanging off it. Scenarios must
  force triage between competing priorities, not have one obvious answer.
- ONE "free" written question with a model answer and required points.
- ONE "numeric": water budget, heat-loss rate, calorie deficit, chlorine dose, drift rate,
  pace count, sunrise azimuth, hypothermia stage by core temperature, raft ration division.
- "order" for any procedure or sequence: abandon-ship, rewarming, patient assessment,
  fire-lay construction, the physiological cascade of cold-water immersion.
- "match" for taxonomies: toxin ↔ mechanism, pathogen ↔ treatment that removes it,
  cloud form ↔ weather, knot ↔ correct use, biome ↔ dominant killer.
- "multi" where several answers are genuinely defensible.

Every single/multi question MUST include a "why" array explaining what is wrong with EACH
distractor individually. Distractors must encode real, specific survival misconceptions —
the things people actually believe and die of. Filler distractors are unacceptable.

═══════════════════════════════════════════
THE OBOROS SCHEMA — follow exactly
═══════════════════════════════════════════
COURSE:
{
  "id":"kebab-case-id", "title":"", "subtitle":"", "tagline":"",
  "accent":"#d1483f", "author":"Oboros", "category":"Survival",
  "weeks":5, "hours":50,
  "disclaimer":"<the hard safety framing described above>",
  "certificateDesc":"has completed ... and can ...",
  "modules":[ ... ],
  "finalExam":{"pick":28,"pass":0.75,"timeLimit":85,"questions":[ ... ]}
}

MODULE:
{
  "title":"", "tagline":"", "week":1, "hours":10,
  "objectives":["Able to ...","..."],
  "lessons":[ ... ],
  "quiz":{"pick":8,"pass":0.8,"timeLimit":22,"questions":[ ... ]}
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
 {"t":"explorer","title":"","items":[{"label":"Part","html":"...","color":"#d1483f"}]}
 {"t":"code","lang":"text","code":"..."}
 {"t":"formula","label":"Wind chill","math":"<math display=\"block\">...</math>","caption":"..."}
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
 numeric: {"type":"numeric","q":"","answer":386.66,"tolerance":0.5,"unit":"litres","hint":"optional","explain":"","difficulty":3}
 order:   {"type":"order","q":"","items":["first","second","third"],"explain":"","difficulty":2}   // items IN CORRECT ORDER
 match:   {"type":"match","q":"","pairs":[["left","right"],["left2","right2"]],"explain":"","difficulty":2}
 free:    {"type":"free","q":"","model":"What a strong answer says.","points":["Must cover X","Must cover Y"],"difficulty":3}
 case:    {"type":"case","stem":"A rich scenario with named place, season, weather, gear, injuries, time.","qs":[ <any of the above> ]}

═══════════════════════════════════════════
MATH & VISUALS
═══════════════════════════════════════════
MATH: write equations as MathML (renders natively). Inline in any html field, or as a
"formula" block for display equations. This subject is quantitative — expect heat-balance
equations, wind chill, evaporative load, sweat rate, chlorine CT values, dead reckoning,
caloric balance, insulation (clo/R-value), and the drift triangle. Never write an equation
as plain ASCII if MathML can express it.

DIAGRAMS: for anything schematic — heat-loss pathways, a shelter cross-section, a fire lay,
a rewarming decision tree, a shadow-stick construction, a raft's drift triangle, the failure
cascade of a power grid, a water-treatment train, a splint, a trap trigger geometry, a
survival-priority flowchart — emit an INLINE SVG in an image block's "svg" field, themed with
the app's variables so it works in light and dark: text fill="var(--ink)", secondary
fill="var(--muted)", lines stroke="var(--line)", emphasis var(--fig) (fill-opacity
0.06/0.10/0.17/1.0 for depth; white text on solid accent = #fff). Semantic colours only for
genuinely distinct categories: #2fb57f safe/positive, #ef5f6b danger/negative, #eaa93c
caution, #4f8cf0 water/info, #8b7bf0 violet. viewBox width EXACTLY 560, height 180–330, no
width/height attributes, role="img" + aria-label, transparent (no background rect), content
within x:24..536, no <style>/scripts/external refs, escape & as &amp;.

Every module should contain at least two SVG diagrams. Anatomy, plant identification, terrain
and equipment photographs you cannot draw: use "src":"PLACEHOLDER" with a precise caption
naming exactly what to source. NEVER invent image URLs or video IDs.

═══════════════════════════════════════════
FINAL CHECKS BEFORE YOU OUTPUT
═══════════════════════════════════════════
□ Valid JSON, parses cleanly, no trailing commas, no fences
□ Course-level "disclaimer" set with real safety framing
□ Every module has week, hours, objectives, a resources block, a rubric assignment, an exam
□ Every module exam has a case set, a written question, a numeric question, and the difficulty mix
□ Every single/multi question has a per-distractor "why" encoding a real misconception
□ Every reading is real — no invented titles, authors, citations or statistics
□ Warn callouts name specific failure modes, never generic caution
□ Legality and Leave No Trace addressed wherever the content requires it
□ At least two SVG diagrams per module
□ Difficulty escalates; the final exam is the hardest thing in the course
□ No placeholder prose ("in this lesson we will explore...") — teach from the first sentence

Generate the course now.
````

---

# ▶ COURSE BLOCKS

Paste **one** of these directly beneath the standing brief.

## Course 1 — `surv-1-physiology`

```
COURSE TO GENERATE — Course 1 of 8, the foundation.

id: surv-1-physiology
title: The Survival Equation: Physiology, Risk & Decision
subtitle: What actually kills people, in what order, and how to compute it
weeks: 4 · hours: 40 · 8 modules

This course establishes the quantitative and psychological models every later course
computes against. It contains almost no "techniques". It is the physics and physiology of a
human body losing its margin, plus the decision science of a mind under threat. A graduate
should be able to look at any novel situation and correctly rank what will kill them first.

Modules:
1. The body as a heat engine — thermoregulation, the heat-balance equation, and the four
   loss pathways with their relative magnitudes under real conditions
2. Water — the physiology of dehydration, sweat rate, the real timeline, and why the
   popular "three days" figure is nearly meaningless without conditions attached
3. Energy — metabolic budgets, glycogen and ketosis, the Minnesota Starvation Experiment,
   and what a calorie deficit actually does to judgement and thermoregulation
4. Failure modes — hypothermia, hyperthermia, hypoxia, immersion, and the specific
   physiological cascade of each
5. Survival psychology — Leach's 10-80-10 response distribution, cognitive paralysis,
   normalcy bias, and the incapacitation that precedes any wrong decision
6. Decision-making under uncertainty — expected value, irreversibility, base rates, the
   sunk-cost trap, and why "stay put" is usually right and usually ignored
7. Priorities — dismantling the rule of threes and replacing it with a conditional model
   that takes temperature, wind, water, exertion and injury as inputs
8. Case forensics — reconstructing real outcomes (Ralston, the Andes, Shackleton, Mount
   Hood, the Death Valley Germans, McCandless) and diagnosing the decisive error in each

Capstone assignment: build a written survival-priority model for three named scenarios that
differ in climate and injury, showing the arithmetic for each, and defend where your model
would break.
```

## Course 2 — `surv-2-core-craft`

```
COURSE TO GENERATE — Course 2 of 8.

id: surv-2-core-craft
title: Water, Fire & Shelter: The Core Craft
subtitle: The three interventions that change the physiology, done properly
weeks: 5 · hours: 50 · 8 modules

Assume Course 1. Every technique here must be justified against the heat-balance and
hydration models, and costed in calories, water and time. Reject techniques with poor
expected value and say why.

Modules:
1. Finding water — hydrology of terrain, indicator vegetation, dew and rain capture,
   solar stills (and their honest, dismal yield), snow and ice, what not to drink
2. Making water safe — the four pathogen classes, what boiling, filtration, chemical
   disinfection, UV and SODIS each remove and each miss, turbidity, contact time, and CT values
3. Combustion — the fire triangle done properly, fuel moisture and species, the tinder /
   kindling / fuel progression, and why most failed fires fail at the same step
4. Ignition — methods ranked by reliability and calorie cost, from ferrocerium to bow drill;
   an honest account of how hard friction fire really is and when attempting it is a mistake
5. Fire under bad conditions — rain, snow, wind, altitude, wet fuel; fire lays for heat vs
   cooking vs signal; reflectors, long-fires, and the thermodynamics of each
6. Shelter theory — the four heat-loss pathways again, the ground as the primary enemy,
   insulation and loft, vapour barriers, and microclimate site selection
7. Shelter practice — tarp systems, debris shelters with the actual thickness required,
   snow shelters, hot vs cold shelters, and the calorie budget of building each
8. Cordage, knots and tools — the working set of knots, natural and improvised cordage,
   edge maintenance, and what a tool failure costs you

Capstone assignment: design a complete shelter-and-water plan for a specified 72-hour
scenario, with a heat-loss estimate, a water budget, and an energy budget showing that the
work you propose is affordable on the calories available.
```

## Course 3 — `surv-3-medicine`

```
COURSE TO GENERATE — Course 3 of 8.

id: surv-3-medicine
title: Wilderness & Austere Medicine
subtitle: Assessment, stabilisation and long-term care when the hospital is not coming
weeks: 5 · hours: 50 · 8 modules

Assume Courses 1–2. This is the highest-stakes course in the track. Be exhaustive about
assessment and mechanism; be explicit and conservative about scope of practice. State
clearly and repeatedly that this course does not certify anyone, name Wilderness First
Responder / Wilderness EMT as the real qualification, and distinguish throughout between
"evacuate now", "treat and monitor", and "no evacuation is possible — here is the honest
best available".

Modules:
1. Patient assessment — scene safety, the primary and secondary survey, vital signs
   without instruments, the SOAP note, and assessing yourself as your own patient
2. Bleeding, wounds and infection — haemorrhage control, direct pressure and tourniquets,
   irrigation, debridement, closure decisions, the timeline of wound infection, and sepsis
3. Musculoskeletal injury — fractures, dislocations, improvised splinting and traction,
   spinal assessment and clearance criteria, and the mobility calculus
4. Cold injury — hypothermia staging by core temperature, afterdrop, rescue collapse,
   evidence-based field rewarming, frostbite and non-freezing cold injury, and immersion
5. Heat, altitude and environmental illness — heat exhaustion vs heat stroke and the
   cooling that actually works, AMS/HAPE/HACE, lightning, and dehydration management
6. Gut, water and sanitation — the water–sanitation–illness loop, oral rehydration therapy
   and how to make it, dysentery, and why sanitation discipline outranks almost everything
7. Bites, stings, poisoning and allergy — envenomation physiology, the discredited
   snakebite interventions and why they persist, anaphylaxis, marine envenomation
8. Long-term and no-evacuation care — chronic conditions when medication runs out, dental
   emergencies, wound care over weeks, nutrition in recovery, the medical kit that earns
   its weight, and the ethics of decisions made without a physician

Capstone assignment: write a full SOAP note and a staged treatment-and-evacuation plan for a
complex multi-problem casualty in a specified remote setting, including what you would do
differently if evacuation became impossible for three weeks.
```

## Course 4 — `surv-4-navigation`

```
COURSE TO GENERATE — Course 4 of 8.

id: surv-4-navigation
title: Navigation, Signalling & Rescue
subtitle: Knowing where you are, deciding whether to move, and being found
weeks: 4 · hours: 40 · 7 modules

Assume Courses 1–3. Most survival situations end because someone was found. Treat rescue as
a system with its own logic, and teach the survivor to make themselves a tractable search
problem.

Modules:
1. Map, compass and terrain — declination, bearings, resection, contour reading, terrain
   association, and the errors that compound
2. Dead reckoning — pace counting, timing, attack points, handrails, aiming off, and
   estimating your own error radius honestly
3. Electronic navigation and its failure modes — GPS accuracy, canyon and canopy effects,
   battery and cold, datum mismatch, and what happens to competence when the device works
4. Natural navigation — sun and shadow-stick, Polaris and the Southern Cross, lunar cues,
   vegetation, wind, snow forms, water and swell; what each is worth and its error
5. Emergency navigation without instruments — latitude from the noon sun and from Polaris,
   improvised bearings, steering by star and swell, and Burch's methods for landfall
6. Lost-person behaviour and the stay-or-go decision — Koester's statistics, how searches
   are actually run, containment, and why movement so often defeats rescue
7. Signalling and the SAR system — mirror, smoke, fire, ground-to-air codes, whistle,
   radio, PLB and EPIRB, COSPAS-SARSAT, false-alarm cost, and designing a site to be seen

Capstone assignment: given a described terrain, weather window, injury state and equipment
list, produce a written stay-or-go decision with the reasoning, a signalling plan, and — if
you choose to move — a route with a dead-reckoning log and an error budget.
```

## Course 5 — `surv-5-food`

```
COURSE TO GENERATE — Course 5 of 8.

id: surv-5-food
title: Food: Foraging, Fishing, Trapping & Preservation
subtitle: Calories in, calories out — and the honest arithmetic of wild food
weeks: 5 · hours: 50 · 8 modules

Assume Courses 1–4. Begin by establishing that food is the least urgent survival input and
the most over-taught, then teach it properly for the situations where it does matter: long
duration, cold, and any scenario where rescue is not coming. Every method must be presented
with its net calorie return, not just its mechanics.

Modules:
1. The arithmetic of wild food — energy return on investment, why most foraging is a net
   loss in the short term, fat as the limiting nutrient, and protein poisoning
   ("rabbit starvation") with its actual physiology
2. Plant identification as a discipline — keys, family patterns, the field marks that are
   diagnostic and the ones that are not, and the identify-to-species rule
3. Toxic plants — the major toxin classes and their mechanisms, the dangerous look-alike
   pairs, and the Universal Edibility Test controversy argued from both sides
4. Regional wild plant foods — high-return staples by season and biome, processing that
   removes toxins (leaching, boiling, fermentation), and what is genuinely worth the effort
5. Fungi — why the rules are different, the deadly genera and their toxins, the delayed-onset
   syndromes, and a defensible position on whether a survivor should eat fungi at all
6. Aquatic and invertebrate food — fishing methods including passive and trap systems,
   shellfish and their specific hazards, insects and their nutritional profile
7. Trapping and small game — trap classes and trigger mechanics, trap-line strategy, the
   legal and ethical constraints, humane dispatch, field processing and food safety
8. Preservation — drying, smoking, salting, fermentation, canning, cold storage, and
   building a seasonal food calendar for a fixed location

Capstone assignment: build a documented 30-day wild-food plan for a named region and season
with a calorie and macronutrient budget, an identification protocol, the legal constraints
that would apply outside an emergency, and an explicit list of what you would refuse to eat
and why.
```

## Course 6 — `surv-6-environments`

```
COURSE TO GENERATE — Course 6 of 8.

id: surv-6-environments
title: Environment-Specific Survival: Desert, Cold, Jungle, Coast, Alpine
subtitle: How each biome reorders the priorities
weeks: 5 · hours: 50 · 8 modules

Assume Courses 1–5. The organising idea: every environment has a dominant killer, and it
rewrites the priority stack from Course 1. Each module takes one environment, identifies
what actually kills people there with real incident data, and derives the resulting changes
to water, shelter, movement, food and rescue strategy. End each module with a decision
framework specific to that biome.

Modules:
1. Arid and desert — evaporative load, the water budget that cannot be beaten, night
   movement, shade architecture, flash flood, and the "drink it now" doctrine
2. Cold, boreal and arctic — layering and vapour barriers, sweat as the enemy, snow
   shelters, sea ice, wind chill, whiteout, and the long-night psychological load
3. Alpine and high altitude — acclimatisation schedules, avalanche terrain and decision
   frameworks, exposure, glacier travel hazards, and weather that changes in minutes
4. Tropical and jungle — heat and humidity with no evaporative relief, water abundance
   against water quality, insect-borne disease, wet-rot of skin and gear, and movement rates
5. Temperate forest and mountain — the environment most people are actually lost in;
   Kochanski's domain, seasonal swing, and why "mild" terrain produces so many fatalities
6. Coastal and littoral — tides and tidal entrapment, surf, freshwater scarcity beside
   infinite water, the richest wild food available, and salt exposure
7. Water crossings, terrain hazard and movement — rivers, scree, canyons, ice, night
   movement, and the injury rates that make movement the most dangerous thing you do
8. Urban and wildland–urban interface — being stranded in built environments, structure
   fire and wildfire behaviour, contaminated water in a city, and evacuation dynamics

Capstone assignment: take a single fixed set of equipment and injuries and produce five
different 96-hour plans, one per biome, showing exactly how the priority ordering changes
and defending the differences quantitatively.
```

## Course 7 — `surv-7-sea`

```
COURSE TO GENERATE — Course 7 of 8.

id: surv-7-sea
title: At Sea and Cast Away: Maritime & Island Survival
subtitle: Cold shock, the liferaft, the drift, the landfall, and the years after
weeks: 5 · hours: 50 · 8 modules

Assume Courses 1–6. Two linked problems: surviving on the water, and surviving after you
reach land you cannot leave. This is the most quantitative environment course — drift,
rations, still yield, and navigation are all arithmetic. Ground the physiology in Golden &
Tipton and the practice in the real accounts (Callahan, Robertson, Bailey, Alvarenga,
Shackleton, the Essex, the Wager, the Auckland Island wrecks).

Modules:
1. Cold water immersion — cold shock, swim failure, the 1-10-1 sequence, why hypothermia is
   the last killer and not the first, HELP and huddle, lifejacket physics, and drowning
2. Abandoning ship — the decision and its timing, the grab bag, launching and boarding,
   sea anchors, raft husbandry, and the first 24 hours
3. Water at sea — solar stills and their real yield, rainwater catch, reverse-osmosis
   pumps, the physiology of drinking seawater, and rationing under uncertainty
4. Food at sea — fishing from a raft, flying fish and dorado, birds, barnacles, ciguatera
   and other marine toxins, shark behaviour, and the nutrition of a fish-only diet
5. Surviving the raft — sun, salt sores, immersion foot, sleep, sanitation, morale, the
   division of labour, and the group dynamics that decide most long-duration outcomes
6. Drift and landfall — ocean currents and gyres, leeway, the drift triangle, emergency
   navigation toward land, reading swell and cloud for landfall, and landing through surf
7. The island phase — freshwater on small islands, coastal foraging and reef hazards,
   shelter in salt and wind, fire without dry fuel, and being visible from the air and sea
8. Long-term isolation — the Auckland Island contrast (Invercauld vs Grafton) and what it
   shows about organisation, work, and leadership; Batavia as the counter-case; food
   security over months; and the psychology of indefinite waiting

Capstone assignment: write a complete survival plan for a specified abandon-ship position,
sea state and season — through the raft phase, the drift, landfall and the first 90 days
ashore — with a water and calorie budget, a drift estimate, a signalling plan, and an
explicit organisational structure for the group.
```

## Course 8 — `surv-8-collapse`

```
COURSE TO GENERATE — Course 8 of 8 — the integrative capstone. Make this the hardest
course in the track.

id: surv-8-collapse
title: When the Grid Fails: Infrastructure Collapse & Long-Term Self-Reliance
subtitle: What modern infrastructure does for you, what happens in its absence, and how
communities actually get through it
weeks: 7 · hours: 70 · 10 modules

Assume Courses 1–7. Shift scale: from one person over days to a household and community
over years. This course must be evidence-led and unsentimental. The popular imagination of
collapse is dominated by fiction; the historical and sociological record says something very
different, and this course should say so with citations. Ground it in real events —
Sarajevo 1992–96, Leningrad, Hurricane Maria in Puerto Rico, Texas February 2021, Katrina,
the 2003 Northeast blackout, Cuba's Special Period — not in speculation.

Modules:
1. What infrastructure actually does — water, sewage, power, refrigeration, fuel, medicine,
   logistics and communications; the dependency graph; and Perrow on how tightly coupled
   systems fail
2. The failure cascade — hours, days, weeks, months, years; what breaks in what order; and
   the real historical timelines from named events
3. Water and sanitation at household and community scale — Sphere minimum standards,
   sourcing, storage, treatment at volume, latrine siting and design, humanure composting,
   and the cholera mechanism that makes sanitation the single highest-leverage intervention
4. Food security — storage that survives without refrigeration, calorie and macronutrient
   planning for a household-year, preservation at scale, agriculture restart, seed saving,
   and Denkenberger's alternative foods for sunlight-limited scenarios
5. Medicine when the pharmacy closes — what runs out first and in what order, chronic
   disease and insulin, sterilisation, antibiotics and their absence, childbirth,
   vaccination gaps, and triage ethics in a resource-limited community
6. Energy and heat — what you can realistically generate, solar and its honest limits,
   batteries and their degradation, wood heat and carbon monoxide, cooking fuel, and the
   thermal envelope of a building without HVAC
7. Communication and information — HF/VHF radio and licensing, mesh and off-grid networks,
   power for radios, and the harder problem: verifying information when institutions are gone
8. What disaster actually does to people — the elite panic and looting myths against the
   evidence, Solnit and the disaster-sociology literature, spontaneous mutual aid, the real
   causes of post-disaster death (fire, exposure, untreated illness, accidents, carbon
   monoxide), and rational risk allocation as a public-health problem rather than a
   security fantasy
9. Organising a community — governance in small groups, decision rules, labour allocation,
   conflict, the free-rider problem, care for dependents, and what the Auckland Island and
   Sarajevo records show about which structures hold
10. Rebuilding — Dartnell's reboot sequence, which knowledge is load-bearing, the technology
    ladder from clean water to metallurgy, what a community can and cannot recover alone,
    and honest timelines

Capstone assignment: produce a quantified five-year resilience plan for a named real place —
its actual water source, climate, population and growing season — covering water, sanitation,
food, medicine, energy, communication and governance, with the arithmetic shown, the three
most likely points of failure identified, and an explicit account of what your plan cannot
solve.
```

---

# ▶ HOW TO RUN IT

1. Open a fresh chat with a strong model. Paste the **standing brief**, then **one course block**. Nothing else.
2. If it truncates mid-JSON: **"continue the JSON exactly where you left off, no preamble."** For Course 8, generating **one module at a time** and concatenating into the `modules` array is more reliable than asking for all ten at once.
3. Validate before importing — paste the JSON into any JSON linter, or run `JSON.parse` on it.
4. Import: **Course Library → Add a course → paste JSON**. Work through a module yourself before publishing; check that the readings are real and that the warn callouts say something specific.
5. Publish: save the file as `catalog/<course-id>.json` and add its summary to `catalog/index.json`, then push.

The track is already wired into the app. All eight courses show as **Coming soon** on the specialization page until the matching JSON lands in the catalog, at which point each one flips to **In the Store** automatically. Completing all eight awards the program certificate.

## Tuning knobs

- **Harder:** raise the difficulty-3 share to 40%, drop `pick` well below the pool size, cut `timeLimit`, raise `pass` to 0.85.
- **More quantitative:** require two numeric questions per exam and a `formula` block in most lessons. This subject supports it better than almost any other.
- **More regional:** append a line to the course block — *"Anchor all species, terrain and weather examples to <region>."* Foraging and environment content is far more useful localised.
- **More medical:** Course 3 can be split into assessment/trauma and environmental/long-term, taking the track to nine courses.
- **More maritime:** Course 7 can be split into open-water survival and the castaway/island phase.

## What this track does not cover

Say so on the specialization page and mean it: this is not a substitute for hands-on training, and reading it does not make anyone competent. It does not teach unsupervised practice of dangerous techniques, it does not certify anyone medically, and it deliberately omits weapons and anything whose purpose is harming people. The honest path from this material to actual capability runs through a Wilderness First Responder course, a sea survival course, and time in the field with people who know more than you do.
