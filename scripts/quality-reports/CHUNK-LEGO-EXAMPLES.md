# Chunk LEGO Implementation Examples

_Practical examples showing how chunk-first LEGOs would be structured in the Course Builder API_

**Context**: Based on chunk opportunity analysis (2026-02-02)

---

## Overview

This document provides concrete examples of how to implement "chunk-first" M-LEGOs in the Course Builder API, using real patterns identified in the analysis.

---

## Example 1: Universal Chunk - "want to"

**Frequency**: 3,426 occurrences across 5 languages
**Impact**: CRITICAL - appears in 8% of all practice phrases

### Current Approach (Atomic-First)

**Seed 42**: "I want to learn Chinese"

```json
{
  "seed_number": 42,
  "known_text": "I want to learn Chinese",
  "target_text": "我想学中文",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "I",
      "target": "我",
      "phrases": [...]
    },
    {
      "idx": 2,
      "type": "A",
      "known": "want",
      "target": "想",
      "phrases": [...]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "to",
      "target": "", // function word, often null in Chinese
      "phrases": [...]
    },
    {
      "idx": 4,
      "type": "A",
      "known": "learn",
      "target": "学",
      "phrases": [...]
    },
    {
      "idx": 5,
      "type": "A",
      "known": "Chinese",
      "target": "中文",
      "phrases": [...]
    }
  ]
}
```

**Phrase Building**: [I] + [want] + [to] + [learn] + [Chinese] = **5 assembly steps**

### Chunk-First Approach

```json
{
  "seed_number": 42,
  "known_text": "I want to learn Chinese",
  "target_text": "我想学中文",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "I",
      "target": "我",
      "phrases": [
        {"known": "I am here", "target": "我在这里"},
        {"known": "I think so", "target": "我觉得是"}
      ]
    },
    {
      "idx": 2,
      "type": "M",
      "known": "want to",
      "target": "想",
      "components": [
        {"known": "want", "target": "想"},
        {"known": "to", "target": ""} // function word
      ],
      "phrases": [
        {"known": "She wants to speak", "target": "她想说"},
        {"known": "I want to help", "target": "我想帮忙"},
        {"known": "Do you want to try?", "target": "你想试试吗？"}
      ]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "learn",
      "target": "学",
      "phrases": [
        {"known": "learn quickly", "target": "学得快"},
        {"known": "learn new things", "target": "学新东西"}
      ]
    },
    {
      "idx": 4,
      "type": "A",
      "known": "Chinese",
      "target": "中文",
      "phrases": [
        {"known": "in Chinese", "target": "用中文"},
        {"known": "Chinese characters", "target": "汉字"}
      ]
    }
  ]
}
```

**Phrase Building**: [I] + [want to] + [learn] + [Chinese] = **4 assembly steps** (20% reduction)

### Basket Cycle for "want to" (M-LEGO)

```
Basket Sequence:
1. Component: "want" (is_component: true, is_debut: false)
   - Practice: "I want this"
   - Practice: "She wants coffee"

2. Component: "to" (is_component: true, is_debut: false)
   - Practice: "to speak" (if "to" maps to something in target language)
   - OR skip if "to" is null in target (Chinese case)

3. LEGO Debut: "want to" (is_component: false, is_debut: true)
   - Practice: "I want to learn"
   - Practice: "She wants to speak"
   - Practice: "Do you want to help?"

4. Consolidation: More complex phrases using the chunk
   - Practice: "I want to learn Chinese with you"
   - Practice: "She wants to speak more slowly"
```

---

## Example 2: Subject + Verb Chunk - "I think"

**Frequency**: 1,108 occurrences across 4 languages
**Use Case**: Expressing opinions, beliefs

### Spanish Example

**Seed 67**: "I think that Spanish is beautiful"

**Chunk-First Structure**:

```json
{
  "seed_number": 67,
  "known_text": "I think that Spanish is beautiful",
  "target_text": "Creo que el español es hermoso",
  "legos": [
    {
      "idx": 1,
      "type": "M",
      "known": "I think",
      "target": "Creo",
      "components": [
        {"known": "I", "target": "yo (implied)"},
        {"known": "think", "target": "creo"}
      ],
      "phrases": [
        {"known": "I think so", "target": "Creo que sí"},
        {"known": "I think you're right", "target": "Creo que tienes razón"},
        {"known": "I don't think so", "target": "No creo"}
      ]
    },
    {
      "idx": 2,
      "type": "A",
      "known": "that",
      "target": "que",
      "phrases": [
        {"known": "that is good", "target": "que es bueno"},
        {"known": "I know that", "target": "Sé que"}
      ]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "Spanish",
      "target": "el español",
      "phrases": [...]
    },
    {
      "idx": 4,
      "type": "A",
      "known": "is",
      "target": "es",
      "phrases": [...]
    },
    {
      "idx": 5,
      "type": "A",
      "known": "beautiful",
      "target": "hermoso",
      "phrases": [...]
    }
  ]
}
```

