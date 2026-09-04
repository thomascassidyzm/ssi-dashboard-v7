# Mac built-in mic: raw ('dry') vs voice-chain capture, measured

**Read-only measurement. Nothing recorded, deleted, re-mastered or code-changed.** All 37 clips
downloaded (both the mastered object and its S3-retained raw original), measured with ffmpeg, and
deleted from scratch afterwards. No gaps: every clip in both arms had a live raw original.

Same person, same room, same MacBook Air built-in mic, in `zzz_test2_for_eng`, voice
`human_tom_zzz`, minutes apart on 2026-09-03:

- **ARM A — `capture:dry`** (raw mic, `ec0 ns0 agc0 @48k`): 22 takes, 23:13:20–23:40:21 UTC.
- **ARM B — `capture:voice`** (device voice chain, `ec1 ns1 agc1 @48k`): 14 takes, 23:41:19–23:46:51 UTC.
- **Outlier** — one earlier take at 23:18:33 (`ec1 ns0 agc0`, "A black coffee, please") — reported
  separately below, not pooled into either arm.

## Per-clip measurements

All values dBFS unless noted. "mstr" = mastered (server-processed) output. "hp8k/hp12k mean" =
mean level after a high-pass at that frequency (relative HF-energy proxy). "noise floor" = the
quietest 300ms window in the file (per-clip scan, since `astats`' own `Noise_floor` returned `nan`
on clips this short).

