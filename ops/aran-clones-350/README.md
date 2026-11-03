# Job #350·AC — Aran clones from his recent Popty booth takes (2026-11-02/03)
- Source: `human_aran_eng` booth takes, 26/27/29 Oct 2026, listed through Popty's `GET /api/recording/voice/human_aran_eng/latest-takes?q=` (799 of the 829 the take-days route counts; the route returns 50 per query, so the list was gathered by word search). Mastered mp3, 44.1 kHz mono, peaks about -2.4 dBFS, no clipping.
- `test20.json` = the 20 comparison lines (held out of both clones). `train-ids.txt` = the 773 takes in the Pro dataset (silence-trimmed, 0.4 s gaps, 6 wav files, 42.3 min).
- Instant clone `eec7bdb2-7209-4ee9-b4bb-4d6b0d2ec3a8` from two continuous 29 Oct takes (18 s) — `instant.json`.
- Pro clone: dataset `dataset_SUYvSFTLmdYnkwVCFnVS2N`, fine-tune `fine_tune_Xvrrb5ybpHZBJ8ESVsqpyY` — `pvc-create.txt`; slot 2 of 4 (Scale), nothing displaced.
- Renders: Popty `/api/audio/render` trial mode (linked to no course) — `inst-renders.json`, `pvc-renders.json`.
- Regenerates: nothing. Audio (takes/, build/, clips/) is gitignored and not kept.
- SCOPE CHANGE (Tom, 2026-11-03): no new clones. Page https://watson-1.tail4968cb.ts.net/d/c6334b24 = real booth take vs the EXISTING Pro clone V0 `5b7a17f4` (fine-tune mMW5Qtxf…, archive takes) — `pvc-renders.json`. The instant clone and the new fine-tune above were made before the stop; both are unused and undeleted.
