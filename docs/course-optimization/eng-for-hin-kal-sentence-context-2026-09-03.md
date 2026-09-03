# eng_for_hin — every कल sentence now carries its own tense context

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi, target = English), 668 seeds, `new_app_status: live`
**Ruling applied (Kai, 2026-09-03):** *"We should make sure every time we use 'yesterday'/'tomorrow', that there is
clear context in the sentence. Any sentences that don't, need to be fixed or deleted and replaced with others."*

This **supersedes** the earlier "make the LEGOs larger and stay globally consistent" framing. Internal consistency
is not enough: the learner meets one sentence at a time. Kai explicitly **rejected** swapping in an unambiguous
Hindi word (पिछली रात) — that option is not taken anywhere below.

**Outcome in one line:** 13 prompts rewritten on the live course, verified live, with **zero** blast radius
measured through the course's own gate (622 passing / 46 failing before *and* after, 0 phrases lost tileability);
**six bare LEGO debut prompts remain**, and two of them can now be closed cheaply — the price is a round each,
which is Kai's call, not mine.

---

## 1. Census — re-derived from the live DB, not inherited

Word-boundary कल over Devanagari letters, with danda (U+0964) treated as a boundary. Getting that boundary wrong
in either direction costs you real rows: including danda in the letter class silently drops every sentence-final
`कल।` (3 phrases), and dropping the letter guard picks up विकल्प / कल्पना / निकलने.

| Where | Occurrences (mine) | Brief's figure |
|---|---|---|
| `course_seeds.known_text` | **15** of 668 | 15 ✓ |
| `course_legos.known_text` | **12** of 1,489 | 12 ✓ |
| `course_legos.components` | **1** (S0012L03) | 1 ✓ |
| `course_practice_phrases.known_text` | **312** of 10,947 (211 use, 101 build) | 312 ✓ |
| Seed spread | **12 → 477** | 12 → 477 ✓ |

Every figure in the brief reproduces exactly. The only number that differs is the course's *total* phrase count
(10,947 here vs 10,953 in the earlier doc) — other jobs re-authored seeds 327/354/355/621 on the same day. No कל
figure is affected, so I proceeded.

Validator baseline re-taken myself: `POST /api/v2/validate/eng_for_hin` → **622 passed, 46 failed**.

---

## 2. How the 312 were judged

Pattern matching was used **only to build a reading list**; every one of the 312 was read, plus the 12 LEGO chunks.

A finite-verb regex (copulas, था/थी/थे, -गा/-गे/-गी, वाला है, subjunctive, perfective) flagged **53 suspects**.
On reading:

| | |
|---|---|
| Suspects flagged by the regex | 53 |
| …genuinely non-compliant on reading | **12** |
| …false alarms | **41** |
| **False-positive rate of the reading list** | **77%** |
| Genuine failures the regex **missed** | **1** |

The 41 false alarms are almost all perfective/ergative pasts the regex has no template for — `मैंने कल एक फ़िल्म
देखी`, `किसी ने मुझे नहीं बताया`, `मुझे कल नींद नहीं आई` — plus elided present copulas (`… कोई आपत्ति नहीं [है]`,
`… चाहिए`), which pin the reading to *tomorrow* because Hindi present tense cannot host कल = yesterday.

The one miss is instructive: `कल सुबह किसी रेस्टोरेंट में जाना` scored as "has a verb" because the **postposition
में** contains the sequence ें. A verbless infinitive phrase passed a verb test on a postposition. That is why a
regex is a reading list and never a verdict.

### The judgement calls I made, stated so they can be overruled

- **Comparative frames in the present tense are compliant.** `मैं कल रात के मुक़ाबले बेहतर बोलता हूँ` → *"I speak
  better than last night"*, and `मैं कल से बुरा कर रहा हूँ` → *"I'm doing worse than yesterday"* (10 phrases in
  total). No tensed verb attaches to कल, but you cannot compare a present state to a future one, so the
  construction itself is the context. Kai asked for *clear context in the sentence*, not specifically a verb;
  I read the comparative as clear context. **If Kai disagrees, these 10 are the next working set.**
