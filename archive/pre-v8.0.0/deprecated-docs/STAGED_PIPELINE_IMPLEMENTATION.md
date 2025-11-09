# Staged Pipeline Implementation - Phase 5 Basket Generation

**Date**: 2025-11-07
**Status**: ✅ Implementation Complete - Ready for Testing
**Purpose**: Separate mechanical and linguistic tasks for efficient, high-quality basket generation

---

## 🎯 Overview

The staged pipeline approach separates basket generation into distinct stages, using the right tool for each job:
- **Scripts**: Handle mechanical tasks (whitelist building, structure, validation)
- **LLM with extended thinking**: Handle linguistic tasks (phrase generation)

This addresses the quality inconsistency found in Batch 2 (Agent 01: 1.9/5 vs Agent 03: 4.6/5).

---

## 📊 Root Cause Analysis (Why We Needed This)

### Problem Identified:
Agent 01 used **template-based phrase generation**:
```python
f"I think that {lego} is good"
f"She said that {lego} is here"
```

**Result**: Unnatural phrases treating all LEGOs as nouns:
- "I want wants" ❌ (verb treated as noun)
- "This is said" ❌ (verb treated as noun)
- "I know met" ❌ (verb treated as noun)

### Solution:
**Separate mechanical from linguistic**:
1. Script builds whitelists, structure, metadata (instant)
2. LLM fills phrase arrays using extended thinking (quality)
3. Script validates GATE compliance (instant)
4. Optional LLM reviews naturalness (quality)

---

## 🏗️ Four-Stage Pipeline

### Stage 1: Scaffold Generation (Script) ✅

**Script**: `scripts/create_basket_scaffolds.cjs`

**Input**: `agent_XX_seeds.json`
**Output**: `agent_XX_scaffold.json`

**What it does**:
- Loads LEGO registry
- Builds whitelist per seed (all Spanish words available up to that seed)
- Calculates metadata (available_legos, is_final_lego)
- Creates JSON structure with **EMPTY practice_phrases arrays**
- Time: ~5 seconds per agent

**Example output**:
```json
{
  "seeds": {
    "S0301": {
      "seed": "S0301",
      "seed_pair": {
        "target": "Él dijo que quiere mostrarte algo.",
        "known": "He said that he wants to show you something."
      },
      "whitelist": ["él", "dijo", "que", "quiere", "mostrarte", "algo", ...],
      "legos": {
        "S0301L05": {
          "lego": ["to show you", "mostrarte"],
          "type": "A",
          "is_final_lego": false,
          "available_legos": 839,
          "practice_phrases": [],  // ← EMPTY - agent fills this
          "_metadata": {
            "whitelist_size": 567,
            "seed_context": {...}
          }
        }
      }
    }
  }
}
```

**Usage**:
```bash
node scripts/create_basket_scaffolds.cjs \
  phase5_batch2_s0301_s0500/batch_input/agent_01_seeds.json \
  phase5_batch2_s0301_s0500/scaffolds/agent_01_scaffold.json
```

**Test Result**: ✅ Tested on Agent 01 (S0301-S0320)
- Processed: 20 seeds, 44 NEW LEGOs
- Time: ~2 seconds
- Output: Valid scaffold with empty phrase arrays

---

### Stage 2: Phrase Generation (LLM with Extended Thinking) 🧠

**Prompt**: `docs/phase_intelligence/AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md`

**Input**: `agent_XX_scaffold.json` (from Stage 1)
**Output**: `agent_XX_baskets.json` (same structure, practice_phrases filled)

**What LLM does**:
- Reads scaffold (all mechanical setup done)
- For each NEW LEGO:
  - Uses **extended thinking** to understand word class and context
  - Generates 10 natural phrases (2-2-2-4 distribution)
  - Validates each Spanish word against whitelist
  - Ensures phrases sound natural in both languages
- Updates phrase_distribution counts
- Saves completed JSON

**Key prompt improvements (v4.1)**:

1. **Explicit anti-automation** ⭐⭐⭐:
   ```markdown
   ❌ PROHIBITED:
   - Write Python/JavaScript scripts to generate phrases
   - Use template-based generation (f-strings)
   - Mechanically substitute LEGO text into patterns

   ✅ REQUIRED:
   - Think through each phrase individually
   - Use extended thinking (<thinking> tags)
   - Understand grammatical role
   - Create natural usage
   ```

