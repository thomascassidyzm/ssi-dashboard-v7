# Phrase prompt v3 — Italian (ita_for_eng)

## The answer

**Yes — the v3 prompt reproduces the Spanish result on Italian.** The live course content clears every floor on **0%** of the 20 measured LEGOs, on both BUILD and USE; Opus 5 with the v3 prompt clears **70% BUILD / 85% USE**, and Sonnet 5 clears **80% / 25%**.

The gain sits where it sat on Spanish: **USE pattern variety** (LEGOs short on `axesVaried`: live 18 of 20, Opus 1, Sonnet 5 7), **the filling position** (share of phrases with the new LEGO held on both sides: live 0.22, Opus 0.61, Sonnet 5 0.53), and **distinct neighbour x pattern combinations** (live 3.5, Opus 7.3, Sonnet 5 6.0 per LEGO).

**The conclusion survives on USE and is calibration-sensitive on BUILD.** Opus 5 leads Sonnet 5 on USE at every setting — looser (95% vs 75%), as set (85% vs 25%), tighter (35% vs 5%). On BUILD the two arms trade places depending on where the bar sits: one step looser 90% vs 90%, as set 70% vs 80%, one step tighter 40% vs 5%. **Read the BUILD headline as calibration-dependent; the USE headline is not.**

## What a human would have to touch

Of the 20 measured LEGOs: live content leaves **0 clean**, Opus 5 leaves **12 clean**, Sonnet 5 leaves **5 clean**. Full breakdown in the table further down.

## The blind "worth having" judgement

| arm | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| share of USE phrases judged worth having | 0.77 | 0.82 | 0.77 |

all three arms judged on the same 7 LEGOs (20/110/206/358/470/560/620)

## The measured LEGOs

Chosen by one rule applied identically to all six courses: within each of the 20 seed numbers the Spanish run used, take `lego_index` 1, or the lowest index that is a real A/M LEGO if index 1 does not exist. The English seed corpus is shared estate-wide, so these 20 seeds carry the same English sentences in every course.

| seed | lego | id | type | known | target |
|---|---|---|---|---|---|
| 20 | L1 | S0020L01 | A | you want | vuoi |
| 45 | L1 | S0045L01 | M | I don't need to | non ho bisogno di |
| 75 | L1 | S0075L01 | M | have you got more to learn | hai di più da imparare |
| 110 | L1 | S0110L01 | M | we're friends | siamo amici |
| 130 | L1 | S0130L01 | M | it was a surprise because | è stata una sorpresa perché |
| 150 | L1 | S0150L01 | M | can you tell me | puoi dirmi |
| 206 | L1 | S0206L01 | M | I enjoy the chance to practise speaking | mi piace l'occasione di fare pratica parlando |
| 250 | L1 | S0250L01 | M | something else | qualcos'altro |
| 300 | L1 | S0300L01 | M | seem | sembrare |
| 358 | L1 | S0358L01 | A | to reach | raggiungere |
| 400 | L1 | S0400L01 | A | to eat | mangiare |
| 440 | L1 | S0440L01 | M | while they're still | finché sono ancora |
| 470 | L1 | S0470L01 | M | how high | quanto in alto |
| 510 | L1 | S0510L01 | A | to look for | cercare |
| 535 | L1 | S0535L01 | M | he made a promise | ha fatto una promessa |
| 560 | L1 | S0560L01 | M | the beach | la spiaggia |
| 580 | L1 | S0580L01 | M | we've often wanted to | abbiamo spesso voluto |
| 600 | L1 | S0600L01 | M | I would have driven | avrei guidato |
| 620 | L1 | S0620L01 | A | really | davvero |
| 650 | L1 | S0650L01 | M | do you want to go | vuole andare |

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
| layer-1 gate failures | 0.10 | 0.00 | 0.00 |
| phrases inheriting course ambiguity | 1.05 | 0.00 | 0.00 |
| phrases written | 3.10 | 5.45 | 4.30 |
| neighbour x pattern combos | 1.70 | 5.45 | 4.20 |
| distinct neighbours touched | 1.70 | 5.45 | 4.20 |
| positions reached (of 3) | 1.10 | 2.95 | 2.70 |
| share in the filling position | 0.02 | 0.37 | 0.27 |
| pattern axes varied (of 5) | 0.45 | 2.65 | 2.20 |
| distinct pattern signatures | 1.25 | 3.55 | 2.80 |
| recency mass | 0.15 | 0.50 | 0.58 |
| new edges per syllable | 0.13 | 0.10 | 0.10 |
| **clears every floor** | 0% | 70% | 80% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| phrases | 15 | 0 | 0 |
| edgeCombos | 20 | 0 | 0 |
| positionSpread | 17 | 0 | 0 |
| axesVaried | 18 | 4 | 4 |
| recencyMass | 14 | 3 | 1 |
| distinctAdjacencies | 6 | 0 | 0 |
| gate | 2 | 0 | 0 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.55 | 0.00 | 0.00 |
| phrases inheriting course ambiguity | 3.50 | 0.00 | 0.00 |
| phrases written | 5.40 | 7.35 | 6.10 |
| neighbour x pattern combos | 3.45 | 7.35 | 6.05 |
| distinct neighbours touched | 3.35 | 7.25 | 5.75 |
| positions reached (of 3) | 1.40 | 2.35 | 2.20 |
| share in the filling position | 0.22 | 0.61 | 0.53 |
| pattern axes varied (of 5) | 1.30 | 4.15 | 3.45 |
| distinct pattern signatures | 2.15 | 6.30 | 4.55 |
| recency mass | 0.20 | 0.54 | 0.65 |
| new edges per syllable | 0.08 | 0.06 | 0.08 |
| USE phrases standing alone | 0.98 | 1.00 | 0.98 |
| **clears every floor** | 0% | 85% | 25% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| gate | 16 | 0 | 0 |
| phrases | 3 | 0 | 0 |
| edgeCombos | 20 | 0 | 3 |
| positionSpread | 11 | 1 | 4 |
| axesVaried | 18 | 1 | 7 |
| recencyMass | 12 | 1 | 1 |
| distinctAdjacencies | 1 | 0 | 0 |
| useCompleteShare | 1 | 0 | 2 |

