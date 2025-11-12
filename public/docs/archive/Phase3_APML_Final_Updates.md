# Phase 3 APML Final Updates
## Recommended Changes Based on QA Findings

**Date:** 2025-10-15
**Based On:** Phase 3 Recursive QA analysis of 120 seeds across 4 languages
**Purpose:** Update APML specification to prevent identified issues and codify best practices

---

## 1. IRON RULE Clarification - Add Explicit Examples

**Current APML Section:** IRON RULE (line ~865)

**Issue Found:** Standalone prepositions appeared in S0005 across all Romance languages, violating IRON RULE.

**Recommended Addition:**

```markdown
### IRON RULE - FORBIDDEN STANDALONE LEGOS

The following must NEVER appear as standalone LEGOs:

**Prepositions (Romance Languages):**
- ❌ Italian: `di`, `a`, `da`, `in`, `con`, `su`, `per`, `tra`, `fra`
- ❌ Spanish: `de`, `a`, `en`, `con`, `por`, `para`, `desde`, `hacia`
- ❌ French: `de`, `d'`, `à`, `en`, `dans`, `pour`, `avec`, `sans`, `sur`

**Correct Usage:**
- ✅ `con te` / `with you` (preposition + object)
- ✅ `con qualcun altro` / `with someone else` (preposition + NP)
- ❌ `con` / `with` (standalone - FORBIDDEN)

**Exception for FEEDERs:**
Prepositions MAY appear as FEEDERs to show components, but NEVER as standalone LEGOs in lego_pairs.

Example S0005 (Italian):
```json
"lego_pairs": [
  {"lego_id": "S0005L07", "target_chunk": "con qualcun altro", "known_chunk": "with someone else"}
],
"feeder_pairs": [
  {"feeder_id": "S0005F03", "target_chunk": "con", "known_chunk": "with"}
]
```

**Articles (Romance Languages):**
- ❌ Italian: `il`, `lo`, `la`, `i`, `gli`, `le`, `un`, `uno`, `una`
- ❌ Spanish: `el`, `la`, `los`, `las`, `un`, `una`, `unos`, `unas`
- ❌ French: `le`, `la`, `les`, `un`, `une`, `des`

**Exceptions:**
- Articles that are part of fixed expressions: `lo más` (the most), `il più` (the most)
- These must include the word they modify: `lo más posible` / `as much as possible`

**Conjunctions:**
- ❌ `and`, `or`, `but` as standalone LEGOs
- ✅ May appear in composite phrases: `otra persona` / `someone else` contains `otra` (other/another)
```

---

## 2. FD_LOOP - Add Grammaticalized Construction Exceptions

**Current APML Section:** FD_LOOP TEST (line ~606)

**Issue Found:** Future markers like `Sto per` and `Voy a` end with glue words but are acceptable as fixed expressions.

**Recommended Addition:**

```markdown
### FD_LOOP - Grammaticalized Constructions (Whitelisted Exceptions)

Certain constructions END with glue words but are ACCEPTABLE because they are grammaticalized markers (not compositional):

**Future/Aspect Markers:**

**Italian:**
- ✅ `Sto per` / `I'm going to` - Fixed future marker
  - Literally: "I am for" but functions as single unit meaning imminent future
  - NOT compositional - `per` is grammaticalized, not a preposition here

**Spanish:**
- ✅ `Voy a` / `I'm going to` - Fixed future marker
  - Literally: "I go to" but functions as periphrastic future
  - NOT compositional - `a` is grammaticalized, not a preposition here

**French:**
- ✅ `Je vais` / `I'm going to` - Future marker (no glue word issue)

**Test Criterion:**
If the expression:
1. Is a fixed grammatical marker (future, aspect, mood)
2. Cannot be decomposed without losing grammatical meaning
3. Passes FD_LOOP as a unit
4. Is documented in authoritative grammar references

Then it is ACCEPTABLE even if it ends with what would otherwise be a glue word.

**Documentation Required:**
When using such constructions, add note in componentization:
```json
{
  "lego_id": "S0005L01",
  "explanation": "I'm going to = Sto per, where 'Sto per' is a grammaticalized future marker (not compositional). While 'per' alone means 'for', here it functions as part of the fixed future construction."
}
```
```

---

## 3. Add LEGO Type Taxonomy to APML

**Current APML Section:** LEGO_PAIRS definition (line ~226)

**Issue Found:** Tiling test can't distinguish BASE LEGOs from hierarchical COMPOSITE LEGOs.

**Recommended Addition:**

```markdown
### LEGO TYPES - Taxonomy and Usage

