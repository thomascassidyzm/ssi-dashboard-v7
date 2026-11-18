# Brief digest — cs #695·AI sister-course propagation (every child reads this)

PURPOSE: live paid courses; learners hear these edits next session. Kai approved 18 Nov.
Scan (do NOT re-scan): combined list d/23c5a220; rows in
`git show origin/cs/482-cleanup-scan-combined-fix-list-4:ops/paid-cleanup-scan-447/reports/<slice>.{md,json}`
(slices: spa, por, deu, zho, fra, ara, eng-indic-north). Reading those files is fine; running that
branch's scripts against any database is NOT (they are unmerged = hand-written).

## TTS cap: 15,000 chars TOTAL for the whole job, split in writing
- #695·AI (parent, spa_mx_for_eng): 10,500
- child "rest" (fra_ca, ara_lb, deu, por_br, zho variants, deu_at/ch — in that order): 4,500
- child "indic": 0 (zero-cost fixes only; pan & guj are TEXT ONLY by rule anyway)

Count `charsSpent` from the render route's answers. Stop at your share. What does not fit = an
edit-batch DRY RUN committed with its char cost, NOT applied.

## Hard rules
- Text edits ONLY via Popty: `POST http://localhost:3470/api/production/:course/edit-batch` (dry run
  unless `"apply": true`; returns an undo — save it). Ops vocabulary: `GET .../edit-ops`. Every call
  carries header `x-agent-id: cs-sister-propagation`. Put an `expect` (old known/target text) on every
  op. Keep batches small (about 10 ops) — big batches hit 60 s statement timeouts on 17 Nov.
- Reads ONLY via Popty GET routes: `GET /api/production/:course/seed/S0123/baskets`,
  `GET /api/production/:course/lego/S0123L01/basket` (full rows incl. audio ids),
  `GET /api/production/:course/script-view?seedStart=S0001&seedEnd=S0050` (max 50 seeds; slow — use
  sparingly, the live database serves learners). No hand-written code against the database of any
  kind, read-only included — Tom's HARD RULE. A missing route = report the gap.
- Audio ONE route: `POST http://localhost:3470/api/audio/render` body
  `{courseCode, role: target1|target2|known|presentation, text, purpose, dryRun}` + `x-agent-id`.
  dryRun:true FIRST (library link = free). A refusal (402, NOT_IN_CHAIN, DAILY_TOTAL_CAP, REPEAT,
  VOICE_POLICY, HUMAN_VOICE_COURSE) is the answer: report it, never retry or route around it.
- Make-before-break: render new clips first, then ONE phrase.update op sets the new text AND the new
  audio ids (known_audio_id / target1_audio_id / target2_audio_id) together. Never leave a played row
  silent in a non-held course. Never delete clips. A changed LEGO also changes its presentation
  (intro) in the same pass (canon O13) — price it.
- Held courses eng_for_pan, eng_for_guj: apply TEXT only, render nothing.
- End each course you changed:
  `node tools/course-optimization/queue-audio-pass.cjs <course> --reason "sister-course propagation"`.
- No Whisper/transcripts. No tests/typechecks/builds. No questions to Kai, no holds for natives:
  decide from canon + sources (RAE/ASALE, Priberam/Michaelis, Duden/Variantenwörterbuch, …), cite,
  flag your choice.
- Variants are separate translations: apply the same RULE, not the same row. Read the variant's own
  live text; where the dialect differs, SKIP and say why with a source.
- Methodology rails: ZUT (one known → one target), controlled known side, no word before it is
  taught, every seed part is a LEGO, shortest LEGO cut, learner-POV gate (no clash + precedent +
  learner reaches it → apply). Canon: `course-methodology-canon.md` (sections 0, 6, 7 must-reads).
- Before any expensive action write ONE sentence tying it to purpose and price.
- Files: `ops/sister-propagation/<course>/` (plan, ops, dry, audio, undo, readback, record.md).
  Scratch in `$CS_SCRATCH`. Commit with scoped adds, push your branch, then land on main:
  `git fetch origin main && git merge origin/main && git push origin HEAD:main` (ff only, never force,
  no [hotfix]).
- Report: one paragraph + per-course lines: applied rows / event ids / chars spent / skipped with
  reason / dry runs left with cost.
- Reference for a proven render+apply flow: `ops/spa-442-deborah-small-items/tools/` (audio.py, ops.py).
