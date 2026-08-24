# Why the chain reviews missed the script-take filing gap — what each was looking at

Blameless post-mortem evidence, read-only, 2026-08-19. No code, no commits, no DB writes.
Nobody is at fault here. This is about the **unit each review had in its frame**, not about
anyone's attention.

The bug: a take recorded in SCRIPT mode (Autocue Studio, course content) put bytes in S3 and
wrote a `recording_provenance` row, but no `course_audio` row — so it was never servable and
never linked to a course. Upload returned 200. Fixed in `b645b2da`.

A companion document covers the **test/verification** side of the same question
(`docs/verif-archaeology/script-take-filing-gap-2026-08-19.md`): which committed checks ever
asserted a `course_audio` row for a script take. This document covers the **review and audit
corpus** instead — the run of investigations over the recording/audio pipeline from late July
to 19 August. The two do not overlap and agree where they touch.

---

## Ledger — one line per review, and the unit it was examining

### A. Reviews that had the recording seam itself in frame (4)

| Doc | Date | Unit examined |
|---|---|---|
| `docs/voice-engine/audit/03-recorder-upload.md` | 2026-06-10 | **The act of a take becoming a clip** — and it found this exact defect, in plain words, with the fix recommended. Predates the window. |
| `docs/pods/e2e-recording-proof-2026-07-17.md` | 2026-07-17 | Pod-mode takes becoming clips end-to-end; saw script mode's missing row as a side observation and reasoned it into a design. |
| `docs/autocue-scoping-2026-08-10/whole-phrase-record-option-scoping.md` | 2026-08-10 | Whether the *slow* read can be dropped from the script — i.e. the script generator, the chunk map, and the aligner. Named the missing row as timing detail. |
| `docs/recording-upload-write-path-2026-08-11.md` | 2026-08-11 | What a human take does **to a clip that already exists** — supersession, revision bumps, cache staleness. Script mode is the row in its table with "n/a" in every column. |

### B. Reviews of clips that already exist — quality (16)

