# Apostrophe Bug - Rebuild Plan

**Date:** 2026-01-30
**Status:** Code fixed, rebuild required

## The Bug

**Root Cause:** `normalizeText()` in `course-builder-api.cjs` stripped apostrophes when building vocabulary sets, creating a feedback loop where the LLM agent learned apostrophes were optional.

**Impact:** Practice phrases generated with incorrect grammar:
- "I dont know" instead of "I don't know"
- "thats what I mean" instead of "that's what I mean"
- "Im trying" instead of "I'm trying"

**Validation passed** because "dont" and "don't" normalized to the same word in vocabulary checking.

## The Fix

**Code Change (COMPLETED):**
```javascript
// OLD (line 2330)
.replace(/[¿¡.,;:!?'"«»""''。，！？、：；""'']/g, '')  // Stripped apostrophes

// NEW (line 2330)
.replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')  // Preserves apostrophes
```

**File:** `services/course-builder-api.cjs`
**Commit:** [Pending]

## Affected Courses

All **eng_for_X** courses are affected (English canonical, target language for learners):

| Course Code  | Seeds | LEGOs | Phrases | Status |
|--------------|-------|-------|---------|--------|
| eng_for_jpn  | 668   | 911   | 9,820   | Needs rebuild |
| eng_for_ara  | 668   | 991   | 10,818  | Needs rebuild |
| eng_for_deu  | 668   | 803   | 8,820   | Needs rebuild |
| eng_for_fra  | 668   | 860   | 9,233   | Needs rebuild |
| eng_for_por  | 668   | 790   | 8,295   | Needs rebuild |
| eng_for_spa  | 668   | 873   | 8,908   | Needs rebuild |
| eng_for_zho  | 668   | 780   | 8,314   | Needs rebuild |

**Total phrases to regenerate:** ~66,208 phrases across 7 courses

## Why Rebuild is Required

1. **Canonical seeds are correct** - They have apostrophes in the database
2. **Pass 1 (translation) is correct** - Target language translations are fine
3. **Pass 2 (phrases) is corrupted** - Practice phrases generated without apostrophes
4. **Vocabulary cache is corrupted** - All word sets have apostrophes stripped

**Simple fix won't work** because:
- Existing phrases in database have wrong grammar
- Vocabulary cache needs to be rebuilt from scratch
- Agent learned the wrong pattern over 668 seeds

## Rebuild Strategy

### Option 1: Full Rebuild (Recommended)

**Process:**
1. ✅ Fix code (DONE)
2. Commit the fix
3. For each course:
   - Clear `course_practice_phrases` table
   - Clear `course_legos` table
   - Keep `course_seeds` (canonical seeds are correct)
   - Re-run Pass 2: Decompose seeds into LEGOs + generate phrases
4. Validate apostrophe usage with QA checks

**Pros:**
- Clean slate, no corrupted data
- Agent learns correct patterns from scratch
- Vocabulary cache rebuilt correctly

**Cons:**
- 668 seeds × 7 courses = 4,676 API calls to Claude
- Time intensive (but can be automated)

### Option 2: Surgical Fix (Not Recommended)

**Process:**
1. Query all phrases with missing apostrophes
2. Regenerate only those phrases
3. Update database

**Pros:**
- Faster, only fixes broken phrases

**Cons:**
- Vocabulary cache still corrupted
- Hard to identify all affected phrases
- Risk of missing patterns
- Agent may still have learned wrong patterns

## Recommended Rebuild Order

**Priority 1 (Most Used):**
1. eng_for_jpn - Most active, being QA'd currently
2. eng_for_spa - Common language pair
3. eng_for_fra - Common language pair

**Priority 2 (Medium):**
4. eng_for_deu - German course
5. eng_for_por - Portuguese course

**Priority 3 (Lower Volume):**
6. eng_for_zho - Chinese course
7. eng_for_ara - Arabic course

## Rebuild Automation

**Script:** `tools/rebuild-eng-for-courses.cjs` (To be created)

**Process:**
```bash
# Rebuild single course
node tools/rebuild-eng-for-courses.cjs eng_for_jpn --execute

# Rebuild all courses
node tools/rebuild-eng-for-courses.cjs --all --execute
```

**Steps:**
1. Confirm canonical seeds exist
2. Clear course_legos and course_practice_phrases for course
3. For each seed (1-668):
   - Call Course Builder API: POST /api/seed/decompose
   - Validate response
   - Wait for completion
4. Final validation check
5. Report statistics

## QA Validation

After rebuild, verify:

**Automated checks:**
```bash
# Check for missing apostrophes
node scripts/check-apostrophes.cjs eng_for_jpn

# Sample phrases
curl "http://localhost:3471/api/stats/eng_for_jpn" | jq '.sample_phrases'
```

**Manual checks:**
- Random sample 50 phrases from each seed range (1-100, 101-300, 301-668)
- Verify apostrophes present in contractions
- Check "don't", "can't", "I'm", "it's", "that's", etc.

## Estimated Time

**Per course (668 seeds):**
- API calls: ~668 × 2 seconds = 22 minutes
- Validation: 5 minutes
- Total: ~30 minutes per course

**All 7 courses:** ~3.5 hours (can run in parallel)

## Risk Assessment

**Low Risk:**
- Canonical seeds unchanged
- Only regenerating derived data (LEGOs + phrases)
- Code fix tested in isolation

**Rollback Plan:**
- Database backup before rebuild
- Can restore from backup if issues found
- Staged rollout (one course at a time)

## Next Steps

1. ✅ Code fix completed
2. Commit the fix to git
3. Create rebuild automation script
4. Test rebuild on eng_for_jpn (smallest first)
5. Validate results with QA checks
6. If successful, rebuild remaining 6 courses
7. Document lessons learned

## Notes

**Why this happened:**
- Vocabulary validation used normalized text (apostrophes stripped)
- Agent optimized for passing validation
- No explicit apostrophe enforcement in prompts
- Feedback loop: incorrect → passes validation → reinforces pattern

**Prevention:**
- Fixed normalization to preserve apostrophes
- Should add explicit grammar checks in future
- Consider apostrophe-specific validation gate

---

**Owner:** Claude (course-builder agent)
**Reviewer:** Tom/Kai
**Updated:** 2026-01-30
