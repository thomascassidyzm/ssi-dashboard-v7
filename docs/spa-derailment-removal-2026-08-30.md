# The four Spanish derailments, removed

*30 August 2026 — acting on Tom's ruling on the landing check: "I agree with this - we should remove the 4 derailments from the course - keep the others, for now."*

Source of the four: `docs/spa-landing-check-2026-08-30.md` and the 199 verdicts in `docs/spa-landing-check-verdicts-2026-08-30.json`. The other 195 shortlisted phrases were not touched, not re-judged and not flagged.

## What was done, and why that instrument

**There is no disable flag on the learner's path.** `course_practice_phrases.status` exists, but nothing on the serving path reads it — `api/courses/[code]/bundle.ts`, `cycles.ts` and `player-vue/providers/generateLearningScript.ts` all select by `phrase_role`, and `phrase_role` is CHECK-constrained to five values with no "retired" among them. Setting `status = 'deprecated'` would have looked like a removal and changed nothing a learner meets, so it was not used.

That left two honest instruments, and the four split cleanly between them:

- **Three are untaught-material derailments — the row deleted.** They must never come back. Unlinking their audio would have hidden them until the next audio pass regenerated the missing clips and resurrected them.
- **One is a prompt/answer mismatch — the row repaired, not removed.** The Spanish is fine; the English prompt was under-specified. Repairing the English keeps both recorded Spanish clips valid and costs one known-side clip instead of two.

**No audio was deleted, no TTS was run, no audio pass was queued.** Every `course_audio` row involved is untouched and still linked from its own history in the log.

## The three deleted

**Round 160 — `spa_for_eng:S0062L01U01` (USE, seed 62 lego 1)**
> "I am not sure I can help you at the same time as doing this" → "No estoy seguro de si puedo ayudarte al mismo tiempo que hago esto"

The prompt's "as doing this" sends the learner to *haciendo esto*; the answer returns the finite *que hago esto*, a form they have not met (taught at round 445) and cannot match to "doing", at the tail of an already long sentence.

**Round 571 — `spa_for_eng:S0249L02B06` (BUILD, seed 249 lego 2)**
> "It is important that you tell me before you go" → "Es importante que me lo digas antes de que te vayas"

The whole point of the prompt — "tell me" — arrives as *me lo digas*, on a stem (dig-) the learner has never met in any form (first taught at round 1128). The only recognisable part is the trailing taught chunk *antes de que te vayas*.

**Round 630 — `spa_for_eng:S0291L01U13` (USE, seed 291 lego 1)**
> "I hope he knows the answer because I do not know what to do" → "Espero que él sepa la respuesta porque yo no sé qué hacer"

They will have attempted *sabe* and hear *sepa* — a stem that appears nowhere else in the course in any chunk, carrying the point of the clause, so it reads as a different verb rather than a variant.

Each of the three was unique in the course: no other phrase, LEGO or seed carries the same target text, so deletion removes them outright.

**Phrase floors hold after the cut** (≥4 BUILD, ≥5 USE): seed 62 lego 1 USE 10→9; seed 249 lego 2 BUILD 5→4; seed 291 lego 1 USE 9→8.

## The one repaired

**Round 280 — `spa_for_eng:S0121L02U15` (USE, seed 121 lego 2)**
> "I think it is very unusual that you do not like to speak more with us" → "Pienso que es muy raro que no te guste hablar más con nosotros aquí"

Not an untaught-material defect. The answer ends with **aquí**, which the English never asked for: a learner who gets it entirely right hears an extra word and concludes they were wrong.

The course itself settles which side is wrong. Every other Spanish phrase ending *con nosotros aquí* has "here" in its English — `S0122L01U08` "…to speak with us here", `S0138L02U08` "…to meet up with us here", `S0228L01U14`, `S0264L01U02`, `S0265L01U07`. This row is the lone one missing it. So the convention already exists and this phrase broke it.

**Repair:** the English prompt now reads *"I think it is very unusual that you do not like to speak more with us here."* The Spanish is untouched, and both recorded Spanish clips stay valid.

**The prompt clip is now stale by one word**, so it was unlinked (`known_audio_id → null`). The clip row `27bc3507-…` still exists, is not deleted, and its id is recorded in the row's `metadata` and in the applied log for exact restore. The effect on the learner is immediate and correct: every serving path drops a build/use item without all three clips — `generateLearningScript` and the `cycles.ts` review baskets filter it out, and `backendCyclesToRounds.ts:270` returns `null` for the cycle while the round plays on (Tom's 2026-08-06 ruling: play what you have, skip only the unplayable item). So the learner does not meet the mismatch now, and the phrase returns — correct — the moment the one English clip is rendered.

**Explicit gap:** that one re-render was not queued, because this brief said no audio queueing. It is one command when Tom wants it. Until then the phrase is out of the course.

## Verification

Queried after applying: the three ids return no rows; no surviving `spa_for_eng` phrase carries any of the three target strings; `S0121L02U15` carries the corrected English, `known_audio_id` null, both target clips present; the unlinked `course_audio` row still exists.

Full before-state snapshots of all four rows (every column, enough to re-insert or restore exactly): `docs/spa-derailment-removal-applied-log.json`.

## The mismatch class — how big, and how to catch it deliberately

The *aquí* case was caught by luck. It reached the shortlist because of an unrelated word (*nosotros*), and the judge noticed the stray word while reading the phrase for something else. Nothing in the landing check looks for it: the check grades whether the learner has a hook for each Spanish word, and *aquí* had one — it is well taught by round 280. A word the learner knows perfectly well but was never asked for is invisible to a hook-strength test.

**How big the class might be: unknown, and plausibly larger than four.** The one instance found sits in a set of five sibling phrases that all get the convention right, which suggests drift in generation rather than a systematic rule — sporadic, not rare. The landing check only ever read 199 of 15,205 phrases, and it read them for a different question, so the observed rate of 1-in-199 says nothing useful about the other 15,006. Spanish is also not special here; any course generated the same way can carry it.

**What it would take to detect deliberately** is a different check, and a cheap one: a *content-parity* pass comparing what the English prompt asks for against what the Spanish answer delivers, phrase by phrase, in both directions — target material with no English counterpart (the *aquí* case) and English material with no target counterpart (the answer that says less than the prompt asked). It is mechanical enough to shortlist without an LLM: align the pair against the course's own taught known→target glosses, and flag every word left unaligned on either side. The course's own convention is the reference — five siblings already map "here"↔*aquí* — so the shortlist can be scored against established mappings rather than a dictionary. Then a judgement pass over the shortlist, exactly as the landing check does, because plenty of unaligned words are legitimate (pronoun drop, *lo*, articles English does not have). Not built — deliberately, per this brief.
