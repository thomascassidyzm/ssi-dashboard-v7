# The booth does seeds and splices

*2026-09-02. What a SEED line is inside the recording booth, what a SPLICE run is,
which existing seam each one rides, and what Tom should tap first.*

---

## What Tom should tap first

**Open `https://popty.app/r/human_tom_zzz` on your phone, tap Start, and read the
first line — that is a seed sentence, in the same booth, with the same one tap.**

---

## The booth is not being rebuilt

`/r/:voiceId` (`src/views/RecordistRoom.vue`) stays exactly as it is. Tom's ruling on
2026-09-02 — *"the link to the second tool is way better - so we will persist with that
one"* — means both of these new jobs live INSIDE that one screen. No second surface, no
mode-picker, no splice studio.

Four properties are load-bearing and none of them are touched:

- one tap starts on the first line that still needs reading;
- one tap re-records any line from the roster;
- the warm-recorder lead-in (`useTapRecorder.js` promotes a standby recorder at each
  line boundary, so a re-read opens already holding room tone);
- an upload that files first time, through the production upload seam, with no
  rejection loop.

---

## What a SEED line is

A **seed sentence** is a row in `course_seeds` — the sentence a course is built from. It
is a real audio unit in its own right: the table carries `known_audio_id`,
`target1_audio_id` and `target2_audio_id`, and the player walks it directly. Mature
courses are at 100%. Welsh North is at 2.8% — **649 of its 668 seeds have no
`target1_audio_id`** — precisely because it cannot fall back on TTS.

Inside the booth a seed line looks like every other line: target text large, known text
underneath as the crib, one tap to open the mic, the same roster, the same lead-in, the
same upload. The only thing that differs is where the take lands.

### The seam it rides

`services/voice-engine/recordist-queue.cjs` already derives a queue from **two** sources:

1. pod sentences of every course whose canonical target language matches the voice,
   bucketed by (dialect, gender) taken from the COURSE, collapsed by clip identity;
2. `course_audio.rerecord_wanted` — any clip of any content type flagged for a new take.

Source 2 is the precedent. Tom's ruling of 2026-08-14 was that new content types should
*"just ride the new queue's existing design, since it's content-type-agnostic by language
and voice role"* — explicitly not a bespoke path. Seed sentences become **source 3** on
exactly those terms.

### Who reads a seed — cast, never guessed

A pod line knows who reads it because the pod has a *speaker* and the course's
`voice_config.podCast` maps that speaker to a gender. **A seed sentence has no speaker.**

So a seed line is cast the way everything else in this file is cast: from the course's
own `voice_config.voices`. If `voices.target1.voiceId` names one of the recordist's voice
spellings, that course's seeds enter their queue as `target1` lines. Same for `target2`.
If neither names a human voice, the course's seed slots are counted as **uncast** and
appear in nobody's queue — the same rule the file already applies to a pod speaker with
no cast entry: *never guessed, never silently dropped*.

That has a consequence worth naming plainly. **`cym_n_for_eng` currently casts no target
voice at all** — `voices.target1.voiceId` and `voices.target2.voiceId` are both the empty
string. So Welsh seed sentences do not appear in Aran's or Catrin's queue yet, and they
should not: nothing in the data says which of them reads them, or whether both do into
their own slots. One casting decision — writing Aran and Catrin into
`voice_config.voices.target1` / `.target2` on `cym_n_for_eng` — turns 649 outstanding
Welsh seed lines on, for the people named. That decision is Tom's or Kai's, not this
job's.

### The known (English) side

The queue header has always said **TARGET SIDE ONLY**: the known side of these courses is
English, `eng` is not `human_only`, so it never enters a queue.

Tom, 2026-09-02: *"just so I can record the English and perhaps also record the X."* So
there is now exactly one exception, and it stops hard:

> A course whose code begins `zzz_` is a TEST FIXTURE. On a test fixture only, a seed's
> KNOWN side also enters the queue, as a `role: 'known'` line linking
> `course_seeds.known_audio_id`.

The check is `isTestFixtureCourse()` in `recordist-queue.cjs` and it is applied
**server-side**, on the queue build and again on the take — the booth is a no-login
surface, so a client flag would be a suggestion. No live language, Welsh included, gains
a known-side queue.

### How a seed take lands

