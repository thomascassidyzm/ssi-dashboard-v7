# Job #609 — cym_s_for_eng pod-1 Welsh salvage — progress (updated 2026-11-03 ~12:55Z)

## Done
1. All 231 Welsh clips scanned (no sampling): energy/silence, voicing, s/syllable, Whisper medium cy on every clip.
2. Calibrated on Kai's 10 flags (4, 32, 34, 62, 75, 95, 110, 112, 181, 196): caught 9, missed 110 (Whisper heard "awgrymell" for "argymell", which can't be told apart from its usual dialect noise).
   Extras: 44 (Dan, ending may be clipped), 191 (Eleri, hwyr->hollol), both low confidence. 180/227 cleared (two different sentences).
3. Alternatives searched (latest-takes ?q= per line, both voices): none. One clip row per text+voice; retakes swap in place.
   GAP: revision history (older takes) only via dashboard-session route /api/audio/repair/.../preview; raw archive unreachable to agents.
4. Trims cut + Whisper-verified: 4 (keep 3.0 s to end), 181 (6.5 s to end), 196 (7.4 s to end); 62 first attempt (0-2.4 s) likely incomplete.
5. Before/after page LIVE (verified 200): https://popty.app/evidence/cym-s-pod1-salvage-2026-11-03/index.html (commit 1e126f122, on main)
   Findings for all 231: https://watson-1.tail4968cb.ts.net:10000/d/6066fa3b

## Waiting: Kai's ok (nothing applied; pod stays held)

## On Kai's ok (next steps)
- Trim: node tools/audio/add-recording.cjs --file <trim wav> --artist human_eleri_cym_s --course cym_s_for_eng --role target1 --text "<exact clip text>" --purpose "..." --replace
  (versioned in-place swap, same clip id; rollback = re-file the original mp3 with --replace)
- Re-record marks (32, 34, 62, 75, 95, 112 + any Kai picks from 110/44/191): POST :3470/api/production/cym_s_for_eng/edit-batch
  op audio.update set rerecord_wanted {reason, marked_at, marked_by, voice_gender} expect {rerecord_wanted:null}; "apply":true. Dry run verified on line 75 (clip 52550a5e).
  Note: under Tom's 11 Sept ruling a mark does not put a line back in the outstanding queue; the reader finds it via "Record it again".

## Working files (outside repo, persistent)
~/ssi-evidence/ssi-dashboard-v7/tools/pods/cym-s-pod1-salvage-609/ : pod.json, cy/*.mp3, wav/*.json (whisper), analysis.json, owners.json, items.json, trims/, build_page.py, NOTES.md

## Applied 2026-11-03 ~13:30Z (job #645, Kai's ruling 12:49Z)
- Trims LIVE (versioned in-place swap, same clip ids, old s3 keys kept): 4 -> mastered/9533D97B…, 181 -> mastered/57E1FB5C…, 196 -> mastered/85871EDE…
  Door used: POST :3470/api/production/cym_s_for_eng/recording/upload {uuid:<clip id>, audioData, metadata.role target1} (booth regeneration mode).
  add-recording refused UNKNOWN_ARTIST: human_eleri_cym_s has no clip_language in voices, so the in-tray cannot see her (GAP).
  Verified: live clips downloaded by id and Whisper cy -> single clean take each.
  Rollback: same upload route with cy/<n>.mp3 from the evidence dir.
- 62 NOT trimmed: trimmed cut = 1.7 s speech, Whisper "Lecnyddau wydra i'r all", no "o gwrw" -> re-record.
- rerecord_wanted marked (edit-batch event 15f50b4b-8725-4871-a7b9-db0dd3482f2c): 32, 34, 62, 75, 95, 110, 112, all Eleri's clips.
  Per Tom 2026-09-02/09-11 a mark is masked on the artist's wire and does not re-open the line; visible on the coverage page only.
- 44, 191 untouched (Kai: fine). Pod visibility still 'held'.