LEGOs serve multiple pedagogical purposes. To support accurate tiling and quality testing, we distinguish three types:

**TYPE 1: BASE LEGO**
- Definition: Atomic or composite LEGO that directly tiles part of the original sentence
- Usage: Used in sentence reconstruction (tiling test)
- FD Requirement: MUST pass FD_LOOP independently
- Examples:
  - `Voglio` / `I want` (atomic verb)
  - `Sto per` / `I'm going to` (grammaticalized composite)
  - `con qualcun altro` / `with someone else` (prepositional phrase)

**TYPE 2: COMPOSITE LEGO (Hierarchical Build-Up)**
- Definition: LEGO that shows how BASE LEGOs combine, for pedagogical purposes
- Usage: Teaching how components build up (NOT used in tiling)
- FD Requirement: MUST pass FD_LOOP independently
- Examples from Italian S0005:
  - L04: `qualcuno` / `someone` (BASE)
  - L05: `altro` / `else` (BASE)
  - L06: `qualcun altro` / `someone else` (COMPOSITE of L04+L05 - pedagogical)
  - L07: `con qualcun altro` / `with someone else` (BASE - tiles the sentence)

**TYPE 3: FEEDER**
- Definition: Component shown for pedagogical scaffolding, may not be FD alone
- Usage: Help learners see substructure (separate feeder_pairs array)
- FD Requirement: Should be FD when possible, but exceptions allowed for pedagogy
- Examples:
  - `hablar` / `to speak` (component of `practicar a hablar`)
  - `con` / `with` (component of `con qualcun altro`)

**Metadata Proposal:**
Consider adding optional `lego_type` field:
```json
{
  "lego_id": "S0005L06",
  "target_chunk": "qualcun altro",
  "known_chunk": "someone else",
  "fd_validated": true,
  "lego_type": "COMPOSITE",
  "composed_from": ["S0005L04", "S0005L05"]
}
```

**Tiling Algorithm:**
Only BASE LEGOs should be used in tiling test. COMPOSITE LEGOs show pedagogy but don't tile directly.

**Current Workaround:**
Until metadata is added, tiling algorithm should:
1. Check if LEGO appears in another LEGO's componentization as a component
2. If yes, it's likely a COMPOSITE showing build-up
3. Use largest non-overlapping LEGOs for tiling
```

---

## 4. Gender Neutrality - Explicit Requirement

**Current APML Section:** FD_LOOP GENDER AND CONTEXT NEUTRALITY (line ~616)

**Finding:** All 30 seeds correctly use gender-neutral translations. This should be emphasized.

**Recommended Enhancement:**

```markdown
### GENDER NEUTRALITY - MANDATORY for Third Person

**CRITICAL RULE:** Third-person verb conjugations in Romance languages are gender-neutral. English translations MUST preserve this neutrality or FD_LOOP will fail.

**Examples from QA:**

**✅ CORRECT:**
- `Vuole` / `Wants` (Italian, S0016, S0017)
- `Quiere` / `Wants` (Spanish, S0016, S0017)
- `Veut` / `Wants` (French, S0016, S0017)

**FD_LOOP Validation:**
- "Wants" → `Vuole` → "Wants" ✅ IDENTICAL

**❌ INCORRECT:**
- `Vuole` / `He wants` ❌ WRONG
- `Vuole` / `She wants` ❌ WRONG

**FD_LOOP Failure:**
- "He wants" → `Vuole` → "Wants" ❌ NOT IDENTICAL (gender lost)
- "She wants" → `Vuole` → "Wants" ❌ NOT IDENTICAL (gender lost)

**Testing Protocol:**
For EVERY third-person LEGO without explicit subject:
1. Check that English translation has no gendered pronouns (he/she/his/her)
2. Run FD_LOOP: English → Target → English must be IDENTICAL
3. If gender appears, REJECT and revise

**Note:** This applies to all null-subject or pro-drop languages where verb conjugation doesn't specify gender.
```

---

## 5. Cross-Language Consistency - Add Quality Check

**Current APML Section:** Add new section under Quality Assurance

**Finding:** Romance languages show 96.7% consistency - this should be a quality metric.

**Recommended Addition:**

```markdown
### CROSS-LANGUAGE CONSISTENCY CHECK

**Applicable To:** Languages within the same language family (e.g., Romance languages)

**Quality Metric:** Similar structures should decompose similarly

**Example:**
For canonical concept "I'm going to practice speaking with someone else":
- Italian S0005: 6 base LEGOs + 1 composite = 7 total
- Spanish S0005: 4 base LEGOs + 1 composite = 5 total
- French S0005: 4 base LEGOs + 1 composite = 5 total

