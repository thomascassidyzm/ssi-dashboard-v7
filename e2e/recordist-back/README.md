# The recordist's seat — Back, and one step forward per line

Drives the real `/r/:voiceId` surface in a real browser, with a real
`MediaRecorder` and a fake microphone that reads like a person, against Aran's
two pieces of live feedback from 2026-08-23:

* there was no way back to a line he had left, and
* a tap landing on the same beat as auto-advance jumped two lines.

```bash
npm run dev &
npx playwright test --config=e2e/recordist-back/playwright.config.js
```

On watson-1 the browser needs its libraries and a profile directory off tmpfs:

```bash
export LD_LIBRARY_PATH=$HOME/.pwlibs/root/usr/lib/x86_64-linux-gnu
export TMPDIR=$HOME/.pw-tmp
```

**Nothing here may reach a real recordist.** The voice id is fabricated, the
queue is stubbed, and the take endpoint is intercepted and answered locally. A
stray take filed under `human_aran_cym_n` or `human_catrinlliar_cym_n` is a line
a real person then has to sort out.

Two notes on the fixture, both learned the hard way:

* **The fake mic cannot be a flat tone.** `useTapRecorder` measures speech as a
  rise over the room, and caps the room's own claim at a quarter of the loudest
  thing heard — `0.25 × 4 = 1` exactly, deliberately — so a perfectly steady
  signal sits precisely ON the speech floor and is never speech at any
  amplitude. `make-speech-wav.js` builds bursts with a syllable-rate envelope
  and real gaps between them, so peaks clear their own troughs.
* **Auto-advance is off for the navigation tests.** The fixture reads without
  stopping, so left on it walks the whole queue by itself and no assertion about
  where a tap landed can survive. Auto-advance has its own test.

The suite is a Playwright spec, so — like every other spec under `e2e/` — it is
also picked up by a bare `npx vitest run` and fails there. That is the existing
shape of this repo's test estate, not a signal about this suite.
