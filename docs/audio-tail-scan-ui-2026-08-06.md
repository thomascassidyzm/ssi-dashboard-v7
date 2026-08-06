# The tail-truncation scan, on the dashboard

**2026-08-06.** The detector was validated on 2026-08-06 against Tom's ear. This is the surface
that lets someone other than a terminal run it, read it and act on it. Nothing here changes the
detector, and nothing here writes.

---

## Where it is

**Production → a course → Missing Audio → Audio Repair → “Tail-truncation scan”.**

It is a section INSIDE the existing Audio Repair panel, not a second panel, because its output is
that panel's input: every reported clip has an **Open in repair** link that drops it into the
preview / propose / accept workspace already there. The repair flow is untouched.

## What it does

- **Run a scan.** Scope it by seed (“Seeds 1 to 20”), by role, and by concurrency. A whole-course
  scan asks for confirmation first, because it is one S3 download and one ffmpeg decode per clip
  across tens of thousands of clips — minutes to hours. It spends no money.
- **Watch it.** The job reports progress every 250 clips, so a small scan finishes before the bar
  moves; the panel says so rather than looking stuck.
- **Read it.** Per clip: the text, role, voice, duration, the detector's own sentence, its numbers
  (fall rate in dB/ms, zero-pad %), and an inline player.
- **Filter it.** Trimmed / short-for-its-text / everything, and by voice.

## The two things every screen says, because a count alone lies

1. **A flag means the clip was TRIMMED.** On the 20 clips a human has listened to, 16 were audibly
   damaged and 4 were trimmed harmlessly. Read a flag as “this was cut, and 4 times in 5 that was
   audible”. The machine never passes, repairs or deletes audio.
2. **The flag rate PER VOICE, first.** It is a table with “read this first” on it, and any voice
   above 15% is marked *verify by ear before trusting*. The 0.70 dB/ms line was read off one course
   and three voices; a voice that lights up wholesale is a calibration finding, not ten thousand
   damaged clips.

The two detectors are never merged into one score. **Trimmed** (edge shape) and **short for its
text** (duration) are different questions in different units, shown as two badges and two counts.

## What it will never do

No database write. No S3 write. No TTS. No repair. No deletion. A scan reads clip rows, reads
bytes, measures, and holds the answer in memory.

Job state is **in-process**: restart the API and running or finished scans are gone. The panel then
says *the API restarted while the scan was running; nothing was written; run it again* — which is a
different sentence from “your scan failed”, and it is honest precisely because a scan writes
nothing.

---

## Verified, on real audio

`deu_for_eng` seeds 1–1, concurrency 2 — 74 clips, real Supabase read, real S3 GETs, real ffmpeg
decodes, through the real HTTP routes:

| | |
|---|---|
| measured | 74 (0 could not be measured) |
| trimmed (edge shape) | 3 |
| short for its text (duration) | 20 |
| flag rate per voice | eve 7.1% (2/28), ara 4.3% (1/23), leo 0% (0/23) |

Among the three trimmed clips is **`f0404e5d` — “to speak German with you”, 1,176 ms** — the exact
clip the detector document opens with, the one Tom heard as *“to speak German wi…”*. The surface
finds it unprompted, in a scan anyone can start from a browser.

Tests: 19 job-store unit tests, 11 route tests, 7 component tests, all passing, alongside the
existing repair-core (48), repair-route (15) and preview-router suites. Six pre-existing failures
elsewhere in the repo (pod origin guard, learning-journey flags, Playwright e2e specs) are unrelated
and were confirmed failing without these changes.

---

## (C) The proof-of-quality seam — what I found and what I wired

I was asked to find the approval gate and the Audio Preview sampler before designing to them. Both
exist and both are substantial.

### The manual approval gate — `services/course-qa-gate.cjs`

Its `audio_clip_flags` table was **built for this**: `source IN ('detector','veracity','human')`,
plus `detector`, `detector_precision` and a `metrics` jsonb, and a `resolution` CHECK with exactly
two exits so an agent's opinion can never clear a flag.

`flagRowsFromScan(job)` produces exactly those rows — `source='detector'`, `detector='edge-shape'`,
`severity='suspect'` (not `'bad'`: 4 in 20 were harmless), the detector's own reason, its
measurements in `metrics`, and `detector_precision: 0.80`. Served read-only at
`GET /api/audio/tail-scan/jobs/:jobId/flag-rows`, which states `written: false` in its own payload.

**The gap, stated as a gap: nothing inserts them.** The gate raises flags only from a human's round
sign-off; there is no endpoint anywhere that writes a detector flag. Adding one is a single insert
plus a route — but it is a WRITE, and this commission's rule was that the scan surface never writes.
So the rows are one call away and the decision is yours: *should a scan be able to raise machine
flags into the gate, attributed to whoever pressed it?* If yes, it is an hour on the gate surface,
not here.

### The Audio Preview sampler — `services/audio-preview-router.cjs` `GET /sample`

It draws a uniform random sample of a course's clips for a human to listen to, and can badge them
only with the stored veracity verdict — which is blind to this damage class by construction
(whisper reconstructs a mid-word cut before the diff runs).

`GET /api/audio/tail-scan/:courseCode/verdicts?audioIds=…` answers with the newest **finished** scan's
verdict for those clips, naming the job and when it ran so a stale annotation cannot pass as fresh,
and stating that an absent clip is never a pass.

**The gap: this annotation is only as durable as the API process.** The preview router is
DB-backed and read-only by contract; a durable badge means persisting the scan report — a table and
a write path, the same decision as above. I have left the seam and not invented the integration.

### Not done, and why

I did not change `audio-preview-router.cjs` or the preview page to consume the verdicts endpoint.
Wiring a page to an in-memory source that empties on restart would make the preview page's badges
sometimes-there — worse than a clean seam. It becomes a one-line fetch the moment reports persist.
