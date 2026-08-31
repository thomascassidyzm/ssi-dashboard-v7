# Cross-course union ZUT — the gate now sees the course family

**Landed on branch `feat/cross-course-union-zut`, not merged.** 2026-08-31.

The sector helix design named this failure mode 1 and said it in these words:
*"This is the one piece that must exist before the first sector seed is authored,
not after."* It exists now, and it executes: the ZUT gate in
`services/course-builder/lib/validation.cjs` runs on every real seed submission,
and it will refuse a sector segment that forks the base course's mapping.

---

## The defect, and the proof it was real

Every ZUT query carried `.eq('course_code', courseCode)`. A sector segment is —
by the settled design — registered as its **own course code**. So to the learner
a segment is one course with core, and to the validator it was two, and the
validator was the one that was wrong.

Here is the gate on **real `spa_for_eng` data**, read-only, with a labelled
stand-in segment (no sector seed exists anywhere in the estate yet, so the
segment rows are a stand-in and are never to be read as attested):

```
LIVE spa_for_eng rows for the worked case:
  S0015L03  "and" → "y"
  S0639L02  "you" → "usted"
  "and you" cut by spa_for_eng: NO

STAND-IN segment spa_health_for_eng:
  S0001L01  "the pain" → "el dolor"
  S0002L01  "you" → "vosotros"          ← the fork

BEFORE (single-course, no family): {"conflict":false}

AFTER  (family-wide):  conflict=zut
  ZUT violation: "you" already maps to "usted" in spa_for_eng
                 (same course family — to the learner it is one course)
  existing: S0639L02 "usted" in spa_for_eng
```

That is a segment minting *vosotros* for a known core teaches as *usted*, waved
through before and refused now.

## The test, RED before and GREEN after

`node tools/union-zut/union-zut.test.cjs` — one process, no DB, no network. It
takes a `UNION_ZUT_VALIDATION` path override so it can be pointed at the
**pre-change validator**, which means the RED run stays reproducible after the
change landed. A test that can only be run against the fixed code is not
evidence.

Against `cd9d93e2f`'s validator, same harness:

```
FAIL (a) a segment minting "you" → "vosotros" while spa_for_eng owns "you" → "usted" must be a ZUT violation; got false
FAIL (a) the error must name the target it collided with
FAIL (a) the collision must name the COURSE it came from — a family message that reads like a same-course one is a message that lies
FAIL (c) a segment phrase forking a base PHRASE must collide; got []
FAIL (c) the phrase collision must name the course it came from
FAIL (d) the BASE forking a known its own segment already owns must be caught; got false
6 failing assertion(s)
```

Against the branch:

```
ok — ZUT is family-wide in both directions, availability is anchor-bounded,
"and you" is still refused in both threads, and a course with no registry row
behaves exactly as it does today
```

Two of the file's assertions — the backward-compatibility ones — pass **before**
the change as well as after. That is what they are for.

## The one judgement call: two scopes, deliberately different

The design's §5b says ZUT runs "over the UNION of base course + all its
segments"; §6 says the vocabulary window is "seeded from the base course up to
`core_anchor_lego_id`". Those are two different bounds, and the build treats them
as two different things:

- **ZUT / collision scope = the whole family, unbounded, both directions.** A
  fork is a fork whenever it lands. In the demonstration above the colliding
  base row is at **seed 639** — well past any plausible core anchor. Bound ZUT by
  the anchor and that collision goes unseen, and the learner meets the fork
  later, which is worse, not better. The base course also sees its segments: same
  known → same target across the family, in both directions.
- **Availability / ownership scope = anchor-bounded.** Base material up to
  `core_anchor_lego_id` plus the segment's own rows up to (N, k). The learner
  genuinely has not met base material past the anchor, so it cannot be spent.

## The `y usted` case, on real rows, unchanged

On 116 real `spa_for_eng` legos and 46 real components up to a seed-40 anchor:

```
  union owns "and":     yes (via the base thread)
  union owns "you":     yes (via the stand-in segment thread)
  union owns "and you": no
  D6 "and you?" in the union pool: false
```

The family owns "and" and owns "you" and **still cannot say "and you"**, because
no cut mints the pivot. The test also holds the other half: D6 is admitted the
day **either** thread's authoring cuts the pivot, with no config change anywhere.
Whole-chunk discipline is untouched — `tools/frame-layer/union.cjs` concatenates
two `availableVocab` windows and matches nothing itself, deliberately, so the
gate never grows a second implementation.

## Backward compatibility for the 130 live courses

A course with **no registry row** takes exactly the path it takes today: one
query, one course code, and a collision message with **no course field** — byte
identical. That is asserted, not asserted-to-be. The three vitest files that
import `validation.cjs` pass (51 tests), and all four `tools/frame-layer/*.test.cjs`
scripts pass, including `instantiability.test.cjs`, which needed an installed
checkout to run and got one.

## What I decided, for you to overrule in one word

1. **The `course_sectors` table is written but NOT applied.** SQL sits at
   `tools/union-zut/course_sectors.sql`. Families are **injectable**, so the gate
   is honest and testable today, and needs no rewrite the day the table lands.
   Say the word and I apply it.
2. **Draft segments are ZUT-checked too** (`status` is not filtered by default).
   A gate that only wakes up at `live` is a gate that arrives after the damage.
3. **`corpus.cjs`'s `pairOf` relaxed.** It returned `null` for `cym_n_for_eng` —
   a real, standing bug that silently told the frame layer "no frames" for every
   variant course — and would have returned `null` for every segment code. It now
   resolves `spa_health_for_eng`, `spa_mx_for_eng` and `cym_n_for_eng` to their
   base pair and carries the variant. Genuine rubbish is still `null`.
4. **`deliveredPodRows` still returns `null`, on purpose.** Nothing here needed
   it to be `[]`, and nothing here made it so.
5. **`checkLegoOverlap` takes the family too**, though it has no external caller
   today — the export is public and leaving one of three functions single-course
   is how a gate starts lying.

## Honest gaps

- **No sector seed exists anywhere**, so the segment side of every demonstration
  is a labelled stand-in. The base side is live data. Nothing here is attested
  sector content and nothing here should be quoted as such.
- **The registry table is not in the database**, so `resolveCourseFamily` returns
  `null` for every course in production right now. The gate is armed and inert
  until a segment is registered — which is the correct state for a piece that had
  to exist *before* the first sector seed.
- **`role_map` drift** (design failure mode 2) is untouched; it wants its own
  selfcheck.
- **Course-code parsing beyond `pairOf`** (failure mode 3) is untouched — the
  estate map, dashboards and audio tooling group by course code and will meet
  segment codes eventually. Not this job's scope; worth one grep before the
  first segment is registered.

## Where it is

Branch `feat/cross-course-union-zut`, pushed, **not merged**, not deployed.
Files: `services/course-builder/lib/course-family.cjs` (new),
`services/course-builder/lib/validation.cjs`, `tools/frame-layer/union.cjs` (new),
`tools/frame-layer/corpus.cjs`, `tools/union-zut/` (test, demo, SQL), and the
nine live call sites in `seed-complete.cjs`, `seed-translate.cjs`,
`basket-rework.cjs` and `phrase-gate/gate-check.cjs`, wired in lockstep.
