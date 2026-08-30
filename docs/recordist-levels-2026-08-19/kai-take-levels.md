# Kai's recordist takes — audio levels measured

**Measured 2026-08-19.** 68 raw takes — every one of Kai's takes that has a raw archive. Measurement only: no code changed, no audio written, no commits.

## What was measured, and from what

- **Source of audio:** the **raw** `raw/{UUID}.webm` objects in `ssi-audio-stage` — the untouched MediaRecorder blob, not the mastered mp3. The mastered mp3s are loudnormed (raw p50 0.05 → mastered p50 0.17, ~3× gain), so they are useless for this question.
- **Why the raw blob is the right proxy:** in `src/composables/useVAD.ts` (read from `origin/main`) `startListening` does `source.connect(analyser)` straight off the MediaStream — **no GainNode anywhere** — and MediaRecorder records that same stream. What the VAD saw is what the webm holds, modulo Opus.
- **Frame RMS:** decoded via ffmpeg to mono 48 kHz f32, then RMS over **256 samples (`analyser.fftSize`) once every 50 ms (`pollInterval`)** — the VAD's actual measurement, not a 50 ms frame. 50 ms-frame figures were computed too and agree with these to within a few percent on p50/p95.
- **Dips** are runs of consecutive polls below a threshold, counted **only between the first and last above-threshold poll**, so leading and trailing room tone are excluded — these are mid-phrase dips by construction.
- **Room floor** is measured off each take's own leading and trailing silence, not a percentile of the whole file.
- Code read from `git show origin/main:<path>` throughout (this working tree is ~543 commits behind main). Provenance read by direct SQL through `.env.psql`.

## Sessions

Kai's raw-archived takes fall into four `script_session_id` clusters on 2026-08-19:

| | Session id | Window (UTC) | raw takes |
|---|---|---|---|
| **A** | `…205612` / `…361235` | 12:23:34 – 12:28:05 | 27 |
| **B** | `…756923` | 17:16:02 – 17:18:58 | 21 |
| **C** | `…697136` | 18:21:40 – 18:22:54 | 10 |
| **D** | `…520615` | 18:35:27 – 18:36:34 | 10 |

## Session summary

| Session | Cadence | n | speech p50 (med) | speech p95 (med) | room p50 (med) | headroom dB | worst mid-phrase dip <0.01 | trailing silence (med) | takes ending with ≤50 ms trail |
|---|---|---|---|---|---|---|---|---|---|
| A | natural | 14 | 0.0595 | 0.1385 | 9.3e-4 | 36 | 350 ms | 750 ms | 1 |
| A | slow | 13 | 0.0572 | 0.1296 | 2.7e-3 | 26 | 1350 ms | 800 ms | 0 |
| B | natural | 10 | 0.0403 | 0.0911 | 1.6e-8 | >80† | 300 ms | 850 ms | 0 |
| B | slow | 11 | 0.0454 | 0.0901 | 1.4e-45 | >80† | 2200 ms | 900 ms | 0 |
| C | natural | 9 | 0.0584 | 0.1090 | 3.9e-3 | 24 | 800 ms | 50 ms | 5 |
| C | slow | 1 | 0.0543 | 0.1428 | 2.7e-3 | 26 | 1700 ms | 450 ms | 0 |
| D | natural | 5 | 0.0483 | 0.1232 | 8.5e-5 | 55 | 150 ms | 800 ms | 0 |
| D | slow | 5 | 0.0479 | 0.1019 | 8.9e-5 | 55 | 1300 ms | 800 ms | 0 |

## Every natural-cadence take

Natural cadence is the case the hypothesis is about: `expectedChunks = 1`, and reading `pollAudioLevel`, `chunksSeen` is incremented **before** `stillToCome` is evaluated. So the first pause reaching `chunkPauseDuration` (400 ms) immediately exhausts the chunk budget and the 4000 ms `interChunkSilenceDuration` tolerance never applies. **A natural take is cut by any 800 ms dip below threshold, full stop.**

