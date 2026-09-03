# Tiebreak: does /r/human_aran_cym_n work? — settled live, read-only

**VERDICT: CAN ARAN RECORD TODAY AT https://popty.app/r/human_aran_cym_n — YES.**

Driven live in headless Chromium, 390x844, iPhone UA, not logged in, 2026-08-19 ~14:12–14:15Z.

## The rule

`/r/:voiceId` is a real route on the deployed code (`src/router/index.js:417`, `origin/main` = prod checkout `dad77f52`), `meta: { public: true }` — no login, no navbar, and exempt from recorder-confinement. The `:voiceId` param matches **any** string, so **every** `/r/<x>` hits RecordistRoom. Nothing reaches the catch-all.

- **Known voice id** → the recordist room, personalised, with the line queue.
- **Unknown voice id** → the same room, which calls `GET /api/recording/voice/<x>`; a **404** renders an explicit card: *"This link doesn't work any more — Ask for a new recording link and this page will pick up where you left off."*

**There is no silent fall-through to the home page.** The dangerous failure mode Kai was worried about does not exist here: a bad link says so, in plain words, on a page that looks nothing like the recording room.

## Live results (all three URLs)

| URL | HTTP | Final URL | Renders |
|---|---|---|---|
| `/r/human_aran_cym_n` | 200 | unchanged | **"Hello Aran — 0 of 170 recorded"**, instructions, re-read toggle, **START** |
| `/r/human_catrinlliar_cym_n` | 200 | unchanged | **"Hello Catrin — 0 of 275 recorded"**, same shell, **START** |
| `/r/human_kai_fin` | 200 | unchanged (**not** redirected to `/`) | "This link doesn't work any more" |

Chunk `RecordistRoom-Ducyh3y3.js` loaded 200 on all three, plus `recordingApi`, `useStoredClip`, `StoredTakeButton`. API: `200 /api/recording/voice/human_aran_cym_n?includeRecorded=1` (total 170, recorded 0, remaining 170) and `200 …catrinlliar…`; `404` for `human_kai_fin`.

Tapping START on Aran's URL entered the recording view: first line **"Bore da, Sarah!" / "Good morning, Sarah!"**, the re-record reason banner *"T-20 ALL: full re-record commissioned 2026-08-16 (trim-chain damage, whole set)"*, and controls **Again · NEXT · Stop here** — Again is present, beside NEXT, exactly as reported.

## Which worker was wrong

**Job #314 was wrong, and I can name the mechanism.** It read `src/router/index.js` in the working checkout, which is parked on branch `fix/veracity-capability-guard` — a branch that predates the recordist surface. On that branch there genuinely is no `/r/` route and line 698 is the catch-all, so its reading of the file was accurate and its conclusion about the live site was false. On `origin/main` (and in the prod checkout `…-v7-clean-prod`, HEAD `dad77f52`) the route is at line 417. #314 also used a voice id that does not exist, so even a correct checkout would have shown it the 404 card — but its stated reason (catch-all redirect to `/`) is refuted by the browser: the URL does not change and the RecordistRoom chunk loads.

**Job #295 was right — including the detail I most expected to be invented.** Its byte-level claim reproduces exactly: each line carries `clipUrl` = `/api/recording/voice/human_aran_cym_n/line/<id>/clip`, which answers **302** and follows to S3 **200, `audio/mpeg`, 11,283 bytes** — the same number #295 reported. That is the *existing* take for the line (what the "You just read" panel plays back), not a new recording. Nothing was hallucinated. The one difference is the chunk hash: #295 saw `RecordistRoom-BgbXU_JP.js`, I see `RecordistRoom-Ducyh3y3.js` — a deploy has happened between 13:37Z and now; hashes rotate, and this is not a contradiction.

## Rails observed

No code, data, S3, or deployment changed. No audio generated. I tapped NEXT once to reach the post-line panel; the resulting `POST /api/recording/voice/human_aran_cym_n/take` was **intercepted in-browser and never sent** (it retried 3x, all aborted), and the panel then correctly showed *"Not saved — nothing to play / NOT SAVED"*. A fresh read-only API call after the run still reports **recorded 0 / remaining 170** — Aran's queue is untouched and complete.

**Gap:** screenshots exist locally (`/tmp/rtb/*.png`) but I did not publish images — the evidence directory that serves them sits outside this workspace's repo scope. The tables above are transcribed from those captures.
