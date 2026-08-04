# Completed programs — pointers (so nothing gets re-litigated)

These large programs are **done** as of late July. Captured here only so the receiving assistant
doesn't accidentally reopen or redo them. Authoritative detail is in the memory hub +
`docs/course-optimization/` (the docs are now committed via the preserve commit — see
`branches-and-uncommitted.md`). Everything below is **content-accepted**; the only outstanding item
is almost always **TTS = Kai's click**.

## 14-course Indian program — final passes COMPLETE (2026-07-30)

- Approved ledger: 4 new builds + hin/urd/pan/guj/ben all at 668/668. Regen-shadow partitions closed:
  mar 650/18, kan 668/0, tam 667/1, tel 667/1, sin 668/0.
- Voice flip (Kai-approved 07-31): 6 courses moved to xAI where supported — eng_for_hin/ben
  known+pres = eve; zho/kor_for_hin+tam targets = ara/leo. Tamil + other-Indic knowns stay Azure
  (unsupported). Config backup: `temp/voice-config-backup-xai-flip-2026-07-31.json`.
- Stale-audio unlink: eng_for_hin/ben Azure known+pres estates nulled (16,684 links, backup
  `temp/voice-flip-unlink-backup-2026-07-31.json`); course_audio + S3 untouched (restorable).
- Gender preps: all 7 done (14,161 expansions).
- **Pending Kai:** TTS approvals; the repair backlog back-thirds (see deepening doc); round-index
  refreshes (need `.env.psql`); a handful of named native/adjudication items (per-course
  `native-review-list.md`).

## Four-course build (zho/kor × hin/tam) — ALL FOUR COMPLETE (2026-07-29)

zho_for_hin 668/668 · zho_for_tam 668/668 (S135 empty→fixed) · kor_for_hin 668/668 ·
kor_for_tam 668/668. Post-build scans done; component-inversion silent-accept bug documented
(builders must self-verify). Remaining human items: TTS approvals + zho_for_hin S259 canonical
(minor). ⛔ HOLD TTS was the standing rule.

## Variants — master snapshot

Read the `variant-courses-state-2026-07-16` memory first for all 10 variants. Notable open holds:
yue "too mainland" register sweep (awaits Kai + friend, **before** TTS, HK voice); deu_at Graz/Styrian
+ word-order sweeps; por_br tu-paradigm scope (Kai); fra_ca scan+sweeps. Most builds are decompose-DONE
with **⛔ HOLD TTS**. See `docs/course-optimization/` variant docs (now committed) +
`variant-audio-readiness-tracker.md`.

## de-hiss fleet reprocess — DONE (2026-07-29 + 08-03 top-up)

142,973 files reprocessed; see `projects/02-xai-dehiss-pr-17.md`. The only reason it appears in
multiple places is the pre-07-29 hin/ben top-up on 08-03 (old ≠ already-clean).
