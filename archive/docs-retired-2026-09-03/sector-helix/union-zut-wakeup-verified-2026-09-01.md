# The union-ZUT gate — did it wake up? (verified 2026-09-01)

**Verdict: YES.** The registration of `spa_for_eng` / `spa_health_for_eng` in
`course_sectors` on 2026-09-01 makes `resolveCourseFamily` return a real family
for both course codes where it returned `null` the moment before, purely
because the row now exists — no code changed. That family now makes
`checkLegoConflict` catch a cross-course ZUT collision it could not see before.
This was proved by reading the registry and running the gate **live against
the database**, not by re-running the demo's injected fixture.

This document is the write-up for the task; the artefact that produced the
output below is `tools/union-zut/wakeup-registered.cjs` (read-only, no
`opts.rows` injection anywhere).

---

## 1. What the registry actually holds (read live, not asserted)

```json
[{
  "base_course_code": "spa_for_eng",
  "sector_slug": "health",
  "sector_course_code": "spa_health_for_eng",
  "roles": ["general"],
  "role_map": { "general": [1, 2, ..., 57] },
  "core_anchor_lego_id": "S0001L01",
  "sector_pod_slug": null,
  "status": "draft",
  "created_at": "2026-09-01T08:46:21.156522+00:00"
}]
```

One row, exactly as claimed. `core_anchor_lego_id` is `S0001L01` — the anchor
is the FIRST lego of the course, not somewhere deep in it (per the census that
found 0/169 segment inventory owned at seed 1 and only 26% by seed 668 — no
later position was worth waiting for).

## 2. `resolveCourseFamily` — LIVE reads, before vs. after

```
resolveCourseFamily(sb, 'spa_for_eng')          [the BASE course]
{
  "courseCode": "spa_for_eng", "baseCourseCode": "spa_for_eng", "sectorSlug": null,
  "segmentCourseCodes": ["spa_health_for_eng"],
  "zutCourseCodes": ["spa_for_eng", "spa_health_for_eng"],
  "anchor": null
}

resolveCourseFamily(sb, 'spa_health_for_eng')   [STAND-IN course code — no content exists for it anywhere]
{
  "courseCode": "spa_health_for_eng", "baseCourseCode": "spa_for_eng", "sectorSlug": "health",
  "segmentCourseCodes": ["spa_health_for_eng"],
  "zutCourseCodes": ["spa_for_eng", "spa_health_for_eng"],
  "anchor": { "seed_number": 1, "lego_index": 1 }
}
```

**THE BEFORE**, same call, registry forced empty — the exact path every one of
the ~130 other live courses still takes today, so this is a real comparison,
not a re-enactment:

```
resolveCourseFamily(sb, 'spa_health_for_eng', { rows: [] }) => null
```

`null` is what "armed and inert" looked like before 2026-09-01: the code was
identical, the row was simply absent.

## 3. The cross-family case — a real collision, past the anchor

`spa_for_eng` seed 639 is confirmed still live: `S0639L02 "you" -> "usted"`.
639 is far past the anchor (seed 1) — the case is deliberately chosen to prove
ZUT is unbounded while availability is anchor-bounded (§5 below).

A candidate STAND-IN segment submission — **no such row exists in
`spa_health_for_eng` or anywhere else; this is illustrative only** — mints
`"you" -> "vosotros"` at its own (fictitious) seed 20:

```
BEFORE (no family arg passed — the path an unregistered course takes):
  {"conflict":false}

AFTER  (family arg = LIVE resolveCourseFamily result from step 2):
  conflict = zut
  message  = "ZUT violation: "you" already maps to "usted" in spa_for_eng (same course family — to the learner it is one course)"
  existing:  S0639L02 "usted"  <- from course spa_for_eng
```

Before the registration this exact candidate would have been accepted
(`checkLegoConflict('spa_health_for_eng', ...)` only ever queried
`course_code = 'spa_health_for_eng'`, which has zero rows — nothing to
collide with). After it, the same function, same arguments, refuses it and
names the course the collision came from.

## 4. Scope check — this proves the ruled design, not an accident

- Collision row: `spa_for_eng` seed 639.
- Anchor: seed 1.
- The gate still catches the seed-639 collision even though seed 639 is
  nowhere near the anchor — confirming ZUT is family-wide and **unbounded**
  in both directions ("a fork is a fork whenever it lands"), while
  **availability** (`tools/frame-layer/union.cjs`) is the anchor-bounded
  concern, not exercised in this run.

## 5. Existing test suites, run from an installed checkout, verbatim

