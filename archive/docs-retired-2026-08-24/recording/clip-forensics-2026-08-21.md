# Clip forensics — is the loss at capture or at processing?

**Date:** 2026-08-21
**Question:** human recording takes on popty.app come back clipped often enough to be unusable. Is the audio being cut at CAPTURE time (never recorded) or at PROCESSING time (recorded, then trimmed away)?
**Method:** read-only. 154 archived takes pulled from S3 — both the untouched browser original (`raw/{UUID}.{ext}`) and the processed clip (`mastered/{UUID}.mp3`) — and measured with ffmpeg. No code changed.

---

## Verdict

**The loss is at CAPTURE. It is already in the raw archived bytes. Processing is not the culprit — it removes nothing but genuine trailing silence.**

| | |
|---|---|
| Head loss present in the RAW archived bytes? | **Yes** — 101/101 script-path takes |
| Median RAW head margin, script path (n=101) | **0 ms** (p90 = 0 ms, max = 50 ms) |
| Median RAW head margin, pod path (n=19, control) | **1530 ms** |
| Does processing remove materially more? | **No.** Mastered duration is a *median +43 ms LONGER* than the raw speech span. 1/154 takes lost >20 ms to processing. |

The two capture paths separate **completely** — no overlap at all. Every one of the 101 script-path takes has under 100 ms of head margin; every one of the 19 pod-path takes has over 200 ms.

