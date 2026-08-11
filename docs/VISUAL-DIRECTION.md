# What I'd change about how Oboros looks

You asked me to look at this as someone who does this for a living and say what I'd change. Below is that, with the app's own numbers as evidence rather than adjectives. I measured every rendered element across nine screens to get them.

**Bias disclosure:** I built most of what I'm criticising. Where a finding is measurement I say so; where it's taste I say that too.

---

## The thing you spotted is a pattern, not a screen

You said the quests looked bigger than the "Today's Quests" card. They were. A section header was a full card — panel fill, border, shadow, 14px radius — sitting above items that were also full cards, at the same width, *outside* it. The label for a group weighed more than the group, and nothing looked contained.

That was true on every collapsible section in the app: home, library, rewards, settings, specialization pages, the module page. A label is now a label — small, uppercase, sitting on the page — and the cards below it are the content. It's one CSS change and it fixes the hierarchy everywhere at once.

Worth naming the general rule, because it will come up again: **a container may hold cards, or be a card, but not both.** Nesting a card inside a card of the same weight destroys the reading order.

---

## What the measurements say

I counted every distinct value the app actually renders, not what the stylesheet intends:

| | Rendered | What it should be |
|---|---|---|
| Type sizes | **18** | 6 |
| Font weights | 5 | 3 |
| Corner radii | **13** | 3 |
| Surface colours | **24** | 5 |
| Distinct shadows | 11 | 3 |
| Text colours | 15 | 4 |

Two of those are worth dwelling on.

**Everything is bold.** Weight 800 appears on 295 elements. Weight 400 — normal body text — appears on 148. The app is more than twice as bold as it is regular. That's why it reads busy even when a screen is well laid out: when every label shouts, the eye has nothing to rank. Current practice is close to the opposite — one heavy element per view, body at 400–500, and hierarchy carried by *size and colour* rather than weight. This is probably the single highest-impact change available, and it costs nothing but nerve.

**The interface is mostly grey.** The muted tone (`#98a1b2`) is used on 482 text elements; the primary ink (`#e9ebf1`) on 210. More than two thirds of the words on screen are dimmed. That reads as tentative. Muted should be for genuinely secondary information — timestamps, counts, helper text — not for half of everything.

---

## Where it's behind current practice

I read what's actually being written about mobile UI now rather than going on instinct. Four things stood out as relevant; three others I'd deliberately ignore.

**Uniform stacks are out of favour, and this app is 100% uniform stacks.** Every screen is a vertical run of same-width rows. The current direction is [bento-style modular layouts](https://www.abdulazizahwan.com/2026/02/beyond-the-glass-7-mobile-ui-trends-defining-2026.html) — a large block for the primary thing, smaller adjacent tiles for the secondary ones — precisely because it gives the eye somewhere to land. The Rewards hero is the only screen in Oboros with a focal element, and it's the only screen that feels designed rather than assembled. Home is the obvious candidate: today's ring as one large tile, the streak and next-up as two smaller ones beside it.

**The base is nearly black.** `#0b0d13`. The current thinking, sometimes called [ambient mode](https://www.abdulazizahwan.com/2026/02/beyond-the-glass-7-mobile-ui-trends-defining-2026.html), is to replace near-black with a deeper, slightly chromatic dark — midnight blue, charcoal, forest — both because it avoids OLED smearing on scroll and because near-black gives elevation nothing to work with. Every surface above it has to carry the whole burden of depth. Warming the base by a few points of chroma would make the existing panels read as layers rather than as patches.

**Depth is decorative, not structural.** The guidance now is [three explicit layers](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/) — base, raised, overlay — each with a defined shadow and radius, where elevation *signals priority*. Oboros has 11 shadows and 13 radii distributed by whim. Collapsing those to three tiers with a rule about which one means what would do more for perceived quality than any new visual flourish.

**Translucency should be surgical.** Glass belongs on overlays and floating panels and nowhere else. Oboros gets this roughly right already — the top bar, the tab bar, the figure viewer — but the tutor sheet and the sticky action could carry it and largely don't.

Three things I'd deliberately **not** chase: neo-brutalism (wrong register for a study app — it's designed to be looked at, not read), voice-first visuals (no voice surface here), and generative/adaptive UI that rearranges itself (an app whose selling point is that it's honest and predictable shouldn't move its own furniture).

---

## The brand is doing almost no work

You have an ouroboros forming an apple. It's a genuinely good mark — a closed loop that's also a progress meter, which is a rare piece of luck. It currently appears as a wordmark and as the progress ring.

It could be much more. Course covers are deterministic gradient rectangles: every course looks like every other course, and a library of them is a wall of coloured slabs. The mark could generate them — a coil at a different angle, tension, and thickness per course, seeded the same way the gradients are now. Empty states could use it uncoiled. The certificate could emboss it. None of this is expensive; it's the same `hashStr` seed feeding a different drawing.

---

## Motion is doing the minimum

There are four transitions in the app and they're all correct — the ring drawing in, rows settling, the sheet springing, press feedback. What's missing is **consequence**. Nothing happens when you close the day's ring. Nothing happens when a quest completes or a module passes. The current writing on this is emphatic that micro-interaction is where personality lives, and a study app that never acknowledges an achievement is leaving the cheapest emotional beat on the table. Three moments would do it: the ring closing, a quest ticking over, and a module going from locked to passed.

---

## What I'd do, in order

1. **Cut the type scale to six sizes and cap body weight at 700.** Reserve 800 for one element per screen. Measured, mechanical, and the biggest single improvement available.
2. **Rebalance ink against muted.** Titles and primary content go to full ink; muted keeps counts, timestamps and helper text.
3. **Collapse 13 radii to three and 11 shadows to three tiers**, with a stated rule for what each tier means.
4. **Give home a focal layout** rather than another uniform stack.
5. **Warm the base** off near-black.
6. **Let the mark generate the cover art.**
7. **Three celebration moments.**

One through three are a day's work and would change how the whole app feels. Four through seven are the interesting ones.

---

## Sources

- [What's changing in mobile app design: UI patterns that matter in 2026](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/) — Muzli, on elevation as hierarchy, three-layer depth, thumb reach, and what's being abandoned
- [Beyond the Glass: 7 Mobile UI Trends Defining 2026](https://www.abdulazizahwan.com/2026/02/beyond-the-glass-7-mobile-ui-trends-defining-2026.html) — on bento layouts, ambient dark backgrounds, and emotional micro-interaction
- [Top Mobile App UI/UX Design Trends](https://zealousys.com/blog/top-mobile-app-ui-ux-design-trends/) — general survey
