# FOLLOW-UP BRIEF - Phase 3 Recursive Quality Assurance & Refinement

**Date:** 15 October 2025
**Duration:** After overnight agent completes
**Agent Type:** general-purpose
**Priority:** CRITICAL - Quality gate for entire system

---

## MISSION

**Analyze and recursively refine** all Phase 3 LEGO decompositions across 4 languages until they achieve **top-drawer, production-ready quality**.

**Key principle:** Cross-language consistency + FD perfection + pattern extraction

---

## INPUT FILES (from overnight agent)

```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/
├── ita_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── spa_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── fra_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
└── cmn_for_eng_30seeds/
    ├── translations.json
    └── LEGO_BREAKDOWNS_COMPLETE.json

/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/
├── Phase3_Cross_Language_Patterns.md
└── APML_Phase3_Recommended_Updates.md
```

**Reference:**
- APML: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

---

## RECURSIVE REFINEMENT STRATEGY

### ITERATION LOOP

**For each iteration (max 5 iterations or until perfect):**

1. **ANALYZE** - Run comprehensive quality checks across all 4 languages
2. **IDENTIFY** - Find violations, inconsistencies, missed patterns
3. **LEARN** - Extract patterns, update working rules
4. **REFINE** - Fix violations, apply patterns consistently
5. **VERIFY** - Re-run quality checks
6. **REPEAT** - If issues remain, iterate; if perfect, DONE

**Stop when:** All quality gates pass ✅ OR 5 iterations complete (document remaining issues)

---

## QUALITY GATES (All must pass ✅)

### GATE 1: FD_LOOP Validation (100% pass rate required)

**For EVERY LEGO in all 4 languages:**

Test: `target → known → target = IDENTICAL`

**Automated check:**
```python
For each LEGO:
  1. Take target_chunk
  2. Translate to known_chunk (should match exactly)
  3. Translate known_chunk back to target
  4. Compare: is it IDENTICAL to original target_chunk?
  5. If NO → FD VIOLATION
```

**Common violations to catch:**
- Gender context missing (e.g., "Vuole" / "He wants" - should be "Wants")
- Tense/aspect context missing (e.g., "parlare" / "speaking" - should chunk up)
- Singular/plural ambiguity
- Formality level ambiguity (tu/vous, tú/usted, etc.)

**Output:** List every FD violation with:
- Seed ID + LEGO ID
- Current mapping
- Why it fails FD
- Recommended fix (usually CHUNK UP or gender-neutral translation)

---

### GATE 2: IRON RULE Compliance (0 violations allowed)

**Check EVERY LEGO:**

**FORBIDDEN:**
- Standalone prepositions: "con" / "with", "en" / "in", "de" / "of"
- Standalone conjunctions: "y" / "and", "e" / "and", "et" / "and"
- Standalone articles: "el" / "the", "la" / "the", "le" / "the"

**ALLOWED:**
- Complete prepositional phrases: "con te" / "with you", "en español" / "in Spanish"
- Complete noun phrases: "la casa" / "the house"

**Output:** List every violation with recommended fix

---

### GATE 3: Glue Word Containment (0 violations allowed)

**Check EVERY COMPOSITE LEGO:**

Glue words (di, a, de, à, à, etc.) must be INSIDE composites, never at edges.

**VIOLATIONS:**
- ❌ LEGO ends with: "di", "a", "de", "à", "pour", "para"
- ❌ LEGO begins with: "di", "a", "de", "à" (unless part of fixed expression)

**Examples of violations:**
- ❌ "Sto cercando di" + "ricordare" (di at edge)
- ❌ "voy a" + "hablar" (a at edge)

**Output:** List every violation with recommended chunking

---

### GATE 4: Cross-Language Consistency

**For equivalent structures across Romance languages:**

**Example structures that SHOULD be consistent:**
- "I want to speak" pattern (Italian/Spanish/French should decompose similarly)
- "I'm trying to" pattern
- "with you" / "with me" patterns
- Modal + infinitive constructions

