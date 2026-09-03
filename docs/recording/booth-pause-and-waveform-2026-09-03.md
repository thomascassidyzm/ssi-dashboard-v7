# Pause discards the attempt, and the meter is a waveform

*2026-09-03. Both asked for by Aran after he read 250 phrases through the booth.*

## Pause

> "A pause button which automatically discards that attempt and starts from fresh
> when they hit play would be brilliant."

He needs a word, or the dog barks, and **background noise keeps the recording going** —
so a ruined take had to be dealt with afterwards. Now it never gets that far.

- **Pause** throws the open capture away and stops the microphone being a witness to
  whatever happens next. Nothing is uploaded, nothing is filed, no red "that take came
  out silent" row appears — the line is never closed, so the queue never hears about it.
- **Play** re-opens the *same* line clean. It is a fresh start, not a resume.
- **Tap only**, full width, immediately above Back / Again / Next, so it is findable
  mid-flow without looking down. `P` on a desktop keyboard, dead while the rewrite box
  is open like Space, R and B.
- While paused: the ON AIR pill reads **PAUSED**, the status line and the meter tag both
  say *"nothing is being recorded"*, the waveform flatlines, and Back / Again / Next /
  Stop here are all disabled so a stray tap cannot file a take. Auto-advance already
  refused to fire while the mic is held.

**Again is unchanged and still there.** Again discards and *immediately* starts capturing
— "I fluffed it, let me read that once more". Pause discards and *stops* until he comes
back. Two different needs.

### It is the booth's existing hold, not a second one

`micHeld` is the one notion of "the mic is not listening to anybody" on this screen;
playback and the text editor already use it. `paused` is a label saying *which* of the
three is holding it, only ever set in the same breath as `micHeld`, and cleared inside
`releaseMic()` — the single door out. The two cannot drift apart.

## The waveform

> "Some kind of visual representative of the waveform would give people confidence that
> they are doing it right."

A confidence signal, not a tool: no axis, no timeline, no scrubbing, no controls.

It draws the **same numbers the bar already drew** — the peaks `useTapRecorder`'s meter
loop computes every frame — kept in a fixed 120-slot ring (two seconds at 60fps), painted
from one `requestAnimationFrame` into a small canvas in the bar's old slot. The ring is
deliberately *not* reactive, so a value changing sixty times a second cannot drag Vue's
renderer along with it.

**No second AnalyserNode, no second AudioContext, no second `getUserMedia`, no extra
per-frame FFT, and nothing on the capture path at all.** The meter was already cosmetic
and already separate from capture; this changes what is painted, not what is measured.

The dB tag and the clipping red are untouched — they were paid for by the session where
every take was refused because the meter read zero.

## Taste calls taken (overrule any of these in a word)

1. **The waveform replaces the bar** in the same slot rather than stacking a second
   indicator under it — one thing that moves, not two. The meter strip grew 10px → 26px
   to give a trace room to have a shape.
2. **"Pause" / "Play"** as the label, Aran's own words, not "Hold" or "Mute".
3. **Paused is tungsten amber** — the colour this screen already uses for "the mic is not
   listening" — and it is the only lit thing on the page while it is true.
4. The pause control is **full width on desktop too**, since it is the same template. It
   sits above the transport at every width.

## What is verified, and what is not

Verified in a real browser against the **deployed** booth at `https://popty.app/r/human_tom_zzz`
(the zzz test course; auto-advance switched off first so nothing could close a line), with a
fake media device so the meter had a signal — phone 390×844 primary, desktop 1440×900
secondary. **No take was filed and no text edit was saved.**

- waveform moving while live, **frozen flat** while paused, moving again after Play;
- meter tag, status line and ON AIR pill all say "paused" together;
- Next / Again / Stop here all disabled while paused, all enabled again after Play;
- the same line on screen before and after Play;
- pause control sits above the transport (y+h 717.7 ≤ controls y 731.3 at 390px);
- the `@media (min-width: 900px)` desktop block is byte-identical to the string recorded
  in `booth-full-width-desktop-2026-09-03.md`.

Markers grepped out of the served bytes: `ctl-pause` and `Paused — nothing is being recorded`
in `/assets/RecordistRoom-Dp99xv4G.js`, the `.ctl-pause` rules in
`/assets/RecordistRoom-gUuouL9o.css`.

Tests: 38 green across `RecordistRoom.pause` (new), `.navigation`, `.displayOnly`,
`.captureprofile`, `.coldStart` and `useTapRecorder.meter`. The new file asserts the two
things that actually matter — pausing discards and queues nothing, and Play re-opens the
same line.

**Not verified, and nobody but a human can:** whether it *feels* right mid-flow with a
script in front of you, and whether the waveform is legible on a real phone in a real room
with a real voice — a fake device is a square beep at full scale, which is why the live
screenshot reads as clipped red. Aran or Tom needs to open it and try it.

Screenshots (tailnet only):
<https://watson-1.tail4968cb.ts.net/evidence/booth-pause-waveform-2026-09-03/>
