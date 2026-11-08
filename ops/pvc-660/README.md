# Job #660 — Aran English PRO v2 (real takes, Nov 2026)
- Source: job #653·AE's room-tone sort (ssi-learning-app cs/653-sort-aran-english-audio-real-vs--2, ops/aran-real-vs-clone/sorted.json @4038fc72c). Every instruction/encouragement labelled LIKELY REAL or UNSURE; Tom confirmed both real Aran (r-2026-11-08). No welcomes (Frisian welcome is Charlotte TTS), nothing LIKELY CLONE.
- 98 clips (48 instructions, 50 encouragements), 53.4 min, mastered 96 kbps MP3s from public S3 ssi-audio-stage mastered/<id>.mp3 — no originals found (raw/original prefixes 403). Concatenated unmodified (no trimming) into 7 wav parts. `manifest.json` = per-clip id, label, duration, part, source kind.
- Dataset `dataset_RAVQqnerz3KjwTuFWBpFS2`, fine-tune `fine_tune_1qnAousTGr1d7818sm8muN` (`pvc-create.txt`); slot 3 of 4, nothing displaced. Tool: tools/voice/cartesia-pvc.cjs (from cs/350, unchanged).
- Not wired into any course, pod, cast or voice lab. Audio (clips/, build/) gitignored.
- Completed: voices V0 a45a4855-c275-4fb6-89c5-e5c7de66981a, V1 279d9e29-a473-43c5-911e-3660f4235f3b, V2 90c5373e-e214-4955-a24b-27c59301c379, V3 9bbe2581-b946-4c81-aeb7-eb40886a835f (`status-completed.txt`). Sample used V0 (as the old PRO page used its V0).
- Sample: 6 lines via Popty /api/audio/render trial (441 chars), clip ids in `sample/v2-renders.jsonl`; page https://watson-1.tail4968cb.ts.net/d/3fe98efa
