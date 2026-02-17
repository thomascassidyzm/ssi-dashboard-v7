# Action Plan: Fix ita_for_eng Seeds 69-97

**Status:** 38 speakability issues identified in QA Pass 3
**Date:** 2026-02-09
**Priority:** HIGH - Must fix before Phase 8 (audio generation)

---

## Phase 1: Flag Issues in Database ✅

```bash
# Execute SQL script to flag problematic phrases
psql -h aws-0-us-west-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.nrhqactvuiwqbgbhmkfx \
     -d postgres \
     -f /tmp/flag_ita_69_97_issues.sql
```

**Expected outcome:** 38 phrases flagged with `qa_flagged = true`

**Verification:**
```sql
SELECT seed_number, COUNT(*) as flagged_count
FROM course_practice_phrases
WHERE qa_flagged = true
  AND seed_number BETWEEN 69 AND 97
  AND phrase_role = 'use'
GROUP BY seed_number
ORDER BY seed_number;
```

Should return:
```
 seed_number | flagged_count
-------------+---------------
          80 |             3
          83 |            14
          84 |             4
          89 |             4
          91 |            11
          92 |             2
```

---

## Phase 2: Regenerate Critical Seeds

### S083: Complete Regeneration (14 phrases)

**Current issues:**
- Gender agreement (del → della)
- Elision (del amico → dell'amico)
- Missing prepositions (provando + INF)
- Verb conjugation (vuoi → vuole)
- Article usage (del tuo amico)

**Action:**
```bash
# Get seed data
curl -s "http://localhost:3471/api/vocab/ita_for_eng" > /tmp/ita_vocab.json
curl -s "http://localhost:3471/api/resume/ita_for_eng?seed=83" > /tmp/seed83_data.json

# Review current seed structure
cat /tmp/seed83_data.json | jq '.seed'

# Regenerate seed (manual intervention - needs linguistic expertise)
# Focus areas:
# 1. "la risposta" → always use "della risposta"
# 2. "l'amico" → always use "dell'amico"
# 3. "provare a + infinitive" (not provare + infinitive)
# 4. 3rd person verbs with 3rd person subjects
```

**Estimated time:** 2-3 hours

---

### S091: Complete Regeneration (11 phrases)

**Current issues:**
- Multiple missing prepositions (pronto + INF, provando + INF)
- Subordinate clause structure (non sono sicuro)
- Gender agreement (del → della)
- Reflexive pronouns (prendersi → prendermi)

**Action:**
```bash
# Get seed data
curl -s "http://localhost:3471/api/resume/ita_for_eng?seed=91" > /tmp/seed91_data.json

# Review current seed structure
cat /tmp/seed91_data.json | jq '.seed'

# Regenerate seed (manual intervention - needs linguistic expertise)
# Focus areas:
# 1. "essere pronto a + infinitive" (not pronto + infinitive)
# 2. "provare a + infinitive" (not provare + infinitive)
# 3. "non sono sicuro se/di + clause"
# 4. "penso che + clause" (not penso + clause)
# 5. Reflexive pronouns match subject
```

**Estimated time:** 2-3 hours

---

## Phase 3: Fix Individual Phrases (Low Priority Seeds)

### S080: 3 phrases

**Pattern 1:** Missing "a" with "pronto"
- `sarò pronto parlare` → `sarò pronto a parlare`

**Pattern 2:** Missing "di" with "non sono sicuro quando"
- `non sono sicuro quando` → `non sono sicuro di quando`

**Fix approach:** SQL UPDATE or regenerate specific phrases

```sql
-- Example fix (adjust IDs as needed)
UPDATE course_practice_phrases
SET target_text = replace(target_text, 'pronto parlare', 'pronto a parlare')
WHERE id IN ('f1e0ab39-eb8e-4714-9d2e-104d92938cd9', '2be743e9-621f-4b78-b646-0085284ef642');

UPDATE course_practice_phrases
SET target_text = replace(target_text, 'non sono sicuro quando sarò', 'non sono sicuro di quando sarò')
WHERE id IN ('9ab5d714-8a46-4eee-9f86-da88a4df5bcf', '2be743e9-621f-4b78-b646-0085284ef642');
```

**Estimated time:** 30 minutes

---

### S084: 4 phrases

**Pattern 1:** Missing "a" with "sto provando"
- 2 phrases: `sto provando ricordare/trovare` → `sto provando a ricordare/trovare`

**Pattern 2:** Missing "di" with "non sono sicuro che cosa"
- 1 phrase: `non sono sicuro che cosa ha detto` → `non sono sicuro di che cosa ha detto`

**Fix approach:** SQL UPDATE

```sql
UPDATE course_practice_phrases
SET target_text = replace(target_text, 'sto provando ricordare', 'sto provando a ricordare')
WHERE id IN ('ed609f64-e7bf-4fb9-9a9d-46da7101c3cf');

UPDATE course_practice_phrases
SET target_text = replace(target_text, 'sto provando trovare', 'sto provando a trovare')
WHERE id IN ('fc34360f-9764-46e2-9a76-8738b7d69104');

UPDATE course_practice_phrases
SET target_text = replace(target_text, 'non sono sicuro che cosa ha detto', 'non sono sicuro di che cosa ha detto')
WHERE id IN ('e86c688a-89d8-41fb-ac81-c6499e262740');
```

**Estimated time:** 30 minutes

---

### S089: 4 phrases

**Pattern 1:** Wrong verb form (2 phrases)
- `che cosa aver fatto` → `che cosa ho fatto`

**Pattern 2:** Gender agreement (1 phrase)
- `del risposta` → `della risposta`

**Pattern 3:** Missing conjunction (1 phrase)
- `non sono sicuro posso` → `non sono sicuro se posso`

**Fix approach:** SQL UPDATE

```sql
UPDATE course_practice_phrases
SET target_text = replace(target_text, 'che cosa aver fatto', 'che cosa ho fatto')
WHERE id IN ('035dcfb7-a13b-42fd-ae99-de5b83b93644', 'b4d4168e-9653-47ce-82f2-987af82c4a3f');

UPDATE course_practice_phrases
SET target_text = replace(target_text, 'del risposta', 'della risposta')
WHERE id IN ('34067371-eec3-410c-8fdf-7402eb511824');

UPDATE course_practice_phrases
SET target_text = 'non sono sicuro se posso fare qualcosa in poco tempo'
WHERE id = 'a141103a-8a36-435d-88d0-d90ecc51dffb';
```

**Estimated time:** 30 minutes

---

### S092: 2 phrases

**Pattern 1:** Gender agreement (1 phrase)
- `del risposta` → `della risposta`

**Pattern 2:** Missing "che" (1 phrase)
- `penso è difficile` → `penso che è difficile`

**Fix approach:** SQL UPDATE

```sql
UPDATE course_practice_phrases
SET target_text = replace(target_text, 'del risposta', 'della risposta')
WHERE id IN ('0fa07fc4-f2e6-4f99-97ae-a3188b8f4e71');

UPDATE course_practice_phrases
SET target_text = 'penso che è difficile continuare a farlo in poco tempo'
WHERE id = 'e96399ff-0e87-49c0-9acf-533d35387ed5';
```

**Estimated time:** 15 minutes

---

## Phase 4: Unflag Fixed Phrases

After fixes are applied:

```sql
-- Review fixes first
SELECT id, seed_number, known_text, target_text
FROM course_practice_phrases
WHERE qa_flagged = true
  AND seed_number IN (80, 84, 89, 92)
  AND phrase_role = 'use';

-- Unflag after verification
UPDATE course_practice_phrases
SET qa_flagged = false,
    qa_checked = NOW()
WHERE qa_flagged = true
  AND seed_number IN (80, 84, 89, 92)
  AND phrase_role = 'use';
```

---

## Phase 5: QA Verification

### Re-run QA on all fixed phrases

```bash
# Fetch all USE phrases for seeds 69-97
curl -s "http://localhost:3471/api/phrases/ita_for_eng?seed_min=69&seed_max=97&role=use&limit=1000" > /tmp/ita_recheck.json

# Run QA script (same as before)
python3 /tmp/qa_speakability.py
```

**Success criteria:** Zero speakability issues found

---

## Phase 6: Update QA Status

Mark seed range as QA-complete:

```sql
UPDATE course_practice_phrases
SET qa_checked = NOW()
WHERE seed_number BETWEEN 69 AND 97
  AND phrase_role = 'use'
  AND qa_flagged = false;
```

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Flag issues | 5 minutes | None |
| Phase 2: Regenerate S083 | 2-3 hours | Linguistic expertise |
| Phase 2: Regenerate S091 | 2-3 hours | Linguistic expertise |
| Phase 3: Fix S080 | 30 minutes | SQL access |
| Phase 3: Fix S084 | 30 minutes | SQL access |
| Phase 3: Fix S089 | 30 minutes | SQL access |
| Phase 3: Fix S092 | 15 minutes | SQL access |
| Phase 4: Unflag | 10 minutes | Phase 3 complete |
| Phase 5: QA verification | 30 minutes | Phases 2-4 complete |
| Phase 6: Update status | 5 minutes | Phase 5 complete |
| **TOTAL** | **6-8 hours** | - |

**Critical path:** S083 and S091 regeneration (4-6 hours)

---

## Success Criteria

- [ ] All 38 phrases flagged in database
- [ ] S083 regenerated with zero grammar errors
- [ ] S091 regenerated with zero grammar errors
- [ ] S080, S084, S089, S092 individually fixed
- [ ] QA verification shows zero issues
- [ ] All seeds 69-97 marked as `qa_checked`
- [ ] Ready for Phase 8 audio generation

---

## Rollback Plan

If regeneration introduces new issues:

1. Revert to backup:
```sql
-- Assuming backup was created before changes
ROLLBACK;
```

2. Flag problematic seed for complete manual review

3. Consider alternative fix approach (individual phrase editing vs full regeneration)

---

## Notes

**Linguistic expertise required:**
- S083 and S091 regeneration needs native/fluent Italian speaker
- Pattern-based fixes are mechanical but should be verified by linguist
- Gender agreement and prepositional government are systematic - fix at source

**Database access:**
- All SQL commands assume Supabase connection
- Test fixes on staging/dev first if available
- Always backup before bulk UPDATE operations

**QA criteria:**
- Focus is SPEAKABILITY ONLY (per commit 84ec488e)
- Ignore punctuation/capitalization unless it affects meaning
- Native speaker must be able to naturally speak the phrase

---

**Document created:** 2026-02-09
**Author:** QA Agent (Claude Sonnet 4.5)
**Status:** Ready for execution
