# Record everything in full — the cutoff and the estimate

**2026-08-11 · branch `feat/autocue-record-everything-2026-08-11` · not merged, not deployed**

Kai's blind listening test settled it: the joins between glued LEGO pieces are audible on real human
recordings, and they get *more* obvious deeper into a course. So there is now an option to record
seeds 1..N as complete whole lines — nothing cut up, nothing glued, no joins to hear — with
everything past N carrying on exactly as it does today.

It is an option, not a mode. Every existing course is set to **0 = off**, and nothing about anybody's
current recording flow changes until somebody deliberately picks a cutoff.

---

## 1. The estimate — and yes, it comes from the course

Kai called this the feature. It sits on the recording page, above the choice, before anyone commits.

For **Welsh (North)**, at the whole-course end of the dial:

> **5,877** things to say · **6.5 h** of recording · **296** still to do — 20 min
> *(the rest are already recorded for target1)*
>
> 305 seed sentences · 633 LEGOs · 3,633 build phrases · 1,364 use phrases
> 5,935 rows in total, 5,877 of them distinct — a line repeated across seeds is one recording, said once

Drag the cutoff and every number moves with it. Some real points on that dial:

| Cutoff | Things to say | Time | …of which still to do |
|---|---|---|---|
| seeds 1–10 | 144 | 10 min | 1 |
| seeds 1–25 | 415 | 28 min | 25 |
| seeds 1–50 | 819 | 55 min | 51 |
| seeds 1–137 | 1,994 | 2.2 h | 134 |
| everything (1–305) | 5,877 | 6.5 h | 296 |

And **Finnish**, which is the big one and has no human recordings yet, so nothing is subtracted:

| Cutoff | Things to say | Time |
|---|---|---|
| seeds 1–10 | 403 | 27 min |
| seeds 1–50 | 1,675 | 1.9 h |
| seeds 1–200 | 5,280 | 5.9 h |
| everything | 13,955 | 15.5 h |

### It is derived, not remembered — here is how to check

**It reproduces Kai's own two numbers, from live rows.** Counting every seed sentence, every new
LEGO and every practice-phrase row in the course:

| | Rows counted live | At 4s each | Kai said |
|---|---|---|---|
| Welsh (North) | 6,298 | **7.00 h** | "~6,300 things to say, ~7 hours" |
| Finnish | 16,094 | **17.9 h** | "~16,125 things, ~18 hours" |

Both land on 4 seconds per line — which is also the per-phrase figure the recording optimizer has
used all along. So the rate is not a guess either; it is Kai's own working figure, reproduced twice
from the database.

**The panel prints its own sources.** Along the bottom: *"Counted live from this course: 668 rows in
course_seeds, 633 new LEGOs in course_legos, 4,997 rows in course_practice_phrases. Time at 4s per
line, read once."* Change the course content and those numbers change on the next load.

**Hand-checked against raw SQL.** Same three tables, counted with a query that shares no code with
the app, at cutoff 137 on Welsh:

| | Panel | SQL |
|---|---|---|
| rows | 2,011 | 2,011 |
| distinct utterances | 1,994 | 1,994 |
| hours | 2.2 h | 2.22 h |
| LEGOs | 213 | 213 |
| build phrases | 1,004 | 1,004 |
| use phrases | 657 | 657 |

There is no stored total, no fixed guess, and no constant in the code describing any course's size.
The only constants are speaking rates.

### Two judgement calls worth knowing about

**Distinct lines, not rows.** A clip in this estate is one recording per (course, text, voice), so a
line that appears under three different seeds is *one* thing to say. The headline counts distinct
lines (Welsh: 5,877); the row count is shown next to it (6,298) as the "if you recorded every row
separately" upper bound. That is why the headline reads 6.5 h where Kai's figure was 7 h — same data,
duplicates said once.

**Already-recorded lines are subtracted.** Welsh already has 6,486 real human takes for target1, and
since no glued clip has ever been produced, those are all whole recordings. So "record the whole
course in full" for that voice is **296 lines, about 20 minutes** — not 6.5 hours. The recording
script honours this too: it will not ask anyone to re-say a line already in the can for their voice.

