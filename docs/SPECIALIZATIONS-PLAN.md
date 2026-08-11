# Oboros specializations — where they stand and where they could go

## The honest starting position

Six specializations are defined in `tracks.json`. Between them they reference **24 course slots**. Five courses actually exist:

| Built | Track | Modules |
|---|---|---|
| `app-builder` — The Full-Stack Web Engineer | web | 10 |
| `personal-finance` — Personal Finance: A Quantitative Foundation | markets | 9 |
| `stock-charts` — Reading Stock Charts | markets | 9 |
| `everyday-negotiation` — Everyday Negotiation | influence | 9 |
| `audio-1-acoustics` — Acoustics & Audio Signal Fundamentals | audio | 8 |

Nineteen referenced course ids resolve to nothing. Film shows five courses and delivers zero. Survival shows eight and delivers zero. In the app those appear as "In the Store · add it to start" rows that lead nowhere, which is the one thing on a learning platform that erodes trust fastest.

So the real question underneath "what specializations should exist" is a sequencing question. My recommendation is at the end; the lists come first, since that's what you asked for.

House shape for everything below: **9 modules × 3 lessons + a final exam**, roughly 40 hours, one credit per ten hours. A specialization is **5–8 courses**, so 200–320 hours — a genuine year of part-time study, which is the right weight for the word "specialization."

---

# Part 1 — Filling out the six that exist

## 1. Software & Web Engineering (`web`)

Currently one course doing the work of a whole track. `app-builder` covers ten subjects at survey depth; it should stay as the gateway and everything else should go deeper than it can.

| # | id | Title | Scope |
|---|---|---|---|
| 1 | `app-builder` *(exists)* | The Full-Stack Web Engineer | The survey. Request to response, end to end. Keep the id — people have progress saved against it. |
| 2 | `web-2-javascript` | JavaScript in Depth: Runtime, Types & Async | Execution contexts, closures, prototypes, the event loop, microtasks, promises, generators, modules, memory. |
| 3 | `web-3-interfaces` | Interface Engineering: Layout, CSS Architecture & Accessibility | The cascade and specificity as a system, flex/grid as constraint solvers, design tokens, WCAG as an engineering spec, screen-reader semantics. |
| 4 | `web-4-data` | Data & APIs: Relational Modelling, REST and Beyond | Normalization, indexes and query plans, transactions and isolation levels, API contract design, pagination, caching, GraphQL trade-offs. |
| 5 | `web-5-security` | Web Security & Identity | Threat modelling, OWASP categories with the underlying mechanism, sessions vs tokens, OAuth/OIDC flows, password storage, CSP. Defensive throughout. |
| 6 | `web-6-testing` | Testing, Debugging & Observability | The test pyramid and its critics, property-based testing, fixtures and flakiness, structured logging, tracing, reading a production incident. |
| 7 | `web-7-performance` | Performance & Delivery | Critical rendering path, Core Web Vitals and what they actually measure, bundling, caching layers, CDNs, budgets you enforce in CI. |
| 8 | `web-8-systems` | Systems Design for People Who Ship | Queues, idempotency, consistency models, rate limiting, background jobs, the failure modes of the six architectures everyone reaches for. |

## 2. Markets & Money (`markets`)

Two courses, and a gap in the middle: you can read a chart and run a household budget, but nothing teaches you to read a company or size a position.