**Check:**
1. Identify parallel seeds across languages (similar meaning)
2. Compare LEGO decomposition strategies
3. Flag inconsistencies

**Example inconsistency:**
```
Italian: "Voglio parlare" → "Voglio" | "parlare" (2 LEGOs)
Spanish: "Quiero hablar" → "Quiero hablar" (1 LEGO)
French: "Je veux parler" → "Je veux" | "parler" (2 LEGOs)

ISSUE: Spanish inconsistent - should be 2 LEGOs like Italian/French
```

**Output:** Consistency issues with recommendations

---

### GATE 5: CHUNK UP Pattern Validation

**For LEGOs that needed CHUNK UP:**

Verify the chunking was done correctly and document the pattern.

**Check:**
1. Why was CHUNK UP needed? (context for FD)
2. Is the chunk sufficient? (does it now pass FD_LOOP?)
3. Is this pattern reusable? (document for future seeds)

**Build pattern library:**
```markdown
### Pattern: Progressive Aspect

**Issue:** Bare verb + gerund fails FD
- ❌ "hablar" / "speaking" (FD FAIL - "speaking" could be various Spanish forms)

**Solution:** CHUNK UP to include auxiliary
- ✅ "estoy hablando" / "I'm speaking" (FD PASS)

**Applies to:**
- Spanish: estar + gerund
- Italian: stare + gerund
- French: être en train de + infinitive
- Mandarin: 在 + verb
```

**Output:** Pattern library with 10+ documented patterns

---

### GATE 6: FEEDER Quality

**Check EVERY FEEDER:**

1. Is it FD? (If NO, remove it)
2. Is it pedagogically helpful? (If NO, remove it)
3. Does it appear as a BASE LEGO elsewhere? (Good - reusability)

**Example violations:**
- ❌ FEEDER: "quello che" / "what" (NOT FD - "what" has multiple Italian translations)
- ❌ FEEDER: "il" / "the" (NOT pedagogically helpful - trivial)

**Output:** List FEEDERs to remove + quality score per language

---

### GATE 7: Hierarchical Build-Up

**For multi-level composites, verify proper hierarchy:**

**Example:**
```
"con qualcun altro" / "with someone else"

Required hierarchy:
L01: "con" / "with"
L02: "qualcuno" / "someone"
L03: "altro" / "else"
L04: "qualcun altro" / "someone else" (COMPOSITE of L02+L03)
L05: "con qualcun altro" / "with someone else" (COMPOSITE of L01+L04)
```

**Check:**
- Are intermediate composites included?
- Are FEEDERs properly linked?
- Can learner build up naturally from base to complex?

**Output:** Missing hierarchy levels per language

---

### GATE 8: Tiling Test

**Can you reconstruct the original seed by concatenating LEGOs?**

For EVERY seed:
1. Take all LEGO target_chunks in order
2. Concatenate them
3. Compare to original_target
4. Must be IDENTICAL (accounting for punctuation)

**If NOT identical:**
- Missing LEGOs? (e.g., dropped a word)
- Wrong decomposition? (overlapping LEGOs)
- Punctuation handling?

**Output:** Failed tiling tests with diagnosis

---

## CROSS-LANGUAGE PATTERN EXTRACTION

### Pattern Discovery Process

**For each common construction:**

1. **Identify pattern** (e.g., "I want to + verb")
2. **Find in all languages:**
   - Italian: "Voglio + infinitive"
   - Spanish: "Quiero + infinitive"
   - French: "Je veux + infinitive"
   - Mandarin: "我想 + verb"
3. **Document decomposition strategy:**
   - Should modal be separate LEGO? (YES - all Romance do this)
   - Should infinitive be separate? (YES)
   - FEEDERs needed? (Depends on verb complexity)
4. **Apply consistently across all instances**

### Patterns to Extract (minimum 15)

