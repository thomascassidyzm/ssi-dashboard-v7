# The re-review queue — reaching seeds you've already gone past

Kai, 2026-08-11. Built in `tools/proofread/index.html` (client only — no API change,
no schema change, no new column).

## The gap

Unapproving the 21 Finnish seeds turned the flag off, but nothing in the tool ever
goes *backwards*. `advance()` only walks forward from the current phrase, and
`startIndex()` resumes just after the last decision. So with the reviewer at seed
107, seeds 1–15, 20, 25, 26, 34, 37 and 52 were unapproved *and* unreachable: the
only way back was to remember a seed number and type it into the jump box.

## What the queue is

A seed is in the queue when all three hold:

1. it has phrases at all;
2. it is **not approved** right now;
3. it sits **at or behind the frontier** — the highest seed number that carries any
   decision or an approval (106 for `fin_for_eng` today).

Condition 3 is what stops the queue being "the rest of the course". Seeds past the
frontier haven't been read yet; that isn't a backlog, it's just the road ahead.

Live result for `fin_for_eng`: **23 seeds**. Kai's 21, plus two the flag alone
never showed:

- **S0051** — 44 of 45 phrases ok, one never looked at;
- **S0057** — all 10 phrases ok, nobody ever pressed Approve.

Every per-seed unchecked count matches the stage-1 measurement exactly (S0001 16/18,
S0020 1/27, S0025 6, S0026 9, S0034 8, S0037 7, S0052 4), which is a second
independent path agreeing with the first.

## How it's scoped, and why

The rule applied estate-wide catches ~31.6k of 32.1k approved seeds — a measurement
of "nobody has proofread these courses", not of quality. So the queue keys off the
signal Kai already ruled on in stage 1: **the reviewer's own progress file**. The
panel appears only when the course has *both* recorded decisions and *some* approved
seeds. Any course nobody has proofread in this tool has no progress file, so the
button never renders and the count is never computed. Today that means `fin_for_eng`
and nothing else — which is also true of every other course the tool can be pointed at.

No course-level "in proofreading" status column exists in `course_seeds` or
`courses`, and this doesn't add one: the progress file is the truth about who has
proofread what, and it is already the file the rule was written against.

**Kai to confirm:** the frontier rule is my judgement, not a ruling. It reads
"behind where you've got to" as "seed number ≤ the highest seed you've touched".
If you ever jump *forward* to spot-check a late seed, that late seed becomes the
frontier and everything unapproved beneath it joins the queue in one go. That is
arguably right, but it's the one case where the queue could surprise you.

## Using it

- Header shows **Re-review N**, outlined red when N > 0, next to Flags. Hidden
  entirely when the course isn't being proofread here.
- Click it or press **R** for the list: seed number, its known sentence, ok count,
  and its state — *never reviewed* / *n of m unchecked* / *n flagged* /
  *all ok — just needs approving*.
- Click a row to jump straight to that seed's first undecided phrase.
- The count is computed from live in-page state, so it drops the moment a seed is
  approved — no reload.

Also fixed in passing: the `approved · unreviewed` badge had no CSS rule and
rendered unstyled (it's red now), and every dialog was pinned to the screen corner
by the global `* { margin: 0 }`.

## Known gap, not addressed here

`course_seeds` records *when* a seed was approved, never *who* approved it. Kai
flagged it as not urgent; noted here so it isn't lost.