2. **Word class awareness** ⭐⭐:
   ```markdown
   VERB LEGOs (like "wants", "said"):
   ✅ "She wants coffee" (verb with object)
   ❌ "I know wants" (verb as noun)

   NOUN LEGOs (like "coffee"):
   ✅ "I want coffee" (noun as object)
   ```

3. **Clear task definition**:
   - "Fill in practice_phrases arrays ONLY"
   - "DO NOT modify whitelist, metadata, structure"
   - "Whitelist is provided - use it for validation"

**Time**: 30-60 minutes per agent (with extended thinking for quality)

---

### Stage 3: Mechanical Validation (Script) ✅

**Script**: `scripts/validate_agent_baskets.cjs`

**Input**: `agent_XX_baskets.json` (from Stage 2)
**Output**: `agent_XX_validation_report.json`

**What it validates**:

1. **Format validation**:
   - JSON structure correct
   - All required fields present
   - 10 phrases per LEGO
   - Phrase format: [english, spanish, null, word_count]

2. **GATE validation** (word-by-word):
   - Tokenize each Spanish phrase
   - Check every word against whitelist
   - Report violations with LEGO ID and phrase index

3. **Distribution validation**:
   - Calculate actual distribution per LEGO
   - Compare to 2-2-2-4 target
   - Report mismatches

4. **Final phrase validation**:
   - If `is_final_lego: true`, phrase 10 must be complete seed sentence

**Compatibility**:
- ✅ Works with scaffold-based baskets (whitelist included)
- ✅ Works with v4.0 baskets (builds whitelist from registry on-the-fly)

**Usage**:
```bash
node scripts/validate_agent_baskets.cjs \
  phase5_batch2_s0301_s0500/batch_output/agent_03_baskets.json \
  phase5_batch2_s0301_s0500/validation/agent_03_validation_report.json
```

**Test Results**:
- ✅ Agent 03 (S0341-S0360): 133 LEGOs, 1330 phrases, 0 violations, PASS
- ✅ Agent 01 (S0301-S0320): 102 LEGOs, 1020 phrases, 0 violations, PASS (with 1 distribution warning)

**Time**: ~2 seconds per agent

---

### Stage 4: Quality Review (Optional LLM) 🧠

**Purpose**: Sample-based naturalness checking

**Process**:
1. Randomly sample 10% of LEGOs (or specific LEGOs flagged as risky)
2. LLM reviews each phrase for naturalness
3. Score 1-5: 5 = perfect, 1 = unnatural
4. Report average score and systematic issues

**Example prompt**:
```markdown
Review these 10 LEGOs for naturalness:

For each phrase, score 1-5:
- 5: Perfect, native-level natural
- 4: Good, minor stiffness
- 3: Acceptable, slightly textbook
- 2: Awkward, forced
- 1: Unnatural, wouldn't say

Report:
- Average quality score per LEGO
- Systematic issues identified
- Recommendations for improvement
```

**Time**: 15-30 minutes per agent (for 10% sample)

**Note**: This stage caught Agent 01's quality issues that passed GATE validation.

---

## 📁 File Structure

```
ssi-dashboard-v7-clean/
├── scripts/
│   ├── create_basket_scaffolds.cjs     ← Stage 1 (NEW) ✅
│   └── validate_agent_baskets.cjs      ← Stage 3 (NEW) ✅
│
├── docs/phase_intelligence/
│   ├── AGENT_PROMPT_phase5_v4_VALIDATED.md           ← v4.0 (old, mixed approach)
│   └── AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md   ← v4.1 (NEW) ✅
│
├── phase5_batch2_s0301_s0500/
│   ├── batch_input/
│   │   └── agent_01_seeds.json                 ← Input for Stage 1
│   ├── scaffolds/                              ← NEW directory
│   │   └── agent_01_scaffold.json              ← Output of Stage 1 ✅
│   ├── batch_output/
│   │   ├── agent_01_baskets.json               ← OLD (v4.0, poor quality)
│   │   └── agent_03_baskets.json               ← OLD (v4.0, good quality)
│   └── validation/                             ← NEW directory
│       ├── agent_01_validation_report.json     ← Output of Stage 3 ✅
│       └── agent_03_validation_report.json     ← Output of Stage 3 ✅
│
└── Documentation:
    ├── PHASE5_TASK_DECOMPOSITION.md            ← Design analysis ✅
    ├── BATCH2_SCRIPTING_ANALYSIS.md            ← Root cause ✅
    ├── BATCH2_QUALITY_ASSESSMENT.md            ← Quality findings ✅
    └── STAGED_PIPELINE_IMPLEMENTATION.md       ← This file ✅
```

