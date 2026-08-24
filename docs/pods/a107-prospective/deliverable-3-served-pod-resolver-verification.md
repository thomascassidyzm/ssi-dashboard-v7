# Deliverable 3 — servedPod resolver verification (ssi-learning-app)

*2026-08-23. Part 3 of job #137. Verified from CODE, not docs, against `origin/main` of
ssi-learning-app (repo at `/home/tomcassidy/SSi/ssi-learning-app`) — the working checkout there is
on branch `security/audit-2026-08-22` with local uncommitted edits and is behind `origin/main`, so
all reads below are `git show origin/main:<path>` / a scratch worktree, never the dirty checkout
(per `working-checkout-can-be-branch-stale` memory).*

## The resolver

`packages/player-vue/src/composables/servedPod.ts` is the one place the serving slug is decided.
Confirmed by reading it directly:

- `SERVING_POD_SLUGS = ['pod-1', 'pod-0']` — **pod-1 is preferred, in that order.** The resolver
  queries `listening_pods` for `course_code` + `pod_type='core'` restricted to exactly these two
  slugs, and returns the first one found scanning in this order — so if a course has both a
  `pod-1` and a `pod-0` row, `pod-1` wins.
- Anything else — no rows, a query error, a network timeout, an unknown course — degrades to
  `pod-0` (`FALLBACK_POD_SLUG`), never to "no pods" and never to any parked slug
  (`pod-0-unrecorded`, `pod-0-gated-*`, `*-retired-*`). A parked slug is structurally excluded: the
  query's `.in('slug', SERVING_POD_SLUGS)` filter means a row on any other slug is invisible to it,
  full stop — not a behavioural promise, a query constraint.
- Offline: the answer comes from the downloaded snapshot's own recorded `podSlug`, itself re-run
  through the same `pod-1`/`pod-0` allowlist before being trusted, so a stale/corrupt offline cache
  can degrade but can never smuggle in a parked slug either.

**Conclusion: promoting a staged pod onto slug `pod-1` (which is what `pod-switchover.cjs
--promote-to=pod-1` does for the Group 1 cutover) is genuinely what a learner then sees** — the
resolver actively prefers `pod-1` over `pod-0` the moment a `pod-1` row exists, on every one of the
five real call sites (below), with no separate flag or config to flip.

## The five call sites — confirmed, all route through the resolver

```
git grep -n "resolveServedPod" origin/main -- '*.ts' '*.vue'
```

found exactly these five real callers (plus the resolver's own file and its tests):

| # | file | what it does with it |
|---|---|---|
| 1 | `packages/player-vue/src/composables/listeningMetaCache.ts:281` | builds the offline metadata snapshot from `podId`/`slug` |
| 2 | `packages/player-vue/src/composables/useListeningPods.ts:167` | fetches every sentence for the course's pod, by `podId` |
| 3 | `packages/player-vue/src/composables/usePodLapScheduler.ts:504` | the spaced-repetition lap scheduler's pod queries |
| 4 | `packages/player-vue/src/composables/usePodStage0.ts:98` | stage-0 (debut) pod content |
| 5 | `packages/player-vue/src/providers/generateLearningScript.ts:522` | the full-course script generator |

This matches the "five player read paths used to hardcode `:pod-0`" framing exactly — all five now
import `resolveServedPod` from the one module rather than building `${course}:pod-0` themselves.

## No remaining hardcoded `pod-0`

`git grep -n "pod-0"` across all `.ts`/`.vue` in `origin/main` returns only: comments/doc-strings
explaining the history (e.g. "hrv serves pod-1 while ~68 older courses serve pod-0"), and the
resolver's own two intentional constants (`SERVING_POD_SLUGS`, `FALLBACK_POD_SLUG`). **Nothing
builds a pod id or slug string literal outside `servedPod.ts` itself.** `ListeningOverlay.vue`
mentions `pod-0` twice, both in comments, and does not construct any pod id or call any pod query
directly — it consumes data already resolved upstream by one of the five call sites above.

## Live-tested, not just read

Ran the resolver's own test suite live against `origin/main` (`c418bbf3`) in a scratch worktree
(`$CS_SCRATCH/ssi-learning-app-main-check`, symlinked to the main checkout's existing
`node_modules` rather than reinstalling, removed after the run):

```
npx vitest run src/composables/servedPod.test.ts
 ✓ src/composables/servedPod.test.ts (12 tests) 27ms
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Notably passing: `prefers pod-1 when the course has one (hrv, the first 1-based course)`,
`falls back to pod-0 for the ~68 courses that only have pod-0`, `still reads "no pods" for a
course whose only pod is parked on pod-0-unrecorded`, `ignores every non-serving slug: parked
cores, retired pods, choice pods`, `memoises: five call sites, one round-trip`. All 12 green on
the actual current `origin/main` code — not a stale doc's claim about it.

## Verdict for Deliverable 3

**Confirmed from code and from a live test run, not from documentation**: the resolver correctly
and exclusively decides the serving slug for all five real learner-facing read paths, prefers
`pod-1` whenever one exists, never surfaces a parked slug, and degrades safely to today's `pod-0`
behaviour on any failure. No file was found still hardcoding the old slug. This part of the pipeline
is sound for the Group 1 cutover (promoting onto `pod-1`) and, by the same mechanism, for the
Group 2 flip in this audit's scope (promoting onto `pod-0`, which is already the preferred-fallback
slug and requires no resolver change at all).
