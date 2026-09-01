# The 423 unattributed eng_for_hin seed edits — what is known, and what is inferred

*2026-09-01. Written alongside the editor-identity change (Tom's ruling, same
day). Read the marking on every claim below: this document exists because the
attribution does **not** exist in the database, and nothing here has been or will
be written into a row.*

## The gap, stated plainly

Kai's team reported that Shuchita proofread 423 `eng_for_hin` seeds. The system
holds **no record that it was her**. Not in the save path, not in an audit log.
This was not an oversight in one place — it was structural, and it was worse than
it looked:

- `course_seeds` had no editor column of any kind.
- A `content_audit_log` table *does* exist, fed by an `audit_content_change()`
  trigger on the content tables, and it has a `changed_by_uid` column meant for
  exactly this. On 2026-09-01 it held **4,013,923 rows, of which 0 carry a uid.**
  The column is fed by `auth.uid()`, and every writer of course content connects
  as `service_role`, where `auth.uid()` is null. The hook has never captured an
  identity and, as built, never could.

So the record of who made an edit was not merely missing for these 423 seeds. It
was missing for every content edit in the estate's history.

## What the database can honestly say

`course_seeds.updated_at` is maintained on UPDATE. Filtering `eng_for_hin` seeds
whose `updated_at` is more than a minute after their `created_at` gives:

| Day (UTC) | Seeds touched |
|---|---|
| 2026-07-31 | 245 |
| 2026-08-21 | 2 |
| 2026-08-24 | 11 |
| 2026-08-25 | 27 |
| 2026-08-27 | 22 |
| 2026-08-29 | 83 |
| 2026-08-30 | 167 |
| 2026-08-31 | 106 |
| 2026-09-01 | 5 |

The 2026-08-21 → 2026-09-01 window sums to **423** — the count Kai's team
reported. The 2026-07-31 block of 245 sits before that window and is a separate,
earlier event.

## The inference, marked as an inference

> **INFERRED, NOT CAPTURED.** The 423 `eng_for_hin` seed rows whose `updated_at`
> falls between 2026-08-21 and 2026-09-01 are **bounded by edit date to the
> proofreading pass Kai's team reported**. They are **not individually
> attributed**. Nothing establishes that any specific row was edited by any
> specific person, and the row-count agreement with Kai's report is
> corroboration, not proof — an unrelated write in the same window would be
> indistinguishable.

That paragraph is the whole of what can be said. It is deliberately kept in a
document rather than a column, because a column reads as captured fact to
everyone downstream who did not read this file.

## What was explicitly not done

- **No retro-stamping.** `last_edit_event_id` on these 423 rows is NULL and stays
  NULL. Tom's ruling, point 3: never write an inferred attribution as though the
  system had captured it at the time.
- **No backfill of any other pre-existing row**, in any course.
- The follow-up constraint that makes attribution mandatory
  (`20260901c_content_edit_identity_ENFORCE.sql.UNAPPLIED`) is written as `NOT
  VALID` for precisely this reason: it binds every future write and never
  demands a value for a past one.

`last_edit_event_id IS NULL` has exactly one meaning, everywhere, for ever: **no
attribution was captured for this row.** It is never a claim about who edited it.

## From 2026-09-01 onward

Every surface that writes course content resolves an editor identity before it
touches the database, and refuses the request if it cannot. See
`docs/editor-identity/editor-identity-on-save-2026-09-01.md`.
