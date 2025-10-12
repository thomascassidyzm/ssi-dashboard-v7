# Self-Review Prompt Template for LEGO Extraction Agents

## Overview

This document provides the complete prompt template that AI agents should use to perform self-review after LEGO extraction. This prompt is designed to be appended to or integrated with the existing Phase 3 extraction prompt.

**Version**: 1.0
**Created**: 2025-10-11
**Usage**: Add this section after LEGO extraction is complete

---

## Complete Self-Review Prompt

```markdown
# SELF-REVIEW: Quality Assessment

You have just extracted LEGOs from the following SEED:

**SEED ID**: {seed_id}
**Source Text**: "{source_text}"
**Target Text**: "{target_text}"
**LEGOs Extracted**: {lego_count}

Your task now is to perform a comprehensive self-review of your extraction to assess quality, identify concerns, and suggest improvements.

---

## STEP 1: Calculate Dimension Scores

Evaluate your extraction on each of the following dimensions using a 0-10 scale.

### Dimension 1: Iron Rule Compliance (Weight: 35%)

**Rule**: No LEGO may begin or end with a preposition.

**Prepositions**: to, in, on, at, by, for, with, from, of, about, as, into, like, through, after, over, between, out, against, during, without, before, under, around, among, above, below, behind, beside, beneath, beyond, near, off, onto, toward, towards, upon, within, across

**Instructions**:
1. For each LEGO, check if the first word is a preposition
2. For each LEGO, check if the last word is a preposition
3. Count total violations
4. Calculate violation rate: violations / total_legos

**Scoring**:
- 0 violations = 10 points
- ≤2% violations = 9 points
- ≤5% violations = 8 points
- ≤10% violations = 7 points
- ≤20% violations = 5 points
- ≤30% violations = 3 points
- >30% violations = 1 point

**Your LEGOs**:
{for each LEGO, display: provenance, text}

**Assessment**:
- Violations found: [list each violation]
- Violation rate: X%
- Score: X/10
- Notes: [explain]

---

### Dimension 2: Naturalness (Weight: 25%)

**Rule**: LEGOs should segment at natural linguistic boundaries, preserve phrasal verbs, and express complete thoughts.

**Sub-criteria**:
1. **Phrasal Verb Integrity (30%)**: Never split phrasal verbs (going to, want to, need to, have to, able to, trying to, used to, look up, find out, etc.)
2. **Grammatical Boundaries (40%)**: End at clause/phrase boundaries, not mid-phrase
3. **Semantic Completeness (30%)**: Express complete thoughts when possible

**Common Issues**:
- Splitting "I'm going" and "to practise" (should be "I'm going to practise")
- Ending with "I want" without "to speak" (incomplete verb phrase)
- Breaking before final noun: "I'm trying to remember" + "a word" (should keep together)
- Splitting prepositional phrases: "in" + "Macedonian" (should keep together)

**Instructions**:
1. Check each LEGO for phrasal verb splits
2. Examine boundary locations - are they natural?
3. Assess semantic completeness of each LEGO
4. Score each sub-criterion 0-10
5. Calculate weighted average: (phrasal_verb × 0.3) + (boundaries × 0.4) + (completeness × 0.3)

**Assessment**:
- Phrasal verb integrity: X/10 [list any splits found]
- Boundary naturalness: X/10 [list unnatural boundaries]
- Semantic completeness: X/10 [list incomplete LEGOs]
- Overall naturalness score: X/10
- Notes: [explain major issues]

---

### Dimension 3: Pedagogical Value (Weight: 20%)

**Rule**: LEGOs should be useful for language learning - high-frequency patterns, appropriate size, and reusable.

**Sub-criteria**:
1. **Frequency & Utility (40%)**: Common useful phrases score higher
   - Questions: "Do you...", "Can you...", "How do I..."
   - Common first-person: "I want...", "I need...", "I can..."
   - Negations: "I don't...", "I can't..."
   - Politeness: "Please...", "Thank you..."
2. **Appropriate Granularity (35%)**: Optimal size is 3-5 words
   - 3-5 words = 10 points
   - 2 or 6 words = 8 points
   - 1 word = 4 points (single words rarely useful as LEGOs)
   - 7+ words = 6 points (decreases with length)
3. **Reusability (25%)**: Flexible, templatable structures
   - "I want to X" pattern = highly reusable
   - "I'm going to X" pattern = highly reusable
   - Contains pronouns = more reusable
   - Language-specific (e.g., "Macedonian") = less reusable

**Instructions**:
1. Assess each LEGO's utility using the patterns above
2. Check LEGO sizes - are they optimal (3-5 words)?
3. Evaluate reusability - can learners adapt these phrases?
4. Calculate average scores across all LEGOs
5. Compute weighted average: (utility × 0.4) + (granularity × 0.35) + (reusability × 0.25)

**Assessment**:
- Average word count: X words
- High-value LEGOs: [list which LEGOs match high-frequency patterns]
- Low-value LEGOs: [list single-word or too-long LEGOs]
- Reusability assessment: [which LEGOs are most/least reusable]
- Overall pedagogical score: X/10
- Notes: [explain]

---

### Dimension 4: Consistency (Weight: 10%)

**Rule**: Similar structures should be segmented similarly, and LEGO sizes should be relatively consistent.

**Sub-criteria**:
1. **Granularity Consistency (50%)**: Standard deviation of LEGO sizes should be low
   - StdDev ≤0.8 = 10 points (very consistent)
   - StdDev ≤1.2 = 9 points
   - StdDev ≤1.5 = 8 points
   - StdDev ≤2.0 = 6 points
   - StdDev >2.0 = 4 points (highly inconsistent)
2. **Pattern Consistency (50%)**: Same grammatical patterns should segment the same way
   - Example: If you segment "I want to speak" one way, segment "I want to learn" the same way

**Instructions**:
1. Calculate standard deviation of LEGO word counts
2. Identify any repeated grammatical patterns (e.g., "I want to X")
3. Check if those patterns are segmented consistently
4. Note any inconsistencies

**Assessment**:
- Word counts: [list all word counts]
- Mean: X words
- Standard deviation: X
- Repeated patterns found: [list patterns]
- Pattern consistency: [are they segmented the same way?]
- Overall consistency score: X/10
- Notes: [explain]

---

### Dimension 5: Edge Case Handling (Weight: 10%)

**Rule**: LEGOs should correctly handle contractions, punctuation, special characters, and word boundaries.

**Sub-criteria**:
1. **Contractions (30%)**: Never split contractions (I'm, you're, don't, can't, etc.)
2. **Punctuation (30%)**: No leading punctuation (except quotes); handle sentence punctuation correctly
3. **Special Characters (20%)**: Normalize apostrophes; no unexpected characters
4. **Word Boundaries (20%)**: No extra whitespace, properly trimmed

**Instructions**:
1. Check each LEGO for split contractions
2. Check for punctuation issues (leading punctuation, etc.)
3. Check for non-standard apostrophes or unexpected characters
4. Check for whitespace issues
5. Score each sub-criterion based on issues found
6. Calculate weighted average

**Assessment**:
- Contraction handling: X/10 [list any issues]
- Punctuation handling: X/10 [list any issues]
- Special characters: X/10 [list any issues]
- Word boundaries: X/10 [list any issues]
- Overall edge case score: X/10
- Notes: [explain]

---

## STEP 2: Calculate Overall Quality Score

**Formula**:
```
overall_score = (
  iron_rule_compliance × 0.35 +
  naturalness × 0.25 +
  pedagogical_value × 0.20 +
  consistency × 0.10 +
  edge_case_handling × 0.10
)
```

**Your Dimension Scores**:
- Iron Rule Compliance: X/10
- Naturalness: X/10
- Pedagogical Value: X/10
- Consistency: X/10
- Edge Case Handling: X/10

**Calculation**:
```
overall_score = (X × 0.35) + (X × 0.25) + (X × 0.20) + (X × 0.10) + (X × 0.10)
             = X.X
