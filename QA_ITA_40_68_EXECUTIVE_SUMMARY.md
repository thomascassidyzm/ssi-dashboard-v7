# Executive Summary: QA Pass - ita_for_eng Seeds 40-68

**Date**: 2026-02-09
**Scope**: Seeds 40-68, USE phrases only
**Method**: Grammar/fragment/mismatch detection (speakability check)

---

## Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | **99.03%** |
| **Total Phrases** | 414 |
| **Issues Found** | 4 |
| **Affected Seeds** | 3 (S53, S57, S61) |

---

## Key Findings

### 1. Outstanding Quality
Seeds 40-68 demonstrate near-perfect Italian grammar with only **4 unspeakable phrases** out of 414 total (99.03% pass rate).

### 2. Single Systematic Error
All 4 issues involve the same pattern:
- **Pattern**: "mettere nella sua borsa" (missing object pronoun "lo")
- **Should be**: "metterlo nella sua borsa"
- **Affected seeds**: S53 (2 instances), S57 (1 instance), S61 (1 instance)

### 3. API vs Database Discrepancy
- **Course-builder API** (port 3471) returned 425 phrases with 11 issues
- **Actual database** contained 414 phrases with only 4 issues
- **Implication**: Always validate against database state, not API responses

---

## Actions Taken

1. ✅ **Flagged** 4 phrases in `course_qa_flags` table
   - `severity`: error
   - `check_type`: grammar
   - `status`: open

2. ✅ **Marked** all 414 USE phrases as `qa_checked` (timestamp: 2026-02-09)

3. ✅ **Generated** detailed QA report: `QA_ITA_SEEDS_40_68_REPORT.md`

---

## Recommended Fix

**Batch SQL Update** (affects 4 phrases across 3 seeds):
```sql
UPDATE course_practice_phrases
SET target_text = REPLACE(target_text, 'mettere nella sua borsa', 'metterlo nella sua borsa')
WHERE course_code = 'ita_for_eng'
  AND seed_number IN (53, 57, 61)
  AND target_text LIKE '%mettere nella sua borsa%';
```

**Verification query**:
```sql
SELECT seed_number, lego_index, target_text
FROM course_practice_phrases
WHERE course_code = 'ita_for_eng'
  AND seed_number IN (53, 57, 61)
  AND target_text LIKE '%metterlo nella sua borsa%';
```

---

## Course Builder Improvement

**Add validation rule** for object pronoun attachment:
- Detect: Infinitive verb + prepositional phrase where English has "it"
- Validate: Object pronoun attached to infinitive (e.g., "metterlo", "dirlo", "farlo")
- Flag: Missing object pronouns before phrase generation

---

## Conclusion

Seeds 40-68 represent **excellent quality** Italian course content. The single systematic error (missing object pronoun "lo" with "mettere") is easily fixable with a batch update and should trigger a validation rule in the course builder to prevent recurrence.

**Next Steps**:
1. Review and approve flagged phrases
2. Run batch SQL fix
3. Regenerate audio for corrected phrases (4 files)
4. Add validation rule to course builder

**Status**: ✅ **COMPLETE** - Ready for human review and batch fix

---

*Full Report: `QA_ITA_SEEDS_40_68_REPORT.md`*
*Flagged Issues: Supabase `course_qa_flags` table*
*QA Method: Speakability check (grammar/fragments/mismatches only)*
