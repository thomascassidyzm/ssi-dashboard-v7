# Phase 5 Task Decomposition - Right Tool for Right Job

**Date**: 2025-11-07
**Purpose**: Identify which components need code vs LLM reasoning

---

## 🎯 Core Insight

**Agent 01's failure wasn't using Python - it was using TEMPLATES for linguistic creativity.**

The script did:
- ✅ Setup (whitelist building, structure) - GOOD use of code
- ✅ Validation (GATE checking) - GOOD use of code
- ❌ Phrase generation via `f"I think that {lego} is good"` - BAD use of templates

**Agent 03's success**: Likely same mechanical setup but better phrase generation strategy

---

## 📊 Component Analysis

### MECHANICAL TASKS (Code is IDEAL) ✅

#### 1. Whitelist Building
**Task**: Extract all Spanish words from LEGOs up to current seed
**Why Code**: Computational set operations
**Time**: Instant (vs minutes for LLM)

```python
def build_whitelist(registry, target_seed_num):
    whitelist = set()
    for lego_id, lego_data in registry['legos'].items():
        if extract_seed_num(lego_id) <= target_seed_num:
            whitelist.update(lego_data['spanish_words'])
    return whitelist
```

**LLM Alternative**: "List all Spanish words from S0001-S0300" → Slow, error-prone, wasteful

---

#### 2. JSON Structure Creation
**Task**: Build output skeleton with proper format
**Why Code**: Template instantiation
**Time**: Instant

```javascript
const output = {
  version: "curated_v6_molecular_lego",
  agent_id: agentId,
  seed_range: "S0301-S0320",
  validation_status: "PENDING",
  seeds: {}
};

for (const seed of seeds) {
  output.seeds[seed.seed_id] = {
    seed: seed.seed_id,
    seed_pair: seed.seed_pair,
    legos: {}
  };
}
```

**LLM Alternative**: "Create JSON structure..." → Slower, might have typos

---

#### 3. GATE Validation (Word-by-word)
**Task**: Check every Spanish word against whitelist
**Why Code**: Set membership checking (O(1) lookup)
**Time**: Instant for 6,000+ phrases

```python
def validate_gate(spanish_phrase, whitelist):
    words = tokenize(spanish_phrase)
    violations = [w for w in words if w not in whitelist]
    return len(violations) == 0, violations
```

**LLM Alternative**: "Check if these words are in whitelist" → Slow, might miss words

---

#### 4. Distribution Calculation
**Task**: Count phrase lengths and categorize
**Why Code**: Simple arithmetic
**Time**: Instant

```python
dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
for phrase in phrases:
    word_count = phrase[3]
    if word_count <= 2: dist["really_short_1_2"] += 1
    elif word_count == 3: dist["quite_short_3"] += 1
    # ...
```

**LLM Alternative**: "Count these phrase lengths" → Unnecessary, wasteful

---

#### 5. Metadata Extraction
**Task**: Determine available_legos, is_final_lego, cumulative counts
**Why Code**: Data structure traversal
**Time**: Instant

```python
available_legos = sum(1 for lid in registry if extract_num(lid) < current_num)
is_final = (lego_index == len(seed['legos']) - 1)
```

**LLM Alternative**: Wasteful for pure computation

---

### LINGUISTIC TASKS (LLM is IDEAL) ✅

#### 1. Understanding Word Class
**Task**: Identify if LEGO is verb, noun, adjective, phrase
**Why LLM**: Requires linguistic knowledge
**Time**: Instant with language model

```
Human: What is the word class of "wants"?
Claude: Verb (third person singular present)
```

**Code Alternative**: Part-of-speech tagging possible but context-dependent, error-prone

---

#### 2. Creating Natural Usage
**Task**: Generate contextually appropriate phrases
**Why LLM**: Requires understanding of natural language patterns
**Cannot be templated**: Each LEGO needs unique contexts

**Examples**:
```
LEGO: "wants" (verb)
Good contexts:
- "She wants coffee" ✅
- "He wants to learn" ✅
- "I want something new" ✅

Bad templates:
- "I think that wants is good" ❌ (verb as noun)
- "This is wants" ❌ (nonsensical)
```

**Why templates fail**: Context-dependent, word-class dependent, meaning-dependent

---