Worktree code (`/home/tomcassidy/SSi/wt-sector-verify`), dependencies from the
sibling `-clean` checkout's `node_modules` (via `NODE_PATH` for the plain
`node` scripts, and a temporary `node_modules` symlink — removed again after —
for `vitest`, since ESM resolution ignores `NODE_PATH`).

```
$ node tools/union-zut/union-zut.test.cjs
ok — ZUT is family-wide in both directions, availability is anchor-bounded,
"and you" is still refused in both threads, and a course with no registry row
behaves exactly as it does today

$ node tools/frame-layer/could-occupy.test.cjs
ok — 25 position classes, every target position exists in the shape store,
and a tag is a could-occupy in the schema as well as in the prose

$ node tools/frame-layer/derive-and-baskets.test.cjs
ok — derivation returns all five verdicts including atomisation, reads
components for availability and never as teaching, windows vocabulary per
LEGO, attests frames per course, scores FRAME against what was instantiable,
scopes floors per basket, and mints lab-side phrase ids

$ node tools/frame-layer/extract-patterns.test.cjs
ok — 31 patterns, metric fails the bad basket (0.333) and clears the varied
one (0.903), all assertions pass

$ node tools/frame-layer/instantiability.test.cjs
ok — the gate refuses "and you?" for spa_for_eng at every position, admits it
the day a cut mints it, and all 18 frames are well-formed

$ npx vitest run \
    services/course-builder/lib/known-vocab-gate.test.cjs \
    services/course-builder/lib/known-side-gate-v2.test.cjs \
    services/course-builder/lib/build-recombination.test.cjs

 ✓ services/course-builder/lib/build-recombination.test.cjs   (11 tests) 5ms
 ✓ services/course-builder/lib/known-vocab-gate.test.cjs      (12 tests) 10ms
 ✓ services/course-builder/lib/known-side-gate-v2.test.cjs    (28 tests) 29ms

 Test Files  3 passed (3)
      Tests  51 passed (51)
```

**51/51, matching the prior build's reported count exactly.** All five `.cjs`
self-tests: 0 failing assertions. No skips anywhere in this run — every
number above is a pass, reported verbatim; none were substituted.

## 6. Adversarial pass

**Does a DRAFT segment actually widen scope, or does something filter to
`status = 'live'` and leave the gate inert?**
Checked `course-family.cjs`: `resolveCourseFamily`'s default is
`opts.includeDraft !== false` — i.e. **draft rows are included unless a caller
explicitly opts out**. Grepped every call site
(`seed-translate.cjs`, `seed-complete.cjs` ×5, `basket-rework.cjs`,
`phrase-gate/gate-check.cjs`) — **none** pass `includeDraft: false` or filter
by status themselves. The registered row is `status: 'draft'` and the live
run above proves it is honoured as-is: nothing filters it out. The claim
holds — this is not gated behind promoting the segment to `live`.

**Does the 60-second family memo mean a live submission could miss the
registration?**
`courseFamily()` caches per `courseCode` for 60s (`FAMILY_TTL_MS`), used by
every real call site above (the `.cjs` test file and this artefact both call
`resolveCourseFamily` directly, bypassing the cache, by design — reproducible
without a clock dependency). The real-world window: a process that queried
`courseFamily(sb, 'spa_health_for_eng')` in the 60 seconds *before*
2026-09-01 08:46:21 UTC would have cached `null` and could serve that stale
answer for up to 60 more seconds. This is a genuine, bounded, one-time
window per course-builder process — not a standing gap — and it cuts only one
way: toward under-checking immediately after a registration, never toward
over-checking or a false positive.

