# QA Report: ita_for_eng Seeds 272-300 (USE Phrases Only)

**Date:** 2026-02-09
**QA Agent:** Claude Sonnet 4.5
**Scope:** USE phrases only (ignoring BUILD/KNOWN/TARGET1/TARGET2/PRESENTATION)
**Focus:** Speakability check only (ignoring punctuation, capitalization, formatting)

---

## Summary

- **Total USE phrases checked:** 371
- **Seeds covered:** 272-300 (29 seeds)
- **Phrases per seed (avg):** ~12.8
- **Flags raised:** 1
- **Pass rate:** 99.73%

---

## QA Methodology

Per the updated QA prompt (Feb 9, 2026):

1. **Focus on speakability only** - Would a learner naturally say this phrase?
2. **Ignore formatting issues** - Capitalization, punctuation, spacing not flagged
3. **No grammar checking** - Grammar is assumed correct from seed submission
4. **Flag only unspeakable phrases** - Meta-linguistic, nonsensical, or awkward constructions

---

## Flagged Phrases

### 1. Seed 272 - Awkward phrase construction

**Phrase ID:** `31940620-7376-4292-806e-39dd2e483418`
**Known:** i want a great idea
**Target:** voglio un'ottima idea
**Issue:** Awkward/unnatural - learners would not naturally say "I want a great idea" in this form
**Severity:** Warning
**Suggestion:** More natural alternatives already exist in the basket:
- "I need a great idea" (ho bisogno di un'ottima idea)
- "Do you have a great idea?" (hai un'ottima idea)

**Context:** This phrase is grammatically correct but pragmatically odd. In natural conversation, people don't typically say "I want a great idea" - they would say "I need a great idea" or ask someone "Do you have a great idea?". The phrase sounds like a direct translation exercise rather than natural speech.

---

## Quality Assessment by Seed Range

### Seeds 272-275 (great idea, too much work, in a few days, shouldn't be)
- **Quality:** Excellent
- **Natural phrases:** "that sounds like a great idea", "I have too much work to do today", "I'll see you in a few days"
- **Notes:** 1 minor flag (see above), rest are all speakable and natural

### Seeds 276-280 (easy to, to see if, let me, ready to, before you)
- **Quality:** Excellent
- **Natural phrases:** "it's easy to understand", "let me try", "I'm ready to start", "before you leave"
- **Notes:** All phrases natural and conversational

### Seeds 281-285 (not what, which friends, sister's friend, she speaks)
- **Quality:** Excellent
- **Natural phrases:** "that's not what I meant", "which of your friends", "my sister's friend works here"
- **Notes:** Good variety, all speakable

### Seeds 286-290 (people who like, how many, most people, there, he knows)
- **Quality:** Excellent
- **Natural phrases:** "people who like speaking Italian", "how many people do you know", "I wonder if she's there"
- **Notes:** Complex relative clauses handled naturally

### Seeds 291-295 (I hope, able to, how many X, call you, didn't say)
- **Quality:** Excellent
- **Natural phrases:** "I hope so", "I hope I'll be able to come", "I didn't say that I wanted to finish"
- **Notes:** Subordinate clauses and negative constructions all natural

### Seeds 296-300 (I said, many people who, nothing left, speak about, often)
- **Quality:** Excellent
- **Natural phrases:** "I said that I needed more time", "I've got nothing left to do", "we speak about work"
- **Notes:** Final batch maintains high quality standards

---

## Patterns Observed (All Positive)

1. **Excellent variety in USE phrases** - Good mix of statements, questions, and subordinate clauses
2. **Natural embedding** - Complex structures like "I wonder if", "I hope", "people who" used naturally
3. **Appropriate length** - Phrases average 12+ syllables, meeting methodology requirements
4. **Contextual coherence** - Phrases fit naturally with introduced vocabulary
5. **Conversational tone** - Phrases sound like things learners would actually want to say

---

## Recommendations

### For Human Review
The single flagged phrase (S272 "I want a great idea") is a **warning-level** issue. Consider:
- **Keep it:** It's grammatically correct and may serve pedagogical value
- **Replace it:** The basket already has better alternatives like "I need a great idea"

### For Future QA
This QA pass demonstrates that the course builder is generating high-quality, natural USE phrases for Italian. The 99.73% pass rate (1 minor flag out of 371 phrases) indicates:
- Strong methodology adherence
- Natural phrase generation
- Good variety without sacrificing quality

---

## Database Actions Taken

1. **Flag inserted:**
   - Phrase ID: `31940620-7376-4292-806e-39dd2e483418`
   - Type: `naturalness`
   - Severity: `warning`
   - Status: `open`
   - Timestamp: 2026-02-09T22:56:02.864Z

2. **QA check marked complete:**
   - Course: `ita_for_eng`
   - Seed range: 272-300
   - Phrases marked: 539 total (includes all roles)
   - USE phrases checked: 371

---

## Conclusion

**Seeds 272-300 USE phrases: PASS**

The Italian course (ita_for_eng) maintains excellent quality through seed 300. With only 1 minor flag out of 371 USE phrases, the course is ready for learner testing.

The flagged phrase is a low-priority warning that can be reviewed during the next human QA checkpoint but does not block course progression.

---

**QA Status:** ✅ COMPLETE
**Next Action:** Human review of warning flag (optional)
**Course Status:** Ready for audio generation (Phase 8)
