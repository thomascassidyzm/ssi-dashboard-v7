# Parallelization Test Plan: S0001-S0020 Recreation

**Objective**: Test Claude Code's ability to parallelize LLM tasks (LEGO extraction & basket generation) by recreating work we've already completed at high quality.

**Benefit**: We have reference outputs to compare against, allowing us to identify quality issues, coordination challenges, and best practices.

---

## Test Structure

### Phase A: Parallel LEGO Extraction (Phase 3)
**Task**: Extract LEGOs from S0001-S0020 seed pairs
**Parallelization**: 4 agents, 5 seeds each

### Phase B: Parallel Basket Generation (Phase 5)
**Task**: Generate practice phrase baskets for S0001-S0020
**Parallelization**: 4 agents, 5 seeds each

---

## Phase A: LEGO Extraction Test

### Input Data
- **Source**: `seed_pairs.json` (S0001-S0020)
- **Reference Output**: `lego_pairs.json` (S0001-S0020 entries)

### Agent Batches
```
Agent 1: S0001-S0005 (5 seeds, ~12 LEGOs)
Agent 2: S0006-S0010 (5 seeds, ~12 LEGOs)
Agent 3: S0011-S0015 (5 seeds, ~12 LEGOs)
Agent 4: S0016-S0020 (5 seeds, ~12 LEGOs)
```

### Agent Task Template
```
# Task: Extract LEGOs from Seeds S00XX-S00YY

You are extracting LEGOs (building blocks) from Spanish seed sentences.

## Your Input
- Seeds S00XX through S00YY from seed_pairs.json
- Phase 3 intelligence document (lego extraction rules)
- Access to ALL previous LEGOs (S0001-S00(XX-1))

## Your Output
A JSON file with your batch of LEGOs following the Phase 3 format.

## Critical Rules
1. **Functionally Deterministic (FD)**: Each KNOWN phrase must map to exactly ONE TARGET
2. **Atomic (A) vs Molecular (M)**:
   - A = single word
   - M = multi-word with component breakdown
3. **Complete Tiling**: Show ALL LEGOs that reconstruct each seed (new + referenced)
4. **Cumulative Tracking**: Track total LEGOs learned so far

## Process
1. Read seeds S00XX-S00YY
2. For each seed:
   - Extract minimal FD chunks
   - Mark new LEGOs vs references to earlier seeds
   - Provide component breakdowns for Molecular LEGOs
   - Verify seed reconstructs from LEGOs
3. Output your batch as JSON

## Success Criteria
- Every seed perfectly reconstructs from its LEGOs
- All LEGOs are FD (one-to-one mapping)
- Proper type classification (A vs M)
- Correct component decomposition for M-type LEGOs
```

### Coordination Challenge
**The Problem**: Agent 2 needs to know what Agent 1 extracted to mark references correctly.

**Solutions to Test**:
1. **Sequential Dependencies**: Agent 2 waits for Agent 1, Agent 3 waits for Agent 2, etc.
2. **Provisional IDs**: Each agent uses provisional IDs, coordinator merges and renumbers
3. **Shared Context**: All agents work from a master LEGO list that updates in real-time

---

## Phase B: Basket Generation Test

### Input Data
- **Source**: `lego_pairs.json` (complete through S0020)
- **Reference Output**: `baskets/lego_baskets_s00XX.json` (S0001-S0020)

### Agent Batches
```
Agent 1: S0001-S0005 (5 baskets)
Agent 2: S0006-S0010 (5 baskets)
Agent 3: S0011-S0015 (5 baskets)
Agent 4: S0016-S0020 (5 baskets)
```

### Agent Task Template
```
# Task: Generate Practice Baskets for Seeds S00XX-S00YY

You are creating practice phrase baskets for Spanish learners.

## Your Input
- Complete lego_pairs.json (all LEGOs through S0020)
- Phase 5 intelligence document (basket generation rules)
- Your assigned seeds: S00XX through S00YY

## Your Output
5 basket JSON files, one per seed, following the basket format exactly.

## Critical Rules

### 1. GATE COMPLIANCE (Exact Forms Only)
Every Spanish word must be the EXACT form taught in LEGOs.
- Build whitelist from all LEGOs taught before and including current seed
- NO conjugations, NO derivations
- Zero tolerance: one untaught form = reject phrase

### 2. COMPLETENESS
- First 2 phrases: fragments OK
- Remaining 8 phrases: complete standalone thoughts

### 3. NATURALNESS
- Would a real person say this?
- Quality over quantity

## Distribution Target (per 10 phrases)
- 2 short (1-2 LEGOs) - fragments OK
- 2 quite short (3 LEGOs) - complete thoughts
- 2 longer (4-5 LEGOs) - pattern combinations
- 4 long (6+ LEGOs, avg 7-10 words) - conversational gold

## Process
For each seed in your batch:
1. Build GATE whitelist (all exact forms through current seed)
2. Generate 10-12 practice phrases
3. Validate each phrase:
   - GATE compliant?
   - Complete (if not in first 2)?
   - Natural?
4. Select best 10 matching distribution
5. Output basket JSON

## Success Criteria
- Zero GATE violations
- Proper distribution maintained
- All phrases natural and useful
- Final LEGO includes full seed sentence
```

