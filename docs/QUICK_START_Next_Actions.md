# QUICK START - Next Actions Priority List

**Last Updated:** October 15, 2025
**Status:** Phase 1 & Phase 3 Complete - Ready for Production

---

## ✅ What's Complete

- 4 language courses (Italian, Spanish, French, Mandarin)
- 120 seed pairs (30 per language)
- ~350 FD-validated LEGO decompositions
- 100% critical quality compliance
- 18 cross-language patterns documented
- 10 APML enhancement recommendations

---

## 🚨 PRIORITY 1: Critical Updates (Do This Week)

### 1. Update APML - IRON RULE Examples
**File:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`
**Section:** Line ~865 (IRON RULE)
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 10-59)

**Add:**
- Explicit list of forbidden standalone prepositions (Italian, Spanish, French)
- Correct vs. incorrect examples
- Exception for FEEDERs

**Why:** This single violation pattern caused 50% of all critical failures

---

### 2. Update APML - Gender Neutrality
**File:** `ssi-course-production.apml`
**Section:** Line ~616 (FD_LOOP GENDER section)
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 176-214)

**Add:**
- MANDATORY requirement for gender-neutral third-person
- ✅ / ❌ examples
- FD_LOOP test protocol

**Why:** 100% compliance required for FD across Romance languages

---

### 3. Update APML - Pattern Library Reference
**File:** `ssi-course-production.apml`
**Section:** Line ~1245+ (Phase 3 PROMPT)
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 261-314)

**Add to Phase 3 prompt:**
```
Before decomposing each seed:
1. Consult Pattern Library (/docs/Phase3_Pattern_Library.md)
2. Check if structure matches documented pattern
3. Follow established decomposition strategy
```

**Why:** 18 documented patterns will reduce iteration time and ensure consistency

---

### 4. Update APML - Quality Checklist
**File:** `ssi-course-production.apml`
**Section:** End of Phase 3 PROMPT (line ~1300+)
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 317-349)

**Add pre-finalization checklist:**
- Critical items (100% required)
- Quality items (95%+ target)
- Documentation requirements

**Why:** Catch violations before finalization

---

## 🔧 PRIORITY 2: System Improvements (Next 2-3 Weeks)

### 5. Implement LEGO Type Taxonomy
**What:** Add `lego_type` metadata field to JSON schema
**Options:** `BASE` | `COMPOSITE` | `FEEDER`
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 111-173)

**Impact:**
- Enables accurate tiling tests
- Clearer pedagogical intent
- Eliminates 46 false-positive tiling failures

---

### 6. Whitelist Grammaticalized Constructions
**What:** Add approved exceptions to glue word tests
**Examples:** `Sto per` (Italian), `Voy a` (Spanish)
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 62-108)

**Impact:** Reduces 3 false positives in glue word gate

---

### 7. Improve Tiling Algorithm
**What:** Update to distinguish BASE from COMPOSITE LEGOs
**Source:** `docs/Phase3_APML_Final_Updates.md` (lines 353-414)

**Algorithm:**
```python
# Select largest non-overlapping LEGOs only
# Exclude LEGOs that are substrings of others
# Concatenate BASE LEGOs for tiling test
```

---

### 8. Automated FD_LOOP Testing
**What:** Create automated test via translation API
**Process:**
1. Send known_chunk → target language
2. Verify matches target_chunk
3. Send target_chunk → known language
4. Verify matches known_chunk
5. Flag failures for manual review

---

## 📊 PRIORITY 3: Validation (Week 4)

### 9. Test Updated APML
**What:** Generate new 10-seed test set with updated APML
**Verify:**
- Zero standalone preposition violations
- 100% gender neutrality compliance
- Pattern library correctly applied
- Quality checklist prevents violations

---

### 10. Run Full QA Suite
**What:** Execute all 8 quality gates on new test set
**Expected:**
- 100% pass on critical gates (FD_LOOP, IRON RULE, Glue Words)
- 95%+ pass on quality gates
- New patterns documented if discovered

---

## 📁 Key Files Reference

### Completed Courses
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
```

### Documentation (Read These)
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/
├── EXECUTIVE_SUMMARY_Phase1_Phase3_Complete.md ⭐ START HERE
├── Phase3_QA_Final_Report.md (17KB)
├── Phase3_Pattern_Library.md (15KB) ⭐ REFERENCE OFTEN
├── Phase3_APML_Final_Updates.md (20KB) ⭐ IMPLEMENTATION GUIDE
├── Phase3_Language_Specific_Insights.md (25KB)
├── Phase3_Cross_Language_Patterns.md (22KB)
└── Phase3_QA_Iteration_Tracker.md (11KB)
```

### APML to Update
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml
```

---

## 🎯 Success Criteria

**After Priority 1 Updates:**
- [ ] IRON RULE has explicit examples
- [ ] Gender neutrality is mandatory requirement
- [ ] Pattern Library is referenced in Phase 3 prompt
- [ ] Quality checklist is in Phase 3 workflow

**After Priority 2 Improvements:**
- [ ] LEGO type taxonomy implemented
- [ ] Grammaticalized whitelist added
- [ ] Tiling algorithm improved
- [ ] Automated FD_LOOP testing available

**After Priority 3 Validation:**
- [ ] New test set: 100% critical compliance
- [ ] New test set: 95%+ quality compliance
- [ ] Pattern library updated with new discoveries
- [ ] Ready for scaling to more languages

---

## 💡 Key Principles to Remember

1. **FD_LOOP is King:** If it fails target → known → target, CHUNK UP
2. **No Standalone Prepositions:** EVER (use FEEDERs instead)
3. **Gender Neutral Third Person:** "Wants" not "He wants"
4. **Consult Pattern Library:** Before decomposing new seeds
5. **Run Quality Checklist:** Before finalizing any LEGO breakdown

---

## 📞 Questions? Check These First

**Q: How do I know if a preposition is standalone?**
A: Check docs/Phase3_APML_Final_Updates.md lines 10-59

**Q: What patterns are documented?**
A: See docs/Phase3_Pattern_Library.md - 18 patterns with examples

**Q: Why did Italian/Spanish/French show inconsistency?**
A: Check docs/Phase3_Language_Specific_Insights.md - hierarchical vs. flat structures

**Q: What's the difference between BASE and COMPOSITE LEGOs?**
A: See docs/Phase3_APML_Final_Updates.md lines 111-173

**Q: How do I test FD_LOOP?**
A: target_chunk → known_chunk → target_chunk must be IDENTICAL

---

## 🚀 Ready to Scale

**Current Status:** 4 languages, 100% critical compliance, production-ready

**Next Language Candidates:**
- German (Germanic family)
- Portuguese (Romance family - should follow Spanish/French patterns)
- Japanese (different typology - will test universality)
- Arabic (Semitic family - new pattern discovery)

**Expected Quality with Updated APML:**
- 100% critical compliance (no manual fixes needed)
- 95%+ quality gates (first iteration)
- Faster generation time (pattern library reference)
- Consistent cross-language decomposition

---

**The foundation is validated. Time to scale.** 🎯
