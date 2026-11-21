# Changesets: compute on the copy, touch live only with the difference

**Tom, 18 Nov:** "There should be no need to write to the live database in a heavy way. We want a single db still but we need a clever way to update it."

## The shape

1. **Compute on the copy.** A content job does all its reading and thinking against the nightly copy (`~/ssi-restore`). Workers' database reads already go there by default. Live is never scanned.
2. **Emit only the difference.** The job writes a changeset: one small file with one line per row that actually changes, and only the columns that change. Each line also records what the copy held in those columns, as its `expect`. If 3 rows of 9,000 differ, the changeset has 3 lines. Helper: Popty `services/shared/changeset.cjs`.
3. **One applier.** `tools/changeset/apply-changeset.cjs` pushes the changeset into Popty's existing edit door (`edit-batch`). That door already gives one transaction per batch, a before-state check, an undo file and an event in the content log.
   - **Small:** 25 rows per batch, each batch its own short transaction.
   - **Governed:** every batch waits on the load governor, so it slows the moment learners need the database.
   - **Quiet hours:** it runs only between 22:00 and 07:00 UK time. Outside that window it says when the next window opens and exits.
   - **Idempotent:** a ledger beside the changeset records each applied batch, so a re-run skips them. If a row on live no longer matches what the copy saw, the applier checks whether live already holds the new value. If it does, the row counts as already applied and is skipped. If it holds something else, someone changed it since the copy: the row is set aside and reported, never overwritten. The rest of the batch still applies.
   - **Undoable:** every batch leaves Popty's undo file. A whole changeset can be rolled back batch by batch.
4. **Heavy direct writes fail pre-flight:**
   - Popty's edit door refuses more than 100 ops in one request (replaying an undo is exempt). The refusal tells the caller to use a changeset.
   - A worker tool declared as a live writer is refused once it has written 200 rows in one run, and a bulk load into live is refused outright. Small hand-scale fixes still work. Anything bigger becomes a changeset.

## Why this, over the alternatives

- **Better:** the heavy part (reading whole courses, comparing, planning) never touches live. Live sees only the rows that differ, in tiny transactions, at night, paced by measured load. Every change is checked against what the job actually saw, logged and undoable.
- **Simpler:** still one database. No new service, no new write path. The applier is a client of the door Popty already has.
- **Cheaper:** a re-run of a job that changes nothing costs live zero writes. Most of tonight's kind of work becomes a handful of rows.
- **Rejected:**
  - A second "staging" database that is promoted wholesale: two databases, which Tom ruled out.
  - Logical replication from the copy to live: it would push every row, not the difference, and the copy is a restore, not a writer.
  - Letting each job batch its own writes: that is what we have now, and it is how it went wrong.

## Not covered yet

- **Popty's other bulk admin routes** (for example recomputing decompositions across a whole course) and **audio renders** are not changesets. They remain governed only.
- **New tables:** the applier speaks the edit door's vocabulary (seeds, LEGOs, phrases, audio links, gender rows). A table outside it needs an op added to the door first.
