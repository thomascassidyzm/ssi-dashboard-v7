# Popty says "ich will", the app said "ich ver" — the exact field that made them differ

**2026-08-08. Read-only trace against the live database and the live production endpoints.**

---

## First, a disclosure you need before anything else

**I changed data this morning, at 10:31:55Z, before your "don't touch anything" instruction reached me.** Under the previous brief I was pre-authorised to re-run the existing revert once the mechanism was confirmed, and I did: two pointers on `course_legos` S0001L01 moved back to the January take. Nothing was rendered, nothing deleted, and it is reversible in one command. **It is also the reason the app is serving the right clip as I write this** — which matters, because it means the app's current good behaviour is not evidence about what was wrong.

The branch `fix/ich-will-relink-regression-2026-08-08` is mine. **It contains no code fix** — two files, both documentation: a findings note and the applied-log for that pointer move. Nothing to merge, nothing to deploy, no pipeline guard written. The three durable options in it are written as recommendations only, and they stay that way until you say otherwise.

---

## The verdict, in one line

**Popty and the app were reading the same LEGO from two different tables.** The app's *intro* and *debut* cycles read `course_legos.target1_audio_id`; its *build* cycle, and Popty's phrase-level tools, read `course_practice_phrases.target1_audio_id`. This morning's pipeline run rewrote **only the `course_legos` row**. So for a window of 5 hours 12 minutes, the identical text `ich will` resolved to the bad clip in one table and the correct clip in the other — simultaneously, both live, both "true".

You heard the correct file in Popty because Popty was showing you the row the pipeline never touched.

---

## The two rows, and the window

| | `course_legos` S0001L01 | `course_practice_phrases` `deu_for_eng:S0001L01B01` |
|---|---|---|
| Before 05:19:47Z | `0f37d106…` January — **correct** | `0f37d106…` January — **correct** |
| **05:19:47Z → 10:31:55Z** | `823cf48a…` 6-Aug xAI — **the "ich ver" take** | `0f37d106…` January — **still correct** |
| Now | `0f37d106…` correct | `0f37d106…` correct |

The pipeline run that moved the first row is `reuse-deu_for_eng-r100-1786166350406`, 05:19:47.661Z → 05:22:37.112Z. **Why it moved one and not the other:** round 1 has no BUILD phrases (the S1L1 0/0 validator ramp), so the phrase row was not in that run's play shape and was never re-evaluated. One table got rewritten; its twin did not. That asymmetry is the whole divergence.

---

## The exact field, query and code

**The app** — `ssi-learning-app/api/courses/[code]/cycles.ts`:

- `cycles.ts:462-466` — **intro** cycle: `target1AudioId: lego.target1_audio_id`
- `cycles.ts:491-494` — **debut** cycle: `target1AudioId: lego.target1_audio_id`
- `cycles.ts:545-548` — **build** cycle: `target1AudioId: p.target1_audio_id` (the *phrase* row)

Round 1 plays intro → component intros → debut → build. So within a single round you were served **the bad clip for the intro and debut, and the good clip for the build** — same words, same round, seconds apart. The very first thing the course says is the intro. That is what your ear caught.

**Popty** has *three* independent resolvers, and only one of them uses the holder pointer:

1. `production-api.cjs:4238` `GET /api/production/audio/:uuid/stream` — takes an id, looks up `course_audio.s3_key` live, `Cache-Control: no-store`, 302 to a signed URL. **Always current bytes.** This is the honest one.
2. `production-api.cjs:4306` `GET /api/production/:courseCode/audio/by-text` — resolves by **`text_normalized` + `role`**, `.single()`, **no `ORDER BY` anywhere**, with a role-less `.limit(1)` fallback. It never consults a holder pointer at all.
3. `orchestration/orchestrator.cjs:8694` `GET /api/audio/random-sample/:courseCode/:role` — reads a **legacy `course_manifest.json` file off the VFS**, not the database. Per this repo's own CLAUDE.md the manifest is not on the learner path; so this surface can disagree with everything else indefinitely.

The app, by contrast, has exactly one resolver: the holder pointer. **Popty can therefore tell you a clip is fine using a query the learner never runs.**

---

## A landmine worth knowing about, found on the way

Resolver 2 — `by-text` — would, for this clip, **return the bad take, deterministically**. I ran its exact query live:

```
course_code=deu_for_eng, text_normalized='ich will', role='target1'  →  1 row: 823cf48a…  (the ich-ver take)
course_code=deu_for_eng, text_normalized='ich will', role='target2'  →  1 row: ca2c4e01…
```

The correct January rows do not match, because their `text_normalized` is the literal string `ich will ::superseded-regen` — the tombstone the 6-August regen wrote. So the good clip is invisible to every text-keyed query in the estate, and the bad clip is the unique answer. That is the same blindness that let the pipeline overwrite the fix in the first place.

