# ZUT Compliance: Action Plan & Remediation Checklist

**Generated:** 2026-02-02
**Status:** READY FOR IMPLEMENTATION
**Target:** Achieve >99% ZUT compliance across all courses

---

## Quick Stats

- **Current Overall Compliance:** 98.24%
- **Target Compliance:** >99%
- **Total Violations to Fix:** 857
- **Courses Affected:** 5
- **Estimated Impact:** Eliminating top 20 violating words would achieve target

---

## Implementation Priority

### 🔴 CRITICAL (Fix First - Highest Impact)

#### 1. eng_for_ara: Add "every" LEGO
**Impact:** Fixes 272/405 violations (67% of all violations in this course)
**Effort:** Low (add 1 A-type LEGO)

**Action:**
```
Course: eng_for_ara
Seed: S0055 (or any seed before S0061)
Add A-type LEGO:
  - known_text: "every"
  - target_text: "كل" (Arabic for "every")
  - type: "A"
```

**Validation:**
- Re-run ZUT analysis
- eng_for_ara fail rate should drop from 3.74% to ~1.2%

---

#### 2. deu_for_eng: Restructure S0041 (Feeling/Emotions)
**Impact:** Fixes 25/162 violations (15% of all violations)
**Effort:** Medium (restructure entire seed)

**Current Problem:**
- S0041 uses "fühle" (feel) without introducing it first
- Also uses "müde" (tired) without introduction
- 62.50% of phrases in this seed violate ZUT

**Action:**
```
Course: deu_for_eng
Seed: S0041

Step 1: Add LEGOs in correct order
L1: "fühlen" / "to feel" (M-type)
    Components: ["fühle" / "feel"]
L2: "müde" / "tired" (A-type)

Step 2: Regenerate practice phrases using only:
- Previously taught vocabulary
- "fühle" (from L1)
- "müde" (from L2)
```

**Validation:**
- S0041 violation rate should drop to <5%
- deu_for_eng overall fail rate should drop from 1.75% to ~1.5%

---

#### 3. eng_for_ara: Add "something" LEGO
**Impact:** Fixes 6/405 violations in S0004
**Effort:** Low (add 1 A-type LEGO)

**Action:**
```
Course: eng_for_ara
Seed: S0003 (before S0004)
Add A-type LEGO:
  - known_text: "something"
  - target_text: "شيء ما" (Arabic for "something")
  - type: "A"
```

---

#### 4. deu_for_eng: Add "sich" (Reflexive Pronoun)
**Impact:** Fixes ~30 violations across multiple seeds
**Effort:** Low (add 1 A-type LEGO)

**Action:**
```
Course: deu_for_eng
Seed: S0005 (before S0006)
Add A-type LEGO:
  - known_text: "oneself"
  - target_text: "sich"
  - type: "A"
  - teaching_note: "German reflexive pronoun (myself, yourself, themselves)"
```

---

### 🟡 HIGH PRIORITY (Fix Next - Good Impact/Effort Ratio)

#### 5. eng_for_deu: Add "the" Article
**Impact:** Fixes 82/183 violations (45% of all violations)
**Effort:** Low

**Action:**
```
Course: eng_for_deu
Seed: S0001-S0003 (very early)
Add A-type LEGO:
  - known_text: "der/die/das" (or "bestimmter Artikel")
  - target_text: "the"
  - type: "A"
  - teaching_note: "English definite article (like der/die/das)"
```

---

#### 6. ALL COURSES: Fix Contraction Tokenization
**Impact:** Fixes ~70 violations across multiple courses
**Effort:** Medium (code change)

**Action:**
Modify tokenization logic in `scripts/analyze-zut-compliance.cjs`:

```javascript
function tokenizeText(text, courseCode) {
  if (!text) return [];

  const targetLang = courseCode.split('_for_')[0];

  // Character-based languages
  if (targetLang === 'ara' || targetLang === 'zho') {
    return text.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (code >= 0x0600 && code <= 0x06FF) ||
             (code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF);
    });
  }

  // Word-based languages
  // NEW: Don't split on apostrophes (keep contractions intact)
  return text.toLowerCase()
    .split(/[\s.,!?;:()\[\]{}"]+/)  // REMOVED: '
    .filter(word => word.length > 0 && /[a-zàâäæçéèêëïîôùûüÿœ]/i.test(word));
}
```

**Testing:**
- "couldn't" should remain as single token
- "didn't" should remain as single token
- "I'll" should remain as single token

---

#### 7. eng_for_ara: Add "in" Preposition
**Impact:** Fixes 6/405 violations
**Effort:** Low

**Action:**
```
Course: eng_for_ara
Seed: S0003 (before S0004)
Add A-type LEGO:
  - known_text: "in"
  - target_text: "في" (Arabic for "in")
  - type: "A"
```

---

#### 8. eng_for_ara: Add "am" (be verb)
**Impact:** Fixes 42/405 violations
**Effort:** Low

**Action:**
```
Course: eng_for_ara
Seed: S0001-S0002 (very early)
Add A-type LEGO:
  - known_text: "am"
  - target_text: "أنا" (or relevant Arabic form)
  - type: "A"
  - teaching_note: "First person singular present of 'be'"
```

---

### 🟢 MEDIUM PRIORITY (Fix When Time Permits)

#### 9. deu_for_eng: Add "bis" (until)
**Impact:** Small (~5 violations)
**Effort:** Low