**Overlapping Variant**: "I think that"

```json
{
  "idx": 2,
  "type": "M",
  "known": "I think that",
  "target": "Creo que",
  "components": [
    {"known": "I think", "target": "Creo"},  // reuses existing M-LEGO
    {"known": "that", "target": "que"}
  ],
  "phrases": [
    {"known": "I think that you're right", "target": "Creo que tienes razón"},
    {"known": "I think that we should go", "target": "Creo que deberíamos ir"}
  ]
}
```

**Benefit**: Learners can use EITHER "I think" OR "I think that" depending on the sentence, creating flexibility.

---

## Example 3: Language-Specific Chunk - Chinese Verb + Complement

**Pattern**: "finished" (verb + 了 le, perfective aspect)
**Frequency**: 5 occurrences (but grammatically critical)

### Chinese Example

**Seed 89**: "I finished eating"

**Chunk-First Structure**:

```json
{
  "seed_number": 89,
  "known_text": "I finished eating",
  "target_text": "我吃完了",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "I",
      "target": "我",
      "phrases": [...]
    },
    {
      "idx": 2,
      "type": "M",
      "known": "finished [verb]",
      "target": "[verb]完了",
      "components": [
        {"known": "[verb]", "target": "[verb]"},
        {"known": "finished (perfective)", "target": "完了"}
      ],
      "phrases": [
        {"known": "finished writing", "target": "写完了"},
        {"known": "finished reading", "target": "读完了"},
        {"known": "finished learning", "target": "学完了"}
      ],
      "notes": "完了 (wán le) = resultative complement + perfective aspect"
    },
    {
      "idx": 3,
      "type": "A",
      "known": "eating",
      "target": "吃",
      "phrases": [
        {"known": "eating rice", "target": "吃饭"},
        {"known": "like eating", "target": "喜欢吃"}
      ]
    }
  ]
}
```

**Why This Is Critical**:
- In Chinese, "finished" is expressed as a **verb complement** (完了), not a separate verb
- Native speakers process "吃完了" as a unit (eat + finish complement + aspect)
- Teaching "finished" as atomic LEGO would be grammatically incorrect
- Chunk approach respects Chinese grammar structure

**Alternative Representation** (pattern-based):

```json
{
  "idx": 2,
  "type": "M",
  "known": "finished eating",
  "target": "吃完了",
  "components": [
    {"known": "eat", "target": "吃"},
    {"known": "finish (complement)", "target": "完"},
    {"known": "perfective marker", "target": "了"}
  ],
  "phrases": [
    {"known": "I finished eating", "target": "我吃完了"},
    {"known": "She finished eating already", "target": "她已经吃完了"}
  ],
  "grammar_note": "Verb + 完 (finish) + 了 (perfective) = completed action"
}
```

---

## Example 4: Missing Intermediate - "learn German"

**Context**: "learn" exists, "learn German with me" exists, but "learn German" chunk is missing
**Frequency**: 270 occurrences (German course)

### German Example

**Current State**:
- ✓ Atomic LEGO: "learn" (lernen)
- ✓ Atomic LEGO: "German" (Deutsch)
- ✓ Complex phrase: "I want to learn German with you"
- ✗ Missing: "learn German" as intermediate chunk

**Chunk-First Addition**:

```json
{
  "idx": 4,
  "type": "M",
  "known": "learn German",
  "target": "Deutsch lernen",
  "components": [
    {"known": "learn", "target": "lernen"},
    {"known": "German", "target": "Deutsch"}
  ],
  "phrases": [
    {"known": "I want to learn German", "target": "Ich möchte Deutsch lernen"},
    {"known": "learn German quickly", "target": "schnell Deutsch lernen"},
    {"known": "learning German is fun", "target": "Deutsch lernen macht Spaß"}
  ],
  "grammar_note": "Infinitive object construction: [language] + [verb]"
}
```

**Progression Path**:

