# The phrase prompt, rebuilt: one gate, one functional

*2026-08-27. Spanish, twenty real LEGOs, three arms.*

---

## What this is

The builder prompt at step 2 of the course pipeline — the thing that writes every
BUILD and USE phrase a learner ever hears — has been rebuilt around **one hard
constraint and one objective**, and tested against the content it would replace.

The diagnosis it answers is Tom's: *"the builders got lazy with all the gates they
had to satisfy and ended up optimising for compliance to pass the gates, rather
than value to the learner."*

Here is what compliance winning looks like. This is live in the Spanish course
today, and it passes every gate the estate has:

```
LEGO: "driven" -> "conducido"
  I'd have driven                          habría conducido
  I'd have driven home                     habría conducido a casa
  I'd have driven there                    habría conducido hasta allí
  I'd have driven if you'd told me         habría conducido si me hubieras dicho
  I'd have driven if you'd told me that    habría conducido si me hubieras dicho eso
  I'd have driven but I was tired          habría conducido pero estaba cansado
  I'd have driven in a safe way            habría conducido de manera segura
```

Nine phrases, one move, the tail swapped seven times. Maximum syllables, one
connection, every gate green.

---

## The gate: ZUT as a determinism condition

> Does the learner know exactly which target-language words this prompt is asking
> them to say?

The ambiguity that matters lives on the **known** side. *bien* is not ambiguous in
Spanish; the **prompt** is ambiguous, because a learner shown "well" — or shown
"good" — cannot know which target word is being reached for. Reasoning
target → known always looks fine, and that is exactly what misleads builders.

Availability is therefore **computable**: a mapping is usable when its known gloss
reaches exactly one target and its target is reached by exactly one known. The
verdict is never "no", it is **"not yet"** — a blocked word unlocks the moment the
learner has met both members against their own distinct uses.

**The rule reproduces Tom's own hand verdict without being tuned to it.** Run over
the whole live Spanish course:

| | knowns that reach it | verdict |
|---|---|---|
| `muy` | very | 1:1 → **released** — he said yes |
| `bien` | well, a good time, fine | convergent → **blocked** — he said no |

At Spanish seed 358 that leaves **959 usable mappings and 469 blocked**, each
block carrying the reason and what would unlock it.

---

## The functional: new edges per syllable — and it is a vector

A phrase set is a walk from the new LEGO into the network the learner already
owns. Its value is the connections drawn, priced against the syllables spent.

Two corrections the data forced, both worth knowing because both were wrong in the
first draft:

**An edge is an adjacency, not a co-occurrence.** Counting every LEGO that happens
to appear in the same phrase makes the numerator scale with phrase length exactly
as the syllable denominator does — every set in the estate then lands near 0.32
and the metric separates nothing. What a learner connects the new LEGO to is what
it *touches*.

**And a single number is the wrong shape.** Even corrected, edges-per-syllable
reads **0.081** for Tom's hand-graded GOOD set and **0.083** for the tail-swapped
one. No separation — because spa 358 is rich in *pattern* and poor in *position*
and spa 600 is the reverse, and one scalar averages the diagnosis away. So the
acceptance test is **floors per named axis**, each shortfall carrying its own
rewrite instruction. That is also the Goodhart defence: you cannot tail-swap your
way to three positions or to four varied axes.

The axes, per role, scored separately for BUILD and USE:

| axis | what it asks |
|---|---|
| gate | zero phrases the learner cannot produce from their own prompt |
| edge combos | ≥4 BUILD / ≥6 USE distinct neighbour × pattern combinations |
| adjacencies | the new LEGO touches more than one different neighbour |
| position spread | at least two of start / filling / end |
| axes varied | ≥2 BUILD / ≥3 USE of five pattern axes actually move |
| recency mass | ≥¼ of neighbours drawn from recent seeds |
| standalone | every USE phrase stands alone as a complete thought |

Position is Tom's three-way taxonomy verbatim — start, filling (≥1 connection
either side), end — with **no exemptions by word type**. "Nouns naturally sit at
the end" is not a defence, it is a description of only ever building rightward
from a verb.

---

## One thing the first draft got badly wrong, and the correction

The first version of the checker charged every phrase for the course's own
mapping debt — Spanish glosses English *"that"* onto six different forms, so
strictly every phrase in the estate containing "that" is non-deterministic. It
failed **100% of live content, including the set Tom hand-graded as the good one.**

