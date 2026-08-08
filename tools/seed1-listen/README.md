# seed1-listen — rule by ear on a course's seed-1 audio

A phone-friendly listening harness. It exists because the truncation we are
chasing **silences** the end of a clip rather than shortening it: the file stays
full length, so duration censuses report zero damage while the app plainly
plays cut audio. The ear is the only instrument that sees it.

**Read-only on course data.** No TTS, no regeneration, no relinking, no writes
to any `course_*` table. The only file it writes is the reviewer's marks.

## Run

```
node tools/seed1-listen/server.cjs [courseCode]      # default fra_for_eng
```

| env | default | meaning |
|---|---|---|
| `LISTEN_PORT` / `PORT` | `4749` | listen port |
| `SEED1_DATA_DIR` | `<repo>/scripts/fra-seed1-listen` | where the data files live |

S3 credentials (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`S3_BUCKET`) come from the repo `.env`.

## Files in `SEED1_DATA_DIR`

| file | role |
|---|---|
| `manifest-<course>.json` | the live clips — **required**; built by `scripts/fra-seed1-listen/manifest.cjs` |
| `suspicion-<course>.json` | optional ranking, `[{id, rank, score, trailingSilenceMs, stepDb, note}]` |
| `marks-<course>.json` | this tool's only output, written atomically |

The ranking is re-read **on every `/api/clips` call**, so one can be dropped in
while the server is up. Every clip is listed whether ranked or not — ranked
first, then manifest order — and rank is shown faintly with no red and no
"suspect" label, so the reviewer can disconfirm the ranking rather than agree
with it.

## API

- `GET /` — the page
- `GET /api/clips` — `{course, ranked, clips[], marks}`
- `POST /api/mark` `{id, status: "good"|"cut"|null}` — `null` clears
- `GET /api/audio/:id` — streams the clip from S3, `audio/mpeg`, honours `Range`
  (206). Only manifest ids resolve; an arbitrary S3 key 404s. Public S3 URLs are
  not used — they 403 on the `repair-candidates/` prefix.

## Hosting (watson-1, for Kai)

`systemd --user` unit `popty-seed1-listen.service`, port 4749, already fronted
by tailscale serve at `https://watson-1.tail4968cb.ts.net:8446`. It runs from a
**dedicated worktree** so a branch switch in the main checkout cannot yank the
service out from under itself. Two symlinks are load-bearing there: `.env` and
`node_modules` both point at the main checkout — a *sibling* worktree gets no
node module resolution for free (the proofread worktree does only because it
sits nested inside the checkout).

```ini
[Service]
WorkingDirectory=/home/tomcassidy/SSi/wt-seed1-listen
Environment=LISTEN_PORT=4749
Environment=SEED1_DATA_DIR=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/fra-seed1-listen
ExecStart=/usr/bin/node tools/seed1-listen/server.cjs fra_for_eng
Restart=always
OOMScoreAdjust=500
StandardOutput=append:/home/tomcassidy/.local/log/popty-seed1-listen.log
```
