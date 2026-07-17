# Welsh SEEDS gap list — what's actually left to record

Generated 2026-07-17, using the repo's existing recording-optimizer
(`tools/recording-optimizer/generate-recording-script.cjs`) in its new `--gap`
mode. Do not re-derive this by hand — re-run the command below any time the
course content or the recorded audio changes.

## The headline

Nobody needs to record ~1,189 sentences this weekend. Between them, `cym_n_for_eng`
and `cym_s_for_eng` have **one single sentence left to record** to make every
canonical SEED and every practice phrase in both courses fully assemble from
real human audio.

| Course | Seeds with no direct recording | LEGOs still needing a recording | New sentences to record |
|---|---|---|---|
| `cym_n_for_eng` (North) | 649 / 668 | 1 / 623 | **1** |
| `cym_s_for_eng` (South) | 540 / 668 | 0 / 666 | **0** |

## Why "649 seeds with no audio" isn't the same as "649 sentences to record"

Every SEED sentence has a `target1_audio_id` pointer for its *own exact*
recording, and most of those are empty (649 for North, 540 for South —
confirmed directly against `course_seeds`/`course_audio`, 2026-07-17). Read
literally, that looks like nearly the whole course is unrecorded.

It isn't. Aran and Catrin's earlier sessions already recorded thousands of
*other* real sentences (practice phrases, longer USE examples) that happen to
contain the same words and short chunks (LEGOs) the missing seeds are built
from. The course plays audio by **splicing LEGO-sized chunks together**, not
by requiring one dedicated take per seed — so a seed with no direct recording
of its own can still play back correctly if every LEGO inside it exists
*somewhere* in the recorded pool.

`generate-recording-script.cjs` is exactly the tool that answers "given what's
already recorded, what — if anything — is still missing to cover every LEGO
in every seed and phrase?" Run in `--gap` mode (new: excludes anything already
coverable by an existing **human** recording), it checked all 623/666 LEGOs
across both courses against the ~6,400-6,700 human `target1` clips already in
`course_audio`, and came back with one gap.

## The one sentence to record

**Course:** `cym_n_for_eng` (North Welsh) — seed 172

| | |
|---|---|
| Welsh (read this) | **maen nhw isio i ni dreulio llai o amser yn gweithio adre** |
| English (what it means) | they want us to spend less time working at home |
| Completes | LEGO `S0172L01` ("llai o amser" / "less time") — the only LEGO across both courses with no recording anywhere yet |

Read it once, natural pace, then once more slow with a brief pause between
chunks — same as any other course sentence: `maen nhw isio i | ni dreulio |
llai o amser yn | gweithio adre`.

`cym_s_for_eng` needs nothing — every LEGO in the South course is already
covered by an existing recording.

## Where to record it

This is ordinary **course** recording (Mode 1: New Course), not the pods
flow — open the mode chooser for `cym_n_for_eng`, pick **Mode 1: New Course**,
and it's the only item in the queue now (the recording tool skips anything
already coverable, see below). Direct link: `/production/cym_n_for_eng/recording`.

## Keeping this current

The gap is now computed live, not just snapshotted in this doc:
`GET /api/production/:courseCode/recording-script` (the endpoint the
recording tool's autocue actually calls) now **defaults to gap-only** — it
prunes anything already spliceable from an existing human recording before
building the queue, so re-opening Mode 1 for either Welsh course only ever
shows real remaining work. The old full-script behaviour (every candidate
phrase, ignoring what's already recorded) is still available via
`?full=true` for courses that want the whole optimizer output.

To regenerate this doc's numbers by hand:

```bash
node tools/recording-optimizer/generate-recording-script.cjs cym_n_for_eng --gap --output /tmp/cym_n_gap.json
node tools/recording-optimizer/generate-recording-script.cjs cym_s_for_eng --gap --output /tmp/cym_s_gap.json
```