| # | id | Title | Scope |
|---|---|---|---|
| 1 | `personal-finance` *(exists)* | Personal Finance: A Quantitative Foundation | — |
| 2 | `mkt-2-statements` | Reading Financial Statements | Accrual accounting from first principles, the three statements and how they tie, working capital, cash conversion, the ten most common ways statements mislead. |
| 3 | `stock-charts` *(exists)* | Reading Stock Charts | — |
| 4 | `mkt-4-valuation` | Valuation & Company Analysis | DCF and its sensitivity, multiples and their abuse, cost of capital, moats, scenario and reverse-DCF thinking, when valuation is the wrong tool. |
| 5 | `mkt-5-portfolio` | Portfolio Construction & Risk | Variance and correlation, diversification arithmetic, position sizing, Kelly and why nobody uses full Kelly, drawdown, rebalancing, factor exposure. |
| 6 | `mkt-6-derivatives` | Options & Derivatives | Payoff diagrams, put-call parity, Black-Scholes as a model with assumptions, the Greeks as sensitivities, covered calls and cash-secured puts, how retail loses money on options. |
| 7 | `mkt-7-macro` | Macro for Investors | Rates and the yield curve, inflation measurement and its disputes, central bank mechanics, currency, credit cycles, why macro forecasting has a poor record. |
| 8 | `mkt-8-behaviour` | Behavioural Finance & Decision Errors | Prospect theory, base rates, overconfidence, narrative, the replication problems in the field itself, and process-based countermeasures. |

## 3. Communication & Influence (`influence`)

One course. The strongest candidate for expansion because every other track benefits from it.

| # | id | Title | Scope |
|---|---|---|---|
| 1 | `inf-1-argument` | Argument, Evidence & Clear Thinking | Claim structure, validity vs soundness, fallacies as failure patterns, evidence quality, steelmanning, calibration and updating. |
| 2 | `everyday-negotiation` *(exists)* | Everyday Negotiation | — |
| 3 | `inf-3-writing` | Writing to Be Read | Sentence-level craft, the paragraph as a unit of argument, structure, editing as a discipline, writing for a specific reader, email and memo forms. |
| 4 | `inf-4-speaking` | Speaking: Delivery, Structure & Nerves | Talk architecture, the physiology of stage fright, voice and pace, slides that help, Q&A, adapting to a hostile room. |
| 5 | `inf-5-persuasion` | Persuasion: What the Evidence Supports | Elaboration likelihood, source credibility, framing, social proof and its limits, inoculation, backfire effects and what replicated. |
| 6 | `inf-6-difficult` | Difficult Conversations & Conflict | Feedback, apology, boundary setting, mediating between two other people, conflict in writing, repair after rupture. |
| 7 | `inf-7-narrative` | Narrative & Storytelling | Story structure, character and stakes, the anecdote as evidence and its dangers, pitching, case-making with a story spine. |
| 8 | `inf-8-highstakes` | High-Stakes & Multi-Party Negotiation | Coalitions, agents and constituencies, sequencing, cross-cultural difference, written deal terms, walk-away discipline. |

## 4. Directing & Cinematography (`film`)

Five well-scoped courses already defined and none built. Two additions would close the gaps between "shoot it" and "finish it."

| # | id | Title | Status |
|---|---|---|---|
| 1 | `film-1-visual-language` | Visual Language & Composition | defined, not built |
| 2 | `film-2-camera-lens-exposure` | Camera, Lens & Exposure | defined, not built |
| 3 | `film-3-lighting-color` | Lighting & Colour | defined, not built |
| 4 | `film-4-directing-actors-staging` | Directing Actors & Staging | defined, not built |
| 5 | `film-5-production-post` | Production & Post | defined, not built |
| 6 | `film-6-screenwriting` | Screenwriting & Story Structure | **suggested** — scene construction, structure, dialogue, rewriting, format as a production document |
| 7 | `film-7-producing` | Producing: Schedule, Budget & Legal | **suggested** — breakdown, boards, budgeting, permits, releases, insurance, the paperwork that makes a shoot legal |

## 5. Audio Engineering (`audio`)

Five defined, one built. Two additions round it out into a working engineer's path.

