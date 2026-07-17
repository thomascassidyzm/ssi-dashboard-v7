# Pod recording flow — E2E proof (fake-mic browser pass), 2026-07-17

Written ahead of tomorrow's Aran + Catrin Welsh recording session. Purpose: a
single read-when-you're-back readout of what's now proven end-to-end by
automation, what's still human-only, and the exact steps for your own manual
pass before the real session. Test suite: `e2e/pod-recording/` (README
there covers running it again).

---

## TL;DR

- **The whole chain is proven, live, in a real Chromium browser with a
  simulated microphone playing real audio** — not a mock, not a unit test.
  Mode chooser → Listening Pods → cast exactly two voices (1 male, 1
  female) → save → both people's record links work → each records their
  lines → uploads land in S3 → `course_audio` rows appear with the right
  voice/role → the pod detail page plays them back. All 7 automated checks
  pass, twice in a row (repeatable, not a fluke).
- **One real gap found and fixed in the test harness itself, not your code**:
  Chromium renamed its fake-microphone flags at some point
  (`-media-capture` → `-media-stream`); the old names are silently ignored
  and fall through to the real (silent, blocked) system mic. Nothing to do
  on your end — flagged here in case you ever hand-roll a similar flag.
- **No application bug found.** One thing looked like a bug and turned out
  not to be — see "Mode 1's two-phase design" below, worth knowing before
  Aran uses it for the one Welsh gap sentence.
- **Test data is fully isolated**: a throwaway course `zzz_test_for_eng`
  (hidden, English known/English target, invented). Welsh (`cym_n_for_eng`,
  `cym_s_for_eng`) was never touched — no reads, no writes.

---

## What's PROVEN by automation

| Step | Proven how |
|---|---|
| Mode chooser renders all 3 modes | Playwright assertion on the rendered cards |
| Mode 3 → Listening Pods → cast panel opens | Navigation + panel content assertion |
| Cast exactly two voices (1♀/1♂), "Work out the parts" solves, "Save cast" persists | Full form fill + save; re-verified idempotent (a second run with the same cast correctly shows nothing-to-save) |
| Both saved cast members get a live `/record/:course?podVoice=` link | Links extracted from the DOM, both distinct voice IDs |
| Opening a record link shows that voice's own lines only, with scene context | Playwright reads "Ready when you are" + line count |
| Recording via a **simulated mic playing a real audio clip** (not silence) | Chromium `--use-fake-device-for-media-stream` + `--use-file-for-fake-audio-capture`, verified the fake track carries real non-zero audio energy before trusting it in the suite |
| Tap-to-advance through every line, "Finish & save" | Full walk for BOTH cast voices, all 6 lines (3 each) |
| Upload network calls return 200 | `page.on('response')` asserts every `/recording/upload` call |
| `course_audio` rows created, correct voice_id, `origin='human'`, correct role | Direct `psql` check against the real DB after the run |
| `listening_pod_sentences.target_audio_id` re-pointed at the new audio | Direct `psql` check |
| Audio is actually in storage — non-zero bytes, `audio/*` content-type | Fetched the real signed S3 URL and checked the response body/headers |
| Playback works in the dashboard UI | Pod detail page, clicked the real "Play target" button, confirmed the `<audio>` element gets a real signed URL and the file it points to is fetchable |
| Mode 1 (New Course) autocue: script loads for a course with an ungenerated gap | Playwright reads "Recording Script Ready" + phrase count |
| Mode 1: Begin Recording → Start Recording → VAD-driven capture → Stop | Full walk with a silence-padded fake-mic clip so the VAD's 800ms silence gate actually fires |

Re-run twice back-to-back with zero flakiness (`npx playwright test
e2e/pod-recording`, 7/7 both times, ~30s total).

---

## What remains HUMAN-ONLY (this suite cannot check)

- **Actual audio quality** — mic levels, room noise, pacing, the "clear and
  a little careful, not rushed" register Aran's instructions ask for. The
  fake mic proves the *pipeline* carries real audio through correctly; it
  says nothing about whether a given take *sounds right*.
- **Welsh-specific content** — correctness of the Welsh text itself, the
  live-edit-before-recording flow's actual text quality, the `…` breathing-
  point convention. None of that exists in the English test course.
