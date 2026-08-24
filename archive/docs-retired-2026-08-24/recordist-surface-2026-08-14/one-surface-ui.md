# One recordist surface — what Aran sees now

*2026-08-14. Frontend. Branch `feat/recordist-ui-2026-08-14`.*

Tom, tonight: *"we can do better than this as an interface: can't we?"* — *"let's think
harder about what this needs, and what this does NOT need"* — *"all of this process needs
making more obvious, more natural"*.

---

## The count

**Measured, not estimated.** The "before" numbers come from building the base commit
(`fe8e7e37`), serving it, and opening the exact link Aran holds
(`/record/cym_n_for_eng?podVoice=human_aran_cym_n`) in a phone-sized browser with no
session. The "after" numbers come from opening the same link against this branch's build.

### Screens, link in hand, before the first line is read

| | Before | After |
|---|---|---|
| 1 | **Sign In to Popty** — email field | **Hello Aran** — 71 of 153 recorded, Start |
| 2 | **Sign In** — enter the code from your email | **the line**, big |
| 3 | **Record Room** — "Ready when you are" | — |
| 4 | the autocue recording screen | — |

**4 screens → 2.** Plus, before, an email client: the link did not even reach Popty's
recording code. Driven live, it ended at `/login?redirect=/record/cym_n_for_eng…` with the
heading **"Sign In to Popty"**.

### Taps, from receiving the link to reading the first line

**Before — 6 in-app taps, one typed email address, one code, and a trip out to email:**

1. tap the link → bounced to Login
2. tap the email field · type the address
3. tap **Send Login Code**
4. *leave Popty, open the mail app, find the code, copy it* (≥3 actions outside the app)
5. tap the code field · type/paste the code
6. tap **Sign In**
7. tap **Start** on "Ready when you are"

**After — 2 taps:**

1. tap the link → **Hello Aran**
2. tap **Start** → the line is on screen

**6 taps + an email round trip → 2 taps.** Nothing typed. No account. No code.

### Surfaces

**5 → 1.** The five Tom screenshotted were `/production/:course/pods`,
`/production/:course/pods/pod-0`, `/record/:course?podVoice=…`, `/production/:course/qa-gate`,
and `/production/:course/recording`. The recording path is now `/r/:voiceId` alone.

---

## The journey, as a human

Aran taps the link on his phone. It says **Hello Aran**, and underneath, *71 of 153
recorded*. Four lines tell him what to do, in the words that were already right:

> Tap **Start** and read the highlighted line aloud.
> Finish the line, take a breath, then tap **Next** (or press Space).
> Keep going — tap **Again** to re-read a line.
> Tap **Done** at the end. It saves itself.

There is a microphone picker if he has more than one, and the checkbox — *"Re-read lines
I've already recorded"* — in exactly its old wording. Switch that on and the 71 takes he
already made are listed, each with a play button, so he can hear what he did last time
before deciding to do it again.

He taps **Start**. One line fills the screen in large type: the Welsh primary, the English
underneath, quieter. Above it, *71 of 153 recorded*. Below it, two thumb-sized buttons:
**Again** and **NEXT**.

He reads. He taps NEXT. The line he just read appears in a small bar — *"You just read…"* —
with a button that says **Hear stored clip**, tagged **STORED**. Tapping it fetches the clip
back down from the server and plays it. Not the recording in his phone: the bytes the
server kept. If those bytes will not play, he reads why — *"The server has no stored clip
for this line yet (404)"* — instead of a green tick over silence.

Then the next line. Then the next. At the end, **Done**, a list of everything he read with a
play button on each, and any line that failed to save named with a **Record it again**
button next to it.

What he never sees: a course code, a pod slug, a uuid, a mode picker, a cast panel, a
regenerate button, a QA gate, a sign-out button, the build sha, or the sentence *"No voice
slot assigned to you on this course."* He cannot act on any of them.

### Tom's side — `/admin/recording`

