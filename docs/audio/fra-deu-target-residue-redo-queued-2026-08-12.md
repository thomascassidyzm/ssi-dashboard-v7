# fra/deu target-side residue — queued for re-render, 4,067 slots confirmed exactly

**2026-08-12 · QUEUED ONLY · no TTS run, no generation triggered, no clip touched.**

Tom approved re-rendering the target-side held slots that worker #340's targeted evidence check
(`d/6b063bd6`) found genuinely defective. This is the record of what was queued and what was
verified first.

---

## The count held — 4,067, not "~4,067"

The estimate was reconfirmed against live data before anything was written. Worker #340's
`counts.sql` was re-run unmodified today: **every per-slot number came back bit-identical** to both
#340's reconciliation and `non-english-canon-render-scope-2026-08-12.md` §4. Nothing has moved.

Restricting to the target side — `target1` + `target2` on both `course_legos` and
`course_practice_phrases` — gives the approved scope:

| course | lego.target1 | lego.target2 | phrase.target1 | phrase.target2 | **slots** | distinct clips |
|---|---|---|---|---|---|---|
| fra_for_eng | 11 | 6 | 1,274 | 1,173 | **2,464** | 1,691 |
| deu_for_eng | 23 | 23 | 778 | 779 | **1,603** | 1,286 |
| **total** | 34 | 29 | 2,052 | 1,952 | **4,067** | **2,977** |

4,067 exactly. The 4,067 slots resolve to **2,977 distinct clips** — about 27% clip reuse across
slots, consistent with the 28% #340 measured on the full 10,456.

**Slot definition** (taken from #340, not re-derived): a `target1`/`target2` audio slot in
`fra_for_eng` or `deu_for_eng` pointing at a `course_audio` row with
`created_at < '2026-08-05' AND coalesce(audio_revision,1) = 1` — i.e. still on a pre-tail-fix clip
and not covered by the earlier fra/deu redo.

## Three things checked before queueing

**1. Zero Welsh, zero fra_ca, zero deu_at overlap.** Clips can in principle be shared across
courses, so the check was run the strict way: take the 2,977 clip IDs, then ask which course holds
them in *any* of the eight slot types, estate-wide.

| course holding a scoped clip | slots | clips |
|---|---|---|
| fra_for_eng | 2,464 | 1,691 |
| deu_for_eng | 1,603 | 1,286 |

Nothing else appears. No `cym_*` row, no `fra_ca_for_eng`, no `deu_at_for_eng`. And the totals come
to **exactly 4,067** — which also proves no *known* or *presentation* slot in fra/deu holds any of
these clips either, so re-rendering them cannot reach the English side by a shared-clip back door.

**2. These really are target-language clips.** `eve` shows up on 1,140 target-side clips and Eve is
an English voice elsewhere on the estate, which is worth ruling out rather than assuming. Every one
of the 4,067 rows has `course_audio.language` = `fra` or `deu`, and `course_audio.role` matching its
slot. `eve` and `xai_eve` are simply doing French duty here. No English clip is in scope.

Voice spread: `xai_leo` 1,265 · `eve` 1,140 · `leo` 716 · `ara` 707 · `xai_eve` 145 · `xai_ara` 94.

**3. No nulls.** Zero rows with a missing `s3_key`, `text` or `voice_id`; zero dangling pointers.
The manifest is renderable as it stands.

## What was queued

Two `audio_pass_requests` rows, both **touched, not inserted** — each course already had a pending
request carrying two earlier passes.

- `fra_for_eng` — `f0790ee5-d99d-42e0-b44f-c83d8638166f`
- `deu_for_eng` — `e92a5982-4dd7-4417-bafa-a91c8dc5e116`

Worker #339 found the queue cannot scope below `course_code`, and there is a sharper edge on top of
that: `queueAudioPass` is one-pending-row-per-course and a repeat call **overwrites `reason` and
merges `metadata` shallowly**. A naive write would have silently erased the pod-0 and
proven-failed-repair passes and clobbered their `clipIds`. So the write appended (`… || <prior
reason>`), extended the existing `passes` array, and namespaced its own payload under
`metadata.targetResidueRedo`.

Verified by reading both rows back: `passes` is now
`["pod0-english-fresh-build","proven-failed-repair","fra-deu-target-residue-redo"]`, the prior
`clipIds` survive (fra 13, deu 2), `repairFulfiller` / `pod0Fulfiller` / `blockedNotQueued` all
intact, and the reason text still contains both earlier passes verbatim.

**Fulfiller, named explicitly** — since the queue cannot express the scope itself:

> phase8 `POST /generate` for these clips **only**, driven from the exact slot manifest at
> `docs/audio/fra-deu-target-residue-redo-2026-08-12-manifest.json`. Make-before-break: generate the
> new clip, verify it is alive and correct-voiced, atomically repoint the listed slots, and only
> then retire the old clip. Never delete first.

The manifest carries, per clip: `audio_id`, `s3_key`, `voice_id`, `text`, `created_at`,
`duration_ms`, and the full list of `{course_code, slot, row_id}` slots to repoint.

**Exclusions the runner must honour** (recorded in both `reason` and `metadata.excludes`): known and
presentation slots — those are rebuilt under the separately-approved English pass — plus
`fra_ca_for_eng`, `deu_at_for_eng`, and all `cym_*`.

## Why this set

#340 hand-read every whisper flag and found **4.4% genuine defects in this residue against 0% in a
matched repaired control**. The damage concentrates on exactly the slots queued here: `phrase.target1`
and `phrase.target2` run 9–11%, roughly 2.4× the known side, which is the right way round for a bug
in the non-English render path. The failure mode is the tail-repair signature — the final word
clipped — and its worst form is `ne pourront pas` rendered as `ne pourront`, which a learner hears
as the opposite meaning.

## Gaps

- **Expected yield is a minority of the queue.** ~9–11% of these slots carry a confirmed defect, so
  the honest expectation is a few hundred genuinely broken clips inside a 4,067-slot re-render. The
  pass is scoped by *provenance* (pre-fix clip) rather than by *proven breakage*, because the gate's
  precision on this cohort is 28% and per-clip proof would cost more than the render.
- **Mispronunciation is not covered.** #340's instrument is validated on truncation and silence
  only. A clip that says the wrong word confidently passes everything upstream of this queue.
- **Nothing has been rendered.** This is a queue write. No TTS ran, no generation was triggered, no
  existing clip was modified or deleted.
