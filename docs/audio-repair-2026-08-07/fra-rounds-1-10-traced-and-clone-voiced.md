# fra rounds 1-10 — the traced path, the byte proof, and why you couldn't hear it

2026-08-07, ~04:25Z. Written after fetching exactly what the script viewer fetches, before and after.

## The path, in three lines

1. **Popty → ScriptViewer → LearningJourneyView** calls
   `GET /api/production/fra_for_eng/learning-journey` — for rounds 1-10 that is **107 items
   resolving to 169 distinct clip UUIDs** (53 known + 53 target1 + 53 target2 + 10 presentation).
2. For each UUID the viewer calls **`GET /api/production/fra_for_eng/audio/<uuid>/url`**. That
   endpoint reads **`course_audio.s3_key`** server-side (it has done since 2026-01-07, `eeb3e218`)
   and returns a signed S3 URL. It does **not** build a URL by convention.
3. So the bytes the viewer plays are decided by **one DB column per clip** — `course_audio.s3_key`
   — and by nothing in the browser, the frontend build, or the deploy state.

## What that trace proved about "it sounds the same"

Measured on watson-1 at 04:1xZ, against the live endpoint, before any new work tonight:

- The viewer's rounds-1-10 clip set and the 03:18-03:55Z rebuild's clip set are the **same 169
  rows** — 0 in the viewer that weren't rebuilt, 0 rebuilt that the viewer doesn't play.
- All **169/169** resolved to the s3_key written by that rebuild. Not one stale key.
- Sampling 15 old/new pairs and hashing the actual downloaded bytes: **15 differ, 0 identical.**

**The viewer was already playing new audio.** It was new audio *in the same voices at the same
pace* — old vs new durations differ by ±0.1s, and two clips came back byte-different at identical
size. There is no ear that can tell those apart. That, not a stale file, is what "the same shit as
before" was.

Corollary worth keeping: the truncation the whole repair was aimed at is **not visible in rounds
1-10**. Old and new durations match to within a tenth of a second across the sample. Whatever was
damaged, this stretch of the course was not obviously it.

## What changed since, so you can hear it

Your ruling: *use my clone voice.* Applied to the **English side only** — the clone can't speak
French, and the French target voices are untouched.

- `courses.fra_for_eng.voice_config.voices.known` and `.presentation` → `xai_gfzdpspr5fdp`
  (Tom clone). Previous config saved at `fra_for_eng-voice-config-before-clone.json`.
- Ran the reuse-first pass over rounds 1-10: **31 clips freshly rendered** (1,295 characters of
  TTS — pennies), **32 reused** from clone-voiced clips that already existed in the estate,
  **106 French clips untouched** (SATISFIED — they are still tonight's fresh renders).
- Run log: `fra_for_eng-rounds1-10-clone-known-run.json`.

Verification, again from the viewer's seat, after:

| check | result |
|---|---|
| English clips in rounds 1-10 now carrying the clone voice | **63/63** (`xai_gfzdpspr5fdp` ×56, bare `gfzdpspr5fdp` ×7 — one voice, two spellings) |
| of those 63, s3_key changed vs the Eve-era rebuild | **63/63** |
| of those 63, fetched 200 through the viewer's own endpoint | **63/63** |
| truncation check — final 80ms still at speech level | **0/63** (every clip ends in silence, including the 32 reused incumbents) |
| `courses.audio_stamp` bumped | yes, 04:25:38Z |

## Listen now

popty.app → fra_for_eng → Production → **Script Viewer** → rounds 1-10. The English prompts and the
"The French for… is:" lines are **your own voice**. If you hear Eve there, the pipe is broken and I
am wrong; if you hear yourself, the pipe is proven end to end.

## Two things you should know before you say yes to more

1. **The course is now mixed.** Rounds 1-10 English = your clone; round 11 onwards = Eve. One
   command extends it (`rounds: N` on the same pass) — say the word and how far.
2. **Nothing about the truncation hunt is settled by this.** Rounds 1-10 show no measurable
   end-cutting. If the damage you heard is real and elsewhere, the word-loss scan over the full
   51,371 clips is still the way to find it, and it has never completed a run.
