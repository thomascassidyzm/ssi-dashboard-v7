# QA Report: ita_for_eng Seeds 272-300
**Date:** 2026-02-09
**Reviewer:** Claude Agent
**Scope:** Final 29 seeds (S272-S300) - 370 USE phrases
**Focus:** Unspeakable phrases only (ignore punctuation/capitalization)

---

## Executive Summary

**Total Phrases:** 370 USE phrases
**Issues Found:** 8 phrases (2.2%)
  - **Critical Grammar Errors:** 6 phrases (subjunctive mood violations)
  - **Awkward Constructions:** 2 phrases (ambiguous pronouns)

**Overall Quality:** 97.8% - Good, but requires fixes for subjunctive errors

---

## Critical Issues (Must Fix)

### S273: Subjunctive Error
**Phrase ID:** `ca98408c-effc-40fb-ac4e-7abefe8220d8`
**English:** "It seems I have too much work today."
**Italian (WRONG):** "Mi sembra che ho troppo lavoro oggi."
**Issue:** "mi sembra che" requires SUBJUNCTIVE mood, not indicative
**Fix:** "Mi sembra che **abbia** troppo lavoro oggi."

---

### S277: Subjunctive Error
**Phrase ID:** `5eaf319c-fc4d-4b17-97e7-be63ff7c0135`
**English:** "It seems I have a meeting now."
**Italian (WRONG):** "Mi sembra che ho una riunione adesso."
**Issue:** Same as S273 - "mi sembra che" requires subjunctive
**Fix:** "Mi sembra che **abbia** una riunione adesso."

---

### S294: Subjunctive Errors (2 phrases)

#### Phrase 1
**Phrase ID:** `47339bd9-27d4-43d1-8788-b2719c978275`
**English:** "I hope I'll have enough time."
**Italian (WRONG):** "spero ho abbastanza tempo"
**Issue:** "sperare" requires SUBJUNCTIVE or "di + infinitive", not indicative
**Fix:** "spero **di avere** abbastanza tempo" OR "spero che io **abbia** abbastanza tempo"

#### Phrase 2
**Phrase ID:** `ba2433ba-d11c-4fcb-bc44-39daa318b53c`
**English:** "I hope I'll have time to call you."
**Italian (WRONG):** "spero ho tempo per chiamarti"
**Issue:** Same - "sperare" requires subjunctive/di+infinitive
**Fix:** "spero **di avere** tempo per chiamarti"

---

### S296: Subjunctive Error
**Phrase ID:** `b161e607-012a-4746-a524-6b3737ef52e2`
**English:** "I hope I have a little more time."
**Italian (WRONG):** "spero ho un po' più di tempo"
**Issue:** "sperare" requires subjunctive/di+infinitive
**Fix:** "spero **di avere** un po' più di tempo"

---

## Awkward Constructions (Should Fix)

### S274: Ambiguous Pronoun Usage

#### Issue 1: "quello" as direct object
**Phrase ID:** `fb02ce2a-eead-4c82-8b08-b3d84d656e49`
**English:** "i want to do that in a few days"
**Italian (AWKWARD):** "voglio fare quello tra qualche giorno"
**Issue:** "quello" used as direct object of "fare" is unclear/awkward
**Fix:** "voglio **farlo** tra qualche giorno" OR "voglio fare **questo** tra qualche giorno"

#### Issue 2: "quello" as time reference
**Phrase ID:** `783e411d-865e-48c0-b85e-be573face9fa`
**English:** "do you have to leave after that"
**Italian (AWKWARD):** "devi partire dopo quello"
**Issue:** "dopo quello" as time reference is awkward
**Fix:** "devi partire **dopo**" OR "devi partire dopo **questo**" OR "devi partire dopo **di quello**"

---

## Borderline Issues (Context-Dependent)

