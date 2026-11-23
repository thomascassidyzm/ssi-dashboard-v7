# Cleanup item 18: the same row twice in one basket (fix plan, nothing applied)

Overnight #785·AK, cs #791·AK. Counts are from the QA copy `ssi_copy_20261123t033000z` (built 23 Nov 03:40Z), made with the committed recount (`ops/paid-cleanup-717/tools/recount.cjs`, same definition as #914·AI's 19 Nov count).

## The defect
A played basket (BUILD/USE rows under a NEW LEGO) holds two rows with the same known AND the same target (ZUT-normalised, so only punctuation differs). The learner gets the same prompt twice from one basket. The basket looks fuller than it is, and the floor count is inflated.

**3,761 rows on 2,556 LEGOs in 34 courses** (19 Nov: 3,775). Biggest: kor_for_eng 853, fra_for_eng 519, por_for_eng 492, ita_for_eng 430, eng_for_jpn 429, eng_for_kan 226, eng_for_tel 179, jpn_for_eng 176, spa_for_eng 120.
There is a second, separate list: **2,551 cross-basket repeats**, where the same pair is played in two different baskets. Canon S4 says overlap between baskets is normal, so these are **not** part of this fix and need no action.

## Real examples (copy, 23 Nov)
| course | row | its twin | known / target | roles |
|---|---|---|---|---|
| deu_for_eng | S0016L03U01 | S0016L03B01 | He wants to come back / Er will zurückkommen | USE repeats a BUILD |
| kor_for_eng | S0057L01U01 | S0057L01B03 | I can't remember / 기억하지 못해요 | USE repeats a BUILD |
| eng_for_deu | S0177L01B02 | S0177L01B01 | sie fragen, wo sie hingehen möchte / ask her where she wants to go | two BUILDs |
| ara_eg_for_eng | S0054L03B02 | S0054L03B01 | more time / وقت زيادة | two BUILDs |
| spa_mx_for_eng | S0033L01U01 | S0033L01B02 | you have been learning Spanish all day / llevas todo el día aprendiendo español | USE repeats a BUILD |

The twin pairs split like this (earlier row → later row): BUILD→USE 2,008, BUILD→BUILD 1,597, USE→USE 140, USE→BUILD 16. In 3,619 pairs both rows point at the **same target clip**, so nothing audible is lost by dropping one.

## The fix rule, per case
1. **BUILD→BUILD, USE→USE:** delete the later row (higher position). Keep the earlier one.
2. **BUILD→USE (2,008):** delete the **BUILD** and keep the USE. A full sentence that replays cold is the more valuable row (P6/P7), and a BUILD that is already a full sentence is not showing the LEGO plug into anything (P3). Where the BUILD is the only real BUILD left, delete the **USE** instead, so the basket keeps a BUILD. The floor counts BUILDs separately.
3. **USE→BUILD (16):** same as rule 2, mirrored.
4. **Never leave a debut LEGO with zero real rows (P30).** Thin is fine (Kai 19 Nov). On this copy no delete empties a basket. By an approximate count, about 130 LEGOs that are at the floor today would drop one row below it, and they join the item-9 thin-basket back-fill list.
5. Clips: a deleted row's clips stay in the library (O11). No clip is deleted and none is rendered.

## Size and audio
- 3,761 `phrase.delete` ops, 34 courses, **0 audio characters**.
- Apply route: one night changeset per course (`services/shared/changeset.cjs`, each delete carrying `expect` = the copy's text), with a guards sidecar holding seed + LEGO text for Kai's live pre-check (`ops/paid-cleanup-item9/tools/precheck-guards.cjs`), applied with `node tools/changeset/apply-changeset.cjs <file> --key kai --agent kai-<job>` at 22:00-07:00 UK, after `curl localhost:3470/health` shows the gate green.
- 2,556 LEGOs at about 1.5 deletes each is a light write load (deletes only, no tile refresh). Two nights at the item-9 pace.

## Kai's call
- **Scripted fix (PROPOSAL, needs your specific Y; 18 Nov rule):** generate the 34 delete changesets with rules 1-4 above from the copy, `--check` them, and run them at night under the live pre-check. → **Y / N**
- Rule 2 (keep the USE, drop the BUILD) → **Y**, or "later" to always drop the later row.
- Recommendation: **Y** to both. These are exact duplicates with the same clip. Nothing about meaning or taste is being decided.
