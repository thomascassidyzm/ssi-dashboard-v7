# Phrase prompt v3 — Japanese (jpn_for_eng)

## The answer

**Yes — the v3 prompt reproduces the Spanish result on Japanese.** The live course content clears every floor on **0%** of the 20 measured LEGOs, on both BUILD and USE; Opus 5 with the v3 prompt clears **65% BUILD / 80% USE**, and Sonnet 5 clears **40% / 55%**.

The gain sits where it sat on Spanish: **USE pattern variety** (LEGOs short on `axesVaried`: live 20 of 20, Opus 2, Sonnet 5 5), **the filling position** (share of phrases with the new LEGO held on both sides: live 0.07, Opus 0.50, Sonnet 5 0.38), and **distinct neighbour x pattern combinations** (live 0.6, Opus 7.1, Sonnet 5 5.8 per LEGO).

**The conclusion survives the floors.** Opus 5 leads Sonnet 5 on both roles at every setting of the sensitivity table — one step looser, as set, and one step tighter. Nothing here depends on the calibration.

## What a human would have to touch

Of the 20 measured LEGOs: live content leaves **0 clean**, Opus 5 leaves **12 clean**, Sonnet 5 leaves **5 clean**. Full breakdown in the table further down.

## The blind "worth having" judgement

| arm | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| share of USE phrases judged worth having | *(withheld)* | 0.78 | 0.75 |

Opus 5 and Sonnet 5 judged on the same 7 LEGOs and comparable. The live arm fell on a different subset and its score is withheld.

## The measured LEGOs

Chosen by one rule applied identically to all six courses: within each of the 20 seed numbers the Spanish run used, take `lego_index` 1, or the lowest index that is a real A/M LEGO if index 1 does not exist. The English seed corpus is shared estate-wide, so these 20 seeds carry the same English sentences in every course.

| seed | lego | id | type | known | target |
|---|---|---|---|---|---|
| 20 | L1 | S0020L01 | M | want to remember | 覚えたい |
| 45 | L1 | S0045L01 | M | don't need to | 必要はない |
| 75 | L1 | S0075L01 | M | have you got more to learn | まだ学ぶことある |
| 110 | L1 | S0110L01 | M | friends | 友だち |
| 130 | L1 | S0130L01 | M | was surprised | 驚いた |
| 150 | L1 | S0150L01 | M | will you tell me | 教えてくれる |
| 206 | L1 | S0206L01 | M | to practise | 練習する |
| 250 | L1 | S0250L01 | M | before answering | 答える前に |
| 300 | L1 | S0300L01 | M | seem | 見られる |
| 358 | L1 | S0358L01 | A | top | 頂上 |
| 400 | L1 | S0400L01 | M | want to eat something later | あとで何か食べたい |
| 440 | L1 | S0440L01 | A | young | 若い |
| 470 | L1 | S0470L01 | M | how far | どこまで |
| 510 | L1 | S0510L01 | A | safely | 安全に |
| 535 | L1 | S0535L01 | M | made a promise | 約束した |
| 560 | L1 | S0560L01 | M | to the beach | 浜まで |
| 580 | L1 | S0580L01 | A | place | 所 |
| 600 | L1 | S0600L01 | M | if you'd told me that | って言ってくれてたら |
| 620 | L1 | S0620L01 | M | since we last met | 最後に会ってから |
| 650 | L1 | S0650L01 | M | go out? | 出かけますか |

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
| layer-1 gate failures | 2.35 | 0.05 | 0.10 |
| phrases inheriting course ambiguity | 0.35 | 0.00 | 0.00 |
| phrases written | 2.95 | 5.40 | 4.50 |
| neighbour x pattern combos | 0.20 | 5.30 | 4.05 |
| distinct neighbours touched | 0.20 | 5.30 | 4.05 |
| positions reached (of 3) | 0.25 | 2.75 | 2.35 |
| share in the filling position | 0.01 | 0.29 | 0.16 |
| pattern axes varied (of 5) | 0.05 | 2.20 | 1.70 |
| distinct pattern signatures | 0.15 | 3.25 | 2.50 |
| recency mass | 0.00 | 0.54 | 0.58 |
| new edges per syllable | 0.01 | 0.08 | 0.09 |
| **clears every floor** | 0% | 65% | 40% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| edgeCombos | 20 | 0 | 5 |
| positionSpread | 19 | 1 | 2 |
| axesVaried | 20 | 5 | 8 |
| recencyMass | 20 | 1 | 3 |
| gate | 16 | 1 | 1 |
| distinctAdjacencies | 19 | 0 | 1 |
| phrases | 13 | 0 | 0 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 4.15 | 0.05 | 0.25 |
| phrases inheriting course ambiguity | 1.15 | 0.00 | 0.00 |
| phrases written | 4.90 | 7.15 | 6.25 |
| neighbour x pattern combos | 0.55 | 7.10 | 5.85 |
| distinct neighbours touched | 0.50 | 6.95 | 5.65 |
| positions reached (of 3) | 0.35 | 2.25 | 2.40 |
| share in the filling position | 0.07 | 0.50 | 0.38 |
| pattern axes varied (of 5) | 0.10 | 3.70 | 3.25 |
| distinct pattern signatures | 0.35 | 5.20 | 4.05 |
| recency mass | 0.07 | 0.49 | 0.57 |
| new edges per syllable | 0.02 | 0.06 | 0.07 |
| USE phrases standing alone | 1.00 | 1.00 | 0.98 |
| **clears every floor** | 0% | 80% | 55% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| phrases | 4 | 0 | 0 |
| edgeCombos | 20 | 0 | 3 |
| positionSpread | 18 | 2 | 2 |
| axesVaried | 20 | 2 | 5 |
| gate | 17 | 1 | 3 |
| distinctAdjacencies | 17 | 0 | 0 |
| recencyMass | 16 | 0 | 2 |
| useCompleteShare | 0 | 0 | 1 |

