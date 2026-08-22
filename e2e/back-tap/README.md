# Back is a media-player back button

Kai, 2026-08-21: the autocue's Back button jumped to the previous take on the
FIRST press. The press a recordist actually makes mid-line is "I fluffed that —
from the top", and answering it with a skip threw away the line being read and
landed them on one that was already fine.

So Back now does what every phone teaches:

* **one tap** — restart the take you are on; the script does not move
* **two taps inside 500 ms** — go to the previous take

The window and the argument live in
`src/components/production/autocue/backTap.js`. The unit tests around it
(`backTap.test.js`, `recording-controls-back.test.js`,
`src/composables/autocue-restart-take.test.js`) cover the timing, the label and
the discarded capture. This suite covers the thing they cannot: that the wiring
in the real studio, in a real browser, with a real `MediaRecorder`, moves the
script only when it should.

The fake microphone is fed **silence** (`make-silent-wav.js`) rather than
Chromium's built-in 1 kHz beep — the beep reads as one endless utterance and the
VAD would advance the script on its own, which is exactly what this suite has to
rule out.

## Running it

```bash
npm run dev &
npx playwright test --config=e2e/back-tap/playwright.config.js
```

Needs the repo's `.env` present (the auth stub restores a Supabase session, and
with no Supabase client configured the router bounces to /login), and a Chromium
with `libnspr4`/`libnss3` available. Screenshots land beside the spec.

Run at 390px, like every recorder suite: Kai tests on an iPhone.
