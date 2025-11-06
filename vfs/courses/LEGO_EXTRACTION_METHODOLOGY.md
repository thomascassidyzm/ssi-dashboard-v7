# LEGO Extraction Methodology

## Purpose
Extract Functionally Deterministic (FD) language units from seed pairs that enable learners to construct natural speech without confusion.

## Core Principles

### 1. FD (Functionally Deterministic) Principle
**Goal**: Prevent learner confusion about which form to use.

**Rule**: If the same English gloss could map to multiple target language forms, **chunk UP** to include disambiguating context.

**Examples**:
- ❌ BAD: ["doing", "hacer"] and ["doing", "haciendo"] (learner confused: which one?)
- ✓ GOOD: ["I enjoy doing", "Disfruto hacer"] (context shows infinitive usage)
- ✓ GOOD: ["I'm doing", "Estoy haciendo"] (context shows gerund usage)

**Application by Stage**:
- **S0001-S0050**: STRICT - heavily favor molecular LEGOs with context baked in
- **S0051-S0150**: MODERATE - can introduce more atomic forms as patterns solidify
- **S0151+**: FLEXIBLE - learners robust enough for contextual variation

### 2. LEGO Types

**Type B (Basic/Atomic)**:
- Single words or minimal units
- Examples: ["today", "hoy"], ["to say", "decir"], ["quickly", "rápidamente"]
- Use when: No ambiguity about usage/form

**Type C (Composite/Molecular)**:
- Multi-word phrases showing grammatical structure
- Examples: ["I'd like", "Me gustaría"], ["after you finish", "después de que termines"]
- Use when: Context needed for disambiguation OR demonstrating grammatical pattern

**Both/And, Not Either/Or**:
- Extract BOTH atomic and molecular when both have utility
- Example from S0002:
  - ["trying", "intentando"] (B) ← atomic form
  - ["I'm trying", "Estoy intentando"] (C) ← shows progressive construction
- Reason: Gives basket generation flexibility

### 3. What to Extract

**DO extract**:
- Content words with standalone utility (verbs, nouns, adjectives, adverbs)
- Grammatical constructions that demonstrate patterns
- Fixed expressions and collocations
- Prepositional phrases with clear meaning ("with you", "in Spanish")
- Temporal expressions ("tomorrow", "this evening")
- Question words and uncertainty expressions

**DON'T extract as standalone LEGOs**:
- Bare articles (el, la, un, una) - only in larger phrases
- Isolated prepositions (de, para, en) - only as part of phrases
- Subordinating conjunctions alone (que) - only in constructions
- Reason: These have no standalone meaning for learner practice

**Exception**: Extract these if they're critical connectors for conversational flow:
- Conjunctions: ["but", "pero"], ["and", "y"], ["because", "porque"], ["or", "o"]
- Conditional: ["if", "si"]
- These enable natural thought chains

### 4. Pattern Identification

