# Aran's Welsh north Pod 1 takes: all 100 marked, and the gate that stops the next batch

**2026-08-23.** Welsh north Pod 1 (`cym_n_for_eng:pod-0` in the data — Tom's naming:
"Pod 1 is now the name for what was the old POD 0 with only 142 lines").

---

## The headline

**None of Aran's takes are salvageable. All 100 of them need recording again.**

That is Tom's ruling, by ear, not a measurement:

> "Aran's are all junk. All clipped badly at either or both ends"

and, on whether to sift them:

> "None are salvageable. It's not even worth looking. We have a better process now.
> Let's be sure this time though."

So no per-clip audit was run. Every one of the 100 is marked bad-for-rerecord in
provenance, the reason on each row is his ruling in his own words, and each row says
explicitly that no per-clip measurement lies behind it.

**The number is 100, not the 87 in the brief.** 87 counts the target side only. Aran
also voices 13 known-side (English) lines on this pod. His ruling is about the
recordist, not the side.

| | |
|---|---|
| `human_aran_cym_n` | 78 |
| `human_aran_cym_n_2` | 22 |
| **Aran clips attached to Pod 1** | **100** |
| Marked bad-for-rerecord | 100 / 100 |
| Catrin clips on the same pod | 4, untouched |
| Aran clips in the course but not on the pod | 37, left unmarked |

---

## What was actually wrong, and where it happened

Aran's clips were recorded on **2026-06-15/16 and 2026-08-10**. The server's recording
chain cut takes **flush against the speech** at both ends until commit `5102c0780`
("cut a margin outside the read, not at the level gate") landed on **2026-08-21**.
Every one of Aran's takes predates that fix. That is the mechanism, and the dates
alone establish it.

A boundary measurement on eighteen of the clips — taken while building the gate
below, not as an audit — agrees with Tom's ear exactly:

| clip | lead margin | tail margin |
|---|---|---|
| Catrin, "Bore da. Sut wyt ti?" — the read Tom called perfect, mastered *after* the fix | **0.35 s** | **0.41 s** |
| Aran, 16 decodable clips, both voices, both recording days | **0.00 – 0.08 s** | **0.015 – 0.264 s** |

Thirteen of the sixteen begin at frame zero. The separation from the known-good take
is a factor of four at its narrowest.

**Two of the eighteen would not decode at all** — `9DC61FE3-…` and `BFF8C769-…` fail
with "Failed to find two consecutive MPEG audio frames", the header-only-stub
signature. They are attached to live pod sentences and are silent to a learner. They
are marked with the rest; flagged here because that is a *different* defect from
clipping and nothing on the estate was reporting it.

### Why the 2026-08-14 QC pass said the opposite

`docs/pods/cym-n-recording-qc-2026-08-14.md` headlines: "All 111 of his Welsh takes
are technically clean — every one decodes, none is silent, none has a dead tail, and
the levels are more consistent than most TTS output on this estate."

That is not a contradiction of Tom and it was not wrong about what it measured. It
measured **decode, silence and level**. It never measured whether speech runs up
against the first or last sample. A truncated take has a perfectly respectable speech
span and healthy levels — the VAD's own header says so. Different instrument needed,
which is the rest of this document.

---

## The fix

### 1. A boundary gate on the live upload path

`services/recording-speech-gate.cjs` → `checkTakeBoundaries`, wired into
`POST /api/production/:courseCode/recording/upload` in `services/production-api.cjs`.

It measures the room outside the read at each end against a **near-speech line 10 dB
under the take's own speech level** — a ratio inside one file, never an absolute dB.
That matters because automatic gain control lifts a quiet room to voice level, which
is exactly what defeated every level gate on Catrin's empty takes the same afternoon.
No absolute threshold appears anywhere in it.

**Threshold: 0.10 s at each end.** Chosen from the two real populations, not from
taste: above every clipped clip measured (worst front margin 0.08 s) and under a third
of what the server's own trim leaves on a healthy take (0.35 s). It takes a genuinely
flush boundary to fire.

Three outcomes, never two — `pass` / `refuse` / **unchecked**. A missing decoder, a
file ffmpeg cannot read, or a take with too little dynamic range for the near-speech
line to mean anything all come back unchecked and are **logged and let through**. An
infrastructure absence must never cost a recordist a good read. Refusal happens
**before the S3 PUT**, so a refused take orphans no bytes, and its raw original is
already archived.

What the recordist sees, in their own terms:

> That take starts right on your first word, so the beginning of it is cut off. It
> hasn't been saved — press record, take a breath, then read the line again.

### 2. What was deliberately NOT done: padding

Bolting synthesised silence onto the front of the read was the obvious cheaper move
and is rejected on purpose. Silence in front of an **amputated consonant** makes the
clip look unclipped to every downstream check while sounding exactly as wrong to a
learner. It would hide this defect rather than catch it. Nothing server-side can
invent audio the microphone never heard; the only honest repair is to read it again.

`services/audio-processor.cjs` now reports the margin it **achieved**
(`trimLeadMarginSec` / `trimTailMarginSec`) rather than only the one it asked for, and
warns when the capture had less room to give than the trim wanted — so a
clipped-sounding clip is diagnosable from the row without re-measuring the audio.

---

## The acceptance evidence

**Unit tests** — `services/recording-speech-gate.test.cjs`, 16 → **26 passing**. The
new ten pin the arithmetic on built signals: margins measured at both ends, a flush
start, a flush end, and the same shape 30 dB quieter throughout returning the same
margins (the AGC invariance that is the whole design). They also pin the operating
point against the real numbers: the threshold must sit above Aran's roomiest clip and
under a third of the good take's margin, so a future threshold change fails here
first.

