# Italian Pod 1 — the two-voice re-render, done make-before-break

*2026-08-24. The proof-of-concept Tom asked for: ita_for_eng was picked because it had the
richest original voice cast before being collapsed to two, so if it comes out clean the
approach is proven for the other 21 mostly-limited-voice courses.*

**Landed: 22 clips rendered, 22 verified, 22 links swapped, 0 deleted. Italian only.**

Listen: **`docs/pods/ita-pod1-two-voice-rerender-listen-2026-08-24.md`** (old voice against
new, eleven pairs) and **https://popty.app/pods/scripts/ita_for_eng** (the whole pod, every
line, with a play button).

---

## 1. The state, verified before anything was touched

`ita_for_eng:pod-1` is **live**, 231 rows, and its `speakers` map is the two-voice mapping
from job 37dcd610 — confirmed against the live DB, not against the commit:

| | learner voice (A) | second voice (B) |
|---|---|---|
| target | `ara` — Ara, female | `x7avnu1k` — Enzo, male |
| known | `bedd6226` — Olivia | `gfzdpspr5fdp` — Tom |

`Staff` and `Interlocutor` are present and both sit on B, on both tracks. Diffed against
`ita_for_eng:pod-1-retired-2026-08-24`, those **two entries are the only difference** — no
other role moved. So the re-render scope this recast created is exactly the rows those two
roles speak.

## 2. The real scope — measured, not assumed

**11 turns × 2 tracks = 22 whole-turn clips.** Measured twice by two independent code paths
(an ad-hoc probe and the committed tool) which agreed exactly.

| | rows | distinct clips | old voice → new voice |
|---|---|---|---|
| target | 11 | 11 | `ara` → `x7avnu1k` |
| known | 11 | 11 | `bedd6226` → `gfzdpspr5fdp` |

Scene 16 line 9; scene 17 lines 2, 4, 5, 9; scene 21 lines 5, 6, 8, 11, 12, 13.

**Sharing, checked before rendering.** Every `%audio_id%` column in the schema was probed
against the 22 ids. They are referenced by `listening_pod_sentences` (this pod and the
retired pod-1) and `course_qa_clip_status`, and by **nothing else** — no seed, lego, phrase or
other course. The fleet-wide figure in `pod1-two-voice-cast-2026-08-24.md` (110 known clips
shared with 407 rows across 59 pods) is an aggregate over 22 courses; Italian's own eleven
English clips turn out to be ita-only. That was verified, not assumed, because it is the
number that decides whether in-place mutation would have dragged other courses along. It
would not have — but nothing was mutated in place anyway.

**No free twins existed.** Every one of the 22 texts was searched in `course_audio` on the
estate's own identity key (`text_normalized`, via `audioKeyCandidates`) for a clip already on
the destination voice. Zero hits: all 22 genuinely needed TTS.

### What is NOT in scope, and why

**69 split-array clips** on this pod carry a voice that disagrees with their role's cast:
Narrator 47, Driver 9, Diner 2 8, Bar Customer 2 5. **None of these were caused by the
recast** — those four roles have identical cast entries before and after. They are the
pre-existing drift class documented at 636 clips across 20 courses, and a split segment
cannot be re-rendered from the row's text; it has to be re-cut (`splice-sentence-clips.cjs`).
Measured and reported by the tool on every run, deliberately never written.

## 3. The gate cannot see this defect. That is the headline finding.

`checkPodCast` **passed ita_for_eng:pod-1 before the re-render**, with `offCastClips: 0`,
while eleven turns were audibly in the wrong voice.

It is not a bug — it is the documented design, called out in
`pod1-two-voice-cast-2026-08-24.md` §"Re-render scope": the clip check judges membership of
the pod's voice **set**, and after a two-voice recast both voices are always in the set. A
role that swaps sides leaves clips that are simultaneously **on-cast and mis-voiced**.

So the gate is necessary and not sufficient, and this job needed a second measurement:
`computeOffRole` asks "is this clip on the right one of the two for THIS speaker", which is a
strictly stronger question than "is it one of the two". It is exported pure and tested
separately rather than folded into `checkPodCast`, because turning it on inside the shared
gate would flip 20 other courses to FAIL on their pre-existing split drift in the same
commit. **Whether to promote it into the gate is Tom's call, not this job's.**

## 4. Make-before-break, step by step, with the evidence

Ordering rule: `AUDIO_PIPELINE_ARCHITECTURE.md` §6b.

**Why none of the three existing tools fit**, each for a different reason — worth recording,
because reaching for any of them would have broken something:

| tool | what it would have done |
|---|---|
| `/generate-pods` | queues from `!s.target_audio_id`; a linked slot is never a candidate. Zero spend, zero change. |
| `unlink-off-cast-pod-clips.cjs` | NULLs the link so generate refills it. Correct on a HELD staging pod; here it takes eleven lines off a LIVE pod until a render lands. |
| `revoice-clips.cjs` | takes its destination from `courses.voice_config`, which for ita_for_eng says `target1 = ara` — **the very voice being moved off**. For a pod the cast is the authority, never voice_config. |

Hence `tools/pods/rerender-off-role-pod-turns.cjs`, dry-run by default, 11/11 tests green.

**Step 1 — GENERATE.** 22 clips through `generatePodAudio`, the same function
`/generate-pods` calls, so pause cue, mastering, S3 key convention, canonical voice spelling
and `course_audio` identity are identical to the normal path. 22 rendered, 0 reused, 0
failed. No link was touched. Eight clips carried phase-8's advisory tail flag, which is
`SUSPECT ONLY … never grounds to alter a clip`, and none were altered.

