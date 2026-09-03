# The metagraph page — demo-readiness pass

**Date:** 2026-08-31. **Route:** `/canonical/metagraph`. **File:** `src/views/MetagraphView.vue`.
**Why:** Tom is showing this page live to Aran, who has never seen it. The fitness test is his:
*can someone who has never seen it be shown it live, understand what it is showing, and come away
impressed rather than confused.*

This is the **before** list, written from driving the live page — local Vite dev server against the
local Production API on 3470, a real admin session injected, real rows from Supabase — **before**
anything was changed. It is committed ahead of the fixes so the before-state is on the record.

---

## How it was driven

A Playwright harness (`scripts/mg-drive.mjs`, gitignored workspace) mints an admin JWT, injects the
Supabase session into `localStorage`, and then walks the page exactly the way Tom will walk it in
front of Aran: land cold, tap a pod, tap a shape, tap a second shape, tap an outcome, switch overlay
and switch back, tap the sacked slates, and re-render in both light and dark. Every number below is
from the running page, not from the code.

---

## Timings — the "slow" heading is nearly empty

| Action | Measured |
|---|---|
| Cold arrival → graph painted | **290 ms** |
| Cold arrival → pod buttons present | **632 ms** |
| Tap POD 1 → coverage read-out on screen | **483 ms** |
| Tap a shape → panel rendered | ~1.2 s (dominated by the smooth scroll, not the work) |
| Switch overlay, second and later taps | **32–59 ms** |

**Verdict: it is not slow, and no caching work is needed.** The refetch on every overlay tap costs
nothing perceptible against a local API. The one honest risk is the first ~600 ms after a cold load,
during which the pod buttons have not arrived yet — see D2.

---

## SLOW

- **S1.** Nothing perceptible. Recorded so the claim is on the record rather than assumed.

## EMPTY

- **D1 — the page opens with no story.** `active` starts `null`, so cold arrival is "Graph only": a
  grey lattice, no coverage read-out, no red, no green, nothing to talk over. Tom's stated
  requirement is real data on arrival, not a blank.
- **D2 — the overlay picker pops in.** The pod list is fetched on mount, so for the first ~600 ms
  the row of buttons is a single "Graph only". Minor, but it is the first thing Aran sees move.
- **D3 — `podsError` renders a button with no number.** The fallback is a hard-coded POD 1 with
  `lines: null`, which paints an empty gap where a line count belongs. A blank where a number goes
  is exactly the "number that is not real" failure.

## CRYPTIC

- **D4 — the tiles say `pod-0` and the button says `POD 1`.** The same thing has two names on the
  same screen. This is the single most confusing thing on the page.
- **D5 — every read-out is in schema terms.** "18/35 shapes traversed", "9 hit twice+", "125 lines
  unmapped", "0 of 9 outcome shapes delivered", "site present, not delivered". Each is a true
  number with no sentence attached.
- **D6 — the band labels are schema, not meaning.** "CONTAINED AT DEPTH 1", "CONTAINED AT DEPTH 2",
  "NO COMPOSITION EDGE — UNATTACHED TO THE TRANSACTIONAL LATTICE".
- **D7 — the edges carry no meaning.** They are drawn as faint crossing curves with no label, and
  the only explanation is a legend line reading "Edges are composition — contained into container",
  followed by a sentence about a reflexive edge that only means something to whoever wrote the store.
- **D8 — four shape titles are truncated mid-word** by `short()` at 22 characters: "The reported
  claim to…", "Public position-aband…", "The misreading correc…", "Complaint-with-partne…".
- **D9 — the outcome buttons look shuffled.** They render 03, 01, 04, 02, 05, 06, 07, 08, 09. That
  is the store's own declared teaching sequence and is correct — but on screen, with no label, it
  reads as a bug.
- **D10 — survivability reads as raw store text**: "S1 Re-select after a substitute — attemptable
  only if Any ticket (N2, N3). recovery: Once. g59→g60 re-selects. g15 has no uptake at all".

## DEAD-ENDED

- **D11 — the detail panel is ~1,150 px below the graph**, under the whole outcome overlay. Tapping
  a shape scrolls you there, and from there the graph, the pod picker and the breadcrumb are all off
  screen; the only exit is a small grey "close". Tom's requirement is an obvious way back from
  anywhere.
- **D12 — the two sacked slates are dead buttons.** `pod-1 (sacked slate)` and `pod-0.5 (sacked
  slate)` show **0 of 35 shapes traversed and all 35 red** by design — their row numbers collide
  with the graph's by accident. In a demo they are two buttons that invite exactly the wrong
  question and make the page look broken.

## WRONG

- **D13 — the red is telling the wrong story, and this is the most important one.** The store has
  grown since this page shipped: it now holds **35 shapes**, not the 23 the page's own README
  describes. POD 1 now reports **17 never reached** — and on screen that reads as POD 1 failing at
  seventeen things. It is not. Every one of the 17 comes from a *different pod's corpus*:

  | Where the missed shape comes from | Count |
  |---|---|
  | Method Pod | 10 |
  | Talk Bollocks | 6 |
  | Trades | 1 |

  POD 1 walks **all 12 shapes derived from its own corpus and all 6 bound pairs — 18 of 18**. The
  true sentence is "this pod covers everything its own corpus contains, and the shapes it misses are
  other pods' territory", and the page currently makes that impossible to see.
