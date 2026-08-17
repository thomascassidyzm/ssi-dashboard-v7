# The course_legos audio-link rule, verified live — and what the canary can no longer tell you

**Kai, 2026-08-17.** Independent post-apply verification of
`20260817c_lego_audio_link_integrity.sql`, run against production *after* it went
live. Written by the apply-finish worker (#943), not by the worker that authored
the migration (#940) or the one that reviewed it (#942).

## What this document is for

#940 authored and applied the migration and reported it. #942 attacked it and
could not refute the SQL. This is the third pair of eyes, and it exists because
of one structural fact:

> **The canary is a one-shot instrument. It cannot verify the thing it applied.**

`canary_lego_audio_link_integrity.cjs` proves the defect was real by measuring
the OLD behaviour first — `BASELINE` asserts that a text edit silently moves a
lego onto another voice, `BASELINEPRES` asserts that a trailing space destroys a
presentation link. Those are controls, and they are the best part of the canary.
But once the migration is applied they can never pass again, because the
pre-state they measure no longer exists. So "the canary was 62/62 green" is a
statement about the *moment of the apply*, and nothing else. It is not, and
cannot be, an answer to "is the rule behaving correctly on production now".

That question needed a different instrument, so this adds one:
`database/canary/verify_lego_audio_rule_live.cjs`. It has **no `--commit` flag at
all** — every path, success or failure, ends in `ROLLBACK`. It applies no
migration and creates no permanent row. It can be re-run any time, against
whatever is live.

## Result: 47/47 green, one explicit gap

Run 2026-08-17 ~15:16Z against production.

**Shape, read out of the catalog rather than assumed** — the trigger exists on
`course_legos`, is `tgenabled='O'` (fires normally), is `BEFORE UPDATE FOR EACH
ROW`, and carries the `WHEN` clause. The function is `SECURITY DEFINER` with
`search_path=public` pinned, its comment corrects the misleading name, and
`old_link_raw` is present on the report table. Two checks worth naming
separately:

- **No bare `audio_id_for_text(` call remains in the function body.** The
  voice-blind matcher — the actual hazard — is gone from this path, verified by
  reading the live source, not by trusting the file.
- **Nothing in the function writes to `course_audio`.** A static read of the live
  source: no `INSERT`/`UPDATE`/`DELETE` against it in any branch. Make-before-break
  holds by construction, not by hope.

**Behaviour, replayed on scratch fixtures inside a rolled-back transaction:**

| Case | Verified |
|---|---|
| Cosmetic edit (whitespace/punctuation) | keeps the clip, records nothing |
| Same words, **same voice** | re-points, records `relinked-same-voice` |
| Same words, **different voice** | **nulls**, records the clip, its voice and its words |
| Presentation, trailing-space edit | **keeps the link** — the bleed is stopped |
| Presentation, genuine edit | nulls, records `nulled-presentation-not-text-addressable` |
| Presentation, known-side edit | also invalidates and records (scope preserved from 20260806) |
| Unparseable presentation value | does **not** raise, does not block the edit, raw value kept in `old_link_raw` |
| Dangling presentation value | nulls, records `nulled-dangling-link` |
| `known_text` set to NULL | drops and records rather than raising |
| Already-NULL link | stays NULL, records nothing |
| Non-text write | every link untouched, records nothing |

**A control, not just an assertion.** On the same fixture where the rule
correctly nulls, `audio_id_for_text()` is called directly and *does* return the
wrong-voice clip. The hazard is demonstrated still live in that function for its
other callers — the rule is what changed, not the fixture.

### The two coverage gaps #942 named are now closed

#942's finding 8 was that the canary never exercised the `language` conjunct of
`audio_id_for_text_same_voice`, and only ever tested same-voice relink on the
`known` role. Both are tested here:

- **`language`** — a clip with the right words in the *same voice* but a
  different `language` is **not** reused (the link nulls instead). The paired
  control is the identical fixture with a matching language, which *does* relink.
  That pairing is what proves the language conjunct is the thing doing the work,
  rather than the text or the voice.
- **`target1`** — same-voice relink verified on a target role, not just `known`.

### Rule 0, the clobber #942 found, verified live

`SET known_text = …, known_audio_id = NULL` in one statement now leaves the link
NULL. Before Rule 0 the function read `OLD`, resolved a substitute from OLD's
voice, and **resurrected the link the writer had just deliberately cleared** —
pointing at a clip speaking the old words. The mirror case is verified too: a
writer *supplying* a link in the same UPDATE keeps it, even across voices. An
explicit audio-first repair is no longer second-guessed.

### The one explicit gap

`track_functions` is `none` on this server, so `pg_stat_user_functions` cannot
observe whether the `WHEN` clause actually kept the function un-entered. That is
an **unavailable instrument, not a defect**, and the verifier records it as a
labelled SKIP printed outside the green tally — never folded in as a pass. The
substantive claim does not rest on it: the `WHEN` clause is verified present and
correct via `pg_get_triggerdef`, and Postgres evaluates a row trigger's `WHEN`
clause before entering the function.

## The restore discipline held — measured, not claimed

#932's canaries dirtied real production rows and left them dirty, because
`--commit` commits. The brief for this job demanded proof that the fix was real
rather than asserted, so it was measured after the fact:

- **Untrimmed text in `course_legos`, estate-wide: 0.** Not "0 in eng_for_sin" —
  zero across every course.
- `eng_for_sin` seeds: 0. `eng_for_sin` phrases: 0.
- The production lego the canary probes (`eng_for_sin` seed 1 lego 1,
  `මට ඕනේ` / `I want`) sits at **version 34**, with both its known and
  presentation links intact.

`#940`'s fix for this was the right shape: the production probe now runs inside
`SAVEPOINT realprobe` and is rolled back to it, which undoes not just the text
but the `version` bump, the `content_audio_log` rows and the cache stamp that
would otherwise have invalidated every `eng_for_sin` learner's cached script. A
text-restore alone could never have undone those.

**No fixture residue from this work**: zero rows under `zzz_lcanary_for_zzz` or
`zzz_lverify_for_zzz` in any table.

Two unrelated fixture courses *do* survive on production — `zzz_test_for_eng` (9
clips) and `zzz_test2_for_eng` (1 clip), plus one lego and one seed. They predate
this work and are **not** from these canaries. Recorded here as housekeeping for
whoever wants them gone; not touched, because deleting generated assets is
approval-gated.

## All three tables now share one rule — read from the catalog

| table | trigger | enabled | `WHEN` | same-voice matcher | voice-blind matcher | records drops |
|---|---|---|---|---|---|---|
| `course_seeds` | `trg_null_seed_audio_on_text_change` | ✅ | ✅ | ✅ | ❌ gone | ✅ |
| `course_practice_phrases` | `trg_null_phrase_audio_on_text_change` | ✅ | ✅ | ✅ | ❌ gone | ✅ |
| `course_legos` | `trg_null_lego_audio_on_text_change` | ✅ | ✅ | ✅ | ❌ gone | ✅ |

## Can a content-table text edit still silently swap or destroy an audio link?

**No — not on any of the three tables.** All three resolve same-voice-or-null and
write every move and every drop to `content_audio_link_drops`.

**One hole remains, and it is a different shape.**
`course_practice_phrases.presentation_audio_id` is **not covered** by the phrase
trigger — confirmed by reading the live function source. There are **56,671**
phrase presentation links and **0 dangle**. So a phrase text edit does not swap
that link and does not destroy it; it leaves it **stale** — still resolving, still
playable, now introducing wording the row no longer has. Nothing invalidates it
and nothing records it. That is deliberately still open.

(Worth noting against the phrase migration's record: it excluded presentation
partly on "17,480 dangling rows", and that number is **0** on live data today.
The exclusion stands on its other ground, but that particular argument is dead.)

## The other open item

A dropped lego presentation slot is still not refilled automatically. The one
route that can refill it — `linkPresentationAudio()` in
`services/phases/phase8-audio-v13.cjs` — keys on `lego_id`, which does **not**
change when the text changes. So a refill can restore a link to a clip that
introduces the *old* wording. **151** of the 22,665 currently-NULL lego
presentation slots are refillable by it right now. Recording the drop is what
makes a stale refill distinguishable after the fact; before this migration it was
not.

## A process note worth keeping

This job was dispatched to finish an apply that had been interrupted. Partway
through, the worker that had been declared finished (#940) **came back to life**
and began editing the same three files in the same shared worktree. Both workers
were pointed at the same DDL apply.

What avoided a clobber was noticing it at all — a file mtime that had moved since
it was read — and then going strictly read-only until the other worker's files
went quiet and its commit landed. #940 got there first and applied it correctly;
this became verification rather than application, which is the right outcome and
not the briefed one.

**And a mistake of mine belongs in the record, because it is the more useful half
of the lesson.** I tried to warn #940 off the apply and reported that
`/api/reply` "rejected every shape tried". That was true of the four shapes I
tried (`conv`, `id`, `conv_id`, `job` — all of which fail with an SQLite bind
error) and false as an implication: the working payload is
`{"jobId":"<uuid>","message":"..."}`, which was written down in my own operating
notes and which I did not try. Tested afterwards, it binds and returns
`{"ok":true}`.

So the collision was **not** unresolvable by talking. #940 was still running at
that moment, and one correctly-addressed message could have settled who owned the
apply before either of us touched a file. Going read-only was the right instinct
and it worked, but it was the fallback, not the fix.

Two lessons, then, and the second is the one I got wrong:

1. **Before editing a file in a shared worktree, check whether its mtime has
   moved since you read it.** Two workers holding one DDL migration is not a merge
   conflict, it is a production apply race.
2. **When a coordination call fails, suspect your own payload before concluding
   coordination is impossible** — and check your notes for the shape that works
   before reporting the channel as dead.
