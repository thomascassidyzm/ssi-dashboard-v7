# Sascha's takes are still clipped — and why the fix could not have saved them

**2026-08-21.** Read-only on every one of Sascha's takes: nothing was reprocessed,
re-mastered, moved or deleted.

## The short version

**The clipping is real, it is at capture, and Sascha recorded in the eight-minute
window before the fix for their surface landed.** The done card was not wrong
about what it deployed; it was wrong that the deploy had been tested. Sascha's
session is not the "first real test take" of the fix — it predates it.

| | |
|---|---|
| Sascha's 34 takes | 10:54:03Z → 11:10:30Z |
| Fix for Sascha's surface (`63cfcc52e`) landed in main | **11:18:34Z** |
| Gap | **8 minutes too early** |
| Head margin in the RAW archived bytes | median **0 ms**, 32/34 under 100 ms |
| Raws opening AT speech level | **30 / 34** |
| Recoverable by re-trimming? | **No.** The audio was never captured. |
| Is the fix live now? | **Yes** — verified in the chunk popty.app is serving |

## 1. It is still clipping, and the loss is at capture

All 34 takes pulled from S3, raw original and mastered clip, measured with the
same method the earlier forensics used — per-10 ms RMS, −40 dBFS crossing.

- **Raw head margin: median 0 ms** (min 0, max 321). 32/34 under 100 ms.
- **Mastered head margin: median 0 ms.** The trim is not the culprit — it cannot
  give back a margin the file never had.
- **30 of 34 raws open at speech level**: the first 100 ms is already within
  10 dB of that file's own p95, and on 29 of them within 6 dB. Several open
  *louder* than p95 — that is mid-vowel, inside a syllable already in progress.

This is the pre-fix script-path signature exactly, and it is the opposite of
what was measured on Tom's takes, where the raws held 1.3–4.7 s of lead-in and
the loss happened downstream in processing.

## 2. Why the deployed fix did not prevent it

Three candidates were on the table. It is the first, and it is unambiguous.

**(a) The take predates the deploy — CONFIRMED.**

Sascha recorded through AutocueStudio. `mode: 'script'` has exactly one producer
in the codebase (`AutocueStudio.vue:844`), and that surface drives
`useContinuousRecorder` — the composable whose capture path `63cfcc52e` rewrote.
That commit reached main at **11:18:34Z**, eight minutes after Sascha's last take
at 11:10:30Z. popty.app auto-deploys from main in about two minutes, so the fixed
bundle began serving somewhere around 11:20Z. Every one of Sascha's 34 takes was
recorded on the old bundle, where `mediaRecorder.start()` still sat inside
`vad.onSpeechStart`.

The provenance corroborates it independently of the git clock:
`recording_device` is NULL on all 34 rows, and the commit that fills that field
(`d2ffec912`) landed at 11:25:41Z. A browser holding the fixed bundle would not
have produced those NULLs.

*(`recorded_by` shows Sascha's email rather than the `autocue-studio` the client
sends because `production-api.cjs:5196` overrides it from the session — not a
different surface.)*

**(b) Fix only in server trim, not in browser capture — NO.**
`63cfcc52e` changes the browser capture path itself: a recorder now runs from
`startFlow` before the first phrase is on screen, the replacement starts before
the outgoing one stops, and mic DSP is requested off. The server-side margin
(`5102c0780`, 11:13:57Z) is a second, separate fix for a second, separate defect
on Tom's surface.

**(c) Sascha's device hit an uncovered path — NO, but it exposed a real gap.**
Not the cause here. But the device field could not answer the question either,
because the script surface never sent it. See §4.

## 3. The fix IS live now — verified, not assumed

Fetched the chunk popty.app is actually serving for Sascha's surface
(`/assets/AutocueStudio-C5hhLR8R.js`, reached from the lazy chunk map, not the
main bundle):

- a recorder is created at `startFlow` **before** the VAD listeners are
  registered — the shape the fix introduced;
- `onSpeechStart` no longer starts the encoder, it only marks the boundary;
- `echoCancellation:!1, noiseSuppression:!1, autoGainControl:!1` — DSP off, in
  both the studio and the recorder.

So the next take Sascha records, on a freshly loaded page, is the real test that
has still never been run.

**One caveat worth acting on:** a browser tab left open since this morning is
still running the old bundle. Sascha must hard-reload before re-recording, or
the next session reproduces this one exactly.

## 3b. Does Sascha's surface carry the pre-roll fix? Yes — but not this morning

This was the named suspect, so stating it flatly.

**Sascha is on the Autocue continuous recorder, not the tap recorder.** The
chain is `AutocueStudio.vue` → `useContinuousRecorder`, and `useContinuousRecorder`
is precisely the file `63cfcc52e` rewrote. So the surface does carry the
pre-roll fix, and carries it in the bundle being served right now.

What it did not carry was the fix **at 10:54–11:10Z**, when Sascha was reading.
The two surfaces were fixed several hours apart:

| Surface | Composable | Pre-roll fix | Time |
|---|---|---|---|
| Tap recorder (`/r/:voiceId`) | pod recorder | `241431feb` | 10:39:44Z |
| **Autocue script (Sascha)** | `useContinuousRecorder` | **`63cfcc52e`** | **11:18:34Z** |

