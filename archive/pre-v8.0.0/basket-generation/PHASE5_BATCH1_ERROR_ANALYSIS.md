# Phase 5 Batch 1 Error Analysis & Fix Strategy

## Executive Summary

**Target**: 200 seeds (S0101-S0300), ~20 agents × 10 seeds each
**Completed**: 164/200 seeds (82%), BUT with critical format and content errors
**Status**: NEEDS MAJOR FIXES before deployment

---

## Error Categories

### 1. **STRUCTURAL FORMAT ERRORS** 🔴 CRITICAL

#### Problem: Two Different Formats Used

**Correct Format** (matches S0001-S0100 reference):
```json
{
  "version": "curated_v7_spanish",
  "seed": "S0101",
  "seed_pair": {...},
  "cumulative_patterns": [...],
  "cumulative_legos": 281,
  "S0101L01": { lego basket },
  "S0101L02": { lego basket },
  ...
}
```

**Wrong Format** (seed-grouped - used by most agents):
```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": 2,
  "S0111": {
    "seed_pair": {...},
    "legos": {
      "S0111L01": { lego basket },
      "S0111L02": { lego basket }
    }
  },
  "S0112": {...}
}
```

**Impact**:
- Dashboard expects correct format (LEGO-level keys at top)
- Merged file uses wrong format → incompatible with S0001-S0100
- Will break all Phase 6+ compilation

**Files Affected**:
- ✅ CORRECT: `lego_baskets_s0101.json` through `s0110.json` (Agent 01)
- ✅ CORRECT: `lego_baskets_s0181.json` through `s0190.json` (Agent 09)
- ❌ WRONG: `agent_02_baskets.json`, `agent_10_baskets.json`, etc. (15 files)
- ❌ WRONG: `baskets_s0101_s0300.json` (merged file)

**Count**:
- Correct format: 20 seeds (S0101-S0110, S0181-S0190)
- Wrong format: 144+ seeds (all agent_XX files)

---

### 2. **GATE VIOLATIONS** 🟡 HIGH PRIORITY

#### Agent 01 (S0101-S0110): 30 violations (6.25% of 480 phrases)

**Category A: Words Used Before Taught** (23 instances)
- S0101L02: "lenguaje" used before S0101L03
- S0106L02: "felices" used before S0106L03 (7 instances)
- S0104L01: "solo" ordering issue (4 instances)
- S0109L02: "nuevas" used before S0109L03
- S0110L01: "terminemos" ordering issue (2 instances)

**Category B: Untaught Words** (7 instances)
- S0103L02: "diciendo" (not in registry)
- S0104L03: "significa" (not in registry) - 3 instances
- S0105L01: "dije" (not in registry)
- S0108L03/L04: "desperté" (not in registry) - 5 instances
- S0110L03: "podemos" (not in registry) - 2 instances
- S0110L04: "tú", "yo" (not in registry)

**Other Agents**:
- Agent 20 (S0291-S0300): 2 violations FIXED (now clean)
- Agent 02-19: Unknown (need validation run)

---

### 3. **DISTRIBUTION ISSUES** 🟢 LOW PRIORITY

#### Target: 2-2-2-4 (2 short, 2 quite short, 2 longer, 4 long)

**Agent 01 Summary**:
- Achievement: ~92% meet or nearly meet targets
- Minor issues: Some off by 1 in word counts
- Example: 2-2-4-2 instead of 2-2-2-4

**Impact**: Low - doesn't break functionality, just suboptimal practice progression

---

### 4. **MISSING SEEDS** 🟡 HIGH PRIORITY

**Target**: S0101-S0300 (200 seeds)
**Completed**: 164 seeds (82%)
**Missing**: 36 seeds (18%)

**Incomplete Agents**:
- Agent 04 (S0131-S0140): Status doc exists, no baskets
- Agent 12 (S0221-S0230): 0 legos/phrases
- Agent 15 (S0261-S0270): 0 legos/phrases
- Partial agents: 01, 03, 05, 06, 07, 08, 09

**Agent Completion Status**:
```
Agent 01: 10 seeds ✅ (individual files only)
Agent 02: 10 seeds ✅ (S0111-S0120, wrong format)
Agent 03: 10 seeds ❌ (incomplete)
Agent 04: 0 seeds ❌ (planning only)
Agent 05: 10 seeds ❌ (incomplete)
Agent 06: 10 seeds ❌ (incomplete)
Agent 07: 10 seeds ❌ (incomplete)
Agent 08: 10 seeds ❌ (incomplete)
Agent 09: 10 seeds ✅ (S0181-S0190, individual files only)
Agent 10: 10 seeds ✅ (S0191-S0200, wrong format)
Agent 11: 10 seeds ✅ (wrong format)
Agent 12: 0 seeds ❌ (incomplete)
Agent 13: 10 seeds ❌ (incomplete)
Agent 14: 10 seeds ✅ (wrong format)
Agent 15: 0 seeds ❌ (incomplete)
Agent 16: 10 seeds ✅ (wrong format)
Agent 17: 10 seeds ⚠️ (45 legos, 0 phrases - structure only)
Agent 18: ? seeds
Agent 19: ? seeds
Agent 20: 10 seeds ✅ (S0291-S0300, wrong format)
```

**Estimated Complete**: ~6-7 agents fully complete (60-70 seeds)

