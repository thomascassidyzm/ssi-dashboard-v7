# Items 9 and 12 reconciled against the nightly copy (cs #868, 23 Nov; read-only, nothing repaired)

Asked by Kai's assistant after cold-verify #867·AK. Item 12's runner applied without Kai's seed/LEGO pre-check, and its "ALL DONE" counted refused and drifted ops as finished. Source: every changeset and ledger in the two night runners' worktrees (`~/.cs-long/item12`, `~/.cs-long/item9`), checked against copy `ssi_copy_20261123t033000z` (built 23 Nov 03:40Z). Tool: `ops/paid-cleanup-868/tools/reconcile-9-12.cjs`. Per-op findings (machine evidence): `~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-868/reconcile/reconcile-copy20261123.json`.

## Totals
| item | changesets | ops | applied | refused | drift | never applied | on the copy now: as applied | changed since | gone / still / empty |
|---|---|---|---|---|---|---|---|---|---|
| 12 | 47 | 17,212 | 16,445 | 15 | 0 | 752 (eng_for_sin, held whole on purpose) | 16,276 | 163 | 773 (752 of them are eng_for_sin) |
| 9 | 45 | 1,188 | 1,187 | 0 | 1 | 0 | 1,180 | 7 | 1 |

## What this means
1. **The missing pre-check did no visible harm to item 12.** Every item-12 row is the seed sentence. On the copy, every applied row still equals its seed, with two exceptions, and both come from LATER seed edits that did not carry over to the item-12 row (below). None of the rows was written over a seed that had already drifted.
2. **9 learner-facing slots are silent because item 12 refused their links** ("ALL DONE" counted them as finished):
   - eng_for_hin: 6 rows, target1 (S0053L04U06, S0105L01U06, S0241L02U06, S0323L02U06, S0363L02U06, S0477L03U06). The seed's clip speaks the female form ("her letter", "she didn't know") under male text.
   - fra_for_eng: 2 rows, target1 (S0139L04U06, S0140L02U09). The clip says "désolée" under the text "désolé".
   - eng_for_ben: 1 row, target2 (S0004L03U06). The clip says "…in English?" and the row has no "?".
3. **6 eng_for_deu inserts were refused as "already exists"**, after a statement timeout in the same batch had in fact committed. All 6 rows are on the copy with their audio. Nothing is missing.
4. **2 item-12 rows now disagree with their seed** (a real inconsistency; the learner hears the old sentence):
   - eng_for_pan S0108L03U06 still says "We didn't hope to wake in the middle of the night." The seed now says "expect … wake up" (C0108 changed it 22-23 Nov but missed this row).
   - spa_mx_for_eng S0377L03U10 says "¿Fuiste a algún **sitio** …". The seed now says "algún **lado**" (seed edited after item 12, likely the 21 Nov spa_mx propagation).
5. **Changed or gone since, by later approved work (not item 12 faults):** the seed-108 rows in eng_for_kan (changed), eng_for_tam, eng_for_tel and fra_ca (deleted), all from C0108; 3 fra_for_eng rows re-worded (S0248L02U09, S0280L01U10, S0480L02U15; most likely the fra held-items apply of 22 Nov); 153 spa_for_zho links and 6 kan/fra links now point at different clips (re-voiced afterwards; spa_for_zho matches the A2C round-2 run).
6. **Item 9 is clean apart from known items:** 1 drift op, eng_for_tam S0103L02U06 (a delete set aside, so the row is still live; already in the audit at L17), and 7 seed-108 rows in eng_for_urd/eng_for_jpn that C0108 re-worded after item 9 (legitimate).
7. **Reading list, not verdicts:** 55 item-12 seed-sentence rows do not contain their own LEGO's target word for word (e.g. eng_for_kan S0387L02 "no she was right" inside "No I didn't think she was right"; eng_for_spa S0163L02 "creo que es" vs "I think that it's"). These are LEGO-versus-seed mismatches that already existed (the item-10 family), exposed by the seed sentence, not created by item 12. Some are inflection or paraphrase false alarms. They are listed per row in the evidence file (`why.kind = lego_not_contained`).

