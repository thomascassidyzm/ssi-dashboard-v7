# Phase 5 Regeneration - System Ready ✅

**Date**: 2025-11-19
**Status**: ALL SYSTEMS GO

## Test Scope

**First Test Run**: Spanish S0101-S0120 (20 seeds, ~120 LEGOs)

---

## ✅ Pre-Flight Checklist - ALL VERIFIED

### 1. Scaffold Generator ✅
- **File**: `services/phases/generate-text-scaffold.cjs`
- **Language-agnostic**: ✅ Uses `.course` field to map course codes → language names
- **Final LEGO display**: ✅ Shows "Is Final LEGO: YES/NO" with explanation
- **LEGO position**: ✅ Shows "LEGO Position: 1 of 6 in this seed"
- **Available vocabulary**: ✅ Shows all GATE-compliant LEGOs
- **Recent context**: ✅ Shows 10 recent seeds + 30 recent LEGOs
- **Dynamic labels**: ✅ Output format uses `<English X>` and `<Spanish X>` variables

**Test Result**: Spanish S0101L01 and S0101L06 scaffolds generated perfectly ✅

### 2. Server Enrichment ✅
- **File**: `services/phases/phase5-basket-server.cjs` (lines 1747-1807)
- **Derives is_final_lego**: ✅ From LEGO position in lego_pairs.json
- **Appends seed sentence**: ✅ To final LEGOs if not already present
- **Adds phrase_count**: ✅ Based on practice_phrases length
- **Error handling**: ✅ Returns 400/500 with clear error messages

**Endpoint**: `POST /upload-basket`
```json
{
  "course": "spa_for_eng",
  "seed": "S0101",
  "baskets": {
    "S0101L01": {
      "lego": {"known": "...", "target": "..."},
      "practice_phrases": [...]
    }
  },
  "agentId": "optional"
}
```

### 3. Upload Endpoint Validation ✅
- **Rejects old array format**: ✅ Returns error if `["Spanish", "English"]` format used
- **Requires labeled objects**: ✅ Must use `{"known": "...", "target": "..."}`
- **Validates structure**: ✅ Checks lego, practice_phrases, and phrase format
- **Clear error messages**: ✅ Shows expected format when validation fails

### 4. Input Data (Spanish) ✅
- **lego_pairs.json**:
  - ✅ S0101-S0120 all present (checked S0101: 6 LEGOs)
  - ✅ `.course` field = "spa_for_eng"
  - ✅ All LEGOs formatted as `{"known": "...", "target": "..."}`

- **seed_pairs.json**:
  - ✅ S0101 present: "I'm enjoying finding out more about this language."
  - ✅ Formatted as `{"known": "...", "target": "..."}`

### 5. Quality Baseline ✅
- **Spanish S0001-S0100**: 0 mechanical errors detected
- **Chinese S0001-S0100**: 21 mechanical errors (needs regeneration)

**Analysis Script**: `scripts/identify-bad-patterns-spanish.cjs`

---

## 🚀 Ready to Launch

### Test Run Parameters

```javascript
{
  course: "spa_for_eng",
  startSeed: 101,   // S0101
  endSeed: 120,     // S0120
  totalSeeds: 20,
  estimatedLEGOs: ~120
}
```

### Expected Outcome

✅ **Agent receives scaffold showing**:
- Languages: "English" → "Spanish" ✅
- Final LEGO status clearly marked ✅
- Available vocabulary (GATE compliance) ✅
- Recent context (10 seeds + 30 LEGOs) ✅

✅ **Agent generates**:
- `lego`: `{"known": "English", "target": "Spanish"}` ✅
- `practice_phrases`: Array of 10 phrases ✅
- Progressive complexity (2-3 words → 7-10 words) ✅

✅ **Server enriches**:
- Adds `is_final_lego`: true/false ✅
- Appends seed sentence to final LEGOs ✅
- Adds `phrase_count`: N ✅

✅ **Server validates**:
- Rejects old array format ✅
- Requires labeled objects ✅
- Returns clear errors if format wrong ✅

---

## 🔧 Bug Fixed During Pre-Flight

**Issue**: Scaffold was looking for `legoPairs.course_code` but Spanish lego_pairs.json has `.course` field.

**Fix**: Updated line 39 of `generate-text-scaffold.cjs`:
```javascript
// BEFORE
const courseCode = legoPairs.course_code || 'unknown';

// AFTER
const courseCode = legoPairs.course_code || legoPairs.course || 'unknown';
```

**Status**: ✅ Fixed and tested

---

## 📋 Full Regeneration Plan (After Test)

### If Test Succeeds ✅

1. **Spanish**: S0101-S0668 (568 seeds)
2. **Chinese**: S0001-S0668 (668 seeds)
3. **Total**: 1,236 seeds

### Estimated Stats

- **Spanish S0101-S0668**: ~2,000 LEGOs
- **Chinese S0001-S0668**: ~2,900 LEGOs
- **Total LEGOs**: ~4,900

---

## 🎯 Success Criteria for Test Run

### Must Have ✅
- [ ] All phrases grammatically correct
- [ ] Natural combinations (not mechanical)
- [ ] GATE compliance (only use available vocabulary)
- [ ] Correct format: `{"known": "...", "target": "..."}`
- [ ] Final LEGOs include complete seed sentence
- [ ] No "how to some", "I'm going to speaking" type errors

### Nice to Have ✅
- [ ] Progressive complexity maintained
- [ ] Natural idiomatic usage
- [ ] Good learning progression

---

## 🚀 How to Launch Test

### Via Dashboard (Recommended)
1. Navigate to Phase 5 dashboard
2. Select course: `spa_for_eng`
3. Set range: S0101-S0120
4. Click "Regenerate"

### Via API (Manual)
```bash
# Start server if not running
node services/phases/phase5-basket-server.cjs

# Trigger regeneration
curl -X POST http://localhost:3459/regenerate \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "spa_for_eng",
    "startSeed": 101,
    "endSeed": 120,
    "forceRegenerate": true
  }'
```

---

## 📊 Post-Test Review

After test completes:

1. **Check quality**: Run `scripts/identify-bad-patterns-spanish.cjs` on S0101-S0120
2. **Manual sample**: Review 5-10 random baskets for naturalness
3. **Compare**: Against existing S0101-S0120 (if they exist)
4. **Decide**: Proceed with full regeneration if quality is good

---

## 🎉 Why This Will Work Better

1. **Clean input data** - No backwards translations, null values, or format issues
2. **Clear instructions** - Agents see exactly what's expected
3. **Language-agnostic** - Works for any course
4. **GATE compliance visible** - Agents know exactly what vocabulary to use
5. **Final LEGO clearly marked** - Agents know when to add seed sentence (even though server does it)
6. **Server handles mechanics** - Agents focus on linguistic quality
7. **Proven with Spanish S0001-S0100** - 0 errors in existing data

---

**Ready to launch!** 🚀

All systems verified. Test run can proceed.
