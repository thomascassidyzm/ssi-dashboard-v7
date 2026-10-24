Job #366: zho_for_eng seeds 101-668 target1+target2 onto the Cartesia cast via tools/audio/revoice-seeds-to-cast.cjs (AUDIT=1, --from/--seeds).
rollback-<a|b|c>.jsonl: one line per swapped slot, `old` = previous clip id, `new` = new; revert = link-clip `old` over `new` (replace + expectCurrent new). Not regenerable.
run-<a|b|c>.log: unit logs (copied in at checkpoints). Cuts are NOT used: no Popty route ingests a machine-cut clip (add-recording is human-artist only).