---

## Fix Strategy

### Phase 1: Format Conversion (HIGH PRIORITY)

**Goal**: Convert all seed-grouped agent files to correct LEGO-level format

**Approach**:
1. Create `fix_basket_format.cjs` script
2. For each agent_XX_baskets.json file:
   - Extract each seed group (e.g., "S0111")
   - Create individual lego_baskets_s0111.json file
   - Use correct format (match S0001-S0100 structure)
   - Flatten "legos" nested object to top-level keys
3. Validate output matches reference format exactly

**Input**: 15 agent_XX_baskets.json files
**Output**: ~140 individual lego_baskets_sXXXX.json files
**Time**: 1-2 hours (script + validation)

---

### Phase 2: GATE Violation Fixes (HIGH PRIORITY)

**Goal**: Fix 30+ GATE violations to achieve 100% compliance

**Approach**:
1. Run validation on all converted files
2. Create `fix_gate_violations.cjs` script to:
   - Replace untaught words with taught alternatives
   - Reorder phrases to respect LEGO sequence
   - Validate against registry word availability
3. Manual review for natural Spanish after fixes

**Tools Needed**:
- LEGO registry (S0001-S0300) for word lookups
- Whitelist per LEGO (already generated in batch_output/whitelists.json)
- Validation script (exists: validate_baskets.js)

**Time**: 2-3 hours (automated fixes + manual review)

---

### Phase 3: Complete Missing Seeds (MEDIUM PRIORITY)

**Goal**: Generate baskets for 36 missing seeds

**Options**:
1. **Re-run incomplete agents** on Claude Code Web (fastest)
2. **Manual generation** for small gaps (highest quality)
3. **Hybrid**: Template generation + human curation

**Priority Seeds**:
- Critical gaps in sequence (S0121-S0130, S0141-S0180, S0201-S0290)
- Can defer S0301-S0668 to later batches

**Time**: 3-5 hours depending on approach

---

### Phase 4: Distribution Adjustments (LOW PRIORITY)

**Goal**: Fix 2-2-2-4 distribution where significantly off

**Approach**: Only fix egregious violations (e.g., 5-0-2-3)
**Time**: 1 hour

---

### Phase 5: Final Merge & Validation

**Goal**: Create single baskets_s0101_s0300.json in CORRECT format

**Steps**:
1. Merge all individual lego_baskets_sXXXX.json files
2. Use merge script from S0001-S0100 as template
3. Validate:
   - All 200 seeds present
   - GATE compliance 100%
   - Distribution ≥90%
   - Format matches reference exactly
4. Test in dashboard

**Time**: 1-2 hours

---

## Recommended Execution Order

### Critical Path (Get to working state):
1. ✅ **[2h]** Format conversion for existing ~140 seeds
2. ✅ **[2h]** Fix GATE violations (automated + spot checks)
3. ✅ **[1h]** Merge and validate
4. ✅ **[0.5h]** Test in dashboard

**Total Critical Path**: 5.5 hours → Working 140-160 seeds

### Enhancement Path (Complete to 200):
5. 🔄 **[4h]** Generate missing 36 seeds
6. 🔄 **[1h]** Distribution fine-tuning
7. 🔄 **[1h]** Final quality pass

**Total Enhancement**: 6 hours → Full 200 seeds

---

## Success Criteria

### Minimum Viable (Critical Path):
- ✅ 140+ seeds in correct format
- ✅ <1% GATE violations
- ✅ Dashboard loads and displays correctly
- ✅ Compatible with S0001-S0100 structure

### Full Success (Enhancement Path):
- ✅ 200 seeds complete
- ✅ 0% GATE violations
- ✅ >90% distribution compliance
- ✅ Native speaker quality check passed

---

## Key Files for Fixes

**Reference (Correct Format)**:
- `public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0001.json` through `s0100.json`
- `phase5_batch1_s0101_s0300/batch_output/lego_baskets_s0101.json` through `s0110.json`

**To Convert (Wrong Format)**:
- `phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json` (S0111-S0120)
- `phase5_batch1_s0101_s0300/batch_output/agent_10_baskets.json` (S0191-S0200)
- `phase5_batch1_s0101_s0300/batch_output/agent_11_baskets.json`
- `phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json`
- `phase5_batch1_s0101_s0300/batch_output/agent_16_baskets.json`
- `phase5_batch1_s0101_s0300/batch_output/agent_20_baskets.json` (S0291-S0300)

**Validation Tools**:
- `phase5_batch1_s0101_s0300/batch_output/whitelists.json` (GATE compliance)
- `phase5_batch1_s0101_s0300/validate_baskets.js` (existing validator)
- `phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json` (word registry)

**Error Reports**:
- `AGENT_01_SUMMARY.md` (30 GATE violations detailed)
- `AGENT_04_STATUS.md` (incomplete work)
- `AGENT_20_REPORT.md` (2 violations fixed, now clean)

---

## Next Actions

1. **Confirm strategy** with user
2. **Create format conversion script** (`fix_basket_format.cjs`)
3. **Run conversion** on all agent files
4. **Validate converted files**
5. **Fix GATE violations** systematically
6. **Merge and deploy** to dashboard for testing

**Estimated delivery**: Working 140-160 seeds in 5-6 hours
