# T-20 — Aran's clipped Welsh recordings: what happened, and do the originals survive

**Date:** 2026-08-14 · **Status:** diagnosis complete · pipeline fix applied and live · no audio reprocessed
**Trigger:** Tom listened to the 12 cym_n takes on T-20 and reported them all badly clipped.

---

## The two answers, up front

**1. Do the originals survive? No.** The unmastered voice-actor bytes were never
stored anywhere — not on S3, not in the database, not on disk, not in the
browser. They existed only in memory inside a single HTTP request and were
overwritten by the processed result. This is not a deletion that can be undone;
there is nothing to restore from.

**2. Did a trim step butcher them? Yes — and Tom's instinct was right about the
step, though not about where it came from.** The Human Recording chain runs an
ffmpeg silence trim that discards **exactly 100 ms of real audio off the front
and 100 ms off the back of every take**, measured, not inferred. It is not a
stray import from the TTS chain: it was written for human recordings on day one,
with the wrong ffmpeg parameter.

**The relief:** the damage is bounded. It is **not** the 40,000-clip Welsh
estate. Only takes uploaded through the recording studio since the step landed
are affected, and it re-cuts by voice role into **92 lines for Aran and 15 for Catrin**.
Exact figures below — and note that 26 of the 107 turn out not to be clipped at
all, but silent.

---

## 2. The butcher, named and measured

`services/audio-processor.cjs:894-902`, inside `processRecordingBuffer` — the
only function the human-upload endpoint calls. **This is the code as it stood
before the fix**; it has since been corrected (see the repair path below):

```js
if (trimSilence) {
  filters.push('silenceremove=start_periods=1:start_threshold=-40dB:start_duration=0.1');
  filters.push('areverse');
  filters.push('silenceremove=start_periods=1:start_threshold=-40dB:start_duration=0.1');
  filters.push('areverse');
}
```

`services/production-api.cjs:4526` calls it with `trimSilence: true`,
unconditionally, for every human take.

### Why this destroys audio

The parameter is wrong. In ffmpeg's `silenceremove`, **`start_duration` is the
amount of non-silence that must accumulate before trimming stops — and
everything before that point is thrown away**, including the audio that proved
it was not silence. `start_duration=0.1` therefore discards the first 100 ms of
real sound. The `areverse` sandwich applies the identical destruction to the
tail.

The correct parameter for "trim silence but keep the speech" is `start_silence`,
which specifies how much silence to *retain*. **The estate already uses the
correct idiom elsewhere** — `services/pod-explainer-composite.cjs:154` uses
`start_silence=0.04`. The human chain is the odd one out.

### Measured, not argued

A 1.000 s 440 Hz tone padded with 0.5 s of silence at each end, through the
exact production filter strings:

| filter applied | output duration | verdict |
|---|---|---|
| none (input) | 2.000 s | 1.000 s of tone inside |
| head trim only | 1.400 s | should be 1.500 s — **100 ms of tone destroyed** |
| tail trim only (`areverse` pair) | 1.400 s | **100 ms of tone destroyed** |
| both, as in production | **0.799 s** | the 1.000 s tone is now 0.799 s — **201 ms gone** |
| the correct `start_silence=0.04` form | 1.080 s | tone intact + 40 ms silence each side — **zero loss** |

