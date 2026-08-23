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

## Naming

Tom calls the Welsh north pod **Pod 1**. In the data it is still on the slug
`pod-0` (`cym_n_for_eng:pod-0`, 231 sentence rows). His name in anything a person
reads; the real slug in code.
