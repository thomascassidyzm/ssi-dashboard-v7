# shared_audio duration backfill — 2026-08-06

Approved by Kai, 2026-08-06. Two jobs: backfill the missing clip durations, and close
the export guard's blind spot on the welcome.

## Job 1 — durations measured and written

| | count |
|---|---|
| rows in `shared_audio` | 12,189 |
| had no `duration_ms` before | 9,922 |
| **measured from S3 and written** | **9,873** |
| **unreachable — left NULL (explicit gap)** | **49** |
| DB write failures | 0 |

Every value was measured with `ffprobe` against the clip's own object in
`s3://ssi-audio-stage`. Nothing was copied from a sibling row, another course, or the
text length. Stored as `Math.round(seconds * 1000)` — the same convention the pipeline's
own `syncDurationsToDb` uses.

Run took 11 minutes at 10x concurrency (23 clips/s). The pre-flight estimate of ~32 min
serial was confirmed as the right order of magnitude; the sample's 60/60 reachability
held up across the full set (99.5%).

### The 49 unreachable clips — a real defect, not a measurement failure

All 49 are Serbian (`srp`): 29 encouragements, 20 instructions. Their S3 objects exist
but are **zero bytes**. They were left NULL rather than given a guessed value.

That means 49 Serbian shared clips are silent for learners today. This is pre-existing
and was not caused by this work — but it is now visible and named. Serbian has 199
`shared_audio` rows in total, so roughly a quarter of them are empty files. Fixing it
needs a TTS re-render, which is out of scope here and needs its own approval.

Full list with ids and S3 keys: `gaps.json`.

### Rollback

`writes.json` lists every id written with the value written. The prior state of all
9,873 was `NULL`, so a wholesale revert is: set `duration_ms = NULL` for those ids.

## The expected failure spike did not happen — and here is why

The brief anticipated that backfilling would pull these 9,922 rows into the scope of the
S3-verify check (`durationTolerance: 0`, `production-api.cjs`), producing a spike of new
failures from previously-copied values. **That spike will not occur.** Tracing the code:

1. `loadWelcomeAndEncouragements` (`generate-legacy-manifest.cjs:253`) does select
   `duration_ms` from `shared_audio` for instructions, encouragements and paywall.
2. But the manifest formatting at line 1573 **drops it** — encouragement entries are
   emitted as `{ text, id }` only. `schemas/course-manifest-schema.json` confirms it:
   the `encouragement` definition has no `duration` property at all.
3. So `buildSampleList` (`s3-deploy-service.cjs:174`) never finds a duration for these
   uuids and falls through to `expectedDuration = 0`.
4. Their uuids *are* collected for verification (`collectManifestUuids:8860`), so at
   tolerance 0 they already mismatch on every export today, before any backfill.
5. `autoFixDurations` then writes the sox-measured value straight into the manifest, and
   `syncDurationsToDb` writes back only to `course_audio` — it explicitly skips shared
   encouragements.

`shared_audio.duration_ms` is therefore never read on the manifest path. The backfill is
inert with respect to the verifier: **0 rows newly failing.** The value of the backfill
is that the table is now truthful for inventory and census work.

The welcome is unaffected for a different reason: it is read from `course_audio`, not
`shared_audio` (`generate-legacy-manifest.cjs:258`).

### GAP — the verifier could not be executed here

This conclusion is from reading the code, not from running the check. The verifier
measures with `sox` (`audio-processor.cjs:207`), and **sox is not installed on watson-1**
and there is no sudo to install it. Nobody should read "0 newly failing" as an observed
run. A caveat that follows from the same gap: sox and ffprobe can disagree by ~30 ms on
MP3 encoder delay/padding, so if the manifest path is ever changed to carry these
durations, they would need re-measuring with sox to survive tolerance 0.

## Job 2 — export guard on the zero-duration welcome

`services/production-api.cjs`, publish route. The zero-duration block walked only
`manifest.slices[0].samples`; the welcome sits at top-level `introduction`, so a
zero-duration welcome shipped unchallenged. One line closes it.

Test: `services/publish-zero-duration-guard.test.cjs`. It extracts the guard block from
`production-api.cjs` **on disk** and evaluates it, rather than reimplementing the logic —
so it is bound to the shipped code, and an edit to the guard is visible to the test.

Proven both ways. With the guard line temporarily removed, exactly the two "FIRES" cases
failed and the five no-false-positive cases still passed; restored, all 7 pass.

- fires on a welcome with `duration: 0`
- fires on a welcome with no `duration` field
- passes a normal course with a real welcome duration
- passes a course with no welcome — `PLACEHOLDER_INTRO`, asserted at duration 45.0
  against the real constant in `generate-legacy-manifest.cjs`, not a copy of it
- still catches zero-duration slice samples (pre-existing behaviour intact)
- does not throw on a manifest with no `introduction` key

Repo suite before: 667 passing, 3 failing (7 files). After: 674 passing, same 3 failing.
No regression; the 3 failures are pre-existing and unrelated (pod audio/origin guard).
