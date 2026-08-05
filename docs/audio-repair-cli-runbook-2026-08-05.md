# Audio repair from the command line — runbook (2026-08-05)

One tool: `tools/audio-repair.cjs`. It works for **every** clip kind, presentation
clips included. Nothing here can bill you unless you type `--spend`, and nothing
reaches a learner unless you type `--i-have-listened`.

## The four commands, in the order you need them at 2am

```bash
# 1. What's worth listening to, worst first. Read-only, free.
node tools/audio-repair.cjs queue deu_for_eng --role presentation --limit 20 --json /tmp/q.json

# 2. Look at one clip: live facts, any candidates, revision history. Free.
node tools/audio-repair.cjs preview deu_for_eng --id <audioId>

# 3. Propose replacements. THIS IS A DRY RUN unless you add --spend.
node tools/audio-repair.cjs propose deu_for_eng --targets /tmp/q.json            # free
node tools/audio-repair.cjs propose deu_for_eng --targets /tmp/q.json --spend    # renders TTS

# 4. Listen to both, then accept the ones you believe.
node tools/audio-repair.cjs bytes  deu_for_eng --id <audioId> --out /tmp/live.mp3
node tools/audio-repair.cjs bytes  deu_for_eng --candidate <cid> --out /tmp/cand.mp3
node tools/audio-repair.cjs accept deu_for_eng --from <propose-log> --dry        # free, shows the swap
node tools/audio-repair.cjs accept deu_for_eng --from <propose-log> \
       --i-have-listened --actor tom --reason "clipped final word"

# Not convinced? Nothing was ever at risk.
node tools/audio-repair.cjs reject deu_for_eng --candidate <cid> --actor tom
```

## What actually happens on accept

The row is **not** deleted and **not** re-created. `s3_key`, `duration_ms` and
`audio_revision` are updated in place; `id`, `text`, `role`, `voice_id` and every
foreign key pointing at the row are left alone. The superseded S3 object stays in
the bucket and `course_audio_revisions` records what it was, so a revert is a
data-only operation.

Devices still heal, because the learning app carries the revision in the URL as
`/api/audio/<id>?v=<rev>` — the URL changes, the id does not, and the immutable
cache header that makes the app fast survives intact.

## Why presentation clips are repairable now

`lego_introductions.presentation_audio_id` is `ON DELETE CASCADE`. Every previous
repair tool's first move was a delete, so repairing an intro clip destroyed the
authored "The German for: X, as in — Y, is:" script with it. That is why
`repair-silent-clips.cjs` hard-refused `role='presentation'` for its whole life.

Nothing is deleted here, so no CASCADE can fire. The core measures that rather
than asserting it: a link census is taken before and after every swap and any
movement rolls the row back.

## The safety rails, and what fires them

| Rail | How it fires |
|---|---|
| No accidental spend | `propose` dry-runs unless `--spend`. Legacy `repair-silent-clips.cjs` command lines never infer it. |
| No machine passing audio | `accept` refuses without `--i-have-listened`, and without `--actor` (the history row records who passed it). |
| No overwriting what nobody approved | Every propose records the clip's BEFORE-STATE. `accept` re-reads the clip and **aborts** if `s3_key`, `revision`, `duration_ms`, `text` or `role` moved. |
| No silent truncation of the worklist | Every skipped target is printed with its reason. |
| Audit trail | Distinct `-dryrun-log.json` / `-applied-log.json` per run, per row. |

## `repair-silent-clips.cjs` is retired

It now prints a banner and forwards to `audio-repair.cjs propose`. Its forensic
header (the 2026-08-03 fra_for_eng xAI degradation, 539 silent clips) is kept.
Its `--attempts`, `--concurrency` and `--dry` flags are named as ignored rather
than silently dropped.

`repair-presentation-clips.cjs` was left untouched — another worker had it open.

## What has NOT been proved

The accept swap has **not** been executed end to end against a live presentation
clip. Doing so needs a real candidate in S3, which needs either a TTS render
(money) or a live mutation of a real course row. What stands behind it instead:

- the core's 34 unit tests, whose fixture **is** a `role='presentation'` clip with
  a live `lego_introductions` row — including "does not delete or orphan the
  lego_introductions row" and full before/after census equality;
- live read-only runs of `queue`, `preview` and `propose --dry` over real
  `deu_for_eng` intro clips (each with `intro_links=1`), which show the intended
  swap and touch nothing;
- a live `accept --dry` that correctly **aborted on drift** against a real row.

One approved `--spend` propose on a single intro clip, followed by `accept --dry`
and then `accept`, closes the gap.
