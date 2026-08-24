# The recording queue routes by dialect

**Tom's ruling, 2026-08-19. Code on `feat/dialect-aware-recording-queue`, not merged, not deployed.
Two schema changes ARE applied to the live database — both deliberately inert until the code lands.**

## What was wrong

The recording queue is built **by language**, on purpose: Northern and Southern Welsh share one queue
so that a line appearing in both courses is read once, not twice. Within that queue the only filter
was **gender**. Nothing in the database said which accent a course was in — `cym_n_for_eng` and
`cym_s_for_eng` both carry `target_lang = 'cym'` — so 197 Southern pod lines sat in the two Northern
speakers' lists, waiting to be read in the wrong accent, and nothing flagged it. The queue was working
exactly as built. Kai's 2026-08-19 fix returned `cym_s_for_eng` to **uncast**, which emptied the
Northern queues of Southern work but left the Southern lines with nowhere to go
(`docs/welsh-south-pulled-from-northern-queues-2026-08-19.md`).

## The ruling, and what it rules out

Dialect is a **property of the course**, not of the casting. A Southern Welsh course is Southern as a
fact of its content, whoever happens to be reading it. Voices carry a dialect tag; a line enters a
recordist's queue only when the course's dialect equals the voice's.

Two cheaper-looking inferences were both rejected, and the rejection matters more than the mechanism:

- **From the course code's `_n`/`_s`.** That spelling is a naming habit, not a declaration, and most
  courses have no suffix at all.
- **From the casting.** This is the original bug wearing a hat. `cym_s_for_eng` was cast to Aran and
  Catrin, so "the dialect is whoever is cast on it" makes the Southern course Northern — precisely
  what the queue already believed.

## Schema

**`courses.dialect`** — `text NOT NULL DEFAULT 'standard'`, plus a CHECK that it is not blank
(`ops/sql/20260819-course-dialect.sql`). All 146 courses took the default; the two Welsh ones were
then set explicitly to `north` and `south` (`ops/sql/20260819-welsh-dialects.sql`).

**`language_recording_policy.voices[].dialect`** — a tag on each voice entry. The map's keys become
*slots* rather than genders: `m` / `f` for a single-dialect language, `m:south` / `f:south` when a
language needs more than two voices. Gender falls back to the slot key's leading token, so every row
written before today keeps meaning exactly what it meant — including Finnish's free-form `test` slot.
Aran's and Catrin's entries were tagged `north` by a **targeted jsonb merge**, never a rewrite: those
entries carry the alias spellings that are the only reason their existing takes count as already
recorded, and replacing the object would have asked them to re-record work they have already given us.

**Why a default at all:** every language but Welsh has one dialect and this must change nothing for
any of them. One explicit default on every course and every voice makes the match trivially true
wherever it used to be unasked — a no-op *by construction*, not a special case in the queue, and no
null to handle. `standard` is deliberately not a real dialect name.

## Where the filter lives

`services/voice-engine/recordist-queue.cjs`, in `buildLanguageLines` — the same function that already
partitioned a language's lines by gender. It now partitions by **(dialect, gender)**, the dialect read
off the line's own course. Everything downstream follows from that one bucket key
(`services/shared/dialect.cjs`):

- `buildQueue` asks for its recordist's bucket instead of their gender.
- The **collapse narrows with it**. Two courses of the same dialect sharing a line are still one
  recording; two dialects sharing a spelling are not. That is what `alsoFills` used to promise across
  `cym_n` and `cym_s`.
- `propagateTakeToDuplicates` matches dialect too. Without it a Northern take would be filed straight
  into the Southern pods it was deliberately never queued for — the same defect one step down the pipe.
- Flagged re-records route by their **course's** dialect. Nothing is read off the clip: presentation
  narration is stored under the shared untagged voice `human` and has no dialect of its own to trust.
- `buildCoverage` reports a new **`unrouted`** count — lines cast to a gender in a dialect the language
  has no voice for. Kept separate from `uncast`, which is narrower (no gender on the speaker at all),
  because the remedy differs: these need a voice tagged with their dialect, not a cast. Both now show
  on the admin bar, so the fix cannot hide what it moved.

