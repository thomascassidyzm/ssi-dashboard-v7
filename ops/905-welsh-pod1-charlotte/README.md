# ops/905-welsh-pod1-charlotte — job #905, 2026-11-08

Welsh Pod 1 English (cym_n_for_eng, cym_s_for_eng): every woman's synthetic English whole line, Listen piece and Drill
piece moved to Charlotte (r-2026-11-08: "Charlotte is the female English pod, not Gemma"), reusing the Charlotte clip of
the same words from the other pod-1 English courses (foldTypography match); 5 takes rendered where none existed.

- `renders.json` — the 5 Charlotte takes made (4 rendered, 325 ch; 1 library hit).
- `probe-*` — SC07-S001 (N+S), applied first. `plan.json` + `cym_{n,s}_for_eng-*` — the rest (171 N + 140 S links, 109 Drill).
- `aran-plan.json` + `aran-*` — North SC03-S001 Listen pieces onto Aran's existing takes of the same words.
- `welsh-readback.json` / `probe-welsh-readback.json` — Welsh ids, text and spans before vs after: 0 diff.
- `scripts/` — the one-off scratch scripts used (census, plan, apply via link-clip, Drill recast entries, render via
  /api/audio/render). They talk only to Popty routes and committed tools; kept for the record, not as tools.
- UNDO: POST each `*-undo.json` to /api/production/<course>/link-clip (dry run first, "dryRun": true), main then aran
  then probe. Every link is conditional (expectCurrent). The Drill side: entries with "job":"#905" in
  ops/pod-drill/spans/known-voice.json carry "was" (the #891 Gemma clip) or are new; restore and re-run wire-staging.cjs.
