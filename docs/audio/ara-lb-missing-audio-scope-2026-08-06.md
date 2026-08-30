# ara_lb_for_eng — the missing audio, measured

**Date:** 6 August 2026
**Status:** scope verified against live data. **Nothing generated yet** — the job is 4.7× the size
of tonight's French/German repairs, which is the condition I was told to stop and report on.

---

## What is actually missing

The course has 668 seeds. Audio was generated for **seeds 1–300 only**. Seeds **301–668** have
**no audio at all** — not partially missing, not patchy: a clean cut.

| | Seeds 1–300 | Seeds 301–668 |
|---|---|---|
| LEGOs | 660, all with audio | **886, none with audio** |
| BUILD phrases | 1,958, all with audio | **2,353, none** |
| USE phrases | 3,218 (12 gaps) | **3,992, none** |
| Component rows | 305, all with audio | **507, none** |
| Lego presentations | 640 present | **776 missing** |

There is no partial seed anywhere — every seed is either fully voiced or fully silent.

## Why 776 rounds vanish

Confirmed exactly, no estimation. The player builds the round walk *after* discarding any LEGO
that lacks all three of its clips. So a silent LEGO doesn't play badly — its whole round ceases
to exist, and every later round renumbers into the gap.

- Total rounds in the course: **1,414**
- Rounds belonging to seeds 1–300: **638** ← everything a learner can currently reach
- Rounds belonging to seeds 301–668: **776** ← unreachable by anyone, by any route

The 776 unreachable rounds correspond one-to-one with the 776 new LEGOs in seeds 301–668. So the
arithmetic is clean: voice those seeds, and reachability goes **638 → 1,414**. The full course.

## What the repair costs

Numbers below are the audio service's own plan for this course, not my arithmetic:

- **Clips to generate: 20,757** (known 8,118 · Layla 8,114 · Rami 8,114 · presentations 776)
- **Characters: 462,516**
- **Estimated spend: $7.40** — all Azure, the same three voices already used for seeds 1–300
  (Sonia / Layla / Rami). No ElevenLabs, no new voices, no voice decisions to make.
- **1,324 clips already exist and only need linking** — free, no generation.
- **1,283 presentation narrations must be authored first** (776 LEGO + 507 component) before
  their audio can be rendered.
- Machine time: roughly a couple of hours of generation, plus the automatic
  listen-back verification pass over 20k clips, which is local and free but slow.

## Why I stopped

The approval was for repairing missing audio, and the instruction was to stop if the job turned
out much bigger than tonight's French and German repairs. Those were ~4,434 clips. **This is
20,757 — 4.7× larger.** The money is trivially small; the size is not, so it gets said out loud
before anything is spent.

## Recommendation

**Go.** $7.40 and a couple of hours of machine time to make 55% of a finished course reachable
for the first time is as good as this trade ever gets. The content for seeds 301–668 is already
written and sits in exactly the same state as the 300 seeds that already shipped with audio —
nothing about it is less ready. The work is additive throughout: new clips are generated and
verified before anything is linked, and nothing existing is touched or deleted at any point.

The only genuine judgement in the job is upstream of the audio: 1,283 presentation narrations
have to be authored before they can be voiced. That is writing, and it is the part worth
watching.

## If we go

1. Author the 1,283 missing presentations.
2. Link the 1,324 clips that already exist — free, no generation.
3. Generate the 20,757 clips, verify each one is alive and in the right voice, then link.
4. Rebuild the player script and confirm live that rounds past 638 now appear and play.
5. Report the true after-number, measured in the app rather than in the database.
