# The Voice Lab's three gaps — how to drive them

Tom, 2026-08-31: "1 - there is no way to give consent to a voice here. 2 - there is
no way to hear a voice that does not currently have a clip. 3 - there is only one
clip per voice."

Two ways to run, and they answer different questions.

**`gaps.spec.js` — against a local build.** Fast, and where you develop.

```
node e2e/pod-recording/seed-test-user.cjs          # once per machine
node scripts/vl-gaps/test-voice.cjs                # the test voice, reset to "no consent"
npx vite build && npx vite preview --port 5190
PRODUCTION_API_PORT=3491 node services/production-api.cjs
LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs \
E2E_BASE_URL=http://127.0.0.1:5190 E2E_API_BASE=http://localhost:3491 \
E2E_MIC_WAV=/path/to/consent-line.wav \
npx playwright test --config=e2e/voicelab-gaps/playwright.config.js
```

**`live-drive.mjs` — against the DEPLOYED site.** Not a suite: one walk of
popty.app against the watson-1 production API, because "it works on a local
build" is not the claim being made.

```
node scripts/vl-gaps/test-voice.cjs               # reset the probe FIRST, every time
LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs E2E_MIC_WAV=/path/to/consent-line.wav \
E2E_SHOT_DIR=/home/tomcassidy/command-surface/public/evidence/<slug> \
node e2e/voicelab-gaps/live-drive.mjs
```

## Three things that will bite you

**The microphone is a WAV.** Chromium is handed a recording of the consent line
(`--use-file-for-fake-audio-capture`), so the whisper check on the backend does
real work on real audio rather than being stubbed. Make one with
`node scripts/vl-gaps/mkconsentwav.cjs out.mp3` and `ffmpeg -i out.mp3 -ar 48000
-ac 1 -c:a pcm_s16le out.wav`.

**Reset the probe before every run.** The walk CONSENTS the voice; a second run
against an already-consented voice finds no "consent…" chip and times out
looking for it. `node scripts/vl-gaps/test-voice.cjs` puts it back.

**The consent state can go stale in a running production-api.** Editing
`voices` directly in the database is not picked up by a process that is already
running — a consent written THROUGH the page appears immediately, but a reset
written behind its back does not. Restart `popty-production-api` after a
direct-database reset, or the walk will insist a voice is authorised when the
row says otherwise.
