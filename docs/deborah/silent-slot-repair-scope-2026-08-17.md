# Silent-slot repair — scope, with real numbers

**2026-08-17, per Tom's ruling: "do not start it; scope it: produce the per-course
relinkable-vs-render split so the approval has real numbers."**

**Nothing has been repaired.** This is measurement. Read-only throughout: no relink, no
render, no TTS, no deletion. Tool: `tools/deborah/silent-slot-repair-scope.cjs`
(re-runnable); raw per-slot verdicts: `docs/deborah/silent-slot-repair-scope-2026-08-17.json`.

---

## The headline number changed, upward — and here is why

My earlier estate figure was **1,034**. That counted `target1` only. Counting all three
audio columns a slot can have — `known`, `target1`, `target2` — the real figure is

> ## 2,820 silent slots across 19 courses

Nothing got worse between the two counts; the first was narrower than the problem. A
learner meets a `known` slot as often as a `target` one, so leaving the known side out
understated it by roughly two thirds.

## The split

| Course | Silent | **Relink (free)** | Voice-mismatch | **Needs render** | Distinct texts |
|---|---|---|---|---|---|
| `spa_for_eng` | **1,076** | 0 | 9 | **1,067** | 1,064 |
| `zho_for_eng` | 447 | 11 | 10 | 426 | 426 |
| `spa_mx_for_eng` | 306 | **256** | 14 | 36 | 36 |
| `ita_for_eng` | 185 | 2 | 7 | 176 | 176 |
| `kor_for_eng` | 156 | 0 | 5 | 151 | 151 |
| `fra_ca_for_eng` | 138 | 16 | 4 | 118 | 118 |
| `por_br_for_eng` | 121 | 1 | 5 | 115 | 115 |
| `eng_for_mar` | 100 | 14 | 20 | 66 | 66 |
| `por_for_eng` | 79 | 5 | 3 | 71 | 71 |
| `eng_for_por` | 56 | 12 | 2 | 42 | 40 |
| `ara_for_eng` | 51 | 0 | 0 | 51 | 51 |
| `cym_s_for_eng` | 44 | 0 | 11 | 33 | 33 |
| `fra_for_eng` | 34 | 2 | 18 | 14 | 14 |
| `eus_for_eng` | 14 | 0 | 0 | 14 | 12 |
| `gle_for_eng` | 5 | 0 | 0 | 5 | 5 |
| `ukr_for_eng` | 3 | 0 | 0 | 3 | 3 |
| `heb_for_eng` | 2 | 0 | 0 | 2 | 2 |
| `afr_for_eng` | 2 | 0 | 0 | 2 | 2 |
| `hun_for_eng` | 1 | 0 | 0 | 1 | 1 |
| **TOTAL** | **2,820** | **319** | **108** | **2,393** | **2,386** |

All 19 courses completed. **No gaps** — see "how this was measured" for two failures I
had to fix to get there.

## What the three columns mean, and why the middle one is not free

**RELINK — 319 slots (11%).** A clip already exists with the same normalised text, the
same role, a live `s3_key`, **and the exact `voice_id` this course has configured for that
role**, region included. Restoring these costs nothing, changes nothing audible, and is
reversible with a recorded before-image. This is the whole of the free win.

**VOICE-MISMATCH — 108 slots (4%). Deliberately NOT counted as free.** A clip exists for
the text and role, but on a *different voice*. Linking it would silently change which
voice a learner hears mid-course. That is a voice swap and needs its own approval, so it
sits in its own column. The strictness is on purpose: this estate has already published a
French reuse figure of 100% that was really 0%, because the identity key drops region.
Fold these into "relinkable" and the approval gets a number that is 34% too optimistic.

**NEEDS RENDER — 2,393 slots, 2,386 distinct texts.** Nothing exists on any voice. Only
TTS closes these, which is your spend decision. Note the near-1:1 slot-to-text ratio: there
is almost no internal duplication to exploit, so the render bill is essentially the full
2,386.

