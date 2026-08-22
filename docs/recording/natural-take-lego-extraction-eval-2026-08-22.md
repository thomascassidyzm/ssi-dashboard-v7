# Can the machine cut LEGOs out of a natural-only take? — 2026-08-22

**Evaluation only. Nothing about how the weekend takes are filed or used was changed, tested against,
or written to.** Sascha's takes stay exactly as shipped: natural pace, one take per line, filed
directly as that line's clip, no chunking and no splicing. This document tests a *separate* question
Tom asked — if the existing splice-and-dice machinery were pointed at those same natural-only takes,
how well would it find the LEGO boundaries?

Answer, up front: **it doesn't find them.** The shipped aligner rejected 100% of the takes at its own
QA gate, and across 88 real LEGO boundaries it proposed only 15 candidate boundaries at all — a
recall ceiling of 17% before accuracy is even asked about. The slow pass is not a refinement on top
of the natural take. It is the only thing in the pipeline that knows where a LEGO ends.

> **Corrected 2026-08-22, after job #913.** An earlier revision of this document reported "0 of 88
> boundaries within 80ms" and "14% of edges clean within 50ms". Both tolerances are finer than the
> measuring instrument can resolve — whisper's own word timings carry ~120–150ms median error on this
> audio. Those two figures have been withdrawn and restated at tolerances the instrument supports.
> The verdict is unchanged, and the finding that carries it (Result 1) never used whisper at all.

---

## What the machinery actually does

`services/voice-engine/align.cjs` is zero-ML. It runs ffmpeg `silencedetect`, inverts the silences
into voiced regions, and maps those regions 1:1 onto the expected chunk list. The **slow take is the
alignment authority**: the recordist pauses between LEGOs, so the pauses *are* the boundaries.

For the natural take it has exactly two paths (`alignTakePair`, steps 2 and 3):

1. **direct** — run the same silence detection on the natural take, and use it if the region count
   happens to equal the chunk count;
2. **transferred** — take the slow take's voiced-duration *proportions* and stretch them over the
   natural take's voiced span.

Path 3 requires a slow take. These weekend takes have none. So the whole natural-only question
reduces to path 2 — plus whatever proportional split you could invent to replace path 3 without a
slow take to take proportions *from*. Both were tested.

`alignTakePair` itself throws without a `slowPath`, so the harness called `alignSlowGapTake` directly
— the identical function `alignTakePair` calls at step 2, with the shipped defaults. Nothing was
stubbed or loosened to make the run happen.

## The sample

26 human takes exist for `deu_at_for_eng` (role `target2`, Sascha, 19–21 Aug). Of those:

| | count | note |
|---|---|---|
| multi-LEGO phrase takes with a canonical chunk map | **17** | the eval set — **105 LEGO slots** |
| single-LEGO course-order items | 4 | one LEGO each; nothing to extract by definition |
| multi-word takes with no chunk map from the current script | 5 | **explicit gap, see below** |

Chunk maps are the canonical ones — `generateRecordingScript('deu_at_for_eng', {role:'target2'})`,
the same producer the autocue reads, matched to each take by normalised text. Chunk counts run 2–9
per phrase.