---

## 🧪 Testing & Validation

### Scaffold Script (Stage 1):
```bash
# Test on Agent 01 range
node scripts/create_basket_scaffolds.cjs \
  phase5_batch2_s0301_s0500/batch_input/agent_01_seeds.json \
  phase5_batch2_s0301_s0500/scaffolds/agent_01_scaffold.json

# Result: ✅ PASS
# - Processed 20 seeds
# - Found 44 NEW LEGOs
# - Built whitelists (567-589 words per seed)
# - Calculated metadata correctly
# - is_final_lego flags correct
```

### Validation Script (Stage 3):
```bash
# Test on Agent 03 (excellent quality)
node scripts/validate_agent_baskets.cjs \
  phase5_batch2_s0301_s0500/batch_output/agent_03_baskets.json \
  phase5_batch2_s0301_s0500/validation/agent_03_validation_report.json

# Result: ✅ PASS
# - 133 LEGOs, 1330 phrases
# - 0 GATE violations
# - Distribution: PASS
# - Final phrases: PASS

# Test on Agent 01 (poor quality but GATE compliant)
node scripts/validate_agent_baskets.cjs \
  phase5_batch2_s0301_s0500/batch_output/agent_01_baskets.json \
  phase5_batch2_s0301_s0500/validation/agent_01_validation_report.json

# Result: ⚠️  PASS WITH WARNINGS
# - 102 LEGOs, 1020 phrases
# - 0 GATE violations (mechanical check passes)
# - 1 distribution mismatch (S0305L01)
# - Note: Naturalness issues NOT detected (need Stage 4 review)
```

---

## 🎯 Next Steps - Production Use

### 1. Test Staged Pipeline (Agent 01 Regeneration)

**Goal**: Regenerate Agent 01 (S0301-S0320) using staged approach

**Steps**:
```bash
# 1. Generate scaffold (already done ✅)
node scripts/create_basket_scaffolds.cjs \
  phase5_batch2_s0301_s0500/batch_input/agent_01_seeds.json \
  phase5_batch2_s0301_s0500/scaffolds/agent_01_scaffold.json

# 2. Give scaffold to LLM with v4.1 prompt
# - Use Claude Sonnet 4.5 with extended thinking
# - Load: agent_01_scaffold.json
# - Prompt: AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md
# - Output: agent_01_baskets_v4.1.json

# 3. Validate output
node scripts/validate_agent_baskets.cjs \
  phase5_batch2_s0301_s0500/batch_output/agent_01_baskets_v4.1.json \
  phase5_batch2_s0301_s0500/validation/agent_01_v4.1_validation_report.json

# 4. Quality sample (Stage 4)
# - Sample 5-10 LEGOs manually
# - Score naturalness 1-5
# - Compare to Batch 2 Agent 01 (1.9/5)
# - Target: >4.0/5 average
```

**Success Criteria**:
- ✅ 0 GATE violations
- ✅ Distribution: 2-2-2-4 pattern
- ✅ Final phrases match seed sentences
- ✅ Naturalness: ≥4.0/5 average (vs 1.9/5 for v4.0)
- ✅ No template patterns (no "I want wants", "This is said")

**Time Estimate**: 2-3 hours total (30-60 min for phrase generation)

---

### 2. Complete Remaining Batch 2 Seeds

If Agent 01 regeneration succeeds:

**Remaining work**:
- Agent 05 (S0381-S0400): 20 seeds - incomplete
- Agent 09 (S0461-S0480): 20 seeds - incomplete
- Agent 10 (S0481-S0500): 20 seeds - incomplete

