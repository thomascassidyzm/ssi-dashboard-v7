# The 4,067-slot fra/deu re-render is dequeued — nothing rendered, nothing repointed

**2026-08-12 · Tom's direct overrule: "we are not rebuilding 4000 clips, I promise you that."**
Supersedes the same-night approval that worker #343 queued against. This is the record of the halt.

---

## 1. Nothing was rendered and nothing was repointed

Checked against the full manifest, not a sample — all 2,977 clips and all 4,067 slots.

| check | result |
|---|---|
| manifest clips still present in `course_audio` | **2,977 / 2,977** — none missing, none deleted |
| clips changed (`s3_key`, `audio_revision`, `created_at`) | **0** |
| slots still pointing at their manifest `audio_id` | **4,067 / 4,067** — **0 repoints** |
| new `fra`/`deu` `course_audio` rows since the queue write (01:45:25Z) | **0** |

**No make-before-break violation, and nothing to flag.** Generation never started, so the question of
"new clips before any repoint" never arose — the live estate is bit-identical to what the manifest
recorded. Evidence: `docs/audio/target-residue-nothing-rendered-check-2026-08-12.json`.

## 2. The pass is off the queue — and only that pass

Worker #343 appended rather than inserted, so the removal had to be surgical: both pending rows
carried three passes and two of them stay live.

| row | course | before | after |
|---|---|---|---|
| `f0790ee5…` | fra_for_eng | 3 passes, 2,260-char reason | **2 passes, 990-char reason** |
| `e92a5982…` | deu_for_eng | 3 passes, 2,260-char reason | **2 passes, 990-char reason** |

Removed, per row: the leading residue segment of `reason` (1,266 chars, the segment #343 prepended
with ` || `), the `fra-deu-target-residue-redo` entry in `metadata.passes`, and the whole
`metadata.targetResidueRedo` object.

**Untouched, verified on read-back:**
`metadata.clipIds` (fra 13, deu 2 — the proven-failed-repair clips), `approval`, `pod0Fulfiller`,
`pod0Exclusions`, `repairFulfiller`, `blockedNotQueued`, `rowsTouched`; `status` still `pending`;
and both surviving reason segments verbatim —

> pod-0 English fresh build (Eve + clone xai:gfzdpspr5fdp) … || proven-failed live clips re-render …

`metadata.passes` now reads `["pod0-english-fresh-build","proven-failed-repair"]` on both rows.
**The two other approved passes are fully intact and still queued.** A `metadata.dequeued` entry
records the removal and why.

Method: gated script, DRY_RUN first, per-row before-state assertions (course, status, reason prefix,
passes membership) aborting on any drift, a key-by-key proof that no surviving metadata key changed,
and a post-write read-back that would have thrown on mismatch. Logs:
`target-residue-dequeue-2026-08-12-{dryrun,applied}-log.json`.

## 3. Nothing is armed to restart it

- Worker **#344** (`fra-deu-residue-before-after-listen`) had already **finished** before this halt —
  it never saw a clip, because none rendered. No watcher process is running; its `watch.cjs` /
  `wait-for-render.sh` were left on disk unstarted, and both are read-only probes that could not
  render anything regardless.
- **No cron entry, no systemd timer** for this pass.
- `phase8-audio-v13.cjs` is up but is **request-driven only** — it has no poller over
  `audio_pass_requests` and will not fulfil a pending row by itself.

## 4. Nothing queued in its place

The narrower ~180-clip hand-confirmed-defective scope was **not** queued and will not be without an
explicit go. Tom wants to hear a sample first.

**Gap worth naming:** the defect this pass existed to fix is still live. #340's hand-read found ~4.4%
genuine defects in this residue — a few hundred clips estate-wide, worst case the tail-repair
signature that turns `ne pourront pas` into `ne pourront`, which a learner hears as the opposite
meaning. Dequeuing the 4,067 does not repair those; it declines to re-render 96% of clips that are
fine in order to reach them. The sample-then-decide route is the open thread.
