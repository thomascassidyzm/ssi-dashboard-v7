# The known side of a pod switchover now refuses too

**2026-09-02.** Read-only fleet pass + one gate fix + one test. Nothing was promoted, migrated or flipped.

## What was wrong

`tools/pods/pod-switchover.cjs` is the gate between a course and a live POD promotion carrying real
learner progress. Its readiness query counted five things and refused on three:

* `no_known_audio` was counted, **printed in the readiness log line, and then never pushed onto
  `blockers`** — measured and discarded.
* `known_text` emptiness **was not counted at all**.

So a pod with a complete target side and a **silent or empty known side** passed the gate and could be
promoted onto the slug the player serves. The known side is half of what a learner hears.

The hole survived because the blocker computation lived inside `main()`. The only export was
`planInflightFold`, so no test could reach it, and none did.

## What landed

`readinessBlockers(counts, { rehearsal })` is now a **pure exported function**. `no_known_text` is
counted alongside `no_text` (`count(*) filter (where coalesce(btrim(known_text),'') = '')`), both
known-side blockers are pushed with the same wording as their target-side twins, and both appear in
the readiness log line — so the printed line and the refusal now agree. Existing blocker sentences are
byte-identical.

Both new blockers are **content**-readiness blockers, so `--rehearsal` waives them exactly like the
target-side pair: a rehearsal proves the progress migration on a throwaway clone, and binding the known
side there would break rehearsals for no safety gain. The waiver log line names them, so it stays
honest about what it waived. The zero-sentence blocker still binds in every mode.

### The red, before the green

`tools/pods/pod-switchover-readiness.test.cjs` (14 tests). The two known-side cases were run first
against a reconstructed pre-fix predicate — same function, the two pushes removed, no `no_known_text`
in the input. **4 of 14 failed**, headline assertion:

```
FAIL  readinessBlockers — the known side >
      REFUSES a pod with a complete target side and a silent known side
AssertionError: expected [] to not have a length of +0
   expect(blockers).not.toHaveLength(0)
```

and

```
AssertionError: expected [ …(3) ] to deeply equal [ …(5) ]
  ["1 … no target text", "2 … still marked draft", "3 … no target audio",
-  "4 staged sentences have no known text",
-  "5 staged sentences have no known audio"]
```

Scaffold deleted. Against the fix: **23/23 green** with the existing `pod-switchover-inflight.test.cjs`.
Run by path, no full suite.

## The fleet answer

**No course already on `pod-1` would be refused by the fixed gate. All 22 pass, cleanly, 231/231 on
both sides.** That control is now independent of the census that predicted it.

`tools/pods/pod-readiness-fleet-check.cjs` (read-only, re-runnable) imports the same fixed
`readinessBlockers` rather than re-implementing it, and runs it over all 68 courses with a listening
pod and all 129 pods.

| | courses | refused by the fixed gate | on **known-side** blockers |
|---|---|---|---|
| live on `pod-1` | 22 | **0** | **0** |
| live on `pod-0` | 46 | 6 | 6 |

The 6 on `pod-0` that their own live pod would not pass:

| course | n | blockers |
|---|---|---|
| `cym_s_for_eng` | 231 | 104 draft; 231 no target audio; **231 no known audio** |
| `cym_n_for_eng` | 231 | 88 no target audio; **218 no known audio** |
| `ara_sy_for_eng` | 232 | 1 no target text; 108 draft; 107 no target audio; **1 no known text; 1 no known audio** |
| `fin_for_eng` | 232 | 1 no target text; 160 draft; 213 no target audio; **1 no known text; 1 no known audio** |
| `zzz_test_for_eng` | 24 | 9 no target audio; **24 no known audio** |
| `zzz_test2_for_eng` | 10 | 9 no target audio; **10 no known audio** |

These are their *live* pods, so this is a description of the estate, not a blocker on anything — the
gate reads the *staged* pod at promotion time. Two of them are test courses. The other 40 pass.

Note the shape of `ara_sy`, `fin` and the retired `fra_ca` pod: **n=232, with exactly one row blank on
every axis at once** — one empty sentence row apiece, not a known-side problem. Worth a separate look;
`tools/pods/delete-blank-pod-sentence.cjs` already exists for it.

### `ara_sy_for_eng`, the one of the 46 with staged POD 1 content

Its staged pod is `ara_sy_for_eng:pod-1-staged-2026-08-23`, 231 rows. The fixed gate **refuses it**, on
exactly two blockers:

```
108 staged sentences are still marked draft
4 staged sentences have no target audio
```

**Not on the known side** — its known text and known audio are complete on all 231 rows. Census #89's
reading of it holds.

## The structural finding: the per-course gate is NOT sufficient

Tom's rule (2026-09-02): *"we can only move a course to a new POD, if it exists for both that course's
known AND target languages."* My position: **fixing the per-course gate does not make that rule true in
practice, and a separate check is still needed.** Three doors, not one.

The argument the other way is real and worth stating first: for a course `X_for_Y`, a staged pod whose
rows all carry known text, known audio, target text and target audio **is** POD content existing in both
languages for that course — so a per-course content gate at promotion time looks like it enforces the
language rule exactly, at the only moment it can be violated. If `pod-switchover.cjs` were the only
door, I would say sufficient.

It is not the only door.

1. **`tools/pods/promote-pod.cjs` is a second write path onto the live slug, and it has the SAME hole.**
   Its readiness checks are `target_text_draft`, empty `target_text`, and `target_audio_id` — with
   `--allow-drafts`, `--allow-empty-target=N` and `--allow-missing-audio` escape hatches. It never reads
   `known_text` or `known_audio_id`. It also has no `learner_pod_state` guard at all. Fixing only
   `pod-switchover.cjs` leaves this door open.
2. **`tools/pods/clone-pod.cjs` can create a serving pod outright, gated by nothing.** The player
   resolver (`packages/player-vue/src/composables/servedPod.ts`) prefers `pod-1` over `pod-0` by asking
   whether a `listening_pods` row exists with that slug and `pod_type='core'`. **It counts no rows and
   reads no text.** `clone-pod.cjs --to=pod-1` inserts exactly such a row, copying `pod_type` from the
   source, with no guard against the destination being a serving slug. Since clone-pod exists precisely
   so that a destructive align can run *off* the live pod, cloning to `pod-1` and then aligning would
   empty the served pod under live learners. No promotion tool is involved.
3. **The language-level rule is a planning predicate, not just a refusal.** The per-course gate can only
   say no at the end, one course at a time. What Tom's rule buys is knowing *before* a month of
   authoring that POD 1 does not exist for, say, Japanese-as-known — which is what
   `pod1-eligibility-census.cjs` measures and nothing enforces.

**Recommendation, not built:** make `readinessBlockers` the one definition and have `promote-pod.cjs`
import it, and refuse a `clone-pod.cjs` destination that is a serving slug unless a `--serve-now` flag
is passed. Both are small. Neither is in this job's scope.

## Gaps and non-claims

* I did not fix `promote-pod.cjs` or `clone-pod.cjs` — reported, not built, deliberately.
* The grep for pod write paths was deduped by hand against the ~7 parallel worktrees in this estate;
  the counts above are of real files in the two live checkouts, not of worktree copies.
* Nothing was written to the database. No course was migrated, no audio queued, no pod flipped.