| # | id | Title | Status |
|---|---|---|---|
| 1 | `audio-1-acoustics` | Acoustics & Audio Signal Fundamentals | **built** |
| 2 | `audio-2-microphones` | Microphones & Recording | defined, not built |
| 3 | `audio-3-mixing` | Mixing | defined, not built |
| 4 | `audio-4-effects` | Effects & Processing | defined, not built |
| 5 | `audio-5-mastering` | Mastering | defined, not built |
| 6 | `audio-6-live` | Live Sound & System Tuning | **suggested** — gain structure, feedback, line arrays, measurement and time alignment, monitor mixing, the room as the hardest variable |
| 7 | `audio-7-post` | Sound for Picture | **suggested** — dialogue editing, ADR, Foley, ambience, the loudness standards, mixing to a picture lock |

## 6. Survival: Wilderness, Sea & Systems Collapse (`survival`)

Eight courses fully specced in `SURVIVAL-TRACK-PROMPT.md`, none built. No changes recommended — the scope is already right.

`surv-1-physiology`, `surv-2-core-craft`, `surv-3-medicine`, `surv-4-navigation`, `surv-5-food`, `surv-6-environments`, `surv-7-sea`, `surv-8-collapse`

---

# Part 2 — New specializations, ranked by fit

These are ordered by how well they connect to what already exists. The first four share graduates with current tracks; the later ones open new ground.

## A. Mathematics from the Ground Up (`math`)
*The feeder track. Markets, data, audio and survival all quietly assume it.*

| # | id | Title |
|---|---|---|
| 1 | `math-1-arithmetic-algebra` | Number, Algebra & the Habit of Proof |
| 2 | `math-2-functions` | Functions, Graphs & Trigonometry |
| 3 | `math-3-calculus-1` | Calculus I: Limits, Derivatives & Rates of Change |
| 4 | `math-4-calculus-2` | Calculus II: Integration, Series & Differential Equations |
| 5 | `math-5-linear-algebra` | Linear Algebra: Vectors, Matrices & Transformations |
| 6 | `math-6-probability` | Probability: Randomness, Distributions & Expectation |
| 7 | `math-7-statistics` | Statistical Inference & Experimental Design |
| 8 | `math-8-discrete` | Discrete Mathematics: Logic, Sets, Graphs & Combinatorics |

## B. Data, Statistics & Machine Learning (`data`)
*Bridges software and markets. The single most requested adult-learning subject there is.*

| # | id | Title |
|---|---|---|
| 1 | `data-1-python` | Python for Working with Data |
| 2 | `data-2-wrangling` | Data Wrangling: Cleaning, Joining & Reshaping |
| 3 | `data-3-visualization` | Visualising Data Honestly |
| 4 | `data-4-inference` | Inference in Practice: Uncertainty, Tests & Their Misuse |
| 5 | `data-5-ml-foundations` | Machine Learning Foundations: Regression, Trees & Ensembles |
| 6 | `data-6-evaluation` | Model Evaluation, Leakage & Deployment |
| 7 | `data-7-deep-learning` | Neural Networks & Deep Learning |
| 8 | `data-8-ethics` | Data Ethics, Privacy & Harm |

## C. Business & the Small Firm (`business`)
*Sits directly between Markets and Influence and completes a triangle.*

| # | id | Title |
|---|---|---|
| 1 | `biz-1-models` | Business Models & Unit Economics |
| 2 | `biz-2-accounting` | Bookkeeping & Accounting for Owners |
| 3 | `biz-3-customers` | Finding Customers: Research, Positioning & Pricing |
| 4 | `biz-4-sales` | Sales & the Pipeline |
| 5 | `biz-5-operations` | Operations, Systems & Hiring the First People |
| 6 | `biz-6-legal` | Structure, Contracts & Risk |
| 7 | `biz-7-growth` | Growth, Retention & Measurement |

## D. Health, Training & Human Performance (`performance`)
*Shares its physiology spine with Survival course 1.*