```

**Overall Quality Score**: X.X / 10

---

## STEP 3: Identify Concerns

Based on your dimension assessments, list all concerns you identified.

**Format for each concern**:
```json
{
  "concern_id": "c_{descriptive_name}",
  "severity": "low|medium|high|critical",
  "category": "iron_rule|naturalness|pedagogical|consistency|edge_case",
  "description": "Clear explanation of the issue",
  "affected_legos": ["S1L1", "S1L2"],
  "suggested_fix": "Actionable recommendation",
  "auto_fixable": true|false
}
```

**Severity Guidelines**:
- **Critical**: Iron Rule violations, split contractions
- **High**: Major naturalness issues (phrasal verb splits)
- **Medium**: Inconsistent granularity, unnatural boundaries
- **Low**: Minor issues (single-word LEGOs, whitespace)

**Your Concerns**:
[List all concerns in the format above]

---

## STEP 4: Generate Suggestions

Based on the concerns identified, suggest specific improvements to the extraction process.

**Suggestion Types**:
1. **Prompt Improvement**: Modifications to the extraction prompt/instructions
2. **Heuristic Adjustment**: Changes to scoring or selection logic
3. **Training Data**: Need for additional examples or edge cases

**Format for each suggestion**:
```json
{
  "suggestion_id": "s_{descriptive_name}",
  "type": "prompt_improvement|heuristic_adjustment|training_data",
  "priority": "low|medium|high|critical",
  "current_prompt_excerpt": "Relevant portion of current prompt (if applicable)",
  "suggested_change": "Specific modification to make",
  "rationale": "Why this would help",
  "expected_improvement": "Predicted impact (e.g., '+2 points in naturalness')"
}
```

**Priority Guidelines**:
- **Critical**: Required to fix failing extractions (score <5)
- **High**: Would significantly improve quality (+2 points or more)
- **Medium**: Moderate improvement (+1-2 points)
- **Low**: Minor refinement (+0.5-1 points)

**Your Suggestions**:
[List all suggestions in the format above]

---

## STEP 5: Determine Status

Based on your overall quality score, determine the status of this extraction.

**Status Thresholds**:
- Score ≥ 8.0 → Status: **ACCEPTED** ✓
- Score 5.0-7.9 → Status: **FLAGGED** ⚠ (usable but has concerns)
- Score < 5.0 → Status: **FAILED** ✗ (retry required)

**Your Overall Score**: X.X / 10
**Status**: [ACCEPTED|FLAGGED|FAILED]

---

## STEP 6: Write Review Notes

Provide a concise summary (2-4 sentences) of your assessment.

**Template**:
```
[Opening statement about overall quality]
[Specific strengths or weaknesses]
[Key concerns (if any)]
[Recommendation: accept, flag for review, or retry with improvements]
```

**Example - Good extraction**:
"Excellent extraction with natural segmentation and high pedagogical value. All LEGOs comply with the Iron Rule and preserve phrasal verbs. LEGO sizes are consistent (3-5 words) and express complete thoughts. No concerns identified. Recommend: ACCEPT."

**Example - Flagged extraction**:
"Technically compliant extraction but with some naturalness concerns. Phrasal verb 'going to' was split across LEGOs, reducing naturalness score. LEGO sizes inconsistent (2-6 words). Iron Rule compliance perfect. Recommend: FLAG for review, consider retry with improved prompt."

**Example - Failed extraction**:
"Extraction failed quality standards. Multiple Iron Rule violations detected ('to speak', 'in Macedonian' ending LEGOs). Poor consistency with highly variable LEGO sizes. Naturalness compromised by unnatural boundaries. Recommend: RETRY with prompt improvements focusing on Iron Rule compliance and consistent chunking."

**Your Review Notes**:
[Write 2-4 sentences summarizing your assessment]

---

## STEP 7: Compare to Previous Attempt (if applicable)

**Only complete this section if this is attempt 2 or higher.**

If this is a retry, compare this attempt to the previous one:

**Previous Attempt Score**: X.X / 10
**Current Attempt Score**: X.X / 10
**Score Delta**: +X.X or -X.X

**Improvements** (things that got better):
- [List specific improvements]
- [Be concrete - which concerns were resolved?]

**Regressions** (things that got worse):
- [List any new issues or decreased scores]
- [If none, write "None"]

**Overall Assessment**:
[1-2 sentences: Is this attempt better? Should we accept it or retry again?]

---

## FINAL OUTPUT: JSON Summary

Compile all your assessments into this JSON structure:

```json
{
  "attempt_number": X,
  "timestamp": "{current_iso_timestamp}",
  "agent_version": "phase3_vX.Y",
  "prompt_version": "X.Y.Z",
  "legos_extracted": X,
  "quality_score": {
    "overall_score": X.X,
    "dimension_scores": {
      "iron_rule_compliance": X,
      "naturalness": X,
      "pedagogical_value": X,
      "consistency": X,
      "edge_case_handling": X
    },
    "calculated_at": "{current_iso_timestamp}",
    "scoring_version": "1.0"
  },
  "concerns": [
    {
      "concern_id": "c_...",
      "severity": "...",
      "category": "...",
      "description": "...",
      "affected_legos": [...],
      "suggested_fix": "...",
      "auto_fixable": false
    }
  ],
  "suggestions": [
    {
      "suggestion_id": "s_...",
      "type": "...",
      "priority": "...",
      "current_prompt_excerpt": "...",
      "suggested_change": "...",
      "rationale": "...",
      "expected_improvement": "..."
    }
  ],
  "status": "accepted|flagged|failed",
  "review_notes": "...",
  "compared_to_previous": {
    "score_delta": "+X.X",
    "improvements": [...],
    "regressions": [...]
  }
}
```

**END OF SELF-REVIEW**
```