| Sess | Time (UTC) | Cad | dur ms | speech p50 | speech p95 | room p10 | room p50 | headroom dB | dips<0.01 n/max ms | dips<0.02 n/max ms | dips<0.25·p95 n/max ms | trailing silence ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 12:23:34 | natural | 3600 | 0.0585 | 0.2442 | 2.1e-3 | 2.9e-3 | 26 | 0 / 0 | 1 / 50 | 6 / 150 | 750 |
| A | 12:23:48 | natural | 2400 | 0.0516 | 0.1212 | 3.2e-3 | 3.8e-3 | 23 | 2 / 50 | 4 / 50 | 5 / 200 | 900 |
| A | 12:24:01 | natural | 3540 | 0.0572 | 0.1308 | 2.4e-3 | 2.8e-3 | 26 | 2 / 100 | 4 / 100 | 9 / 150 | >80† |
| A | 12:24:14 | natural | 3000 | 0.0518 | 0.1589 | 2.5e-3 | 3.0e-3 | 25 | 3 / 50 | 4 / 100 | 5 / 300 | >80† |
| A | 12:24:27 | natural | 1800 | 0.0918 | 0.1351 | 3.0e-3 | 3.5e-3 | 28 | 1 / 150 | 2 / 200 | 2 / 200 | 900 |
| A | 12:25:30 | natural | 1980 | 0.1400 | 0.2690 | n/a | n/a | n/a | 1 / 50 | 2 / 50 | 5 / 200 | 0 |
| A | 12:26:08 | natural | 2580 | 0.0624 | 0.2052 | 2.2e-4 | 4.3e-4 | 43 | 1 / 50 | 5 / 50 | 6 / 150 | 500 |
| A | 12:26:20 | natural | 4260 | 0.0444 | 0.0854 | 2.6e-4 | 4.5e-4 | 40 | 5 / 100 | 8 / 150 | 9 / 150 | 700 |
| A | 12:26:36 | natural | 5040 | 0.0674 | 0.1130 | 4.4e-4 | 9.3e-4 | 37 | 4 / 350 | 10 / 400 | 13 / 400 | 750 |
| A | 12:26:55 | natural | 4440 | 0.0536 | 0.1385 | 5.6e-4 | 8.8e-4 | 36 | 4 / 300 | 6 / 450 | 10 / 450 | 750 |
| A | 12:27:13 | natural | 3540 | 0.0743 | 0.1823 | 3.9e-4 | 6.1e-4 | 42 | 3 / 50 | 4 / 100 | 7 / 100 | 750 |
| A | 12:27:26 | natural | 3720 | 0.0631 | 0.1558 | 3.1e-4 | 6.3e-4 | 40 | 3 / 150 | 4 / 150 | 8 / 200 | >80† |
| A | 12:27:41 | natural | 4320 | 0.0595 | 0.1286 | 2.5e-4 | 4.6e-4 | 42 | 5 / 50 | 7 / 100 | 9 / 150 | 650 |
| A | 12:27:57 | natural | 3900 | 0.0439 | 0.1271 | 1.7e-3 | 4.6e-3 | 20 | 8 / 250 | 13 / 250 | 14 / 300 | 200 |
| B | 17:16:02 | natural | 3120 | 0.0356 | 0.0558 | 3.7e-7 | 3.6e-6 | 80 | 4 / 300 | 7 / 300 | 5 / 300 | >80† |
| B | 17:16:13 | natural | 3480 | 0.0403 | 0.0872 | 3.3e-6 | 4.7e-5 | 59 | 6 / 150 | 8 / 150 | 8 / 150 | >80† |
| B | 17:16:30 | natural | 3120 | 0.0328 | 0.0843 | 1.4e-45 | 1.4e-45 | >80† | 3 / 100 | 6 / 150 | 6 / 150 | >80† |
| B | 17:16:46 | natural | 4500 | 0.0337 | 0.1119 | 1.4e-45 | 9.0e-6 | 71 | 7 / 150 | 10 / 150 | 10 / 300 | 900 |
| B | 17:17:07 | natural | 4200 | 0.0305 | 0.0773 | 1.4e-45 | 1.4e-45 | >80† | 9 / 100 | 14 / 200 | 14 / 200 | >80† |
| B | 17:17:25 | natural | 4260 | 0.0474 | 0.0916 | 1.4e-45 | 1.4e-45 | >80† | 6 / 150 | 9 / 350 | 10 / 350 | >80† |
| B | 17:17:47 | natural | 3900 | 0.0494 | 0.0911 | 1.4e-45 | 1.4e-45 | >80† | 5 / 150 | 5 / 150 | 5 / 150 | >80† |
| B | 17:18:02 | natural | 4620 | 0.0337 | 0.0872 | 1.4e-45 | 1.6e-8 | >80† | 6 / 150 | 11 / 200 | 10 / 350 | >80† |
| B | 17:18:33 | natural | 4080 | 0.0440 | 0.0913 | 1.4e-45 | 1.4e-45 | >80† | 7 / 150 | 9 / 200 | 10 / 200 | >80† |
| B | 17:18:49 | natural | 4140 | 0.0440 | 0.0994 | 2.7e-7 | 1.3e-5 | 71 | 7 / 100 | 9 / 300 | 10 / 300 | >80† |
| C | 18:21:40 | natural | 1260 | 0.1571 | 0.2743 | 3.1e-3 | 4.1e-3 | 32 | 1 / 550 | 2 / 550 | 0 / 0 | 50 |
| C | 18:21:48 | natural | 1320 | 0.0583 | 0.1064 | 1.4e-3 | 1.5e-2 | 12 | 4 / 100 | 3 / 300 | 3 / 300 | 0 |
| C | 18:21:53 | natural | 4980 | 0.0269 | 0.0773 | 1.4e-3 | 2.0e-3 | 23 | 5 / 650 | 4 / 1050 | 4 / 1000 | 1350 |
| C | 18:21:57 | natural | 1500 | 0.0459 | 0.1062 | 1.8e-3 | 2.7e-3 | 25 | 0 / 0 | 1 / 50 | 1 / 100 | 650 |
| C | 18:22:02 | natural | 1800 | 0.0455 | 0.1020 | 2.6e-3 | 3.9e-3 | 21 | 2 / 100 | 3 / 150 | 3 / 150 | 600 |
| C | 18:22:09 | natural | 2880 | 0.1023 | 0.2055 | n/a | n/a | n/a | 4 / 100 | 5 / 250 | 5 / 300 | 0 |
| C | 18:22:45 | natural | 2160 | 0.0785 | 0.1551 | n/a | n/a | n/a | 3 / 150 | 4 / 150 | 4 / 350 | 0 |
| C | 18:22:49 | natural | 1980 | 0.0584 | 0.1090 | 3.9e-4 | 7.9e-4 | 37 | 1 / 800 | 0 / 0 | 0 / 0 | 600 |
| C | 18:22:54 | natural | 2400 | 0.1523 | 0.1743 | n/a | n/a | n/a | 1 / 100 | 1 / 150 | 7 / 150 | 0 |
| D | 18:35:27 | natural | 4680 | 0.0532 | 0.1229 | 4.9e-5 | 1.1e-4 | 54 | 6 / 150 | 6 / 250 | 7 / 350 | >80† |
| D | 18:35:44 | natural | 3360 | 0.0457 | 0.1232 | 4.7e-5 | 6.2e-5 | 57 | 1 / 50 | 6 / 100 | 11 / 100 | >80† |
| D | 18:35:58 | natural | 3240 | 0.0441 | 0.0961 | 1.3e-4 | 4.4e-4 | 40 | 3 / 50 | 4 / 100 | 6 / 150 | >80† |
| D | 18:36:11 | natural | 2880 | 0.0483 | 0.1350 | 4.9e-5 | 7.2e-5 | 57 | 2 / 100 | 3 / 150 | 5 / 200 | >80† |
| D | 18:36:24 | natural | 3720 | 0.0599 | 0.1316 | 5.9e-5 | 8.5e-5 | 57 | 0 / 0 | 5 / 50 | 11 / 100 | >80† |

