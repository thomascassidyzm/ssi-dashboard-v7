# Phase 5: Basket Generation for S0101-S0668 (AUTONOMOUS EXECUTION)

**Status**: Ready to launch in new session
**Expected Duration**: 6-8 hours (overnight run)
**Branch**: `claude/extract-legos-batch-1-011CUsmApVGdYx3pqs26DAaK`

---

## Mission: Generate 10 Practice Baskets per Seed

Generate high-quality conversational practice baskets for 568 seeds (S0101-S0668) using 3-batch parallel execution strategy.

---

## Complete Specification Document

**READ FIRST**: `docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md`

This document contains ALL requirements, validation rules, and quality criteria.

---

## Execution Strategy: 3 Sequential Batches

### Batch 1: S0101-S0300 (200 seeds)
- **Input LEGOs**: Extract from existing lego_pairs files for S0101-S0300
- **Registry**: All LEGOs from S0001-S0300 (for GATE validation)
- **Agents**: 20 parallel agents × 10 seeds each
- **Output**: `phase5_batch1_s0101_s0300/batch_output/agent_XX_baskets.json` (20 files)

### Batch 2: S0301-S0500 (200 seeds)
- **Input LEGOs**: Extract from existing lego_pairs files for S0301-S0500
- **Registry**: All LEGOs from S0001-S0500 (for GATE validation)
- **Agents**: 20 parallel agents × 10 seeds each
- **Output**: `phase5_batch2_s0301_s0500/batch_output/agent_XX_baskets.json` (20 files)

### Batch 3: S0501-S0668 (168 seeds)
- **Input LEGOs**: Extract from existing lego_pairs files for S0501-S0668
- **Registry**: All LEGOs from S0001-S0668 (complete, for GATE validation)
- **Agents**: 17 agents × 10 seeds + 3 agents × 6 seeds (or adjust distribution)
- **Output**: `phase5_batch3_s0501_s0668/batch_output/agent_XX_baskets.json` (20 files)

---

## Critical Requirements (Three Sacred Rules)

### 1. GATE COMPLIANCE (Zero Tolerance)
- Every Spanish word must be EXACT form taught in LEGOs
- NO conjugations allowed (if "quiero" taught, cannot use "quiere")
- Build whitelist from ALL taught LEGOs through current seed
- One untaught form = reject phrase immediately

### 2. COMPLETENESS (Context Dependent)
- First 2 phrases (1-2 LEGOs): **Fragments OK**
- Remaining 8 phrases: **Complete standalone thoughts only**
- No incomplete constructions

### 3. NATURALNESS & SPEAKABILITY (Both Languages)
- **CRITICAL**: Phrases must be natural in BOTH Spanish AND English
- Learner hears English prompt, so clunky English = poor experience
- Would-say test: Would a native speaker actually say this?
- Natural word order in both languages

### Additional Requirements
- **Distribution**: 2 short (1-2 LEGOs), 2 quite short (3), 2 longer (4-5), 4 long (6+)
- **Conjunctions**: Only available AFTER taught as LEGOs
- **Final LEGO**: Last phrase = complete seed sentence
- **Recency**: Prioritize vocab/patterns from 5 previous seeds
- **English Gerunds**: "enjoy speaking" NOT "enjoy to speak"
- **Speakability for 4+ LEGO phrases**: Must be natural in both languages

---

## Workflow for Each Batch

### Step 1: Preparation (15 minutes)
1. Create batch directory structure:
   ```
   phase5_batchX_sYYYY_sZZZZ/
   ├── batch_input/          # Agent input files
   ├── batch_output/         # Agent output files
   ├── registry/             # LEGO registry for GATE validation
   ├── prepare_batch.cjs     # Preparation script
   ├── merge_batch.cjs       # Merge script
   └── validate_batch.cjs    # Validation script
   ```

2. Extract LEGOs from existing lego_pairs files
3. Build complete registry (S0001 through batch end)
4. Split seeds into 20 agent assignments
5. Create 20 batch input JSON files

### Step 2: Launch 20 Parallel Agents (2-3 hours per batch)
Launch all 20 agents simultaneously using Task tool with subagent_type="general-purpose"

**Agent Prompt Template**:
```
Generate baskets for Agent X: sYYYY-sZZZZ

Input: phase5_batchX_sYYYY_sZZZZ/batch_input/agent_XX_seeds.json
Registry: phase5_batchX_sYYYY_sZZZZ/registry/lego_registry_s0001_sZZZZ.json
Output: phase5_batchX_sYYYY_sZZZZ/batch_output/agent_XX_baskets.json

Read complete spec: docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md

For each seed in your assignment:
1. Generate 10 practice phrases per LEGO
2. Follow 2-2-2-4 distribution (2 short, 2 quite short, 2 longer, 4 long)
3. Enforce GATE: Only exact Spanish forms from taught LEGOs
4. First 2 phrases: fragments OK
5. Remaining 8: complete thoughts only
6. Naturalness: Both Spanish AND English must be conversational
7. Speakability: 4+ LEGO phrases must be natural in BOTH languages
8. Final LEGO: Include complete seed sentence as last phrase
9. Recency: Prioritize vocab from 5 previous seeds

GATE validation:
- Build whitelist from registry (exact forms only)
- Check EVERY Spanish word against whitelist
- Reject phrase if ANY word not in whitelist

Output format: Match structure in docs exactly.

Return: "Agent X complete: Y seeds processed, Z total baskets"
```

