# Was Tom right about the Spanish un-noded census?

*30 August 2026 — independent re-test. Measurement only: no course data changed, no audio queued, no validator touched.*

## The direct answer: yes, he was right

Tom's call was that `con` and `más` are not missing from the course at all — that they are taught fused inside bigger forms, and the checker cannot see a word taught that way, so it reports it as never introduced. That is exactly what happened, and it is the same shape as the Arabic tokeniser bug that once made a clean course read as the estate's worst.

Taking the two words separately, against the census's claim that neither is ever taught as a LEGO anywhere and both exist only as buried stubs from seed 333 and seed 360:

**`con` — TRUE-BUT-MISLEADING.** There genuinely is no LEGO whose whole target is the single word `con`. But `con` is a separate, visible word inside a taught chunk from **seed 5**, not seed 333: the learner is handed *"with someone else" → "con otra persona"* right at the start of the course. It then recurs as a separate word in **20 different taught chunks** — *con todos los demás* (S16), *con cuidado* (S37), *con ellos* (S134), *con el grupo* (S333), *con más cuidado* (S565). That is the method's own overlap mechanism working normally. Tom's specific route also holds: `contigo` is taught at **seed 1** and `conmigo` at **seed 15**. But that is the weaker half of his case, because those are single fused words — the checker reads them whole and never sees the `con` inside. The stronger half is the one he was reaching for: `con` stands as its own word inside taught chunks from seed 5, and the checker cannot credit that either.

**`más` — TRUE-BUT-MISLEADING, same fault, different route.** No standalone LEGO, correct. But `más` appears as a separate word inside a taught chunk from **seed 3** — *"as frequently as possible" → "lo más frecuentemente posible"* — and inside **39 taught chunks** across the course: *más tarde* (S16), *más o menos* (S38), *un poco más de tiempo* (S96), *algo más* (S360). Tom said he suspected the same thing for `más` without knowing the mechanism; he was right in substance. There is no portmanteau here, so the hiding place is the multi-word chunk rather than a fused word.

So the sentence *"a learner meets `más` hundreds of times before anything has ever handed it to them"* is false. Something handed it to them in seed 3.

## Why the checker cannot see it

The census builds three indexes of the course's material: the earliest point each word appears **as a whole LEGO on its own**, the earliest point it appears **as a component stub on its own**, and a plain unordered list of words that only ever occur **inside** a multi-word chunk. The third index carries no date — it is a bare list — and the classifier consults it **last**, only after the first two have both come back empty. `con` has a standalone component stub at seed 333, so the classifier stops there and reports "component stub only, first at seed 333". It never reaches the fact that `con` has been standing in taught Spanish since seed 5. The same for `más` at seed 360 versus seed 3.

That is a one-line consequence of how the index was built, and it is the whole difference between "18.9% of the course is broken" and "1.7% of the course has something to look at".

## The corrected numbers

I re-derived the census from the live course with a different matching algorithm — a maximum-coverage tiling rather than the census's greedy longest-match-first — so that a chunk match late in a sentence is not lost because of a break earlier in it.

| accounting | offending phrases | share |
|---|---|---|
| census, as published | 2,869 | 18.9% |
| same rule, fairer matcher | **2,801** | **18.4%** |
| **crediting material the learner has met inside a taught chunk** | **263** | **1.7%** |

The census's arithmetic under its own rule is sound: my independent run reproduces its per-word counts almost exactly — `con` 481, `más` 449, `de` 237, `todo` 175, `la` 163, `empezar` 121, `te` 76, all identical. Its ranking is right. Its **story** about what those counts mean is what fails. The 68-phrase difference is purely greedy matching giving up too early, which is a small separate fault worth fixing but not the story.

**Crediting fused material clears 2,538 of the 2,801.** The census's headline "real content hole" of 2,394 phrases becomes **263**, and that residue splits:

- **172 phrases** use Spanish that *is* taught fused somewhere in the course but only **later** than the phrase that uses it. A genuine ordering fault, and a small one.
- **91 phrases** use Spanish that appears **nowhere in the course at all**, in any chunk, in any form. This is the real hole and it is the only number here I would spend money on.

