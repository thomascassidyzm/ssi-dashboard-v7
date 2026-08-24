# Welsh "eyes" — Northern lines queued for human re-recording

**Applied to the live database 2026-08-19.** North only. No audio was generated, no money spent, no text changed.

## What the problem is

In the Northern Welsh course (`cym_n_for_eng`), the written text says **angry eyes** (`llygaid blin`)
but the recording a learner hears says **pretty eyes** (`del`). Deborah reported it in October 2025;
Kai confirmed it by ear. The damage arrived inside the January 2026 legacy import, so nothing in this
database remembers what the text said when those clips were made — which is why Kai ruled that we simply
re-record the affected Northern lines rather than keep hunting for the per-line history.

## How many lines — the exact count

The often-quoted figure is **105 clips**. That is the number for **both** Welsh courses together.
The Northern share of it, counted from the live production database today, is **31 clips**:

| What | Clips |
|---|---:|
| Welsh, first voice (`target1`) | 10 |
| Welsh, second voice (`target2`) | 10 |
| English prompts on the same lines (`known`) | 10 |
| Presentation narration for the vocabulary itself | 1 |
| **Northern total** | **31** |

The other 74 of the 105 are Southern (`cym_s_for_eng`) and were deliberately left alone.
The 31 are 10 distinct sentences, each needing a male take, a female take and an English take,
plus the one presentation clip. They live in seeds 272, 273 and 274.

The English clips are included on purpose: their text now reads *angry eyes* too, and their recordings
are just as stale as the Welsh ones.

## What was changed

One column, on 31 rows of the `course_audio` table in the live database: `rerecord_wanted` was set from
empty to a note saying why the take is wanted and which voice is needed. That is all. In particular:

- **No audio was deleted or unlinked.** The old takes stay linked and playable until new ones land —
  make-before-break, by construction.
- **No text was edited**, so no learner progress is affected.
- **No machine audio was generated.** This is a human re-record path only.

Who each line went to:

- Welsh first voice, the English prompts and the presentation clip → **Aran** (21 lines)
- Welsh second voice → **Catrin** (10 lines)

A note on that split: the database has never recorded which of Aran or Catrin read `target1` versus
`target2` for the legacy Welsh clips, and I did not guess at it in a way that matters. Every one of the
10 sentences needs one male take and one female take regardless, so Aran records all 10 Welsh sentences
and Catrin records all 10 Welsh sentences either way. The English prompts went to Aran because 26 English
prompt clips in this course already carry his voice tag and none carry Catrin's.

## What the recordist will now see

Aran's recording list went from **170 lines to 191**. Catrin's went from **275 to 285**.
The new lines appear at the end of each list, each showing the sentence to read and the reason
("the text says angry eyes but the legacy recording says pretty eyes").

## Southern Welsh was not touched — verified

There is an open, unanswered question about 197 Southern lines sitting in the two recording lists.
Those 197 are pod-dialogue lines from the Southern course (66 in Aran's list, 131 in Catrin's) — they
are not connected to the eyes defect. I captured both recording lists before the change and again after,
and compared them line by line:

- Southern lines before: 66 (Aran) and 131 (Catrin). After: **the same 66 and the same 131**.
- Their order in the list is **byte-for-byte identical** before and after.
- **Not one field on any Southern line changed.**
- The Southern course still has **zero** re-record flags of any kind, exactly as before.

## Verified how

Counts and flags read back directly from the production database after the write; the two recording
lists fetched live from the recordist queue service before and after and diffed programmatically.
All 31 new lines show as outstanding (not yet recorded) and all 31 still have their existing audio file
attached.