†  Where the room gated to digital zero, headroom is unbounded and the printed dB is meaningless; shown as >80 dB. The room p50 column carries the real information there.

## Verdict

**REFUTED as stated — but its premise is confirmed, and the numbers point at the opposite clamp.**

### The gain premise is confirmed, and it is not new

`SPEECH_RMS_REFERENCE = 0.23` is meant to be ordinary speech p95 through this pipeline. Across all 68 raw takes Kai's speech p95 has a **median of 0.113** (range 0.056 – 0.274), and speech p50 a median of **0.052**. His voice runs **2–4× below that constant in every session, including all the sessions that worked**. The constant is wrong for his chain generally; it is not a new-microphone symptom.

### But the 0.01 floor is not what is cutting him

The gate has to be held for 800 ms continuously to cut. On natural takes it does not come close:

- Worst mid-phrase sub-0.01 dip on a natural take, **by session: A 350 ms, B 300 ms, C 800 ms, D 150 ms.**
- **1 of 38** natural takes in the whole corpus has a mid-phrase sub-0.01 dip that reaches 800 ms (18:22:49, exactly 800 ms) — **and that take was not truncated**: it runs 1980 ms and ends with 600 ms of trailing room tone.
- Even in session B, the quietest session, speech p50 sits **12.1 dB above** the 0.01 gate. The dips stop ~500 ms short of the fuse.