1. Modal + infinitive (want to, can, should, etc.)
2. Progressive aspect (I'm -ing)
3. Future constructions (going to, will)
4. Negation (don't, not)
5. Questions (word order, question words)
6. Prepositional phrases (with X, in X, for X)
7. Possessive constructions (my X, his/her/their X)
8. Relative clauses (who, that, which)
9. Conditional (if, would)
10. Perfect aspect (have done)
11. Compound tenses (multiple auxiliaries)
12. Reflexive verbs (myself, yourself)
13. Comparative/superlative (more, most, -er, -est)
14. Quantifiers (a little, much, many)
15. Time expressions (today, yesterday, tomorrow)

**For each pattern:**
- Document in `/docs/Phase3_Pattern_Library.md`
- Include examples from all 4 languages
- Specify LEGO decomposition strategy
- Note exceptions/edge cases

---

## ITERATION EXECUTION

### First Pass - Analysis

**Read all 4 LEGO_BREAKDOWNS files:**
1. Run all 8 quality gates
2. Generate violation reports
3. Identify patterns
4. Score each language (violations per gate)

**Output:**
```
/docs/Phase3_QA_Iteration_01_Analysis.md
```

Include:
- Violations by gate (with counts)
- Cross-language inconsistencies
- Patterns discovered
- Priority fixes (FD violations = highest priority)

---

### Second Pass - Refinement

**Based on analysis:**
1. Fix all FD_LOOP violations (GATE 1) - CRITICAL
2. Fix all IRON RULE violations (GATE 2) - CRITICAL
3. Fix glue word violations (GATE 3) - CRITICAL
4. Apply cross-language consistency (GATE 4)
5. Document and validate CHUNK UP patterns (GATE 5)
6. Clean up FEEDERs (GATE 6)
7. Add missing hierarchy (GATE 7)
8. Fix tiling failures (GATE 8)

**Update all 4 LEGO_BREAKDOWNS files**

**Output:**
```
/docs/Phase3_QA_Iteration_01_Fixes.md
```

Document:
- What was fixed
- Why
- Pattern applied
- Before/after examples

---

### Third Pass - Verification

**Re-run all 8 quality gates on updated files:**
1. Count remaining violations per gate
2. Compare to previous iteration
3. Document improvement percentage

**If all gates pass ✅:**
- DONE! Move to final documentation

**If violations remain:**
- Analyze why fixes didn't work
- Adjust strategy
- Iterate again (up to 5 total iterations)

---

## FINAL DELIVERABLES

### 1. Refined LEGO Decompositions
```
/vfs/courses/{lang}_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json (updated)
```

All 4 languages, production-ready quality.

### 2. Quality Assurance Report
```
/docs/Phase3_QA_Final_Report.md
```

Include:
- Total iterations performed
- Violations fixed per gate (before/after counts)
- Final quality scores (should be 100% or 95%+ with documented exceptions)
- Improvement percentage
- Remaining issues (if any) with explanations

### 3. Pattern Library
```
/docs/Phase3_Pattern_Library.md
```

Comprehensive patterns (15+ documented) with:
- Pattern name
- When to apply
- How to decompose
- Examples from all 4 languages
- Edge cases

### 4. Updated APML Recommendations
```
/docs/Phase3_APML_Final_Updates.md
```

Based on recursive refinement findings:
- Patterns to add to APML
- Clarifications needed
- New examples to include
- Gate validation rules to add

### 5. Language-Specific Notes
```
/docs/Phase3_Language_Specific_Insights.md
```

Document unique challenges per language:
- **Italian:** What makes it different from Spanish/French?
- **Spanish:** ser/estar, por/para patterns
- **French:** Contractions, tu/vous consistency
- **Mandarin:** Aspect markers, measure words, topic-comment, how FD works without conjugation

---

## SUCCESS CRITERIA

### Quality Gates - All must achieve ≥95%

- ✅ FD_LOOP: 100% pass rate (0 violations)
- ✅ IRON RULE: 100% compliance (0 violations)
- ✅ Glue words: 100% contained (0 violations)
- ✅ Cross-language consistency: ≥95% (minor acceptable differences)
- ✅ CHUNK UP: All patterns documented, correctly applied
- ✅ FEEDER quality: ≥95% are FD + helpful
- ✅ Hierarchy: ≥95% complete build-up paths
- ✅ Tiling: 100% seeds reconstruct perfectly

### Documentation

- ✅ Pattern library: ≥15 patterns, all 4 languages
- ✅ QA report: Complete iteration history
- ✅ APML updates: ≥10 concrete recommendations
- ✅ Language insights: Unique challenges per language

### Cross-Language Validation

- ✅ Parallel seeds decomposed consistently
- ✅ Common patterns applied uniformly
- ✅ FD principles work across all language families

---

## EXECUTION STRATEGY

**Time budget:** 2-4 hours per iteration × up to 5 iterations = 10-20 hours max

**Optimization tips:**
1. **Batch fix** common violations (e.g., if "Vuole" appears 10x with gender issue, fix all at once)
2. **Pattern-first** approach (identify pattern, apply everywhere, then check)
3. **Language-by-language** deep dives (perfect Italian, use as reference for Spanish/French)
4. **Mandarin separately** (different enough to benefit from focused attention)

**Recommended order:**
1. Iteration 1: Fix all CRITICAL violations (FD, IRON RULE, glue words)
2. Iteration 2: Cross-language consistency + pattern application
3. Iteration 3: FEEDER cleanup + hierarchy completion
4. Iteration 4: Edge case refinement
5. Iteration 5: Final polish (if needed)

---

## STOPPING CRITERIA

**STOP and declare SUCCESS when:**
- All 8 quality gates ≥95% pass
- Pattern library complete (15+ patterns)
- All documentation delivered
- No CRITICAL violations remain (FD, IRON RULE, glue words)

**STOP and declare DONE (with caveats) when:**
- 5 iterations complete
- Improvement plateau (<5% improvement in last iteration)
- Remaining violations documented as acceptable exceptions

---

## OUTPUT TRACKING

**Create iteration tracking file:**
```
/docs/Phase3_QA_Iteration_Tracker.md
```

For each iteration, log:
```markdown
## Iteration N

**Date:** [timestamp]

**Violations Found:**
- GATE 1 (FD_LOOP): X violations
- GATE 2 (IRON RULE): X violations
- GATE 3 (Glue words): X violations
- GATE 4 (Cross-lang): X violations
- GATE 5 (CHUNK UP): X violations
- GATE 6 (FEEDERs): X violations
- GATE 7 (Hierarchy): X violations
- GATE 8 (Tiling): X violations

**Fixes Applied:** [count]

**Patterns Identified:** [count]

**Next Focus:** [what to tackle in next iteration]
```

---

## QUALITY CHECKLIST (Before declaring DONE)

Run this final checklist:

- [ ] All 4 languages have LEGO_BREAKDOWNS_COMPLETE.json
- [ ] Every LEGO passes FD_LOOP test
- [ ] Zero IRON RULE violations
- [ ] Zero glue word edge violations
- [ ] Parallel seeds decomposed consistently
- [ ] Pattern library has ≥15 documented patterns
- [ ] All patterns applied across all 4 languages
- [ ] FEEDERs are FD + pedagogically helpful
- [ ] Hierarchical LEGOs build up naturally
- [ ] All seeds pass tiling test (reconstruct perfectly)
- [ ] QA report complete with iteration history
- [ ] APML update recommendations ready
- [ ] Language-specific insights documented

---

## THE ULTIMATE TEST

**Can you confidently say:**

> "These 4 Phase 3 decompositions are production-ready. Every LEGO is FD-validated, every pattern is consistent across languages, and the quality is top-drawer. I would stake my reputation on this work."

If YES → You're done! ✅

If NO → One more iteration. 🔄

---

**Remember:** Quality over speed. We're building the foundation for the entire SSi system. Get it right. 🎯
