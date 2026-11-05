# ops/ara-female-641 — job #641·AD (Kai, 5 Nov 2026)

Speaker-gender text fix + re-record of every pre-July female clip in ara_eg_for_eng / ara_lb_for_eng.

- `RULES.md` — the judging rule given to every judge (binding).
- `work/` — the 12,085-line worklist (regenerate: `build-worklist.py <scratch>` from read-only dumps).
- `out/` (Astra judges, ara_eg 01-03) + `decisions/` (parent's read, the other 11 chunks) — the judgements. Not regenerable.
- `merge.py` → `final-<course>.json` (every judged line), `ops-<course>.json` (applied via Popty edit-batch: eg ev 21620f2d, lb ev d24ba95a), `plan-all.json` (10,996 re-records).
- `render.cjs` — the runner (Popty /api/audio/render, replaceAudioId; reads the live key before ever re-sending after a 503).
- Run logs and done.jsonl: `~/ssi-evidence/ara-female-641/` (not tracked). Record: https://watson-1.tail4968cb.ts.net:10000/d/468045e4
