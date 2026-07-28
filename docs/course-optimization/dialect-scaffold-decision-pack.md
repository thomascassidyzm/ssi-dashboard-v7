# Dialect courses vs parent scaffold — decision pack for Kai (2026-07-28)

> **FOUNDER RULINGS (Tom, 2026-07-29):** (1) fra_ca's colloquial Québécois register is **deliberate and intended** — protect as-designed; no re-authoring toward standard register. (2) Authoring is **target-language-centric**: dialect nuance in the known-language side is permitted where the target structure wants it; known-language REUSE is harvested at the asset layer (content-addressing), not forced by an authoring gate — the scaffold drift gate should REPORT divergence for review, not fail the build. Read Option C through this lens.

Founder-commissioned. Question: the three dialect courses (`spa_mx_for_eng`, `por_br_for_eng`,
`fra_ca_for_eng`) were found to share only ~33% of their English side with their parents
(`spa_for_eng`, `por_for_eng`, `fra_for_eng`) — but the design model is ONE shared known-language
scaffold per macro-language, with dialect courses as skins ("we never say Mexican Spanish in the
prompts"). Should we retrofit the existing dialect courses onto their parents' scaffold, or leave
them and enforce the rule only for future dialect courses?

**Data provenance:** every number below is a full-population query against live Supabase
(2026-07-28), not a sample — except where a row is quoted as an example. No course content was
changed, no audio rendered. Prior context (not required reading — this doc is self-contained):
`audio-batch-fill-vs-regen-audit-2026-07-28.md` Addendum 3.

---

## TL;DR

1. **The seed scaffold is ALREADY shared.** All six courses have exactly 668 seeds, and the
   dialect courses' English seed sentences are identical to their parents' at the same positions —
   668/668 (por_br, fra_ca) and 666/668 (spa_mx, both diffs trivial wording). Addendum 3's
   "independently authored, no shared source" conclusion is wrong at the seed layer; it is right
   at the LEGO and phrase layers, which is where all the divergence lives.
2. **The divergence is authoring drift, not dialect necessity.** Almost none of the English-side
   difference was *forced* by dialect-specific target content (bucket (c) ≈ 0). The courses were
   decomposed and phrased independently over the same seed canon.
3. **The three dialects are not the same kind of object.** spa_mx is a thin lexical skin (91% of
   seed targets are byte-identical to parent Spanish). por_br is a systematic grammatical re-skin
   (100% consistent, rule-shaped). fra_ca is a deliberate register overhaul (colloquial Québécois),
   not just a dialect — only 57/668 seed targets match parent.
4. **Nobody breaks.** All three dialect courses have zero learners with any progress
   (5–8 enrolled each, every one at `legos_seen = 0`). Retrofit risk to existing learners is nil.
   Parent-course learners (spa 38, fra 29 with real progress) are untouched by any option.
5. **Audio money is a rounding error either way** (~$5–8 per course full re-render at Azure $4/1M;
   xAI $15/1M only enters if English is repointed to the clone voice — an open taste call).
   **Content work is the entire cost** of a retrofit.
6. **My recommendation: Option B everywhere now (lineage fields + build-time drift gate for all
   future dialect courses), plus a cheap pilot retrofit of spa_mx only (Option C1). Do not
   retrofit fra_ca — it is a different product, and whether that register IS the product is
   Tom's call, not ours.** por_br sits in between: pilot 40 seeds before deciding (C2).

---

## 1. Quantified divergence, layer by layer

### 1.1 Seeds — the scaffold already exists

| pair | seeds | identical English (same seed number) | identical target (same seed number) |
|---|---|---|---|
| spa_mx vs spa | 668 | **666 (99.7%)** | 610 (91.3%) |
| por_br vs por | 668 | **668 (100%)** | 323 (48.4%) |
| fra_ca vs fra | 668 | **668 (100%)** | 57 (8.5%) |

(Identity = case/punctuation-normalized equality.) The two spa_mx English diffs are
"I am not going to…" → "I'm not going to…" (seed 24) and "appreciate them" → "like them"
(seed 419) — both over *identical* Spanish, i.e. pure known-side wording drift, trivially fixable.

The target-identity column is the cleanest single measure of how thick each dialect skin is:
Mexican Spanish keeps 91% of the parent's sentences verbatim; Brazilian Portuguese rewrites half;
Québécois French rewrites almost everything.

### 1.2 LEGOs — where the divergence starts

Same 668 English seeds, decomposed independently:

| pair | dialect LEGOs | parent LEGOs | same slot + same English gloss | …of which same target too | English gloss exists anywhere in parent |
|---|---|---|---|---|---|
| spa_mx vs spa | 1,372 | 1,475 | 390 (28%) | 369 | 739 (54%) |
| por_br vs por | 1,570 | 1,417 | 468 (30%) | 360 | 769 (49%) |
| fra_ca vs fra | 1,366 | 1,653 | 272 (20%) | 137 | 600 (44%) |

Even the LEGO *counts* differ per seed — the decompositions genuinely disagree about where to cut
the same English sentence. This is the root cause of the phrase-estate divergence: different
LEGO inventories force different BUILD/USE phrase estates downstream (phrases must tile from the
course's own LEGOs).

### 1.3 Phrases — the (a)/(b)/(c) decomposition

Every dialect BUILD/USE phrase classified against the parent's full BUILD/USE estate
(normalized exact match → fuzzy similarity (SequenceMatcher, ≥0.92 = same phrase reworded,
0.80–0.92 = related-but-different) → target-side cross-check → remainder):

| bucket | meaning | spa_mx (11,966) | por_br (12,056) | fra_ca (11,008) |
|---|---|---|---|---|
| A. English identical in parent | shared scaffold, working | 18.0% | 25.5% | 15.7% |
| B-hi. Same phrase, reworded English (≥0.92) | **(b) wording drift** | 4.9% | 6.6% | 4.7% |
| B-lo. Related but genuinely different phrase (0.80–0.92) | **(a) selection drift** | 30.2% | 34.3% | 36.5% |
| C. English differs but target exists verbatim in parent | (b) wording drift, ZUT-relevant | 1.2% | 0.5% | 0.4% |
| D. No match either side | **(a) selection drift** | 45.7% | 33.0% | 42.8% |

So, answering the commissioned split:

- **(a) Different phrase selection: ~67–79%** of each dialect's phrase estate (B-lo + D). The
  authors drilled the same seeds with different practice sentences. Examples (dialect phrase with
  no parent counterpart, English entirely dialect-neutral): spa_mx "I'm going to find an
  interesting book" / "voy a encontrar un libro interesante"; por_br "I wasn't talking about
  that" / "não estava falando sobre isso"; fra_ca "would you like to talk about the problem?" /
  "aimerais-tu parler du problème?".
- **(b) Same phrase, different English wording: ~5–8%** (B-hi + C). Mostly contraction and tense
  micro-variants: "I am trying to remember the whole sentence more easily" vs "I'm trying to…"
  (identical Spanish); "I'd like to" vs "I would like to"; fra_ca "I have seen"/"j'ai vu" vs
  parent "I saw"/"j'ai vu" (bucket C — same target, forked English gloss: these are the
  ZUT-relevant ones, and there are only 39–140 per course).
- **(c) Dialect-specific target content that FORCED different English: ≈ zero.** We looked for it
  and did not find it. The founder's design rule ("never say Mexican Spanish in the prompts") is
  actually being honoured — the English in every sampled D-bucket row is register-neutral
  ("maybe it was stupid" → fra_ca "peut-être que c'était niaiseux"; "take the next bus" → spa_mx
  "tomar el próximo camión"). The dialect-ness lives entirely in the target rendering; it never
  leaked into the English and never forced English divergence. The divergence is independent
  authoring, full stop.

### 1.4 How thick is each skin? (target-side marker census, full phrase estates)

| marker | spa parent | spa_mx | | por parent | por_br | | fra parent | fra_ca |
|---|---|---|---|---|---|---|---|---|
| vosotros/os/-áis 2pl | 91 | **0** | estar a + infinitive | 522 | **0** | ne…pas (full negation) | 1,123 | **0** |
| coche / camión(bus) / manejar | 63/0/0 | 0/**33**/**18** | gerund (falando) | 193 | **979** | j'me/j'peux/t'es/y'a contractions | 1 | **1,645** |
| conducir | 22 | 0 | você | 98 | **1,335** | QC lexicon (niaiseux, correc, jaser, à soir, magasiner…) | 0 | **305** |
| | | | enclitic -me/-te (mostrar-me) | 956 | **0** | est-ce que | 221 | 53 |

Three different animals:

- **spa_mx = thin lexical skin.** Grammar is near-identical (parent already avoids vosotros in
  91% of shared sentences; MX side adds ustedes in only 8 phrases). The dialect delta is a
  lexicon swap (camión, manejar, plus ~250 parent phrases carrying European markers:
  91 vosotros-forms + 63 coche + 76 autobús + 22 conducir ≈ **1.6% of the parent estate**).
- **por_br = systematic grammatical re-skin.** Zero exceptions in either direction (0 vs 522
  "estar a", 0 vs 956 enclitics). Rule-shaped: você-conjugation, proclitic placement, gerund.
  Touches roughly half the sentences, but mechanically — the transform is describable.
- **fra_ca = register overhaul, not a dialect skin.** The course systematically drops `ne`,
  contracts pronouns ("j'me sens correc"), and uses deliberate Québécois colloquial vocabulary.
  This was an authored product decision (joual-flavoured spoken register), and it is why only
  8.5% of seed targets match the parent. A "retrofit" of fra_ca is a re-authoring, and whether
  that register *is* the product is a founder taste call.

---

## 2. Option A — retrofit the existing dialect courses onto the parent scaffold

"Retrofit" = the dialect course adopts the parent's LEGO decomposition and phrase estate
(English side verbatim from parent), and only the target side is dialect-authored.

### 2.1 Content work (the real cost)

Coverage check: how much of each parent estate the dialect course can already translate
(exact English match): spa 2,290/15,214 (15%), por 3,367/12,631 (27%), fra 2,030/14,089 (14%).
Everything else needs a dialect target authored:

| course | parent phrases needing fresh dialect target | parent LEGOs needing dialect target | nature of the work |
|---|---|---|---|
| spa_mx | 12,924 | ~1,100 | **mostly mechanical**: 91% of seed targets already identical → bulk-import parent Spanish, re-skin the ~250 European-marked phrases + lexicon pass, full validator re-run |
| por_br | 9,264 | ~950 | **rule-shaped transform** (você/gerund/proclitic) over ~half the estate; scriptable with per-row review; pilot needed |
| fra_ca | 12,059 | ~1,380 | **full re-authoring** into the QC register — approximately the cost of the original course build |

All three must go through the course-builder validation path (`/api/seed/complete` or equivalent
gated scripts), not direct DB writes, because:

- **The vocab-gate invariant** (every known phrase tiles from already-introduced target LEGOs,
  whole-chunk, no re-conjugation) is a property of the *pairing* of known text with the course's
  own target LEGO inventory. Importing parent English with new dialect targets changes every
  tiling; only a full re-validation proves the invariant survives. There is no safe
  "patch the target column in place" shortcut.
- **ZUT must be re-checked course-wide** on the dialect side: parent English + new dialect target
  can collide with a mapping the dialect course already teaches elsewhere.
- Direct inserts also leave `course_round_index` stale (learner-facing "one seed then INF PLAY"
  symptom) — the pipeline path refreshes it, raw SQL does not.

### 2.2 Audio cost at real rates (xAI $15/1M chars, Azure S0 $4/1M)

Current audio estates (live counts): each dialect course holds ~15–16k clips (~450–470k chars)
in genuine dialect Azure voices (es-MX Carlota/Luciano, pt-BR Brenda/Julio, fr-CA
Sylvie/Antoine) plus ~7k English known clips (Azure Sonia for spa_mx/fra_ca, Bella for por_br).

Retrofit re-render, per course, worst case (entire new phrase estate, both target roles, Azure
dialect voices — these are Azure, not xAI):

| course | target chars ×2 roles | Azure cost | English known side |
|---|---|---|---|
| spa_mx | ~1.15M | **~$4.60** | parent spa English is already on the clone (`gfzdpspr5fdp`/`xai_eve`) → **free cross-course copy** if spa_mx joins the clone voice, or ~$2.30 to re-render on Azure Sonia |
| por_br | ~0.75M | **~$3.00** | parent por English is Azure Sonia → free copy only if por_br switches Bella→Sonia; else ~$1.40 Azure re-render |
| fra_ca | ~0.90M | **~$3.60** | parent fra English is Azure Sonia = fra_ca's own voice → **free copy** |
| **total** | | **~$11** | **$0–4** |

Two audio notes worth having in view:
- **Retrofit makes the English side a pure copy job** — once the texts are identical to the
  parent's, every English clip already exists and cross-course copy costs nothing. The founder's
  "we must already have this audio" instinct becomes *true by construction*. (It is currently
  false — 58–66% of dialect English texts exist nowhere else, which is why the pending heavy
  audio passes for these courses were costed at ~$14.6.)
- The ~15k existing dialect-voice clips per course are sunk, not a cost; orphaned clips represent
  roughly $2–4 of past render each. Do **not** delete them without a separate deletion plan
  (standing rule).

### 2.3 Learner impact

**None.** Progress is keyed per course on LEGO identity (`S####L##`), and a retrofit rewrites the
LEGO inventory — which would break progress mappings — but live `course_progress` shows **zero
learners with any progress in all three dialect courses** (spa_mx 5 enrolled, por_br 8, fra_ca 7;
every single one at `legos_seen = 0`; a handful practised-recently timestamps but no LEGO ever
seen). Parent courses (spa 38 learners with progress up to LEGO 342, fra 29 up to 281) are not
touched by any option. The window in which a retrofit is free of migration work is **now** and
closes as soon as a dialect course gets its first real learner.

### 2.4 What a retrofit buys

- The founder's design model becomes true: one English scaffold per macro-language, dialects as
  target-side skins.
- Every future content sweep, fix, or methodology pass on the parent propagates to dialects as a
  target-side-only job (today each sweep is ×2 full-course work).
- English audio (and any future English-side re-voicing, e.g. the clone repoint) is done once per
  macro-language.
- The B/C wording-fork buckets (ZUT-relevant known-side drift, 39–140 rows per course) disappear
  structurally.

What it does NOT buy: meaningful audio savings (~$11 total — noise), or anything for learners in
the short term (there are none on these courses yet).

---

## 3. Option B — leave existing courses as-is; enforce shared scaffold for FUTURE dialect courses

Zero content cost, zero audio cost, a few days of engineering. In the spirit of the explainer
drift gates (`tools/explainer/compile.mjs`: declared claims are validated against live truth at
build time and fail loudly), lineage becomes a *declared, machine-checked* property:

1. **Lineage fields on `courses`** (none exist today — verified): `parent_course` (FK →
   courses.code) and `scaffold_policy` ∈ `shared-seeds | shared-known | independent`. Existing
   dialect courses get `parent_course` set with `scaffold_policy = 'independent'` — honest
   record of reality, no gate fires.
2. **Creation by derivation, not by rule-following.** New dialect courses start from a builder
   step that *copies* the parent's seeds, LEGO known-sides, and phrase known-sides, leaving
   target sides blank for dialect authoring. Drift is then structurally impossible at creation —
   the gate only has to catch later edits. (This mirrors how the three existing courses clearly
   *did* copy the 668-seed canon but then decomposed independently — the copying step existed,
   the downstream enforcement didn't.)
3. **Build-time drift gate in the course-builder validation stack** (same atomic
   accumulate-all-errors pattern as ZUT/tiling/vocab): when `scaffold_policy != 'independent'`,
   a submitted seed's known_text must equal the parent's seed at the same seed_number
   (normalized); under `shared-known`, LEGO and phrase known_texts must exist in the parent's
   known-side inventory for that seed. Reject with a `SCAFFOLD DRIFT` error naming the parent row.
4. **Audit tool** (`tools/course-optimization/audit-scaffold-drift.cjs`, read-only, same shape as
   `audit-phrase-zut.cjs`): per declared pair, layer-by-layer identity report (the tables in §1
   are exactly its output spec). Run before any audio pass on a dialect course, so English-side
   audio is always commissioned as a copy job first.
5. **Audio-pass integration:** for `shared-*` courses, the copy-first bucket sources English
   clips from the parent course before any TTS is queued.

Risk of Option B alone: the three existing courses stay permanently forked — every parent
improvement sweep needs manual re-application ×3, forever, and the estates keep drifting apart
with each sweep.

---

## 4. Option C — hybrid (Option B everywhere, plus selective retrofit)

Option B's tooling is a prerequisite for any retrofit anyway (the drift gate is also the
retrofit's acceptance test: retrofit is done when the audit reports 100% at every layer). Then
treat the three courses on their own merits:

- **C1 — retrofit spa_mx (recommended).** Thin skin, 91% of targets already identical,
  ~250 marker phrases + a lexicon pass to re-skin, zero learners at risk, ~$5–7 audio. Follow
  the proven sweep protocol: bulk-import via gated scripts through the validator, DRY_RUN first,
  pilot ~40 seeds, read the distribution before fleet. This is the cheapest possible proof of
  the whole scaffold-derivation pipeline (step 2 in §3) on a real course.
- **C2 — pilot por_br, decide from the pilot.** The transform is rule-shaped (você/gerund/
  proclitics) and might be largely scriptable with per-row review; or the pilot shows too much
  judgment per row, in which case leave it as `independent` and move on. 40 seeds tells us which.
- **C3 — do NOT retrofit fra_ca.** It is a different register product, not a drifted copy.
  Retrofit = full re-authoring (~a course build) AND a product-identity decision (does SSi
  Canadian French teach joual-flavoured spoken Québécois, or standard French with QC
  pronunciation and lexicon?). That question goes to Tom; nothing in this pack should pre-empt
  it. Mark it `parent_course = fra_for_eng, scaffold_policy = 'independent'` and leave it.

---

## 5. Recommendation

**Option C: do Option B's lineage fields + drift gate + derivation flow now (few days of
engineering, needed under every scenario), retrofit spa_mx as the pilot of that pipeline (C1),
pilot-then-decide por_br (C2), leave fra_ca alone and put its register question to Tom (C3).**

Why this wins on all three legs: better (founder's design model becomes machine-enforced truth,
not aspiration; parent sweeps propagate; English audio becomes copy-by-construction), simpler
(one scaffold per macro-language is less to maintain than three independent forks; the gate is
one validator in an existing stack), cheaper (total audio exposure ~$11 worst case; spa_mx
content work is mostly mechanical; the expensive retrofits are exactly the ones we *don't* do).
The only genuinely expensive item on the table — fra_ca re-authoring — is deferred behind a
product decision that belongs to the founder.

**One deadline-shaped fact: the retrofit window is open only while the dialect courses have zero
learners with progress. That is true today and will not stay true.** If any dialect course is
about to be promoted or marketed, C1's ordering moves from "next convenient slot" to "before
launch".

### Decision list (answerable cold)

1. Adopt Option C as above? (Alternative: B-only if no content bandwidth exists at all.)
2. spa_mx retrofit: approve the 40-seed pilot? (No audio spend; content-only, gated scripts.)
3. por_br: approve the 40-seed transform pilot? (Same conditions.)
4. → Tom, not Kai: is fra_ca's colloquial Québécois register the intended product? (Determines
   whether fra_ca ever gets retrofitted or stays a deliberate fork.)
5. → Tom, standing taste call from the audio audit, now sharpened: if spa_mx retrofits, its
   English side can be a free copy of spa's clone-voice estate (`gfzdpspr5fdp`) — accept the
   clone as the English voice for spa_mx, or pay ~$2.30 to stay on Azure Sonia?

---

## Appendix — worked examples (verbatim rows, live DB)

**Same English, dialect-skinned target (bucket A-diff, the design model working):**
- "we were talking about it" → por "estávamos **a falar** sobre isso" / por_br "estávamos **falando** sobre isso"
- "it was good to see you" → por "foi bom **ver-te**" / por_br "foi bom **te ver**"
- "take the next bus" → spa "tomar el próximo **autobús**" / spa_mx "tomar el próximo **camión**"
- "I feel okay, but I'm starting to feel tired" → fra "je me sens bien, mais je commence à me sentir fatigué" / fra_ca "**j'me sens correc**, mais j'commence à me sentir fatigué"

**Known-side wording drift over identical target (buckets B-hi/C — the ZUT-relevant slice):**
- spa "I am trying to remember the whole sentence more easily" vs spa_mx "I'm trying to…" (same Spanish)
- fra "I saw" / "j'ai vu" vs fra_ca "I have seen" / "j'ai vu"
- por "I like waking up" / "gosto de acordar" vs por_br "I enjoy waking up" / "gosto de acordar"

**Independent selection drift (buckets B-lo/D — two-thirds of every estate):**
- spa_mx "I'm going to find an interesting book" — no parent counterpart; parent drills that seed differently
- fra_ca "whenever it hurts a lot" / "à chaque fois que ça fait mal **ben gros**" — dialect-neutral English, QC target, no parent row

**Register overhaul evidence (fra_ca only):** parent 1,123 phrases with full "ne…pas", fra_ca 0;
fra_ca 1,645 phrases with QC pronoun contractions, parent 1; 305 phrases with QC lexicon
(niaiseux, correc, à soir, magasiner…), parent 0.

*Method notes: identity = lowercase, punctuation-stripped comparison. Fuzzy tiers via difflib
SequenceMatcher with token-blocking. Phrase buckets cover `build`+`use` roles (components are
per-seed literal tiling glosses and regenerate with any decomposition). Analysis scripts:
`scripts/dialect-scaffold/` (gitignored workspace) on this checkout.*
