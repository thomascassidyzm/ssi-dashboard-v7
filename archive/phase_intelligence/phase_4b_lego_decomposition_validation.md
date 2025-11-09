# Phase 4b: LEGO Decomposition Validation

**Run this BEFORE Phase 5 basket generation to catch linguistic issues**

---

## Purpose

Validate that SEED_PAIR has been decomposed into sensible LEGO_PAIRS that:
1. Form linguistically meaningful units
2. Can be taught/practiced independently
3. Won't confuse learners
4. Allow natural phrase construction

---

## Validation Checklist

For each seed, review the LEGO decomposition and ask:

### 1. **Linguistic Completeness**
Does each LEGO form a meaningful unit in isolation?

**❌ Bad Example:**
```
Target Language: "Y quiero que hables español conmigo mañana."
Known Language: "And I want you to speak Spanish with me tomorrow."
LEGOs: "quiero que" | "hables" | "español" | ...
```
Problem: "hables" (grammatical mood form) without its trigger "que" is incomplete

**✅ Good Fix:**
```
LEGOs: "quiero" | "que hables" | "español" | ...
```
Now "que hables" is a complete grammatical construction (mood trigger + verb)

**Principle:** If a grammatical form requires a specific trigger word/particle, keep them together.

### 2. **Compound Constructions**
Are multi-word constructions kept together?

**Check for:**
- **Grammatical mood/aspect constructions** (mood triggers + verbs, tense auxiliaries + particles)
- **Periphrastic verb forms** (multi-word future/past/progressive constructions)
- **Negative constructions** (negator + verb when they form fixed unit)
- **Fixed expressions** (multi-word time expressions, compound question words)
- **Compound prepositions/conjunctions** (multi-word subordinators, compound prepositions)

**Universal principle:** If the construction teaches a single grammatical concept, keep it together.

### 3. **Standalone Teachability**
Can you teach this LEGO to a learner and have them practice it?

**❌ Bad Example:**
```
LEGO: "que" (just "that")
```
Problem: Learner can't practice "que" alone - it needs context

**✅ Better:**
```
LEGO: "que hables" (subjunctive construction)
```
Now learner can practice the full construction

### 4. **Natural Combination**
Will this LEGO combine naturally with prior vocabulary?

**Test:** Try building 2-3 practice phrases using this LEGO + prior LEGOs. If phrases feel forced/unnatural, the decomposition may be wrong.

---

## Universal Linguistic Patterns to Check

### Pattern 1: Grammatical Dependencies
**Principle:** Some grammatical forms require specific triggers and cannot be taught in isolation.

**Examples across languages:**
- Mood markers requiring triggers (Spanish subjunctive + "que", French subjunctive + "que", etc.)
- Conditional constructions (if...then, si...entonces, wenn...dann)
- Complementizers with verbs (that/to with verbs of wanting/saying)

**Rule:** If a verb form REQUIRES a trigger word, keep them together as one LEGO.

### Pattern 2: Multi-Word Verb Constructions
**Principle:** Periphrastic verb forms should be kept as units.

**Examples across languages:**
- Future constructions (English "going to", Spanish "ir a", French "aller + infinitive")
- Obligation constructions (English "have to", Spanish "tener que", German "müssen")
- Progressive/continuous aspects (English "am/is/are + -ing", Spanish "estar + -ndo")

**Rule:** Keep verb construction particles with the auxiliary, not with the main verb.

### Pattern 3: Function Word Dependencies
**Principle:** Function words (prepositions, complementizers, subordinators) rarely work alone.

**Examples:**
- ❌ Lone complementizer ("that", "que", "dass" alone)
- ❌ Lone preposition in fixed expressions ("to" alone when part of "in order to")
- ❌ Subordinator split from its clause marker

**Rule:** Attach function words to the content word they govern, forming the minimal complete unit.

### Pattern 4: Fixed Expressions
**Principle:** Idioms and multi-word expressions should not be split if they function as a single semantic unit.

