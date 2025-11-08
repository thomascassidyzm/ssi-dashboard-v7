# Phase 5 Cached Context Testing Plan

**Date**: 2025-11-08
**Purpose**: Validate new approach (cached full seed context + sliding focus) before full rollout
**Strategy**: Test single agent first, then parallel execution

---

## 🎯 Test Objectives

### Primary Goals

1. **Validate cached context architecture**
   - Confirm all 668 seeds load into cache
   - Verify sliding focus window works correctly
   - Ensure agents can mine patterns from full context

2. **Assess quality improvement**
   - Compare to baseline (v4.1 without full context)
   - Measure recency compliance (60-80% target)
   - Measure pattern diversity (70-80% target)
   - Overall quality score (target 5.0/5)

3. **Validate parallelization**
   - Confirm 5 agents can run simultaneously
   - Verify cache hits work properly
   - Check rate limit compliance
   - Ensure no coordination issues

### Secondary Goals

4. **Test across course positions**
   - Early seeds (minimal vocab)
   - Middle seeds (moderate vocab)
   - Late seeds (extensive vocab)
   - Verify approach works everywhere

5. **Measure costs**
   - Cache write vs cache read costs
   - Compare to no-caching approach
   - Verify 47% savings projection

---

## 📊 Test Design

### Test 1: Single Agent (Baseline Quality)

**Scope**: 5 seeds from middle of course

**Seeds**: S0301-S0305

**Why these seeds?**
- Middle of course (good vocab availability ~567 words)
- Recent enough to have interesting patterns
- We already tested S0301 in previous work (can compare)

**Configuration**:
```json
{
  "test_id": "test_1_single_agent",
  "agent_id": "test_agent_01",
  "seeds": "S0301-S0305",
  "cached_context": "all_668_seeds",
  "focus_window_size": 5,
  "expected_legos": "~10-12 LEGOs"
}
```

**Expected focus windows**:
- S0301: Focus S0296-S0300
- S0302: Focus S0297-S0301
- S0303: Focus S0298-S0302
- S0304: Focus S0299-S0303
- S0305: Focus S0300-S0304

**What to measure**:
- ✅ Cache write successful (235K tokens)
- ✅ All 668 seeds accessible to agent
- ✅ Phrases use recent vocabulary (target: 60-80%)
- ✅ Pattern diversity (target: 70-80%)
- ✅ Quality score (target: 5.0/5)
- ✅ GATE compliance (100%)
- ✅ No duplicates
- ✅ Correct distribution (2-2-2-4)

---

### Test 2: Parallel Agents (5 from Different Areas)

**Scope**: 5 agents × 5 seeds each = 25 seeds total

**Agent distribution** (diverse positions):

| Agent | Seeds | Position | Whitelist Size | Why Selected |
|-------|-------|----------|----------------|--------------|
| **A** | S0001-S0005 | Start | ~25 words | Minimal vocab, foundational patterns |
| **B** | S0150-S0154 | Early-mid | ~300 words | Moderate vocab, established patterns |
| **C** | S0301-S0305 | Middle | ~567 words | Rich vocab, complex patterns |
| **D** | S0450-S0454 | Late-mid | ~750 words | Extensive vocab, advanced patterns |
| **E** | S0600-S0604 | Near end | ~950 words | Maximum vocab, sophisticated patterns |

**Why diverse positions?**
- Tests that caching works regardless of course position
- Different whitelist sizes (25 → 950 words)
- Different recency contexts
- Validates approach generalizes

**Configuration**:
```json
{
  "test_id": "test_2_parallel_5agents",
  "agents": [
    {
      "agent_id": "test_agent_A",
      "seeds": "S0001-S0005",
      "position": "start",
      "expected_legos": "~10"
    },
    {
      "agent_id": "test_agent_B",
      "seeds": "S0150-S0154",
      "position": "early_mid",
      "expected_legos": "~10"
    },
    {
      "agent_id": "test_agent_C",
      "seeds": "S0301-S0305",
      "position": "middle",
      "expected_legos": "~10"
    },
    {
      "agent_id": "test_agent_D",
      "seeds": "S0450-S0454",
      "position": "late_mid",
      "expected_legos": "~10"
    },
    {
      "agent_id": "test_agent_E",
      "seeds": "S0600-S0604",
      "position": "near_end",
      "expected_legos": "~10"
    }
  ],
  "cached_context": "all_668_seeds",
  "launch_strategy": "simultaneous",
  "expected_duration": "~10 minutes"
}
```

**What to measure**:
- ✅ All 5 agents complete successfully
- ✅ Agent A: Cache write ($0.88)
- ✅ Agents B-E: Cache hits ($0.07 each)
- ✅ No rate limit errors
- ✅ Execution time (~10 minutes)
- ✅ Quality consistent across all positions
- ✅ Recency focus works at start (S0001) and end (S0600)
- ✅ Pattern mining works everywhere

