# eng_for_X Rounds 1-10 Quality Review

**Date:** 2026-01-30
**Reviewer:** Claude Sonnet 4.5
**Courses Reviewed:** 7 (por, spa, fra, deu, ara, jpn, zho)

---

## Review Criteria

1. **ZUT (Zero Untaught Tokens)** - No vocabulary before introduction
2. **One-to-One Mapping** - Each known → exactly one target
3. **Progressive BUILD** - Combinations with previous LEGOs only
4. **Translation Accuracy** - Natural, correct translations
5. **LEGO Breakdown** - Sensible, reusable chunks
6. **Pattern Adherence** - Follows spa_for_eng structure
7. **Grammar** - Both languages correct
8. **Semantic Equivalence** - Translations match

---

## 🔴 CRITICAL ISSUES

### eng_for_spa (Spanish → English) - **FAIL**

**Multiple ZUT Violations:**

| Round | Line | Issue |
|-------|------|-------|
| R1 | 347 | "mas" (more) NOT introduced - ZUT violation |
| R1 | 348 | "No" (not) NOT introduced - ZUT violation |
| R2 | 369 | "Hablo" (I speak) - wrong conjugation, not introduced |
| R2 | 370 | "aprender" (learn) used in R2 but introduced in R6! |
| R3 | 396-397 | "estar" (to be), "poder" (can) NOT introduced |

**Assessment:** Agent is inventing vocabulary freely. Not following ZUT at all.

---

### eng_for_ara (Arabic → English) - **STRUCTURAL ERROR**

**Missing LEGO in Sequence:**

```
Round 7: S0003L01 - "كيف" (how)
Round 8: S0003L03 - "قدر الإمكان" (as much as possible)
          ↑ SKIPPED S0003L02 (to speak)!
```

Seed S0003 = "how to speak as much as possible" but L02 (speak) was never introduced as part of this seed.

**Assessment:** Incomplete LEGO coverage for seed.

---

## 🟡 MODERATE ISSUES

### eng_for_por (Portuguese → English)

**Translation Error:**
- Round 10, line 442: "falar algo" → "say something"
  - **Wrong verb:** "falar" = speak, should use "dizer" = say

**Undocumented LEGO:**
- Round 10, line 432: "em inglês" (in English)
  - Uses "em" (in) which wasn't introduced as separate LEGO
  - Appears out of nowhere in BUILD phrase

**Assessment:** Minor errors, fixable.

---

### eng_for_fra (French → English)

**Article Usage:**
- Round 6, line 322: "apprendre l'anglais" (learn English)
  - Uses "l'" (the) which wasn't introduced
  - French requires article before "anglais"

**Partial LEGO Usage:**
- Uses "L01-partial" notation extensively
- Sometimes unclear what "partial" means

**Assessment:** Linguistically correct but methodology unclear.

---

### eng_for_deu (German → English)

**ZUT Violation:**
- Round 7, line 390: "ich will wissen wie man spricht"
  - "wissen" (to know) NOT introduced
  - Should only use introduced vocabulary

**Assessment:** Single violation, otherwise clean.

---

## 🟢 GOOD (Minor Issues)

### eng_for_jpn (Japanese → English)

**Methodology Deviation:**
- Japanese verb forms bundle concepts: 話したい = "want" + "to speak"
- Agent treats これas single LEGO, which is linguistically correct for Japanese
- But doesn't align with teaching English via LEGO pairs

**Assessment:** Structurally sound, but methodology question about bundled forms.

---

### eng_for_zho (Chinese → English)

**Structure:** Clean
**ZUT Compliance:** ✅
**Translations:** Natural
**BUILD Pattern:** Correct

**Minor Note:**
- Shows component breakdown within LEGOs (e.g., R1 shows 我, 想, 说 before "我想说")
- This is actually pedagogically helpful

**Assessment:** **BEST IN CLASS** - No significant issues.

---

## ✅ SUMMARY TABLE

