# How much whisper QC is actually worth — tested, not guessed

**2026-08-07. Analysis only: no new whisper runs, no writes, no renders.**

Tom asked whether full 100% whisper scans are overkill, and proposed an escalating sampling
scheme instead. The answer is that **both the 100% scan and the sampling scheme are the wrong
instrument**, for the same reason: damage in this course is not a per-clip failure rate that
sampling can estimate away. It is **one dated render event**, and that event is identifiable from
database metadata for free — no audio read, no whisper call.

Headline numbers, all from real per-clip ground truth:

| | |
|---|---|
| Damage found by scanning **36% of clips**, chosen by render date | **91%** |
| Damage found by Tom's escalating sample (**7%** of clips) | **6%** |
| Damage found by simple random 10% | **10%** |
| Cost saving from whispering only a clip's tail | **~0%** (decode time is length-independent) |

---

## 1. What data exists — and the one gap

**The gap, stated first.** The band-1 scan Tom named (rounds 1-200, 5,217 clips, 497 damaged) ran
before the verdict cache existed, so **its per-clip verdicts were never persisted and are not
recoverable.** All that survives is the aggregate (497 damaged = 402 `last_word_missing` + 95
`cer_above_threshold`) and a cumulative count logged every 200 clips. I did not simulate on band 1.

**What I simulated on instead.** Band 2 (rounds 201-400) finished its listen at 12:51Z today and
*did* have the verdict cache (`2c2a4836`) enabled. `~/.audio-veracity-verdicts.json` holds
**4,941 per-clip verdicts — 534 damaged (10.8%)** with pass/fail, reason, CER, the whisper decode,
the expected text and the decode time, in listen order.

I verified this file is genuine ground truth for that run before using it: its damaged count
reproduces the run's own progress log **block for block** across all 24 checkpoints
(200→9, 400→25, … 4800→525) and lands on the run's final 4,941/534 with the same reason split
(467 `last_word_missing`, 67 `cer_above_threshold`). Snapshot kept at
`.a74-scratch/whisper-sampling/verdicts-fra-band2-snapshot.json`.

Band 1 (9.5% damaged) and band 2 (10.8%) agree within 1.3pp, so band 2 is a fair stand-in for the
question asked.

Each clip was joined to `course_audio` on `s3_key` for voice, role, render date, duration and
source course (4,863 of 4,941 matched; the 78 unmatched are all damaged clips whose rows the
band-1 run had already replaced — they are counted as damaged throughout).

---

## 2. Damage does not behave like a rate. It behaves like an event.

| render date | clips | damaged | rate |
|---|---|---|---|
| **2026-08-03** | 1,709 | **407** | **23.8%** |
| 2026-08-04 | 48 | 8 | 16.7% |
| 2026-01-21 | 175 | 10 | 5.7% |
| 2026-02-11 | 395 | 13 | 3.3% |
| 2026-02-26 | 1,211 | 5 | 0.4% |
| 2026-08-05 | 250 | 0 | 0.0% |
| 2026-08-07 | 104 | 0 | 0.0% |
| *everything except 08-03* | 3,154 | 49 | **1.6%** |

**One day's renders — 35% of the clips — carry 76% of all the damage.** Strip that day out and the
rest of the course reads 1.6%.

The same concentration shows up on every correlated axis, because they are all the same cohort
seen from a different side:

| cut | clips | damaged | rate |
|---|---|---|---|
| voice `xai_leo` | 1,995 | 411 | 20.6% |
| voice `eve` | 1,822 | 33 | 1.8% |
| role `target2` | 2,313 | 415 | 17.9% |
| role `target1` | 2,072 | 39 | 1.9% |
| role `known` (English) | 442 | 2 | 0.5% |
| French clips | 4,145 | 528 | 12.7% |
| English clips | 796 | 6 | 0.8% |

It is *not* that Leo is a bad voice: Leo's clips rendered outside 2026-08-03 are 8 damaged out of
296 — **2.7%**. It is that Leo's clips rendered *on* 2026-08-03 are 23.7%.

**Why that date.** Two facts, both checked in git and the DB:

1. `fra_for_eng` has **27,337 clips stamped 2026-08-03** — the emergency re-render after the Azure
   voice purge.
2. The **pre-publish veracity gate landed 2026-08-04** (`85bd2a34`), the day *after*. Every one of
   those 27,337 clips has `veracity_checked_at IS NULL` — they were published through a path with
   no listen at all.

