# The first sector segment is registered — health, general role, on spa_for_eng

**2026-09-01. This one is a WRITE, not a design.** `course_sectors` holds exactly one row and the
cross-course union-ZUT gate, which shipped to main armed and inert, now resolves a family from the
live database.

## What was written

Two additive tables were applied to the live database in one transaction (migration lives in the
learning app: `supabase/migrations/20260901_sector_helix.sql`) — `course_sectors` (schema verbatim
from `tools/union-zut/course_sectors.sql`, which had been deliberately not applied) and
`enrollment_threads`. Both are RLS-on with no policies, anon and authenticated revoked, service_role
granted: every read and write goes through a server endpoint that already holds the service key.
`course_enrollments` held 1612 rows before and 1612 after; no existing learner row changed and no
content table was touched.

Then one registry row, by `tools/register-health-general.cjs` (idempotent upsert, prints before and
after):

```
base_course_code    spa_for_eng
sector_slug         health
sector_course_code  spa_health_for_eng
roles               ["general"]
role_map            {"general": [1 … 57]}
core_anchor_lego_id S0001L01        ("I want" → "quiero")
sector_pod_slug     null
status              draft
```

## The four decisions in the row, one line each

- **`roles` is `["general"]` and nothing else.** Roles are derived, never authored — a role is a
  projection of one authored dialogue graph — and only the general projection has been authored, so
  listing nurse or doctor would advertise a projection of content that does not exist. General is a
  strict 100% subset of nurse, so nothing here is re-authored when nurse follows.
- **`status` is `draft`, deliberately.** The segment has no content: the canonical health seed set is
  the English known side only and no pair overlay has been authored. The learner-facing endpoint
  serves only `status='live'`, so the modal's walk list stays honestly empty — which is the correct
  shipping state. The ZUT gate does not filter on status, because a gate that only wakes at 'live'
  arrives after the damage.
- **`sector_pod_slug` is null.** No health overlay pod exists for spa_for_eng; the live
  `listening_pods` rows for this course are pod-0/pod-1 core plus the music and travel-situations
  choice pods. A slug naming a pod that does not exist would be a lie the lap scheduler would later
  act on.
- **`core_anchor_lego_id` is `S0001L01` — the first lego of the course.** The anchor IS the immediacy:
  it is the core position at which the sector thread may open. See below.

## The anchor, and the two things the census found

The canonical seed set fixes the anchor functionally: scene 0 complete, plus the Appendix A
inventory owned. A read-only census (`docs/sector-pods/health-anchor-spa-for-eng-2026-09-01.md`)
tried to bind that to a lego id in spa_for_eng and found both halves unbindable today:

1. **Scene 0 does not exist.** The medium-contract walks W1201–W1204 are not in `course_legos`,
   `course_practice_phrases` or `course_seeds` under any course code, and their four hallmark
   strings match nothing anywhere in the estate. "Scene-0-complete" currently anchors against
   nothing that exists.
2. **Appendix A coverage never gets steep.** spa_for_eng owns 0/169 of the inventory at seed 1,
   3.0% at seed 13, 16.6% at seed 144, and **26.0% at the end of the 668-seed course** — 125 of the
   169 chunks are never owned anywhere in the course at any seed. There is no knee to wait for.

So waiting buys a handful of strings and costs exactly the immediacy the helix exists for. The
anchor is the earliest lego in the course, and the whole inventory is shortfall the segment authors
itself as `is_new = true` — which is what the canonical set prescribes for anything a pair does not
own by its anchor. The honest consequence, stated rather than buried: **for spa_for_eng today the
second thread is not cheap.** The design's cheapness came from shared chunks entering as
`is_new = false` against a trunk that has not been authored into the content tables yet.

## What the registration woke up

`resolveCourseFamily` read live from the table, no injection:

```
spa_for_eng          -> zutCourseCodes ["spa_for_eng","spa_health_for_eng"]  anchor null
spa_health_for_eng   -> zutCourseCodes ["spa_for_eng","spa_health_for_eng"]  anchor {seed 1, lego 1}
fra_for_eng          -> null  (no family — the path all ~130 other courses still take, unchanged)
```

Before this row, every course in production resolved to `null` and the gate could not see across a
family at all. The adversarial verification of that claim is a separate job and is written up beside
this file.
