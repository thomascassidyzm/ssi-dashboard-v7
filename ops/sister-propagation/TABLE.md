# Sister-course propagation, 18 Nov (#695·AI, #697·AI, #698·AI): per-course table

Kai approved this on 18 Nov. Section 7 and section 20 of the cleanup list (d/23c5a220) were carried to the sister courses.
- **TTS cap:** 15,000 characters. **Spent: 12,652** (spa_mx 8,314; the rest 4,338; Indic 0). 2,348 are left unspent.
- **How edits were made:** every row was re-read live before its edit. Every edit went through Popty edit-batch with an old-text `expect`, and set the new clips in the same op (make-before-break). Every applied row read back correct.
- **New clips are UNHEARD:** https://watson-1.tail4968cb.ts.net:10000/d/3e71defa (149 clips: target1 and intros).
- **Files:** `ops/sister-propagation/<course>/`, on Popty main. Each course has its plan, ops, dry runs, undo files, readback and record.

## Applied

| course | applied | events | chars | own choices (source) |
|---|---|---|---|---|
| spa_mx_for_eng | 102 ops: 11 seeds, 4 LEGOs (+ intros), 87 rows. Families B D E F G H J K L M N O Q R S T | f22ec316 491044e5 0066313e b4b1a74d ffc08289 1b2717aa 90c1c3a3 6a8c4f9f 9ce3f0fc b6538d98 d2b6e097 9290de0e bdc38e77 | 8,314 | See below the table. |
| fra_ca_for_eng | 16 rows. "need for help" → "need help" (LEGO, intro and 6 rows). 5 single-subject *se voir* rows → *on veut se voir*. 4 rows deleted (3 duplicates, 1 refused) | 0ca0a023 c94915e4 b87c744d 303cd44e | 366 | The *se voir* LEGO is kept: Usito says reciprocal *se voir* needs a plural subject, and the Quebec *on* form fits that |
| ara_lb_for_eng | LEGO, seed 64 and 14 rows: مبسط → مسلّي (Lebanese "fun"). S0074L03U03 → مبسوط | 4d94e7b8 d9ecbb94 2582c78d 9143c0f1 4bf7c802 | 450 | The intro is unchanged because its English ("fun") did not change |
| deu_for_eng | 55 rows. 36 "want" rows → *möchte* with English "I'd like". All 8 #435 fixes. 6 *fand* → *dachte*. 3 *mögen würden*. 1 *bewege mich* | 11 events, acaa28ae … e3725413 | 3,110 | S0217L03B02 skipped: the render was refused |
| zho_for_jpn | 8 rows: time word before the modal, 想要 + verb, 我想 → 我觉得 | af813977 e67fa924 | 164 | 很快 is kept after the modal (standard Mandarin) |
| zho_for_hin | 8 rows (same rule) | 3215a609 2305d2f0 | 134 | 3 rows refused (EXISTS_IN_LANGUAGE); left as they are |
| zho_for_eng | 7 rows (same rule), pinyin rewritten | 033d5188 ca4cca47 | 114 | 1 row refused; left as it is. S0572L02 not touched (a sibling job owns it) |

**spa_mx_for_eng's own choices:**
- **G "lovely":** *lindo* (DEM/Colmex), the Mexican word, rather than spa's *estupendo*.
- **D:** *pedir* with the English "ask for", which is the course's own gloss for *pedir* (S0212).
- **B:** gerund after *disfrutar*, which the course already teaches at S0051 (RAE DPD and Fundéu prefer it to the infinitive).
- **E:** also clears a ZUT clash on "the way" (S0491).
- **H:** the S0123 rows keep *pienso*, because that is their LEGO.

## Prepared, NOT applied, for Kai, with cost

| course | what | cost | why not applied |
|---|---|---|---|
| spa_mx_for_eng | A: *pienso* → *creo* for "I think" (284 rows, 5 LEGOs) | ≈ 20,200 | cap; last in the order |
| spa_mx_for_eng | C: the seed-27 *tardar demasiado en* re-cut (13 rows) | ≈ 2,000 + intros | a LEGO re-cut is structural on a beta course, so it needs Tom's go |
| spa_mx_for_eng | I: seed 147 *me vio nervioso* (11 rows; LEGO "feeling" re-gloss) | ≈ 1,300 | cap and time |
| spa_mx_for_eng | S0402 *algún sitio* (the Spain word) → *algún lado* | ≈ 1,500 | LEGO + seed + basket |
| spa_mx_for_eng | P: *él sabía que* + present (16 rows) | ≈ 2,300 | NOT a defect in the Spanish: double-access present is grammatical (RAE NGLE §24.4). Only the English is weak |
| por_br_for_eng | 93 rows (87 phrases, 6 LEGOs). *ter a certeza* → *ter certeza*, *se magoou* → *se machucou*, *falando a sério* → *falando sério*, *-aste* → *você*, *pensar em* → *considerar*. 8 batches dry-run clean | ≤ 6,320 | cap |
| zho_for_tam | 32 rows, dry run clean | ≤ 486 | cap (fits in the 2,348 left) |
| deu_at_for_eng | keep *möchten* (Austrian polite form) with English "would you like…"; seed 383 *mechat* → *wollt* | ≈ 370 | plan only |
| deu_ch_for_eng | 14 LEGO re-cuts (pronoun into the verb LEGOs) and their phrases | ≈ 1,500–2,500 (estimate) | plan only; needs new intros |
| eng_for_urd | 21 bare build rows → real phrases (#943-style), dry run 21/21 clean | ≈ 1,190 (all 369 baskets ≈ 21,000) | not a fault learners hear (see below) |

## Hindi family (#697·AI): finding, nothing applied
- **The player never plays a bare build row.** Evidence:
  - `ssi-learning-app/api/courses/[code]/cycles.ts:897-925` and `:969-970`;
  - `packages/player-vue/src/providers/generateLearningScript.ts:1407-1423`;
  - `infplay-cycles.ts:204`.
- Empty build slots are filled from the basket's USE rows. In urd, only S0182L01 and S0315L02 are really thin.
- So the thin baskets are a quality gap, not a fault learners hear.
- **Other eng_for_hin fixes:** none was zero-cost and in scope, so none was applied. Details: https://watson-1.tail4968cb.ts.net:10000/d/5f418a31

## Gaps
- **No audio-pass request was queued for any course.** The DB guard refuses `tools/course-optimization/queue-audio-pass.cjs`, and Popty has no HTTP route that queues one. No changed row is silent.
- **Live render dry runs hit the 100-an-hour cap** (`BULK_DRY_RUN_ON_LIVE`). Real renders went ahead, with their cost capped by text length first.
- **EXISTS_IN_LANGUAGE answers:**
  - spa_mx: 3 answers, linked to the clip the route named.
  - Other courses: 6 answers. Those rows were left unchanged or deleted.