A gate that fires on everything discriminates between nothing. So the gate now
reports in **two layers**, and both are compared across arms:

- **Layer 1** — what this builder did: target material never introduced, target
  material no tile accounts for, target meaning the prompt never asks for.
- **Layer 2** — ambiguity the phrase *inherits* from the course's own mapping
  table. Counted and named per phrase, and a real finding about the estate, but
  not charged to the individual phrase.

---

## The experiment

Twenty real Spanish LEGOs, spread early / middle / late, deliberately including
the seeds Tom graded by hand (206, 358) and the tail-swap specimen (600), plus
five from the 501–600 region.

Three arms, **generated against the identical introduced-vocabulary state** and
scored by identical code with no arm label reaching the scorer:

1. **Sonnet 4.5 (live)** — what is in the database today.
2. **Opus 5** — the new prompt.
3. **Sonnet 5** — the new prompt.

## The result

**Every arm produced all twenty sets. No holes, no generation failures.**

| arm | sets scored | generation failures |
|---|---|---|
| Sonnet 4.5 (live) | 20 / 20 | 0 |
| Opus 5 | 20 / 20 | 0 |
| Sonnet 5 | 20 / 20 | 0 |

## BUILD phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 0.50 | 0.00 | 0.20 |
| phrases inheriting course ambiguity | 1.30 | 0.00 | 0.00 |
| phrases written | 3.00 | 5.15 | 4.55 |
| neighbour x pattern combos | 1.80 | 5.15 | 4.35 |
| distinct neighbours touched | 1.65 | 5.05 | 4.25 |
| positions reached (of 3) | 0.95 | 2.65 | 2.50 |
| share in the filling position | 0.07 | 0.44 | 0.22 |
| pattern axes varied (of 5) | 0.65 | 2.80 | 2.25 |
| distinct pattern signatures | 1.25 | 3.80 | 3.05 |
| recency mass | 0.17 | 0.52 | 0.46 |
| one-distinction ascent | 0.75 | 0.57 | 0.58 |
| new edges per syllable | 0.10 | 0.11 | 0.11 |
| **clears every floor** | 0% | 90% | 60% |

Floors for BUILD: phrases ≥ 4, edgeCombos ≥ 4, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 2, recencyMass ≥ 0.25.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| positionSpread | 16 | 0 | 2 |
| axesVaried | 16 | 1 | 4 |
| gate | 6 | 0 | 1 |
| phrases | 13 | 0 | 0 |
| edgeCombos | 17 | 0 | 1 |
| distinctAdjacencies | 9 | 0 | 1 |
| recencyMass | 14 | 1 | 5 |

## USE phrases — per-LEGO means

| axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| layer-1 gate failures | 1.75 | 0.00 | 0.30 |
| phrases inheriting course ambiguity | 3.85 | 0.00 | 0.00 |
| phrases written | 4.80 | 6.80 | 6.25 |
| neighbour x pattern combos | 2.65 | 6.75 | 5.95 |
| distinct neighbours touched | 2.35 | 6.50 | 5.75 |
| positions reached (of 3) | 1.10 | 2.45 | 2.05 |
| share in the filling position | 0.28 | 0.64 | 0.55 |
| pattern axes varied (of 5) | 1.25 | 4.35 | 3.10 |
| distinct pattern signatures | 1.70 | 5.70 | 4.25 |
| recency mass | 0.15 | 0.49 | 0.39 |
| one-distinction ascent | 0.76 | 0.29 | 0.52 |
| new edges per syllable | 0.06 | 0.07 | 0.08 |
| USE phrases standing alone | 1.00 | 1.00 | 0.99 |
| **clears every floor** | 0% | 75% | 50% |

Floors for USE: phrases ≥ 5, edgeCombos ≥ 6, distinctAdjacencies ≥ 2, positionSpread ≥ 2, axesVaried ≥ 3, recencyMass ≥ 0.25, useCompleteShare ≥ 1.

Where each arm falls short, counted over the LEGOs:

| shortfall axis | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| axesVaried | 14 | 0 | 7 |
| gate | 10 | 0 | 1 |
| edgeCombos | 19 | 1 | 3 |
| positionSpread | 15 | 1 | 3 |
| distinctAdjacencies | 7 | 0 | 1 |
| recencyMass | 12 | 3 | 3 |
| phrases | 6 | 0 | 0 |
| useCompleteShare | 0 | 0 | 1 |

