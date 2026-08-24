# Script View now shows the Easy round the learner actually hears

2026-08-08. Follow-on to the Speaking config recut, which brought Popty in line
on the known-side syllable filter and deliberately left the cycle-doubling out
— so Script View understated an Easy round by about half. This closes that gap.

**What landed here and what did not.** The recut's *services* half — the
known-side syllable filter, the mode resolvers, the syllable-counter registry —
is on `main` with this change, because the doubling builds directly on it and
the Speaking page already on `main` writes every key it reads. The recut's
*admin-page* half is not: it re-cuts `SpeakingConfig.vue`, which `2bf78e02`
re-cut differently on `main` the same evening, and the two conflict. That is a
taste call between two treatments of one page, so it stays on
`feat/speaking-config-recut-2026-08-07` with its own writeup
(`docs/speaking-config-recut-2026-08-07.md`, on that branch) until someone picks.
Nothing here depends on which way that goes.

## What changed

Easy plays every practice cycle twice, back to back (Tom, 2026-08-07: "in EASY
mode, double up every phrase, every BLD, every USE, every REVIEW, every
CONSOLIDATE"). The learner has done this since the `claude/easy-phrase-syllable-cap`
work landed on `dev`. Script View now does the same thing, by the same rule, at
the same point in the pipeline.

- `services/learning-modes.cjs` gains `resolvePhraseRepeatCount`,
  `resolveRepeatedCycleTypes`, `isRepeatedCycle` and `repeatPhraseCycles` —
  mirrors of the learner's `normalizePhraseRepeatCount`,
  `normalizeRepeatedCycleTypes` and `repeatPhraseCycles`.
- `services/learning-script-generator.cjs` reads both values off the mode row
  and applies the pass to each round's item list, immediately after the
  consecutive-duplicate dedup — which is exactly where the learner applies it,
  and which is load-bearing: run it before the dedup and the second copy is
  stripped on sight.

Both the count and the eligible cycle types come off `algorithm_config`. Nothing
about the doubling is hardcoded except the ceiling.

## One setting, two vocabularies

The DB row is written in the learner's cycle names — SpeakingConfig.vue writes
`repeatedCycleTypes: ['build','spaced_rep','use']`. Script View calls those same
cycles `build`, `review` and `consolidate`. Rather than ask anyone to keep two
spellings of one setting in sync, Script View translates on read
(`CYCLE_TYPE_ALIASES`). `use` maps to `consolidate` because a consolidation
cycle **is** a use phrase, and Script View has no separate `use` type: its USE
phrases are emitted either as BUILD padding, already typed `build`, or as
`consolidate`.

## The three rules that hold

**The ceiling is not configurable.** "We do NOT ever want to repeat exactly the
same phrase more than 2x — a phrase repeated 3x would drive people nuts, but
doubled up is perfect." A row asking for 3 clamps to 2. The learner has an A-64
pass downstream as a second guarantee; Script View has no such pass, so the
clamp in `resolvePhraseRepeatCount` is the only thing standing between a bad row
and a tripled prompt — which is why it is a hard `Math.min`, not a warning.

**Intro and the bare LEGO are never doubled.** Asked directly, Tom: "of course
not - the intro LEGO and not the LEGO alone." They are absent from the default
type list. A config row *could* add them; that is his call, not the code's.

**The seed-phase review is never doubled, whatever the row says.** The drained
t→k→t→t sandwich is already several cycles of one sentence, so repeating it
would give four hearings and breach the never-more-than-twice rule. Structural,
not a setting — the same carve-out the learner makes.

## Verified live on `fra_for_eng`

Against the real `easy_mode` row (`phraseRepeatCount: 2`,
`repeatedCycleTypes: ['build','spaced_rep','use']`), rounds 1–12:

| Cycle type | Fast | Easy |
|---|---|---|
| intro | 12 | **12** — *not doubled* |
| debut | 12 | **12** — *not doubled* |
| build | 55 | **110** |
| review | 45 | **90** |
| consolidate | 18 | **36** |
| **total items** | **142** | **260** |

Fast is byte-identical to before: a count of 1 returns the item list by
identity, and a test pins that.

Rounds 151–330, where the Fibonacci series has reached the seed phase:

- **131 seed-phase reviews, 0 of them doubled.** The carve-out holds where it
  actually bites.
- **Longest consecutive run of the same phrase: 2.** Never three, anywhere in
  the run.

## One thing fixed on the way past

`ScriptViewer.vue`'s flagged-phrase delete modal listed one row per *appearance*
of a phrase rather than one per phrase, and keyed those rows on `phrase_id` —
so a phrase reviewed at several offsets already produced duplicate Vue keys.
Doubling every Easy cycle would have made that routine rather than occasional.
The modal now dedupes by `phrase_id`, which is what a list of things you are
about to delete should show anyway.

## Tests

`services/learning-modes.test.cjs` — 54 passing, 15 of them new: the ceiling and
its clamp, degrade-to-1 on every bad value, the vocabulary translation, the
empty-array-means-repeat-nothing reading, the intro/debut and seed-phase
carve-outs, copy placement, and Fast's list returned by identity.
`services/learning-script-generator.test.cjs` — 50 passing, unchanged.