And the dominant signature — 87% of the damage is `last_word_missing` — is exactly what the
*early* gate could not see either: the rule that fails a clip whose last word is missing regardless
of CER only landed today (`0a8798d9`, 2026-08-07 04:36Z).

So the honest description of the 497/534 damaged clips is not "the pipeline produces ~10% bad
audio." It is **"one ungated batch produced ~24% bad audio, and gated batches since have produced
0%"** (08-05: 0/250, 08-07: 0/104 in this sample).

---

## 3. The sampling simulation

400 trials per strategy against the band-2 ground truth. "found" = share of the 534 damaged clips
the strategy would have located; "scan" = share of whisper calls spent.

| strategy | scan | damage found | damage missed | rate estimate |
|---|---|---|---|---|
| full 100% scan | 100% | 100% | 0% | exact |
| random 2% | 2.0% | 2.0% | 98.0% | 10.8% ±3.3 |
| random 5% | 5.0% | 5.0% | 95.0% | 10.8% ±1.8 |
| random 10% | 10.0% | 10.0% | 90.0% | 10.9% ±1.4 |
| random 30% | 30.0% | 30.1% | 69.9% | 10.9% ±0.6 |
| random 50% | 50.0% | 49.8% | 50.2% | 10.8% ±0.4 |
| systematic every 10th | 10.0% | 10.0% | 90.0% | 10.8% ±1.1 |
| **Tom's escalating** (50% of first 100, 10% of next 1,000, 5% of rest) | **6.9%** | **6.3%** | **93.7%** | 9.8% ±1.6 |
| adaptive: probe 20 per 200-block, escalate block if ≥10% | 68.2% | 70.2% | 29.8% | 11.1% ±0.4 |
| adaptive: probe 20 per 200-block, escalate if ≥5% | 89.9% | 90.9% | 9.1% | 10.9% ±0.2 |
| **stratified: 100% of the 2026-08-03 batch, 0% of the rest** | **36.2%** | **90.8%** | 9.2% | — |
| stratified: 100% of `xai_leo`, 0% of the rest | 42.0% | 91.6% | 8.4% | — |
| stratified: 08-03 batch + 10% audit of the rest | 42.8% | 91.8% | 8.2% | — |
| skip English known-side clips only | 83.9% | 98.9% | 1.1% | — |

**Read the first block of rows carefully: for every unstratified scheme, damage found equals
compute spent, to within noise.** That is not a coincidence and it is not fixable by cleverness —
if you look at a random 10% of a population you find 10% of anything in it. Tom's escalating scheme
lands *slightly below* the line (6.3% found for 6.9% spent) because it front-loads onto rounds
201-210, which are among the *cleanest* clips in the band.

**But that is only a failure if the job is to find damage.** As an *estimator* the escalating
scheme is excellent: 6.9% of the compute pins the damage rate at 9.8% ±1.6pp against a true 10.8%.
If the question is "how bad is this band?", a 5% sample answers it for 5% of the money and Tom's
instinct is exactly right.

The two jobs need separating, because they have opposite answers:

- **QC as measurement** ("is this band healthy?") — sampling wins enormously. 5% is plenty.
- **QC as repair** ("find every broken clip so we can fix it") — sampling cannot help. Only
  *stratification* beats the cost=recall line, and only when damage genuinely clusters.

Here it clusters, hard — and the clustering variable (`created_at`) costs nothing to read.

**Adaptive block escalation is the trap to avoid.** It looks like the sophisticated answer and it
is the worst option on the table: 68% of the compute for 70% of the damage. Because damage is
spread thinly *within* the listen order (deciles run 6.7%–16.4%, no clean sick region) but
concentrated *by cohort*, block-adaptive probing escalates nearly every block and buys almost
nothing over just scanning everything.

---

## 4. Cheap detectors — one works, one idea doesn't

Evaluated against the same ground truth, using the existing 51,369-clip detector sweep
(`docs/audio-repair-2026-08-06/fra-full-queue-tails.json`, no whisper involved):