### Step 3: Merge Outputs (5 minutes)
1. Combine 20 agent outputs
2. Verify all seeds present
3. Create consolidated basket file

### Step 4: Validation (10 minutes)
Run comprehensive validation:
- ✅ All seeds have baskets (200 or 168)
- ✅ 10 phrases per LEGO
- ✅ Distribution: 2-2-2-4 per LEGO
- ✅ GATE compliance: All Spanish words in registry
- ✅ Completeness: First 2 can be fragments, rest complete
- ✅ Naturalness: Both languages pass would-say test
- ✅ Speakability: 4+ LEGO phrases natural in both languages
- ✅ Final LEGO: Includes complete seed
- ✅ Valid JSON structure

### Step 5: Fix Issues (Variable time)
If validation fails:
1. Identify problematic seeds/LEGOs
2. Re-run specific agents for those seeds only
3. Re-merge and re-validate
4. Repeat until 100% pass

### Step 6: Commit & Push (5 minutes)
```bash
git add phase5_batchX_sYYYY_sZZZZ/
git commit -m "Complete Batch X: Basket generation for sYYYY-sZZZZ"
git push -u origin claude/extract-legos-batch-1-011CUsmApVGdYx3pqs26DAaK
```

### Step 7: Proceed to Next Batch
Only after current batch validates 100%

---

## Input Data Locations

### LEGO Pairs (Source Data)
- `phase3_batch1_s0201_s0360/lego_pairs_s0201_s0360.json`
- `phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json`
- `phase3_batch3_s0521_s0668/lego_pairs_s0521_s0668.json`

### Earlier LEGOs (For Registry)
- S0001-S0100: Available in existing files
- S0101-S0200: Available in existing files

### Registry Building
For each batch, build complete registry from S0001 through batch end seed.

---

## Validation Scripts Structure

### validate_batch.cjs
```javascript
// Check 1: All seeds present
// Check 2: 10 phrases per LEGO
// Check 3: 2-2-2-4 distribution
// Check 4: GATE compliance (word-by-word)
// Check 5: Completeness (fragments in first 2 only)
// Check 6: Naturalness (would-say test)
// Check 7: Speakability (4+ LEGOs, both languages)
// Check 8: Final seed in last LEGO
// Check 9: Valid JSON
```

---

## Error Recovery Procedures

### Missing Seeds
- Identify which agent was responsible
- Re-run that agent only
- Re-merge outputs

### GATE Violations
- Identify violating phrase
- Check against registry
- Either fix registry (if LEGO was taught) or remove phrase
- Re-validate

### Distribution Errors
- Identify LEGOs with wrong distribution
- Re-generate just those LEGOs
- Re-merge

### Speakability Failures
- Flag phrases with 4+ LEGOs that are unnatural
- Regenerate those specific phrases
- Prioritize natural flow in both languages

---

## Progress Tracking

After each major step, output:
```
=== BATCH X PROGRESS ===
✅ Preparation complete
✅ 20 agents launched
⏳ Agents running (XX/20 complete)
✅ All agents complete
✅ Merge complete
⏳ Validation running
✅ Validation passed (or ❌ X errors)
✅ Committed and pushed
```

---

## Success Criteria

**Batch Complete When:**
- ✅ All seeds have baskets
- ✅ 100% GATE compliance
- ✅ 100% distribution compliance (2-2-2-4)
- ✅ 100% completeness compliance
- ✅ 100% naturalness (both languages)
- ✅ 100% speakability (4+ LEGO phrases)
- ✅ All final LEGOs include seed
- ✅ Committed and pushed to remote

---

## Estimated Timeline

- **Batch 1**: 2.5-3 hours (200 seeds)
- **Batch 2**: 2.5-3 hours (200 seeds)
- **Batch 3**: 2-2.5 hours (168 seeds)
- **Total**: 7-8.5 hours

With error fixing, expect 8-10 hours total.

---

## Final Output Structure

```
phase5_batch1_s0101_s0300/
  ├── batch_input/agent_01_seeds.json ... agent_20_seeds.json
  ├── batch_output/agent_01_baskets.json ... agent_20_baskets.json
  ├── baskets_s0101_s0300.json (merged final output)
  ├── registry/lego_registry_s0001_s0300.json
  ├── prepare_batch.cjs
  ├── merge_batch.cjs
  └── validate_batch.cjs

phase5_batch2_s0301_s0500/
  └── (same structure)

phase5_batch3_s0501_s0668/
  └── (same structure)
```

---

## Launch Command for New Session

```
Generate baskets for S0101-S0668 in 3 batches with 20 parallel agents per batch.

Read: PHASE5_BASKET_GENERATION_LAUNCH.md
Spec: docs/phase_intelligence/phase_5_conversational_baskets_v3_ACTIVE.md

Execute autonomously:
- Batch 1: S0101-S0300 (200 seeds)
- Batch 2: S0301-S0500 (200 seeds)
- Batch 3: S0501-S0668 (168 seeds)

Validate after each batch. Fix issues. Move to next batch only when current batch 100% validated.

Track progress. Commit after each batch.

Branch: claude/extract-legos-batch-1-011CUsmApVGdYx3pqs26DAaK
```

---

**END OF LAUNCH DOCUMENT**
