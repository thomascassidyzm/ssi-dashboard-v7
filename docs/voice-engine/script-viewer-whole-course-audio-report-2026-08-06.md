# Script Viewer: what already existed, and the whole-course report

**2026-08-06. Display only — nothing generated, published or gated changes.**

## What already existed (I should have checked first)

You were right on both counts:

- **Per-row missing audio was already surfaced** — a row with no audio has no
  play button and carries an amber warning triangle. That has been there all
  along.
- **"Missing audio only" already works** — it filters the rounds on screen down
  to the ones awaiting audio.
- **And the whole-course sweep already existed too**, which I did not expect:
  `audio-preview/missing-clips` runs the same gap test over every round at once,
  server-side, deduplicated to the row a repair would touch. It was written for
  exactly the reason you named — the 20-round page limit — and it is good work.
  It just lived only on the **Audio Preview** page.

So the row-level annotation I built yesterday was largely redundant. I have
trimmed it: the chip now appears only in the one case nothing else on the row
can say — a review whose own audio is complete but whose LEGO the player never
introduces, so it never fires.

## What was genuinely missing

**1. The sweep wasn't reachable from Script View.** Now it is: a *Whole-course
audio report* button, same endpoint, same component, so the two pages can never
quote different numbers.

**2. The sweep's verdict flattered a course.** It counts rows to *record*, gated
on `hasAudio` (prompt + voice 1), and prints a voice-2-only gap as "not
blocking". That is true of a practice phrase. It is false of a LEGO: the live
player requires all three voices and drops that LEGO's **whole round**.

The report now prints a second, separate verdict beside the first — what a
learner actually gets — and never folds one into the other:

| course | rows to record | what the player delivers |
|---|---|---|
| `fra_for_eng` | 11 rows (1 "blocking", 10 voice-2-only) | 1,525 of 1,529 rounds — **4 rounds never reach a learner** |
| `deu_for_eng` | 27 rows (22 blocking) | all 1,395 rounds, 34 rows skipped inside them |
| `ara_lb_for_eng` | 7,791 rows | **638 of 1,414 rounds — 776 never reach a learner** |

`fra_for_eng` is the case in miniature: by the recording numbers it looks
essentially finished — one blocking row and ten "harmless" ones — and it quietly
loses four whole rounds.

## Cost

The sweep takes 5-7 seconds uncached, cached for 60 seconds, unchanged from
what the Audio Preview page already did. The delivery verdict rides the same
pass over data already in memory — no extra queries.

## Tests

Eleven new cases: the delivery verdict itself (rounds played vs dropped, row
dedup vs slots lost, each reason), the recording and delivery numbers printed
side by side on a course where they disagree, an older payload staying silent
rather than printing an unmeasured zero, and the trimmed row chip.
