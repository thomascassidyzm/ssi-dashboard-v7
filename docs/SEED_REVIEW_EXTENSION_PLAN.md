# Implementation Plan — Extend Spaced Repetition Past End of Fibonacci Series (Use-Phrase → Parent Seed)

Status: **PLAN ONLY — no code changed.** Date: 2026-06-28

## TL;DR / Headline finding

**The Fibonacci review-scheduler runtime does not live in this repository.**
`/Users/tomcassidy/SSi/SSi_Course_Production` is the **content-production pipeline** only — it
generates SEED_PAIRS → LEGO_BREAKDOWN (LEGOs + FEEDERs) → practice/use-phrases and writes them to
the VFS (`vfs/courses/<course>/*.json`). There is no learner-facing review loop, no decay series
(1,2,3,5,8…89), and no per-learner scheduling state anywhere under `~/SSi`. I searched the whole
tree for `fibonacci|decay|schedul|review|interval|144|233|next-review` and found only content-gen
references (e.g. "double-layer spaced repetition" as a *design concept* in MCP prompts), never an
implemented scheduler.

**Conclusion:** Deliverables (1) and (3)'s "where the scheduling logic lives" cannot be satisfied
from this repo. The scheduler is in a **separate, not-checked-out app** (the SSi learner client —
iOS/web). Before any code work, we need that repo. Everything below is therefore split into:
- **Part A — facts confirmed from THIS repo** (LEGO-ID → seed encoding, data shapes). Solid.
- **Part B — the change design**, written against the scheduler interface as it must exist, to be
  bound to concrete files once the learner-app repo is located.

---

## Part A — Confirmed facts (this repo)

### A1. LEGO ID encodes its parent seed trivially (Deliverable 2 — CONFIRMED)
The canonical UID format is specified in
`ssi-dashboard-v2/src/utils/phase-prompts.js:62-115` and realized in the VFS data
(`vfs/courses/eng_for_fra_speakers/LEGO_BREAKDOWN_BATCH_001.json`):

- LEGO ID:   `S0001L03`  → `S` + 4-digit seed number + `L` + 2-digit LEGO index
- FEEDER ID: `S0001F01`  → same, `F` for feeder
- Seed ID:   `S0001`

So the **parent seed id is literally the first 5 characters of the LEGO id** (regex
`^(S\d{4})(?:L|F)\d{2}$`, group 1). No lookup table needed to get the seed *id*. To get the seed
*sentence text*, read the breakdown record that carries it:

```json
{
  "seed_id": "S0001",
  "original_target": "I want to speak English with you now.",   // <- full parent seed (target)
  "original_known":  "Je veux parler anglais avec toi maintenant.", // <- full parent seed (known)
  "lego_pairs": [ { "lego_id": "S0001L03", "target": "I want", "known": "Je veux" }, ... ]
}
```

Three interchangeable sources for the seed sentence, in order of preference:
1. `LEGO_BREAKDOWN_*.json` → `lego_breakdowns[].{original_target, original_known}` keyed by `seed_id`
   (this is what the learner app already loads to get the LEGOs, so the seed text is in-hand).
2. `SEED_PAIRS*.json` for the course (same `seed_id`).
3. `canonical_seeds.json` keyed by `"0001.0"` — language-agnostic template with `{target}`
   placeholders; least preferred (needs target-name substitution, English-known only).

> Note on "DK": per Tom, any "DK" in old notes is a Siri speech-to-text artifact. There is no DK
> system — it is purely the Fibonacci decay series. Ignore "DK" entirely.

### A2. What a "review item" is today
Today the review item rendered while a LEGO is in the series is one of the LEGO's **use-phrases**
(a.k.a. practice phrases / PHRASE_VARIATIONS), generated per-LEGO by the production pipeline. The
new behavior swaps that payload for the **full parent seed sentence** at the end-of-series
transition. Both the use-phrase and the seed sentence are already-produced content — this change is
about *which* string the scheduler attaches to a review occurrence, not about generating new content.

---

## Part B — The change design (bind to scheduler repo once located)

The scheduler, wherever it lives, must have these three seams. The plan targets them by role:

- **(S) Series/decay table** — the array `[1,2,3,5,8,13,21,34,55,89]` and the function that, given a
  LEGO's current step index, returns the next interval and advances the index.
- **(T) Transition / item-selection** — the code that, for a due LEGO, decides *what to show*
  (currently: pick a use-phrase).
- **(P) Per-LEGO review state** — the record holding `legoId`, current step index, next-due time.

### B1. Extend the series (Deliverable 3a)
Append the next Fibonacci terms after 89: `…, 89, 144, 233, 377, 610, …`. Decide the cap explicitly
(open-ended vs. fixed terminal term). Recommendation: keep the same generator and add a **terminal
behavior** — when the index would exceed the last term, *clamp at the last term and repeat it*
(steady-state long interval) rather than stop scheduling. Confirm desired cap with Tom; the current
"ends at 89" is the thing we're removing.

### B2. Switch the review item at the threshold (Deliverable 3b)
Define the threshold as **"the step index has reached the position of 89" (the old final term)**.
For every scheduled review at step ≥ that position:
- `reviewItem = seedSentenceFor(legoId)` instead of `pickUsePhrase(legoId)`.

