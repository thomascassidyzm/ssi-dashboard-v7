# The canonical pod slug migration — pod-0 became pod-1

**2026-09-01.** The live canonical slate is now `pod_slug = 'pod-1'` in
`canonical_pod_scenarios`. It was `pod-0`. Two sacked pre-metagraph slates that held
the names `pod-1` and `pod-0.5` were archived and deleted to free the name.

This note exists because a rename makes older documents wrong in a way a reader
cannot see. **Every document written before today says `pod-0` IS the live pod.
That was true when it was written. It is not true now.** The nine documents that
carried it as a standing warning now open with a banner pointing here.

## Why the name is right

Numbering was retired as a CONTENT label — a walk is named by what it masks, and
Health is Health, not pod-4. But **numbers name the COMPULSORY DEFAULT CHAIN**
(Tom's ruling, 2026-09-01): pod-1, pod-2, pod-3 is the ladder a learner descends
by *not choosing*. No choice means the next numbered walk, automatically.

So this is not "the first pod" being renamed. It is **the first rung of the
compulsory default chain**, named correctly for the first time. The content did
not change: same 231 rows, same 22 scenes, same English, verified line by line
against the archive after the rename.

## What moved

| | before | after |
|---|---|---|
| `canonical_pod_scenarios` — live slate | `pod-0`, 231 rows, 22 scenes | `pod-1`, 231 rows, 22 scenes |
| `canonical_pod_scenarios` — sacked slate | `pod-1`, 236 rows, 16 scenes | deleted |
| `canonical_pod_scenarios` — sacked slate | `pod-0.5`, 27 rows, 7 scenes | deleted |
| row ids | `pod-0:SC01-S01` | `pod-1:SC01-S01` |

The order was forced: the name being renamed *to* was held by a row being deleted,
so the delete had to commit first. Both steps ran in one transaction with per-step
row-count assertions.

## What did NOT move, deliberately

- **`listening_pods` and every learner-facing table.** That is a *separate*,
  per-course migration, 22 of 68 courses done since 2026-08-22, run one course at
  a time with `tools/pods/pod-switchover.cjs` because learner progress and sentence
  ids embed the slug as a literal string. Nothing here touched a single course.
  Counts before and after this migration are identical: 46 courses on `pod-0`,
  22 on `pod-1`, 269 and 594 `learner_pod_state` rows.
- **`canonical_script_versions`.** Its six rows are still there, still on
  `pod-0.5`. The table is append-only, enforced by a database trigger, and its own
  migration (`database/migrations/20260831_canonical_script_versions.sql`, written
  2026-08-31) says why: *"history must survive a line being re-ingested or removed,
  which is exactly when someone wants to read it."* Deleting them would have meant
  disabling a one-day-old guard built to prevent exactly that deletion. They are in
  the archive too. **This is an open decision for Tom, not a closed one.**
- **The `estate_map` SQL.** It reads `listening_pods` only, so this migration
  cannot make it misreport. It *does* already miscount the 22 flipped courses —
  that belongs to the per-course migration, not this one.
- **`course_audio`.** UUID-keyed, never embeds a slug.

## The archive — how to get it back

```
~/ssi-evidence/ssi-dashboard-v7/archive/canonical-pod-slug-migration-2026-09-01/
```

Four full row dumps as JSON (every column, every row) plus `restore.sql`, a
self-contained file whose literals were quoted by Postgres itself. Every INSERT is
`ON CONFLICT (id) DO NOTHING`, so it is safe to re-run and safe to run when part of
the data is still live.

To put the world back exactly as it was on 2026-09-01:

```sql
DELETE FROM canonical_pod_scenarios WHERE pod_slug = 'pod-1';  -- the renamed live slate
\i restore.sql                                                  -- restores all four sets
```

**This was not assumed to work — it was proven.** Before the first delete,
`scripts/pod-canon/rehearse.cjs` ran the whole migration *and* this restore inside
a single transaction that was rolled back, and hash-compared the reconstruction
against the live state: byte-identical, including `updated_at`. The archive lives
in the evidence store rather than the repo per `docs/EVIDENCE.md` (Tom's ruling,
2026-09-01); it is **not** in git, and that is the one thing to know about it.

## Two bugs the rename exposed

Neither was caused by the rename. Both were found by asking, per site, *which of
the two migrations does this string mean?*

1. **The generator conflated the two slugs.** `pod-dialogue-generator.cjs` used one
   `podSlug` for both the canonical slate it reads and the per-course listening pod
   it writes. A course already flipped to listening slug `pod-1` was therefore
   reading the **sacked** canonical `pod-1` as its source. Now two parameters.
2. **A difficulty tier was read off a name.** `syllableCeiling` was
   `podSlug === 'pod-0' ? 8 : 12`, so the 22 already-flipped courses were getting
   the 12-syllable ceiling for the same beginner content their siblings get at 8.
   Tom ruled: decouple it, do not just rename the string. The tier is now declared
   per slate in `services/shared/pod-tiers.cjs`, with the rung it sits on, and read
   from the canonical slug.

Deleting the sacked slate removed a third hazard by itself: a regenerate on a
flipped course used to silently flex 236 rows of dead content into a live pod.
Now there is nothing there and it fails loudly.
