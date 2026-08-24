# The German course is about 44% trimmed, and the detector is not the reason

**2026-08-06, overnight.** Every clip a learner can reach in `deu_for_eng` seeds 1–300 has been
measured with the edge-shape detector. **18,163 clips scanned, 0 unmeasurable, 7,961 flagged —
43.8%.** Nothing was deleted. The repair described in §5 is a deliberate slice of that total, not
the whole of it, and the rest is a decision rather than a task.

The headline number is large enough that the first duty is to argue against it. §2 is that argument,
and it loses.

---

## 1. What was run

`node tools/audio-repair.cjs queue deu_for_eng --tails --max-seed 300 --concurrency 4`

Seed, LEGO, LEGO-introduction and practice-phrase clips, all voices — the reachability definition in
`seedScopedAudioIds()`, not a sample. One S3 GET and one ffmpeg decode per clip, 20 minutes wall.
No TTS, no writes, nothing spent.

| | |
|---|---|
| clips scanned | **18,163** |
| could not be measured | **0** |
| flagged as trimmed (edge shape) | **7,961 — 43.8%** |
| of those, ALSO flagged by the duration check | **6,488 — 81.5%** |
| flagged at ≥ 2 dB/ms (unambiguous amputation) | **3,527** |
| flag rate per voice | ara 50.8%, leo 44.1%, eve 36.8% |

## 2. Why this is not the detector over-flagging

The detector's own documentation raises exactly this alarm: *"a voice whose renders naturally fall
steeply would light up wholesale, and that is a calibration finding, not 40,000 damaged clips."*
So the number was treated as suspect until it survived three independent tests.

### 2a. The control that settles it — same course, same voices, one day later

Cross-tabulating every one of the 18,163 clips against the date it was rendered:

| render date | clips | flagged | rate |
|---|---|---|---|
| 2026-01-17 | 1,128 | 434 | 38.5% |
| 2026-01-29 | 416 | 175 | 42.1% |
| 2026-02-15 | 5,010 | 2,572 | 51.3% |
| 2026-02-16 | 3,605 | 1,472 | 40.8% |
| 2026-02-24 | 2,880 | 1,264 | 43.9% |
| 2026-03-12 | 1,506 | 607 | 40.3% |
| 2026-04-13 | 943 | 448 | 47.5% |
| 2026-07-11 | 275 | 127 | 46.2% |
| 2026-08-03 | 380 | 138 | 36.3% |
| 2026-08-04 | 574 | 179 | 31.2% |
| **2026-08-05** | **210** | **0** | **0.0%** |

Eight months of renders sit at 31–51%. The clips rendered on **2026-08-05 — the naked pass, which
went through no trimming, no silence stripping and no tail detection — flag at zero, out of 210.**

Same course. Same three voices. Same provider. Same texts, in many cases. The only variable that
moved is whether the render passed through the trim. If the detector were mis-calibrated on these
voices, those 210 clips would light up with the rest. They do not light up at all.

That is the specificity control the original calibration ran on 168 fresh renders, reproduced here
in-course at scale, and it comes out the same way.

### 2b. A second, unrelated measurement agrees on 6,488 of them

The duration check asks a completely different question — *is this clip long enough to contain its
own text* — and shares no code, no threshold and no fingerprint with the edge-shape check. It
independently flags **81.5%** of the tail-flagged clips. Two unrelated measurements converging on
six and a half thousand clips is not threshold noise.

### 2c. The flagged population is not sitting on the threshold

If the 0.70 dB/ms line were slicing through a healthy continuum, the flagged clips would cluster
just above it. They do not:

| fall rate | flagged clips |
|---|---|
| 0.70–1 dB/ms | 1,332 |
| 1–2 | 3,102 |
| 2–4 | 2,601 |
| 4–8 | 915 |
| 8+ | 11 |

**3,527 clips fall at 2 dB/ms or steeper** — several times the worst fall measured on any clip that
was allowed to finish (0.633 dB/ms across 39 never-trimmed renders). Those are not marginal calls.

### 2d. What this does NOT establish

Stated plainly, because the number is big enough to be worth over-claiming and it must not be.

- **43.8% were TRIMMED. It does not follow that 43.8% are audibly damaged.** On the 20 clips Tom
  has listened to, 16 of 20 were audible and 4 had lost only inaudible decay. Applying that ratio
  gives roughly **6,400 audibly damaged clips**, not 7,961 — and that ratio comes from n=20 in
  seeds 1–5, so it is an estimate carrying real uncertainty, not a measurement.
- **No ear has heard a sample drawn from this population.** The 20 labelled clips all come from
  seeds 1–5. The morning spot-check page is the first sampling of the wider set, and it is the
  thing that would falsify §2 if §2 is wrong.