---

## 📋 Implementation Steps

### Prerequisites

**1. Build seed reference library**
```bash
# Create script to extract all 668 seeds from lego_pairs.json
node scripts/build_seed_reference_library.cjs \
  --input public/vfs/courses/spa_for_eng/lego_pairs.json \
  --output phase5_tests/seed_reference_library.json
```

**Output**: `seed_reference_library.json` (~900KB)
```json
{
  "version": "1.0",
  "total_seeds": 668,
  "purpose": "Complete seed corpus for prompt caching",
  "seeds": [
    {
      "seed_id": "S0001",
      "target": "Quiero hablar español contigo ahora.",
      "known": "I want to speak Spanish with you now.",
      "new_legos": [
        {"target": "quiero", "known": "I want", "type": "A"},
        {"target": "hablar", "known": "to speak", "type": "A"},
        ...
      ]
    },
    ...
  ]
}
```

---

**2. Create test scaffolds**
```bash
# Generate scaffolds for test agents
node scripts/create_basket_scaffolds_v2.cjs \
  --test-mode \
  --agents "A:S0001-S0005,B:S0150-S0154,C:S0301-S0305,D:S0450-S0454,E:S0600-S0604"
```

**Output**: 5 scaffold files
- `phase5_tests/test_agent_A_scaffold.json`
- `phase5_tests/test_agent_B_scaffold.json`
- `phase5_tests/test_agent_C_scaffold.json`
- `phase5_tests/test_agent_D_scaffold.json`
- `phase5_tests/test_agent_E_scaffold.json`

Each contains:
- Whitelist (appropriate size for position)
- LEGOs to generate
- Empty practice_phrases arrays

---

**3. Update v4.1 prompt for caching**
```bash
# Create v4.2 prompt with caching markers
cp docs/phase_intelligence/AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md \
   docs/phase_intelligence/AGENT_PROMPT_phase5_v4.2_CACHED_CONTEXT.md
```

**Add to v4.2**:

```markdown
[CACHE: START]

# Phase 5 Basket Generation v4.2 - Cached Context

## Complete Seed Reference Library

You have access to ALL 668 seeds from the course. This is your reference
library for pattern mining and contextual understanding.

### Seed Library

{... include seed_reference_library.json content here ...}

### Pattern Mining Guidance

You can search through all seeds to find patterns similar to your current LEGO.

**Search strategies**:
1. Same word class (verb/noun/adjective)
2. Same root word or semantic field
3. Similar sentence structures
4. Thematic connections

**Example**: If generating for "worried"/"preocupado", you might:
- Search for "preocup" → find S0046 "no me preocupo"
- Search for "adjective + estar" → find patterns
- Build variations using discovered patterns

[CACHE: END]

---

[VARIABLE CONTEXT - PER TASK]

# Current Task

**Position**: {seed_id}
**LEGO**: {lego}
**Type**: {type}

**Whitelist**: {whitelist array}

**Recency Focus Window**: {focus_seeds}

IMPORTANT: Prioritize vocabulary and patterns from the focus window.
Target: 60-80% of phrases should use recent vocabulary or echo recent patterns.

You MAY reference other seeds from the full library if you find relevant
patterns, but maintain the recency focus.

**Task**: Generate 10 practice phrases following 2-2-2-4 distribution.

[END VARIABLE]
```

---

### Test 1: Single Agent Execution

**Run**:
```bash
# Execute test 1
node scripts/run_cached_generation_test.cjs \
  --test-id test_1_single_agent \
  --agent test_agent_C \
  --seeds S0301-S0305 \
  --output phase5_tests/test_1_output.json
```

**What happens**:
1. Loads seed_reference_library.json into cache
2. Loads test_agent_C_scaffold.json
3. For each LEGO in S0301-S0305:
   - Sets focus window (e.g., S0296-S0300 for S0301)
   - Generates 10 phrases
   - Validates GATE compliance
4. Writes output

**Monitor**:
- Cache write confirmation
- Generation progress
- Any GATE violations
- Quality indicators

**Duration**: ~5 minutes

---

### Test 2: Parallel Agent Execution

**Run**:
```bash
# Execute test 2
node scripts/run_parallel_cached_test.cjs \
  --test-id test_2_parallel_5agents \
  --agents A,B,C,D,E \
  --output-dir phase5_tests/test_2_outputs/
```

**What happens**:
1. Agent A launches (cache write)
2. Wait 2 seconds
3. Agents B, C, D, E launch simultaneously (cache hits)
4. All agents run in parallel
5. Monitor via Promise.allSettled
6. Collect all outputs

**Monitor**:
- Agent A cache write
- Agents B-E cache hits
- Parallel execution
- Completion times
- Any failures

