# ops/spa-wide-255 — spa_for_eng wide-net grammar/translation sweep (job #255·AD, 4 Nov 2026)

Detect → second read → hand triage of every PLAYED basket phrase (is_new LEGO, role != component), seed, LEGO and LEGO intro in spa_for_eng.

- `prep.py <seeds.json> <dir> [--seeds a-b] [--inject before.json] [--presentations pres.json]` — units (one per played basket + one per 8 seeds). Input = `GET /api/production/spa_for_eng/seeds`.
- `fetch_presentations.py` — each LEGO's intro line via `GET /api/production/:course/presentation/:legoId` (its mirror check is naive; use `tools/check-intro-mirror.cjs` for that).
- `prompt.txt` / `judge.py` / `run.sh` — first pass (Haiku), over-flagging by design, `claude --print` only.
- `adjudicate-prompt.txt` / `adjudicate.py` / `run-adj.sh` — Sonnet second read of every flag.
- `score.py` — recall against re-injected known past defects (calibration: #98 fixes, seeds 105-152; holdout: #99 close-read fixes, seeds 153-200, `tools/course-optimization/spa-close-read-153-200-2026-10-27.data.cjs`).

Snapshots, units and raw model output: `~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255/` (untracked, regenerable except the model outputs).
