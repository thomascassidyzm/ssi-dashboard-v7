# Pods can now be held back from learners — Welsh north is the first one held

**2026-08-23.** Welsh north Pod 1 is held. A learner opening that course gets no
Dialogues at all, and Catrin's three noise takes — the ones with the sheep — are
no longer reachable by anybody.

---

## Tom's ruling

> "Can we not make PODS live in certain courses? It would be good to be able to
> keep them back in a human course until, after all until they exist!!!"
> — 2026-08-23 16:32Z

A pod still being recorded by a human must be unreachable by learners until it is
finished **and a human has decided to release it**.

## What was wrong before

There was no flag. A pod was live the instant its row and its sentences existed,
so the four takes Catrin recorded today went straight to learners — one good, and
three that are 45-90 seconds of background noise.

The only hold anyone had ever managed was done by hand on 2026-08-06: pod
`cym_n_for_eng:pod-0-gated-2026-08-06`, whose own note reads *"Empty on purpose.
Learner paths query this exact id, so keeping it childless is what holds the pod
off live."* Holding a pod meant moving its content out of it. That is now a flag.

## What it is

One column on `listening_pods`: `visibility`, either `live` or `held`, defaulting
to `live` so all 110 existing pods carry on exactly as they were.

**Held means invisible.** Not a greyed tab, not an empty pod, not "coming soon" —
the learner's app is never told the pod exists.

**Going live is a human act.** Nothing may flip a pod to live because it looks
finished. Completeness is a precondition for release, never a trigger for it.

## Where it is enforced, and why there

The learner app reads Supabase **directly** with the anon key. Six client paths
resolve pod content and every one of them queries the literal id `<course>:pod-0`
— there is no shared resolver to patch and no way to make a client change bite
without a Vercel deploy.

So the gate is in the database itself: the two `public_read` RLS policies now
require `visibility = 'live'`, on the pod row and on its sentences. A held pod
stops existing for anon and authenticated readers, so the client's exact-id query
comes back empty — which is the very same state the 2026-08-06 hand-hold created,
and which `packages/player-vue/e2e/empty-pod-hidden-probe.mjs` already proves
hides the Dialogues tab.

It therefore bit the moment the SQL ran: no deploy, no pod ids moved, every client
already in the field covered including cached ones.

Service-role readers bypass RLS by design, so Popty and everything in `tools/`
keep seeing held pods — admin surfaces must.

## The one path a hold does not close yet

`ssi-learning-app`'s `api/courses/[code]/bundle.ts` builds the offline bundle with
`SUPABASE_SERVICE_ROLE_KEY`, so RLS does not apply to it. It reads
`listening_pods` and `listening_pod_sentences` and would still put a held pod's
content into a downloaded bundle. That route needs its own explicit
`visibility = 'live'` filter. The fix is on a learning-app branch and **is not
deployed** — it is learner-facing, so deploying it is Tom's call.

## Verification (real anon key, not the service key)

| read | before | held | released again |
|---|---|---|---|
| `cym_n_for_eng` pod rows | 2 | **1** | 2 |
| `cym_n_for_eng:pod-0` sentences | 231 | **0** | 231 |
| `spa_for_eng` pod rows / `pod-1` sentences | 4 / 231 | 4 / 231 | 4 / 231 |
| `fra_for_eng` pod rows / `pod-1` sentences | 2 / 231 | 2 / 231 | 2 / 231 |

The round trip restores exactly, so a release is as cheap and as complete as a
hold. Estate tally after: **1 held, 109 live.**

Policy cost, measured as the `anon` role on the largest pod (749 sentences): the
planner hashes the visibility check once rather than per row — 1.4 ms.

## Learner progress

**Three real human learners** have live state on Welsh north pod-0 — 65
`learner_pod_state` rows, 1,290 exposures, most recent today (counted by
`services/shared/learner-counts.cjs`, the honest counter). Holding the pod takes
Dialogues away from those three people until it is released. Tom's ruling is
unambiguous, so it is held; this is what it costs.

Their progress is **untouched**. A hold is a visibility change, not a content
change: no sentence text, slot or `pod_id` moved, so the standing content-change
migration protocol (`docs/pods/pod-migration-protocol.md`, plate A-111) does not
fire and every row stays filed exactly where it is. When the pod is released those
three pick up where they left off.

## The empty gated pod