**Pattern Codes**: P01, P02, P03, etc. represent grammatical structures
- P01: Quiero + infinitive (I want to...)
- P02: Estoy + gerund (I'm ...ing)
- P03: Voy a + infinitive (I'm going to...)
- P04: Me gustaría (I'd like)
- P05: Simple present
- P06: No estoy seguro (uncertainty)
- P10: Subjunctive mood
- P12: Question words
- P18: Poder (ability/can)
- P20: Impersonal constructions
- [Continue numbering as new patterns emerge]

**Mark patterns when**:
- `patterns_introduced`: First appearance of a pattern in the course
- `patterns_used`: Any pattern demonstrated in this seed (new or reinforced)
- `pattern_demonstrated`: On individual LEGO if it exemplifies the pattern

### 5. Cumulative Tracking

**Critical for GATE compliance**:
- Track running total: `"cumulative_legos": X`
- Each seed shows total LEGOs available up to and including that seed
- Enables parallel basket generation (workers know vocabulary bounds)

**Example**:
```json
"S0001": {"cumulative_legos": 5},
"S0002": {"cumulative_legos": 8},  // Added 3 new LEGOs
"S0003": {"cumulative_legos": 10}  // Added 2 new LEGOs
```

### 6. LEGO Identification Process

**For each seed pair**:

1. **Analyze the sentence structure**
   - What grammatical patterns are present?
   - What content words have standalone utility?
   - What phrases demonstrate important constructions?

2. **Identify atomic candidates**
   - Individual words that have clear, unambiguous usage
   - Check: Could this word appear in multiple forms/contexts that would confuse learners?
   - If YES → don't extract as atomic, chunk UP

3. **Identify molecular candidates**
   - Phrases demonstrating grammatical patterns
   - Multi-word units that function as single concepts
   - Constructions showing word order, agreement, or other structural features

4. **Check for FD compliance**
   - For each LEGO: "Could a learner be confused about when/how to use this?"
   - If YES → increase context (make more molecular)
   - Early seeds: err on side of MORE context

5. **Assign pattern codes**
   - Is this LEGO demonstrating a grammatical pattern?
   - Is this the first time we're seeing this pattern? → patterns_introduced
   - Mark on individual LEGO: pattern_demonstrated

6. **Classify type**
   - Atomic unit with no ambiguity → Type B
   - Shows structure/context needed → Type C

7. **Write clarifying note**
   - What makes this LEGO useful?
   - Any important linguistic details?
   - Why this chunking level?

## Edge Cases and Decisions

### Verb Forms
**Question**: Extract "hablar" as "to speak", "speaking", or "to talk"?
**Answer**: Look at context in the seed:
- "Quiero hablar" → ["to speak", "hablar"] (infinitive after quiero)
- "practicar hablar" → Keep molecular ["practise speaking", "practicar hablar"]
- English gloss must reflect FUNCTIONAL FORM in this context

### Conjugations
**Question**: Extract different conjugations as separate LEGOs?
**Answer**:
- In early seeds (S0001-S0050): Generally YES
  - ["I want", "Quiero"], ["you want", "Quieres"], ["he wants", "Él quiere"]
  - Learners need explicit exposure to each form
- Later seeds: Can start assuming pattern extension

### Pronouns and Attached Forms
**Question**: "hablarte" (speak to you) - one LEGO or separate?
**Answer**:
- Extract when taught: ["to speak to you", "hablarte"] if it appears in seed
- Don't use in baskets until extracted
- Attached pronouns are DIFFERENT from standalone constructions

### Molecular Size
**Question**: How big should molecular LEGOs be?
**Answer**:
- Big enough to disambiguate
- Small enough to be recombinable
- Example: "después de que termines" (after you finish)
  - Could extract: ["after", "después de que"] AND ["after you finish", "después de que termines"]
  - Both have utility - the atomic shows the conjunction, the molecular shows full usage

## Validation Checklist

Before finalizing extraction for a seed:

- [ ] All LEGOs have standalone practice utility
- [ ] No LEGO will cause form confusion (FD check)
- [ ] Both atomic and molecular extracted where both useful
- [ ] Pattern codes assigned correctly
- [ ] Cumulative count incremented correctly
- [ ] Notes clarify chunking decisions
- [ ] Early seed bias toward molecular (S0001-S0050)

## Example Extraction Walkthrough

**Seed S0004**: "cómo decir algo en español" / "how to say something in Spanish"

**Step 1 - Analyze structure**:
- Question word: cómo (how)
- Verb: decir (to say)
- Object: algo (something)
- Prepositional phrase: en español (in Spanish)
- Pattern: P12 already introduced (question words)

**Step 2 - Atomic candidates**:
- "decir" - unambiguous infinitive, distinct from "hablar" ✓
- "algo" - clear indefinite pronoun ✓
- "en español" - prepositional phrase, but useful as unit

**Step 3 - Molecular candidates**:
- "en español" - prep + language name, functions as unit
- Could do "cómo decir algo" but the individual pieces are more recombinable

**Step 4 - FD check**:
- "decir" alone: When do I use "decir" vs "digo" vs "dice"?
  - Context here is infinitive after "cómo"
  - Mark as "to say" not "say"
  - Learner prompt will be "how to say..." so form is clear ✓

**Step 5 - Extract**:
```json
{
  "id": "S0004L01",
  "lego": ["to say", "decir"],
  "type": "B",
  "note": "Infinitive verb - distinct from hablar (speak/talk)"
},
{
  "id": "S0004L02",
  "lego": ["something", "algo"],
  "type": "B",
  "note": "Indefinite pronoun"
},
{
  "id": "S0004L03",
  "lego": ["in Spanish", "en español"],
  "type": "C",
  "note": "Prepositional phrase for language"
}
```

**Step 6 - Patterns**:
- Uses P12 (question word "cómo" from S0003)
- No new patterns introduced

**Step 7 - Cumulative**:
- S0003 ended at 10
- Added 3 new LEGOs
- cumulative_legos: 13

## Output Format

```json
{
  "SEED_ID": {
    "seed_pair": {
      "target": "Target language sentence",
      "known": "Known language sentence"
    },
    "patterns_used": ["P01", "P12"],
    "patterns_introduced": ["P20"],
    "legos": [
      {
        "id": "SEED_ID_L01",
        "lego": ["known phrase", "target phrase"],
        "type": "B|C",
        "pattern_demonstrated": "P01|null",
        "note": "Why this LEGO, this chunking level, linguistic notes"
      }
    ],
    "cumulative_legos": 42,
    "note": "Optional: special considerations for this seed"
  }
}
```

## Quality Metrics

Good extraction achieves:
- **FD Compliance**: No learner confusion about forms (test: could learner guess wrong?)
- **Recombinable**: LEGOs can be mixed in natural ways
- **Pattern Coverage**: Grammatical structures explicitly identified
- **Appropriate Granularity**: Atomic where unambiguous, molecular where context needed
- **GATE Traceable**: Cumulative counts enable vocabulary enforcement

## Anti-Patterns (What NOT to do)

❌ **Over-atomization**: Extracting "hacer" as both ["doing", "hacer"] and ["to do", "hacer"]
- Problem: Learner doesn't know which context needs which
- Fix: Chunk UP to include context

❌ **Under-extraction**: Only extracting ["I enjoy doing things", "Disfruto hacer cosas"]
- Problem: Too specific, not recombinable
- Fix: Extract intermediate chunks too

❌ **Missing patterns**: Extracting LEGOs but not marking which demonstrate patterns
- Problem: Basket generation can't ensure pattern coverage
- Fix: Mark pattern_demonstrated consistently

❌ **Inconsistent glosses**: "hablar" marked as "to speak", "speaking", "to talk" randomly
- Problem: Learner confused about what "hablar" means
- Fix: Pick ONE primary gloss per LEGO, use consistently

❌ **Skipping conjunctions**: Not extracting pero, y, porque, o
- Problem: Practice phrases can't build conversational chains
- Fix: Extract high-utility connectors even though they're "function words"

---

**This methodology evolves**: As we learn what works for learners, we refine these principles. Document major changes with version notes.
