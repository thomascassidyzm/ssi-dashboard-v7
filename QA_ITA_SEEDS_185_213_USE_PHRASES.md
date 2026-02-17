# QA Report: ita_for_eng Seeds 185-213 USE Phrases
**Date:** 2026-02-09  
**Scope:** Second QA pass - Speakability check only  
**Methodology:** Ignore punctuation, capitalization, formatting  

---

## Summary

- **Total USE phrases reviewed:** 524
- **Phrases flagged:** 4
- **Pass rate:** 99.2% (520/524)

---

## Critical Issues Found

All issues are **HIGH SEVERITY** grammar errors that make phrases unspeakable.

### 1. S195 L2 - Gender/Number Mismatch
**Phrase ID:** `dc7793b7-db31-4a26-8292-a8bafe47fffe`  
**Known:** "I saw the money in the office."  
**Target:** `le ho viste i soldi in ufficio.`

**Problem:** 
- "le ho viste" (feminine plural past participle)
- "i soldi" (masculine plural noun)
- Gender mismatch makes this ungrammatical

**Fix:** 
- "li ho visti i soldi in ufficio" (masculine plural agreement), OR
- "ho visto i soldi in ufficio" (no clitic, simpler)

---

### 2. S197 L1 - Gender/Number Mismatch
**Phrase ID:** `3f376845-7860-4903-b49f-b37191f78e02`  
**Known:** "I saw my son in the office this morning."  
**Target:** `le ho viste mio figlio in ufficio stamattina.`

**Problem:**
- "le ho viste" (feminine plural)
- "mio figlio" (masculine singular)
- Double mismatch: gender AND number

**Fix:**
- "ho visto mio figlio in ufficio stamattina" (no clitic), OR
- "l'ho visto in ufficio stamattina" (masculine singular clitic)

---

### 3. S198 L1 - Number Mismatch
**Phrase ID:** `06662a1b-cfbe-424b-8236-743df246426e`  
**Known:** "I saw my daughter in the office this morning."  
**Target:** `le ho viste mia figlia in ufficio stamattina.`

**Problem:**
- "le ho viste" (plural)
- "mia figlia" (singular)
- Number mismatch

**Fix:**
- "ho visto mia figlia in ufficio stamattina" (no clitic), OR
- "l'ho vista in ufficio stamattina" (feminine singular clitic)

---

### 4. S204 L1 - Wrong Verb Form
**Phrase ID:** `6f37da3b-5eb1-48c1-acd3-09557ed4cc8f`  
**Known:** "I wanted her to find the money in the office."  
**Target:** `volevo che lei trovare i soldi in ufficio.`

**Problem:**
- "che lei trovare" - infinitive after "che"
- After "volevo che" requires subjunctive, not infinitive
- This is fundamentally ungrammatical Italian

**Fix:**
- "volevo che lei trovasse i soldi in ufficio" (imperfect subjunctive)

---

## Pattern Analysis

### Root Cause: LEGO "le ho viste" (S195)
The LEGO "le ho viste" (L2 in S195) appears to be incorrectly decomposed or generated. It was then reused in subsequent seeds:
- S195 L2: First appearance
- S197 L1: Reused (incorrectly with masculine noun)
- S198 L1: Reused (incorrectly with singular noun)

**Action Required:**
1. Fix the LEGO "le ho viste" in S195
2. Verify downstream usage in S197, S198
3. Consider whether this LEGO should be gender-flexible ("ho visto" without clitic)

### Subjunctive Issue (S204)
The subjunctive construction "volevo che + subjunctive" is a known challenge in Italian. The phrase uses infinitive incorrectly.

---

## False Positives Reviewed

The automated check flagged 11 additional phrases that were **FALSE POSITIVES**:

### "in ufficio" - Idiomatic (No Article)
Seeds: 194, 195, 197, 198, 199, 203, 204  
**Verdict:** All correct - "in ufficio" is standard Italian (like "a casa", "in città")

### "tu sei" - Correct Conjugation
Seed: 188  
**Verdict:** Correct - "tu sei" is proper 2nd person form

---

## Recommendations

1. **Immediate:** Fix the 4 flagged phrases (all HIGH severity)
2. **LEGO audit:** Review S195 L2 decomposition ("le ho viste")
3. **Methodology:** Add subjunctive validation to Course Builder
4. **Pattern:** Check for clitic+noun agreement across all Italian seeds

---

## Verdict

**CONDITIONAL PASS** - 99.2% quality with 4 critical grammar errors requiring fixes.

All 4 issues are past participle agreement errors or verb mood errors that would be immediately noticeable to native speakers. These must be fixed before audio generation.

---

**QA Agent:** claude-sonnet-4.5  
**Session:** 2026-02-09 22:55 UTC

---

## Technical Details

### S195 L2 LEGO - "i soldi" (the money)

The LEGO "i soldi" (the money) has these BUILD phrases:
- "voglio i soldi" (I want the money)
- "trovare i soldi" (to find the money)  
- "i soldi oggi" (the money today)

The problematic USE phrase:
- **"le ho viste i soldi in ufficio"** ← WRONG AGREEMENT

The error is in the USE phrase, NOT the LEGO itself. The LEGO "i soldi" is correct.

The issue: The phrase generator used "le ho viste" (feminine plural) with "i soldi" (masculine plural).

### Correct Forms of "vedere" (to see) + "i soldi"
- "ho visto i soldi" (simple past, no clitic) ✓
- "li ho visti" (clitic + agreement: masc plural) ✓
- "le ho viste i soldi" (clitic mismatch: fem plural) ✗

### S204 L1 - Subjunctive After "volevo che"

Italian grammar rule: "volere che + subjunctive"
- "volevo che lei trovasse" ✓ (imperfect subjunctive)
- "volevo che lei trovare" ✗ (infinitive - ungrammatical)

---

## Next Steps

1. **Manual fix:** Update the 4 phrase texts in `course_practice_phrases` table
2. **LEGO review:** No LEGO changes needed - LEGOs are correct
3. **Prevention:** Add past participle agreement validation to Course Builder
4. **Audit:** Scan all Italian seeds for similar clitic+noun mismatches

