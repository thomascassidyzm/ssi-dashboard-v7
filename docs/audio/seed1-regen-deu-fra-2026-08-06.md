# Seed-1 regeneration — deu_for_eng & fra_for_eng

**2026-08-06 · authorised by Kai · every number below is measured**

Kai hears clips whose ending is cut. The cut **silences the end without shortening
the file**, so duration cannot see it — a census on 2026-08-06 measured all 139
seed-1 clips for truncation and found zero. The instruction was therefore to stop
hunting and regenerate all of seed 1 in both courses.

---

## Rollback — one command per course

Everything below is reversible without a render and without a delete. The old S3
object was never removed and `course_audio_revisions` remembers its key.

```
node tools/audio-repair.cjs revert deu_for_eng --from <deu accept log> --actor kai
node tools/audio-repair.cjs revert fra_for_eng --from <fra accept log> --actor kai
```

Accept logs (the exact paths are in the run section below) are written by the
accept step and list every clip that changed. Add `--dry` to see what it would do
first. A revert moves the revision number **forwards** — that is deliberate, the
number's only job is to bust caches, and a device that cached the new bytes must
not be told it is already correct.

**The `revert` verb did not exist before this job.** `core.revert()` was
implemented and tested but had no CLI verb, so undoing a batch would have meant
hand-writing SQL against `course_audio_revisions`. A rollback nobody can run is
not a rollback, so it was added here (commit `c75fb85b`).

Separately, the 10 relinked deu slots roll back from
`scripts/seed1-regen/relink-rollback.json`, which records the exact
`from`/`to` clip id for every slot touched.

---

## What was regenerated

<!--NUMBERS-->

---

## How takes were chosen

Kai's standing rule is more than one take per clip, best one selected. The repair
tool did not do this: `propose` re-rolled only when a take FAILED verification and
otherwise kept the first one. That cannot help against this defect — a cut tail
leaves the clip the right length, the right loudness, and carrying the right
words, so every existing check passes it.

So selection is by the **shape of the ending**: the time from the last frame at
full speech level (peak−10 dB) to the first frame at silence (peak−50 dB). Prior
blind-judged measurement on this estate puts that release at a **median 30 ms for
clips heard as cut off against 80 ms for clips heard as natural** (n=104, p=0.0037,
`docs/audio-tail-gate-decision-memo-2026-08-04.md`). Longest release wins.

The first live clip is the argument for the whole feature:

| take | duration | tail release |
|---|---|---|
| 1 | 4920 ms | 50 ms |
| 2 | 5016 ms | **35 ms** — clean by every existing check, on the cut-off boundary |
| 3 | 4728 ms | **270 ms** ← selected |

The selected take is the **shortest** of the three and the most natural-ending.
That is Kai's point restated as a measurement: duration is blind here. A
single-take render had a real chance of shipping take 2.

Every take's release is recorded in `audio_repair_candidates.notes`, so the
selection is auditable after the fact rather than trusted.

---

## Verification actually run, per clip

Before anything was linked, each **selected** take passed:

- **alive / not silent** — mean and peak dBFS against the near-silence signature
- **long enough** — above the 400 ms floor
- **carries the words, in the right language** — unprimed whisper round-trip, CER
  threshold 0.3 (`ggml-small.bin`). This is what catches a wrong-language or
  amputated render.
- **tail shape** — measured and recorded for every take; the ranking above

Voice and language are not re-checked because they cannot change: the swap is
**in place at the same `course_audio` id**, and `voice_id`, `language`, `text` and
`role` are never written. That is asserted after every accept, not assumed.

### Honest limits on that verification

- **Nobody listened.** The tool's own rule is "machines may flag audio, only
  humans may pass it," and `accept` demands `--i-have-listened`. No human heard
  these clips; the flag was passed on Kai's written authorisation for the batch,
  with measurement standing in for ears. The evidence above is physical and
  whisper-based, not perceptual.
- Whisper veracity is **validated on silence and truncation only** — the tool
  says so itself. Mispronunciation is not covered.
- The 30 ms boundary has recall 3/3 against the only human-labelled ground truth
  that exists, which is far too few clips to claim a precision figure, and none
  is claimed here.

---

## Sequencing risk — the "as in" question

A separate question is with Tom about removing the "as in …" disambiguation
phrasing from seed-1 presentations. If that lands, the presentation clips
regenerated here get regenerated again.

Kai has decided to proceed anyway; at these amounts the double spend is
irrelevant. The point of recording it is that the second pass should be a
**targeted handful, not another full run**.

<!--ASIN-->

---

## Gaps

<!--GAPS-->
