# Phase 5 Automation Implementation

**Date:** 2025-11-19
**Status:** ✅ Phase 5.5 infrastructure complete, ready for Phase 5 completion integration

---

## What Was Built

### 1. **ensure-minimum-phrase.cjs** ✅
**Location:** `scripts/ensure-minimum-phrase.cjs`

**Purpose:** Prevent empty baskets from causing downstream issues

**What it does:**
1. For every basket, prepend LEGO itself as first phrase
2. De-duplicate practice_phrases array
3. Result: Every basket has at least 1 phrase (the LEGO itself)

**Usage:**
```bash
node scripts/ensure-minimum-phrase.cjs spa_for_eng
```

**Why this matters:**
- GATE cleaning might remove all phrases from a basket
- Empty baskets cause Phase 6/7 to fail
- Adding LEGO itself is pedagogically sound
- De-duplication removes duplicates if LEGO was already in phrases

---

### 2. **Phase 5.5 Grammar Validation Server** ✅
**Location:** `services/phases/phase5.5-grammar-validation-server.cjs`
**Port:** 3460

**Purpose:** Validate lego_baskets.json for grammar correctness BEFORE Phase 6

**Architecture:**
- Spawns 15 Safari browser instances
- Each browser runs 15 parallel workers (225 total)
- Each worker validates 3 seeds (~20 baskets)
- Total capacity: 15 × 15 × 3 = 675 seeds
- Workers DELETE phrases with grammar errors
- Tracks deletion statistics

**Why 15×15×3:**
- Matches Phase 5 basket generation architecture
- 675 seed capacity > 668 actual seeds in spa_for_eng
- More browsers = better parallelism
- 3 seeds per worker = manageable workload

**API Endpoints:**
```bash
# Start validation
POST http://localhost:3460/start
{ "courseCode": "spa_for_eng" }

# Worker deletes phrase
POST http://localhost:3460/delete-phrase
{ "courseCode": "spa_for_eng", "legoId": "S0101L01", "phraseIndex": 3 }

# Worker reports completion
POST http://localhost:3460/worker-complete
{ "courseCode": "spa_for_eng", "workerId": "worker-1", "stats": { "phrasesKept": 245 } }

# Check status
GET http://localhost:3460/status/spa_for_eng

# Health check
GET http://localhost:3460/health
```

**Why separate from Phase 5:**
- Different objective (correctness vs generation)
- Works on cleaned data (after GATE violations removed)
- Re-runnable without regenerating baskets
- Fast validation on 3MB file (not 20MB manifest)

---

### 3. **Updated Service Ports**
```javascript
Orchestrator:       3456
Phase 1:            3457
Phase 3:            3458
Phase 5:            3459
Phase 5.5:          3460  ← NEW
Phase 6:            3461  ← Changed from 3460
Phase 8:            3462  ← Changed from 3461
```

**Updated files:**
- `start-automation.cjs` - Added Phase 5.5 to service list
- `services/phases/phase5.5-grammar-validation-server.cjs` - Port 3460
- `services/phases/phase6-introduction-server.cjs` - Port 3461

---

## Complete Phase 5 Workflow

```javascript
// When all 12 basket generation agents complete:

// 1. Merge staging baskets
await runScript('scripts/merge-phase5-staging.cjs', courseCode);
// Result: lego_baskets.json with all baskets (~3MB)

// 2. Clean GATE violations
await runScript('scripts/clean-baskets-gate.cjs', courseCode);
// Removes phrases using future/unknown words
// Some baskets may now have 0 phrases

// 3. Ensure minimum phrase
await runScript('scripts/ensure-minimum-phrase.cjs', courseCode);
// Adds LEGO itself as first phrase
// De-duplicates
// Guarantees NO empty baskets

// 4. Grammar validation (Phase 5.5)
const grammarResult = await fetch('http://localhost:3460/start', {
  method: 'POST',
  body: JSON.stringify({ courseCode })
});
// Spawns 15 browsers × 15 workers × 3 seeds = 675 seed capacity
// Validates all practice phrases for grammar
// Deletes incorrect phrases
// Even if all phrases deleted, LEGO itself remains

// 5. Check deletion rate
const status = await fetch(`http://localhost:3460/status/${courseCode}`);
if (status.stats.deletionRate > 0.20) {
  // More than 20% deleted - something wrong
  return { success: false, reason: 'excessive_grammar_errors' };
}

// 6. Proceed to Phase 6
await fetch('http://localhost:3461/start', {
  method: 'POST',
  body: JSON.stringify({ courseCode })
});
```

---

## Quality Thresholds

**HARD REQUIREMENTS (100% pass):**
- ✅ GATE violations: 0 (cleaned by step 2)
- ✅ Grammar errors: 0 (validated by step 4)
- ✅ Empty baskets: 0 (ensured by step 3)

**SOFT WARNINGS (don't block):**
- ⚠️ Phrase count: Molecular LEGOs can have <10 phrases
- ⚠️ Complexity regression: Warning only
- ⚠️ LEGO presence: Grammar check will catch if unrelated

**ACCEPTABLE LOSS:**
- Up to 20% phrase deletion during validation
- ~20,000 total phrases → 4,000 deletions OK
- >20% deletion → flag for manual review

---

## Next Steps

### Immediate (Not Yet Implemented):

1. **Implement Phase 5 completion in `phase5-basket-server.cjs`**
   - Detect when all 12 agents have uploaded
   - Auto-run steps 1-6 above
   - Report to orchestrator

2. **Wire Phase 5 → 5.5 → 6 → 7 pipeline**
   - Orchestrator coordinates phase transitions
   - Each phase reports completion via callback
   - Pipeline advances automatically

3. **Test end-to-end**
   - Run complete automation on small seed range
   - Verify all phases execute correctly
   - Check final manifest quality

---

## Files Created/Modified

**Created:**
- `scripts/ensure-minimum-phrase.cjs`
- `services/phases/phase5.5-grammar-validation-server.cjs`

**Modified:**
- `start-automation.cjs` - Added Phase 5.5
- `services/phases/phase6-introduction-server.cjs` - Port 3461
- `docs/workflows/PHASE5_COMPLETION_WORKFLOW.md` - Updated sequence

**Updated Ports:**
- Phase 5.5: 3460
- Phase 6: 3461 (was 3460)
- Phase 8: 3462 (was 3461)

---

## Testing

**Phase 5.5 server can be tested with:**
```bash
# Start all services
npm run automation

# In another terminal, trigger grammar validation
curl -X POST http://localhost:3460/start \
  -H "Content-Type: application/json" \
  -d '{"courseCode": "spa_for_eng"}'

# Check status
curl http://localhost:3460/status/spa_for_eng

# Check health
curl http://localhost:3460/health
```

---

## Summary

✅ **Complete:** Phase 5.5 grammar validation infrastructure
✅ **Complete:** Empty basket prevention (ensure-minimum-phrase)
✅ **Complete:** Port reassignments and service configuration
⏳ **Pending:** Phase 5 completion automation in phase5-basket-server.cjs
⏳ **Pending:** Orchestrator pipeline wiring
⏳ **Pending:** End-to-end testing

**Ready for:** Implementing Phase 5 completion detection and automatic workflow execution.
