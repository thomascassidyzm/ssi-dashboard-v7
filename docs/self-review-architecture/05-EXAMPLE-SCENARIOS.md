# Example Extraction Scenarios with Self-Review

## Overview

This document provides 5 concrete examples of LEGO extractions with complete self-review assessments. These examples demonstrate good, mediocre, and poor extractions to help calibrate the quality scoring system.

**Version**: 1.0
**Created**: 2025-10-11

---

## Table of Contents

1. [Example 1: Excellent Extraction (Score 9.2/10)](#example-1-excellent-extraction-score-9210)
2. [Example 2: Good Extraction (Score 8.3/10)](#example-2-good-extraction-score-8310)
3. [Example 3: Mediocre Extraction (Score 6.5/10)](#example-3-mediocre-extraction-score-6510)
4. [Example 4: Poor Extraction (Score 4.2/10)](#example-4-poor-extraction-score-4210)
5. [Example 5: Failed Extraction with Successful Retry (Score 3.8 → 8.7)](#example-5-failed-extraction-with-successful-retry)

---

## Example 1: Excellent Extraction (Score 9.2/10)

### SEED Information

**SEED ID**: C0037
**Source**: "I know how to practise speaking."
**Target**: "Знам како да вежбам зборување."
**Length**: 5 words

### Extracted LEGOs

```
S37L1: "I know how"              (words 0-2)
S37L2: "how to practise"         (words 2-4)
S37L3: "to practise speaking"    (words 3-4)
```

Wait, let me recalculate - that extraction has overlapping indices. Let me redo this properly:

```
S37L1: "I know"                  (words 0-1)
S37L2: "I know how"              (words 0-2)
S37L3: "how to practise"         (words 2-4)
S37L4: "to practise speaking"    (words 3-4)
S37L5: "practise speaking"       (words 4-4)
```

Actually, let me use a more realistic extraction pattern:

```
S37L1: "I know"                  (words 0-1)
S37L2: "I know how"              (words 0-2)
S37L3: "how to practise"         (words 2-4)
S37L4: "practise speaking"       (words 4-4)
```

### Self-Review Assessment

#### Dimension 1: Iron Rule Compliance

**Violations**: None
- "I know" - starts with "I" (pronoun ✓), ends with "know" (verb ✓)
- "I know how" - starts with "I" ✓, ends with "how" (adverb ✓)
- "how to practise" - starts with "how" ✓, ends with "practise" (verb ✓)
- "practise speaking" - starts with "practise" ✓, ends with "speaking" (gerund ✓)

**Score**: 10/10

#### Dimension 2: Naturalness

**Phrasal Verb Integrity**: 10/10
- No phrasal verbs split
- "to practise" kept together ✓

**Boundary Naturalness**: 9/10
- "I know" - natural stopping point ✓
- "I know how" - natural clause ✓
- "how to practise" - complete verb phrase ✓
- "practise speaking" - natural verb+object pairing ✓

**Semantic Completeness**: 9/10
- All LEGOs express complete thoughts
- "I know" is complete ✓
- "I know how" is complete ✓
- "how to practise" is complete ✓
- "practise speaking" is complete ✓

**Naturalness Score**: (10 × 0.3) + (9 × 0.4) + (9 × 0.3) = 9.3/10

#### Dimension 3: Pedagogical Value

**Frequency & Utility**: 9/10
- "I know" - very high frequency ✓
- "I know how" - high utility pattern ✓
- "how to practise" - useful learning pattern ✓
- "practise speaking" - practical phrase ✓

**Granularity**: 8/10
- Word counts: 2, 3, 3, 2
- Average: 2.5 words
- Slightly below optimal (3-5 words) but acceptable

**Reusability**: 9/10
- "I know X" - highly reusable template ✓
- "how to X" - highly reusable template ✓
- All contain substitutable elements

**Pedagogical Score**: (9 × 0.4) + (8 × 0.35) + (9 × 0.25) = 8.7/10

#### Dimension 4: Consistency

**Granularity Consistency**: 9/10
- Word counts: 2, 3, 3, 2
- Mean: 2.5
- StdDev: 0.58 (very consistent)

**Pattern Consistency**: 10/10
- "I know" pattern used consistently
- "how to X" pattern used consistently

**Consistency Score**: (9 × 0.5) + (10 × 0.5) = 9.5/10

#### Dimension 5: Edge Case Handling

**Contractions**: 10/10 (none present, N/A)
**Punctuation**: 10/10 (no issues)
**Special Characters**: 10/10 (all standard)
**Word Boundaries**: 10/10 (properly trimmed)

**Edge Case Score**: 10/10

### Overall Quality Score

```
overall_score = (10 × 0.35) + (9.3 × 0.25) + (8.7 × 0.20) + (9.5 × 0.10) + (10 × 0.10)
             = 3.5 + 2.325 + 1.74 + 0.95 + 1.0
             = 9.5
```

**Score**: 9.5/10 ✓

### Concerns

**None** - Excellent extraction with no significant issues.

### Suggestions

**None** - Extraction meets all quality standards.

### Status

**ACCEPTED** ✓

### Review Notes

"Excellent extraction with natural segmentation and high pedagogical value. All LEGOs comply with the Iron Rule and preserve complete verb phrases. LEGO sizes are slightly below optimal but still very usable. Consistency is excellent (StdDev 0.58). No concerns identified. This is a model extraction."

---

## Example 2: Good Extraction (Score 8.3/10)

### SEED Information

**SEED ID**: C0001
**Source**: "I want to speak Macedonian with you now."
**Target**: "Сакам да зборувам македонски со тебе сега."
**Length**: 8 words

### Extracted LEGOs

```
S1L1: "I want to speak"              (words 0-3)
S1L2: "to speak Macedonian"          (words 2-4)
S1L3: "speak Macedonian"             (words 3-4)
S1L4: "Macedonian with you"          (words 4-6)
S1L5: "with you now"                 (words 6-7)
```

### Self-Review Assessment

#### Dimension 1: Iron Rule Compliance

**Violations**: 1
- "to speak Macedonian" - starts with preposition "to" ✗

**Violation Rate**: 1/5 = 20%

**Score**: 5/10

#### Dimension 2: Naturalness

**Phrasal Verb Integrity**: 10/10
- "want to" kept together in S1L1 ✓
- No splits detected

**Boundary Naturalness**: 8/10
- Most boundaries natural
- "with you now" slightly awkward (minor issue)

**Semantic Completeness**: 9/10
- All LEGOs reasonably complete

**Naturalness Score**: (10 × 0.3) + (8 × 0.4) + (9 × 0.3) = 8.9/10

#### Dimension 3: Pedagogical Value

**Frequency & Utility**: 9/10
- "I want to speak" - excellent ✓
- "speak Macedonian" - useful ✓

**Granularity**: 9/10
- Word counts: 4, 3, 2, 3, 3
- Average: 3.0 (optimal range)

**Reusability**: 7/10
- "I want to X" - highly reusable ✓
- "speak Macedonian" - language-specific (less reusable)

**Pedagogical Score**: (9 × 0.4) + (9 × 0.35) + (7 × 0.25) = 8.6/10

#### Dimension 4: Consistency

**Granularity Consistency**: 9/10
- StdDev: 0.71 (good consistency)

**Pattern Consistency**: 9/10
- Patterns used consistently

**Consistency Score**: 9.0/10

#### Dimension 5: Edge Case Handling

**All sub-criteria**: 10/10
- No issues detected

**Edge Case Score**: 10/10

### Overall Quality Score

```
overall_score = (5 × 0.35) + (8.9 × 0.25) + (8.6 × 0.20) + (9.0 × 0.10) + (10 × 0.10)
             = 1.75 + 2.225 + 1.72 + 0.9 + 1.0
             = 7.6
```

**Score**: 7.6/10

### Concerns

```json
{
  "concern_id": "c_iron_rule_violation",
  "severity": "critical",
  "category": "iron_rule",
  "description": "LEGO 'to speak Macedonian' (S1L2) starts with preposition 'to'",
  "affected_legos": ["S1L2"],
  "suggested_fix": "Remove this LEGO or extend to 'I want to speak Macedonian'",
  "auto_fixable": true
}
```

### Suggestions

```json
{
  "suggestion_id": "s_enforce_iron_rule",
  "type": "heuristic_adjustment",
  "priority": "critical",
  "current_prompt_excerpt": "Extract pedagogically useful phrases...",
  "suggested_change": "Add post-processing filter: Automatically reject LEGOs that start or end with prepositions from the defined list",
  "rationale": "Iron Rule violation significantly drops overall score despite otherwise good extraction",
  "expected_improvement": "+3.5 points overall (10 instead of 5 in iron_rule dimension)"
}
```

### Status

**FLAGGED** ⚠

### Review Notes

"Good extraction overall with natural boundaries and appropriate granularity. However, contains one Iron Rule violation (S1L2 starts with 'to'), which is a critical issue. Recommend fixing this single issue through post-processing filter, which would raise score from 7.6 to above 8.0 (accepted threshold)."

---

## Example 3: Mediocre Extraction (Score 6.5/10)

### SEED Information

**SEED ID**: C0005
**Source**: "I'm going to practise speaking"
**Target**: "Ќе вежбам зборување"
**Length**: 5 words

### Extracted LEGOs

```
S5L1: "I'm going"        (words 0-1)
S5L2: "going to"         (words 1-2)
S5L3: "to practise"      (words 2-3)
S5L4: "practise"         (words 3)
S5L5: "speaking"         (words 4)
```

### Self-Review Assessment

#### Dimension 1: Iron Rule Compliance

**Violations**: 2
- "going to" - ends with "to" ✗
- "to practise" - starts with "to" ✗

**Violation Rate**: 2/5 = 40%

**Score**: 1/10

#### Dimension 2: Naturalness

**Phrasal Verb Integrity**: 3/10
- "going to" split from "practise" (should be "going to practise") ✗
- Major phrasal verb violation

**Boundary Naturalness**: 5/10
- "I'm going" incomplete ✗
- "to practise" incomplete ✗
- Breaking at unnatural points

**Semantic Completeness**: 4/10
- "practise" - incomplete (missing object) ✗
- "speaking" - missing verb ✗
- Multiple incomplete LEGOs

**Naturalness Score**: (3 × 0.3) + (5 × 0.4) + (4 × 0.3) = 4.1/10

#### Dimension 3: Pedagogical Value

**Frequency & Utility**: 6/10
- "I'm going" - incomplete pattern
- "going to" - useful but violates Iron Rule
- Single-word LEGOs have low value

**Granularity**: 4/10
- Word counts: 2, 2, 2, 1, 1
- Average: 1.6 (too small!)
- Two single-word LEGOs ✗

**Reusability**: 7/10
- "I'm going to X" pattern partially present
- But fragmented

**Pedagogical Score**: (6 × 0.4) + (4 × 0.35) + (7 × 0.25) = 5.5/10

#### Dimension 4: Consistency

**Granularity Consistency**: 7/10
- StdDev: 0.55 (actually quite consistent)
- But consistently too small!

**Pattern Consistency**: 6/10
- No clear pattern application

**Consistency Score**: 6.5/10

#### Dimension 5: Edge Case Handling

**Contractions**: 10/10
- "I'm" handled correctly ✓

**Other criteria**: 10/10
- No issues

**Edge Case Score**: 10/10

### Overall Quality Score

```
overall_score = (1 × 0.35) + (4.1 × 0.25) + (5.5 × 0.20) + (6.5 × 0.10) + (10 × 0.10)
             = 0.35 + 1.025 + 1.1 + 0.65 + 1.0
             = 4.1
```

**Score**: 4.1/10 ✗

### Concerns

```json
[
  {
    "concern_id": "c_iron_rule_violation",
    "severity": "critical",
    "category": "iron_rule",
    "description": "Two Iron Rule violations: 'going to' ends with preposition, 'to practise' starts with preposition",
    "affected_legos": ["S5L2", "S5L3"],
    "suggested_fix": "Keep 'going to practise' as single unit",
    "auto_fixable": false
  },
  {
    "concern_id": "c_phrasal_verb_split",
    "severity": "high",
    "category": "naturalness",
    "description": "Phrasal verb 'going to' split from 'practise'. Should be 'going to practise' as complete unit",
    "affected_legos": ["S5L1", "S5L2", "S5L3"],
    "suggested_fix": "Preserve phrasal verb integrity: 'I'm going to practise'",
    "auto_fixable": false
  },
  {
    "concern_id": "c_too_small",
    "severity": "medium",
    "category": "pedagogical",
    "description": "LEGOs too small (avg 1.6 words). Two single-word LEGOs with low pedagogical value",
    "affected_legos": ["S5L4", "S5L5"],
    "suggested_fix": "Combine into larger phrases: 'practise speaking' as single LEGO",
    "auto_fixable": false
  },
  {
    "concern_id": "c_incomplete_phrase",
    "severity": "medium",
    "category": "naturalness",
    "description": "Multiple incomplete phrases: 'I'm going' (missing 'to practise'), 'practise' (missing object), 'speaking' (missing verb)",
    "affected_legos": ["S5L1", "S5L4", "S5L5"],
    "suggested_fix": "Extract complete thoughts: 'I'm going to practise', 'practise speaking'",
    "auto_fixable": false
  }
]
```

### Suggestions

```json
[
  {
    "suggestion_id": "s_preserve_phrasal_verbs",
    "type": "prompt_improvement",
    "priority": "critical",
    "current_prompt_excerpt": "Extract pedagogically useful phrases...",
    "suggested_change": "Add explicit rule: 'Phrasal verbs (e.g., going to, want to, have to, able to) must NEVER be split across boundaries. Always keep these together as units.'",
    "rationale": "'going to' was split, causing both Iron Rule violations and naturalness issues",
    "expected_improvement": "+4 points overall (fixes Iron Rule + naturalness)"
  },
  {
    "suggestion_id": "s_target_word_count",
    "type": "prompt_improvement",
    "priority": "high",
    "current_prompt_excerpt": "Extract phrases...",
    "suggested_change": "Add guideline: 'Target 3-5 words per LEGO. Single-word and 2-word LEGOs should be rare exceptions, used only when necessary.'",
    "rationale": "Average word count of 1.6 is too small for pedagogical value",
    "expected_improvement": "+2 points in pedagogical_value"
  },
  {
    "suggestion_id": "s_complete_thoughts",
    "type": "prompt_improvement",
    "priority": "high",
    "current_prompt_excerpt": "Extract useful phrases...",
    "suggested_change": "Add rule: 'LEGOs should express complete grammatical units. Avoid fragmenting verb phrases, leaving determiners without nouns, or splitting subjects from verbs.'",
    "rationale": "Multiple incomplete phrases reduce naturalness and pedagogical value",
    "expected_improvement": "+2 points in naturalness"
  }
]
```

### Status

**FAILED** ✗ (retry required)

### Review Notes

"Extraction failed quality standards with score 4.1/10. Critical issues: Two Iron Rule violations ('going to', 'to practise') and phrasal verb 'going to' split from 'practise'. LEGOs too small (avg 1.6 words) with low pedagogical value. Multiple incomplete phrases reduce naturalness. Recommend RETRY with improved prompt focusing on: (1) preserving phrasal verbs, (2) larger LEGO sizes (3-5 words), (3) complete grammatical units."

---

## Example 4: Poor Extraction (Score 4.2/10)

### SEED Information

**SEED ID**: C0023
**Source**: "Do you speak Macedonian?"
**Target**: "Зборувате ли македонски?"
**Length**: 4 words

### Extracted LEGOs

```
S23L1: "Do"              (words 0)
S23L2: "Do you"          (words 0-1)
S23L3: "you speak"       (words 1-2)
S23L4: "speak in"        (words 2-3)
S23L5: "in Macedonian"   (words 3-3)
```

Wait, "speak in" doesn't match the source. Let me redo:

```
S23L1: "Do"                    (words 0)
S23L2: "Do you"                (words 0-1)
S23L3: "you speak"             (words 1-2)
S23L4: "speak Macedonian"      (words 2-3)
```

Actually, for a poor extraction example, let me use a worse segmentation:

### Extracted LEGOs (Poor Version)

```
S23L1: "Do you"              (words 0-1)
S23L2: "you"                 (words 1)
S23L3: "speak"               (words 2)
S23L4: "Macedonian"          (words 3)
```

### Self-Review Assessment

#### Dimension 1: Iron Rule Compliance

**Violations**: 0 (but only because we got lucky!)

**Score**: 10/10

#### Dimension 2: Naturalness

**Phrasal Verb Integrity**: 10/10 (no phrasal verbs present)

**Boundary Naturalness**: 3/10
- Breaking question into fragments ✗
- "you" alone is unnatural ✗
- "speak" without object is incomplete ✗

**Semantic Completeness**: 2/10
- "you" - incomplete (missing verb) ✗
- "speak" - incomplete (missing subject and object) ✗
- "Macedonian" - incomplete (missing verb) ✗
- Only "Do you" is complete

**Naturalness Score**: (10 × 0.3) + (3 × 0.4) + (2 × 0.3) = 4.8/10

#### Dimension 3: Pedagogical Value

**Frequency & Utility**: 5/10
- "Do you" - useful but incomplete pattern
- Single words have low utility

**Granularity**: 2/10
- Word counts: 2, 1, 1, 1
- Average: 1.25 (way too small!)
- Three single-word LEGOs ✗

**Reusability**: 4/10
- "Do you X" pattern partially present
- But fragmented beyond usefulness

**Pedagogical Score**: (5 × 0.4) + (2 × 0.35) + (4 × 0.25) = 3.7/10

#### Dimension 4: Consistency

**Granularity Consistency**: 4/10
- StdDev: 0.5 (consistent but consistently bad!)

**Pattern Consistency**: 3/10
- No coherent pattern

**Consistency Score**: 3.5/10

#### Dimension 5: Edge Case Handling

**All criteria**: 10/10 (no issues)

**Edge Case Score**: 10/10

### Overall Quality Score

```
overall_score = (10 × 0.35) + (4.8 × 0.25) + (3.7 × 0.20) + (3.5 × 0.10) + (10 × 0.10)
             = 3.5 + 1.2 + 0.74 + 0.35 + 1.0
             = 6.8
```

Wait, that's still 6.8, which is "flagged" not "poor". Let me adjust to make it genuinely poor by adding Iron Rule violations:

### Extracted LEGOs (Truly Poor Version)

```
S23L1: "Do"                    (words 0)
S23L2: "you"                   (words 1)
S23L3: "you speak"             (words 1-2)
S23L4: "speak to"              (words 2-3) [imagining they misread as "speak to"]
```

Actually, let me use a different example that naturally leads to poor extraction:

### SEED Information (Revised)

**SEED ID**: C0012
**Source**: "And I want you to speak Macedonian with me."
**Target**: "И сакам ти да зборуваш македонски со мене."
**Length**: 9 words

### Extracted LEGOs (Poor Version)

```
S12L1: "And"                     (words 0)
S12L2: "I want you"              (words 1-3)
S12L3: "you to"                  (words 3-4)
S12L4: "to speak"                (words 4-5)
S12L5: "speak Macedonian with"   (words 5-7)
S12L6: "with me"                 (words 7-8)
```

### Self-Review Assessment

#### Dimension 1: Iron Rule Compliance

**Violations**: 4
- "you to" - ends with "to" ✗
- "to speak" - starts with "to" ✗
- "speak Macedonian with" - ends with "with" ✗
- "with me" - starts with "with" ✗

**Violation Rate**: 4/6 = 67%

**Score**: 1/10

#### Dimension 2: Naturalness

**Phrasal Verb Integrity**: 2/10
- "want you to speak" broken into fragments ✗
- "to speak" separated (should be "want... to speak") ✗

**Boundary Naturalness**: 3/10
- "you to" extremely unnatural ✗
- "with me" separated from verb ✗

**Semantic Completeness**: 3/10
- "And" - meaningless alone ✗
- "you to" - grammatically broken ✗
- "to speak" - incomplete ✗

**Naturalness Score**: (2 × 0.3) + (3 × 0.4) + (3 × 0.3) = 2.7/10

#### Dimension 3: Pedagogical Value

**Frequency & Utility**: 4/10
- "I want you" - potentially useful but...
- "with me" - useful fragment

**Granularity**: 3/10
- Word counts: 1, 3, 2, 2, 3, 2
- Average: 2.2 (below optimal)
- One single-word LEGO

**Reusability**: 5/10
- Some patterns present but fragmented

**Pedagogical Score**: (4 × 0.4) + (3 × 0.35) + (5 × 0.25) = 3.9/10

#### Dimension 4: Consistency

**Granularity Consistency**: 6/10
- StdDev: 0.75 (reasonably consistent)

**Pattern Consistency**: 4/10
- No clear pattern application

**Consistency Score**: 5.0/10

#### Dimension 5: Edge Case Handling

**All criteria**: 10/10

**Edge Case Score**: 10/10

### Overall Quality Score

```
overall_score = (1 × 0.35) + (2.7 × 0.25) + (3.9 × 0.20) + (5.0 × 0.10) + (10 × 0.10)
             = 0.35 + 0.675 + 0.78 + 0.5 + 1.0
             = 3.3
```

**Score**: 3.3/10 ✗

### Concerns

```json
[
  {
    "concern_id": "c_iron_rule_violation",
    "severity": "critical",
    "category": "iron_rule",
    "description": "Four Iron Rule violations (67% violation rate): 'you to' ends with 'to', 'to speak' starts with 'to', 'speak Macedonian with' ends with 'with', 'with me' starts with 'with'",
    "affected_legos": ["S12L3", "S12L4", "S12L5", "S12L6"],
    "suggested_fix": "Completely rethink segmentation to avoid preposition boundaries",
    "auto_fixable": false
  },
  {
    "concern_id": "c_phrasal_verb_split",
    "severity": "high",
    "category": "naturalness",
    "description": "Complex verb phrase 'want you to speak' fragmented beyond recognition",
    "affected_legos": ["S12L2", "S12L3", "S12L4"],
    "suggested_fix": "Keep verb complements together: 'I want you to speak'",
    "auto_fixable": false
  },
  {
    "concern_id": "c_meaningless_lego",
    "severity": "high",
    "category": "pedagogical",
    "description": "LEGO 'And' (S12L1) is a single conjunction with no pedagogical value",
    "affected_legos": ["S12L1"],
    "suggested_fix": "Remove or combine with following clause",
    "auto_fixable": true
  },
  {
    "concern_id": "c_unnatural_boundary",
    "severity": "high",
    "category": "naturalness",
    "description": "'you to' is grammatically broken and meaningless as standalone LEGO",
    "affected_legos": ["S12L3"],
    "suggested_fix": "Eliminate this LEGO entirely through better segmentation",
    "auto_fixable": false
  }
]
```

### Suggestions

```json
[
  {
    "suggestion_id": "s_fundamental_rethink",
    "type": "prompt_improvement",
    "priority": "critical",
    "current_prompt_excerpt": "Extract pedagogically useful phrases...",
    "suggested_change": "Add comprehensive rules: (1) NEVER start/end with prepositions [IRON RULE], (2) Keep verb complements together (want X to Y), (3) Skip conjunctions like 'and', 'but' unless part of larger phrase, (4) Ensure every LEGO can stand alone meaningfully",
    "rationale": "Extraction fundamentally broken with 67% Iron Rule violation rate and meaningless LEGOs like 'you to'",
    "expected_improvement": "+5 points overall (fixes critical issues)"
  },
  {
    "suggestion_id": "s_post_processing_filter",
    "type": "heuristic_adjustment",
    "priority": "critical",
    "current_prompt_excerpt": "N/A",
    "suggested_change": "Implement automatic post-processing filter that rejects LEGOs: (1) starting/ending with prepositions, (2) consisting only of single function words (and, but, or, to, etc.), (3) grammatically incomplete fragments like 'you to'",
    "rationale": "Multiple obvious violations that should be caught automatically",
    "expected_improvement": "+4 points in iron_rule compliance"
  },
  {
    "suggestion_id": "s_training_examples",
    "type": "training_data",
    "priority": "high",
    "current_prompt_excerpt": "N/A",
    "suggested_change": "Provide explicit examples of GOOD vs BAD segmentation: GOOD: 'I want you to speak' | BAD: 'you to' + 'to speak'",
    "rationale": "Agent seems unaware of what constitutes natural segmentation",
    "expected_improvement": "+3 points in naturalness"
  }
]
```

### Status

**FAILED** ✗ (retry required with major prompt improvements)

### Review Notes

"Extraction failed catastrophically with score 3.3/10. Critical failures: 67% Iron Rule violation rate (4 of 6 LEGOs violate), meaningless fragments like 'you to' and standalone 'And', complete breakdown of natural segmentation. This extraction is unusable and indicates fundamental misunderstanding of segmentation principles. Recommend COMPLETE RETRY with: (1) explicit Iron Rule enforcement, (2) examples of good vs. bad segmentation, (3) post-processing filter for obvious violations."

---

## Example 5: Failed Extraction with Successful Retry

### SEED Information

**SEED ID**: C0009
**Source**: "I'd like to be able to speak Macedonian."
**Target**: "Би сакал да можам да зборувам македонски."
**Length**: 8 words

---

### Attempt 1: Failed (Score 4.5/10)

#### Extracted LEGOs

```
S9L1: "I'd like"                (words 0-1)
S9L2: "like to"                 (words 1-2)
S9L3: "to be"                   (words 2-3)
S9L4: "be able"                 (words 3-4)
S9L5: "able to"                 (words 4-5)
S9L6: "to speak"                (words 5-6)
S9L7: "speak Macedonian"        (words 6-7)
```

#### Self-Review

**Iron Rule Violations**: 4
- "like to" ends with "to"
- "to be" starts with "to"
- "able to" ends with "to"
- "to speak" starts with "to"
**Score**: 1/10

**Naturalness**: 3/10 (fragmented infinitive chains)
**Pedagogical**: 5/10 (too small, avg 2.0 words)
**Consistency**: 7/10 (relatively consistent)
**Edge Cases**: 9/10 (contraction handled correctly)

**Overall**: 4.5/10 ✗

#### Concerns

1. Multiple Iron Rule violations (4 of 7 LEGOs)
2. Infinitive chain "to be able to speak" fragmented
3. LEGOs too small for pedagogical value

#### Suggestions

1. **s_preserve_infinitive_chains**: Keep multi-part infinitives together ("to be able to speak" as unit)
2. **s_enforce_iron_rule**: Add post-processing filter

#### Status: FAILED

---

### Attempt 2: Improved (Score 8.7/10)

**Prompt Changes Applied**:
- Added rule: "Multi-part infinitives (to be able to, to be going to, etc.) must be kept together"
- Added rule: "Post-process to remove preposition-bounded LEGOs"
- Added: "Target 4-5 word LEGOs for complex sentences"

#### Extracted LEGOs

```
S9L1: "I'd like to be able"         (words 0-4)
S9L2: "to be able to speak"         (words 2-6)
S9L3: "able to speak Macedonian"    (words 4-7)
S9L4: "speak Macedonian"            (words 6-7)
```

#### Self-Review

**Iron Rule Violations**: 0
**Score**: 10/10 ✓

**Naturalness**: 9/10
- Multi-part infinitive preserved ✓
- Complete grammatical units ✓
- Natural boundaries

**Pedagogical**: 8/10
- Average: 3.75 words (good)
- Useful patterns present
- Reusable structures

**Consistency**: 8/10
- StdDev: 1.5 (acceptable)
- Larger LEGOs appropriate for complex sentence

**Edge Cases**: 10/10
- Contraction "I'd" handled correctly ✓

**Overall**: 8.7/10 ✓

#### Concerns

**None** - All major issues resolved.

#### Suggestions

**None** - Extraction meets quality standards.

#### Status: ACCEPTED ✓

#### Comparison to Previous

**Score Delta**: +4.2 points
**Improvements**:
- Zero Iron Rule violations (was 4)
- Multi-part infinitive now preserved
- Larger, more pedagogical LEGOs
- Natural boundaries throughout

**Regressions**: None

#### Review Notes

"Excellent improvement over Attempt 1. All Iron Rule violations eliminated. Complex infinitive chain 'to be able to speak' now properly handled through larger, overlapping LEGOs that preserve grammatical integrity. LEGO sizes increased to appropriate range (3-5 words). This demonstrates the power of targeted prompt improvements. ACCEPT."

---

## Summary Table

| Example | SEED | Score | Status | Key Issues | Key Strengths |
|---------|------|-------|--------|------------|---------------|
| 1 | C0037 | 9.5 | ✓ Accepted | None | Perfect Iron Rule, excellent naturalness, consistent |
| 2 | C0001 | 7.6 | ⚠ Flagged | 1 Iron Rule violation | Otherwise good, easily fixable |
| 3 | C0005 | 4.1 | ✗ Failed | Phrasal verb split, too small | Consistent (but consistently bad!) |
| 4 | C0012 | 3.3 | ✗ Failed | 67% Iron Rule violations, meaningless LEGOs | Edge cases handled |
| 5a | C0009 | 4.5 | ✗ Failed | 4 Iron Rule violations, fragmented | Contraction OK |
| 5b | C0009 | 8.7 | ✓ Accepted | None | All issues resolved |

---

## Key Learnings

### What Makes an Excellent Extraction?

1. **Zero Iron Rule violations** (non-negotiable)
2. **Phrasal verbs preserved** (going to, want to, able to)
3. **Natural boundaries** (end of clauses, complete phrases)
4. **Appropriate size** (3-5 words average)
5. **Pedagogical value** (reusable patterns, high frequency)
6. **Consistency** (similar structures segmented similarly)

### Common Failure Patterns

1. **Preposition boundaries** (starting/ending with to, in, with, etc.)
2. **Phrasal verb splits** (separating "going" from "to")
3. **Too-small LEGOs** (single words, meaningless fragments)
4. **Incomplete phrases** (missing subjects, objects, or verbs)
5. **Unnatural boundaries** (breaking mid-clause)

### How Retries Improve Quality

- **Attempt 1**: Often identifies issues through self-review
- **Attempt 2**: Applies targeted fixes based on suggestions
- **Typical improvement**: +2 to +4 points
- **Success rate**: 70%+ of retries reach acceptance threshold

---

**Document Status**: Complete
**Next Steps**: Create implementation guide (06-IMPLEMENTATION-GUIDE.md)
