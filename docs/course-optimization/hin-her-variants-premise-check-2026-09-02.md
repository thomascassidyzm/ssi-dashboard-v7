# The "her" variants job: premise check — STOPPED before writing, and why

**Job #169.** Brief: *write the "her" variants for the Hindi course (`hin_for_eng`) using the
gender-prep mechanism that already exists*, expecting roughly **566** gender-ambiguous practice
phrases.

**Nothing was written.** 0 database writes, 0 audio clips, 0 variants authored. The brief's own
rule — *"if the number you measure disagrees materially with 566, STOP and report rather than
proceeding"* — fired, and it fired for a bigger reason than a count. Everything below was measured
against the live database today.

---

## The headline

**The course named in the brief is not the course the brief describes.**

`hin_for_eng` and `eng_for_hin` are two different courses, and every piece of context in the
brief — the 2026-09-02 end-to-end rebuild, the 566 gender-ambiguous practice phrases, the
"her"/"his" two-take design, the presentation clip that explains the ambiguity — belongs to
**`eng_for_hin`**. The brief names `hin_for_eng`.

| measured live, 2026-09-02 | `eng_for_hin` | `hin_for_eng` |
|---|---|---|
| seeds | 668 | 668 |
| practice phrases | **10,967** | 6,129 |
| legos | 1,489 | 772 |
| seeds last updated | **2026-09-02 22:52** | 2026-08-20 23:54 |
| phrases last updated | **2026-09-02 22:52** | 2026-08-31 23:34 |
| status | released / live | beta / beta |
| `target_lang` | `eng` | `hin` |
| phrases matching `his/her/hers/him/he/she` | **1,717** | — |
| classified AMBIGUOUS | **566** | — |

The course "rebuilt end to end on 2026-09-02" is `eng_for_hin` — its seeds and phrases were still
being written at 22:52 tonight. `hin_for_eng` was last touched on 31 August.

And the **566** is exact, not approximate: it is the AMBIGUOUS count from the eng_for_hin
practice-phrase gender census published today at `/d/539b4de7`, and its working data is still on
disk at `scripts/kai-hin-census-2026-09-02/ALL_RESULTS.json` — 1,717 rows, 566 AMBIGUOUS,
1,151 FINE, across **91 seeds** and **541 distinct English strings**. I re-verified all of those
numbers from the file and from the live DB rather than from the published document.

---

## The two axes are not the same job

This is not a typo you can just correct and carry on through, because the two courses have
*opposite* gender problems.

- **`eng_for_hin`** (Hindi known → English target). The Hindi cue does not mark the **referent's**
  gender; the English answer commits to one. *"उसका नाम"* is equally "his name" or "her name".
  This is the "her"/"his" two-take design, and it is the 566.
- **`hin_for_eng`** (English known → Hindi target). The English cue does not mark the **speaker's**
  gender; the Hindi answer commits to one. *"I'm trying to learn"* → `मैं सीखने की कोशिश कर **रहा**
  हूँ` (male speaker) vs `**रही** हूँ` (female). That is a *female-speaker* variant, not a "her"
  variant, and it is a different set of sentences.

Sized for completeness so the ruling can be made on numbers rather than on my summary: a
conservative scan of `hin_for_eng` for masculine first-person agreement markers
(`ता हूँ`, `रहा`, `ूँगा`, `ा था`…) returns **1,022 practice phrases**, 132 seeds and 28 legos.
That is a text match, not a reading — the true figure after a sentence-by-sentence pass will be
lower — but **1,022 is materially different from 566**, which is the disagreement the brief told
me to stop on.

---

## Where the mechanism lives (asked for, and answered regardless)

- **Table:** `course_gender_expansions` — `(course_code, original_text, language, expanded_f,
  expanded_m, text_side)`, unique on `(course_code, original_text, text_side)`.
- **How the second take is represented:** one row, two sentences. `services/gender-haiku-service.cjs`
  → `loadGenderMap()` keys every row twice:
  `` `${original_text}|${language}|target1` `` → `expanded_f` and
  `` `${original_text}|${language}|target2` `` → `expanded_m`. **`expanded_f` is the female voice's
  sentence; `expanded_m` is the male voice's.** The stored `target_text` on the content row is
  untouched — the variant lives only in this table, which is why a text-vs-text audit cannot see it.
