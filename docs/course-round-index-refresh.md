# course_round_index refresh — when and how

`course_round_index` is a materialized view over `course_legos` that
`round-map.ts` (learning app) reads directly. **Nothing auto-refreshes it** —
no trigger, no RPC hook into the normal build API. If `course_legos` rows are
changed outside that API (manual merges, deletes, id renumbering done via
direct SQL), the view can end up pointing at `lego_id`s that no longer exist.
Symptom: affected seeds hang in play (one seed plays, then INF PLAY) because
the app can't resolve the next round.

## When you need this

Any time you do **manual `course_legos` surgery** — merges, deletes, id
changes — outside `POST /api/seed/complete`.

## How to fix it

```bash
node tools/refresh-round-index.cjs          # verify, refresh if needed, re-verify
node tools/refresh-round-index.cjs --check  # verify only, no refresh
```

It's read-safe and idempotent: `REFRESH MATERIALIZED VIEW CONCURRENTLY`
against the view's existing unique indexes (`idx_course_round_index_pk`,
`idx_course_round_index_lego`) — no read lock, no table data touched. Safe to
run any time, including when nothing is actually dangling.

Found 2026-07-14: 182 dangling rows across `bre_for_eng`, `deu_for_eng`,
`gla_for_eng`, `ita_for_eng`, `kor_for_eng`, `por_for_eng`, `spa_for_eng` —
cleared to 0 by one refresh.

## A less manual way (proposed, not applied)

`docs/proposals/refresh-course-round-index-rpc.sql` sketches a
`SECURITY DEFINER` RPC (`refresh_course_round_index()`) so this could be
triggered via Supabase RPC (e.g. from the dashboard UI) without shell/DB
access, restricted to the service role. Written but **not applied** — needs a
decision on whether/how it should be exposed before it goes live.
