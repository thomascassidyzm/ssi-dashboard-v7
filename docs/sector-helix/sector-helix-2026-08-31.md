# The sector helix — one ownership ledger, two schedulers

**Date:** 2026-09-01 (dispatched 2026-08-31). **Status: DESIGN — nothing here executes anywhere.**
No DB write, no course touched, no audio. Every number below was measured read-only against the
live database or the committed code on the day. The one script written is a probe
(`interleave-probe.cjs`, beside this file) that walks real `spa_for_eng` seed data and prints the
interleave — it is a probe, not a shipped component.

**The commission:** the ownership-versus-scheduling split for sector-specific mode — the mode Tom
and Aran settled on 2026-08-31 — with the interleaving arithmetic and the role-change case as the
two things it has to make work. All of that conversation's rulings (mode-not-course, role as
projection, two kinds of sector content, separate spaced-repetition thread, phrase-minimum pod
cuts on the target side only, seed-boundary swaps, overdrilling not a concern) are taken as
settled and built on, not revisited.

---

## One page — the verdict

**The room's read is CONFIRMED, with one sharpening: the ownership ledger is two layers, not
one object, and the dedupe that makes the second thread cheap happens at AUTHORING time, not at
runtime.**

- **The authored layer** (per course-pair, shared by every learner): which chunks exist, which
  thread introduces each one, the pod cuts, the sector segment's declared core anchor, and the
  role map. The health thread never re-teaches a LEGO the core already gave because the sector
  segment is *authored against* the core: every chunk core teaches up to the anchor enters the
  sector segment as `is_new = false` — tiling and vocabulary, no round, no learning event. This
  is an existing mechanism: the live script generator already builds rounds only from
  `is_new = true` legos (`generateLearningScript.ts:1333-1336`), so the cheapness of the second
  thread is baked into its script by the same switch the core already runs on.
- **The learner layer** (per enrolment, runtime): what this learner has actually met — the union
  of the two thread cursors, the per-lego progress rows, and one pod-delivery ratchet per thread.
  It is mostly *derivable*: ownership at any moment is "everything at or before the core ceiling,
  plus everything at or before the sector ceiling", because each thread's script is a
  deterministic sequence and a cursor into it names a prefix.

**What is per-thread is exactly the scheduling state and nothing else:** cursor, ceiling,
cycle index, pod ratchet. Review scheduling needs *no new state at all*, because in the live
player spaced repetition is positional, not temporal — each script carries its own Fibonacci
review structure (offsets [1,2,3,5,8,…,2584] in its own round numbering,
`generateLearningScript.ts:110`), so a thread paused for a month resumes with its reviews intact.

