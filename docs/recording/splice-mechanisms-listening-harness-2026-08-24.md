# Two splicing mechanisms, put in front of an ear

24 August 2026. Kai asked to hear both splicing mechanisms on real audio before
deciding whether to undo the pause mechanism. This is the record of what was
built, what the material could and could not support, and the numbers underneath
the listening page.

**Listening page:** `/evidence/splice-mechanisms-listen-2026-08-24/index.html`
on the Command Surface.

No TTS. No database writes. No S3 writes. Sascha Wanasky's `deu_at_for_eng`
takes were downloaded read-only and cut on copies.

---

## 1. There are not two cutters. There is one cutter and two piece sizes.

The brief guessed at "a pause-based mechanism" and "a newer two-pool mechanism
that extracts segments differently". That is close but not right, and the
difference matters for what Kai is being asked to decide.

Reading the shipped code (`services/voice-engine/align.cjs`,
`services/voice-engine/splicer.cjs`, `services/recording-pools.cjs`):

**There is exactly one cutter and exactly one concatenator, and the two-pool
work did not replace either.** `align.cjs` runs ffmpeg `silencedetect` over the
SLOW take, maps the voiced runs one-to-one onto the `chunksString` the recording
script asked for, and cuts. `splicer.cjs` loudness-normalises each piece and
concatenates. Both paths on the listening page go through those same two files.

What the two-pool redesign of 2026-08-22 changed is **how big a piece is allowed
to be**:

| | today's live path ("TIGHT") | the two-pool path ("GENEROUS") |
|---|---|---|
| piece size | one per LEGO chunk; may be a single word | fewest pieces of ≥ `minPieceWords` words |
| where it comes from | `chunksString`, straight | `buildPoolB` in `recording-pools.cjs` |
| depth on the full course | worst case 14 pieces | worst case 6 pieces |
| what the recordist does | stops at every LEGO boundary | reads most lines straight through |

So the honest framing for Kai is: **the pause mechanism is not a separate
splicer he can delete. It is the instrument that produces the boundaries the one
splicer needs.** Undoing it does not swap in a different cutter; it changes how
many pieces the same cutter takes, and how many lines get recorded whole
instead.

There is a third thing that is genuinely not splicing at all, and it should not
be confused with either: **Pool A**, the isolated one-per-teaching-unit read.
It is tagged `cadence: 'isolated'`, is dropped from take grouping in
`provenance-adapter.cjs`, and can never reach the segment store. It is never
spliced, by construction.

### One thing found in passing, worth a line

`chunk_boundaries_ms` — the recordist's own pause timings, captured live by the
Autocue Studio (`AutocueStudio.vue:957`) and stored on 299 of Sascha's 309
takes — **is written and never read.** `align.cjs` re-derives the boundaries
from scratch with `silencedetect` instead. That is not the cause of anything on
this page, but it is a measured signal being thrown away by the exact code that
then has to guess.

---

## 2. What the material actually is

Live database, not docs. Filtering on `voice_id = human_sasha_wanasky_deu_at`
via `provenance-adapter.cjs`:

| | |
|---|---|
| provenance rows in the table for this course | 331 |
| attributable to Sascha's voice id | 309 |
| superseded by a later retake | 56 |
| **live takes** | **253** |
| clear whole-sentence reads | 226 (225 distinct texts) |
| **slow reads carrying a pause map** | **21** |
| slow reads the shipped aligner could actually cut | **15** |
| distinct cuttable pieces those 15 yield | 211 |

Every one of the 21 slow reads carries a non-empty `chunks_string`, which
matches the 2026-08-22 claim. The count is much smaller than that day's "60 of
60" because that figure predates the 23 August session and counted rows rather
than live, voice-attributed, un-superseded takes.

**The 23 August session — 244 of the 309 takes — was natural-only.** It produced
almost no new splice material.

---

## 3. What the page puts in front of him

Fifteen sentences, three clips each, blind, randomised, key at the bottom behind
a tap. Clip filenames are opaque hashes; the summary box names the letter only
until the key is opened.

- **many-piece** — the sentence rebuilt from one piece per LEGO chunk (3–7 pieces).
- **two-piece** — the same sentence rebuilt from the fewest pieces of ≥2 words.
- **not glued** — the same sentence, one straight read.

**All three are cut from the same clear take, using boundaries transferred off
the slow take.** That is not a shortcut — it is what `alignTakePair` does in
production. It is also the only way to keep the test fair: sourcing the two
sides from different takes leaves a speed difference that gives the answer away
before the first join is heard. As built, the three clips of a sentence sit
within 471 ms of each other at the worst, and within 120–240 ms typically.

Part 2 is Kai's open sub-question — slow-only — as six blind pairs of whole,
uncut takes: the deliberate slow read against the clear read. Nothing on the
page presents that question as settled.

---

## 4. The numbers underneath

**Depth.** Across the 15 sentences: many-piece makes 56 joins, two-piece makes
15. Typical depth 4–6 pieces against 2.

**Where the cuts land.** In **15 of 15** sentences the aligner could not find the
join points in the clear take on its own (`naturalMethod: 'transferred'` every
time) — the natural micro-pauses never matched the chunk count, so every
boundary is a proportional guess stretched off the slow take. Measured against
the real silences in the clear take:

| | many-piece | two-piece |
|---|---|---|
| cuts made | 56 | 15 |
| median distance from a real gap | 220 ms | 241 ms |
| cuts landing >100 ms inside speech | 44 (79%) | 10 (67%) |

**Read that carefully: the per-cut risk is the same.** The methods do not differ
in how well a cut lands. They differ in how many cuts there are — 56 against 15.
Whether a cut landing inside speech is audible is exactly the question the ear
is for, and the page does not pre-empt it.

**Failure mode: it refuses rather than degrades.** 6 of the 21 slow reads could
not be cut at all — the aligner counted a different number of pauses than the
script asked for and stopped. Five of the six detected one MORE region than
expected; one detected one fewer. That is a safe failure, but it means roughly a
third of the slow-read effort produced nothing spliceable.

---

## 5. The gap, stated plainly

**Every piece on the page was cut out of the very sentence it was glued back
into.** The pieces therefore already agree on pitch, pace and mood, and the
joins Kai hears are the easiest joins either method will ever make. In real use
a piece comes from a different sentence recorded minutes apart, and that is
where a join sounds worst.

This was not a choice. It was attempted and it is not possible on this material:

- of 198 unrecorded phrases in seeds 1–14, **zero** can be assembled entirely
  from the 211 pieces the 15 usable slow reads yield;
- the best any of them manages is **67% of its words covered**; the median is
  **0%**;
- within the 15 sentences themselves, only a handful of pieces had a
  same-text twin in another sentence to borrow from.

That is the 28.3% real-coverage finding of 2026-08-22 made concrete on the audio
rather than on the script. **Sascha's session cannot demonstrate the mechanism it
was recorded for.**

Nothing was substituted to paper over this. A cross-sentence comparison built
from other courses' voices, or from TTS, would have looked like the real thing
and would have poisoned the decision.

**What would close it:** roughly 30–40 slow reads, chosen so that a handful of
target sentences can be built entirely from pieces of *other* lines. That is one
short session, and it would put a real cross-sentence splice in front of him.

---

## 6. How to rebuild it

`node tools/splice-listening-harness/build.cjs` — read-only against the live
database and S3; writes only into the evidence folder and a scratch directory.
Deterministic: the A/B/C order is seeded, so the key is checkable.
