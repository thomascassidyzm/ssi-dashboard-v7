# QA FINAL REPORT: ita_for_eng Seeds 243-271
**Date:** 2026-02-09  
**QA Pass:** Third (Final Verification - Speakability Only)  
**Scope:** 401 USE phrases across 29 seeds  
**Quality:** 99.0% (397/401 speakable)

---

## Summary

Third and final QA pass completed on ita_for_eng seeds 243-271. This pass focused exclusively on **speakability** - flagging only phrases that contain grammar errors making them unspeakable in Italian. Punctuation and capitalization issues were ignored per updated QA guidelines.

### Results
- **Total phrases reviewed:** 401 USE phrases
- **Issues found:** 4 unspeakable errors
- **Speakability rate:** 99.0% (397/401 good)
- **All phrases marked as checked:** ✅ (591 total phrases including BUILD/INTRO/PRES)

---

## Issues Flagged

### 1. S248 - Missing Article (Grammar Error)
**Phrase ID:** `b4b9c9be-2077-49a5-b887-4433e77652af`  
**Current:** `pensavo che il film fosse schifezza e voglio indietro i miei soldi`  
**Should be:** `pensavo che il film fosse **una** schifezza e voglio indietro i miei soldi`  
**Issue:** Italian requires an article before predicate nouns  
**Severity:** ERROR  

### 2. S252 - Missing Accent (Grammar Error)
**Phrase ID:** `79d1044a-28a9-4ad3-9f39-d74892a07ddc`  
**Current:** `qualcuno ha detto che e pronto a cominciare`  
**Should be:** `qualcuno ha detto che **è** pronto a cominciare`  
**Issue:** Missing accent on "è" (to be) changes meaning to "and"  
**Severity:** ERROR  

### 3. S253 - Missing Accent (Grammar Error)
**Phrase ID:** `9bf8fa41-6d1f-4639-9d2a-f5ecc309d478`  
**Current:** `saro pronto tra qualche minuto`  
**Should be:** `**sarò** pronto tra qualche minuto`  
**Issue:** Missing accent on future tense verb "sarò"  
**Severity:** ERROR  

### 4. S266 - Wrong Auxiliary (Grammar Error)
**Phrase ID:** `ace513ce-ae1e-4678-8b51-9c02baa626f0`  
**Current:** `era provando a parlare italiano`  
**Should be:** `**stava** provando a parlare italiano`  
**Issue:** Italian imperfect continuous requires "stare" (stava) not "essere" (era) with gerund  
**Severity:** ERROR  

---

## Seed Coverage

All 29 seeds reviewed:
- S243: ask for something ✓
- S244: learnt a lot already ✓
- S245: happy with ✓
- S246: wanted her to help but too busy ✓
- S247: thought book was fairly good ✓
- S248: the film (1 issue - missing article)
- S249: want you to help me ✓
- S250: before I answer ✓
- S251: until / find it out ✓
- S252: when will you be ready (1 issue - missing accent)
- S253: should be ready / in a few minutes (1 issue - missing accent)
- S254: have been ready ✓
- S255: you'll be ready ✓
- S256: think I'll be ready ✓
- S257: that blue thing ✓
- S258: what's that ✓
- S259: an idea ✓
- S260: the faintest idea ✓
- S261: might be ✓
- S262: who was that ✓
- S263: who you mean ✓
- S265: a friend ✓
- S266: old friend (1 issue - wrong auxiliary)
- S267: have you heard from ✓
- S268: email ✓
- S269: why don't you want ✓
- S270: going to be late / worried that ✓
- S271: would you like ✓

**Note:** S264 appears to be missing from the course

---

## Notable Patterns (All Good)

### Complex Subjunctive (Excellent)
- S246: "volevo che lei ti aiutasse" - perfect subjunctive after volere che
- S247: "pensavo che quel libro fosse abbastanza buono" - subjunctive after pensare
- S248: "qualcuno ha detto che il film fosse" - subjunctive in reported speech

### Relative Clauses (Natural)
- S262: "quell'uomo con cui parlavi" - "the man you were talking to"
- S266: "un vecchio amico di mio padre" - "an old friend of my father"

### Conditional Structures
- S271: "ti piacerebbe" - conditional for polite requests (would you like)
- S270: "arriverò in ritardo se aspetto" - future + present conditional

### Idiomatic Expressions
- S260: "non ho la minima idea" - "I don't have the faintest idea"
- S248: "voglio indietro i miei soldi" - "I want my money back"
- S267: "hai avuto notizie da" - "have you heard from"

---

## QA Methodology

This third pass applied the updated QA guidelines from Feb 9, 2026:
1. **Ignore punctuation/capitalization** - These are presentation issues, not speakability
2. **Focus on grammar only** - Flag only true errors that make phrases unspeakable
3. **Use phonetic normalization** - Consider spoken form, not written form

All 4 flagged issues are genuine grammar errors that would make the phrases sound wrong to native speakers. The remaining 397 phrases are all naturally speakable Italian.

---

## Actions Taken

1. ✅ Reviewed all 401 USE phrases in seeds 243-271
2. ✅ Flagged 4 grammar errors via `POST /api/qa/flag`
3. ✅ Marked all 591 phrases (all roles) as checked via `POST /api/qa/bulk-mark-checked`
4. ✅ All flags have suggested fixes in the `details` field

---

## Next Steps

1. **Fixer Agent** should resolve the 4 flagged issues:
   - Query: `GET /api/qa/flags/ita_for_eng/pending`
   - Fix each phrase and mark as resolved
2. Continue with seeds 272-300 (final batch for 300-seed MVP)

---

**QA Pass Status:** ✅ COMPLETE  
**Ready for Fixer Agent:** YES  
**Ready for Next Batch:** YES