**Action:**
```
Course: deu_for_eng
Seed: S0024 (before S0025)
Add A-type LEGO:
  - known_text: "until"
  - target_text: "bis"
  - type: "A"
```

---

#### 10. deu_for_eng: Add "dass" (that/conjunction)
**Impact:** Small (~5 violations)
**Effort:** Low

**Action:**
```
Course: deu_for_eng
Seed: S0014 (before S0015)
Add A-type LEGO:
  - known_text: "that" (conjunction)
  - target_text: "dass"
  - type: "A"
```

---

#### 11. bre_for_fra: Investigate Particle Handling
**Impact:** 100 violations (particles y, v, n, ar)
**Effort:** High (requires linguistic analysis)

**Action:**
1. **Research Phase:** Consult Breton linguistics expert
   - Are these true particles or mutation artifacts?
   - Should they be taught separately or as part of words?

2. **Decision Matrix:**
   - If **separate particles:** Add as A-type LEGOs early
   - If **mutations:** Adjust tokenizer to keep with base word
   - If **both:** Handle case-by-case

3. **Implementation:** Based on research findings

**Notes:**
- Breton has initial consonant mutations (lenition, spirantization)
- Particle system is complex
- May need custom tokenization logic for Celtic languages

---

## Implementation Workflow

### Phase 1: Quick Wins (Week 1)
1. Add missing A-type LEGOs (items 1, 3, 4, 5, 7, 8, 9, 10)
2. Run ZUT analysis after each addition
3. Verify violation counts drop as expected

**Expected Result:** Overall compliance >98.8%

---

### Phase 2: Structural Fixes (Week 2)
1. Restructure deu_for_eng S0041 (item 2)
2. Fix contraction tokenization (item 6)
3. Re-run full ZUT analysis

**Expected Result:** Overall compliance >99%

---

### Phase 3: Language-Specific (Week 3-4)
1. Breton particle investigation (item 11)
2. Implement Breton-specific fixes
3. Final validation

**Expected Result:** Overall compliance >99.5%

---

## Validation Protocol

After each fix, run:

```bash
node scripts/analyze-zut-compliance.cjs
```

Check:
1. **Overall pass rate improved?** (target: >99%)
2. **Specific course improved?** (check course detail)
3. **No new violations introduced?** (compare violation lists)

---

## Course Builder API Integration

Once fixes are validated, integrate ZUT checking into Course Builder API:

```javascript
// Add to course-builder-api.cjs validation gates

async function validateZUTCompliance(courseCode, seedNumber, legos, phrases) {
  // Build vocabulary up to this point
  const vocab = await buildVocabularyUpToSeed(courseCode, seedNumber);

  // Check each phrase
  for (const phrase of phrases) {
    const tokens = tokenizeText(phrase.target_text, courseCode);
    const unknownTokens = tokens.filter(t => !vocab.has(t));

    if (unknownTokens.length > 0) {
      throw new Error(`ZUT violation: Phrase contains untaught words: ${unknownTokens.join(', ')}`);
    }
  }

  return { pass: true, message: 'ZUT compliance validated' };
}
```

This prevents new ZUT violations from being introduced.

---

## Success Metrics

### Current State
- Overall pass rate: 98.24%
- Courses with <98% compliance: 1 (eng_for_ara)
- Seeds with >50% violations: 2 (deu_for_eng S0041, S0040)

### Target State (After All Fixes)
- Overall pass rate: >99%
- All courses: >99% compliance
- No seed with >10% violations
- No LEGO with >20% violations

### Stretch Goal
- Overall pass rate: >99.5%
- All courses: >99.5% compliance
- No seed with >5% violations

---

## Estimated Effort

| Phase | Tasks | Effort | Impact |
|-------|-------|--------|--------|
| Phase 1 | Add 8 A-type LEGOs | 2-3 hours | +0.6% compliance |
| Phase 2 | Restructure S0041 + tokenizer | 4-6 hours | +0.3% compliance |
| Phase 3 | Breton investigation | 8-12 hours | +0.1% compliance |
| **Total** | **All fixes** | **14-21 hours** | **+1.0% compliance** |

**ROI:** Moderate effort for significant quality improvement.

---

## Dependencies

- **Database Access:** Supabase for reading/updating LEGOs
- **Course Builder API:** For adding new LEGOs
- **Testing:** Re-run analysis after each change

---

## Risk Assessment

### Low Risk Changes
- Adding new A-type LEGOs (items 1, 3, 4, 5, 7, 8, 9, 10)
  - No existing phrases affected
  - Only expands vocabulary earlier

### Medium Risk Changes
- Restructuring S0041 (item 2)
  - Affects existing phrases
  - Need to regenerate audio
  - Test thoroughly before release

### High Risk Changes
- Tokenizer changes (item 6)
  - Affects all courses globally
  - Test extensively
  - Consider rolling back if issues arise

---

## Rollback Plan

If any change causes problems:

1. **Database:** Revert LEGO changes via Supabase
2. **Tokenizer:** Git revert to previous version
3. **Testing:** Re-run full validation suite

Keep backups before making changes.

---

## Communication

### Notify Stakeholders
- Course authors: Changes to early seeds
- QA team: New validation rules
- Learners: No impact (seamless improvement)

---

## Next Steps

1. **Review this action plan** with team
2. **Prioritize fixes** based on effort/impact
3. **Assign tasks** to team members
4. **Begin Phase 1** (quick wins)
5. **Track progress** in project management tool

---

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Status:** READY FOR IMPLEMENTATION
