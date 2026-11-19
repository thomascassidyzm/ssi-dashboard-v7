# cs #976·AI, 19 Nov — follow-up to #964·AI's item 12 held-seed fixes
`plan.py` (from the nightly-copy snapshot, every op with `expect`) → `plan.json`; `render.py` (PHASE=dry, then PHASE=real;
Popty's render route only) → `renders.json`; `batch.py` → `batches/<course>.json`; `send.sh` (MODE=dry|apply, Kai key) →
`applied/<course>.json` (event id + undo file). Not part of the item 9 / item 12 nightly changesets.
- HELD: `batches/eng_for_tam.HELD-text-only.json` (S0103L04 Tamil word order). It dry-runs clean, but tam has no cast voice
  (VOICE_NOT_CAST) and the text edit nulls the LEGO's known + intro and three build knowns. Once tam is cast:
  `PHASE=dry python3 render.py && PHASE=real python3 render.py && python3 batch.py && MODE=apply ./send.sh eng_for_tam`.
- HELD: the deu_for_jpn S0007L04 / S0007L02 intros (`plan.json` `_intros`): the course's Japanese presentation voice
  (azure_ja-JP-ShioriNeural) is refused as uncast. Same re-run once Kai picks it.
