# Force-deploy course audio to live — tech team guide

A small Node script that overwrites **every** audio file for one course in the
**live** S3 bucket (`ssiborg-assets`) with the correctly-encoded copy from the
**stage** bucket (`ssi-audio-stage`). Use it to push the iOS MP3 encoding fix to
production, one course at a time.

**File:** `force-deploy-course-audio-to-live.cjs` (single self-contained script;
run `node force-deploy-course-audio-to-live.cjs --help` for the full inline docs).

---

## Why this script exists

iOS/AVPlayer fails on our old MP3s — distorted standalone clips, and lesson
intro/presentation audio that stops after the first segment. Cause: those files
were written by ffmpeg's MP3 **muxer**, which adds an ID3v2 wrapper + a bogus
LAME-padding field that CoreAudio rejects. (Android is lenient, so it only broke
on iOS.) The fix is a clean `lame` re-encode.

The **stage** bucket has already been fully re-mastered to clean LAME. The
**live** bucket still has the broken files. This script copies the clean stage
files over the broken live ones.

**Why not the normal "deploy audio" step?** The broken and clean files decode to
the *same* audio length, so any step that compares durations treats them as
identical and **skips** the copy. The fix only reaches live if we copy **every**
file unconditionally — which is what this does.

## What it copies

It reads the course's **deployed manifest** from `course-configs` (branch
`author`) — the authoritative list — and enumerates every **played** audio UUID:

- welcome / introduction clip
- every sample variant: `source`, `target1`, `target2`, **`presentation`**

> The `presentation` clips (concatenated intro-screen audio) live **only** in S3,
> not in any DB table, so the manifest is the only complete source. The script
> handles them automatically. Encouragement audio is covered too — each
> encouragement's text appears as a `presentation`-role sample.
>
> It does **not** copy the `id` in `orderedEncouragements` / `pooledEncouragements` /
> `paywallEncouragements` — those are **progress-tracking** ids, not audio (and on
> some courses are stale/broken or missing). They're ignored so the existence and
> encoding checks don't raise false "missing" / "not clean" alarms.

Each file is copied **server-side** (S3→S3, no download):
`s3://ssi-audio-stage/mastered/{UUID}.mp3` → `s3://ssiborg-assets/mastered/{UUID}.mp3`.

## Prerequisites

- Node 18+
- `npm i @aws-sdk/client-s3` (the only required dependency)
- AWS credentials on the standard chain (env vars / `~/.aws/credentials` / role) with:
  - `s3:GetObject` on `ssi-audio-stage`
  - `s3:PutObject` on `ssiborg-assets`
- A checkout of `course-configs` (branch `author`, **pulled to latest**), or a
  direct path to the course `.json`.

## Usage

```bash
# 1) DRY RUN first (default — reads only, copies nothing). Always do this.
node force-deploy-course-audio-to-live.cjs \
  --manifest /path/to/course-configs/Courses/en-fr.json

# 2) Real run — OVERWRITES every file for this course in live.
node force-deploy-course-audio-to-live.cjs \
  --manifest /path/to/course-configs/Courses/en-fr.json --execute

# Multiple courses at once — they run SEQUENTIALLY (never in parallel):
node force-deploy-course-audio-to-live.cjs en-fr en-es en-de --execute

# Optional: verify ALL files (not just a 30-file sample). Works in dry-run too
# (checks every file's encoding in both buckets, still writes nothing):
node force-deploy-course-audio-to-live.cjs en-fr --verify-all
#
# Same flag with --execute also re-checks all freshly-copied live files after copying.
node force-deploy-course-audio-to-live.cjs --manifest .../en-fr.json --execute --verify-all
```

Pass several course ids and they're processed one after another, with a summary
table at the end. A systemic preflight failure (bad credentials) aborts the rest
of the batch; a single course that's missing files in stage is skipped and the
others continue.

Shorthand if you have a `course-configs` checkout:

```bash
node force-deploy-course-audio-to-live.cjs en-fr --configs-dir /path/to/course-configs
```

Bucket names and region can be overridden with `--stage-bucket`, `--prod-bucket`,
`--region`, or the env vars `S3_STAGE_BUCKET` / `S3_PROD_BUCKET` / `AWS_REGION`.
Defaults are `ssi-audio-stage`, `ssiborg-assets`, `eu-west-1`.

## What a run shows you

The dry run prints: total UUIDs (with a role breakdown), how many exist in
stage vs are missing, how many already exist in live (overwrites) vs are new,
and an encoding spot-check of stage vs live (you'll see stage = `ok_lame`,
live = `id3v2_broken` before the fix).

`--execute` then:

1. **Preflight:** copies one file and confirms it landed — aborts the whole run
   if that fails (catches credential/permission problems before touching
   thousands of files).
2. Copies every file stage→live.
3. Re-checks encoding in live afterwards and reports `ok_lame` counts.

## Safety / rules

- **Dry-run by default.** Nothing is written without `--execute`.
- It **refuses to execute** if any manifest UUID is missing from stage (that
  means stage isn't fully mastered for that course — fix stage first).
- It aborts on the first-file preflight if it can't write to live.
- **Run one course at a time.** Do not run two copies in parallel.
- Safe to run **before or after** the manifest deploy for a course — the audio
  is keyed by UUID independently of the manifest. Running it *after* makes you
  the last writer, which is the simplest guarantee.
- If any copies fail, the failed UUIDs are written to
  `force-deploy-failed-<course>.txt`; just re-run to retry them (idempotent).

## Notes from our stage audit (May–June 2026)

- A few courses showed **1 broken file in a 30-file stage sample**
  (`en-pt-br`, `en-fi`, `en-ga`). Stage may not be 100% clean for those — run a
  fuller check (or `--verify-all`) and re-master stragglers before going live.
- `en-ga` had ~88 files in the manifest that don't yet exist in live (they'll be
  created as new — that's fine).