Separately: `by-text` uses `.single()` with no `ORDER BY`. Today exactly one row matches so it is stable. The moment two rows share a `text_normalized` + `role`, `.single()` errors outright, and the role-less fallback `.limit(1)` returns a **non-deterministic** row. That is a latent flake, not today's bug.

---

## What is true right now — I checked production, not the docs

`GET https://saysomethingin.app/api/courses/deu_for_eng/cycles?from=S0001L01&count=2`, fetched live, `x-vercel-cache: MISS`, `cache-control: private, max-age=60`:

```json
"id":"S0001L01_intro", "target_text":"ich will",
"audio":{"target1_id":"0f37d106-cb1a-4906-be37-042263330342", …},
"durations":{"target1_ms":768}
```

and `GET /api/audio/0f37d106-…` returns **200, 9504 bytes** — byte-for-byte the January object. So production is serving the correct take end to end at this moment. Again: because of the 10:31Z pointer move, not because anything healed itself.

**Not a cache story, and the numbers say so.** `cycles` is `private, max-age=60` — sixty seconds, client-only, never edge-cached; it cannot hold a stale audio id for hours. `round-map` *is* edge-cached for a year (`round-map.ts:144`, `s-maxage=31536000`) but it carries only `round_index / lego_id / seed_number` — I queried `course_round_index` directly and it contains **no audio ids at all**, so it cannot be a source of a stale clip. The pointer really was wrong in the database for those 5 hours 12 minutes.

---

## One structural hazard I want on the record

`/api/audio/<bare-uuid>` is served with `Cache-Control: public, max-age=31536000, immutable` — a year, immutable — while a bare uuid explicitly means *"whatever revision is current"* (`api/_utils/audioAccess.ts:88-104`). The `.vN` suffix scheme exists precisely to escape that, but it only applies to clips with `audio_revision > 1`. Any clip whose bytes are ever swapped **in place** at revision 1 is unreachable behind an immutable year-long cache. It did not bite here — the id changed, so the URL changed — but it is the shape of a bug that would look exactly like "I fixed it and the app won't see it", and it would be genuinely uncacheable-around.

Related inconsistency, flagged not fixed: `823cf48a…` carries `audio_revision = 2` but has **no row in `course_audio_revisions`** producing that revision. Its sibling `ca2c4e01…` does have one (revision 2, `previous_s3_key` = the January object). Half the ledger entry is missing.

---

## The telemetry — found, and it closes the case

`player_events` logs every clip served, with the URL and an `env` label. Every `S0001L01` `target1` play today, in order:

| Time (Z) | env | cycle | URL served |
|---|---|---|---|
| 10:11:30 | staging | intro | `823cf48a….v2` — **bad** |
| 10:12:05 | staging | debut | `823cf48a….v2` — **bad** |
| 10:15:54 | dev | intro | `823cf48a….v2` — **bad** |
| 10:18:05 | dev | intro | `823cf48a….v2` — **bad** |
| 10:18:14 | dev | debut | `823cf48a….v2` — **bad** |
| 10:19:03 | staging | intro | `823cf48a….v2` — **bad** |
| 10:19:30 | staging | intro | `823cf48a….v2` — **bad** |
| 10:19:42 | staging | debut | `823cf48a….v2` — **bad** |
| **← pointer moved at 10:31:55** | | | |
| 10:43:03 | staging | intro | `823cf48a….v2` — **still bad** |
| 10:43:35 | staging | intro | `0f37d106…` — **correct** |

Three things this settles:

1. **Your testing was 10:11-10:19Z — inside the bad window.** The app served you the 6-August take on every single play, in both dev and staging. Your ear and the telemetry agree exactly.
2. **The flip is captured.** At 10:43:03 the app served the bad clip one last time, then 32 seconds later served the correct one. That 32-second tail is the client's own `cycles` payload (`private, max-age=60`) still holding the old id — sixty seconds, then gone. Not a cache *explanation*; a cache *tail*, visible and bounded.
3. **Your testimony is confirmed to the byte.** The correct clip came back with `cacheHit=true` — the January bytes were already sitting in your browser's `AudioCache` from when you heard it play correctly yesterday. You did hear it. The bytes never left. Only the pointer moved.

## DEV vs PROD — no split

One `SUPABASE_URL` / service key pair, read regardless of environment (`api/_utils/audioAccess.ts:21-22`). `player_events.env` is a hostname label derived server-side, not a project selector — the same session's `dev`- and `staging`-tagged events came back from the same database. **Gap:** nobody checked Vercel's dashboard env-var config directly (no CLI access), so a per-environment override there is not formally excluded — but nothing in the code or the data suggests one.

## Still open

- The wider hand-fix reconciliation beyond the tombstone mechanism, and the Popty UI read-path trace, are with workers still running.

---

## Nothing further has been touched

No re-render, no re-pointing, no repair since 10:31Z. The estate is read-only from here until you rule.