## Per-LEGO detail

| seed | LEGO | Sonnet 4.5 (live): gate / pos / axes / combos | Opus 5: gate / pos / axes / combos | Sonnet 5: gate / pos / axes / combos |
|---|---|---|---|---|
| 20 | "you want" → "quieres" | 0 / 2 / 0 / 10 | 0 / 3 / 5 / 14 | 0 / 2 / 4 / 13 |
| 45 | "to know" → "saber" | 4 / 1 / 4 / 6 | 0 / 3 / 5 / 11 | 0 / 2 / 4 / 12 |
| 75 | "you have" → "tienes" | 7 / 2 / 0 / 4 | 0 / 3 / 5 / 13 | 0 / 2 / 5 / 11 |
| 110 | "we're friends" → "somos amigos" | 7 / 1 / 0 / 1 | 0 / 3 / 5 / 12 | 0 / 3 / 4 / 12 |
| 130 | "surprise" → "sorpresa" | 3 / 2 / 5 / 8 | 0 / 2 / 3 / 8 | 10 / 0 / 0 / 0 |
| 150 | "can you" → "puedes" | 0 / 0 / 0 / 0 | 0 / 2 / 5 / 13 | 0 / 2 / 3 / 10 |
| 206 | "I enjoy" → "disfruto" | 7 / 1 / 1 / 3 | 0 / 3 / 3 / 12 | 0 / 2 / 2 / 11 |
| 250 | "to tell me" → "decirme" | 0 / 0 / 0 / 0 | 0 / 3 / 4 / 13 | 0 / 1 / 4 / 10 |
| 300 | "to seem" → "parecer" | 3 / 1 / 1 / 6 | 0 / 2 / 5 / 12 | 0 / 2 / 3 / 11 |
| 358 | "the top" → "la cima" | 0 / 1 / 3 / 5 | 0 / 3 / 5 / 12 | 0 / 3 / 4 / 13 |
| 400 | "to eat" → "comer" | 0 / 0 / 0 / 0 | 0 / 3 / 5 / 11 | 0 / 3 / 5 / 10 |
| 440 | "to travel" → "viajar" | 0 / 0 / 0 / 0 | 0 / 2 / 5 / 12 | 0 / 3 / 5 / 10 |
| 470 | "how high" → "hasta qué altura" | 0 / 3 / 4 / 7 | 0 / 3 / 5 / 11 | 0 / 3 / 4 / 11 |
| 510 | "she's gone to" → "se ha ido a" | 0 / 1 / 0 / 7 | 0 / 2 / 3 / 11 | 0 / 2 / 2 / 12 |
| 535 | "he made a promise that" → "hizo la promesa de que" | 0 / 1 / 0 / 5 | 0 / 2 / 4 / 12 | 0 / 2 / 2 / 9 |
| 560 | "it goes down to" → "baja hasta" | 6 / 1 / 0 / 3 | 0 / 1 / 4 / 14 | 0 / 2 / 3 / 11 |
| 580 | "we've often wanted to" → "hemos querido a menudo" | 2 / 1 / 0 / 5 | 0 / 2 / 3 / 12 | 0 / 2 / 2 / 11 |
| 600 | "driven" → "conducido" | 4 / 1 / 1 / 4 | 0 / 2 / 4 / 13 | 0 / 1 / 1 / 10 |
| 620 | "a very long time" → "muchísimo" | 0 / 1 / 3 / 8 | 0 / 2 / 5 / 11 | 0 / 2 / 3 / 10 |
| 650 | "want to go" → "quiere irse" | 2 / 2 / 3 / 7 | 0 / 3 / 4 / 11 | 0 / 2 / 2 / 9 |

### The one number the scorer cannot compute

"Is this USE phrase worth having — a thing a real person would actually say?"
goes to a model, on the same seven LEGOs for every arm, with no arm label
attached:

| | Sonnet 4.5 (live) | Opus 5 | Sonnet 5 |
|---|---|---|---|
| USE phrases worth having | **0.67** | **0.80** | **0.70** |

*(n = 7 LEGOs per arm — seeds 20, 110, 206, 358, 470, 560, 620.)*

