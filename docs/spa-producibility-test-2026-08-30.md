# Applying Tom's test: could the learner produce this phrase?

*30 August 2026 — measurement and diagnosis only. Nothing changed: no course data, no pods, no audio, no validator.*

## The one line

**Today the check asks "was every word in this sentence handed over as its own taught unit?" It should ask "given everything this learner has met by now — course and pods — could they reasonably produce this sentence, and only this sentence, from the English in front of them?"**

Note the second half. It is not only a test of whether they have the pieces. It is a test of whether the English prompt points at *this* Spanish and nothing else. The current check cannot ask either half.

## 1. Does the check credit pod exposure? No. Not at all.

The census tool reads exactly two tables. It has one database-fetching function, and it is called twice:

- `course_legos` — the taught chunks
- `course_practice_phrases` — the phrases being judged

There is no reference to pods anywhere in the file: not `listening_pods`, not `listening_pod_sentences`, not the word "pod" in any form, in any comment. Pod exposure is not credited, not partially credited, and not mentioned as a known limitation.

**This matters a lot.** Spanish has three live pods — the core Pod 1, a music discussion pod, and a travel-situations pod — carrying **1,052 sentences of natural Spanish between them, containing 2,436 distinct Spanish words**. The taught-chunk inventory the census measures against is about 1,900 chunks. The pods are the same order of magnitude as the course itself, and the check is blind to all of it.

Measured against the residue left after the contrast correction: **1,178 of those 1,331 phrases (88%) have every one of their supposedly-unavailable words present in live pod text.** Of the 199 hard-core phrases, 152 do. So on raw phrase counts, ignoring pods is a source of overcount comparable in size to the fused-form problem — and the two are independent, so they compound.

**But I will not simply subtract it, and here is why.** Pods are listening exposure. Hearing `ya` thirty-two times in a music podcast gives comprehension; it does not necessarily give the learner the mapping "already → *ya*" that ZUT-clean production requires. The two are not the same thing, and Tom's test asks about production. There is also a hard blocker: **every Spanish pod has `pod_order` set to null**, and Pod 1 is flagged `gated`. There is no anchor in the data tying pod exposure to a seed position, so I cannot say *when* a learner meets a pod word relative to the phrase that uses it. Pod credit is therefore a ceiling, not a timeline. That is a gap, stated, not papered over.

## 2. Applying the test properly

### Why this cannot be a rate from a tokeniser

Tom's test is a judgement, so I made judgements. I drew a **deterministic stratified random sample of 24 phrases** — twelve from the residue that pods cover, twelve from the residue they do not — and reasoned each one against what the learner had actually been given at that seed: every taught chunk containing the word, every taught chunk sharing its stem, and every live pod occurrence. I looked all of that up rather than guessing. The sample was drawn before I looked at any of it, from a fixed seed, so I could not select the convenient ones.

### Stratum B — residue that pods cover (population 1,178): 8 producible, 4 not

**Producible, and the flag is wrong:**

- *"We don't want to interrupt another person"* → *no queremos interrumpir a otra persona*. `otra persona` has been taught since seed 5. Fine.
- *"…about what we need to do"* → *de lo que necesitamos hacer*. `de` sits in 28 taught chunks by seed 143 and 274 pod sentences. Fine.
- *"…is going to work better than doing it alone"* → *hacerlo solo*. `hacer` taught at seed 59; clitic attachment is a pattern the course has given repeatedly (*ayudarme*, *esperarte*, *decirlo*). Producible by pattern.
- *"her friend"* → *su amiga*. `su` taught at seeds 20 and 21 as *su nombre*; `amiga` taught at seed 136 as *mi amiga*. Both in hand. Fine.
- *"after we finish"* → *después de terminar*. *después de que termines* taught at seed 11.
- *"if you do not mind"* → *si no te importa*. Taught almost verbatim at seed 63.
- *"her brain"* / *"and then I started to work"* — same picture.

**Not producible:**

- **Seed 76, *"I have already learned"* → *Ya he aprendido*.** `ya` appears in **zero taught chunks** anywhere before seed 76. It appears 32 times in the music pod — but nothing has ever paired the English "already" with it. Comprehension, not production. **Fails.**
- **Seed 210, *"…to talk about this with us now"* → *…con nosotros ahora*.** `nosotros` appears in **zero taught chunks** before seed 210 and just twice in any pod. *venir con nosotros* is taught — at seed 271, sixty-one seeds too late. **Fails**, and this is the single largest item in the residue at 50 phrases.
- **Seed 300, *"the people who work with her"* → *las personas que trabaja con ella*.** Every word is available. The Spanish is simply **wrong** — it should be *trabajan*. **Fails**, for a reason the census's model cannot express.
- **Seed 68, *"I can help you find it?"* → *…ayudarte a encontrar la respuesta*.** The English says "it". The Spanish says "the answer". No learner produces *la respuesta* from "it". **Fails** — a cue/target mismatch, and a cut-it-out case under Tom's own 4 July law.

### Stratum C — residue pods do not cover (population 153): 7 producible, 5 not

**Producible:**

