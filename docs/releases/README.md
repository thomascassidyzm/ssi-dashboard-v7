# Release notes

Repo-side record of what landed on Popty `main`, one file per release: for Tom and the team, not
for learners — it can name real things (tools, courses, gates) that the learner-facing note can't.

**File naming:** `YYYY-MM-DD-slug.md`, dated the day `main`'s tip was cut for release.

**The learner-facing note is separate** and lives in the shared `release_notes` Supabase table
(rendered to learners at `/admin/release-notes` in the learning app), authored via
`services/release-notes.cjs` (`generateDraft()` / `publishNote()`). It is deliberately short and
plain — no jargon, no internal detail — and is Tom's to approve and publish, never automatic.

**Learner-facing note format** (Tom's ruling, 2026-08-24, plate A-258, general rule for all future
release notes — "too much information for learners - general rules: 3 biggest headlines (to the
learner's viewpoint) + bug fixes etc."): at most 3 headline bullets, chosen for learner impact not
commit volume, each a single plain warm sentence — then one closing catch-all line, "Plus bug fixes
and improvements." `services/release-notes.cjs` enforces this shape in code (caps the model's
bullets at 3, appends the catch-all line itself) so every generated draft comes out this way by
construction; it is not left to the model's judgement.