| detector | flags | recall | precision |
|---|---|---|---|
| tail-integrity (steep release) | 14.1% | 46.7% | 36.4% |
| tail steep **and** fast speech | 3.6% | 18.9% | 57.0% |
| trailing silence < 60ms | 25.8% | 71.3% | 30.4% |
| duration-vs-expected | 81.5% | 89.1% | 12.0% |
| chars/sec > 20 *(pure metadata, zero cost)* | 31.9% | 70.6% | 20.7% |
| **render date = 2026-08-03** *(pure metadata, zero cost)* | **35.1%** | **89.3%** | **23.8%** |

The tail detector is real — 47% recall for 14% of the population is far better than chance, and its
57%-precision variant is a good triage ordering. But **nothing beats the render date**, and the
render date requires no audio to be fetched, decoded or measured at all.

**"Whisper on just the clip tail" does not work, and the reason is physical.** Decode time in this
dataset is essentially independent of clip length:

| clip length | median decode |
|---|---|
| 0.5–1.0s | 6,997 ms |
| 1.0–1.5s | 7,059 ms |
| 1.5–2.0s | 7,160 ms |
| 2.5–3.0s | 7,596 ms |
| 3.5–4.0s | 7,683 ms |

Correlation between clip duration and decode time: **r = 0.06**. `whisper.cpp` pads every input to
a fixed 30-second window, so a 4× shorter clip costs ~10% less, not 75% less. Clips already average
1.69s. **The lever is fewer calls, not shorter calls** — which is exactly what stratification gives.

---

## 5. Recommendation

**Stop treating whisper as a sampling problem and treat it as a cohort problem.**

1. **Keep whisper at 100% where it is cheapest and earliest: render time.** The pre-publish gate
   (`85bd2a34`, plus today's last-word rule `0a8798d9`) is the entire reason the 08-05 and 08-07
   cohorts read 0%. A listen at render time is a listen you never have to repeat, and it fixes the
   clip while the render context is still live. This is not the cost being questioned and it should
   not be touched.

2. **For the remaining fra bands (401-1529), scan by cohort, not by sample.** Whisper every
   incumbent clip whose `created_at` falls in the ungated era — in practice, the 2026-08-03 batch
   plus anything before 2026-08-04 — and skip clips rendered by the gated pipeline. On band-2 data
   that is **36% of the calls for 91% of the damage.** Add a **10% random audit of the skipped
   remainder** (total 43% of calls) so a new sick cohort cannot hide: that audit is the *measurement*
   job, where Tom's sampling instinct is correct and cheap.

3. **Concretely, per band:** ~5,000 incumbents at the measured 28.6 clips/min is ~2.9 hours of
   whisper today. Cohort-scoping takes that to **~1.25 hours**, and the verdict cache already
   removes the ~36% cross-band re-listens on top. Across the six remaining bands that is roughly
   **17 hours of whisper down to ~7**.

4. **Accept the residual, explicitly.** Skipping the gated/clean cohorts ships about **49 damaged
   clips per 5,000** (1.0%) unfound. Those are overwhelmingly old, low-rate cohorts (0.4%–5.7%).
   If that is not acceptable, the cheapest top-up is not more sampling — it is adding the
   tail-integrity flag as a second stratum, which recovers a further chunk for ~14% more calls.
   **This is the one judgment call in the doc and it is Tom's:** 1% residual for a 65% compute cut,
   or 0% residual at full price.

5. **The finding that matters more than any of the above:** the 2026-08-03 cohort is
   **27,337 clips course-wide** in `fra_for_eng`, of which the two bands so far have only listened
   to about 3,500. At the measured 24% damage rate, that cohort contains on the order of
   **6,500 damaged clips**, all published through a path with no listen. The bands will reach them
   round by round. Scanning that cohort directly — rather than waiting for the round plans to
   surface it — is a separate decision worth taking on its own merits.

---

## Method / reproduction

- Ground truth: `~/.audio-veracity-verdicts.json` (snapshot in
  `.a74-scratch/whisper-sampling/verdicts-fra-band2-snapshot.json`), validated against
  `/tmp/fra-phase8-3468.log` progress lines.
- Metadata join: `course_audio` on `s3_key` (4,863/4,941 matched).
- Detector cross-tab: `docs/audio-repair-2026-08-06/fra-full-queue-tails.json` by `audioId`,
  restricted to fra clips predating the 2026-08-06 sweep (4,092 clips, 450 damaged).
- Simulation: 400 trials per strategy, seeded, in `.a74-scratch/whisper-sampling/analyse*.py`.
- No whisper was run. No rows were written. The live band-2 render was not touched.
