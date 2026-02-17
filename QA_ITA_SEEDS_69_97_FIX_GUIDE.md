# Quick Fix Guide: ita_for_eng Seeds 69-97

## Pattern-Based Fixes

### 1. Gender Agreement: "del risposta" → "della risposta" (11 fixes)

**Find:** `del risposta`
**Replace:** `della risposta`

**Affected phrases:**
- S083: 5 phrases
- S084: 1 phrase
- S089: 1 phrase
- S091: 3 phrases
- S092: 1 phrase

**Rule:** "la risposta" is feminine → use "della" not "del"

---

### 2. Missing Preposition: "sto provando" + infinitive (7 fixes)

**Find:** `sto provando ricordare` → `sto provando a ricordare`
**Find:** `sto provando trovare` → `sto provando a trovare`
**Find:** `sto provando pensare` → `sto provando a pensare`
**Find:** `sto provando rispondere` → `sto provando a rispondere`

**Affected phrases:**
- S083: 2 phrases
- S084: 2 phrases
- S091: 3 phrases

**Rule:** "provare" requires "a" before infinitive

---

### 3. Missing Preposition: "pronto" + infinitive (5 fixes)

**Find:** `pronto parlare` → `pronto a parlare`
**Find:** `pronto pensare` → `pronto a pensare`

**Affected phrases:**
- S080: 2 phrases
- S091: 3 phrases

**Rule:** "essere pronto" requires "a" before infinitive

---

### 4. Elision: "del amico" → "dell'amico" (3 fixes)

**Find:** `del amico`
**Replace:** `dell'amico`

**Affected phrases:**
- S083: 3 phrases

**Rule:** Elision before vowels: "del" + "amico" → "dell'amico"

---

### 5. Subordinate Clauses: "non sono sicuro" constructions (6 fixes)

**Pattern A:** `non sono sicuro che cosa` → `non sono sicuro di che cosa`
- S083: 1 phrase
- S084: 1 phrase
- S089: 1 phrase

**Pattern B:** `non sono sicuro posso` → `non sono sicuro se posso`
- S089: 1 phrase
- S091: 1 phrase

**Pattern C:** `non sono sicuro quando` → `non sono sicuro di quando`
- S080: 2 phrases

**Pattern D:** `non sono sicuro sono` → `non sono sicuro se sono` OR `non sono sicuro di essere`
- S083: 1 phrase

**Rules:**
- wh-questions: use "di" (di che cosa, di quando)
- yes/no: use "se" (se posso, se sono)

---

### 6. Missing "che": "penso è difficile" (3 fixes)

**Find:** `penso è difficile`
**Replace:** `penso che è difficile` OR `penso che sia difficile` (subjunctive)

**Affected phrases:**
- S091: 2 phrases
- S092: 1 phrase

**Rule:** "pensare/credere" requires "che" before subordinate clause

---

### 7. Verb Form: "che cosa aver fatto" (2 fixes)

**Find:** `che cosa aver fatto`
**Replace:** `che cosa ho fatto`

**Affected phrases:**
- S089: 2 phrases

**Rule:** Cannot use bare infinitive "aver fatto" - needs conjugated form

---

### 8. Individual Fixes (3 phrases)

#### S083: Verb Conjugation
**Find:** `tuo amico vuoi imparare`
**Replace:** `tuo amico vuole imparare`
**Rule:** 3rd person subject → 3rd person verb

#### S083: Article with Possessive (3 phrases)
**Current:** `del tuo amico`
**Issue:** Needs native speaker review
**Options:**
- Remove article: "di tuo amico" (if family/close friend)
- Keep but restructure: "dell'amico tuo"
- Context-dependent fix

#### S091: Reflexive Pronoun
**Find:** `voglio prendersi il tempo`
**Replace:** `voglio prendermi il tempo`
**Rule:** 1st person subject → 1st person reflexive pronoun

---

## Regeneration Priorities

### HIGH PRIORITY - Complete Regeneration

**S083 (14 phrases flagged):**
- Multiple systematic errors
- Gender, elision, prepositions, verb conjugation
- Recommend: Regenerate entire seed

**S091 (11 phrases flagged):**
- Multiple systematic errors
- Prepositions, subordinate clauses, gender
- Recommend: Regenerate entire seed

### MEDIUM PRIORITY - Individual Fixes

**S080 (3 phrases):**
- Pattern: Missing "a" with "pronto"
- Pattern: Missing "di" with "non sono sicuro quando"

**S084 (4 phrases):**
- Pattern: Missing "a" with "sto provando"
- Pattern: Missing "di" with "non sono sicuro che cosa"

**S089 (4 phrases):**
- Pattern: Wrong verb form "aver fatto"
- Pattern: Gender "del risposta"
- Pattern: Missing "se/di" with "non sono sicuro"

**S092 (2 phrases):**
- Pattern: Gender "del risposta"
- Pattern: Missing "che" with "penso è difficile"

---

## SQL Commands

### Flag all issues:
```bash
psql -f /tmp/flag_ita_69_97_issues.sql
```

### Verify flagging:
```sql
SELECT seed_number, COUNT(*) as flagged
FROM course_practice_phrases
WHERE qa_flagged = true
  AND seed_number BETWEEN 69 AND 97
  AND phrase_role = 'use'
GROUP BY seed_number
ORDER BY seed_number;
```

### Expected result:
```
seed_number | flagged
-------------+---------
         80 |       3
         83 |      14
         84 |       4
         89 |       4
         91 |      11
         92 |       2
```

---

## Validation After Fixes

Re-run QA on fixed phrases:

```bash
# Get fixed phrases
curl -s "http://localhost:3471/api/phrases/ita_for_eng?seed_min=69&seed_max=97&role=use&limit=1000" | jq '.phrases | map(select(.qa_flagged == false))'

# Verify count
SELECT COUNT(*) FROM course_practice_phrases
WHERE seed_number BETWEEN 69 AND 97
  AND phrase_role = 'use'
  AND qa_flagged = false;
```

Expected: 501 unflagged phrases (539 - 38 = 501)

---

**Last updated:** 2026-02-09
**Total issues:** 38 phrases across 6 seeds
**Critical seeds:** S083 (14), S091 (11)
