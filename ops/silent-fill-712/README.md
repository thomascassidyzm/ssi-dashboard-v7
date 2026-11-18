# ops/silent-fill-712 — cs #712·AI, 18 Nov 2026

Fills the eng_for_tel / eng_for_mar known-side prompt slots that #694·AI left refused VOICE_NOT_CAST, naming each course's own existing Azure voice (tel `azure_te-IN-ShrutiNeural`, mar `azure_mr-IN-ManoharNeural`; Kai approved 18 Nov). Uses #694's tools in `../silent-fill-694/`, run unchanged from main; every write goes through Popty's render and link-clip routes.

- `live/slots.json`: written by `../silent-fill-694/plan.py` from fresh dumps (`dump-course.py`; the other 13 courses get empty stub dumps), then marked by `hold.py` with the item 4 (#700·AI) and item 5 (#701·AI) row lists (`held_job`). Regenerable.
- `hold.py`: marks the slots another live cleanup job is changing. Files only.
- Run: `node ../silent-fill-694/fill.cjs probe|run <course> --dir ops/silent-fill-712 --roles known --voice <voiceId> --who cs-712-tel-mar-fill --job '#712·AI' --purpose '…'`.
- `results/*.jsonl`: one record per slot. This is the ONLY record of clip ids and character spend, so it is NOT regenerable.