The census put that last figure at 40 phrases across 33 words; I get 91 across 60 words, the difference being that I count a word absent from every chunk rather than absent from its own three indexes. Either way it is the same order of magnitude and it is tiny.

## This is systematic, not two words

I ran the same test across **all 257** pieces of flagged material, not just the top ten.

- **197 of 257 items (3,608 of the phrase-hits)** are words the learner has met inside a taught chunk. Every single one of the census's top ten is in this group. `de` first appears in *un poco de* at seed 9 — the census dated it to seed 217. `me` in *me gustaría* at seed 11 — the census said seed 346. `todo` in *todo lo que pueda* at seed 7 — the census said seed 412. `la` in *toda la frase* at seed 10. `quiere` in *él quiere* at seed 16. `entender` in *a entender* at seed 74. `empezar` in *empezar a hablar* at seed 23, which the census correctly described as existing only inside a chunk — but then still counted its 121 phrases as a hole.
- **60 of 257 items (98 phrase-hits)** are genuinely absent from the whole course: `tú`, `mucha`, `vaya`, `guardarlo`, `explicarlo`, `aprendo`, `dame`, `también`, `podemos`, `cansada`, `disfrutar`, `reunirme`. Mostly one-offs, several of them clitic attachments on verbs the course does teach.

Sampling down the tail confirms the same pattern all the way: `ser` first met in *que ser perfecto*, `del` in *antes del fin de semana*, `piensas` in *piensas que*, `palabra` in *una palabra* at seed 6. The blindness is a property of the measurement, not a property of ten unlucky words.

## The honest complication, which is Tom's to settle

There is a real question sitting under this, and I do not want to bury it under the good news.

The course-builder's own live validator, the gate every phrase in this course was submitted through, **also does not split chunks**. Its rule, in its own words, is that a phrase "must be tileable entirely from these chunks — no word-level splitting, no free recombination. This prevents conjugations, inversions, and contractions that were never actually taught." So under the rule the builder enforces at submit time, a phrase using `con` in a combination other than a taught chunk is technically unaccounted for — which is why the 18.4% figure is not nothing.

But that is a different claim from the one the census made. The census did not say "these phrases would fail the submit gate". It said the material is **never taught anywhere** and the learner has never been handed it. That is the claim under test and it is false, for 197 of 257 items and for all ten of the headline ones.

Which number is the true one therefore depends on a ruling nobody has given: **does meeting a word as a separate word inside a taught chunk, twenty or thirty times, count as having been given that word?** The method's own doctrine says overlap *is* the teaching mechanism and grammar is inferred, never explained — which points hard at yes. If yes, the answer is 1.7% and 91 phrases. If no, it is 18.4% and the course was built against a validator that permitted the thing we are now calling a defect, which would be a much bigger conversation than a repair.

My read: **1.7%.** The overlap reading is the method's own, `con` and `más` behave exactly as the method says construction-features should, and a measurement that reports a word introduced in seed 3 as never introduced has not earned the right to set the agenda.

## The fix, described and deliberately not applied

Three changes, none made:

1. The index of words that only occur inside multi-word chunks must **carry a date** — the earliest point each such word appears — instead of being an undated list.
2. The classifier must consult all three indexes and take the **earliest** of them as the word's first availability, instead of stopping at the first index that answers.
3. The greedy longest-match tiling should become a maximum-coverage tiling, which costs nothing and recovers the 68 phrases where a break early in a sentence threw away good matches later in it.

With (1) and (2) alone the census re-reads at 1.7% and the headline list empties.

## Gaps, stated

- No direct SQL client is installed on this machine, so I read the course through the same database client the census used. The **data source** is therefore shared; the **logic** is not — different tiling algorithm, independently written index, and the conclusions above rest on reading the actual taught chunks and real phrases rather than on re-running the census.
- I did not test the other courses. The mechanism is generic and I would expect the same distortion everywhere, but that is an expectation, not a measurement.
- The 91 genuinely-absent phrases were not individually triaged. Some will be clitic forms the course teaches in another shape rather than true holes, so 91 is a ceiling.