The take route contains no uploader: it adapts its body into the shape of
`POST /api/production/:courseCode/recording/upload` and calls that handler, so
archive-before-process, the silent-take refusal, provenance and filing are literally the
same code. A seed take goes through it in **script mode**, which files a `course_audio`
row (`services/script-take-filing.cjs`) under `(course, text, language, role, voice)`.

Then the booth links the seed's own FK — `target1_audio_id`, `target2_audio_id` or
`known_audio_id` — to that row. Explicitly, in the router, for the same reason
`propagateTakeToDuplicates` re-points pod sentence FKs explicitly: the `audio_autolink`
trigger refuses to link when the course names no configured voice for the role, which is
the case on both `cym_n_for_eng` and `zzz_test2_for_eng`.

Nothing is deleted and nothing is unlinked first. The new clip exists before the FK
moves — make-before-break by construction
(`docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b).

### Line ids

A seed line's id on the wire is `seed:<seed uuid>:<role>` — synthetic, because one seed
row is up to three recordable lines. The router branches on the `seed:` prefix **before**
any pod or clip lookup, exactly the way a recording pack branches on `pack-` before any
policy lookup (`clone-source-pack.cjs`). That prefix is the seam.

---

## What a SPLICE run is

**Two pools, Kai's ruling of 2026-08-21, already implemented in
`services/recording-pools.cjs`:**

- **Pool A** — every LEGO and every component read ONCE, in isolation. That clip is that
  unit's own teaching audio and is **never spliced**.
- **Pool B** — the slow phrase reads. The ONLY source of splice material, sized purely by
  what it takes to reassemble every phrase.

And two speeds, which do different jobs:

- **The natural read is ground truth.** A real whole recording always beats an assembled
  one. Anything read whole at natural speed is done, permanently, and is not splice
  material.
- **The gapped (slow) read is the quarry, and nothing else.** Its only job is to yield
  cuttable pieces. `services/voice-engine/align.cjs` is zero-ML: ffmpeg `silencedetect`,
  silences inverted into voiced regions, mapped 1:1 onto the expected chunk list. A
  natural-only take cannot be chunked — measured, and it found **zero of 88** real LEGO
  boundaries (`docs/recording/natural-take-lego-extraction-eval-2026-08-22.md`).

### The covering unit is the LEGO

Tom's ruling, 2026-09-02: word boundaries are where coarticulation damage is worst, which
is exactly why the gapped read is needed at all. But a LEGO already functions as a unit in
the course, so **cutting at LEGO joints cuts where the language itself has a seam** — a
bigger set than a word list, far smaller than every phrase, and the pieces recombine
without sounding diced because each was spoken as one natural gesture. Words are a
**fallback**, used only where no LEGO can be reused.

This puts a third option between the two that
`docs/recording/two-pool-redesign-2026-08-22.md` measured (allow word-sized pieces: 1,346
lines on Austrian German; forbid them: 8,105).

### What this job delivers on the splice half

Per Tom's amendment of 2026-09-02, the splice deliverable is **not** a booth mode. It is
four numbers on one real ~100-seed course, because those numbers answer the question that
decides whether the idea is worth pursuing at all: *is this an afternoon, or a week?*

See "The measurement" below.

---

## The measurement — is this an afternoon, or a week?

Tom's question: a community course must not need someone recording phrases for a
week before it is usable. Someone picks ~100 seeds as a taster; Popty computes the
minimal set a human reads so that dice-and-splice regenerates the rest.

Measured on 2026-09-02 by `tools/recording/measure-lego-quarry-2026-09-02.cjs`
(read-only) on two real courses at seeds 1..100 — one with a legacy recording
corpus, one with nothing at all.

### `pdc_for_eng` — Pennsylvania Dutch, the true from-scratch community course

259 LEGO rows (253 distinct), 2,543 practice phrases, 100 seeds, **one** audio row
in the whole course, no TTS, `human_only` with nobody cast.

| | |
|---|---|
| **(a) covering set** | **250 distinct LEGOs** regenerate every phrase — plus **220 single words** no LEGO covers. **470 pieces.** |
| **(b) already free** | **0.** Nothing is recorded and there is no pod to mine. |
| **(c) a human must read** | **470 quarry pieces, gapped** + **100 seed sentences, whole, at natural speed** |
| **(d) roughly** | **~29 min** gapped quarry + **~10 min** seeds = **about 40 minutes of reading** |

**Forty minutes, not a week.** The comparison that makes it: recording every phrase
whole is 2,543 lines against 570. That is the answer to the question Tom actually
asked.

### `cym_n_for_eng` — Welsh North, which has a legacy corpus

154 LEGOs and 942 phrases in seeds 1..100, and **every one of them already has a
human `target1` clip** (`origin: human`, `voice_id: legacy_import` — genuine human
audio from the old SSi corpus, not TTS; 152 of 154 LEGOs and 939 of 942 phrases,
the remainder TTS).

| | |
|---|---|
| **(a) covering set** | 135 distinct LEGOs, plus 121 word-sized fallbacks |
| **(b) already free** | **135 of 135** — the entire quarry is already recorded |
| **(c) a human must read** | **0 LEGOs.** **93 seed sentences.** No phrase lacks a whole recording. |
| **(d) roughly** | **~8 minutes** |

So for Welsh the splice question does not arise in seeds 1..100: every phrase
already has its own real whole recording, and a real whole recording always beats
an assembled one. **The entire Welsh gap in this range is seed sentences** — which
is exactly what the first half of this job makes recordable.

### The finding that qualifies Tom's LEGO ruling

**The LEGO covering set alone does NOT regenerate every phrase.** Only 1,104 of
2,543 pdc phrases (43%) and 375 of 942 Welsh phrases (40%) tile from the LEGO
inventory with nothing left over. The rest need word-sized fallback pieces — 220 on
pdc, 121 on Welsh.

That is not a refutation of the ruling; the ruling already names words as the
fallback. But the fallback is not a rounding error, it is **47% of the pieces a pdc
recordist reads**, and it is where the coarticulation damage Tom named actually
lands. Worth knowing before anyone promises the splice will sound like LEGOs
throughout.

### Against the measured document

`docs/recording/pods-first-welsh-recording-scope-2026-08-31.md` found pods buy about
2% as read (37 of 1,896 lines), rising to 1,492 of 1,896 if you cut at every LEGO
boundary. **I get the same answer for the as-read case and I decline to count the
cut-at-LEGO-boundaries case at all** — and the disagreement is worth naming rather
than burying.

Pods are natural speech. `services/voice-engine/align.cjs` reads its boundaries
from the *pauses* in a gapped read, and on real Welsh takes it found **zero of 88**
LEGO boundaries in natural-cadence audio
(`docs/recording/natural-take-lego-extraction-eval-2026-08-22.md`). "Chop a pod at
LEGO joints" is therefore not a capability this estate has today. Counting it as
free coverage would hand a recordist a short list that cannot actually be assembled.
Pod mining is scoped **by language**, never by course (Tom, 2026-09-02) — an audit
that counts a course's own rows manufactures phantom backlog.

### A spliced sample, so the ear decides

One real Welsh phrase, assembled through the estate's own splicer
(`services/voice-engine/splicer.cjs`, house loudness per piece, concat demuxer):

> **fedra i ddim cofio beth dw i angen deud** — *"I can't remember what I need to say"*
> assembled from five existing human LEGO clips: *fedra i ddim · cofio · beth · dw i angen · deud*

- assembled: https://popty.app/evidence/splice-sample-2026-09-02/assembled-from-lego-clips.mp3
- the same phrase recorded whole: https://popty.app/evidence/splice-sample-2026-09-02/recorded-whole.mp3

**Read the demo honestly.** These pieces are Pool A teaching clips — isolated reads,
each with its own attack and decay and no coarticulation at all. Kai's ruling is that
Pool A is *never* spliced, so this is deliberately the wrong material, used because it
is the only material that exists today. A proper gapped-read quarry should sound
*better* than this, not worse. It is a floor, not a sample of the product.

**And the honest unknown: one good spliced phrase is not evidence that four thousand
of them are good.** Nothing here tells you whether quality holds across a whole
course. That question needs a gapped read of a real quarry and a listen across a
spread of phrase lengths and junction types — which is a session with a human in it,
not another measurement.

---

## The two zzz test courses

Tom asked to delete the unused one. **Nothing is deleted here** — that needs a deletion
plan and his approval against real evidence, which is what the report carries instead.
The live one is `zzz_test2_for_eng` (target language `zzz`, known English); it is the only
one that can ever reach a recordist queue, because the queue derives by canonical TARGET
language and `zzz_test_for_eng` is target English.
