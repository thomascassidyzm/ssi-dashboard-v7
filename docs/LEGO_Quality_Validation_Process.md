# LEGO Breakdowns Quality Validation Process

**Date:** 2025-10-15
**Version:** 1.0
**Purpose:** Quality assurance for Phase 3 LEGO decompositions

---

## 🎯 Overview

The LEGO validation process ensures that Phase 3 decompositions meet all APML specifications through automated quality checks. Given that agent-based generation is non-deterministic, this process supports iterative refinement.

---

## 📋 Validation Script

**Location:** `/vfs/courses/validate-lego-breakdowns.cjs`

### Usage

```bash
# Validate single course
node validate-lego-breakdowns.cjs spa_for_eng_30seeds

# Validate all courses
node validate-lego-breakdowns.cjs --all
```

---

## ✅ Quality Checks Performed

### 1. **FD_LOOP Compliance** (CRITICAL)

Tests Forward-Deterministic loop: Target → Known → Target must be IDENTICAL

**Checks:**
- Subjunctive/conditional forms have proper context
  - ❌ BAD: "pueda" / "I can" (ambiguous: puedo/pueda/podría/pude)
  - ✅ GOOD: "en cuanto pueda" / "as soon as I can" (context makes FD clear)

- Gender-ambiguous words include noun
  - ❌ BAD: "su" / "their" (whose? his? her? their?)
  - ✅ GOOD: "su nombre" / "their name" (FD clear)

- No standalone articles
  - ❌ BAD: "el" / "the" (the what?)
  - ✅ GOOD: "el nombre" / "the name"

### 2. **IRON RULE Compliance** (CRITICAL)

No standalone prepositions without objects

**Checks:**
- ❌ BAD: "con" / "with" (with what/whom?)
- ✅ GOOD: "con te" / "with you" (complete prepositional phrase)

### 3. **Translation Synchronization** (CRITICAL)

LEGO breakdown matches `translations.json`

**Checks:**
- `original_target` matches translation target language
- `original_known` matches translation known language

### 4. **Structure Validation** (HIGH)

All required fields present and valid

**Checks:**
- `lego_id` present and unique
- `lego_type` is "BASE" or "COMPOSITE"
- `target_chunk` and `known_chunk` non-empty
- `fd_validated` is boolean

### 5. **COMPOSITE Validation** (MEDIUM)

COMPOSITE LEGOs have proper explanations

**Checks:**
- COMPOSITE has `componentization` explanation OR
- COMPOSITE components appear in `feeder_pairs`

### 6. **CHUNK UP Principle** (HIGH)

Context-dependent forms properly chunked

**Known Patterns:**
- Spanish subjunctive: pueda, puedas, hable, hables
- Italian subjunctive: fossi, sia
- French subjunctive: sois, soit

---

## 📊 Issue Severity Levels

### CRITICAL
- **Impact:** Breaks FD_LOOP or IRON RULE
- **Action:** MUST fix before production
- **Examples:**
  - Standalone prepositions
  - FD validation failures
  - Empty chunks

### HIGH
- **Impact:** Major quality issues
- **Action:** Should fix before production
- **Examples:**
  - Translation mismatches
  - Missing required fields

### MEDIUM
- **Impact:** Reduces pedagogical quality
- **Action:** Fix if time permits
- **Examples:**
  - Missing componentization explanations
  - Suboptimal LEGO chunking

### LOW
- **Impact:** Minor issues
- **Action:** Optional improvements
- **Examples:**
  - Missing optional feeder_pairs
  - Style inconsistencies

---

## 🔄 Iterative Quality Process

### Initial Generation

```bash
# 1. Generate LEGO decompositions with agent
# (Already done for spa/ita/fra/cmn)

# 2. Run validation
node validate-lego-breakdowns.cjs spa_for_eng_30seeds
```

### If Validation Fails

```bash
# 1. Review critical/high priority issues
node validate-lego-breakdowns.cjs spa_for_eng_30seeds

# 2. Fix manually OR regenerate problematic seeds
# Manual fix example: Edit LEGO_BREAKDOWNS_COMPLETE.json directly

# 3. Re-validate
node validate-lego-breakdowns.cjs spa_for_eng_30seeds
```

### Regeneration Strategy

If multiple seeds have issues, consider regenerating with improved prompt:

