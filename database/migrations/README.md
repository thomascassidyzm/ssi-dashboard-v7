# database/migrations — ARCHIVED (history only)

**This dashboard and the learning app share one Supabase project**
(`swfvymspfxmnfhevgdkg`). The canonical record of that database's current
state is the **`pg_dump` snapshot in the learning-app repo**:

> `ssi-learning-app/supabase/schema.sql` — regenerate with
> `ssi-learning-app/supabase/snapshot-schema.sh` after any applied DB change.

Because both repos write to the *same* schema, there is no point maintaining
two parallel migration histories. The learning-app snapshot already captures
every table, function/RPC, RLS policy, grant, index, and trigger — including
the ones whose migrations used to live here.

The timestamped `.sql` files that used to be in this directory were the
historical *path* to that state. Every one has already been applied to the
live DB, so they are no longer needed to understand or reproduce current
state. They remain in **git history**:

```bash
git log --oneline --diff-filter=D -- database/migrations   # find the removal commit
git show <commit>^:database/migrations/<file>.sql          # read any archived migration
```

## Workflow going forward

1. Apply a change to the live DB (psql / direct connection — same as today).
2. Refresh the snapshot in the learning-app repo:
   `./supabase/snapshot-schema.sh` → commit the updated `schema.sql` there.

**No new files go in this directory.**
