# ops/913-welsh-pod1-aran-clone — job #913, 2026-11-08

North Welsh Pod 1 (cym_n_for_eng) English: the 16 Listen pieces (sentence_known_audio_ids) of the seven men's lines
SC02-S002, SC05-S001, SC06-S001 (James), SC06-S003, SC09-S002, SC09-S014, SC11-S003 moved off Tom's old clone
(xAI gfzdpspr5fdp) and Olivia (bedd6226) onto Aran: 2 onto his own cut takes of the same words ("Hello.", "Of course."),
14 onto his PRO Cartesia clone (STANDIN_VOICE, services/shared/aran-clone-standin.cjs). South Pod 1 has no Listen pieces.

- `reuse-plan.json` — every piece, its old clip, and the reuse found (none in the clone; 2 human takes).
- `renders.json` — the 14 clone takes (237 ch), trial + podSide known through /api/audio/render.
- `cym_n_for_eng-applied*.json` — the link-clip body and Popty's answer (eventId); `welsh-readback.json` — 0 diff.
- UNDO: POST `cym_n_for_eng-undo.json` to /api/production/cym_n_for_eng/link-clip (add "dryRun": true first). Every link is
  conditional (expectCurrent). Nothing was deleted; the old clips are still in course_audio.
- These follow STANDIN_VOICE as of 2026-11-08 (PRO V0). If Aran's PRO v2 clone (#660) is adopted, these 14 need
  re-rendering and re-linking; Aran's booth takes replace them in any case (his 2026-10-29 ruling, make-before-break).
