# Recording tool — end-to-end verification, 2026-08-06

Question asked: will the recording tool be the thing that breaks on the day
Kai's friend records Austrian German? **Not any more for the three faults found
here.** Three real defects, all fixed. Two residual issues named at the bottom.

DB reads used `SUPABASE_SERVICE_KEY`. Sanity check passed: **143 courses**,
`kor_for_hin` and `kor_for_tam` both `new_app_status = beta`.

---

## What was actually exercised

Real API + real browser, both local, never production:

```
PRODUCTION_API_PORT=3472 node services/production-api.cjs
npx vite --port 5176
LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs \
E2E_BASE_URL=http://localhost:5176 E2E_API_BASE=http://localhost:3472 \
  npx playwright test --config=e2e/pod-recording/playwright.config.js
```

**8 of 8 e2e tests pass** (51s) — mode chooser, two-voice cast, both record
links, fake-mic dialogue recording, upload, DB rows, S3 object, UI playback,
and the silent-take drop path.

Server-side, 9 direct POSTs to
`/api/production/zzz_test_for_eng/recording/upload` with locally synthesised
WAVs (ffmpeg sine+tremolo and `anullsrc` silence — **no TTS was generated**).

## Does the audio actually land?

Measured on the **stored S3 object**, downloaded and ffprobe'd — not DB
`duration_ms`. Bucket `ssi-audio-stage`.

| take | DB duration_ms | ffprobe duration | S3 bytes | mean volume |
|---|---|---|---|---|
| script-mode probe | 1800 | 1.7998 s | 29,674 | −15.0 dB |
| regeneration probe | 1800 | 1.7998 s | 29,674 | −15.0 dB |
| pod, browser fake mic | 582 | 0.5821 s | 10,448 | −18.1 dB |
| pod, browser fake mic | 706 | 0.7065 s | 12,537 | −18.0 dB |
| pod, browser fake mic | 502 | 0.5021 s | 9,194 | −18.3 dB |
| pod, browser fake mic | 707 | 0.7065 s | 12,537 | −18.0 dB |

Real audio, real speech content, DB duration matches the object to the
millisecond. Encoder tag is `LAME3.101`, not `Lavf` — the iOS-safe container.
Regeneration mode repointed the right `course_audio` row
(`e8a746df…`, `origin=human`, s3_key moved to the fresh key).

---

## Fault 1 — a SILENT take was reported as saved

**This is the Welsh bug, reproduced.** Posting 2s of pure silence returned:

```
HTTP 200  {"success":true,"uuid":"0D7E610B-…","uploaded":true,
           "audioProcessing":{"durationMs":0,…}}
```

The object it wrote is **834 bytes** and ffprobe cannot decode it at all:
`Failed to find two consecutive MPEG audio frames`. Cause: the trim filter
(`silenceremove` at −40 dB) strips a silent or muted-mic take to nothing,
ffmpeg still exits 0, lame writes a header-only MP3. In **regeneration mode
this repointed a real phrase row at the unplayable stub** — I reproduced that
too, and restored the row.

**Fixed.** The endpoint now refuses a take under 100 ms **before the S3 PUT**
(so no orphan bytes) with `422` and plain words:

> This take contains no audible speech (0ms after silence trimming, minimum
> 100ms), so it was not saved. Check the microphone is live and record it again.

After the fix: silence → 422 in **both** script and regeneration mode; a real
350 ms take → 200; a real 2 s take → 200; garbage bytes → 500.

## Fault 2 — a failing save was almost invisible during the session

The failing take was correctly counted, but only on the **end-of-session
summary**, as a bare red number with no reason. A recordist could talk through
a whole script with a dead mic and find out at the end, with nothing left to
retry. A 4xx was also retried 3× over 12s of backoff before that.

**Fixed.** The upload queue keeps the server's own reason per take; the studio
shows `N NOT saved` plus that reason **while recording**; 4xx no longer retries.

