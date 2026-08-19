# The microphone check

*Kai — 2026-08-19. What it asks you to do, what it tells you, and what happens if your mic is poor.*

---

## The short version

You were right, and it was the microphone.

The recorder decides a phrase has ended when the sound drops below a certain
level for 800ms. That level was a **fixed number**. Your phone mic put out a hot
signal, so the fixed number sat well underneath your voice and only real silence
crossed it. Your new external mic is quieter — everything, your voice included,
comes out lower — but the fixed number did not move down with it. So the cut-off
ended up sitting *inside* your voice, and an ordinary breath in the middle of a
phrase looked exactly like the end of one.

That is why it worked on the phone and not on the good mic, same tool, same day.

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

## The evidence, for the record

One real recorded phrase, replayed through the real voice-detection code at two
microphone gains 13dB apart — the only difference being how hot the mic is.

| | gate set to | gate sits below the voice | gate sits above the room |
|---|---|---|---|
| **Before** — phone-like | 0.0100 | 27.5 dB | 20.5 dB |
| **Before** — external-like | 0.0100 | **14.4 dB** | 33.6 dB |
| **After** — phone-like | 0.0212 | 21.0 dB | 27.0 dB |
| **After** — external-like | 0.0048 | 20.8 dB | 27.2 dB |

Two things fall out of that table.

**The old room calibration never did anything.** It set the gate to `0.0100` on
both microphones — the bottom of a hard-coded clamp `[0.01, 0.08]`. The room was
measured and then thrown away, because the clamp always won.

**The gate ended up 13dB closer to your voice on the quieter mic.** 14.4dB of
headroom is inside ordinary speech: unstressed syllables, the end of a word, the
air before a plosive all live down there.

Then the same phrase with a mid-phrase breath, swept by breath length. Numbers
are the takes the recorder cut, in ms:

| breath | before, phone | before, external | after, phone | after, external |
|---:|---|---|---|---|
| 200ms | [2100] | [1900] | [2050] | [2050] |
| 400ms | [2300] | [2100] | [2250] | [2250] |
| 600ms | [2500] | [2300] | [2450] | [2450] |
| **800ms** | **[2700]** | **[900, 750]** | **[2650]** | **[2650]** |

At an 800ms breath the old code **split one phrase into two takes** on the
external mic while keeping it whole on the phone — one phrase in, two broken
takes out. And at *every* breath length the external mic quietly lost 200ms off
a take the phone captured in full.

After the change, both microphones produce the same take, to the poll. Which is
the property that actually matters: **a change of microphone must not change
where the recorder cuts.**

## How it works, in one paragraph

Everything is done in dB, because that is the unit in which a gain change is a
constant offset: turn the mic up 12dB and the room, the voice and the gate all
move 12dB together, and the behaviour is identical. The gate is placed **21dB
under your measured voice** and **12dB over your measured room** — the two
margins the configuration that demonstrably worked actually had (0.02 against a
0.23 voice and a 0.003 room). When your room is loud enough that both cannot be
satisfied — a gap under 33dB — it splits the difference and tells you. Under
20dB it says the room is too noisy. The absolute clamps still exist but are now
`[0.0006, 0.08]`, wide enough that they only ever catch a dead or blaring input,
never a working microphone.

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
