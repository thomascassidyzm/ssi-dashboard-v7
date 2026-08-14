# T-20 — Aran's clipped Welsh recordings: what happened, and do the originals survive

**Date:** 2026-08-14 · **Status:** diagnosis complete, read-only, nothing changed
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
are affected, and Aran's practical exposure is roughly **one session's worth of
clips**, not his whole body of work. Exact figures below.

---

## 2. The butcher, named and measured

`services/audio-processor.cjs:894-902`, inside `processRecordingBuffer` — the
only function the human-upload endpoint calls:

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

The `-40 dB` threshold makes it worse than the headline number at quiet edges:
anything below −40 dBFS is discarded *before* the 100 ms counter even starts, so
Welsh word-final fricatives and unvoiced stops lose more than 100 ms.

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

### How many of the 107 actually lost speech

Of the 81 clips from Aran's May-August sessions, measured individually:

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

**a. Stop the bleeding (one-line, verified).** Change the human chain to the
`start_silence` form already proven correct in `pod-explainer-composite.cjs`,
or drop `trimSilence` for human takes entirely. Long-take recording cuts lines
on the recordist's tap, not on a VAD, so the raw blobs already have clean
boundaries and need no trimming at all. The tone test above verifies the fix
loses nothing. Cheap, reversible, and it protects every future session.
*Note the coupled guard:* the `MIN_TAKE_MS = 100` silence check at
`production-api.cjs:4562` was calibrated against the aggressive trim — it stays
valid but its rationale comment will be stale.

**b. Re-record the 107, not the estate.** No process can restore audio that was
never written to disk. The 107 clips are one bounded ask of Aran — the
per-clip damage list is computed and can be handed over as a work list, so he
re-reads only what was actually cut, in the order he recorded it.

**c. Do not touch the 39,182 legacy clips.** They are clean. Any "repair" pass
over them would be the make-before-break rule broken for no reason.

**Nothing above has been applied.** No file was reprocessed, no object deleted,
no row updated. The fix in (a) is a proposal awaiting Tom's go.

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