**The alternative I rejected** — runtime dedupe, where the player skips rounds this particular
learner already owns — fails on determinism: round numbers are the spine everything hangs on
(the `course_round_index` view, resume anchors, the Fibonacci pairing, the 2026-08-06 lesson
that one dropped round re-paired fra_for_eng's entire review schedule from round 47). Per-learner
round numbering would fork all of it. Authoring-time dedupe against a declared anchor keeps every
script deterministic; the cost is bounded overdrill for learners past the anchor, which is ruled
a non-concern and gets no machinery.

The two failure modes named in advance are closed by construction: **re-teaching** cannot happen
because shared chunks carry `is_new = false` in the sector script; **role-change reset/stranding**
cannot happen because ownership is keyed to content (lego ids), never to role, and the cursor
after a role change is recomputed *from* ownership (§4).

---

## 1. The ownership ledger — the fields

### Authored layer (course-level, shared)

| fact | home | new? |
|---|---|---|
| Core chunks and order | `course_seeds` / `course_legos` / `course_practice_phrases` under the base course code | exists |
| Sector chunks, order, and the dedupe | same three tables under the sector segment's own course code (§5); shared chunks present as `is_new = false` rows for tiling + vocab | new content, existing schema |
| Pod cuts (phrase-minimum, target-side, pair overlay) | the pair overlay, per Tom's cutting ruling; canonical pod known text untouched | new content, existing model |
| Core anchor — the core position the sector segment is authored against | `course_sectors` registry (§5), one lego id | new |
| Role map — which sector seeds are first-person for which role | `course_sectors.role_map` (§5) | new |

Cuts live in the *authored* layer, not the learner layer: a cut is content, an agreement between
a known chunk and an owned target realisation. What a learner owns of it follows from position,
same as every other chunk.

### Learner layer (per enrolment)

| fact | home | new? |
|---|---|---|
| Core cursor, ceiling, cycle, pod ratchet, mode | `course_enrollments` — `last_completed_round_index`, `highest_completed_lego_id`, `current_cycle_index`, `completed_pod_rounds`, `pod_activation_round`, `current_mode` | exists, untouched |
| Sector thread state | new `enrollment_threads` table (§5) — same cursor/ceiling/ratchet fields, plus `active` and `role` | new |
| Per-lego runtime state (eternal urn, retirement) | `lego_progress` rows, keyed by lego id — thread-agnostic, because a lego lives in exactly one thread's script | exists |

**The boundary, stated once:** ownership is *what content the learner has met* — global, content-
keyed, role-free, thread-free. Scheduling is *where each thread's cursor is* — per thread,
positional. Anything keyed by lego id is ownership; anything keyed by round number is scheduling.

### The three awkward boundary cases

1. **A LEGO first introduced by the sector thread and later needed by core.** Cannot arise at the
   authored layer: core is frozen and authored first; the sector segment is authored against it,
   never the reverse. At the learner layer the interleave can put a *core* round for a chunk the
   learner met earlier in a sector USE phrase — that is vocabulary exposure, not introduction,
   and it is how overlap already works within one course. If a future core recut ever wants a
   chunk a sector segment introduced, the chunk is re-authored into core and the sector row
   flips to `is_new = false` at the next segment build — an authoring event, not a migration.
2. **A review item due in both threads at once.** Impossible by construction: each lego's debut
   round and its whole Fibonacci tail live in the one script that introduced it. The only overlap
   is a shared chunk appearing inside the other thread's practice phrases, which is exposure, not
   a due review. Where anchor slack makes a chunk genuinely appear in both scripts, that is
   double-drill; ruled fine, no machinery.
3. **Toggle OFF, later ON.** The `enrollment_threads` row flips `active = false`; nothing else
   changes. The interleave collapses to core alone. On re-toggle the merge resumes at the frozen
   sector cursor. Because review is positional, a six-month gap costs nothing to migrate — the
   thread picks up mid-script exactly as a returning learner does today. Toggle-off never
   deletes; there is no destructive path in this design.

## 2. Two schedulers, one merge

Each thread is a normal deterministic script, generated exactly as today (`generateLearningScript`
per course code — the sector segment being its own course code means the generator, the
`course_round_index` view, resume anchors and offline bundles all work unchanged per thread).
The player's two-thread mode is a **merge layer above two scripts**, not a new engine:

- **Swap at seed boundaries only** (settled). The merge alternates seeds: all rounds of the next
  core seed, then all rounds of the next sector seed, and so on. Asymmetric in rounds by design.
- **Total-rounds counter.** One counter increments on every round from either thread. Listening
  laps (L2 pods) fire off this counter — activation 6, interval 5, unchanged
  (`usePodLapScheduler.shouldFireLapAt`) — so "listening after five total rounds" holds with the
  laps landing wherever they land, including mid-seed, which they already do today.
- **Two pod lap streams.** The core thread's laps draw cohorts from CORE (pod-0) against
  `course_enrollments.completed_pod_rounds`; the sector thread's laps draw from the sector pod
  against `enrollment_threads.completed_pod_rounds`. Which stream a due lap serves alternates
  with the thread whose seed is in play. Each ratchet advances only on delivery
  (`markLapCompleted`), so **a deferred lap simply leaves the ratchet where it was and the next
  lap delivers the same cohort** — nothing downstream ever assumes "delivered by seed N". This is
  job #450's finding honoured: delivery is per-enrolment runtime state, `deliveredPodRows`
  returns null not `[]`, and HEARD stays a ranking signal, never a gate, so a learner who
  deferred can never be asked to produce material a lap was supposed to hand them.
- **NOT reused: the TripleHelixEngine / `helix_state` jsonb.** The card-dealing triple helix in
  `@ssi/core` is a different object (it deals seeds of ONE course across threads). Reusing its
  state shape for a two-course merge would strand its semantics on ours. The sector thread gets
  its own row; `helix_state` stays legacy.
- **One sector thread active at a time.** The schema allows many `enrollment_threads` rows
  (parked sectors, §4), but the player merges exactly two streams: core + the one active row.
  Double helix now; the schema does not forbid a triple later.

**Entry gate:** the sector thread starts interleaving only once the learner's core ceiling has
reached the segment's `core_anchor`. Before that, the mode is selectable but shows the thread as
"opens after —" rendered as the anchor lego's own content in both languages — no numbers, no
"seed", no "lego", per the standing position rule. Sector authors should push anchors as early
as the content allows (the medium-contract opener needs very little).

## 3. The interleaving arithmetic, on real data

Course used: **`spa_for_eng`** (668 seeds, 1,475 legos, live DB read 2026-09-01). Real new-lego
counts per seed, seeds 1–30 (these are the round counts, since rounds come only from
`is_new = true`): `5,2,3,3,4,2,3,2,2,4,3,4,2,1,3,4,3,4,3,3,3,3,2,2,3,4,3,2,2,4`.

No sector seeds exist yet anywhere in the estate (verified: the sector branches carry source
conversations and metagraph mappings, no decomposed seeds), so the sector thread below is a
**stand-in with real length distribution**: spa_for_eng seeds 41–60's real new-lego counts
(`4,3,1,3,1,2,2,1,2,2,3,3,2,1,2,1,1,2,3,1`), labelled S41…S60. Once real sector seeds are
authored with the anchor dedupe, their counts will skew *smaller* (more `is_new = false` rows),
so this is an upper bound on sector weight in the mix.

First 54 total rounds, sector on from enrolment, core seed first, laps at 6 then every 5
(probe output, verbatim):

```
  1-5   C1  r1-5/5
  6-9   S41 r1-4/4     L1 at total round 6
 10-11  C2  r1-2/2     L2 at 11
 12-14  S42 r1-3/3
 15-17  C3  r1-3/3     L3 at 16
 18     S43 r1/1
 19-21  C4  r1-3/3     L4 at 21
 22-24  S44 r1-3/3
 25-28  C5  r1-4/4     L5 at 26
 29     S45 r1/1
 30-31  C6  r1-2/2     L6 at 31
 32-33  S46 r1-2/2
 34-36  C7  r1-3/3     L7 at 36
 37-38  S47 r1-2/2
 39-40  C8  r1-2/2
 41     S48 r1/1       L8 at 41
 42-43  C9  r1-2/2
 44-45  S49 r1-2/2
 46-49  C10 r1-4/4     L9 at 46
 50-51  S50 r1-2/2     L10 at 51
 52-54  C11 r1-3/3
```

What the numbers say:

- **After ~54 total rounds the learner has completed core seed 10 and ten sector seeds** —
  against ~16 core seeds in the same rounds with sector off. Core moves at roughly half speed
  in seeds; slightly better than half here (28 core rounds vs 26 sector) because the stand-in
  sector seeds are shorter. The asymmetry in rounds is visible everywhere (C1's five rounds
  against S43's one) and is the ruled-correct behaviour, not a defect.
- **Laps land mid-seed** (L4 inside C4, L8 on a one-round sector seed). They already do today —
  lap firing is a round-boundary event and always was; seed-boundary swapping constrains thread
  swaps, not laps.
- **Review spacing stretches in wall-round terms.** Each thread's Fibonacci offsets count its
  *own* rounds, so with two threads a core N-8 review arrives ~16 total rounds after debut.
  That is "core content moving half speed" reaching the review stream, ruled fine; no machinery.
- **Position and progress, learner-facing:** per thread, position is the highest LEGO actually
  played in that thread — `highest_completed_lego_id` on `course_enrollments` for core, on the
  thread row for sector — displayed as that lego's own content in both languages, never a
  number, never the words "seed" or "lego". Jump-to-furthest lands at the start of that lego's
  round, per thread. The resting-state screen shows two furthest-points when the sector thread
  is on; each jump targets its own thread and the merge re-anchors both cursors.

## 4. The role change — the migration story

**Keyed to role: the script projection and nothing else. Keyed to content: everything owned.**

The sector segment is authored ONCE as the whole dialogue graph — both ends of every exchange —
and a role is a filter: the seeds whose turns are first-person for that role (the `role_map` in
the registry: `{general: [...], nurse: [...], doctor: [...]}`, seed numbers per role, one seed
in as many lists as roles that speak it — job #450's evidence that the speaker's role name is
the reliable register signal is what makes this tagging mechanical). Three roles → three
deterministic projected scripts of one authored segment. No role variants are authored, ever.

**General → nurse, the walk-through:**

1. The learner's `enrollment_threads.role` flips to `nurse`. The row's ownership implications:
   none — ownership is lego-keyed and role-free.
2. The player generates the nurse projection (deterministic, same segment).
3. **Cursor recompute, from ownership:** the new cursor is the longest *prefix* of the nurse
   script whose every lego is already owned (met in the general projection or `is_new = false`
   against core). Shared turns — most of the graph, since the exchange spine is common — are
   exactly the prefix that skips. The first nurse-specific turn is where they land.
4. The ceiling recomputes the same way; per-lego rows (`lego_progress`) carry over untouched.
5. **What they see:** a one-time banner in content terms — "moving to nurse — carrying on from
   [the landing lego's own content]". Visible, not silent.

**Nothing is reset** (owned stays owned, shared-turn progress carries). **Nothing is silently
stranded** — but one thing is *visibly* parked, named plainly: general-only turns the learner
owned keep their ownership (they remain vocabulary, they still license availability) while their
remaining Fibonacci reviews end, because their rounds are not in the nurse script. That is the
one-line accepted cost, and it is the correct one: a nurse who stopped being general should not
be drilled on general-only turns. Owned legos that sit *after* the first unowned round in the
new projection get re-met when the cursor reaches them — double-drill, ruled fine.

**Sector switch (health → hospitality) is a different, and easier, case.** No migration at all:
the health `enrollment_threads` row is parked (`active = false`, state intact, resumable), a
hospitality row is created with its own anchor gate and cursor 0. Ownership being global, any
chunk both sectors share that health already introduced arrives in hospitality authoring as
core-plus-nothing — but note the dedupe is against *core*, not against other sectors: sector
segments must stay independent of each other, or toggling order would change what a segment can
assume. A hospitality seed re-teaching a chunk health taught is double-drill; fine.

## 5. Where everything lives

**Sector content = its own course code per segment**, e.g. `spa_for_eng` + segment
`health` registered in a small new table; the segment's seeds/legos/phrases live in the same
three content tables under the segment code. This is the deliberate structural echo of Tom's
"like running two courses next to each other": to every existing tool — course-builder
validator, phrase gates, audio pipeline, `course_round_index`, script generator, offline
bundler — a sector segment is just a course. Zero migration of content tables, zero risk to
core readers. (Rejected alternative: a `segment` column on the content tables — it collides
with the per-course `seed_number` namespace and touches every reader of three tables.)

**The registry — new table `course_sectors`:**
```
course_sectors (
  base_course_code   text,     -- 'spa_for_eng'
  sector_slug        text,     -- 'health'
  sector_course_code text,     -- the segment's own course code
  roles              jsonb,    -- ['general','nurse','doctor']
  role_map           jsonb,    -- { role: [seed_number, ...] }
  core_anchor_lego_id text,    -- the core position the segment is authored against
  sector_pod_slug    text,     -- the overlay pod this thread's laps draw from
  status             text      -- draft | live
)
```
The modal learns which sectors a language offers from
`GET /api/courses/[code]/sectors` reading this table — the same pattern as the estate map:
computed fresh from the DB, never inferred. `role_map` living beside the content rather than in
it is the one place data and content can drift; §6 names the guard.

**Learner state — new table `enrollment_threads`:**
```
enrollment_threads (
  id, enrollment_id fk,
  sector_course_code text, role text, active boolean,
  last_completed_round_index int, current_cycle_index int,
  highest_completed_round_index int, highest_completed_lego_id text,
  completed_pod_rounds int, pod_activation_round int,
  created_at, updated_at
)
```
Additive only. **No existing learner's row changes at rollout** — that is the whole-population
no-strand guarantee: a learner who never opens the modal has a design-identical experience,
byte for byte.

**The toggle** is `enrollment_threads.active`, written by the modal (a new "sector-specific"
row in the existing ModeTray, opening the sector chooser, then the role chooser where
`roles` has more than one entry), read by a `useSectorThread` composable that hands the merge
layer its second script and cursor.

**The Popty side (content engineering):** the sector authoring pipeline is the normal seed
pipeline pointed at the segment course code, with two additions: (a) the validator's vocabulary
window seeded from the base course up to `core_anchor_lego_id`, and shared chunks written as
`is_new = false` rows; (b) ZUT run over the UNION of base course + all its segments — same
known → same target across the whole family, because to the learner it is one course. The pod
cuts follow the settled rulings: phrase-minimum, target side only, in the pair overlay, checked
against introduced LEGOs.

## 6. The availability / ZUT check across two threads

**The gate itself does not change; only what feeds it.** `availability.cjs` is pure functions
over rows somebody else read: `availableVocab` takes lego and component rows and a position;
`instantiableFrameSet` takes that vocab and gates a frame's `fixed_material` whole-chunk against
the owned known side. For a sector basket at (segment seed N, lego k), the caller feeds it the
**union**: every base-course lego and component up to `core_anchor_lego_id`, plus the segment's
own rows up to (N, k). One merged input, same functions, same whole-chunk discipline — no
re-conjugation, no substring luck, "tú" inside "estúpido" is still not ownership.

That union is what keeps the load-bearing property across two threads: **a phrase-level pod
LEGO still has to tile whole-chunk from what is owned, whichever thread introduced it.** The
worked case survives verbatim: spa_for_eng owns "and" and owns "you" and still cannot say
"and you" — no cut mints *"y tú"*, so the reciprocal-return frame stays out of every basket
pool in both threads, and enters both automatically the day either thread's authoring cuts the
pivot. Pods contribute frame attestation and zero vocabulary, unchanged; production material
comes wholly from cuts, unchanged; HEARD stays a ranking signal and never a gate, so the
per-enrolment, deferrable, null-not-empty pod delivery state can never poison generation.

Two named nits the build must catch: `corpus.cjs`'s `pairOf` regex will not parse a segment
course code (it already fails on `cym_n_for_eng`, so this is a standing bug the segment codes
make louder) — it must resolve a segment to its base pair via the registry; and `loadCorpus`
gains a variant that reads base-up-to-anchor + segment, which is a query change, not a logic
change.

## 7. The honest failure modes

1. **Cross-course ZUT is not enforced by anything today.** The validator checks ZUT within one
   course code. Until the union check is built (Popty side, §5b), sector authoring could mint a
   known text that collides with core's mapping. This is the one piece that must exist *before*
   the first sector seed is authored, not after.
2. **`role_map` can drift from content.** Seed renumbering or re-authoring in the segment would
   silently mis-project roles. Guard: a selfcheck (the `metagraph-selfcheck` pattern) asserting
   every `role_map` seed number exists in the segment and every segment seed appears in ≥1 role.
3. **Segment course codes will trip code that parses course codes.** `pairOf` is the named case;
   there will be others (estate map, dashboards, audio tooling group by course code). The build
   should grep for course-code parsing once, with the registry as the resolution point. Sector
   segments should also be excluded from learner-facing course *lists* (they are a mode, not a
   course) — the registry's existence is the filter.
4. **Sector-thread completion is designed as: the thread parks.** When the segment script is
   exhausted, the interleave ends, core continues alone, and the thread row shows complete;
   there is no sector INF PLAY in the first build. Sector eternal phrases stop appearing once
   the tail runs out. Accepted and visible, not silent; a sector review-only mode is a clean
   later addition on the same state.
5. **The L1 listening wheel and the graduation offset (90 rounds) were not re-derived for two
   threads.** Both are per-script mechanisms and should simply run per thread, but I read the
   scheduler, not every consumer; the build should verify the 30-cup wheel keys on thread-local
   rounds. EXPLICIT GAP: `useLayer1Scheduler.ts` was not read.
6. **The anchor is a blunt instrument.** One anchor per segment means a segment wanting
   late-course core material must anchor late, delaying its early, easy content. If sector
   authors hit this, the clean extension is banded segments (health-1, health-2 with rising
   anchors) — same machinery, no new concepts. Not built until needed.
7. **No sector seeds exist yet**, so §3's sector-side lengths are a labelled stand-in (real
   distribution, wrong provenance) and the dedupe ratio (how many sector legos come out
   `is_new = false`) is unmeasured. The first authored sector segment should re-run the probe
   with real rows before anyone quotes its pacing numbers.
8. **What I could not verify:** nothing was denied; the two named gaps are (5) above and the
   role-tagging granularity — `role_map` assumes role is per-seed (a turn belongs to a speaker),
   which holds in every flow of the health corpus read, but a future seed spanning both ends of
   an exchange would need splitting at authoring. Flagged for the content engineer.

---

*Probe: `docs/sector-helix/interleave-probe.cjs` — read-only, prints §3's table from live
`course_legos` rows. Not a component.*
