# ops/silent-fill-694 — cs #694·AI, 18 Nov 2026

Fill empty audio slots on played rows (paid-courses cleanup item 1, d/23c5a220). Kai approved this on 18 Nov, with holds on eng_for_pan, eng_for_guj and the ara_eg/lb English already recorded in another voice. Every write goes through Popty's HTTP routes; none of this code touches the database.

- `dump-course.py` (copied from #447): a live script-view dump. The dumps are in scratch and are not committed; regenerate them.
- `plan.py <dumps> <reports> live/slots.json`: lists every empty slot and marks the ones held for a pending #447 text fix. Regenerable.
- `fam_rules.py`: the family regexes, copied from #482's fam.py.
- `pool.py <dumps>`: lists the existing English clips for the ara_eg/lb slots → `live/ara-candidates.json`. Regenerable.
- `fill.cjs probe|run <course> [--roles ..]`: render route (library first), then a fill-only link-clip. It is resumable, and a refusal is never retried.
- `relink.cjs <course>`: re-links LEGO-debut slots that failed with NO_SLOT, by legoId.
- `readback.py <newdumps>` → `live/readback.json`: the state of every slot after the fill.
- `results/*.jsonl`: one record per slot. This is the ONLY record of clip ids and character spend, so it is NOT regenerable.
