# QA Report: ita_for_eng Seeds 69-97 (THIRD PASS - Speakability Only)

**Date:** 2026-02-09
**Range:** Seeds 69-97 (29 seeds)
**Total USE phrases:** 539
**Issues found:** 38 (7.0% failure rate)
**Focus:** Speakability ONLY (ignoring punctuation/capitalization per commit 84ec488e)

---

## Context

This is the **THIRD QA pass** on seeds 69-97. Previous passes found 95 issues that were fixed. This pass uses the updated QA criteria (speakability only) and found 38 remaining grammar errors that make phrases unspeakable.

---

## Issue Summary by Category

| Category | Count | Description |
|----------|-------|-------------|
| **MISSING PREP** | 14 | Missing prepositions before infinitives |
| **GENDER** | 11 | Gender agreement errors (del → della) |
| **MISSING CONJ** | 9 | Missing conjunctions/connectors |
| **ELISION** | 3 | Missing elision (del amico → dell'amico) |
| **ARTICLE** | 3 | Article issues with possessives |
| **VERB FORM** | 2 | Wrong verb form (infinitive vs conjugated) |
| **VERB CONJ** | 1 | Wrong person (vuoi → vuole) |
| **REFLEXIVE** | 1 | Wrong reflexive pronoun (prendersi → prendermi) |

---

## Detailed Issue Analysis

### 1. Missing Prepositions (14 issues)

**Pattern: "pronto parlare/pensare" → needs "pronto a parlare/pensare"**
- S080: "sarò pronto parlare italiano" → "sarò pronto **a** parlare italiano"
- S080: "non sono sicuro quando sarò pronto parlare con te" (2 issues)
- S091: "non sono ancora pronto parlare/pensare" (3 phrases)

**Pattern: "sto provando + infinitive" → needs "sto provando a + infinitive"**
- S083: "sto provando ricordare" → "sto provando **a** ricordare"
- S083: "sto provando trovare" → "sto provando **a** trovare"
- S084: "sto provando ricordare/trovare" (2 phrases)
- S091: "sto provando pensare/rispondere" (4 phrases)

**Pattern: "non sono sicuro quando" → needs "non sono sicuro di quando"**
- S080: "non sono sicuro quando sarò pronto" (2 phrases)

### 2. Gender Agreement Errors (11 issues)

**Pattern: "del risposta" → should be "della risposta"** (feminine noun)
- S083: 5 phrases with "del risposta"
- S084: 1 phrase with "del risposta"
- S089: 1 phrase with "del risposta"
- S091: 3 phrases with "del risposta"
- S092: 1 phrase with "del risposta"

All instances use masculine "del" instead of feminine "della" with the feminine noun "risposta".

### 3. Missing Conjunctions (9 issues)

**Pattern: "non sono sicuro sono" → needs "non sono sicuro se sono"**
- S083: "non sono sicuro sono d'accordo" → "non sono sicuro **se** sono d'accordo"

**Pattern: "non sono sicuro che cosa" → needs "non sono sicuro di che cosa"**
- S083: "non sono sicuro che cosa hai detto"
- S084: "non sono sicuro che cosa ha detto"
- S089: "non sono sicuro che cosa aver fatto"

**Pattern: "non sono sicuro posso" → needs "non sono sicuro se posso"**
- S089: "non sono sicuro posso fare qualcosa"
- S091: "non sono sicuro posso rispondere"

**Pattern: "penso è difficile" → needs "penso che è/sia difficile"**
- S091: "penso è difficile pensare" (2 phrases)
- S092: "penso è difficile continuare"

### 4. Elision Errors (3 issues)

**Pattern: "del amico" → should be "dell'amico"** (elision before vowel)
- S083: 3 phrases with "del amico"

Italian requires elision of articles before vowels: "del" + "amico" → "dell'amico"

### 5. Article Issues (3 issues)

**Pattern: "del tuo amico"** - needs review
- S083: 3 phrases with "del tuo amico"

In Italian, possessive adjectives with family members/friends typically don't take an article, or the construction needs restructuring. This requires native speaker review.

### 6. Verb Form Errors (2 issues)

**Pattern: "che cosa aver fatto" → should use conjugated form**
- S089: "che cosa aver fatto" → "che cosa **ho fatto**"
- S089: "non sono sicuro che cosa aver fatto ma era importante"

Cannot use bare infinitive "aver fatto" in this context - needs conjugated "ho fatto" (present perfect, 1st person).

### 7. Verb Conjugation Error (1 issue)

**Pattern: "tuo amico vuoi" → should be "tuo amico vuole"**
- S083: "tuo amico vuoi imparare" → "tuo amico **vuole** imparare"

3rd person subject needs 3rd person verb form (vuole, not vuoi).

### 8. Reflexive Pronoun Error (1 issue)

**Pattern: "voglio prendersi" → should be "voglio prendermi"**
- S091: "voglio prendersi il tempo" → "voglio **prendermi** il tempo"

Reflexive pronoun must agree with subject (1st person "mi", not 3rd person "si").

---

## Seeds with Multiple Issues

| Seed | Issues | Critical Count |
|------|--------|----------------|
| S091 | 13 phrases | High |
| S083 | 13 phrases | High |
| S080 | 3 phrases | Medium |
| S084 | 4 phrases | Medium |
| S089 | 4 phrases | Medium |
| S092 | 2 phrases | Low |

**S083 and S091 are problematic seeds** with 13 flagged phrases each. These need careful review.

---

## Pattern Analysis

The issues cluster into systematic errors:

1. **Prepositional government** - Italian verbs require specific prepositions:
   - essere pronto **a** + infinitive
   - provare **a** + infinitive
   - pensare **a/di** + noun/infinitive

2. **Subordinate clause structure** - "non sono sicuro" requires:
   - "se" for yes/no questions ("se posso")
   - "di + interrogative" for wh-questions ("di che cosa", "di quando")

3. **Gender consistency** - "la risposta" is feminine throughout, must use feminine articles/prepositions

4. **Reflexive verb conjugation** - Reflexive pronouns must agree with subject person/number

---

## Recommended Actions

### Immediate Fix (38 phrases)

Run the SQL update to flag these phrases:

```sql
UPDATE course_practice_phrases
SET qa_flagged = true
WHERE id IN (
  '9ab5d714-8a46-4eee-9f86-da88a4df5bcf', '2be743e9-621f-4b78-b646-0085284ef642',
  'f1e0ab39-eb8e-4714-9d2e-104d92938cd9', '26b4437e-5b34-4c0c-b51e-a285795620d2',
  '8d75abe2-a941-4ad2-98bd-8a11a05769e3', '6464e73f-0825-4a05-b76d-5816979621d8',
  'dd53f740-f86b-4187-9ad5-1e1944398386', 'cb44c03b-73e6-44b4-b085-efc45cd010e5',
  '38ebec34-49f9-4971-809b-dbdc2b4df5f3', '97f39927-3631-45cb-81f3-5be3a4e740e3',
  '54aee680-4f55-4430-ae0a-e258139aa8a3', 'd03b4d64-04d1-474c-9e6c-3a25fddfa33c',
  '4b6fbe82-5359-4c85-8c54-546131d3e10c', 'c6d55423-a29c-4409-adfc-5dc7b9c9dc65',
  '1d1f4baa-a08e-4ffd-991f-d03721337d3a', '4e10e7bb-f29a-4e0f-adb9-b0e3756add83',
  '291e379e-d604-423b-8eac-4a37283dff4f', '96e32f7d-827f-47e3-821b-796ad125d356',
  'e86c688a-89d8-41fb-ac81-c6499e262740', 'ed609f64-e7bf-4fb9-9a9d-46da7101c3cf',
  'fc34360f-9764-46e2-9a76-8738b7d69104', '035dcfb7-a13b-42fd-ae99-de5b83b93644',
  '34067371-eec3-410c-8fdf-7402eb511824', 'b4d4168e-9653-47ce-82f2-987af82c4a3f',
  'a141103a-8a36-435d-88d0-d90ecc51dffb', '797162b6-eb9a-4fdf-8e5b-73fa754542f2',
  '016448c7-2329-47e4-a10f-6c634db136f0', '606df522-f7fb-4013-9ee2-2cea67a904aa',
  '62ed723f-3e3d-4ca7-9e8f-09b31f4e10f7', 'ba089f34-d253-4faa-9634-6c4ca2b84167',
  '27a6110c-b053-4fb4-ac09-0d88faa74fdc', '8a355de9-3ff0-4b05-af6f-f16068b7816a',
  '0f6c740e-ae74-499d-a429-d03d7505d100', '5336507e-196a-4c14-a1f7-8d1e5e2b3698',
  'b7784d67-f883-4c89-97af-c5e3729d6cdf', '92913d36-ae5d-4a29-bb57-81536244ac25',
  'e96399ff-0e87-49c0-9acf-533d35387ed5', '0fa07fc4-f2e6-4f99-97ae-a3188b8f4e71'
);
```

### Systematic Fixes Needed

1. **Verb + preposition patterns** - Review all "pronto" and "provare a" constructions
2. **Subordinate clauses** - Check all "non sono sicuro" and "penso che" phrases
3. **Gender agreement audit** - Search for all "del/della" usage with nouns
4. **Reflexive verbs** - Validate pronoun agreement throughout

### Prevention

Add validation rules to Course Builder API:
- Check prepositional government for common verbs (essere pronto a, provare a, pensare a/di)
- Validate gender agreement for articles + nouns
- Enforce subordinate clause connectors (se, che, di)
- Check reflexive pronoun agreement with subject

---

## Comparison with Previous Passes

| Pass | Issues Found | Focus |
|------|--------------|-------|
| Pass 1 | Unknown | Full QA (punctuation + grammar) |
| Pass 2 | 95 issues | Full QA (punctuation + grammar) |
| **Pass 3** | **38 issues** | **Speakability only (grammar)** |

The 38 issues in Pass 3 are **genuine grammar errors** that make phrases unspeakable. These are distinct from the punctuation/capitalization issues found in previous passes.

---

## Conclusion

**Status:** 38 phrases flagged for regeneration (7.0% of batch)

**Critical finding:** Seeds 83 and 91 each have 13 problematic phrases - these seeds need complete review and likely regeneration.

**Next steps:**
1. Flag the 38 phrases in database
2. Regenerate S083 and S091 completely
3. Fix remaining 24 phrases individually
4. Re-run QA on regenerated content

**Course quality impact:** These systematic errors (missing prepositions, gender agreement) significantly impact learnability. Fixes are essential before Phase 8 audio generation.

---

**Report generated:** 2026-02-09
**QA criteria:** Speakability only (per commit 84ec488e)
**Tool:** Automated pattern detection + manual verification