- **A gratitude frame is compliant.** `कल समझने में मेरी मदद करने के लिए बहुत-बहुत शुक्रिया` — thanking is
  retrospective by construction. 1 phrase.
- **The BUILD-fragment tension is real and is reported, not resolved.** `docs/course-methodology-canon.md` **P4**
  records Kai's own 2026-08-17 ruling: *"BUILD phrases play once, in context, and are never replayed… Fragments
  are fine here — the presentation just framed them."* Every one of the 12 failures below is a BUILD fragment
  played immediately after a presentation that has just glossed the chunk. Under P4 they are defensible as they
  stood. I applied the newer, narrower 2026-09-03 ruling because it is later and specifically about ambiguous
  time words, and because the fix costs nothing measurable — but **P4 is the reason a reasonable person would
  have left them alone**, and the edits are reversible from the applied log.

---

## 3. What was changed — 13 prompts, applied live and verified

Twelve verbless BUILD rungs plus one USE phrase. Every replacement is built **only from chunks already taught by
that seed** (checked against the cumulative vocabulary), and every Hindi word in every replacement already appears
in that seed's own prefix of the course — the known side is a controlled language too.

| Seed | LEGO | Before | After |
|---|---|---|---|
| 42 | S0042L03 | कल रात के मुक़ाबले बेहतर<br>*better than last night* | लेकिन मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था<br>*but I was starting to feel better than last night* |
| 44 | S0044L01 | या कि कल<br>*or tomorrow* | मैं कल मिलना चाहता हूँ या कि आज रात<br>*I want to meet tomorrow or tonight* |
| 155 | S0155L04 | कल सुबह मिलना<br>*to meet tomorrow morning* | मैं कल सुबह मिलना चाहता हूँ<br>*I want to meet tomorrow morning* |
| 155 | S0155L04 | कल सुबह जागना<br>*to wake tomorrow morning* | मुझे कल सुबह जागना है<br>*I need to wake tomorrow morning* |
| 155 | S0155L04 | कल सुबह बात करना<br>*to speak tomorrow morning* | मैं कल सुबह बात करना चाहता हूँ<br>*I want to speak tomorrow morning* |
| 156 | S0156L02 | कल सुबह किसी रेस्टोरेंट में जाना<br>*to go to a restaurant tomorrow morning* | क्या आप कल सुबह किसी रेस्टोरेंट में जाना चाहते हैं?<br>*do you want to go to a restaurant tomorrow morning?* |
| 167 | S0167L02 | कल दोपहर मिलना<br>*to meet tomorrow afternoon* | मैं कल दोपहर मिलना चाहता हूँ<br>*I want to meet tomorrow afternoon* |
| 167 | S0167L02 | कल दोपहर आराम करना<br>*to relax tomorrow afternoon* | मैं कल दोपहर आराम करना चाहता हूँ<br>*I want to relax tomorrow afternoon* |
| 167 | S0167L02 | कल दोपहर बात करना<br>*to speak tomorrow afternoon* | मुझे कल दोपहर बात करना है<br>*I need to speak tomorrow afternoon* |
| 181 | S0181L03 | कल सुबह डॉक्टर के पास जाना<br>*to go to the doctor tomorrow morning* | क्या आप कल सुबह डॉक्टर के पास जाना चाहते हैं?<br>*do you want to go to the doctor tomorrow morning?* |
| 192 | S0192L02 | कल रात मिलना<br>*to meet tomorrow night* | मुझे कल रात मिलना है<br>*I need to meet tomorrow night* |
| 192 | S0192L02 | कल रात आराम करना<br>*to relax tomorrow night* | मैं कल रात आराम करना चाहता हूँ<br>*I want to relax tomorrow night* |
| 305 | S0305L01 | वह औरत कल आपकी मदद कर देती।<br>*that woman would help you tomorrow* | वह औरत आज रात आपकी मदद कर देती।<br>*that woman would help you tonight* |

