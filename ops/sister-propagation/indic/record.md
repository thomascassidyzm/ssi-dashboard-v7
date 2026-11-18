# Indic sister propagation (cs #697·AI): eng_for_hin → ben / guj / mar / pan / urd

18 Nov 2026. TTS share was 0. **Nothing was applied, so no audio pass was queued.**

## 1. Does the player ever play a bare build row? NO
A bare row is a build row whose text is the LEGO itself.
- `ssi-learning-app/api/courses/[code]/cycles.ts:897-907` claims the debut key `phraseKey(lego.known_text, target)` and skips any row with the same key. Build rows at `:913-918`; USE rows that fill build slots at `:920-925`. In the reuse pass, `:969-970` also refuses the debut's text.
- `packages/player-vue/src/providers/generateLearningScript.ts:1407-1413` (used by `useFullCourseScript.ts:132`) adds the LEGO to `usedPhrasesThisRound`, and `:1421-1423` skips it.
- `infplay-cycles.ts:204` reads only `use`/`eternal_eligible` rows, so build rows never reach INF PLAY.
- This is guarded by `cycles.bareLegoBuildNeverReplays.test.ts` (Tom's ruling, 9 Aug).

**The scan overstates this gap.** `cycles.ts:908-925` fills empty BUILD slots (up to 7) with the basket's USE rows. A basket with fewer than 3 counted builds still plays a full round whenever it has USE rows. Of urd's 22 worst baskets, 20 have 3–14 USE rows. Only S0182L01 (2 playable rows) and S0315L02 (2 playable rows) are truly thin. So family 20 is a quality gap, not a heard fault.

## 2. eng_for_urd repair: DRY RUN only, not applied
- Tranche: the 22 baskets with 0–1 counted builds. 21 rows are reworded (`urd-plan.json`, `urd-ops.json`). The method is #943·H step 3 (`tools/course-optimization/eng-for-hin-red-seeds-fix-2026-09-23.cjs`): the bare row becomes LEGO + words from the basket's own rows.
- Edit-batch dry run: 3 batches, all `ok`, 21/21 changed, 0 refused (`urd-dry.json`; undo `urd-undo.json`).
- **Price from render dryRun (`urd-price.json`):**
  - 17 rows priced at **888 chars**: known 14 would-render, target 9 would-render, 14 library, 17 EXISTS_IN_LANGUAGE.
  - The last 4 rows (S0616, S0618, S0620, S0636) were refused with 429 `BULK_DRY_RUN_ON_LIVE`. That is an hourly dry-run cap on the agent id. Not retried; estimated by text length at ≤305 chars.
  - **Tranche total ≈ 1,190 chars.** The 17 EXISTS_IN_LANGUAGE target slots already have an English clip in another voice. Linking one is 0 chars but is a voice choice; rendering them anyway adds ≈ 500.
  - Extrapolated to all 369 urd baskets: ≈ 57 chars/row → **≈ 21,000 chars** (estimate only).
- Not in the tranche:
  - S0182L01: the LEGO's known side `آپ نے دیکھی ہیں` is itself wrong for "have you seen?". It has feminine-plural agreement and no کیا. U05 `کیا آپ نے اسے پہلے دیکھی ہیں؟` mixes اسے with دیکھی ہیں. The LEGO needs a re-gloss first (known + intro audio).
  - S0636L01B02 `this Jane's bag` is broken English. Flagged only.
- To apply later, follow make-before-break. Render or link clips first, then put the new audio ids on the same `phrase.update` op.

## 3. Hindi-base fixes for the variants: none were zero-cost and in scope
Each fix is from the priority table of the eng-indic-north slice (d/f68901e9 source).
- **#1 Female known voice reading male first-person text** (guj 472, pan 1,982, urd 1,406 rows; not heard).
  - urd: changing the known text costs known audio, so it was not applied.
  - guj/pan: a text-only flip is allowed. But it means rewriting 472 / 1,982 rows of Gujarati/Punjabi in 10-op batches under the dry-run hourly cap. It is not a 30-minute job, and blind regex on Indic verb morphology would be wrong. **Not done. It needs its own job.**
- **#2 Bare rows:** urd dry run above.
  - ben/mar would cost audio. Not done.
  - guj/pan text-only would mean authoring 1,149 / 543 rows. Not done.
- **#3 Gapped LEGOs** (ben 11, mar 2, urd 2): each needs a known + intro re-render. Not zero-cost. Not done.
- **#4 his/her intro:** needs a presentation clip. On pan, fixing `ਉਸਦੀ ਨਾਂ` → `ਉਸਦਾ ਨਾਂ` without the intro creates a his/her ZUT clash, so it was skipped.
- **#5 Not-new LEGOs:**
  - mar: S0215L01, S0218L01, S0219L03, S0271L01 are taught NEW twice. The fix (L17/P25) is to mark them not-new AND rehome the played rows under a new LEGO. That rehome is `lego.insert`, which is structural and needs `tom_go` on a released course. Flipping `is_new` alone would orphan the basket. Skipped.
  - ben S0177L01: making it NEW needs an intro clip. Skipped.
- **#6 ben S0490L01** `trust anyone ever`: the fix changes target text, which costs audio. Not done.
- **#7 mar tag-glue / "in English":** a replacement costs audio. A delete costs 0 but shrinks baskets, and the "in English" family is marked Kai's call in the scan. Not done.