`cym_n_for_eng:pod-0-gated-2026-08-06` still exists, still empty, still `live`.
It is harmless — the client queries the exact id `:pod-0` and a childless pod
yields nothing — and it has been in that state since 2026-08-06. Left alone
deliberately: one ruling, one hold.

## Rollback

`database/changes/20260823_listening_pod_visibility.ROLLBACK.sql`. Note that it
makes every held pod live again the instant it runs — including this one and its
unfinished takes. Restoring the two policies alone is enough if that is all you
want.

## Appended — the release tool did not know the flag existed

An audit of every code path that writes a pod row (job #113) found the gap that
mattered most, and it was in the release path rather than anywhere exotic.

`promote-pod.cjs` and `pod-switchover.cjs` both rename a pod onto the live slug
by inserting a new header row with a hand-written column list and deleting the
old one. A column left off that list does not survive the move — the new row
takes the table default, `live`. So a pod held back mid-recording would have come
out of a promotion **live**, and nothing in the tool's output, blockers or dry-run
summary would have mentioned visibility at all.

`promote-pod.cjs` is the sharp end: its own docstring gives `cym_n_for_eng` as the
worked example, so it is the command someone will actually run to release the
Welsh north pod. Passing its fitness checks and typing `--apply` was functionally
"go live" — completeness triggering release, the exact pattern the ruling forbids.

Both now carry the source pod's visibility forward, so **moving content is never a
release**. `promote-pod` gains `--release` as the deliberate act that makes a pod
live, stamping `released_at` and `released_by`; its dry run now always says in
words what a learner will be able to see:

```
"visibility": "HELD — inherited from zzz_vis_probe:pod-0-unrecorded.
               Learners will NOT see this pod. Pass --release to make it live,
               or release it from the Popty pods page."
```

Verified end to end on a throwaway course: a held pod promoted with `--apply`
stayed held (it landed live before the change); the same pod with `--release`
came out live and stamped; the switchover insert carried `held` across a move.
Scratch rows deleted afterwards; `cym_n_for_eng:pod-0` untouched and still held
throughout.

The audit also proved the safe half empirically rather than by reasoning: a
supabase-js `.upsert()` that omits `visibility` compiles to `ON CONFLICT DO UPDATE
SET <only the payload's columns>`, so `pod-dialogue-generator.cjs` and
`pod-sync.cjs` leave a held row held. Of the 16 write sites on `origin/main`,
none can un-hold a pod in the background; the two fixed above were the only ones
that could do it as a side effect of a human action.

## Appended — 42 pods nobody serves are marked live

Closing out the learner-app half turned up a measurement worth keeping. Counting
every `core` pod that is **not** the one its course serves, and is nevertheless
`visibility='live'`:

| slug | pods | courses | sentences |
|---|---|---|---|
| `pod-0-unrecorded` | 21 | 21 | **4,871** |
| `pod-0-retired-2026-08-22` | 16 | 16 | 2,272 |
| `pod-0-gated-2026-08-06` | 2 | 2 | 0 |
| `pod-1-retired-2026-08-22` | 1 | 1 | 180 |
| `music` (spa) | 1 | 1 | 749 |
| `travel-situations` (spa) | 1 | 1 | 72 |
| **total** | **42** | **39 courses** | |

Counted independently against the live DB and agreeing exactly with the
learner-app job's own figure of 42 across 39.

**The client is not affected** — `servedPod.ts` only ever reads `pod-1`/`pod-0`,
so none of these reach a learner through the app. The exposure is the bundle
route, which filtered on `course_code` alone and therefore multi-matched every
one of them into the offline bundle.

The interesting row is `pod-0-unrecorded`: **21 courses, 4,871 sentences** of
content that is by its own slug not recorded yet. That is precisely the
not-ready-for-learners case this gate was built for, sitting marked live.

Two of the 42 are **legitimate pods that must stay live** — Spanish `music` and
`travel-situations` are real content, not archives. The other 40 are working
copies and archives. Flipping those 40 to `held` would close the multi-match
leak with no code at all, which is why the bundle route's own bug is not being
chased with a code fix: the pods are not distinguishable by any column
(`pod_order` is NULL on all 110), so any id-pattern filter would be guesswork,
whereas the visibility column already says exactly the right thing.

Not done. One ruling, one hold — this is Tom's call, and it is logged here rather
than acted on.

## Naming

Tom calls the Welsh north pod **Pod 1**. In the data it is still on the slug
`pod-0` (`cym_n_for_eng:pod-0`, 231 sentence rows). His name in anything a person
reads; the real slug in code.
