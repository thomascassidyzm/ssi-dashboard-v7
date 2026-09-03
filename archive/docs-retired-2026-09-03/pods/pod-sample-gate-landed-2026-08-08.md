# The pod sample gate is on main

**Date:** 2026-08-08 · **Merge commit:** `186af122`, on `main` at `127fee25`

## The short answer

**Yes, the gate is real, and yes it is merged.** It is not a document about a gate — it is code
with 34 tests, now on `main`, which is the branch every production Popty service runs from.

`docs/pod-redo-scope-2026-08-07` had a diagnosis saying the gate wasn't deployed. That diagnosis
was right and is now spent: `POST /generate-pods/deu_at_for_eng {"sample_limit": 10}` queued 455
clips and rendered 188 because the code serving that address had no `sample_limit` handling at
all. An unrecognised body field was silently ignored and the request fell through to a full run.

## What the gate actually does

Two modes, and the run names its own mode in its first log line — the missing `SAMPLE`/`BULK`
word is what caught the failure in the first place.

- **SAMPLE** — `sample_limit` is a positive integer, capped at 10 server-side. Skips the approval
  check and truncates the queue, taking the first clip of each distinct voice/track before any
  second clip of a voice already covered, so a five-clip sample exercises the cast rather than
  five lines of one character. Always allowed, or the gate would be unopenable.
- **BULK** — everything else, *including* a run narrowed by `pod_ids` or `roles`. Refused with
  HTTP 409 unless `app_config.pod_voice_approvals` holds an approval for that course whose
  `cast_fingerprint` equals the live casting.

The fingerprint is the load-bearing part: recast a course and it moves, so a stale approval stops
counting on its own with no revocation step for anyone to forget.

The test that matters most is the one aimed at the exact failure that burned the 455: **a
malformed `sample_limit` errors, it never falls through to bulk.** That silent fall-through is the
bypass, and it is now a red test if anyone reintroduces it.

Landed with it: `services/pod-voice-approvals.cjs`, `tools/pod-approve-voices.cjs`,
`api/pod-voice-approval.js`, and the casting-approval surface inside PodLab.

## What still has to happen before you can trust it live

The gate is on `main`. The staleness watchdog pulls `-prod` and restarts the Popty services every
ten minutes, so it reaches the running phase-8 on its own. Until the word `SAMPLE` has been seen
in `~/.local/log/popty-phase8-audio.log` for a real `sample_limit` request, treat every
`/generate-pods` call as bulk — and that confirmation costs a handful of TTS clips, so it is a
spend decision, not something to slip in.

## The merge itself

The branch had moved 192 commits while `main` moved 191. Where the two overlapped, `main` is
mostly the later word and keeps its version: the learning-modes Easy/Fast work, the autocue VAD
fixes, the two content-addressed architecture docs, the audio-repair tail detector. Three
deliberate exceptions:

- **`docs/learning-modes-restructure`** — the branch's text wins. Main's still described
  `phraseLengthPreference`, a knob deleted the same day it shipped; the branch carries the
  correction that matches main's own code.
- **`src/router`** — both routes kept, `/qa-gate` and the German speed A/B page.
- **phase 8's component-introduction guards** — re-applied. They were written on 2026-08-06
  (`f48f2466`), then clobbered on the branch by `cd7392d7`, a stale-file overwrite in a shared
  checkout, which left the branch carrying the test with the code removed. *Components are never
  introduced* is a rail, so the guards came back rather than the test going away. Six tests green.

**Not landed, named so it isn't mistaken for landed:** the branch's best-of-N take selection
(`--takes N`) and the `pending` verb in `audio-repair`. They were built on a `frameDb` tail
adapter `main` has since replaced with the detector your ear validated, so re-porting them is a
deliberate piece of work rather than a merge resolution.

Full suite on `main` after the merge: **1,316 passing, 4 failing — bit-identical to the failures
`main` already had** before the merge (the four LearningJourneyAudioFlags assertions, plus the
e2e specs and `audio-link-reconcile` which need a browser and a live env). 105 more tests than
before.

## Nothing else on that branch is a code job

Everything remaining from the cast-approval and content-audit work is a content or casting
decision, which is Kai's call:

| Finding | Nature |
|---|---|
| 64 of 67 course pods still hold the old 142-sentence set; 141 survive / 89 new per course | content — what to translate and render, and in what order |
| The ten Austrian samples showed nine lines the new canonical keeps word for word | content — the sample proved the voices, not the sentences |
| Customer 3's three target clips missing in 20 of the 65 pods carrying that speaker | audio generation — real work, but TTS spend, so gated |
| deu_at takes stamped `de-AT-IngridNeural` instead of Kai's own voice | casting call, then a mechanical back-stamp — handed to Kai |
| pod-0 sentence-start capitalisation is internally inconsistent | your ruling; the pass that tried to normalise it was reverted because it made the seam worse |
| The 7 courses with English on neither side — lineage proven, translation fidelity unread | content |

The code side of that work — the two-voices-per-pod default, the female Learner cast, the
regional voice pools that were being stranded, the recast tool, the whisper concurrency cap — was
already on the branch and is on `main` now.
