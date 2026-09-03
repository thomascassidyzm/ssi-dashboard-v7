# The two-layer graph — tested on spa_for_eng

**Date:** 2026-08-30. Read-only against Supabase — no writes of any kind. Scoped to one pair,
spa_for_eng, deliberately. Every number below was re-derived from the live rows on the day, not
quoted from a document.

**Corpus read live:** 668 seeds, 1,475 cuts (677 A-legos, 798 M-legos), 16,328 practice-phrase rows
(5,133 build, 10,072 use, 1,123 component), 1,383 phrase baskets averaging 11.0 phrases. The 668
matches the commission's figure exactly.

---

## The numbers first

- **Bundling debt: 66 lumps — 4.5% of the pair's 1,475 cuts, 12.3% of its 538 decomposable
  bundles.** Definition and breakdown in §3. A further 207 bundles (38%) are UNDECIDED for lack of
  evidence, so 66 is a floor with a stated ceiling, not a point estimate.
- **The walk reproduces 73% of the live baskets** (11,158 of 15,205 build/use phrases tile entirely
  from nodes introduced at or before that point). **17.5% contain target material no legitimate
  walk produces** — and that category has structure, which is the interesting finding (§2).
  9% are undecidable because the stored decomposition is stale or missing.
- **Cuts too narrow (still divergent): 4** of 1,326 distinct known texts at the lego layer. The
  lego layer is almost exactly ZUT-clean.