**Does the BASE course now get checked against the segment (reverse
direction), and is that wanted given the segment has zero rows?**
Yes: `resolveCourseFamily(sb, 'spa_for_eng')` (§2 above) returns
`segmentCourseCodes: ["spa_health_for_eng"]` and
`zutCourseCodes` containing both codes — so a *base* seed submission now also
queries `course_legos` filtered `.in('course_code', [...])` across the
segment. This matches the design doc verbatim (§5b: "ZUT run over the union
… in both directions") and matches test `(d)` in `union-zut.test.cjs`. Given
the segment table holds **zero rows today**, this reverse direction is
currently a no-op in practice (nothing to collide against) but is real and
already wired — it activates automatically the day any segment content is
authored, with no further code change. This is the intended shape, not a
side effect.

**Does anything in the estate parse course codes in a way `spa_health_for_eng`
breaks?**
`pairOf` (`tools/frame-layer/corpus.cjs`) was relaxed for exactly this and
correctly resolves `spa_health_for_eng` to `{ target: 'spa', known: 'eng',
variant: 'health' }` (confirmed by `union-zut.test.cjs`'s own assertions).
Grepping the rest of the estate for other course-code parsers found two
**not** relaxed the same way, reported here without fixing them per the brief:

- `tools/frame-layer/split-matchers.cjs:81` —
  `/^([a-z]{2,3})_for_[a-z]{2,3}$/` anchors both ends with no variant slot, so
  `splitsFor('spa_health_for_eng')` returns `null`. A genuinely Spanish
  segment course would silently report "no splits in play" — the exact
  failure mode this file's own comment names for a French course under the
  Spanish matchers, now reachable by a real Spanish segment code too. This is
  in the frame-layer split-derivation tool, not the ZUT gate — it does not
  affect the wakeup finding, but it is a real gap in a sibling tool.
- `services/production-api.cjs:1533` — `PROXY_COURSE_CODE_RE =
  /^[a-z]{2,4}_for_[a-z]{2,4}$/`, used by `extractProxyCourseCode` to find the
  scoped course code in a proxied course-builder request's path/body. It also
  will not match `spa_health_for_eng` — a proxied request naming the segment
  course code as a path segment or body field could fail to resolve a scoped
  course code (falls through to `null`), which feeds the course-builder proxy
  auth gate below it. Not exercised by this task's scope (no proxy requests
  were made), flagged as a real risk to check before any segment ever
  submits through that route.
- Beyond those two, dozens of `.split('_for_')[0]` / `[1]` one-liners across
  `services/` and `tools/` (voice config, TTS language lookups, manifest
  generators, orchestrator) would resolve `spa_health_for_eng`'s "target"
  half as the string `"spa_health"` rather than `"spa"` — wrong for any
  language-code lookup, though most of these paths have no reason to run
  against a segment with zero content yet. Listed, not fixed, per the brief:
  `services/data-finders.cjs:359`, `services/voice-config-service.cjs:621`,
  `services/pod-dialogue-generator.cjs:532,730`,
  `services/language-code-service.cjs:414` (this one IS variant-aware, same
  shape as the relaxed `pairOf`), `services/course-data-service.cjs:1008`,
  `services/phases/phase8-audio-from-baskets.cjs:95`,
  `services/voice-engine/voice-slots.cjs:42`,
  `services/orchestration/orchestrator.cjs` (4 sites), and others surfaced by
  `grep -rn "_for_"` across `services/` and `tools/` — not exhaustive-verified
  one by one, reported as a grep result, not individually tested.

**Is there any path by which this registration changes behaviour for the
~130 courses with no registry row?**
Tested live, not just argued: `resolveCourseFamily` for `fra_for_eng`,
`deu_for_eng`, `jpn_for_eng`, `cym_n_for_eng` all still return `null` after
the registration (run in this same session, against the same live DB, after
the row existed). The filter in `resolveCourseFamily` only matches rows where
`base_course_code === courseCode` or `sector_course_code === courseCode`; a
single new row naming `spa_for_eng`/`spa_health_for_eng` cannot match any
other course code. **The byte-identical claim holds** — proved, not assumed.

## 7. Explicit gaps

- The segment side of every case in this document and in
  `union-zut.test.cjs`/`demo-union-zut.cjs` is a **labelled stand-in**. No
  sector seed exists anywhere in the estate. The registration proves the
  *gate* woke up; it proves nothing about sector content, which does not
  exist yet.
- The proxy-parsing risk (`PROXY_COURSE_CODE_RE`) and the `split-matchers.cjs`
  gap are reported, not verified end-to-end against a running
  `production-api.cjs` process — no request was actually sent through that
  proxy in this task (out of scope: read-only, no writes, and the segment has
  no content to submit).
- The dozens of `.split('_for_')` one-liners are a grep result, not a
  per-callsite trace of whether each one is ever reachable with a segment
  course code today; flagged as a list per the brief, not individually
  confirmed live or dead.
- This task did not exercise `tools/frame-layer/union.cjs`'s anchor-bounded
  availability window against the live registration (only `union-zut.test.cjs`
  does, with stub data) — §4's scope check is about the ZUT gate only, as
  stated inline.

## Artefact

`tools/union-zut/wakeup-registered.cjs` — read-only, no DB writes, no
`opts.rows` injection: every family resolution in it reads `course_sectors`
live. Run with:

```
NODE_PATH=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules \
  node tools/union-zut/wakeup-registered.cjs
```
