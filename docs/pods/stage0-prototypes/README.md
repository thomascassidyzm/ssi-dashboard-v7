# Stage-0 prototypes (validation scripts)

Source scripts that produced the ear-validated Stage-0 audio. Originals ran under the
gitignored `scripts/experiments/`; copied here (source only — no audio/model caches) so the
work is on the branch. See `../stage0-explainer-ladder-SPEC.md` for the authoritative design.
All need repo `.env` (Azure + xAI + Supabase + S3 creds) and run with `node` / `bash`.

- **xai-twofile/** — THE validated two-file model on xAI. `xai-call.cjs` (xAI TTS wrapper),
  `slice-atom.sh` (the end-chop-fixed atom slicer: trim lead, keep decay to −55 dB + tail),
  `concat-wav.sh` (drop-guarded concat-demuxer join), `analyze.sh` (seam/energy measurement),
  `build-html.cjs` (the LISTEN page). This is the closest prototype to the production recipe.
- **stage0-tuner/** — the live parameter panel. `render-clips.cjs` (Azure/xAI pieces),
  `build-html.cjs` (self-contained Web-Audio tuner + config export), `NOTES.md` (param
  defaults + config shape).
- **stage0-arc/** — the first full 0:1→0:5 arc demo (Irish). `build-arc.cjs`, `NOTES.md`.
- **chunked-take/** — generation-time chunking exploration (SSML break vs sentence-split vs
  separate-atom). `RESULTS*.md` are the findings; `01-synth-ssml.cjs` / `lib.cjs` the engine.
- **atom-fusion-spike/** — offsets + voice-provenance investigation. `REPORT.md` (Azure
  determinism), `echogarden-results.md` / `mms-results.md` (forced-alignment accuracy vs
  ground truth), `voice-audit.md` (the Tier-3 / xAI blast radius).
