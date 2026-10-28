# job #924 progress (Aran ruling 2026-10-28)
- Scan via Popty learning-journey/search + lego basket + seeds reads (scan.py). nv2: 'reit ddistaw' only in S1362L02 (+seed 1362). sv2: no 'reit' anywhere; uses 'braidd yn dawel' (not in ruling, unchanged).
- Dry run ok -> applied nv2 (12 ops: 10 phrases, seed 1362, LEGO S1362L02), live re-read shows 'really quiet' with Welsh unchanged. event a2d99b6a-c61b-40c2-bde9-9fe502daecff. Undo: cym_nv2_for_eng.undo.json (POST to edit-batch).
- Re-record card (GET /api/recording/voice/human_aran_eng/rerecord): seed 1362 shows as text_changed; the other rows had no Aran English take so are plain unrecorded lines.
- Left unchanged: component S1362L02C01 'reit' = 'rather'; sv2 braidd yn dawel 'rather quiet' rows; all 'I'd rather' (well gen i / well 'da fi) rows.
