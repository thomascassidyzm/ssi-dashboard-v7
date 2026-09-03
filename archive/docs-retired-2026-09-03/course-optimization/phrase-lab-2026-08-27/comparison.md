# Phrase prompt v3 — three-arm comparison (spa_for_eng)

20 real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.

| arm | sets scored | generation failures |
|---|---|---|
| Sonnet 4.5 (live) | 20 / 20 | 0 |
| Opus 5 | 20 / 20 | 0 |
| Sonnet 5 | 20 / 20 | 0 |

## BUILD phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 0.50 | 0.00 | 0.20 |
| phrases inheriting course ambiguity | 1.30 | 0.00 | 0.00 |
| phrases written | 3.00 | 5.15 | 4.55 |
| neighbour x pattern combos | 1.80 | 5.15 | 4.35 |
| distinct neighbours touched | 1.65 | 5.05 | 4.25 |
| positions reached (of 3) | 0.95 | 2.65 | 2.50 |
| share in the filling position | 0.07 | 0.44 | 0.22 |
| pattern axes varied (of 5) | 0.65 | 2.80 | 2.25 |
| distinct pattern signatures | 1.25 | 3.80 | 3.05 |
| recency mass | 0.17 | 0.52 | 0.46 |
| one-distinction ascent | 0.75 | 0.57 | 0.58 |
| new edges per syllable | 0.10 | 0.11 | 0.11 |
| **clears every floor** | 0% | 90% | 60% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| positionSpread | 16 | 0 | 2 |
| axesVaried | 16 | 1 | 4 |
| gate | 6 | 0 | 1 |
| phrases | 13 | 0 | 0 |
| edgeCombos | 17 | 0 | 1 |
| distinctAdjacencies | 9 | 0 | 1 |
| recencyMass | 14 | 1 | 5 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.75 | 0.00 | 0.30 |
| phrases inheriting course ambiguity | 3.85 | 0.00 | 0.00 |
| phrases written | 4.80 | 6.80 | 6.25 |
| neighbour x pattern combos | 2.65 | 6.75 | 5.95 |
| distinct neighbours touched | 2.35 | 6.50 | 5.75 |
| positions reached (of 3) | 1.10 | 2.45 | 2.05 |
| share in the filling position | 0.28 | 0.64 | 0.55 |
| pattern axes varied (of 5) | 1.25 | 4.35 | 3.10 |
| distinct pattern signatures | 1.70 | 5.70 | 4.25 |
| recency mass | 0.15 | 0.49 | 0.39 |
| one-distinction ascent | 0.76 | 0.29 | 0.52 |
| new edges per syllable | 0.06 | 0.07 | 0.08 |
| USE phrases standing alone | 1.00 | 1.00 | 0.99 |
| **clears every floor** | 0% | 75% | 50% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| axesVaried | 14 | 0 | 7 |
| gate | 10 | 0 | 1 |
| edgeCombos | 19 | 1 | 3 |
| positionSpread | 15 | 1 | 3 |
| distinctAdjacencies | 7 | 0 | 1 |
| recencyMass | 12 | 3 | 3 |
| phrases | 6 | 0 | 0 |
| useCompleteShare | 0 | 0 | 1 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you want" → "quieres" | 0 / 2 / 0 / 10 | 0 / 3 / 5 / 14 | 0 / 2 / 4 / 13 |
| 45 | "to know" → "saber" | 4 / 1 / 4 / 6 | 0 / 3 / 5 / 11 | 0 / 2 / 4 / 12 |
| 75 | "you have" → "tienes" | 7 / 2 / 0 / 4 | 0 / 3 / 5 / 13 | 0 / 2 / 5 / 11 |
| 110 | "we're friends" → "somos amigos" | 7 / 1 / 0 / 1 | 0 / 3 / 5 / 12 | 0 / 3 / 4 / 12 |
| 130 | "surprise" → "sorpresa" | 3 / 2 / 5 / 8 | 0 / 2 / 3 / 8 | 10 / 0 / 0 / 0 |
| 150 | "can you" → "puedes" | 0 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 0 / 2 / 3 / 10 |
| 206 | "I enjoy" → "disfruto" | 7 / 1 / 1 / 3 | 0 / 3 / 3 / 12 | 0 / 2 / 2 / 11 |
| 250 | "to tell me" → "decirme" | 0 / 0 / 0 / 0 | 0 / 3 / 4 / 13 | 0 / 1 / 4 / 10 |
| 300 | "to seem" → "parecer" | 3 / 1 / 1 / 6 | 0 / 2 / 5 / 12 | 0 / 2 / 3 / 11 |
| 358 | "the top" → "la cima" | 0 / 1 / 3 / 5 | 0 / 3 / 5 / 12 | 0 / 3 / 4 / 13 |
| 400 | "to eat" → "comer" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 11 | 0 / 3 / 5 / 10 |
| 440 | "to travel" → "viajar" | 0 / 0 / 0 / 0 | 0 / 2 / 5 / 12 | 0 / 3 / 5 / 10 |
| 470 | "how high" → "hasta qué altura" | 0 / 3 / 4 / 7 | 0 / 3 / 5 / 11 | 0 / 3 / 4 / 11 |
| 510 | "she's gone to" → "se ha ido a" | 0 / 1 / 0 / 7 | 0 / 2 / 3 / 11 | 0 / 2 / 2 / 12 |
| 535 | "he made a promise that" → "hizo la promesa de que" | 0 / 1 / 0 / 5 | 0 / 2 / 4 / 12 | 0 / 2 / 2 / 9 |
| 560 | "it goes down to" → "baja hasta" | 6 / 1 / 0 / 3 | 0 / 1 / 4 / 14 | 0 / 2 / 3 / 11 |
| 580 | "we've often wanted to" → "hemos querido a menudo" | 2 / 1 / 0 / 5 | 0 / 2 / 3 / 12 | 0 / 2 / 2 / 11 |
| 600 | "driven" → "conducido" | 4 / 1 / 1 / 4 | 0 / 2 / 4 / 13 | 0 / 1 / 1 / 10 |
| 620 | "a very long time" → "muchísimo" | 0 / 1 / 3 / 8 | 0 / 2 / 5 / 11 | 0 / 2 / 3 / 10 |
| 650 | "want to go" → "quiere irse" | 2 / 2 / 3 / 7 | 0 / 3 / 4 / 11 | 0 / 2 / 2 / 9 |
