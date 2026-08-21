# Ralph Course Builder Methodology

> **This is NOT a translation job.** You are building a pedagogical structure where
> every phrase serves a specific learning purpose. The learner acquires language
> through CONTRAST and BUILD-UP, never through explanation.

---

## Related methodology docs (read alongside this one)

- **`synonym-choice-architecture.md`** — sibling doc covering the upstream translation-choice step. Before a SEED is decomposed into LEGOs, the translator picks one of several valid target-language realisations. The synonym-choice doc gives the eight-principle checklist for picking the least-action-path candidate per pair (atomic-vs-chunked for meaningful units, AA/AB phonetic compounding, M-LEGO upchunking for grammatical particles, cliff front-loading, paradigm balance, L1-conditional sequencing, pod-decoupling, mid-course frame-opener placement). Three pair-worked-examples (Mandarin-for-English, Swedish-for-Romanian, Hungarian-for-English) ground the principles for any new pair an LLM has to apply the methodology to.

This methodology doc (ralph-methodology.md) is what to do once the target translation is chosen. The synonym-choice doc is how to choose it.

---

## The World-Class Breakdown — Quality Bar

A breakdown is world-class only if it satisfies all seven. Each is both an audit dimension and a build-time check. (Distilled from the zho_for_eng particle/decomposition rebuild, 2026-06-07; Principle 7 + the doctrine sections that follow added 2026-06-13 from the reorder/encoding work.)

1. **Reconstructability is sacred.** Every SEED must rebuild *perfectly, in both languages*, from its own decomposition plus already-taught vocabulary. This is the master rule — most other failures are special cases of breaking it.

2. **Nothing load-bearing is acquired by accident.** Every piece a seed leans on — pronouns, question particles, verbs, connectors — must be *deliberately introduced* before/at that seed (a clean LEGO or a declared component). "Grokable from context" is fine for reinforcement, **never** for the pieces a seed actually needs to be rebuilt.

3. **Particles are construction-features, never units of intention.** Never a bare A-LEGO; taught in-context via overlap, **in the seed's own sense**, silent (`introduce:false`). Multi-sense particles are introduced once *per real usage* — coverage-driven, not a fixed count. (See *Intention-units vs construction-features* below, and synonym-choice §6.) **Coverage rule:** ≥1 chosen context must reconstruct the seed's own use of the particle; a sense the seed uses but you don't teach is an ERROR.

4. **Glosses are honest and whole-intention.** No mis-glosses (才≠"only then", 了≠"already", 把≠"take"), no surface-word particle labels, no grammar metadata. The known side names the *whole communicative intention*.

5. **Don't re-teach the known.** Already-introduced pieces are never re-narrated (non-greedy introduction / fuzzy-availability — a component already taught earlier carries `introduce:false`).

6. **Idiomatic chunks are their own units.** Non-derivable combinations (准备好 = "ready", not "prepare"+"good"; 见过 = "have seen") are taught whole, not as a sum of parts that doesn't add up.

7. **Vary along the axis that carries the new distinction.** A basket exists to make the *new* LEGO's contribution salient. Every USE phrase must vary along the axis the LEGO actually changes — the lateness-trigger for 才 (现在才 / 明天才 / 之后才), the verb for a new verb, the polarity for a negator — never along an axis carrying zero information about the new piece. Swapping only the subject pronoun (我→你→他) or the topic noun ([X]很有用 ×7) holds the frame constant and teaches nothing. **BUILD may repeat frames** — its job is to automatize the chunk. **USE must buy a new frame per phrase** — USE enters the eternal spaced-repetition pool, so a low-diversity USE basket pollutes review forever. *Convergence pairs (same target, different English) are exempt: they teach the unification, not monotony.*

---

## ZUT Outranks Naturalness — the decision lens

**One English intention → exactly one target form, course-wide. Always.** This is the production-direction law (ZUT), and it outranks naturalness. We do not care if a mapping isn't the most natural way to say it in the target — the method optimises **confidence to interact, not native-likeness**. A learner with a deterministic production function interacts fearlessly; one juggling natural variants freezes. The reverse is not only allowed but useful: *many* English intentions converging on *one* target form (convergence pairs) teaches the unification cheaply.

The general rule behind every methodology call: **decide by least action to confidence, not by truth.** When a question looks like "what's linguistically correct?", reframe it as "what gets the learner to confident production with the least cognitive action?" — that axis resolves what the truth axis cannot.

---

## The Known Side Is a Controlled Language

Reconstructability (Principle 1) holds in **both** languages. The English prompt is **not** free natural English — it is a designed, controlled language. Every prompt must compose from: (a) the known-glosses of introduced LEGOs, (b) the **free class** — glue words, ‑s/‑ed/‑ing inflection, NPI ("any/ever") under negation, dummy auxiliaries (do/does/did), and (c) constructions **licensed by a debuted carrier** — do-support questions, "have you been V-ing", "want to have", etc.

Slightly stilted but tileable English is **correct** — it is the known-side mirror of "ZUT over naturalness". A prompt using unlicensed English machinery is *unmappable*: it forks or stalls production exactly like a target-side ZUT violation. "How do you say it?" cannot appear before its do-support carrier is introduced; "would you like…" smuggles the want/'d-like convergence in early. Compose prompts from what the learner has been given, not from natural English.

---

## Conservative Suppression & Honest Glosses

**A debut must hand the learner a producible intention, never a grammar label.** "把 = object marker", "条 = measure word for long thin objects", "吧 = softening particle" cost cognitive action and yield zero confidence — the learner can produce nothing from them. Glosses name the *whole communicative intention*; never grammar metadata. This subsumes the bare-particle rule: classifiers, markers and aspect are construction-features — they live *inside* an M-LEGO (`introduce:false`), never as a bare debut.

**"Don't re-teach the known" (Principle 5) is a scalpel, not a cull.** Suppress a debut (`is_new:false`) *only* for a pure same-meaning re-statement — the identical intention and identical target, adding no new word, sense, idiom, or contrast. Everything else keeps its debut: **distinct words** (喝/买/准备 are not "components" of a chunk just because their characters appear inside it — that is the overlap mechanism working, not duplication), **idiomatic chunks** (准备好 ≠ 准备+好), **overlap-ladder rungs**, and **deliberate nuance re-debuts**. The lever is minor by design — in the zho audit, ~15 of ~1,100 rounds.

---

## The Pair-Contract

Every language pair gets its own rule layer: `docs/pair-contracts/{course_code}.contract.cjs` — gloss-determinism forks, construction licenses, multi-gloss synonyms, bound gloss-units, the free class, and the **known language** it is written for. The Chinese rules (能/会 by collocation, the 很 split, the 了 cue-table) are **instances of categories, not universals** — do not copy them to another pair; derive that pair's contract on first contact.

