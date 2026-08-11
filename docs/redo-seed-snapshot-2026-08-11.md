# Redo seed: snapshot before delete, and let the agent see what it's replacing

**2026-08-11 — branch `fix/redo-seed-snapshot-2026-08-11`.** Reported by Kai; the bug was real, and it was two bugs wearing one coat.

## What was wrong

`POST /api/build/redo/:courseCode` — the text-generation tab's **Redo** button, and the `redo seed N` chat command, both hit this one endpoint (`src/views/production/TextGeneration.vue:1655`, `:1737`) — did this, in this order:

1. delete the seed's `course_practice_phrases` rows
2. delete the seed's `course_legos` rows
3. null `decomposed_at` / `approved_at` / `flagged_at`
4. **then** generate the rebuild agent's brief and spawn it

Nothing captured steps 1–2 first. Consequences:

- **No way back.** A redo that came out worse than the original had destroyed the original. There was no undo, no archive Kai could reach, nothing.
- **The agent was rebuilding blind.** By the time the brief was generated the old decomposition no longer existed anywhere, so the brief could only give the seed sentence, Kai's note, a flat vocab list and some golden-seed examples. A note like *"make this less formal"* had no *this*. That is why Kai had been writing redo notes that re-specify the whole seed from scratch, including everything they wanted kept.

The same destructive-before-snapshot shape was in the range wipe `POST /api/build/rebuild/:courseCode` — fixed alongside.

### Kai's open question: does anything add the old decomposition back at runtime?

**No. Confirmed, not assumed.** Traced the whole path:

- `build.cjs` fetches the brief over HTTP from `/api/brief/:course/redo`, writes the text to `/tmp/redo_<course>_<ts>.md`, and passes it as the single prompt argument to `claude --model opus …`.
- `spawnInTerminal` (`services/course-builder/lib/agent-spawner.cjs`) prepends only a `claude` account export to the shell command. It appends nothing to the prompt.
- The brief's own workflow tells the agent to curl `/api/vocab/:course?seed=N` and `/api/seeds/:course` — vocabulary and the seed sentence. Neither returns a decomposition, and in any case the seed's rows had already been deleted, so nothing could have returned them.

So the static template *was* the whole prompt. The diagnosis stands unchanged.

## What's now in place

### 1. Snapshot before delete

New table `seed_redo_snapshots` (migration: `tools/migrations/2026-08-11-seed-redo-snapshots.sql`) — one row per (redo batch, seed), holding the full `course_legos` and `course_practice_phrases` rows as jsonb plus the seed's known/target text and its decomposed/approved/flagged stamps.

`services/course-builder/lib/redo-snapshot.cjs` writes it **before** any delete, and **throws** if it can't — the endpoint aborts rather than deleting unprotected. Both `/build/redo` and `/build/rebuild` call it. The response and the chat message now carry the `snapshot_batch_id`.

Why a new table rather than reusing something: `content_audit_log` *does* already capture these deletes (there are AFTER DELETE audit triggers on both tables), but it is not a usable undo — nothing groups one redo's rows together, and `tools/archive-audit-log.cjs` prunes it to a ~14-day hot window. `edit-cascade.cjs` keeps an in-memory snapshot, which can't survive a redo that finishes minutes or hours later in a separate agent process.

### 2. A real undo, not an archive

- `POST /api/build/redo-undo/:courseCode` — body `{ seed: N }` (newest snapshot for that seed), or `{ snapshot_id: "uuid" }`, or `{ dry_run: true }` to see what would move without moving it.
  It deletes whatever is there now for that seed and re-inserts the snapshotted rows verbatim — same ids, same audio pointers — then restores the seed's stamps. Order respects the FK (`course_practice_phrases` → `course_legos`): phrases out first, LEGOs back in first.
- `GET /api/build/redo-snapshots/:courseCode` (`?seed=N`, `?limit=N`) — what is undoable.
- In the dashboard: an **Undo redo** button next to Redo/Approve on the seed review panel, and an `undo seed N` chat command alongside `redo seed N`.

Restoring the old rows restores their old audio links too, because deleting a lego/phrase doesn't delete `course_audio` (the FKs are `ON DELETE SET NULL` in the other direction). Nothing is regenerated and no TTS is triggered by an undo.

### 3. The agent sees what it's replacing

`services/briefs/redo.cjs` now reads the just-written snapshot and renders a **"The Decomposition You Are Replacing"** section — same shape as the golden-seed examples already in the brief, so old-vs-desired reads like-for-like — with the instruction to keep what the notes don't ask to change. Step 3 of the workflow points at it. If a seed has no snapshot (redone before this fix), the section is simply absent and the brief is as it was.

**Kai: you can now write redo notes as edits.** "Make this less formal", "keep L1, split L2 differently", "same phrases but drop the vous" all have a referent.

## How it was verified — no real seed data touched

No live redo was run against a real course.

1. **Unit tests** — `services/course-builder/lib/redo-snapshot.test.cjs`, 16 tests against an in-memory fake of the Supabase client: capture-before-delete, abort-on-snapshot-failure (content untouched), round-trip identity, generated-column handling, FK ordering of delete/insert, dry run, newest-of-two snapshots, missing snapshot, wrong-course snapshot, brief rendering. `npx vitest run services/course-builder/lib/redo-snapshot` → 16/16.
2. **Live round trip on a disposable course** — `tools/redo-snapshot-live-harness.cjs` creates course `zzz_redosnap_for_tst`, gives it one seed with 2 LEGOs and 3 phrases, runs the exact sequence the endpoint runs (snapshot → delete → agent writes a different version → undo), calls the **real** `generateRedoBrief` to confirm the new section appears in the actual brief, asserts the LEGO and phrase rows come back byte-identical, then deletes the course and its snapshots. All checks pass; teardown verified (0 rows remaining). Re-runnable at will.

Not covered: an actual Claude rebuild agent consuming the new brief section — that needs a real redo, which is exactly what we don't do to real content. The brief text itself is asserted.

## Deploy state

Code is on `fix/redo-seed-snapshot-2026-08-11`, not merged. **The migration has been applied to the live database** (additive: one new table, no changes to existing tables), so merging is safe in either order — but the running course-builder service still has the old code until this branch is merged and the API restarted. Until then, redo is still destructive in production.
