# Edge-shape detector, tuned against Tom's 27-clip ear-verified set

2026-08-06. Companion to `docs/audio-truncation-detector-2026-08-06.md` (the detector) and
`docs/audio-intelligence/ground-truth-2026-08-06.json` (the labels).

**The headline: the detector cannot be tuned to drop the four false positives, and I am not going
to pretend otherwise. I recommend shipping it unchanged.** The reason is not a missing feature —
it is that all twenty clips were trimmed by the same mechanism, and the four Tom hears as fine lost
no audible content while the sixteen he hears as damaged lost 51–401 ms. The edge shape records
*that a trim happened*. It cannot record *how much the trim took*, because the audio that would
answer that question is the audio the trim removed.

---

## 1. What was tested

Tom listened to the 11 clips the detector flagged and nobody had heard: **7 true positives, 4 false
positives**. Combined with the 9 previously ear-confirmed damaged clips, the labelled set is now:

| population | n | status |
|---|---|---|
| ear-confirmed DAMAGED | **16** | 9 from 2026-08-05 + Tom's 7 new true positives — recall must stay 16/16 |
| ear-confirmed CLEAN, and flagged | **4** | 1C7CC706, 65B8A730, F5C1AF9C, CD99B040 — the ones to exclude |
| unlabelled, nobody flagged, nobody listened | 148 | *not* negatives — an open question for Tom's ear |
| fresh provider renders (2026-08-05 naked pass) | 168 | never trimmed **by construction** — the honest specificity population |

Every clip was downloaded and decoded (336 files) and 40 candidate features extracted per clip:
fall rate measured from six different depths (peak−6 through peak−35 dB), fall duration at each,
level at the final audible frame, the cliff into the pad, trailing-pad zero fraction, pad noise
floor and pad length, lead-in padding, linear-fit slope and R² over the final 60 ms, final-20 ms
energy relative to the clip's own RMS, and — separately — spectral content at the cut point
(low/mid/high band split, zero-crossing rate, autocorrelation voicing, level relative to the
preceding 100 ms).

Search: every single feature at the strictest threshold that keeps all 16; every two-feature AND
(2,664 combinations survive 16/16); every three-feature AND; and all of it again with each feature
z-normalised against its own voice's never-trimmed population.

Working set: `scripts/edge-tune/` (gitignored) — `fetch.cjs`, `features.cjs`, `analyse.cjs`,
`analyse2.cjs`, `analyse3.cjs`, `spectral.cjs`, `eval.cjs`.

## 2. The validation table

| rule | recall | FPs kept | precision on the 20 listened | flagged of 148 unlabelled | flagged of 168 never-trimmed |
|---|---|---|---|---|---|
| **A — shipped: fallRate ≥ 0.70 dB/ms AND zeroPad ≥ 80 %** | **16/16** | 4/4 | **80 %** | 0/148 | **0/168** |
| B — A AND fallRate25 ≥ 1.306 | 16/16 | 2/4 | 89 % | 0/148 | 0/168 |
| C — A AND last20RelRms ≥ −19.41 dB | 16/16 | 2/4 | 89 % | 0/148 | 0/168 |
| D — A AND fallRate25 ≥ 1.306 AND leadZeroPct ≥ 45.1 | 16/16 | 1/4 | 94 % | 0/148 | 0/168 |
| E — fallRate ≥ 0.741 AND zeroPad ≥ 84.7 | 16/16 | 2/4 | 89 % | 0/148 | 0/168 |

**No rule at any complexity excludes all four while keeping 16/16.** The three-feature search
returned zero qualifying rules. Per-voice z-normalisation topped out at 2 of 4.

### Why B, C, D and E are not improvements, they are overfitting

Every one of them sets its threshold **exactly on a true positive**, with no margin underneath:

| rule | threshold | nearest true positive | nearest false positive | margin |
|---|---|---|---|---|
| B | fallRate25 ≥ 1.306 | 6CA4D779 at **1.306** | CD99B040 at 1.276 | **0.03 dB/ms** (2 %) |
| C | last20RelRms ≥ −19.41 | DE554F48 at **−19.41** | CD99B040 at −19.61 | **0.19 dB** |
| E | zeroPad ≥ 84.7 % | 3FBAC965 at **84.7 %** | CD99B040 at 84.1 % | **0.6 pp** |

