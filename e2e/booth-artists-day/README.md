# The artist's day, in a real browser, against staging

One Playwright scenario that does what Aran does: opens `/r/<voice>` in a real
Chromium, reads a line into a real `MediaRecorder`, has the server confirm it,
reads one too quietly and has the server REFUSE it, reads it again, reloads the
page, closes and reopens the browser over the same profile — and checks at every
settled point that recorded + still-to-read equals the run, nothing is negative,
and no done-tick shows while a refusal or an upload is pending.

Nothing is faked but the air in front of the microphone (`make-mic-wav.js`,
played by Chromium's `--use-file-for-fake-audio-capture`). Uploads, refusals,
IndexedDB, the reload and the reopen are all real, against the staging
production-api on 3490 (the LIVE database) through the staging SPA on 3491.

It can only ever write to the throwaway voice `human_e2e_booth_zzz`, the course
`zzz_e2ebooth_for_eng` and its one pod (`fixture.cjs`) — a `zzz`-language voice
in its own dialect, so its queue is those eight lines and no real artist's queue
can see them.

```bash
node e2e/booth-artists-day/fixture.cjs reset      # fresh: 8 to read, 0 recorded
npx playwright test --config=e2e/booth-artists-day/playwright.config.js
node e2e/booth-artists-day/fixture.cjs verify 1,2,3   # what the DB should hold afterwards
```

Nightly: `booth-artists-day-browser` in `~/command-surface/ops/ci/ci-checks.sh`
runs `run.sh` with `REFRESH_STAGING=1`, which first brings `~/wt-staging` to
`origin/main`, rebuilds its SPA if HEAD moved, and restarts the two staging
units. Screenshots land under `~/ssi-evidence/ssi-dashboard-v7/e2e/booth-artists-day/`.
