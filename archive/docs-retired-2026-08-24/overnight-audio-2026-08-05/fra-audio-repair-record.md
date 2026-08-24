# French audio repair — measured record, 2026-08-05

**worker d27ba784 (respawn of 8b1dae03) · watson-1 · all numbers measured live, not quoted from prior audits**

German is held by sibling worker `ff46c97a` under the coordination lock at
`/tmp/popty-overnight-audio.lock`. This document covers **French only**.

---

## 1. The headline: French was not "clean"

The standing documents (`docs/deu-audio-repair-plan-2026-08-04.md` §6) recorded French as clean of
silence with "about 4 clips of genuine residue". That is **wrong**, and the error was one of
sampling rather than of measurement.

The estate sweep of 2026-08-04 built two sample sets per course — `ids/` (a targeted suspect set)
and `ctl/` (a random control). **Only the suspect set was ever run.** The control set, which is the
only thing that can give a base rate, sat unexecuted. Running it was free, took 85 seconds, and
changed the picture.

| sample | n | failed the acoustic check | note |
|---|---:|---:|---|
| `ids/` suspect set | 28 | 22 (79%) | high by construction — selected as suspects |
| `ctl/` random control | 19 | 4 (21%) | **never run until now** |

The control sample tracks the whole course on role mix and mean duration, so it is a fair random
draw rather than a duration-biased one:

| | target1 | target2 | known |
|---|---:|---:|---:|
| control mean duration | 1613 ms | 1365 ms | 2040 ms |
| whole-course mean | 1631 ms | 1463 ms | 1522 ms |

## 2. But 21% is not the honest number — 10.5% is

All four control failures were re-rendered, and the before/after durations separate a real
truncation from a detector false alarm. A genuinely truncated clip gets materially **longer** when
re-rendered; a healthy one does not.

| text | was | now | delta | verdict |
|---|---:|---:|---:|---|
| tout le monde est avec nous | 816 ms | 1200 ms | **+384** | real truncation |
| de parler à quelqu'un | 912 ms | 1128 ms | **+216** | real truncation |
| comment elle s'appelle | 1104 ms | 984 ms | −120 | not truncation — came back shorter |
| elle a acheté | 864 ms | 864 ms | 0 | **detector false alarm** |

`elle a acheté` is the instructive one. The fresh render came back at exactly the same length and
whisper still decoded it as "LHT" on the re-roll. The audio is fine; whisper cannot decode a very
short French clip reliably. The gate's documented "0% false alarm" does not hold in this
short-clip regime, and that is worth knowing before anyone trusts a raw failure count as a work
count.

**So the true truncation base rate is 2/19 ≈ 10.5%** (n=19, so the confidence interval is wide —
roughly 1%–33%). Against 42,363 repairable French clips that still implies **thousands**, not four.

## 3. A free predictor: milliseconds per character

The 22 ground-truth defective clips repaired tonight give a calibration, because we hold both the
broken and the corrected duration for each.

| population | ms/char min | median | max |
|---|---:|---:|---:|
| defective, pre-repair (n=22) | 22.3 | 31.7 | 35.4 |
| the same clips, post-repair | 47.0 | 54.9 | 69.3 |
| whole course (median by role) | — | 51–61 | — |

Separation is clean, and it costs one SQL query rather than a whisper decode. `ms/char < 40`
selects **1,656** clips course-wide (target2 1,178 · known 433 · target1 45).

**Precision is high, recall is not.** All 22 known defectives fall under the threshold, but of the
two real control truncations only one does (30.2); the other sits at 43.4. So this filter
concentrates spend on the worst stratum — it does not clear the course. Treating a clean `<40`
sweep as "French is fixed" would be exactly the mistake §1 documents.

## 4. What was actually repaired

Every command exported `TAIL_REPAIR_MODE=flag` and `PHASE8_NO_LISTEN=1` and asserted both before
running; the sweep's flag was additionally verified by reading `/proc/<pid>/environ` of the worker
process itself. This is not belt-and-braces: on this branch
`services/audio-processor.cjs:684` still reads `process.env.TAIL_REPAIR_MODE || 'repair'`, so a
tool launched from a plain shell amputates its own fresh renders.

| batch | clips | result | TTS |
|---|---:|---|---:|
| suspect set (`ids/`) | 22 | 22 repaired, 0 failed — re-verified **22/22 clean** | 579 chars |
| control failures | 4 | 4 repaired, 0 failed | 83 chars |
| `ms/char < 40` stratum | 1,656 | in flight at time of writing | — |

Measured cost so far is 662 characters ≈ $0.003 at the Azure S0 rate. The repo records no xAI
per-character rate, so that figure is a lower bound rather than a quote. Even a course-wide repair
of every truncated clip is on the order of $0.50 — **cost is not the constraint on this job; CPU
time is.** A full whisper pass over all 42,363 French clips is roughly 35 core-hours.

## 5. Open, stated as gaps

- **The course is not cleared.** Only the `<40` stratum is being swept. The ~10.5% base rate implies
  real truncations above that threshold which nothing has looked at.
- **The gate false-alarms on very short clips.** Quantified here at 1 in 19; not characterised
  properly. It costs a wasted render each time, not a damaged clip.
- **`presentation` and pod clips are untouched and unrepairable**, per
  `docs/introductions-audio-coverage-2026-08-05.md`. That gap is unchanged by tonight's work.
