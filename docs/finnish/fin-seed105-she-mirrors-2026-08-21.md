# Finnish seed 105 — the "she didn't know" mirrors, 2026-08-21

**Course:** `fin_for_eng` · **Lego:** `S0105L02` — *he didn't know* / **se ei tiennyt**
**Origin:** Kai's proofreading flag on `fin_for_eng:S0105L02B05` —
*"this is fine, but we could also add some 'she didn't know's in here, you know?"*
**Approved by Kai** 2026-08-21. Fix (b) of three; seed 54 and seed 380 are other workers'.

The flagged row is **correct and untouched**. This pass is additive only.

## What was wrong to fix

Before this pass, lego `S0105L02` carried **11 teaching rows** (plus 2 components) and
**every one of them** began *he didn't know*. Finnish `se` is this course's third-person
pronoun for both he and she, so the imbalance is entirely on the **English known side**:
the learner drills the past-negative-`tietää` frame eleven times and is never once asked
to produce it from a female prompt. That is the gap Kai's note names.

## The three new rows

Appended as USE rows at the end of the lego, positions 14–16, ids assigned by the
course-builder:

| id | pos | Known (English) | Target (Finnish) | mirrors |
|---|---|---|---|---|
| `fin_for_eng:S0105L02U07` | 14 | she didn't know the answer | se ei tiennyt vastausta | `B03` / the seed sentence's core |
| `fin_for_eng:S0105L02U08` | 15 | she didn't know what to say | se ei tiennyt mitä sanoa | `U02` |
| `fin_for_eng:S0105L02U09` | 16 | she didn't know her name | se ei tiennyt sen nimeä | `B05` — Kai's flagged row |

Three, not one and not ten: the course's own mirror precedent at `S0052L04` is 3 her-side
rows appended to an 8-row lego (~27%); 3 on 11 here is ~21%, the same proportion. They
mirror the *spine* — the seed's own core sentence, one clause-embedding, and the flagged
name row — rather than the exotic tail, so the coverage is even rather than decorative.

## The pattern this follows (not invented here)

The course already mirrors he/she by **appending a duplicate-English row onto the same
Finnish target**, inside the same lego, at the end:

| Lego | Existing row | Mirror row | Shared Finnish |
|---|---|---|---|
| `S0052L04` | B03 *to say something to his friend* | B04 *to say something to her friend* | sanoa jotain kaverillensa |
| `S0052L04` | U02 *he wants to say something to his friend* | U06 *she wants to say something to her friend* | se haluu sanoa jotain kaverillensa |
| `S0053L02` | U01 *she wanted to put his letter back* | U06 *she wanted to put her letter back* | se halusi laittaa sen kirjeen takaisin |
| `S0054L02` | U01 *I want to give something to his friend* | U06 *I want to give something to her friend* | mä haluun antaa jotain kaverillensa |
| `S0105L02` | B04 *he didn't know his name* | B05 *he didn't know her name* | se ei tiennyt sen nimeä |

Seed 52 → 53 does the same thing at seed scale (*he wanted* → *she wanted*, both
**se halusi**). And the exact rendering used here is already attested: `S0433L02U04`
*she didn't know when the film started* → **se ei tiennyt, milloin elokuva alkoi**.
So *she didn't know* → **se ei tiennyt** is the course's existing choice, not a new one.

Mirrors therefore do **not** need to differ in object or complement — the established
pattern is a same-target pair, and diverging from it would be the inconsistency.

## ZUT check — whole course, re-read live after the write

- **One known → one target.** Each of the three new English knowns resolves to exactly
  **1 distinct target** across all `course_practice_phrases`, `course_legos` and
  `course_seeds` rows of `fin_for_eng`. None of the three existed anywhere in the course
  before this pass — checked case- and punctuation-insensitively over the whole course,
  not a sample.
- **Two knowns → one target** is the direction being used, and it is used consistently:

  | Target | Knowns bound to it |
  |---|---|
  | se ei tiennyt vastausta | he didn't know the answer (B03) · she didn't know the answer (U07) |
  | se ei tiennyt mitä sanoa | he didn't know what to say (U02) · she didn't know what to say (U08) |
  | se ei tiennyt sen nimeä | he didn't know his name (B04) · he didn't know her name (B05) · she didn't know her name (U09) |

  The third is a three-way, which is the full he/his, he/her, she/her cell set for one
  Finnish string — the same shape `S0052L04` already carries.

