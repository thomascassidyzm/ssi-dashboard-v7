# Artefacts from job #380, and what they proved

Job #380 was dispatched on 2026-08-19 to verify the mic calibration in a real
browser. It died on an account limit before it could report, but it had already
written these files, and `probe-results.json` — its measurement of what
Chromium's audio chain actually delivers — **changed the conclusion of the whole
job**. They are kept for that reason.

They do **not** run as they stand. Its `fixture.js`, `make-mic-wav.js` and
`playwright.config.js` were overwritten by the parent session, which did not
know another agent had been working in the same directory. The three `.spec.js`
files here therefore import helpers that no longer exist. Nobody has tried to
reconstruct them; the working suite is `e2e/mic-calibration/`.

## What survived, and why it matters

`probe-fake-mic.js` asked the three questions the verification rested on, and
`analyse-probe.js` reads its output. Run:

```
node e2e/job-380-artifacts/analyse-probe.js
```

(It reads `probe-results.json` from this directory's copy or from
`e2e/mic-calibration/fixtures/`.)

The answers, measured at a 256-sample AnalyserNode read as time-domain RMS every
50ms — the exact instrument `useVAD.pollAudioLevel` uses:

**1. Chromium's AGC does NOT flatten the gain difference.** Written −14.0dB
between the two condition files; **−9.3dB still there** at the analyser. So
"phone" and "external" really are two different microphones as far as the
recorder is concerned, and every downstream claim about mic gain stands.

**2. The old fixed 0.02 gate leaves almost no margin on a quiet mic.** Voice
above the gate: 22.4dB on the phone, **7.8dB** on the external mic (raw). That
is the damage, and it is worse than the parent session's own replay estimated.

**3. A breath is 27–32dB below the voice — under ANY workable gate.** On all
four measured conditions the mid-phrase breath lands 6–11dB *below* where
`placeThreshold()` puts the gate. This is the finding that mattered: an 800ms
mid-phrase pause closes the take on both microphones, calibrated or not, and no
level placement can prevent it. At 800ms of quiet, "pausing" and "finished
reading" are the same signal. The cut-in-half symptom is a **duration**
question — `silenceDuration` — not a level one.

That last point is why `e2e/mic-calibration/` tests a 500ms breath and asserts
invariance across microphones, rather than claiming a level calibration saves a
long pause. It does not, and this directory is the evidence.
