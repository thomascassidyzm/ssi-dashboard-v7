# One frame map over the seeds and the pods — built

**Date:** 2026-08-31. **Status: BUILT and pushed, NOT MERGED.** Branch
`feat/unified-frame-map-build`, nine commits, off `origin/main`. Every database touch in this job
was read-only: no row written, no course touched, no audio, no TTS, no migration. Verified by
checking the pushed branch out fresh, with no `.env` present, and running all four self-tests —
which is how the last defect was caught (see Verification).

The design is `docs/frame-layer/unified-frame-map-2026-08-31.md`, ratified. This is what came of
building it, including the three places the data corrected it.

---

## One page

**Both halves landed, in one read of the corpus, as commissioned.** The frame map is live on the
phrase generator's path, and the could-occupy tagging is beside it as the fourth artefact.

**The acceptance test runs, and it refuses.** `"And you?"` is attested four times in pod-0.
`spa_for_eng` cannot say it — and the gate now proves that mechanically, at every position in the
course, including the very last basket where the learner owns 2,205 known/target pairs. The
refusal is for the right reason and that is the whole point: **the course owns "and", and it owns
"you", and it still cannot say "and you"**, because ownership is whole-chunk and a frame is not
the sum of its parts. One added cut mints it and the frame enters the pool with no config change
anywhere. This is a real test in the repo (`tools/frame-layer/instantiability.test.cjs`), not a
claim in prose.

**The generator now offers the conversational register.** For `spa_for_eng` seed 600 the prompt's
frame section carries a second block it never had:

```
D2 polar response + elaboration  [response position; register: clinical/service/social; you own: "yes"]
D3 thanks / gratitude close      [either position;   register: clinical/service/social; you own: "thank you"]
D4 apology / attention-getter    [initiating position; register: clinical/service/social; you own: "i'm sorry"]
D7 uptake assessment             [response position; register: clinical/service/social; you own: "lovely"]
D8 ellipted order                [initiating position; register: clinical/service/social; you own: "please"]
X2 polar-response-to-question    [question → polar-response; you own: "yes"; exchange frame — write only its D2 projection]
```

Six frames the seed corpus structurally cannot attest, each listed only because that basket
already owns the material, with the exact chunk that paid for it quoted. Twelve more exist and are
**not** listed, because spa has not cut what they need.

**And the loophole is shut.** Every candidate the generator gets back must now tile whole-chunk
from that phrase's own basket window before it is scored. Previously the prompt *asked* the model
not to invent vocabulary and nothing checked until API submission.

---

## The three things the data corrected

The design was built from a sample. Running the extractor over the whole corpus corrected it in
three places, each of which is in the code with its reason.

