# Release notes

Repo-side record of what landed on Popty `main`, one file per release: for Tom and the team, not
for learners — it can name real things (tools, courses, gates) that the learner-facing note can't.

**File naming:** `YYYY-MM-DD-slug.md`, dated the day `main`'s tip was cut for release.

**The learner-facing note is separate** and lives in the shared `release_notes` Supabase table
(rendered to learners at `/admin/release-notes` in the learning app), authored via
`services/release-notes.cjs` (`generateDraft()` / `publishNote()`). It is deliberately short and
plain — no jargon, no internal detail — and is Tom's to approve and publish, never automatic.
