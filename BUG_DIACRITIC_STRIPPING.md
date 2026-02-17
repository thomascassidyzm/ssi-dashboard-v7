# BUG: Diacritic Stripping in Vocabulary Extraction

**Discovered:** 2026-02-09 during third QA pass of ita_for_eng course

## Summary

The `normalizeText()` function in `services/course-builder-api.cjs` strips diacritics for ZUT collision detection, but is also used for vocabulary extraction/storage. This causes Romance language courses (Italian, French, Spanish, Portuguese) to store vocabulary WITHOUT proper diacritics.

## The Bug

**Location:** `services/course-builder-api.cjs`

```javascript
function normalizeText(text, chinese = false) {
  let normalized = text
    .toLowerCase()
    .normalize('NFD')                      // Decompose: é → e + ´
    .replace(/[\u0300-\u036f]/g, '')      // ❌ STRIPS ALL DIACRITICS
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')
    .trim();
  return normalized;
}
```

## Impact

### Seeds
- ✅ **Correct** - Seeds are entered with proper diacritics (perché, può, po')

### Vocabulary
- ❌ **Incorrect** - Vocab stored without diacritics:
  - "perche" instead of "perché"
  - "po" instead of "po'"
  - Missing "può" (3rd person singular of potere)

### Generated Phrases
- ❌ **Sometimes Incorrect** - Inherits missing diacritics from vocab
  - Results in "puo" instead of "può"
  - "perche" instead of "perché"
  - "quell uomo" instead of "quell'uomo"

## Evidence

**Third QA pass of ita_for_eng (2026-02-09):**
- Batch 8 (seeds 214-242) found 20 phrases with missing diacritics
- All were systematically missing accents that existed in seed translations
- Agent corrected them to match seed orthography

**Vocab check:**
```bash
curl -s "http://localhost:3471/api/vocab/ita_for_eng" | jq -r '.vocab' | tr ',' '\n' | grep -E "perch|^po$"
# Returns: perche, po (without diacritics)
```

**Seed check:**
```bash
# Seeds have CORRECT forms: "Perché stai imparando", "un po' di italiano"
```

## Why This Function Exists

The diacritic stripping is **intentional** for **ZUT collision detection**:
- Prevents conflicts between "José" and "Jose"
- Ensures "café" and "cafe" are treated as the same word
- **This is correct behavior for ZUT checking!**

## The Problem

The same function is being used for **two different purposes**:
1. ✅ **ZUT collision detection** - Should strip diacritics
2. ❌ **Vocabulary storage** - Should preserve diacritics

## The Fix

### Option 1: Separate Functions (Recommended)

Create two distinct functions:

```javascript
// For ZUT collision detection - strips diacritics
function normalizeForZUT(text, chinese = false) {
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Strip diacritics for comparison
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')
    .trim();
  return normalized;
}

// For vocab storage - preserves diacritics
function normalizeForStorage(text, chinese = false) {
  let normalized = text
    .toLowerCase()
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')  // Remove punctuation only
    .trim();
  return normalized;
}
```

### Option 2: Add Flag Parameter

```javascript
function normalizeText(text, chinese = false, preserveDiacritics = false) {
  let normalized = text.toLowerCase().normalize('NFD');

  if (!preserveDiacritics) {
    normalized = normalized.replace(/[\u0300-\u036f]/g, '');
  }

  normalized = normalized
    .replace(/[¿¡.,;:!?«»""。，！？、：；""]/g, '')
    .trim();
  return normalized;
}
```

### Required Changes

1. Update `extractVocab()` to use `normalizeForStorage()` or pass `preserveDiacritics: true`
2. Keep ZUT collision detection using `normalizeForZUT()` or default behavior
3. Add validation to ensure stored vocab has proper diacritics

## Affected Courses

All Romance language courses that use diacritics:
- ✅ **ita_for_eng** - Italian (accents: à, è, é, ì, ò, ù; apostrophes: l', un po')
- ✅ **fra_for_eng** - French (accents: é, è, ê, à, ù, ç, ï, ô)
- ✅ **spa_for_eng** - Spanish (accents: á, é, í, ó, ú, ñ, ü)
- ✅ **por_for_eng** - Portuguese (accents: á, â, ã, à, é, ê, í, ó, ô, õ, ú, ç)

Note: German (deu_for_eng) uses umlauts (ä, ö, ü, ß) which are also affected.

## Remediation Steps

### Immediate (Done)
- ✅ Accept agent's 20 orthographic corrections in ita_for_eng batch 8

### Short-term
1. Fix `normalizeText()` function per Option 1 (recommended)
2. Re-extract vocabulary for all Romance language courses
3. Validate vocab has proper diacritics
4. Run QA passes on affected courses

### Long-term
1. Add validation rule: flag phrases missing diacritics that exist in seed
2. Add pre-submission check: compare phrase diacritics to seed diacritics
3. Add unit tests for diacritic preservation

## Testing

After fix, verify:
```bash
# Should return words WITH diacritics
curl -s "http://localhost:3471/api/vocab/ita_for_eng" | jq -r '.vocab' | tr ',' '\n' | grep "perché"
curl -s "http://localhost:3471/api/vocab/ita_for_eng" | jq -r '.vocab' | tr ',' '\n' | grep "può"
curl -s "http://localhost:3471/api/vocab/fra_for_eng" | jq -r '.vocab' | tr ',' '\n' | grep "été"
```

## Priority

**HIGH** - Affects core quality of all Romance language courses

## Related Issues

- ZUT collision detection working correctly (not a bug)
- Vocab extraction stripping necessary orthography (bug)
- Generated phrases inheriting incorrect vocab (downstream effect)

---

## Fix Implemented (2026-02-09)

**Status:** ✅ **FIXED**

### Changes Made

**File:** `services/course-builder-api.cjs`
**Lines:** 3411-3442

1. Created `normalizeForZUT()` - Strips diacritics for collision detection
2. Created `normalizeForStorage()` - Preserves diacritics for vocab storage
3. Updated `extractVocab()` to use `normalizeForStorage()` instead of `normalizeText()`
4. Kept `normalizeText()` as deprecated wrapper to `normalizeForZUT()` for backward compatibility

### Testing

To verify the fix works for new courses:
```bash
# Create a test seed with diacritics and check extracted vocab
# Example: Italian seed with "perché", "può", "po'"
# Vocab should now contain: perché, può, po' (with diacritics preserved)
```

### Next Steps

1. ✅ Fix implemented and deployed
2. **TODO:** Re-extract vocabulary for existing Romance language courses
   - ita_for_eng, fra_for_eng, spa_for_eng, por_for_eng, deu_for_eng
3. **TODO:** Regenerate phrases that inherited incorrect forms from old vocab
4. **TODO:** Add validation test to catch diacritic stripping in CI/CD

---

**Status:** ✅ FIXED
**Implemented by:** Claude Code Agent
**Discovered by:** Third QA pass coordinator agent
**Date Discovered:** 2026-02-09
**Date Fixed:** 2026-02-09
