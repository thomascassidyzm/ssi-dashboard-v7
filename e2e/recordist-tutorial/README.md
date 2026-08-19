# The recordist tutorial, driven — E2E

Opens `/recording-tutorial` on a phone-sized screen, reads all four practice
items off a fake microphone, reaches the review screen, plays the LEGO pieces
its own slow read was cut into, and plays a sentence it never said, spliced out
of those pieces. Then it checks the thing the feature is actually *for*:
**nothing was saved**.

```bash
# a dev server on a free port — 5180-5186 and 5271 belong to other jobs
npx vite --host 127.0.0.1 --port 5188 --strictPort &
E2E_BASE_URL=http://127.0.0.1:5188 \
  npx playwright test --config=e2e/recordist-tutorial/playwright.config.js
```

- **The mic** is Chromium's fake device fed `fixtures/tutorial-four-items.wav`,
  built at config load by `make-tutorial-mic-wav.js`: room tone, two 600ms
  natural reads, then two slow reads of three 300ms pieces with a 1s beat
  between each. That is a competent first-time recordist doing what the coach
  panel asks, and every timing in it is read off `useVAD.ts` /
  `useContinuousRecorder.ts` rather than guessed — the file's own comments say
  which constant each number is answering.
- **Zero writes is MEASURED, not asserted from the UI.** A catch-all
  `page.route('**/*')` records every request the page makes and *aborts* any
  that is a write method, that hits a take-filing endpoint
  (`…/recording/upload`, `/api/recording/`, `/api/audio`), or that reaches
  Supabase/S3 for anything but the one read named below. The verdict is the
  request log. A typical clean run: **158 requests, all GET, no violations.**
- **The one database read is the SHELL's, not the tutorial's.** `AppNavbar`
  mounts on every route and calls `getAllCourses()` so the header's course
  picker has something to show, so a practice run does emit
  `GET /rest/v1/courses?select=*` — twice. It is read-only and carries nothing
  of the recordist's, so "nothing is saved" stands; it is pinned to that exact
  shape so that the tutorial reading course data *of its own* would fail the
  test rather than hide behind it.
- **No API stubs, and no auth stub, in the main test — on purpose.** The
  tutorial must need neither a session nor an endpoint; stubbing either would
  conceal exactly the dependency this suite exists to rule out. (The second,
  one-second test does stub, because it mounts the *real* recorder to check the
  `data-surface` marker is absent there.)
- **Playback is measured too.** Piece buttons cut on the sample, so the spec
  wraps `AudioBufferSourceNode.prototype.start` and reads the offset/duration
  back, then measures RMS inside each piece and just past its end — loud in the
  middle, silent after = the cut landed in the beat. The spliced sentences play
  through an `<audio>` element on a blob URL instead, so `HTMLMediaElement
  .prototype.play` is wrapped as well and the blob is fetched and decoded:
  ~1.15s at ~0.28 RMS is three real pieces joined, not silence.

If Chromium fails to launch with `libnspr4.so: cannot open shared object file`,
this host keeps those libraries outside the system path:

```bash
export LD_LIBRARY_PATH=$HOME/.pwlibs/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
```

If the whole run dies on the sign-in screen, the worktree is missing `.env` —
the Vite build needs it for the Supabase URL. Symlink the main checkout's.
