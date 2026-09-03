# Frame-ZUT, and the pattern-diversity metric

Two artefacts in one file because they are the same idea from two sides: **one gate, named, that a machine can apply.** ZUT did it for surface forms; frame-ZUT does it for frames, and the metric scores whether a phrase basket actually did the job.

---

## 1. Frame-ZUT — the checkable rule

> **For every SPLIT pattern, the known side must carry the trigger that disambiguates it.**

A SPLIT (see `pair-mapping-classes.md`) is one English frame that the target realises two or more ways. If the known-side prompt does not contain the material that selects between them, the learner cannot produce the right one and is being asked to guess — the frame-level version of the same fork ZUT exists to forbid at word level.

**Checkable form**, as a builder can run it:

```
for each phrase P in a basket for seed S:
  for each split X applicable to S (from spanish-structural-splits.json):
    if P's target realises outcome O of X:
      P's known side MUST contain X.trigger_marker for O
      else -> FRAME-ZUT VIOLATION
```

Worked, on the pair this whole job turns on (S7, the double-'d):

| known side | trigger present | required target | verdict |
|---|---|---|---|
| I'd have driven | main-clause `'d` | `habría conducido` | ok |
| if you'd told me | if-clause `'d` | `hubieras dicho` | ok |
| I'd have driven if you'd told me | both, positionally distinguished | `habría … hubieras …` | ok |
| *I'd driven* (no clause structure) | ambiguous — could be either | either | **violation** |

The trigger for S7 is positional (which clause the `'d` sits in), for S1/S2/S3 it is a subject switch, for S4 it is matrix negation, for S5 it is specificity of the head noun. Every split in `spanish-structural-splits.md` names its trigger in the `Trigger:` line; that line *is* the rule for that split.

### The reverse direction: minting from nothing

For `eng_for_X` courses the same table is read backwards and stops being a disambiguation rule — it becomes a **minting** requirement. Verified live, seed 600:

| course | seed 600 target (= its learner's known side, for eng_for_zho) |
|---|---|
| eng | I'd have driven if you'd told me how tired you were |
| zho | 如果你告诉我你有多累，我会开车的 |
| jpn | 疲れてるって言ってくれてたら運転した |

The Chinese side marks no counterfactual, no tense, no articles, no plurals. An `eng_for_zho` learner at this seed must **mint** English machinery their known side never marks — so on that side of the table the requirement is not "carry the trigger" but "teach the minting, because there is no trigger to carry and there never will be". **Same table read backwards is the other direction's curriculum.**

### The sequencing claim, corrected

The write-up says "vocabulary is sequenced; frames are free". That is stated too broadly. Watson's correction, and it is the form that goes in the artefact:

> **Deterministic frames are free.** Their difficulty really is carried by the words, so a frame attested at seed 500 is usable at seed 260 wherever attested fillers exist.
> **Split frames are gated** — by whether the learner has met the split — **and must arrive with their minimal pair.** P17's whole difficulty is the double-`'d`, and that is in the frame, not the vocabulary.

So richness at seed N is still a lookup, but it is a lookup over two lists: deterministic frames instantiable from owned vocabulary, plus split frames whose minimal pair the learner has already been given.

---

## 2. The pattern-diversity metric

Implemented in `tools/frame-layer/pattern-diversity.cjs`; run it with `node tools/frame-layer/pattern-diversity.cjs spa_for_eng 599`.

> **The unit is the LEGO basket, not the seed** (Tom, 2026-08-29): *"a SEED is invisible to a learner, so they have no idea how much work is being done by a SEED, the unit of learning for the learner is the LEGO, and the unit of practice is the PHRASE."* One LEGO, one basket, one set of floors. `scoreBaskets()` groups a seed's phrases by `lego_index` and scores each basket independently; **a seed passes only if every basket under it passes**, and the seed-level composite is context that can never decide. On a single-LEGO seed like 600 the two coincide, which is why nothing measured before this change was wrong. On seed 599 they do not: the seed averages **0.677** while **three of its four baskets floor-fail**. Grouping is by `lego_index` and not `lego_id` — `lego_id` is null on all 16,328 `spa_for_eng` phrase rows.
>
> **Component rows are not scored.** They are per-sentence tiling glosses, skipped at runtime, and an M-LEGO's own components cannot contain the M-LEGO ("been" does not contain "been happy"). Scoring them counted `absent` as a fourth LEGO position and pushed POS above 1.0.
>
> **Which split applies to a seed is DERIVED, not looked up** — see `tools/frame-layer/derive-seed-job.cjs`. Each basket is tested only against the split side its own LEGO admits.

It supersedes edges-per-syllable, which **counted spending, not minting**, and tied the good and bad sets at 0.081 vs 0.083.

Tom's specification, from the sitting: *"pattern diversity of the walk — positions (initial/medial/final), distinct neighbours per side, junction diversity — weighted toward the pair's expensive mapping class, floors per axis."* Everything below marked **[SPEC:worker]** is my definition of a part that specification leaves open; it is implemented as written here and can be overruled in one line.

| axis | definition | floor **[SPEC:worker]** |
|---|---|---:|
| FRAME | distinct pattern signatures fired by each phrase's **matrix clause**, / phrase count | 0.34 |
| POS | distinct positions of the LEGO in its phrase (initial / medial / final) / 3 | 0.34 |
| NEIGH | (distinct left neighbours + distinct right neighbours) / (2 × phrases) | 0.30 |
| JUNCT | distinct (left → right) junctions / phrase count | 0.50 |
| SPLIT **[SPEC:worker]** | fraction of the split sides **this basket's own LEGO admits** that it actually crosses | 1.00 |

**[SPEC:worker] FRAME is measured on the matrix clause, not the whole string.** The first version of this file matched patterns over the entire phrase and scored the known-bad seed-600 basket 0.62, passing it — because nine identical matrix clauses carried nine different tails, and the tails lit up P12/P14/P15. Swapping a tail does not change the frame the LEGO is being taught in. On matrix clauses the same basket scores 0.22 and floor-fails.

**[SPEC:worker] SPLIT crossing has a weak and a strict form.** An outcome is *carried* when its target-side matcher fires. The split is `crossed_weak` if each outcome is carried at least once; it is `crossed` only if each outcome is carried by **at least two distinct known-side skeletons** (first three words of the matrix clause + first three after the subordinator). One skeleton means the learner met that half of the split in exactly one shape — the tail-swap failure written as a number.

**[SPEC:worker] Weighting toward the pair's expensive class.** spa is a SPLIT pair, so `{split:3, frame:2, pos:1, neigh:1, junct:1}`. An INVERSION pair (deu, and jpn's clause architecture) weights POS; an ERASURE pair weights JUNCT. Composite is the weighted mean; **floors are independent of it** — missing any floor fails the basket whatever the composite says, so three good axes can never buy a set that stamps one shape nine times.

### The metric run against the specimen

`spa_for_eng` seed 600 — one LEGO, so one basket, `L01` "driven" / "conducido" — the nine live phrases, 2026-08-29.

**Read the SPLIT row below as history.** It was computed when the lab was told, by a hardcoded table, that seed 600's job was to cross the double-'d. It is not. Seed 600 admits one lego, a participle, and the derivation now returns **LEXICAL ONLY** for it; the double-'d is admitted at seed 599. So the SPLIT criterion no longer applies to this basket at all, and the basket fails on **FRAME alone** — the ordinary reason, thin pattern diversity, nine near-identical shapes. The verdict is unchanged; the reason for it is smaller and truer.

| axis | value | floor | |
|---|---:|---:|---|
| FRAME | 0.222 | 0.34 | **FAIL** — 2 distinct matrix frames across 9 phrases (one of them the bare LEGO) |
| POS | 1.000 | 0.34 | pass |
| NEIGH | 0.444 | 0.30 | pass |
| JUNCT | 0.778 | 0.50 | pass |
| ~~SPLIT~~ | ~~0.000~~ | ~~1.00~~ | *withdrawn — this basket admits no side of the split; see above* |
| composite | **0.333** | | **FAIL** (on FRAME) |

Note the refinement this measurement forces on the write-up. The write-up says *"not one of the nine phrases crossed the split"*. Literally, three of the nine do contain `hubieras` — but all three carry it inside the same copied clause, `if you'd told me…`, lifted from seeds 599/600 themselves. So `crossed_weak = true`, `crossed = false`. The finding stands; its precise statement is **the split appears in exactly one shape, and never as a contrast the learner has to choose between.**

A hand-built nine-phrase set that genuinely varies the shapes scores 0.903 and clears every floor (asserted in `extract-patterns.test.cjs`), so the metric discriminates rather than just condemning.

**Ungameable in the right way: scoring well IS doing the job.** The only way to raise FRAME and SPLIT is to write phrases in different shapes that cross the split — which is the teaching.