On real speech (one of Aran's own takes, re-padded and re-run) the chain ate
206 ms beyond the padding — the same 100 ms per edge.

The `-40 dB` threshold adds to this at quiet edges: anything below −40 dBFS is
discarded *before* the 100 ms counter even starts. That effect is real at the
filter level but small once the audio is encoded — quantified in "The residue"
below, where it measures 7-8 ms through the actual MP3 output. The 100 ms per
edge is the substance of the damage.

The codebase already half-knew. A comment at `production-api.cjs:4560` reads:
*"the trim is aggressive — a synthesised 350 ms tone comes out the far side at
150 ms"*. That is this bug, observed, worked around with a minimum-duration
guard, and never fixed.

### Confirmed against the clips Tom actually heard

Measuring the 22 clips published on T-20: **18 of 22 begin at more than half
their own median speech loudness** — the file starts mid-word, with no onset.
**16 of 22 end the same way.** One ends at 2.7× its median: cut mid-vowel.

The contrast against the legacy estate is total:

| cohort | abrupt onsets | abrupt offsets |
|---|---|---|
| pre-trim cym_n human clips (random 12) | **0 / 12** | **0 / 12** |
| Aran's T-20 clips (all 22) | **18 / 22** | **16 / 22** |

Every pre-trim clip starts and ends in true digital silence (edge RMS ≈ 0.000).
The old recordings are clean. The new ones are cut.

### Not a distortion problem

"Clipped" here means *truncated*, not *overdriven*. Digital clipping across the
22 clips is negligible (max 0.01 % of samples at full scale). Nobody needs to
touch `loudnorm` or the limiter.

---

## 1. The originals, in detail

The upload handler (`services/production-api.cjs:4441`) does this and only this:

1. `Buffer.from(audioData, 'base64')` → the raw WebM lives in a local variable;
2. hands it to `processRecordingBuffer`, which writes it to an `mkdtemp` scratch
   directory;
3. that directory is `rm -rf`'d in a `finally` block, every time, success or failure;
4. **only the processed MP3 is PUT to S3.** The raw buffer is never uploaded,
   never written to a durable path, never referenced again.

Every location checked, and what it said:

| Location | Result | Evidence |
|---|---|---|
| S3 — whole bucket | **ABSENT** | `ssi-audio-stage` fully enumerated: **5,147,716 objects, zero** `.webm/.ogg/.m4a/.wav/.opus/.flac`. Not one raw container exists in the estate. |
| S3 — prefixes | ABSENT | All 11 top-level prefixes enumerated (`audit-archive/ backups/ demo-splices/ exports/ info/ mastered/ mastered-v2/ probe/ repair-candidates/ staging/ voicelab/`). No `raw/`, `originals/`, `incoming/`, `uploads/`. |
| S3 — versioning | Enabled, **but irrelevant** | `GetBucketVersioning` → `Status: Enabled`. Versioning only preserves *overwrites*, and each take is written to a fresh key — Aran's takes have exactly one version each. There is no earlier version because the original was never PUT. |
| DB — `course_audio` | ABSENT | 19,914 `origin='human'` rows for cym_n; every `s3_key` points at the processed `mastered/{uuid}.mp3`. No raw-key column exists. |
| DB — `recording_provenance` | ABSENT | Schema has no field for a pre-processing key. `quality_notes` JSON carries `s3_key` (the mastered key) and `replaced_s3_key: null` — the "replaced" key, where present, is a previous *processed* clip. |
| Local disk | ABSENT | No surviving `/tmp/ssi-recording-*`. 30-day sweep for raw containers under `/home/tomcassidy` found only e2e fixtures and unrelated TTS probes. Prod checkout has no uploads directory. |
| Browser | ABSENT | `useAudioUpload.ts` holds the blob in memory and base64s it straight into `fetch`. The retry queue is a plain JS array — gone on reload. No IndexedDB, OPFS, file-picker or download path in any recording component. |

**The only gap:** whether Aran's own device or browser kept a private copy is
outside anything the code or the estate can answer. Worth one question to him —
it is the sole remaining chance of a pristine source.


---

## The tail question — chain walked, and the answer is no second bug

Tom's ear said the ends were clipped worse than the beginnings, and asked whether
the tail is trimmed by a separate pass that might still carry the destructive
parameter. It is a separate pass. It does not still carry it — but the ear was
right about the ends, for a reason the first measurement missed. Both below.

**How the tail is trimmed.** There is no `stop_periods`/`stop_duration` anywhere.
The tail is the *same* filter applied to reversed audio — `trim, areverse, trim,
areverse` — so the second `silenceremove` is the tail pass. Both passes are built
from one string, and the landed fix replaced both together.

**Proved in isolation**, not inferred from the round trip. Input: a 1.000 s tone
with padding on the TAIL ONLY, so anything the head pass does is invisible:

| tail pass | output | tone surviving | verdict |
|---|---|---|---|
| input | 2.000 s | 1.000 s | 1.000 s of pad after the tone |
| **fixed** (`start_silence`) | 1.050 s | **1.000 s** | pad removed, **nothing eaten** |
| old (`start_duration`) | 0.900 s | 0.899 s | **100 ms of tone destroyed** |

The tail pass demonstrably ran (it removed 950 ms of padding) and took none of
the speech. **Verified live on the served bytes too**: a tail-padded take through
the running service came back at 1.050 s with the full 1.000 s tone and 45 ms of
tail retained — 955 ms of pad removed. The 45 ms in the earlier test did come
through the real tail-trim path.

### The residue, measured rather than assumed

The parameter was only half the mechanism. The other half is the `-40 dB`
threshold: real speech *decays through* it at a phrase end, so a decaying tail
can be classed as silence. On a synthetic worst-case word (soft onset, decaying
tail) at the filter level, the old settings lost 163 ms of head and 191 ms of
tail, and raising retention to 0.30 s brought both to zero.

**But that gain does not survive the real pipeline, so it was not shipped.**
Driving the actual `processRecordingBuffer`, whose output is a 128 kbps MP3:

| measurement floor | speech lost, retention 0.05 | retention 0.30 |
|---|---|---|
| −30 dBFS | 2 ms | 2 ms |
| −40 dBFS | 0 ms | 0 ms |
| −45 dBFS | 7 ms | 0 ms |
| −60 dBFS | 8 ms | 0 ms |

The difference is **7–8 ms of material below −45 dBFS** — which the MP3 encode
does not faithfully carry anyway. Raising retention would have added 250 ms of
silence to both ends of every future clip to buy that. It fails on cheaper and on
simpler, so retention stays at 0.05 and **no second fix was landed**.

What did land is a **tail-specific regression test**. The two passes are separate
strings, so an edit can fix or break one side alone — which is precisely the
failure Tom was pointing at. The new case pads only the tail and fails at 0.893 s
if that pass reverts, verified by reverting just that pass. A second case asserts
a silent take still collapses under the handler's 100 ms floor, so the 834-byte
empty-stub hole cannot be reopened by a future retention change.

### Head versus tail — the ear was right, and my first measurement was wrong

Two first-pass measurements said the heads were damaged worse: waveform edge RMS
(1.79 head vs 1.27 tail, head louder in 55 of 81, p = 0.0017) and ASR first-word
loss (61/81 vs 28/81). Reported honestly, they contradicted what Tom heard.

They were the wrong measurement. Both ask *how loud is the audio at the cut*,
which is not what "cut off" sounds like. The estate already has the right
instrument — the tail-integrity detector in `services/audio-repair-core.cjs`,
whose `releaseMs` measures **how fast speech falls from −10 dB to −50 dB relative
to the clip's own peak**, with a measured boundary of **≤30 ms = heard as cut
off**. Running that, and mirroring it onto the head as an `attackMs`, against a
control set of undamaged pre-trim cym_n clips:

| | undamaged control (n=40) | damaged (n=81) | change |
|---|---|---|---|
| median ATTACK (head) | 35 ms | 5 ms | −86 % |
| head flagged steep | **17 / 40 (43 %)** | 70 / 81 (86 %) | ×2 |
| median RELEASE (tail) | **165 ms** | **10 ms** | **−94 %** |
| tail flagged steep | **0 / 40 (0 %)** | **59 / 81 (73 %)** | **0 → 73 %** |
| trailing silence after speech | 130 ms | 5 ms | — |
| leading silence before speech | 65 ms | 0 ms | — |

**This is why the beginnings sound fine and the ends sound wrong.** A natural
speech onset is *already* steep — 43 % of undamaged clips flag at the head, that
is simply how speech starts — so a clipped head still sounds like a head. A
natural speech ending is *never* steep: **not one** of the 40 undamaged clips
flags at the tail, because real speech decays over ~165 ms. In the damaged clips
that decay is 10 ms. The phrase hits a vertical wall where it should fall away.

So the ear was reading deviation-from-natural, and the edge-RMS measure was
reading absolute loudness. On the question that matters — what a listener
notices — **the tail is the damaged edge**: 0 % → 73 % on the estate's own
"heard as cut off" flag, against a head that was half-flagged before the bug
ever touched it.

None of this changes the fix or the lists: both edges lose 100 ms, and all 81
clips need re-recording either way. It changes which defect the re-records should
be checked against by ear, and it is the reason the tail verdict had to be
settled before anyone records.

---

## Blast radius

Affected = uploaded through the recording studio after the trim landed
(commit `12ccdc56`, 2026-01-19). Counted by reading the `audioProcessing`
metadata stamped on each S3 object, which records `trimSilence: true` on exactly
the takes that went through the chain.

**This is a complete census, not a sample.** All **42,038** `origin='human'`
clips in the estate were individually HEAD-checked on S3, zero errors:

> `FULL SCAN COMPLETE. 42038 human clips estate-wide.`
> `TRIMMED (butchered): 113 {"zzz_test_for_eng":6,"cym_n_for_eng":107}`
> `untouched: 41925  errors: 0`

**113 clips carry the trim, estate-wide. 107 of them are real (all cym_n); the
other 6 are test rows.** Every other human recording on the estate — all 41,925
of them, in every other course — is untouched.

| Course | human clips post-2026-01-19 | **butchered** | untouched |
|---|---|---|---|
| cym_n_for_eng | 778 | **107** | 671 |
| cym_s_for_eng | 676 | 0 | 676 |
| cym_anthem_for_jpn | 354 | 0 | 354 |
| deu / spa / ita / nld / ara / por | 443 | 0 | 443 |
| zzz_test_for_eng | 6 | 6 (test data) | 0 |
| **every other course on the estate** | — | **0** | all |

The 671 "untouched" cym_n rows created after the cut-off are database rows for
objects bulk-uploaded in 2025 — their S3 objects carry no processing metadata
and predate the studio path entirely.

**So: 107 real clips in cym_n, plus 6 test rows. Not 19,914. Not 40,000.**
The 39,182 legacy Welsh human clips (cym_n + cym_s) predate the step and are
clean — confirmed by both metadata and direct measurement.

### How many of the 81 real clips actually lost speech

Of the 81 clips that contain real audio (the other 26 are the empty stubs
described below), measured individually:

- **80 of 81 (99 %)** lost real speech at an edge;
- **70 of 81 (86 %)** are severe — the edge sits at or above the clip's median
  speech level, i.e. cut mid-vowel;
- **1** had its 100 ms fall in genuine silence and survived intact.

This is not a subtle degradation on a handful of takes. Where the recordist
tapped tightly around the phrase — which is what a good recordist does — the
chain took a bite out of the word.

---

## Safe repair path

Reprocessing from originals is **not available** — there are no originals. What
remains:

**a. Stop the bleeding — ✅ DONE, live on watson-1 (2026-08-14 16:49Z).** The
human chain now uses `start_silence=0.05`, the form
`pod-explainer-composite.cjs` has always used. Merged to `main` (`7178b34a`,
`cfcdddc2`), prod checkout pulled, `popty-production-api` restarted.

Verified end-to-end against the **served bytes**, not just the response: a real
upload through the running service returns **1099 ms where the old chain gave
799 ms**, and the S3 object contains the full 1.000 s tone with 55 ms of lead-in
and 45 ms of tail retained — the padding is still trimmed, the speech is not.

Locked in by `services/audio-processor-trim.test.cjs`, which drives the real
`processRecordingBuffer` over a real WebM/Opus payload and fails at 0.794 s if
anyone reintroduces `start_duration`. Full suite green: 1,237 tests, 70 files.

*Coupled guard, also updated:* the `MIN_TAKE_MS = 100` silence check in
`production-api.cjs` had a comment documenting this bug as a property to work
around ("a 350 ms tone comes out at 150 ms"). The guard is unchanged and still
correct — it now has *more* headroom than when it was written — but the comment
now says so.

**b. Re-record the 107 — split by VOICE ROLE, not by upload account.**

Tom's ground truth for Welsh human recording: **Aran records all male voices,
Catrin records all female voices, for both cym_n and cym_s.** The upload-account
split reported earlier (63 aran@hey.com / 44 thomas.cassidy) is an artefact of
which login was open, not of who spoke, and must not be used as a work plan.
Re-cut against the course's own `voice_config.podCast`, which maps every pod
character to an actor and a gender:

| recordist | lines | clipped (Welsh target) | empty stubs (English known) |
|---|---|---|---|
| **Aran** (all male characters) | **92** | 81 | 11 |
| **Catrin** (all female characters) | **15** | 0 | 15 |
| | **107** | 81 | 26 |

Work lists: `rerecord-list-aran.csv`, `rerecord-list-catrin.csv` in this
directory — one row per line, with the character, the track, the pod sentence id
and the text.

**The account split was an artefact, confirmed acoustically.** Median fundamental
frequency, measured per clip:

| set | n | median F0 |
|---|---|---|
| reference: Aran, unbutchered cym_n clips | 15 | **131 Hz** |
| reference: Catrin (her only recordings, cym_anthem_for_jpn) | 15 | **182 Hz** |
| the 63 uploaded under aran@hey.com | 63 | 151 Hz |
| the 44 uploaded under thomas.cassidy | 18 real (26 are empty) | **141 Hz** |

The "Tom" clips are not a third voice: 26 of the 44 contain no voice at all, and
the remaining 18 sit at 141 Hz — a male voice in the same range as Aran's and
nowhere near Catrin's. Tom's reading is confirmed: a failed or test session under
whichever account was logged in. *Caveat:* nine of the 81 real clips measure
167-198 Hz, overlapping the bottom of Catrin's range. They are all male-cast
characters on questions and animated lines, where rising intonation lifts median
F0, so the likeliest reading is the same speaker — but F0 alone cannot settle
those nine, and I have not had a human ear on them.

**A second, worse defect surfaced while doing this: 26 of the 107 are not
clipped, they are EMPTY.** Each is exactly 834 bytes — a header-only MP3 that
ffprobe cannot decode at all, the same silent-take signature the `MIN_TAKE_MS`
guard was later added to catch. Every one is an English (`known`) line, and all
15 of Catrin's are in this group.

So the earlier "107 clipped clips" framing was wrong in an important way:

- **81 clips are clipped** — real audio, 100 ms bitten off each end;
- **26 clips are silent** — no audio at all, and a learner reaching them hears nothing.

**The 26 stubs are the complete set, verified.** All 19,914 cym_n human clips
were HEAD-checked on S3, zero errors: exactly 26 are under 2 KB, and they are
these 26. No other silent clip is hiding in the course.

> `SWEEP DONE. 19914 cym_n human clips. Under 2KB (empty stubs): 26. Errors: 0`

**Catrin has never recorded in cym_n at all.** She has 35 clips estate-wide, all
in `cym_anthem_for_jpn`. Her 15 lines here are empty stubs, so for her this is a
first recording, not a re-record.

**c. Do not touch the 39,182 legacy clips.** They are clean. Any "repair" pass
over them would be the make-before-break rule broken for no reason.

**Status:** (a) is applied, merged and live. (b) and (c) are untouched — no
audio was reprocessed, no object deleted, no course_audio row updated. The
re-record scheduling for the 63 + 44 clips sits with Tom.

---

## What made this expensive to see

The step's own commit message describes it as a feature — *"Trim silence from
start/end (-40dB threshold)"* — and it does trim silence. It also trims 100 ms
of speech, and nothing in the pipeline measures that. The refusal guards added
later (`REFUSED unprocessed`, `REFUSED silent/empty`) both treat the aggressive
trim as a given to be worked around rather than a defect to be fixed. A gate
that measured edge energy on the *output* would have caught this on day one; it
is the same lesson as the veracity work — verify the served bytes, not the
intent of the filter.

---

## Before anyone records: the two things that had to be true

**1. The recordist must hear the STORED clip, not their own microphone.**
Checked and it was not true. `useAutocueState.js` previewed a `blob:` URL of the
local capture, and `PodLongTakeStudio.vue` — the studio these pod-0 re-records
actually use — had **no playback at all** in 797 lines. A raw preview sounds
perfect while the stored clip is being butchered, which is precisely how this bug
survived months of recording.

Now: playback resolves through one module that returns the URL *and* its label
together, so they cannot drift. An uploaded take plays
`GET /api/production/audio/:uuid/stream` labelled **STORED**; a take that has not
uploaded is either disabled or labelled **RAW LOCAL**. The pod studio offers no
raw fallback whatsoever. Verified independently of the build: the bytes that
route serves are **byte-identical to the S3 object** (18,389 bytes,
md5 `78bd6cd5…`), and the deployed popty.app chunks carry the labels. The first
re-records now self-verify the fixed trim by ear.

**2. The raw take must be kept.** It now is. Every upload archives the original
to `raw/{UUID}.{ext}` — same uuid as the mastered clip, so clip → original is a
string swap — **before** processing, so even a take the server goes on to refuse
keeps its original, while the existing refusals still fire before the mastered
PUT so `mastered/` never collects orphans. The pointer is recorded three ways:
`raw_s3_key` in `recording_provenance`, `rawKey` as S3 user-metadata on the
mastered object, and `rawKey` in the response including both refusal responses.
Verified live: uploaded 20,500 bytes, md5 `40575ad4…`; the object at `raw/…webm`
is byte-identical. Cost is noise — mean raw 236 KiB, so 10,000 takes is 2.25 GiB
≈ $0.06/month.

**What this repairs is the deeper fault, not just this bug.** Every destructive
step in this chain previously had no undo and no ear on it. Now the destruction
is reversible (the original survives) and audible (the recordist hears the
result). Either one alone would have caught T-20 in its first session.