## Floor sensitivity — does the conclusion survive moving the bar?

The floors are **not Tom's ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run's calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).

| BUILD — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 85% | 75% |
| as set | 0% | 65% | 40% |
| one step TIGHTER | 0% | 30% | 10% |

| USE — clears every floor | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| one step LOOSER | 0% | 95% | 70% |
| as set | 0% | 80% | 55% |
| one step TIGHTER | 0% | 15% | 5% |

## What a human would have to touch

One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.

| arm | clean | targeted | rewrite | regenerate |
|---|---|---|---|---|
| Sonnet 4.5 (live) | 0 | 0 | 3 | 17 |
| Opus 5 | 12 | 5 | 1 | 2 |
| Sonnet 5 | 5 | 9 | 2 | 4 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "want to remember" → "覚えたい" | 0 / 1 / 0 / 7 | 0 / 3 / 5 / 13 | 0 / 1 / 0 / 12 |
| 45 | "don't need to" → "必要はない" | 6 / 1 / 0 / 2 | 0 / 1 / 2 / 10 | 0 / 2 / 4 / 11 |
| 75 | "have you got more to learn" → "まだ学ぶことある" | 0 / 2 / 2 / 3 | 0 / 3 / 3 / 12 | 2 / 3 / 4 / 8 |
| 110 | "friends" → "友だち" | 9 / 2 / 0 / 2 | 0 / 2 / 3 / 12 | 1 / 2 / 3 / 4 |
| 130 | "was surprised" → "驚いた" | 9 / 0 / 0 / 0 | 0 / 3 / 3 / 11 | 0 / 3 / 3 / 10 |
| 150 | "will you tell me" → "教えてくれる" | 9 / 0 / 0 / 0 | 0 / 3 / 4 / 14 | 0 / 2 / 2 / 11 |
| 206 | "to practise" → "練習する" | 0 / 0 / 0 / 0 | 0 / 3 / 4 / 14 | 0 / 3 / 5 / 9 |
| 250 | "before answering" → "答える前に" | 8 / 0 / 0 / 0 | 0 / 2 / 4 / 14 | 0 / 3 / 4 / 11 |
| 300 | "seem" → "見られる" | 8 / 1 / 0 / 1 | 0 / 2 / 4 / 11 | 0 / 3 / 3 / 10 |
| 358 | "top" → "頂上" | 8 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 0 / 3 / 4 / 10 |
| 400 | "want to eat something later" → "あとで何か食べたい" | 8 / 0 / 0 / 0 | 1 / 3 / 3 / 12 | 0 / 3 / 3 / 10 |
| 440 | "young" → "若い" | 8 / 0 / 0 / 0 | 0 / 2 / 4 / 13 | 0 / 2 / 4 / 10 |
| 470 | "how far" → "どこまで" | 8 / 0 / 0 / 0 | 0 / 2 / 4 / 12 | 0 / 2 / 5 / 11 |
| 510 | "safely" → "安全に" | 4 / 0 / 0 / 0 | 0 / 2 / 4 / 12 | 0 / 2 / 5 / 13 |
| 535 | "made a promise" → "約束した" | 6 / 0 / 0 / 0 | 0 / 3 / 4 / 14 | 0 / 3 / 4 / 10 |
| 560 | "to the beach" → "浜まで" | 8 / 0 / 0 / 0 | 1 / 2 / 4 / 13 | 1 / 2 / 4 / 9 |
| 580 | "place" → "所" | 7 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 3 / 1 / 2 / 8 |
| 600 | "if you'd told me that" → "って言ってくれてたら" | 8 / 0 / 0 / 0 | 0 / 1 / 3 / 12 | 0 / 2 / 1 / 10 |
| 620 | "since we last met" → "最後に会ってから" | 8 / 0 / 0 / 0 | 0 / 2 / 4 / 11 | 0 / 3 / 3 / 11 |
| 650 | "go out?" → "出かけますか" | 8 / 0 / 0 / 0 | 0 / 2 / 2 / 12 | 0 / 3 / 2 / 10 |

---

**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that's being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.

**Syllable basis: APPROXIMATE — read `new edges per syllable` with care.** Japanese kanji carry no reading in the stored text and this repo has no morphological analyser, so kana morae are counted exactly and each kanji is counted as 2 morae (the modal reading length). Measured against hand-counted specimens the estimate lands within about one mora per phrase. The axis is in no floor, so no verdict here depends on it, but it is **not like-for-like** with the Romance courses in the cross-course table.

**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course's Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.
