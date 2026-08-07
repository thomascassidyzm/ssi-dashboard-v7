# Pod redo across all languages — scope, timeline, staging plan

**Date:** 2026-08-07 · **Plate item:** A-89 · **Status:** scoping only, nothing started
**Brief:** Tom is not interested in cost — the redo is happening. He wants wall-clock time,
resource load, and a staging plan he can trigger.

All numbers below are measured from the live DB today unless explicitly marked as a gap.

---

## 1. The headline

**The redo is roughly a day of pipeline time, not an hour — and one thing must be fixed
before it can start at all.**

The pod door is *not* the fast course-audio door. `/generate-pods` runs at concurrency **5**
(hard-capped at 6, because xAI's TTS throws 500s under fan-out), and — decisively — every xAI
render steered to a non-English locale is re-decoded by whisper for the phonology gate, at
**2 concurrent, ~12.5 s per clip = ~576 clips/hour, process-global**. Forty of the 64 courses
in scope trip that gate. Measured wall-clock:

| Job | Wall-clock |
|---|---|
| Full target+known, all 231 sentences | **~23.6 h** |
| Incremental — the 89 new sentences only | **~9.1 h** |

The one lever that moves this: raising `XAI_PHONO_CONCURRENCY` from 2 to 4 (~8 of 12 cores)
roughly halves the gated portion, taking the full job from ~23.6 h to ~16 h.

**Blocker (§4a): 16 `eng_for_*` courses cannot generate target audio at all as currently cast.**

What governs the rest of the timeline:

1. **The 2-voice conformance decision** (§4) — which, usefully, is also the fix for the blocker.
2. **The translation stage** — 64 courses now need fresh target text, which did not
   apply to previous pod redos.

---

## 2. What is actually out there (live census, 2026-08-07)

| Thing | Count |
|---|---|
| Canonical `pod-0` | **231 sentences / 22 scenes** (was 142 / 15 before 2026-08-06) |
| Courses holding a pod-0 | **67** |
| — already aligned to 231 (Welsh) | 2 (`cym_n_for_eng`, `cym_s_for_eng`) |
| — test course | 1 (`zzz_test_for_eng`, 6 rows) |
| — **in scope for the redo** | **64**, every one still at the old 142 rows |
| — of those, known language = English | **41** |
| — of those, known language ≠ English | **23** (16 reversed `eng_for_*`, 7 `X_for_jpn`/`_for_spa`) |
| New sentences per course | **89** (231 − 142), plus a scene 15 → 22 remap |
| Live pod-0 sentence rows | 9,556 |

*(The Welsh courses hold **both** a legacy `pod-0` and the aligned `pod-0-unrecorded`, which is
why 67 courses carry 69 pod-0-family pods. 67 − 2 Welsh − 1 test = 64.)*

Courses are not uniform in how much pod audio they carry:

- **47 courses have the full treatment** — sentence audio, known audio, chunk slices,
  explainer audio and take-G renders: **~7.75 audio artefacts per sentence**.
- **18 courses have base treatment only** — target + known sentence audio: **2 per sentence**.
  (Mostly the `eng_for_*` family.)

Three courses already have **no pod target audio at all**: `deu_at_for_eng`, `fin_for_eng`
and `cym_s_for_eng`. Two of those are `not_available` in the app — which makes them the
free pilot slot (§6).

---

## 3. Wall-clock and resource picture

**Use the pod door's rates, not the course door's.** The general `/generate` course-audio door
runs at concurrency 20 and has hit 141,913 clips in a day (2026-08-01, 18,693/hr sustained).
That number is not applicable here: pods go through `/generate-pods` at concurrency **5**
(`POD_GEN_CONCURRENCY_MAX` = 6, because xAI /v1/tts throws 500/ECONNRESET under fan-out).

Measured pod-door throughput, by joining `listening_pod_sentences.{target,known}_audio_id` to
`course_audio.created_at` (16,353 clips):

| Regime | Rate |
|---|---|
| Single course, ungated | **~4,300 clips/hr** (measured 2,419 / 4,245 / 4,507 / 4,561) |
| Several courses in flight, ungated | ~15,300 clips/hr peak |
| **Any course tripping the whisper phonology gate** | **~576 clips/hr, process-global** |

The gate is the governing constraint. `services/tts-service.cjs:554-676` re-decodes every xAI
render steered to a non-English locale through whisper-cli, throttled to 2 concurrent
(`XAI_PHONO_CONCURRENCY`) at ~12.5 s per clip. **Running more courses in parallel does not
raise this** — it is a process-global lane limit. 40 of 64 courses trip it on the target side,
7 on the known side.

### Timeline

| Job | Gated portion | Ungated portion | Total |
|---|---|---|---|
| Target only, all 231 | 9,240 clips ÷ 576 = 16.0 h | 5,775 ÷ 4,000 = 1.4 h | **17.4 h** |
| Target + known, all 231 | +2.8 h | +3.4 h | **~23.6 h** |
| Incremental (89 new lines, 38.5%) | — | — | **6.7 h target / 9.1 h both** |

**The one lever:** raise `XAI_PHONO_CONCURRENCY` 2 → 4 (~8 of 12 cores) and the 16.0 h gated
stretch roughly halves, taking the full job to ~16 h. Nothing else on the list moves the
number materially.

*Caveat, stated honestly:* the 576/hr figure is arithmetic from a bench on an idle box, not an
observed gated batch — no post-gate pod run has ever been measured. Under real load it gets
worse, not better.

### What else suffers while it runs

- **The phase-8 door is shared.** There are **26 pending `audio_pass_requests`** in the queue
  right now (oldest 2026-07-24), from content passes across `fra_for_eng`, `spa_for_eng`,
  `eng_for_mar`, `por_for_eng` and others. A pod campaign occupying the pipeline delays those,
  and they are already a month deep.
- **watson-1 is 12 cores** (correcting an earlier note that said 8). Current load average is
  ~2.9 with several agent sessions and a Vite build running.
- **The gated stretch pins ~3.9 cores continuously** — whisper runs 2 lanes × 4 threads at
  ~24 s CPU per clip, for 16 hours straight. Raising `XAI_PHONO_CONCURRENCY` to 4 to halve the
  wall-clock takes that to ~8 of 12 cores, which will visibly slow every other agent session,
  the proofread tool, and any ffmpeg/whisper sweep for the duration. That is the trade: half
  the wall-clock for most of the box.
- Per clip the pipeline also spawns 3 subprocesses (ffmpeg → lame, ffprobe, tail-flag ffmpeg),
  one S3 PUT (3 retries) and one Supabase upsert.
- TTS provider quota is **not** a binding constraint here — the gate is.

---

## 4. The one decision that changes the size of the job

**Aran's mapping rule, today: the default is TWO VOICES for everything — one male, one female,
the existing casting default. Extra voices may come in pod 1/2 but are not needed now.**

The live audio does **not** currently conform to that rule:

| Distinct target-side voices per course | Courses |
|---|---|
| 2 (already conformant) | **19** |
| 3 | 3 |
| 4 | 4 |
| 5 | 17 |
| 6 | 21 |
| 0 (no audio) | 3 |

(Voice ids normalised — `leo` and `xai_leo`, `en-GB-SoniaNeural` and
`azure_en-GB-SoniaNeural` counted as one voice each.)

The known side is worse: **34 courses use 7 distinct known-side voices**, while 20 use exactly 1.

Canonical pod-0 carries **26 distinct speaker labels** (Learner 79, Narrator 16, Sarah 13,
Customer 1 14, …) which under Aran's rule must collapse onto 2.

**So: applying the rule properly means re-rendering the surviving 142 lines too, not just the
89 new ones.** That is the difference between Tier A and Tier B/C.

**My recommendation: Tier B.** Apply the 2-voice casting to the target (dialogue) side across
all 231 sentences, so a course sounds like one consistent two-hander rather than a 6-voice
patchwork; generate the known side fresh for the new lines only, and leave the 20 single-voice
known tracks alone. Tier C's full known-side rebuild buys consistency on a guide track the
learner treats as narration — it is not worth doubling the job now.

*The one taste call for Tom/Aran:* whether "two voices for everything" is meant to govern the
**known/English guide track** as well as the target dialogue. I have read it as target-side
casting. If Aran means both sides, that is Tier C and roughly doubles the audio.

---

## 4a. Blocker — 16 `eng_for_*` courses are cast with Chinese voices

Verified directly in `listening_pods.speakers` today. Every one of these 16 courses casts its
**target** (English) speakers on xAI voices at `locale: "zh"`:

`eng_for_ara`, `eng_for_ben`, `eng_for_deu`, `eng_for_fra`, `eng_for_guj`, `eng_for_hin`,
`eng_for_ita`, `eng_for_jpn`, `eng_for_kor`, `eng_for_pan`, `eng_for_por`, `eng_for_sin`,
`eng_for_spa`, `eng_for_tam`, `eng_for_urd`, `eng_for_zho`

Sample (`eng_for_ita`): speaker `Guest` → target voice `jpi39icg`, locale `zh`, provider xai.
That is a Chinese voice on an English target — the casting looks copy-pasted from a `zho`
course. Speaker `Anna` → `ara` at locale `zh`, likewise.

**Consequence on a fresh run:** the phonology gate sees a clip steered `zh` but detects `en`,
re-rolls three times and throws. Those ~3,696 target clips fail 100% — burning ~11,088 whisper
runs and ~19 hours to produce nothing.

Note the existing *rendered* audio for these courses uses sane English voices
(`en-GB-SoniaNeural`, `leo`, `bedd6226`, `en-GB-RyanNeural`), so this is a stored-casting
defect that post-dates or bypassed the original generation. It has not hurt anyone yet because
nobody has re-rendered these pods.

**The fix is the same work as Aran's rule.** Recasting each course to one male + one female
voice in the correct locale removes the mis-steer and collapses the 26 speaker labels at the
same time. This is not extra work bolted onto the redo — it *is* the redo's first step.

---

## 5. Voice casting readiness

**58 of 64 courses are READY** — they have at least one usable male and one usable female
voice for both target and known language, live in `app_config.pod_voice_pools`.
**7 are GAPs.**

### Where casting actually lives (two separate systems — do not conflate)

- **TTS generation voices.** `app_config.pod_voice_pools` (39 language pools live) is the
  source. `tools/pod-sync.cjs#assignVoices` (lines 189-269) round-robins each canonical
  speaker onto `pool[gender][index % pool.length]` and writes the resolved result into
  **`listening_pods.speakers`**. Phase-8's `resolvePodSpeakerVoice()`
  (`services/phases/phase8-audio-v13.cjs:6250`) reads that resolved snapshot at generation
  time — it never consults the pool itself.
- **Human recording cast.** `courses.voice_config.podCast`, a different namespace entirely
  (`human_*` ids), in `services/voice-engine/pods-cast.cjs`. A course can be TTS-ready with
  zero human cast, or the reverse.
- ⚠️ **`tools/pod-voice-coverage.cjs` is stale and must not be trusted.** It is a static map
  that has diverged from the live pools — it claims Finnish is tier-1 xAI-native (the live
  pool has no `fin` key at all) and has no `eng` target entry (the live pool has 5F/5M).

### The 7 GAPs

| Courses | Fault |
|---|---|
| `eng_for_ben`, `eng_for_guj`, `eng_for_pan`, `eng_for_sin`, `eng_for_tam`, `eng_for_urd` | **No known-language pool** — `pod_voice_pools` has no `ben`/`guj`/`pan`/`sin`/`tam`/`urd` key, so 0 usable voices on the known side. These 6 also carry the §4a corrupted casting. Needs both a pool addition and a full re-sync; patching won't do. |
| `fin_for_eng` | **No target-language pool** — no `fin` key. Here `listening_pods.speakers` correctly marks every character `"deferred": true` rather than guessing, which is why this course has zero pod audio. |

**This kills `fin_for_eng` as the Stage 0 pilot** (see §6) — it cannot generate until a Finnish
pool exists. `deu_at_for_eng` is READY and takes the pilot slot.

### Relation to the §4a blocker

The two findings are consistent and complementary. **16 courses carry zh-corrupted target
casting** (my direct check of `listening_pods.speakers`). Of those, **10 have healthy pools**
and are fixed by a straight re-sync; the **other 6** additionally lack a known-language pool
and need that created first.

### Making the TTS side obey Aran's 2-voice rule

`assignVoices` already handles arbitrary speaker labels generically — unrecognised names fall
back to male and take a pool slot, so the 26 canonical labels will not break it. What it does
*not* do is collapse to two voices: pools run 1-5 per gender, so distinct characters get
distinct voices whenever the pool allows. Two ways to fix it:

- **Code (recommended):** force `tIdx = 0` / `kIdx = 0` at `tools/pod-sync.cjs:241-242`
  instead of `idx % pool.length`. Every speaker of a given gender gets the pool's first voice;
  pool depth stays available as opt-in headroom for pod 1/2, exactly matching Aran's
  "additional voices may come later".
- **Data:** trim each pool to 1f + 1m — loses the multi-voice colouring the pools were built
  for, and is harder to reverse.

**Precedent: the human recording side already implements this rule.** `pods-cast.cjs` has
`DEFAULT_POD_VOICES = 2` and `collapseTwoVoiceCast()` (commit `68d36e5a`, "two voices as the
default, three or four as an opt-in"). The TTS side is simply the half that never got it.

---

## 6. Proposed staging plan

Course status from the live `courses` table:

- **9 live** in the new app: `cym_n/s_for_eng` (already done), `jpn_for_eng`, `zho_for_eng`,
  `spa_for_eng`, `por_for_eng`, `kor_for_eng`, `ita_for_eng`, `hrv_for_eng`
- **`fra_for_eng`** is released but not flagged live
- **4 not_available**: `ara_sy_for_eng`, `deu_at_for_eng`, `fin_for_eng`, `zzz_test_for_eng`
- the remaining ~53 are beta

### Stage 0 — pilot on the free slot (1 course, hours)
**`deu_at_for_eng`.** It is `not_available` in the app **and already has zero pod audio**, so
there is literally nothing to break, and its voice pools are healthy.
(`fin_for_eng` looks like the same free slot but is **not** usable — there is no Finnish voice
pool, which is precisely why it has no audio. See §5.)
Run the whole chain end-to-end:
remap → model translation → 2-voice casting → phase-8 generate → listen.
**Gate: Aran hears one full pod before anything else is triggered.** This is the sample-first
step the TTS doctrine requires.

### Stage 1 — one well-served live course (1 course)
`ita_for_eng` or `spa_for_eng`. Best-supported TTS, high visibility, so casting problems show
up immediately. This is the taste checkpoint, not a throughput stage.
**Gate: Tom/Aran sign off the casting on a live course.**

### Stage 2 — the live and released set (7 courses)
`jpn`, `zho`, `spa`, `por`, `kor`, `ita`, `hrv` (+ `fra_for_eng`). Highest learner impact,
and they are the full-treatment courses, so they exercise the chunk/explainer/take-G path.

### Stage 3 — the rest of the English-known set (~30 beta courses)
Straightforward: the diff numbers in §7 are measured for exactly this population, casting is
healthy, and they can run as one continuous campaign. Batch gated and ungated separately.

### Stage 3b — the `eng_for_*` family (16 courses) — **hold**
Cheapest per course on paper (2 clips/sentence, no chunk work) and they share one target
language, so casting is decided once for the whole batch. **But these are the same 16 courses
carrying the §4a zh-corruption, and they sit inside the 23 known≠English courses whose diff
numbers are not yet valid (§8.1).** Do not trigger them with the rest — they need the short
scoping pass first, and then they become a fast, uniform batch.

### Stage 4 — the long tail (~38 beta courses)
Batch by TTS strength, weakest last so the known gaps get the most attention and the most
generous sampling. `ara_sy_for_eng` sits here, being `not_available`.

### Stage 5 — the pool-gap courses (7, blocked until pools exist)
`fin_for_eng` plus `eng_for_{ben,guj,pan,sin,tam,urd}`. These cannot run until someone adds
the missing `fin`/`ben`/`guj`/`pan`/`sin`/`tam`/`urd` entries to `app_config.pod_voice_pools`.
That is a small, separable piece of work — one male and one female voice per language — and it
does not block the other 58. Park it as its own item rather than letting it hold the campaign.

**Recommended trigger order: fix the 16 castings (§4a) → Stage 0 → gate → Stage 1 → gate →
Stages 2, 3, 4 back to back.** After the two taste gates, the rest is mechanical and runs as
one continuous overnight campaign.

Two scheduling notes from the throughput measurement:

- **Batch gated and ungated courses separately.** The whisper lane is process-global, so
  interleaving a gated course with ungated ones just makes the ungated ones wait. Run the 25
  ungated courses as one fast campaign (~1.4 h) and the 40 gated ones as a separate long one.
- **Restarts are free.** The pod door only enqueues sentences whose `target_audio_id` /
  `known_audio_id` is NULL, and `findExistingAudio` dedups on text+voice+role — so the job is
  resumable by construction. Kill it and re-POST and it picks up the remainder. No checkpoint
  needed. Caveat: the error list is returned in the HTTP response only and is **not persisted**,
  so capture the response or you lose the failure detail.
- Expect ~2% residue per course (measured: 3 of 142 target clips missing on 13 healthy
  `eng_for_*` courses) — plan one sweep-up pass at the end rather than chasing it live.

---

## 7. Translation stage

### "89 new lines per course" was wrong — it is ~119

Measured with `tools/pods/pod0-recording-diff.cjs` against live rows for the 41
English-known courses. Per course, of 231 canonical lines:

| Bucket | Lines | Translation work? |
|---|---|---|
| **Survives unchanged** | 104.2 | None — take preserved |
| **New** | 90.0 | Fresh translation + fresh audio, both sides |
| **Reworded (wording)** | 29.4 | **Yes — needs a translation pass** |
| **Reworded (numerals only)** — "One. Two." → "1. 2." | 7.3 | None; only the English guide line re-records |
| **Stale** | 1.0 | Retired: blanked and parked, never deleted |

So only **104 of 142 (73%) survive byte-for-byte**. The other ~37 changed under their existing
target text. **True translation workload is ~119.5 lines/course — 34% more than "89 new."**
Across the 41 English-known courses: **4,899 lines** need translation or re-translation
(3,692 new + 1,207 reworded), plus 300 numerals-only lines that need re-recording only.

Audio, correspondingly: **~117 target renders and ~124 known renders per course** on the
incremental path, not 89 × 2.

**Note how this interacts with the Tier B recast (§4):** if the casting changes, all 231 target
lines re-render anyway. Since the incremental path already needs ~117 of 231, **the full
2-voice recast costs roughly twice the incremental job, not five times it.** That is the
strongest argument for doing the recast now rather than living with a 6-voice patchwork.

### Timing

Translation is **not** the long pole. It is model-latency-bound, not CPU-bound, so it runs
happily alongside a whisper-pinned box. Estimate: ~4-8 min per course for a Sonnet-tier agent
on ~120 dialogue lines; at ~10 parallel calls, **41 courses ≈ 30 minutes wall-clock**.
*This is an estimate, not a measurement* — there is no prior agent-dispatched pod-translation
run to calibrate against (the Welsh drafts were hand-authored, not dispatched at scale).

### Tooling: reuse the core, build two small pieces

- **Reuse wholesale.** `pod0-recording-diff.cjs` (`diffPod`) is a pure, generic module with no
  Welsh assumption — it is the diff engine for all 64. `align-welsh-pod0-to-canonical.cjs` is
  ~90% generic: its DB writes, carry-forward logic, before-state drift assertions and two-phase
  park/write are language-agnostic. Only `DEFAULT_COURSES` and the output paths are Welsh.
- **Reuse the write pattern.** `write-pod0-welsh-drafts.cjs` applies a hardcoded literal drafts
  module so it is not directly reusable, but its shape is exactly right: per-row
  `UPDATE … WHERE id=$1 AND known_text=$2 AND btrim(target_text)=''`, one transaction,
  before/after drift assertion. The `target_text_draft` flag already exists and already renders
  in the recording room — no schema change needed.
- **Not needed.** `build-welsh-translation-worklist.cjs` exists for Aran's proofreading UX,
  which Tom's no-human-check ruling removes.
- **Build (small):** the translation-generation step, and a text-only QC gate (below).

### Risks of a model-only pass, and the gate for each

| Risk | Gate | Status |
|---|---|---|
| Placeholder tokens (`[target language]`) — canonical genuinely contains **205** of these | `PLACEHOLDER_RE` + `substitutePlaceholder()` | **Already built**, reuse directly |
| Empty rows | `btrim(target_text) = ''` | Already the WHERE-clause pattern in the Welsh writer |
| Wrong-language output | Unicode-block check against the course's expected target script | Small build |
| Untranslated English passthrough | Flag when `target_text ≈ known_text`, or reads as English for a non-English target | Small build |
| ⚠️ **Whisper as a text gate** | **Do not.** `rescue-wrong-language-clips.cjs` and `sweep-wrong-language-crosscourse.cjs` are post-render *audio* gates, and whisper misdetects short clips badly enough that both tools need 4× looping and sibling verification to be trusted at all. It is not a text validator. | — |

---

## 8. Explicit gaps — what this scope does NOT cover

1. **The 23 known≠English courses are unsized.** `diffPod` compares `known_text` against the
   canonical `english_text`, which is simply the wrong field mapping when the known language
   is not English — for those courses the English lives in `target_text`. A swapped-field
   probe gave a materially different shape (~94.6 survive / 132.2 new / 43 stale per course)
   but that is **directional only, not a validated number**, and it is unconfirmed whether
   those courses' pod-0 content derives from Aran's English canonical at all.
   **These 23 need their own short scoping pass before anyone commits to a plan for them.**
   Do not fold them into the 41's numbers. Note the overlap: 16 of the 23 are the same
   `eng_for_*` courses carrying the §4a casting corruption.
2. **No gated pod run has ever been measured.** The 576 clips/hour figure is arithmetic from a
   whisper bench on an idle box, not an observed batch. Under real load it gets worse.
3. **No timing precedent for agent-dispatched pod translation** at this scale — §7's ~30 min
   is an estimate, not a measurement.
4. **Phase-8 error lists are not persisted** — they are returned in the HTTP response only
   (first 20). Capture the response at run time or the failure detail is lost.
5. **The chunk / explainer / take-G tier is not separately sized.** 47 courses carry it at
   ~7.75 artefacts per sentence vs 2 for the other 18. The §3 timeline covers the target and
   known sentence tracks; whether the seven new "Extra phrases" scenes need chunk and explainer
   treatment at all is an open design question — Aran's 2026-08-06 ruling that scenes 15-21 are
   chunks needing no scene-based to-and-fro suggests they may not.

---

## 9. Summary — what needs a decision

| # | Decision | Recommendation |
|---|---|---|
| 1 | Raise `XAI_PHONO_CONCURRENCY` 2 → 4 for the campaign? | **Yes, run overnight.** ~16 h instead of ~23.6 h, at the cost of ~8 of 12 cores while it runs. |
| 2 | Does "two voices for everything" cover the English guide track, or just the target dialogue? | **For Aran.** Scoped here as target-side. If both, the known side roughly doubles. |
| 3 | Do the 2-voice recast now, or only the new lines? | **Recast now (Tier B).** The incremental job already needs ~117 of 231 target renders, so the full recast is ~2× the incremental job, not ~5×, and it fixes the §4a corruption in the same pass. |
| 4 | The 7 missing voice pools | Small separable job — 1 male + 1 female per language. Does not block the other 57. |
| 5 | The 23 known≠English courses | Needs its own scoping pass first (§8.1). Don't trigger them with the rest. |
