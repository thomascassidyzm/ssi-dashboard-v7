# ops/891-welsh-pod1-english-voices — job #891, 2026-11-08

Records of the live Welsh Pod 1 English re-voice (both courses). Nothing here regenerates except via
`tools/pods/pod-drill/pieces/recast-welsh-english.cjs` (which reads a census from `welsh-english-voice-census.cjs`).

- `renders.json` — the 43 Gemma (cartesia_62ae83ad) takes, one per words, shared North/South: pod-only rows (pod_fine_known).
- `plan.json` — the 26 lines moved and every link body.
- `probe-cym_{n,s}-*` — the SC07-S001 probe (applied first). `cym_{n,s}_for_eng-*` — the rest.
- UNDO: POST each `*-undo.json` to /api/production/<course>/link-clip (dry run first with "dryRun": true); main undo first, then
  the probe undo. Every link is conditional (expectCurrent = the Gemma clip). The Drill side is undone by deleting entries
  from `ops/pod-drill/spans/known-voice.json` and re-running wire-staging.cjs.
