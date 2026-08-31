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
