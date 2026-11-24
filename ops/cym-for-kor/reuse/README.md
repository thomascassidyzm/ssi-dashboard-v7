Regenerate (offline, after one snapshot read of each course via `GET /api/production/<course>/seeds?status=all`): `node match.cjs kor.json nv2.json match.json` → `python3 bands.py match.json nv2.json` (band table) and `python3 fill.py match.json` (minimum new Welsh per option).

Re-cost on Kai's terms (cs #248: every voiced original reused, no per-LEGO cap, top up only to the P30 phraseFloor, options A-D): `python3 recost.py match.json nv2.json > recost.json`.
