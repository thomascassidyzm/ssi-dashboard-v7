# Phase 2: Corpus Intelligence → corpus_intelligence.json

**Version**: 1.0 (Extracted from APML 2025-10-23)
**Status**: Active methodology for Phase 2 corpus analysis
**Output**: `vfs/phase_outputs/phase_2_corpus_intelligence.json`

---

## Task

Analyze translated corpus to determine FCFS (First-Can-First-Say) order and calculate utility scores.

## Input

- Translation amino acids: `vfs/amino_acids/translations/*.json`
- OR: `vfs/courses/{course_code}/seed_pairs.json`

---

## Core Concepts

### FCFS (First-Can-First-Say) - Semantic Priority

Determines which words/LEGOs appear first in the teaching sequence.

**Critical Rule**: The FIRST word to teach a concept CLAIMS that meaning as a BASE LEGO.

**Example**:
```
If "estoy" = "I am" appears before "soy" = "I am", then:
- "estoy" CLAIMS "I am" as its BASE meaning
- "soy" must be taught differently (e.g., "soy profesor" = "I am a teacher (permanent)")
```

**Why This Matters**:
- Learners build mental maps: "estoy = I am"
- Later words with overlapping meanings need more specific contexts
- Prevents confusion: "Which word should I use?"

---

## Your Mission

### 1. FCFS Mapping (Semantic Territory Claiming)

Determine which words appear first in the teaching sequence:

**Process**:
1. Scan all seed_pairs in order (S0001 → S0668)
2. Track which words introduce which concepts
3. First occurrence CLAIMS the concept
4. Map semantic priority for all core meanings

**Output**:
```json
{
  "concept_ownership": {
    "I am": "estoy (S0003)",
    "to try": "intentar (S0002)",
    "to speak": "hablar (S0001)"
  },
  "fcfs_order": [
    { "word": "Quiero", "seed": "S0001", "rank": 1 },
    { "word": "hablar", "seed": "S0001", "rank": 2 }
  ]
}
```

### 2. Utility Scoring

Calculate pedagogical value for each translation.

**Formula**: `Frequency × Versatility × Simplicity`

**Components**:
- **Frequency**: How often used in corpus
- **Versatility**: How many contexts it appears in
- **Simplicity**: How easy to learn/teach (inverse of complexity)

**Scale**: 0-100

**Example**:
```json
{
  "utility_scores": {
    "S0001": 95,  // High utility: "I want" (frequent, versatile, simple)
    "S0042": 65,  // Medium utility: "I would like" (less frequent, more formal)
    "S0250": 30   // Low utility: complex idiomatic expression
  }
}
```

### 3. Dependency Mapping

Map which LEGOs depend on others.

**Example**:
```json
{
  "dependencies": {
    "S0002": ["S0001"],  // "trying to learn" needs "to learn" first
    "S0005": ["S0001", "S0002"]  // "practice speaking" needs both
  }
}
```

### 4. Teaching Sequence Recommendations

Suggest optimal teaching order.

**Factors**:
- FCFS chronological order (natural sequence)
- Utility scores (high-value opportunities)
- Dependencies (prerequisite concepts)

---

## Output Format

```json
{
  "version": "1.0",
  "generated_at": "2025-10-23T12:00:00Z",
  "course_code": "ita_for_eng_668seeds",

  "fcfs_order": [
    { "word": "Quiero", "seed_id": "S0001", "rank": 1, "meaning": "I want" },
    { "word": "hablar", "seed_id": "S0001", "rank": 2, "meaning": "to speak" }
  ],

  "utility_scores": {
    "S0001": 95,
    "S0002": 88,
    "S0003": 82
  },

  "concept_ownership": {
    "I want": "Quiero (S0001)",
    "to speak": "hablar (S0001)",
    "to try": "intentar (S0002)"
  },

  "dependencies": {
    "S0002": ["S0001"],
    "S0005": ["S0001", "S0002"]
  },

  "recommendations": {
    "early_priority": ["S0001", "S0002", "S0003"],
    "high_utility": ["S0001", "S0005", "S0008"],
    "deferred": ["S0250", "S0400"]
  }
}
```

---

## Critical Notes

- **FCFS = "natural" chronological sequence**
  - Seeds are carefully ordered based on 16 years of empirical data
  - The canonical order IS the pedagogically optimal sequence
  - Respect this order unless utility provides overwhelming reason to deviate

- **Utility may override FCFS for high-value opportunities**
  - If a seed appears late but has extremely high utility, flag it
  - Example: Core greeting appears at S0150 but utility = 98
  - Recommendation: Consider earlier introduction

- **This data drives Phase 3 LEGO extraction**
  - Phase 3 uses FCFS order to determine LEGO priority
  - Utility scores help decide which LEGOs get more practice baskets
  - Dependency maps prevent circular references

---

## Algorithm Guidance

### FCFS Calculation

```javascript
const fcfsMap = new Map()
const conceptOwnership = {}

for (const seed of seeds) {
  const { seed_id, target, known } = seed

  // Extract concepts from target/known
  const concepts = extractConcepts(target, known)

  for (const concept of concepts) {
    if (!conceptOwnership[concept]) {
      // First occurrence - claim it!
      conceptOwnership[concept] = `${concept} (${seed_id})`
      fcfsMap.set(concept, seed_id)
    }
  }
}
```

### Utility Scoring

```javascript
function calculateUtility(seed) {
  const frequency = countOccurrences(seed.words)
  const versatility = countUniqueContexts(seed.words)
  const simplicity = 100 - seed.complexity_score

  return (frequency * 0.4) + (versatility * 0.4) + (simplicity * 0.2)
}
```

---

## Success Criteria

✓ FCFS order complete for all seeds
✓ Utility scores calculated (0-100 scale)
✓ Concept ownership mapped (which word owns which meaning)
✓ Dependencies identified (prerequisite relationships)
✓ Teaching recommendations generated
✓ Output stored in `phase_2_corpus_intelligence.json`
✓ Ready for Phase 3 consumption

---

## Version History

**v1.0 (2025-10-23)**:
- Extracted from APML PHASE_PROMPTS
- Documented FCFS (First-Can-First-Say) semantic priority
- Added utility scoring formula
- Clarified concept ownership ("First Word Wins")
- Defined output format for Phase 3 consumption

---

**Next Update**: Capture any new corpus analysis patterns discovered during multi-language course generation
