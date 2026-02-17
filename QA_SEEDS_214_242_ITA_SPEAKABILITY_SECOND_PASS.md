# QA Report: ita_for_eng Seeds 214-242 - Second Pass (Speakability Only)

**Date**: 2026-02-09
**Scope**: USE phrases only (489 total phrases)
**Focus**: Speakability issues (grammar, word order, tense logic)
**Excluded**: Formatting issues (missing accents, punctuation, capitalization)

---

## Summary

**Total phrases analyzed**: 489
**Speakability issues found**: 2

**Pass rate**: 99.59% (487/489 phrases are speakable)

---

## Issues Found

### 1. **SEED 218** - Word Order Error
**Phrase ID**: `412a7035-b8c6-4780-a005-8be18f47ff71`
**Target text**: `mi piace passare tempo molto`
**Issue**: Word order is incorrect in Italian
**Correct**: `mi piace molto passare tempo` or `mi piace passare molto tempo`
**Severity**: UNSPEAKABLE - adverb placement is wrong

The phrase places "molto" after "tempo" which is unnatural. In Italian:
- "molto" (adverb) should come before the verb: "mi piace molto passare tempo"
- OR "molto" modifies "tempo": "mi piace passare molto tempo"

---

### 2. **SEED 234** - Tense Logic Error
**Phrase ID**: `55f87054-faef-441f-b1a9-69538327ab83`
**Target text**: `voglio parlare con te ieri sera`
**Issue**: Present tense verb with past time reference
**Correct**: `volevo parlare con te ieri sera` (I wanted to speak with you last night)
**Severity**: UNSPEAKABLE - illogical tense combination

The phrase mixes present tense "voglio" (I want) with past time "ieri sera" (last night), which is logically inconsistent. Either use past tense "volevo" or change the time reference to future/present.

---

## Formatting Issues Ignored (As Instructed)

The following systematic formatting issues were noted but NOT flagged:

1. **Missing apostrophes**: "quell uomo" (should be "quell'uomo") - 4 occurrences
2. **Missing accent marks**: "perche" (should be "perché"), "puo" (should be "può") - multiple occurrences
3. **Missing final punctuation**: Multiple phrases lack periods

These are presentation issues that don't affect speakability.

---

## Recommendations

1. **Fix the 2 unspeakable phrases** identified above
2. **Optional**: Fix systematic formatting issues in a batch operation (apostrophes, accents, punctuation)

---

## Seeds Without Issues (214-242)

Seeds with 100% speakable USE phrases:
- 214, 215, 216, 217, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 235, 236, 237, 238, 239, 240, 241, 242

Only seeds 218 and 234 have speakability issues (1 phrase each).

---

**QA Status**: CONDITIONAL PASS - 2 phrases need correction before final approval