`seedSentenceFor(legoId)`:
```
seedId = legoId.slice(0,5)            // or regex ^(S\d{4}) — A1
record = breakdownIndex[seedId]       // already loaded by the app
return { target: record.original_target, known: record.original_known, seedId }
```
This is a pure, side-effect-free helper; add it next to the existing `pickUsePhrase` in seam (T).
**Boundary decision to confirm:** does the review *at* step-89 still show a use-phrase, with seeds
starting at 144? Or does step-89 itself already show the seed? Recommendation: seed begins at the
**first review scheduled at or after 89** (i.e. the 89-review is the last use-phrase; 144 onward are
seeds) — matches "once a LEGO *reaches the end* of the series, every *subsequent* review switches."
Make this an explicit constant (`SEED_PHASE_START_INDEX`) so it's a one-line change either way.

### B3. Continue scheduling on extended steps (Deliverable 3c)
No special-casing: the same "advance index → look up next interval" loop runs; it now reads the
extended table (B1) and the item-selector (B2) returns a seed instead of a phrase. The scheduler's
due-date math is unchanged. Persist the step index past 9 (the old 89 index) in seam (P) — verify
the state field isn't a fixed-width enum / capped int that silently saturates at the old final step.

### B4. Clustering is expected (per Tom)
Because LEGOs cross the threshold one after another (they entered the series in order), seed-sentence
reviews will naturally appear a few-in-a-row. This is desired — **do not** add de-clustering /
interleaving logic. If the existing scheduler already shuffles same-due items, leave it; just don't
add new spreading specifically to break up seeds.

---

## Edge cases past 89 (Deliverable 4)

1. **Index overflow / saturation** — old code may assume max index = position of 89. Audit the step
   field's type and any `min(index, LAST)` clamps; these will pin every LEGO to 89 forever and
   silently defeat the feature. Highest-risk item.
2. **Boundary off-by-one** — exact definition of "reached the end" (B2). One constant; confirm with Tom.
3. **Seed text missing / not loaded** — a LEGO whose breakdown record isn't in memory (lazy-loaded
   course, archived batch). `seedSentenceFor` must fail loud or fall back to SEED_PAIRS/canonical,
   not render an empty card. Add a guard.
4. **FEEDER ids** — `S0001F01`. Confirm whether feeders are independently scheduled. The `slice(0,5)`
   rule still yields the right seed, but verify feeders are *supposed* to flip to the seed too (they
   may never enter the long-tail series at all).
5. **Multi-LEGO seeds / which seed** — a seed has many LEGOs; each LEGO independently flips to *the
   same* parent seed sentence. Expected (that's the clustering source), but means the same seed
   sentence can be due several times close together. Confirm no dedup is wanted (Tom says clustering
   is desired → no dedup).
6. **Seed already seen as its own item?** — if seeds are themselves scheduled entities elsewhere,
   make sure a LEGO-flipped-to-seed review and a native seed review don't double-count / conflict in
   state. Needs checking in the real scheduler.
7. **Interval growth / notification cadence** — 144/233/377 days (if intervals are days) push reviews
   years out. Confirm the unit and whether a terminal cap (B1) is needed so reviews don't effectively
   never recur.

---

## Concrete, file-level implementation plan (Deliverable 5)

**Phase 0 — Locate the scheduler (BLOCKER, do first).** It is not in `~/SSi`. Get the learner-app
repo path/URL from Tom (likely the iOS/web client). Grep there for `1, 2, 3, 5, 8` / `89` /
`nextReview` / `interval` to find seams (S), (T), (P). The plan below is the template to apply there.

**Phase 1 — Series table (seam S).**
- Extend the Fibonacci array to include `144, 233, 377, …` (chosen cap per B1).
- Add `SEED_PHASE_START_INDEX` = index of `89` (the old final term).
- Add terminal-step behavior (clamp-and-repeat vs. stop).

**Phase 2 — Seed helper (new, alongside seam T).**
- Add `seedSentenceFor(legoId)` per A1/B2: `legoId.slice(0,5)` → breakdown record →
  `{target: original_target, known: original_known}`. Pure function + missing-record guard (edge 3).
- Unit test: `S0001L03` → seed `S0001` → "I want to speak English with you now." /
  "Je veux parler anglais avec toi maintenant." (data already in
  `vfs/courses/eng_for_fra_speakers/LEGO_BREAKDOWN_BATCH_001.json`).

**Phase 3 — Item selection (seam T).**
- In the due-LEGO render path: `if (stepIndex >= SEED_PHASE_START_INDEX) item = seedSentenceFor(legoId); else item = pickUsePhrase(legoId);`

**Phase 4 — State persistence (seam P).**
- Verify step-index storage holds values past the old max; widen field / remove clamp if needed (edge 1).
- Migration: existing learners already at step 89 should flip to seed on their *next* review — confirm
  no migration needed beyond the wider field (they just continue).

**Phase 5 — Tests & verify.**
- Unit: series extension, threshold boundary (88→89→144), `seedSentenceFor`, missing-record fallback.
- Integration: simulate a LEGO advancing 89→144→233 and assert payload flips phrase→seed and
  due-dates follow the extended intervals.
- Manual: confirm seed clustering appears and is *not* de-clustered (B4).

**No content-pipeline changes in this repo are required.** This repo already emits everything the
scheduler needs (seed sentences via `original_target`/`original_known`, LEGO ids that encode the
seed). The work is entirely in the learner-app scheduler.

## Open questions for Tom
- Where is the scheduler repo? (hard blocker)
- Interval unit (days?) and whether the extended series should be capped/looped or open-ended.
- Boundary: is the 89-step review the last use-phrase, or already the first seed? (B2)
- Do FEEDERs participate in the long-tail series, or LEGOs only? (edge 4)
