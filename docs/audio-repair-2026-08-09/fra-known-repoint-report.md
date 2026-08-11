# fra_for_eng known side: 1,528 bare-lego rows repointed onto Tom's clone

**2026-08-09. Data migration, no TTS, nothing deleted, nothing overwritten.**

## What was wrong

The 2026-08-07 known-voice recast (Eve → Tom's clone) rendered the clone clips and moved the
LEGO holders, but left practice-phrase rows whose `known_text` duplicates a LEGO's text still
pointing at their 2026-08-03 Eve clip. So the LEGO said "I mean" in Tom's voice and the very next
BUILD phrase with the same known text said it in Eve's — the row Tom hit live,
`fra_for_eng:S0008L02B01`, cycle `S0008L02_build_1`, known clip `e5fbcd70…` (Eve, 2026-08-03).

Reference for the repoint pattern: `tools/relink-superseded-known-audio.cjs` (commit `751c9057`,
the German known-side relink) — same class of defect, same fix shape: the correct clip already
exists, only the pointer is stale.

## Scope and outcome

| | rows |
|---|---|
| stale build/use `known_audio_id` rows in fra_for_eng | **1,594** |
| repointed onto the existing clone-voiced clip | **1,528** |
| blocked — no clone-voiced clip of that text exists in this course | **66** |
| drift (row no longer held the planned id) | 0 |

Voice matching is on the bare id: `eve`/`xai_eve` and `gfzdpspr5fdp`/`xai_gfzdpspr5fdp` are each
one voice spelled two ways. Text matching uses the pipeline's own normalisation (case-folded,
trailing full stop folded), and the winner per `(role, text)` is the newest clone-voiced row.

Only `fra_for_eng` was touched. `ita_for_eng`, `deu_at_for_eng`, `spa_mx_for_eng`,
`por_br_for_eng` and `cym_n_for_eng` genuinely need rendering and were not touched; no audio job
was started.

`courses.audio_stamp` was bumped so installed devices drop cached scripts.

## The 66 that could not be repointed

They are not pointer errors — no clone-voiced clip of that English text exists anywhere in this
course, so there is nothing to point at. They cluster in later material the recast never covered:
`why do you want to…`, `you were tired…`, `nowhere to go`, `took several hours to reach`,
`could you … sir?`. Fixing them means rendering, which is a human-triggered Popty job and out of
scope here. Full list: `fra_for_eng-known-repoint-dryrun-log.json`, rows where `new_id` is null.

## Not in scope, but observed

`component` rows carry the same staleness — 1,780 of them, 706 with a clone twin available. They
are skipped at runtime, so no learner hears them, and they were left alone. `presentation` holders
are also largely still on non-clone clips (1,621 phrase rows, only 45 with a clone twin) — that is
a render gap, not a pointer gap.

## Verification

1. **Residual count**: zero build/use rows in fra_for_eng still point at a non-clone known clip
   where a clone-voiced clip of the same text exists. The only 66 remaining are the blocked set.
2. **The row Tom hit**: `fra_for_eng:S0008L02B01` now holds `2e10f8ec…` (`gfzdpspr5fdp`), matching
   its LEGO `S0008L02`. Every other build/use row under `S0008L02` is on the clone too.
3. **Served bytes, not row state** — 40-row sample including Tom's row, checked end to end:
   the bytes the public proxy returns for the app-issued ref match the intended S3 object by
   sha256, and differ from the Eve take they replaced. **40/40.**
4. **Blast radius**: `course_practice_phrases` rows updated in the last hour = 1,528, all
   `fra_for_eng`. No other course was written.

## Files

- `tools/migrations/2026-08-09-fra-known-repoint.sql` — the migration (before-state assertion per
  row, single transaction)
- `tools/migrations/2026-08-09-fra-known-repoint-verify.sql` — the verification queries
- `fra_for_eng-known-repoint-dryrun-log.json` — the full 1,594-row plan, blocked rows included
- `fra_for_eng-known-repoint-applied-log.json` — 1,528 `row_id → old_id → new_id`; replaying it
  backwards is the rollback
- `fra_for_eng-known-repoint-byte-verification.json` — the 40-row served-bytes check