---

## 2. The cutoff, end to end

**Where it lives.** `courses.record_full_max_seed` — one integer per course, 0 = off. It belongs to
the course rather than to a session, so every recorder who opens that course inherits it without
needing a special link. (A session can still override with `?fullSeeds=N`, including `0` to opt one
session back into pure fast-and-slow.)

**How it is set.** The panel on the recording page: a slider, a number box, presets (Off · 10 · 25 ·
50 · 100 · 200 · All), and a save button that names what it is about to do. Verified round trip —
saved 137 in the browser, the DB read back 137, and a page reload came back showing seeds 1–137.

**What the recorder then gets.** Built on the `maxSeed` mechanism the script generator already had,
as Kai asked. Seeds 1..N come first, in course order — the seed sentence, then its LEGOs, then its
phrases, so the recorder meets the whole thought before its parts. Each one is a single natural pass
labelled **SAY IT STRAIGHT THROUGH** in green (deliberately not the amber SLOW, because it says the
opposite thing), with **no pause markers inside it at all**. Past the cutoff, the existing two-pass
flow, untouched.

The set cover that picks the fast-and-slow phrases now also takes a lower bound, so it cannot reach
back into seeds 1..N for splice material — otherwise it would happily cover a LEGO from seed 300
with a phrase from seed 3 and the join would be straight back.

**Driven in the real app**, Finnish with a cutoff of 3: 83 in-full items with **0 pause markers
inside them**, followed by 543 spliced phrases carrying 1,256 pause markers between them. The
pre-flight screen reads: *"Seeds 1–3 come first: 83 lines marked say it straight through — one pass
each, no pauses inside the line. After that the usual two-pass flow…"*

---

## 3. Two things found on the way

**Welsh (North) has 668 seed rows but real Welsh only to seed 305.** Seeds 306–668 are empty
placeholders — no target text, no LEGOs, no phrases. So a cutoff past 305 costs nothing extra, and
the picker now says exactly that rather than offering 363 seeds of dead slider. Worth a look
separately: it is not obvious this is intended.

**The optimizer's three fetches were unpaged**, so Supabase capped each at 1,000 rows. Finnish has
14,032 practice-phrase rows, meaning the set cover has been choosing from a truncated candidate pool
on every large course. Fixed here with paging, because the cutoff work depends on those same reads.

Minor, pre-existing, not fixed: the covering subset is not stable run to run (543/546/550 phrases
across three runs) — the greedy algorithm breaks ties on whatever order the DB hands back rows.

---

## 4. Deliberately not built

**The beta-placeholder path** — ship a course live on glued audio and swap in real recordings as
volunteers work through them — is **deferred, and should stay deferred.** It has a known blocking
dependency: recorder and pod uploads swap the S3 key in place *without* bumping the DB audio
revision, so a replacement clip never reaches a learner who has already cached the course. Building
the shipping path on top of that would look like it worked and quietly wouldn't. Fix the revision
bump first.

**Also worth knowing:** no glued or concatenated clip exists anywhere in production today. The
splicer is built and tested but has never produced a real clip — both Welsh courses' ~20,000 clips
each are whole recordings. That does not block any of the above (seeds past the cutoff simply keep
doing whatever they do today), but it does mean there was nothing composite to test against, so the
recording-flow verification used a constructed cutoff on real course data.

---

## 5. State

Branch `feat/autocue-record-everything-2026-08-11`, pushed, **not merged and not deployed**. The
migration adding `courses.record_full_max_seed` **has been applied** to the live database, with a
rollback file alongside it; it is additive and defaults to 0, so it changes nothing until a cutoff is
set. The cutoffs used while testing (Welsh 137, Finnish 3) have been **reset to 0** — picking real
ones is Kai's call.

Tests: 8 new unit tests on the estimate arithmetic, all passing; the 74 existing autocue and
composable tests still pass. Four failures elsewhere in the suite (PodLab casting,
LearningJourneyAudioFlags) pre-date this work — verified by re-running them with these changes
stashed out.
