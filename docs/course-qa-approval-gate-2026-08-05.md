# The approval gate

**2026-08-05.** Built out of tonight's `deu_for_eng` fire. Everything below is live in the
database and pushed; nothing is deployed yet.

---

## What you asked for, and what it now does

> "No course should EVER go out to learners unless it has passed a manual approval gate."
> "I think it's perfectly OK to sample cycles/maybe clips rather than manually check them all
> BUT I think we MUST manually play through the first X ROUNDS."

A course can no longer be promoted to learner-visible until a human has played through its first
X rounds in the real app and signed each one off. X is **100 for paid, 20 for free**, stored per
course so you can change one course without a code change.

Sampling is untouched for the body of a course. Only the first X rounds are non-negotiable.

---

## The two mistakes from tonight, made impossible

**An agent overruled the detector.** That was the expensive one — the detector correctly reported
the final word missing from six German intros, an agent decided it was a whisper artifact, and
cleared five of them.

A flag now has exactly two ways out: **a human clears it**, or **a repair replaces the audio**.
There is no third column. There is no endpoint that clears a flag on a judgement, and clearing
one requires a name and a written reason. An agent cannot do this even by accident, because
there is nothing for it to write to.

**Nobody had listened.** A sign-off is now a real, queryable fact: who, when, which round, and —
this is the part that matters — **against which exact bytes**.

If a clip is repaired after you signed its round off, the sign-off goes stale automatically and
the gate drops back. That is not a hook that someone has to remember to call; the sign-off stores
a fingerprint of every clip revision in the round, so replacing a clip moves the fingerprint by
arithmetic. I tested it both ways: bump a revision, the round flips to stale; put it back, the
sign-off returns.

---

## Where the gate bites, and where it does not

**It bites** in Popty's publish path. Promoting a course to `live` or `beta` — the statuses the
learning app actually selects on — is refused with a message naming exactly what is missing.
Tested live: promoting `kor_for_tam` returned "0 of 100 required rounds signed off" and wrote
nothing.

**It does not bite** on demotion, ever — you must always be able to pull a course back. And it
does not bite on re-saving a course at the status it already holds, because 78 courses are
already learner-visible and blocking an unrelated edit to one of them would be the gate punishing
the wrong thing.

**It does not yet bite in the learning app.** Nothing about what learners can see changed
tonight. The gate status is readable from the DB, so the learning app *could* honour it, but
flipping that is a decision with an audience and it is yours, not mine.

There is an override. It requires a written reason and records who used it — because a hard block
with no escape hatch gets routed around in ways nobody records.

---

## The honest number

**78 courses reach learners right now. None of them has been signed off.**

That is the headline on the new estate page, deliberately. Nothing was grandfathered in as
passed, nothing was backfilled optimistically, and no live course's status was touched. The
estate page shows every course, its tier, its X, and how far sign-off has got — so the retrofit
can be worked by priority as human time allows.

---

## Making 100 rounds of listening survivable

You said it yourself: this is a human cost in terms of time. So the worklist is built to be
divided.

- **Claim a range** — "Alice takes 1–25, Bob takes 26–50". Two people being handed the same
  rounds is refused by the database, not just by the form, so it cannot happen even if two
  people press the button at the same moment.
- **Press ▶ on a round** and the **real learning app** opens at that round, with whatever
  configs are live in the DB — what a real learner would get. It uses the deep-link contract the
  other worker built tonight, which is already on `main`. Script View's own preview player is
  untouched; it stays a proofing tool.
- **Come back and record a verdict.** Passing a round marks every clip in it as heard by you.
  Flagging opens the round's actual clip list so you tick the ones that are wrong — each becomes
  a real flag that lands in the repair flow, not a note nobody reads.

One thing worth knowing that fell out of the build: **audio is shared by text**. Round 1 of
`deu_for_eng` looks like 9 clips but is really 4 — the same recordings play in the intro, the
debut and the build. So passing a clip passes it everywhere it appears, and flagging it drops
every cycle that uses it. That is real leverage on your listening time.

---

## Cycles that have been fully checked

You asked for a way to identify these. A cycle is verified when every clip in it has been passed
by a human and nothing in it is flagged — computed, never typed in, so it drops back the instant
a clip is flagged or replaced. The cycle keys are byte-identical to the ids the learner-facing
API uses, so a producer looking at a QA row and a learner hitting a bad cycle are provably
talking about the same thing.

A round is a LEGO throughout. No seed position exists anywhere in this.

---

## What I need from you

Nothing blocking. Two things worth a sentence when you have one:

1. **Should the learning app honour the gate**, or is Popty-side enforcement the right place for
   now? I deliberately did not change what learners can see tonight.
2. **X = 100/20 is seeded, not fixed.** If a particular course wants a different number, it is
   one admin action.

Everything else was a taste-safe default and is written up in the repo's decision journal.