- **Where it is consumed:** `services/phases/phase8-audio-v13.cjs` at lines **2515, 3159 and 6114**,
  which load the map at render time and substitute per voice role.
- **Authoring/populating path:** `processAndStore()` / `batchGenderExpand()` in the same service,
  driven by `services/gender-prep-coordinator.cjs`.

Live state: `course_gender_expansions` holds **0 rows for `hin_for_eng`** and **2,464 rows for
`eng_for_hin`** (written 2026-07-30, `language='hin'`, `text_side='known'`).

---

## The second blocker: for `eng_for_hin` this path cannot deliver

Even if the course code is corrected to `eng_for_hin`, writing the 566 variants through the
existing path stores **dead data**. Verified in the code today, not recalled:

1. **All three load sites gate on the TARGET language being gendered.** `GENDERED_LANGUAGES` in
   `gender-haiku-service.cjs:19` is the speaker-gender list (`hin`, `pol`, `ara`, …). `eng_for_hin`
   has `target_lang='eng'`, which is not on it and should not be — the list means "this language
   agrees with the *speaker's* gender", and the eng_for_hin problem is the *referent* axis.
   `loadGenderMap` is therefore never called for this course.
2. **The 2,464 rows already there are orphans.** They carry `language='hin'`, so their keys are
   `<hindi>|hin|target1`, while the render-time lookup is keyed on the *target* language. They can
   never match. Adding 566 more rows would need me to invent a keying convention (`language='eng'`,
   `text_side='target'`) for a code change that does not exist yet.
3. **`processAndStore('eng_for_hin')` throws outright** — `Language eng is not gendered`
   (`gender-haiku-service.cjs:306-307`). The tool the brief told me to use refuses the course.
4. **`courses.needs_gender_prep` is NULL on all 150 courses and is read by nothing on the render
   path.** Setting it changes no audio.

The contained fix is three lines — make those sites read `course.needs_gender_prep === true ||
GENDERED_LANGUAGES.includes(lang)`. **I have not made it.** It is a render-path change to a live
course's audio pipeline, it was already scoped and deliberately not made by an earlier job today,
and it is not what this brief authorised.

---

## The third blocker: an open decision that predates me

Documented today in `docs/course-optimization/hin-gender-ambiguity-convention-2026-09-02.md`
(untracked working-tree file): the player shows **one** target text and reveals it under the
**male** voice (`packages/core/src/script/generateScript.ts`; `LearningPlayer.vue:6728-6733`).
Under the settled rule "male voice always takes the his-reading", the stored English must be the
male reading — but **22 of the 46 ambiguous seeds currently store the female reading**
("Where is her bag?", "I want to give her more time.").

My brief forbids changing the English. So for those items the "her" variant I would author is the
one already on screen, and the "his" variant is the one that does not exist. Authoring into that
without Kai's ruling produces variants that are wrong for a fifth of the set whichever way the
ruling lands.

---

## What I need from Kai — one question

**Which job is it?**

- **(A) `eng_for_hin`, referent gender, the 566 "her" readings** — matches every word of the
  context. Then it also needs: the three-line phase8 gate change (or an explicit decision to store
  the text now and render later), a keying convention for the rows, and the reveal-text ruling on
  the 22 seeds.
- **(B) `hin_for_eng`, speaker gender, ~1,022 candidates before reading** — the machinery works
  today, unblocked, `target_lang='hin'` is on the gendered list. But it is *female-speaker*
  variants, not "her" variants, and it is not 566.

Either is a real, doable job. I will not guess between them, because guessing wrong means authoring
several hundred Hindi or English sentences into the wrong course on the wrong axis.

---

## What I did not do, and why

- **Did not author or store any variant.** Both readings of the brief fail the premise check it
  set me.
- **Did not change `GENDERED_LANGUAGES` or the phase8 gate.** Live render path, not authorised here.
- **Did not touch seed text, English text, or any course row.** Explicitly forbidden, and not needed.
- **Did not generate audio.** Explicitly forbidden.
- **Did not build a parallel mechanism.** Explicitly forbidden, and the existing one is the right
  one — it is the gate in front of it that is shut.

---

**Landing line: no commits** *(superseded below if this document is committed — see the report.)*
