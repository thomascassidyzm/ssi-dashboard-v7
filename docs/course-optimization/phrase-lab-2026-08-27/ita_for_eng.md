# Phrase prompt v3 — three-arm comparison (ita_for_eng)

**The answer in three sentences.** The v3 prompt reproduces the Spanish improvement on Italian: live Sonnet 4.5 clears every floor on 0% of LEGOs in both roles, against Opus 5 at 70% BUILD / 85% USE and Sonnet 5 at 80% BUILD / 25% USE — same shape as Spanish (0% / 90% / 75% BUILD, 0% / 75% / 50% USE), with the live-vs-generated gap even more extreme here. The improvement concentrates on exactly the axes Tom named for Spanish — pattern-axis variety and the filling position — and gate failures go from a real live-course problem (2 BUILD, 16 USE LEGOs) to zero for both generated arms. The one place the conclusion does NOT survive is Sonnet 5 USE under a one-step-tighter floor (25% → 5%, i.e. it clears only 1 of 20 LEGOs) — Opus 5 stays comfortably ahead of that cliff (85% → 35%) so the OPUS-BEATS-LIVE conclusion is robust, but an OPUS-BEATS-SONNET-5 conclusion on USE rests on a floor Tom didn't set.

20 real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.

## The measured LEGOs

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

## Specific to Italian, not predictable from the Spanish report

The gap between the two generated arms is wider here than in Spanish and inverted by role: on BUILD, Sonnet 5 (80%) actually edges out Opus 5 (70%) — the only role/arm pairing in either language where Sonnet 5 leads. On USE the relationship flips hard: Opus 5 holds 85% against Sonnet 5's 25%, a 60-point gap versus Spanish's 25-point gap (75% vs 50%). Sonnet 5's USE shortfall is concentrated on `axesVaried` (7 of 20 LEGOs short) and `edgeCombos` (3 short) — it is writing complete, gate-clean USE phrases but not spreading them across enough grammatical variation, a pattern Italian's morphology (mood/tense marked on the verb itself rather than by a separate word) may make easier to under-vary without it reading as repetitive. That is a hypothesis, not a measured finding — nothing here isolates "Italian morphology" from "this specific prompt run."

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

## Blind judge — is the USE phrase worth having?

Same 7 LEGOs judged blind (arm label withheld) for all three arms — seeds 20, 110, 206, 400, 470, 560, 650. (First attempt sampled by even-spacing-in-file-order per arm, which is only safe when every arm has the same seed set in the same order; live is missing seed 250 and Sonnet 5's first pass was missing seed 620 — both are genuine gate/session-limit gaps, not artefacts of this fix — so the three arms' file orders diverged and the first sample picked different LEGOs per arm. Rebuilt each arm's judge input as an explicit filter to the seeds above before rejudging.)

| arm | mean worth-having |
|---|---|
| Sonnet 4.5 (live) | 0.78 |
| Opus 5 | 0.79 |
| Sonnet 5 | 0.76 |

All three arms land within 3 points of each other on this 7-LEGO sample — the blind judge does not separate the arms the way the mechanical floors do. Read this against the mechanical result, not instead of it: the judge only sees USE phrases that exist and asks "would a person say this", so it cannot see live's real problem, which is USE sets that are absent, gate-failed, or too thin to reach floor — it is scoring the survivors. On live, 3 of the 20 LEGOs have zero USE phrases at all (one is seed 250, with zero phrases of any role) and were excluded from judging entirely, same as from the mean above.

## Generation failures

- **Sonnet 4.5 (live), seed 250** ("something else" → "qualcos'altro"): zero phrases of any role in the live database — not a generation failure, a fact about the live course.
- **Sonnet 5, seed 620** ("really" → "davvero"): first generation attempt failed on a CLI session-limit wall ("You've hit your session limit · resets 3pm (UTC)") that turned out to be account-wide, blocking BUILD/USE generation and the blind judge alike for roughly two hours. Retried after the 15:00 UTC reset and succeeded (10 phrases); the arm now scores 20/20 with 0 failures. The wait is real dead time this run absorbed — worth flagging to the lead since four other courses' workers were likely hitting the same wall concurrently.
