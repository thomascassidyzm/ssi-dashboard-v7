# deu-at-listen — rule by ear on Sasha's Austrian German clips

Kai played the live `deu_at_for_eng` course on 2026-08-25 and heard a clip whose
**audio says something other than the text it is attached to**. This is the
instrument for finding it, and any others, by ear.

## Why a machine verdict was not enough

Two facts, established against the live database on 2026-08-25, not assumed:

1. **Nothing records acceptance.** The recorder's Approve tick is client-side
   only in script mode — `useAutocueState.finalizeSession` returns early when
   `state.scriptMode` is set, with the comment *"Approval in script mode is the
   recordist's own tick-list, not a gate"* — so `approvedSegments` is never
   POSTed anywhere. No column, table or `quality_notes` key holds it. All of
   Sasha's 225 clips are unaccepted, and no linker anywhere can respect a flag
   that does not exist.
2. **The binding is already newest-take.** All 225 `course_audio` rows for this
   course point at the newest natural take of their line. So no re-pointing rule
   can fix what Kai heard: a text/audio mismatch of that shape happens at
   *capture* (the autocue advance gate filing take N under phrase N+1's text),
   and only an ear sees it.

## Running it

```
node tools/deu-at-listen/manifest.cjs      # rebuild the 225-clip manifest from the DB
node tools/deu-at-listen/server.cjs        # serve it (DEU_AT_LISTEN_PORT, default 4791)
```

Hosted for Kai by the `popty-deu-at-listen` user unit on watson-1, from the
dedicated worktree `/home/tomcassidy/SSi/wt-deu-at-listen` (a dedicated worktree
so the service does not vanish when another agent switches branches in the main
checkout; `.env` and `node_modules` there are symlinks to the main checkout).

## Data

All under `DEU_AT_LISTEN_DATA_DIR`, default `scripts/deu-at-listen/` in the main
checkout — gitignored, and pointed at explicitly by the unit file because a
worktree does not carry it.

| file | who writes it |
|---|---|
| `manifest-deu_at_for_eng.json` | `manifest.cjs` — required |
| `deu_at_asr_scores.json` | optional ASR mismatch ranking; re-read per request, so it can land while the server is up |
| `verdicts-deu_at_for_eng.json` | this tool's only output, written atomically |

## Ordering

Riskiest first, in three tiers, and **no clip is ever hidden** — the tail is the
disconfirming evidence:

0. the ASR ranking says the audio matches some *other* clip's text better than
   its own (only a positive margin counts)
1. the line was recorded more than once (most takes first) — 38 of the 225
2. everything else, in seed order

## Read-only

It never touches `course_*`, never generates or relinks audio. The only thing it
writes is Kai's verdicts. `GET /api/export` hands a later worker the clip id, the
S3 key, the bound text and every take of that line, so "this one is wrong" can be
turned into a re-point or a re-record without re-deriving anything.