### Coordination Challenge
**The Problem**: Agents are independent but all need access to same LEGO database.

**Solutions to Test**:
1. **Shared Read-Only Data**: All agents read from same lego_pairs.json
2. **No Coordination Needed**: Basket generation is embarrassingly parallel!

---

## Validation Strategy

### Automated Checks
1. **JSON Validity**: All outputs parse correctly
2. **Format Compliance**: Match reference structure exactly
3. **GATE Validation**: Script to check all words are in whitelist
4. **Distribution Check**: Verify phrase length distribution

### Quality Comparison
Compare agent outputs vs reference (S0001-S0020):

**Phase 3 (LEGO Extraction)**:
- LEGOs extracted: same count?
- LEGO IDs: exact match or logical equivalents?
- Type classification (A vs M): matches?
- Component breakdowns: accurate?
- Seed reconstruction: perfect?

**Phase 5 (Basket Generation)**:
- GATE violations: 0 in both?
- Distribution: both meet targets?
- Naturalness: subjective comparison
- Phrase quality: which set is better?

### Success Metrics

**Phase 3 Success**:
- ✅ 95%+ LEGO extraction accuracy vs reference
- ✅ 100% seed reconstruction
- ✅ Correct type classification
- ✅ Agents complete within 10 minutes

**Phase 5 Success**:
- ✅ 100% GATE compliance (zero violations)
- ✅ Distribution targets met
- ✅ Phrases judged "natural" in blind review
- ✅ Agents complete within 15 minutes

---

## Identified Challenges

### Challenge 1: Sequential Dependencies in Phase 3
**Issue**: Agent 2 needs Agent 1's output to mark LEGO references correctly.

**Test Approaches**:
- Sequential: 1→2→3→4 (defeats parallelization)
- Provisional: All work independently, merge after (coordination complexity)
- Hybrid: Agents 1+2 run, then 3+4 run (2x speedup)

### Challenge 2: Quality Consistency
**Issue**: Different agents may make different extraction/generation choices.

**Mitigation**:
- Crystal-clear task templates
- Reference examples in prompts
- Validation scripts that auto-reject bad outputs

### Challenge 3: Communication Overhead
**Issue**: Orchestrating 4+ agents may take longer than sequential work.

**Test**:
- Measure total wall-clock time
- Compare vs single-agent sequential time
- Identify optimal batch size

---

## Execution Plan

### Step 1: Single Batch Test (validate approach)
- Run Agent 1 on S0001-S0005 only
- Compare output vs reference
- Refine task template based on results

### Step 2: Parallel Batch Test (2 agents)
- Run Agent 1 (S0001-S0005) + Agent 2 (S0006-S0010) in parallel
- Test coordination mechanism
- Measure timing

### Step 3: Full Parallel Test (4 agents)
- Run all 4 agents on S0001-S0020
- Compare full output vs reference
- Document lessons learned

### Step 4: Scale Test (if successful)
- Apply to S0021-S0100 (Spanish) or S0001-S0100 (Chinese)
- 10 agents, 10 seeds each

---

## Files to Create

### Test Inputs
- `test/parallel/seed_pairs_s0001_s0020.json` - Extracted subset for test

### Task Prompts
- `test/parallel/phase3_agent_task.md` - LEGO extraction task template
- `test/parallel/phase5_agent_task.md` - Basket generation task template

### Test Outputs
- `test/parallel/output/agent1_legos.json`
- `test/parallel/output/agent2_legos.json`
- `test/parallel/output/agent3_legos.json`
- `test/parallel/output/agent4_legos.json`

### Validation Scripts
- `test/parallel/validate_legos.cjs` - Compare against reference
- `test/parallel/validate_baskets.cjs` - Check GATE compliance

---

## Next Steps

1. **Create test data files** (S0001-S0020 extracts)
2. **Write detailed agent task prompts** with examples
3. **Create validation scripts** for automated checking
4. **Run single-agent test** to validate approach
5. **Run parallel test** and measure results
6. **Document findings** and recommendations

---

**Key Insight**: We're not trying to beat our sequential approach on S0001-S0020. We're using known-good outputs to *validate* that parallelization works and identify the *real challenges* before scaling to 100 seeds.
