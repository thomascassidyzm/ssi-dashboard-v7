# Tonight's approved work — what got queued, and what the queue cannot say

2026-08-12. Approval of record: Tom, this thread, against the revised generation plan
(https://watson-1.tail4968cb.ts.net/d/9870932f).

**Nothing was generated. No TTS was run. This is a queueing record.** Per CLAUDE.md the standing
gate is that content work ends by queueing an audio-pass request; a human triggers fulfilment.

---

## 1. The headline finding: the queue is course-scoped, and tonight's job is not

Tom asked me to verify that the queue mechanism actually lets me exclude specific rows/tracks rather
than queue a whole course and hope. **It does not.** The mechanism, read end to end:

- `audio_pass_requests` (`database/migrations/20260711_audio_pass_requests.sql`) has exactly one
  addressable dimension: `course_code`. There is a **partial unique index enforcing one PENDING row
  per course**. The only free-form fields are `reason` (text) and `metadata` (jsonb).
- **No consumer reads `metadata` for scoping.** `tools/course-optimization/run-approved-audio-passes.cjs`
  supports `--only-courses` / `--exclude-courses` — course granularity, and those are *run flags*,
  not state stored on the request.
- The fulfiller it calls is phase8 `POST /generate/:courseCode`, which fills **missing/unlinked
  course audio for a whole course**.

So a queue row cannot express "these 1,128 pod renders", "not these 462 slots", "not the explainer
clips", or "these 24 specific clip ids". Anything narrower than a course lives in the `reason` and
`metadata` as **advisory text for the human who triggers the run** — it is documentation, not a
guard rail. Every request written tonight names its correct fulfiller explicitly for that reason.

Three consequences worth stating plainly:

1. **Pod-0 English is pod audio, not course audio.** Its fulfiller is phase8
   `POST /generate-pods/:courseCode`, a different endpoint from the one the queue runner calls.
   A row swept into `/generate` would do the wrong work at the wrong scale.
2. **The 24 proven-failed clips are LIVE and LINKED.** `/generate` only voices missing/unlinked
   audio, so it would skip all 24 while authorising whole-course passes across 8 courses. Their
   fulfiller is `tools/audio-veracity-repair.cjs --apply`.
3. **One pending row per course means two passes on one course collide.** Three courses already
   carried an unrelated pending pass; their reasons were **carried forward verbatim**
   (`STILL OUTSTANDING (carried forward): …`) rather than clobbered — `eng_for_hin` (voice flip to
   xAI eve), `eng_for_kan` (regen complete), `eng_for_tam` (regen complete, S141 unfillable RED).

## 2. What got queued

Written by `scripts/queue-2026-08-12-approved.cjs --apply` (gitignored workspace; dry-run first).
Pending rows went **55 → 71**: 16 new, 43 touched, 12 pre-existing rows left untouched.

| set | courses | fulfiller |
|---|---:|---|
| pod-0 English fresh build (Eve + clone `xai:gfzdpspr5fdp`) | **57** | phase8 `POST /generate-pods/:courseCode` |
| proven-failed live clips (24 clips) | **8** | `tools/audio-veracity-repair.cjs --apply` |
| — of which carry **both** passes on one row | 6 | |
| distinct requests written | **59** | |

**Scope of the 57.** Every course with a `pod-0%` pod and English on either side
(`courses.known_lang='eng' OR target_lang='eng'`), minus the exclusions below. That includes
`deu_at_for_eng` and the 15 `eng_for_*` courses (English on the target side, per D4), which the
earlier 2026-08-11 `@pod0-rollout` queueing had missed — it had 40.

It excludes the seven non-English-known pods (`cat_for_spa`, `eus_for_spa`, `deu_for_jpn`,
`fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn`) — no English on either side, so nothing
for an English build to do — and `zzz_test_for_eng`.

**The 24, reproduced from source rather than taken from the survey** (`scripts/proven-bad-live.sql`):
21 rows whose `s3_key` still joins to a live `course_audio` row from the 534 failed verdicts in
`~/.audio-veracity-verdicts.json`, plus 3 `course_audio.veracity_pass = false` rows. Exact match to
the survey's split — fra_for_eng 8 fra + 5 eng, deu_for_eng 2, spa_for_eng 2, eng_for_urd/hin/guj/kan
1 each, ita_for_jpn 3. Clip ids are in each request's `metadata.clipIds`.

## 3. D2 — the Welsh exclusion is a code rule, not a memory

**Zero `cym_*` rows are pending.** Verified after the write.

The rule is enforced in code, which is what D2 asked for: `services/shared/human-voice-courses.cjs`
treats every `cym_*` course as human-voiced (owner ruling 2026-07-25), and
`services/tts-service.cjs` `assertNotHumanVoiceCourse` refuses non-retriably with a `(403)` at the
one chokepoint every provider path passes through. I traced the pod path specifically:
`generatePodAudio` → `buildPodTTSConfig(voice, cue, courseCode)` → `config.courseCode` → chokepoint.
Aran and Catrin's recordings cannot be overwritten by this or any fresh-build pass even if a row
were queued by mistake.

## 4. The blocked item — and one the plan did not catch

**Blocked on proofreading (D5), correctly, not queued: 247 lines.** `cym_s_for_eng` 89,
`deu_at_for_eng` 79, `spa_for_eng:pod-0-unrecorded` 79 — all `target_text_draft = true`, machine-written
target text nobody has read. Ledger: `docs/audio/non-english-canon-render-scope-2026-08-12.md` §2.

**Also not queued, and this one the plan missed: the cym_n 83.** It was the *only* new-canon set that
cleared D5 (`draft = 0` — Aran's own Welsh, already proofread), and tonight's approval named it. But
those 83 lines are **Welsh target text in `cym_n_for_eng`**, and that course is human-voiced only.
Every one of its 87 existing pod-0 target clips is `human_aran_cym_n` / `human_aran_cym_n_2`.
Rendering them would mint synthetic Welsh into a pod otherwise entirely in Aran's real voice — and
the chokepoint refuses it with a 403 regardless.

**So tonight's renderable new-canon count is 0, not 83.** The 83 is not a TTS job that is blocked;
it is a **recording job for Aran** that was mis-filed as a render. The plan doc's §5 counts it among
"330 renderable" without flagging the human-voice ruling. That is the correction.

Revised tonight's numbers:

| line item | plan | actual |
|---|---:|---:|
| pod-0 English fresh build | 1,128 | 1,128 (queued) |
| proven-failed clips | 24 | 24 (queued) |
| new canon phrases | 83 | **0** — cym_n is a recording job, 247 still on proofreading |
| **total** | **1,235** | **1,152** |

## 5. Standing exclusions recorded on every request

Carried in `reason` and `metadata` as advisory text, since the queue cannot enforce them:

- all `cym_*` (D2) — also hard-blocked in code;
- explainer clips (D6) — 9,847 clips have the clone voicing non-English inline; own pass;
- **the estate-wide English rebuild (784,266 renders) is REJECTED and permanently out of scope.**

## 6. Before the first render — still open from the plan's §7

Not addressed by queueing, and each is a real precondition:

1. **Re-count pod-0** immediately before rendering; the pod count moved 104 → 106 mid-survey.
2. **Enumerate the relink set** — 62,811 practice-phrase rows across 43 courses point at a clip
   whose voice disagrees with their own `voice_config`. Enumerate per table before the first render.
3. **Normalise the voice ids** — `xai_gfzdpspr5fdp` vs bare `gfzdpspr5fdp`, same for eve/olivia.
4. **Make-before-break throughout** — generate, verify, swap links, only then retire.
