# eve audio-gate over-rejection — GitHub issue #18

**Status:** Fix implemented and committed on `kai-stage` (`e476b242`). **Decision pending Tom:**
does he own the canonical gate change on `main`, or is Kai cleared to land it? Issue #18 is the
ask-for-ownership.

## The problem (one paragraph)

The tail-click audio gate over-rejects benign **eve** (xAI) clips *at generation time*, on every
render, so no number of reruns clears them. `detectTailClick` (in `services/audio-processor.cjs`)
has three rules:

- **burst** — sharp real click, envelope-derivative spike. Reliable. Keep for all voices.
- **resurgence** and **rise** — soft, envelope-based. The code itself documents these as unable
  to distinguish a breath/grunt from a real click, and already disables them for long-form text.

eve's flag distribution across the deu/fra audit: **2,906 resurgence + 3,462 rise vs only 285
burst**. i.e. eve trips almost entirely the two *unreliable* rules, on its breathy tail decay.
`ara`/`leo` don't trip them. Kai listened to a batch of flagged eve clips — **no audible clicks**.
So the previously-reported ~9,158 "suspect existing eve clips" are a **false alarm** — nothing to
repair or regenerate. But because eve trips on *every* render, these clips are permanent
stragglers that block deu/fra generation completion.

## What was done (`e476b242` on kai-stage)

Voice-scoped exemption from the **soft** rules only, mirroring the existing long-form-text exemption:

- Added `SOFT_TAIL_EXEMPT_VOICES = [/eve/i]` + `isSoftTailExemptVoice()` in `audio-processor.cjs`.
- Added a `burstOnly` option to `detectTailClick` / `repairTailDefect`.
- Threaded `voiceId` through `masterAudio`'s 7 call sites.
- `phase8-audio-v13.cjs` passes `burstOnly` for eve.
- **Hard burst rule stays for ALL voices.** ara/leo are NOT exempt and don't need it (their
  occasional tail defect clears on retry — 0 permanent failures).

**Result:** deu known(eve) went 640/641 (was ~80%). This is what makes eve stragglers *completable*.

## Exact next step

1. **Tom decides ownership** (issue #18). If Kai is cleared: reconcile `e476b242` with Tom's
   canonical gate when/if his version lands on `main` — this change re-diverges
   `audio-processor.cjs` + `phase8-audio-v13.cjs` from main again (they were just re-merged in
   `d0d1910e`). It's deliberately a **temporary kai-stage** implementation.
2. Once eve is completable, finish deu/fra generation (`projects/04-deu-fra-generation-state.md`).

## Files

- `services/audio-processor.cjs` — `detectTailClick`, `repairTailDefect`, `SOFT_TAIL_EXEMPT_VOICES`,
  `isSoftTailExemptVoice`, `masterAudio` voiceId threading.
- `services/phases/phase8-audio-v13.cjs` — passes `burstOnly` for eve.
- `tools/declick-tail.cjs` — DSP repair (no TTS) for *real* tail defects on non-exempt voices.

## Gotchas

- This is **kai-stage only**. Firing TTS from a `main` checkout does not have this exemption →
  eve stragglers reappear. (See the audio-gates/de-hiss branch-divergence note in
  `projects/02-xai-dehiss-pr-17.md` and `branches-and-uncommitted.md`.)
- The soft rules are genuinely useful on *other* voices — do not delete them globally, only
  voice-scope the exemption.