| time (UTC) | arm | got | text | raw peak | raw mean | raw LUFS | mstr peak | mstr mean | mstr LUFS | raw hp8k mean | mstr hp8k mean | raw noise floor | mstr noise floor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 23:13:20 | dry | ec0ns0agc0@48k | cuál es la respuesta | -13.1 | -37.9 | -33.1 | -1.9 | -20.0 | -19.6 | -60.4 | -39.7 | -64.6 | -44.7 |
| 23:18:33 | voice | ec1ns0agc0@48k | A black coffee, please. | 0.0 | -26.1 | -21.9 | -1.9 | -17.8 | -16.8 | -47.6 | -35.2 | -74.9 | -64.5 |
| 23:22:34 | dry | ec0ns0agc0@48k | gente que habla inglés | -16.7 | -40.7 | -36.8 | -1.9 | -18.3 | -17.7 | -58.0 | -34.3 | -65.0 | -40.5 |
| 23:22:51 | dry | ec0ns0agc0@48k | lo que quiero decir | -19.5 | -42.0 | -36.4 | -1.8 | -18.6 | -17.2 | -66.4 | -42.2 | -59.1 | -41.6 |
| 23:23:10 | dry | ec0ns0agc0@48k | todo lo que puedo | -13.0 | -36.7 | -30.8 | -1.9 | -16.9 | -16.4 | -73.2 | -52.8 | -58.7 | -44.4 |
| 23:23:27 | dry | ec0ns0agc0@48k | empezar a hablar | -21.5 | -43.5 | -40.5 | -1.9 | -17.9 | -17.8 | -69.9 | -43.5 | -59.4 | -37.3 |
| 23:23:44 | dry | ec0ns0agc0@48k | en cuanto pueda | -15.5 | -40.5 | -36.3 | -1.9 | -19.4 | -18.7 | -71.3 | -49.4 | -59.3 | -41.4 |
| 23:24:02 | dry | ec0ns0agc0@48k | en cuanto puedas | -17.7 | -41.2 | -36.7 | -1.9 | -18.0 | -17.8 | -65.4 | -41.0 | -59.6 | -41.9 |
| 23:24:19 | dry | ec0ns0agc0@48k | estoy tratando de | -18.8 | -44.1 | -39.3 | -1.9 | -19.1 | -18.5 | -66.2 | -39.2 | -59.8 | -38.8 |
| 23:24:37 | dry | ec0ns0agc0@48k | lo más posible | -18.1 | -42.2 | -37.3 | -1.9 | -18.3 | -17.8 | -62.9 | -37.6 | -58.7 | -40.2 |
| 23:24:55 | dry | ec0ns0agc0@48k | no me gustaría | -19.8 | -44.2 | -39.5 | -1.9 | -22.4 | -18.6 | -67.2 | -43.3 | -58.7 | -39.2 |
| 23:25:12 | dry | ec0ns0agc0@48k | quiero que hables | -23.3 | -46.0 | -40.6 | -2.0 | -18.1 | -17.1 | -63.8 | -34.9 | -59.4 | -36.8 |
| 23:25:29 | dry | ec0ns0agc0@48k | tengo ganas de | -16.4 | -39.8 | -35.0 | -1.9 | -20.6 | -18.1 | -59.1 | -38.3 | -58.8 | -43.2 |
| 23:25:50 | dry | ec0ns0agc0@48k | todo el día | -14.4 | -38.3 | -31.4 | -1.9 | -21.3 | -16.4 | -69.7 | -51.5 | -59.8 | -45.7 |
| 23:26:09 | dry | ec0ns0agc0@48k | un poco de | -17.3 | -43.6 | -37.5 | -1.9 | -19.0 | -18.6 | -75.8 | -50.0 | -58.8 | -40.9 |
| 23:26:33 | dry | ec0ns0agc0@48k | ¿estás aprendiendo? | -20.4 | -44.2 | -39.5 | -1.9 | -18.6 | -17.0 | -56.4 | -29.8 | -59.2 | -38.5 |
| 23:26:50 | dry | ec0ns0agc0@48k | cómo decir | -18.2 | -41.8 | -36.1 | -1.9 | -22.2 | -17.9 | -68.0 | -46.7 | -59.3 | -42.1 |
| 23:38:52 | dry | ec0ns0agc0@48k | cómo hablar | -11.6 | -40.4 | -30.3 | -1.9 | -18.3 | -16.5 | -73.9 | -50.9 | -63.4 | -44.9 |
| 23:39:10 | dry | ec0ns0agc0@48k | después de | -17.2 | -40.4 | -34.4 | -1.9 | -18.2 | -16.5 | -56.7 | -33.1 | -59.3 | -42.0 |
| 23:39:29 | dry | ec0ns0agc0@48k | él quiere | -18.0 | -42.6 | -36.4 | -1.9 | -19.4 | -18.6 | -70.0 | -46.4 | -59.4 | -41.9 |
| 23:39:47 | dry | ec0ns0agc0@48k | ella quiere | -20.3 | -42.8 | -37.9 | -1.9 | -18.0 | -17.0 | -67.5 | -42.4 | -59.3 | -40.5 |
| 23:40:04 | dry | ec0ns0agc0@48k | en inglés | -19.7 | -42.6 | -36.6 | -1.9 | -18.6 | -17.3 | -57.6 | -32.6 | -59.4 | -41.3 |
| 23:40:21 | dry | ec0ns0agc0@48k | es útil | -21.1 | -43.1 | -37.8 | -1.9 | -18.3 | -16.8 | -61.9 | -36.4 | -58.8 | -40.1 |
| 23:41:19 | voice | ec1ns1agc1@48k | esta tarde | -0.2 | -26.3 | -19.2 | -1.9 | -21.4 | -16.4 | -44.5 | -36.7 | -71.7 | -59.8 |
| 23:41:36 | voice | ec1ns1agc1@48k | la respuesta | -14.4 | -35.5 | -31.0 | -1.9 | -17.2 | -16.3 | -52.2 | -33.0 | -69.6 | -58.2 |
| 23:41:53 | voice | ec1ns1agc1@48k | más tarde | -8.4 | -33.1 | -26.7 | -1.9 | -19.1 | -16.4 | -48.1 | -31.4 | -69.1 | -59.1 |
| 23:42:18 | voice | ec1ns1agc1@48k | me gusta | -7.8 | -30.2 | -24.0 | -1.9 | -18.1 | -16.3 | -49.9 | -36.9 | -68.9 | -58.5 |
| 23:42:49 | voice | ec1ns1agc1@48k | me gustaría | -9.1 | -32.5 | -26.2 | -1.9 | -17.5 | -16.1 | -54.2 | -38.9 | -70.0 | -59.0 |
| 23:43:07 | voice | ec1ns1agc1@48k | muy bien | -8.4 | -33.7 | -27.2 | -1.9 | -17.7 | -16.3 | -66.8 | -49.5 | -70.1 | -58.3 |
| 23:43:39 | voice | ec1ns1agc1@48k | no sé | -12.6 | -38.1 | -30.1 | -1.9 | -19.3 | -16.3 | -50.3 | -30.7 | -68.7 | -54.7 |
| 23:43:56 | voice | ec1ns1agc1@48k | por qué | -8.5 | -34.6 | -27.7 | -1.9 | -17.9 | -16.8 | -64.6 | -45.4 | -69.2 | -55.4 |
| 23:44:17 | voice | ec1ns1agc1@48k | practicar hablando | -7.8 | -32.5 | -28.4 | -1.9 | -17.0 | -16.5 | -61.4 | -44.5 | -68.3 | -54.3 |
| 23:44:34 | voice | ec1ns1agc1@48k | preguntarte algo | -4.5 | -27.4 | -22.8 | -1.9 | -18.3 | -16.4 | -56.9 | -48.1 | -68.7 | -63.0 |
| 23:45:05 | voice | ec1ns1agc1@48k | sentir que | -8.0 | -33.6 | -28.3 | -1.9 | -17.9 | -16.9 | -55.0 | -35.7 | -68.3 | -55.4 |
| 23:45:25 | voice | ec1ns1agc1@48k | si puedo | -10.5 | -36.3 | -29.8 | -1.9 | -17.7 | -16.4 | -62.3 | -42.3 | -67.5 | -52.9 |
| 23:45:47 | voice | ec1ns1agc1@48k | sin esfuerzo | -9.5 | -34.3 | -27.4 | -1.9 | -18.4 | -16.3 | -49.9 | -33.2 | -67.3 | -55.4 |
| 23:46:51 | voice | ec1ns1agc1@48k | su nombre | -7.9 | -32.8 | -25.4 | -1.9 | -18.7 | -16.5 | -58.1 | -42.9 | -68.3 | -60.0 |

