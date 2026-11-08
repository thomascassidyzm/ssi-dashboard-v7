# ops/878-pod1-voice-fix — job #878, 2026-11-08

Records of the live Pod 1 English fix on the Welsh courses. Nothing here regenerates.

- `cym_s-female-lines-applied.json` — the link-clip body applied to cym_s_for_eng (65 women's lines moved from
  human_aran_eng onto the female synthetic clip of the same words, xai_bedd6226). Content edit event
  25ea211e-80fc-4816-8c20-026df88fbc12, content version 0.0.68.
- `cym_s-female-lines-undo.json` — the undo: POST it to /api/production/cym_s_for_eng/link-clip (dry run first with
  "dryRun": true). Each link is conditional on the slot still holding the synthetic clip (expectCurrent).
- `cym_n-22-split-lines-before.json` — North's 22 lines whose whole English is his take but whose sentence pieces were
  synthetic, read from GET /api/pod-scripts/cym_n_for_eng before the cut change.
- `readback-after.json` — 15:05Z read-back from GET /api/pod-scripts and GET /api/pods against 14:54-14:59Z snapshots:
  Welsh whole clips, Welsh pieces and Welsh text identical on all 231 lines of both courses; English changes only.
- HOLD (Aran's room, 15:0xZ): South's casting is being checked, so South was taken back out of POD_ENGLISH_REPLACE_PODS
  (60a2e96df). The 65-slot data change stays applied until that is ruled; the undo file above reverses it.