The shipped 0.70 threshold at least sits in a measured 0.11 dB/ms gap between two populations.
These sit in gaps of one clip's rounding error. A single further ear verdict would move them.
Rule D is worse than thin: `leadZeroPct` is **lead-in** padding, at the front of the clip, with no
causal relationship to whether the tail was amputated. It scores 94 % by coincidence on n=4.

Adopting any of them buys two excluded false positives and buys a real chance of dropping a true
positive on the next course. Against Tom's rule that recall is non-negotiable, that is a bad trade.

### The negative results, stated rather than buried

- **Fall rate alone can never work.** The worst false positive, 1C7CC706 "ich will sprechen",
  falls at **1.324 dB/ms** — steeper than eleven of the sixteen confirmed-damaged clips. Any
  fall-rate threshold that excludes it deletes most of the ground truth.
- **The tier-1 duration model is no help as a second filter.** Predicted-vs-actual z for the 16
  damaged spans −2.03 to +5.96; for the 4 clean it spans −1.64 to −0.07 — the clean set sits
  entirely *inside* the damaged set. The tightest threshold excluding all four leaves recall at
  **1/16**.
- **Spectral content at the cut point is no help either.** For every one of the six spectral
  features — band split, zero-crossing rate, voicing, level relative to the preceding 100 ms — the
  clean range is fully contained within the damaged range. Best single result: 1 of 4.

## 3. What actually separates them — and why it does not fit in this detector

Compared against its own fresh, never-trimmed render of the same text by the same voice, every
damaged clip is **shorter** and every clean one is not:

| population | speech-duration deficit vs fresh render |
|---|---|
| 16 ear-confirmed DAMAGED | **+51 to +401 ms** (mean +224) — all sixteen lost time |
| 4 ear-confirmed CLEAN | **−38 to +47 ms** — three are actually *longer* than the fresh render |

That is a clean split, and it says exactly what the ear says: the four false positives were trimmed,
but the trim took only inaudible decay. **The detector is not wrong about them — it detects the
mechanism, and the mechanism fired harmlessly.** This confirms on data the caveat the original
detector doc raised on principle: *"trimmed but still fine" is a category this detector cannot rule
out.*

Two honest limits on this deficit metric before anyone promotes it:

1. **It needs a reference render**, i.e. TTS spend per clip. Estate-wide that is not a detector, it
   is a re-render of the estate.
2. **Its noise floor is large.** Across the 148 unlabelled heard/fresh pairs the deficit has mean
   +2 ms and **sd 111 ms**, and 31 % exceed +50 ms. So the +51 ms boundary that separates our 20
   clips is not a calibrated threshold — it is where the n=20 sample happens to split. The *sign*
   is the strong signal (16/16 one way, 3/4 the other), not the cut point.

Where it *is* cheap and useful: **as an after-the-fact check on clips the edge detector already
flagged**, because those are being re-rendered anyway as part of repair. Measuring the deficit
between old and new costs one extra decode and turns each repair into a free precision datapoint.
That converts the false-positive tax from "wasted work nobody notices" into "a growing calibration
set" — no extra spend, and the detector gets better as the repair queue drains.

## 4. Recommendation: sweep the estate with the detector unchanged

**Ship rule A — `fallRate ≥ 0.70 dB/ms AND zeroPad ≥ 80 %` — exactly as it stands.**

The precision trade-off, stated plainly because it is the whole decision:

- **Recall 16/16.** Every clip Tom has ever confirmed damaged by ear is caught.
- **Precision 80 % on the 20 clips that have been listened to** (64 % on the 11 newly-listened
  batch alone, 100 % on the original 9). Both numbers are honest; 80 % is the one over the whole
  labelled set, and it is the one to plan with.