**1. A pod row is a TURN, and a turn is often several sentences.** Testing only a row's opening
word loses "Goodbye" in *"Thank you very much. Goodbye."* every time — it under-counted the
ritual open/close frame by a third (16 rows against the design's 24). Turn-opening matchers are
now applied per sentence. This is the one place the pod grain genuinely differs from the seed
grain, where one seed is one sentence.

**2. `scene_title` alone is not the register.** The design proposed reading register mechanically
from the scene. The corpus refutes it on its own data: pod-0's counter transaction with the
Barista — *"Here's your coffee."*, row `SC03-S09` — sits inside a scene titled *"A Day of
Greetings (iii) - 3 pm"*, so a title-only rule tags a service encounter as social. The SPEAKER is
the second mechanical signal and it is the reliable one: a role name (Barista, Waiter,
Receptionist, Driver) is a service encounter, a personal name is a social one. Both are read off
the attesting row, so nothing became a judgement call.

**3. "The canonical 668 seeds" is an approximation, and a false one.** Across the 80 eng-known
courses there are **2,174 distinct normalised known texts**, of which only ~653 appear in most
courses and **1,143 appear in exactly one**. The design's known-corpus-invariance re-cut is
therefore stronger than it stated — so the could-occupy artefact is keyed by known TEXT and a
course inherits a tag by matching text, never by matching seed number.

---

## The finding that matters most, and it is a curriculum finding

The gate does not just protect the learner. It turns *"we want better representation of the corpus
in the practice phrases"* into a short, specific list of what the curriculum would have to cut.

Of the 18 dialogue frames, at the **very end** of the course:

| course | ownable | unreachable |
|---|---:|---|
| `spa_for_eng` | 6 / 18 | D1 D5 D6 D9 D10 D11 D12 X1 X3 X4 X5 X6 |
| `deu_for_eng` | 10 / 18 | D1 D4 D5 D6 D10 D11 X1 X5 |
| `fra_for_eng` | 10 / 18 | D1 D5 D6 D10 X1 X4 X5 D12 |

**Every one of these courses can complete 668 seeds without ever cutting a greeting.** "hello",
"and you", "here you are", "got it" are cut nowhere in `spa_for_eng` at all. The conversational
register is not merely under-practised — it is largely **un-cut**, and no amount of prompt
engineering can produce it, which is exactly what the gate exists to say out loud.

Each refusal comes with its cheapest unlock, computed not guessed. For spa, one cut each:

- **D1 ritual open/close** — any one of "hello", "good morning", "goodbye", "bye", "see you"
- **D6 / X1 reciprocal return** — "and you" or "what about you"
- **D5 / X5 deictic handover** — "here you are", "here it is"
- **D10 / X4 read-back receipt** — "got it", "understood"
- **D11 reassurance** — "don't worry", "not at all"
- **X3 repair** — "sorry", "say that again"
- **X6 thanks → downgrade** — "not at all", "no problem", "you're welcome"

This is a decision for Tom, not for the frame layer, and nothing here acts on it.

Note also what the *naive* fix would have produced. `spa_for_eng` cuts "you" → **"usted"** at seed
639, the formal pronoun. A builder tiling "and" + "you" would have minted *"y usted"* — formal,
and not the idiomatic return. That is the design's failure mode 1 in the flesh, and the
whole-chunk rule catches it without knowing any Spanish.

---

## The before/after FRAME reading, with the numbers, and the honest answer

The brief asked for a before/after FRAME reading on at least one real basket. Here it is, and the
answer is **unchanged — for a measurable reason, not a hedge.**

`spa_for_eng` seed 599, basket L01 `"I would have"` / `"habría"`, 9 phrases:

```
frame 0.333   pos 0.333   neigh 0.222   junct 0.333   split 1.000
composite 0.569   FAIL: frame, pos, neigh, junct
[before this change: frame 0.333, composite 0.569, FAIL]
```

Identical. The FRAME denominator is `min(phrase count, pool)`. The pool did grow — from 30
seed-attested frames to 36 instantiable — but at seed 599 the `min` binds at the 9 phrases, so a
bigger pool changes nothing. And that holds all the way down:

| seed | seed-attested | pool | pod frames |
|---:|---:|---:|---|
| 1–50 | 0 → 24 | same | none — spa has cut no conversational particle yet |
| 100 | 25 | 29 | D2 D3 D7 X2 |
| 200 | 30 | 35 | D2 D3 D4 D7 X2 |
| 450+ | 30 | 36 | D2 D3 D4 D7 D8 X2 |

The pool first gains a pod frame at seed ~73 ("thanks"). By seed 73 the seed-attested count (24)
already exceeds any basket's phrase count (max ~13), so `min` has stopped binding **before** the
pool starts growing. **The two curves miss each other.** The design predicted early baskets would
read worse; for this pair — and, because the known side is largely shared, for every eng-known
pair — that does not happen, and the reason is measurable rather than a matter of taste.

So the FRAME axis moved no basket's number. What DID change is the thing the metric was always
downstream of: the generator's pool listing, and the tiling check. **I have not touched the floors
to make a number appear.** The wiring is nonetheless real and tested: `frameSig` now fires D2 on
the corpus line *"Yes, I've got a busy day today"* and did not before, and the P-part of every
merged signature is byte-identical to the old one, so no existing reading was disturbed.

---

## What was built

| file | what |
|---|---|
| `tools/frame-layer/dialogue-patterns.cjs` | **new** — 12 D-frame + 6 X-frame matchers, each with `fixed_material` |
| `tools/frame-layer/extract-dialogue-patterns.cjs` | **new** — mines the inventory, read-only, paginated, deterministic |
| `docs/frame-layer/dialogue-frame-inventory.{md,json}` | **new** — the inventory, with attestations quoted live |
| `tools/frame-layer/availability.cjs` | `instantiableFrameSet()` added; the two existing functions untouched |
| `tools/frame-layer/pattern-diversity.cjs` | merged matcher list; pool as the FRAME denominator; floors unchanged |
| `tools/frame-layer/generate-candidates.cjs` | pool listing with provenance/register; post-generation tiling check; staleness warning |
| `tools/frame-layer/corpus.cjs` | `loadPodCanon()`, `deliveredPodRows()`, `podLapsByRound()` |
| `docs/frame-layer/pair-mapping-classes.{json,md}` | 18 D/X overlay rows, `NOT ATTESTED`, kept in their own section |
| `tools/frame-layer/could-occupy.cjs` + `docs/frame-layer/could-occupy-eng.{md,json}` | **new** — the tagging |
| `tools/frame-layer/{instantiability,could-occupy}.test.cjs` | **new** — the gate's and the tagger's self-tests |
| `tools/frame-layer/patterns.cjs`, `derive-seed-job.cjs` | **untouched**, by ruling |

The dialogue inventory, mined from 932 rows (916 dialogue, 16 narrator rows excluded — a
vocabulary drip is an admission event, not a frame):

| grain | frames | commonest |
|---|---|---|
| sentence `D*` | 12 | D2 polar response (70), D3 thanks (56), D1 ritual open/close (35) |
| exchange `X*` | 6 | X2 polar-response-to-question (48), X3 repair (31), X4 instruction→read-back (9) |

59 rows fire neither inventory and are listed as the honest residue. The health source added the
two frames the design predicted it would — read-back receipt and reassurance/normalising — plus
compliance commitment.

---

## The could-occupy tagging

Commissioned alongside, delivered alongside: one read of the corpus, not two.

**A seed cannot attest a shape**, and the schema enforces that rather than merely saying it. A
move is a position defined against the turn before it; a seed is one sentence with no turn around
it. Every tag carries the class that inferred it, nothing carries an attestation count, and the
test fails if a field named `attests` ever appears.

2,174 distinct English known texts, tagged by 25 deterministic position classes against the
ratified shape store. **965 carry a specific tag; 1,185 carry only a generic one; 24 carry none**
(single-word fragments — "An idea.", "Woman.", "Badly."). The generic classes are marked as such
and never counted as coverage: "plain declarative" is true of nearly every seed and indexes
nothing.

**36 of the shape store's 110 positions get a filler. 74 do not — and that is the finding.** The
empty ones split cleanly in two, and only one half is a gap worth closing:

- **Response-relative positions** — read-back, reformulate, ratify-the-completion, "the partner
  completes it rather than answering". A seed corpus structurally cannot supply these, because
  they are defined against a prior turn. No amount of tagging fills them; pod material is where
  they live. This is the same finding as the frame delta, arrived at from the other side.
- **The deep-conversation family** (`N301`–`N306`, `N9xx`, `N501`) — Method-Pod and sector
  material, not beginner-course material. Their emptiness says the corpora are doing their
  separate jobs.

Where the corpus is rich, it is very rich: 464 sentences could open a Not-knowing shape, 276 could
fill an elicitation, 227 a claim, 108 a decline-with-account, 78 an I-don't-know-held. Where
Watson named a specific need, the corpus is thin: **"can't comply, with a reason" has 2 fillers in
2,174 sentences.**

Two calls I made and am flagging: (1) I tagged the whole eng known-language corpus rather than
one course's 668, because the artefact is keyed by known_language and that key names a corpus of
2,174; (2) `C9 decline/counter with an account` is the loosest class and visibly carries noise
("But they left with each other"), and I left it loose rather than over-tune a first pass.

---

## Gaps and decisions — plainly

**The pod delivery schedule: found, documented, deliberately not wired.** The design reported this
as an unestablished gap. It is established now, from the delivery side: pods start at
`podActivationRound` (default 6), fire every `POD_ROUND_INTERVAL` main rounds (default 5), each lap
introduces one cohort — an exchange, never crossing a scene — and a round is one LEGO. The
arithmetic is in `corpus.cjs` as `podLapsByRound`. What is *not* derivable is the answer:
`completedPodRounds` is per-enrolment runtime state and a lap can be deferred at runtime, so
"delivered by seed N" is a property of a learner, not of a course, and a generator scoring a basket
has no learner. So `deliveredPodRows` returns `null` on purpose. Every caller reads null as "no
schedule readable" and degrades to owned-only gating — which is not a degradation, because HEARD is
a ranking signal and the safety property lives entirely in OWNED. Returning `[]` would have been a
lie: it would say "nothing heard yet", which from round 6 is false.

**Method Pod excluded by default.** `method-pod-*` and `learning-flagship` (952 rows of Aran and
Tom talking *about* the method) are not mined into the learner-facing inventory — different
register, different audience. It is a CLI switch (`--pods`), not a hard exclusion.

**One repair on the way.** `tools/frame-layer/extract-patterns.test.cjs` has been dying on load
since `ea80460ed` scoped the split matchers by target language and left the test reading a bare
`.S7` export that no longer exists. Fixed; it and the other three tests pass.

**Register contamination stays a taste risk, not a gate.** Tags are surfaced to the generator; no
cap on pod-frame share per basket is hard-coded, per the design.

**Nothing needs a decision to proceed.** The one thing worth Tom's eye is the curriculum finding
above: whether the courses should cut a greeting.

---

## Verification

Four self-tests, plain `node`, no framework, one process each, all passing:

```
node tools/frame-layer/extract-patterns.test.cjs
node tools/frame-layer/derive-and-baskets.test.cjs
node tools/frame-layer/instantiability.test.cjs      ← the "And you?" acceptance test
node tools/frame-layer/could-occupy.test.cjs
```

No test suite was run: this job changed the frame layer and nothing else, and the frame layer's
verification is these four scripts. Read-only steps were verified by reading.

They were then run again from a **fresh checkout of the pushed branch with no `.env` present** —
and that caught a real defect. `generate-candidates.cjs` built its Supabase client at module load,
so requiring its pure tiling helpers made a string-tiling test die with `supabaseUrl is required`
on any machine without credentials. A test that claims "no DB, no network" has to be true when
nobody is looking. The client is lazy now, and all four pass on a bare checkout.
