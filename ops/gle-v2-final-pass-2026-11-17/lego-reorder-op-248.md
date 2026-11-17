---
name: lego-reorder-op-248
description: "Popty edit-batch op lego.reorder is LIVE (cs #248·AI, 16 Nov) — use it for gle_v2 / ita 71+311 reorders instead of delete+rebuild"
metadata:
  node_type: memory
  type: project
  originSessionId: 9ad4ff30-cc91-414c-aa71-1fa2e0d21f92
  modified: 2026-11-16T18:39:04.701Z
---

`lego.reorder` is live on Popty :3470 (main cf52f7f5e, 16 Nov 2026), on the edit door `POST /api/production/<course>/edit-batch`. Usage note: https://watson-1.tail4968cb.ts.net:10000/d/a4eff2d4

Body: `{"op":"lego.reorder","seed_number":N,"order":[lego_ids or uuids in the new order],"phrases":{"<id>":"keep|move|delete"}}`. Dry run by default. The dry run lists every phrase in the seed that now uses a piece taught later, with a proposal. An apply is refused (PHRASES_UNDECIDED) until each of those has a decision, and refused (LEARNER_STATE) if any learner rows name the moved LEGOs. The undo_file restores the seed exactly.

Proved on sbx_for_eng seed 5 (apply + undo, exact apart from created_at precision on re-inserted phrases). No real gle_v2 or ita seed has been reordered with it yet.

**Why:** Kai asked for it on 16 Nov ("You seem to be getting stuck on it a lot").
**How to apply:** for ~75 gle_v2 seeds and ita seeds 71 and 311, dry-run each seed, decide the flagged phrases, then apply. ita_for_eng is served, so an apply there needs tom_go/kai_go, and learner rows will block it. See [[gle-v2-whole-plan-107]].
