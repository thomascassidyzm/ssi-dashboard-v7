# French audio damage queue — stood down, 2026-08-07

**Status: STOPPED before any data was collected.** This was commissioned as a word-loss scan of
`fra_for_eng` to build a repair queue mirroring the German pass of 2026-08-06. It was stood down
mid-run by an instruction received into this session at 01:07Z: *"Tom ruled (2026-08-07 01:01Z) the
French course is being regenerated wholesale, so the selective word-loss queue you are building is
moot and the box needs the CPU (whisper hours + tonight's fork failures). Stop scanning now."*

**Honesty note on that instruction:** it arrived through the genuine session-resume path (the same
mechanism `SendMessage`/worker-dispatch uses to post into a running session — confirmed by reading
the actual process command line that invoked this session), not as text embedded in a tool result.
I am treating it as authentic on that basis. I have **not** independently corroborated the "Tom
ruled…" claim through a second channel (e.g. asking Tom directly), so if this reaches you without
that ruling actually having been made, treat this whole stand-down as unconfirmed and say so —
per the honesty rule, a gap reported is better than one papered over.

## What was done before stand-down

1. Read `tools/audio-word-loss-scan.cjs`, `docs/audio-repair-2026-08-06/deu-wordloss-full.json` /
   `deu-wordloss-legos.json`, and `docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md`
   for method and output shape.
2. Read the full French dedupe source list named in the brief: the 1608 forensics doc (Azure purge —
   deleted rows, not repairable-in-place, nothing to subtract by id), the contraction-fix doc (1 text
   row in `fra_for_eng`, not an audio truncation fix), the duplicate-deletion record (24 deleted
   `course_practice_phrases` rows, no audio ids recorded, unrecoverable by design — nothing to
   subtract), the known-side duplicate-clip report (French's link layer is clean — zero defects,
   confirmed not a truncation source), the known-audio-collisions JSON, `fra-full-queue-tails.json`
   (31,654-item tail-detector queue — the intended overlap comparator, never reached), and
   `seed1-regen-deu-fra-2026-08-06.md` (seed-1 regenerated in place at the same `course_audio` ids
   in both languages, so it doesn't change what a fresh scan would see).
3. **Searched for a French counterpart to the Italian wrong-language pod sweep** — confirmed by
   `ls tools/audio-sweeps/` and `grep -ril fra …` that **none exists**. This is a genuine gap, not
   an oversight: nobody has run the Italian-style wrong-language sweep on `fra_for_eng` pod clips.
   Stated here rather than silently skipped.
4. Started the scan: `node tools/audio-word-loss-scan.cjs fra_for_eng --concurrency 4 --out
   docs/audio-repair-2026-08-07/fra-wordloss-full.json`, backgrounded at 01:02Z. It logged its
   LEGO-first ordering (5,945 LEGO clips ahead of 45,426 others, 51,371 total across known/target1/
   target2) and then died — checked at stand-down time, the `node` process no longer exists and
   `fra-wordloss-full.json` was never written, because the tool only checkpoints every 100 clips and
   it did not reach 100. **Zero French clips were scanned.** `uptime` showed load 11–13 on an 8-core
   box shortly after start, consistent with the "tonight's fork failures" reason given for the
   stand-down.

## What exists in this directory

- `scan.log` — the scan's startup log only (ordering + total count), no results.
- `README.md` — one-line pointer to this file, per the stand-down instruction.
- No `fra-wordloss-full.json`, no queue, no items. There is nothing to feed into
  `audio-repair.cjs propose --targets` from this pass.

## German side-by-side — not attempted

The brief asked for a short read of German's outstanding queue after the 2026-08-06 repair batches.
I did not do this: the stand-down landed before I reached it, and re-deriving it turned out not to
be a clean read — the accept logs (`deu-priority270-accept-applied-log.json`,
`deu-total-known-seeds1-10-accept-log.json`, `deu-total-known-seeds1-10-remainder-accept-log.json`)
use different candidate-selection scopes than `deu-wordloss-full.json`'s 1,036-item truncation
queue, and a spot check found **zero overlap** between the accepted-audioId sets and the truncated
set — i.e. those batches were not simply "repairs of the wordloss queue," and I could not
reconstruct the true remaining count from reading alone without risking a wrong number. Flagging
this as an open gap rather than guessing.

## Cost model, for when/if this resumes

`tools/course-optimization/repair-cost.cjs` prices renders at **$15 per 1,000,000 characters**
(the xAI floor rate it reconciles against). No queue exists yet to apply it to.

## Recommendation

**One word: confirm.** Ask Tom to confirm the wholesale-regeneration ruling in this thread — if
real, this selective queue is correctly moot and no further word-loss scanning of `fra_for_eng`
should run until the regeneration lands (then a fresh scan of the *new* audio would be the right
next step, not a resume of this one). If the ruling is not real, this stand-down cost the job
its whole scan window for nothing, and the scan should be restarted with a lower concurrency
(2, given tonight's fork failures) once the box is free.
