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
