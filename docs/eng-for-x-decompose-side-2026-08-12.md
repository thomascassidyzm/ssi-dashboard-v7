# The decompose-side ruling, applied to eng_for_X — and the 76% queue that isn't there

2026-08-12. Read-only audit of 19 `eng_for_X` courses plus the whole 178-course estate, two brief
corrections, one decision-log entry, and one applied fix of 54 learner-facing rows.

---

## The headline

**The ruling was already true of the data. It was false in exactly two documents.**

Tom's ruling: a decomposition always preserves **target**-language word order, so the learner sees
how target grammar maps onto what they already know, with the known side deliberately reading
wrong where the orders differ — `cosa azul` reads literally as "thing blue". Applied to
`eng_for_X`, English is the target, so the **English** side is decomposed.

I audited every stored decomposition in all 19 `eng_for_X` courses — **193,201 phrases**. Of those,
**zero decompose the known side.** Between 99.2% and 100% per course, the chunk sequence rebuilds
the *target* English text exactly, in order. The remaining 0.3% is stale drift, not a side choice —
I read all 32 of the rows my classifier put in the "known-recomposing" bucket and every one turned
out to be a decomposition frozen against an older version of its own target text.

So there was nothing to unblock in the content. What there *was* to fix: the two briefs that told
builders to do the opposite.

## The honest gap: there is no eng_for_X QA queue at 76%

I could not find it, and I looked in every place it could be. Reporting this as an explicit gap
rather than forcing a fit:

| Where I looked | What I found |
|---|---|
| `WORKLIST.md` | one `eng_for_X` line, unclaimed, about Big-10 semi-builds — not a QA queue |
| `course_practice_phrases.qa_checked`, all 19 courses | 17 courses at **0%**; `eng_for_ara` 97.9%, `eng_for_jpn` 86.8% — and both of those were stamped in a **single bulk event on 2026-02-17**, so neither is a live queue |
| `course_seeds.approved_at` | courses sit at 44.8–44.9% (the seed-300 MVP frontier) or 91.9–100%. Nothing near 76% |
| decomposition coverage | 96.2–100% per course. Nothing near 76% |
| the worker job history (2,974 jobs) | no stalled `eng_for_X` QA job |
| `docs/indian-languages-programme-status-2026-08-06.md` | the 14 `eng_for_*` courses are 668/668 decomposed, 100% audio — content finished |

The nearest number to 76% in the estate is `eng_template` at **77.4% stale gloss blocks**
(`docs/gloss-mapping-bug-2026-08-12.md`) — a template, not a course, and not a QA queue.

**The decompose-side question is real, but it is live in a different thread**: today's Basque
gloss-mapping work (jobs "Basque gloss mapping bug (Deborah)" → "gloss-blast-radius" →
"land-eus-gloss-fix-and-run-all"), and job **#389**, the inline component-mapping editor, which
already received the ruling as *"target-order-preserving display, and segmentation-of-known-text
(not word-pairing) as the edit model"*. That framing and this one agree: the target blocks fix the
sequence, and you segment the known text to sit underneath them.

## What I changed

**1. `.claude/commands/eng-for-jpn-build.md`** said, in the "What This Course IS" section:

> - **LEGOs** decompose the Japanese known text into chunks, each mapping to an English target chunk

That is the wrong side, stated plainly, in the brief for a course that still has **368 of 668 seeds
undecomposed**. Every future builder would have read it. It now reads "decompose the **English
target text**", followed by a new *"Which side gets decomposed — the TARGET, always"* section with
the `cosa azul` law and a worked right/wrong pair on the course's own seed 1.

**2. `.claude/commands/layered-decomposition-brief.md`** was headed **"Layered Decomposition Brief —
eng_for_jpn"** and described itself as covering "Japanese→English seeds" — but every LEGO in it is a
Japanese chunk with an English gloss, and its whole teaching point is revealing *Japanese* word
order. That is the `jpn_for_eng` direction. Under the `eng_for_jpn` label it was the strongest
wrong-side instruction in the estate: it told an `eng_for_jpn` builder to decompose the known side
and gave them six worked examples of doing it.