**Seed 305 is the one deletion-and-replacement rather than a fix.** Bare imperfective `कर देती` is irrealis and
reads as **past** counterfactual — *"that woman would have helped you"* — so the sentence did not merely fail to
fix the time, its Hindi leaned the opposite way from its English "tomorrow". The LEGO being taught there is
`औरत → woman`, which कल has nothing to do with; six other phrases in that seed teach it. Swapping the incidental
adverbial to `आज रात → tonight` removes the ambiguity without touching the teaching point. This is not the
पिछली रात substitution Kai rejected: no कल sense is being re-taught by another word.

Tool, with the full pre-write state of every row (the apply is reversible by hand from it):
`tools/course-optimization/fix-eng-for-hin-kal-sentence-context-2026-09-03.cjs` (+ `-applied-log.json`).

---

## 4. Blast radius — measured, twice, singly and combined

The course-builder's own gate was replicated offline: `runSeedChecks` from `services/course-builder/routes/v2.cjs`
copied verbatim over `checkTiling` / `checkVocabViolations` / `checkBuildUsePhrases`. **Calibration first** — the
replica reproduces the live endpoint exactly (622 passed / 46 failed / 213 phrase-level vocab violations), so its
counterfactuals are trustworthy.

| | before | after |
|---|---|---|
| Seeds passing `POST /api/v2/validate/eng_for_hin` (**live endpoint**) | 622 | **622** |
| Seeds failing | 46 | **46** |
| Seeds newly failing | — | **0** |
| Seeds newly passing | — | **0** |
| Phrase-level vocab violations (replica) | 213 | **213** |
| Phrases that **lost tileability** | — | **0** |
| Decomposition blocks joined == `target_text`, whole course | 10,917 / 10,917 | **10,917 / 10,917, 0 mismatched** |

Each edit was **also** measured singly: 13 separate full sweeps, each one 46 failing seeds, 0 newly failing,
0 phrases lost. Zero repair is measured here, not assumed.