But the mechanism is **not** the one in the working hypothesis, and that matters for the fix — see [Where the hypothesis was right and wrong](#where-the-hypothesis-was-right-and-wrong).

---

## 1. Population

`recording_provenance` rows whose `quality_notes` JSON carries a `raw_s3_key`. Raw archiving began 2026-08-14, so this is everything that can be examined:

| Date | Course | Voice | Mode | n |
|---|---|---|---|---|
| 2026-08-19 | `fin_for_eng` | `human_kai_fin` | script | 68 |
| 2026-08-19 | `fin_for_eng` | `human_kai_fin` | pod | 19 |
| 2026-08-19 | `deu_at_for_eng` | Sascha / unset | script | 29 |
| 2026-08-21 | `deu_at_for_eng` | Sascha / unset | script | 6 |
| 2026-08-21 | `zzz_test_for_eng` | `human_tom_zzz` | pod | 22 |
| 2026-08-14/16 | `zzz_test_for_eng` | `human_tom_zzz` | mixed | 10 |
| | | | **total** | **154** |

Both objects were fetched for all 154; all 154 raws decoded. **122 are real recordist takes** (excluding `zzz_test_for_eng`).

Two of the 35 `deu_at_for_eng` raws are `audio/mpeg` (mp3), not browser webm — they are not browser originals and are **excluded** from the headline figures, leaving **n=101** on the script path. They are noted as an anomaly in §6.

## 2. The distribution — raw head and tail margins

"Head margin" = time from file start to the first 10 ms frame whose RMS exceeds −40 dBFS. It is the room tone actually captured before speech.

### Script path — real recordists, browser webm/opus originals (n=101)

| Metric | Value |
|---|---|
| **Median raw head margin** | **0 ms** |
| head margin < 50 ms | **100 / 101** |
| head margin < 100 ms | **101 / 101** |
| head margin > 200 ms | **0 / 101** |
| p90 / max | 0 ms / 50 ms |
| **First 100 ms already at speech level** (within 10 dB of the file's own p95) | **95 / 101** |
| Median raw **tail** margin | 830 ms |
| tail margin < 100 ms | 13 / 101 |

Split by course, the picture is identical: `deu_at_for_eng` n=33, median head 0 ms; `fin_for_eng` n=68, median head 0 ms.

### Pod path — same speaker, same day, same upload route (n=19, `fin_for_eng` / Kai)

| Metric | Value |
|---|---|
| **Median raw head margin** | **1530 ms** |
| head margin < 100 ms | **0 / 19** |
| p90 / max | 1984 ms / 4560 ms |
| **First 100 ms already at speech level** | **0 / 19** |
| Median raw tail margin | 350 ms |

This is the control group that makes the finding safe. Same recordist, same session date, same browser upload endpoint, same raw-archive code. The only difference is which UI surface — and therefore which capture composable — recorded it. The separation is total.

### Onset shape — the direct test for "started mid-word"

A genuine utterance onset *ramps* from room tone to plateau over tens of ms. A file that *begins* at plateau lost audio before sample 0.

| | Script path (n=102) | Pod path (n=48) |
|---|---|---|
| Onset frame level relative to the plateau it reaches, median | −8.1 dB | −13.9 dB |
| Begins within 6 dB of plateau — no attack ramp at all | **42 / 102** | 9 / 48 |
| Has 100 ms of pre-onset room tone to measure a floor from | **0 / 102** | 41 / 48 (median floor −68.2 dBFS) |

**Not one of 102 script-path takes has even 100 ms of room tone before speech.** For genuine capture of a human who taps and then reads, that is not possible.

## 3. Processing is exonerated

For each take, comparing the mastered duration against the raw's *speech span* (raw duration minus its own head and tail silence):

| Metric | Value |
|---|---|
| Mastered duration − raw speech span, median | **+43 ms** |
| p10 / p90 | +0.1 ms / +84.6 ms |
| Takes where processing cut into the raw speech span (< −20 ms) | **1 / 154** (a `zzz_test` pod take, −259 ms) |
| Head margin change, mastered − raw, median | **+10 ms** (processing *adds* margin — mp3 encoder padding) |

Processing removes a median 780 ms from the tail. That 780 ms is the trailing silence the VAD deliberately kept (see §4) — it is silence, not speech. The mastered clips end with a median 10–15 ms tail margin, which is tight but is not eating speech.

**The `silenceremove` chain cannot be blamed. There is nothing at the head for it to remove — the head is already gone when the file arrives.**

## 4. Where the loss actually happens — the code

The clipped population is the **AutocueStudio script surface**, and it does not use a tap-driven recorder at all. `src/composables/useAutocueState.js:7` says so plainly: *"Script mode (new-course): continuous VAD-based recording with background uploads."*

`AutocueStudio.vue:528` wires `useContinuousRecorder`, which starts the encoder **only once the VAD has already declared speech**:

```js
// src/composables/useContinuousRecorder.ts:221
vad.onSpeechStart(() => {
  if (!isFlowMode.value || !mediaRecorder) return
  chunks = []
  segmentStartTime = Date.now()
  ...
  if (mediaRecorder.state === 'inactive') {
    mediaRecorder.start()          // ← encoder starts AFTER speech is detected
  }
})
```

There is **no pre-roll buffer of any kind** — no ring buffer, no lead-in. Audio before `onSpeechStart` fires is never in the recorder, so it cannot reach the raw archive. The head loss is structural, not intermittent.

Three lags stack up before the first byte is captured:

1. **The VAD threshold.** Onset requires time-domain RMS above `silenceThreshold`, default `0.02` = **−34 dBFS** (`useVAD.ts:107`). The comment at `useVAD.ts:449` confirms onset deliberately uses the absolute threshold. Every quiet onset consonant — /s/, /f/, /h/, a plosive release, a nasal — lives below that and is discarded.
2. **Poll lag.** `pollInterval: 50` (`useVAD.ts:110`) — the VAD only looks every 50 ms, so detection is 0–50 ms late, mean 25 ms. `analyser.smoothingTimeConstant = 0.5` (`useVAD.ts:279`) adds more.
3. **Encoder spin-up.** `MediaRecorder.start()` does not begin capturing when it returns.

**How much audio is that?** Measured empirically on the 41 pod takes, which carry real onsets from this estate's own voices with the lead-in intact — the time each onset takes to climb from audible up to the VAD's −34 dBFS trip point:

| Climbing from | median | p75 | p90 | max |
|---|---|---|---|---|
| −40 dBFS | 10 ms | 25 ms | 40 ms | 105 ms |
| −50 dBFS | **35 ms** | 65 ms | **120 ms** | 165 ms |

Add mean 25 ms of poll lag and encoder spin-up on top: **a realistic head loss of roughly 60–100 ms typical, 150–200 ms+ on a soft onset.** That is precisely the range that eats a plosive burst, a whole /s/, or the front of a nasal — audible as a clipped word, intermittent-seeming because it depends entirely on how softly each line happens to begin.

**The tail, by contrast, is fine at capture and the code says why.** `silenceDuration: 800` (`useVAD.ts:108`) keeps recording through 800 ms of silence before closing the take. The measured raw tail margins — median **830 ms** (fin) and **790 ms** (deu_at) — match that constant to within 5%. That agreement is also a check on this report's measurement pipeline: it recovers a known code constant from the audio.

## 5. Listen-equivalent — the three worst, first 240 ms

Per-10 ms RMS of the raw archived bytes. All three **open at full vowel level and decay** — the shape of a vowel already in progress, not of an onset.

**`91D0F7F9-40E9-41E2-8FF3-49B8406FDADE`** — deu_at, *"i versuch zum lernen, wia ma redt"*

```
   0ms  -11.0dB  █████████████     ← file starts HERE, at full level
  20ms  -12.4dB  █████████████
  40ms  -18.3dB  ██████████
  70ms  -25.7dB  ███████
 100ms  -30.3dB  █████
 140ms  -32.5dB  ████             ← vowel dies away
 160ms  -21.4dB  █████████        ← next syllable begins
```
The file opens inside the vowel of "i". The onset of the word is not in the file.

**`F56C8CBE-685F-48F2-BC98-FB4B30CB428B`** — deu_at, *"i wer mit wem aundern reden übn"*

```
   0ms   -9.0dB  ██████████████   ← starts at −9 dB, the loudest part of the take
  30ms   -9.6dB  ██████████████
  80ms  -16.0dB  ██████████
 120ms  -31.7dB  ████
 160ms  -18.8dB  █████████        ← next syllable
```

**`E1A680D2-9961-49AE-BA83-AFEEF4ADBE2A`** — fin, *"mä haluun puhua suomea niin usein kuin mahdollista"*

```
   0ms  -16.4dB  ███████████
  40ms   -9.9dB  ██████████████
  80ms  -12.0dB  █████████████
 140ms  -19.4dB  █████████
 200ms  -36.7dB  ███
```
This one is clipped at **both** ends: raw duration is 1980 ms for a 49-character Finnish sentence, and its tail margin is 0 ms. The initial /m/ nasal is missing and the take stops mid-utterance.

## 6. What distinguishes clipped from clean

**The capture path, and nothing else.** Course, voice, time of day and session all cut across the split; the path does not.

| Discriminator | Clipped (script) | Clean (pod) |
|---|---|---|
| Composable | `useContinuousRecorder` + `useVAD` | `useTapRecorder` |
| Surface | `AutocueStudio.vue` | `RecordistRoom.vue` / `PodLongTakeStudio.vue` |
| Recorder opens on | VAD speech-detected | recordist's tap |
| Raw blob mime | `audio/webm;codecs=opus` (n=102) | `audio/webm` (n=48) |
| Median raw head margin | 0 ms | 1530 ms |

The mime string is a reliable fingerprint for the path, because `useAutocueState` sets the Blob type explicitly from the requested `mimeType` while `useTapRecorder` takes it from the chunk. Every `audio/webm;codecs=opus` raw in the population is script mode; every plain `audio/webm` pod raw is clean.

Sessions confirm it — all five `fin_for_eng` script sessions have a median head margin of 0 ms, while the same speaker's pod takes that day have 1530 ms.

**A second, separate quality finding.** The two paths disagree about the microphone's own DSP:

```js
// useContinuousRecorder.ts:140  (the CLIPPED path)
audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
```
```js
// useTapRecorder.js:10  (the CLEAN path)
// "The mic's own DSP (echo-cancel / noise-suppress / auto-gain) is still
//  requested OFF — the single biggest quality lever"
```

Browser `noiseSuppression` actively gates quiet onsets, so the clipped path is also pushing soft onset consonants further below the VAD's trip point — the two defects compound. This is worth fixing on its own merits regardless of the pre-roll question.

### Explicit gaps

- **`recording_device` is NULL on all 154 rows**, as are `recording_environment` and `recording_location`. **No device / browser / OS breakdown is possible from this data.** The client is not populating those provenance fields. Mime type was used as a path fingerprint instead, which is a code-path discriminator, not a device one.
- **No Welsh recordist takes exist with raw archives.** The only real-recordist raws in the window are `deu_at_for_eng` and `fin_for_eng`. Welsh queues are not covered by this report.
- **Raw archiving started 2026-08-14**, so nothing before that can be examined this way. The 08-19/08-21 window requested is fully covered.
- **The pod control group is n=19, one speaker (Kai), one day.** Small. The separation from the script group is total (no overlap), and the mechanism is confirmed independently in the code, but a second pod recordist would strengthen it.
- **Two `deu_at_for_eng` raws are mp3, not browser webm** (`66FA5B20…`, `E7F55B7B…`, both Sascha). A raw archive is supposed to be the untouched browser original; an mp3 is not what any of these browsers produce. Their provenance is unexplained and they are excluded from the headline figures. Worth a separate look at how a take reaches the raw archive already transcoded.

## 7. Where the hypothesis was right and wrong

**Right, and decisively so:** the loss is at capture, not processing. It is in the raw archived bytes. The processing chain cannot be blamed — this report set out to refute that and could not.

**Wrong on the mechanism, in a way that matters right now.** The hypothesis named `useTapRecorder` — a new `MediaRecorder` per line, `start()` on the tap into `Next`, `stop()` on the next tap. That composable is real and that risk is real, but in the archive **`useTapRecorder` is the path that works**: 19/19 of its takes carry 1.5 s of room tone before speech, and 0/19 are clipped. Every clipped take in the archive came from the VAD-driven `useContinuousRecorder`, where the encoder is not started by a tap at all — it is started *after the VAD has already heard speech*, with no pre-roll.

**The consequence.** The fix already in flight on `fix/recorder-margins-2026-08-21` (commit `241431feb`, "record around the utterance, and stop asking for Next") changes `useTapRecorder.js`, `useTapRecorder.margins.test.js` and `RecordistRoom.vue`. It does **not** touch `useContinuousRecorder.ts`, `useVAD.ts` or `AutocueStudio.vue`:

```
$ git diff origin/main fix/recorder-margins-2026-08-21 --stat -- \
    src/composables/useContinuousRecorder.ts src/composables/useVAD.ts \
    src/components/production/autocue/AutocueStudio.vue
(no output — untouched)
```

That fix is sound on its own terms: starting a recorder on a tap *is* a latent cut at both edges, and closing it is cheap insurance. But measured against the archive, it hardens the path that was already clean and leaves the path that produced all 101 clipped takes exactly as it is. **If the AutocueStudio VAD path ships unchanged, the clipping Tom is hearing will still be there.**

## 8. What would fix the measured defect

Stated as findings, not as a change — no code was touched.

1. **Give the script path a pre-roll.** The encoder must already be running before the VAD decides. A rolling pre-buffer (MediaRecorder started once with a `timeslice`, keeping the last ~500 ms), or simply keeping the recorder running and cutting segments from a continuous stream with lead-in retained, removes the loss structurally rather than tuning around it. This is the same shape the in-flight tap-recorder fix adopts — it just needs to reach this path too.
2. **Stop letting the onset threshold define the take boundary.** `silenceThreshold` at −34 dBFS is a reasonable *detector* and a bad *cut point*. Detect at −34 dBFS, then cut from 150–200 ms earlier in the pre-buffer.
3. **Turn the mic DSP off on the script path** to match `useTapRecorder`, so `noiseSuppression` stops gating the onsets the VAD then fails to hear.
4. **Populate `recording_device`.** The client sends nulls; it made the device question unanswerable here and will do so again.

### Re-recording exposure

All 101 script-path takes in this window are affected to some degree — this is structural, not intermittent, and the 6/101 with a measurable head margin got it by luck of a loud onset. Whether a given take is *unusable* depends on how much of the first phoneme went missing; the 42/102 that begin within 6 dB of their plateau are the ones most likely to sound cut. Scoping a re-record queue is a separate decision and is not made here.

---

## Appendix — method and reproduction

- Population from `recording_provenance`, filtered to rows whose `quality_notes` JSON carries `raw_s3_key`; `s3_key` and `raw_s3_key` read from that JSON.
- Both objects fetched from `s3://ssi-audio-stage` with the repo's own credentials (`.env`), via `aws-sdk`.
- Each file decoded with `ffmpeg` to mono 48 kHz s16le and measured in-process: total duration; RMS of first/last 100 ms and 250 ms; per-frame RMS at 10 ms (margins) and 5 ms (onset shape); head/tail margin as the first/last frame above −40 dBFS; p50/p95 frame level; peak.
- Onset-climb figures measured on pod takes with a 25 ms sliding RMS window at a 5 ms hop, walking back from the −34 dBFS trip point to where the same onset first crossed −40 / −50 dBFS, discarding any onset not cleanly isolated (>500 ms climb).
- Scripts used (gitignored workspace, read-only): `scripts/cf/measure.cjs`, `scripts/cf/analyse.cjs`, `scripts/cf/onset.cjs`, `scripts/cf/lost.cjs`.
- **No code was modified and no S3 object or database row was written.**
