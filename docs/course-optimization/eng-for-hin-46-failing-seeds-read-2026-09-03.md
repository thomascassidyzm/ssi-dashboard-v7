# eng_for_hin — what the 46 failing seeds actually are, and where they came from

Read-only census, 2026-09-03. Nothing was changed, nothing was written to the database.

I re-ran the course's own validator twice myself:

| time (UTC) | passed | failed | vocabulary | phrase count | containment |
|---|---|---|---|---|---|
| 20:24 | 622 | 46 | 45 | 18 | 6 |
| 20:33 | 622 | 46 | **43** | 18 | 6 |

**The number moved under me.** Between the two runs, job #363 (fixing कल) cleared the
vocabulary complaint on seeds 385 and 386. The headline 622/46 is unchanged because those
two seeds still fail on other grounds. All detail below is from the 20:24 snapshot; treat
"45" as "43 and falling".

---

## 1. Kai's question first: did the manual trickle-down fixes cause these?

**Yes for the vocabulary failures — 41 of the 43 did not exist before 2026-09-01. No for the
rest — every phrase-count failure and 5 of the 6 containment failures are inherited from the
original build.**

How I dated it. `content_audit_log` keeps the pre-change copy of every row. I rebuilt the
whole course as it stood at **2026-09-01 00:00 UTC** from those stored copies and ran the
*same* validator over the rebuilt state, so this is a like-for-like before/after, not a guess.

**The campaign window is 2026-09-01 → 2026-09-03.** I did not assume it; I counted audit
stamps per day. Before 2026-09-01 there is essentially no content activity on this course for
a week (only the `courses` row being touched). On 09-02 the teaching layer was rebuilt at
scale — 11,807 practice phrases deleted, 1,199 legos deleted — and on 09-03 a further 3,046
practice-phrase edits landed.

Before/after:

| | seeds failing |
|---|---|
| as of 2026-09-01 (reconstructed) | **359** |
| now | **46** |
| fixed by the campaign | 331 |
| **introduced by the campaign** | **18** |
| **inherited, still failing** | **28** |

By kind, which is the sharper answer:

- **Vocabulary — 43 seeds now, only 2 (seeds 241 and 268) failed this way before the campaign.
  41 are new since 2026-09-01.**
- **Phrase count — 18 seeds, all 18 failed the same way before the campaign. Inherited.**
- **Containment — 6 seeds, 5 failed the same way before. Only seed 385 is new.**

Within those 41 new vocabulary failures there are two very different stories, and this is the
part worth Kai's attention:

- **10 seeds had their own text rewritten in the campaign** (21, 34, 36, 47, 49, 58, 64, 87,
  90, 106). Their practice phrases were created or their text changed on 09-02/09-03. These we
  wrote.
- **31 seeds were never touched.** Their practice phrases still carry their original text,
  unchanged since 2026-05-30 → 2026-07-28 — the audit log proves no text edit. They started
  failing because the *chunk ladder around them* was rebuilt: the vocabulary check is
  cumulative, so re-cutting an earlier chunk changes what a later, untouched practice phrase is
  allowed to say. **That is trickle-down in the exact sense Kai meant, and it is the larger
  half.**

Counts for the buckets Kai asked for. Seeds are counted once each; a seed can fail on more
than one ground, so I split by seed first and then by kind.

| bucket | seeds |
|---|---|
| (a) **caused by the campaign** — passed at 2026-09-01, fails now | **18** |
| (b) **inherited** — already failing at 2026-09-01 and still failing | **28** |
| (c) **cannot be dated** | **0** |

Splitting (a) and the *new* failures inside (b) by how the campaign caused them:

| how | seeds |
|---|---|
| the seed's own legos/practice phrases were rewritten on 09-02/09-03 | **10** (21, 34, 36, 47, 49, 58, 64, 87, 90, 106) |
| trickle-down — the seed's own text is untouched since May–July; the chunk ladder around it moved | **31** |
| genuinely original, never touched | **28** seeds carry at least one inherited failure (18 phrase count, 5 containment, 2 vocabulary; 23 of those 28 also picked up a *new* vocabulary failure on top) |

**Gap, stated plainly:** `content_audit_log` begins **2026-07-03**. This course was built from
2026-05-30. Anything older than 2026-07-03 cannot be reconstructed, so for inherited failures I
can only say "the text has not changed since the row's `created_at`" — I cannot replay the
state of the course as it was in June. The 2026-09-01 rewind, which is what the provenance
answer rests on, is fully inside the log and is sound.

