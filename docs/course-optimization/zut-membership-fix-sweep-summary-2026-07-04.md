# ZUT membership-failure FIX SWEEP — summary, 2026-07-04

*Fixes the 148 component target-membership failures found by the rescoped audit
(`zut-rescope-component-rows-2026-07-04.md`, commit `1cde09e5`): 72 fra_for_eng +
76 spa_for_eng. Follows the read-every-item-against-its-own-seed-and-siblings
method of `zut-violation-sweep-pilot-fra-40.md` (commit `c9dae030`). Triage was
fanned out across 4 parallel passes (fra batch 1/2, fra batch 2/2, spa batch
1/2, spa batch 2/2, ~36-38 items each); each item was read against its own
seed's full sentence plus every sibling row at the same `seed_number` before
being classified — never against the bare fragment.*

## Result: 99 orphans deleted, 5 near-miss fixes applied, 44 judgment calls logged (no action)

| | fra_for_eng | spa_for_eng | total |
|---|---|---|---|
| (a) confirmed orphan → **deleted** | 47 (15 + 32) | 52 (28 + 24) | **99** |
| (b) near-miss/contraction → **fixed** | 2 | 3 | **5** |
| (b) near-miss attempted, **rejected by the ZUT gate itself** (reverted, downgraded to judgment) | 1 | 0 | **1** |
| (c) genuine judgment → **logged only** | 22 | 21 | **43** |
| **Total** | **72** | **76** | **148** |

**Audit re-run confirms the reduction, both courses, nothing new appeared:**

| | before | after |
|---|---|---|
| fra_for_eng [2] target-membership failures | 72 | **23** |
| spa_for_eng [2] target-membership failures | 76 | **21** |
| fra_for_eng [1] bidirectional strict (untouched, LEGO/BUILD/USE) | 110 | 110 |
| spa_for_eng [1] bidirectional strict (untouched, LEGO/BUILD/USE) | 338 | 338 |

Remaining 23 (fra) + 21 (spa) = 44 are exactly the logged judgment calls — expected,
not a miss. (110/338 unchanged confirms the LEGO/BUILD/USE bucket was not touched,
per task scope.)

## (a) Confirmed orphans — 99 deleted

Component row's `target_text` has **zero relation** to its own seed's sentence,
and a correct sibling (LEGO/BUILD/USE, or another component at the same
`lego_index`) already teaches the real chunk — deleting loses no learner-facing
content. Applied via gated scripts with per-row before-state assertions (abort
on drift) — dry-run verified before every live run:

- `tools/course-optimization/apply-zut-triage-fra-batch1.cjs` (15)
- `tools/course-optimization/apply-zut-triage-fra-batch2.cjs` (32, applied earlier this sweep)
- `tools/course-optimization/apply-zut-triage-spa-batch1.cjs` (28)
- `tools/course-optimization/apply-zut-triage-spa-batch2.cjs` (24)

## (b) Near-miss / contraction — 5 fixed, 1 blocked by the gate

Fixed via `tools/course-optimization/apply-zut-triage-nearmiss-fixes.cjs` (same
gated pattern as `PATCH /phrases/:id`: write, then `checkEditedPhrase` verifies
no new ZUT collision and auto-reverts if one appears):

| id | known → before → after | why unambiguous |
|---|---|---|
| fra `S0093L01C02` | time to: temps de → temps d' | elision (de+y→d'y), matches seed's own text exactly |
| fra `S0440L02C01` | while: pendant que → pendant qu' | elision (que+ils→qu'ils), matches seed's own text |
| spa `S0419L02C01` | likes: aprecia → aprecie | subjunctive mood required by "quieren que"; sibling build already correct |
| spa `S0427L01C01` | you thought: pensabas → pensaras | subjunctive mood required by "no les gustaría que"; LEGO already correct |
| spa `S0426L04C01` | unhappy: infeliz → infelices | plural agreement; identical-known sibling LEGO/build already correct |

**One rejected by the gate itself**, not applied: fra `S0664L01C01` ("are you
ready" → "êtes-vous prêt"). The intended fix (→ "êtes-vous prêts", correcting a
real singular/plural slip) was written, then `checkEditedPhrase` rejected it as
a target-membership violation and reverted automatically — because the seed
("Êtes-vous **tous** prêts ?") interposes "tous" between the two words, so no
value for this row can pass strict contiguous-substring containment. Row is
unchanged. This needs Tom's read: it has both a genuine number-agreement bug
*and* an interposed-word false-positive stacked on the same row, and the
current gate can't express "fix the agreement, tolerate the interposition."