| Doc | Date | Unit examined |
|---|---|---|
| `docs/audio-sweeps/tail-click-v2-sweep-2026-07-24.md` | 2026-07-24 | Existing clips, checked for tail clicks |
| `docs/audio-sweeps/child-voice-rescue-sweep-2026-07-24-summary.md` | 2026-07-24 | Existing clips, checked for wrong voice |
| `docs/forced-alignment-2026-08-04/findings.md` | 2026-08-04 | Existing clips, scored acoustically against their text |
| `docs/audio-tail-gate-decision-memo-2026-08-04.md` | 2026-08-04 | Existing clips, tail integrity as a publish gate |
| `docs/audio-veracity-gate-2026-08-04.md` | 2026-08-04 | Existing clips, whisper-checked that they say what the row says |
| `docs/deu-clipping-root-cause-2026-08-05.md` | 2026-08-05 | Existing clips, head/tail truncation |
| `docs/audio/tail-forensics-*-2026-08-06.md` (4 docs) | 2026-08-06 | Existing clips, where the truncation entered the chain |
| `docs/audio/deu-loudness-cluster-test-2026-08-06.md` | 2026-08-06 | Existing clips, loudness |
| `docs/tail-click-forensics-2026-08-08.md`, `tail-click-origin-2026-08-08.md` | 2026-08-08 | Existing clips, the click at the end |
| `docs/audio-forensics-2026-08-14/t20-clipped-human-recordings-diagnosis.md` | 2026-08-14 | Existing human clips (Aran's 12), why they are clipped |
| `docs/audio-forensics-2026-08-14/t20-head-vs-tail-loss-measurement.md` | 2026-08-14 | Existing human clips (81), how many ms lost at each end |
| `docs/pods/cym-n-recording-qc-2026-08-14.md` | 2026-08-14 | Existing human clips, measured from the S3 bytes — level, noise, trim |
| `docs/a108/a131-tail-click-diagnosis-2026-08-17.md` | 2026-08-17 | Existing clips, which chain step makes the click |
| `docs/a108/a131-clean-chain-ear-check-2026-08-17.md` | 2026-08-17 | Existing clips, listened to after the chain fix |
| `docs/whisper-decoder-capability-2026-08-19.md` | 2026-08-19 | The instrument that reads existing clips — which languages it can decode |
| `docs/welsh-slot-voices-listen-2026-08-19.md` | 2026-08-19 | Existing clips (58), which voice is in which slot |

### C. Reviews of clips that already exist — links, coverage, counts (14)

| Doc | Date | Unit examined |
|---|---|---|
| `docs/course-optimization/audio-batch-fill-vs-regen-audit-2026-07-28.md` | 2026-07-28 | Existing clips, fill-vs-regenerate accounting |
| `docs/introductions-audio-coverage-2026-08-05.md` | 2026-08-05 | Coverage — which slots have a clip |
| `docs/audio-unlink-forensics-2026-08-06.md`, `audio-unlink-root-cause-2026-08-06.md` | 2026-08-06 | Existing clips that lost their FK |
| `docs/audio/audio-link-reconciliation-2026-08-06.md` | 2026-08-06 | Existing clips vs the slots pointing at them |
| `docs/audio/xcourse-audio-mislinks-swept-2026-08-06.md` | 2026-08-06 | Existing clips linked to the wrong course |
| `docs/concat-vs-whole-2026-08-11/README.md` | 2026-08-11 | Existing clips, spliced vs whole-take, per text+voice |
| `docs/glued-audio-what-it-is-2026-08-11.md` | 2026-08-11 | Existing clips, what a glued one is made of |
| `docs/audio-pass-queue-2026-08-13/approved-render-run-2026-08-13.md` | 2026-08-13 | Render *requests* that nothing consumes — the queue, not the take |
| `docs/english-pod-audio-duplication-audit-2026-08-14.md` | 2026-08-14 | Existing clips, rendered once per course instead of shared |
| `docs/audio-language-guard-scoping-2026-08-14.md` | 2026-08-14 | The guard that refuses to render a language — pre-clip, TTS side |
| `docs/audio-forensics-2026-08-15/fraca-presentation-misroute-chunk3-2026-08-15.md` | 2026-08-15 | Existing presentation clips, is the text the right text |
| `docs/a108/lego-audio-link-integrity-adversarial-review-2026-08-17.md` | 2026-08-17 | A migration over the FK columns of existing clips |
| `docs/audio-regeneration-relink-probe-2026-08-18.md` (+ addendum) | 2026-08-18 | Whether "generate" re-points existing clips |
| `docs/audio/reach-recording-outliving-text-2026-08-19.md` | 2026-08-19 | Existing clips whose text was edited underneath them |

### D. Recording-programme reviews — people, queues, casts, surfaces (9)

| Doc | Date | Unit examined |
|---|---|---|
| `docs/recorder-e2e-2026-08-06/report.md` | 2026-08-06 | The recorder as a *surface* — does upload succeed, does the phone layout fit, is a silent take refused |
| `docs/pods/welsh-human-recording-state-of-the-nation-2026-08-07.md` | 2026-08-07 | Who has recorded what, on the pod lane, counted from `course_audio` |
| `docs/autocue-session-failure-2026-08-07/diagnosis.md` | 2026-08-07 | Where one take ends and the next begins — the VAD cut, upstream of upload |
| `docs/autocue-scoping-2026-08-10/flag-for-re-record.md` | 2026-08-10 | Whether a recordist's rejection reaches any queue (three systems, none connected) |
| `docs/audio-forensics-2026-08-14/t20-rerecord-queue-load.md` | 2026-08-14 | The re-record queue — derived, not stored |
| `docs/audio-forensics-2026-08-14/full-rerecord-scope-verified-2026-08-14.md` | 2026-08-14 | How many existing human clips need re-recording |
| `docs/audio-forensics-2026-08-16/t20-landing-state-fix-and-recordist-surface.md` | 2026-08-16 | Is the fix and the recordist surface live on `main` — a landing-state check |
| `docs/a108/kai-finnish-voice-identity-2026-08-19.md`, `docs/recording/fin-recordist-queue-unblock-2026-08-19.md` | 2026-08-19 | Why Kai's queue was empty — the cast, upstream of any take |
| `docs/recordist-route-tiebreak-2026-08-19.md` | 2026-08-19 | Can a recordist reach the screen and see lines — routing, upstream of any take |

**EXPLICIT GAP.** `docs/t22-clip-rulings-2026-08-16.md` is referenced in the estate's memory
notes but does not exist at that path in this checkout; not classified. The pod-casting run
(`docs/pods/t21-*`, `t22-*`, ~12 docs) is omitted as a body — every one of them examines which
*voice* is cast for a language, never a take.

---

## NEAR-MISSES

Five, in the order a reader should feel them.

### 1. The finding was made in full, in June, and correctly

`docs/voice-engine/audit/03-recorder-upload.md:99` —

> **"Never sets `origin='human'` in `course_audio`"** — **VERIFIED**, and stronger: the upload
> writes *nothing* to `course_audio`. The registry has no idea a human recording exists.

and `:107` —

> **Never served.** Playback signs URLs from `course_audio.s3_key` … Since the upload never
> sets `s3_key`, a row keeps pointing at the TTS file; rows don't exist at all for `script-N`.

Its recommendation at `:182` is, in substance, `b645b2da`: *"Make the upload write the registry.
Upsert/insert a `course_audio` row … with `origin:'human'`, real `s3_key`…"*. This audit was
dated 2026-06-10 on `feature/human-voice-engine`. It is outside Tom's window, and it is the
reason the window matters: the later reviews were not looking for something nobody had seen.

### 2. The one that came within a single click

`docs/pods/e2e-recording-proof-2026-07-17.md:82-94` —

> Mode 1 (New Course) looked at first like it silently dropped recordings — the S3 upload
> succeeds and returns 200, but no `course_audio` row appears right away. … This isn't a gap —
> `ModeSelector.vue` lists "Batch review and approval" as a Mode-1 feature … Mode 1 is a genuine
> two-phase workflow: **record → AI-segments the continuous take → you review/approve → THEN it
> becomes real, playable `course_audio`.**

Then, at `:101-103`, it names the exact unproven step:

> Worth a quick manual pass (see below) to confirm the review screen's "approve" action is the
> thing that actually creates the `course_audio` row, since this suite's 6-second smoke test
> didn't drive far enough into that screen to prove it.

The symptom was seen, correctly described, and given an explanation that made it look intended.
The explanation carried its own verification step, handed on as step 7 of a manual pass. That
step is where the 33 days went.

### 3. The one that put it in a table and marked it "n/a"

`docs/recording-upload-write-path-2026-08-11.md:18` —

> | P2 | Autocue **script** mode (new course, no clip yet) | `production-api.cjs:4410`, `:4423` |
> **neither** — no `course_audio` row is written at all | n/a | n/a | n/a |

and `:164` —

> **P2** writes no row, so nothing is keyed.

Why it read as a non-event is stated in the doc's own opening question, `:3-5`:

> Question: when a human whole-phrase take is uploaded for a phrase/lego that **already has a
> clip** (e.g. a glued/concatenated placeholder), what does the write path do to `course_audio`
> and its links?

Script mode was, by construction, the case with no clip to do anything to. The doc's five-point
verdict lists five real failures and P2 is not among them — correctly, for the question asked.

### 4. The one that noticed the consequence and filed it as timing

`docs/autocue-scoping-2026-08-10/whole-phrase-record-option-scoping.md:59-61`, a section heading
that is the bug's own name —

> ### 1.4 Upload writes no `course_audio` row
> … the server mints its own UUID (`:4423`), stores `mastered/{UUID}.mp3` … and writes **only**
> `recording_provenance`.

and at `:100`, where the consequence surfaces and is scoped away:

> Timing detail: pruning keys off `course_audio`, which script-mode upload does not write
> (§1.4). So pruning only reflects a session **after** a synthesis job has run. Within a
> session, and between a session and its synthesis run, nothing is pruned.

The absence was load-bearing enough to shape a paragraph, and it was read as *late*, not as
*never*. The doc had the mechanism that made "late" plausible — its own `:79` records the
register-takes phase upserting human `course_audio` from whole natural takes, with the engine's
comment *"A recorded whole-phrase natural take ALWAYS beats splicing it."* The filing existed.
It just needed someone to start a synthesis job.

### 5. The takes-vs-clips subtraction that was set up but not performed

`docs/pods/welsh-human-recording-state-of-the-nation-2026-08-07.md` has a section headed
**"5. Take → stored clip"** (`:118`) — the right unit, named. Its counting is all from
`course_audio` (`:141-149`, 27 + 22 pod clips). Then at `:128-129`:

> `audio_clip_signoffs` holds **0 rows** estate-wide. `recording_provenance` holds
> 142 rows estate-wide but **0** for either Welsh course.

That is a take count and a clip count on the same page. The subtraction was out of scope because
the doc's scope was Welsh, where the provenance figure was zero — so the 142 was reported and
passed over. As far as this study could establish, no document in the window ever ran
`count(recording_provenance)` against `count(course_audio where origin='human')` estate-wide.
That single query is what the fix's own commit message ended up running, on one course, on one
afternoon: 50 script takes, zero clips; 19 pod takes, nineteen clips.

### 6. The architectural frame that made "take → clip" invisible

Not a review, but it is why the reviews inherited the frame. `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md`
§5 is the canonical **"Human Recording Workflow"**. It depicts one lane — queue → claim → upload
— which starts from an existing clip's uuid, i.e. the regeneration lane. Its write list at
`:349-355` is:

> 1. Upload to S3: mastered/{uuid}.mp3
> 2. Update Supabase audio_samples
> 3. Insert recording_provenance
> 4. Update flag: recorded → needs_review
> 5. Emit 'recording_completed' WebSocket event

No `course_audio` insert appears anywhere in the canonical workflow — and step 2 names
`audio_samples`, which `CLAUDE.md` lists as a deprecated table. The one architecture document a
reviewer would open to learn what recording does models recording as *replacing a sample*, never
as *creating a clip*. Script mode does not appear in §5 at all.

---

## The shape of the blind spot

Every review in the window was pointed at a clip that already exists, and asked a quality or a
linkage question about it — is it clipped, is it the right voice, does it say what the row says,
does the right slot point at it, will regenerating it destroy it. That frame has a silent
precondition: that a clip exists to be examined. A take that never became a clip is not a bad
row in any of those audits; it is not a row at all, so it is invisible to every one of them, and
every count they produced looked complete because the missing thing was never in the denominator.

The three documents that did have the seam in frame each found the fact and each had a good
local reason to keep walking: one asked what happens to an *existing* clip, one asked whether the
*slow read* could be dropped, and one had a genuine downstream mechanism — the voice engine's
register-takes phase — that made the missing row read as deferred rather than absent. "The engine
files them later" was true. It was also the whole defect, because nothing made anyone start the
engine, and nothing anywhere said a take was waiting.

The cheap standing instrument this suggests is not another clip audit. It is one subtraction,
run estate-wide on a schedule: takes in `recording_provenance` minus human rows in `course_audio`.
It would have read 50 on the afternoon of 19 August, and zero on every day before Kai first
opened the studio.