**Real S3 bytes** — `tools/recording/validate-boundary-gate-aran.cjs`, the same shape
as the Catrin validator. Seven real objects, downloaded and decoded:

```
EA7C2D31 (catrin, the read Tom called perfect) -> pass=true   lead 0.35s  tail 0.41s   ✅
CAB438EF (aran 2026-06-15) -> refused  truncated_at_both_ends  lead 0.08s  tail 0.018s ✅
75E4BED0 (aran 2026-06-15) -> refused  truncated_at_both_ends  lead 0.00s  tail 0.015s ✅
AAEEC3AD (aran 2026-08-10) -> refused  truncated_at_both_ends  lead 0.00s  tail 0.022s ✅
159B1BC1 (aran 2026-08-10) -> refused  truncated_at_both_ends  lead 0.00s  tail 0.020s ✅
8B5EBE6C (aran 2026-06-15) -> refused  truncated_at_start      lead 0.03s  tail 0.264s ✅
B112F5A4 (aran 2026-06-15) -> refused  truncated_at_both_ends  lead 0.00s  tail 0.036s ✅
```

**Live HTTP, through the real handler.** A second instance of the patched
production-api was run on port 3491 with deliberately invalid AWS credentials, so
nothing could be written anywhere. Real `POST
/api/production/cym_n_for_eng/recording/upload` calls with real take bytes:

| take | HTTP | verdict |
|---|---|---|
| Catrin's good take | **500** — died at the deliberately-broken S3 PUT, i.e. **both gates let it through** | not refused ✅ |
| Aran `75E4BED0` | **422** `speech_truncated_at_both_ends` | refused before the PUT ✅ |
| Aran `CAB438EF` | **422** `speech_truncated_at_both_ends` | refused before the PUT ✅ |
| Aran `8B5EBE6C` | **422** `speech_truncated_at_start` | refused before the PUT ✅ |

No pod row, no `course_audio` row and no S3 object was written by any of it. The live
`popty-production-api` on 3470 was not touched or restarted.

### What is now impossible that was possible this morning

A take whose speech runs off the front or the back of the file can no longer be saved
through the upload path. That is the defect that produced all 100 of Aran's clips.

### What this does NOT cover — stated plainly

- **It does not judge whether the right words are in the take.** Whisper cannot referee
  Welsh — measured twice on this estate: it failed Catrin's genuinely good take at CER
  0.50 and hallucinated fluent Welsh onto 96 seconds of an empty room. No ASR verdict
  is used here and none should be added without new evidence.
- **It does not catch a word clipped in the MIDDLE of a take**, or a mispronunciation,
  or a false start followed by a good read.
- **It cannot see a take clipped by more than a boundary's worth** — if the recordist
  cut off the first whole word and left a beat before the second, the margin is
  healthy and the gate passes it.
- **It does not retro-scan the estate.** It gates new uploads only. Legacy clips
  elsewhere with this defect are still there and unreported.
- **It cannot check every take.** Undecodable bytes and takes with under 12 dB of
  dynamic range come back unchecked and are let through — logged, never refused.
- **The thresholds are defaults fitted on one language and twenty clips.** Say so
  wherever they travel.

---

## What was left alone, deliberately

- **`listening_pod_sentences.rerecord_wanted` was not written.** The commission says no
  re-record triggered. Worth knowing: **95 of the 231 pod rows already carry it**,
  and most of those already name `human_aran_cym_n` as the target — the queue is
  largely populated already, which is not what the brief assumed. Setting the
  remainder is a one-liner if Tom wants it.
- **No audio and no row deleted, no pointer moved.** `course_audio` and
  `listening_pod_sentences` untouched.
- **Catrin's four takes on this pod are untouched.** Her three empty ones still carry
  only job #101's mark; the good one carries none.
- **37 Aran clips in the course but not attached to the pod are unmarked.** Same
  recordist, same sessions, same pre-fix chain, so the same defect near-certainly
  applies — but Tom's ruling was about the recordings he listened to on Pod 1, and
  the mark's own text quotes him saying so. Marking them would put words in his mouth
  about clips nothing currently points at.

## The deviation to know about

The brief said Aran's clips have **zero** `recording_provenance` rows and that this
job would therefore have to INSERT all of them. That came from joining on
`upper(course_audio.id)`. `recording_provenance` keys on the take's **S3-key uuid**,
which for these clips is a different uuid — `course_audio` `09BA841F-…` is served from
`mastered/57AF73F2-….mp3`. **92 of the 100 already had provenance rows** and were
updated exactly as the Catrin precedent did. Only **8** were created, each with only
fields evidenced from `course_audio` (`recorded_at` from the clip's own `created_at`,
`recorded_by` from the address the other 92 rows of the same sessions carry) and a
note on the row saying it was created rather than recorded.

---

## Files

- `services/recording-speech-gate.cjs` — `checkTakeBoundaries`, `boundaryMargins`
- `services/recording-speech-gate.test.cjs` — 26 tests
- `services/production-api.cjs` — the gate wired in before the S3 PUT
- `services/audio-processor.cjs` — achieved-margin reporting
- `tools/recording/validate-boundary-gate-aran.cjs` — real-bytes validator
- `tools/recording/mark-aran-clipped-takes-2026-08-23.cjs` + dry-run and applied logs
