# spa_for_eng #446 loose ends (#505), 10 Nov 2026

Working record for one content pass. Not documentation of how the system works.

- `decisions.py` — final text of the 19 rows edited: S0277L01U06 (the → a meeting, so it contains its LEGO una reunión, P17) and the whole S0237L01 basket re-made to its LEGO "me to tell you = que te dijera" (was drilling "wanted him to tell").
- `undo-text.json` (event 85ffaef0) and `undo-text-2.json` (event 7d104a07, B01/B03 reshaped because the bare-chunk clips exist only in off-cast Azure voices: render EXISTS_IN_LANGUAGE, link-clip VOICE_MISMATCH).
- `undo-decomposition.json` (event 8a35650d) — stored `decomposition` recomputed with services/phrase-decomposer.cjs decomposeAnchored on the 75 rows listed in `decomposition-ids.json` (57 #446 Spanish edits + 19 here, one overlap). All 75 tile the target exactly and anchor their LEGO.
Revert: post an undo's "ops" to POST /api/production/spa_for_eng/edit-batch with "apply": true (decomposition first, then text-2, then text).
