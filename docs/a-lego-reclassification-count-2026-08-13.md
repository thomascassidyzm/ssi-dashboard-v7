# A-LEGOs misfiled as atomic — the estate-wide count

**2026-08-13. Read-only count, published before anything was written.**

Tom's definition, verbatim: *"An A-LEGO has only one word in at least one language, and therefore cannot be split and mapped."* And, when told that `a word = hitz bat` was filed as an A-LEGO and therefore correctly showed no mapping glyph: *"Of course reclassify."*

So the test is simple and it is the whole test: **a LEGO typed `A` with two or more words on BOTH the known side and the target side is misfiled.** One word on either side and it stays atomic.

This job changes the **classification flag only** — Tom, relayed the same day: *"It's just classification that feeds the mapping."* No text is touched on either side, no components are authored, no gloss segments are written, no audio is generated or changed. A reclassified row becomes a **mapping candidate**: the glyph appears, the editor opens, and a human authors the split later.

---

## The count

| | rows |
|---|---|
| A-LEGOs in the estate | **49,938** |
| **Qualify for reclassification (2+ words both sides)** | **4,088** |
| Stay atomic (one word on at least one side) | 36,576 |
| Excluded — non-space-delimited script | 9,203 |
| Excluded — a side is null/empty | 67 |
| Excluded — a side tokenises to zero words | 2 |
| Flagged — transliteration word-count disagrees | 2 |

4,088 rows across **77 courses**. Of those, 2,734 already carry `components` and 1,354 do not. **None** of the 4,088 carries a human-authored `known_gloss_segments` — nobody has mapped any of them yet, so nothing a human made is at risk.

For scale: the estate holds 43,916 LEGOs already typed `M`, so this moves roughly 9% more rows into the mappable class.

## How the words were counted

These are the taste-safe defaults. Each is stated so you can overturn one cheaply.

- **Whitespace splits, nothing else does.** An apostrophe inside a word does not split it: `don't`, `I'm`, `qu'il`, `j'ai`, `l'autre` are ONE word each. A hyphen inside a word does not split it: `voulons-nous`, `well-known`, `dárselo` are ONE word each. This is the "don't split contractions naively" rule taken literally — what a language writes solid is one word.
- **Leading and trailing punctuation is stripped** before counting and never becomes a token of its own. `did you have?` is three words; `gest ti?` is two.
- **A token with no letters or digits is dropped**, so a stray dash or quote mark can never inflate a count.
- **Non-space-delimited scripts are excluded, not guessed at.** Han, kana, Thai, Khmer, Lao and Myanmar text has no whitespace, so a whitespace count would call every row a single word and silently exclude those courses while pretending to have checked them. No segmenter was invented. They are listed below as an unresolved bucket for a separate ruling.
- **The test is two-plus on BOTH sides.** One word on either side means it stays an A-LEGO.

## Per course

