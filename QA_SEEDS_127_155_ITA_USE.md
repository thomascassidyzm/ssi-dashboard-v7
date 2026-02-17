# QA Report: ita_for_eng Seeds 127-155 (USE Phrases) - Second Pass

**Total Phrases Reviewed:** 608 USE phrases  
**QA Date:** 2026-02-09  
**Focus:** Speakability only (grammar, fragments, mismatches)  
**Excluded:** Formatting (punctuation, capitalization)  

---

## Executive Summary

**Issues Found:** 19 phrases with speakability problems (3.1% failure rate)

### Issue Breakdown

| Issue Type | Count | Seeds Affected | Severity |
|------------|-------|----------------|----------|
| Agreement (plural) | 6 | S137 | **HIGH** - Ungrammatical |
| Article-noun mismatch | 3 | S131 | **HIGH** - Ungrammatical |
| Reflexive error | 8 | S154 | **HIGH** - Wrong meaning |
| Double object | 2 | S152 | MEDIUM - Awkward |

**Overall Quality:** 96.9% (589/608 phrases error-free)

---

## Detailed Issues

### 1. Agreement Error: "essere perfetti" (S137L2) - 6 instances

**Problem:** Using plural adjective "perfetti" with singular subject (io/tu)

**All Affected Phrases:**
1. "Voglio essere perfetti adesso" (EN: I want to be perfect now)
2. "Voglio essere perfetti presto" (EN: I want to be perfect soon)
3. "Non voglio essere perfetti" (EN: I don't want to be perfect)
4. "Non posso essere perfetti" (EN: I can't be perfect)
5. "Vuoi essere perfetti?" (EN: Do you want to be perfect?)
6. "Puoi essere perfetti" (EN: You can be perfect)

**Fix Required:** "perfetti" → "perfetto" (masculine) or "perfetta" (feminine)

**Example:**
- ❌ "Non voglio essere perfetti"
- ✅ "Non voglio essere perfetto"

**Severity:** HIGH - Grammatically incorrect, unnatural

---

### 2. Article-Noun Disagreement: "la tua idee" (S131L1) - 3 instances

**Problem:** Feminine singular possessive "la tua" with plural noun "idee"

**All Affected Phrases:**
1. "sono entusiasta di la tua idee" (EN: i'm excited about your ideas)
2. "voglio provare la tua idee" (EN: i want to try your ideas)
3. "pensavo che la tua idee fosse molto bene" (EN: i thought your ideas were very good)

**Fix Required:** "la tua idee" → "le tue idee"

**Example:**
- ❌ "sono entusiasta di la tua idee"
- ✅ "sono entusiasta delle tue idee"

**Severity:** HIGH - Grammatically incorrect

---

### 3. Reflexive Verb Error: "incontrarti" used as "meet" (S154L2) - 8 instances

**Problem:** Using reflexive "incontrarti" (meet yourself/to meet you) when meaning "meet each other"

**All Affected Phrases (S154L2):**
1. "dove vuoi incontrarti la prossima settimana" (where do you want to meet next week)
2. "dove vuoi incontrarti oggi" (where do you want to meet today)
3. "dove vuoi incontrarti questa settimana" (where do you want to meet this week)
4. "dove vuoi incontrarti" (where do you want to meet)
5. "dove vuoi incontrarti sabato sera" (where do you want to meet on saturday night)
6. "dove vuoi incontrarti dopo" (where do you want to meet later)
7. "dove vuoi incontrarti domani" (where do you want to meet tomorrow)
8. "dove vuoi incontrarti sabato" (where do you want to meet on saturday)

**Fix Required:** Rephrase for clarity

**Example:**
- ❌ "dove vuoi incontrarti domani" (literally: where do you want to meet yourself tomorrow)
- ✅ "dove vuoi che ci incontriamo domani" (where do you want us to meet tomorrow)
- ✅ "dove ci incontriamo domani" (where shall we meet tomorrow)

**Severity:** HIGH - Changes meaning (meet yourself vs meet each other)

**Note:** "Voglio incontrarti domani mattina" (S155L4) is CORRECT - means "I want to meet you"

---

### 4. Double Object Redundancy: "l'avrei fatto quello" (S152L1) - 2 instances

**Problem:** Using both clitic pronoun "l'" (it) and demonstrative "quello" (that) together

**All Affected Phrases:**
1. "L'avrei fatto quello che volevi" (I would have done what you wanted)
2. "L'avrei fatto quello ieri" (I would have done that yesterday)

**Fix Options:**
- Remove "l'": "Avrei fatto quello che volevi" / "Avrei fatto quello ieri"
- Remove "quello": "L'avrei fatto ieri" (but loses "what you wanted" specificity in #1)

**Severity:** MEDIUM - Awkward/redundant but potentially acceptable in informal speech

---

## Flagging Summary

### High Priority - Must Fix (17 phrases)

**S131L1** (3 phrases):
- Fix "la tua idee" → "le tue idee"

**S137L2** (6 phrases):
- Fix "essere perfetti" → "essere perfetto"

**S154L2** (8 phrases):
- Fix "dove vuoi incontrarti" → "dove vuoi che ci incontriamo" or similar

### Medium Priority - Should Fix (2 phrases)

**S152L1** (2 phrases):
- Simplify double object constructions

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Total USE phrases reviewed | 608 |
| Error-free phrases | 589 |
| Phrases with issues | 19 |
| **Success rate** | **96.9%** |
| Seeds with issues | 4 (out of 29) |
| Seeds error-free | 25 (86.2%) |

---

## Observations

1. **Most seeds are excellent** - 25/29 seeds (86%) have zero speakability issues
2. **Issues are concentrated** - All 19 errors occur in just 4 LEGOs across 4 seeds
3. **Systematic LEGO errors** - Each problem affects ALL phrases in that LEGO, suggesting LEGO-level fixes rather than phrase-level
4. **Grammar focus** - All high-priority issues are grammatical agreement/choice errors
5. **No translation mismatches** - English-Italian meaning correspondence is accurate throughout

---

## Recommendations

1. **Fix at LEGO level** - Since errors affect entire LEGOs, regenerate the problematic LEGOs:
   - S131L1: Regenerate with correct "le tue idee"
   - S137L2: Regenerate with correct "perfetto"
   - S154L2: Regenerate with correct reciprocal construction
   - S152L1: Optional - review for clarity

2. **Validation pattern** - Add agreement checks for:
   - Possessive adjective number (la tua/le tue + noun)
   - Subject-adjective number (io + perfetto, not perfetti)
   - Reflexive vs. object pronouns (incontrarti vs. incontrarci)

3. **No systematic issues** - The high success rate (96.9%) suggests course generation is working well; these are isolated LEGO-level errors, not methodology problems

---

**QA Status:** COMPLETE  
**Recommended Action:** Flag 4 LEGOs for regeneration (S131L1, S137L2, S154L2, S152L1)

