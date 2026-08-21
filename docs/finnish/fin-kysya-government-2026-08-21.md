# Finnish `kysyä` government — fix and course-wide sweep, 2026-08-21

**Course:** `fin_for_eng` · **Ruling:** Kai, 2026-08-21 — *fix, not pull*
**Scope:** seed 380 rows raised but not acted on by the 2026-08-21 proofreader-flags pass
(`docs/finnish/fin-proofreader-flags-2026-08-21.md`, §"One thing raised, not acted on"),
plus the whole-course sweep of the same error class.

## The defect

`kysyä` is a partitive verb: the thing asked about takes the **partitive**, not a total
(genitive/accusative) object. Asking is not a resultative act — it produces no bounded
result on its object — so the accusative is ungrammatical. `mä kysyin sen` is wrong;
`mä kysyin sitä` is right.

The earlier pass pulled six rows in this class, but its sweep was keyed to the `kys*` +
`nim*` co-occurrence — one *instance* of the class, not the class. This pass swept the
class itself.

Kai's ruling on seed 380: **fix**, because the "confusing for the learner" argument that
justified pulling the `sen nimen` rows does not apply here — there is no competing taught
form at this seed to collide with. Confirmed independently before applying.

## Before / after — every row changed

| Row | Seed | Role | Known (English) | Finnish **before** | Finnish **after** |
|---|---|---|---|---|---|
| `S0380L01U09` | 380 | use | I asked it on Wednesday | mä kysyin **sen** keskiviikkona | mä kysyin **sitä** keskiviikkona |
| `S0380L01U10` | 380 | use | I asked it on Monday | mä kysyin **sen** maanantaina | mä kysyin **sitä** maanantaina |
| `S0382L01B03` | 382 | build | did you ask that | kysyitkö sä **sen** | kysyitkö sä **sitä** |

**No English prompt was changed.** The known side is untouched on all three rows.

Two of the three are the rows Kai named. **One further row was found and fixed beyond
them**: `S0382L01B03`, the worked example the earlier sweep missed.

## Sweep method and counts

Read live from the database, whole course, no sampling:

| Read | Count |
|---|---|
| Seeds read | **668** |
| Legos read | **1,425** |
| Practice-phrase rows read | **14,117** |
| Rows containing `kys*` (phrases) | **237** — every one examined by hand |
| Legos containing `kys*` | **14** — all examined |
| Seed sentences containing `kys*` | **21** — all examined |
| **Rows fixed** | **3** |
| **Rows fixed beyond Kai's two** | **1** |

Every `kys*` row was read and adjudicated individually, not pattern-matched. The
candidate set was *not* narrowed to `nim*`.

### Judged and deliberately left alone

These carry a total object near a form of `kysyä` and are **correct**:

| Rows | Finnish | Why it stays |
|---|---|---|
| `S0190L03*` (6 rows), lego `S0190L03`, seed 190 | kysyä / mä kysyn sulta **muutaman kysymyksen** | Cognate object. `kysyä kysymys` licenses a total object — the question *is* the bounded thing produced by the asking. `Saanko kysyä muutaman kysymyksen?` is standard idiomatic Finnish. |
| `S0423L02U01`, seed 423 | pitääkö niiden kysyä **niin ilmeinen kysymys**? | Same cognate object, in nominative because a necessive clause (`pitää` + genitive subject) puts the total object in the nominative. Correct on both counts. |
| `S0382L02U01`, `S0382L02U02` | …mihin se halusi laittaa **sen** | `sen` is the object of `laittaa` (resultative — total object correct), not of `kysyä`. |
| `S0208L01U01` | …kysyä sulta miten sanoa **se** | Object of `sanoa` in an infinitive clause, not of `kysyä`. |
| `S0465L02B02`, `S0465L02U01` | mä kysyn, mikä **sen** nimi on | `sen` is a genitive possessor of `nimi`, not an object. |
| `S0268L01U06` | se lähetti mulle **muutaman kysymyksen** | Object of `lähettää`. |
| `S0202L02*`, `S0250L02*`, `S0205`, `S0213`, `S0274`, `S0278`, `S0280`, `S0300` | vastata **kysymykseen** | `vastata` governs the illative. Correct. |
| `S0381L01B02` | mä en kysynyt **sitä** | Already partitive. Correct — and now consistent with the repaired `kysyitkö sä sitä` one seed later. |
| all `kysyä sulta` / `kysyä siltä` / `kysyä itseltäsi` / `multa kysytään` rows | — | Ablative source, not an object. |