#### 3. Semantic Appropriateness
**Task**: Ensure phrase makes logical sense
**Why LLM**: Requires world knowledge + reasoning

**Examples**:
```
"I met someone yesterday" ✅ (sensible)
"I met someone three waters" ❌ (nonsensical)
"The coffee wants to sleep" ❌ (semantic violation)
```

**Code cannot validate**: Requires understanding meaning, not just syntax

---

#### 4. Thematic Coherence
**Task**: Build phrases toward seed sentence theme
**Why LLM**: Requires understanding narrative progression

**Example - Seed**: "I'm enjoying finding out more about this language"
```
Early LEGO phrases should relate to:
- Enjoying things ✅
- Learning/finding out ✅
- Language/Spanish ✅

Not random topics:
- "I enjoy coffee when tired" ❌ (off-theme)
```

**Code cannot determine**: Requires semantic understanding of theme

---

#### 5. Progressive Complexity
**Task**: Build from simple to complex naturally
**Why LLM**: Requires pedagogical reasoning

**Example**:
```
Phrase 1-2: "I met" / "I met him" (foundation)
Phrase 3-4: "I met someone today" (add context)
Phrase 5-6: "I want to meet someone" (variations)
Phrase 7-10: "I met someone who can speak Spanish with me" (full usage)
```

**Code cannot design**: Requires understanding learning progression

---

#### 6. "Would-Say" Validation
**Task**: Confirm native speakers would actually say this
**Why LLM**: Requires cultural + linguistic intuition

**Examples**:
```
"I want to learn Spanish" ✅ (natural)
"I want to learn to speak the Spanish language well" ⚠️ (stiff, textbook)
"I desire to acquire proficiency in Spanish" ❌ (overly formal, unnatural)
```

**Code cannot judge**: Purely linguistic/cultural knowledge

---

### HYBRID TASKS (Either Could Work)

#### 1. Phrase Length Calculation
**Mechanical**: Count words
**Linguistic**: Count semantic "LEGOs" (meaningful units)

**Example**: "I'm trying to" = 3 words but 1 LEGO conceptually

**Decision**: Use word count (mechanical) for consistency

---

#### 2. Recency Prioritization
**Mechanical**: "Use 30-50% vocabulary from last 50 LEGOs"
**Linguistic**: "Focus on recently introduced concepts"

**Decision**: Track mechanically, apply linguistically

---

## 🏗️ Proposed Staged Pipeline

### Stage 0: Batch Preparation (DONE) ✅
**Tool**: Node.js script
**Input**: `lego_pairs_s0301_s0500.json`
**Output**: `agent_XX_seeds.json` (10 agents × 20 seeds)
**Status**: Already working

---

### Stage 1: Scaffold Generation (NEW) 🆕
**Tool**: Python/Node.js script
**Purpose**: Handle ALL mechanical setup

**Script**: `scripts/create_basket_scaffolds.cjs`

**Input**: `agent_01_seeds.json`

**Output**: `agent_01_scaffold.json`

**Structure**:
```json
{
  "version": "curated_v6_molecular_lego",
  "agent_id": 1,
  "seed_range": "S0301-S0320",
  "validation_status": "PENDING",
  "seeds": {
    "S0301": {
      "seed": "S0301",
      "seed_pair": {
        "target": "Él dijo que quiere mostrarte algo.",
        "known": "He said that he wants to show you something."
      },
      "legos": {
        "S0301L01": {
          "lego": ["he said", "Él dijo"],
          "type": "M",
          "available_legos": 278,
          "whitelist": ["él", "dijo", "que", "quiere", ...],  // ← Computed by script
          "is_final_lego": false,
          "practice_phrases": [],  // ← EMPTY - agent fills this
          "phrase_distribution": {  // ← Template
            "really_short_1_2": 0,
            "quite_short_3": 0,
            "longer_4_5": 0,
            "long_6_plus": 0
          }
        }
      }
    }
  }
}
```

**What scaffold script does**:
- ✅ Loads registry and builds whitelists
- ✅ Calculates available_legos for each LEGO
- ✅ Identifies is_final_lego (last in seed)
- ✅ Creates structure skeleton
- ✅ Leaves practice_phrases EMPTY for agent

**Time**: ~5 seconds per agent

---

