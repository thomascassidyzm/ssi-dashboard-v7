# The microphone check

*Kai — 2026-08-19. What it asks you to do, what it tells you, and what happens if your mic is poor.*

---

## The short version

Half right, and the half that's wrong matters — so here it is straight.

**Confirmed:** your microphone really is quieter than the recorder assumes. The
code carried a constant saying ordinary speech measures `0.23`. Across 68 of
your real takes, measured off the untouched browser recordings, your speech
measures **`0.113`**. So the recorder has been reasoning about a speaker who
isn't you. Fixed.

**Confirmed, in a real browser:** the old fixed cut-off left your voice only
**7.8dB** clear of it on the quieter mic, against 22.4dB on the phone. That is
the fragility you felt. With the check run, the gate now sits 21dB under your
voice on *both* — and the same phrase comes out the same length on either
microphone. That is the thing this fixes and it is now demonstrated, not argued.

**Refuted — and this is the important one.** I thought the level threshold was
what cut your phrases in half. It wasn't, and no level threshold could be.
Measured through the browser's own audio processing, **a breath sits 27–32dB
below your voice** — far below any cut-off that still lets room tone count as
silence. So an 800ms mid-phrase pause ends the take on a phone mic and on a
studio mic alike, calibrated or not. At 800ms of quiet, "pausing" and "finished
reading" are literally the same signal and nothing in the audio can tell them
apart. **That symptom is about the 800ms, not about the level** — Tom's first
instinct was pointing at the right dial after all, and I talked him out of it.

**Still open:** your 18:21–18:23 session lost five of nine takes as fragments,
and those end with **0–50ms of trailing silence**. A cut by the voice-detector
fires 800ms *into* a silence and cannot leave less than that. So something else
chopped those five, and nobody knows what yet.

## What the check asks you to do

Two things, about five seconds total:

1. **"Say nothing for a moment — just let me hear the room."** Two seconds. This
   measures your background noise: the fan, the traffic, the hum of the room.
2. **"Now say something, in your normal recording voice."** Three seconds. Read
   the line you're about to record, at the volume you'll actually use.

The useful number is the **gap between those two** — how far your voice sits
above your room. The recorder then puts its silence cut-off in that gap, rather
than at a number decided in advance by someone who has never heard your mic.

## What it tells you

A one-line verdict, in words:

| What you see | What it means |
|---|---|
| **Microphone is good** | Your voice is comfortably above your room. Record away. |
| **Usable, with care** | A fair amount of background noise. It will work, but leave a clear beat of silence between phrases. |
| **Too much room noise** | Not enough difference between your voice and the background. Phrases will run together or get cut in half. |

Underneath, in small type: how many dB your voice sits above your room, and the
cut-off it has set. You never need to read those — they are there so that when
something goes wrong there is a number to point at.

## What happens if your mic is poor

It tells you, in plain words, **before** you record two hundred lines:

> *"Your mic is picking up a lot of room noise — there is not enough difference
> between your voice and the background to tell them apart, so phrases will run
> together or get cut in half. Turn off fans, air-con or anything humming, move
> closer to the mic or away from the window, or use a headset, then check again."*

And then it lets you record anyway. The check is **never a wall**. If you skip
it, or it fails, or you never run it, recording falls back to exactly the fixed
setting it used before today — nothing is worse than it was, it just isn't tuned
to you. The recording screen says which of the two is in force:

- *"Tuned to Shure MV7"* — your check is running things.
- *"Standard silence setting — mic not checked"* — the old fixed behaviour.

## If you change mic halfway through

There's a **Re-check mic** button on the recording screen. It re-runs the two
steps over the top of the session and **does not touch where you are in the
queue** — you come back to the same line you were on. That was the whole point
of putting it there rather than making you start again.

Your result is remembered **per microphone**, in the browser, so the next time
you plug in the same mic there is no wait at all — it just applies what it
learned. Plug in a different one and it will ask again. After a fortnight it
says "worth re-checking", because rooms change.

---

## The real danger the measurement found

Not the floor — **the ceiling.**

The old room calibration took your measured background noise, multiplied it by
four, and clamped the result to at most `0.08`. Two things follow.

Most of the time the clamp went the *other* way: it hit the bottom stop of
`0.01` and the room measurement was thrown away entirely. Measured on a real
phrase replayed through the real code at two mic gains 13dB apart, it set the
gate to `0.0100` on **both**:

| | gate set to | gate sits below the voice |
|---|---|---|
| **Before** — phone-like | 0.0100 | 27.5 dB |
| **Before** — external-like | 0.0100 | 14.4 dB |
| **After** — phone-like | 0.0212 | 21.0 dB |
| **After** — external-like | 0.0048 | 20.8 dB |