Crucially, the free class / NPI / inflection / machinery are **known-language-specific** — a `_for_jpn` contract restates them in Japanese; English regexes must never gate a non-English-known course.

**Deriving a contract:** translate the seeds → find the forks (one English intention that would map to several natural targets) → decide each determinism rule (consolidate or differentiate) → mark silent construction-features → register multi-gloss synonyms and bound gloss-units → restate the free class for the known language → **adversarially verify every rule** (does a fork ever collapse two distinct intentions? does a "synonym" smuggle a ZUT violation?) before setting `ratified`. The gates read this file; if it is absent the known-side check silently skips, so an un-contracted course is never wrongly blocked.

---

## The Core Philosophy

### Grammar is INFERRED, Never Taught

Learners infer grammar from seeing pairs in contrast. Grammar is NEVER explained.

```
WRONG: "了 is a completed action marker"
RIGHT: do → 做, done → 做了 (learner INFERS the grammar)

WRONG: "-o is first person conjugation"
RIGHT: to speak → falar, I speak → eu falo (learner INFERS conjugation)
```

### The Unit of Communication is the LEGO

LEGOs are the building blocks of learning. Every LEGO (A or M) is practiced as audio.
Patterns are inferred through **overlapping LEGOs** - the learner sees a word alone, then sees it inside a phrase.

---

## LEGO Types

### A-LEGO (Atomic)
Single meaningful word. These often appear inside M-LEGOs to create overlaps.

```json
{
  "type": "A",
  "known": "Chinese",
  "target": "中文"
}
```

### M-LEGO (Molecular)
Multi-word phrase. Patterns are inferred through overlap with related A-LEGOs.

```json
{
  "type": "M",
  "known": "it's important",
  "target": "es importante"
}
```

> **Type is author-declared, not computed.** "Single word = A, multi-word = M" is the convention *you* follow — the validator never counts words to assign type. It only checks the literal value is `'A'` or `'M'` (a missing type defaults to `'A'`), and rejects an `'M'` with no `components[]`.
>
> **`components[]` is optional on an M-LEGO, not a hard requirement.** Since the 2026-08-12/13 mapping-editor rulings, an Intro's authored mapping (`known_gloss_segments`) is the PRIMARY feed for tile display; componentisation is only the fallback used to derive tiles when no mapping has been authored. So an M-LEGO with no `components[]` is a legitimate, expected state — it either carries an authored Intro mapping instead, or awaits one — not an error; the validator already treats a missing `components` array as skip-not-reject.
>
> **The real size guard is syllables, not word count.** Every LEGO — A or M — has its target capped at **8 syllables** (`MAX_LEGO_SYLLABLES`), estimated from character length per language. This cap **always runs, even under `skip_validation`**. An oversized LEGO is rejected with a prompt to decompose it into multiple smaller LEGOs (aim for 2-4 words, max 8 syllables).

### Optional Component Introduction (`introduce: false`)

M-LEGO components are required for tiling validation, but not all are worth introducing to the learner solo. Set `introduce: false` on components that would confuse more than help — single-letter prepositions, particles, or stubs that only make sense attached.

```json
{
  "type": "M", "known": "with you", "target": "s tobom",
  "components": [
    { "known": "with", "target": "s", "introduce": false },
    { "known": "you", "target": "tobom" }
  ]
}
```

The component still exists for tiling and still counts as available vocabulary. Default is `introduce: true`.

### Overlapping LEGOs (The Teaching Mechanism)

LEGOs do NOT have to tile perfectly to make the SEED. Instead, create **overlapping LEGOs** where A-LEGOs also appear as parts of M-LEGOs. The overlap IS the teaching.

```
SEED: "it's important to practice speaking as often as possible"
      "es importante practicar hablar lo más frecuentemente posible"

LEGOs (with overlaps allowed):
- importante = important           (A-LEGO)
- es importante = it's important   (M-LEGO, overlaps with "importante")
- practicar = to practice          (A-LEGO)
- hablar = to speak                (A-LEGO)
- practicar hablar = to practise speaking (M-LEGO, overlaps with practicar and hablar)
- frecuentemente = often           (A-LEGO)
- posible = possible               (A-LEGO)
- lo más frecuentemente posible = as often as possible (M-LEGO)
```

The learner sees "importante" alone, then sees it inside "es importante" - the overlap lets them infer the pattern without explanation.

### Intention-units vs construction-features

A language has two kinds of piece, and they are taught oppositely:

- **Units of intention** — what the learner *means* (book, want, speak). The learner forms an intention and reaches for it. These map one-to-one (ZUT), are chosen deliberately, and are atomised as A-LEGOs.
- **Features of construction** — *how* the target assembles a thought (Chinese 才, 了, 都, 把; particles, aspect markers, structural glue). The learner never forms an intention to "say 才"; they mean a whole thought, and the particle is a texture of how it is built. These are **never atomised and never chosen** — they are absorbed inside whole thoughts.

Introducing a construction-feature as a bare A-LEGO ("才 = only then") is a **category error**: it asks the learner to *mean* something that is not a unit of meaning. That is why such a card never reads naturally — the fix is not a better gloss, it is to stop atomising it.

**Particles are consolidated, not introduced.** A construction-feature's debut is not scheduled at the first seed it happens to appear; it is made salient once the learner already commands enough whole-thoughts that contain it. Placement is *pull, not push* — and the signal the moment has come is that the carrier phrases already exist in earlier baskets.

**Contrastive twin debut.** Realise the consolidation as two (or three) overlapping M-LEGOs that share the feature — A+B and A+C, where A is the particle (constant) and B/C are already-known frames:

```
她才开始     = "she's only just started"   +   我现在才懂   = "I get it only now"
把它放在桌子上 = "put it on the table"        +   把手举起来   = "raise your hand up"
```

Both headword cards are whole, natural thoughts; only the particle is new on each; the learner infers the feature by triangulation. The two English glosses are deliberately *near-but-different* so the learner experiences "English splits this, the target unifies it" at first contact — pre-teaching the one-to-many mapping with no rule stated.

**Gloss the whole intention, never the sub-word.** Glossing the particle with an English surface word ("just", "only") smuggles a fork back in — "just" maps to 就/刚/只/才 by intention. The gloss names the whole thought ("she's-only-just-started"), not the particle.

---

## Phrase Roles: BUILD vs USE

### BUILD Phrases (flexible quantity)
**Purpose:** Show how the new LEGO "plugs in" to what the learner already knows.

BUILD phrases combine the **new LEGO** with **previously introduced LEGOs**. This is how the learner sees the new piece connecting to their existing vocabulary. Each BUILD phrase must contain the **entire LEGO** plus content from LEGOs the learner already knows.