**Decompositions were rewritten with the text**, not left stale — `decomposeText` over the cumulative vocabulary,
with the result asserted to concatenate back to the new target exactly (the player's Strategy-0 guard). I used the
**unanchored** decomposer deliberately: all 10,917 existing decompositions in this course are unanchored (0 carry
`isSalient`), and the anchored one fragments seed 305's taught chunk *"that woman would help you"* into two ghost
blocks to force its salient. Net ghost-block change across the 13: **−1**. The two new `?` ghosts match the
course's existing convention for question phrases.

---

## 5. Audio — 5 clip links dropped, nothing generated

| | |
|---|---|
| Edited phrases carrying any clip | **2** of 13 (S0042L03 build, S0181L03 build) |
| Clip links dropped | **5** — S0042L03 `target1`+`target2`; S0181L03 `known`+`target1`+`target2` |
| `course_audio` rows deleted | **0** |
| TTS generated | **none** |
| Audio pass queued | **yes** — `queue-audio-pass.cjs eng_for_hin --reason "kal sentence-context ruling 2026-09-03…"` |

The target-side links were nulled **explicitly and on purpose**. `course_practice_phrases` has no trigger that
touches the target side on a `target_text` change, so leaving them would have kept clips speaking the *old*
sentences pointed at the *new* text — stale-and-wrong, which is worse for a learner than silent. The known-side
link on S0181L03 was recomputed to NULL by `trg_null_phrase_audio_on_text_change` itself (it re-resolves by text
and found no clip), exactly as expected. All five were re-read from the DB after the write and asserted null.

**These slots cannot be refilled today, by anyone.** `courses.voice_config` for eng_for_hin is **all-xAI** on all
four voices (known/target1/target2/presentation) — verified live, not assumed — and xAI is retired. The course
cannot render until it is recast. That is a pre-existing estate condition, not a consequence of this work, but it
means the 5 slots stay silent until the recast lands.

---

## 6. The gap that remains — six bare LEGO debut prompts

A LEGO's `known_text` is spoken to the learner at intro **and** at debut — `learning-script-generator.cjs:1291`
says it outright: *"The debut IS the bare LEGO."* Six कल LEGOs are bare adverbials with `is_new = true`, so six
live prompts still ask a Hindi speaker for an English tense direction the cue does not fix:

`S0030L03 कल` · `S0042L03 कल रात के मुक़ाबले` · `S0155L04 कल सुबह` · `S0167L02 कल दोपहर` ·
`S0192L02 कल रात` · `S0278L02 कल रात सब`

They cannot be *grown*: Hindi is verb-final, and in all six cases every span between कल and its verb is already
owned by a sibling LEGO, so growth either overlaps (banned) or gaps (banned). The only compliant move is to
**merge** the adverbial into a clause-sized LEGO — which deletes one `is_new` LEGO and therefore **one round**,
shifting every later round number on a live course. That is a learner-progress migration under the standing
content-change protocol, and per my brief it is Kai's call, not mine. **Not done.**

### Priced, cumulatively, through the course's own gate

Counted by dropping the chunk from the course and re-running the full cumulative sweep — phrases that stop tiling,
and seeds that newly fail. (These exclude the merged LEGO's own 8 build/use phrases, which a merge would have to be
re-authored around in any case.)

| LEGO | Chunk | Merge with | Phrases that stop tiling | of which downstream | Newly failing seeds |
|---|---|---|---|---|---|
| S0030L03 | कल → *yesterday* | L01+L02 | **99** | 99 | **47** |
| S0155L04 | कल सुबह | L01–L03 | **45** | 45 | **32** |
| S0167L02 | कल दोपहर | L01 | **13** | 13 | **9** |
| S0192L02 | कल रात | L01 | **6** | 6 | **5** |
| S0042L03 | कल रात के मुक़ाबले | L01 | **3** | 0 | **1** |
| S0278L02 | कल रात सब | L01 | **0** | 0 | **0** |

**Seed 30 is confirmed as the trap, independently.** 113 phrases carry S0030L03 in their stored decomposition;
merging it strands **99 downstream phrases and newly fails 47 seeds**. Not grown, not merged, not touched.
(The earlier doc priced this at 124/48 by a course-wide rather than cumulative accounting; the shape of the
finding is identical and the conclusion is the same.)

### Two of the six are now cheap — this is the new finding

- **S0278L02** merges into `कल रात सब पूरा करना था → "did you have to finish everything last night"` at a measured
  cost of **zero** phrases and **zero** newly failing seeds. The merged chunk carries था.
- **S0042L03** merges into `कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था → "I was starting to feel better than
  last night"` for **3 phrases in its own seed and 1 newly failing seed**. The merged chunk carries था.

Together those two close **the sharpest case Kai spotted**: `कल रात` is taught as *"tomorrow night"* at seed 192
and used meaning *"last night"* from seed 42 onward — and seed 42 comes **first**. Merging S0042L03 removes the
earlier bare exposure entirely. The only cost is one round each. **That decision is Kai's; say the word and it is
a short job.**

---

## 7. Also found, not in scope, reported

- **Seed 155 ships three byte-identical USE phrases** — `मुझे कल सुबह इंतज़ार करने में कोई आपत्ति नहीं।` ×3 (and
  `कुछ मिनट इंतज़ार करने में` ×2 in BUILD). The learner meets the same prompt three times in one seed. Not a कल
  ambiguity, so not touched.
- **S0262L03 (`कल`) and S0312L03 (`कल रात`)** are bare and duplicate-sensed, but `is_new = false` with zero
  phrases: they generate no round and no learner meets them. Dead rows, left alone.
- **58 untiled ghosts** (`कल` in the prompt with no chunk on the tiling) noted by the earlier pass are unchanged
  by this work; their decompositions still concatenate correctly.

---

## 8. Does the rule hold now?

| | |
|---|---|
| कל practice/build prompts with no sentence-internal tense context | **0** (was 13) |
| …of which fixed in place | 12 |
| …deleted and replaced | 1 (seed 305) |
| Bare LEGO debut prompts still ambiguous | **6** — priced above, blocked on Kai's round-shift call |
| Seeds moved by this work | **0** |
| Phrases that lost tileability | **0** |
| Audio generated | **none** |