| course | qualify | of A-LEGOs | already have components | no components |
|---|---|---|---|---|
| `eng_for_tel` | 510 | 842 | 490 | 20 |
| `cym_n_for_eng` | 447 | 635 | 0 | 447 |
| `cym_s_for_eng` | 443 | 679 | 0 | 443 |
| `eng_for_mar` | 424 | 754 | 421 | 3 |
| `eng_for_sin` | 382 | 714 | 373 | 9 |
| `kor_for_hin` | 127 | 1080 | 127 | 0 |
| `ben_for_eng` | 111 | 329 | 111 | 0 |
| `kor_for_tam` | 103 | 1169 | 103 | 0 |
| `fra_ca_for_eng` | 94 | 481 | 94 | 0 |
| `eng_for_kan` | 80 | 504 | 80 | 0 |
| `fra_for_eng` | 78 | 659 | 66 | 12 |
| `spa_mx_for_eng` | 75 | 912 | 26 | 49 |
| `eng_for_guj` | 64 | 309 | 62 | 2 |
| `eng_for_urd` | 57 | 486 | 50 | 7 |
| `por_for_eng` | 56 | 629 | 35 | 21 |
| `ara_for_eng` | 55 | 723 | 45 | 10 |
| `eng_for_tam` | 55 | 563 | 18 | 37 |
| `eng_for_ben` | 55 | 440 | 47 | 8 |
| `gle_for_eng` | 49 | 283 | 4 | 45 |
| `eng_for_hin` | 48 | 346 | 44 | 4 |
| `eng_for_pan` | 44 | 342 | 22 | 22 |
| `fin_for_eng` | 43 | 590 | 42 | 1 |
| `por_br_for_eng` | 42 | 524 | 39 | 3 |
| `ell_for_eng` | 39 | 551 | 0 | 39 |
| `deu_for_eng` | 36 | 926 | 4 | 32 |
| `ita_for_eng` | 35 | 452 | 24 | 11 |
| `rus_for_eng` | 33 | 652 | 33 | 0 |
| `ara_eg_for_eng` | 33 | 1101 | 32 | 1 |
| `cat_for_eng` | 30 | 393 | 29 | 1 |
| `eng_for_spa` | 28 | 168 | 28 | 0 |
| `fas_for_eng` | 27 | 473 | 0 | 27 |
| `isl_for_eng` | 24 | 362 | 24 | 0 |
| `spa_for_eng` | 24 | 701 | 9 | 15 |
| `est_for_eng` | 21 | 528 | 21 | 0 |
| `deu_ch_for_eng` | 21 | 800 | 21 | 0 |
| `lav_for_eng` | 20 | 477 | 20 | 0 |
| `mlt_for_eng` | 19 | 462 | 19 | 0 |
| `srp_for_eng` | 18 | 376 | 18 | 0 |
| `kor_for_eng` | 15 | 736 | 13 | 2 |
| `eus_for_eng` | 15 | 392 | 12 | 3 |
| `eng_for_por` | 15 | 153 | 0 | 15 |
| `eng_for_fra` | 13 | 88 | 9 | 4 |
| `nep_for_eng` | 13 | 739 | 5 | 8 |
| `eus_for_spa` | 13 | 362 | 12 | 1 |
| `tel_for_eng` | 13 | 1591 | 13 | 0 |
| `eng_for_ara` | 13 | 103 | 0 | 13 |
| `heb_for_eng` | 10 | 210 | 9 | 1 |
| `gla_for_eng` | 10 | 109 | 10 | 0 |
| `eng_template` | 10 | 86 | 0 | 10 |
| `mar_for_eng` | 9 | 1903 | 9 | 0 |
| `ara_lb_for_eng` | 8 | 1054 | 8 | 0 |
| `hye_for_eng` | 8 | 651 | 3 | 5 |
| `nor_for_eng` | 8 | 345 | 8 | 0 |
| `eng_for_kor` | 6 | 173 | 6 | 0 |
| `hun_for_eng` | 5 | 553 | 5 | 0 |
| `ron_for_eng` | 5 | 449 | 0 | 5 |
| `bul_for_eng` | 5 | 470 | 5 | 0 |
| `afr_for_eng` | 4 | 418 | 2 | 2 |
| `tur_for_eng` | 4 | 1072 | 1 | 3 |
| `lit_for_eng` | 4 | 227 | 4 | 0 |
| `eng_for_ita` | 4 | 194 | 2 | 2 |
| `swa_for_eng` | 4 | 354 | 4 | 0 |
| `hrv_for_eng` | 3 | 350 | 0 | 3 |
| `hin_for_eng` | 3 | 620 | 3 | 0 |
| `pol_for_eng` | 3 | 315 | 2 | 1 |
| `ces_for_eng` | 2 | 94 | 1 | 1 |
| `bre_for_fra` | 2 | 188 | 1 | 1 |
| `sbx_for_eng` | 2 | 34 | 0 | 2 |
| `nld_for_eng` | 1 | 504 | 1 | 0 |
| `ukr_for_eng` | 1 | 502 | 0 | 1 |
| `dan_for_eng` | 1 | 305 | 1 | 0 |
| `swe_for_eng` | 1 | 556 | 1 | 0 |
| `eng_for_deu` | 1 | 137 | 0 | 1 |
| `ita_for_cym` | 1 | 29 | 1 | 0 |
| `cat_for_spa` | 1 | 926 | 0 | 1 |
| `pdc_for_eng` | 1 | 262 | 1 | 0 |
| `deu_at_for_eng` | 1 | 734 | 1 | 0 |
## Examples — check the tokeniser by eye

