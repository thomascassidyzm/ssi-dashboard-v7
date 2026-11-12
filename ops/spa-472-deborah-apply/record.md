# spa_for_eng: Deborah's 12 Nov answers, items 1–5 APPLIED (job #472)

Kai ruled on #413's proposal on 12 Nov. This job applied items 1–5 to the live course through Popty. Item 6 (S0027) is a draft only, in `ops/spa-deborah-12nov/s0027-path-b-draft.md`.

## What is live

All the text went in **one edit-batch, event `75145f11-57bf-485e-8c25-81af5f2b2812`**: 67 ops, which is 62 row edits, 4 deletes and 1 re-anchored decomposition (S0560L01U01). The undo is in `undo-text.json`, and Popty's undo file is `2026-11-12T16-43-59-497Z-75145f11….json`. Each changed slot was voiced first and linked in the same op (make-before-break), so no row was ever silent.

| Seed | Edits | Deletes | What changed |
|---|---|---|---|
| S0414 | 5 | 1 (L02U04) | Seed and L02U01 are now **"could we order a bottle of red wine, please?" / ¿Podríamos pedir…?** "Order" does not clash: it already means *pedir* at S0243L01 ("I want to order / quiero pedir"). L01U06 is "could we book a table / reservar una mesa". L01U01 is "can I ask for some water / puedo pedir agua". L01U03's English is fixed to "could we eat something". |
| S0416 + S0432 | 12 + 1 | – | L02 is now "the project / el proyecto", with its components and C02 updated. The seed, all L02 rows and S0432L02U05 now say *liderar el proyecto*. B03 is "the new project / el nuevo proyecto". U05 is "I told her she should lead the project". |
| S0437 | 19 | 2 (L01U06, L03U04) | L01 *caridad* is now *una causa benéfica* (English stays "charity"), across the seed and 17 phrases. |
| S0604 | 9 | – | This follows **Kai's departure from the proposal**. The seed is "she offered to let us stay at her house / ella se ofreció a acogernos en su casa". L02 is "to let us stay / acogernos". B01 "to let us stay / acogernos", B02 "to let us stay at her house / acogernos en su casa", B03 "to let us stay for a week / acogernos una semana", U01 = seed, U02 "she offered to let us stay / se ofreció a acogernos", U03 "she wanted to let us stay / quería acogernos", U04 "she offered to let us stay for a week / se ofreció a acogernos una semana". "To let us stay" had no other mapping anywhere in the course, so there is no clash. |
| S0567 + S0584 | 14 + 2 | 1 (L01U05) | *encantador* is now *estupendo* in the seed, L01 (and its components), C02 and every phrase. In the two S0584 rows, "it was lovely" became "it's been lovely". |

## Canon check (per row, before applying)

Each row was checked for: taught tokens in course order, LEGO containment, ZUT (known → one target, course-wide, against post-change text), duplicates in its basket, and the phrase floor after deletes. **61 of 62 edits came out clean.** The other one is S0416L02B03 *el nuevo proyecto*, where the word *nuevo* sits inside the LEGO. Canon K49 allows that, so it was applied. *casa* is taught at S0514L02, *semana* at S0038L03, *nuevo* at S0227L02, and *reservar*, *mesa* and *agua* before S0414.

## Held / kept, and why

- **S0567L03U03 KEPT** (with the *estupendo* swap) and not deleted. L03 has exactly 5 USE, so deleting it would take L03 below the 5-USE floor. Kai's condition was "only if L03 stays at or above its minimum".
- **S0567L01U05 DELETED as Kai ruled.** L01 now has **4 BUILD / 4 USE, one under the 5-USE floor**. Kai knew this when he ruled (#413 flagged it). If he wants the floor restored, a new USE phrase is needed.

## Knock-on found, NOT fixed (needs Kai)

Re-cutting S0416L02 removed the only teaching of *camino* before S0559. #413 said *el camino* "is next taught at S0559L02", but it missed four earlier rows that still say *camino*. They now use a word the learner hasn't been taught yet:

- S0515L01U04 "the first day of the journey was good / el primer día del camino fue bueno"
- S0515L01U05 "on the first day of the journey / el primer día del camino"
- S0535L02B03 "she wouldn't choose the way / no elegiría el camino" (its LEGO says "he")
- S0550L01B03 "I'm sure that the end of the village is the way / … es el camino"

Deleting them would leave S0515L01 at 2 BUILD / 2 USE and S0535L02 at 2 BUILD, both under the floor, so I left all four alone. One fix per row is needed, or Kai's word to delete them.

## Audio

All audio went through `POST /api/audio/render`, in the spa_for_eng cast, using Kai's grant token for this job:

- **130 asks** for the changed seed/LEGO/phrase slots: 124 rendered and 6 linked from the library, **4,677 chars**.
- **4 intros**, **195 chars**:
  - S0416L02 is now "The Spanish for: 'the project', as in — 'they want to lead the project next year', is:".
  - S0604L02 is now "The Spanish for: 'to let us stay', is:".
  - S0437L01 and S0567L01 kept their English line. The target edit had unlinked their intros, so they were re-rendered and bound.
- **Total spent: 4,872 chars.** No refusals.
- 30 of the 130 asks plus the intros got **no dry run**. The live dry-run cap (100 an hour, `BULK_DRY_RUN_ON_LIVE`) blocked it, so they went straight to the real route. Their cost was bounded by text length beforehand (≤ 970 + 125 chars), and the route still does its library-first and spend checks on a real call.

## Verification (plan/span facts from Popty's seeds read, after apply)

- Every seed / LEGO / phrase slot (known, target1, target2, plus the LEGO presentation slot) on seeds 414, 416, 432, 437, 567, 584 and 604 is filled: **0 empty**.
- Every LEGO still has phrases.
- **151 of 151 changed slots** point at this job's clips.
- Every phrase contains its LEGO except three that split it. That is allowed by K49: the pre-existing, untouched S0414L02B02/B03 (*una buena botella…*, *una botella grande…*) and S0416L02B03.

## Files

- `decisions.json` holds the rows applied, built from #413's `proposal.json` plus Kai's amendments.
- `audio-plan-dry.json` / `audio-results.json` / `intro-*.json` / `intro-rebind-results.jsonl` are the render asks and answers.
- `text-plan-dry.json` is the 67 ops. `undo-text.json` is the event id and undo ops.
- The tool is `tools/course-optimization/spa-472-deborah-apply-2026-11-12.cjs` (modes `check` / `audio` / `text` / `intro` / `verify`).