**Duration**: ~10 minutes

---

## 🔬 Analysis & Validation

### For Each Test Output

**1. Automated Validation**
```bash
node scripts/validate_agent_baskets.cjs \
  --input phase5_tests/test_1_output.json \
  --detailed
```

**Checks**:
- ✅ GATE compliance (100% required)
- ✅ Distribution (2-2-2-4)
- ✅ No duplicates
- ✅ Final phrase accuracy (if is_final_lego)
- ✅ Format correctness

---

**2. Quality Assessment**
```bash
node scripts/assess_basket_quality.cjs \
  --input phase5_tests/test_1_output.json \
  --compare-to baseline
```

**Measures**:
- Recency compliance (% using focus window vocab)
- Pattern diversity (distinct patterns used)
- Naturalness (manual or AI scoring)
- Overall quality score (1-5)

---

**3. Pattern Analysis**
```bash
node scripts/analyze_patterns.cjs \
  --input phase5_tests/test_1_output.json
```

**Outputs**:
- Pattern distribution
- Evidence of pattern mining from full context
- Recency vs. historical pattern usage

---

**4. Cost Tracking**

**Capture from API responses**:
```json
{
  "test_1": {
    "cache_write": {
      "tokens": 235000,
      "cost": 0.88
    },
    "input_tokens": 1600,
    "input_cost": 0.005,
    "output_tokens": 1000,
    "output_cost": 0.015,
    "total_cost": 0.90
  },
  "test_2": {
    "agent_A": {
      "cache_write_cost": 0.88,
      "total_cost": 0.90
    },
    "agents_B_E": {
      "cache_read_cost": 0.07,
      "per_agent_cost": 0.09,
      "total_cost": 0.36
    },
    "test_2_total": 1.26
  }
}
```

---

## ✅ Success Criteria

### Test 1: Single Agent

**Must Pass**:
- [ ] Cache write successful (235K tokens)
- [ ] All 668 seeds accessible
- [ ] GATE compliance: 100%
- [ ] No duplicates: 0
- [ ] Distribution: 2-2-2-4 for all LEGOs
- [ ] Final phrases: 100% accurate

**Should Achieve**:
- [ ] Recency compliance: 60-80%
- [ ] Pattern diversity: 70-80%
- [ ] Quality score: ≥4.5/5
- [ ] Evidence of pattern mining from full context

**Nice to Have**:
- [ ] Quality score: 5.0/5
- [ ] Recency compliance: >80%

---

### Test 2: Parallel Agents

**Must Pass**:
- [ ] All 5 agents complete successfully
- [ ] Cache write: Agent A only
- [ ] Cache hits: Agents B-E
- [ ] No rate limit errors
- [ ] Completion time: <15 minutes

**Should Achieve**:
- [ ] Quality consistent across all agents
- [ ] All pass Test 1 success criteria
- [ ] Total cost: <$1.50
- [ ] Cost savings vs no-caching: >40%

**Nice to Have**:
- [ ] Completion time: <10 minutes
- [ ] Quality improvement at ALL positions (start to end)

---

## 📊 Expected Results

### Test 1 Predictions

**Recency compliance**:
- Baseline (5 recent seeds only): ~40-50%
- With full context: **70-80%** ✅

**Pattern diversity**:
- Baseline: ~62.8%
- With full context: **75-85%** ✅

**Quality**:
- Baseline: 4.5/5
- With full context: **4.8-5.0/5** ✅

**Why better?**
- Agent can mine related patterns from entire corpus
- Combines recency focus + pattern discovery
- Example: "worried" at S0301 can find S0046 "preocupo" pattern

---

### Test 2 Predictions

**All agents should achieve similar quality** regardless of position:

| Agent | Position | Whitelist | Expected Quality | Challenge |
|-------|----------|-----------|------------------|-----------|
| A | Start | 25 words | 4.5/5 | Limited vocab, simpler patterns |
| B | Early-mid | 300 words | 4.8/5 | Good vocab, emerging patterns |
| C | Middle | 567 words | 5.0/5 | Rich vocab, diverse patterns |
| D | Late-mid | 750 words | 5.0/5 | Extensive vocab, complex patterns |
| E | Near end | 950 words | 5.0/5 | Maximum vocab, sophisticated patterns |

**Cost**:
- Agent A (cache write): $0.90
- Agents B-E (cache hits): 4 × $0.09 = $0.36
- **Total: $1.26**

**vs. no caching**: 5 × $0.57 = $2.85
**Savings**: $1.59 (56%)

---

## 🚨 Failure Scenarios & Mitigation

### Scenario 1: Rate Limit Hit

**Symptom**: 429 error when launching parallel agents

**Mitigation**:
- Add 5-second delay between launches
- Reduce to 3 agents in parallel
- Check API tier

---

