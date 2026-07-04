# ZUT violation sweep — PILOT (fra_for_eng, first 40), 2026-07-04

*Follow-up to `zut-compliance-audit-2026-07-04.md` (which counted but did not triage). This
pilot took the first 40 `violationsStrict` groups from a fresh re-run of
`tools/course-optimization/audit-phrase-zut.cjs` (340 groups, stable vs. the prior audit) and
classified each per the owner's rubric: (a) mechanical dup fix, (b) clean rewrite, (c) cut it
out, (d) taste-fork — log only, no action. Reproducible: `node
tools/course-optimization/audit-phrase-zut.cjs`, then `tools/course-optimization/apply-zut-pilot-fra-40.cjs`
(DRY_RUN=1 first).*

## Result: 3/40 groups had a confirmed mechanical defect (4 rows, all cut). The other 37/40 are not mechanical defects — they're grammar the audit can't see, or genuine synonym choices

For each of the 40 groups, every seed's **full master sentence** (`course_seeds`) plus every
sibling row at the same `seed_number`/`lego_index` was pulled and read in context (not just the
bare known/target fragment the audit reports) — the same depth `ralph-methodology.md`'s ZUT
section demands: ZUT governs **intentions** (LEGOs, and practice phrases as whole units, line
172/503), not raw per-word decomposition splits. Reading each collision against its full
sentence separated three very different root causes hiding inside one "violation" count:

### (c) Cut — 3 groups, 4 rows, all confirmed via direct evidence, all applied
These are the only genuine *defects* found: a `course_practice_phrases` row with
`phrase_role:'component'` whose `known_text` demonstrably does not describe its own sentence —
provable by reading the seed's master sentence and sibling rows, not a judgment call.

