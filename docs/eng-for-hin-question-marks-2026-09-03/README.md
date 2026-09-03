# eng_for_hin — English question marks restored (2026-09-03)

**Course:** `eng_for_hin`. Known side = Hindi (the cue). Target side = English (the answer).
**Defect:** the English target side lost its question marks; the Hindi cue on the same rows kept
theirs. One-sided, so unambiguous.

## Numbers

| | |
|---|---|
| Flagged by the scan | **1,194** practice phrases (342 build / 852 use) across 333 seeds, plus **1** `course_seeds` row |
| Read and confirmed as genuine English questions | **1,195** |
| Rejected | **0** |
| Written | **1,195** (verified: 0 rows remain with a Hindi `?` and no English `?`) |
| Phrases that already had English audio → now **stale** | **70**, across 47 seeds |
| Audio links dropped by this pass | **0** |
| Audio generated | **none** |

Range: seed 201–668. Seeds 1–196 were already clean, consistent with the 2026-09-02 teaching-layer
rebuild being where the marks were lost.

## The reading

Kai's instruction was to read every flagged phrase and confirm it needs the mark rather than trust
the pattern. All 1,194 pairs were read in 12 batches of 100 in ascending seed order, Hindi cue
against English target. **Zero rejections — a 0% false-positive rate.**

That is a clean result, and the reason it is credible rather than lazy is the shape of the filter:
the flag is not "the English looks like a question", it is "the *Hindi* cue ends in `?` and the
English does not". The English on these rows is a gloss of an already-interrogative Hindi sentence,
so the population is interrogative by construction. Reading it confirmed that: every one of the
1,194 is a wh-question (`what would you do today`), an inverted-auxiliary yes/no question
(`did you have a good time at the weekend`), or a polite request-question
(`can you tell me the word`, `could we have a story please`). None is a statement, and none is a
case where the Hindi carries the `?` in error.

A mechanical second pass backed the read up: **0** of the 1,194 English lines open with anything
other than an interrogative marker (allowing a leading `so`/`and`), and **0** already carried other
terminal punctuation.

The exact list read and confirmed is frozen in `reading-list.json`. The tool refuses to write any
row whose text has moved since (`ABORT_DRIFT`) or that the list never saw (`ABORT_UNREAD`).

## Why audio links survived, and why 70 clips are now stale

`normalize_text()` strips trailing `.?!`, and `null_phrase_audio_on_text_change()` explicitly keeps
a link whose clip still speaks the new text under that normalisation. Adding a `?` therefore does
not change clip identity: **no slot was silenced** and no make-before-break question arises.

That is also exactly why it matters. The 70 phrases that had English audio kept the clips they
already had, and those clips were rendered from the unmarked text — they speak a question with
statement intonation. They are listed in `stale-clips.json` and need re-rendering.

**Re-render is blocked**: `eng_for_hin` is an all-xAI course and xAI is retired (403, non-retriable;
phase8 passes the provider explicitly, so it hard-fails rather than falling back). An audio-pass
request has been queued against the course recording this, per the standing content-pass rule.
Nothing was rendered and nothing was paid for.

The other 1,124 fixed phrases have no English audio at all — same xAI blockage — so there is
nothing stale about them.

## Deliberately not touched

The Hindi known side anywhere; capitalisation; word order; phrasing; decomposition and
display_tiling; any phrase whose Hindi lacks `?`; `canonical_seeds`.

## Note on the seed row

The single `course_seeds` row is seed 659, `Could you all say that` → `Could you all say that?`.
This is the same sentence the 2026-08-20 pass fixed on the English **known** side of every
`%_for_eng` course. That pass was scoped "English known side only", so `eng_for_hin` — where
English is the **target** — was never in its reach. Same typo, opposite side, found five months on.

## Separate defects observed while reading — NOT fixed here

Real, but out of scope for a punctuation pass; flagged for a content pass to rule on:

- **Embedded questions that keep interrogative inversion.** `can you tell me what would you like`
  (s631), `do you know how do you all feel` (s657), `can you tell me are you all ready` (s664),
  `do you know what do you all think` (s666), `can you tell me what do you need sir` (s652),
  `can you tell me which of those places do you think is the most interesting` (s492),
  `can you tell me how do you feel` (s642). English requires the declarative order here
  (`can you tell me what you would like`). Roughly 20 rows in this family.
- **s569** `have you decided you were able to finish` — the Hindi has `…या नहीं` ("or not"), so the
  English is missing its `whether`.
- **s644** `could you say that for a little longer` glosses Hindi `एक बार और` ("once more"),
  which is a meaning mismatch, not a punctuation one.

## Reproducing

```
node tools/course-optimization/fix-eng-for-hin-question-marks-2026-09-03.cjs          # dry run
APPLY=1 node tools/course-optimization/fix-eng-for-hin-question-marks-2026-09-03.cjs  # writes
```

`dryrun-log.json` and `applied-log.json` hold the per-row before/after and status.

## Concurrency note

While this pass ran, a **separate** process was rewriting `eng_for_hin` seed 21 whole-phrase texts
(56 rows in `content_audio_link_drops` at 08:16 UTC, `nulled-no-same-voice-clip-for-new-text`).
None of those rows are this pass's — verified by matching row ids: **0** ledger rows touch any of
the 1,195 ids written here. Worth knowing that the course had another writer at the same moment.
