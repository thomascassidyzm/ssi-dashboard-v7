# Why one take saved out of a whole session — 2026-08-07

**Verdict: the silent-take guard is innocent. Do not roll it back.** The recorder
was never cutting your takes, so a whole read went up as a single file.

## What the production logs actually say

Source: `/home/tomcassidy/.local/log/popty-production-api.log` on watson-1
(`popty-production-api.service`, `StandardOutput=append:` — this is why
`journalctl` looks empty, it only carries systemd's own lines).

- **8 uploads reached the API during your session. All 8 succeeded** — every one
  processed, got an S3 object and a `Provenance recorded` line. No 422, no 500,
  no S3 failure, no network error.
- **The silent-take 422 guard fired exactly once all day**, and not on you: an
  834-byte / 0ms take from the e2e test fixtures. Threshold is 100ms after trim.
  Your shortest real take was 2,055ms — twenty times clear of it.
- 13 recording-script fetches for `fin_for_eng`, 8 for `deu_at_for_eng`, against
  8 uploads total across ~85 minutes of reading.

So the takes were not rejected. **They never left the browser as separate takes.**

## What actually happened

Three of your uploads are 72,465ms / 57,121ms / 53,615ms — around a minute of
audio each, on a per-phrase recorder.

I pulled your 72.5-second upload (`2A1472AC`) off S3 and measured it.
`silencedetect` finds **~24 separate utterances** in it, with real 0.6–4.1s gaps
between them. That one upload swallowed roughly two dozen takes. That is your
whole session, in one file, counting as one recording.

## The bug

`src/composables/useVAD.ts` decides when a phrase ends. It read the mic level
from `getByteFrequencyData` and compared it to `silenceThreshold` = 0.02.

`getByteFrequencyData` does not return magnitudes. It returns each frequency
bin's power mapped from `[minDecibels, maxDecibels]` — defaults −100dB..−30dB —
onto 0..255. Ordinary room tone at −70dBFS lands around byte 109, i.e. a "level"
of **0.43** — twenty times the threshold. For that reading to fall under 0.02,
every bin has to sit below about **−98.6 dBFS**: digital silence, a muted mic.

So on any live microphone the level was permanently "loud", `onSpeechEnd` never
fired, and `useContinuousRecorder` never called `mediaRecorder.stop()`. There is
no manual cut control in the studio — the VAD was the only thing that could ever
end a take. The recording just kept accumulating.

The 0.02 threshold was written for a **time-domain waveform RMS**. The code was
reading frequency-domain bytes. Unit mismatch, roughly 20dB hot.

`getUserMedia` here also sets `autoGainControl: true`, which drives room tone
*up* in the gaps — so a quieter room does not rescue it.

## Measured, on your own audio

Replaying your real 72.5s take through the exact VAD state machine:

| | min level | frames judged silent | segment cuts |
|---|---|---|---|
| **before** | 0.0250 over all 1450 polls | 0 / 1450 | **0** |
| **after** | room tone p50 0.0030 vs speech p95 0.227 | — | **14** |

Never once below threshold, before. 14 rather than 24 after is correct, not a
shortfall: `silenceDuration` is 800ms and several of your real gaps are
0.62–0.77s, so those utterances legitimately merge into one take.

Two of your short single-phrase takes (`26611BA2`, `0899880F`) cut **0** times
under the fix, so it does not over-segment inside a phrase.

How hot was the old reading? The same file needs **20dB of attenuation** before
the old code produces any useful cuts at all.

## Your "Speaking..." never changes — that IS this bug

That string is bound straight to `vad.isSpeaking` (`AutocueStudio.vue:130`). It
is set in `onSpeechStart` and cleared in exactly one place: the `onSpeechEnd`
branch that my measurement shows never executes. So a permanent "Speaking..." is
the take never being cut, watched live. Your symptom and the 72.5s blob are the
same event from two angles.

It also rules out the upload path: `queueUpload` is fire-and-forget into a
background queue and never gates the recorder's state machine, so no hanging or
silently-erroring request could produce this.

## Your idea: measure the room first — built

Branch also carries a calibration stage, because you are right that the deeper
problem is a *fixed* threshold being a guess about a room, and a guess that
lands under the noise floor loses a session with no error anywhere.

`startFlow` now listens for 1.5s before going live, takes the p90 of the level
(not the mean — one chair creak shouldn't set the floor), sets the threshold to
floor x 4 clamped to [0.01, 0.08], and shows "Listening to the room...". The
speech state machine is gated off while it measures. Afterwards it warns — only
on bad news — with what to actually do about it.

Bands are set where behaviour really changes, found by mixing noise into your
own 72.5s take at increasing levels and counting cuts:

| headroom | verdict | cuts |
|---|---|---|
| 52.7dB — **your actual room** | quiet | 12 |
| 26.2dB | ok | 14 |
| 18.5dB | **loud** (warn, still works) | 13 |
| 13.3dB | too-loud | 14 |
| 8.7dB | too-loud | **0** — the cliff |
| 4.3dB | too-loud | **0** |

The 14dB line is deliberately a shade conservative — it warns at 13.3dB where
segmentation still worked. Warning early costs you a line of text; warning late
costs a session.

The adaptive threshold holds segmentation across a **50x range of room noise**
(12-14 cuts from 52.7dB down to 18.5dB). No fixed constant does that.

**And note what your room measured: a 0.00053 noise floor, 52.7dB of headroom.
Genuinely quiet. This was never your microphone or your room** — even a room
that good could not get under a threshold that wanted -98.6dBFS.

## The fix

Branch `fix/autocue-vad-time-domain-2026-08-07`, commits `735ffbc2` + `6b7dfd21`.

- `useVAD.ts` measures a time-domain RMS via `getFloatTimeDomainData`.
- `AutocueStudio.vue` level meter gets a display gain (it was calibrated to the
  old inflated scale and would otherwise paint a third of the bar). The decision
  still uses the raw value.
- `useVAD.ts` / `useContinuousRecorder.ts` — the room-calibration stage above.
- `useVAD.test.js` — 8 tests pinning that the level comes from the waveform, that
  real room tone (0.004 RMS, measured from your take) ends a phrase, and that a
  300ms inter-word dip does not.

12/12 autocue tests pass, `vue-tsc` clean, `npm run build` clean.

**Not merged.** It is one merge to `main` away from live — the staleness watchdog
picks `main` up within 10 minutes.

## Two other things worth knowing

**1. Your recorded audio is not lost.** All 8 uploads are safe in S3 as
`mastered/<UUID>.mp3`. The three long ones hold your real reads; they are
multi-phrase blobs, so they need splitting to be usable rather than re-recording.
Say the word and I'll cut them at the utterance boundaries.

**2. The API restarted three times during your session** — 15:10, 15:50, 16:00 —
because the deploy-staleness watchdog auto-pulls `main` and restarts. Other
agents merged three times while you were recording. It did not cause this, but
an in-flight upload during a restart would die, and it is a bad property for a
live recording session to have. Worth a "recording in progress" hold.

## Explicit gaps

- I had no session id or course code from you, so I identified your requests by
  timestamp and by which courses were being read (`deu_at_for_eng` 15:10–15:50,
  then `fin_for_eng` 15:50 onward). If you were also recording something else,
  I have not seen it.
- The API log carries no timestamps per line. I placed events by bracketing them
  between service restarts, whose times systemd does record.
- I have not seen your browser console. The client-side story above is inferred
  from the code plus the measured audio, not from your devtools.
