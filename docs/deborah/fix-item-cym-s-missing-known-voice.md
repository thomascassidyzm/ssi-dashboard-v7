# `cym_s_for_eng`'s 44 silent slots need a HUMAN recording, not a config fix

**Filed 2026-08-17 per Tom's ruling (b) — and CORRECTED the same day. My first version
of this item had the diagnosis wrong; this replaces it.**

## What I first said, and why it was wrong

I filed this as "`cym_s_for_eng` has no configured `known` voice — a config defect, small
Kai question". That reading came from `wanted_voice: null` on 11 held slots.

**It is not a config defect.** Reading the actual `voice_config` shows it contains only a
`podCast` block — no `voices` key at all, so **no `known`, `target1` or `target2` voice
exists**, not just the known one. And the reason is that

> **`cym_s_for_eng` is a HUMAN-VOICE-ONLY course. TTS is forbidden on it by Tom's own
> ruling of 2026-07-25.**

`services/shared/human-voice-courses.cjs` names it explicitly and also matches `/^cym_/`,
and `phase8-audio-v13.cjs:1905` short-circuits `/generate` for it:
`SKIP … human-voice-only course — no TTS generated`. The missing voice config is not an
omission — it is the correct state for a course that is never machine-voiced.

## What this changes

**All 44 of its silent slots are out of scope for both authorised routes:**

- **Relink** — cannot prove voice equivalence with no configured voice, and the tool
  fails closed. Correct behaviour, wrong conclusion drawn from it.
- **Render** — TTS is forbidden. **I had wrongly included its 33 "needs render" slots in
  the render bill.** They are now removed: the corrected bill is **2,413 renders /
  89,424 characters / $1.43**, down from 2,446 / 90,312 / $1.44. Trivial in money,
  wrong in kind — a render pass that included them would have been skipped by phase8
  and reported as a silent no-op.

## What they actually need

A **human recording pass** — a different route, a different queue, and a person's time
rather than pennies. Welsh is recorded by **Catrin** (the Learner voice, so most lines sit
in her queue) with **Aran** as admin. So this is not a Kai config question folded into the
render decision; it is a **recording request**, and it belongs to whoever schedules Catrin.

Its sibling `cym_n_for_eng` and `bre_for_fra` are in the same category and were not
measured here.

## The gap I have not closed

I still have **not** swept the estate for courses whose `voice_config` is missing course
voices. This surfaced only because `cym_s_for_eng` happened to have silent slots. Now that
the cause is known, that sweep would answer a sharper question: **which courses have
silent slots that no TTS pass can ever fill** — because they are human-voiced — so they
never sit in a render queue waiting for approval that would silently skip them.

## What this is not

Not the cause of the silence. These 44 went NULL by the same mechanism as the rest — a
text edit re-resolving the link (see the programme report). Being a human-voice course is
what blocks the *repair*, not what caused the damage.
