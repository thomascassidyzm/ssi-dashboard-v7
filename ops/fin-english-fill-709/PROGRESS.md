# fin_for_eng English fill — progress (job #709)
Resume: re-run the same command; every render/link step skips what its .jsonl already holds.
1. [x] tool + plan (probe/ seeds 1-20, full/ seeds 21+: 3054 known slots, 9 held "(formal)"; 2732 texts; 1329 intros, 9 held, 94k chars)
2. [x] probe seeds 1-20 — probe/probe-check.txt
3. [ ] full known: `known render ops/fin-english-fill-709/full` then `known link ops/fin-english-fill-709/full`
4. [ ] full intros: `intro render ops/fin-english-fill-709/full [--seeds a-b]`
5. [ ] after counts: GET /api/production/fin_for_eng/audio-preview/missing-clips (before: ~/ssi-evidence/ssi-dashboard-v7/ops/fin-english-fill-709/missing-clips-before.json — 116 rounds dropped, 5635 slots undeliverable)