| course | lego | known | target |
|---|---|---|---|
| `eus_for_eng` | `S0293L01` | "I can find out" | "aurki dezaket" |
| `eus_for_eng` | `S0137L04` | "being perfect" | "perfektua izatea" |
| `eus_for_eng` | `S0120L01` | "you like" | "gustatzen zaizula" |
| `cym_n_for_eng` | `S0094L03` | "did you have?" | "gest ti?" |
| `cym_n_for_eng` | `S0115L01` | "she doesn’t like" | "dydy hi ddim yn licio" |
| `cym_n_for_eng` | `S0043L01` | "did you start?" | "wnest ti ddechrau?" |
| `fra_for_eng` | `S0400L04` | "later on" | "plus tard" |
| `fra_for_eng` | `S0370L02` | "that I knew" | "que je connaissais" |
| `fra_for_eng` | `S0412L01` | "we couldn't" | "nous ne pouvions pas" |
| `eng_for_tel` | `S0179L01` | "నువ్వు ఏం చేయబోతున్నావు" | "what are you going to do" |
| `eng_for_tel` | `S0063L01` | "నీకు ఇబ్బంది కాదని" | "don't mind" |
| `eng_for_tel` | `S0096L01` | "కొంచెం ఎక్కువ సమయం కావాలి" | "I need a little more time" |
| `spa_for_eng` | `S0348L01` | "was going to" | "iba a" |
| `spa_for_eng` | `S0028L01` | "it's useful" | "es útil" |
| `spa_for_eng` | `S0295L02` | "a day" | "un día" |
| `gle_for_eng` | `S0106L04` | "we must" | "caithfidh muid" |
| `gle_for_eng` | `S0108L02` | "hoping to" | "ag súil le" |
| `gle_for_eng` | `S0292L01` | "the party" | "an gcóisir" |
| `deu_for_eng` | `S0046L01` | "I make" | "ich mache" |
| `deu_for_eng` | `S0049L01` | "you know" | "du weißt" |
| `deu_for_eng` | `S0134L02` | "with them" | "mit ihnen" |
| `ara_for_eng` | `S0540L01` | "I don't mind" | "لا أُمانِعُ" |
| `ara_for_eng` | `S0347L01` | "a week ago" | "مُنْذُ أُسْبوعٍ" |
| `ara_for_eng` | `S0309L01` | "before now" | "مِنْ قَبْلُ" |
The acceptance row is in there: `eus_for_eng` `S0006L02`, `"a word"` → `"hitz bat"` — two words on both sides, currently typed `A`, no components, no stored mapping.

## Excluded — non-space-delimited script

Whitespace word-counting cannot see these languages. 9,203 A-LEGOs across 22 courses are excluded from the automatic write entirely. **This needs a separate ruling from Tom** — what counts as "one word" in Chinese, Japanese and Thai is exactly the question a whitespace test cannot answer, and guessing at it would be a content decision dressed as a classification one.

| course | excluded | of A-LEGOs |
|---|---|---|
| `hak_for_eng` | 813 | 813 |
| `yue_for_eng` | 771 | 773 |
| `zho_for_tam` | 587 | 587 |
| `jpn_for_eng` | 582 | 582 |
| `deu_for_zho` | 563 | 563 |
| `spa_for_jpn` | 552 | 552 |
| `deu_for_jpn` | 531 | 531 |
| `zho_for_hin` | 519 | 520 |
| `ita_for_zho` | 519 | 519 |
| `zho_for_jpn` | 484 | 484 |
| `por_for_jpn` | 466 | 478 |
| `nan_for_eng` | 443 | 443 |
| `zho_for_eng` | 422 | 422 |
| `spa_for_zho` | 417 | 417 |
| `ita_for_jpn` | 340 | 340 |
| `fra_for_zho` | 326 | 326 |
| `tha_for_eng` | 265 | 265 |
| `eng_for_jpn` | 245 | 245 |
| `eng_for_zho` | 171 | 171 |
| `fra_for_jpn` | 160 | 160 |
| `cym_anthem_for_jpn` | 17 | 17 |
| `zho_for_gle` | 10 | 10 |
## Excluded — other, with reasons

