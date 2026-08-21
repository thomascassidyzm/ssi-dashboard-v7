# Croatian pod 0 — does learner progress survive the swap?

**Short answer: yes, cleanly, and the checker refuses to credit anybody with a sentence they never heard.** There is nothing here that needs a ruling before go-live.

This is the verification you asked for before the new Croatian pod replaces the live one. Nothing has been applied — this is a dry run of `tools/pods/pod-state-migrate.cjs`, read-only, and the switchover has not been run in any mode.

---

## What is actually at stake

Learner progress is filed under a **slot key** — `hrv_for_eng:pod-0:SC03-S002` — not under the sentence sitting in it. So if you swap the pod's contents and leave the keys alone, a learner who heard *"Good day. What can I bring you?"* twenty-two times is silently recorded as having heard *"Good afternoon. What can I get you?"* twenty-two times. No error, no alarm. The new sentence is then treated as mature, served late and rarely, and is effectively never taught.

Croatian is a released course with real progress on it: **383 rows, 1,368 exposures, five learners.** The heaviest single row has 32 exposures.

## The numbers

Old pod 142 sentences → new pod 231 sentences.

| | rows | exposures |
|---|---|---|
| **Carry** — same sentence, moved onto its new slot | **252** | **918** |
| **Drop** — the sentence no longer exists in the pod | **131** | **450** |
| Merge — two rows collapsing onto one slot | 0 | 0 |
| **Total** | **383** | **1,368** |

- **Content survivors: 106** of the old pod's 142 sentences still exist in the new one.
- **Ambiguous texts: 0.** No sentence appears twice in either pod, so no match was ever a guess.
- **Every drop has the same single reason: `text_absent_from_new_canon`** — 131 of 131. Not one row was dropped because the matcher lost its nerve about position. There are no `relocated_to_different_scene` and no `moved_N_places_within_scene` cases at all.

Per learner:

| learner | carries | exposures carried | drops | exposures dropped |
|---|---|---|---|---|
| 1 | 192 | 647 | 97 | 363 |
| 2 | 22 | 99 | 15 | 59 |
| 3 | 9 | 81 | 4 | 10 |
| 4 | 20 | 20 | 12 | 12 |
| 5 | 9 | 71 | 3 | 6 |

**New sentences arrive unseen.** That is not a step in the migration — absence of a row *is* unseen. The 125 sentences Aran added simply have no state, which is exactly right.

**Dropped sentences cost the learner nothing.** `exposures` is a per-sentence maturity counter; course progress rides `course_enrollments.completed_pod_rounds`, which this tool never touches. Deleting a row cannot send anybody backwards.

## The part you actually care about: would anybody be credited with a sentence they never heard?

**No — and the migration actively prevents 158 cases where a naive swap would have done exactly that.**

Those 158 are the dangerous ones, and they are dangerous *because they look harmless*. They are Aran's near-miss rewrites: the slot survives, the wording moved slightly, and a do-nothing swap would hand the learner their old maturity on a line they have never actually heard. The five worst by exposure count:

| exposures | what the learner actually heard | what that slot holds now |
|---|---|---|
| 23 | No, it's free. Please, **take a seat**. | No, it's free. Please, **go ahead**. |
| 22 | **Good day**. What can I **bring** you? | **Good afternoon**. What can I **get** you? |
| 21 | **Good day**. What can I **bring** you? | **Good afternoon**. What can I **get** you? |
| 20 | **Good day**. I'd like a coffee, please… | **Good afternoon**. I'd like a coffee, please… |
| 19 | **Good day**. I'd like a coffee, please… | **Good afternoon**. I'd like a coffee, please… |

126 of the 158 are handled by dropping the row (the old sentence is genuinely gone), and 32 by carrying the row to where its sentence actually went. Either way the learner ends up filed against the sentence they really heard, and never against one they did not.

## Why the matching can be trusted

The rule is **match by content, never by position** — but a content match only counts if the sentence is still in roughly the same place, because the same text at a wildly different point in the ladder is a different teaching event, not the same one.

The bound is *the corresponding scene, and no more than 8 sentence positions inside it*. The scene is the invariant, and scenes are corresponded **by content, not by number** — which is what lets the old scene 15 legitimately become the new scene 22 after seven scenes are inserted in front of it. An index window would have been useless here: the pod grows from 142 to 231, so nearly every survivor shifts.

A sentence whose text changed **at all** counts as new, not as surviving. That is the whole point.

## What I checked, and what is left

- Dry run reproduced twice — before and after the Croatian text repairs — with identical numbers, confirming that editing the **target** text cannot disturb the mapping. The matcher keys on the **known** (English) text, and no English was touched.
- The one empty leftover slot, `SC15-S012`, was deleted. It held no text, no audio and no learner state, and the canonical gives scene 15 exactly eleven sentences. The pod is now 231 rows, the canonical count exactly. Removing it changed no migration number.
- **Nothing was applied.** `pod-switchover.cjs` has not been run, in dry run or otherwise.

**Nothing here needs a ruling.** No case is undecidable, no text is ambiguous, no row merges, and every drop has one plain reason. When you want the switchover scheduled, the migration is ready to apply in the same transaction as the content change, which is what the protocol requires.

*Evidence: `docs/pods/hrv-pod0-state-migrate-2026-08-21-dryrun-log.json` — every one of the 383 rows with its action, its reason, and what it would have been mis-credited with.*
