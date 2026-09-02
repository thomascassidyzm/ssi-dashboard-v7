# The last three doors onto a live pod slug — shut. And there were eleven, not ten.

**2026-09-02. Branch `fix/pod-doors-last-three-2026-09-02`, merged to `main`. Follows
[job #93's enumeration](./pod-doors-2026-09-02.md).**

Job #91 found that an invariant guarded at one door is not guarded. Job #93 shut two doors
and then counted them: ten write paths create, rename, empty or move a pod on a slug the
player serves. Seven guarded, three open. This job shuts those three, and re-running #93's
own dedupe method found an eleventh it had missed — the Welsh one.

**Headline: all four are shut, the rule is now written once instead of five times, and
`promote-pod` does NOT refuse on learner progress — it warns and names them. The extraction
that would let it migrate progress properly is costed below as the next job, and I did not
half-do it.**

---

## What landed

### Door A — `POST /api/admin/pods/generate` (the urgent one)

It read `const slug = String(req.body?.slug || 'pod-0').trim()`. **The slug now has no
default**: absent or blank is a 400, exactly as absent `courseCode` already was. A caller
could otherwise omit the single most dangerous parameter, land on a slug the player serves
for ~68 courses, and carry `force: true` + `mode: 'full'` in the same body — the path that
calls `deleteAllSentences()` before re-generating.

Parsing moved out of the 4,600-line Express file into `services/pod-generate-guard.cjs`,
pure and tested, because that is why nothing tested it. The route also passes
`serveNow` through: `serveNow: true` in the body, mirroring the CLI's `--serve-now` as
closely as an HTTP body can. It is about deliberateness, not authentication — the route is
already behind `requireAdmin`.

### Door C — `services/pod-dialogue-generator.cjs`

`assertNotServing()` now runs beside `assertNoForeignRowIds()` and `assertNotGated()`,
before any write and before any model spend, covering every mode including `sync`. **It is
not waivable by `force`** — force says "overwrite this content", it has never said "and
serve it while you do". Only `serveNow` says that. The CLI grew `--slug=` and `--serve-now`.

Its `visibility='held'`-on-creation comment claimed that nothing becomes learner-reachable
merely by being created. **That reasoning is void and the comment is corrected**, citing
`bundle.ts`. The `visibility` write itself is untouched — removing it is a separate
decision nobody has made.

### Door B — `tools/pod-sync.cjs`

Wholesale replace: DELETE every sentence row of the named pod, INSERT the markdown's, with
no serving check, no progress migration, and re-inserted rows carrying **no audio at all**
until Phase 8 re-links them. Its own usage block handed the operator `--slug=pod-0` twice
as the worked example. It now refuses `pod-0`/`pod-1` without `--serve-now`, **in dry run
too**, and the examples say `pod-0-unrecorded` and point at `pod-switchover.cjs`.

### The eleventh door — `tools/pods/align-welsh-pod0-to-canonical.cjs`

Not in #93's ten. `POD_SLUG` is the literal `'pod-0'`. It blanks `known_text` and
`target_text` on every slot whose English changed, and `--restore-from-archive` deletes
every sentence row of that pod before re-inserting. Its sibling
`align-pod0-to-canonical.cjs` refuses to rewrite a released or beta course's live pod-0;
**this one had no serving check of any kind, only `--apply`** — and it is the Welsh path,
which is the audience this whole thread is about. Now refuses without `--serve-now`, dry
run included, naming the learners. The flag will be passed on nearly every real run: that
is the point, not a nuisance — the run says out loud what it is rewriting.

### One rule, not five

`tools/pods/serving-slug.cjs` holds it: `SERVING_POD_SLUGS`, `servesLearners()`,
`learnersAtRisk()`, `servingRefusal()`. **`clone-pod.cjs` now imports it rather than
holding the original copy, and its 13 existing tests pass unchanged** — which is the proof
the extraction was faithful rather than a rewrite. Each door composes its own wording
around the shared rule, because "clone here" and "empty and refill this from a markdown
file" are not the same warning. The supabase-js version of the counts is written once
there too; `clone-pod`/`promote-pod` keep the `pg` version, because that is the client they
hold. One rule, two dialects, no third copy.

---

## `promote-pod` — the refusal you cancelled, and what I did instead

I did **not** build the learner-progress refusal. Your correction landed before I wrote it,
and the reasoning is now recorded in the file itself so nobody re-derives it: a refusal
keyed on progress walls off exactly the courses that matter.

Three things landed there instead, none of them a gate:

1. **The absence of a known-side escape flag is recorded as deliberate**, in your words,
   with an explicit "do not add `--allow-silent-known` however reasonable the ticket
   sounds". #93 had left it flagged as maybe-needed-one-day. It is not.
2. **The "PROMOTION IS NOT RELEASE" paragraph is corrected.** It asserted that
   `listening_pods.visibility` "decides whether learners can reach a pod at all". It does
   not and never did. Comment fixed, behaviour untouched.
3. **Learner progress is REPORTED, loudly, in the dry run and before `--apply`** — how many
   `learner_pod_state` rows reference the pod being displaced and the pod being promoted,
   what the renames do to them, and that `pod-switchover.cjs` is the tool that carries
   progress properly. It uses `archive-pod.cjs`'s count query, to report rather than block.

### The road I took on the extraction, and why

**I took the escape hatch: guards landed, extraction costed, nothing half-shipped.** The
evidence, having read the block: the switchover's apply-and-verify is not a function
waiting to be lifted. It is ~170 lines interleaved *inside* one `BEGIN…COMMIT` with the
switchover's own `movePod()` calls and post-checks, reading six module-level globals
(`COURSE`, `LIVE`, `STAGED`, `RETIRED`, `PROMOTE_TO`, `ACCEPT_UNCAST`), and the ordering is
load-bearing in three places — the plan is taken *before* anything moves, the straggler
re-read happens at the last moment progress is still untouched, and the orphan post-check
runs *inside* the transaction. Extracting it correctly is a refactor of the estate's most
safety-critical transaction, and I cannot exercise it against live data in this job.
Shipping it unproven would be worse than not shipping it.

**The next job, costed.** Extract from `pod-switchover.cjs`'s `main()` into an exported
`migrateProgressInTransaction(db, { courseCode, fromSlug, toSlug, planAt, stateRows })`:
the snapshot + `planMigration()` call (~lines 452-470), the straggler re-read and
`planInflightFold()` (~lines 527-560), the delete/insert apply loop (~lines 580-600) and
the orphan post-check (~lines 601-607). Then `promote-pod.cjs` takes the plan before its
transaction and calls the applier inside it, replacing today's warning. **Shape: one
worker, half a day, no bulk compute.** The test asserts what no test asserts today: given
a canon on both sides and a set of `learner_pod_state` rows, the same carry/keep/merge/drop
counts come out of the extracted function as out of the switchover's own path, and no state
row is left pointing at a sentence that does not exist. Rehearsal exists for the live
proof — `rehearse-switchover.cjs` on a `zzz_` course.

---

## Is ten the complete set? No — eleven, and here is how to find a twelfth

**#93's numbers reproduce exactly.** In this repo, 5,908 files mention `listening_pods` or
`listening_pod_sentences`; 5,569 of those are in parallel worktrees. Excluding
`node_modules`, `dist`, `.next`, every worktree, gitignored `scripts/` and the archived
`database/migrations/` leaves **333 canonical files, 174 of them code** — #93's figure to
the file. 52 of those 174 carry a write verb on a pod table under a strict match (#93's
looser match gave 67; the difference is match strictness, not disagreement).

**Eleven are doors** by #93's definition — creates, renames, empties or moves a pod on a
slug the player serves. The seven it listed as guarded, the three it listed as open (now
shut), and `align-welsh-pod0-to-canonical.cjs`.

**What is deliberately not counted, and why**, because this is where a twelfth would hide:

- **In-place field writers** — `insert-ellipsis-seams`, `author-window-knowns`,
  `breakdown-fine`/`flat`, `audit-fine-seams`, the `repair-*`/`rescue-*`/`render-*` audio
  tools, `api/pod-cast-voices.js`. They update columns on rows that already exist on
  whatever pod you name. They change no pod's identity. The honest boundary case here is
  **`PATCH /api/admin/pod-sentences/:id`**, which edits one sentence's text on a live pod
  and **nulls its audio as a side effect** — one row silent until Phase 8 runs. Not a door
  by the definition, but the largest thing on the not-a-door side of the line.
- **Dated one-off repair scripts** — `revert-cym-n-pod0-move-2026-08-10.cjs`,
  `revert-ita-pod1-partial-2026-08-24.cjs`. They do move rows on live slugs, but each is a
  single-purpose script whose authority is a named diagnosis doc, hard-coded to one course
  and one incident. A class, not standing doors.
- **Multipliers** — `services/pod-bulk-migrate.cjs` drives the generator across every
  pod-0 course, and `PATCH /api/admin/canonical-pods/:id` edits the upstream canonical a
  sync flexes. Both inherit the guards below them.
- **Fixtures** — `e2e/pod-recording/seed-test-course.cjs`, the `zzz_` ops SQL.

**The enumeration that would find a twelfth**, stated so it can be re-run rather than
trusted: list canonical code files matching either pod table (filters above), keep those
carrying `.from('listening_pod*').{delete,insert,upsert,update}` or the SQL equivalents,
and then keep only those that write `pod_id`, `slug` or `id` on a pod row, or delete pod
rows in bulk — a door changes *which* pod is on a slug, not what is in a row. That last
predicate is the one I applied by reading; it is not yet a script, and **that is the honest
limit of this answer**: eleven is a read of 52 files by one pair of eyes, not a mechanised
proof. A `tools/pods/enumerate-doors.cjs` that encodes it and fails CI on an unguarded new
writer is the durable version, and nobody has asked for it.

---

## What you will feel, and what needs you

1. **The green "Generate Pod 0" button now refuses on any course whose pod-0 is served** —
   including a brand-new course with no pod row at all, because creating the core header
   row *is* the moment serving begins. That is deliberate and consistent with `clone-pod`,
   which you already approved behaving this way. The refusal tells the operator to generate
   to a parked slug and switch over. **Taste call for you:** if you want the button to work
   on a virgin course, the smallest safe change is a confirm dialog in `PodsView.vue` that
   appears only when the pod row does not exist, and passes `serveNow`. I did not add it —
   a click-through is cheap, and I would rather you chose it than found it.
2. **`services/pod-bulk-migrate.cjs` will now refuse**, on every pod-0 course, at its regen
   stage: it shells `pod-dialogue-generator.cjs <course> --force` with no `--serve-now`.
   That is the door #93 called a multiplier, working as intended — but it means the bulk
   migration is paused until someone decides whether it should pass `--serve-now` or be
   re-pointed at parked slugs plus a switchover. **My recommendation: parked slugs plus
   switchover**, because that path carries learner progress and the current one does not.
3. **The Release/Hold control in the Popty pods page does not change what learners get.**
   `POST /api/admin/pods/:course/:slug/visibility` writes a column no learner consumer
   reads. That is not new today — #93 proved it — but it is now recorded in the two files
   that claimed otherwise, and it is worth you knowing that "held" has never meant hidden.

---

## Proof

Every guard is proved by a test that FAILED against the current code, with the assertion
failure recorded verbatim in each test file's header. Reds, in the order they were taken:

```
services/pod-generate-guard.test.cjs   (doors A + C, against the route's own pre-fix logic)
  FAIL  REFUSES a request with no slug at all, instead of defaulting to pod-0
    AssertionError: expected undefined to be truthy
  FAIL  REFUSES a generation onto pod-0, the slug the route used to default to
    AssertionError: expected null to be truthy
  Test Files  1 failed (1)
       Tests  11 failed | 7 passed (18)

tools/pod-sync-serving-slug.test.cjs   (door B, against "there was no gate at all")
  FAIL  REFUSES a resync onto pod-0, the slug its own usage examples used to hand you
    AssertionError: expected null to be truthy
  FAIL  names the --serve-now escape, and says the re-inserted rows carry no audio
    TypeError: .toMatch() expects to receive a string, but got object
  Test Files  1 failed (1)
       Tests  8 failed | 3 passed (11)

tools/pods/serving-slug.test.cjs       (the shared rule, incl. the eleventh door)
  FAIL  knows pod-0 and pod-1 are served
    AssertionError: expected [] to include 'pod-0'
  FAIL  REFUSES a held pod — visibility is never a guard
    AssertionError: expected null to be truthy
  Test Files  1 failed (1)
       Tests  9 failed | 4 passed (13)
```

Each red was taken against a scaffold reconstructing the pre-fix behaviour verbatim, which
was then deleted. In every case the tests that PASSED pre-fix are the checks the tool
already had — that is what proves each extraction was faithful rather than a rewrite.

**Green: 66/66** across the five files this job touched
(`serving-slug`, `clone-pod-serving-destination`, `promote-pod-readiness`,
`pod-sync-serving-slug`, `pod-generate-guard`), run by path. No other suite was run.

## Gaps, stated plainly

- **Nothing was exercised against live data.** These are guards; running them would mean
  writing to a live pod, which is out of scope. The DB-reading halves
  (`readServingFactsSupabase`, `progressOn`) are unit-tested only through the pure rule
  they feed.
- **`promote-pod` still does not carry progress.** It warns. That is an interim, named as
  one, with the fix costed above.
- **"Eleven" is a read, not a proof.** See the enumeration section.

---

## Addendum, 2026-09-02 — the progress rule Tom named. It is in the code. Nothing asserted it.

**Tom's words:** "we had a nuance to the progress which was 'the same, or close to the same
sentence, if it's close to the same position in the sequence' else revert to the most
logical position before that."

**It is already implemented, and I preserved it rather than reimplementing it.** It was
ruled and built on 2026-08-14 and lives in `planMigration()` in
`tools/pods/pod-state-migrate.cjs` — the single implementation that `pod-switchover.cjs`
uses, that `planInflightFold()` re-enters verbatim, and that `promote-pod.cjs` will call
once the extraction lands.

**Both conditions, enforced together**, in `resolve()`:

1. **Text** — exact after normalisation (whitespace, case, typographic quotes and dashes;
   *not* punctuation, because "Five. Ten." and "5. 10." are correctly not the same thing to
   hear). Note this is **stricter than "close to the same"**: a reworded line counts as new,
   never as a survivor. That is deliberate and it errs in the safe direction — a stricter
   match drops more rows, and dropping is backwards.
2. **Position** — the *corresponding* scene, where scenes are corresponded **by content
   plurality, not by number**, plus a shift of at most 8 places within it. That two-part
   bound is not a guess: it was measured over all 4,062 content matches across 37 courses
   (`docs/pods/a107-position-bound-2026-08-14.md`). An index window would have been wrong —
   the pod grows 142 → 232 rows, so every survivor shifts, median 10 and up to 90. The
   scene is the invariant, which is what lets old scene 15 legitimately become new scene 22.

**The asymmetry holds.** Every failure path — text absent, text ambiguous, relocated to a
different scene, moved too far within it — **drops the state row**. A dropped row means the
sentence is unseen again, which is strictly backwards. Nothing in the plan can carry a
learner onto a sentence whose text they did not hear; that invariant is now asserted over
every action, not just the interesting one.

### What was actually missing: the proof

`planMigration()` **had no direct test file.** It was exercised only sideways, through
`pod-switchover-inflight.test.cjs`'s fixtures. The rule most likely to be quietly
simplified by a refactor was the one nothing asserted — which is exactly the risk the
extraction would have run into. `tools/pods/pod-state-migrate-position.test.cjs` now holds
it, and the header of `pod-state-migrate.cjs` records Tom's restatement verbatim as the
invariant any refactor must preserve.

**Recorded red, against the naive slot map** — what a swap does with no migration at all,
and what a "simplification" of `planMigration` collapses into:

```
FAIL  REFUSES to carry a sentence relocated to a different scene, though the text is identical
  AssertionError: expected 'carry' to be 'drop' // Object.is equality
FAIL  REFUSES to credit the learner with the new sentence sitting in their old slot
  AssertionError: expected 'i would like to pay by card' to be 'where is the station?'
FAIL  LANDS THE LEARNER EARLIER, NEVER LATER, when no close match at a close position exists
  AssertionError: expected 'carry' to be 'drop' // Object.is equality
FAIL  NEVER credits a learner with text they did not hear — the invariant, over every action
  AssertionError: expected 'i would like to pay by card' to be 'where is the station?'
FAIL  REFUSES a slot whose sentence was reworded — a changed line is a new line, never a survivor
  AssertionError: expected 'carry' to be 'drop' // Object.is equality
FAIL  carries progress across a renumbered scene whose content moved together
  AssertionError: expected [ 'drop', 'drop', 'drop' ] to deeply equal [ 'carry', 'carry', 'carry' ]

Test Files  1 failed (1)
     Tests  6 failed | 1 passed (7)
```

Read the last two together: **the slot map carries the thing it must drop** (an unheard
line at the same index) **and drops everything it must carry** (a whole scene that moved
together, the learner's position intact). Text without position and position without text
are wrong in opposite directions. 8/8 green against the real implementation.

### One decision candidate, flagged and NOT changed

**The merge branch rounds UP.** When two old rows collapse onto one new sentence,
`planMigration` keeps `Math.max` of their exposures. Under your asymmetry the safe choice
is `min`: `exposures` is a maturity counter, and a higher value means the line is *served
less often*, so rounding up advances a learner past material they are only part-way through.
It is the one place in the rule that rounds up rather than down.

I did not change it — it re-schedules real learners, which is your call, not a refactor's.
Today's behaviour is now pinned by a test whose own comment says it asserts the current
answer rather than the right one. **My recommendation: switch it to `min`.** One word, and
it makes the file honour its own stated rule everywhere. Say the word and it is a ten-minute
job with the test flipped in the same commit.

### What this changes about the extraction

Nothing about its shape, and it makes it safer: the rule now has a test that fails against
a slot map, so the extraction cannot quietly simplify it and pass. That test is the thing
the next job should run first and last.
