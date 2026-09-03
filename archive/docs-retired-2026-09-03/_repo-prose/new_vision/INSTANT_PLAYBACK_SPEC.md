# Instant Playback Spec

## The goal

Time-to-first-play is the single delight metric for the learning app — like Spotify, where pressing play feels immediate even though metadata, recommendations and assets are still loading in the background. Today our cold start pulls the full course graph (`course_legos`, `course_practice_phrases`, `course_audio` joined for hundreds of LEGOs) before the first cycle can render, which times out on weak connections and is the proximate cause of the "the app went down" reports.

This spec rebuilds the cold path so that pressing play depends on the smallest possible amount of data, and uses the natural idle time during playback as the window for everything else.

## Hard-gate narrative

- **Better** — first-play latency drops to one indexed query + one audio fetch (~hundreds of ms on a decent connection, vs the current multi-second mega-load). Resilient to mid-session connection drops because the next ~30 seconds of audio is always already on the device. Listening exercises work offline once cached.
- **Simpler** — one critical-path endpoint to maintain instead of the upfront whole-course assembly in `generateLearningScript.ts`. Audio caching gets a clean split: static (cache once, replay many) vs dynamic (fetch per cycle). Position storage stays anchored on `lego_id` (already the SSoT per existing memory rule); the round number becomes a derived index.
- **Cheaper** — the 39%-of-DB-time `course_practice_phrases` mega-query goes away. Per-round queries are tiny, indexed, and cache-friendly. Listening audio downloaded once per course instead of re-fetched per round.

## The critical path

These are the **only** things needed before the first audio byte plays:

| Step | Source | Size | Cacheable? |
|---|---|---|---|
| 1. Course metadata | DB `courses` row | ~1 KB | yes — indefinitely per course version |
| 2. User position | DB `learner_progress` row (single indexed lookup) | ~0.1 KB | session-scoped only |
| 3. R → LEGO map | DB `course_round_index` (or materialised view) | ~20 KB for ~700-LEGO course | yes — indefinitely per course version |
| 4. First cycle data | DB `course_legos` + `course_audio` (one lego, one cycle) | ~1 KB metadata + one audio file (~30 KB) | service-worker cached after first play |

Total: ~50 KB on cold start, dominated by the first audio file. Everything else streams in *during* playback.

## Prefetch tiers (what happens after play starts)

A LEGO intro + debut cycle is ~30–50 seconds of audio. That's the prefetch window for what comes next:

- **Tier 1 (within 5 seconds of play)**: cycles 2–N of the current round (~10–15 small queries to `course_legos` + `course_audio`, joined by `lego_id`). Player now has the full round queued.
- **Tier 2 (within 30 seconds)**: the listening audio for the seeds + pods that will fire at end of round. These are the big files — ~50 KB to several hundred KB each — but they're not needed for ~5 minutes, so we have the whole round to download them.
- **Tier 3 (round ≥ ½ complete)**: cycles for round N+1, listening audio for round N+1's seeds. By the time the user finishes round N, round N+1 is already entirely local.
- **Tier 4 (idle)**: continue trickling course-wide listening audio into the cache so the rest of the course works increasingly offline. Per the existing PWA caching math (~4.8 MB / 30-min session, Safari 1 GB limit = 200× headroom), the full listening set for a 260-seed course fits comfortably.

The principle: playback is the loading mask. Every fetch happens during audio the user is already listening to.

## The R → LEGO map

A new table `course_round_index`:

```sql
CREATE TABLE course_round_index (
  course_code text NOT NULL,
  round_index integer NOT NULL,
  lego_id text NOT NULL,
  PRIMARY KEY (course_code, round_index),
  UNIQUE (course_code, lego_id)
);
CREATE INDEX idx_course_round_index_course ON course_round_index (course_code);
```

Derived from `course_legos` ordered by `seed_number, lego_index` and filtered to `is_new = true`. Populated by the course-builder pipeline when a LEGO is added/edited/deleted (the natural hook is wherever `is_new` gets toggled). The pipeline already knows when LEGOs change — adding the round-index rebuild is one extra step in that same path.

Alternative: a `MATERIALIZED VIEW` refreshed on demand. Cleaner because there's no maintenance code, but `REFRESH MATERIALIZED VIEW` on a 700-row computation is fast enough either way. Either works; I'd start with the materialised view for simplicity and switch to a table if we ever want triggers on changes.

Endpoint: `GET /api/courses/:code/round-map` returns `{version, rounds: [{r: 1, legoId: 'S0001L01'}, ...]}`. Cached `s-maxage=31536000, immutable` on the version-stamped URL — clients fetch once per course version, never again.