One page, normal login. Per language: a **Record with people** switch, a coverage bar split
by the two voices, the plain-words count, and a **Copy link** button per voice. Nothing else
— no per-course toggles, no per-pod gating, no per-clip approval.

---

## Routes: removed, redirected, left standing

**Added**
- `/r/:voiceId` — the surface. `meta.public` does three jobs deliberately: it exempts the
  route from the auth guard, from the recorder-confinement block that force-redirects role
  `recorder` to `/record/:course`, and it hides the app navbar.
- `/admin/recording` — Tom's page, normal auth.

**Redirected (nothing 404s)**
- `/record/:courseCode?podVoice=X` → `/r/X`. This runs in the **global** guard, not a
  route-level `beforeEnter`: `beforeEnter` fires *after* `beforeEach`, so an anonymous Aran
  would have been sent to Login and never reached the redirect. Every record link the cast
  panel ever produced carried `?podVoice=`, so every link he holds lands correctly.
- `PodCastPanel`'s "Copy record link" now emits the `/r/:voiceId` shape.

**Left standing, deliberately**
- `/record/:courseCode` with **no** `podVoice` — still the old Record Room. It is where the
  recorder-confinement guard sends a logged-in `recorder`, and deleting it would strand
  that role mid-session. It is now unreachable from any link we hand out.
- `/production/:course/recording` (AutocueStudio) — it carries MODE 2 REGENERATION, which
  the recordist surface deliberately does not do. Removing it would lose function, not
  bookkeeping.
- `/production/:course/pods` and `pods/:slug` — other views import them, and the cast panel
  is where Tom's links are still generated today. Not this pass.
- `/production/:course/qa-gate` — a third worker owns it. Untouched.

---

## What was proved, and against what

**Against the sibling's REAL API** (`feat/recordist-api-2026-08-14`, booted locally on
:4794, **read-only — every non-GET aborted, because uploading a test tone into Aran's live
Welsh queue is damage, not a probe**):

- `GET /api/recording/voice/human_aran_cym_n` → 200, Aran's real queue: **153 lines, 71
  recorded**. The UI rendered "Hello Aran / 71 of 153 recorded".
- All 71 existing takes listed and playable.
- `GET …/line/…/clip` → **302 → signed S3 → 206**, and the clip played through to its end.
  The served bytes, over the real chain.
- ⚠️ `GET /api/recording/coverage` **fails on the real DB**: `canceling statement due to
  statement timeout`. That is the sibling's query, in flight, not the UI. The admin page
  will show its error state until that lands.

**Against a local stub** (`scripts/recordist-stub-api.cjs`, which stores real uploaded bytes
and serves them back) — the write half, which cannot be run against production data:

- the record → upload → **hear the stored clip** loop: a real MediaRecorder take through
  `POST …/take` multipart, then **37,002 bytes of `audio/webm` fetched back** from the clip
  route and played. Playback never touches the local blob — verified on the wire, since a
  `blob:` playback would make no request at all.
- Space advances, `R` re-reads, Done lists the session.
- **Both failure paths**, forced:
  - upload rejected → button reads **"Not saved — nothing to play"** `[NOT SAVED]`,
    disabled, with the server's own words on screen; no tick.
  - clip route 404s → *"The server has no stored clip for this line yet (404). It may not
    have finished saving."*; the button leaves the playing state.

---

## What failed

- **`/api/recording/coverage` times out on the real database.** Sibling-side, named above.
- **Three bugs the drive caught that reading would not have**, all fixed and committed:
  `credentials: 'include'` on the admin fetches (this estate authorises off a Supabase
  bearer token; with a wildcard CORS server the credentialed request fails outright and the
  page rendered only "Failed to fetch"); the build-sha badge pinned to the corner of the
  recordist's screen; and the four numbered steps rendering without their numbers.
- **No deploy.** This branch is not `main`, so nothing is live on popty.app. Verified only
  on a local build of `dist/`.