### Residual check after the write

Re-read live from the database. Rows where a form of `kysyä` is followed by a total-object
pronoun or noun: **0**. The class is clear.

## Introduced-before-use

`sitä` is well established before both seeds touched:

| Where | Seed | Lego | Form |
|---|---|---|---|
| First appearance (bundled in a formula) | **29** | `S0029L01` "I'm looking forward to" / `mä odotan innolla sitä, että` | `sitä` |
| First taught as a bare partitive object | **37** | `S0037L03` "to think about it" / `miettiä sitä` | `sitä` |

Seed 380 and seed 382 both sit **343 and 345 seeds after** the standalone teaching point.
`sitä` appears in **356** phrase rows across the course. Nothing is used before its time.

### Lego / inheritance sweep

- `S0380L01U09` and `S0380L01U10` are `use` rows. Their lego card is `S0380L01`
  *"I asked" / `mä kysyin`* — it carries no object, so no card change is implied.
- `S0382L01B03` is a `build` row. Its lego card is `S0382L01` *"did you ask" /
  `kysyitkö sä`* — again no object, no card change implied.
- No later phrase inherits the defective string: the residual sweep above returns zero,
  course-wide, across all 14,117 rows.
- **No lego card and no seed sentence in the course carried the defect** — verified
  against `course_legos` (1,425) and `course_seeds` (668).

## ZUT

- Each of the three known prompts appears **exactly once** in the course, and maps to
  exactly one target, before and after.
- None of the three new Finnish forms (`mä kysyin sitä keskiviikkona`,
  `mä kysyin sitä maanantaina`, `kysyitkö sä sitä`) existed anywhere in
  `course_practice_phrases` or `course_legos` before this write — so no collision was
  created in either direction.
- The course does carry pre-existing one-known-to-many-target duplicates on short
  component/build fragments (`that`, `you`, `do`, `said`, …). Those are **pre-existing and
  untouched by this pass** — flagged here as an observation, not introduced by it.

## Audio

**No TTS generated. No asset deleted. Nothing re-rendered.**

- All four audio columns (`known_audio_id`, `target1_audio_id`, `target2_audio_id`,
  `presentation_audio_id`) were **NULL on all three rows** before the edit, so the
  `trg_null_phrase_audio_on_text_change` trigger had nothing to null and no clip was
  orphaned.
- `course_audio` holds 356 rows for `fin_for_eng` — 313 `eng`, 43 `fin`. **Not one `fin`
  clip contains `kys*`**, and no clip of any language carries the old or new text of these
  three rows. Confirmed by direct query.

## Other derived artefacts

- `decomposition`, `display_tiling` and `known_gloss_segments` were **NULL on all three
  rows** — no word mapping or gloss alignment to re-derive.
- `course_round_index` is a materialised view over `course_legos` only
  (`lego_id, seed_number, lego_index`) — it holds no phrase text, and no lego was touched.
  **No refresh needed.**
- The only foreign key onto `course_practice_phrases` is `course_qa_flags.phrase_id`,
  which holds zero Finnish rows.
- `tools/proofread/progress/*.json` and the port-4747 server were **not touched.**

## Seeds unapproved

**0.**

Unapproving is **not automatic**: none of the five triggers on `course_practice_phrases`
(`increment_version`, `audit_content_change`, `touch_course_content_stamp`,
`null_phrase_audio_on_text_change`, `pull_audio_duration_on_link`) references
`approved_at`. It would have had to be set by hand.

It did not need to be. **Seeds 380 and 382 both already had `approved_at = NULL`** before
this pass and still do. Both remain unapproved. Nothing was approved.
(For scale: 101 of the course's 668 seeds are approved; neither of these is among them.)

## Rollback

All three rows are snapshotted verbatim, every column, in
**`docs/finnish/fin-kysya-government-2026-08-21-rollback.json`**.
A straight `UPDATE … SET target_text = …` from that file restores the prior state.

## Method note

Every count and every post-write verification in this document was re-read **live from the
database**, not taken from the edit log. `version` incremented 1 → 2 on all three rows,
confirming the writes landed.