---

## 2. Calibration — I checked one by hand before trusting any of it

**Seed 34**, "He doesn't want to be quiet when other people are here."

I read the rows myself. Its legos are `when`, `other people`, `here` — there is no lego for
the English **`are`**. Searching every lego up to seed 34, the word `are` exists in exactly two
taught chunks: `are you learning` (seed 21) and `are you going to help me` (seed 25). The
practice phrase `eng_for_hin:S0034L04B03` — "when other people are here" — therefore asks the
learner to produce a copula in a frame the course has never given them. That phrase **has all
three clips and is live to learners.** The validator's complaint is real, and I have repeated
the same check on seeds 637, 339, 268 and 477.

---

## 3. The classes, worst first

219 practice phrases across 45 seeds carry a vocabulary complaint (20:24 snapshot).

**The single most important finding: not one of them uses a word the learner has never heard.
0 of 219.** Every flagged phrase is built entirely from words the course has already spoken by
that point. What fails is *how* those words are combined: the gate requires a phrase to be
tileable out of whole taught chunks, and these phrases free a word out of the chunk it was
taught inside.

So this is **not** the CRITICAL FAIL in its rawest form (a learner asked for vocabulary that
does not exist yet). It is the next thing along: a learner asked to produce a **form** they
have only ever met glued inside something bigger. Whether that is critical is a methodology
call, and it differs sharply by class.

### Class A — the English verb "to be / to have / to do", never taught on its own
**89 practice phrases, 27 seeds. 69 are live to learners (all three clips).**
Blocked on `is are am was were im hes shes ive youve id has have do did didn't`.

Example, seed 637 — the seed sentence is "Where is her bag?" and the practice phrases are
"her bag is here", "is her bag here?", "I think her bag is ready". The course has taught
`he's`, `where's` and similar contracted chunks; the bare `is` has never been an item.

**My read: this is the real one.** A learner is being asked to place an English copula they
have never been shown as a piece. It is also the cheapest to fix at the root — a small set of
new chunks (`is`, `are`, `was`, `were`, `have`, `has`, `did`), introduced early.
**Fix size:** small if fixed by teaching (a handful of new legos, each needing audio and a
round); large if fixed by rewriting (89 phrases).
**Clips:** teaching the chunk nulls nothing. Rewriting the phrases nulls every one of them —
`trg_null_phrase_audio_on_text_change` blanks a phrase's audio the moment its text changes.

### Class C — a content word freed from its chunk
**50 practice phrases, 21 seeds. All 50 live.**
Blocked on `tell look met help show ask take said lot minutes story ready often came again
special used knew thought definitely believe good sunday`.

Example, seed 610: `look for work` is the taught chunk; the practice phrases say
"look for work now", "need to look for work" — but "look" alone has never been given.

**My read: mixed, and needs a human eye per item.** Some are harmless English (an article
shift); others really do ask for a new lexical form. This class does not have a single fix.
**Fix size:** medium — 50 phrases to judge one at a time.
**Clips:** any rewrite nulls that phrase's clips.

### Class B — articles, prepositions and pronouns
**48 practice phrases, 20 seeds. 46 live.**
Blocked on `the an of my your them they some such over during last what everything need should`.

Example, seed 268: `email` is taught, `an email` is not, so "she sent me an email" fails.

**My read: mostly gate strictness, not a learner harm.** English function words are taught
inside chunks by design in this course; the gate has no way to know that. I would treat this
class as the lowest priority of the four and would not rewrite live audio for it.

### Class D — the word IS taught, just later in the course
**32 practice phrases, 14 seeds. All 32 live.**
Blocked on `it know work ive just more was that about were`.

The cleanest example: seed **241** uses `more`, which the course teaches as its own chunk at
seed **242** — one seed late. Others: `it` (taught at 621), `know` (346), `that` (322),
`work` (610), `about` (343), `were` (385).

**My read: an ordering defect, and the most satisfying to fix.** Either move the introduction
earlier or move the practice phrase later; several are off by one or two seeds.
**Fix size:** small. **Clips:** nulls nothing if you move the introduction rather than the text.

### Class E — the bare-LEGO clone (this is the whole "phrase count" bucket)
**35 legos across 18 seeds. Entirely inherited from the original build — none of it is ours.**