### The truncation is real, is confined to session C, and is not a VAD silence cut

Judged structurally, not by ear. `useContinuousRecorder` calls `mediaRecorder.stop()` **inside** `vad.onSpeechEnd`, which fires 800 ms *after* the silence begins, and nothing trims the blob. **So every VAD-terminated take necessarily carries ~800 ms of trailing room tone.** Sessions A, B and D all do — median trailing silence 750 / 850 / 800 ms. Textbook closes.

Session C does not:

- **Five of its nine natural takes end with 0–50 ms of trailing silence** — the signal is still live when the file stops.
- All five are fragments. `"Mä en voinut kuvitella, että mulla olisi täsmälleen sama ongelma"` was attempted six times at natural speed in 29 seconds, at **1.26 / 1.32 / 4.98 / 1.50 / 1.80 / 2.88 s** — only the 4.98 s read is a complete sentence. `"Mä asuin täällä päin vuosia sitten ennen kuin me muutettiin"` three times at 2.16 / 1.98 / 2.40 s.
- Session C's speech level is the **highest** of the three later sessions (p50 0.058) and matches session A, which worked fine. The truncation does not track gain.

Whatever ended those five takes, it was **not** the threshold-and-800 ms-silence mechanism the hypothesis names — that mechanism cannot produce a blob with no trailing silence.

### The clamp the numbers actually expose is the ceiling, not the floor

`threshold = clamp(noiseFloor × 4, 0.01, 0.08)`. Two measured facts collide here:

1. In session B the room floor measures **1e-5 down to 1e-45** — Chrome's default `getUserMedia({audio: true})` noise suppression gating room tone to literal digital zero (28–47 % of polls are exactly 0.0 in several takes). `noiseFloor × 4` is then ~4e-5, so **calibration does nothing at all** and the threshold simply clamps up to the 0.01 floor.
2. But when calibration's 1.5 s happens to catch a breath or handling noise — which a close-in external mic picks up readily — `noiseFloor × 4` lands at **0.05–0.08**. And **22 of 68** of Kai's takes have a speech p95 below 0.10; **3 of 68** have a speech p95 **below 0.08 entirely**. Take 17:16:02 has speech p95 = **0.0558**.

A calibration that clamps to `MAX_THRESHOLD = 0.08` makes take 17:16:02 **completely inaudible to the VAD** — every poll below threshold, speech never detected at all. That is a session-killer rather than a mid-phrase nibble, and it is the failure mode Kai's measured levels genuinely expose. The comment on `MAX_THRESHOLD` in `useVAD.ts` names this risk out loud; the numbers say his voice sits inside it.

### One thing the numbers say loudly about slow cadence

**23 of 30** slow takes have mid-phrase sub-0.01 dips of ≥800 ms (median 1250 ms, worst 2200 ms). Slow reads survive only on the `interChunkSilenceDuration` tolerance, and that tolerance is spent the moment `chunksSeen` reaches `expectedChunks`. Slow cadence has essentially no margin under the current gate — independent of anything to do with the microphone.

## Gaps — what I could not measure

1. **No microphone attribution exists anywhere.** `recording_provenance.recording_device`, `recording_environment` and `recording_location` are **NULL for all 114 of Kai's rows**. Nothing in the take payload, the webm container (all tagged `encoder=Chrome`) or the DB records which mic was used. The A/B/C/D split above is **inferred from timestamps and acoustics only** — I cannot state which of these is the phone and which is the new external mic. Everything downstream of that inference is labelled by session, never by device.
2. **No raw archive exists before 2026-08-14**, so the entire 2026-08-07 session (24 takes) has **no level measurement possible** — mastered mp3s only, and those are loudnormed.
3. **The 16:16–16:21 session (13 takes) has no `raw_s3_key`** in its provenance either, so it is unmeasured for level too. Its mastered durations are consistent with the same phrases elsewhere, i.e. no visible truncation, but that is a much weaker statement than the raw-level analysis.
4. **I did not listen to the audio or transcribe it.** The truncation judgement (item 5 of the brief) is structural: trailing-silence length against the ~800 ms a VAD close must leave, plus take duration against a complete read of the same sentence by the same speaker. I did not verify by ear or by ASR that the cut lands mid-word.
5. **I could not reproduce a live cut.** The raw blob is what survived the cut, so by construction the silence that triggered it sits at the blob's end; replaying the state machine over a blob cannot recover the cut that produced that blob.