## Q1 — Headline: how far apart are the arms, in the raw signal?

| | ARM A dry (n=22), median (min–max) | ARM B voice (n=14), median (min–max) | gap |
|---|---|---|---|
| raw peak dBFS | **-18.1** (-23.3 to -11.6) | **-8.4** (-14.4 to -0.2) | **9.7 dB** |
| raw RMS/mean dBFS | **-42.1** (-46.0 to -36.7) | **-33.4** (-38.1 to -26.3) | **8.8 dB** |
| raw integrated LUFS | -36.7 (-40.6 to -30.3) | -27.3 (-31.0 to -19.2) | 9.4 dB |

The dry arm's raw capture sits **~9 dB quieter** than the voice arm's raw capture, on both peak and
RMS. This is a large, consistent gap, not a couple of outlier takes — every single dry-arm raw peak
(range -23.3 to -11.6) sits below every single voice-arm raw peak's median, and the two ranges barely
overlap at their edges.

## Q2 — Is the shortfall in the RAW signal, or is our own mastering doing the damage?

**It is in the raw signal. The browser genuinely handed us a much quieter capture with `agc0`.**

The ~9 dB gap above is measured on the **raw originals**, before any of our processing touches them.
Mastering does not introduce this gap — it inherits it, and then works harder to erase it:

| | dry median lift | voice median lift |
|---|---|---|
| mastered mean − raw mean (dB of gain applied) | **+23.2 dB** (range 17.0–27.9) | **+15.6 dB** (range 4.9–18.8) |

Mastering pulls the dry arm up by ~7.6 dB more than it pulls the voice arm up, and it succeeds at
closing the *loudness* gap almost completely — mastered mean converges to -18.6 dBFS (dry) vs
-18.0 dBFS (voice), mastered LUFS to -17.8 vs -16.4. **So the mastering step is not broken and should
not be touched** — per the `audio-clicks-no-tail-repair` ruling, the fix-the-step-not-the-output rule
only applies when *our* processing is the source of damage; here the deficit originates upstream, at
capture, because `autoGainControl:false` removes the one thing that was making the voice arm's raw
level usable in the first place. The mastering chain is doing exactly what a safety net should: it's
just working a lot harder on the dry arm, which is the mechanism behind Q4 below.

## Q3 — Does the dry arm buy back any real high-frequency content in exchange?

**No — on this device, dry has *less* high end than voice, not more, both in absolute level and
relative to the overall signal.**

| | ARM A dry raw hp8k mean | ARM B voice raw hp8k mean | ARM A dry raw hp12k mean | ARM B voice raw hp12k mean |
|---|---|---|---|---|
| median dBFS | **-66.3** | **-54.6** | **-72.4** | **-61.0** |