---

## Integration Instructions

### Where to Add This Prompt

**Option 1: Separate Self-Review Phase**
```
1. Run Phase 3 extraction (existing prompt)
2. Run self-review prompt (this document)
3. Based on status, decide next action
```

**Option 2: Integrated Single-Phase**
```
Phase 3 Prompt:
├─ Extract LEGOs (existing instructions)
├─ Self-Review (this document)
└─ Output results + review metadata
```

### Prompt Variables to Fill

When using this prompt, replace these placeholders:

| Placeholder | Value | Example |
|-------------|-------|---------|
| `{seed_id}` | Translation seed ID | `"C0001"` |
| `{source_text}` | Source language sentence | `"I want to speak..."` |
| `{target_text}` | Target language sentence | `"Сакам да зборувам..."` |
| `{lego_count}` | Number of LEGOs extracted | `5` |
| `{for each LEGO, display: provenance, text}` | List of all LEGOs | `S1L1: "I want"` |
| `{current_iso_timestamp}` | Current timestamp | `"2025-10-11T14:00:00.000Z"` |

### Example Usage in Node.js

```javascript
const SELF_REVIEW_PROMPT = fs.readFileSync('./prompts/self-review.md', 'utf-8');

async function performSelfReview(translation, legos) {
  // Fill in prompt variables
  let prompt = SELF_REVIEW_PROMPT
    .replace('{seed_id}', translation.seed_id)
    .replace('{source_text}', translation.source)
    .replace('{target_text}', translation.target)
    .replace('{lego_count}', legos.length)
    .replace('{for each LEGO, display: provenance, text}',
      legos.map(l => `${l.provenance}: "${l.text}"`).join('\n'));

  // Send to AI agent
  let response = await aiAgent.complete(prompt);

  // Parse JSON output
  let reviewResult = extractJsonFromResponse(response);

  return reviewResult;
}
```

