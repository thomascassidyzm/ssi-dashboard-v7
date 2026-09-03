# The ratification pass — 2026-08-31

> **SUPERSEDED IN ONE RESPECT — the slug was renamed on 2026-09-01.** Where this
> document says `pod-0` is the live canonical slate, read **`pod-1`**: the live slate
> was renamed `pod-0` → `pod-1` that day, and the sacked slates that then held the
> names `pod-1` (236 rows) and `pod-0.5` (27 rows) were archived and deleted. The
> content, counts and findings below are unchanged and still stand — 231 rows, 22
> scenes — only the name moved. See
> [the migration note](./canonical-pod-slug-migration-2026-09-01.md).

The prior job (docs/pods/pod-union-coverage-2026-08-31.md, merged at `cc49c3776`) classified the
Method Pod's "170 unmapped lines" and found zero unmapped material: every scene declares a shape;
the names resolved to nothing in the store. This pass ratifies the reading work — loads what
deserves loading, rejects what does not — and repairs the instruments. **No dialogue was authored.**
Every decision below is one line and overturnable in one line.

Naming, per Tom's ruling this sitting: **CORE** is the compulsory walk (the live POD 1, table slug
`pod-0` — the off-by-one hazard stands); everything else is an **optional walk**. `pod-0.5` and the
social `pod-1` are sacked and appear nowhere below.

## Accepted into the store

| Ids | From | Why |
|---|---|---|
| N301–N306 | talk-bollocks | Attested discursive shapes with positions and quotes; five Method-Pod scenes and two flagship chapters stage them by name. N305 and F306 carry their authors' `thin` flags into the store — each was minted on one attestation, but scenes now stage both by name, which is the demand the thin flag was waiting for. |
| F301–F306 | talk-bollocks | The move families the pods declare by phrase; F302's quote is scene 2's flag line verbatim. |
| C301–C302 | talk-bollocks | Composition attested inside the accepted nodes. |
| S301–S305 | talk-bollocks | **The first five survivability edges whose `answer_slot_class` is `failure` with an attested recovery** — the class the corpus null result said was withheld. Load-bearing for the recovery-attachment work. |
| N902, N903, N907, N908, N909 | method-pod mint candidates | Genuinely homeless shapes: the razor (the dismantling exchange — its deployment as a shared line stays F303), public position-abandonment, the misreading corrected, complaint-with-partner-turn, story → matched story. Positions were transcribed from their ratified glosses — structure, not dialogue. |
| N501 | trades | Tom's ruling, applied: care work independently re-derived it. |
| F601 | care work | Tom's ruling, applied: "answer the need, not the question". |

## Rejected — and where each scene lands instead

| Id | Verdict |
|---|---|
| N901 the flagged guess | REJECT → **F302**. Its gloss quote ("I'm out of practice… one roll of the dice") is F302's own attested passage; minting it would be the same shape twice. |
| N904 the mirrored tease | REJECT → **N11** walked with inverted polarity — talk-bollocks reading A, its recorded verdict. |
| N905 the metaphor handover | REJECT → **N301** at arc scale, per its recorded "an arc, not a second mint". |
| N906 the stacked commission | REJECT → **F1** — the recorded verdict is "lands on F1, with strain"; the stack-management is walk behaviour, not a position. |
| N910 the listener names it | REJECT → **F301** — "deliberately consolidated rather than minted twice" is already the ruling on the page. |

Sector proposals (health 1xx, ireland 4xx, trades' edges, care work's edges, retail 7xx,
hospitality) were **not** ratified — only the two ids Tom ruled on. They stay proposed.

## The m→store crosswalk (the 12-line gap, closed)

`M_CROSSWALK` in `tools/pods/pod-shape-aliases.cjs` — declared, never guessed. 20 of 23 m-tokens
land on ruled ids (m2→N301, m8→F303, m9→N302, m13→N902, m23→N14, …). Three stay **unresolved by
ruling**: m6 self-repair, m14 abandonment, m15 solo enacted dialogue — intra-turn phenomena, not
exchange positions; the store is a graph of exchanges. The judgement call in the set: **m9 "live
intrusion folded back" → N302** — the flag is optional by N302's own gloss, the external cause is
walk colour, and the fold-back is N302's position 5 (detour claimed as evidence).

## The scene-4 over-mapping, resolved

Scene 4 ("Dov'eravamo?") was aliased to N6 Repair because /reformulation/ matched its declaration.
The N302 alias now sits above N6 in the table and the row re-aliased **N6 → N302** in the DB.

## The instrument repairs (three, all with regression tests)

1. `coverage.js` — a stored pod's `global_order` no longer masquerades as a pod-0 g-number. This
   was why all four pods reported an identical "10/15 survivability exercised"; stored-walk pods
   now honestly report 0 exercised (they walk in their own reference space).
2. `walk.js` — a scene declaring a resolved **outcome** or **move** is mapped, not unmapped
   residue. The outcome-mint scenes (the pod's most deliberate content) stop reading as zero.
3. `coverage.js` — **all** of a scene's declared outcomes count, not just the first. Chapter 10 of
   the chapters cut declared O4+O6+O7 all along; the union doc's "port the outcome declarations to
   the survivor" caveat is retired — **both Method Pod cuts now deliver all nine outcomes.**

## Applied to the live walk steps, and verified

`tools/pods/reresolve-walk-steps.cjs` (new; dry-run first, before-state asserted per row, logs in
`docs/pods/walk-step-reresolve-2026-08-31-{dryrun,applied}-log.json`): **144 steps re-resolved, 80
unchanged, 11 honestly unresolved** (4 by the m6/m14/m15 ruling; 7 named phrases — "THE RECUT",
"THE THIRD POSITION", "the deflating close", "aphorism against aphorism", two flagship narration
lines — whose scenes all map through other declarations anyway).

`measure-coverage.js` after the apply:

- method-pod-43-scene: **276 mapped, 0 UNMAPPED** (was 170 unmapped)
- method-pod-chapters: **309 mapped, 0 UNMAPPED** (was 94); **9 of 9 outcomes delivered**
- learning-flagship: **367 mapped, 0 UNMAPPED** (was 130)
- pod-0 (CORE): unchanged at 125 — its remainder is drill frames below the exchange grain and
  representative-attestation rows, a different mechanism, out of this pass's scope.

Store self-check, verbatim final lines:

```
360 checks passed, 0 failed.
The store reproduces every count in docs/pods/shape-graph-2026-08-30.md.
```

`tools/metagraph/coverage-test.js`: `19 checks passed`. `tools/pods/parse-pod-markdown.test.cjs`:
`all passed` (its two assertions of the OLD behaviour — "m never crosswalked", "summit shapes never
aliased" — were flipped deliberately, gate and tests in lockstep).

## ID range

This job takes **10xx** (unheld: 1xx–5xx, 6xx, 7xx, 8xx, 9xx are held). Nothing was minted in it;
it is reserved for the recovery-attachment proposals in
`proposed/core-recovery-attachments-2026-08-31.json` if ratification later wants ids.
