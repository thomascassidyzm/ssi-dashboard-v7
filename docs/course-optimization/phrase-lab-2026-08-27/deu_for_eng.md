# Phrase prompt v3 — German (deu_for_eng)

## The answer

**Yes — the v3 prompt reproduces the Spanish result on German.** The live course content clears every floor on **0%** of the 20 measured LEGOs, on both BUILD and USE; Opus 5 with the v3 prompt clears **61% BUILD / 72% USE**, and Sonnet 5 clears **58% / 32%**.

The gain sits where it sat on Spanish: **USE pattern variety** (LEGOs short on `axesVaried`: live 20 of 20, Opus 1, Sonnet 5 2), **the filling position** (share of phrases with the new LEGO held on both sides: live 0.24, Opus 0.54, Sonnet 5 0.48), and **distinct neighbour x pattern combinations** (live 0.9, Opus 6.8, Sonnet 5 5.9 per LEGO).

**The conclusion survives on USE and is calibration-sensitive on BUILD.** Opus 5 leads Sonnet 5 on USE at every setting — looser (83% vs 68%), as set (72% vs 32%), tighter (39% vs 5%). On BUILD the two arms trade places depending on where the bar sits: one step looser 67% vs 95%, as set 61% vs 58%, one step tighter 33% vs 11%. **Read the BUILD headline as calibration-dependent; the USE headline is not.**

## What a human would have to touch

Of the 20 measured LEGOs: live content leaves **0 clean**, Opus 5 leaves **11 clean**, Sonnet 5 leaves **4 clean**. Full breakdown in the table further down.

## The blind "worth having" judgement

**GAP.** The three arms were judged on different LEGOs, so their scores are not comparable and are withheld. The re-run on a forced common seed list was cut off by a second account session limit at 17:35 UTC.

## The measured LEGOs

Chosen by one rule applied identically to all six courses: within each of the 20 seed numbers the Spanish run used, take `lego_index` 1, or the lowest index that is a real A/M LEGO if index 1 does not exist. The English seed corpus is shared estate-wide, so these 20 seeds carry the same English sentences in every course.

| seed | lego | id | type | known | target |
|---|---|---|---|---|---|
| 20 | L1 | S0020L01 | M | you want | du willst |
| 45 | L1 | S0045L01 | A | everything | alles |
| 75 | L1 | S0075L01 | M | have you got more to learn | hast du noch mehr zu lernen |
| 110 | L1 | S0110L01 | A | friends | Freunde |
| 130 | L1 | S0130L01 | M | that was a surprise | das war eine Überraschung |
| 150 | L1 | S0150L01 | M | what your name is | wie du heißt |
| 206 | L1 | S0206L01 | M | the chance to practise speaking | die Gelegenheit sprechen zu üben |
| 250 | L1 | S0250L01 | M | can you tell me | kannst du mir sagen |
| 300 | L2 | S0300L02 | M | not to seem | nicht wirken |
| 358 | L1 | S0358L01 | M | your friend | deine Freundin |
| 400 | L1 | S0400L01 | A | later | später |
| 440 | L1 | S0440L01 | A | to travel | reisen |
| 470 | L1 | S0470L01 | M | how high | wie hoch |
| 510 | L1 | S0510L01 | A | safe | sicheren |
| 535 | L1 | S0535L01 | A | job | Job |
| 560 | L1 | S0560L01 | A | beach | Strand |
| 580 | L1 | S0580L01 | A | children | Kinder |
| 600 | L1 | S0600L01 | A | driven | gefahren |
| 620 | L1 | S0620L01 | A | last | letzte |
| 650 | L1 | S0650L01 | A | to go | gehen |

---

20 real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.

| arm | sets scored | generation failures |
|---|---|---|
| Sonnet 4.5 (live) | 20 / 20 | 0 |
| Opus 5 | 18 / 20 | 2 |
| Sonnet 5 | 19 / 20 | 1 |

## BUILD phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.60 | 0.28 | 0.16 |
| phrases inheriting course ambiguity | 0.50 | 0.00 | 0.00 |
| phrases written | 2.45 | 5.50 | 4.42 |
| neighbour x pattern combos | 0.50 | 5.06 | 4.11 |
| distinct neighbours touched | 0.50 | 4.78 | 3.95 |
| positions reached (of 3) | 0.40 | 2.44 | 2.42 |
| share in the filling position | 0.08 | 0.36 | 0.19 |
| pattern axes varied (of 5) | 0.10 | 2.78 | 2.21 |
| distinct pattern signatures | 0.35 | 3.72 | 2.84 |
| recency mass | 0.04 | 0.39 | 0.43 |
| new edges per syllable | 0.04 | 0.12 | 0.17 |
| **clears every floor** | 0% | 61% | 58% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| edgeCombos | 20 | 1 | 1 |
| positionSpread | 19 | 3 | 2 |
| axesVaried | 20 | 2 | 6 |
| gate | 13 | 1 | 1 |
| phrases | 18 | 0 | 0 |
| distinctAdjacencies | 17 | 1 | 1 |
| recencyMass | 18 | 6 | 3 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 4.40 | 0.50 | 0.32 |
| phrases inheriting course ambiguity | 2.20 | 0.00 | 0.00 |
| phrases written | 5.30 | 7.33 | 6.37 |
| neighbour x pattern combos | 0.90 | 6.78 | 5.89 |
| distinct neighbours touched | 0.90 | 6.00 | 5.32 |
| positions reached (of 3) | 0.75 | 2.28 | 2.26 |
| share in the filling position | 0.24 | 0.54 | 0.48 |
| pattern axes varied (of 5) | 0.10 | 4.33 | 3.79 |
| distinct pattern signatures | 0.45 | 6.33 | 4.79 |
| recency mass | 0.06 | 0.36 | 0.37 |
| new edges per syllable | 0.03 | 0.08 | 0.10 |
| USE phrases standing alone | 1.00 | 1.00 | 0.96 |
| **clears every floor** | 0% | 72% | 32% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| axesVaried | 20 | 1 | 2 |
| gate | 17 | 2 | 1 |
| edgeCombos | 19 | 1 | 4 |
| distinctAdjacencies | 17 | 1 | 1 |
| positionSpread | 14 | 3 | 3 |
| recencyMass | 18 | 4 | 4 |
| phrases | 7 | 0 | 0 |
| useCompleteShare | 0 | 0 | 4 |