### Stage 2: Phrase Generation (AGENT WITH EXTENDED THINKING) 🧠
**Tool**: Claude Sonnet 4.5 with extended thinking
**Purpose**: ONLY fill in practice_phrases arrays

**Prompt** (simplified):
```markdown
# Your ONLY Task: Generate Practice Phrases

You have been provided with a scaffold JSON file where ALL mechanical setup is complete.

## What's Already Done (DO NOT MODIFY):
- ✅ Structure skeleton
- ✅ Whitelists (all available Spanish words)
- ✅ available_legos counts
- ✅ is_final_lego flags
- ✅ LEGO metadata

## Your Task (ONLY THIS):
Fill in the `practice_phrases` arrays for each LEGO.

## Requirements:

### For EACH LEGO:
1. **Understand the LEGO**:
   - What is it? (verb/noun/adjective/phrase)
   - How is it naturally used?
   - What contexts make sense?

2. **Generate 10 phrases**:
   - 2 short (1-2 words) - fragments OK
   - 2 quite short (3 words) - complete thoughts
   - 2 longer (4-5 words) - complete thoughts
   - 4 long (6+ words) - conversational gold

3. **GATE Compliance**:
   - ONLY use words from the `whitelist` array
   - Check EVERY Spanish word
   - No conjugations/variations

4. **Natural Language**:
   - Would a native speaker say this?
   - Is the word class used correctly?
   - Does it make logical sense?

5. **Progressive Complexity**:
   - Build from simple to complex
   - Show LEGO in varied contexts
   - Relate to seed theme

6. **Special Rules**:
   - If `is_final_lego: true`, phrase 10 MUST be complete seed sentence
   - Prioritize vocabulary from recent seeds (5 previous)

## Use Extended Thinking:
- <thinking> tags for reasoning about each LEGO
- Consider word class, context, theme
- Validate naturalness mentally
- Check whitelist compliance

## Output Format:
Same scaffold JSON with practice_phrases filled:
```json
"practice_phrases": [
  ["English phrase", "Spanish phrase", null, word_count],
  ...10 phrases total
]
```

DO NOT modify any other fields.
```

**Time**: 30-60 minutes per agent (20 seeds, ~100 LEGOs, 1,000 phrases)

**Key Advantages**:
- ✅ Agent focuses ONLY on linguistic creativity
- ✅ No time wasted on mechanical setup
- ✅ Extended thinking for quality
- ✅ Clear whitelist reference
- ✅ No ambiguity about task

---

### Stage 3: Mechanical Validation (SCRIPT) ✅
**Tool**: Python/Node.js script
**Purpose**: GATE compliance checking

**Script**: `scripts/validate_baskets.cjs`

**Input**: `agent_01_baskets.json`

**Checks**:
1. **Format validation**:
   - JSON structure correct
   - All required fields present
   - 10 phrases per LEGO
   - Distribution present

2. **GATE validation**:
   - Tokenize each Spanish phrase
   - Check every word against whitelist
   - Report violations with line numbers

3. **Distribution validation**:
   - Calculate actual distribution
   - Compare to 2-2-2-4 target
   - Report mismatches

**Output**: `agent_01_validation_report.json`
```json
{
  "format_valid": true,
  "gate_violations": [
    {
      "lego": "S0301L05",
      "phrase": 7,
      "spanish": "Él quiere mostrarte algo correcto",
      "violations": ["correcto"]
    }
  ],
  "distribution_errors": [],
  "final_phrases_valid": true
}
```

**Time**: ~2 seconds per agent

**Action if violations**:
- Report back to agent: "Fix these 3 violations and regenerate"
- Agent reruns Stage 2 with focus on violating LEGOs

---

### Stage 4: Quality Validation (OPTIONAL LLM) 🧠
**Tool**: Claude (separate review agent)
**Purpose**: Naturalness checking (10% sample)

**Prompt**:
```markdown
Review 10 randomly sampled LEGOs for naturalness:

For each phrase, score 1-5:
- 5: Perfect, native-level natural
- 4: Good, minor stiffness
- 3: Acceptable, slightly textbook
- 2: Awkward, forced
- 1: Unnatural, wouldn't say

Report:
- Average quality score
- Systematic issues identified
- Recommendations
```

