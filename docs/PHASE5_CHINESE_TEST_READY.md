# Phase 5 Chinese Test - System Ready

**Status**: ✅ Ready for test run (S0001-S0010)

## What's Been Verified

### 1. Clean Input Data ✅
- **seed_pairs.json**: Consistent `{"known": "English", "target": "Chinese"}` format
- **lego_pairs.json**: All LEGOs properly formatted with labeled objects
- No backwards translations, no null values, no format inconsistencies

### 2. Language-Agnostic Scaffold ✅
**File**: `services/phases/generate-text-scaffold.cjs`

**Features**:
- ✅ Maps course code → readable language names (cmn_for_eng → English/Chinese)
- ✅ Shows "Is Final LEGO: YES/NO" with explanation
- ✅ Shows "LEGO Position: X of Y in this seed"
- ✅ Works for spa_for_eng, cmn_for_eng, cym_for_eng, eng_for_spa
- ✅ Dynamic language labels throughout scaffold

**Test Results**:
```
S0001L01 (First LEGO):
  Known (English): "now"
  Target (Chinese): "现在"
  Is Final LEGO: NO - More LEGOs coming in this seed.
  LEGO Position: 1 of 8 in this seed

S0001L08 (Final LEGO):
  Known (English): "want to speak Chinese with you"
  Target (Chinese): "想和你说中文"
  Is Final LEGO: YES - This is the last LEGO in this seed! Server will add complete seed sentence.
  LEGO Position: 8 of 8 in this seed
```

### 3. Server Enrichment ✅
**File**: `services/phases/phase5-basket-server.cjs` (lines 1747-1807)

**Automatic enrichment before validation**:
1. ✅ Derives `is_final_lego` from LEGO position in lego_pairs.json
2. ✅ Appends complete seed sentence to final LEGOs (if not already present)
3. ✅ Adds `phrase_count` based on practice_phrases length
4. ✅ Error handling for missing seed or LEGO data

**Server endpoint**: `POST /upload-basket`
- Accepts: `{ course, seed, baskets, agentId }`
- Returns: `{ success: true, message: "..." }`

### 4. Data Cleanup Scripts ✅
All Chinese baskets cleaned and standardized:
- ✅ Converted from array format to labeled objects (2,921 LEGOs)
- ✅ Fixed backwards seed_context values (221 baskets)
- ✅ Removed duplicate practice phrases (871 duplicates)
- ✅ Derived is_final_lego for all baskets (629 final LEGOs)
- ✅ Added seed sentences to final LEGOs (251 baskets)
- ✅ Compacted JSON for readability

## Test Plan: S0001-S0010

### Scope
- **Seeds**: S0001 through S0010 (10 seeds)
- **LEGOs**: ~80 LEGOs (varies by seed)
- **Course**: cmn_for_eng (Chinese for English speakers)

### What We're Testing
1. **Scaffold Quality**: Does it provide clear, correct context?
2. **Agent Understanding**: Can agents generate grammatically correct phrases?
3. **GATE Compliance**: Do phrases only use available vocabulary?
4. **Final LEGO Handling**: Does server correctly add seed sentences?
5. **Format Compliance**: Do agents return correct JSON format?
6. **Quality vs. Old Baskets**: Better than script-generated combinations?

### Expected Improvements Over Current Baskets
Current S0001-S0003 baskets have issues like:
- ❌ "I want to how to" (grammatically wrong)
- ❌ "how to with you" (nonsensical)
- ❌ "I'm trying to often" (incomplete)
- ❌ "to speak often Chinese" (wrong word order)

These appear to be mechanical script combinations, not agent-generated phrases.

### Success Criteria
✅ **Must Have**:
- All phrases grammatically correct in both languages
- Natural, meaningful combinations (not mechanical)
- GATE compliance (only use available vocabulary)
- Correct format: `{"known": "English", "target": "Chinese"}`
- Final LEGOs include complete seed sentence

✅ **Nice to Have**:
- Progressive complexity (2-3 words → 7-10 words)
- Natural idiomatic usage
- Good learning progression

## How to Run Test

### Option 1: Manual Test (Single LEGO)
```bash
# 1. Start Phase 5 server
node services/phases/phase5-basket-server.cjs

# 2. Generate baskets for one LEGO manually using Claude
# (Use scaffold from test-scaffold-chinese.cjs as prompt)

# 3. Submit to server
curl -X POST http://localhost:3459/upload-basket \
  -H 'Content-Type: application/json' \
  -d '{
    "course": "cmn_for_eng",
    "seed": "S0001",
    "baskets": {
      "S0001L01": {
        "lego": {"known": "now", "target": "现在"},
        "practice_phrases": [
          {"known": "now", "target": "现在"},
          {"known": "I want now", "target": "我现在想"},
          ...
        ]
      }
    },
    "agentId": "test-manual"
  }'
```

### Option 2: Automated Test (Full S0001-S0010)
```bash
# Start automation system (if configured)
npm run automation

# Trigger Phase 5 for S0001-S0010
curl -X POST http://localhost:3459/regenerate \
  -H 'Content-Type: application/json' \
  -d '{
    "courseCode": "cmn_for_eng",
    "startSeed": 1,
    "endSeed": 10,
    "forceRegenerate": true
  }'
```

## Files to Review After Test

1. **Generated Baskets**: `public/vfs/courses/cmn_for_eng/lego_baskets.json`
   - Check S0001-S0010 entries
   - Verify is_final_lego is correct
   - Verify final LEGOs have seed sentence

2. **Sample Quality**: Pick 3-5 LEGOs and review:
   - Are phrases grammatically correct?
   - Are they natural and meaningful?
   - Do they follow GATE compliance?
   - Is there good progression?

3. **Comparison**: Compare against manually cleaned S0001-S0003
   - Better grammar?
   - More natural combinations?
   - No mechanical artifacts?

## Known Limitations

1. **Server not fully tested**: The upload-basket endpoint works but hasn't been tested with Chinese course data yet
2. **No automated quality checks**: Quality review is manual for now
3. **Deduplication**: Server doesn't auto-deduplicate (can run script after)

## Scripts Available

### Testing
- `scripts/test-scaffold-chinese.cjs` - Test scaffold generation

### Post-Generation Cleanup (if needed)
- `scripts/deduplicate-practice-phrases.cjs` - Remove duplicate phrases
- `scripts/derive-is-final-lego.cjs` - Fix is_final_lego if wrong
- `scripts/add-seed-to-final-basket.cjs` - Add missing seed sentences
- `scripts/compact-lego-baskets.cjs` - Reformat JSON

## Next Steps

1. **Run test** on S0001-S0010 (10 seeds, ~80 LEGOs)
2. **Review quality** - compare against manually cleaned S0001-S0003
3. **Decide**:
   - ✅ If good → regenerate all 668 seeds
   - ⚠️ If issues → adjust scaffolding/prompts and retry

## System Architecture Summary

```
Agent (Claude Code/Sonnet)
  ↓ reads scaffold from generate-text-scaffold.cjs
  ↓ generates practice_phrases only
  ↓ submits JSON to server
  ↓
Server (phase5-basket-server.cjs)
  ↓ receives baskets
  ↓ enriches with is_final_lego, phrase_count, seed sentence
  ↓ validates format
  ↓ merges into lego_baskets.json
  ↓
Output: lego_baskets.json (ready for git/Vercel)
```

**Key Principle**:
- **Agent does**: Linguistic intelligence (generate natural phrases)
- **Server does**: Mechanical work (derive metadata, validate, merge)

---

**Last Updated**: 2025-11-19
**Test Status**: Ready for S0001-S0010 test run
