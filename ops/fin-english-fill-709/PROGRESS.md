# fin_for_eng English fill — progress (job #709)
Resume: re-run the same command; every render/link step skips what its .jsonl already holds.
1. [x] tool + plan (probe/ seeds 1-20, full/ seeds 21+: 3054 known slots, 9 held "(formal)"; 2732 texts; 1329 intros, 9 held, 94k chars)
2. [x] probe seeds 1-20 — probe/probe-check.txt
3. [~] full known (29 Oct 21:47Z: 1,023 library texts → 1,300 slots linked, all Tom-006; ~1,709 texts / 44.8k chars wait for the 1M daily cap, hit at 21:35Z by the estate; re-record grant #111 covers the 1 Sonia-held text): `known render ops/fin-english-fill-709/full` then `known link ops/fin-english-fill-709/full`
4. [~] full intros (520 rendered + bound before the cap, all Tom-006; ~809 left): `intro render ops/fin-english-fill-709/full [--seeds a-b]`
5. [ ] after counts: GET /api/production/fin_for_eng/audio-preview/missing-clips (before: ~/ssi-evidence/ssi-dashboard-v7/ops/fin-english-fill-709/missing-clips-before.json — 116 rounds dropped, 5635 slots undeliverable)

Day 2: unit cs-long-keep-fin709-day2 runs resume-after-cap.sh at 00:10Z UTC, then wakes the job; after it: `known link ops/fin-english-fill-709/full`, then step 5.