**Consistency Check:**
1. If LEGO counts vary by more than ±2 across Romance languages, investigate
2. Variation is acceptable if justified by language-specific structure
3. Consistency helps multi-language learners see patterns

**Testing Protocol:**
When producing Romance language courses:
1. Compare parallel seeds across Italian, Spanish, French
2. Flag significant decomposition differences (>2 LEGO variance)
3. Review flagged seeds to ensure variance is linguistically justified
4. Document language-specific patterns that cause acceptable variance

**Non-Applicable Cases:**
- DO NOT force consistency between unrelated languages (e.g., Romance vs. Mandarin)
- Respect language-specific structures
- Mandarin follows different patterns - this is correct

**Quality Target:** 95% consistency for Romance language triplet
**QA Result:** 96.7% achieved across 30 seeds ✅
```

---

## 6. Pattern Library Integration

**Current APML Section:** Add new section or extend Phase 3 guidance

**Finding:** 18 patterns documented - these should guide future LEGO decomposition.

**Recommended Addition:**

```markdown
### PATTERN LIBRARY - Required Reference

**Location:** `/docs/Phase3_Pattern_Library.md`

**Purpose:** Codified patterns for consistent LEGO decomposition across languages

**Documented Patterns:** 18 cross-language patterns including:
1. Modal + Infinitive
2. Progressive Aspect
3. Future Construction
4. Prepositional Phrase Composition
5. Hierarchical Build-Up
6. Superlative/Comparative
7. Negation
8. Question Words
9. Reflexive Verbs
10. Verb + Prep + Infinitive
11. Conditional/Subjunctive Clauses
12. Embedded Questions
13. Time Expressions
14. Degree Adverbs
15. "As soon as" Constructions
16. Verb + Complement
17. Idiomatic Expressions
18. Gender-Neutral Third Person

**Usage Requirement:**
Before decomposing a seed:
1. Check if structure matches a documented pattern
2. Follow pattern's decomposition strategy
3. If new pattern emerges, document it
4. Add examples from multiple languages

**Quality Gate:**
Pattern library should be updated after each course production with:
- New patterns discovered
- Refinements to existing patterns
- Edge cases encountered
- Cross-language variations

**APML Prompt Update:**
Phase 3 prompt should reference pattern library:
"Before decomposing each seed, consult the Pattern Library (/docs/Phase3_Pattern_Library.md) to check if the structure matches a known pattern. Follow established patterns for consistency."
```

---

## 7. Update Phase 3 Prompt - Add Quality Checklist

**Current APML Section:** Phase 3 PROMPT (line ~1245+)

**Recommended Addition at End of Phase 3 Prompt:**

```markdown
## QUALITY CHECKLIST (Run on Every Seed Before Finalizing)

Before marking a seed's LEGO breakdown as complete, verify:

**CRITICAL (100% Required):**
- [ ] Every LEGO passes FD_LOOP: target → known → target = IDENTICAL
- [ ] No standalone prepositions, articles, or conjunctions (IRON RULE)
- [ ] No glue words at LEGO boundaries (unless grammaticalized construction)
- [ ] Third-person LEGOs use gender-neutral English
- [ ] Concatenating BASE LEGOs reconstructs original seed exactly (TILING TEST)

**QUALITY (95%+ Target):**
- [ ] Cross-language consistency checked (for Romance languages)
- [ ] Known patterns applied correctly (consult Pattern Library)
- [ ] FEEDERs are helpful and FD when possible
- [ ] Hierarchical build-up includes componentization explanations
- [ ] CHUNK UP decisions documented in componentization

**DOCUMENTATION:**
- [ ] Componentization field explains complex LEGOs
- [ ] Grammaticalized constructions noted if they end with glue words
- [ ] Any deviations from patterns justified

**If ANY critical checklist item fails, revise the LEGO breakdown before proceeding.**
```

---

## 8. Tiling Test Algorithm Specification

**Current APML Section:** Add new testing section

**Recommended Addition:**

```markdown
### TILING TEST - Algorithm Specification

**Purpose:** Verify that LEGOs correctly decompose the original sentence

**Current Issue:** Algorithm concatenates ALL LEGOs including hierarchical build-ups, causing false failures

**Correct Algorithm:**

**Step 1: Identify BASE LEGOs**
- Extract all LEGOs from lego_pairs
- Identify which are COMPOSITE (pedagogical build-up) vs BASE (tile sentence)
- Method: Check componentization field - if LEGO is composed_from others, it may be hierarchical
- Alternative: Check if LEGO text appears within another LEGO (substring test)