- *"what I expected"* → *lo que esperaba*, at seeds 132 and 134. `esperaba` was taught at seed 112 inside *no lo esperaba*. The matcher flagged it only because *lo que esperaba* is not itself a whole taught chunk. Fine.
- *"she could wait for us"* → *podría esperarnos*. *esperarte* taught at seed 82; the clitic set is given. Producible by pattern.
- *"I'm going to meet more"* → *voy a conocer más*. *conocer a personas* taught at seed 22.
- *"people who like watching television"* → *personas a las que les gusta ver la televisión*. *a las que les gusta* = "who like" is taught at seed 286, two seeds earlier. Fine.
- *"what I hoped for"* → *lo que esperaba* — a reception convergence, which ZUT permits.

**Not producible:**

- **Seed 132, *"what she thought"* → *lo que pensaba*.** The course has given *pensar*, *pensando* and *pensé*. The imperfect *pensaba* is a new tense form, never given, with no contrast that yields it. **Fails.**
- **Seed 171, *"Help you look for it"* → *Te ayude a buscarlo*.** Subjunctive *ayude* has never appeared; only *ayudar*, *ayudarme*, *ayudarte*. And a bare English imperative "Help" gives no cue at all for a subjunctive. **Fails twice over.**
- **Seed 528, *"I'm supposed to keep it"* → *…debo guardarlo*.** `guardar` appears nowhere in the course and nowhere in any pod. **Fails.**
- **Seed 110, *"what we are learning together"* → *lo que aprendemos juntos*.** `juntos` has zero taught chunks and zero pod occurrences; *aprendemos* is a new conjugation. **Fails.**
- **Seed 128, *"before he has to go to work"* → *antes de que tenga que irse a trabajar*.** `irse` is fine — taught at seed 93. The subjunctive *tenga* is not, and "has to" gives no cue for it. **Fails, borderline** — the course did give one *de que* + subjunctive at seed 11.

## 3. The honest number

Applying the sampled rates to their populations:

| | population | judged failure rate | phrases |
|---|---|---|---|
| residue pods cover | 1,178 | 4 of 12 | ~390 |
| residue pods do not cover | 153 | 5 of 12 | ~64 |
| **total** | | | **~450, about 3% of the course** |

**So the honest answer to "how many Spanish phrases could a learner not reasonably be expected to produce" is on the order of 450 — about 3% — against the census's 2,869 and 18.9%.**

**How far that extrapolates: not very.** Twelve items per stratum is a small sample. The confidence interval on 4-of-12 runs from roughly 10% to 65%, which puts the true figure somewhere between about **150 and 875 phrases**. I would defend "a few hundred, not a few thousand". I would not defend 450 as a precise count, and anyone who quotes it as one is misusing it.

**Two further limits, stated plainly:**

- I did not sample the 1,470 phrases the contrast correction cleared — the `con`/`más` class. Their *material* is demonstrably given, which is what that earlier work established, but they carry the same background rate of the defects below as everything else, and nobody has looked.
- The whole ladder rests on my earlier contrast model, which is deliberately conservative and under-credits acquisition rather than over-crediting it.

## 4. The finding I did not go looking for

**Two of the 24 phrases I judged failed for reasons the census cannot see at all** — not missing material, but a broken link between the English and the Spanish. Seed 300 asks for *que trabaja* where Spanish requires *trabajan*. Seed 68 shows the learner "it" and expects *la respuesta*.

Neither phrase has a vocabulary problem. Both would pass a fixed census. Both are unproducible, and the seed-68 case is a textbook cut-it-out under Tom's own ruling.

This class lives **outside the census's population entirely** — it can strike any of the 15,205 phrases, including all the ones currently called clean. Two observations in 24 is not a rate and I am not going to turn it into one. But it points at a measurement nobody has taken, and on this evidence it could be a larger population than the material holes we have spent all day counting.

## 5. The corrected model, described and not built

The check needs three things it does not have:

1. **A contrast route** — a word is acquired when a pair the learner already holds isolates it (*contigo* / *conmigo*), not only when it is handed over whole.
2. **Pod exposure as an input**, which first requires pods to carry a position. Every Spanish pod has `pod_order` null, so this cannot be done correctly today; that ordering is the prerequisite, not an optional extra.
3. **The phrase as the unit, and the English prompt as half the question.** A sentence can be unproducible with every word available, and producible with one word missing. Only judgement settles it, so the check's job is to *rank candidates for judgement*, not to publish a percentage.

That third point is the real correction. A tokeniser cannot answer Tom's test. What it can do is hand a human a short, well-ordered list — which is a much more useful thing than a wrong number.

## Gaps

- No direct SQL client on this machine; the course and pods were read through the same database client the census used. Shared data source, independent logic throughout.
- **Pod exposure cannot be dated.** `pod_order` is null on all five Spanish pods and Pod 1 is gated. Pod credit is an all-or-nothing ceiling here, never a timeline.
- 24 phrases judged. Every rate above carries a wide interval and I have given it rather than hiding it.
- The 1,470 contrast-cleared phrases were not sampled.
- `spa_for_eng` only. The mechanism is generic; that is an expectation, not a measurement.