## (c) Judgment calls — 44 logged, no action

Two very different flavors:

**Grammar the check can't see (~34 of 44)** — elision (que→qu'il, de→d',
parce que→parce qu'ils), interposed words (tous, le plus, object-pronoun
infixes), reflexive/agreement mismatches, clitic fusion (Spanish al/dárselo/
déjame), and a documented pipe-annotation convention (`"deja | me → me"`) the
substring check doesn't parse. Not defects — the audit is checking a unit
(literal contiguous substring) that doesn't hold for these constructions. Full
per-row detail in `scripts/zut-membership-triage/results-*.json` and
`docs/course-optimization/zut-membership-triage-spa_for_eng-batch2.md`.

**Real decision candidates for Tom (~10 of 44)** — the component is fine but
disagrees with its own **seed's** `target_text`, while every LEGO/BUILD/USE
sibling agrees with each other against the seed:

- fra seed 319: seed says "un autre pays", every sibling says "un pays différent" — which should the master sentence use?
- spa seed 578: seed says "un sitio más cálido", every sibling says "algún lugar más cálido"
- spa seed 488: seed elides "al otro lado", every sibling uses "el otro lado" (rest of the phrase differs too)
- spa seed 580: seed says "muchas veces", every sibling says "a menudo"
- spa seed 510: seed drops "se" and says "sitio", every sibling says "se ha ido a"/"un lugar seguro"
- spa `S0664L01C01` (see above, gate-rejected fix)
- spa `S0495L01C01`: unclear pipe-annotation row, needs a read
- fra `S0055L02C02`: interposed-adverb ("très bien") case — policy question on whether to exempt from the check
- fra `S0140L01C01`: a LEGO that legitimately paraphrases its own master sentence with a different construction — policy question on whether the membership check should compare against the LEGO's own target instead of/in addition to the seed's

## Origin-pattern finding: the majority of orphans trace to a single batch-generation event

Every triage pass independently found the same signature, unprompted:

- **fra_for_eng**: ~35 of 47 deleted orphans cluster in a **~40-second window,
  2026-03-11T19:34:22–19:35:01 UTC**, almost all at **version 15/16**. The
  remainder trace to a second, smaller event around **2026-05-23** (version
  9/10) with a different symptom (wrong-time-expression substitution, e.g.
  "yesterday"/"hier" and "evening"/"soir" both wrongly filling the same
  lego_index slot that should read "last night"/"la nuit dernière").
- **spa_for_eng**: orphans cluster in **two** windows — batch 1's ~28 orphans
  were minted in a **2026-03-11 ~17:06–17:08 UTC** pass (their correct sibling
  content dates from **2026-02-17**, three weeks earlier); batch 2's 24 orphans
  match the same **2026-03-11 ~17:06–17:08** signature (bare tense/modal drills
  — "She used to"/"He could"/"They should" — bled onto unrelated seeds, several
  seeds carrying two stray components at once).

**This means the debris is not per-seed authoring error — it's a small number
of batch-generation/regeneration events (concentrated on 2026-03-11, with a
secondary 2026-05-23 event) that wrote component rows under the wrong seed
across many seeds at once.** Worth grepping `course_practice_phrases` course-wide
for `phrase_role='component'` rows stamped in those exact windows as a fast way
to find remaining debris in other courses without per-row LLM triage.

## Files
- `tools/course-optimization/apply-zut-triage-{fra-batch1,fra-batch2,spa-batch1,spa-batch2}.cjs` — gated delete scripts (dry-run + live, before-state assertions).
- `tools/course-optimization/apply-zut-triage-nearmiss-fixes.cjs` — gated edit script (write + `checkEditedPhrase` verify/revert).
- `tools/course-optimization/zut-triage-*-{dryrun,applied}-log.json` — per-row action logs.
- `tools/course-optimization/zut-audit-{fra_for_eng,spa_for_eng}.json` — fresh post-fix audit snapshots.
- `scripts/zut-membership-triage/` (gitignored) — per-batch input context dumps and raw triage results, kept locally for provenance.