- **Real multi-person casting** — the suite proves the mechanics with one
  browser session doing both voices sequentially (an admin account can
  legitimately do this — see `RecordRoom.vue`'s "editors/admins can use it
  too" comment). It does NOT prove two SEPARATE people, on two separate
  devices/browsers/networks, with real email-based access provisioning,
  hitting no surprises. That's worth watching for during the real session
  (the cast panel's provisioning notes — "✓ email now has recording access"
  — should appear for each of Aran/Catrin).
- **Mobile.** The instructions mention "works on a phone" as a pod-recorder
  feature; this suite runs desktop Chromium only.

---

## Mode 1's two-phase design (found while testing, not a bug)

Mode 1 (New Course) looked at first like it silently dropped recordings —
the S3 upload succeeds and returns 200, but no `course_audio` row appears
right away. Traced it through `services/production-api.cjs`'s upload
handler: for **script-mode** uploads (`uuid: null`, no pre-existing row),
the handler mints an id, uploads to S3, and writes a `recording_provenance`
row — but the `course_audio` INSERT only happens for **regeneration mode**
(re-recording an existing row by real uuid) and **pod mode**. This isn't a
gap — `ModeSelector.vue` lists "Batch review and approval" as a Mode-1
feature, and `SessionReview.vue` literally says "Review AI-detected segments
and approve for upload." Mode 1 is a genuine two-phase workflow: **record →
AI-segments the continuous take → you review/approve → THEN it becomes real,
playable `course_audio`.** A raw take existing in S3 + provenance is not yet
"recorded" in the sense the pod flow uses that word.

**Practical implication for tomorrow**: when Aran records the one Welsh gap
sentence via Mode 1, tell him (or whoever's running Mode 1) there's a
review/approval step AFTER the recording pass, before it's actually live —
don't assume "I read it" means "it's in the course" the way it does for the
pods flow (where every tap-to-advance is immediately live). Worth a quick
manual pass (see below) to confirm the review screen's "approve" action is
the thing that actually creates the `course_audio` row, since this suite's
6-second smoke test didn't drive far enough into that screen to prove it.

---

## Your own manual pass — exact steps

Use the **same isolated test course this suite uses** — it's disposable,
English-only (so you can judge every word), and won't touch anything real:

1. **Course**: `zzz_test_for_eng` — display name "[E2E TEST] Pod Recording
   Suite — safe to delete". Already seeded (6-line 2-speaker "coffee shop"
   pod + 1 seed/LEGO for Mode 1).
2. Log in to your normal local dashboard (`http://localhost:5173` or
   whichever machine you're pointed at in the navbar switcher).
3. Go to `/production/zzz_test_for_eng/recording` — confirm the 3-mode
   chooser looks right.
4. Click **Mode 3: Listening Pods** → you land on
   `/production/zzz_test_for_eng/pods`. The cast may already show two
   entries from the automated run ("E2E Voice A" / "E2E Voice B") — that's
   the suite's own test cast, harmless, feel free to overwrite it with real
   names/emails to test the provisioning email flow for real.
5. **Work out the parts** → **Save cast — make the links live**. Copy your
   own "Open ↗" link (or just click it — you're an admin, so both links
   work for you directly).
6. On the record page: tick **"Re-read lines I've already recorded"** (the
   automated run already recorded all 6 lines) so you get the full flow —
   **Start** → read each line for real → **Next** → **Finish & save**.
   Listen back: `/production/zzz_test_for_eng/pods/pod-0` has a play button
   per line.
7. For the Mode 1 review-step question above: from
   `/production/zzz_test_for_eng/recording`, click **Mode 1: New Course** →
   **Begin Recording** → **Start Recording**, read "hello there" naturally,
   pause, **Stop Recording**, then **whatever button takes you to the
   review screen** — confirm approving a segment there is what makes it
   real, playable audio. That's the one piece this suite proved reaches the
   review screen but didn't click through.

Clean-up isn't required (the course is clearly marked test/disposable), but
if you want it gone: `delete from listening_pod_sentences ...`,
`delete from listening_pods ...`, `delete from course_legos ...`,
`delete from course_seeds ...`, `delete from course_audio where
course_code='zzz_test_for_eng'`, `delete from courses where
course_code='zzz_test_for_eng'` — or just leave it; it's harmless and
`visibility: hidden` keeps it off any real list.

---

## Pre-flight note carried over from the earlier HUMIN doc

`which ffmpeg` came back empty on this machine during this test run. Audio
still uploads and plays back fine without it (the pipeline degrades
gracefully — "Audio processing skipped: ffmpeg_not_available" in the API
log), but takes won't get mastered (loudness-normalized to -16 LUFS,
silence-trimmed, properly transcoded to mp3) without it. Worth confirming
`ffmpeg` is actually on the machine Aran/Catrin will hit tomorrow —
`docs/voice-engine/HUMIN-POD-RECORDING-STATE-AND-TEST-PLAN.md`'s pre-flight
block already flags this; this run is a second, independent confirmation
it's still worth checking.

---

## Files

- `e2e/pod-recording/` — the suite (2 spec files, 2 seed scripts, fixtures,
  README).
- Branch: `test/pod-recording-e2e`, merged to `main`.