**Time**: 15-30 minutes per agent

---

## 🎯 Workflow Comparison

### Current (Batch 2 - Mixed Approach)
```
Agent interprets entire task → Writes script → Script does everything
│
├─ Setup: ✅ Good (code efficient)
├─ Generation: ❌ Templates (Agent 01) / ✅ Better logic (Agent 03)
└─ Validation: ✅ Good (code efficient)

Problem: Ambiguous what should be code vs LLM reasoning
Result: Inconsistent quality (1.9/5 vs 4.6/5)
```

### Proposed (Staged Pipeline)
```
Stage 1: Script creates scaffold
  ↓ (mechanical, 5 seconds)
Stage 2: Agent generates phrases (extended thinking)
  ↓ (linguistic, 30-60 min)
Stage 3: Script validates GATE
  ↓ (mechanical, 2 seconds)
Stage 4: Agent reviews quality (optional)
  ↓ (linguistic, 15-30 min)

Benefits:
✅ Clear separation of concerns
✅ Right tool for right job
✅ Agent focuses on creativity
✅ Fast mechanical operations
✅ Consistent quality
```

---

## 💡 Key Insights

### 1. Scripts Are GOOD for Mechanical Tasks
**Don't ban scripting** - it's perfect for:
- Whitelist building (instant vs minutes)
- Structure creation (instant vs manual typing)
- GATE validation (instant vs slow LLM checking)

### 2. Templates Are BAD for Linguistic Tasks
**Ban template-based phrase generation**:
```python
❌ f"I think that {lego} is good"  # Treats all LEGOs as nouns
❌ f"She said that {lego} is here"  # No word-class awareness
❌ f"Do you know {lego}?"  # Doesn't understand meaning
```

### 3. Separation Enables Extended Thinking
**Current**: Agent spends time on setup → rushed phrase generation
**Proposed**: Setup done → agent focuses 100% on phrases with <thinking>

### 4. Clear Task = Better Quality
**Current**: "Generate baskets" (ambiguous - agents chose scripting)
**Proposed**: "Fill in practice_phrases using extended thinking" (clear)

---

## 📋 Implementation Plan

### Phase 1: Create Scaffold Script (2-3 hours)
**File**: `scripts/create_basket_scaffolds.cjs`

**Features**:
- Load agent_XX_seeds.json
- Load registry
- Build whitelists per seed
- Calculate metadata
- Output scaffold JSON

**Test**: Run on Agent 01 input, verify scaffold structure

---

### Phase 2: Update Agent Prompt (1-2 hours)
**File**: `docs/phase_intelligence/AGENT_PROMPT_phase5_v4.1_STAGED.md`

**Changes**:
- Remove setup instructions (done by script)
- Focus entirely on phrase generation
- Reference whitelist field in scaffold
- Emphasize extended thinking
- Clear: "DO NOT write scripts, fill in arrays"

---

### Phase 3: Create Validation Script (1-2 hours)
**File**: `scripts/validate_agent_baskets.cjs`

**Features**:
- Format checking
- GATE word-by-word validation
- Distribution calculation
- Final phrase verification
- JSON report output

---

### Phase 4: Test Pipeline (1-2 hours)
1. Run scaffold script on Agent 01 input
2. Give scaffold to Claude with v4.1 prompt
3. Validate output
4. Compare quality to Batch 2 Agent 01

**Success Criteria**:
- Agent produces natural phrases (no templates)
- Zero GATE violations
- Faster than Batch 2 (setup pre-done)
- Consistent quality (>4.0/5 avg)

---

## 🚦 Recommendation

**YES to staged pipeline** - it's the right approach because:

1. ✅ Uses code where code excels (mechanical operations)
2. ✅ Uses LLM where LLM excels (linguistic creativity)
3. ✅ Separates concerns cleanly
4. ✅ Enables extended thinking focus
5. ✅ Makes task unambiguous
6. ✅ Allows fast iteration (regenerate phrases without rebuilding scaffolds)

**Next Steps**:
1. Build scaffold script (~3 hours)
2. Test with Agent 01 range (S0301-S0320)
3. Compare to Batch 2 Agent 01 quality
4. If successful, use for remaining Batch 2 work (60 seeds)

---

**Status**: 🎯 Ready to implement staged pipeline approach