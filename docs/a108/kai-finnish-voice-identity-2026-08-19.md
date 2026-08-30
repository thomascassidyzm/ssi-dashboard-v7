# Kai's Finnish recordist identity — created, live, but the queue is empty

**2026-08-19**

## The short version

**The tool cannot carry your 21 positional lines. Record them by voice memo.**

Your voice identity exists and your link opens the real recordist screen with your
name on it. What it does not have is lines — and it cannot be given yours without a
write I'm not authorised to make (and shouldn't make anyway; see below).

Your URL, opened in a real headless browser at 390px:

**https://popty.app/r/human_kai_fin**

![Kai's recordist screen at 390px](/evidence/kai-fin-voice-identity-2026-08-19/kai-fin-queue-390px.png)

It says *"Hello Kai … 0 of 0 recorded … Everything is recorded."* That last line is the
empty-queue state being cheerful about nothing. For contrast, here is Tom's working
test queue at the same width, which does have lines behind its START button:

![Tom's zzz queue at 390px](/evidence/kai-fin-voice-identity-2026-08-19/tom-zzz-queue-390px-comparison.png)

## Step 1 — your premise, verified live

You said Finnish has no audio so there's no danger of overwriting. That is **right
about the thing that matters**, with one nuance worth knowing.

- **No Finnish human audio exists anywhere.** No human voice identity for `fin`, no
  human-recorded Finnish clip, no pod line recorded by a person.
- The 16 human voices in the `voices` table are Welsh, English and Spanish only —
  confirmed directly, not taken from the earlier worker's word.
- `fin_for_eng` pod-0 has 232 sentences and **zero** of them are recorded by a human.
- Nothing in Finnish carries a re-record want (0 rows on both the clip flag and the
  pod-sentence flag).

**The nuance:** `fin_for_eng` does have 75 rows tagged `human_recording` — but they are
**English course-shell narration** (1 welcome, 48 instruction, 26 encouragement), the
same boilerplate cloned identically into 16 courses back in January. Not Finnish, not
yours to collide with. Your premise holds.

## Step 2 — what I wrote

Exactly two rows. Nothing else was touched.

1. **`voices`** — one new row:
   - `voice_id` = `human_kai_fin`, `type` = `human`, `languages` = `{fin}`
   - `human_name` = *"Kai (TEST identity — NOT a production recordist)"*
   - `notes` record that it is a test identity and that takes under it must never be
     promoted into course content.

2. **`language_recording_policy`** — one new row for `fin`:
   - `human_only` = **false**, deliberately. Finnish audio production is completely
     unchanged: the TTS pipeline reads this table with `human_only = true` only, so a
     `false` row is invisible to it.
   - `voices` = `{"test": {"voiceId": "human_kai_fin", …}}`. Filed under the key
     `"test"` rather than `"m"`/`"f"` on purpose — it doesn't guess at your gender and
     it can't squat the real Finnish cast slot when someone casts Finnish for real.

No audio was touched, no existing voice modified, no course content changed, no TTS
generated, and the ingest/promote step was never called.

## Step 3 — why there are no lines, and what would be needed

The recordist queue is built **by language** and a line only enters it two ways:

1. A **pod sentence** in a course whose target language is Finnish, *whose speaker maps
   through that course's `voice_config.podCast` to your gender.* `fin_for_eng` has 232
   pod sentences and **`podCast` is NULL** — so all 232 land as `uncast` and none reach
   any queue. This is the same state `bre` and `pdc` are in, where the policy notes say
   in as many words: *"NO RECORDIST CAST YET — no podCast, so there is no queue to send
   anyone."*

2. An existing **`course_audio` row flagged `rerecord_wanted`** with a required voice
   gender. Finnish has zero of these, and a line built this way carries *the stored
   clip's* text — so it still couldn't carry your 21 lines.

Giving you lines therefore means writing a `podCast` onto `fin_for_eng`, casting a
TEST voice as the production cast of a real 668-seed course. That is the stored cast
the pod renderer reads, so it would change how Finnish audio is produced — the one
thing today's brief explicitly ring-fenced. I did not do it, and I'd want Tom's
explicit say-so before anyone does.

**Neither route can carry your 21 positional lines regardless.** They aren't pod
dialogue and they aren't existing clips; the queue has no shape for free text.

The course-scoped fallback is also dead, for two independent reasons: `/record/:courseCode`
requires a login, and its data endpoint `/api/production/:courseCode/recording-script`
isn't routed on popty.app at all — it answers 200 with the SPA's HTML shell, which is
the "unrouted API" false-positive, not a working endpoint.

## The route contradiction, settled

`/r/:voiceId` **is real and live.** It's a public route in the deployed router
(`src/router/index.js:417`, `meta: { public: true }`) backed by `/api/recording/*`,
which is mounted and answering on popty.app — `/api/recording/voice/human_tom_zzz`
returns a real 12-line queue. Both facts checked against the production checkout and
the live host, not the working tree.

## So, today

Read the 21 lines into a voice memo. When Finnish gets a real recordist cast, this
identity is already in place and the link will fill with lines on its own — nothing
further to create.