## Introduced-before-use — every word, both sides

**Finnish.** Every form attested in `fin_for_eng` at or before seed 105:

| Form | First taught | Where |
|---|---|---|
| `se` | seed **16** | `S0016L01C01` *he* → se (also `S0017L01C01` *she* → se) |
| `ei` | seed **34** | `S0034L01C02` *doesn't want* → ei haluu |
| `tiennyt` | seed **105** | `S0105L02C02` *didn't know* → ei tiennyt — **the host lego itself** |
| `vastausta` | seed **66** | `S0066L04B01` *to try to find an answer* → yrittää löytää vastausta |
| `mitä` | seed **8** | `S0008L02B01` *what I want* → mitä mä haluun |
| `sanoa` | seed **4** | `S0004L02B01` *to say something* → sanoa jotain |
| `sen` | seed **20** | `S0020L02C01` *his* → sen |
| `nimeä` | seed **21** | `S0021L03U01` *I don't want to remember her name* → sen nimeä |

Every word is introduced **strictly before** seed 105 except `ei tiennyt`, which is the
lego being practised — required, and enforced by the endpoint's containment check.

The partitive object `vastausta` is licensed here: it sits under negation (*ei tiennyt*),
which is exactly the licensing context it was introduced in at seed 66. `sen nimeä` is
likewise the partitive the course settled on at seed 21, kept distinct from the genitive
`sen nimen` of seed 20 — the split the 2026-08-21 `kysyä` pass protected.

**English.** Every word and structure already given to the learner by seed 105:

| Item | First given | Where |
|---|---|---|
| she | seed **17** | `S0017L01C01` *she* |
| didn't know | seed **105** | `S0105L02C02` — the lego being taught |
| the answer | seed **17** | `S0017L03B01` *what the answer is* |
| what to say | seed **8** | in the *what* + infinitive frame (`S0008L02B03`); as *what to say* at `S0105L02U02` |
| her name | seed **21** | `S0021L03U02` *I wouldn't like to guess her name* |

No new English word or structure is introduced by these rows.

## Counts and safety

- **Rows added: 3.** Rows changed: **0**. Rows deleted: **0**. Seed 105 went from 21 to
  **24** rows; all 21 pre-existing ids, texts and positions are byte-identical after the
  write (re-read live from the database).
- **Written through the additive path**, `POST /api/build/backfill-submit/fin_for_eng`,
  which appends and continues the U-numbering. `POST /api/seed/complete` — destructive by
  replace — was **not** used, so nothing was orphaned. Phrase ids were assigned by the
  builder; none were set by hand.
- **Lego phrase count: 13 → 16.** Within course convention — 25 legos in `fin_for_eng`
  already carry 14 rows, 12 carry 15, 7 carry 16. Positions stay contiguous (1–16).
- **Audio: none generated, none deleted, none touched.** All three new rows have NULL on
  `known_audio_id`, `target1_audio_id` and `target2_audio_id` — **3 rows without audio**,
  which matches the rest of `fin_for_eng` (the course holds no target-side clips at all).
- **Seeds unapproved: 0.** Seed 105 was **already** unapproved before this pass
  (`course_seeds.approved_at IS NULL`) and remains so. Nothing was approved.
  Unapproval is **not automatic**: no trigger on `course_practice_phrases` writes to
  `course_seeds.approved_at` — the six triggers there are audit, content-stamp, version,
  component-introduction refusal, audio-duration pull and audio-null-on-text-change.
  A pass that inserts into an *approved* seed must therefore null `approved_at` by hand
  (or reconcile by timestamp, as the backfill playbook's step 5 describes). Here there was
  nothing to null.
- `course_round_index` needs no refresh — phrase-only inserts do not touch it.
- Kai's flag on `S0105L02B05` was **not** hand-cleared; it closes itself.

## Rollback

The 21 pre-write rows are snapshotted verbatim in
`docs/finnish/fin-seed105-phrases-snapshot-2026-08-21.json`. To undo, delete the three
ids `fin_for_eng:S0105L02U07`, `U08`, `U09` — they are the only rows this pass created.

## Method

Read the whole course, not a sample: every `course_practice_phrases`, `course_legos` and
`course_seeds` row of `fin_for_eng` for the ZUT and introduced-before-use checks, and for
the mirror precedent. Every count and every post-write claim above was re-read live from
the database, not from the submission log.
