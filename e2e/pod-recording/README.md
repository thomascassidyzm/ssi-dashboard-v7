# Pod recording E2E suite

Playwright suite that drives the pod recording flow (mode chooser → two-voice
cast → dialogue recording → upload → playback) plus a Mode 1 (New Course)
autocue smoke test, all through a real browser with a **fake microphone**
playing real audio — no human required. Runs entirely against a **local**
dashboard + API you start yourself; never against Camberley/production.

Full writeup, what's proven vs. human-only, and the manual-pass steps for a
non-English course: `docs/pods/e2e-recording-proof-2026-07-17.md`.

## One-time setup

```bash
npm install
npx playwright install chromium
node e2e/pod-recording/seed-test-user.cjs    # creates the E2E dashboard login
node e2e/pod-recording/seed-test-course.cjs  # creates/refreshes zzz_test_for_eng
```

Needs `.env` (Supabase + AWS creds) and `.env.psql` (`DATABASE_URL`) at the
repo root — same ones the rest of the dashboard uses.

## Run it

Start a local API + frontend on any free ports (avoid whatever's already
running — check with `lsof -i :3470` etc. first):

```bash
PRODUCTION_API_PORT=3472 node services/production-api.cjs &
npm run dev -- --port 5175 &
```

Then:

```bash
E2E_BASE_URL=http://localhost:5175 E2E_API_BASE=http://localhost:3472 \
  npx playwright test --config=e2e/pod-recording/playwright.config.js
```

(or `npm run test:e2e:pod-recording` with the same env vars — the config
lives inside this directory, not at repo root, because `/*.js` is
gitignored there by design.)

## What's here

- `seed-test-user.cjs` — idempotent: Supabase Auth user + `dashboard_users`
  row (`role: admin`) for `e2e-pod-recording-test@ssi-test.invalid`.
- `seed-test-course.cjs` — idempotent: `zzz_test_for_eng` (`visibility:
  hidden`, known=target=eng so there's nothing to translate), one seed/LEGO
  pair for the Mode 1 script, one 6-line/2-speaker pod for Mode 3.
- `fixtures/fake-mic-sample.wav` — a real clip pulled from `course_audio`
  storage, transcoded to 16-bit PCM mono, for
  `--use-file-for-fake-audio-capture`. Chromium replays it fresh on every
  new `getUserMedia()` call, so one short clip covers every recording turn.
- `fixtures/fake-mic-sample-vad.wav` — the same clip with engineered
  leading/trailing silence, needed because Mode 1's recorder is VAD
  (silence-detection) driven, unlike the pod recorder's manual tap-to-advance.
- `01-cast-and-record.spec.js` — the main walk: mode chooser → Listening
  Pods → cast 1M/1F → save → both record links → fake-mic dialogue recording
  → DB row + S3 object + UI playback verification.
- `02-mode1-autocue.spec.js` — Mode 1 script-load + start/stop smoke test.
- `04-autocue-flag-rerecord.spec.js` — flag-for-re-record: records both
  items, flags one, walks the re-record pass over that item alone, and
  checks the flagged take came back as Take 2 while the other stayed Take 1
  and no second upload was sent for it.
- `helpers.js` — login + the `api_base_url` pin (see the comment in there —
  `EnvironmentSwitcher.vue` otherwise silently redirects the app to whichever
  remote machine's `ssi_environment` default is set, every page load).

## On a box without sudo (watson-1)

`npx playwright install-deps chromium` needs root and will fail. Chromium
then dies at launch with `libnspr4.so: cannot open shared object file` — a
missing *system* library, not a Playwright or app fault, so it looks like
the suite is broken when nothing is. The NSS/NSPR libs are already
extracted on this machine; point the loader at them:

```bash
LD_LIBRARY_PATH=/home/tomcassidy/.pwlibs/root/usr/lib/x86_64-linux-gnu \
E2E_BASE_URL=http://localhost:5175 E2E_API_BASE=http://localhost:3472 \
  npx playwright test --config=e2e/pod-recording/playwright.config.js
```

## Known sharp edge this suite works around

`EnvironmentSwitcher.vue` forces `localStorage.api_base_url` back to one of
4 hardcoded machine URLs (Tom's/Kai's/SSi's ngrok tunnel, or
`localhost:3470`) on every mount — there's no way to point the app at an
arbitrary local port through normal means. `helpers.js` intercepts
`localStorage.setItem` for that one key so the suite's pin always wins. If
you're debugging this suite manually in a real browser (not via Playwright),
you'll hit the same redirect — use the machine picker in the navbar, or the
`localhost:3470`/"API Server" option if that's where your instance is.