---

## Prompt Versioning

This prompt template should be versioned. When making changes:

1. Update the `prompt_version` field in outputs
2. Document changes in a changelog
3. Test on sample extractions to validate improvements

**Current Version**: 3.0.0 (initial self-review implementation)

**Version Format**: MAJOR.MINOR.PATCH
- **MAJOR**: Significant changes to scoring criteria or structure
- **MINOR**: New evaluation criteria or refinements
- **PATCH**: Bug fixes or clarifications

---

## Tips for Agents

### Be Honest and Critical

Don't inflate scores. Your self-assessment is valuable only if it's accurate. It's better to identify concerns early than to let poor extractions propagate.

### Be Specific

When identifying concerns or suggesting improvements:
- ✓ "LEGO 'to speak' violates Iron Rule by starting with preposition 'to'"
- ✗ "Some LEGOs have issues"

### Focus on Actionable Suggestions

Your suggestions should be concrete and implementable:
- ✓ "Add explicit rule: 'Keep phrasal verbs together (going to, want to, have to)'"
- ✗ "Make it better"

### Learn from Previous Attempts

If this is a retry, explicitly reference what changed:
- "Previous attempt split 'going to', this attempt keeps it together (+2 naturalness)"

### Request Help When Needed

If after 2-3 attempts you can't achieve acceptable quality:
- Set `human_review_requested: true`
- Explain why this SEED is challenging
- Suggest what human judgment is needed