- **The new LEGO + previously introduced LEGOs** (keep it tight, minimal cognitive load)
- Used ONLY in the **debut round** for that LEGO
- Never seen again - not in CONSOLIDATE, not in REVIEW
- Fragments OK (don't need to be complete sentences)
- No capitalisation, no trailing periods (spoken fragments, not written sentences)
- Must contain the **entire LEGO** (exact character match)
- NOT eternal-eligible

**Quantity is flexible based on LEGO length.** If the LEGO itself is already long (high syllable count), you add almost nothing. The constraint is cognitive load, not an arbitrary phrase count.

```
Welsh example - Seed 1, LEGO 2: "to speak" → "siarad"
(Learner already knows L1: "I want" → "dw i isio")

BUILD:
1. I want to speak → dw i isio siarad    ← new LEGO "siarad" + known L1 "dw i isio"

Welsh example - Seed 1, LEGO 3: "Welsh" → "cymraeg"
(Learner already knows L1: "I want" → "dw i isio", L2: "to speak" → "siarad")

BUILD:
1. to speak Welsh → siarad cymraeg       ← new LEGO "cymraeg" + known L2 "siarad"

Spanish example - "after you finish" → "despues de que termines":
(Learner already knows "working" and "eating" from earlier seeds)

BUILD:
1. after you finish working → despues de que termines de trabajar
2. after you finish eating  → despues de que termines de comer
```

**Key point:** BUILD phrases are NOT random extensions. They show the learner how their new LEGO combines with LEGOs they already know. This is what makes each new piece immediately useful.

### USE Phrases (minimum 5)
**Purpose:** Natural production. Put the LEGO "out."

- **Mix of lengths required** to create smooth progression:
  - **MEDIUM (2-3 phrases):** LEGO + 4-6 syllables - shorter complete sentences
  - **LONG (2-3 phrases):** LEGO + 7-10 syllables - fuller, richer sentences
- **Minimum 5 per LEGO** - these get reused in CONSOLIDATE, REVIEW, and listening exercises
- **MUST be complete, natural sentences** - NEVER fragments
- No capitalisation, no trailing periods (spoken phrases, not written sentences)
- A USE phrase is something a learner would ACTUALLY SAY in conversation
- Must contain the LEGO (exact character match)
- ALL are eternal-eligible (go into spaced repetition)

**Why the mix matters:** The ~7 practice phrases per LEGO should form a progression:
1. **BUILD (short):** LEGO + 1-3 syllables - lock in the pattern (fragments OK)
2. **USE medium:** LEGO + 4-6 syllables - bridge to production (complete sentences)
3. **USE long:** LEGO + 7-10 syllables - natural, fluent production

Without MEDIUM phrases, learners jump from short fragments to long sentences - a cognitive cliff. The medium phrases are the bridge.

These are the "eternal" phrases that come back throughout the course. Quality matters more than quantity.

> ⚠️ **CRITICAL**: Even with limited vocabulary in early seeds, a USE phrase must be a complete sentence. If you can't form enough complete sentences with available vocabulary, **reduce the USE count** rather than submitting fragments. "想说。" or "Speak." is NEVER acceptable as a USE phrase.

```
USE examples for "after you finish" → "despues de que termines":

1. Do you want to come over after you finish?
   → ¿Quieres venir despues de que termines?

2. Please come over after you finish
   → Por favor ven despues de que termines

3. It would be good to see you after you finish
   → Sería bueno verte despues de que termines

4. I want to practice Spanish with you after you finish working
   → Quiero practicar español contigo despues de que termines de trabajar

5. Can you help me after you finish eating?
   → ¿Puedes ayudarme despues de que termines de comer?
```

### Round Structure for a New LEGO

1. **Intro** - LEGO introduced (presentation audio)
2. **Debut** - the LEGO itself
3. **Practice** - all BUILD phrases first (shortest-first by syllable count), then USE phrases fill remaining slots, **capped at 7 total**
4. **Review** - USE phrases of *older* LEGOs on a Fibonacci-style offset schedule (spaced repetition); see below
5. **Consolidate** - up to **2** of this LEGO's own USE phrases not already used this round

**Spaced repetition (Review) at runtime:** earlier LEGOs' USE phrases are revisited at offsets `[1, 2, 3, 5, 8, 13, 21, 34, 55, 89]` rounds back. The most-recent prior LEGO (offset 1, "N-1") contributes **3** USE phrases; every other due LEGO contributes **1**, drawn from a rotating pool so successive reviews surface fresh sentences. Total review items per round are **capped at 12**. Only USE phrases are ever reviewed — BUILD never enters spaced repetition. Components are skipped entirely at runtime.

### Syllable Guidelines

| Role | Syllables | Complete Sentence? | Reused? | Eternal? |
|------|-----------|-------------------|---------|----------|
| BUILD | LEGO + 1-3 | No (fragments OK) | No (debut only) | No |
| USE (medium) | LEGO + 4-6 | Yes (required) | Yes (consolidate, review) | Yes |
| USE (long) | LEGO + 7-10 | Yes (required) | Yes (consolidate, review) | Yes |

**Key principle:** Syllable count is the proxy for cognitive load. The progression SHORT → MEDIUM → LONG creates a smooth ramp, not a cliff.

> **Note on enforcement:** the SHORT/MEDIUM/LONG length spread is **pedagogical guidance, not a hard gate**. The validator's phrase-complexity tier check is **warning-only — it never blocks a submission** (it logs spread feedback as the course matures). Treat the length mix as a quality bar you hold yourself to, not a wall the API enforces. (The real always-on size limit is the 8-syllable LEGO cap above — that one does reject.)

---

## USE Phrase Scoring (5-9)

Every USE phrase MUST have a self-assessed quality score. USE phrases go into eternal rotation - learners hear them hundreds of times. Quality matters.

### Score Scale

| Score | Meaning |
|-------|---------|
| **9** | Excellent - native speakers would actually say this in both languages, high pedagogical value |
| **7-8** | Strong - minor stylistic preferences possible |
| **5-6** | Functional - grammatically correct, gets the job done |
| **4 or below** | Hard reject - rewrite, don't submit |

### Scoring Rules

1. **4 or below = Rewrite**: If you assess a phrase as 4 or below, don't submit it. Rewrite and resubmit.
2. **Be honest**: Your scores will be sampled by QA. Consistent over-rating will be flagged.
3. **Score before submitting**: Rate each USE phrase immediately after writing it.

### What Makes a High Score?

**9 (Excellent):**
- Native speakers would actually say this in both languages
- Teaches something transferable and useful
- Flows naturally when spoken aloud

**5-6 (Functional):**
- Grammatically correct in both languages
- Makes sense but might sound slightly formal/textbook
- Gets the job done

---

## Complete LEGO Submission Format

Below shows how overlapping LEGOs work in practice. Note that "importante" appears both as its own A-LEGO and inside the M-LEGO "es importante":

```json
[
  {
    "idx": 1,
    "type": "A",
    "known": "important",
    "target": "importante",
    "build": [
      {"known": "important", "target": "importante"},
      {"known": "very important", "target": "muy importante"},
      {"known": "more important", "target": "más importante"},
      {"known": "not important", "target": "no importante"}
    ],
    "use": [
      {"known": "This is important", "target": "Esto es importante", "score": 8},
      {"known": "It's very important to me", "target": "Es muy importante para mí", "score": 8},
      {"known": "Is it important?", "target": "¿Es importante?", "score": 7},
      {"known": "That isn't important now", "target": "Eso no es importante ahora", "score": 7},
      {"known": "I think it's important", "target": "Creo que es importante", "score": 8},
      {"known": "Why is it important?", "target": "¿Por qué es importante?", "score": 7}
    ]
  },
  {
    "idx": 2,
    "type": "M",
    "known": "it's important",
    "target": "es importante",
    "build": [
      {"known": "it's important", "target": "es importante"},
      {"known": "it's important to practice", "target": "es importante practicar"},
      {"known": "it's important to speak", "target": "es importante hablar"},
      {"known": "it's important to learn", "target": "es importante aprender"}
    ],
    "use": [
      {"known": "It's important to practice every day", "target": "Es importante practicar cada día", "score": 8},
      {"known": "It's important to speak Spanish with you", "target": "Es importante hablar español contigo", "score": 8},
      {"known": "I think it's important to learn this", "target": "Creo que es importante aprender esto", "score": 8},
      {"known": "It's important to try", "target": "Es importante intentar", "score": 7},
      {"known": "Why is it important to practice?", "target": "¿Por qué es importante practicar?", "score": 8},
      {"known": "It's important to me", "target": "Es importante para mí", "score": 7}
    ]
  }
]
```

**Key insight:** The learner first sees "importante" alone (A-LEGO), then sees it inside "es importante" (M-LEGO). The overlap lets them infer the pattern without any explanation.

---

## How the API Processes Your Submission

### "Atomic" = validate everything, then insert everything (or nothing)

When you POST a seed, **every validation gate runs first** and accumulates all failures into a single error list — ZUT/duplicate, syllable cap, tiling, vocabulary + containment, length-ratio, phrase counts, and (late-course) the balance check. **Only if that list is empty** does the insert phase run, writing `course_seeds`, `course_legos`, and `course_practice_phrases`. If any hard error exists, **nothing is inserted** and you get a structured 400 with the *full* list of problems and fix hints — there is no partial save.

This is what "atomic" means here: validate-all-then-insert-all (or insert nothing). It is achieved by gating before any write, **not** by a database transaction/rollback. The upside for you: you see *all* problems at once, so fix them in one pass and resubmit rather than discovering them one at a time.

### Deterministic phrase IDs — the API assigns them, you never do

Every phrase gets a stable, self-describing ID **assigned by the API** — agents never set phrase IDs. Format:

```
{course_code}:S{NNNN}L{NN}{R}{NN}
```

- `S{NNNN}` = seed number, zero-padded to 4
- `L{NN}` = LEGO index, zero-padded to 2
- `{R}` = role letter: **C** (component), **B** (build), **U** (use)
- `{NN}` = 1-based index within that role for that LEGO, zero-padded to 2

Example: `fra_for_eng:S0042L03U05` = the 5th USE phrase of LEGO 3 in seed 42. The same phrase always gets the same ID, so audio and progress stay stable across rebuilds. Do **not** put IDs in your submission.

### Intake text normalization + the canonical mismatch

On intake the API normalizes all known/target text: it strips bookend punctuation and lowercases known/target — **except** non-cased scripts (Japanese, Chinese, Arabic, Korean, Hebrew, Thai, etc.) and an allowlist of always-capitalised words ("I", language names, …). Your English `known_text` for the seed **must match the canonical seed** (after normalization), or you get a `CANONICAL MISMATCH` 400 — you cannot quietly reword the seed. (Diacritics are stripped only for the internal ZUT comparison; storage and containment keep them.)

---

## Seed Decomposition

### Seeds Are Vehicles for LEGOs

**Seeds are NOT first-class citizens.** The seed is just a vehicle for delivering LEGOs to the learner. LEGOs are the real value - they're the building blocks learners use for skilful recombination.

When you decompose a seed, you're asking: "What LEGOs does this seed let me teach?" The seed exists to provide context for introducing those LEGOs.

### Tiling Requirement (Sanity Check)

Tiling is a **sanity check**, not a rigid constraint. It means: the seed CAN be recomposed from its LEGOs - at least one valid way.

**What tiling checks:**
- No words missed (every part of the seed is covered)
- No words added (LEGOs don't introduce unrelated vocabulary)

**What tiling allows:**
- Multiple valid tilings when using overlapping LEGOs (different combinations might work)
- Overlaps between LEGOs are expected and encouraged
- Late-course seeds can be very short (as few as 2-3 LEGOs)

```
Seed: "I want to speak Chinese with you now"
Target: "我现在想和你说中文"

LEGOs must cover:
- 我想 (I want) ✓
- 说 (speak) ✓
- 中文 (Chinese) ✓
- 和你 (with you) ✓
- 现在 (now) ✓

Full reconstruction: 我 + 现在 + 想 + 和 + 你 + 说 + 中文 ✓

Note: If you also had A-LEGOs for 我 (I) and 想 (want) that overlap
with the M-LEGO 我想 (I want), there would be multiple valid tilings.
That's fine - overlapping LEGOs are the teaching mechanism!
```

**If any part is missing, add a LEGO for it.**

### Pedagogical Ordering (NOT Sentence Order)

**Principle: Order LEGOs to maximize useful phrases at each stage.**

The goal is combinability - each new LEGO should combine meaningfully with what came before. This matters more early in the course when vocabulary is sparse.

**Early seeds (1-10):** Ordering matters more because there's limited prior vocabulary to combine with. Be thoughtful about which LEGOs come first - prioritize high-utility items that combine well.

**After ~10 seeds:** There's enough accumulated material that almost any LEGO order works. You have a rich pool of prior vocabulary, so new LEGOs can combine with many existing items regardless of introduction order.

**Non-greedy introduction:** If an A-LEGO is contained within an M-LEGO, introduce the A-LEGO first. When the M-LEGO arrives, the learner already knows part of it - reducing uncertainty and cognitive load.

```
1. importante = important (A-LEGO) ← introduce first
2. es importante = it's important (M-LEGO) ← learner recognizes "importante"
```

The learner only processes "es" as new. This is how overlapping LEGOs reduce cognitive load.

**Use good judgment, not rigid rules.** Be skilful - don't be arbitrary, but also don't over-constrain yourself.

**Example (illustrative, not prescriptive):**

Early in a course, this ordering maximizes useful combinations:
```
1. I want → 我想 [M-LEGO, immediately useful]
2. to speak → 说
3. Chinese → 中文
4. with you → 和你
5. now → 现在  [combines with everything above]
```

Introducing "now" (现在) early when there's nothing to combine with would be less effective. But in seed 50? It wouldn't matter - there's plenty of existing vocabulary to pair it with.

---

## ZUT (Zero Uncertainty Test)

Same KNOWN → same TARGET. Always.

**ZUT runs in the production direction, on intentions.** One intention (KNOWN) → one form (TARGET), so the generating learner never forks. The reverse — one TARGET rendered by several natural English phrasings (Chinese 才 ≈ "only just / only now / not until") — is the *reception* direction and is harmless. Never atomise a construction-feature, or contort its gloss, just because its English shadow varies (see *Intention-units vs construction-features*).

### Violation Example
```
Seed 10: "know" → 알다
Seed 45: "know" → 알고 있다  ← conflicts with seed 10
```

> **Note on enforcement (granularity).** ZUT is enforced at the level of the thing that collides. A new **LEGO's** known→target that conflicts with an established mapping is the seed's *core wiring* (the seed's translation tiles from its LEGOs) — that is a hard reject; you fix the mapping and resubmit. A **practice phrase** whose known collides is enforced **per-phrase**: only the transgressing phrase is **held out** — never inserted, so a known collision can't reach a learner — while the seed and every conforming phrase still save. The held-out phrase is returned in the response (`zut_phrase` warning / `zut_held_out`) with the existing target and a consolidate-or-differentiate hint, so you fix just that one and resubmit it. ZUT is never a reason to lose a whole seed of good work. (Tom, 2026-06-14.)

### Fix: Use Different Natural Phrases
```
Seed 10: "I know" → 알아요
Seed 45: "I know about it" → 알고 있어요  ✓ Different KNOWN = OK
```

The context disambiguates - no explanations needed. The learner infers the distinction.

Other options: use synonyms like "understand" or "be aware of" for one meaning.

### Problem Verbs to Watch
These verbs often have multiple translations. Disambiguate through natural phrasing:
- remember / recall / keep in mind
- know / understand / be aware of
- think / believe / consider
- see / meet / notice
- feel / sense / seem

> **📖 Do not solve this from scratch — read [`docs/language-mapping-index.md`](docs/language-mapping-index.md) first.**
> One English word mapping to two or more target words is the single most recurring class of problem in course building, and we have already solved it in dozens of languages. The index carries, per problem: the fix in one line, which languages it bites in, **real verbatim English prompt wordings from shipped courses** you can copy, and the approaches that were tried and rejected (bracketed tags such as `I know (a person)` are rejected — they are *spoken aloud* with the brackets stripped). "I know" a fact vs a person, formal vs familiar *you*, singular vs plural *you*, `ser`/`estar`, "know how to", and a bare pronoun that cannot carry tense all live there.
> **When you resolve a new one, add it to the index and encode it in that pair's contract.**

---

## Vocabulary Constraints

For LEGO N in seed S, phrases can ONLY use:
- This LEGO (N) itself
- All LEGOs from seeds 1 through S-1
- LEGOs 1 through N-1 from current seed S
- Overlapping A-LEGOs that appear within M-LEGOs above

**You CANNOT use vocabulary not yet introduced!**

**Phrases tile from WHOLE already-introduced chunks — never re-split into words.** The validator reconstructs each phrase only from complete LEGO/component targets that have already been introduced; it never re-splices or re-conjugates word forms. This is what blocks untaught conjugations, inversions, and contractions: if a wording needs a form you haven't introduced as a whole chunk, it fails. Vocabulary accumulates strictly in seed/idx order (LEGOs sorted by `idx`), so LEGO N may draw on prior seeds plus LEGOs 1..N-1 — **never a later sibling**. No forward references.

### Late-course balance check (seeds > 20)

From seed 21 onward (non-draft submissions only), a balance check guards against leaning on a handful of over-taught LEGOs while ignoring under-used ones. Each LEGO gets a `practice_score`; a submission is flagged when **more than half** its new-phrase vocabulary references are "overused" LEGOs **and** it includes **zero** "underused" ones. Escalation is **three-strike**: the first two flags are warnings, the third consecutive flag is a hard reject. A balanced submission resets the counter. In practice: keep spreading your phrases across the whole accumulated vocabulary, not just the latest few LEGOs.

---

## Multi-Language Examples (Overlapping LEGOs)

### Chinese (Sinitic)
```
SEED: "I want to speak Chinese" → "我想说中文"

Overlapping LEGOs:
- 我 = I                    (A-LEGO)
- 想 = want                 (A-LEGO)
- 我想 = I want             (M-LEGO, overlaps with 我 and 想)
- 说 = speak                (A-LEGO)
- 中文 = Chinese            (A-LEGO)

The learner sees 我 alone, then 想 alone, then sees them combined in 我想.
The pattern is inferred from the overlap, never explained.

BUILD for 我想:
- I want → 我想
- I want to speak → 我想说
- I want to learn → 我想学
- I want to try → 我想试

USE for 我想:
- I want to speak Chinese → 我想说中文
- I want to learn Chinese with you → 我想和你学中文
- Now I want to try to speak Chinese → 我现在想试着说中文
- I want to learn how to speak Chinese → 我想学怎么说中文
- I want to try to learn Chinese with you → 我想试着和你学中文
- Do you want to speak Chinese with me? → 你想和我说中文吗?
```

### Portuguese (Romance)
```
SEED: "I have been learning Portuguese" → "tenho aprendido português"

Overlapping LEGOs:
- aprender = to learn                (A-LEGO - infinitive)
- aprendido = learned               (A-LEGO - past participle)
- tenho aprendido = I have been learning  (M-LEGO, overlaps with aprendido)
- português = Portuguese            (A-LEGO)

The learner sees "aprendido" alone, then sees it inside "tenho aprendido".
The pattern is inferred from the overlap.

BUILD for tenho aprendido:
- I have been learning → tenho aprendido
- I have been learning Portuguese → tenho aprendido português
- I have been learning to speak → tenho aprendido a falar
- I have been learning with you → tenho aprendido contigo

USE for tenho aprendido:
- I have been learning Portuguese with you → tenho aprendido português contigo
- I have been learning to speak Portuguese → tenho aprendido a falar português
- I have been learning how to speak Portuguese well → tenho aprendido a falar português bem
- I have been learning Portuguese because I want to travel → tenho aprendido português porque quero viajar
- Have you been learning Portuguese? → Você tem aprendido português?
- I have been learning Portuguese for three months → tenho aprendido português há três meses
```

### German (Germanic)
```
SEED: "I would like to speak German" → "ich möchte Deutsch sprechen"

Overlapping LEGOs:
- ich = I                   (A-LEGO)
- möchte = would like       (A-LEGO)
- ich möchte = I would like (M-LEGO, overlaps with ich and möchte)
- sprechen = to speak       (A-LEGO)
- Deutsch = German          (A-LEGO)

The learner sees "ich" alone, then "möchte" alone, then sees "ich möchte".
The pattern is inferred from seeing the combinations.

BUILD for ich möchte:
- I would like to → ich möchte
- I would like to speak → ich möchte sprechen
- I would like to learn → ich möchte lernen
- I would like to try → ich möchte versuchen

USE for ich möchte:
- I would like to speak German → ich möchte Deutsch sprechen
- I would like to learn German with you → ich möchte Deutsch mit dir lernen
- I would like to try to speak German → ich möchte versuchen Deutsch zu sprechen
- I would like to learn how to speak German well → ich möchte lernen gut Deutsch zu sprechen
- Would you like to speak German with me? → Möchtest du Deutsch mit mir sprechen?
- I would like to practice German every day → ich möchte jeden Tag Deutsch üben
```

### Korean (Koreanic)
```
SEED: "I want to speak Korean" → "한국어를 말하고 싶어요"

Overlapping LEGOs:
- 말하다 = to speak         (A-LEGO - dictionary form)
- 싶다 = to want            (A-LEGO - dictionary form)
- 하고 싶어요 = I want to   (M-LEGO, overlaps with 싶다)
- 한국어 = Korean           (A-LEGO)

The learner sees 싶다 alone, then sees it inside 하고 싶어요.
The pattern is inferred from observing these overlaps.

BUILD for 하고 싶어요:
- I want to → 하고 싶어요
- I want to speak → 말하고 싶어요
- I want to learn → 배우고 싶어요
- I want to try → 해보고 싶어요

USE for 하고 싶어요:
- I want to speak Korean → 한국어를 말하고 싶어요
- I want to learn Korean with you → 당신과 한국어를 배우고 싶어요
- I want to try to speak Korean → 한국어를 말해보고 싶어요
- I want to learn how to speak Korean well → 한국어를 잘 말하는 법을 배우고 싶어요
- Do you want to speak Korean with me? → 저와 한국어를 말하고 싶어요?
- I want to practice Korean every day → 매일 한국어를 연습하고 싶어요
```

---

## Audio-First Doctrine

> *We minimise early variation and maximise perceptual clarity so learners can speak immediately. Once speaking begins, interaction itself supplies the variation and refinement. Grammar is a rudder, not an engine.*

### The Distinction Ladder

Language learning is the progressive reduction of perceptual uncertainty. The learner's real task is **to stabilise sound-based distinctions under uncertainty**. Each layer has different failure modes:

| Layer | Learner's Question | Design Response |
|-------|-------------------|-----------------|
| 0. Sound vs nothing | "Is this language?" | Rhythm, repetition, predictable prosody |
| 1. Target vs other languages | "Is this Chinese, not English?" | Phonotactics, tonal contour, stable timing |
| 2. Words vs other words | "Where does one thing end?" | Multi-syllable anchors, rhythmic verbs, sentence frames |
| 3. Similar sounds (non-native ears) | "q vs ch vs zh?" | Over-distinctness, redundancy, doubling |
| 4. Similar sounds (native ears) | "These sound different to natives?" | Delay minimal pairs, delay register contrasts |
| 5. Homophones | "Same sound, different meaning?" | Context networks must exist first — postpone |

**Every design choice is evaluated by how much uncertainty it removes at the learner's current perceptual layer.**

### Operational Principles

- Choose **one form per intention** (no variation until speaking begins)
- Choose the **most audible form** (longer > shorter early on)
- Accept **provisional meaning** early (refine through conversation later)
- Attach confidence to **being understood**, not to correctness
- **Move first, steer later** — grammar is a rudder, not an engine

### Chinese-Specific Application

- **Doubles as perceptual anchors**: 试试, 看看, 说说 — two beats, rhythmically distinct, easy to parse
- **Longer connectors**: 但是, 所以, 然后 — audible discourse markers that manufacture edges
- **Multi-syllable M-LEGOs by default**: 我想, 和你, 我在试试 — not isolated monosyllables
- **Boring syntax is cognitive mercy**: predictable sentence frames reduce layer-2 uncertainty
- **Delayed compression**: full forms early (一起 not bare verbs), compressed forms much later
- **No homophone disambiguation early**: context networks must exist first

---

## Error Handling

### Errors Are Data, Not Failures

When the API rejects your submission, the error message tells you EXACTLY what to fix.

```
Error: "ZUT violation: 'know' already maps to '알다'"
Action: Use a different natural phrase like "I know about it" or synonym "be aware of"

Error: "Vocabulary violation: '내일' not yet introduced"
Action: Remove phrase using '내일' or reorder LEGOs

Error: "USE phrases need minimum 5, got 3"
Action: Add more complete sentences

Error: "BUILD phrase 'I want' missing LEGO target '하고 싶어요'"
Action: Ensure phrase contains exact LEGO target text
```

### Self-Correction Pattern

```
For each seed:
1. POST to /api/seed/complete
2. If rejected:
   - Read the error message carefully
   - It tells you EXACTLY what's wrong
   - Apply the fix
   - Retry (max 3 attempts)
3. If still failing after 3 attempts:
   - Note the blocker in progress
   - Move to next seed
   - Return to blocked seeds later
```

---

## Workflow

### Starting Each Iteration

```
1. GET /api/resume/{course_code}
   → Returns: next_seed, completed_count, calibration_feedback

2. Read the response to understand:
   - Which seed to work on next
   - Any calibration feedback from QA checkpoints
   - Drift warnings if your self-scores don't match QA scores

3. Work on the next incomplete seed
```

### Creator vs Checker — the role guard

`POST /api/seed/complete` enforces a **two-role workflow**. A request carrying `x-agent-role: creator` (or `?agent_role=creator`) is **rejected with 403** — creators may *draft* but may not *submit*.

- **Creator (Sonnet):** drafts the decomposition and phrases, then hands the draft to a checker (routed via SendMessage).
- **Checker (Opus):** reviews the draft and is the role that actually submits to `/api/seed/complete`.

If you are running as a creator and try to submit, expect a 403 — that's the guard working, not a bug. Pass the draft to the checker rather than forcing the submission.

---

## QA Checkpoints

The build process has **three QA checkpoints** where a QA agent independently verifies quality:

| Checkpoint | After Seed | Purpose |
|------------|------------|---------|
| **1** | 10 | Early catch - is methodology correct? |
| **2** | 50 | Drift check - is calibration holding? |
| **3** | 150 | Sustained quality - past halfway, still good? |

### What Happens at Checkpoints

1. Build pauses with `CHECKPOINT_REACHED` status
2. QA agent spawns automatically
3. QA samples ~50 phrases and re-scores them independently
4. QA evaluates 4 gates:
   - **Gate 1**: Absolute quality (QA avg >= 7.0)
   - **Gate 2**: USE > BUILD (USE phrases must outscore BUILD)
   - **Gate 3**: Vocabulary (no forbidden words)
   - **Gate 4**: Drift (your scores vs QA scores)
5. If all gates pass → auto-approve, build continues
6. If gates fail → REJECT, build halts

### Calibration Feedback

After each checkpoint, `/api/resume` includes feedback:

```json
{
  "calibration_feedback": {
    "last_checkpoint": 50,
    "your_avg_score": 7.9,
    "qa_avg_score": 7.3,
    "drift": 0.6,
    "drift_trend": "increasing",
    "message": "Your scores are 0.6 higher than QA. Be more critical."
  }
}
```

**Use this feedback!** If QA consistently scores lower than you:
- You may be overconfident
- Be more critical of your USE phrases
- Check for textbook-ish phrasing

### Auto-Stop Triggers

The build will HALT if:
- QA average < 7.0 (quality too low)
- USE avg <= BUILD avg (methodology inverted)
- Vocabulary violations found (learner can't say unknown words)
- Drift > 1.5 points (calibration broken)
- Drift increasing for 2+ consecutive checkpoints (agent drifting)

### Submitting a Seed

Note: LEGOs overlap - the A-LEGO "싶다" (want) also appears inside the M-LEGO "하고 싶어요" (I want to).

```
POST /api/seed/complete
{
  "course_code": "kor_for_eng",
  "seed_number": 47,
  "known_text": "I want to speak Korean",
  "target_text": "한국어를 말하고 싶어요",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "want",
      "target": "싶다",
      "build": [...],  // flexible quantity
      "use": [...]     // minimum 5
    },
    {
      "idx": 2,
      "type": "M",
      "known": "I want to",
      "target": "하고 싶어요",
      "build": [...],  // flexible - learner sees 싶다 inside 하고 싶어요
      "use": [...]     // minimum 5
    },
    {
      "idx": 3,
      "type": "A",
      "known": "to speak",
      "target": "말하다",
      "build": [...],
      "use": [...]
    },
    ...
  ]
}
```

### Completion

When all seeds pass validation:

```
<promise>COURSE_BUILD_COMPLETE</promise>
```

---

## Checklist Before Submitting Each Seed

- [ ] Seed can be reconstructed from LEGOs (sanity check: no words missed, no words added)
- [ ] LEGOs in pedagogical order (maximize combinability, especially in early seeds)
- [ ] M-LEGOs have corresponding A-LEGOs for key vocabulary (overlapping LEGOs)
- [ ] Overlaps let patterns be inferred - learner sees word alone, then inside phrase
- [ ] Each LEGO has BUILD phrases (LEGO + 1-3 syllables, fragments OK, debut only)
- [ ] Each LEGO has minimum 5 USE phrases with a mix of lengths (2-3 medium at LEGO + 4-6 syl, 2-3 long at LEGO + 7-10 syl)
- [ ] All phrases contain LEGO target (exact match)
- [ ] All phrases use only introduced vocabulary
- [ ] No ZUT violations (same KNOWN → same TARGET)

---

## Early Seeds: The Graduated Phrase-Count Ramp

Early seeds have limited vocabulary, so the enforced BUILD/USE minimums ramp up gradually. The validator applies exactly this graduated ramp (minimums shown as **BUILD / USE**):

- **Seed 1, LEGO 1 → 0 / 0** (nothing to combine yet)
- **Rest of seed 1 → 1 / 1** (can use L1)
- **Seeds 2-3 → 1 / 1**
- **Seeds 4-5 onward → 3 / 5** — the full minimum, and it stays there for the rest of the course

A LEGO caps at **13** phrases total (`MAX_PHRASES_PER_LEGO`). These are *minimums and a maximum* — above the minimum, BUILD quantity stays flexible based on LEGO length and cognitive load, and USE minimums ensure enough eternal phrases for spaced repetition. A LEGO with **no** phrases at all is always rejected. Only phrases that literally contain the LEGO target count toward these minimums.

`skip_validation` (honoured **only for seeds 1-3**) silences these phrase-count minimums — but structural gates still run, so even a skip-validation submission must tile, pass ZUT, respect vocabulary, and stay under the syllable cap.

---

## Remember

1. **You are not translating** - you are building a pedagogical structure
2. **Overlapping LEGOs enable inference** - word alone, then word inside phrase
3. **Grammar is inferred** - from contrast, never explained
4. **BUILD plugs the new LEGO into prior vocabulary** - fragments OK, shows connections
5. **USE produces naturally** - complete sentences, eternal-eligible
6. **Errors are information** - they tell you exactly what to fix
7. **The database is truth** - query it to see your progress

---

*Output `<promise>COURSE_BUILD_COMPLETE</promise>` when all seeds pass.*

---

## Lessons Learned (Ralph Loop)

This section captures hard-won insights from QA checkpoints and production issues. **Read before each build.**

### 2026-01-26: USE Phrases Must Be Complete Sentences

**Issue:** QA found USE phrases like "想说。" (2 chars) and "Speak." scoring 5 - these are fragments, not sentences.

**Root Cause:** Early seed vocabulary constraints led to accepting incomplete phrases rather than reducing count.

**Fix:**
- USE phrases must ALWAYS be complete sentences regardless of seed position
- If vocabulary limits prevent complete sentences, reduce USE count
- Minimum practical lengths: Chinese 4+ chars, other languages 3+ words
- Score 4 or below = rewrite, don't submit

**Validation Added:** Agent self-check before submission - if USE phrase would score 4 or below, rewrite it.

### 2026-02-05: BUILD Phrases Must Show LEGO Plugging Into Prior Vocabulary

**Issue:** Agent repeatedly confused BUILD phrases with: (a) listing the LEGO by itself, (b) M-LEGO component build-up, (c) random word extensions. Produced BUILD phrases like "how → hoe" or "to speak → 说" which are just the LEGO in isolation — not BUILD phrases at all.

**Root Cause:** Guidance said "LEGO + 1-3 extra syllables" without making clear that the extra content must be **previously introduced LEGOs**. The purpose of BUILD is to show the learner how the new piece connects to what they already know.

**Fix:**
- BUILD = the **entire new LEGO** combined with **LEGOs the learner already knows**
- BUILD shows "plugging in" — e.g., for new LEGO "Chinese" → "中文", a BUILD phrase is "speak Chinese → 说中文" because the learner already knows "说" (to speak)
- BUILD is NOT the LEGO by itself, NOT component build-up, NOT random extensions
- If there's nothing to combine with yet (L1 of Seed 1), that's OK — early seeds are honestly sparse

**Updated:** ralph-methodology.md, calibrate.md, spawn-course-builder.cjs all clarified.

---

### 2026-02-05: Decomposition Should Be Driven by Phrase Quality

**Issue:** Agent decomposed Dutch "how to speak as often as possible" → "hoe je zo vaak mogelijk spreekt" into separate A-LEGO "how" → "hoe" — but standalone "hoe" can't make useful BUILD phrases because Dutch subordinate clauses require conjugated verbs that haven't been introduced yet.

**Root Cause:** Decomposition was driven by tiling logic ("what pieces cover the target?") rather than by asking "what LEGOs produce good BUILD and USE phrases?"

**Fix:**
- Always check: can this LEGO make meaningful BUILD phrases with existing vocabulary?
- If not, the decomposition is wrong — try bundling differently
- Order LEGOs by combination richness: put LEGOs that combine well with existing vocab first
- Structural mismatches between languages get absorbed into M-LEGOs (e.g., English "how to speak" → Dutch "hoe je spreekt" bundles the subordinate clause structure)

---

### 2026-02-16: Two-Mode Build Workflow (Collaborative → Parallel)

**Issue:** Building 300 seeds sequentially with one agent is slow. But parallel agents from seed 1 produce poor foundations because the first 10 seeds establish every pattern the rest of the course depends on.

**Root Cause:** Seeds 1-10 are qualitatively different from seeds 11+. They bootstrap the core vocabulary and grammatical patterns that all subsequent seeds recombine. Getting these wrong cascades through the entire course.

**Fix — Two-mode workflow:**

**Mode 1: Human + Single Agent (Seeds 1-10)**
- One seed at a time, human reviews each before submission
- Human watches for: natural target language, useful LEGOs, good pedagogical ordering
- These seeds establish the "golden keys" (highest-ROI patterns like desire forms, progressive, intention)
- Stop at seed 10 checkpoint for QA before proceeding

**Mode 2: Parallel Agents (Seeds 11-50+)**
- After checkpoint 10 approved, launch 4-8 parallel Sonnet agents
- Each agent gets a batch (e.g., 11-15, 16-20, 21-25...)
- Each agent MUST pull vocab before EVERY seed (`GET /api/vocab/{course}`) — other agents may have added words since last check
- Agents work sequentially within their batch (S11 before S12)
- API validates atomically — agents fix and retry on failure
- Human spot-checks periodically
- Stop at seed 50 for checkpoint QA

**Why this works:** Mode 1 ensures the foundation is solid. Mode 2 leverages the fact that by seed 11+, there's enough vocabulary that decomposition becomes more mechanical and quality is easier to maintain.

---

### 2026-02-16: Vocab Bootstrapping Curve

**Issue:** Early seeds have sparse USE phrases because there's almost no prior vocabulary to recombine with. Agents sometimes force low-quality phrases to hit minimum counts.

**Root Cause:** The vocab constraint means L1 of S1 has ZERO prior vocabulary. L1 can only produce the LEGO itself as a BUILD phrase and maybe 1 USE phrase. This is fundamentally different from S10+ where rich recombination is possible.

**Fix — Accept the bootstrapping curve:**

| Seed | Typical vocab available | USE phrases per LEGO |
|------|------------------------|---------------------|
| S1 | 0 prior words | 1-3 (sparse is OK) |
| S2-3 | 5-15 prior words | 3-5 |
| S4-5 | 15-30 prior words | 5-8 |
| S6-10 | 30-60 prior words | 5-8 (standard) |
| S11+ | 60+ prior words | 8+ (rich recombination) |

**Never sacrifice quality for quantity.** If you can only make 3 good USE phrases for L1 of S2, submit 3 good ones — don't pad with garbage.

---

### 2026-02-16: Markdown Submission Format

**Issue:** Agents using JSON submission format produce more validation errors than agents using markdown format. The markdown format is more natural for linguistic content and easier to review.

**Fix — Prefer markdown submission:**

```markdown
# Seed N
Known: [source language sentence]
Target: [target language sentence]

## L1 [A] "known_chunk" → "target_chunk"

BUILD:
- known_chunk → target_chunk
- known_chunk + prior_vocab → target phrase fragment

USE:
- Full known sentence。 → Full target sentence. [score]
- Another sentence。 → Another sentence. [score]

## L2 [M] "known_chunk" → "target_chunk"
Components: comp1_known → comp1_target, comp2_known → comp2_target

BUILD:
- known_chunk → target_chunk
- Combination → Combination

USE:
- Sentence。 → Sentence. [score]
```

**Format rules:**
- BUILD: `- known → target` (no periods, no scores, fragments OK)
- USE: `- known。 → target. [score]` (periods, scores 5-9, complete sentences)
- Components line for M-LEGOs only
- Submit: `curl -s -X POST "http://localhost:3471/api/seed/complete?course={code}" -H "Content-Type: text/markdown" --data-binary @/tmp/seedN.md`

---

### 2026-02-16: Parallel Agent Coordination

**Issue:** When multiple agents build seeds in parallel, they can create ZUT collisions if they don't see each other's vocab additions.

**Root Cause:** Agent A submits S15 with "tomorrow" → "morgen" while Agent B simultaneously submits S18 with "tomorrow" → "morgens". Both pass individual validation but create a ZUT conflict.

**Fix — Coordination protocol for parallel agents:**
1. **Pull vocab before EVERY seed** — not just at batch start. The API is the single source of truth.
2. **Heartbeat** — `POST /api/heartbeat/{course}` with `{"status":"working","current_seed":N}` so other agents (and humans) know what's in flight
3. **Sequential within batch** — each agent works its assigned range in order (S11→S12→S13)
4. **Retry on ZUT** — if another agent's submission created a collision, upchunk the conflicting piece into a larger M-LEGO and retry
5. **Don't guess vocab** — always check the API, never assume you know what's been introduced

---

*Add new lessons above this line. Format: Date, Issue, Root Cause, Fix.*
