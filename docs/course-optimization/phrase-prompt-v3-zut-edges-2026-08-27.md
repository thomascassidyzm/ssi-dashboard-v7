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

<!-- RESULTS -->

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
