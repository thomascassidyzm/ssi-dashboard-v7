# spa_for_eng S0027 Path B — APPLIED (job #441·AI, 17 Nov 2026)

Kai, 17 Nov 13:09Z, "Y" to `s0027-path-b-draft.json` (v2) as drafted, including the S0026L04 component re-cut. Applied exactly as drafted; no redesign.

**Seed 27 now:** "I don't like taking too long to answer" = *no me gusta tardar demasiado en contestar*.

## Edit events (all through Popty)
| event | what |
|---|---|
| `fbe34cb6-e08e-4992-8df0-e0e239fa58d1` | 42 ops, one transaction, signed with the Kai key (kai_go): seeds 27 + 65, S0027L02/L03 re-cut, S0027L04 (*no me gusta*, new, M no+me gusta) and S0027L05 (*en*, not-new; clips are S0004L01's) inserted, 24 phrase updates, 10 phrase inserts (L04 B01-B03 U01-U05, L03B01, L03U09), S0065L02U09 deleted, S0026L04 components → listo / para / irme. Every changed slot linked to its new clip in the same transaction, so no row ever said new words over old audio. Undo: `s0027-applied-441/apply-answer.json` → `undo_ops` (Popty undo file `2026-11-17T13-41-14-811Z-fbe34cb6-….json`). |
| `98d9d78d-05ce-4341-b490-4494d7366bec` | word tiles recomputed (`/api/admin/recompute-decompositions`, seeds 26-94 + 225): 90 rows rewritten, 0 skipped. *para* in the 51 seeds-28-94 rows now tiles as glue (taught by S0026L04's component). Undo file `2026-11-17T13-42-05-461Z-98d9d78d-….json`. |
| `e8450fe4-6f59-4a1a-a32e-fd82a3a35837` | presentation links for S0027L02/L03/L04 (already set by the render write-back; no-op confirm). |

## Drift since the 12 Nov draft
None in text. S0225L02U10 had `updated_at` 13 Nov but its text was exactly the draft's "now"; every op carried an `expect` on the before-text, so drift would have aborted the batch.

## Audio
- **3,744 characters reported spent** (90 renders, 21 library hits) for the text lines + **238** for the 3 intros = **3,982**. Four render calls timed out client-side at 120 s under box load and were re-asked; one came back as a library hit (the first call had completed), three rendered on the second ask — so up to ~165 further characters may have been spent server-side by the timed-out first calls (not visible to the client).
- Cast: t1 Maite, t2 Thiago, known Tom-006, presentation = course narrator.
- 4 English known lines were refused `EXISTS_IN_LANGUAGE` (recorded only in another course's Azure Sonia voice): "to take too long", "I don't like trying to explain what I mean", "I don't like coming back later on", "I'm trying to answer". Rendered in Tom-006 under a `kai:2026-11-17` approval on Kai's Y (a1158c4a, 6c30afa6, 9e2b58d3, ea2e7df4).
- Intros, course house style "The Spanish for: '…', is:": S0027L02 7aafa320, S0027L03 f783f62b, S0027L04 b313118d. L05 *en* is not-new, no intro.
- Every clip id per line: `s0027-applied-441/renders.tsv`. Old clips are not deleted (make-before-break). No slot left silent, so no audio pass was queued.
- **UNHEARD.** Listening page: https://watson-1.tail4968cb.ts.net:10000/d/e6ef242e

## Read-back
All 34 changed/new phrase rows read back through Popty with the applied text and clip ids; none silent; S0065L02U09 gone.

## Gaps / still open
- `POST /sync-intro-links` (legacy `lego_introductions` table) timed out at 120 s client-side; the player reads the LEGO's own presentation link, which is confirmed. L04 has no legacy row (that route never creates one).
- Basket phrases in S0027L01/L02 still use *no me gusta* (L04) before L04 is taught in the seed order — as before this change and as drafted.
- Calque rows outside seed 27 that Deborah flagged (S0071L03, S0084L01 beyond the two rows moved here) remain open per d/85773ddc.