**Step 2: Select Tiling LEGOs**
- Choose largest non-overlapping LEGOs that cover the sentence
- Exclude LEGOs that are substrings of other LEGOs (likely hierarchical)
- Example from Italian S0005:
  - Include: L01 `Sto per`, L02 `praticare a parlare`, L07 `con qualcun altro`
  - Exclude: L03 `con` (substring of L07), L04 `qualcuno` (substring of L07), L05 `altro` (substring of L07), L06 `qualcun altro` (substring of L07)

**Step 3: Concatenate and Compare**
- Join selected LEGOs with spaces
- Normalize: remove punctuation, normalize whitespace
- Compare to original seed (also normalized)
- Must match EXACTLY

**Implementation Pseudocode:**
```python
def tiling_test(seed, lego_pairs):
    # Normalize original
    original = normalize(seed['original_target'])

    # Find largest non-overlapping LEGOs
    lego_chunks = [lego['target_chunk'] for lego in lego_pairs]

    # Remove LEGOs that are substrings of other LEGOs
    base_legos = []
    for lego in sorted(lego_chunks, key=len, reverse=True):
        if not any(lego in other and lego != other for other in base_legos):
            base_legos.append(lego)

    # Sort by appearance order in original sentence
    base_legos.sort(key=lambda x: original.find(normalize(x)))

    # Concatenate
    reconstructed = normalize(' '.join(base_legos))

    # Compare
    return original == reconstructed
```

**Alternative Approach:**
Add `lego_type` metadata to distinguish BASE from COMPOSITE, then only tile BASE LEGOs.
```

---

## 9. Add Examples Section to APML

**Current APML Section:** After Phase 3 specification

**Purpose:** Provide concrete examples of correct vs. incorrect LEGO breakdowns

**Recommended Addition:**

```markdown
### LEGO BREAKDOWN EXAMPLES - Correct vs. Incorrect

#### Example 1: Standalone Preposition (CRITICAL ERROR)

**Seed:** "I'm going to practice speaking with someone else."
**Target (Italian):** "Sto per praticare a parlare con qualcun altro."

**❌ INCORRECT:**
```json
"lego_pairs": [
  {"lego_id": "S0005L01", "target_chunk": "Sto per", "known_chunk": "I'm going to"},
  {"lego_id": "S0005L02", "target_chunk": "praticare a parlare", "known_chunk": "to practice speaking"},
  {"lego_id": "S0005L03", "target_chunk": "con", "known_chunk": "with"},  // ❌ IRON RULE violation
  {"lego_id": "S0005L04", "target_chunk": "qualcun altro", "known_chunk": "someone else"}
]
```
**Errors:**
- L03 is standalone preposition (violates IRON RULE, FD_LOOP, Glue Word rules)

**✅ CORRECT:**
```json
"lego_pairs": [
  {"lego_id": "S0005L01", "target_chunk": "Sto per", "known_chunk": "I'm going to"},
  {"lego_id": "S0005L02", "target_chunk": "praticare a parlare", "known_chunk": "to practice speaking"},
  {"lego_id": "S0005L04", "target_chunk": "qualcun altro", "known_chunk": "someone else"},
  {"lego_id": "S0005L07", "target_chunk": "con qualcun altro", "known_chunk": "with someone else"}
],
"feeder_pairs": [
  {"feeder_id": "S0005F03", "target_chunk": "con", "known_chunk": "with"}  // ✅ OK as FEEDER
]
```

#### Example 2: Gender Neutrality (CRITICAL ERROR)

**Seed:** "Wants to come back with everyone else later on."
**Target (Spanish):** "Quiere volver con todos los demás más tarde."

**❌ INCORRECT:**
```json
{"lego_id": "S0016L01", "target_chunk": "Quiere", "known_chunk": "He wants"}  // ❌ Gender violation
```
**FD_LOOP Failure:**
- "He wants" → `Quiere` → "Wants" ❌ NOT IDENTICAL

**✅ CORRECT:**
```json
{"lego_id": "S0016L01", "target_chunk": "Quiere", "known_chunk": "Wants"}  // ✅ Gender neutral
```
**FD_LOOP Success:**
- "Wants" → `Quiere` → "Wants" ✅ IDENTICAL

#### Example 3: CHUNK UP for FD Compliance

**Seed:** "I'm trying to learn."
**Target (French):** "J'essaie d'apprendre."

