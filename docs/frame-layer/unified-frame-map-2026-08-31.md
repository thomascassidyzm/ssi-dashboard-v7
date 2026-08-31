# One frame map over the seeds and the pods — the design

**Date:** 2026-08-31. **Status: DESIGN — nothing here executes anywhere.** No production change, no
DB write, no course touched. Every number below was measured read-only against the live database or
the committed corpus on the day, from a clean worktree off `origin/main`.

**The commission** (Tom): *"to have a frame map of everything in both the SEEDs and the PODS …
we want better representation of the corpus in the practice phrases for each LEGO BASKET."*

---

## One page — the verdict and the object

**The pair-invariance claim is RE-CUT, not confirmed.** The room's working read was "the frame
inventory is pair-invariant; instantiability and mapping class are pair-specific overlays." The
right statement, forced by measurements the estate already holds plus one new one: **the inventory
is KNOWN-CORPUS-invariant, not pair-invariant.** It is a function of the known-side corpus alone.
One inventory, TWO KEYINGS, and which one applies is decided by whether the source corpus CUTS.

**Seed-derived frames key to the COURSE'S KNOWN TEXT and are per-pair at the generation layer.**
There is ONE canonical seed set and it is identical by definition; a course's known text is a
different object — derived, and legitimately differentiated per pair, because the known side is a
teaching instrument. Seed 1 has 116 distinct known texts across 130 courses. The figures quoted
below — 664/668 for deu, 665/668 for jpn, **619/668 for zho** (a divergent block in the 300s —
`english-pattern-inventory.md`) — measure KNOWN TEXTS, not seeds, and they are not a defect in the
seed set. The divergence is CAUSED BY CUTTING: a LEGO is a cut, character-exactness has to enforce
the disambiguation with no gloss, so the pair's cuts reach back and differentiate the English.

**Pod-derived frames key to the CANONICAL POD TEXT and ARE pair-invariant.** Pod sentences are not
cut into LEGOs, so there are no different ways to do them: the granularity of the sentence is all
that is cared about and it is always identical in meaning. No cut, no disambiguation pressure, no
divergence. This is a property of the corpus, not an accident of today's canon. The two overlays are confirmed
pair-specific as claimed. Design consequence: every inventory file is keyed by `known_language`,
never by "the estate", and nothing breaks when the invariance degrades — because it already has.

**The object** is three parts, two of them files and one a function:

1. **`dialogue-frame-inventory.{md,json}`** — a SIBLING of `english-pattern-inventory.json`, same
   directory, same conventions: the frames the pod corpus attests that the seed corpus does not,
   in two grains — sentence-level **D-frames** (bare responses, ritual open/close, deictic
   handover, ellipted orders, thanks, reckonings) and exchange-level **X-frames** (reciprocal
   return, polar-response-to-question, repair) that span a turn boundary and cannot exist at
   sentence grain. Mined deterministically by a new `extract-dialogue-patterns.cjs` from
   `canonical_pod_scenarios` plus the sector source docs.
2. **Pair overlay rows** — the D/X frames added to the existing `pair-mapping-classes.json`
   (an EXTENSION of that file, not a new one), class `NOT ATTESTED` until a pair has target
   evidence. The Method Pod's Italian rendering (585 live rows with `target_text`) is the first
   place a pod-frame mapping class can actually be read for any pair.
3. **The instantiability gate** — a pure function in `availability.cjs`, computed per LEGO basket
   at generation time, never persisted. A pod frame enters the generator's pool only if its fixed
   known-side material maps to target chunks the walk has already cut. **Heard is not owned is
   enforced structurally**: pod content contributes frame *attestation* and **zero vocabulary** —
   production material comes wholly from cuts, always. A frame whose material no LEGO has cut is
   simply absent from the pool; the generator cannot reach it. §5.