| Course | ZUT | Structure | Translation | Grade | Status |
|--------|-----|-----------|-------------|-------|--------|
| **eng_for_zho** | ✅ | ✅ | ✅ | **A** | **PASS** |
| **eng_for_jpn** | ✅ | ✅ | ⚠️ | **B+** | PASS (methodology note) |
| **eng_for_por** | ⚠️ | ✅ | ⚠️ | **C+** | NEEDS FIXES |
| **eng_for_fra** | ⚠️ | ✅ | ✅ | **C+** | NEEDS FIXES |
| **eng_for_deu** | ⚠️ | ✅ | ✅ | **C+** | NEEDS FIXES |
| **eng_for_ara** | ⚠️ | ❌ | ✅ | **D** | NEEDS REBUILD |
| **eng_for_spa** | ❌ | ⚠️ | ✅ | **F** | **FAIL - REBUILD** |

---

## 🎯 RECOMMENDATIONS

### Immediate Actions

1. **eng_for_spa - REBUILD REQUIRED**
   - Agent didn't understand ZUT constraint
   - Too many violations to fix surgically
   - Use eng_for_zho approach as template

2. **eng_for_ara - FIX LEGO SEQUENCE**
   - Add missing S0003L02 (speak)
   - Renumber subsequent LEGOs
   - Regenerate affected rounds

3. **eng_for_por, eng_for_fra, eng_for_deu - MINOR FIXES**
   - Fix specific ZUT violations
   - Clarify article/preposition handling
   - Document partial LEGO usage rules

### Methodology Clarifications Needed

1. **Partial LEGO Usage**
   - When can you use part of a compound LEGO?
   - French "je veux parler" → can we use "je veux" alone?
   - Need clear rules

2. **Articles and Prepositions**
   - Languages require articles (French "l'anglais", Spanish "el inglés")
   - Are these separate LEGOs or attached to nouns?
   - Need policy decision

3. **Language-Specific Grammar**
   - Japanese verb conjugations bundle concepts (たい form)
   - How to handle in LEGO-pair methodology?
   - May need language-specific rules

---

## 📊 PATTERN ANALYSIS

**What Worked:**
- Simple, atomic LEGOs (single words)
- Clear INTRO → LEGO → BUILD progression
- Component breakdown for M-type LEGOs (zho, jpn)

**What Failed:**
- Agents inventing vocabulary mid-round
- Unclear rules about grammatical particles
- Skipping LEGOs in sequences

**Best Example:** eng_for_zho
- Clean structure
- Respects ZUT strictly
- Shows components without over-complicating
- Natural Chinese translations

**Worst Example:** eng_for_spa
- Ignored ZUT completely
- Added complexity that wasn't needed
- Tried to be "complete" instead of "correct"

---

## 🔧 FIXES REQUIRED

### Priority 1 - MUST FIX

```
eng_for_spa → Full rebuild using eng_for_zho template
eng_for_ara → Add S0003L02, regenerate R8-R10
```

### Priority 2 - SHOULD FIX

```
eng_for_por → Fix R10 "falar/dizer" confusion, document "em"
eng_for_fra → Clarify article policy, document partial usage
eng_for_deu → Remove R7 "wissen" usage, use only introduced verbs
```

### Priority 3 - METHODOLOGY

```
- Define partial LEGO usage rules
- Define article/preposition handling
- Consider language-specific grammar guidelines
```

---

## ✅ VERDICT

**2 out of 7 courses are production-ready** (zho, jpn with caveat)

**3 out of 7 need minor fixes** (por, fra, deu)

**2 out of 7 need significant work** (ara needs fixes, spa needs rebuild)

**Overall:** The simplified prompt approach WORKS when agents follow it (zho), but fails when agents try to be creative (spa). Need stronger ZUT enforcement.

---

**Next Step:** Fix spa and ara, clarify methodology for articles/particles, then test on full 668 seeds.