Position translation:
- "Where is the user?" → store `last_completed_lego_id` (already the case per existing memory rule).
- "What round is that?" → reverse lookup in the map: `rounds.find(r => r.legoId === userLegoId)`.
- "What's the next round?" → `round_index + 1` lookup.
- Spaced-rep math (N-1, N-2, etc.) runs on the round index, all client-side, against the cached map.

## The cycle endpoint

Replaces the upfront whole-course assembly. One endpoint, paginated:

```
GET /api/courses/:code/cycles?from=:legoId&limit=:n
```

Returns the next `n` cycles starting from `legoId`, in script order (intro → debut → BUILDs → spaced_reps → use → listening hook). Each cycle is fully assembled — known text, target text, components (with their pre-computed decomposition per the phrase-decomposition spec), audio IDs for known/target1/target2/presentation, durations.

The player calls this with `limit=1` on Start for instant first cycle, then `limit=15` (rest of the round) once audio is playing.

This is also the right point to pull in the precomputed phrase decomposition (`course_practice_phrases.decomposition`) so the runtime alignment fallback becomes purely defensive.

## Audio caching split

Two distinct caching strategies based on access pattern:

| Asset type | Strategy | Why |
|---|---|---|
| LEGO short clips (known, target1, target2, presentation) | Lazy fetch via existing `/api/audio/[audioId]` proxy + service worker `CacheFirst` | Each clip is small, played a handful of times per session, naturally rolls out of the spaced-rep window |
| Seed sentences (L1 / L2 listening) | Eager background prefetch into IndexedDB, pinned for the course | Same file replays across stages (L1 slowed, L2 natural, L3 etc.). Caching once amortises across many round-end visits |
| Pod sentences (Layer 2 listening) | Same as seed sentences | Same replay pattern; eager-cache once |

The proxy logic at `/api/audio/[audioId]` is unchanged — only the *callers* and *when* change.

## What gets deleted / simplified

- The upfront whole-course query path in `packages/player-vue/src/providers/generateLearningScript.ts` becomes the per-cycle endpoint's backend instead. We stop generating a whole script in the browser.
- `PriorityRoundLoader` becomes simpler — it's no longer racing to assemble rounds from a half-loaded script; it's prefetching the next round's cycles via the new endpoint while the current round plays.
- `useScriptCache` becomes per-round, not per-course. Smaller cache entries, easier invalidation when a LEGO edit lands.
- The `_componentsByLegoId` map population in `LearningPlayer.vue` is no longer needed — components arrive on each cycle's payload directly.

## Migration plan

1. **Schema** — add `course_round_index` (or materialised view). Add `decomposition` column to `course_practice_phrases` per the phrase-decomposition spec. Both deployable independently of any code change.
2. **Dashboard pipeline** — wire course-builder edits to rebuild the round index + recompute decompositions for affected phrases. Validator endpoint that flags drift.
3. **Backend** — implement `GET /api/courses/:code/round-map` and `GET /api/courses/:code/cycles` in the learning-app's API layer. Feature-flag them on per course.
4. **Frontend** — new `useInstantPlayback` composable that follows the critical-path → tier-1 → tier-2 sequence. Behind the same feature flag, fall back to the existing path on flag-off.
5. **Cutover** — flip the flag for one course, measure first-play latency, watch error rates, flip the rest. Old code path stays in tree for a release cycle, then removed.

## Open questions

- **Round-end listening hooks**: each round has 0 or 1 listening exercise (L1, L2, or none). Where does the cycle endpoint tell the player which seed/pod is fired at end of this round? Probably as the last "cycle" in the round's response, with `type: 'listening'` and a `seedAudioId` field. Worth deciding the exact shape before building.
- **Spaced-rep round-index math vs LEGO identity**: existing memory says position is anchored on `lego_id`, not `round_index`. The new design keeps that — `lego_id` is stored, round index is derived. But the spaced-rep formula references rounds N-1, N-2, etc. We need to confirm the formula gives identical results when derived this way vs how it's computed today (the round index, in both worlds, is the same function of the LEGO graph).
- **Course version stamping**: the round map and the decomposition are both functions of the course's LEGO set. We need a `course_version` integer on the `courses` row, bumped on any LEGO/decomposition change, surfaced in the round-map URL for cache busting.
- **Cellular vs wifi listening prefetch**: should we be polite about cellular data and pause listening prefetch on cellular connections? Browsers expose `navigator.connection.effectiveType`. Trivial to gate.