## Verified against the live database

The queue module was run against the live estate from both checkouts and the output diffed. Read-only;
the only writes were the two migrations and a reversible probe.

**Regression test — byte-for-byte.** Every recordist queue and the whole coverage bar, before and
after, with only the newly-added fields (`dialect`, `unrouted`) stripped: **identical, md5
`6ba0c99c…`**. That covers Kai's Finnish (`human_kai_fin`, 231 lines, 19 recorded), the two `zzz` test
voices, Breton, Pennsylvania Dutch, and both Welsh voices — every human-recorded language on the
estate. The remaining textual delta is purely additive: `"dialect": "standard"` and `"unrouted": 0`.

**Live proof, reversible.** The Southern lines are currently uncast, so the filter has nothing to bite
on and the change is invisible. So the probe put the estate back into the exact state that caused the
bug — `cym_s_for_eng` cast to Aran and Catrin from Kai's snapshot — measured both codebases against it,
cast two throwaway Southern probe voices, and reverted. Live exposure: seconds; the revert ran in a
`finally` and was verified byte-identical to the pre-probe rows.

| | Aran | Catrin | South M | South F | uncast | unrouted |
|---|---:|---:|---:|---:|---:|---:|
| as the estate stands (Southern uncast) | 125 | 154 | — | — | 231 | 0 |
| **old code**, `cym_s` cast — *the bug* | **191** | **285** | — | — | 0 | — |
| **new code**, same database state | **125** | **154** | — | — | 0 | **231** |
| new code, Southern voices cast | **125** | **154** | 87 | 144 | 0 | 0 |

191 and 285 are the bug's own numbers from Kai's doc. Under the new code the Northern queues hold
their Northern totals whatever `cym_s` is cast to, the 231 Southern lines are counted rather than
absorbed, and casting Southern voices moves all 231 (87 + 144) to them **without touching Aran's or
Catrin's queues at all** — the collision that made casting Mali and Richard impossible before today.

**Tests.** 8 new cases in `recordist-queue.test.cjs`, including the no-op default, the course-not-cast
assertion (a Southern course cast to the Northern man stays Southern), same-dialect collapse
surviving, and case/space-insensitive tag matching. All 13 pre-existing cases pass **unmodified**.
Eight other `services/voice-engine` test files fail identically on unmodified `main` — pre-existing,
not touched here. Front-end build clean.

## Deliberately not done

- **Mali and Richard are not cast.** They have no voice id anywhere in this estate, and minting one
  puts a live recording link into existence for a person who has not been handed it — a link **is** the
  identity on this surface. The mechanism is in place and the casting is one admin `PUT` away; the
  exact body is in `ops/sql/20260819-welsh-dialects.sql` §3.
- **`cym_s_for_eng` stays uncast.** It no longer *has* to be — the dialect filter, not the empty cast,
  is what keeps Southern lines out of Northern queues now — but restoring it is a casting decision
  with a snapshot of its own, and not this change's to make.
- **`cym_for_yor` and `cym_anthem_for_jpn` keep `standard`.** Both are Welsh, neither has a podCast, so
  every line of both is already `uncast` and in nobody's queue. Which accent they teach is a content
  question for whoever casts them; guessing it here is the inference this change exists to stop.

## Reversing it

The code is unmerged, so nothing is live. The two live schema changes are inert without it and can be
left in place safely; to undo them anyway:

```sql
UPDATE courses SET dialect = 'standard' WHERE course_code IN ('cym_n_for_eng','cym_s_for_eng');
UPDATE language_recording_policy SET voices = voices
  || jsonb_build_object('m', (voices->'m') - 'dialect')
  || jsonb_build_object('f', (voices->'f') - 'dialect')
WHERE language = 'cym';
-- and, only if the column itself is unwanted:
ALTER TABLE courses DROP COLUMN dialect;
```