| # | id | Title |
|---|---|---|
| 1 | `hp-1-physiology` | Human Physiology for Training |
| 2 | `hp-2-strength` | Strength: Programming, Technique & Progression |
| 3 | `hp-3-endurance` | Endurance: Energy Systems & Periodisation |
| 4 | `hp-4-nutrition` | Nutrition Science and What It Actually Supports |
| 5 | `hp-5-sleep-recovery` | Sleep, Stress & Recovery |
| 6 | `hp-6-injury` | Injury, Pain & Return to Training |
| 7 | `hp-7-behaviour` | Behaviour Change That Lasts |
| 8 | `hp-8-lifespan` | Training Across a Lifespan |

## E. Photography & the Still Image (`photo`)
*Shares optics and lighting with Film 2 and 3; a natural second track for anyone who finishes those.*

| # | id | Title |
|---|---|---|
| 1 | `photo-1-optics` | Light, Optics & Exposure |
| 2 | `photo-2-composition` | Composition & Seeing |
| 3 | `photo-3-lighting` | Lighting: Natural, Continuous & Flash |
| 4 | `photo-4-colour` | Colour, Raw & the Digital Negative |
| 5 | `photo-5-editing` | Editing & the Developed Image |
| 6 | `photo-6-genres` | Portrait, Landscape, Street & Documentary |
| 7 | `photo-7-projects` | The Photographic Project: Edit, Sequence & Print |

## F. Musicianship: Theory, Ear & Composition (`music`)
*The other half of Audio. Audio Engineering teaches you to capture sound; this teaches you what to capture.*

| # | id | Title |
|---|---|---|
| 1 | `mus-1-fundamentals` | Rhythm, Pitch & Notation |
| 2 | `mus-2-harmony` | Harmony: Intervals, Chords & Function |
| 3 | `mus-3-ear` | Ear Training & Transcription |
| 4 | `mus-4-form` | Form, Arrangement & Orchestration |
| 5 | `mus-5-composition` | Composition & Songwriting |
| 6 | `mus-6-production` | Production: Arrangement in the DAW |
| 7 | `mus-7-traditions` | Harmony Beyond the Common Practice: Jazz, Modal & Non-Western |

## G. The Systems of a House (`house`)
*Pairs with Survival 8 (systems collapse) and stands on its own as the most immediately useful thing on this page.*

| # | id | Title |
|---|---|---|
| 1 | `house-1-structure` | Structure: Loads, Framing & Foundations |
| 2 | `house-2-electrical` | Residential Electrical Systems |
| 3 | `house-3-plumbing` | Water, Drainage & Plumbing |
| 4 | `house-4-hvac` | Heat, Ventilation & Moisture |
| 5 | `house-5-envelope` | The Building Envelope: Insulation, Air & Water Control |
| 6 | `house-6-diagnosis` | Diagnosing a Building: What the Symptoms Mean |
| 7 | `house-7-projects` | Planning Work: Permits, Trades, Cost & Sequence |

## H. Electronics, Radio & Embedded Systems (`electronics`)
*Touches Software, Audio and Survival simultaneously — the most connected of the new tracks.*

| # | id | Title |
|---|---|---|
| 1 | `elec-1-circuits` | Circuits: Voltage, Current & Analysis |
| 2 | `elec-2-components` | Components: Semiconductors, Op-Amps & Power |
| 3 | `elec-3-digital` | Digital Logic & Microcontrollers |
| 4 | `elec-4-embedded` | Embedded Programming & Sensors |
| 5 | `elec-5-rf` | Radio: Propagation, Antennas & Practical Comms |
| 6 | `elec-6-build` | Building It: PCBs, Soldering, Enclosures & Test |
| 7 | `elec-7-power` | Off-Grid Power: Batteries, Solar & Charge Control |

## I. Psychology, Learning & Decision-Making (`mind`)
*Deepens Influence and Markets, and is quietly self-referential for a learning app.*

| # | id | Title |
|---|---|---|
| 1 | `mind-1-methods` | How Psychology Knows What It Knows |
| 2 | `mind-2-cognition` | Attention, Perception & Cognition |
| 3 | `mind-3-memory` | Memory & the Science of Learning |
| 4 | `mind-4-decision` | Judgement & Decision-Making |
| 5 | `mind-5-emotion` | Emotion, Motivation & Self-Regulation |
| 6 | `mind-6-social` | Social Psychology & Group Behaviour |
| 7 | `mind-7-clinical` | Clinical Literacy: Disorders, Treatment & Evidence |

