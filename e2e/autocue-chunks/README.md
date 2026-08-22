# Chunk-level review playback — E2E

Drives the real Autocue Studio through one slow-pass take and checks that each
LEGO piece of that take can be played on its own, and that the pieces are clean
isolated cuts rather than slices of the wrong part of the phrase.

```bash
npm run dev &                       # or vite preview
npx playwright test --config=e2e/autocue-chunks/playwright.config.js
```

- **The mic** is Chromium's fake device fed `fixtures/slow-take-3-chunks.wav`,
  built at config load by `make-slow-take-wav.js`: 2s of room, then three 300ms
  bursts of real speech with a 1s pause between each, then 5s of room. That is
  a three-LEGO slow read, and it is the take this feature exists to cut up.
  The speech is cut from the pod-recording suite's real clip rather than
  synthesised — the studio asks for `noiseSuppression`, which eats a pure tone.
- **The verdict is measured, not asserted from the UI.** The spec wraps
  `AudioBufferSourceNode.start` to record the exact offset and duration each
  piece button plays, then measures RMS inside each piece and just outside both
  its edges. Loud in the middle, silent either side = the cut landed in the
  pause.
- **The API is stubbed** (script, course info, queue, upload): this is about
  what the browser does with a take, not about the optimiser or the bucket. The
  script stub answers after 1.5s on purpose — the real optimiser takes tens of
  seconds, and an instant answer reverses the order of two fetches in a way no
  recordist can hit.

If Chromium fails to launch with `libnspr4.so: cannot open shared object file`,
this host keeps those libraries outside the system path:

```bash
export LD_LIBRARY_PATH=$HOME/.pwlibs/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
```
