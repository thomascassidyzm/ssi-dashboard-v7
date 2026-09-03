# USE-phrase word-count cap, fra_for_eng, rounds 1-20

Follow-on from the [English-known word-count cap analysis](https://watson-1.tail4968cb.ts.net/d/393a7057). Same course (fra_for_eng, English-known), narrowed to **USE phrases only** (BUILD and components excluded) and **round ≤ 20 only** (via `course_round_index`, live DB, read-only). Word count = `known_text` split on whitespace.

Total USE phrases in scope: **91**.

## % culled at each cap

| Cap (known-side words) | Excluded | Total | % culled |
|---|---|---|---|
| 8 | 17 | 91 | 18.7% |
| 10 | 4 | 91 | 4.4% |
| 12 | 0 | 91 | 0.0% |

## Phrases culled at cap 8 (>8 words)

| Round | Phrase | Words |
|---|---|---|
| 11 | I want to speak French as often as possible | 9 |
| 14 | I want to say something in French with you | 9 |
| 16 | I'm going to practise speaking as often as possible | 9 |
| 16 | I want to practise speaking as often as possible | 9 |
| 17 | I'm going to practise speaking with someone else now | 9 |
| 19 | I'm going to say a word in French now | 9 |
| 11 | I want to speak with you as often as possible | 10 |
| 14 | I'm trying to learn how to say something in French | 10 |
| 14 | I want to learn how to say something in French | 10 |
| 15 | I'm going to learn how to say something in French | 10 |
| 17 | I want to say something in French with someone else | 10 |
| 18 | I'm trying to remember how to say something in French | 10 |
| 19 | I'm going to learn a word as often as possible | 10 |
| 14 | I want to say something in French as often as possible | 11 |
| 19 | I want to learn how to say a word in French | 11 |
| 11 | I want to learn how to speak French as often as possible | 12 |
| 17 | I want to speak French with someone else as often as possible | 12 |

## Phrases culled at cap 10 (>10 words)

| Round | Phrase | Words |
|---|---|---|
| 11 | I want to learn how to speak French as often as possible | 12 |
| 14 | I want to say something in French as often as possible | 11 |
| 17 | I want to speak French with someone else as often as possible | 12 |
| 19 | I want to learn how to say a word in French | 11 |

## Phrases culled at cap 12 (>12 words)

None. Nothing in rounds 1-20 exceeds 12 words.

No further analysis performed — data only, as requested.