Every single complaint reads "BUILD: need 3+, got 2 — 1 bare-LEGO phrase doesn't count". The
lego does have three build phrases; one of them is a verbatim copy of the lego itself
("of course" → "of course"), and a copy teaches nothing because the learner already meets the
bare chunk at its introduction. So the lego really has two build phrases, not three.

**My read: real but cosmetic, and mis-named.** No learner is asked for anything untaught; the
bare copy is simply never played. The label "phrase count failure" over-states it.
**Fix size:** medium-mechanical — 35 legos each need one new build phrase (or the clone
rewritten). **Clips:** rewriting the clone nulls that one clip; new phrases need an audio pass.
Sole exception: seed 385 L1 "did you agree with her", which is short by two for a different
reason — see Class F.

### Class F — words wedged inside the taught chunk (the containment bucket)
**10 practice phrases, 6 seeds. All 10 live. 5 of the 6 seeds are inherited.**

| seed | taught chunk | what the practice phrase says |
|---|---|---|
| 343 | she's worried | she's **very** worried / she's **not** worried |
| 344 | he's happy | he's **very** happy (today) |
| 345 | he's not ready | he's not **quite** ready |
| 385 | did you agree with her | agree with her / you agree with her (the "did" is missing) |
| 478 | a kind heart | a **very** kind heart |
| 621 | it was broken | **was it** broken? (inverted) |

**My read: this one has a learner-visible consequence beyond the gate.** The decomposition is
the tile map the player uses; a phrase whose text does not contain its own chunk cannot be
tiled by it, which is how ghost tiles appear.
**Fix size:** small — 10 phrases. **Clips:** rewording nulls the clip on each; growing or
splitting the chunk instead does not touch phrase audio.

---

## 4. What is not real

**False-positive rate on the gate's complaints: 0 of 46.** Every failing seed I opened has a
genuine row-level mismatch against the rule as written. Nothing here is a phantom.

**But two things are mis-labelled, and reporting them in one bucket would be wrong:**

1. **The gate holds seeds and practice phrases to two different standards.** The seed-sentence
   check (tiling) is **word-level** — any word seen inside any taught chunk counts. The
   practice-phrase check (vocabulary) is **whole-chunk** — the phrase must be cut from taught
   chunks entire. The consequence is visible in seed 637: "Where is her bag?" passes as a seed
   sentence and the identical text fails as practice phrase `S0637L01U01`. By the word-level
   standard, **all 219 flagged phrases pass**. Which of the two standards Kai wants is a
   decision, not a bug report.
2. **"Phrase count" is not a shortfall of practice** (Class E) — it is a duplicate. No learner
   is short-changed by it in the way the name implies.

**Learner reach:** 197 of the 219 flagged practice phrases have all three clips and are live in
the course today. 20 have no audio at all and are dropped by the learner walk — they are
invisible now but would become visible the moment an audio pass fills them.

---

## 5. Recommendation, in the order I would take them

1. **Class A (the copula).** Teach `is / are / was / were / have / has / did` as chunks early.
   Fixes 89 phrases across 27 seeds without touching a single line of existing audio.
2. **Class D (taught later).** 14 seeds, several off by one. Move the introduction, not the text.
3. **Class F (containment).** 10 phrases; also removes a real ghost-tile risk in the player.
4. **Class E (bare-lego clones).** 35 legos, mechanical, inherited — schedule it, don't rush it.
5. **Class C (lexical).** 50 phrases, one human judgement each.
6. **Class B (articles/prepositions).** Decide the gate question first. I would not spend audio on it.

Any fix that changes practice-phrase text silences that phrase until an audio pass runs —
verified in the schema (`trg_null_phrase_audio_on_text_change` on `course_practice_phrases`).
Fixes that add or re-cut chunks leave existing clips alone.

---

## Method and limits

- Baseline reproduced offline against production Supabase using the course's own validator
  code (`checkTiling`, `checkVocabViolations`, `checkBuildUsePhrases`), identical to
  `POST /v2/validate/:courseCode`. Read-only; no writes of any kind.
- Provenance by reconstructing the 2026-09-01 state from `content_audit_log.old_row` and
  re-running the same validator. INSERTs are not recorded by the audit trigger, so rows created
  during the window were identified by `created_at` instead.
- **Gap:** the audit log starts 2026-07-03; the course dates from 2026-05-30. No state before
  2026-07-03 can be replayed.
- **Gap:** the course was being written to by job #363 while I read it. Two of the 46 changed
  character in nine minutes. Any count here is a photograph, not a fact.
