# Cleanup item 16: a wrong NEW flag on a LEGO (fix plan, nothing applied)

Overnight #785·AK, cs #791·AK. Counts are from the QA copy `ssi_copy_20261123t033000z` (23 Nov), made with the committed recount (`ops/paid-cleanup-717/tools/recount.cjs`).

## The defect
The player builds rounds only for LEGOs marked NEW (`is_new`). A LEGO is taught once, at its first appearance. Two failure shapes:
- **Taught NEW twice (`dup_debut`): 189 LEGOs.** The same known+target pair is marked NEW again at a later seed. The learner gets a second debut and a second basket for something already taught. In 187 the earlier teaching is in an earlier seed; in 2 it is the same seed.
- **Not-new but never taught (`notnew_untaught`): 463 LEGOs.** The pair is marked not-new, but no earlier LEGO teaches it, so the learner never gets its debut, and its basket is dark (P25).

**652 LEGOs in total** (19 Nov: 645). Biggest courses: deu_for_zho 74, spa_for_eng 59, deu_for_eng 52, fra_for_zho 44, ita_for_zho 40, deu_for_jpn 39, jpn_for_eng 39, kor_for_eng 39, zho_for_jpn 38.

## Real examples (copy, 23 Nov)
| course | LEGO | kind | known / target | note |
|---|---|---|---|---|
| eng_for_ben | S0626L02 | taught NEW twice | না, ... ধন্যবাদ / no thank you | first taught at S0173L01 |
| fra_ca_for_eng | S0115L02 | taught NEW twice | I was / j'étais | first taught at S0026L03 |
| eng_for_kor | S0061L02 | taught NEW twice | 다시 / again | first taught one LEGO earlier, same seed (S0061L01) |
| spa_for_eng | S0274L01 | not-new, never taught | do you have to / tienes que | no earlier LEGO carries the pair |
| ita_for_eng | S0246L02 | not-new, never taught | I wanted her to help you / volevo che lei ti aiutasse | |
| eng_for_deu | S0257L01 | not-new, never taught | mag / like | the #447 list's eng_for_eu S0257L01 family |

## A caution before any rule
"Never taught" is judged by an **exact pair match**. Many of the 463 are not really untaught: the words were taught as two smaller LEGOs, or under a slightly different gloss. Canon L30 says a span built entirely from taught pieces gets no LEGO, and those are correct as not-new. And canon **P25 (Kai, ita_for_eng)** says drill phrases under a not-new LEGO are **re-homed under a new LEGO, never handled by flipping is_new**. So item 16 is not a flag sweep. R0.9: the count is a hypothesis to re-derive, not a work order.

## The fix rule, per case
1. **Taught NEW twice, later seed (187):** set the later LEGO to not-new (`lego.update is_new:false`). Its basket goes dark, so first **move** any row that is not already in the earlier LEGO's basket to that basket (`phrase.insert` with the same words and clips, then delete). Thin baskets are fine, but never leave the earlier debut empty. 0 chars when the clips move with the row.
2. **Taught NEW twice, same seed (2):** these are almost always a re-cut leftover. Read them by hand (2 LEGOs).
3. **Not-new, never taught (463)**, read in three bands:
   - the pair is really taught by pieces (L30) → correct as it is, close it;
   - a genuine first teaching wrongly marked (the #447 examples: eng_for_* S0207L01 "you've done", S0257L01; ara_lb S0017L01 / S0035L01 inverted) → make it NEW (canon L31). It then needs an introduction (presentation line + clip, O2/O13) and a basket at the floor. On the copy the 463 baskets are 187 at floor, 132 thin and 144 empty. An empty or thin one joins the item-9 back-fill list, and is never flipped without rows (P30).
   - drill rows parked under a not-new LEGO → re-home under the new LEGO they practise (P25). Do not flip.

## Size and audio
- Rule 1: about 187 `lego.update` + row moves; **0 chars** (clips move).
- Rule 3 "make NEW": only after a by-hand read. The #447 scan found 138 genuine cases estate-wide. Each needs an intro clip (about 25 chars → **≈3,400 Cartesia chars** for 138) plus back-fill rows for empty baskets (same pipeline as item 7: `ops/overnight-785/item7-backfill/`).
- Apply route: Popty `POST /api/production/:course/edit-batch` (dry run, then `"apply": true`) for the hand-read sets. If Kai says Y, rule 1 can be a night changeset with seed + LEGO guards.

## Kai's call
- **Rule 1 as a scripted night changeset (PROPOSAL, needs your specific Y; 18 Nov rule):** 187 later duplicate debuts set to not-new, with any unique rows moved to the first debut first. → **Y / N** (recommended **Y**: it is mechanical and costs no audio).
- **Rule 3 (the 463):** a reader pass first (Claude-heavy, read-only), producing three lists (pieces / make NEW / re-home). Nothing is flipped until you see them. → **Y / N** (recommended **Y**).