## Floor sensitivity — does the conclusion survive moving the bar?

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).

| BUILD — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 67% | 95% |
| as set | 0% | 61% | 58% |
| one step TIGHTER | 0% | 33% | 11% |

| USE — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 83% | 68% |
| as set | 0% | 72% | 32% |
| one step TIGHTER | 0% | 39% | 5% |

## What a human would have to touch

One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.

| arm | clean | targeted | rewrite | regenerate |
|---|---|---|---|---|
| Sonnet 4.5 (live) | 0 | 0 | 3 | 17 |
| Opus 5 | 11 | 4 | 1 | 2 |
| Sonnet 5 | 4 | 13 | 1 | 1 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you want" → "du willst" | 0 / 2 / 0 / 11 | 0 / 2 / 4 / 13 | 0 / 2 / 4 / 11 |
| 45 | "everything" → "alles" | 4 / 2 / 2 / 6 | 0 / 3 / 5 / 13 | 0 / 2 / 5 / 12 |
| 75 | "have you got more to learn" → "hast du noch mehr zu lernen" | 5 / 1 / 0 / 2 | 0 / 3 / 5 / 11 | 0 / 3 / 3 / 11 |
| 110 | "friends" → "Freunde" | 6 / 1 / 0 / 0 | 0 / 3 / 4 / 12 | 0 / 1 / 5 / 10 |
| 130 | "that was a surprise" → "das war eine Überraschung" | 3 / 2 / 0 / 2 | 0 / 3 / 4 / 13 | 0 / 3 / 2 / 10 |
| 150 | "what your name is" → "wie du heißt" | 6 / 2 / 0 / 5 | *(no set)* | 0 / 2 / 3 / 10 |
| 206 | "the chance to practise speaking" → "die Gelegenheit sprechen zu üben" | 3 / 2 / 0 / 1 | 0 / 3 / 5 / 12 | 0 / 3 / 4 / 10 |
| 250 | "can you tell me" → "kannst du mir sagen" | 5 / 2 / 0 / 0 | 0 / 2 / 4 / 13 | 0 / 3 / 4 / 12 |
| 300 | "not to seem" → "nicht wirken" | 3 / 1 / 0 / 1 | *(no set)* | 9 / 1 / 0 / 1 |
| 358 | "your friend" → "deine Freundin" | 9 / 0 / 0 / 0 | 0 / 3 / 4 / 12 | 0 / 3 / 5 / 12 |
| 400 | "later" → "später" | 9 / 0 / 0 / 0 | 0 / 3 / 5 / 13 | 0 / 3 / 5 / 10 |
| 440 | "to travel" → "reisen" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 12 | 0 / 2 / 4 / 9 |
| 470 | "how high" → "wie hoch" | 8 / 0 / 0 / 0 | 0 / 2 / 4 / 12 | 0 / 2 / 4 / 9 |
| 510 | "safe" → "sicheren" | 9 / 0 / 0 / 0 | 0 / 1 / 5 / 12 | 0 / 1 / 5 / 10 |
| 535 | "job" → "Job" | 10 / 0 / 0 / 0 | 0 / 2 / 5 / 12 | 0 / 3 / 4 / 10 |
| 560 | "beach" → "Strand" | 10 / 0 / 0 / 0 | 13 / 0 / 0 / 0 | 0 / 3 / 4 / 11 |
| 580 | "children" → "Kinder" | 10 / 0 / 0 / 0 | 0 / 3 / 5 / 14 | 0 / 3 / 3 / 11 |
| 600 | "driven" → "gefahren" | 10 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 0 / 2 / 3 / 10 |
| 620 | "last" → "letzte" | 0 / 0 / 0 / 0 | 1 / 1 / 4 / 11 | *(no set)* |
| 650 | "to go" → "gehen" | 10 / 0 / 0 / 0 | 0 / 2 / 5 / 15 | 0 / 2 / 5 / 11 |

---

**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that's being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.

**Syllable basis: exact.** A real counter exists for this target language, so `new edges per syllable` is comparable with the other courses.

**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.
