# Deliverable 4 — the verdict, plain English

**Answer: YES, with two caveats — and one of them means it hasn't actually been proven end-to-end yet.**

The maths that decides who keeps their progress is sound and I checked it against real data: I
ran the real dry-run tool against all 21 courses waiting to flip, and across every one of them the
tool correctly separates "this sentence survived and the learner keeps their exposures" from "this
sentence is genuinely gone, no penalty" from "this is new content, arrives unseen" — and it never
once fired the special rule that would refuse to carry progress because a sentence moved too far
within its scene. So the *design* is doing exactly what Tom's ruling says it should, on the actual
content these 21 courses are about to get. **Caveat one**: none of these 21 courses can actually be
flipped today regardless — every one of them still has untranslated, draft, or unrecorded sentences
in its replacement content, so the tool's own safety gate correctly refuses all of them right now.
That's not a progress-mapping problem, it's a "not finished yet" problem, and it's working as
designed.

**Caveat two is the one that matters**: when I tried to actually rehearse the full flip-and-undo on
a throwaway copy — the only way to prove the database-writing part really works, not just the
planning arithmetic — it crashed for the two courses that have real learner progress on them
(hin_for_eng and isl_for_eng), because a *different* safety feature added today (one that stops
fake rehearsal data being counted as real learners in reports) accidentally blocks the rehearsal
tool itself from running on any course that has learner progress. That's exactly backwards — it
means nobody can currently rehearse a switchover for a course that actually has something to lose,
which is the one case rehearsal exists for. So while the planning logic checks out on paper, I
could not get a live, proven "we flipped it and undid it and nobody lost anything" result for any
course today — that is a genuine gap, not something I'm papering over. On the delivery side, the
app itself is fine: I read and live-tested the code that decides which pod a learner is served, and
confirmed all five places the app reads pod content go through the one lookup, which correctly
prefers new content and falls back safely — that part isn't in question.

**One thing to flag in passing, not to act on**: none of this touches Group 1 (the courses already
serving pod-1), but the general shape of "archive the old pod before you can promote the new one
onto its slug" applies there too — sequencing to note for whoever does that flip, not something I
touched here.

## Explicit gap

I could not produce a real, database-level promote-then-rollback proof for any course today. The
blocker is a bug in the tooling (a rehearsal-safety check and a fake-data-safety check stepping on
each other), not a defect in the migration rules themselves — but until that's fixed, "we rehearsed
it and it worked" cannot honestly be said for any course with real learner progress.