It is now correctly headed `jpn_for_eng`, with a note saying why the old header inverted it and
pointing `eng_for_jpn` builders at the other brief. I did **not** rewrite its Japanese examples —
they are correct for the direction it actually covers, and inventing English-target replacements
would have created new unreviewed content to solve a labelling problem.

**3. `docs/DECISIONS.md`** — the ruling is journalled with its Better/Simpler/Cheaper narrative and
the two options I searched and rejected.

## The defect I found on the way — 54 rows, fixed

`eng_for_mar` is **live**. Commit `f18c4023` stripped a leaked `[introduce:false]` authoring
directive from 53 lego cards and 53 phrase rows — but not from the **frozen decompositions**, which
the player renders to the learner verbatim (`LearningPlayer.vue`, "Strategy 0 (authoritative)").

54 rows still carried it. A Marathi learner's breakdown read:

```
to leave [introduce:false]
down [introduce:false]
bus [introduce:false]
```

Fixed via a gated script (`scripts/engforx-decompose/fix-introduce-leak.cjs`): dry-run first,
per-row before-state assertion, and a hard gate that the stripped blocks must recompose the
phrase's own `target_text` **exactly** or the row is skipped unwritten. 54/54 passed the gate,
0 skipped. Residue re-checked: **0 rows** estate-wide still contain the directive, and
`eng_for_mar`'s target-recomposition rate moved 12,760 → 12,814 — exactly the 54, nothing else
touched.

One thing worth keeping: my first apply attempt **aborted on a false drift alarm**, because the
before-state guard compared `decomposition::text` against `JSON.stringify`. Postgres renders jsonb
with its own key order and spacing, so that comparison can never match. This is the identical trap
commit `771a7001` fixed in the undo path ("the undo compared jsonb by key order, so it rolled back
nothing"). The guard now compares `jsonb = jsonb`. **Anything else in the estate comparing stored
jsonb as text is silently broken the same way** — worth a sweep.

## The bigger number nobody is tracking

While auditing I ran a **recomposition-integrity** check across all 178 courses — does each stored
decomposition still rebuild its own `target_text`? This is a stronger detector than the existing
version-stamp drift check, because it reads content rather than bookkeeping.

**5,161 of 613,801 decomposed phrases (0.84%) no longer rebuild their own target text**, across 89
courses. These render to learners verbatim. Examples:

| row | target text | what the learner's breakdown says |
|---|---|---|
| `eng_for_jpn:S0165L02C03` | "I don't understand" | "I'm not sure" |
| `eng_for_mar:S0223L01B03` | "he's going to ask you" | "he's going to not sure" |
| `eng_for_deu:S0216L01B01` | "I met someone" | "I saw someone" |

Worst affected: `hye_for_eng` **47.6%** (2,658 rows), `spa_for_eng` 6.2% (977), `eus_for_eng` 2.3%,
`deu_for_eng` 2.1%, `ita_for_eng` 1.4%, `hrv_for_eng` 1.6%. Full row list:
`scripts/engforx-decompose/recompose-broken.json`.

`hye_for_eng` at nearly half the course is not drift — that is a structural break and deserves its
own look before anything is swept.

**I have not fixed any of these**, and deliberately so: unlike the `[introduce:false]` leak, there
is no provably-correct value to write. Repairing them means re-decomposing against current
vocabulary, which is `decomposeAnchored`'s job and needs the salient-LEGO parent — precisely the
constraint that commit `157db59d` flagged as the reason the backfill's selection predicate was
*not* widened. That is a decision to price, not an edit to make.

## Tools left behind

All in `scripts/engforx-decompose/` (gitignored workspace, listed here so the work is repeatable):

- `audit-side.cjs` — which side does each `eng_for_X` decomposition segment? Per-course table.
- `audit-recompose.cjs` — estate-wide recomposition-integrity audit; writes `recompose-broken.json`.
- `known-side-rows.cjs` — dumps any row recomposing the known side, for reading in context.
- `fix-introduce-leak.cjs` — the gated fix, `APPLY=1` to write; dry-run and applied logs alongside.