**Examples:**
- Time expressions ("as soon as", "tan pronto como", "dès que")
- Question words ("why" = "por qué", "warum")
- Compound prepositions ("because of", "in order to", "para que")

**Rule:** Keep fixed multi-word expressions together unless each part can be taught and practiced independently.

### Pattern 5: Natural Prosodic Units
**Principle:** LEGOs should align with natural speech boundaries where possible.

**Test:** Read the LEGO aloud. Does it feel like a natural pause point? If splitting mid-construction feels unnatural in speech, don't split it in LEGOs.

---

## Language-Agnostic Red Flags

- ❌ Function word alone (complementizer, preposition, article without content word)
- ❌ Grammatical marker split from the form it marks (mood trigger separate from mood verb)
- ❌ Verb construction split awkwardly (auxiliary split from construction marker)
- ❌ Multi-word expression split when it functions as semantic unit
- ❌ Any LEGO that cannot be explained/practiced in isolation

---

## Validation Process

### For Each Seed:

1. **Read the full seed sentence** in both target and known languages
2. **Review the LEGO breakdown** line by line
3. **Check each LEGO** against the 4 criteria above
4. **Flag issues** and suggest corrections
5. **Validate fixes** - would the corrected LEGO work in practice phrases?

### Output Format:

```
Seed: [SEED_ID]
Status: ✅ VALIDATED | ⚠️ ISSUES FOUND

Issues:
- [LEGO_ID]: [Problem description]
  Suggestion: [Corrected decomposition]

Reasoning:
- [Why the correction improves teachability/naturalness]
```

---

## Example Validation (Language-Pair Agnostic)

### Seed Review Process:

```
Target Language: [TARGET_SENTENCE]
Known Language: [KNOWN_SENTENCE]

Current LEGOs:
- [LEGO_ID]: [target] → [known] [STATUS]

Issue Analysis:
1. Linguistic Completeness: Does each LEGO make sense alone?
2. Compound Constructions: Are multi-word units kept together?
3. Teachability: Can learner practice this LEGO with prior vocabulary?
4. Natural Combination: Will this combine smoothly with other LEGOs?
```

### Real Example (Spanish → English):

```
Target: "Y quiero que hables español conmigo mañana."
Known: "And I want you to speak Spanish with me tomorrow."

Current LEGOs:
- S0015L01: Y → And ✅
- S0015L02: quiero que → I want ✅ (compound kept)
- S0015L03: hables → you speak ❌ ISSUE
- S0015L04: español → Spanish ✅
- S0015L05: conmigo → with me ✅
- S0015L06: mañana → tomorrow ✅

Issue: S0015L03 fails Linguistic Completeness test
- "hables" is a grammatical mood form requiring trigger "que"
- Violates Pattern 1: Grammatical Dependencies
- Cannot be taught/practiced in isolation

Suggested Fix:
- S0015L02: quiero → I want
- S0015L03: que hables → you to speak

Validation of Fix:
✅ "que hables" is complete grammatical unit (trigger + mood verb)
✅ Can be taught: "que + [verb in this form]" pattern
✅ Combines naturally: "quiero que hables", "necesito que hables"
✅ Respects target language grammar structure
```

---

## Integration with Pipeline

**Run this phase:**
- AFTER Phase 4 (LEGO_PAIRS generation)
- BEFORE Phase 5 (basket generation)

**If issues found:**
1. Flag for human review
2. Correct LEGO_PAIRS file
3. THEN proceed to basket generation

**Benefits:**
- Prevents propagating bad decompositions through entire course
- Catches linguistic errors early
- Ensures high-quality learning materials
- System improvement feedback loop

---

## Key Principle

**A LEGO should be a minimal teachable unit** - the smallest chunk that:
- Has clear meaning
- Can be practiced independently
- Combines naturally with other LEGOs
- Respects the target language's grammatical structure