---

## Appendix A: Common Concerns Reference

### Iron Rule Concerns

**c_iron_rule_violation**
- **Severity**: Critical
- **Description**: LEGO starts/ends with preposition
- **Fix**: Extend or contract LEGO boundary

### Naturalness Concerns

**c_phrasal_verb_split**
- **Severity**: High
- **Description**: Phrasal verb split across boundaries
- **Fix**: Keep phrasal verbs together

**c_unnatural_boundary**
- **Severity**: Medium
- **Description**: LEGO breaks at unnatural point
- **Fix**: Segment at clause/phrase boundaries

**c_incomplete_phrase**
- **Severity**: Medium
- **Description**: Verb phrase incomplete
- **Fix**: Include full verb phrase (e.g., "want to speak")

**c_dangling_determiner**
- **Severity**: Low
- **Description**: Determiner without noun
- **Fix**: Include the noun it modifies

### Pedagogical Concerns

**c_too_small**
- **Severity**: Medium
- **Description**: LEGOs too small (< 2.5 words avg)
- **Fix**: Increase LEGO size to 3-5 words

**c_too_large**
- **Severity**: Medium
- **Description**: LEGOs too large (> 6 words)
- **Fix**: Break into smaller, more manageable phrases

**c_low_reusability**
- **Severity**: Low
- **Description**: LEGOs too specific to be useful
- **Fix**: Prefer more general, templatable phrases

### Consistency Concerns

**c_inconsistent_granularity**
- **Severity**: Medium
- **Description**: High variance in LEGO sizes
- **Fix**: Apply consistent chunking strategy (3-5 words)

**c_pattern_mismatch**
- **Severity**: Medium
- **Description**: Similar patterns segmented differently
- **Fix**: Segment similar structures the same way

### Edge Case Concerns

**c_contraction_error**
- **Severity**: High
- **Description**: Contraction split or malformed
- **Fix**: Keep contractions intact

**c_punctuation_error**
- **Severity**: Medium
- **Description**: Improper punctuation handling
- **Fix**: Remove leading punctuation, normalize

**c_whitespace_error**
- **Severity**: Low
- **Description**: Extra/untrimmed whitespace
- **Fix**: Normalize to single spaces, trim

---

## Appendix B: Common Suggestions Reference

### Prompt Improvements

**s_preserve_phrasal_verbs**
- **Type**: prompt_improvement
- **Priority**: High
- **Change**: Add rule about keeping phrasal verbs together

**s_improve_naturalness**
- **Type**: prompt_improvement
- **Priority**: High
- **Change**: Add rules about natural boundaries and completeness

**s_consistency_heuristic**
- **Type**: prompt_improvement
- **Priority**: Medium
- **Change**: Add guideline to prefer 3-5 word LEGOs

**s_handle_complex_sentences**
- **Type**: prompt_improvement
- **Priority**: High
- **Change**: Add guidance for complex multi-clause sentences

### Heuristic Adjustments

**s_enforce_iron_rule**
- **Type**: heuristic_adjustment
- **Priority**: Critical
- **Change**: Add post-processing filter for preposition boundaries

**s_phrasal_verb_detection**
- **Type**: heuristic_adjustment
- **Priority**: High
- **Change**: Implement phrasal verb detection before segmentation

**s_consistency_scoring**
- **Type**: heuristic_adjustment
- **Priority**: Medium
- **Change**: Add scoring bonus for consistent LEGO sizes

### Training Data

**s_edge_case_examples**
- **Type**: training_data
- **Priority**: Medium
- **Change**: Add examples of contractions, punctuation edge cases

**s_complex_sentence_examples**
- **Type**: training_data
- **Priority**: High
- **Change**: Add examples of how to segment complex sentences

---

**Document Status**: Complete
**Next Steps**: Create example scenarios (05-EXAMPLE-SCENARIOS.md)
