# Record the course, item by item — each take IS that item's audio

**For:** Kai · **Date:** 2026-08-21 · **Link:** `popty.app/record/deu_at_for_eng?order=course`
**Supersedes the trade-off section of** `natural-only-course-order-2026-08-21.md` — the alignment
question in it is now moot, by your ruling.

---

## The ruling, and what it changed

You ruled: these takes are never chunked, never spliced, never aligned. Each one is filed and used
as-is, as the whole-phrase clip for one item, attached the same way a TTS clip for that item is
attached.

That single decision removes the reason the coverage optimiser was in this path at all. Its 480
lines are a *splicing plan* — the fewest lines whose LEGO chunks can be reassembled into everything
else. With no splicing, recording those 480 lines gives audio for 480 items and never reaches the
other ~11,400, no matter how long Sascha keeps going. So in `?order=course` the reading list is now
**the course itself**, in your sequence:

> for each seed, from seed 1 — the seed sentence, then its first LEGO, then every practice phrase
> built on that LEGO, then the second LEGO and its phrases — then the next seed, to the end.

Verified against the live database, `deu_at_for_eng`, target2 (Sascha):

| | |
|---|---|
| items in the course (seeds + LEGOs + build/use phrases) | **11,942** |
| already recorded by this voice | 22 |
| left to read | **11,920** |
| of which: seed sentences / LEGOs / phrases | 647 / 1,229 / 10,044 |

The first lines it now serves, in order: `i wü iatz mit dir Deitsch reden` (seed 1's own sentence) →
`i wü` → `reden` → `i wü reden` → `deitsch` → `deitsch reden` → … Seed 1 is line one. Your instinct
to re-check that was right: under the old coverage script seed 1's sentence was never asked for at
all, because set-cover reached its LEGOs through longer sentences elsewhere in the course.

Component rows are excluded — they are the per-sentence tiling glosses and are never played to a
learner. A line that appears twice in the course (the same sentence as a seed and again as a USE
phrase) is read **once**: TTS renders such text once too, and the one clip is attached to every item
that shares it.

**This is a much longer campaign than the 480-line script, and it should be.** At ~6 seconds an item
it is on the order of 20 hours of booth time for the whole course. There is no shortcut left in it:
without splicing, an item's audio exists only if someone read that item. Sascha stops wherever they
like and the next session resumes from there.

## Filing: exactly the TTS convention, no new object

I looked for an existing direct phrase-to-clip path rather than inventing one, as you asked. Two
exist, and the answer is a mix of both:

- **`services/script-take-filing.cjs`** (already live) writes the `course_audio` row through
  `voice-engine/db.cjs upsertHumanCourseAudio` — the same table, same 5-column unique key
  `(course_code, text_normalized, language, role, voice_id)`, `text_normalized` written by the same
  DB trigger, that TTS rows use. Dedup is that key: a second take of the same line supersedes the
  first through the revision swap, it does not create a rival row.
- **`services/voice-engine/pods-registration.cjs`** is the pattern for the missing half: mint the
  clip, then repoint the item's own FK column at it.

What was missing was that second half for script takes, and it was the reason **0% of the human
takes filed for this course had ever reached a learner** — they were clips in the library that
nothing pointed at, waiting for a synthesis job that had never been run.

**New: `services/script-take-attach.cjs`.** On upload, once the clip is filed, the item's audio FK is
set to it: `course_seeds` / `course_legos` / `course_practice_phrases` ×
`{known,target1,target2}_audio_id` — the same three tables and nine columns phase8's link pass uses,
matched with the same `normalizeForAudio` key. Two deliberate differences from the bulk pass: it runs
per take, immediately, so the work is live the moment it uploads; and it overwrites a non-null FK,
because the take was recorded *for* that item and a TTS clip in the slot is what it replaces. Nothing
is deleted — the displaced clip keeps its row and its S3 object, so it is reversible by repointing.

The take also carries its item's identity (`itemKind`, `itemId`) from the script through the upload,
so it attaches to the exact row rather than being matched by text alone; text matching then also
catches any other item in the course that says the same thing, which is what TTS does.

**Already applied and verified live:** Sascha's 22 existing takes are now attached — 32 items
(17 seeds, 15 phrases) play a human clip where they played nothing before. Every target slot involved
was empty first, so nothing was displaced. Before/after state was logged per row.

## Normalisation: same target, one difference worth your ear

Both paths master to the same house target and the same encoder:

| | human take (on upload) | TTS clip |
|---|---|---|
| loudness | `loudnorm=I=-16:TP=-1.5:LRA=11` (one-pass EBU R128) | measure, then `volume=<gain>dB` to −16 LUFS |
| compressor | none | none (removed 2026-08-17, A-131/A-132) |
| extra | 80 Hz high-pass; ends trimmed to the read plus a margin | end-of-speech tail trim |
| peak safety | `alimiter` 0.95 | true-peak limit + anti-click fades |
| encode | MP3 via ffmpeg→lame | MP3 via ffmpeg→lame |

So a human take is **already normalised to the same −16 LUFS house standard as TTS**, by a different
mechanism. The residual differences are the 80 Hz high-pass and one-pass loudnorm versus
measure-then-gain. I have deliberately **not** touched the recordist chain: its trim margins and its
compressor-free history are hard-won rulings, and changing how Sascha's takes are mastered in the
middle of a live weekend is not a change to make on my own judgement. If you want them made
bit-identical, that is a one-line swap to `normalizeAudioClean` and it is your call.

## Where it lives

- `services/course-order-script.cjs` — the course in your sequence (+ tests)
- `services/script-take-attach.cjs` — clip → item, the TTS convention (+ tests)
- `services/recording-script-items.cjs` — shapes the reading list; carries item identity
- `services/production-api.cjs` — `?order=course` no longer runs the optimiser; attach on upload
- `src/components/production/autocue/AutocueStudio.vue`, `src/composables/useAutocueState.js` —
  item identity round-trips; the panel counts course items, and the header names what is on screen
  (Seed sentence / LEGO / Phrase)
- Tests: 61 green across the new and existing recording suites.
