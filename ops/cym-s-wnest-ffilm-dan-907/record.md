# cs #907 — cym_s_for_eng S0114L01U16 "wnest ti wylio’r ffilm ’na?" onto Dan's booth (23 Nov 2026)

Kai, 18:02Z: "Dan records it." (after forum t/42492/183 and cs #903·AK)

## Read (all through Popty routes; the row reads were edit-batch DRY RUNS whose drift report shows the live values, applied:false, no edit event)
- cym_s_for_eng:S0114L01U16 (use phrase, LEGO S0114L01): known d3d000f3 (legacy_import, known),
  **target1 e549b9be** (legacy_import, female), **target2 NULL** (the male slot; the mislabelled male f78e7f05 sat here until #899·AK).
  The brief's "male (target1)" assumption was wrong: in this legacy row the male slot is target2.
- cym_sv2_for_eng:S0114L01U16 is a verbatim copy of the same text with the SAME clips (target1 e549b9be, target2 NULL).
  sv2 casts target1 = Dan, target2 = Eleri, so its empty slot is Eleri's and its target1 holds a non-Dan clip (not work).
- Dan's live booth (GET /api/recording/voice/human_dan_cym_s?includeRecorded=1, 18:05Z): practice phrases come ONLY from
  cym_sv2_for_eng (197 served in batch 1 of pass 1; 43 pass-1 batches). No batch of either pass held these words.
  So Kai and #903·AK were both partly right: Dan records sandbox practice phrases; live cym_s phrases never reach a booth.

## Route chosen: (b) a named grant in code
`services/voice-engine/booth-wanted-phrases.cjs` lists ONE slot: cym_s_for_eng:S0114L01U16 target2 → human_dan_cym_s, words "wnest ti wylio’r ffilm ’na?".
- Served (recordist-queue buildQueue → wantedPhraseLinesFor): only while the row says those words and target2 is EMPTY (or holds Dan's own clip = recorded).
  Line id `phrase:cym_s_for_eng:S0114L01U16:target2`, kind `wantedphrase`; Dan's actor queue gets a step `wanted` right after Pod 1.
- Take (recordist-router resolvePhraseLine): the grant passes the sandbox-only and cast checks for exactly that row/side/words. Eleri and every other line are unchanged (verified: Eleri's clip route for this line still 403 phrase_course_not_queued).
- Landed: d59174634 on Popty main; auto-deploy restarted popty-production-api at 18:16:52Z on d5917463.

## Proof on the live booth (18:23Z)
- Full list: `phrase:cym_s_for_eng:S0114L01U16:target2`, text "wnest ti wylio’r ffilm ’na?", known "did you watch that film?", recorded:false.
- Step link `?step=wanted`: 1 line, 1 remaining.
- Dan's clip route for the line: 404 no_take (the grant resolves; nothing recorded yet).

## What happens when Dan saves (UNPROVEN until his first take)
POST /api/recording/voice/human_dan_cym_s/take, lineId above → recordPhraseTake → resolvePhraseLine (grant) →
handleRecordingUpload script mode files a course_audio row (course cym_s_for_eng, role target2, voice human_dan_cym_s: cym_s voice_config
has no human target2, so the booth's voiceId stands) → linkPhraseTake: line is not in the phrase plan, so copies = [this phrase] →
`UPDATE course_practice_phrases SET target2_audio_id = <take> WHERE id = 'cym_s_for_eng:S0114L01U16' AND target2_audio_id IS NULL`.
Fill-only; nothing deleted; known d3d000f3 and target1 e549b9be untouched. fillSameWordsSlots then runs (fill-empty only; no other empty
slot of Dan's carries these words). The line then reads recorded and drops off his step.

## Writes
None to course content. No edit event, so no undo ops. To withdraw: delete the entry in booth-wanted-phrases.cjs (and the `wanted` step).
A take already linked would stay in the slot unless unlinked via edit-batch audio.link null.

## Gaps
- The booth's home card for this line is titled "Everything else" (the front end has no name for the new kind; naming it needs a popty.app release, not done).
- Nothing tells Dan the line is there; Kai to tell him.
