# Slow-read feedback — E2E

What the recordist is told **while** reading a slow phrase, and what happens when
the pauses do not come out right. Driven through the real Autocue Studio with a
real `MediaRecorder`, at 390×844 — the iPhone width Kai records on.

```bash
npm run dev &                       # or vite preview
npx playwright test --config=e2e/slow-read-feedback/playwright.config.js
```

Two projects, because Chromium's fake microphone is fixed at browser launch:

| project | fake mic | what it proves |
|---|---|---|
| `pauses-good` | three pieces, **1000ms** pauses | the chunk indicator advances piece by piece as the phrase is read, and a clean take files exactly as before |
| `pauses-too-quick` | three pieces, **250ms** pauses | the take is refused loudly, is **not** uploaded, the line does not go green, and the same line is re-prompted |

250ms against 1000ms is the whole subject. The VAD counts a pause as a chunk
boundary at 400ms (`useVAD` `chunkPauseDuration`), so a 250ms pause is one a
person plainly makes, and plainly hears themselves make, that the recorder keeps
nothing of. That is the read Kai did on 2026-08-19, and the studio filed it and
ticked it green.

## The two things worth knowing about these tests

**The progression is asserted on a timeline, not an end state.** `fixture.js`
samples the indicator every 50ms — the VAD's own poll interval — into
`window.__pipTimeline`, and the spec asserts that `C..` → `DC.` → `DDC` all
appeared, in that order. A pip that is green by the time the take is over proves
nothing about whether the person reading ever saw it turn green, and "show the
progression as you do the chunks" is a claim about *during*.

**"Not filed" is asserted against the intercepted upload, not the UI.** The
defect being fixed was a UI that said the cheerful thing while something
unusable went down the pipe, so checking the UI alone would repeat it.

## Two bugs these tests already caught

Both were invisible to unit tests and to reading the code:

- The pause caption was gated on the VAD's `isSpeaking`, which stays true right
  through a mid-phrase pause. The timeline never once contained "Hold the
  pause" — the indicator was silent at exactly the moment it had something to
  say.
- Both panels were placed in the document above the teleprompter. At 390px the
  teleprompter's own auto-scroll pushed them clean off the top of the viewport;
  the screenshot showed a live session with no sign of either. Both are now
  pinned to the bottom of the screen, and both specs measure against the
  **viewport**, which is the only check that would have caught it.

If Chromium fails to launch with `libnspr4.so: cannot open shared object file`,
this host keeps those libraries outside the system path:

```bash
export LD_LIBRARY_PATH=$HOME/.pwlibs/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
```
