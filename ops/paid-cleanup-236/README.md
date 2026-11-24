# cs #236·AL: paid-cleanup items 9 back-fill / 18 / 16 / 14, night apply (Kai Y 24 Nov)

Changesets computed on QA copy `ssi_copy_20261124t033000z` (snapshots: `tools/paid-cleanup-717/snapshot.cjs`, evidence dir
`~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-236/snap`). Regenerate (copy only): `P717_SNAP=<snap> node tools/build.cjs 18|16|14`.
Do NOT regenerate once a night has run: ledgers are keyed by op index. Run: `night-run.sh` via `systemd/` units from `~/.cs-long/236/popty`.
Held lists: `item<N>/<course>/held.json`. Item 9 back-fill files are `../overnight-785/item7-backfill/`.