---

## What it says

**The prompt works, and the gap to what is in the course today is not marginal.**
On the live content, **not one LEGO in twenty clears the floors**. Recency mass is
0.15–0.17: builders reached for the ancient safe core essentially always. Just
under one of three positions was reached on average; barely one of five pattern
axes moved. With the new prompt, Opus clears every BUILD floor on 18 of 20 LEGOs
and every USE floor on 15 of 20, with **zero gate failures across the whole arm**
and zero phrases inheriting the course's own ambiguity — it read the BLOCKED list
and stayed inside it.

**Opus leads Sonnet 5, and it leads on specific, nameable axes rather than
everywhere.** They are close on volume, on neighbours touched, and on
edges-per-syllable. The gap is concentrated:

| where Sonnet 5 lags | Opus 5 | Sonnet 5 |
|---|---|---|
| USE LEGOs short on pattern variety | 0 / 20 | **7 / 20** |
| BUILD share in the filling position | 0.44 | **0.22** |
| LEGOs with any gate failure | 0 | 2 |
| USE phrases worth having | 0.80 | 0.70 |

Sonnet 5 reaches the filling position **half as often** — it is more willing to
extend rightward and less willing to hold a connection on both sides. And on one
LEGO in twenty (seed 130, "surprise") it broke the declared-tiling contract,
bundling the article into the new LEGO's own tile so that nothing in the set could
be attributed. That set scores zero. It is an instruction-adherence failure, not
bad Spanish — and it is exactly the kind of thing a checker catches in one pass.

**The decision the data supports: SPLIT.** Sonnet 5 with the new prompt is
already far better than what the course has, and it is not within noise of Opus.
Its shortfalls are named, few, and mechanically detectable by the scorer that
already exists — *"no filling position", "pattern axes 2 of 5", "tiling does not
reconstruct the target"*. That is the generator/checker case: Sonnet 5 builds, an
up-model checker rejects with the axis named, and the expensive tier is spent only
on the rewrites.

---

## Two things in this instrument that are still wrong, said plainly

**One-distinction ascent inverts.** The live course scores 0.75–0.76 and both new
arms score 0.29–0.58 — apparently worse. It is a measurement artefact: ascent
counts how many pattern axes change between consecutive phrases, so a set that
varies its axes (which is the thing being asked for) necessarily takes bigger
steps. As currently defined this axis penalises exactly what the pattern axis
rewards. **It is reported and it is not in the floors.** It needs redefining
before it means anything — probably as ascent *within* an axis rather than across
all five.

**The floors are a starting calibration, not a ruling.** They were set so that the
hand-graded good set clears what it was praised for and falls short where Tom said
it falls short. The one Tom set himself is "at least 6 distinct partner × pattern
combinations". The rest are arguable, and they are all in one object
(`FLOORS` in `tools/phrase-lab/score.cjs`) so they can be argued with in one place.

---

## Gates that could retire once this is wired

Named for the record, not acted on — changing the API validator is a separate and
riskier job:

- **phrase-count floors** as a standalone gate. They stay as a floor *inside* the
  score, where they cannot be satisfied by padding, rather than as a gate that
  counts rows.
- **the bare-LEGO drop rule and length-ratio checks** — both are proxies for
  "this phrase draws no edge", which the edge count now measures directly.
- **late-course vocabulary balance (the three-strike over/under-used check)** —
  recency mass measures the same intent and measures it per LEGO rather than
  per window.

What must NOT retire: tiling, vocabulary containment, and the syllable cap. Those
are not proxies for value, they are the facts the gate and the score are computed
from.


---

## What is not wired

The new prompt is a **new artefact** (`prompts/phrase-prompt-v3-zut-edges.md`).
`services/briefs/build-team-creator.cjs` is untouched and nothing in production
has changed. The API's own validator (`services/course-builder/lib/validation.cjs`)
is also untouched — retiring the gate stack is a statement the *prompt* makes to
the agent; changing the validator is a separate and riskier change.

## Out of scope, deliberately

- **Target-language naturalness.** The generated Spanish carries occasional
  clumsiness (reflexive agreement, e.g. *"quiere reunirnos"* for *"reunirse"*).
  That is a known separate brief and it does not block this one.
- **The retro pass over the ~57,000 existing phrases.** Phase three. Cheapest last.
