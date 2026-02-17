# QA Report: ita_for_eng Seeds 11-39 - Third Speakability Pass
**Date:** 2026-02-09
**Scope:** USE phrases only (seeds 11-39)
**Total Phrases Checked:** 725

## Summary
- **Phrases Checked:** 725 USE phrases
- **Issues Found:** 3 grammar errors (0.41% error rate)
- **Pass Rate:** 99.59%

## Issues Found

### 1. Missing Preposition 'a' Before Infinitive
**Phrase ID:** `b713db8f-06ab-46ba-bbcd-c628d71558e1`
**Seed:** 11
**Known:** I'm trying to be able to speak with someone else.
**Target (wrong):** Sto provando poter parlare con qualcun altro.
**Target (correct):** Sto provando **a** poter parlare con qualcun altro.
**Issue:** Missing preposition 'a' before infinitive 'poter'

### 2. Indicative Instead of Subjunctive After "voglio che"
**Phrase ID:** `94ed4f75-90f5-43d9-8e64-4d59ee343cc5`
**Seed:** 15
**Known:** And I want you to finish the whole sentence tomorrow.
**Target (wrong):** E voglio che tu finisci tutta la frase domani.
**Target (correct):** E voglio che tu **finisca** tutta la frase domani.
**Issue:** Should use subjunctive 'finisca' after 'voglio che tu', not indicative 'finisci'

### 3. Infinitive Instead of Conjugated Subjunctive
**Phrase ID:** `1754ae56-153b-45bc-90be-5c06f528e36f`
**Seed:** 28
**Known:** i want you to start as soon as you can
**Target (wrong):** voglio che tu cominciare appena puoi
**Target (correct):** voglio che tu **cominci** appena puoi
**Issue:** Infinitive 'cominciare' should be conjugated subjunctive 'cominci' after 'voglio che tu'

## Notes

### Patterns Checked
- ✅ "sto provando + a + infinitive" constructions
- ✅ "voglio che + subjunctive" constructions
- ✅ "non sono sicuro" constructions (all OK - "perché" is fine, "cosa" is colloquial but acceptable)
- ✅ "spero che + future/subjunctive" (both acceptable in Italian)
- ✅ Verb agreements
- ✅ Subordinate clause structures

### Patterns That Are Correct (Not Flagged)
- "Non sono sicuro perché..." - correct (direct 'why')
- "Non sono sicuro cosa succederà" - colloquial but acceptable in spoken Italian
- "Spero che finirai" - future indicative is acceptable with 'sperare' (subjunctive also OK)

## Recommendation
Fix the 3 grammar errors before proceeding with audio generation. These are genuine errors that would make the phrases unspeakable or confusing to learners.

## Status
⚠️ **NEEDS FIXES** - 3 phrases require correction before audio generation
