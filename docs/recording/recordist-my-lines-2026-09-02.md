# A recordist signs in and sees what they still owe

**2026-09-02** · branch `feat/recordist-my-lines` · route `/my-recording`

Tom's ask, verbatim: *"think of an easier way to surface what needs recording by user login to popty"*.

## What is there now

A recordist logs into Popty and lands on **their own list of outstanding lines**, in the order to
read them. Catrin's reads *"123 lines still to record — 38 of 161 done"*, and under it, 123 Welsh
lines with their English underneath.

**One tap on a line opens the mic on it. One more files the take**, the row redraws as done and the
count at the top drops. *Upload a file* is the same seam for anyone who records elsewhere. *Listen
back* plays the clip stored on the server.

Screenshots, phone and desktop, both drawn states:
→ **https://ssi-dashboard-v7-hd9v93qdd-zenjin.vercel.app/evidence/recordist-my-lines-2026-09-02/index.html**

## The ownership was already modelled — twice, and both were real

There is no new table and no new concept of "assignment". Two places already record who reads what,
and **neither one alone covers both people**:

| | Catrin | Aran |
|---|---|---|
| `dashboard_users.voice_id` | `human_catrinlliar_cym_n` | *null* — his row is an admin row |
| `language_recording_policy.voices[].email` | `catrinlliar@gmail.com` | `aran@hey.com` |

So `GET /api/recording/mine` reads both and unions them, then resolves every candidate through
`resolveRecordist` — the one existing gate on whether a voice is live. A stale `voice_id` that no
policy names is dropped rather than conjuring a queue the recordist surface itself would 404. Eight
editors carry voice ids for languages with no policy voices; they get the page's own honest *"no
recording voice for this login"*, naming the address it looked under.

## What is new, and what is reused untouched

**New:** the list page, and that one route. It is the *only* authenticated route on `/api/recording/*`
— everything else stays link-is-identity by design — because "which voice am I?" is a question about
the caller.

**Reused, unchanged:** the queue itself (`GET /voice/:voiceId`), the take upload (`POST .../take`,
the same archive-before-process seam the autocue uses, with the same silent-take refusal), the tap
recorder, and stored-clip playback. There is one definition of "what is left to record" and this page
is not it.

`/r/:voiceId` is untouched. It is still the right thing for a session in a booth — one tap and it
runs the whole queue at you. This is the answer to a different question.

## Doctrine, applied

- **Tap is the only affordance.** No drag, no swipe, no long-press. While one row's mic is open,
  every other row is inert — one degree of freedom, enforced and tested.
- **State is drawn, not annotated.** A line with no recording is an empty slot: dashed outline,
  dimmed. A recorded line is solid and filled. No tick, no badge, no red or green. The only colour on
  the page is the level meter when it clips.
- **Ship one.** No comparison fork.

## Verification

Signed in through the **real login form, no auth stub**, as a test recordist (`@ssi-test.invalid`,
seeded the same way the pod-recording e2e suite seeds its user) cast to Catrin's voice — so no
session was minted for Aran or Catrin. Chromium, 390×844 and 1440×900:

- landed on `/my-recording` automatically from the recorder role — no navigation
- 123 rows, all `is-todo`; with recorded shown, 38 `is-done` — **exactly** what the queue API returns
- `/api/recording/mine` returns 401 with no token, 403 with a bad one, 200 with a real session,
  both directly and through the popty.app-style proxy
- 12 new tests (6 view, 6 `voicesForEmail`), 27/27 recordist-queue, 15/15 recordist views, build clean

The test login's `voice_id` has been **revoked** — it now resolves to zero voices, verified live. It
cannot file a take against a Welsh line.

## The one gap, stated plainly

**You cannot log into the Vercel preview.** Vercel holds `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
as **Production-scoped only** — verified, not guessed: the Supabase project ref is present in the
popty.app bundle and absent from the preview bundle. So the preview renders and its API proxy works
(the public queue route answers fine), but the Supabase client is null and the sign-in button errors.
I have no Vercel token here, so I cannot fix that scope.

Two ways forward, your call:

- **Tick "Preview" on those two env vars** in the Vercel project settings — then the preview URL is a
  real staging you can sign into and redline.
- **Or say go and I merge to `main`**, which puts it on popty.app in one command. Blast radius: a
  signed-in *recorder* lands here instead of the old per-course Record Room (that is Catrin and four
  `@ssi-test.invalid` accounts), and a Home card appears for logins that carry a voice id. Nobody
  else sees any change.

The backend route is **already on `main` and live on watson-1** — landed separately, on purpose, so
the UI could be staged at all. On its own it changes nothing anybody sees: nothing on popty.app calls
it.

---

## Landed on popty.app — 2026-09-02

Tom's ruling: *"for the Catrin recording test I want the popty links, not the tailnet ones — popty.app"*.
That is the second of the two ways forward above, so `feat/recordist-my-lines` was fast-forwarded onto
`main` (`01411642d`) and Vercel deployed it. The tailnet staging host and its two `.ts.net` URLs are
superseded and no longer the way in; the `.ts.net` same-origin lines stayed on the staging branch and
were **not** carried to `main`.

**The two live URLs**

- Sign in and see your own list: **https://popty.app/my-recording**
- The link that is the identity, no login (Tom's zzz test voice): **https://popty.app/r/human_tom_zzz**

**Verified on the real domain, not from a version string**

- The served entry bundle carries the `/my-recording` route and names the lazy chunk
  `MyRecordingList-DC1pwxPm.js`; that chunk, fetched from popty.app, contains
  `data-surface="my-recording-list-2026-09-02"`, the `/api/recording/mine` call, and the new
  microphone wording.
- Sign-in works because the bundle carries the real Supabase project ref (the thing the Vercel
  preview was missing).
- Authenticated end to end: a session minted for `thomas.cassidy+ssi@gmail.com` against
  `https://popty.app/api/recording/mine` answers **200** with `human_tom_zzz`; without a token it
  answers 401. `https://popty.app/api/recording/voice/human_tom_zzz?includeRecorded=1` answers 200
  with **9 lines, 1 recorded, 8 outstanding** — the fixture, intact.

**Who is affected, exactly.** Six logins carry `role = 'recorder'` and are redirected to this page
instead of the old per-course Record Room: **catrinlliar@gmail.com** and five `@ssi-test.invalid`
test rows (four e2e voice/consent probes plus `e2e-recordist-list`, which has no `voice_id` and gets
the page's honest "no recording voice for this login"). Catrin is exposed **from now** — the next
time she signs in she lands on the list, which reads 161 lines, 38 recorded, 123 still to record.
Nothing she has recorded is touched and the Record Room is still reachable. Separately, the new Home
card appears for any login with a `voice_id` — that is Kai and twelve language editors — which is an
extra card and no change to anything they already do.

**One defect fixed on the way in.** A microphone that will not open used to raise a banner and let
the tapped row snap silently back to TO RECORD, so on a long list nothing said *which* line had
failed. The row now carries the failure itself and says "microphone didn't open" rather than
"not saved" — a recording that was never made is not a file that went missing. Covered by a test in
`MyRecordingList.drawnState.test.js` (7/7 green).
