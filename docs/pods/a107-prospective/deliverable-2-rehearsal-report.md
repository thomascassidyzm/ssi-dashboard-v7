# Deliverable 2 — rehearse-switchover.cjs on three representative courses

*2026-08-23. Part 3 of job #137. All runs used `tools/pods/rehearse-switchover.cjs` against
scratch course codes `zzz_rehearsal_nep` / `zzz_rehearsal_hin` / `zzz_rehearsal_isl` — a clone of
each real course under a throwaway code, never the real course. Every scratch course was cleaned
with `--clean` immediately after its run; confirmed by direct query afterwards that
`listening_pods`/`learner_pod_state` hold zero rows for any `zzz_rehearsal_*` code. No `--apply`
ever touched a real course. No audio generated. No pod-sync run. No pod visibility changed.*

## Leading finding: rehearsal is currently BROKEN for any course with real learner progress

**FAIL.** Two of the three rehearsals — `hin_for_eng` and `isl_for_eng`, both of which have real
`learner_pod_state` rows — crashed with an unhandled exception before reaching the promote step at
all:

```
FAILED: realHumanLearners: refusing scratch/rehearsal course code 'zzz_rehearsal_hin' —
these are estate test fixtures (tools/pods/rehearse-switchover.cjs), not a real course.
```

**Root cause, traced in the code.** `services/shared/learner-counts.cjs` (commit `315e9a6b`,
2026-08-23 11:05 UTC — same day, already on this branch, not something I introduced) added a hard
guard: any `course_code` matching `/^zzz_/` throws rather than being counted, because `zzz_*` is
exactly the naming convention `tools/pods/rehearse-switchover.cjs` uses for its scratch clones.
That guard was then wired into `tools/pods/pod-switchover.cjs` (line 237) — but only inside the
`if (stateRows.length)` branch, i.e. only when the course being switched actually has
`learner_pod_state` rows. `pod-switchover.cjs` has no `try/catch` around that call, so the
exception is unhandled and the whole command dies before it ever prints its readiness check or
reaches the migration/promote logic.

The two safety features are individually correct and both landed today — the scratch-code guard
existed to stop a rehearsal clone's fake progress from ever being miscounted as "real human
learners" in a report, and the readiness gate exists to stop half-translated content going live.
But wiring the guard into the exact function `pod-switchover.cjs` calls unconditionally on any
course with learner rows means **the two tools now cannot be used together**: rehearsing a
switchover is only possible today for a course with *zero* learner progress, which is precisely
the case that needs no rehearsal.

- `nep_for_eng` clone had 0 `learner_pod_state` rows (real — nep has no listeners yet) → `stateRows.length` is 0 →
  the `realHumanLearners` call is skipped entirely → it fell through to the (separately failing,
  see below) readiness gate instead. This is why nep's run produced a clean `REFUSED:` and hin/isl's did not.
- `hin_for_eng` clone had 2 rows, `isl_for_eng` had 90 rows → both hit the guard → both crashed.

**This means: as things stand, nobody can rehearse a switchover for any of the 14-of-21 Group 2
courses that actually carry learner progress (see Deliverable 1's table) without first fixing this
interaction.** This is a real defect in the tooling, not a finding about the migration logic
itself — noted for the record, not fixed (out of scope: no code changes in this audit turn).

## Second finding: even where the crash is avoided, no course is switch-ready today

`nep_for_eng` avoided the crash (zero learner rows) but was refused on the pre-existing readiness
gate instead:

```
REFUSED: zzz_rehearsal_nep is not ready to switch:
  - 1 staged sentences have no target text
  - 100 staged sentences are still marked draft
  - 101 staged sentences have no target audio
```

I checked this is not particular to `nep_for_eng`: a direct query of every course's
`pod-0-unrecorded` staged pod, estate-wide (not just the 21 Group 2 courses), found **zero courses
anywhere with a fully translated, non-draft, fully-audio'd staged pod right now** — every course's
231/232-line replacement is mid-translation/mid-recording. `isl_for_eng`'s staged pod is the
closest to ready (0 untranslated, 0 draft) but still has 10 sentences with no target audio, which
alone blocks it. This confirms the tools are correctly and safely refusing to promote unfinished
content — nobody can flip Group 2 today even setting the above bug aside, and that is the gate
working as designed, not a defect.

## What I could NOT prove this turn

Because of the two findings above, **I was not able to run a real forward-promote +
rollback round trip on any course's actual current content** — not because the migration/rollback
mechanism itself is suspect, but because the tool chain refuses (correctly, on readiness; buggily,
on the learner-count guard) before it gets there. I am reporting this as an explicit gap rather
than papering over it with the dry-run evidence from Deliverable 1, which proves the *planning*
logic (`planMigration`) produces correct carry/drop/unseen numbers, but does not exercise the
actual DB-writing apply/rollback transaction, its atomicity, or its "progress cannot go backwards"
assertions end-to-end.

## Per-course run log

| course | shape | clone rows/exposures | forward-apply result | rollback attempted? |
|---|---|---|---|---|
| nep_for_eng | high content survival (127/142 survive) | 0 rows / 0 exp | **FAIL** — REFUSED, staged pod not ready (1 no-text, 100 draft, 101 no-audio) | No — nothing to roll back, forward never applied |
| hin_for_eng | heavy rewrite (92/142 survive) | 2 rows / 2 exp | **FAIL** — crashed on `realHumanLearners` scratch-code guard before readiness check completed | No — crashed before apply |
| isl_for_eng | awkward / heaviest real exposure (87/142 survive, 90 rows / 1,977 exposures) | 90 rows / 1977 exp | **FAIL** — same crash as hin_for_eng | No — crashed before apply |

All three scratch clones were fully cleaned (`--clean`); zero `zzz_rehearsal_*` rows remain in
`listening_pods`, `listening_pod_sentences`, or `learner_pod_state`.

## Assertions, PASS/FAIL

The tool's own post-round-trip assertions (pod slugs restored, sentence counts restored, no
orphaned learner state) never ran for any of the three courses, because none reached that stage.
There is nothing to mark PASS. Every attempted rehearsal is **FAIL** at an earlier stage, for the
two distinct reasons above.
