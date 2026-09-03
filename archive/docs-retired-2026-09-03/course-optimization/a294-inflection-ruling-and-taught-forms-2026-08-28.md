# A-294 — the inflection question, ruled: teach the form, never loosen the gate

*2026-08-28. Closes the one decision left open by
`a294-gate-precondition-and-build-cut-2026-08-28.md`. Written after the v3 door was
merged to `main` (merge commit `0258adced`).*

---

## What was asked

The A-294 replay put one decision to Tom: **should the English known side allow
inflections of a word already taught?** The evidence was Chinese — five of six
`zho_for_eng` LEGO sets refused by the known-side gate, every refusal an `-s`,
`-ing` or `-ed` on a verb the learner already has (drinking, knows, hopes,
understands, has), and the obedient regeneration reading *"a few friends
currently drink coffee"* and *"most people currently attend the party"* — tier
three on Tom's own clunkiness scale.

The recommendation in that doc was **(b): free `-s` / `-ing` / `-ed` on an
already-taught word, known side only.**

## The ruling

**Hard no. Not (b). And (a) is not "leave it and live with the clunk" either —
the framing itself was wrong.** Tom, 2026-08-28, as relayed on dispatch:

> The clunky Chinese output — "a few friends currently drink coffee" when
> "drinking" was needed but only "drink" was taught — is **not evidence the
> no-inflection rule is wrong**. It is evidence that **the model doesn't
> understand the methodology**, because it wasn't built course-by-course from
> LEGO 1 upward.
>
> The correct fix for a Chinese set that genuinely needs an inflected form is to
> **INTRODUCE that form as taught material** — teach it, then use it. Never
> smuggle it in, never avoid it, never a known-side carve-out, never a loosened
> gate.

This is consistent with, and re-affirms, the ratified 2026-06-15 no-inflection
rule: a known form is usable only if it was introduced as a LEGO or as a
component of an M-LEGO, exact form.

## Standing guidance for future work

**Clunky output under the gate is a signal to look at what the generator
understands about the methodology — it is never a signal to relax the gate.**

When a generated set reads badly *because* the gate refused something, the first
question is what the generator believes it is allowed to do, not what the gate
should stop checking. A generator that has not been walked up the course from
LEGO 1 does not feel the shape of what the learner owns; it reaches for the
English it would write for a native and then hammers it to fit. That is a
brief-and-understanding problem, and it is fixed upstream of the gate.

The three specific things that are now closed:

- **No known-side carve-out.** `glossSynonyms` in
  `docs/pair-contracts/zho_for_eng.contract.cjs` is a real mechanism — it
  registers extra English glosses against a carrier target — and dropping
  `drinking` into `喝`'s list would make every refused set pass tonight. That is
  precisely the smuggling the ruling forbids. Do not do it.
- **No loosened stemmer.** `stemKnownGloss` (`services/course-builder/lib/validation.cjs`)
  is an exact normaliser by design; there is no `stemStrip` for `zho_for_eng` and
  none is to be added.
- **No avoidance.** Writing round the missing form — "currently drink" for "is
  currently drinking" — is the failure mode, not the workaround.

The route that IS open: **introduce the form as taught material, then use it.**

---

## The open question, answered from the code

**Can the current LEGO-set generation path — the one used in this v3 door work —
introduce a new inflected form as taught material mid-set?**

Read from `origin/main` at `0258adced`: `services/course-builder/lib/phrase-generation.cjs`,
`tools/phrase-lab/build-prompt.cjs`, `tools/phrase-lab/inventory.cjs`,
`tools/phrase-gate/gate-check.cjs`, `services/course-builder/lib/validation.cjs`,
`services/briefs/build-team-creator.cjs`. No tests run, no generation, no spend.

### Short answer

**Introducing a new taught form is supported — but not by the v3 phrase door, and
not "mid-set". It has to be decided one layer up, at decomposition, and it is
only possible where the seed corpus gives you a seed that actually uses the
form. That last part is a real limitation Tom should know about.**

### Why, in four steps

