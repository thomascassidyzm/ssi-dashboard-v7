# Which takes were read straight through — and what that claim rests on

**deu_at_for_eng · 2026-08-25 · for Kai**

You asked to spend your ear only on the takes Sascha read **start to finish**
through the course, not the ones read to be **cut up and reassembled**. Here is
what I found, what I built, and the one thing you should not take on trust.

Sascha uses they/them.

---

## The honest answer first: the flow is not recorded anywhere

**Nothing in the database says which recording flow produced a take.** I looked
for a stored field before inferring anything, and there isn't one:

| where I looked | what is there |
|---|---|
| `recording_provenance` columns | 18 columns, no mode, no session, no order |
| the JSON context in `quality_notes` | carries `mode`, but its values are `'script' \| 'pod' \| 'regeneration'` — the upload seam. Every deu_at take is `'script'` |
| what the recorder sends | `AutocueStudio.vue` sends `provenance.mode = 'continuous'`, which names the VAD cutter `useContinuousRecorder`. **Both** reading orders use it, and it is dropped on insert for want of a column |
| the reading order itself | `ModeSelector.vue` offers "the course itself, straight through from the start" (`?order=course`) vs "a shorter set of lines, cut up afterwards" (`?order=coverage`). **It is never sent with the upload** |
| S3 | everything is `mastered/` and `raw/`. There is no third store |

So the split on the page is an **inference**, and the page says so above the
filter that acts on it, with the rule one tap away.

## The rule I used

It comes from the two script builders in `services/recording-script-items.cjs`,
not from pattern-matching the data:

- `buildCourseScriptItems()` — the straight-through order — emits **one natural
  read per line and no chunk fields at all** ("nothing here is ever chunked").
- `buildScriptItems()` / `buildTwoPoolScriptItems()` — the cut-up order — **always**
  emit `chunksString`, always pair a natural read with a slow one, and give
  Pool A the `isolated` cadence.

> `chunks_string` present, or cadence `slow`/`isolated` → **spliced**
> cadence `natural` with no `chunks_string` → **start-to-finish**
> anything else → **unknown**

## Of Sascha's 331 takes

| | count |
|---|---|
| start-to-finish (inferred) | **248** |
| spliced (inferred) | 81 |
| neither shape | 2 |
| refused before any record was written | 31 more, unknown by definition |

## Why I believe it — three checks, not an assertion

1. **Every session is homogeneous.** All 21 recording sessions fall entirely on
   one side of the rule. Not one mixed session.
2. **The two groups are disjoint in time and in shape.** Sessions up to
   2026-08-21 15:32 are spliced and jump around the course — seeds 26 → 567.
   Every session from that moment on is start-to-finish and runs monotonically
   from seed 1 (seeds 1 → 10). That is exactly what the two reading orders
   promise the person holding the phone.
3. **They are filed differently.** 203 of 249 start-to-finish takes are bound as
   live clips; only 21 of 115 spliced ones are. The straight-through order files
   each read as itself; the cut-up order feeds the splicer.

**It is still a deduction.** If you ever hear a take on the start-to-finish list
that was plainly part of a cut-up read, the rule is what to doubt.

## The 31 refused takes are folded in

They were rejected by the upload gate before a single row was written — I checked
against the live database rather than trusting the claim: **zero
`recording_provenance` rows, zero `course_audio` rows**, all 31. They exist only
as S3 objects, so nothing anywhere can say which line they were. They get one
group of their own that says exactly that, at the end of the list, rather than
being guessed into a line.

30 of the 31 are still `raw/*.webm`, the container the phone recorded in — iOS
Safari plays no WebM at all, so those are transcoded once with ffmpeg and cached.
All 31 verified streaming. No speech was generated: it is a container change on
bytes we already have.

Each one shows the only clue it carries — whether its upload landed inside a
start-to-finish session (12), a spliced one (1), or outside every session we have
a record of (18). That is a fact about **when the object arrived**, said as such.
It is not a claim about which flow produced it, and nothing can be.

## Your taps now change the course

A **Good tap, and only an explicit Good tap**, repoints that line at that take.
No whisper transcript, no duration, no "newest take", no opinion of mine.

The button shows you the plan first — read back from the live database — before
anything is written. Each change is one `swapClipInPlace`: the bytes are proven
present in the bucket before the row moves, a rollback row is written **first**,
`audio_revision` bumps so learners actually get the new audio instead of a
year-old cached copy, the row id never moves, nothing is deleted, and the row is
read back afterwards. The whole batch reverses with one command.

It refuses out loud rather than guessing, in four cases: a slow read (the
pipeline never files those as clips), a refused take (no line to point it at), a
line with no clip to swap, and two Good takes on one line with neither of them
live — that last one is a question for you, not a coin toss.

**Nothing has been applied.** Your 10 Good verdicts so far are all already what
learners hear, so the plan is currently empty and says so.

## The one line I left alone for your ear

`wir mechatn heit auf d'Nocht an Tisch für vier reservieren` is pinned to the
top of the page whatever filter is on. What learners hear today is a take of a
different sentence; a good read of the right line sits in the bucket eight
seconds earlier and was never bound. Both are on the card. Rule on it and press
the button.

(Both of those takes are from a **spliced** session, which is why the card is
pinned rather than left to the filter.)