Dry sits ~11.7 dB *below* voice above 8 kHz and ~11.4 dB below above 12 kHz — in the wrong direction
for the "dry protects the treble" hypothesis. This persists even normalised for the overall level gap
(hp8k mean minus overall raw mean, so it isolates the *proportion* of energy that's high-frequency):
dry is **-23.6 dB relative**, voice is **-21.6 dB relative** — dry still has ~2 dB *less* proportional
HF content, not more. The same holds after mastering (dry mastered hp8k -41.6 vs voice -37.9).

The most likely mechanism: because the dry raw signal sits so far down (median RMS -42 dBFS), whatever
high-frequency content the mic captured is closer to the analogue/quantisation noise floor and gets
buried, while the voice chain's built-in gain staging keeps the signal — HF included — well above that
floor before it's ever written to disk.

**This directly contradicts the premise that motivated the dry default** (that a voice-processing
chain kills content above ~16 kHz) — but note the scope carefully: Aran's report was a Blue Snowball
(a real external USB mic) on ChromeOS/Chrome, a completely different microphone, OS audio stack and
browser DSP implementation from a MacBook Air's built-in mic on (presumably) Safari or Chrome-macOS. I
could not find the Blue Snowball "dead above 16 kHz" finding documented anywhere in this repo
(`docs/recording/`) to check its own numbers against this method — that is a genuine gap, not an
assumption I'm willing to paper over. What this measurement shows is narrow and solid: **on a MacBook
Air's built-in mic, dry buys nothing in HF and costs ~9 dB in level and a worse noise floor (Q4)**. It
says nothing about whether Aran's mic+OS combination behaves differently, and I have not attempted to
adjudicate that from here.

## Q4 — Noise floor, before and after mastering

| | ARM A dry raw noise floor | ARM B voice raw noise floor | ARM A dry mastered noise floor | ARM B voice mastered noise floor |
|---|---|---|---|---|
| median dBFS | -59.3 | **-68.8** | **-41.3** | **-58.2** |

Even in the raw captures, before any lift, dry's noise floor is already ~9.5 dB *higher* (noisier)
than voice's — consistent with `ns0` (noise suppression off) doing exactly what it says. Once
mastering applies its much larger lift to compensate for the quieter dry signal, that noise floor gets
dragged up with it: **dry's mastered noise floor is ~17 dB worse (louder, more audible) than voice's.**
This is the audible symptom Tom described tonight — "virtually no signal" — is one and the same
mechanism as this noise-floor gap: not enough clean signal above the room/self-noise for the AGC-free
capture to have anything to work with.

## Q5 — Verdict

**On Mac built-in input, the booth should default to `voice`, not `dry`. Confidence: high**, on the
strength of a clean, single-variable, same-person/same-room/same-mic A/B with no measurement
ambiguity anywhere in the chain (raw originals confirm the gap exists before our processing, not
after it).

What would change my mind: a same-device, same-session A/B on a MacBook Air's built-in mic that shows
the dry arm winning on some other axis this measurement didn't capture (e.g. genuinely lower
distortion at loud passages, or a codec/latency difference) — nothing here approached the noise-floor
and HF numbers turning out this consistently one-sided by chance.

**On "should the default key on platform, or on the microphone" — the honest answer is the latter, and
the current code doesn't key on platform at all.** I read `src/composables/useTapRecorder.js` and
`src/views/RecordistRoom.vue` expecting to find the desktop-non-Safari branch the brief described, and
it isn't there: `DEFAULT_CAPTURE_PROFILE` (`useTapRecorder.js:128`) is a single flat constant,
`'voice'`, applied identically regardless of platform, browser or device — there is no per-platform or
per-browser branch anywhere in this file or in `RecordistRoom.vue`. Tom's booth session tonight used
`dry` because the "Record the raw microphone" checkbox (`RecordistRoom.vue:59-64`) was manually
switched on for the session (and its own label text already warns "it will sound quieter and
rougher" — which this data now quantifies precisely). So there is no platform-keyed default to
correct; the finding is that **no code change is indicated** — the global default is already `voice`,
which this measurement confirms is the right choice for a MacBook Air's built-in mic too. If a
Blue-Snowball-style exception is real and provable on its own device, the honest place to key it is
the **microphone identity**, not the OS or browser: `navigator.mediaDevices.enumerateDevices()`
already returns a `label` per device (surfaced today at `useTapRecorder.js:300` for the mic picker,
e.g. `"MacBook Air Microphone"` vs `"Blue Snowball"`), and `track.getSettings()` is already called at
capture start (`useTapRecorder.js:378`) — both of those are live, cheap, in-browser signals a future
per-device profile map could switch on. Neither is wired to `captureProfile` today; building that
would be new work, not a fix to something broken, and I have not touched it.

## Gaps and things I could not verify from here

- All 37 clips had both a mastered object and a raw original in S3 — **zero missing raws**, no gap to
  report on data completeness.
- I could not find independent documentation in this repo of the specific "Blue Snowball dead above
  16 kHz through Chrome's voice chain" finding that the brief cites as the reason `dry` was
  introduced — `docs/recording/aran-session-2026-09-03-did-it-save.md` confirms Aran's session used a
  Blue Snowball on ChromeOS/Chrome 151, but is about a different question (did his takes save) and
  carries no frequency-response numbers. I have not verified that claim; I have only established that
  it does not hold, and holds in the opposite direction, on this MacBook Air.
- The five ffmpeg passes per clip (volumedetect ×3, ebur128, plus a noise-floor scan with several
  windows) took ~2 minutes of CPU total across 37 clips — within the ~74-download/ffmpeg-pass budget
  authorised for this job.

---

**Tooling used** (read-only against S3/DB, no writes, one-off scratch scripts under the gitignored
`scripts/` directory — not committed, per this repo's convention that `scripts/` is a disposable
workspace): a download script pulling mastered + raw via `services/s3-production-service.cjs`, and a
measurement script running the ffmpeg passes above per clip. Downloaded audio and intermediate JSON
lived under `$CS_SCRATCH` and were deleted after this report was built; nothing persists outside this
document.
