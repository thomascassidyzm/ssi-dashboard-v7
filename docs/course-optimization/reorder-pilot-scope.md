# zho_for_eng seed-aligned reorder — pilot scope (2026-06-11)

Pilot target confirmed by Tom. Constraint honored throughout: **nothing the Dublin demo touches changes before June 24** — everything builds in a parallel lane; promotion is a single explicit step afterward.

## Phase 0+1 — DONE

**The order:** ALIGNED-1103 generated over the current full inventory (1,103 new-LEGO rounds, seeds 1–668) — partial-credit greedy, seed-completion drumbeat (slack 2) in canonical order. Mean displacement from canon: **12.1 positions**. Opening: 我 你 不 她 我想 说 很 这个 那 中文 — the same cliff-front-loading the harness scored at 1.44–1.57× early. Persisted: `scripts/aligned-1103-order.json`.

**Serving path finding:** round order is currently *derived* in manifest-generator (and the cycles RPC) from `(seed_number, lego_index)` — the `course_round_index` table exists but is a stale May experiment artifact with no consumers. The pilot therefore includes one small serving change: honor `course_round_index` as an order override **with fallback to the current derivation** — promotion then equals "populate the override for this course."

## The complete content bill (computed, not estimated)

All 10,340 BUILD+USE phrases checked (5,305 via stored decomposition provenance, 5,035 via DP tiling against new prefix vocabulary):

| class | count | fix | cost |
|---|---|---|---|
| Soft violations | 51 | re-run decomposition decorator (text unchanged) | mechanical, free |
| Near violations (≤5 rounds) | 58 | local order swaps in post-processing | free |
| **Hard violations** | **159 phrases across ~44 baskets** | regenerate through the established flow (frame-diversity objective + tiling/ZUT gates + adversarial verify) | ~3–4 resolver-pass sessions + re-voicing on approval |
| Untileable at any position | 0 | — | vocabulary integrity holds |

The hard violations are exactly the price of the prize: they concentrate in the debut baskets of the early-moved structural LEGOs (不→R3, 很→R7, 能→R8…), whose canon-authored phrases assume vocabulary that arrives later. The v2 builds never faced this — they authored content for their order. We rebuild ~44 baskets *for* the new order, which doubles as a frame-diversity upgrade pass on exactly the highest-traffic baskets in the course (they're all early).

## Remaining phases

- **Phase 2 — order repair + soft fixes:** apply the 58 local swaps to the order; re-decorate the 51. Re-verify bill converges to the ~44-basket hard core.
- **Phase 3 — basket rebuilds:** the 44 baskets through the gated resolver flow, batched, adversarially verified (ZUT-over-naturalness doctrine loaded). Output is draft rows + plan JSONs with rollback snapshots, as in passes #1–2.
- **Phase 4 — serving override:** `course_round_index` honored with fallback in manifest-generator + cycles RPC; populate the index for zho in draft; build the parallel manifest; run manifest-validator + diff.
- **Phase 5 — verify & promote:** play-test the reordered course end-to-end on dev; re-voice rebuilt phrases (TTS approval gate); **promote after June 24** on Tom's word. Rollback = clear the override.

## Open items for Tom

1. Re-voicing spend for ~159 rebuilt phrases + any relink shortfalls (gate at Phase 5, not before).
2. Whether the 44 rebuilt baskets should also get the 39-slot frame-coverage objective formally (recommended — they're the most-practiced baskets in the course).
3. Post-pilot: the missing-atoms list (吗/的/有/个/别/可以/着) feeds the decomposition workstream for the mid-course gains — separate decision, separate pass.

## UPDATE — order repair findings + batch 1 (2026-06-11, session 2)

**Three repair strategies tested, decisive results:**
1. Feasibility floors (push movers later until their baskets survive): violations ROSE 217→475 — floors cascade downstream breaks.
2. Dependency-respecting greedy (LEGO moves only when ≥4 of its basket travels with it): violations 494 AND corpus yield collapses to 0.98–1.03× of canon — **zero-rebuild reorder ≈ zero gain.** The harness's 1.44× is inseparable from content authored FOR the new positions.
3. Local owner-relocation repair: oscillates, bill grows to 416. Abandoned.

**ORDER-FINAL = plain v1** (scripts/aligned-1103-order-FINAL.json) — the harness-validated shape. Bill: 218 phrases across ~100 baskets.

**The rehoming discovery (changes the economics):** displaced phrases are not waste — each rehomes at promotion to the round where it becomes producible (reassigned as USE of that round's LEGO). Text AND audio preserved; zero TTS for the 218. New authoring shrinks to: thin debut baskets for the front-loaded movers (canon's own R1–R10 precedent: 我想 debuted with 1 BUILD / 0 USE) + downstream frame enrichment, which is the already-running frame-diversity workstream. **The reorder and the basket-enrichment program are one program** — the reorder's learner-experienced gain materialises through enriched downstream baskets exercising the front-loaded structure.

**Batch 1 authored** (scripts/reorder-batch1-plan.json, pending verifier + parking): thin debuts for 我@R1, 你@R2, 不@R3, and 这个@R9 — the last with a frame-diverse full basket (want/negation/intensifier/3rd-person) from birth.

**Policy note for Tom:** graduated phrase minimums should key on ROUND position, not seed number, under reordering.

**Next session:** checker order-mode (vocab from order prefix) + verifier pass on batch 1 → park rows (draft + release_batch=reorder-pilot, cannot serve — manifest filters status=released) → rehoming map generator → batches 2+.
