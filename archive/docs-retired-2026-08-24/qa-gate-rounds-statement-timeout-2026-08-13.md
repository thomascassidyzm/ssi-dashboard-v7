# The qa-gate rounds endpoint never fit its timeout — and the timeout is 8 seconds, not 2 minutes

**2026-08-13 · eus_for_eng · both endpoints now answer 200**

## The one thing worth knowing

The statement timeout that matters is **8 seconds**, not the 2 minutes a psql session reports.

PostgREST connects as `authenticator`, which carries `statement_timeout=8s`. `service_role` — what
every dashboard query runs as — has no `rolconfig` of its own, so it inherits that 8s and never
overrides it. Anyone measuring a slow dashboard query in psql sees a 2-minute ceiling and concludes
there is room. There is not.

Against the real budget, the shipped `course_qa_round_status` view measured **17.7 seconds warm on
eus_for_eng — the smallest course in play**. The endpoint could never have returned. This was not
yesterday's gloss and decomposition writes tipping something over an edge; it was born over budget
and stayed there until someone asked for 500 rounds at once.

## What was actually wrong

`course_qa_round_status` re-derived `course_qa_cycle_clips` inside **two LATERAL subqueries,
evaluated once per round**.

`course_qa_cycle_clips` contains a `ROW_NUMBER()` window over `course_practice_phrases`, partitioned
by `(course_code, seed_number, lego_index)`. The lateral filtered on `lego_id` — a predicate Postgres
can only apply *after* the window has run. So each of the 500 laterals sorted and numbered all 5,683
phrase rows of the course. Twice: once for the cycle rollup, once for the clip rollup.

O(rounds × course_phrases). 2.9 million shared buffer hits for one page load.

## The fix

Aggregate the rollup **once per lego and join it**, rather than re-deriving it per round.
`course_code` is a grouping key, so the planner pushes the course predicate into the aggregate —
confirmed in EXPLAIN, which folds it to a constant and leaves `Group Key: cys.lego_id`. The cycle
rollup and the clip rollup now share a single pass.

That left one hot spot: an index scan on `course_audio_pkey` with **52,133 loops**, doing a random
heap fetch per clip into a 1.5GB table — 5,474ms of the remaining 9,158ms on a cold cache, and a
cold cache is exactly what a producer opening the gate page gets. Only two columns are ever read
there (`id`, `audio_revision`), so a covering index makes it an index-only scan for 99MB.

The index-only scan still charged 21,489 heap fetches until `course_audio` was vacuumed —
**yesterday's bulk writes had left the visibility map stale, which is the grain of truth in the
"table growth" theory.** It was not growth. It was an unvacuumed visibility map on top of a query
shape that never fit.

**No timeout was raised.** The query shape was the bug.

## Numbers

| | before | after |
|---|---|---|
| eus_for_eng, warm | 17,670ms | 331ms |
| fra_for_eng, cold | 9,158ms | 729ms |
| All 145 courses at `statement_timeout=8s` | 1 timeout, 27 courses over 4s | **0 timeouts**, slowest 3,255ms, median 385ms |

## Why the sign-offs are safe

The round fingerprint is what every human play-through sign-off is recorded against. If it changed,
every sign-off on record would silently go stale.

It is **byte-identical by construction, not merely equivalent**: the original ordered every clip in
the round by `(cycle_type, cycle_ordinal, audio_role, audio_id)`; the rewrite builds a per-cycle
fragment ordered by `(audio_role, audio_id)` and concatenates fragments ordered by
`(cycle_type, cycle_ordinal)`. Same lexicographic order, same separator, same md5.

Verified rather than argued: full-column `EXCEPT` in **both** directions over eus_for_eng,
fra_for_eng, spa_for_eng and cym_n_for_eng — **4,214 rounds, zero rows differing either way**.

For what it is worth, there are currently **zero** sign-off and flag rows anywhere in the estate, so
nothing could have been damaged regardless. The gate has not been used in anger yet.

## Verified live

Through the real API with a real admin JWT:

- `/api/qa-gate/eus_for_eng/rounds?from=1&limit=500&all=false` → **200**, 500 rounds,
  `requiredRounds=20`, `gateStatus=unpassed`, fingerprints present on 500/500.
- `/api/qa-gate/fra_for_eng/...` → **200**, 500 rounds, `requiredRounds=100`.
- `/api/production/eus_for_eng/audio-stats?fresh=1` → **200** in 3.3s,
  `total=28093 existing=28091 missing=2 toGenerate=2`.

### Explicit gap: not verified through popty.ngrok.app

I could not complete the verification from that URL. **The tunnel is offline** — it now returns
ngrok's own 404 page, consistently, on every retry. It was alive earlier in this session (it answered
`401 Authentication required` in ~0.15s), so it dropped mid-session.

There is **no ngrok agent running on watson-1** (nothing on 4040/4041/4042), which means
popty.ngrok.app was never tunnelled from this machine — it fronts one of your Macs, and that machine
has gone away. The verification above is against the watson-1 backend directly.

**This does not weaken the fix.** The change is a view and an index in Supabase, shared by every
backend. Whichever machine serves popty.ngrok.app gets it the moment its tunnel comes back, with no
deploy and no restart.

## audio-stats: I could not reproduce the 500

Every call returns 200 — repeatedly, with and without `fresh=1`, with and without a JWT.

`fresh=1` does **not** trigger a full `course_audio` scan. It only busts a 5-second in-memory cache.
The endpoint's own Supabase queries are trivial (two count-heads and a `limit 1`); all the real work
is delegated to **phase 8's `/needs` on port 3465**, which is a documented *hard* dependency — if
3465 is unreachable, audio-stats 500s. That is the known failure mode and it caused the 2026-08-04
outage.

`/needs` is slow — 5.2s for eus_for_eng, 14.6s for hak_for_eng — but I probed it across the seven
largest courses and it returned 200 every time, so it is slow rather than broken.

On watson-1 phase 8 has been up since 03:50 UTC today with **0 restarts**, so it was not down here at
06:25Z. Combined with the tunnel finding, my read is that your request went to the Mac behind
popty.ngrok.app, and phase 8 on *that* machine was down or restarting — the same machine whose tunnel
has since dropped entirely.

**I am not claiming this is fixed.** It is not reproducible from here, and I would rather say so than
tidy it away. If it recurs, the error body will name the cause outright — the code was deliberately
changed to say "phase 8 audio service (localhost:3465) is unreachable" instead of the empty
`{"error":""}` it used to give.

## The other tunnel, ssi-machine.ngrok.app

Popty's API auth is a **stateless Supabase JWT** (`supabase.auth.getUser(token)`, then a
`learners.platform_role` / `dashboard_users` lookup). There is no in-process session store to share,
so "does that tunnel share the session store" resolves to: any backend pointed at the same Supabase
project accepts the same token, and a clean 401 on *every* endpoint therefore means no valid
`Authorization` header is reaching the app — not a session mismatch. A stale deployment would still
accept a good JWT. I have a worker (**#424**) confirming what that hostname actually forwards to; I
could not close it from watson-1 because no ngrok agent runs here, so the tunnel config lives on the
Mac.

## One incidental finding

Exactly **one** clip in the whole estate is cross-course: `bre_for_fra` round `S0089L03`, debut,
known role, points at a `course_audio` row owned by `zho_for_jpn` — text `短.` A Breton course
teaching a French known-side is serving a Chinese clip.

I found it because it blocked a tempting shortcut: adding `course_code` to the clip join would have
made the query faster still, and would have silently dropped that clip and changed the round's
fingerprint. So I left the join alone. Worth a look on its own merits — it is a real defect, just not
this one.
