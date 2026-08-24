# Can the machine cut LEGOs out of a natural-only take? — 2026-08-22

**Evaluation only. Nothing about how the weekend takes are filed or used was changed, tested against,
or written to.** Sascha's takes stay exactly as shipped: natural pace, one take per line, filed
directly as that line's clip, no chunking and no splicing. This document tests a *separate* question
Tom asked — if the existing splice-and-dice machinery were pointed at those same natural-only takes,
how well would it find the LEGO boundaries?

Answer, up front: **it finds none of them.** Not "finds them badly" — the shipped aligner rejected
100% of the takes at its own QA gate, and of the 88 real LEGO boundaries in the sample it placed
zero within 80ms of a true one. The slow pass is not a refinement on top of the natural take. It is
the only thing in the pipeline that knows where a LEGO ends.

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

## Result 2 — the boundaries it *does* find are not LEGO boundaries

Across the 17 takes the detector proposed **15 internal boundaries**. The takes contain **88 real
internal LEGO boundaries**.

- proposed boundaries within 80ms of a real LEGO boundary: **0 of 15 (0%)**
- real LEGO boundaries recovered: **0 of 88 (0% recall)**

This is the finding that settles it. Tuning the threshold until the *count* matches would be
coincidence dressed as alignment — the pauses a natural take contains are breaths and hesitations,
and they sit where a speaker breathes, not where a LEGO ends. In a natural read of a LEGO-tiled
sentence there is simply no acoustic event at the boundary to detect. The slow pass exists to
*create* that event.

## Result 3 — proportional split, the natural-only stand-in for path 3

Without a slow take there are no proportions to transfer, so the closest honest substitute is to
split the natural take's voiced span by each chunk's own size. Two weightings were scored — by
syllable count and by character count.

Ground truth: whisper-cli word timestamps (`ggml-medium`, `-ml 1 -sow`), mapped onto the dialect
script text by character-level Needleman–Wunsch (whisper returns standard German, the course text is
Austrian, so word-for-word matching is too brittle). Slots whose local alignment identity fell below
0.5 were dropped rather than scored against fiction — see "how far to trust this" below.

**78 LEGO slots scored, from 14 takes.**

| | by syllables | by characters |
|---|---|---|
| clean — both edges within 50ms | 6 (**7.7%**) | 11 (**14.1%**) |
| degraded — within 150ms | 26 (33.3%) | 25 (32.1%) |
| wrong — over 150ms | 46 (**59.0%**) | 42 (**53.8%**) |
| clip actually usable¹ | 13 (**16.7%**) | 18 (**23.1%**) |
| median edge error | 120ms | 106ms |
| mean edge error | 207ms | 229ms |
| p90 / max | 490ms / 1309ms | 552ms / 1562ms |

¹ *usable* = the proposed clip covers ≥90% of its own LEGO and bleeds ≤80ms into a neighbour.

Take-level, which is what a recordist would feel: **1 of 14 takes** yielded a complete set of usable
chunks. Ten of fourteen yielded at least one.

### Why 106ms is fatal rather than merely untidy

The LEGO slots in this sample have a **median true duration of 440ms**; the 10th percentile is 180ms
and the shortest is 75ms. **35 of 105 slots are under 300ms.** A 106ms median error is a quarter of a
median LEGO and more than half of a short one — and the splicer's crossfade is 20ms, so a 106ms error
is five times the seam it has to hide it in. Over half the slots land >150ms out, which means the
clip starts or ends inside the wrong word.

The error is also **systematic, not noisy**: the proportional model runs early, and it drifts
worst in the middle of the phrase.

| position in phrase | median signed error |
|---|---|
| first quartile | 0ms (anchored) |
| second quartile | **−106ms** |
| third quartile | **−219ms** |
| fourth quartile | −90ms (re-anchored by the end) |

Both ends are pinned to the voiced span, so the model can only be wrong in the middle — and it is,
because natural speech is not uniform. Speakers lengthen before a boundary, compress function words,
and pause where the sense-group ends rather than where the LEGO does. There is no weighting that
fixes this, because the information is not in the text.

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
- A calibration of whisper's own word-timestamp error against Azure TTS clips that carry
  authoritative `word_boundaries` is running as **job #913**; it will say whether the 50ms "clean"
  tolerance is measurable with this instrument or lost in its noise. **It cannot change the
  verdict** — Results 1 and 2 do not use whisper at all, and the Result 3 errors are an order of
  magnitude above any plausible whisper jitter.

---

## Verdict

**One natural pass with the machine doing the rest is not viable, and the slow pass earns its keep.**

The evidence, plainly:

1. The shipped aligner extracts **nothing** from a natural-only take — 0/17, rejected at its own QA
   gate. It is not degraded without the slow pass; it is inoperative, deliberately.
2. The reason is physical, not a tuning problem: **0 of 88** real LEGO boundaries have a detectable
   silence at them. A natural read does not put a pause where a LEGO ends. The slow pass is what
   manufactures the boundary the detector needs.
3. The best text-only substitute gets **14% of LEGO edges clean and 23% of clips usable**, with a
   median error of 106ms against a median LEGO of 440ms, and it fails *systematically* mid-phrase
   rather than randomly. No weighting fixes it, because the timing information is not in the text.

The one natural-only path this evidence does *not* close off is **forced alignment** — a model that
reads the audio and the canonical text together, which is what produced the ground truth in this
document. That is a different tool from anything in the pipeline today (align.cjs is explicitly
zero-ML, and the header notes aeneas and whisper were not available when it was written; whisper-cli
*is* on this box now). It would need its own evaluation, and its floor is already visible here:
whisper failed outright on 3 of 17 of these takes.

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
