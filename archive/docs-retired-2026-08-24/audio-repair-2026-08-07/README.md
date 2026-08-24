Superseded 2026-08-07 by a redo-all ruling on fra_for_eng (wholesale regeneration), received
mid-run via session stand-down instruction. This directory holds no usable queue: the word-loss
scan (`scan.log`) started at 01:02Z, ordered LEGO-first over 51,371 clips, and was killed by box
resource pressure before its first checkpoint (checkpoints save every 100 clips) — zero clips were
scanned, so no `fra-wordloss-full.json` was ever written. See
`docs/audio-repair-2026-08-07/fra-damage-queue-2026-08-07.md` for the full status report.
