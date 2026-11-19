# cs #976·AI, 19 Nov — follow-up to #964·AI's item 12 held-seed fixes
`plan.py` (from the nightly-copy snapshot, every op with `expect`) → `plan.json`; `render.py` (PHASE=dry, then PHASE=real;
Popty's render route only) → `renders.json`; `batch.py` → `batches/<course>.json`; `send.sh` (MODE=dry|apply, Kai key) →
`applied/<course>.json` (event id + undo file). Not part of the item 9 / item 12 nightly changesets.
- HELD: `batches/eng_for_tam.HELD-text-only.json` (S0103L04 Tamil word order). It dry-runs clean, but tam has no cast voice
  (VOICE_NOT_CAST) and the text edit nulls the LEGO's known + intro and three build knowns. Once tam is cast:
  `PHASE=dry python3 render.py && PHASE=real python3 render.py && python3 batch.py && MODE=apply ./send.sh eng_for_tam`.
- HELD: the deu_for_jpn S0007L04 / S0007L02 intros (`plan.json` `_intros`): the course's Japanese presentation voice
  (azure_ja-JP-ShioriNeural) is refused as uncast. Same re-run once Kai picks it.
- CORRECTION (parent room, Kai's 12:25Z English-only ruling): the first pass's target-side S0450 edits in por_for_eng /
  spa_for_jpn / spa_for_zho are undone (`undo/`, ev ebce154a 2bb1c8b7 7ac2cd58; a faulty send re-applied them as
  e39ef6a4 70965ae4 d766a618, undone at once as 80373b8c e5d861e1 9ae9be4a). They now live in `superseded-v1/`, outside the
  send path. Known-side-only fix: `plan_v2.py` → `batches-v2/`, sent with `BATCHDIR=batches-v2 APPLIEDDIR=applied-v2`
  (ev 2a6dc631 0d178c69 0da9e436). `applied/<course>.json` for those three courses records the superseded pass.
