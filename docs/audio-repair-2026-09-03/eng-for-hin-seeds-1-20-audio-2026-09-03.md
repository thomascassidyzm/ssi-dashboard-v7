# eng_for_hin — audio for seeds 1–20 (opening of the course)

**Date:** 2026-09-03 · **Requested by:** Kai · **Scope:** seeds 1–20 inclusive, plus their LEGOs and practice phrases

## Bottom line

**The opening is NOT playable end to end.** The English (target) side is now in good shape. The
Hindi (cue) side is not, and — this is the blocker — **no new audio can be generated for this
course at all**, because every voice in its config is xAI and **xAI was retired from new renders
on 2026-08-27** (Tom's standing ruling). This is not something I can decide around: it needs a
decision from you.

## What I generated, and what happened

The count first, as asked. For seeds 1–20 the dashboard's own planner (`GET /plan/eng_for_hin?seeds=1..20`) reports:

| | count |
|---|---|
| Slots in scope | 1,746 |
| Already had audio | 827 |
| **New clips implied (TTS jobs)** | **619** |
| Reusable from existing audio (copy, no TTS) | 294 |
| Needing authoring | 0 |
| Estimated cost of the 619 | $0.33 |

**619 new clips — under your 1,000 threshold**, so I proceeded rather than stopping on the count.

I ran the dashboard's own generation path (`POST /generate/eng_for_hin`, phase8), scoped to seeds
1–20 and to the English target roles only — see "Why I held the cue side" below. Result:

- **218 render attempts → 14 succeeded, 204 failed.**
- Every one of the 204 failures returned the same non-retriable error:
  > `Retired provider "xai" reached tts-service.generate (403). New renders may not use it (Tom 2026-08-27). Existing clips on it are untouched and still play.`

So the failures are the policy working correctly, not a bug. Separately, the run's link and
copy steps brought in real existing audio: **308 new `course_audio` rows landed** in total
(294 clone-copies + 14 renders/reuse), and a course-wide pre-generate link step bound
**5,006** already-existing clips that were sitting unlinked.

### Voices actually used

All 308 new rows are in the course's configured voices — **Olivia** (`xai_bedd6226`, target1) and
**Tom** (`xai_gfzdpspr5fdp`, target2). Nothing fell back to an Azure voice, so **no wrong-voice
clips were introduced**.

## Verification: 308 of 308 good

I fetched **every one** of the 308 new clips through the live learner route
(`ssi-learning-app.vercel.app/api/audio/<id>`) and measured each one:

| check | result |
|---|---|
| Resolved HTTP 200 | 308 / 308 |
| Real audio, duration > 0.4s | 308 / 308 |
| Not silent (mean volume > −45 dB) | 308 / 308 |
| **Failures — silent, truncated or missing** | **0** |

Duration min 0.96s, median 1.92s, max 3.60s. Loudness −15.7 dB to −26.1 dB. **No clip needs
naming as a failure — there were none.**

Hear a couple of them (tap to play):

https://ssi-learning-app.vercel.app/api/audio/91570684-d2d7-4be6-8105-67006918e71c?f=.mp3

https://ssi-learning-app.vercel.app/api/audio/4b93c274-4287-4e7e-9e72-8ac2332bec8e?f=.mp3

And an existing Hindi cue clip, in the voice the course is *currently* configured with (Eve):

https://ssi-learning-app.vercel.app/api/audio/b5552ec0-4fda-4e23-8a50-d8c75a3ad46f?f=.mp3

## The voices you named — what I found

You asked for **VIHAAN** and **ISHANI** as the Hindi cue voices, split 50/50. I checked before
generating, as instructed, and the course config disagrees with that on every point:

1. **The course is configured with a different voice.** `eng_for_hin.voice_config` has
   `known` and `presentation` both set to **Eve** (`eve`, xAI, multilingual female). Not Vihaan,
   not Ishani.
2. **Ishani does not exist.** Not in xAI's live catalogue, not in the estate `voices` table, not
   anywhere in the repo. I asked the provider directly and it answered:
   `404 — TTS synthesis failed: Voice 'ishani' not found`.
3. **Vihaan is real** — `bcf738e4`, xAI, male, Hindi, in the estate `voices` table — and it does
   render (I probed it: 2.04s of real Hindi speech). But it is **not** configured for this course.
4. **There is no 50/50 split mechanism.** `voice_config` has exactly one `known` slot, and the
   generator's `getVoiceForRole('known')` returns one voice for every item. A random per-item
   split of two cue voices is not expressible on this path today — it would need building.
5. **And it is all moot anyway**, because xAI is retired: Vihaan and Eve are both xAI, so neither
   can be used for a new render regardless of which you pick.

Per your instruction I **reported rather than guessing**, and did not render 407 Hindi cue clips
in a voice you had not chosen.

## Why I held the cue side

I generated only the English target roles, because those are correct under *every* possible
outcome of the voice question — the target voices are read from the config exactly as you said,
and no ruling you make about the Hindi cue changes them. That was the maximum amount of work
carrying zero rework risk. The Hindi cue side I left alone, pending your decision.

## Where seeds 1–20 actually stand

| | rows | Hindi cue | English target1 | English target2 |
|---|---|---|---|---|
| Seeds | 20 | **10** | 20 | 20 |
| LEGOs | 57 | **51** | 57 | 57 |
| Practice phrases | 486 | **95** | 380 | 388 |

The practice phrases are the bulk of the course, and they have Hindi cue audio for only
**95 of 486 (20%)**. Not one seed in 1–20 has complete cue coverage — the best is seed 16
at 10 of 40 phrases, and **seed 19 has 0 of 24**. Since the cue is what the learner hears
first, the opening does not play through.

## The decision for you

To make the opening playable, `eng_for_hin` has to be re-cast off xAI onto a live provider.
That changes the voices of record on a **live** course, so it is your call, not mine.

Azure has four Hindi voices and I confirmed all four render this course's seed-1 cue line
cleanly just now:

| voice | gender | length on the seed-1 cue |
|---|---|---|
| `hi-IN-SwaraNeural` | female | 4.61s |
| `hi-IN-AartiNeural` | female | 4.03s |
| `hi-IN-KunalNeural` | male | 4.30s |
| `hi-IN-MadhurNeural` | male | 4.66s |

Two female and two male — so the male/female cue pairing you wanted with Vihaan and Ishani
**is** achievable, just with Azure voices instead. Note this also affects the English target
side: those clips are xAI too, so anything not already rendered can't be topped up either.

The sample renders are in this job's scratch directory; say the word and I can put them in a
listenable doc, or cast the course and finish the remaining clips.

## Known limitation (as you flagged)

The mechanism that alternates male and female Hindi cue wordings is **not built yet**. Any cue
clips rendered now carry a single wording per cue and will need regenerating for the affected
items once that lands. This did not block anything here — the provider retirement did.

## What I changed

- **No text was changed.** No seed, LEGO or phrase text was touched.
- **No gender-expansion tables were touched.**
- **Nothing was generated beyond seed 20.**
- **Nothing existing and good was regenerated** — the run only filled empty slots.
- 308 new `course_audio` rows (copies and reuse of existing audio, in the configured voices).
- One course-wide side effect worth naming: phase8's standard pre-generate step linked **5,006**
  already-existing clips across the whole course, not just seeds 1–20. It is non-destructive —
  it only fills NULL links with existing voice-matched audio and generates nothing — but it is
  wider than seeds 1–20 and runs unavoidably on this path.