- **D14 — the README on `main` is now stale** against the live page: it says 23 shapes, 5 never
  reached, "the five are exactly N13–N17". The page is right and the README is out of date.
- **D15 — the light-mode legend key for "no overlay" is near-invisible** (a `--surface-2` swatch on
  a light surface).

---

## What is NOT a defect

- **125 of POD 1's 231 lines read as unmapped.** That is a real number and the store's own named gap
  — 16 of 47 complete walks encoded. The page reporting it honestly is correct behaviour. It needs a
  sentence, not a fix, and encoding the remaining walks is work on the store, not on this page.
- **The outcome ordering** (D9) is the store's declared sequence and stays as it is; it needs a
  label.
- **`0 of 9 outcome shapes delivered` for POD 1** is the database's own declaration talking.

---

# AFTER — what was changed

Before/after screenshots, driven live:
**https://watson-1.tail4968cb.ts.net/evidence/metagraph-demo-2026-08-31/index.html**

All of it is front-end: `src/views/MetagraphView.vue`, plus band labels and tile height in
`src/lib/metagraph/layout.js`. No API, no table, no store change, and the page is still read-only.

| Defect | What was done |
|---|---|
| D1 grey on arrival | The page now arrives with **POD 1 already laid over it**. "Graph only" is still one tap. |
| D2 picker pops in | Unchanged — the pod list lands in ~320 ms and the overlay with it. Measured, not assumed. |
| D3 blank line count | The count renders only when it is a real number. |
| D4 `pod-0` vs POD 1 | One name everywhere: tiles, detail panel and picker all say **POD 1**, the Method Pod, Talk Bollocks, the Trades pod. |
| D5 schema read-out | Sentences: "231 lines of script, in 22 scenes · reaches **18 of the 35 shapes** · 9 of them more than once · 17 it never reaches". |
| D6 band labels | "Whole exchanges — nothing else contains these" / "Parts that happen inside the exchanges above" / "Stand-alone shapes — nothing in the graph contains them". |
| D7 edges mean nothing | "Lines read downwards: the shape at the bottom of a line happens *inside* the shape at the top." |
| D8 titles cut mid-word | Titles wrap onto two lines at a space or a hyphen; tile height 56 → 74 to hold them. |
| D9 outcomes look shuffled | Labelled: "Listed in the order the course delivers them, not by number." |
| D10 raw survivability text | "**Re-select after a substitute** — a learner can only attempt *Any ticket* if they can survive this." |
| D11 panel 1,150px down | The detail panel opens **directly beneath the graph**, with a "↑ back to the graph" button that closes it and scrolls back. Verified live: scrollY 830 → 450, panel closed. |
| D12 dead sacked slates | `pod-1` and `pod-0.5` are **not in the picker at all**. |
| D13 the red told the wrong story | Coverage is broken out by where each shape was drawn from, and the page says the true sentence in words. |
| D14 stale README | Updated with a dated correction. |
| D15 invisible light legend key | Given a visible border. |

## The number that now tells the truth

Cold arrival, POD 1:

> POD 1 **12/12** · the Method Pod **0/10** · Talk Bollocks **0/6** · bound pairs **6/6** · the Trades pod **0/1**
> POD 1 reaches **every** shape drawn from POD 1 and bound pairs.

Tap the Method Pod's 43-scene cut and the picture inverts, in the same words:

> POD 1 **5/12** · the Method Pod **10/10** · Talk Bollocks **6/6** · bound pairs **0/6** · the Trades pod **0/1**
> Method Pod — 43 scenes reaches **every** shape drawn from the Method Pod and Talk Bollocks.

That is the demo. It is two taps and it is all real numbers.

## Verified live, after the changes

- Cold arrival: graph painted **319 ms**, coverage read-out **352 ms**. No spinner.
- Overlay switch: **24–44 ms**. No caching needed and none added.
- "↑ back to the graph" closes the panel and returns to the graph.
- Both **light and dark** render correctly — shots of both in the evidence link.
- The five layout tests are green (two of them were already red on `main` against the grown store,
  asserting 23 shapes and a frozen five-member band; they now assert the property, not the list).

## Taste-safe defaults taken — reverse any of these with one word

1. **POD 1 is selected on arrival.** One line in `onMounted`.
2. **`pod-1` and `pod-0.5` are hidden from the picker.** One `HIDDEN` set.
3. **Shapes are named by pod, not by slug** — `pod-0` → "POD 1", `method-pod` → "the Method Pod",
   `talk-bollocks` → "Talk Bollocks", `trades` → "the Trades pod". One `ORIGINS` map.
4. **The never-reached list is grouped** by where each shape came from rather than listed flat.
5. **The unmapped count keeps its sentence and stays on screen** — it is the store's named gap.

## Explicit gaps

- **The `podsError` fallback was verified by reading the code, not by driving it.** Pointing the
  browser at a dead API also blocks Popty's own sign-in, so the page never renders. The fix is one
  guard (`v-if="pod.lines != null"`) and the fallback object it guards, both visible in the diff.
- **Nothing was done to the store.** The 125 unmapped POD 1 lines and the 31 walks not yet encoded
  are work on `services/shared/metagraph/`, out of scope here and correctly reported by the page.
