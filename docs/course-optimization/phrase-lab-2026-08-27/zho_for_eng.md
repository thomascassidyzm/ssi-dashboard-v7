# Phrase prompt v3 — Mandarin Chinese (zho_for_eng)

## The answer

**Yes — the v3 prompt reproduces the Spanish result on Mandarin Chinese.** The live course content clears every floor on **0%** of the 20 measured LEGOs, on both BUILD and USE; Opus 5 with the v3 prompt clears **75% BUILD / 50% USE**, and Sonnet 5 clears **30% / 35%**.

The gain sits where it sat on Spanish: **USE pattern variety** (LEGOs short on `axesVaried`: live 17 of 20, Opus 2, Sonnet 5 2), **the filling position** (share of phrases with the new LEGO held on both sides: live 0.16, Opus 0.57, Sonnet 5 0.51), and **distinct neighbour x pattern combinations** (live 1.5, Opus 7.3, Sonnet 5 6.0 per LEGO).

**The conclusion survives the floors.** Opus 5 leads Sonnet 5 on both roles at every setting of the sensitivity table — one step looser, as set, and one step tighter. Nothing here depends on the calibration.

## What a human would have to touch

Of the 20 measured LEGOs: live content leaves **0 clean**, Opus 5 leaves **9 clean**, Sonnet 5 leaves **2 clean**. Full breakdown in the table further down.

## The blind "worth having" judgement

| arm | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| share of USE phrases judged worth having | *(withheld)* | 0.94 | 0.77 |

Opus 5 and Sonnet 5 judged on the same 7 LEGOs and comparable. The live arm fell on a different subset and its score is withheld.

## The measured LEGOs

Chosen by one rule applied identically to all six courses: within each of the 20 seed numbers the Spanish run used, take `lego_index` 1, or the lowest index that is a real A/M LEGO if index 1 does not exist. The English seed corpus is shared estate-wide, so these 20 seeds carry the same English sentences in every course.

| seed | lego | id | type | known | target |
|---|---|---|---|---|---|
| 20 | L1 | S0020L01 | A | you | 你 |
| 45 | L1 | S0045L01 | A | to know | 知道 |
| 75 | L1 | S0075L01 | M | have you got more to learn | 你还有更多要学吗 |
| 110 | L1 | S0110L01 | M | relax | 放松 |
| 130 | L1 | S0130L01 | A | surprising | 意外 |
| 150 | L1 | S0150L01 | A | be called | 叫 |
| 206 | L1 | S0206L01 | M | I enjoy the chance to practise speaking with you | 我很享受和你一起练习说话 |
| 250 | L1 | S0250L01 | M | something else | 别的 |
| 300 | L1 | S0300L01 | A | seem | 显得 |
| 358 | L1 | S0358L01 | A | top | 顶端 |
| 400 | L1 | S0400L01 | M | later on | 等会儿 |
| 440 | L1 | S0440L01 | A | while | 趁 |
| 470 | L1 | S0470L01 | M | to stop | 停下来 |
| 510 | L1 | S0510L01 | M | safe | 安全 |
| 535 | L1 | S0535L01 | M | to promise | 答应 |
| 560 | L1 | S0560L01 | M | to lead to | 通向 |
| 580 | L1 | S0580L01 | A | to take | 带 |
| 600 | L1 | S0600L01 | M | how tired | 有多累 |
| 620 | L1 | S0620L01 | M | already | 已经 |
| 650 | L1 | S0650L01 | A | to go | 走 |

---

20 real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.

| arm | sets scored | generation failures |
|---|---|---|
| Sonnet 4.5 (live) | 20 / 20 | 0 |
| Opus 5 | 20 / 20 | 0 |
| Sonnet 5 | 20 / 20 | 0 |

## BUILD phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.65 | 0.00 | 0.00 |
| phrases inheriting course ambiguity | 0.70 | 0.00 | 0.00 |
| phrases written | 2.75 | 5.55 | 4.25 |
| neighbour x pattern combos | 0.80 | 5.55 | 4.05 |
| distinct neighbours touched | 0.80 | 5.45 | 4.00 |
| positions reached (of 3) | 0.50 | 2.65 | 2.45 |
| share in the filling position | 0.02 | 0.34 | 0.23 |
| pattern axes varied (of 5) | 0.25 | 2.90 | 1.70 |
| distinct pattern signatures | 0.60 | 3.80 | 2.55 |
| recency mass | 0.00 | 0.40 | 0.45 |
| new edges per syllable | 0.10 | 0.17 | 0.19 |
| **clears every floor** | 0% | 75% | 30% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| positionSpread | 17 | 1 | 2 |
| axesVaried | 18 | 2 | 10 |
| recencyMass | 20 | 3 | 3 |
| phrases | 18 | 0 | 0 |
| edgeCombos | 19 | 0 | 3 |
| distinctAdjacencies | 15 | 0 | 1 |
| gate | 12 | 0 | 0 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 3.80 | 0.30 | 0.10 |
| phrases inheriting course ambiguity | 2.05 | 0.00 | 0.00 |
| phrases written | 5.45 | 7.65 | 6.20 |
| neighbour x pattern combos | 1.50 | 7.30 | 6.05 |
| distinct neighbours touched | 1.40 | 7.20 | 5.70 |
| positions reached (of 3) | 0.50 | 2.30 | 2.35 |
| share in the filling position | 0.16 | 0.57 | 0.51 |
| pattern axes varied (of 5) | 0.85 | 4.00 | 3.75 |
| distinct pattern signatures | 1.30 | 5.90 | 5.05 |
| recency mass | 0.05 | 0.37 | 0.40 |
| new edges per syllable | 0.04 | 0.11 | 0.14 |
| USE phrases standing alone | 0.90 | 0.97 | 0.89 |
| **clears every floor** | 0% | 50% | 35% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| gate | 17 | 5 | 2 |
| edgeCombos | 19 | 3 | 2 |
| axesVaried | 17 | 2 | 2 |
| recencyMass | 19 | 3 | 4 |
| useCompleteShare | 3 | 4 | 8 |
| phrases | 6 | 0 | 0 |
| positionSpread | 17 | 2 | 4 |
| distinctAdjacencies | 14 | 0 | 0 |

