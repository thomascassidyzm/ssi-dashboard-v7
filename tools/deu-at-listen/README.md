# deu-at-listen — every take Sascha recorded, judged by ear

Kai played the live `deu_at_for_eng` course on 2026-08-25 and heard a clip whose
**audio says something other than the text it is attached to**. This serves every
one of Sascha's recordings to their phone, against the line the recording tool
asked them to say.

Sascha uses they/them. They record the male voice; that describes the part.

## Why the obvious rule is wrong

"Bind the newest take" is not just unhelpful here, it is **actively harmful**, and
job #601 proved it against the live database: Sascha repeatedly read a line
correctly and then flubbed the retry seconds later — "Ups!", a laugh, the wrong
sentence — and the linker had already taken the later one. Newest is reliably
worse.

Nor is there a way to tell the two apart from data. **There is no acceptance flag
anywhere** — not on `course_audio`, not on `recording_provenance`, not in
`services/recording-upload-helpers.cjs`. The recordist surface only has
`discardLine()`, which discards BEFORE upload, so any take that reached the
database is one nobody ever passed judgement on. In script mode the autocue's
own Approve tick never leaves the browser either
(`useAutocueState.finalizeSession` returns early for `scriptMode`).

So the ear is the only instrument.

## Why it lists TAKES, not clips

The course sees **225 clips** — one `course_audio` row per line, holding whichever
take the upsert last wrote. Sascha recorded **331 takes**. The 106 that are not
the bound one are invisible from the course side, and that is exactly where the
good audio hides. A page built from clips can only ever show you the flub.

Takes of the same prompted line are grouped in time order with the gap between
them shown (`+4s`), because good-read-then-flubbed-retry is an adjacent pair.

## The text is the PROMPTED line

Each take's `quality_notes` carries the line the autocue asked Sascha to read.
That is what the page shows. The course-slot text — `course_audio.text` on the
row the take was filed into — is carried separately as `slot_text`, and a take
whose two texts disagree is flagged in red. *Measured 2026-08-25: zero
disagreements, so mis-filing is not the defect here — flubbed retries are.*

## Running it

```
node tools/deu-at-listen/manifest.cjs [--decodes <dir>]   # rebuild from the DB
node tools/deu-at-listen/server.cjs                       # DEU_AT_LISTEN_PORT, default 4791
```

Hosted by the `popty-deu-at-listen` user unit on watson-1 from the dedicated
worktree `/home/tomcassidy/SSi/wt-deu-at-listen` (dedicated so the service does
not vanish when another agent switches branches; `.env` and `node_modules` there
are symlinks to the main checkout). Same pattern as `popty-seed1-listen` and
`popty-concat-listen`.

`--decodes` points at a directory of `<take-uuid>.txt` whisper transcripts. They
are a triage aid only: whisper renders Austrian dialect into Standard German, so
**judge by ear, not by the text**.

## Data

Under `DEU_AT_LISTEN_DATA_DIR`, default `scripts/deu-at-listen/` in the main
checkout — gitignored, and named explicitly by the unit file because a worktree
does not carry it.

| file | who writes it |
|---|---|
| `manifest-deu_at_for_eng.json` | `manifest.cjs` — required |
| `verdicts-deu_at_for_eng.json` | this tool's only output, written atomically |

## Read-only

It never touches `course_*`, never generates or relinks audio. The only thing it
writes is Kai's verdicts. `GET /api/export` returns, per line, the take Kai
called good, the take that is live, and a `needs_repoint` flag — the work-list a
later re-pointer acts on, with nothing to re-derive.