### S274: "ho bisogno di" + infinitive + time
**Phrase ID:** `7b94ceae-475c-4fab-b5b9-0ed30e56f376`
**English:** "i need to work in a few days"
**Italian:** "ho bisogno di lavorare tra qualche giorno"
**Issue:** Slightly awkward - suggests "needing to work in the future" rather than "needing to schedule work"
**Status:** Context-dependent - might be acceptable depending on intended meaning
**Alternative:** "devo lavorare tra qualche giorno" (if the meaning is obligation/necessity)

---

### S275: "mi sembra di" + infinitive
**Examples:**
- "Mi sembra di aspettare più a lungo adesso."
- "Mi sembra di stare più a lungo oggi."

**Issue:** "mi sembra di" + infinitive might sound slightly unnatural (like "it seems to me that I...")
**Analysis:** These constructions ARE grammatically valid - "mi sembra di + infinitive" expresses impression/feeling
**Status:** ACCEPTABLE - not clearly wrong, though could be more natural as "Mi sembra che aspetto/sto..."

---

## Grammar Patterns Found

### Subjunctive Triggers Violated
1. **"mi sembra che"** + indicative ❌ → requires subjunctive
2. **"sperare"** + indicative ❌ → requires subjunctive OR "di + infinitive"

### Other Patterns Checked (No Issues)
- ✅ "penso che" constructions (correct)
- ✅ "voglio dire che" + indicative (correct)
- ✅ "mi chiedo se" + indicative (correct)
- ✅ Relative clauses "persone che/a cui" (correct)
- ✅ "alla maggior parte delle persone" (correct)
- ✅ Past tense usage (correct)

---

## Seed-by-Seed Summary

| Seed | Issues | Status |
|------|--------|--------|
| S272 | None | ✅ Pass |
| S273 | 1 subjunctive error | ⚠️ Fix required |
| S274 | 2 awkward, 1 borderline | ⚠️ Fix recommended |
| S275 | 2 borderline (acceptable) | ✅ Pass |
| S276-277 | 1 subjunctive error (S277) | ⚠️ Fix required |
| S278-293 | None | ✅ Pass |
| S294 | 2 subjunctive errors | ⚠️ Fix required |
| S295 | None | ✅ Pass |
| S296 | 1 subjunctive error | ⚠️ Fix required |
| S297-300 | None | ✅ Pass |

---

## Sample Phrases Checked (No Issues)

Excellent quality found in:
- S279: Complex causative constructions with "perché" ✅
- S280: Past obligation "dovevo" ✅
- S286-288: Relative clauses "persone a cui piace", "alla maggior parte delle persone" ✅
- S289: "mi chiedo se" conditionals ✅
- S296-297: Reported speech "ho detto che" ✅
- S298: "non ho più niente" constructions ✅
- S299-300: Modal verbs + infinitive ✅

---

## Recommendations

### Immediate Actions Required
1. **Fix 6 subjunctive errors** (S273, S277, S294×2, S296) - CRITICAL
2. **Fix 2 awkward "quello" constructions** (S274) - HIGH PRIORITY

### Optional Improvements
3. Review "ho bisogno di lavorare tra..." construction (S274) - consider alternative
4. S275 "mi sembra di" constructions are acceptable but could be more natural

### Database Updates Needed
The Course Builder API should **validate subjunctive mood** after verbs like:
- "mi sembra che", "mi pare che"
- "spero che", "temo che", "credo che" (in certain contexts)
- "voglio che", "preferisco che"

---

## Conclusion

Seeds 272-300 show **strong overall quality (97.8%)** but have a **systematic issue with subjunctive mood** in phrases using "mi sembra che" and "sperare".

This pattern suggests the AI agent may need explicit guidance about subjunctive triggers in Italian during phrase generation.

**Status:** ⚠️ **CONDITIONAL PASS** - fixes required for 6 critical grammar errors before production release.

---

**Next Steps:**
1. Fix the 6 subjunctive errors in database
2. Update Course Builder prompt to emphasize Italian subjunctive rules
3. Re-run QA check on fixed phrases
4. Proceed to audio generation once fixes confirmed