## Floor sensitivity — does the conclusion survive moving the bar?

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).

| BUILD — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 90% | 65% |
| as set | 0% | 75% | 30% |
| one step TIGHTER | 0% | 50% | 0% |

| USE — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 60% | 55% |
| as set | 0% | 50% | 35% |
| one step TIGHTER | 0% | 15% | 0% |

## What a human would have to touch

One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.

| arm | clean | targeted | rewrite | regenerate |
|---|---|---|---|---|
| Sonnet 4.5 (live) | 0 | 0 | 3 | 17 |
| Opus 5 | 9 | 5 | 1 | 5 |
| Sonnet 5 | 2 | 12 | 4 | 2 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you" → "你" | 1 / 2 / 2 / 9 | 0 / 2 / 2 / 12 | 0 / 3 / 1 / 10 |
| 45 | "to know" → "知道" | 0 / 2 / 5 / 11 | 0 / 2 / 4 / 13 | 0 / 3 / 4 / 10 |
| 75 | "have you got more to learn" → "你还有更多要学吗" | 1 / 1 / 1 / 3 | 0 / 1 / 2 / 11 | 0 / 3 / 4 / 9 |
| 110 | "relax" → "放松" | 1 / 2 / 4 / 8 | 0 / 3 / 5 / 15 | 0 / 2 / 4 / 11 |
| 130 | "surprising" → "意外" | 7 / 0 / 0 / 0 | 0 / 3 / 3 / 13 | 0 / 3 / 4 / 10 |
| 150 | "be called" → "叫" | 2 / 1 / 4 / 8 | 0 / 2 / 4 / 14 | 0 / 1 / 4 / 10 |
| 206 | "I enjoy the chance to practise speaking with you" → "我很享受和你一起练习说话" | 4 / 1 / 0 / 2 | 0 / 3 / 3 / 10 | 0 / 3 / 4 / 10 |
| 250 | "something else" → "别的" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 15 | 0 / 3 / 5 / 11 |
| 300 | "seem" → "显得" | 7 / 1 / 1 / 3 | 1 / 2 / 5 / 12 | 0 / 1 / 3 / 9 |
| 358 | "top" → "顶端" | 5 / 1 / 0 / 2 | 1 / 3 / 5 / 12 | 0 / 3 / 5 / 10 |
| 400 | "later on" → "等会儿" | 9 / 0 / 0 / 0 | 0 / 2 / 5 / 14 | 0 / 2 / 4 / 10 |
| 440 | "while" → "趁" | 9 / 0 / 0 / 0 | 0 / 2 / 4 / 15 | 0 / 1 / 3 / 10 |
| 470 | "to stop" → "停下来" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 14 | 0 / 2 / 4 / 12 |
| 510 | "safe" → "安全" | 9 / 0 / 0 / 0 | 1 / 3 / 4 / 11 | 0 / 2 / 4 / 11 |
| 535 | "to promise" → "答应" | 9 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 0 / 3 / 5 / 10 |
| 560 | "to lead to" → "通向" | 9 / 0 / 0 / 0 | 1 / 1 / 5 / 11 | 0 / 1 / 4 / 11 |
| 580 | "to take" → "带" | 9 / 0 / 0 / 0 | 0 / 2 / 4 / 15 | 1 / 3 / 5 / 11 |
| 600 | "how tired" → "有多累" | 9 / 0 / 0 / 0 | 0 / 2 / 3 / 13 | 0 / 3 / 3 / 7 |
| 620 | "already" → "已经" | 9 / 0 / 0 / 0 | 2 / 2 / 4 / 10 | 1 / 2 / 1 / 10 |
| 650 | "to go" → "走" | 9 / 0 / 0 / 0 | 0 / 3 / 3 / 14 | 0 / 3 / 4 / 10 |

---

**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that's being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.

**Syllable basis: exact.** A real counter exists for this target language, so `new edges per syllable` is comparable with the other courses.

**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.