```
Session 1: Learn atomic "learn" (lernen)
Session 2: Learn atomic "German" (Deutsch)
Session 5: Learn chunk "learn German" (Deutsch lernen)
Session 8: Use in complex phrase "I want to learn German with you"
```

**Benefit**: Gradual build-up from atoms → chunk → complex phrase (scaffolding principle)

---

## Example 5: Overlap Recommendation - "with you"

**Pattern**: High-usage LEGO that combines frequently with specific verbs
**Frequency**: 542 occurrences (German: 297, Arabic: 245)

### German Example

**Identified Contexts**:
1. "speak with you" (mit dir sprechen)
2. "practice with you" (mit dir üben)
3. "learn German with you" (mit dir Deutsch lernen)
4. "work with you" (mit dir arbeiten)

**Chunk-First Recommendations**:

```json
[
  {
    "type": "M",
    "known": "speak with you",
    "target": "mit dir sprechen",
    "components": [
      {"known": "speak", "target": "sprechen"},
      {"known": "with you", "target": "mit dir"}
    ]
  },
  {
    "type": "M",
    "known": "practice with you",
    "target": "mit dir üben",
    "components": [
      {"known": "practice", "target": "üben"},
      {"known": "with you", "target": "mit dir"}
    ]
  },
  {
    "type": "M",
    "known": "learn with you",
    "target": "mit dir lernen",
    "components": [
      {"known": "learn", "target": "lernen"},
      {"known": "with you", "target": "mit dir"}
    ]
  }
]
```

**Why Not Just "with you" Alone?**
- "mit dir" (with you) requires dative case in German
- The verb + prepositional phrase is a natural collocation
- Learners benefit from practicing the full pattern, not just the PP

**Overlapping Structure**:
- Base chunk: "with you" (mit dir)
- Overlapping variants: "speak with you", "learn with you", etc.
- Learner can choose appropriate level of granularity

---

## Example 6: Welsh Mutation Chunk - "I want"

**Challenge**: Welsh has initial consonant mutations after particles
**Pattern**: "I want" triggers soft mutation on following verb-noun

### Welsh Example

**Seed 34**: "I want to speak"

**Atomic Approach (problematic)**:

```json
{
  "legos": [
    {"known": "I", "target": "Dw i"},
    {"known": "want", "target": "eisiau"},
    {"known": "to speak", "target": "siarad"}  // But mutation changes this!
  ]
}
```

**Problem**: "I want to speak" = "Dw i eisiau siarad", but in some contexts it's "Dw i eisiau **f**iarad" (soft mutation: s → f... wait, actually "siarad" doesn't mutate here, but the OBJECT of "want" does in other cases)

**Better Example**: "I want the book"
- "the book" = "y llyfr"
- "I want the book" = "Dw i eisiau'r llyfr" (no mutation after eisiau)

Actually, let's use a clearer mutation example:

**Seed 45**: "my head"

**Chunk-First with Mutation**:

```json
{
  "seed_number": 45,
  "known_text": "my head",
  "target_text": "fy mhen",
  "legos": [
    {
      "type": "M",
      "known": "my [noun]",
      "target": "fy [nasal mutation]",
      "components": [
        {"known": "my", "target": "fy"},
        {"known": "[noun - nasal mutation]", "target": ""}
      ],
      "phrases": [
        {"known": "my head", "target": "fy mhen"},  // pen → mhen
        {"known": "my brother", "target": "fy mrawd"},  // brawd → mrawd
        {"known": "my bag", "target": "fy mag"}  // bag → mag
      ],
      "grammar_note": "fy (my) triggers nasal mutation: p→mh, b→m, c→ngh, etc."
    }
  ]
}
```

**Why Chunk Approach Helps**:
- Mutation is a property of the CONSTRUCTION, not individual words
- "my" + noun is a chunk that triggers predictable mutation
- Learners learn the pattern as a unit, not separate mutation rules

---

## API Integration Examples

### POST /api/seed/complete - Chunk-First Submission

```json
POST /api/seed/complete
{
  "course_code": "zho_for_eng",
  "seed_number": 42,
  "known_text": "I want to learn Chinese",
  "target_text": "我想学中文",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "I",
      "target": "我",
      "phrases": [
        {"known": "I am here", "target": "我在这里"},
        {"known": "I like it", "target": "我喜欢"}
      ]
    },
    {
      "idx": 2,
      "type": "M",
      "known": "want to",
      "target": "想",
      "components": [
        {"known": "want", "target": "想"},
        {"known": "to", "target": ""}
      ],
      "phrases": [
        {"known": "want to speak", "target": "想说"},
        {"known": "want to help", "target": "想帮忙"},
        {"known": "want to learn", "target": "想学"}
      ]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "learn",
      "target": "学",
      "phrases": [
        {"known": "learn quickly", "target": "学得快"},
        {"known": "I learn", "target": "我学"}
      ]
    },
    {
      "idx": 4,
      "type": "A",
      "known": "Chinese",
      "target": "中文",
      "phrases": [
        {"known": "in Chinese", "target": "用中文"},
        {"known": "speak Chinese", "target": "说中文"}
      ]
    }
  ]
}
```