**Gap I could not close:** 5 multi-word takes (four from 19 Aug, plus "der Bua mit'm grean Leiberl
gfoit ma richtig") do not appear in the current script's 496-phrase set, so they have no canonical
chunk map to score against and are excluded. They are not failures of extraction; they are outside
the measurement. The eval set is 17 takes, not 22.

---

## Result 1 — the shipped aligner: 0 of 17

Running `alignSlowGapTake` on each natural take at shipped defaults (`-35dB`, 150ms minimum silence,
60ms minimum voiced):

| expected chunks | detected voiced regions |
|---|---|
| 2 | 1 |
| 6 | 3 |
| 6 | 1 |
| 9 | 2 |
| 8 | 2 |
| 4 | 1 |
| 6 | 1 |
| 7 | 1 |
| 4 | 1 |
| 4 | 1 |
| 7 | 2 |
| 4 | 1 |
| 8 | 2 |
| 7 | 2 |
| 6 | 4 |
| 9 | 4 |
| 8 | 3 |

**Pass rate: 0/17 (0%).** Every take fails `mapVoicedToChunks` on chunk-count mismatch, which is the
pipeline's deliberate QA gate — "never guess a chunk map". Working as designed. The design just says
this material is not alignable.

A sweep of five silence settings, from `-40dB/200ms` to `-20dB/60ms`, does not rescue it: the best
any single setting managed was **1/17**, and the whole sweep is chasing the wrong signal anyway —
see the next number.

## Result 2 — it doesn't propose enough boundaries to matter

Across the 17 takes the detector proposed **15 internal boundaries**. The takes contain **88 real
internal LEGO boundaries**.

**This is the instrument-free part, and it is the part that counts: even if every one of those 15
were perfectly placed, recall would be 15/88 = 17%.** Five sixths of the LEGO boundaries have no
detectable silence at them at any threshold in the sweep. The pauses a natural take contains are
breaths and hesitations, and they sit where a speaker breathes, not where a LEGO ends.

**How accurate the few it finds are cannot be resolved here.** Restricted to the 14 takes with
trustworthy ground truth, the detector proposed 8 internal boundaries against 69 real ones:

| tolerance | proposed boundaries matching a real one |
|---|---|
| 80ms | 0 of 8 |
| 150ms | 1 of 8 |
| 250ms | 3 of 8 |
| 400ms | 5 of 8 |
| 600ms | 8 of 8 |

Whisper's own error is ~120–150ms median (job #913), so every row above 150ms is at or inside the
noise floor and the 80ms row should not be quoted. The honest reading: at fine tolerance the
detector's boundaries look unrelated to LEGO boundaries, but this evidence cannot prove it, and it
does not need to. A 17% recall ceiling ends the question on its own.

## Result 3 — proportional split, the natural-only stand-in for path 3

Without a slow take there are no proportions to transfer, so the closest honest substitute is to
split the natural take's voiced span by each chunk's own size. Two weightings were scored — by
syllable count and by character count.

Ground truth: whisper-cli word timestamps (`ggml-medium`, `-ml 1 -sow`), mapped onto the dialect
script text by character-level Needleman–Wunsch (whisper returns standard German, the course text is
Austrian, so word-for-word matching is too brittle). Slots whose local alignment identity fell below
0.5 were dropped rather than scored against fiction — see "how far to trust this" below.

**78 LEGO slots — 156 edges — scored, from 14 takes.** Reported only at tolerances above the
instrument's ~145ms noise floor; anything finer is withdrawn.

| edge error | by syllables | by characters |
|---|---|---|
| within 50ms | *(28.8%)* | *(34.0%)* — **below resolution, not reportable** |
| within 150ms | *(59.0%)* | *(57.7%)* — at the noise floor, not reportable |
| within 300ms — 2× noise floor | 80.1% | 76.9% |
| **beyond 300ms — cannot be instrument noise** | **19.9%** | **23.1%** |
| beyond 500ms | 9.6% | 13.5% |
| median | *120ms* | *106ms* — **unresolvable; the true value may be anywhere from ~0 to ~250ms** |
| p75 / p90 / max | 260 / 490 / 1309ms | 283 / 552 / 1562ms |

So the weaker but defensible claim: **roughly a fifth to a quarter of LEGO edges are misplaced by
more than 300ms, and that cannot be blamed on the measuring stick.** The median is genuinely unknown.
An earlier revision's "14% clean / 23% of clips usable" figures rested on a 50ms threshold and are
withdrawn.

### Why that still ends it

The LEGO slots in this sample have a **median true duration of 440ms**; the 10th percentile is 180ms
and the shortest is 75ms. **35 of 105 slots are under 300ms.** An error beyond 300ms is therefore
longer than a whole short LEGO — the clip does not merely clip an onset, it lands on the wrong word.
The splicer's crossfade is 20ms, so there is no seam wide enough to hide any of this in.

The error is also **systematic, not noisy**, and this survives the calibration cleanly:

| position in phrase | mean signed error | standard error |
|---|---|---|
| first quartile | −87ms | ±45ms |
| second quartile | **−263ms** | ±77ms |
| third quartile | **−314ms** | ±74ms |
| fourth quartile | −232ms | ±89ms |

The third quartile sits **more than four standard errors** from zero. Random instrument noise has no
shape and no sign; this has both. A constant whisper lag also cancels here by construction — the
predictions are anchored to whisper-derived `voicedStart`/`voicedEnd`, so shifting every timestamp
moves prediction and truth together.

The model runs early through the middle because both ends are pinned and natural speech is not
uniform: speakers lengthen before a boundary, compress function words, and pause where the
sense-group ends rather than where the LEGO does. There is no weighting that fixes this, because the
information is not in the text.

---

## How far to trust this — the instrument's own limits

Whisper is the measuring stick here, so its failures are stated rather than hidden.

- **3 of 17 takes were excluded** because whisper's own output was not trustworthy:
  - `b84724bc` — decoded 41% of the clip; transcript is the single word "Ups!"
  - `d08cc020` — decoded 37%; transcript is "*lachen*"
  - `65f8618f` — alignment identity 0.38, too low to place boundaries with
- **2 further LEGO slots** were dropped for local alignment identity below 0.5.
- The two undecodable takes are the **two quietest full-sentence takes in the set** (mean −22.2dB
  and −23.5dB against a −16 to −17dB norm). Both carry real voiced energy on `silencedetect`, and
  whisper bails at exactly 2.000s on each, which reads as a decoder giving up rather than a silent
  file. I could not determine from the audio alone whether these are quiet reads or false starts.
### Job #913 — the calibration, and what it took away

Whisper's own word-timestamp error was measured against 30 Azure TTS clips carrying authoritative
`word_boundaries` (178 words, none dropped). The result forced the corrections above:

- **median absolute error ~120ms on word starts, ~150ms on ends.** Only ~18% of word boundaries land
  within 50ms; ~8% within 30ms.
- the error is **systematically signed positive** — whisper runs 110–145ms *late*, not just noisily.
- it is a **real property of the instrument, not dialect noise leaking in**: the timing error is the
  same whether whisper got the word right or wrong.
- the **last word's end** is far worse than interior words (325ms vs 145ms median) — a clip-edge
  artefact. It does not contaminate this evaluation, because the final boundary is an anchor here
  and carries zero error by construction.
- separately: run as standard German, whisper mistranscribes this Austrian audio to a *different
  word* about two-thirds of the time. Distinct from the timing problem, and the per-slot alignment
  gates above are what kept it out of the numbers.

Its own stated limits: ground truth is Azure's declared SSML boundaries rather than an independent
forced aligner; the content-match check covers 126 of 178 words; n=30 on one course, one voice, one
model size. Full write-up: https://watson-1.tail4968cb.ts.net/d/54c5776e

**What survives:** Result 1 is pure ffmpeg and never touches whisper. Result 2's recall ceiling is
arithmetic over silence counts and chunk counts, also whisper-free. Result 3's >300ms tail and its
signed mid-phrase drift are both above the noise floor. **What does not survive:** any claim at 50ms
or 150ms tolerance, and the median error figures.

---

## Verdict

**One natural pass with the machine doing the rest is not viable, and the slow pass earns its keep.**

The evidence, plainly:

1. The shipped aligner extracts **nothing** from a natural-only take — **0 of 17**, rejected at its
   own QA gate. It is not degraded without the slow pass; it is inoperative, deliberately. This
   measurement is pure ffmpeg and depends on no model.
2. The reason is physical, not a tuning problem: the detector finds only **15 candidate boundaries
   where 88 exist**, a **17% recall ceiling** before accuracy is even asked about. A natural read
   does not put a pause where a LEGO ends. The slow pass is what manufactures the boundary the
   detector needs.
3. The best text-only substitute misplaces **a fifth to a quarter of LEGO edges by more than 300ms**
   — longer than a whole short LEGO, against a 20ms splicer crossfade — and it fails *systematically*
   mid-phrase, four standard errors from zero, rather than randomly. No weighting fixes it, because
   the timing information is not in the text.

The one natural-only path this evidence does *not* close off is **forced alignment** — a model that
reads the audio and the canonical text together, which is what produced the ground truth in this
document. That is a different tool from anything in the pipeline today (align.cjs is explicitly
zero-ML, and the header notes aeneas and whisper were not available when it was written; whisper-cli
*is* on this box now).

**But job #913 has now put a hard floor under that option too, and it is a low one.** Off-the-shelf
whisper on this material carries **~120–150ms median word-boundary error** against LEGOs whose median
duration is 440ms, mistranscribes the Austrian dialect two thirds of the time when run as standard
German, and failed outright on 3 of these 17 takes. It is not accurate enough to cut clips with as
it stands. A forced-alignment route would need a genuinely better aligner — a dialect-adapted or
purpose-built one — and that is a project, not a switch. It would need its own evaluation before
anyone counted on it.

So the shape for future recordists is unchanged by this evaluation. If a course wants spliceable
chunks, it needs the slow pass. If it wants what Sascha is doing this weekend — a whole natural take
filed as that line's own clip — it needs no alignment at all, which is exactly why that mode was
built that way and why it should stay as shipped.

## One thing to look at, not touched

`d08cc020` — the take whisper cannot decode past 37%, transcript "*lachen*", one of the two quietest
in the set — is **attached live** as `target2_audio_id` on `deu_at_for_eng:S0544L03U01` ("wer a immer
gsogt hot, dass des schwa wird, der hot voi recht ghobt"). `b84724bc` ("Ups!") is attached to
nothing. I changed neither, and I could not tell from the audio whether it is a quiet good read or a
laugh. It wants a human ear before it wants a fix.

## Files

- `docs/recording/natural-take-extraction-eval-align-2026-08-22.json` — per-take aligner output and
  the five-setting silence sweep
- `docs/recording/natural-take-extraction-eval-scores-2026-08-22.json` — per-LEGO-slot ground truth,
  predicted spans, signed errors, and every exclusion with its reason

The harness lived in gitignored `scripts/` (`_eval-fetch`, `_eval-align`, `_eval-score2`,
`_eval-modes`) and did nothing but read: Supabase selects, S3 `GetObject`, ffmpeg/ffprobe analysis,
whisper decode. No DB write, no S3 write, no production behaviour touched.
