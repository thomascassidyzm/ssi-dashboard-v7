# Rollback — ell_for_eng presentation label strip, 2026-08-11

Two before-images, both complete. Nothing was deleted; no audio was generated.

## 1. `course_audio.text` — 16 rows changed
`before-image.json` → `plan[]`, fields `audio_id`, `before`, `after`.
Rows where the live `text` now equals `after` are the 16 that applied.
Restore: `PATCH course_audio?id=eq.<audio_id>` with `{"text": "<before>"}`.

The other 54 were **refused** by the unique index
`unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)`
— their corrected line already exists as another clip at the same voice. Nothing to roll back.

## 2. `course_legos.presentation_audio_id` — 54 rows relinked
`lego-link-before-image.json` → `snap[]`, fields `lego_id`,
`before_presentation_audio_id`, `after_presentation_audio_id`.
Restore: `PATCH course_legos?course_code=eq.ell_for_eng&lego_id=eq.<lego_id>`
with `{"presentation_audio_id": "<before_presentation_audio_id>"}`.

No `course_audio.lego_id` was touched, so both read paths still resolve exactly the
rows they resolved before, and no clip was orphaned.

## 3. Pending spend
`pending-render.json` — 16 clips, 482 characters, $0.002 at the Azure S0 rate.
Not approved, not generated.