| Group | Row(s) cut | Why it's a confirmed bug |
|---|---|---|
| **book** (#9) | `S0164L01C01` ("an interesting"→"un livre"), `S0164L01C02` ("book"→"intéressant") | Adjective/noun word-order crossing: French postposes the adjective ("un livre intéressant"), and this pair's two English/French halves got swapped relative to every other adjective+noun seed checked (e.g. seed 408 "a family"/"happy" splits correctly) — "book" cannot mean "intéressant". |
| **that** (#21) | `S0364L04C02` ("that"→"dire") | Orphan of the idiom "entendu dire" ("heard tell") — "dire" ("to say") has no defensible English equivalent; forcing a 2-way component split of the idiom mislabeled the leftover half as "that". |
| **to pay** (#40) | `S0428L02C02` ("to pay"→"rendre") | Orphan of "rendre visite" ("to visit"); the seed's master sentence ("would they like to **visit** us on Tuesday?") has nothing to do with paying. Renaming to the technically-accurate label ("to") was rejected — it would immediately collide with dozens of unrelated "to" components elsewhere in the course, trading one violation for another. |

Every cut row was an orphan `component` breakdown row, never a LEGO, BUILD, or USE row — the
correctly-combined teaching phrase for each (e.g. `S0164L01B01` "an interesting book"→"un livre
intéressant", `S0428L02B01` "to visit us"→"nous rendre visite") was already correct and is
untouched. **Zero learner-facing content was removed** — only the internal tiling artifacts.
Fixes applied via `tools/course-optimization/apply-zut-pilot-fra-40.cjs` (before/after
assertions per row, dry-run verified first, no raw writes). Post-fix audit re-run: strict count
340 → 339 (only the fully-resolved "to pay" group vanished; "book" and "that" remain flagged —
correctly — for their unrelated residual collisions below).

### (a)/(b) — 0 groups
No group in this batch was a stale-duplicate-with-a-clean-sibling (the `apply-tu-default-pass`
/ parentheses-pilot pattern) or a same-known rewrite that removes ambiguity by picking a more
natural phrasing. Every non-bug collision in this batch is one of two things a text substitution
can't fix without either breaking a correct sentence or re-tiling the decomposition:

### (d) — 37 groups: log only, no action. Two very different flavors underneath

**d1 — not a real ZUT violation; the audit (and the live gate) is checking the wrong unit (≈29 of 37).**
`checkPhraseZUT` and this audit tool check every `course_legos` + `course_practice_phrases` row
indiscriminately, including `phrase_role:'component'` rows — but a component is a per-sentence
word/chunk alignment gloss, not an atomized "intention" (LEGO) in the sense `ralph-methodology.md`
defines ZUT over (lines 172, 503). In every one of these ~29 groups, all the actual **LEGOs**
for the known text agree with each other; the "collision" is always a LEGO/BUILD vs. a
`component`, or `component` vs. `component`, and the reason is one of:
- **Grammatical gender/number agreement** the isolated English lemma can't carry: *tired*
  (fatigué/fatigués), *possible* (possible/possibles), *ready* (prêt/prêts), *beautiful*
  (beau/beaux), *new* (nouveau/nouvelle), *a friend* (un ami/une amie).
- **Reflexive-pronoun agreement**: *to stop* (s'arrêter/t'arrêter).
- **Verb-government of a linking preposition** ("de"/"à" required or not, depending on the
  governing verb, invisible to the bare English chunk): *something else*, *something*, *to
  help*, *to have*, *to lose*, *to try*, *to talk to*, *to reach*, *to appear*, *home*, *near*,
  *before*, *of course*.
- **True polysemy of an English function word**, each rendering correctly per its own
  grammatical role: *that* (ce/cette/cet/ça/cela/que/qu' — minus the 1 cut row), *how*, *no*,
  *there*, *left*, *anywhere*, *they had*.
- **Bare-noun BLD vs. article-bearing USE** (probably working as designed, not a defect at all):
  *half* (moitié/la moitié), *family* (famille/la famille).

**d2 — genuine synonym/register choice, real content decisions (8 of 37).** These are exactly
what `synonym-choice-architecture.md` governs — translation-choice applied *before*
decomposition — and need Tom's ear, not mechanical resolution: *worried* (avoir peur /
s'inquiéter), *almost* (presque / faillir + infinitive), *more* (davantage / plus / encore),
*way* (façon / moyen / voie), *to ask* (demander / poser), *somewhere* (quelque part / un
endroit), *we should* (nous devrions / qu'on devrait — register), *still* (encore / quand même).

**One-off — idiom literal-gloss ambiguity (1 of 37).** *the one* (#10): `celle`/`celle là` as
an actual referential pronoun ("the one who is standing…") vs. a `component` row that
literally back-glosses the reciprocal idiom "l'un…l'autre" ("each other") word-for-word as "the
one"/"the other". Plausibly an intentional SSi convention for showing idiom literals — didn't
cut it blind since I can't confirm from this pilot alone whether it's consistent
course-wide; flagging for a read rather than guessing.

## What this means for the remaining ~300 fra + ~473 spa violations

**This pilot's biggest finding isn't the 4 rows cut — it's the shape of the distribution.**
93% of a first-40 sample were not mechanical at all. If that ratio holds, most of the remaining
violations are not fleet-sweepable by more scripts like this one. There are two decision points
that would each resolve a large slice at once, cheaper than per-item triage:

1. **Narrow what the audit (and possibly the live gate) actually checks.** If `component`-role
   rows are internal per-sentence tiling glosses rather than atomized intentions, scoping
   `checkPhraseZUT`/the audit to LEGO + BUILD + USE rows only (excluding bare `component` rows)
   would likely silently clear the ~29-of-37 d1 bucket above, course-wide — a one-time policy
   call, not per-seed work. This needs verification against a larger sample before acting course-wide.
2. **The d2 bucket (register/synonym choice) still needs human/agent judgment per item** — it
   cannot be batch-resolved, but it's a much smaller, genuinely interesting slice (~20% of the
   real remainder, on this sample).

## Decision candidates for Tom (one-liners)

- Scope `checkPhraseZUT` (and this audit) to LEGO/BUILD/USE rows, excluding `component` rows — resolves the majority of remaining violations without touching content? (See d1 above.)
- *worried*: avoir peur vs. s'inquiéter — pick one register, or is context-dependent variety fine here?
- *almost*: presque vs. faillir+infinitive — same call.
- *more*: davantage vs. plus vs. encore — three-way register spread, worth consolidating?
- *way*: façon vs. moyen vs. voie — three genuinely different nouns; keep all three or narrow?
- *to ask*: demander vs. poser (poser une question idiom) — keep both or standardize?
- *somewhere*: quelque part vs. un endroit — keep both or standardize?
- *we should*: nous devrions vs. qu'on devrait — register call (formal subjunctive-adjacent vs. colloquial on).
- *still*: encore vs. quand même — same call.
- *the one* (#10): is the idiom literal-gloss ("l'un"/"l'autre" as "the one"/"the other") an intentional, consistent SSi convention, or should component glosses avoid reusing phrase-level English words?

## Files
- `tools/course-optimization/apply-zut-pilot-fra-40.cjs` — the gated fix script (dry-run + live modes, before/after assertions, no raw writes).
- `tools/course-optimization/zut-pilot-fra-40-{dryrun,applied}-log.json` — per-row action logs.
- `tools/course-optimization/zut-audit-fra_for_eng.json` / `zut-audit-spa_for_eng.json` — fresh post-fix audit snapshots (strict tier only, per the audit tool's existing convention).