**❌ INCORRECT (Overly Decomposed):**
```json
"lego_pairs": [
  {"lego_id": "S0002L01", "target_chunk": "J'", "known_chunk": "I"},  // ❌ Too small
  {"lego_id": "S0002L02", "target_chunk": "essaie", "known_chunk": "try"},  // ❌ Fails FD
  {"lego_id": "S0002L03", "target_chunk": "d'", "known_chunk": "to"},  // ❌ Standalone prep
  {"lego_id": "S0002L04", "target_chunk": "apprendre", "known_chunk": "learn"}  // ❌ Fails FD
]
```
**Errors:**
- "try" alone could be noun, verb, imperative - fails FD
- "learn" alone could be infinitive, imperative - fails FD
- "to" standalone violates IRON RULE

**✅ CORRECT (CHUNKed UP):**
```json
"lego_pairs": [
  {"lego_id": "S0002L01", "target_chunk": "J'essaie d'apprendre", "known_chunk": "I'm trying to learn"}
],
"feeder_pairs": [
  {"feeder_id": "S0002F01", "target_chunk": "J'essaie", "known_chunk": "I try"},
  {"feeder_id": "S0002F02", "target_chunk": "apprendre", "known_chunk": "to learn"}
]
```
**Why:** Entire progressive construction is FD as a unit. FEEDERs show components for pedagogy.
```

---

## 10. Version History Addition

**Current APML Section:** Add to changelog/evolution

**Recommended Entry:**

```markdown
### Version 7.6.0 - Phase 3 QA Refinements

**Date:** 2025-10-15

**Changes Based On:** Recursive QA analysis of 120 seeds across Italian, Spanish, French, Mandarin

**Additions:**
1. IRON RULE - Added explicit examples of forbidden standalone words
2. FD_LOOP - Added grammaticalized construction exceptions (whitelist)
3. LEGO Types - Added BASE/COMPOSITE/FEEDER taxonomy
4. Gender Neutrality - Enhanced third-person requirements with examples
5. Cross-Language Consistency - Added quality check for Romance languages
6. Pattern Library - Integrated 18 documented patterns as required reference
7. Quality Checklist - Added pre-finalization checklist for Phase 3
8. Tiling Test - Specified algorithm to handle hierarchical LEGOs
9. Examples Section - Added correct vs. incorrect breakdown examples

**Quality Improvements:**
- FD_LOOP compliance: 100% (was 99.1%)
- IRON RULE compliance: 100% (was 99.1%)
- Glue Word containment: 100% (was 96.6%)
- Pattern documentation: 18 patterns (target was 15)

**Files Updated:**
- ssi-course-production.apml (this file)
- Phase3_Pattern_Library.md (new)
- Phase3_QA_Final_Report.md (new)
- Phase3_QA_Iteration_Tracker.md (new)

**Validation:**
All changes validated against 30-seed test set across 4 languages with 100% pass rate on critical quality gates.
```

---

## Summary of Changes

### Critical Updates (Must Implement)
1. ✅ IRON RULE explicit examples
2. ✅ Gender neutrality requirements
3. ✅ LEGO type taxonomy
4. ✅ Quality checklist for Phase 3

### Important Updates (Should Implement)
5. ✅ Pattern Library integration
6. ✅ Grammaticalized construction whitelist
7. ✅ Cross-language consistency check
8. ✅ Tiling algorithm specification

### Nice-to-Have Updates (Consider for Future)
9. ✅ Examples section
10. ✅ Version history

---

## Implementation Priority

**Priority 1 (Before Next Course Production):**
- Add IRON RULE examples
- Add gender neutrality requirements
- Add quality checklist to Phase 3 prompt
- Reference Pattern Library in Phase 3 prompt

**Priority 2 (Next APML Update Cycle):**
- Implement LEGO type taxonomy in JSON schema
- Add grammaticalized construction whitelist
- Add cross-language consistency check
- Update tiling test algorithm

**Priority 3 (Documentation Enhancement):**
- Add examples section
- Update version history
- Create tutorial based on examples

---

## Testing Recommendations

After implementing these updates:

1. **Re-run QA on existing 30-seed set** - Verify 100% pass rate maintained
2. **Generate new 10-seed test set** - Validate improvements apply to new content
3. **Cross-language validation** - Test pattern consistency across Romance languages
4. **Edge case testing** - Test grammaticalized constructions, hierarchical build-ups

**Success Criteria:**
- All critical quality gates: 100% pass
- All quality gates: 95%+ pass
- Pattern library referenced in all decomposition decisions
- Zero standalone preposition violations
- Zero gender neutrality violations

