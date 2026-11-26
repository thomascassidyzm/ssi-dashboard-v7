# cs #236·AL: paid-cleanup items 9 back-fill / 18 / 16 / 14, night apply (Kai Y 24 Nov)

Changesets computed on QA copy `ssi_copy_20261124t033000z` (snapshots: `tools/paid-cleanup-717/snapshot.cjs`, evidence dir
`~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-236/snap`). Regenerate (copy only): `P717_SNAP=<snap> node tools/build.cjs 18|16|14`.
Do NOT regenerate once a night has run: ledgers are keyed by op index. Run: `night-run.sh` via `systemd/` units from `~/.cs-long/236/popty`.
Held lists: `item<N>/<course>/held.json`. Item 9 back-fill files are `../overnight-785/item7-backfill/`.

Apply ledgers (`*.applied.jsonl`, `*.audio.jsonl`) are copied here from the durable checkout after each night, as the record.
`verify.cjs` reads back through script-view, which serves no seed that has no phrases. An item 16 flip whose later LEGO
had its whole basket moved to the earlier LEGO therefore reads "LEGO not served". That is the plan's rule doing its job,
not drift. On 26 Nov there were 11 such flips (spa_for_eng S0348L01, eng_for_mar S0238L01, deu_for_eng S0602L01,
deu_ch_for_eng S0112L01, fra_for_zho S0259L01, deu_for_jpn S0162L01/S0174L01/S0189L02/S0238L01/S0259L01/S0293L0x). Each
basket route answers count 0, and each flip's ledger line is "applied" under its own expect.
