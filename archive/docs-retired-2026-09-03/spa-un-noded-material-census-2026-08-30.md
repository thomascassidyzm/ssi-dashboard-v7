# The un-noded material in the Spanish course

*30 August 2026 — measurement and diagnosis only. Nothing was repaired, nothing was written to the database, no audio was queued, the validator was not changed.*

## The short answer

**18.9% of the live Spanish course — 2,869 of 15,205 phrases — contains Spanish the learner has no way of producing at that point.** The claimed 17% was close, and the direction of the claim is right, but the two headline examples were not: `con` spoils 481 phrases and `más` 449, not the 427 and 444 that were quoted, and neither figure is a raw count of how often the words appear (that is 960 and 1,017).

The important part is not the percentage. It is that **this is one narrow fault repeated thousands of times, not a course-wide rot.** Two words — `con` and `más` — account for a third of the whole thing. Ten pieces of material account for 56% of it. Both `con` and `más` are used freely from very early on, and **neither is ever taught as a LEGO anywhere in the 1,475 LEGOs of this course.** They exist only as component stubs buried inside larger chunks, and even those stubs do not arrive until seed 333 and seed 360. So a learner meets `más` hundreds of times before anything has ever handed it to them.

And it is almost entirely a USE-phrase problem: 2,481 of the 2,869 offenders are USE phrases, only 388 are BUILD. The BUILD phrases — the ones the earlier edge audit examined — are comparatively clean. The hole opens where nobody has been looking.

## The numbers

| | strict | free-class-tolerant |
|---|---|---|
| offending phrases | **2,869 (18.9%)** | 1,937 (12.7%) |
| of which USE | 2,481 | 1,690 |
| of which BUILD | 388 | 247 |
| distinct pieces of material | 258 | 234 |
| top 10 explain | 56% of all hits | — |
| material appearing in one phrase only | 96 | — |

Two accountings, because the tool that does this measuring quietly exempts a hard-coded list of Spanish glue — and `con` is on that list, along with `de`, `la`, `me`, `te`, `por`, `para`, `que`. The strict accounting drops that exemption and demands every Spanish word be attributable to something the learner has been given. **The 17% claim lands on the strict accounting, not the tolerant one.** My recommendation in one sentence: adopt the strict accounting, because the free class is a rule about the *English* side of the course, and letting Spanish words off because they look like glue is an assumption that tool made rather than a ruling anyone gave — it is precisely what hid `con` from view.

### What the material is, ranked

| material | phrases spoiled | what it actually is |
|---|---|---|
| `con` | 481 | never a LEGO; component stub only, first at seed 333 |
| `más` | 449 | never a LEGO; component stub only, first at seed 360 |
| `de` | 237 | a real LEGO, but not until seed 217 |
| `me` | 192 | never a LEGO; component stub only, from seed 346 |
| `todo` | 175 | a real LEGO, but not until seed 412 |
| `la` | 163 | never a LEGO; component stub only |
| `quiere` | 134 | a real LEGO, arriving later |
| `empezar` | 121 | only ever exists inside a multi-word chunk |
| `entender` | 100 | a real LEGO, arriving later |
| `te` | 76 | never a LEGO; component stub only |

The tail is long but thin: 258 distinct pieces of material in total, 96 of which spoil exactly one phrase each.

### Real hole vs. the check's own blind spot

**A count of violations is not a count of work.** Of the 2,869 offending phrases:

| | phrases | |
|---|---|---|
| **real content hole** | **2,394** | material genuinely unavailable at that point |
| **matcher blind spot only** | 350 | contraction, clitic, accent or agreement variant, or the phrase's own LEGO appearing twice |
| both | 125 | |

So the defensible number for "there is really something wrong here" is **2,394 phrases, 15.7%** — and within that, the four sub-classes carry very different repair implications:

- **1,516 phrases** — material that is *never a LEGO anywhere*, only a component stub arriving later. No walk produces it standalone, ever. This is the `con`/`más` class and it is the biggest single thing.
- **1,028 phrases** — a genuine LEGO that simply arrives too late. An ordering fault, not a missing-content fault, and much cheaper to fix.
- **376 phrases** — material that only ever exists inside a multi-word LEGO and was never atomised (`empezar`, `nosotros`, `días`).
- **40 phrases** — material that appears nowhere in the course at all, as a LEGO or a component. Genuinely 40 phrases, spread across 33 different words, mostly one-offs (`vaya`, `aprendo`, `funciona`, `dame`). A real hole, but a tiny one.

## What was measured, and how

Every phrase in `course_practice_phrases` for `spa_for_eng` with `phrase_role` of `build` or `use` — 5,133 + 10,072 = **15,205 rows exactly**, which reconciles with the figure in the commission. The 1,123 `component` rows are **excluded**: they are per-sentence literal tiling glosses rather than things a learner produces, and including them would be measuring the check against itself.

The rule: walk the LEGOs in course order; at each LEGO, take the inventory of everything introduced up to that point (earlier LEGOs' targets, plus their component stubs); then take each of that LEGO's BUILD and USE phrases and tile its Spanish, longest-match and non-overlapping, against that inventory. Any Spanish word left over is un-noded, and gets a stated reason. The LEGO's own target is consumed whole first, so a multi-word LEGO is not shredded into its older parts. This reuses the matcher in `tools/course-optimization/lego-edge-map.cjs`, extended rather than rewritten — the extension adds the strict accounting, the USE phrases, and the reason taxonomy, and is off unless asked for.

Accents were kept, not folded: `mas` without an accent does not appear anywhere in the course, so the accent question turns out to be moot — every one of the 449 is `más`.

## The honest limitations

- **This is one matcher's opinion, and it can be wrong in both directions.** The builder's own recorded tiling and this independent match disagree about BUILD phrases 30% of the time, and the builder's record claims untiled material in 27.6% of BUILD phrases where this matcher finds it in only 7.6%. Neither number was averaged into the other. The disagreement is itself worth someone's attention.
- **The late course has 293 BUILD phrases whose recorded tiling no longer reconstructs the phrase** (17.4% of the late region, against 2.7% early) — the text was edited after the decomposition was written. Wherever that is true, the builder's record cannot be trusted at all, and the independent match is the only source.
- **The 350 blind-spot phrases are classified as blind spots on purpose.** Where a case was ambiguous between "real hole" and "the check cannot see it", it was called a blind spot. Over-claiming a defect is the worse error, so the real number is more likely a little above 2,394 than below it.
- **`spa_for_eng` only.** The shape almost certainly generalises to the other courses — the mechanism is a generic one — but that is a separate measurement and it was not run.

## One question for Tom, answerable in a word

The single biggest class here is Spanish that is *never a LEGO anywhere in the course* — `con`, `más`, `me`, `la`, `te` — used freely from the start, existing only as buried component stubs from seed 333 onwards.

**Is that a fault to repair, or is it deliberate?** There is a reading where these are genuine construction-features that the method says should be absorbed inside whole thoughts and never atomised — in which case 1,516 of these phrases are working as designed and the real number drops to about 878. There is another reading where a learner meeting `más` 449 times before anything hands it to them is exactly the fault we are hunting. Those two readings differ by a factor of three and the measurement cannot settle it.

**Fault, or by design?**