```bash
# 1. Document specific issues found
# 2. Update APML Phase 3 prompt with examples
# 3. Regenerate with agent
# 4. Validate again
```

### Non-Determinism Handling

Agent generation is non-deterministic, so:

1. **Accept Good Enough:** If validation passes (no CRITICAL/HIGH), ship it
2. **Regenerate Selectively:** Only regenerate seeds with CRITICAL issues
3. **Multiple Passes:** If needed, run generation 2-3 times and pick best output
4. **Document Patterns:** Track common failure modes to improve prompts

---

## 📈 Current Status (2025-10-15)

### Validation Results

| Course | Status | Critical | High | Medium | Low |
|--------|--------|----------|------|--------|-----|
| **Spanish** | ✅ PASS | 0 | 0 | 0 | 2 |
| **Italian** | ✅ PASS | 0 | 0 | 0 | 2 |
| **French** | ✅ PASS | 0 | 0 | 0 | 2 |
| **Mandarin** | ✅ PASS | 0 | 0 | 0 | 6 |

**Overall:** ✅ All 4 languages production-ready

---

## 🛠️ Extending the Validator

### Adding New Checks

Edit `/vfs/courses/validate-lego-breakdowns.cjs`:

```javascript
// Add to validateLegoPair() function
if (myCustomCheck(lego)) {
  issues.push({
    type: 'MY_CUSTOM_CHECK',
    severity: 'MEDIUM',
    lego_id: lego.lego_id,
    message: 'Description of issue'
  });
}
```

### Adding Language-Specific Rules

```javascript
// Add to CONTEXT_AMBIGUOUS object
const CONTEXT_AMBIGUOUS = {
  // Existing...

  // German subjunctive
  'wäre': ['wenn ich wäre', 'als ob ich wäre'],

  // Add your patterns
};
```

---

## 🎓 Best Practices

### When to Regenerate

**Regenerate if:**
- ✅ >10% of seeds have CRITICAL issues
- ✅ Systematic pattern of FD violations
- ✅ Multiple IRON RULE violations

**Don't regenerate if:**
- ❌ Only LOW priority issues
- ❌ 1-2 isolated MEDIUM issues (fix manually)
- ❌ Validation passes

### Quality vs. Time Trade-off

- **Seeds 1-30:** Very strict (these are first learner exposure)
- **Seeds 31-100:** Strict (building foundation)
- **Seeds 101+:** More lenient (learner has context)

For beginner seeds (1-30), **zero tolerance** for CRITICAL/HIGH issues.

---

## 📝 Example Validation Run

```bash
$ node validate-lego-breakdowns.cjs spa_for_eng_30seeds

══════════════════════════════════════════════════════════════
LEGO BREAKDOWNS VALIDATION REPORT
Course: spa_for_eng_30seeds
══════════════════════════════════════════════════════════════

SUMMARY
  Total Issues: 2
  CRITICAL: 0
  HIGH: 0
  MEDIUM: 0
  LOW: 2

ℹ️  MEDIUM/LOW PRIORITY ISSUES
  0 medium priority, 2 low priority
  Run with --verbose to see all issues

══════════════════════════════════════════════════════════════
✅ VALIDATION PASSED - No critical or high-priority issues
══════════════════════════════════════════════════════════════
```

---

## 🔮 Future Enhancements

### Automated Fixes
- Auto-suggest CHUNK UP fixes for subjunctive forms
- Auto-detect and fix translation sync issues

### LLM-Powered FD Testing
- Use LLM to actually perform Target → Known → Target translation
- Compare with expected output for true FD validation

### Regression Testing
- Store validation results
- Alert on quality degradation
- Track improvement over time

### Integration
- CI/CD pipeline integration
- Pre-commit hooks for LEGO changes
- GitHub Actions for PR validation

---

## ✅ Checklist: Shipping New Language

Before shipping LEGO decompositions:

- [ ] Run `node validate-lego-breakdowns.cjs <course>`
- [ ] Verify **0 CRITICAL** issues
- [ ] Verify **0 HIGH** issues
- [ ] Review MEDIUM issues (fix if time permits)
- [ ] Spot-check 5-10 random seeds manually
- [ ] Verify translations sync with `translations.json`
- [ ] Test S0028-S0029 specifically (common FD failure points)
- [ ] Document any known LOW priority issues

---

**Generated:** 2025-10-15
**Author:** Claude Code + APML v7.6
**Status:** ✅ Production-ready
