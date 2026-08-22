# Where the clipping was on Tom's own surface — and the two fixes

**2026-08-21.** Measured, fixed, deployed, re-measured. Read-only throughout on
Tom's takes: nothing of his was reprocessed, re-mastered or deleted.

## The short version

There were **two separate defects**, on two different surfaces, and only one of
them had been found before this pass.

| | Script surface (AutocueStudio) | Tom's surface (`/r/:voiceId`) |
|---|---|---|
| Capture | VAD started the encoder **after** hearing speech | recorder always running, 1.3–4.7 s of lead-in captured |
| Raw archive | head margin 0 ms, 101/101 takes | head margin 1.3–4.7 s, clean |
| Mastered clip | cut at capture, nothing to recover | **cut here** — 5–40 ms of room, onset gone |
| Fix | pre-roll + overlapping handover + mic DSP off | trim detects the read and cuts 350 ms outside it |

The earlier forensics (`clip-forensics-2026-08-21.md`) was right that capture was
losing audio — on the script path, decisively. It could not have seen the second
defect, because on Tom's path capture is fine and the loss happens downstream.

## What was measured on Tom's 22 takes

Pulled from the raw archive and the mastered objects, both read-only, and
measured with the same method the forensics used (per-10 ms RMS, −40 dBFS
crossing).

- **Raw head margin: 1.3–4.7 s on every take from 2026-08-21.** Room floor
  −75 to −88 dBFS. Nothing was lost at capture.
- **Mastered head margin: 5–40 ms on every one of them.** The clip starts flush
  against the word.
- On several takes the onset was still climbing well below −40 dBFS when the
  gate cut:

  | take | −40 dBFS at | audible from (−50 dBFS) | onset discarded |
  |---|---|---|---|
  | "maybe tomorrow, I think" | 1115 ms | 740 ms | **375 ms** |
  | "that is very kind of you" | 2525 ms | 2000 ms | **525 ms** |
  | "is there somewhere I can sit" | 1870 ms | 1380 ms | **490 ms** |

That is the front of the word, and it was thrown away in processing.

## Why lowering the gate was not the fix

Tried and measured before choosing. At −60 dBFS the same takes stop on a click,
a chair or a false start seconds before the read and keep everything after it:
one 2.4 s read came out **10.9 s long**. No single level separates an onset
attached to a word from a noise that is not.

So the level now only **detects** the read — non-silent regions under 300 ms are
ignored, which is what steps over the click — and the cut is made **350 ms
outside** it at both ends. `atrim`, not `silenceremove`: the boundary is decided
from a measurement in code that can be read, and the T-20 `start_duration` trap
cannot be reintroduced by accident because the parameter is gone.

**Re-measured on Tom's own 22 archived raws through the deployed chain:** head
margin 305–385 ms on every take from today, the soft onsets back in the file,
durations unchanged bar the margin.

## What changed on the script surface

`useContinuousRecorder` had `mediaRecorder.start()` inside `vad.onSpeechStart` —
the encoder only spun up once the VAD had already heard speech, behind a
−34 dBFS trip point, a 50 ms poll and the encoder's own spin-up. Now:

- a recorder runs from `startFlow`, before the first phrase is on screen;
- at a boundary the replacement starts **before** the outgoing one stops, so the
  stream is never unobserved and that overlap is the next phrase's pre-roll;
- the outgoing recorder runs on 900 ms past end-of-speech, on top of the 800 ms
  of silence the VAD already waited through;
- a long read-ahead rolls the pre-roll over rather than shipping a long clip;
- the mic's own DSP is requested **off**, matching the pod recorder — browser
  `noiseSuppression` was gating precisely the onsets the VAD then failed to hear.

Chunk gaps are shifted by the pre-roll so a slow pass still draws its boundaries
in the right place.

**This changes the capture path for recordists whose takes are currently fine**
(Kai's pod takes are clean at ~1530 ms of lead-in). Recording more around the
utterance cannot make a clean take worse, and every boundary is now decided
server-side, where the raw original is archived first and a trim is reversible.

## Provenance

`recording_device` was NULL on all 154 archived takes, which is why the earlier
forensics had to use the blob's mime string as a stand-in for a code path. The
column, the insert and the mapping all already existed; nothing was filling
them. The recordist surface now sends the chosen mic plus the browser's user
agent, and the take route passes it through on both paths it serves.

## Verified live

- Server chain: deployed to the box that processes popty.app uploads and
  restarted; the deployed module re-measured on one of Tom's raws gives a
  385 ms head margin where the stored master has 5 ms.
- Front end: the served bundle carries the pre-roll handover on both paths, the
  DSP-off request, the upcoming list, the auto-advance toggle and the raw /
  processed pair. Points 1–5 independently confirmed against the served chunk by
  a second pass, including a live fetch of both variants for one of Tom's takes.

## Gap

**No post-fix take from Tom exists yet.** Everything above is measured on his
pre-fix raws run through the deployed chain, not on a take recorded after the
deploy. The first take he records is the real test.
