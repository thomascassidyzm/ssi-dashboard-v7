# spa_for_eng full phrase-pair read-through — accumulating findings

**Status: IN PROGRESS.** Stage 2 has NOT gone wide. This file is the accumulator so that
findings survive a conversation handoff; it is not yet the deliverable.

**This job produces THE LIST ONLY.** No fixes have been applied and none are authorised.
Fixing is a separate job requiring Kai's explicit say-so, because a bulk fix is exactly
what Kai has ruled we do not do. Every row below is quoted character-for-character as read
back from the live DB on 2026-08-25.

---

## The partition — exhaustive, no gaps, no overlap

`spa_for_eng` holds **16,328** practice phrases across **663** seeds numbered 1–668
(seeds 305, 367, 400, 463, 609 do not exist). Verified by direct DB count, not inferred.

Seeds **150–279 = exactly 4,040 rows** — the band already read by the earlier sweeps
(`spa-sweep-150-214`, `spa-sweep-215-279`). 16,328 − 4,040 = **12,288**, which is the
Stage 2 wide figure.

| shard | seeds | rows | state |
|---|---|---|---|
| #599 RT-A | 230–279 | 1,327 | dispatched, running |
| #600 RT-B | 150–187 | 1,359 | **done** — see findings below |
| W1 | 1–46 | 1,365 | not dispatched |
| W2 | 47–98 | 1,376 | not dispatched |
| W3 | 99–129 | 1,353 | not dispatched |
| W4 | 130–149 **and** 280–296 | 1,347 | not dispatched |
| W5 | 297–377 | 1,364 | not dispatched |
| W6 | 378–450 | 1,378 | not dispatched |
| W7 | 451–508 | 1,380 | not dispatched |
| W8 | 509–572 | 1,382 | not dispatched |
| W9 | 573–668 | 1,343 | not dispatched |
| W10 (reserve) | 188–229 | 1,354 | not dispatched |
| | **total** | **16,328** | ✓ |

W1–W9 sum to 12,288. W10 covers the slice of the old sweep band that neither re-test
reaches; without it, seeds 188–229 would never be read under the tightened brief.

**Coverage change, stated rather than hidden:** Stage 2 reads 12,288 rows across **9**
shards (~1,365 each), not 10, because two of the 15 workers went to re-tests.

---

## Findings — seeds 150–187 (job #600, sonnet, blind, read-only)

Reader read all 1,359 rows sequentially; reported nothing skimmed. Classes 1, 2 and 4 are
the priority classes. Four of these were sampled and re-verified against the live DB by the
coordinator; all four quoted correctly.

| phrase_id | seed | role | English | Spanish | class | what is wrong | proposed Spanish | conf |
|---|---|---|---|---|---|---|---|---|
| S0153L01U04 | 153 | use | I don't think I have said it very well | No lo he dicho bien | 1 | The whole "I don't think" hedge and the adverb "very" both vanish; Spanish asserts it as fact. | No pienso que lo he dicho muy bien | high |
| S0182L02U08 | 182 | use | I want to put my keys here so that I can always find them | Quiero poner mis llaves aquí para poder encontrar mis llaves | 1 | "always" has no counterpart. *siempre* is taught by seed 181 (S0181L04B06), so it is available. | Quiero poner mis llaves aquí para poder encontrar siempre mis llaves | high |
| S0169L01U13 | 169 | use | I don't think this is what she wants me to do | No estoy seguro de que esto es lo que quiere que haga | 2 | "don't think" rendered as "no estoy seguro" (not sure) — uncertainty substituted for disbelief. Course's own gloss is *no creo que* (S0187L02U05). | No creo que esto es lo que quiere que haga | high |
| S0170L02U14 | 170 | use | I've been thinking about it and I'd like you to tell me what you need | Pienso mucho en eso y me gustaría que me dijeras lo que necesitas | 4 | Present-perfect-continuous flattened to simple present; *mucho* added with no source. | He pensado mucho en eso y me gustaría que me dijeras lo que necesitas | possible |
| S0152L02U15 | 152 | use | I always think about doing things differently because I want to learn better | A menudo pienso en hacer de manera diferente porque quiero aprender mejor | 1 | "always" rendered as *a menudo* (often). Note: *siempre* is not taught until seed 181, so the clean fix may be a sequencing change, not a text change. | (needs a ruling — see note) | possible |
| S0157L02U14 | 157 | use | So I'm going to practise talking with another person next month as much as possible | Así que el mes que viene voy a practicar hablando con otra persona lo más frecuentemente posible | 1 | "as much as possible" (quantity) collapsed onto the existing gloss for "as often as possible" (frequency) — two English intentions onto one form. | Así que el mes que viene voy a practicar hablando con otra persona todo lo posible | possible |
| S0172L03U03 | 172 | use | It would be better to start this again | Sería mejor empezar otra vez con eso | 3 | *con eso* has no English counterpart. | Sería mejor empezar otra vez | high |
| S0155L03B05 | 155 | build | I'd like to meet in the morning | Me gustaría ir a reunirse por la mañana | 5 | Reflexive does not agree with "I" — *reunirse* for *reunirme*. Course's own S0155L03U12 confirms *Voy a reunirme*. | Me gustaría reunirme por la mañana | high |
| S0155L03U02 | 155 | use | I want to go and meet with you in the morning before it gets late | Quiero ir a reunirse contigo por la mañana antes de tarde | 5 | Same reflexive disagreement as above. | Quiero ir a reunirme contigo por la mañana antes de tarde | high |
| S0153L03U13 | 153 | use | It is the same thing we were talking about and it is important to know | Es lo mismo de lo que estábamos hablando de la misma manera | 6 | Second clause dropped entirely; *de la misma manera* added with no source. | Es lo mismo de lo que estábamos hablando y es importante saberlo | high |
| S0184L03U15 | 184 | use | I have not seen her anywhere in the office since this morning and I'm afraid she may have gone home already | No la he visto en algún sitio en la oficina desde esta mañana y me temo que ya fue a casa | 9 | "may have gone" (possibility) flattened to *ya fue* (settled fact) — modality lost. | …y me temo que quizás ya fue a casa | possible |
| S0161L02U06 | 161 | use | I wouldn't like to guess, I want you to be able to give me the answer | No me gustaría adivinar quiero que puedes darme la respuesta | 9 | Indicative *puedes* after *quiero que*, where the course otherwise takes subjunctive. | No me gustaría adivinar, quiero que puedas darme la respuesta | high |

**Known miss:** this reader did **not** find `S0151L03U14`, a Class 1 + Class 4 defect
inside its own range. See the re-test verdict section below.

---

## Re-test verdicts

- **#600, seeds 150–187: FAIL.** Missed its known-bad row. Diagnosis and brief fix are in
  the report to Kai; Stage 2 has not been dispatched.
- **#599, seeds 230–279: in flight at time of writing.**

Per Kai's standing rule (2026-08-25): if either re-test misses its known-bad row, do not go
wide — fix the brief and re-test, and report rather than spend.