### API Response - Validation Success

```json
{
  "success": true,
  "seed_number": 42,
  "validation": {
    "tiling": "PASS - Seed tiles correctly using M-LEGO 'want to'",
    "zut": "PASS - No ZUT conflicts",
    "vocabulary": "PASS - All phrases use introduced vocabulary",
    "phrase_count": "PASS - Sufficient phrases per LEGO"
  },
  "legos_created": 4,
  "phrases_created": 12,
  "build_up_generated": true,
  "message": "Seed 42 processed successfully with chunk-first M-LEGOs"
}
```

### Automatic Build-Up Generation

For M-LEGO "want to", the API automatically generates:

```json
{
  "basket_cycle": [
    {
      "order": 1,
      "is_component": true,
      "is_debut": false,
      "lego_known": "want",
      "lego_target": "想",
      "phrases": [
        {"known": "I want this", "target": "我想要这个"}
      ]
    },
    {
      "order": 2,
      "is_component": false,
      "is_debut": true,
      "lego_known": "want to",
      "lego_target": "想",
      "phrases": [
        {"known": "want to speak", "target": "想说"},
        {"known": "want to help", "target": "想帮忙"},
        {"known": "want to learn", "target": "想学"}
      ]
    }
  ]
}
```

**Note**: "to" component skipped because it maps to null in Chinese (function word absorbed into "想")

---

## Comparison Table: Atomic vs. Chunk-First

| Aspect | Atomic-First | Chunk-First |
|--------|--------------|-------------|
| **Assembly Steps** | More (5 for "I want to learn Chinese") | Fewer (4 with chunk) |
| **Natural Fluency** | May feel unnatural (word-by-word) | Natural collocations |
| **Cognitive Load** | Higher (more pieces to assemble) | Lower (pre-assembled chunks) |
| **Grammar Alignment** | Sometimes misaligned (Chinese complements) | Better alignment with grammar |
| **Flexibility** | Maximum recombination potential | Slightly less recombination, but more natural |
| **Learning Curve** | Steeper (assemble from scratch) | Gentler (meaningful chunks) |
| **Retention** | Good for atomic words | Better for chunks (meaningful units) |

---

## Recommendations for Course Builder

### 1. Support Both Approaches

Allow course designers to choose:
- **Atomic-first** for maximally compositional languages (maybe agglutinative languages?)
- **Chunk-first** for languages with strong collocations (Chinese, Spanish, etc.)
- **Hybrid** (best of both): Start with atoms, introduce chunks at intermediate level

### 2. Automatic Chunk Suggestions

When processing a seed, API could suggest potential chunks:

```json
{
  "seed_number": 42,
  "known_text": "I want to learn Chinese",
  "suggestions": [
    {
      "chunk": "want to",
      "frequency_across_course": 690,
      "recommendation": "STRONG - appears 690 times, consider M-LEGO"
    },
    {
      "chunk": "I want to",
      "frequency_across_course": 231,
      "recommendation": "MEDIUM - overlapping variant, consider if 'want to' already exists"
    }
  ]
}
```

### 3. Tiling Algorithm Updates

Ensure tiling recognizes M-LEGOs as single units:

**Current**: "I want to learn" = [I] + [want] + [to] + [learn]
**Updated**: "I want to learn" = [I] + [want to] + [learn] (if "want to" is M-LEGO)

---

## Conclusion

Chunk-first M-LEGOs offer:
1. **Pedagogical benefits**: Natural fluency, reduced cognitive load
2. **Grammar alignment**: Respect language-specific patterns (Chinese complements, Welsh mutations)
3. **Efficiency**: Fewer assembly steps for common patterns
4. **Flexibility**: Can coexist with atomic LEGOs (hybrid approach)

The Course Builder API already supports M-LEGOs - the opportunity is to systematically identify and create high-value chunks based on frequency data.

**Next Step**: Pilot implementation with top 10 universal chunks in one course, measure impact on learner outcomes.