**1. The v3 phrase door cannot introduce anything, by construction.**
`generateLegoPhrases()` takes a course, a seed and a *single already-decided*
LEGO, assembles the prompt against a frozen inventory (`buildInventory` =
every LEGO of seeds 1..N-1, plus the *earlier* LEGOs of seed N, plus their
components), and writes nothing to the database. It has no path to
`course_legos` at all. So "introduce a form mid-set" is not a thing this door
can do, and no amount of prompt work will make it one. A phrase set is written
against a fixed vocabulary snapshot; that is the whole point of it.

**2. The layer above it can — and the mechanism already exists.**
The builder agent (`services/briefs/build-team-creator.cjs`) authors the seed's
LEGO decomposition and submits LEGOs and phrases together in one atomic
`POST /api/seed/complete`. A new taught form is expressible there today, with no
code change: the known-side gate builds its `stemFirstPos` map by tokenising
**every LEGO's `known_text` and every M-LEGO component's `known`**
(`gate-check.cjs:76-81`). So a LEGO — or a component of an M-LEGO — glossed
`"am drinking" → "在喝"` registers the token `drinking` at that seed, and from
that seed onward the gate accepts it and the inventory offers it to the phrase
door as available vocabulary. **Teach it, then use it, is fully wired.**

**3. But it must be introduced *before* the set that needs it, not inside it.**
The inventory for LEGO L of seed N contains LEGOs 1..L-1 of seed N. So the
introducing LEGO must sit at a lower `lego_index` in the same seed, or in an
earlier seed. That is a decomposition-time decision, made before the phrase door
is called — which means the builder has to *notice* it needs the form while it
is designing the seed, not discover it when the gate refuses the phrases. Today
nothing in the builder brief tells it to do that; the brief says the opposite
("only write phrases where the exact LEGO form works naturally... not force
conjugation", `build-team-creator.cjs`), which is correct as far as it goes and
is exactly the instruction the Chinese generator failed to honour when it wrote
"currently drink". **A brief change, not a gate change.**

**4. The structural gap: you can only teach a form the seed corpus hands you.**
`checkTiling` (`validation.cjs:104`) requires the seed's target text to be
fully covered by its LEGOs' targets — a LEGO exists to tile its own seed. And
the builder does not author seeds; it fetches them from a fixed corpus
(`GET /api/seeds/{course}`). **So a course can only introduce `在喝` at a seed
whose Chinese actually contains `在喝`.** If the corpus never gives one before
the point where the progressive is needed, there is no legal place to teach it,
and the builder's only remaining moves are the ones the ruling forbids
(smuggle, avoid, carve out) or the honest one: write phrases that do not need
the form at all, which for some LEGOs may mean the set is thinner than we would
like. That is the genuine limitation, and it is in the *seed corpus and its
ordering*, not in the gate, the prompt or the model.

### One trap worth naming before anyone implements this

The naive shape in an isolating language is wrong. Adding a LEGO
`"drinking" → "喝"` next to the existing `"drink" → "喝"` **passes**
`checkLegoConflict` — that check only fires on an identical `known_text` — but
it converges two English glosses onto one Chinese target, and the v3 inventory's
determinism rule (Tom's muy/bien rule, `inventory.cjs`) then marks the target
ambiguous and **BLOCKS it**, taking `drink` out of circulation as well. A
same-target inflection gloss costs you the word you already had.

The shape that works is the one the methodology already prescribes: a
**progressive M-LEGO carrier with a genuinely different target** —
`"am drinking" → "在喝"` / `"is currently drinking" → "正在喝"` — glossed as the
whole intention, with `在` / `正在` absorbed as a construction-feature inside the
carrier rather than debuted as a bare particle. Distinct target, no convergence,
no known-side carve-out, and the learner is given the form before being asked
for it.

---

## Status

- The v3 door is merged to `main` (`0258adced`), on Tom's ruling.
- The no-inflection rule is unchanged and re-affirmed. `zho_for_eng`'s contract
  is untouched.
- Nothing was implemented from the (b) proposal.
- Open, for whoever picks up the Chinese sets: check the `zho_for_eng` seed
  corpus for seeds carrying `在` / `正在`, and if one lands before the refused
  sets, the progressive can be taught there. If none does, that is a corpus
  decision for Tom, not a gate decision.
