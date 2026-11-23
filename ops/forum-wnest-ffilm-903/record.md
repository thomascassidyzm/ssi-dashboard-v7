# cs #903 — forum report, cym_s_for_eng "Wnest ti wylio'r ffilm 'na?" male clip (23 Nov 2026)

Learner (forum t/42492/183, relayed by Kai): South Welsh, seed 115, new app, the male voice says
"Wnest ti wylio'r beth o'n i'n trio gwneud?" for "Wnest ti wylio'r ffilm 'na?".

## Live state read through Popty, 17:55Z
- Slot: practice phrase `cym_s_for_eng:S0114L01U16` (basket S0114L01, position 23), text "wnest ti wylio’r ffilm ’na?".
  known d3d000f3-1c7e-4d62-bb80-01129704e7d6, target1 e549b9be-ab30-4d88-8b36-a8e2c3e189b2, **target2 null**,
  last_edit_event_id 217a63d7-fbc6-47cd-8318-e29b718c64d3 at 2026-11-23T17:38:15.878Z.
- Wrong clip: f78e7f05-2094-4e9b-89cb-29be098edebe, voice legacy_import, origin human, role target2,
  created 2026-01-04 (legacy import), s3 mastered/A63AA02A-….mp3, filed as "wnest ti wylio’r ffilm ’na?".
  Its clip_spoken_text (written 17:38:15Z with the unlink — the forum #183 fix, #899·AK) says
  "wnest ti wylio beth o’n i’n trio gwneud?"; basis: envelope matches 4f8a7004 (male take of S0202L01B07, same words) r=0.98.
  link-clip now refuses f78e7f05 for this slot (SPOKEN_WORDS_MISMATCH).
- Already fixed before this job: the male slot was unlinked at 17:38Z. The new app's cycles walk drops any phrase
  without all three clips (`phraseHasFullAudio`, ssi-learning-app api/courses/[code]/cycles.ts), so learners
  now skip this phrase rather than hear the wrong words.

## Mechanism
A January 2026 legacy-import mislabel: a legacy human male take of S0202L01B07's sentence was filed under
S0114L01U16's text. Not the booth auto-advance bug (#865·AK) — that concerns Dan's Oct–Nov booth takes.

## Other slots
- Only S0114L01U16 carries this exact text in cym_s_for_eng (all 668 seeds' baskets read via Popty).
- `tools/audit-linked-clip-text.cjs cym_s_for_eng` (nightly copy 03:30Z) shows no phrase slot linked to a
  clip of different words and no slot on f78e7f05. Seeds 115/116 hold no row with this text or clip.
  The learner's "twice" is most likely the same phrase coming round again in review.

## Not fixed (held) — gap
- No correct South-Welsh male clip of this text exists (by-text target2 in cym_s finds only f78e7f05;
  cym_sv2 has none; cym_n's 6872404f is Northern).
- Re-queue grant does not reach it: live cym_s_for_eng practice phrases are never booth-queued
  (`PHRASE_QUEUE_COURSES` in services/voice-engine/phrase-queue.cjs holds only sandboxes + fry), and the clip is legacy_import, not a booth voice.
- TTS into a human-cast male slot is a casting call for Kai, not made here.
  Kai's choice: (a) leave the phrase dropped, (b) have Dan record it and link via link-clip, or (c) cast a TTS male for this one slot.

## This job's own writes (an error, reverted)
Using single-op `POST /edit` as a read (it APPLIES; only edit-batch dry-runs by default) wrote two junk verdicts at 17:57:39–40Z:
- event 0a31fc83-dfef-4256-a31d-af360854eb50: f78e7f05 spoken_text → "probe"
- event 94f99889-c445-49c4-a130-91c3fc6cdd06: 4f8a7004 spoken_text → "probe" (had none)
Restored at 17:58Z by edit-batch event 9de9c390-7ff5-4195-b9bf-75b62320ffa8 (`restore-batch-9de9c390.json`):
f78e7f05 back to #899's exact text + basis (checked_at now 17:58Z), 4f8a7004 verdict removed. No slot link was touched.
Two other `/edit` probes (phrase.update, audio.update) failed on DRIFT and applied nothing.