## Courses that are not perfectly clean (all others: every op applied and present, 0 flags)
| course | item | ops | applied | refused | drift | never | present | changed | gone/still/empty | flagged rows |
|---|---|---|---|---|---|---|---|---|---|---|
| deu_at_for_eng | 12 | 272 | 272 | 0 | 0 | 0 | 272 | 0 | 0 | 6 |
| deu_ch_for_eng | 12 | 164 | 164 | 0 | 0 | 0 | 164 | 0 | 0 | 2 |
| deu_for_zho | 12 | 240 | 240 | 0 | 0 | 0 | 240 | 0 | 0 | 6 |
| eng_for_ben | 12 | 580 | 579 | 1 | 0 | 0 | 579 | 0 | 1 | 1 |
| eng_for_deu | 12 | 220 | 214 | 6 | 0 | 0 | 220 | 0 | 0 | 1 |
| eng_for_guj | 12 | 396 | 396 | 0 | 0 | 0 | 396 | 0 | 0 | 3 |
| eng_for_hin | 12 | 1044 | 1038 | 6 | 0 | 0 | 1038 | 0 | 6 | 0 |
| eng_for_ita | 12 | 164 | 164 | 0 | 0 | 0 | 164 | 0 | 0 | 1 |
| eng_for_jpn | 12 | 468 | 468 | 0 | 0 | 0 | 468 | 0 | 0 | 1 |
| eng_for_jpn | 9 | 213 | 213 | 0 | 0 | 0 | 212 | 1 | 0 | 1 |
| eng_for_kan | 12 | 1084 | 1084 | 0 | 0 | 0 | 1080 | 4 | 0 | 7 |
| eng_for_kor | 12 | 216 | 216 | 0 | 0 | 0 | 216 | 0 | 0 | 3 |
| eng_for_pan | 12 | 776 | 776 | 0 | 0 | 0 | 776 | 0 | 0 | 2 |
| eng_for_por | 12 | 276 | 276 | 0 | 0 | 0 | 276 | 0 | 0 | 3 |
| eng_for_sin | 12 | 752 | 0 | 0 | 0 | 752 | 0 | 0 | 752 | 0 |
| eng_for_spa | 12 | 336 | 336 | 0 | 0 | 0 | 336 | 0 | 0 | 2 |
| eng_for_tam | 12 | 800 | 800 | 0 | 0 | 0 | 796 | 0 | 4 | 9 |
| eng_for_tam | 9 | 54 | 53 | 0 | 1 | 0 | 53 | 0 | 1 | 0 |
| eng_for_tel | 12 | 612 | 612 | 0 | 0 | 0 | 608 | 0 | 4 | 6 |
| eng_for_urd | 9 | 6 | 6 | 0 | 0 | 0 | 0 | 6 | 0 | 5 |
| fra_ca_for_eng | 12 | 84 | 84 | 0 | 0 | 0 | 80 | 0 | 4 | 0 |
| fra_for_eng | 12 | 48 | 46 | 2 | 0 | 0 | 40 | 6 | 2 | 0 |
| ita_for_zho | 12 | 216 | 216 | 0 | 0 | 0 | 216 | 0 | 0 | 1 |
| spa_for_zho | 12 | 264 | 264 | 0 | 0 | 0 | 111 | 153 | 0 | 0 |
| spa_mx_for_eng | 12 | 408 | 408 | 0 | 0 | 0 | 408 | 0 | 0 | 3 |
Nothing was repaired. The 9 silent slots and the 2 stale seed-sentence rows are the candidates for a fix, on Kai's word.

## Fix run, 24 Nov (Kai, 23 Nov 18:06Z: fold these into the 24 Nov run): `fix-plan.json`
Each item: a live pre-check of the row, its LEGO and its seed (Popty script-view); any mismatch is held. Load gate green or amber. Render dry run first.
- eng_for_hin ×6, target1: the female seat's stored gender expansion turns third-person "his/he/him" into "her/she". That is not about the speaker, so it is the kind of pair #941·H removed. The route would speak that wrong form again, so: dry-run the render; if it echoes the female form, `gender.delete` that pair through the edit door (dry run, then apply), render again, and link fill-only.
- fra_for_eng ×2, target1 "Je suis désolé…": the speaker is gendered. The female seat speaking "désolée" is the gender rule (same family as item 8), so a fresh "désolé" in the female voice would recreate item 8's defect. Asked Kai; until he answers, these two are held.
- eng_for_ben ×1, target2: render "how to say something in English" (no "?"), library first, then link.
- eng_for_pan S0108L03U06 and spa_mx_for_eng S0377L03U10: `phrase.update` to the current seed text (expect = copy text), then link the seed's clips through the render route (library first, so 0 chars).
