# Job #883 — South Welsh Pod 1 split, phase 1 (measurement only)

- `cym_s_for_eng.whole-turns.json` — input: the 46 South rows whose North twin plays Welsh pieces, built from
  `GET /api/pod-scripts/cym_s_for_eng` on 2026-11-08 (target take ids as live then; English left out on purpose).
- `cym_s_for_eng.silence-lines.json` — `POD_DRILL_OPS=<this dir> node tools/pods/pod-drill/silence-lines.cjs cym_s_for_eng`
  (committed tool, unchanged): per South take, the sentence spans in ms and every gate's numbers. 36 pass, 10 refused.
  Its `verdict`/`reason` reads `known:no_take` for a passing Welsh side, because the English was left out of the input.
- `sample-facts.json` — the 11 lines on the ear page: South take id, spans, and North's approved piece ids.

Regenerates from the live route + the tool; nothing here was written to the database. Takes re-recorded after
2026-11-08 make these spans stale — re-run before phase 2 uses them.