## Floor sensitivity — does the conclusion survive moving the bar?

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).

| BUILD — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 90% | 90% |
| as set | 0% | 70% | 80% |
| one step TIGHTER | 0% | 40% | 5% |

| USE — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 95% | 75% |
| as set | 0% | 85% | 25% |
| one step TIGHTER | 0% | 35% | 5% |

## What a human would have to touch

One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.

| arm | clean | targeted | rewrite | regenerate |
|---|---|---|---|---|
| Sonnet 4.5 (live) | 0 | 0 | 4 | 16 |
| Opus 5 | 12 | 7 | 1 | 0 |
| Sonnet 5 | 5 | 14 | 1 | 0 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you want" → "vuoi" | 2 / 1 / 1 / 5 | 0 / 3 / 5 / 12 | 0 / 2 / 3 / 11 |
| 45 | "I don't need to" → "non ho bisogno di" | 1 / 1 / 0 / 6 | 0 / 2 / 3 / 13 | 0 / 2 / 1 / 10 |
| 75 | "have you got more to learn" → "hai di più da imparare" | 1 / 2 / 1 / 5 | 0 / 3 / 4 / 13 | 0 / 3 / 5 / 10 |
| 110 | "we're friends" → "siamo amici" | 3 / 2 / 2 / 5 | 0 / 3 / 4 / 12 | 0 / 3 / 3 / 9 |
| 130 | "it was a surprise because" → "è stata una sorpresa perché" | 5 / 1 / 2 / 5 | 0 / 2 / 2 / 12 | 0 / 2 / 2 / 11 |
| 150 | "can you tell me" → "puoi dirmi" | 2 / 1 / 2 / 5 | 0 / 2 / 4 / 13 | 0 / 2 / 2 / 9 |
| 206 | "I enjoy the chance to practise speaking" → "mi piace l'occasione di fare pratica parlando" | 2 / 2 / 0 / 6 | 0 / 3 / 4 / 13 | 0 / 2 / 2 / 10 |
| 250 | "something else" → "qualcos'altro" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 13 | 0 / 3 / 5 / 11 |
| 300 | "seem" → "sembrare" | 1 / 1 / 1 / 3 | 0 / 1 / 5 / 13 | 0 / 1 / 5 / 10 |
| 358 | "to reach" → "raggiungere" | 3 / 2 / 4 / 5 | 0 / 2 / 5 / 13 | 0 / 1 / 5 / 10 |
| 400 | "to eat" → "mangiare" | 2 / 2 / 3 / 7 | 0 / 3 / 5 / 13 | 0 / 2 / 5 / 10 |
| 440 | "while they're still" → "finché sono ancora" | 0 / 2 / 2 / 6 | 0 / 2 / 3 / 13 | 0 / 1 / 4 / 11 |
| 470 | "how high" → "quanto in alto" | 3 / 1 / 1 / 4 | 0 / 2 / 4 / 12 | 0 / 3 / 4 / 10 |
| 510 | "to look for" → "cercare" | 1 / 2 / 2 / 7 | 0 / 2 / 4 / 13 | 0 / 1 / 5 / 11 |
| 535 | "he made a promise" → "ha fatto una promessa" | 0 / 2 / 2 / 6 | 0 / 2 / 5 / 12 | 0 / 3 / 4 / 10 |
| 560 | "the beach" → "la spiaggia" | 2 / 2 / 0 / 5 | 0 / 2 / 5 / 13 | 0 / 3 / 4 / 11 |
| 580 | "we've often wanted to" → "abbiamo spesso voluto" | 1 / 1 / 0 / 6 | 0 / 2 / 4 / 15 | 0 / 2 / 2 / 10 |
| 600 | "I would have driven" → "avrei guidato" | 2 / 1 / 1 / 5 | 0 / 2 / 3 / 12 | 0 / 3 / 2 / 10 |
| 620 | "really" → "davvero" | 2 / 1 / 1 / 5 | 0 / 3 / 5 / 12 | 0 / 3 / 5 / 10 |
| 650 | "do you want to go" → "vuole andare" | 0 / 1 / 1 / 7 | 0 / 3 / 4 / 14 | 0 / 2 / 1 / 11 |

---

**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that's being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.

**Syllable basis: exact.** A real counter exists for this target language, so `new edges per syllable` is comparable with the other courses.

**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.