- **67 rows in `eng_template`** have `known_text` NULL. They are template scaffolding with only one side of text, so the two-sided test cannot run. Excluded.
- **2 rows tokenise to zero words on a side.** `tur_for_eng` `S0182L02` has `known_text` = `"?"` against target `"mü"`; `rus_for_eng` `S0047L02` has `known_text` = `"is (linking dash)"` against target `"-"`. Both stay atomic under the test anyway (the target is one word), but they are named here because they are odd rows a human may want to look at.
- **2 rows have a transliteration that disagrees on word count** with the target itself: `fas_for_eng` `S0179L01` (`"sunday afternoon"` → `یکشنبه بعدازظهر`, roman side counts 4 words to the target's 2) and `ell_for_eng` `S0279L03` (`"much time"` → `πολύς χρόνος`, roman side counts 1 to the target's 2). Both qualify on the target text itself and the transliteration is not the authored side, so **they are included in the write** — flagged here only so the disagreement is on the record.
- **10 rows in `eng_template`** qualify where the known and target text are identical (`"to explain"` → `"to explain"`). That is what a template course looks like; they meet the definition and are included.

## One tension worth a ruling

`ralph-methodology.md` says an M-LEGO **must** carry `components[]`. This reclassification creates 1,354 M-LEGOs with no components. Tom's word-count definition wins — and the fix is emphatically **not** to generate components, which would be a content change wearing a classification change's clothes.

Checked: no build gate rejects a component-less M-LEGO. `services/course-builder/lib/validation.cjs` guards its only component check with `lego.type === 'M' && lego.components`, so a missing `components` is skipped rather than rejected. Nothing breaks. But the doctrine text and the data now disagree, and that is a real thing for a follow-up pass to settle — either the doctrine softens to "an M-LEGO may be authored without components and awaits a mapping", or those 1,354 rows get components authored by a human over time.

---

*Method: `scripts/a-lego-wordcount-census.cjs` (read-only). Full row-level census: `docs/a-lego-reclassification-census-2026-08-13.json`.*

---

# What then happened — the write, and the acceptance test

**4,088 rows flipped `A` → `M`. A: 49,938 → 45,850. M: 43,916 → 48,004.** Exactly 4,088 either way, and a re-census finds zero type `A` rows left with two or more words on both sides. Every row was re-read at write time and had to still be type `A` with unchanged text before it was flipped: 0 skipped, 0 aborted. Only the `type` column was written. No text, no components, no gloss segments, no audio.

The run tripped once on the way: `psql` prints its `UPDATE 55` command tag as if it were a returned row, so the count assertion fired and stopped the run after one course. That is the assertion doing its job. The tag is stripped now and the 55 rows from the stopped course were counted as already-done, not written twice.

## One code change, and why it was needed

Flipping the type was not enough on its own. 1,354 of the 4,088 rows carry no `components`, so there was nothing faithful to DERIVE a mapping from — and the derivation's refusal to guess was sitting at the candidacy layer too, so `a word = hitz bat` came out of the flip still showing no glyph.

The fix is the smallest one that matches the ruling: a declared M-LEGO with two or more target words is now a mapping **candidate** even with no components, and the editor opens on **blank** columns for a human to author. Both ends changed together — the viewer gets the glyph, and the save no longer answers "this row has no alignment to change". The refusal to guess is untouched: every column starts empty and no gloss is invented anywhere. The edit guard still holds, because a blank start offers no words of its own, so an author may only draw on the row's own known text. `services/learning-script-generator.cjs`, `services/production-api.cjs`, tests updated in lockstep, 67/67 green.

## The acceptance test, on the live site

Tom's test: *"'a word = hitz bat' in eus_for_eng shows the mapping glyph and can be segmented."* Driven in a real browser against the deployed popty.app and the live watson-1 backend. **9 of 9 checks passed.**

**[See it — three frames](https://watson-1.tail4968cb.ts.net/evidence/a-lego-reclassify-2026-08-13/index.html)**

| | check | result |
|---|---|---|
| 1 | the bare `a word` → `hitz bat` LEGO row is on the live page | `INTRO a word → hitz bat` |
| 2 | that row now carries the mapping glyph | present |
| 3 | the editor opens on the row | 2 columns |
| 4 | the columns are the row's own target words, in Basque order | `hitz` `bat` |
| 5 | every column starts blank — nothing was guessed | `["·","·"]` |
| 6 | the row does not jump when the mapping opens | 52.0px → 52.0px |
| 7 | the live API serves a mapping for `S0006L02` | `segments: [{span:1,known:""},{span:1,known:""}]` |
| 8 | it is an unauthored candidate — this run wrote no mapping | `segmented=false` |

The split `hitz` → *word*, `bat` → *a* is now Deborah's to author in the editor, which is what "classification that feeds the mapping" means. This job did not write it.
