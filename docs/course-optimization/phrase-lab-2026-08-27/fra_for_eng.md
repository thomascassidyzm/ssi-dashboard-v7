# Phrase prompt v3 — French (fra_for_eng)

## The answer

**Yes — the v3 prompt reproduces the Spanish result on French.** The live course content clears every floor on **0%** of the 20 measured LEGOs, on both BUILD and USE; Opus 5 with the v3 prompt clears **70% BUILD / 75% USE**, and Sonnet 5 clears **60% / 35%**.

The gain sits where it sat on Spanish: **USE pattern variety** (LEGOs short on `axesVaried`: live 19 of 20, Opus 1, Sonnet 5 7), **the filling position** (share of phrases with the new LEGO held on both sides: live 0.19, Opus 0.60, Sonnet 5 0.45), and **distinct neighbour x pattern combinations** (live 3.4, Opus 7.2, Sonnet 5 5.8 per LEGO).

**The conclusion survives the floors.** Opus 5 leads Sonnet 5 on both roles at every setting of the sensitivity table — one step looser, as set, and one step tighter. Nothing here depends on the calibration.

## What a human would have to touch

Of the 20 measured LEGOs: live content leaves **0 clean**, Opus 5 leaves **12 clean**, Sonnet 5 leaves **6 clean**. Full breakdown in the table further down.

## The blind "worth having" judgement

| arm | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| share of USE phrases judged worth having | 0.71 | 0.89 | 0.65 |

all three arms judged on the same 7 LEGOs (20/110/206/358/470/560/620)

## The measured LEGOs

Chosen by one rule applied identically to all six courses: within each of the 20 seed numbers the Spanish run used, take `lego_index` 1, or the lowest index that is a real A/M LEGO if index 1 does not exist. The English seed corpus is shared estate-wide, so these 20 seeds carry the same English sentences in every course.

| seed | lego | id | type | known | target |
|---|---|---|---|---|---|
| 20 | L1 | S0020L01 | M | you want | tu veux |
| 45 | L1 | S0045L01 | M | I don't need to | je n'ai pas besoin de |
| 75 | L1 | S0075L01 | M | have you got | as-tu |
| 110 | L1 | S0110L01 | M | we're friends | nous sommes amis |
| 130 | L1 | S0130L01 | A | surprise | surprise |
| 150 | L1 | S0150L01 | M | can you tell me | peux-tu me dire |
| 206 | L1 | S0206L01 | A | I enjoy | j'apprécie |
| 250 | L1 | S0250L01 | M | tell me something else | me dire autre chose |
| 300 | L1 | S0300L01 | M | to seem | avoir l'air |
| 358 | L1 | S0358L01 | A | to reach | atteindre |
| 400 | L1 | S0400L01 | M | do we want | voulons-nous |
| 440 | L1 | S0440L01 | A | to travel | voyager |
| 470 | L1 | S0470L01 | M | how high | jusqu'à quelle hauteur |
| 510 | L1 | S0510L01 | M | somewhere safe | un endroit sûr |
| 535 | L1 | S0535L01 | M | the wrong job | le mauvais travail |
| 560 | L1 | S0560L01 | M | the beach | la plage |
| 580 | L1 | S0580L01 | A | to take | emmener |
| 600 | L1 | S0600L01 | A | tired | fatigué |
| 620 | L1 | S0620L01 | M | very long time | très longtemps |
| 650 | L1 | S0650L01 | M | do you want to go madam? | voulez-vous partir madame ? |

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
| layer-1 gate failures | 0.15 | 0.00 | 0.15 |
| phrases inheriting course ambiguity | 1.70 | 0.00 | 0.00 |
| phrases written | 3.05 | 5.50 | 4.50 |
| neighbour x pattern combos | 1.70 | 5.50 | 4.10 |
| distinct neighbours touched | 1.45 | 5.30 | 4.05 |
| positions reached (of 3) | 0.95 | 2.85 | 2.40 |
| share in the filling position | 0.00 | 0.32 | 0.17 |
| pattern axes varied (of 5) | 0.65 | 2.55 | 2.05 |
| distinct pattern signatures | 1.25 | 3.60 | 2.70 |
| recency mass | 0.07 | 0.51 | 0.54 |
| new edges per syllable | 0.13 | 0.12 | 0.13 |
| **clears every floor** | 0% | 70% | 60% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| positionSpread | 18 | 0 | 0 |
| axesVaried | 17 | 3 | 7 |
| edgeCombos | 19 | 0 | 3 |
| recencyMass | 16 | 3 | 1 |
| gate | 3 | 0 | 1 |
| distinctAdjacencies | 11 | 0 | 0 |
| phrases | 12 | 0 | 0 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.00 | 0.00 | 0.25 |
| phrases inheriting course ambiguity | 4.35 | 0.00 | 0.00 |
| phrases written | 5.25 | 7.15 | 6.35 |
| neighbour x pattern combos | 3.40 | 7.15 | 5.85 |
| distinct neighbours touched | 3.20 | 6.85 | 5.35 |
| positions reached (of 3) | 1.15 | 2.30 | 2.10 |
| share in the filling position | 0.19 | 0.60 | 0.45 |
| pattern axes varied (of 5) | 1.10 | 4.15 | 3.20 |
| distinct pattern signatures | 1.90 | 5.90 | 4.10 |
| recency mass | 0.17 | 0.51 | 0.54 |
| new edges per syllable | 0.09 | 0.08 | 0.09 |
| USE phrases standing alone | 0.98 | 1.00 | 0.99 |
| **clears every floor** | 0% | 75% | 35% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| axesVaried | 19 | 1 | 7 |
| positionSpread | 14 | 1 | 4 |
| gate | 9 | 0 | 1 |
| edgeCombos | 17 | 0 | 6 |
| recencyMass | 14 | 3 | 2 |
| useCompleteShare | 1 | 0 | 2 |
| distinctAdjacencies | 6 | 0 | 1 |
| phrases | 4 | 0 | 0 |