- **Pods do not cut at all.** The pod canon (`canonical_pod_scenarios`, pod-0's 231 rows) carries
  `english_text` and no target column of any kind. Not "un-decomposed" — there is nothing on the
  target side to decompose. §5.
- **The two-layer split holds, with one honest break**: the upper layer is not fully
  language-independent — agreements leak upward into the known side. Named precisely in §1 and §6.

---

## 1. The two layers, stated — and the seam

**Upper layer — compressions.** Exchange shapes, response positions, and the canonical English
frame inventory (31 frames over the 668-seed known side, per `docs/frame-layer/`). Order-independent:
the whole corpus can be mined at once, which is exactly what `extract-patterns.cjs` does. The shape
graph of `docs/pods/shape-graph-2026-08-30.md` lives here entirely — 17 exchange shapes derived
from pod-0 without ever consulting a target language. Nothing in this layer names Spanish.

**Lower layer — agreements.** The cuts. A LEGO is not a word, it is a cut, and a cut is a relation
between two specific languages: "she doesn't want" → "ella no quiere" exists only for this pair.
Order-dependent: each cut constrains every later one through ZUT, so the layer is a history, not a
decomposition. This is measured, not asserted — §3's order signature shows 48 live lumps that exist
because their atom arrived later.

**The seam, and what crosses it.**

Crosses downward:
- **The seed sentence pair.** The known side is a shape-layer sentence; its target side is the
  first agreement made from it. The seed is the seam object — one foot in each layer.
- **Split triggers.** Frame-ZUT requires the known-side prompt to carry the trigger that selects
  a split's outcome (subject switch, matrix negation, specificity). A trigger is shape-layer
  material recruited to do agreement-layer work.

Crosses upward — this is the break in the "agnostic by construction" claim:
- **Agreement pressure on the known side.** The known side is a controlled language, and what
  controls it is partly the *pair*. "I know" cannot be a clean cut for Spanish (sé/conocozco —
  see §4), so the prompts must be shaped to carry a fact or a person; the deu/jpn pair-contract
  would shape them differently. The upper layer's *inventory* is language-independent; the
  *selection and phrasing* of prompts is co-designed with the target. The metagraph is agnostic;
  the known-side corpus as authored is not purely upper-layer.

Cannot cross, either direction:
- **Cuts and their targets** — no such object as a language-agnostic cut; confirmed empirically:
  the same frame P17 is a SPLIT for spa, an INVERSION for deu, an ERASURE for zho
  (`pair-mapping-classes.md`). The *mapping class itself* is a property of the seam, not of
  either layer.
- **Phrase baskets** — they are walks in the lower layer (§2) and mean nothing pair-free.
- **Bundling debt** — a fact about one pair's one traversal order.

Where this agrees with the shape-graph doc: fully, on scope — that graph needed no target language,
and this analysis needed no exchange shapes. The two artefacts never touch the same object except
the seed sentences, which is the seam behaving as stated.

---

## 2. The walk, tested against the live baskets

Tom's mechanism, carried in substance: a new LEGO adds a node; phrases are created by walking the
new node back into the existing network; each legitimately traversed path becomes a phrase in the
new LEGO's basket.

The live data made this directly testable: **every phrase row stores its own walk** — a
`decomposition` column listing the legoIds tiled to make it. So the test is exact, not
reconstructed: for all 15,205 build/use phrases, does every element of the stored walk resolve to a
node introduced at or before that phrase's position, and does the tiling cover the whole phrase?

| verdict | phrases | share |
|---|---:|---:|
| **Walk-legal** — tiles entirely from introduced nodes (incl. punctuation-only residue and unattributed material that an introduced node does cover) | 11,158 | 73.4% |
| **Un-noded material** — target words with no node at that point | 2,592 | 17.0% |
| **Forward reference** — walks through a lego minted at a later seed | 76 | 0.5% |
| **Undecidable** — stored decomposition stale (1,022; e.g. decomposition says "todo el día", phrase says "todos los días") or missing (357) | 1,379 | 9.1% |

**What the walk reproduces:** 73% of the live basket, exactly as authored, with the stored walks
resolving cleanly. For those phrases the basket is *already* derived in all but name — the walk is
in the database.

**What the walk produces that the basket does not:** everything. By seed 300 the network holds 742
nodes; a basket holds ~11 phrases. The walk defines a space; the basket is a *selection* from it.
So "derived rather than authored" needs two parts: the walk (which generates) plus a selection
rule (which chooses ~11 paths from thousands). The selection rule already exists and is already
yours: the pattern-diversity metric of `frame-zut.md` — frames, positions, neighbours, junctions,
split-crossing, floors — is precisely an objective over walks. Basket derivation = walk + that
scorer. Nothing new needs inventing; the two existing artefacts are the two halves.

**What the basket contains that no walk produces — the third category, and it has structure.**
2,592 phrases (17%) use target material that was never a node at time of use. The champions:
**más** (444 phrases), **con** (427), de (195), me (185), quiere standalone (145), empezar (119).
And the reveal: **"more" and "with" never become standalone legos anywhere in the course.** The
first node whose target is bare "con" is seed 333 ("with the group"); bare "más" is seed 360
("anything else"). Yet both are used freely in phrases from the 20s onward.

The band structure makes the mechanism visible:

| band | phrases | walk-legal | un-noded |
|---|---:|---:|---:|
| seeds 1–100 | 2,698 | 78% | 19% |
| seeds 101–400 | 8,086 | 67% | **26%** |
| seeds 401–668 | 4,421 | **82%** | 2% |

Un-noded material peaks mid-course and collapses to 2% late — the walk becomes self-sufficient
only once the function-word atoms have finally landed. Read against §3: this is bundling debt's
shadow at the phrase layer. The early cuts bundled the function words into lumps ("contigo",
"muy bien", "con el grupo"), so mid-course phrase authors needed "con" and "más" as free atoms
that the cut history never minted, and reached outside the network to get them.

**Verdict on the derivation claim:** the basket is derivable by a walk *for the network the course
should have had*. Against the network it actually has, 17% of the live basket is unreachable — not
because the walk idea is wrong but because the node inventory is mis-cut. The walk test and the
debt measure convict the same cuts from two independent directions, which is decent evidence the
frame is right.

---

## 3. Bundling debt — defined, then measured

**Definition (computable).** Per the ZUT minimality rule: a LEGO should be the smallest chunk that
is deterministic known→target. A cut is a **lump** — carries debt — when it is wider than that
minimum: it can be split into component chunks each of which is *itself* deterministic across the
whole live corpus (every attestation of that known chunk, in any lego or component tiling, maps to
one target form). If any component chunk is divergent corpus-wide (e.g. "the" → la/el/los/las),
the bundle is doing real ZUT work and is **forced** — correctly cut. Chunks attested only once
give no evidence either way → **UNDECIDED**, per the taste-safe default, never rounded into
either side.

**Measured, over the 538 M-legos with 2+ components** (evidence: 1,930 distinct known chunks,
147 divergent):

| class | count | share of bundles |
|---|---:|---:|
| **Forced** — contains a corpus-divergent chunk; the bundle is the ZUT fix | 303 | 56% |
| **Over-wide** — every component individually deterministic (≥2 attestations); a lump | 28 | 5% |
| **Undecided** — determinism unprovable from single attestations | 207 | 38% |

**The order signature, separately:** 48 lumps contain a chunk whose *same-target* standalone atom
is minted at a **later** seed — the atom arrived after the lump, so a reversed order composes the
lump instead of minting it. Specimens: "very well" → "muy bien" cut at seed 13, atom "very" → "muy"
minted at seed 330; "I'm trying to think" minted whole at seed 638 when "I'm trying to" has existed
since seed 2; "she doesn't want to seem unfriendly" minted as one M-lego at seed 300 containing
"she doesn't want" cut at seed 35.

The two measures overlap by 10, so:

> **Bundling debt on spa_for_eng: 66 lumps — 28 wider than the minimal deterministic cut, 48
> order-artefacts (atom minted after the lump), 10 both. 4.5% of the pair's 1,475 cuts; 12.3% of
> its decomposable bundles. Floor, not point estimate: 207 bundles are undecidable on current
> evidence, and 677 A-legos are author-declared atoms this method cannot audit.**

**How the two directions of ZUT violation relate.** Too-narrow cuts (still divergent) number just
**4**: good → bueno/buena, friend → amigo/amiga, I know → sé/conozco, to leave → irte/irse. Too-wide
cuts are the 28 over-wide lumps. They are the two failure modes either side of the same minimum:
narrow cuts fork production now; wide cuts tax recombination forever after. The course sits hard
against the narrow edge — 4 vs 66 — which is what you would expect from a gate that enforces
divergence and nothing that enforces minimality. **ZUT is enforced; minimality is not; the debt is
the difference.**

**Is there an objective function to search over? Yes.** The determinism census (which chunks are
divergent, corpus-wide) is a property of the corpus alone — order-independent. Given any candidate
seed order, the forced/over-wide classification recomputes mechanically, so debt-under-an-order is
a computable objective, and "which order minimises bundling" is a well-posed search. Two honest
caveats: (a) the 38% UNDECIDED band means the objective is a floor unless phrase-level attestation
is added as evidence (it can be — the 15,205 decompositions carry thousands more chunk
attestations); (b) the mechanical over-wide verdict does not know intention-hood — "next month" →
"el mes que viene" is mechanically a lump but arguably one intention, and that residual call is
yours. The live number, 66, is the debt of the one arbitrary order nobody optimised — the first
baseline any searched order would be measured against.

---

## 4. Is the cut genuinely forced — the disjoint-contexts question

Answered with the methodology as it stands, then with the live evidence.

**The methodology:** ZUT is one-directional and course-wide — one English intention, exactly one
target form, with no context escape hatch *at equal knowns*. But the load-bearing word is
INTENTION: if two occurrences sit in genuinely disjoint contexts, they are two intentions, and the
fix is never to permit a fork — it is to re-cut so the prompt's known material carries the
difference. At which point the knowns are no longer the same, and ZUT is satisfied trivially rather
than relaxed. So: **ZUT permits the split only by converting it into two different knowns.
Same-known-different-target is never permitted, disjoint contexts or not.**

**The live evidence:** the course does carry exactly 4 same-known→different-target cuts (§3 list).
The sharpest is "I know" → sé (S0059L01) / conozco (S0085L01 and five more) — split S9, which the
splits doc itself marks "no English trace at all". At bare-lego grain this forks: a learner
producing from "I know" alone has two forms. In full prompts the object usually disambiguates
("I know the answer" / "I know a young woman"), i.e. the disambiguator reaches the prompt and the
*phrase-level* knowns differ — which is exactly the sanctioned mechanism. So the precise statement
is: **the live course does it in 4 places, at the lego grain only, relying on phrase context to
carry what the cut itself does not.** Under the methodology those 4 are re-cut candidates, not
precedent. The answer to "does ZUT permit it in principle?" is: it permits the *effect* via
re-cutting, never the *mechanism* of a forked mapping.

---

## 5. Do pods and seeds cut the same way?

**No — and more strongly than the question assumes.** The pod canon carries no lower layer at all:
`canonical_pod_scenarios` has an `english_text` column and no target text of any kind. Pod-0's 231
rows are English sentences with speaker and order. There are no cuts, no components, no
decompositions — nothing on the target side to decompose. This is not an unfinished lower layer;
the canon is authored entirely in the upper layer, which is precisely why the shape graph could be
derived from it without touching a target language.

Reasoning from the settled rulings — pods are listening walks, courses are producing walks, heard
is not owned, everything in a pod is availability-only: a listening walk never requires the learner
to produce, so it never needs a deterministic production function, so ZUT has nothing to bite on
and a cut has no job. **Cuts exist to make production deterministic; pods do not produce; therefore
pods do not cut.** When a pod is rendered into a target language, that rendering is a translation
of shape-layer material, not a set of agreements the learner must own.

Consequence, and it does collapse a lot: **the LEGO layer only ever touches seeds.** Pods are pure
shape-layer evidence — usable for mining exchange shapes, response positions and frames for any
pair at zero per-pair cost — and the whole cost of a pair (cuts, splits, debt, order) is
concentrated in the producing walk. The two-layer split and the pods/courses split are the same
split seen from two sides, which is a point in the frame's favour that nobody had to arrange.

---

## 6. Where the frame breaks, and what travels

**The honest break, restated from §1:** "upper layer agnostic by construction" is true of the
metagraph and false of the known-side corpus as authored. The controlled known language is
co-designed with the pair — prompt phrasing must carry target-side triggers and avoid target-side
forks, so agreements reach upward into shape-layer text. The seam is not a clean line through the
objects; it is a clean line through the *object kinds*, with the seed corpus deliberately built to
straddle it. Anyone inheriting "two layers" as settled ground should inherit it in that form.

**The culturally-agreed rim:** untestable from this pair, said in one line — spa_for_eng and pod-0
share one Anglosphere interaction culture, so nothing in this corpus can separate a universal core
from a cultural rim. The one visible hint is negative: the pod canon being English-only means the
estate is currently *betting* the shape layer travels whole; the rim hypothesis predicts that bet
fails at specific shapes (deference, premise-challenge), and no data here can settle it.

**Expected to travel** (stated expectation, untested, scoped out of this job): the exchange-shape
graph; the 31-frame inventory *as a per-known-language object* (measured 664–668/668 identical
across eng-known courses in the frame-layer work); frame-ZUT as a rule-form; the debt definition
and the walk test — both are pair-parametric machinery with no Spanish in them.

**Expected to relocate:** every mapping class (the same frame lands as SPLIT/INVERSION/ERASURE by
pair); the splits themselves; the entire cut inventory; the debt *number* — an erasure-heavy pair
(zho) should bundle less because less divergence forces bundles, an agreement-heavy pair (deu
gender/case) more. The 4.5% is a spa_for_eng fact and nothing else.

---

## 7. Method, defaults taken, and gaps

**Method (reproducible).** Read-only pulls of `course_seeds`, `course_legos`,
`course_practice_phrases` for spa_for_eng (paginated 1,000/range). Walk test: for each build/use
phrase, resolve every stored `decomposition` element against the lego inventory ordered by
(seed_number, lego_index); unattributed tokens checked against the earliest node carrying that
exact target text; coverage checked by normalised concatenation. Debt: mapping census over all
lego and component (known→target) pairs, normalised (case/punctuation stripped, diacritics kept);
bundles classified forced/over-wide/undecided as defined in §3; order signature = component chunk
with a same-target standalone lego at a strictly later seed. Throwaway scripts in
`scripts/two-layer/` (gitignored workspace, not part of the deliverable).

**Taste-safe defaults taken, each overrulable in a word:**
1. Debt counted in LEGOs, reported as count and % of cuts — kept, it worked.
2. Undecidable cuts in a separate UNDECIDED bucket — kept; it is 38% and honestly large.
3. Basket test run on **all** 15,205 phrases rather than a sample — cheaper than sampling once the
   decompositions turned out to be stored.
4. Live rows preferred over documents — exercised twice: the walk verdicts ignore 1,022 stale
   stored decompositions rather than trusting them, and every count in this doc is re-derived
   (668 seeds confirmed; the 31-frame and 12-split figures are cited from the frame-layer
   artefacts, which themselves derived live on 2026-08-29, and were not re-mined here).

**Gaps, explicit:**
- The 677 A-legos (323 with multi-word knowns, e.g. "to seem") are author-declared atoms with no
  component data; the minimality audit cannot see inside them. Debt among them is unmeasured.
- The UNDECIDED 207 could be substantially resolved by adding the 15,205 phrase decompositions as
  attestation evidence; not done, to keep the definition clean for a first number.
- Intention-hood of the 28 over-wide lumps is a mechanical verdict awaiting your ear — the full
  list is small enough to read in two minutes and half of it is time expressions.
- Data-integrity finds reported in passing, not fixed, nothing touched: 1,022 stale
  decompositions, 357 missing, 76 forward references, and one pipe-annotation debris row
  ("cuando | it → importa") in a component list.

**Nothing here executes anywhere. No course was touched, no row written, no audio queued.**
