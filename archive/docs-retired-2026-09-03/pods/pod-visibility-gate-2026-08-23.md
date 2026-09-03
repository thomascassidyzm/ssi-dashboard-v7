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

## Naming

Tom calls the Welsh north pod **Pod 1**. In the data it is still on the slug
`pod-0` (`cym_n_for_eng:pod-0`, 231 sentence rows). His name in anything a person
reads; the real slug in code.

## Appended — the Popty half: Tom can now hold and release a pod himself

The RLS half made a hold *possible*. This makes it *doable* — from the pods page,
on a phone, without a psql prompt.

### The control

**Pods list** (`/production/<course>/pods`) — every pod card carries a solid red
**HELD** badge and one line of plain English under it: *Held back — no learner can
reach this pod or any line in it.* LIVE stays quiet; a pod nobody can reach is the
surprising state and the one that must never be missed. The manage card at the top
gains a **Hold back from learners** / **Release to learners** button.

**Pod detail** (`/production/<course>/pods/<slug>`) — the same badge next to the
title, plus a panel that states the current position, the button, and the trail:
who held or released it and when. So *"why is this held?"* has an answer on the
page rather than in a log.

HELD deliberately does **not** reuse the amber DRAFT identity. DRAFT means "not
ready to record"; HELD means "nobody can reach it". They appear on the same card
routinely and they are different facts.

Holding is one tap. **Releasing asks first**, by name:

> Release Welsh Listening Pods — Pod 0 to learners on cym_n_for_eng?
> From the moment you confirm, every learner on this course can hear this pod.
> Only release it if it is finished and you have listened to it.

### The endpoint

`POST /api/admin/pods/:courseCode/:slug/visibility`, behind `requireAdmin` — the
same gate every other admin pod endpoint uses. Release refuses a bare
`{"visibility":"live"}`; the caller must name the pod in `confirm`. A hold costs a
tap to undo and a release cannot be un-seen, so a replayed request or a
copy-pasted curl aimed at the wrong course cannot release a pod it did not
deliberately name. Holding needs no token — erring towards invisible is safe.

The trail is written into `listening_pods.metadata` as `held_at`/`held_by` or
`released_at`/`released_by`, by read-modify-write of the whole jsonb. Both
timestamps are kept forever, so a pod held on Tuesday and released on Thursday
reads as exactly that. `scene_hashes` — pod-sync's diff baseline — and every other
key survive untouched.

### The resolvers

`src/lib/servingPod.js` now excludes held pods **by default and fails closed**: a
row is servable only when it says `visibility === 'live'`, so a caller with a thin
projection gets `null` rather than the pod. Admin listings pass
`{ includeHeld: true }` and see the held pod, badged — both existing callers do,
because they *manage* the pod rather than serve it.

`resolveCurrentPod0()` takes the same option with the **opposite default**: it
includes held pods. Every caller is voice approval or PodLab casting, and both
review content *before* release. Excluding held pods there would mean you could
not approve the voices of the pod you are holding — so the only route to an
approved pod would be to make it live first. That is automatic-live pressure, and
it is the thing the ruling forbids.

### Four more automatic-live paths, closed

The earlier audit covered the two tools that *move* a pod. Four writers that
*create or copy* one were still leaving the column off, so anything they made came
out reachable:

| Writer | Was | Now |
|---|---|---|
| `services/pod-dialogue-generator.cjs` | a generated draft — no audio, no proofread — was live the instant it existed | born **held** |
| `tools/pod-sync.cjs` | syncing a new markdown file created a live pod | born **held** |
| `tools/pods/clone-pod.cjs` | a clone of a held pod came out live | inherits |
| `tools/pods/archive-pod.cjs` | an archive of a held pod came out live | inherits |
| `tools/pods/rehearse-switchover.cjs` | a rehearsal copy was all-live, so it rehearsed the wrong thing | inherits |

The two creation paths set `visibility` **on creation only**. On a re-flex or
re-sync the key is left off the row entirely, so a live pod stays live and a held
pod stays held.

The DB default stays `'live'` for backward safety — that is what kept the 110
existing pods behaving identically. The generator overrides it. Nothing becomes
learner-reachable merely by being created.

### Two write paths, not one

`promote-pod.cjs --release` (landed earlier today) and this endpoint both write
the column. Both are deliberate human acts that stamp the trail, so the ruling
holds — but *"one write path"* is now *"two doors, both locked"*, and that is
worth knowing before a third appears. **Tom's call whether to keep the CLI door.**

### Still open — the one learner-facing path a hold does not close

`ssi-learning-app`'s `api/courses/[code]/bundle.ts` builds the offline bundle with
the service-role key, so RLS does not apply to it. On the checkout here it queries
`listening_pods` with **no `visibility` filter**. Until that filter is deployed, a
held pod can still reach a learner through the offline bundle. Not fixed here —
different repo, and a branch already carries it.