- **Zero false flags on 316 clips that are clean or presumed clean** — 0 of 168 never-trimmed
  provider renders, 0 of 148 clips nobody flagged. The detector does not fire on audio that was
  never trimmed. Its errors are confined to the trimmed population, and there its error means
  "trimmed harmlessly", not "healthy audio condemned".

**A 20 % false-positive rate is the right price here, and it is a small price**, because the sweep
is triage: a flag routes a clip to repair or to a human ear, never to a delete. The cost of a false
positive is one re-render of a clip that did not need it — pennies, and make-before-break means the
old clip is not touched until the new one is verified. The cost of a false negative is a learner
hearing an amputated word forever. Those are not symmetric and should not be traded as if they were.

Scale and cost: 120 ms per clip on one core (decode + measure), so **~2 hours wall on 8 cores for
~490k clips**, plus the S3 download. No model cost, no database writes, no TTS. The detector never
writes.

**The one caveat that should travel with any estate result.** The 0.70 threshold is calibrated on
`deu_for_eng` seeds 1–5: three voices, two languages, one provider. Everything above is measured on
those. A sweep across 130 courses will hit voices and providers whose never-trimmed fall rates have
never been measured, and a per-voice false-flag rate is the first thing to read out of the results —
not the total count. Recommended shape: **sweep everything, report flag rate per voice, and
hand-verify a sample from any voice whose rate is an outlier before believing its number.** A voice
whose renders naturally fall steeply would light up wholesale, and that is a calibration finding,
not 40,000 damaged clips.

## 5. Coordination — three estate jobs are already running, none of them collide

Checked running processes, recent files, and both checkouts (this one and
`/home/tomcassidy/SSi/ssi-dashboard-v7-clean`, where all three of these live):

| job | what it measures | status | collides? |
|---|---|---|---|
| `scripts/tail-blast/sweep.cjs` | S3 `HEAD` metadata only — bytes-vs-duration against a per-voice CBR family. Never decodes audio. | running, ~130 courses, ~50k clips/course at ~90 s each | **No.** Different measurement, different data path. Its flag rates (0.00–0.01 % on most courses) are consistent with the already-flagged concern that a size-based method is structurally blind to this damage class — a 200 ms amputation is inside mp3 frame granularity. |
| `scripts/tail-blast/enum-versions.cjs` | S3 object version history — 5.05 M keys, 7.39 M versions, 58,650 shrink events. | finished 03:13 | **No.** Provenance, not detection. |
| `scripts/estate-tail-sweep-2026-08-06.sh` | `audio-repair.cjs queue --tails` — the **old tail-ratio/release-time detector**, first 50 seeds of each paid live/beta course. | finished 03:13, 42 course JSONs written, output uncommitted in the other checkout | **No data collision** — verified read-only (`queue` writes a JSON; only `propose`/`accept` write). **But it is the detector this one was built to replace**, so its results must not be read as a second opinion on this damage class. |

**The one real contention is CPU, not data.** That sweep's own header says the box is ffmpeg-bound
at concurrency 8 on 8 cores, and the edge detector is ffmpeg-bound the same way. An edge-shape
estate sweep must not run while `tail-blast/sweep.cjs` is still going, or both finish later.

Two pieces of free leverage, if a sweep is approved: that script's course list
(`/tmp/estate-courses.txt`, paid × live/beta) is the right scope already, and its 42 finished
courses name exactly which clips have been fetched once — the edge sweep can follow the same list
and inherit the same skip-if-done structure rather than inventing one.

**Explicit gap:** I read these three jobs from process state, their scripts and their logs, not from
whoever is running them. If a fourth estate-audio job exists that leaves no trace in processes or
recently-modified files, I did not see it.

---

## 6. What this does not prove

- **n=20 on the labelled set, n=4 on the negatives.** Every precision figure here rests on four
  clips. That is why the tuning verdict is "don't", not "here is a better threshold".
- **The 148 unlabelled clips are still unlabelled.** The detector flags none of them, which is
  reassuring and is not evidence — nobody has listened.
- **One course, three voices, one provider.** See §4's caveat; it is the single biggest unknown
  standing between this table and an estate number.
- No sweep was run, no repair proposed, no spend incurred, nothing written to the database.