- **This is seeds 1–300 only.** The course runs to seed 668. The MVP scope was a deliberate choice
  and nothing outside it was measured tonight.

## 3. What it means, in course terms

The trim was not a one-off event on one batch. It ran on renders from January to 2026-08-04, and it
fired on roughly two clips in five every time. `deu_for_eng` has been shipping that way for eight
months.

The 2026-08-05 column is the good news in the table: **the mechanism is already gone.** Nothing is
still being damaged. This is a backlog to clear, not a fire to put out.

## 4. The cost of clearing it, since that is the real decision

7,961 clips, 341,884 characters of TTS. Money is not the binding constraint; **time is.** A propose
is one TTS round trip, one mastering pass and one whisper veracity decode, and the decode dominates
at ~90s per clip serially. Even at concurrency 5 on this box the whole set is **roughly 40–48 hours
of wall clock**, and this box is shared with other sweeps.

So the full repair is a multi-day scheduled job, not an overnight one. That is the floor, and it is
reported as a floor rather than dressed up: there is no arrangement of tonight's hours that repairs
7,961 clips.

**Recommendation.** Run the remainder as a background job paced over several days, LEGO clips and
introductions first (a LEGO short of its triple costs the player the whole round; a practice phrase
is cosmetic), then seeds in order so the repair front moves the way a learner does. The one input
needed before that starts is §6.

## 5. What was actually repaired tonight

A deliberate slice, chosen for learner impact rather than for a good-looking number: **every flagged
clip reachable from seeds 1–10** — the material Tom was listening to when he called the clipping
"atrocious" — **plus every flagged LEGO introduction in the whole 1–300 scope**, because an
introduction is one leg of the LEGO triple and its absence costs the round.

272 clips. Each one: rendered fresh, mastered, level-checked, veracity-checked, and — new tonight —
**re-measured by the same tail detector that condemned the original**, with a re-roll on failure and
a refusal if no attempt comes back clean. A repair that returns the defect it replaces is worse than
no repair.

Three pilot clips first, to prove the strategy before spending on 272:

| clip | before | after | speech regained | candidate fall rate |
|---|---|---|---|---|
| `f0404e5d` "to speak German with you" | 1,176 ms | 1,512 ms | **+395 ms of speech** | 0.27 dB/ms |
| `0df92d35` "ich will Deutsch lernen" | 1,104 ms | 1,320 ms | +216 ms | 0.12 dB/ms |
| `18961e2b` "with" | 528 ms | 624 ms | +96 ms | 0.10 dB/ms |

`f0404e5d` is the clip the detector document opens with. The forensics predicted 374 ms was missing
from it; the repair regained 395 ms. Two independent methods, one arriving from the render and one
from the arithmetic, agreeing to within a syllable.

All three came back **well under the 0.70 threshold and into a live noise floor**, which also
answers the question that gates the whole strategy: the current mastering chain no longer trims.

Verified through the real player path, not the database:

```
f0404e5d .v1 -> 200, 1.148s   (the original, still served)
f0404e5d .v2 -> 200, 1.512s   (the repair, live)
```

Make-before-break held throughout: same clip id, new bytes, revision bumped, per-clip versioned URL,
and **every superseded object still in the bucket**. Every repair reverts with one command.

## 6. The one decision that needs Tom

**Should the rest of the backlog run, and on what priority order?**

- **A — LEGO-first, paced over several days** (recommended). Introductions and LEGO target clips
  before practice phrases, then seeds in learner order. Roughly 40–48 hours of machine time, spread
  so it never competes with a course build. ~342k characters of TTS.
- **B — seeds 1–50 only, tonight's shape repeated.** About 1,300 clips, one long day. Fixes the
  first impression and leaves the rest known-damaged.
- **C — hold.** The mechanism is dead and nothing is degrading further; the backlog can wait for a
  quieter week.
- **D — listen first.** Take the morning spot-check, and if the 4-in-5 estimate in §2d holds, pick
  from A/B/C with a real number instead of an inferred one.

My recommendation is **D then A**: the spot-check costs ten minutes of listening and converts the
biggest uncertainty in this document into a measurement, and A is what the answer will almost
certainly justify.

## 7. Gaps, stated rather than rounded up

- **No ear has heard a clip drawn from seeds 11–300.** The 4-in-5 audibility estimate is
  extrapolated from 20 clips in seeds 1–5. It is the weakest number here and it is load-bearing for
  the cost case.
- **Seeds 301–668 are unmeasured.** Outside MVP scope; the estate census suggests the bulk of the
  missing-introduction problem lives there.
- **The 4 loose-key unlinked slots were not written** — the relink tool holds loose matches back by
  default and that default was not overridden.
- **12,833 slots in this course are truly absent audio** (whole course, not just 1–300), which is a
  different problem with a different fix and was not touched. Absent audio makes the player skip the
  item; it was never amputated.