But when the calibration happens to catch a breath — which a close-in external
mic picks up readily — the multiply-by-four lands the gate at `0.05`–`0.08`. And
**3 of your 68 takes have a speech p95 below 0.08 outright.** A gate above your
voice does not truncate a take. It captures **nothing at all**, silently, for the
whole session.

That is the failure worth spending the fix on, because it is the unrecoverable
one. A gate too low merges phrases into one long blob — ugly, slow to sort out,
but every syllable is still in the file. A gate too high loses the audio. So the
gate may now never come closer than **9dB to your measured voice**, whichever
way the arithmetic went, and when your room is too loud for that to be
comfortable it says so out loud instead of quietly picking the side you can't
recover from.

## One more thing, for slow reads

**23 of your 30 slow takes** have mid-phrase dips below `0.01` lasting 800ms or
more — median 1250ms, worst 2200ms. Slow cadence has almost no margin under the
old fixed gate. It is currently protected by a separate 4-second tolerance while
chunks are still outstanding, not by the gate having any room in it. Worth a
proper look; it is outside what this change touches.

## How it works, in one paragraph

Everything is done in dB, because that is the unit in which a gain change is a
constant offset: turn the mic up 12dB and the room, the voice and the gate all
move 12dB together, and the behaviour is identical. The gate is placed **21dB
under your measured voice** and **12dB over your measured room**, and may never
come within **9dB** of your voice whatever else the arithmetic says. When your
room is loud enough that the first two cannot both be met — a gap under 33dB —
it splits the difference and tells you; under 20dB it says the room is too
noisy. The absolute clamps still exist but are now `[0.0006, 0.08]`, wide enough
that they only ever catch a dead or blaring input, never a working microphone.
The assumed-speech constant is now `0.113`, your real measured level, and it is
only ever used when nobody has run the check.

## Where the code is

| | |
|---|---|
| `src/composables/useVAD.ts` | `placeThreshold()`, `calibrate()` (room), `measureVoice()` (voice), `useFixedThreshold()` (the fallback) |
| `src/composables/useMicCalibration.ts` | the sequence, the per-device storage, the never-a-wall guarantee |
| `src/components/production/autocue/MicCheck.vue` | the UI, phone-first at 390px |
| `src/composables/useContinuousRecorder.ts` | applies a stored profile at `startFlow`; `recalibrate()` for mid-session |
| `src/composables/useVAD.calibration.test.js` | the replay above, as a regression test |

**Storage:** `localStorage`, key `ssi.micCalibration.v1`, a map of device key →
profile. The device key is the audio track's `deviceId` where the browser gives
one, the track label where it does not (iOS Safari often rotates `deviceId`),
and a single shared bucket as a last resort — which degrades to "one remembered
calibration per browser", still far better than none. Eight profiles kept, most
recent first. A `localStorage` that throws (private browsing, quota) is caught
and ignored: a calibration we cannot remember is not a reason to refuse to
record.

## Wiring it into the tutorial

The check was built as two pieces with no studio knowledge in them, precisely so
the tutorial can mount it as step one — check the mic before teaching anything,
so a volunteer finds a bad setup before recording two hundred lines with it.

On `feat/recordist-tutorial-real-ui`, `TutorialStudio.vue` runs off a `SPINE`
array of step keys and a `go(next)` function. Three edits:

1. Add `{ key: 'micCheck', label: 'Mic' }` as the **first** entry of `SPINE`
   (before `pickQueueMode`).
2. Change the welcome screen's Start button from `go('pickQueueMode')` to
   `go('micCheck')`, and add the branch:
   ```html
   <div v-else-if="step === 'micCheck'">
     <TutorialCoach step="micCheck" />
     <MicCheck @done="go('pickQueueMode')" @skip="go('pickQueueMode')" />
   </div>
   ```
   With no `existing-vad` and no `stream` prop it opens its own microphone and
   closes it again — which is what a standalone check wants, and it also makes
   the tutorial the place the browser's mic-permission prompt happens, before
   any recording is riding on it.
3. Put the teaching copy in `tutorial/tutorialScript.js` under a `micCheck` key,
   like every other word of tutorial copy. `MicCheck.vue` itself must stay free
   of tutorial copy — it is on the live recording path.

Note the tutorial's own `BEAT_WINDOW` teaching (a beat comfortably over 150ms
and under 800ms) is unaffected: this change moves the LEVEL at which silence is
recognised, not the DURATIONS. Both numbers stay exactly as they are.

---

*Branch: `feat/mic-calibration-recordist`. Not merged — that is Tom's call.*
