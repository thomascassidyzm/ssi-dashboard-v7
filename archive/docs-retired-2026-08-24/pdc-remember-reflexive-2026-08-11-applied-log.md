# pdc_for_eng — "remember" consistency pass, 2026-08-11

## Finding

`erinnere` is **one verb in two constructions**, not two words — exactly parallel to
German *sich erinnern (an)*. The course uses:

- **reflexive**: `mich erinnere`, plus `uff <object>` when there is a noun object
- **bare**: `<object> erinnere` / `erinnere kenne`, with no reflexive pronoun

The reflexive pronoun is a separate, movable word, so a bare LEGO card such as
`erinnere kenne` is legitimate — it is the verb chunk that tiles the seed, with
`mich` supplied by the sentence. The inconsistency is in the **phrases**.

## Counts (live DB, before the pass)

| | rows |
|---|---|
| phrases whose target contains `erinner` | 76 |
| reflexive (`mich`/`sich`/…) | 60 |
| bare | 16 |

Kai's supplied edit list (`docs/pdc-edits-2026-08-11.md`) contains 7 `erinner` items:
6 reflexive (items 10, 24, 56, 57, 113, 232) and 1 bare (item 6). So the reflexive
is dominant both in the course (60:16) and in Kai's own list (6:1).

No ZUT collision exists among these rows — no two share an identical known side.

## Changed — 5 rows, all in unapproved seeds ahead of the proofreader

Each new target reproduces a pattern already present verbatim elsewhere in the
course. No new words were invented. `word_count` (which stores the target's
character length in this table) was recomputed.

| row | before | after | model already in course |
|---|---|---|---|
| S0011L02B02 | `en Watt erinnere kenne` | `mich uff en Watt erinnere kenne` | S24 `ich will mich uff en Watt erinnere kenne` |
| S0011L02U02 | `ich will die ganz Sentence erinnere kenne` | `ich will mich uff die ganz Sentence erinnere kenne` | S24 `ich will mich schnell uff die ganz Sentence erinnere kenne` |
| S0012L01U03 | `ich will mariye die ganz Sentence erinnere kenne` | `ich will mich mariye uff die ganz Sentence erinnere kenne` | S24 `ich waer mich mariye net uff ihr Naame erinnere kenne` |
| S0013L01U06 | `ich will erinnere, wie du Deitsch schwetzscht` | `ich will mich erinnere, wie du Deitsch schwetzscht` | S6 `ich will mich erinnere, wie mer ebbes saagt` |
| S0016L02U03 | `ich deet gleiche schpeeder die ganz Sentence erinnere kenne` | `ich deet gleiche mich schpeeder uff die ganz Sentence erinnere kenne` | S24 `ich deet gleiche mich erinnere kenne, …` |

After: 64 `erinner` phrases live (seed 10's 12 rows were deleted by a proofreader
redo at 18:44Z, mid-pass), 56 reflexive / 8 bare.

Rollback is row-by-row from `pdc-remember-reflexive-2026-08-11-before-images.json`
(each entry carries the row `id` and its original `target_text` / `word_count`).

## Deliberately NOT changed

- **Seed 6** — approved by the proofreader. It is already reflexive
  (`Ich browier mich uff en Watt zu erinnere.`), but **Kai's list item 6 says it should
  be bare**: `Ich browier en Watt zu erinnere.` That is unapplied and needs a decision.
- **Seed 10** — the proofreader's live position; he requested a redo of it at 18:44Z
  while this pass was running. Its rows no longer exist.
- **3 rows where inserting `uff` would produce a double `uff`** in one clause
  (S11 `ich deet gleiche die ganz Sentence uff Deitsch erinnere`,
  S11 `ich deet gleiche en Watt uff Deitsch erinnere kenne`,
  S16 `er will die ganz Sentence uff Deitsch erinnere`). No course model exists for that.
- **4 rows needing a non-1sg reflexive pronoun** (`sich`, `uns`, `dich`) at S16, S17,
  S18, S20. Those pronouns appear nowhere in this course's `erinnere` rows, so writing
  them would be inventing target text in a language nobody here speaks.
- **3 component/citation rows** (`erinnere` alone at S6 and S24) — bare citation form
  is correct and component rows are not drilled.

## Separate finding: `epper Anne`

17 phrase rows across seeds 11, 12, 13, 14, 16, 17, 18, 20, 21, 23, 33 contain
`epper Anne` with a capital A. Zero LEGO or seed rows do, and zero rows use the
lowercase spelling. This is what the proofreader's repeated redo note
("lowercase the A in anne", attached to seeds 5, 6, 7, 9 and 10) is asking for.
It is **not fixed here**: Kai's own edit list writes it capitalised (item 5,
`Ich waer mit epper Anne schwetze iewe.`), so Kai and the proofreader disagree and
Kai should settle it. A sweep would be a one-line change to those 17 rows.