(Note: `uploadApprovedRecordings` in `useAutocueState.js` and `uploadAudio` in
`useAudioUpload.ts` are both dead code, uncalled, and both are broken — the
first discards takes silently on failure, the second posts `audio:` where the
server expects `audioData:`. Left alone, flagged: deleting them is a call for
whoever owns that file.)

## Fault 3 — the e2e suite could not run on Linux at all

Every DB read shelled out to `/opt/homebrew/opt/postgresql@17/bin/psql`, a
hardcoded macOS path. On watson-1 that is `spawnSync … ENOENT` before anything
is exercised. Three assertions had also drifted from the UI.

**Fixed.** DB reads go through Supabase REST with the service key
(`helpers.js`: `dbScalar` / `dbCount`); assertions updated for the renamed
"Cast — two voices" heading, the deliberately-removed "Work out the parts"
button, and the saved-vs-editing cast modes. 0/8 → **8/8**.

---

## Phone, 390×844

Screenshots in `docs/recorder-e2e-2026-08-06/`.

Document width vs the 390px viewport — anything over 390 is sideways scroll:

| screen | before | after |
|---|---|---|
| `/record/:course` (Record Room) | 470 | **390** |
| `/record-studio/:course` | 470 | **390** |
| Autocue Studio (recording screen) | 549 | **391** |
| Mode chooser | 470 | **390** |
| `/production/:course/pods` (admin) | 519 | 443 |

Root cause of the universal one: the navbar's right-hand controls measure
458px and had `flex-shrink: 0`, so **every page under the navbar** scrolled
sideways on a phone. It now shrinks and scrolls its own controls. The autocue
stat tiles were the second cause; they now wrap.

`BEGIN RECORDING` is a full-width thumb target with nothing cut off.

---

## Still open

1. **The pods admin page still measures 443 vs 390** (53px). Recordist-facing
   pages are clean; this is Kai's own casting screen. Not chased further.
2. **A green build-hash badge (`f48f2466`) overlaps body text** on both the
   Record Room and the autocue screen at phone width — it sits on top of the
   "Open the full recording studio instead" link. Cosmetic, but it covers a
   tappable link. Whoever owns that badge should give it a corner.
3. **Design question, not a bug:** a take that fails upload is dropped from the
   queue with no per-take retry button. The recordist is now told, but the only
   remedy is to re-record. Whether that deserves a retry affordance is a call
   for Kai.

## Test data created and cleaned

- **9 `recording_provenance` rows** from my manual probes on
  `zzz_test_for_eng` — **deleted** (verified 0 remaining in that window).
- **2 `course_audio` rows** repointed by the regeneration probes
  (`e8a746df…`, `e077c01b…`) — **restored** to their original `s3_key`,
  `origin`, `duration_ms`.
- **~10 S3 objects** under `mastered/` from the probes, incl. the 834-byte
  silent stub that proves the bug. **Not deleted** — the rules forbid deleting
  generated assets. They are unreferenced by any course row.
- The playwright suite's own rows/objects on the hidden `zzz_test_for_eng`
  course are left in place; the suite is idempotent and reuses them.

## Gaps

- **Not tested with a real human microphone or a real phone.** Chromium's
  `--use-file-for-fake-audio-capture` replays a WAV; iOS Safari behaviour,
  real mic permissions and real bluetooth headsets are unproven here.
- **Not tested against `deu_at_for_eng`.** Everything ran on
  `zzz_test_for_eng`, where known = target = eng.
- The e2e suite needs `LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs` on watson-1,
  or Chromium will not launch (`libnspr4.so` missing, no sudo to install it).
  Not committed anywhere — noted here so the next person does not lose an hour.
- My edits are committed on the branch below **but also still sit uncommitted
  in the shared working tree**, mixed with other workers' changes in
  `production-api.cjs` and `AutocueStudio.vue`. I committed from a separate
  worktree with only my own hunks so nobody else's work was swept up.