**The load-bearing measurement** (new, 2026-08-31, read-only): running the 31 seed-mined frame
matchers over pod-0's 231 English rows fires on **169 of 231**. The 62-row residue is not noise —
it is precisely the conversational register the commission names as missing: greetings, bare polar
responses, ellipted orders ("Four single tickets to town, please"), deictic handovers ("Here's
your coffee"), thanks and closings, price reckonings. So the pod corpus's frame *delta* over the
seed corpus is **small, closed, and nameable** — on the order of 10–15 sentence frames plus a
handful of exchange frames, not hundreds — which makes the whole design cheap.

**The hard constraint, worked on a live example:** the reciprocal return "And you?" is attested
4 times in pod-0 (SC06 twice, and variants). In `spa_for_eng` — 668 seeds, 1,475 legos, every
component row — there is **no cut whose known side is "and you", no target containing "y tú", and
no lego whose target is the bare word "tú" at all** (the only substring hit is inside "estúpido").
A naive pool-widening would hand the generator a frame that raises pattern diversity and asks the
learner to produce material the curriculum has never minted. Under this design that frame is
structurally unreachable for spa_for_eng at every position — until the day a seed replacement cuts
"tú", at which point it enters the pool automatically, with no config change. That is the gate
doing exactly its job, demonstrated on the exact failure the brief predicted.

---

## 1. The proposed object and its schema

### What the unified frame map IS

Not one merged file. **The unified frame map = the seed-frame inventory + the dialogue-frame
inventory (new) + the extended pair overlay + the instantiability function.** "Unified" lives in
the *consumption path*: the generator and the metric see one pool of frames with provenance
readable from the id (`P*` seed corpus, `D*` pod sentence grain, `X*` pod exchange grain), one
overlay keyed the same way, and one gate applied uniformly. Merging the inventories into one file
was considered and rejected: the two corpora have different provenance, different freshness cycles
(seeds are immutable; pods are being authored weekly), and different attestation units (seed
number vs pod row / row-pair). A merge would couple the stable to the churning.

**Relationship to the existing artefacts: sibling inventory, extended overlay.**
`dialogue-frame-inventory.json` is a *sibling* of `english-pattern-inventory.json` (same shape
conventions, new id namespace). The overlay rows go *into* `pair-mapping-classes.json` as an
extension, because the consumer (`generate-candidates.cjs`) already reads exactly one mapping file
and giving it a second would fork the read path for no gain.

**Format: JSON**, unchanged from the layer's standing choice and for the standing reason — every
artefact has nested structure (a frame has many attestations, each with row id, speaker, scene; an
exchange has an ordered row-pair) that TSV would flatten and a builder would un-flatten.

**Where it lives, what regenerates it:**

| artefact | path | regenerated by |
|---|---|---|
| dialogue frame inventory | `docs/frame-layer/dialogue-frame-inventory.{md,json}` | `node tools/frame-layer/extract-dialogue-patterns.cjs` |
| dialogue matchers | `tools/frame-layer/dialogue-patterns.cjs` | hand-maintained, like `patterns.cjs` |
| pair overlay (extended) | `docs/frame-layer/pair-mapping-classes.json` | `render-mapping.cjs`, unchanged |
| instantiability | `tools/frame-layer/availability.cjs` (new exported function) | n/a — computed live per call |

### The schema, worked

```json
{
  "generated": "2026-09-XX",
  "known_language": "eng",
  "source": {
    "table": "canonical_pod_scenarios",
    "pods": ["pod-0", "pod-0.5", "pod-1"],
    "rows": 494,
    "sector_sources": ["docs/sector-pods/source/health-sector-conversations-v3.md"]
  },
  "sentence_frames": [
    {
      "id": "D2",
      "name": "polar response + elaboration",
      "shape": "yes|no|of course|I'm afraid , [CLAUSE]",
      "grain": "sentence",
      "position": "response",
      "fixed_material": [["yes"], ["no"], ["of course"]],
      "register": ["social", "service"],
      "shape_nodes": ["N2", "N3", "N5"],
      "attestations": [
        { "row": "pod-0:SC03-S06", "speaker": "Barista",
          "text": "No, we've only got drinks.",
          "initiating_row": "pod-0:SC03-S05" }
      ],
      "count": 31
    }
  ],
  "exchange_frames": [
    {
      "id": "X1",
      "name": "reciprocal return",
      "shape": "[WH-Q] → [A] + and you? → [A]",
      "grain": "exchange",
      "positions": ["answer-plus-return", "return-answer"],
      "fixed_material": [["and you"]],
      "sentence_projection": "D-return",
      "shape_nodes": ["N5"],
      "attestations": [
        { "rows": ["pod-0:SC06-S01", "pod-0:SC06-S02", "pod-0:SC06-S03"],
          "texts": ["What's your name?", "My name is Anna. And you?", "I'm James. Pleased to meet you."] }
      ],
      "count": 4
    }
  ]
}
```

Field notes, each a decision:
- **`fixed_material`** is the frame's own lexical skeleton, as a list of alternates each being a
  list of chunks. This is the field the instantiability gate tests (§3). Slots are free material
  and are covered by the ordinary vocabulary rules.
- **`position`** (`initiating` / `response` / `either`) is what the seed corpus cannot attest —
  the seeds are 100% statements — and is the single most valuable bit the pod corpus adds.
- **`register`** tags come mechanically from the attesting scene (`scene_title` gives the
  situation class); they exist so a consumer can weight or exclude service-counter frames from a
  general basket (§6, register contamination).
- **`shape_nodes`** is a CROSS-REFERENCE into `docs/pods/shape-graph-2026-08-30.md`'s node ids
  (N1–N17), never an embedding. Frames and shapes stay different layers: a shape is a bound
  sequence of positions filled by families; a frame is a surface shape with slots. An X-frame is a
  frame-grain refinement of one adjacency inside a shape, and the reference records which one.
  Nothing in the shape store changes.
- **Pod frames get their own id namespaces (`D*`, `X*`)** — taste-safe default taken and flagged:
  provenance readable from the id alone, so the generator and any audit can gate on it in one
  character.

## 2. How frames are extracted from the pod corpus

The pod corpus is dialogue, not sentences, so the method has two passes at two grains, plus a
dedup rule. All of it is deterministic (regex matchers + an adjacency join); the LLM appears only
as a one-off authoring assist for the matcher list, via the Claude CLI, never at runtime.

**Pass 1 — sentence grain (D-frames).** Run over every canon row's `english_text` exactly as
`extract-patterns.cjs` runs over seed known sides. Two outputs: (a) which SEED frames the pod rows
attest — measured today: 169/231 pod-0 rows fire ≥1 of the 31, led by P20 question (105), P4
modal (42), P21 wh-question (34) — these need no new inventory entry, only new attestation
context (position: many are *responses*, which no seed is); (b) the residue rows, which are where
the D-frame matchers come from. Measured today over the 62-row pod-0 residue plus matcher
candidates run over all 231:

| candidate | hits in pod-0 | specimen |
|---|---:|---|
| D-ritual open/close | 24 | "Good morning, Sarah!" |
| D-polar response + elaboration | 31 | "No, we've only got drinks." |
| D-thanks / gratitude close | 15 | "Thank you for being so friendly." |
| D-apology / attention | 11 | "Excuse me, is this seat taken?" |
| D-deictic handover | 6 | "Here's your coffee." |
| D-reciprocal return | 4 | "My name is Anna. And you?" |
| D-uptake assessment | 4 | "Excellent choice. I'll bring it right over." |
| D-ellipted order | 3 | "Four single tickets to town, please." |
| D-reckoning | 2 | "That's eight pound forty altogether." |

(Narrator vocabulary-drip rows — "1. 2. 3. White. Black." — are excluded by speaker; they are
admission events, not frames.) The list will grow a few entries when pod-1, pod-0.5 and the sector
sources are mined — the health source adds e.g. instruction+read-back and reassurance frames — but
the shape of the finding is already clear: **the delta is a closed set of order 10–15.**

**Pass 2 — exchange grain (X-frames).** Join each row to its predecessor on
(`pod_slug`, `global_order`), same mechanical adjacency the shape-graph derivation used for its
ticket-class test. An X-frame is a *frame-grain pattern over an adjacent pair (or triple)*: the
initiating row's frame signature + the response row's D/P signature + any fixed pivot material.
A frame **can** span a turn boundary — that is the definition of the grain — but only within one
scene (`scene_number` change breaks adjacency).

**Double-counting rule, stated:** a row attested by a D-frame and *also* sitting inside an
X-frame attestation is counted once at each grain and **never summed across grains**. D-counts
and X-counts are separate columns answering separate questions ("how common is this utterance
shape" vs "how common is this exchange shape"), exactly as the seed inventory's multi-label
counts already refuse to sum to the seed total.

**Relation to the shape graph, so the layers do not silently merge:** the shape graph's N5
"Acquaintance: Q → A+return → A+return…" is a shape — positions filled by families, no surface
commitment. X1 "reciprocal return" is a frame — it commits to the surface pivot "And you?" and to
frame-signatures either side. One N5 walk can attest several X-frames; one X-frame can appear
inside shapes other than N5. The `shape_nodes` field records the observed containments and
nothing more.

### Three worked examples, end to end

**X1 — reciprocal return** (pod-0, SC06, quoted live):
> [James] "Excuse me. Hello. What's your name?" → [Anna] "My name is Anna. **And you?**" →
> [James] "I'm James. Pleased to meet you."

Extraction: adjacency triple; initiating signature P21 (wh-question); middle row = answer +
fixed pivot "and you"; third row = return-answer. Inventory entry: `X1`, positions
`answer-plus-return` / `return-answer`, fixed_material `[["and you"]]`, shape_nodes `[N5]`,
sentence_projection `D-return` (the middle row's utterance shape, usable at sentence grain).
Instantiability for spa_for_eng: **not instantiable at any walk position** — "and you" has no
owned target mapping (measured: no lego, no component, no bare "tú" anywhere in the pair). The
gate excludes it from every basket pool. For a pair that has cut the return pivot, it enters
automatically.

**D2 — polar response + elaboration** (pod-0, SC03):
> [Sarah] "Do you have anything to eat?" → [Barista] "**No, we've only got drinks.**"

Extraction: sentence grain, matcher `^(yes|no|of course|I'm afraid)[,. ]` on a row whose
predecessor fires P20; position `response`. The elaboration body is ordinary seed-frame material
(P23 negation here), so the frame's fixed material is just the particle — which IS cut early in
essentially every pair. Instantiability: early and nearly universal. This is the frame that puts
the missing response register into early baskets at almost zero cost, and it is the strongest
single argument for the whole design.

**D-uptake assessment + continuation** (pod-0, SC09; health source, nurse flow 3):
> [Customer 2] "A bottle of the house red would be lovely." → [Waiter] "**Excellent choice.** I'll
> bring it right over."
> [P] "Actually, I'd rather stick to English today…" → [HW] "**Of course, no problem at all.**
> English it is. Let's get you sorted."

Extraction: sentence grain, response position, fixed material the assessment token
("excellent choice", "of course", "no problem"); the continuation clause is seed-frame material.
The health specimen shows the same frame carrying a *graceful-switch* move in a sector pod —
same frame, different register tag (`clinical` vs `service`), which is exactly what the register
field is for.

## 3. Instantiability per LEGO — definition and algorithm

**Definition.** A frame F is *instantiable* for basket (course, seed N, lego k) iff the learner
at that position can PRODUCE a phrase in F using only owned material. Two clauses:

1. **Owned (required, the safety gate):** every chunk in at least one alternate of
   `F.fixed_material` resolves, whole-chunk, against `availableVocab({legos, components,
   seed: N, legoIndex: k})` — i.e. some available row's known side *is* that chunk (normalised),
   giving it an owned target realisation. Same whole-chunk discipline as the validator: no
   re-conjugation, no invention. Seed frames (`P*`) pass this trivially by construction — they
   are attested by prior seeds, and a prior seed's material arrived through cuts — so for them
   the existing `attestedFrames(priorSeeds)` remains the whole test, unchanged.
2. **Heard (desirable, not required):** F is attested in pod content delivered at or before this
   position in the walk. *Decision:* heard is a ranking signal, not a gate. The safety property
   lives entirely in clause 1; seeds themselves have never been heard-gated; and making heard a
   hard gate would couple generation to the pod delivery schedule, which is the one integration
   fact this design does not pin (see gap below).

**"Delivered pod content" as a position in the walk:** the design defines the interface —
`deliveredPodRows(course, seedNumber) → rows` — and leaves its implementation to the build,
because pod scheduling is a delivery-side fact (ssi-learning-app) this job did not verify.
**Explicit gap, honestly reported:** I did not establish where the pod-vs-seed interleaving
schedule lives, and I did not paper over it — the algorithm is stated so that an empty answer
("no schedule readable") degrades to owned-only gating, which is safe.

**A frame with no target realisation scores nothing.** It is not "scored low" — it is absent
from the pool and absent from the FRAME denominator. Scoring it at all would let an unreachable
frame punish a basket for not doing the impossible.

**Algorithm** (implementable as written, all pure functions):

```
instantiableFrameSet(course, seed, legoIndex):
  vocab    = availableVocab({legos, components, seed, legoIndex})      # exists today
  attested = attestedFrames(priorSeeds, seedRow)                       # exists today — P* frames
  known    = set(norm(v.known_text) for v in vocab)
  pool     = { P in attested }                                         # unchanged
  for F in dialogueInventory.sentence_frames ∪ exchange_frames:
    if any(alternate ⊆ known for alternate in F.fixed_material):       # OWNED — the gate
      pool += F   (ranked up if deliveredPodRows attests F by this seed)  # HEARD — the nudge
  return pool
```

**The gate is structural, twice over.** First structurally in the pool: a frame failing OWNED is
never in the list the prompt offers, so the generator cannot select it. Second structurally in
the check: the build adds a post-generation **target-tiling check** to candidate scoring — every
candidate phrase's target must tile whole-chunk from the available vocabulary, else the phrase is
rejected before scoring. This closes the loophole the current lab leaves open (the prompt *asks*
the model not to invent vocabulary; nothing verifies it until API submission) and it protects
seed-frame phrases exactly as much as pod-frame ones. With both in place I find no honest sense
in which the gate is advisory; the weakest-alternative clause of the brief is not needed.

## 4. Plug-in points — named files, named functions

| file | change |
|---|---|
| `tools/frame-layer/patterns.cjs` | **untouched** |
| `tools/frame-layer/dialogue-patterns.cjs` | **new** — D/X matcher definitions, same `P()` idiom, plus `fixed_material` per frame |
| `tools/frame-layer/extract-dialogue-patterns.cjs` | **new** — reads `canonical_pod_scenarios` (+ sector source md), runs both passes of §2, writes `docs/frame-layer/dialogue-frame-inventory.{md,json}`. Read-only against production; sibling of `extract-patterns.cjs` |
| `tools/frame-layer/availability.cjs` | **extend** — add `instantiableFrameSet()` (§3) beside `availableVocab` / `attestedFrames`; both existing functions unchanged |
| `tools/frame-layer/pattern-diversity.cjs` | **extend** — `frameSig()` takes the merged matcher list so D-frames produce signatures; `score()`'s `instantiableFrames` argument becomes the size of the §3 pool instead of `attestedFrames(...).size`. Axes, weights, floors: see below |
| `tools/frame-layer/generate-candidates.cjs` | **extend** — `buildPrompt()`'s "FRAMES YOU MAY INSTANTIATE" section lists the §3 pool with provenance and register tags (`D2 polar response [response position; particle: sí/no]`); add the post-generation target-tiling check before `scoreBaskets` |
| `tools/frame-layer/derive-seed-job.cjs` | **untouched** — a seed's teaching job stays seed-derived. Pods do not teach; they attest and prime. Pod frames never appear in an admission diff |
| `tools/frame-layer/corpus.cjs` | **extend** — add `loadPodCanon(sb, course)` (paginated, read-only) and the `deliveredPodRows` interface stub |
| `docs/frame-layer/pair-mapping-classes.json` | **extend** — D/X rows per pair, `NOT ATTESTED` placeholder default (the existing `NOT *` convention in `expensiveClassFor` already skips placeholders, so this costs zero code) |

**The metric's floors, faced honestly.** The FRAME denominator is
`min(phrase count, instantiable frames)`. Late-course baskets are untouched: the pool (31 + ~12)
already exceeds phrase count (~9–11) before this change, and `min` caps it. **Early baskets score
lower**, because early pools were small (a handful of attested frames) and D2/D-ritual/D-thanks
are ownable almost immediately, so the ceiling rises exactly where the conversational register
can and should live. That is the design working, not a calibration accident: an early basket that
stamps nine statements now reads as thin *because it is thin against what the corpus attests*. The
floors themselves (0.34 etc.) stay; if live runs show early seeds structurally unable to clear
FRAME with floors unchanged, the fix is per-band floor relaxation in the lab config, decided on
lab evidence, not pre-emptively here.

## 5. What it costs

| item | order of magnitude |
|---|---|
| build `dialogue-patterns.cjs` + `extract-dialogue-patterns.cjs` + tests | 1–2 worker-days (opus tier for the matcher authoring, sonnet for the rest) |
| extend availability / metric / generator + self-tests | ~1 worker-day |
| overlay rows + README row + md render | hours |
| **one-off matcher authoring assist** (Claude CLI, never the SDK) | pennies — the whole pod canon is 1,446 rows; a full-corpus read is ~80k tokens once |
| run the extractor over the corpus | seconds — regexes and one adjacency join over ≤2k rows, no LLM |
| keep fresh as pods are authored | seconds per re-run; wire a staleness check (canon `max(updated_at)` vs inventory `generated`) into the extractor and the generator's startup so a stale inventory warns rather than lies |
| added per-generation cost in the phrase generator | negligible — ~15 extra frame lines in a prompt that already carries a multi-thousand-entry vocabulary; the post-generation tiling check is pure string work |

No new infrastructure, no new tables, no schema change, no runtime LLM cost.

## 6. The honest failure modes

1. **Heard-is-not-owned residue: idiomaticity past the tiling gate.** OWNED tests chunk
   availability, not idiom. A pair might own "and"+"you"-equivalents whose concatenation is not
   the natural return ("¿y tú?" is idiomatic; a tiled literal might not be). Mitigation: pod
   frames carry mapping classes per pair like every other frame, `NOT ATTESTED` until evidenced,
   and frame-ZUT applies to them unchanged; a frame whose target realisation for a pair is
   idiomatic-not-compositional needs a cut (usually a small M-LEGO) before it is honestly usable
   — which the gate then detects mechanically. Residual risk lives in the window where tiling
   passes and idiom fails; the phrase-level QA rubric is the net under it.
2. **The invariance break widening.** Already real: zho's known side diverges on 49 seeds, and the
   pod canon is single-English only for now. If a known-language fork of the pod canon arrives,
   each fork needs its own mining run. The design degrades gracefully — everything is keyed by
   `known_language` — but the *sharing assumption* in people's heads is the thing to watch, not
   the files.
3. **Register contamination.** Pod dialogue is spoken and situated; a frame mined from a
   service-counter exchange ("That's eight pound forty altogether") may be wrong material for a
   general basket. Mitigation: mechanical register tags from the attesting scene, and the
   generator surfaces them so selection can discount; a cap on pod-frame share per basket is
   available as a lab knob. This is a taste risk, not a safety risk — ZUT is not threatened —
   so it is managed, not gated.
4. **Staleness.** Four sector-pod authoring jobs are queued now; the inventory is stale the day
   they land. The staleness check (§5) makes stale loud. The deeper version: if sector pods start
   carrying frames that *should* reshape early general baskets, that is a curriculum decision for
   Tom, not an extractor re-run — the design keeps the two separable.
5. **Exchange frames under-consumed.** The generator writes single utterances; X-frames' full
   value (practising the *response position* against a heard initiation) needs the prompt to
   carry an initiating turn as context, which touches the player and is out of this design's
   scope. Until then X-frames contribute via their sentence projections only. Named so nobody
   thinks the map is already doing what only the player change can do.

## 7. Judgement calls — one line each, decided

1. **Pair-invariance:** re-cut to known-corpus-invariance; measured, not assumed; files keyed by
   `known_language`.
2. **One file or two:** two inventories (sibling), one overlay (extended) — the churn boundary
   and the consumer's read path both say so.
3. **Pod id namespace:** yes — `D*`/`X*` prefixes, provenance readable in one character.
   *(flagged, default taken)*
4. **Pods contribute attestation, never vocabulary:** decided — this is what makes the ZUT gate
   structural rather than advisory.
5. **Heard is a ranking signal, not a gate:** decided — safety lives in OWNED; seeds were never
   heard-gated either.
6. **Frames with no target realisation:** absent from pool and denominator, never "scored low".
7. **`derive-seed-job.cjs` untouched:** pod frames never enter an admission diff — pods do not
   teach.
8. **Floors unchanged, early baskets read worse:** correct on the merits; re-calibrate per-band
   only on lab evidence.
9. **Exchange frames recorded now, consumed via sentence projection until the player can carry an
   initiating turn:** decided.
10. **Could-occupy seed tagging** (the January six-layers thread): a SEPARATE downstream job, not
    folded in. *(flagged, default taken)* Sketch: tag each of the 668 seeds with the shape
    positions it could occupy (`could_occupy: [{shape: N5, position: "answer"}]`) — a
    could-occupy, never an attestation — as a fourth artefact beside the inventories; it turns
    the seed corpus into the metagraph's material supply and is the natural bridge between this
    map and walk authoring, but it needs its own evidence pass and its own acceptance test.
11. **Evidence scope:** spa_for_eng + pod-0 + the health source, as briefed; deu contrast NOT
    added — the estate had already measured the cross-course comparison (664–668/668), so a
    second pair would have re-bought owned evidence. *(flagged)*
12. **Document lands at `docs/frame-layer/unified-frame-map-2026-08-31.md`** with a README row
    added. *(flagged, default taken)*

## Gaps — explicit

- **Pod delivery schedule:** where "delivered by seed N" is defined was not established; the
  design degrades to owned-only gating when it is unreadable. Pin at build time.
- **Sector-source mining:** the health markdown was read and sampled, not exhaustively mined; the
  D-frame list will grow a few entries when the extractor is actually built and run.
- **The two-layer doc's "no target column of any kind" is now stale at schema level:**
  `canonical_pod_scenarios` has gained `target_text`/`target_lang`, populated for the Method Pod
  in Italian (585 rows), null for pod-0/0.5/1. The deeper claim — **pods do not cut** — stands:
  renderings are translations of shape-layer material, not agreements, and nothing in this design
  assumes a pod target side.

**Nothing here executes anywhere. No course was touched, no row written, no audio queued.**