**Step 2 — VERIFY, before anything moved.** Served bytes fetched from S3 for each new clip;
stored `voice_id` re-read from the DB; ffprobe duration; ffmpeg `volumedetect`; truncation
judged against what the *destination* voice does per character, calibrated at runtime from its
own clips in this course (`x7avnu1k` 77.1 ms/char, `gfzdpspr5fdp` 75.2 ms/char) — never
against the old voice's duration.

**22 of 22 PASS.** Duration ratios 0.75–1.29× predicted, mean level −16.2 to −19.5 dB.
Two Italian clips scored STT 0.5 — whisper heard *"è la giua sinistra"* for **"È laggiù a
sinistra."**, running `laggiù a` together. STT is advisory here by policy (the estate's ASR
gate is known to refuse correct audio: `isl-pod1-a230-2026-08-24.md`), and the estate's own
verifier scored the same two clips 0.938 and 0.929 on its own decode path. Both are in the
listening doc, first pair in scene 21, for Tom's ear.

**Step 3 — SWAP.** One transaction, 22 UPDATEs, each with the old clip id inside the WHERE
predicate so any drift rolls the whole thing back. `committed: 22 link(s) moved.`

**Step 4 — CLEANUP: not done, deliberately.** All 22 superseded clips remain in `course_audio`
and in S3. They are the rollback, they are what the A/B listening doc plays as "before", and
they are still referenced by the retired pod-1. Deleting them is a separate decision and
there is no cost pressure to take it.

### Post-swap verification, through the estate's own reviewed tools

- `verify-pod-clips.cjs --pod=ita_for_eng:pod-1` — **22 CLEAN, 0 ADVISORY, 0 REVIEW, 0
  ERROR**; per voice `target:x7avnu1k 11 clean`, `known:gfzdpspr5fdp 11 clean`.
  Log: `ita_for_eng-pod-1-off-role-rerender-2026-08-24-verify-pod-clips.json`.
- Re-run of the off-role measurement: **0 off-role whole-turn slots**, split drift unchanged
  at 69 — so nothing outside the intended scope moved.
- `checkPodCast`: **PASS** — 2 voices `[ara, x7avnu1k]`, 0 uncast, 0 same-voice exchange
  pairs, 0 off-cast, 0 dangling, 0 incoherent splits. The 16 `wrong-row` explainer warnings
  are the known stale-explainer backlog and are unchanged by this job.
- The **live** viewer API serves all 11 lines on `xai_x7avnu1k` / `xai_gfzdpspr5fdp`,
  `found: true`, no dangling reference.

### One honest gap in the live gate

The viewer on `popty.app` runs from the `-prod` checkout on `main`, and it reports
`gate_ok: false` for ita_for_eng with one failure: *"Interlocutor↔Narrator on x7avnu1k (1
turn)"*. That is the **spurious Narrator adjacency** that commit `ab45c6c4d` already fixed —
352 of 352 Narrator lines are the last line of their scene, so nobody answers them — but
that fix lives on `fix/pod1-two-voice-cast-2026-08-24` and **is not merged to main**. Run
locally against the branch, the gate passes. The live surface will keep showing that one
false failure until the branch merges. Not caused by this job, not fixed by it.

## 5. Migration protocol — does not apply, and here is the check

`docs/pods/pod-migration-protocol.md` governs changes to pod **content**: a sentence's text or
its position. Progress lives in `learner_pod_state`, keyed by `sentence_id` —
`ita_for_eng:pod-1:SC17-S002`, or `…:s<k>` for a split unit. There is no audio id anywhere in
that key.

This job changed **no** sentence text, **no** sentence position, **no** slot, and **no** split
array. It wrote two columns, `target_audio_id` and `known_audio_id`, on 11 existing rows. The
words spoken are identical — that is what the STT check proves, at similarity 1.0 on 20 of 22
and 0.93+ on the other two. A learner credited with `SC17-S002` has heard exactly the
sentence they are credited with; the only change is which character's voice says it, which is
the defect being repaired.

Two further properties worth recording, because they are what makes this shape safe where an
in-place swap would not be:

- **New clip ids, so no immutable-cache trap.** The learner ref is `buildAudioRef(id,
  revision)` and `/api/audio/:id` serves `max-age=31536000, immutable`. Overwriting a clip's
  `s3_key` without bumping `audio_revision` leaves every learner who already played it with
  the old bytes for a year. Rendering new rows and moving the pointer sidesteps that entirely
  — a new id is a new URL.
- **Nothing was orphaned.** The retired pod-1's own links still point at the old clips, which
  is correct: that pod is a held snapshot of what shipped.

## 6. Reproduce

```
node tools/pods/rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1          # dry run
node tools/pods/rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1 --apply
node tools/pods/verify-pod-clips.cjs --pod=ita_for_eng:pod-1 --since=60min
node tools/pods/rerender-off-role-pod-turns.test.cjs                              # 11/11
```

Logs: `ita_for_eng-pod-1-off-role-rerender-2026-08-24-{dryrun,applied}-log.json`. The applied
log carries, per clip, the old id, the new id, the full verification record and the swap
result — every change is reversible from it alone.

## 7. What this proves for the other 21, and what it does not

**Proven.** The shape works and is cheap: read the destination from the cast, render through
the normal path, verify on served bytes, swap under an assertion, delete nothing. Italian was
the hardest case by cast richness and it produced 22 clips and zero held-back rows. The tool
is course-agnostic — it takes `--pod` and reads everything else from the DB.

**Not proven, and not attempted.** The other 21 courses are untouched, per Tom's instruction.
Their scope is *reported* in the two-voice doc as 11 turns each, but that figure has not been
re-measured live per course the way Italian's was, and two of them (spa, spa_mx) additionally
moved `Bar Customer 2` and `Diner 2`, which Italian did not. The 572-turn CJK pause-cue
re-render is on hold and was not touched.
