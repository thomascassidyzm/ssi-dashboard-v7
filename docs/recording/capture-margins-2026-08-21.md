# The clipped takes: where the cut was, and what now happens instead

21 August 2026. Live on popty.app. Surface: the recordist room, `/r/<voice>`.

---

## The short version

The clipping was **ours, and it happened at the moment of recording** — not in
the processing chain, and not on the microphone. The recorder built a brand new
recording device for every single line and switched it on the instant you tapped
Next. A recording device does not start recording when you switch it on. It
warms up first. Everything said during that warm-up was never captured by
anything, anywhere — there is no file it is missing from, because it was never
written down.

How much you lose depends entirely on how quickly you start reading after the
tap. That is why it was intermittent, and why it was worst on the lines you were
quickest into.

The same defect ran at the other end: the recording stopped dead on the tap, so
tapping Next on the last syllable cut the last syllable.

**Now the recorder is always running.** It is recording before the line is even
on your screen, it keeps recording for almost a second after you have moved on,
and at every changeover the new recording starts *before* the old one stops, so
there is never an instant when nothing is listening. All the tidying-up of the
extra material happens later, on the server, where your untouched original is
kept and any trim can be undone.

---

## What was actually wrong

The recorder for the recordist room lives in `src/composables/useTapRecorder.js`.
Before today it worked like this:

- `beginLine()` — construct a `MediaRecorder`, call `start()`.
- `endLine()` — call `stop()`, hand back the audio.

Both of those were bound to your thumb. `beginLine()` ran the moment the previous
line was closed; `endLine()` ran the moment you tapped Next.

**Head loss.** `MediaRecorder.start()` returns immediately, but the browser has
to allocate an encoder, hand it the audio track and fill its first buffer before
any audio is committed. That is not a rounding error and it is not consistent —
it varies by browser, by device, by how busy the phone is. Nothing in the app can
recover it, because the audio was never handed to the app in the first place. The
raw archive we keep at `raw/<id>.<ext>` since 14 August does not contain it
either; it is not a processing loss, so having the original does not help.

**Tail loss.** `stop()` landed on the tap. A line is finished in your head before
it is finished in your mouth, so the tap tends to arrive early, and whatever was
still coming out was cut.

**Why nobody could point at it.** The processing chain had a *separate*, real
head-clipping bug — the `start_duration` trim that destroyed 100ms off each end
of 107 Welsh clips, diagnosed and fixed on 14 August
(`docs/audio-forensics-2026-08-14/`). That fix was correct and it holds. It just
was not the only cut in the chain, and once it was fixed the remaining loss had
nowhere obvious to be. It was upstream of everything anyone was measuring.

---

## What happens now

The rule, in Tom's words: **record more content around the signal, and move all
boundary-trimming into the processing step**, where too-much-trailing-space is
dealt with reversibly.

1. **Capture starts when the microphone opens**, not when a line opens. Tapping
   Start switches the recorder on; the first line's pre-roll is the whole gap
   between that tap and your first word. The encoder warm-up now happens in dead
   air where it costs nothing.

2. **Opening a line is a mark, not a capture edge.** `beginLine()` no longer
   touches the recorder at all. It notes where the line began and nothing else.

3. **Changeovers overlap.** At a line boundary the replacement recorder is
   started *first*, and only then is the outgoing one told to keep going and
   finish. Two recorders share the one microphone for the tail window. There is
   no instant at which the stream is unobserved — and the overlap is itself the
   next line's pre-roll, so the next line's encoder is already warm and already
   writing before you look at the words.

4. **A real tail: 900ms.** The outgoing recorder runs on past the boundary. It is
   only cut short early if we hear genuine silence *and then* the next utterance
   starting — so a generous tail can never end up swallowing the first word of
   the next line.

5. **Pre-roll is rolled over, not left to grow.** If a line sits silent while you
   read ahead, a fresh recorder is started, allowed to overlap for 800ms, and
   only then is the stale one dropped. Every clip therefore carries between 800ms
   and about 2.5 seconds ahead of your first word — generous, but a twenty-second
   pause does not ship a twenty-second clip.

Nothing in that list trims, gates or discards audio on level. The level meter
decides only *when* to hand over between recorders, and every one of those
decisions is protected by an overlap. A wrong reading costs a slightly longer
clip. It cannot cost a syllable.

The only thing that now touches a boundary is the server's
`silenceremove ... start_silence=0.05`, applied after the untouched original has
already been archived. That trim is reversible. The capture-time cut was not.

---

## The rest of the spec, and what you will feel

**1. Recording starts at the first clip.** Start is now the first control on the
card and it names the line you are about to read. One tap and the microphone is
live on the first line that still needs a take. There is no line to pick and
nothing to navigate to. The tap itself cannot be removed — no browser will open a
microphone without one.

**2. You can see what is coming.** The next six lines are listed under the one
you are reading, dimmed and small so the live line stays the biggest thing on the
screen, with the count still to go. Reading one line at a time with no horizon
made every line a fresh re-orientation.

**3. You do not press Next.** It moves on by itself 1200ms after you stop
speaking. Next and Again are still there for when you want them, and a toggle on
the front card turns auto-advance off for a noisy room.

This is the point where the capture change earns its keep. Auto-advance under the
old recorder would have been actively dangerous: every early advance would have
been a truncated take. Now an early advance costs a slightly longer clip, because
the outgoing recorder is still running and the incoming one started before the
decision was made. The feature is only safe because of the fix.

**4 and 5. Raw first, processed second.** The comparison already existed but was
only offered on takes from *previous* sessions. It is now on the take you have
just this second read, and on every take in the session's listen-back list, as
soon as the upload lands. Raw is the untouched bytes your microphone gave us;
processed is what the learner hears. "Was that clipped?" is now a question you
can answer in the room instead of a suspicion you carry to the end of a session.

---

## What to try first

Read four or five lines straight through at your natural pace, starting the first
word **fast** — as soon as Start goes green, before you would normally be ready.
That is the exact condition that used to eat the first syllable. Then tap **Raw
vs processed** on the take you just read and listen to the raw side. The word
should be whole, with a clear beat of room in front of it.

Then do the opposite: read a line and tap Next while you are still on the last
syllable. The tail should survive that too.

If either one is still clipped, the raw side of that comparison is the evidence —
say which line and I will pull the archived original.

---

## What this does not fix

Auto-advance is judged on a fixed level bar, not on a measurement of your room.
In a noisy room it may not fire, and you will need Next. The room-calibration
machinery that the autocue studio uses (`useVAD.calibrate`) is not wired into
this surface yet; that is the obvious next iteration if the fixed bar misbehaves.

Clip sizes go up, because clips now contain more than the words. That is the
trade being made deliberately: bandwidth is cheap and a lost syllable is not
recoverable.
