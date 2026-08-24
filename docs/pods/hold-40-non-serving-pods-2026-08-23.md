# Holding the 40 non-serving listening pods

**Date:** 2026-08-23, ~17:20Z
**Job:** watson (job a52d2b23), applying Tom's ruling of 2026-08-23 16:32Z
**Census this executes:** worker #110's census of 42 non-serving pods marked live (full record: https://watson-1.tail4968cb.ts.net/d/962ec9ae)

## The ruling

Tom ruled that pods are kept back until they actually exist as finished content, and that release is a deliberate human act, never automatic on completeness. Worker #110's census then found 42 pods that no course serves were nonetheless marked `visibility = 'live'`. Of those 42, two are real served content and were excluded from this job:

- `spa_for_eng:music`
- `spa_for_eng:travel-situations`

The remaining 40 are working copies / archives / gated / unrecorded pods under non-serving slugs. This job holds those 40.

## Selector used

The only slugs any course actually serves are `pod-0` and `pod-1` (`servedPod.ts` in the learning app reads nothing else). The deterministic selector for the target set was:

```sql
visibility = 'live' AND slug NOT IN ('pod-0', 'pod-1', 'music', 'travel-situations')
```

Enumerated with a `SELECT` before any write (`$CS_SCRATCH/before-40-select.txt`) — returned exactly 40 rows, breakdown matching the census exactly:

| slug | pods | sentences |
|---|---|---|
| `pod-0-unrecorded` | 21 | 4,871 |
| `pod-0-retired-2026-08-22` | 16 | 2,272 |
| `pod-0-gated-2026-08-06` | 2 | 0 |
| `pod-1-retired-2026-08-22` | 1 | 180 |
| **total** | **40** | **7,323** |

## The write

Single `UPDATE`, dry-run first inside `BEGIN; ... ROLLBACK;` (row count and sample rows read back), then repeated with `COMMIT`. Both runs reported `UPDATE 40`.

```sql
UPDATE listening_pods
SET visibility = 'held',
    metadata = metadata || jsonb_build_object(
      'held_reason', 'Non-serving pod: no course serves this slug (only pod-0 and pod-1 are served). Held under Tom''s 2026-08-23 16:32Z ruling that pods are kept back until they exist, following worker #110''s census of 42 non-serving pods marked live. Reversible: set visibility back to ''live'' to restore.',
      'held_by', 'watson (job a52d2b23) applying Tom''s ruling of 2026-08-23 16:32Z',
      'held_at', now()::text
    ),
    updated_at = now()
WHERE visibility = 'live'
  AND slug NOT IN ('pod-0', 'pod-1', 'music', 'travel-situations');
```

`metadata` was merged (`||`), never overwritten — every existing key on these rows (sections, scene hashes, consistency ledgers) is preserved.

## Before / after

| | held | live |
|---|---|---|
| Before | 1 (`cym_n_for_eng:pod-0`, held 2026-08-23 16:40:57Z, unrelated reason — mid-recording) | 109 |
| After | 41 | 69 |

## Verification — anon key (`SUPABASE_ANON_KEY`, RLS-gated, not the service key)

- `GET /rest/v1/listening_pods` with the anon key returns **exactly 69 rows** — matches the live count precisely; RLS filters `held` rows out entirely (not merely flagged, genuinely absent from the response).
- `spa_for_eng:music` and `spa_for_eng:travel-situations` — **still served**, `visibility: "live"` in the anon-key response. Confirmed explicitly since these are the rows a mistake would land on.
- `cym_n_for_eng:pod-0` — anon-key query returns `[]` (invisible), still held, untouched by this job's `WHERE` clause (its `held_by`/`held_reason` predate this run and were not overwritten).
- Spot-checked two of the 40 newly-held pods via anon key — both return `[]`:
  - `fra_for_eng:pod-0-retired-2026-08-22`
  - `gle_for_eng:pod-0-unrecorded`
- Sanity check: `fra_for_eng:pod-1` (a real served slug) still returns `visibility: "live"` via anon key.

## Reversal

To restore any of the 40 held pods to live (per-row or in bulk), the reverse is:

```sql
UPDATE listening_pods SET visibility = 'live' WHERE visibility = 'held'
  AND (metadata->>'held_by') LIKE 'watson (job a52d2b23)%';
```

(This will not touch `cym_n_for_eng:pod-0`, which was held by a separate, earlier action with a different reason and is not part of this job's write.)

## Observation, not a blocker

`services/production-api.cjs:4366` carries a comment calling the admin endpoint "THE ONLY WRITE PATH to `listening_pods.visibility`". That endpoint is on branch `feat/pod-visibility-gate-popty-2026-08-23`, not yet merged to `main` as of this job, and requires an authenticated admin browser session per pod. Tom's commission specified direct SQL for this job, which was the only available route at the time; noted here for completeness, not raised as an issue.

## Untouched by design (ban list)

- `cym_n_for_eng:pod-0` — left exactly as it was
- `spa_for_eng:music`, `spa_for_eng:travel-situations` — excluded by the selector
- Every `pod-0`/`pod-1` row of every course — excluded by the selector
- No rows deleted, no `listening_pod_sentences` touched, no pod tools run, no service restarted, no code changed