Sascha recorded in the gap between them. The tap recorder had been fixed for
15 minutes; the surface Sascha was actually using had not been touched yet.
That is the whole of it.

## 4. A real remaining gap, found and fixed

`d2ffec912` wired device provenance into the **recordist** surface
(`useRecordistQueue` → `/api/recording/voice/:voiceId/take`) and not into the
**script** surface — which is the path every clipped take in the archive came
from, and therefore the one that most needed to be able to say what it ran on.
Even after the deploy, script takes would have kept writing NULL.

`useContinuousRecorder` now reads the label off the granted audio track at
`startFlow`, joins it to the user agent, and AutocueStudio sends it as
`recording_device`. The server already maps and stores that name, so nothing
server-side changes. Never fatal: no track label yields `default mic`, a
throwing stream yields null — a session must not fail to record because it could
not describe itself.

Two tests added; 12/12 in the recorder suite and 59/59 across `src/composables`
pass, `vite build` clean.

## 4b. ON AIR — the mic-is-hot indicator

Tom's ruling: radio-show framing, a **continuous** live detected-volume display
that moves the whole time the session is hot, not a per-take light. Shipped with
the clipping fix.

Sascha read 34 takes into a recorder that showed them nothing. The capture fix
is what makes an early start *safe*; this is what makes it *visible*.

**One panel for the whole session.** The lamp is lit from `startFlow` — through
the room measurement, through every take, and through every gap between takes —
because the stream genuinely is live throughout and takes are cut out of it
afterwards. It sits outside every per-take condition in the template. A lamp
that blinked off at a take boundary would teach the one thing this must not
teach: that there are moments when speaking is not safe.

**The meter is always moving.** Sixteen broadcast-style segments driven by the
VAD's RMS, which updates every 50 ms whether or not anyone is speaking. Room
tone deliberately lights the first segment — so stillness means a *dead mic*
rather than a quiet moment, which is exactly the failure the recordist could not
previously see. Green through the working range, amber high, red approaching
clip.

```
measuring the room   [█···············]  ON AIR
between takes        [█···············]  ON AIR
reading              [██████████████··]  ON AIR
loud                 [████████████████]  ON AIR
```

**Reassurance, not a gate.** No state of the panel contains *wait*, *ready*,
*stand by*, *you may now*, or *begin when*. There is a test that holds that,
because the copy is the part most likely to drift back into asking permission.
The live line reads: *"On air — start whenever you like, takes are cut from the
stream."* During calibration it still asks for quiet, because the room really is
being measured, but it says **"On air —"** first so it cannot be read as "not
live yet".

This replaces the old thin `vad-indicator` bar and the separate calibration
shell. They said less, in fewer moments, in two places; two meters saying the
same thing would have made the on-air signal weaker rather than stronger. Same
x300 level scaling recordists have already been reading, now sitting next to the
segments it drives. 10 tests on the component; 165/165 across the autocue and
composable suites; `vite build` clean.

## 5. Are Sascha's 34 takes worth keeping?

**Keep them for now. They are not silently corrupted — they are cleanly and
visibly short at the head, and nothing else about them is wrong.**

- The body and tail of every read are intact. Durations are plausible, tails have
  normal margin, levels are healthy (p95 around −18 dBFS).
- **But the heads are not recoverable.** This is the important difference from
  Tom's takes. Tom's raws held seconds of lead-in and processing threw it away,
  so a re-trim of the archived original gives it straight back. Sascha's raws
  *begin* at speech level: the onset was never encoded. No re-trim, no re-master
  and no reprocessing can recover audio that does not exist in the bytes.
- So: 30 of 34 are missing part or all of their first phoneme, permanently.
  Whether that makes a given take unusable is an ear call, not a measurement —
  a clipped `/ʃ/` on *"schen"* is fatal, a clipped glottal onset on a vowel may
  not be.

**They are safe to keep and cost almost nothing to keep.** They remain useful as
the pre-fix control group for measuring whether the next session is actually
better.

### What a deletion plan would have to cover

Not proposing one — recording what it would need:

1. **A verified replacement first.** Make-before-break: Sascha re-records on the
   fixed bundle, the new takes are measured for head margin (expect 300 ms+, not
   0 ms), and only then is anything old considered. Deletion never precedes a
   verified replacement.
2. **Which rows, named individually** — the 34 `audio_uuid`s, their
   `course_audio` links, both S3 objects each (`raw/` and `mastered/`), and the
   `recording_provenance` rows.
3. **What currently points at them.** Several lines have two or three takes
   already; the supersede logic (`31f4a6b3f`) retires rather than deletes, so
   check what the live clip for each line actually resolves to before removing
   anything behind it.
4. **The control-group cost.** Deleting them destroys the only pre-fix
   measurement baseline for this speaker and this room.
5. **Tom's explicit approval**, per the standing gate. A bad take is retired,
   never destroyed, unless he says otherwise.

**Recommendation: retire, do not delete.** The mechanism already exists, it costs
a few megabytes, and it keeps the baseline.

## What I did not do

- Did not delete or clear any recording, per the standing gate and Kai's request
  being explicitly held.
- Did not merge the provenance fix — it is pushed and awaiting a merge decision.
- Did not re-record or generate any audio.