## Floor sensitivity — does the conclusion survive moving the bar?

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).

| BUILD — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 85% | 85% |
| as set | 0% | 70% | 60% |
| one step TIGHTER | 0% | 45% | 0% |

| USE — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 90% | 65% |
| as set | 0% | 75% | 35% |
| one step TIGHTER | 0% | 25% | 5% |

## What a human would have to touch

One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.

| arm | clean | targeted | rewrite | regenerate |
|---|---|---|---|---|
| Sonnet 4.5 (live) | 0 | 0 | 10 | 10 |
| Opus 5 | 12 | 8 | 0 | 0 |
| Sonnet 5 | 6 | 9 | 4 | 1 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you want" → "tu veux" | 0 / 2 / 0 / 10 | 0 / 2 / 4 / 12 | 0 / 2 / 3 / 8 |
| 45 | "I don't need to" → "je n'ai pas besoin de" | 0 / 1 / 0 / 11 | 0 / 2 / 1 / 14 | 0 / 2 / 1 / 11 |
| 75 | "have you got" → "as-tu" | 3 / 1 / 1 / 7 | 0 / 2 / 4 / 12 | 0 / 2 / 0 / 8 |
| 110 | "we're friends" → "nous sommes amis" | 3 / 2 / 1 / 3 | 0 / 3 / 4 / 12 | 0 / 3 / 4 / 10 |
| 130 | "surprise" → "surprise" | 3 / 2 / 2 / 8 | 0 / 2 / 5 / 13 | 8 / 1 / 0 / 3 |
| 150 | "can you tell me" → "peux-tu me dire" | 1 / 1 / 1 / 8 | 0 / 2 / 3 / 12 | 0 / 3 / 2 / 12 |
| 206 | "I enjoy" → "j'apprécie" | 5 / 1 / 0 / 3 | 0 / 2 / 3 / 12 | 0 / 2 / 1 / 11 |
| 250 | "tell me something else" → "me dire autre chose" | 4 / 2 / 2 / 5 | 0 / 2 / 4 / 15 | 0 / 2 / 4 / 10 |
| 300 | "to seem" → "avoir l'air" | 1 / 1 / 4 / 7 | 0 / 2 / 4 / 13 | 0 / 1 / 5 / 11 |
| 358 | "to reach" → "atteindre" | 1 / 1 / 2 / 5 | 0 / 2 / 5 / 12 | 0 / 1 / 5 / 10 |
| 400 | "do we want" → "voulons-nous" | 0 / 1 / 0 / 6 | 0 / 2 / 4 / 14 | 0 / 2 / 1 / 10 |
| 440 | "to travel" → "voyager" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 11 | 0 / 3 / 4 / 11 |
| 470 | "how high" → "jusqu'à quelle hauteur" | 1 / 1 / 2 / 7 | 0 / 3 / 4 / 11 | 0 / 3 / 4 / 10 |
| 510 | "somewhere safe" → "un endroit sûr" | 0 / 1 / 1 / 3 | 0 / 3 / 5 / 12 | 0 / 2 / 5 / 11 |
| 535 | "the wrong job" → "le mauvais travail" | 0 / 1 / 2 / 6 | 0 / 3 / 5 / 12 | 0 / 2 / 5 / 11 |
| 560 | "the beach" → "la plage" | 0 / 2 / 1 / 3 | 0 / 3 / 4 / 16 | 0 / 3 / 5 / 10 |
| 580 | "to take" → "emmener" | 1 / 2 / 1 / 5 | 0 / 1 / 5 / 12 | 0 / 1 / 4 / 10 |
| 600 | "tired" → "fatigué" | 0 / 0 / 0 / 0 | 0 / 2 / 5 / 12 | 0 / 2 / 4 / 12 |
| 620 | "very long time" → "très longtemps" | 0 / 1 / 2 / 5 | 0 / 2 / 5 / 13 | 0 / 2 / 2 / 10 |
| 650 | "do you want to go madam?" → "voulez-vous partir madame ?" | 0 / 0 / 0 / 0 | 0 / 3 / 4 / 13 | 0 / 3 / 5 / 10 |

---

**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that's being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.

**Syllable basis: exact.** A real counter exists for this target language, so `new edges per syllable` is comparable with the other courses.

**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.
