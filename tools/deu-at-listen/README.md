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

## Start-to-finish vs cut-up — **Kai marks it, nothing is inferred**

Kai asked to review only the takes Sascha read **start to finish** through the
course, not the ones read to be **cut up and reassembled**. Which of the two
produced a given take **is not stored anywhere**:

- `recording_provenance` has no mode column and no session column.
- The JSON context in `quality_notes` carries `mode`, but its values are
  `'script' | 'pod' | 'regeneration'` — the upload seam, not the reading order.
  Every `deu_at` take is `'script'`.
- `AutocueStudio.vue` sends `provenance.mode = 'continuous'`, which names the VAD
  recorder (`useContinuousRecorder`). Both reading orders use it, and it is
  dropped on insert for want of a column.
- The reading order itself — `ModeSelector.vue`'s *"the course itself, straight
  through from the start"* (`?order=course`) versus *"a shorter set of lines, cut
  up afterwards"* (`?order=coverage`) — is never sent with the upload at all.
- Both land in `mastered/` and `raw/`. There is no third store.

So **there is nothing to pre-fill from, and this tool does not guess** (Kai's
ruling, 2026-08-25: *"give me a button in that last page to mark a set of takes
as that"*). His marks are the only record of the flow that exists anywhere, and
the page says so above the control.

### Marking a set

The marks are a **second axis**, independent of the Good/Bad verdict — a take can
be start-to-finish and bad, or cut up and good, and the two controls never touch
each other.

Sets, not singles. Three of them:

| set | where |
|---|---|
| a whole **sitting** | *Mark which sittings…* — one card per session, both marks as thumb-sized buttons with the count written on them |
| one **prompted line** | the button pair at the foot of each line group |
| **everything on screen** | the last card in the sittings view, sized to whatever filters are set |

A sitting is `script_session_id`, which **is** recorded — that is exactly why the
set-marking is built on it rather than on a guess about what the sitting was.
Each card shows its time, take count and seed range, and whether it is marked,
part-marked or untouched. Every action confirms first, and lands an **Undo** bar
carrying the previous value of each take it touched — so undoing a mark that
overwrote another mark restores that other mark, not a blank.

Stored in `marks-<course>.json` beside the verdicts, written atomically, and in
`/api/export` both per-line and as a whole `flow_marks` block.

Endpoints: `POST /api/mark {uuids, flow, label}` and `POST /api/mark/undo {token}`.

## The 31 refused takes

Refused by the upload gate before a single row was written — verified against the
live database: zero `recording_provenance` rows, zero `course_audio` rows. They
exist only as S3 objects, so **nothing anywhere can say which line they were**,
and they get one group of their own that says exactly that. 30 of the 31 are
still `raw/*.webm`; iOS Safari plays no WebM, so a non-mp3 take is transcoded
once with ffmpeg and cached (a container change on bytes we already have — no
speech is generated).

Their list lives in `refused-takes.json` in the data dir; without it the manifest
simply builds without them.

## Applying a verdict to the course

A **Good tap, and only an explicit Good tap**, can become what learners hear.

```
node tools/deu-at-listen/apply.cjs --plan              # what would change; writes nothing
node tools/deu-at-listen/apply.cjs --apply
node tools/deu-at-listen/apply.cjs --rollback <batch>  # reverses the whole batch
```

The page does the same through `GET /api/apply-plan` (shows the change first) and
`POST /api/apply`. Each change is one `swapClipInPlace`
(`services/shared/audio-revision-swap.cjs`): the bytes are proven present in the
bucket first, the rollback row is written first, `audio_revision` bumps so
learners actually get the new audio, the row id never moves, nothing is deleted,
and the row is read back after. The manifest is then rebuilt from the live
database, so the page shows what is really there rather than what this process
believes it wrote.

It refuses out loud rather than guessing: a slow read (never filed as a clip), a
refused take (no line to point it at), a line with no `course_audio` row (nothing
to swap), or two Good takes on one line with neither of them live. Covered by
`apply-plan.test.cjs` — one test per refusal.

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
| `verdicts-deu_at_for_eng.json` | Kai's taps, written atomically |
| `refused-takes.json` | the 31 orphans — optional input |
| `transcoded/` | cached mp3s of the raw/*.webm refused takes |

## What it writes

Read-only on course content **except** through the apply path above, which needs
an explicit Good tap and a confirmation. It never generates audio, ever.

`GET /api/export` still returns, per line, the take Kai called good, the take
that is live, and a `needs_repoint` flag — the same work-list, for anyone who
wants to act outside this tool.