## J. Food: Cooking, Preservation & the Science of Heat (`food`)
*Shares a border with Survival 5 (wild food) and Survival 8 (no refrigeration).*

| # | id | Title |
|---|---|---|
| 1 | `food-1-heat` | Heat, Transfer & What Cooking Does |
| 2 | `food-2-technique` | Knife Work, Stock & Foundational Technique |
| 3 | `food-3-flavour` | Flavour: Salt, Acid, Fat, Aroma & Balance |
| 4 | `food-4-baking` | Baking Chemistry: Gluten, Leavening & Sugar |
| 5 | `food-5-fermentation` | Fermentation & Culturing |
| 6 | `food-6-preservation` | Preservation: Curing, Canning, Drying & Cold |
| 7 | `food-7-protein` | Whole Animal, Whole Plant: Butchery & Utilisation |
| 8 | `food-8-kitchen` | Running a Kitchen: Menu, Cost & Timing |

---

# Part 3 — Second tier, sketched only

Reasonable tracks that I would not start until the ones above have real courses in them.

- **Philosophy, Logic & Ethics** (`philosophy`) — logic, epistemology, metaphysics, ethics, political philosophy, philosophy of mind, philosophy of science
- **Security, Privacy & Defensive Computing** (`security`) — networks, cryptography, threat modelling, personal opsec, incident response, secure architecture. Defensive framing throughout
- **Writing & Publishing** (`writing`) — long-form craft, research, structure, revision, the publishing business. Overlaps Influence 3 and 7; only worth splitting out if Influence proves popular
- **Automotive & Small Engines** (`mechanical`) — four-stroke theory, diagnosis, electrical, brakes and suspension, maintenance economics. Strong pairing with House and Survival
- **Growing Food** (`garden`) — soil science, propagation, season extension, pests, water, seed saving, scale. The natural fourth leg of Survival + House + Food
- **The Modern World: Economic & Political History** (`history`) — a survey track. High effort to do well, low overlap with anything built
- **Design & Typography** (`design`) — type, grid, colour, hierarchy, systems, interface design. Overlaps Web 3 and Photography

---

# Part 4 — The recommendation you didn't ask for

Nineteen defined courses currently lead nowhere. Everything in Parts 1 and 2 above adds up to roughly **110 courses, or 4,400 hours of written material**. That is not a backlog, it's a decade.

Three ways to think about sequencing:

**Depth first.** Pick one existing track — Markets is the obvious candidate, since it already has two real courses and a clear gap in the middle — and build it to completion. A finished eight-course specialization with a program certificate at the end is a genuinely different product from six half-tracks. It also proves the whole system end to end: milestones, credits, the transcript, the program certificate.

**Breadth first.** Build course 1 of every track so nothing in the store is a dead end, then let usage tell you which track to finish. Cheaper per track, and it turns the store into an honest menu rather than a set of promises.

**Cut back.** Six specializations and five courses is a ratio that reads as abandonment. Hiding Film and Survival until their first two courses exist would make the app look finished rather than started, at the cost of the ambition being visible.

My own preference is a hybrid: **finish Markets, ship course 1 of Survival and Film so those two stop being empty, and hold every new specialization in Part 2 until then.** Survival first among the new work, because it is the most distinctive thing here — nobody else in the category is teaching heat balance arithmetic — and distinctiveness is worth more than coverage when the library is small.

One structural note for whenever you do expand: a course id can appear in more than one track's `courseIds`. `math-7-statistics` belongs in both Mathematics and Data; `hp-1-physiology` could serve Health and Survival. Sharing courses across tracks cuts the real build cost well below the 110 figure above, and it makes the specializations feel like a connected curriculum rather than six silos.