**Process** (per agent):
```bash
# 1. Generate scaffold (~5 seconds)
node scripts/create_basket_scaffolds.cjs \
  phase5_batch2_s0301_s0500/batch_input/agent_XX_seeds.json \
  phase5_batch2_s0301_s0500/scaffolds/agent_XX_scaffold.json

# 2. LLM phrase generation (30-60 minutes)
# Use v4.1 prompt with extended thinking

# 3. Validate (2 seconds)
node scripts/validate_agent_baskets.cjs \
  phase5_batch2_s0301_s0500/batch_output/agent_XX_baskets.json \
  phase5_batch2_s0301_s0500/validation/agent_XX_validation_report.json

# 4. Spot-check quality (10-15 minutes per agent)
```

**Total time estimate**: 6-9 hours (3 agents × 2-3 hours each)

---

### 3. Merge to Production

Once all 200 seeds complete with quality verification:

1. **Merge baskets** into production registry
2. **Update course content** with new practice phrases
3. **Deploy to staging** for testing
4. **QA review** on 5% sample
5. **Deploy to production**

---

## 💡 Key Benefits of Staged Approach

### 1. Efficiency ⚡
- **Mechanical tasks** (whitelist, structure): Instant vs minutes
- **LLM focus** on creativity only: Better use of model capabilities
- **Parallelizable**: Can scaffold all 10 agents at once

### 2. Quality 🎯
- **Extended thinking**: LLM reasons about each phrase
- **Word class awareness**: No more verb-as-noun errors
- **Clear task**: "Fill in arrays" vs ambiguous "generate baskets"
- **No templates**: Forces linguistic reasoning

### 3. Consistency 🔄
- **Same mechanical setup**: All agents use identical whitelists
- **Validation parity**: Same GATE checks for all agents
- **Quality bar**: v4.1 prompt sets clear standards

### 4. Debuggability 🔍
- **Staged outputs**: Can inspect scaffold before phrase generation
- **Clear validation**: Reports exactly what failed and where
- **Reproducible**: Can regenerate any stage independently

### 5. Scalability 📈
- **Batch processing**: Scaffold 100 agents in minutes
- **LLM efficiency**: Only use LLM for linguistic creativity
- **Validation speed**: Validate 1000 LEGOs in seconds

---

## 📊 Comparison: v4.0 vs v4.1

| Aspect | v4.0 (Old) | v4.1 (Staged) |
|--------|-----------|---------------|
| **Approach** | Mixed (agent decides) | Staged (clear separation) |
| **Setup** | Agent/script does it | Script (5 sec) |
| **Generation** | Varies (templates or reasoning) | LLM extended thinking only |
| **Validation** | Script | Script (2 sec) |
| **Agent 01 Quality** | 1.9/5 (template failure) | Target: >4.0/5 |
| **Agent 03 Quality** | 4.6/5 (good reasoning) | Target: 4.6-4.8/5 |
| **Consistency** | Variable (1.9-4.6) | Target: 4.0-4.8 |
| **Time per Agent** | 30-60 min total | 30-60 min (LLM only) |
| **Setup Time** | Included in agent work | 5 sec script |
| **Validation Time** | Included in agent work | 2 sec script |
| **Template Risk** | High (ambiguous task) | Zero (prohibited explicitly) |
| **Word Class Errors** | Possible (Agent 01) | Prevented (v4.1 guidance) |
| **Extended Thinking** | Optional (agent choice) | Encouraged (task is clear) |

---

## 🚦 Status Summary

### ✅ COMPLETE:
- Stage 1 script (scaffold generation)
- Stage 3 script (validation)
- v4.1 prompt (phrase generation guidance)
- Testing on Agent 01 range (scaffold works)
- Testing on Agent 03 (validation works)
- Documentation (this file, task decomposition, analysis)

### 🔄 READY FOR:
- Stage 2: Agent 01 regeneration using v4.1 prompt
- Quality comparison: v4.0 vs v4.1
- If successful: Complete remaining 60 seeds

### ⏳ PENDING:
- Production deployment
- Full Batch 2 completion (200/200 seeds)

---

## 📚 Related Documentation

- **PHASE5_TASK_DECOMPOSITION.md**: Detailed analysis of which tasks need which tools
- **BATCH2_SCRIPTING_ANALYSIS.md**: Root cause of v4.0 quality variance
- **BATCH2_QUALITY_ASSESSMENT.md**: Quality scores and findings
- **AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md**: LLM prompt for Stage 2

---

**Implementation Date**: 2025-11-07
**Status**: ✅ Ready for production testing
**Next Action**: Test staged pipeline with Agent 01 regeneration