### Scenario 2: Cache Miss

**Symptom**: Agent B-E charged for cache write instead of read

**Diagnosis**:
- Check cache expiration (5 minutes)
- Verify cache markers in prompt

**Mitigation**:
- Re-run with longer cache TTL
- Ensure all agents use identical cached section

---

### Scenario 3: Low Recency Compliance

**Symptom**: <50% phrases use focus window vocabulary

**Diagnosis**:
- Check if focus window instruction clear
- Verify recent_vocabulary guidance

**Mitigation**:
- Strengthen recency emphasis in prompt
- Add explicit examples
- Consider adding recent_vocabulary quick-scan list

---

### Scenario 4: Poor Quality at Position Extremes

**Symptom**: Agent A (start) or E (end) lower quality

**Diagnosis**:
- Start: Too little vocab?
- End: Too much vocab (overwhelming)?

**Mitigation**:
- Adjust expectations per position
- Provide position-specific guidance

---

## 📁 Test Artifacts

### Generated Files

```
phase5_tests/
├── seed_reference_library.json        # All 668 seeds (cached)
├── test_agent_A_scaffold.json         # Agent A scaffold
├── test_agent_B_scaffold.json         # Agent B scaffold
├── test_agent_C_scaffold.json         # Agent C scaffold
├── test_agent_D_scaffold.json         # Agent D scaffold
├── test_agent_E_scaffold.json         # Agent E scaffold
├── test_1_output.json                 # Test 1 results
├── test_1_validation_report.json      # Test 1 validation
├── test_1_quality_assessment.json     # Test 1 quality analysis
├── test_2_outputs/
│   ├── agent_A_output.json
│   ├── agent_B_output.json
│   ├── agent_C_output.json
│   ├── agent_D_output.json
│   └── agent_E_output.json
├── test_2_validation_reports/         # Per-agent validation
├── test_2_quality_comparison.json     # Cross-agent quality
└── test_summary_report.md             # Human-readable summary
```

---

## 🎯 Next Steps After Testing

### If Test 1 Passes

**Action**: Proceed to Test 2

**Confidence**: Single agent architecture validated

---

### If Test 2 Passes

**Action**: Scale up to full course

**Options**:
1. **Conservative**: 10 seeds per agent (67 agents)
2. **Recommended**: 20 seeds per agent (34 agents)
3. **Aggressive**: 30 seeds per agent (23 agents)

**Decision criteria**:
- If quality consistent → use 20 seeds per agent
- If quality varies → use 10 seeds per agent
- If exceptional → try 30 seeds per agent

---

### If Tests Fail

**Troubleshoot**:
1. Review failure scenarios
2. Adjust configuration
3. Re-test smaller scope
4. Iterate

**Don't proceed to full course** until both tests pass!

---

## 💡 Key Insights to Validate

1. **Full context enables better pattern mining**
   - Expect to see evidence of patterns mined from non-recent seeds
   - Example: S0301 "worried" references S0046 "preocupo" pattern

2. **Recency focus still works with full context**
   - Despite having all 668 seeds, agents should still prioritize focus window
   - Target: 60-80% recent usage

3. **Position doesn't matter**
   - Quality should be consistent from S0001 to S0668
   - Architecture should generalize

4. **Caching saves cost**
   - Should see ~50% savings
   - Cache hits should be automatic for agents 2+

5. **Parallelization scales**
   - 5 agents should complete in ~10 minutes
   - No coordination issues
   - Clean error handling

---

## 📋 Test Execution Checklist

### Before Testing

- [ ] Build seed_reference_library.json
- [ ] Create 5 test scaffolds
- [ ] Update prompt to v4.2 (with caching)
- [ ] Verify API key and tier
- [ ] Clear any old test outputs

### During Test 1

- [ ] Monitor cache write (235K tokens)
- [ ] Watch for GATE violations
- [ ] Check progress (5 seeds, ~10-12 LEGOs)
- [ ] Note any errors

### After Test 1

- [ ] Run validation
- [ ] Assess quality
- [ ] Analyze patterns
- [ ] Calculate costs
- [ ] Document findings

### During Test 2

- [ ] Monitor Agent A cache write
- [ ] Verify Agents B-E cache hits
- [ ] Watch for rate limits
- [ ] Track completion times
- [ ] Monitor for failures

### After Test 2

- [ ] Run validation for all 5 agents
- [ ] Compare quality across positions
- [ ] Analyze cost savings
- [ ] Document any issues
- [ ] Write summary report

### Decision Point

- [ ] Both tests pass? → Scale to full course
- [ ] Issues found? → Iterate and re-test
- [ ] Ready to implement? → Build production scripts

---

**Test Plan Created**: 2025-11-08
**Status**: Ready for implementation
**Next Action**: Build seed_reference_library.json and test scaffolds