## The two things that decide the plan

**1. `spa_for_eng` is 38% of the problem and has a 0% free rate.** 1,076 silent slots, of
which **zero** are relinkable — its Spanish text is unique to it, so nothing can be
borrowed. It is also the course Deborah stopped checking, so nobody has reported these.
Any approval that covers only the cheap wins leaves the largest concentration untouched.

**2. `spa_mx_for_eng` is the opposite and should be done first.** 306 silent slots, **256
relinkable — 84% free.** Mexican Spanish shares text with `spa_for_eng` on identical voice
ids, so most of its damage is repairable at zero cost today. It is the single best
ratio on the estate and it needs no spend approval at all.

Between them: `eng_for_por` (12 of 56 free) and `eng_for_mar` (14 free, 20 voice-mismatch)
are free-ish because their *target* language is English, and English clips are shared
estate-wide across sibling `eng_for_*` courses. **This corrects worker #924**, which
reported "zero matches, so a relink can't rescue them" for `eng_for_por` — that check was
course-scoped; widened to the estate, 12 of its 56 are rescuable free. Its conclusion was
right about the Portuguese side and wrong about the English side.

## Recommended order (for your decision, not started)

1. **`spa_mx_for_eng` relinks — 256 slots, free, no approval needed beyond yours to
   proceed.** Best ratio on the estate.
2. **The rest of the relinks — 63 slots** across 8 courses. Also free.
3. **Rule on the 108 voice-mismatches** as a policy question, not case by case: is a
   voice change preferable to silence? A defensible answer is yes for a `known`-side slot
   and no for a target, but that is your call and I have not assumed it.
4. **Then the render pass — 2,386 texts**, sequenced per your ruling 1: after the trigger
   fix is live, and audio-first.

**Sequencing constraint that applies to all of it:** every one of these slots went silent
*because* a text edit re-resolved its link. Repairing them while the old trigger is live
is safe (a relink changes no text), but any repair bundled with a text change is not —
which is exactly the hold you have already placed.

## How this was measured, including two failures worth knowing about

Two bugs in my own first run, both of which would have produced **false all-clears** if
they had been swallowed:

- **Statement timeouts.** Paging every row of a 13–16k-phrase course with an `ORDER BY`
  hit the server timeout on `spa_for_eng`, `spa_mx_for_eng`, `zho_for_eng`, `ita_for_eng`
  and `fra_ca_for_eng` — five of the six biggest, i.e. exactly the courses that matter.
  Fixed by filtering to NULL-carrying rows server-side. The tool reported these as `GAP`
  rather than `0`, which is the only reason I noticed.
- **`zho_for_eng` failed reproducibly with a bare `TypeError: fetch failed`.** PostgREST
  sends `in.(…)` in the query string, and 100 Chinese phrases overflow the URL. Fixed by
  sizing batches on encoded bytes rather than row count. Any estate sweep that batches
  text values by count has this bug latent for CJK courses.

After both fixes, `eng_for_por` and `eus_for_eng` reproduced their pre-fix numbers exactly
(56/12/2/42 and 14/0/0/14), which is the evidence the changes altered throughput and not
semantics.

## Honest gaps

- **Cause is not measured here.** This scopes the *repair*; attribution is in the
  programme report, where confirmed loss-to-edit figures are a **floor** because
  `content_audit_log` is pruned to ~14 days. Some of these 2,820 may be never-rendered
  rather than lost — for `zho_for_eng` (4 of 149 target1 attributable) that is likely for
  most of them. **I have not separated the two causes, and the render bill does not
  depend on which it is.**
- **Verified in the database, not in the player.** I have not confirmed that a NULL
  pointer is audible silence rather than a client-side fallback for any of these courses.
- **`presentation` slots are not counted** — only `known`, `target1`, `target2`.
- Courses whose silent slots are a *majority* of their rows are excluded as never-built,
  not damaged: `ara_lb_for_eng` (6,506 of 12,333) is the clearest, and Deborah has only
  just started it.
