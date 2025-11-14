# Phase Processing Pipeline - Complete Flow

## Phase 3: LEGO Extraction - Complete Pipeline

### Step 1: PRE-PROCESSING (Scaffolding)
**Script**: `scripts/phase3_prep_scaffolds.cjs`
**When**: Before agents run
**Purpose**: Prepare workspace for agents

```javascript
const { preparePhase3Scaffolds } = require('./scripts/phase3_prep_scaffolds.cjs');
await preparePhase3Scaffolds(courseDir);
```

---

### Step 2: ORCHESTRATION (AI Agents)
**Method**: Browser-based Claude Code agents
**Parallel agents**: 70 (7 segments × 10 agents)
**What they do**: Extract atomic LEGOs from seed pairs

```
Phase 3 Orchestrator
    ↓
Spawns 7 segments (S0001-S0100, S0101-S0200, etc.)
    ↓
Each segment spawns 10 agents (10 seeds each)
    ↓
Each agent:
  - Reads seed pairs
  - Extracts BASE and COMPOSITE LEGOs
  - Commits to git: claude/phase3-segment-X-agent-Y
```

**Output per agent**: Partial lego_pairs.json with their assigned seeds

---

### Step 3: GIT MERGE (Automatic)
**Function**: `mergePhase3Branches()`
**When**: After all agents complete
**What**: Merges all claude/phase3-* branches to main

```bash
# For each branch:
git merge claude/phase3-segment-1-agent-01 --no-edit
git merge claude/phase3-segment-1-agent-02 --no-edit
...
git push origin main
```

---

### Step 4: POST-PROCESSING (Scripts)

#### 4a. Merge LEGO Files
**Script**: `scripts/phase3_merge_legos.cjs`
**Purpose**: Combine all agent outputs into single lego_pairs.json

```javascript
const { mergePhase3Legos } = require('./scripts/phase3_merge_legos.cjs');
await mergePhase3Legos(courseDir);
```

**Input**: Multiple partial lego files from agents
**Output**: Single lego_pairs.json with all seeds

---

#### 4b. Deduplication
**Script**: `scripts/phase3_deduplicate_legos.cjs`
**Purpose**: Remove duplicate LEGOs across seeds

```bash
node scripts/phase3_deduplicate_legos.cjs spa_for_eng
```

**What it does**:
- Finds identical LEGOs (same known + target text)
- Keeps first occurrence, removes duplicates
- Updates LEGO IDs to maintain sequence

**Example**:
```
Before:
S0001L01: ["I want", "quiero"]
S0005L03: ["I want", "quiero"]  ← duplicate

After:
S0001L01: ["I want", "quiero"]
S0005L03: [deleted, references S0001L01]
```

---

#### 4c. Reordering
**Script**: `scripts/phase3_reorder_legos.cjs`
**Purpose**: Reorder LEGOs within each seed by pedagogical value

```bash
node scripts/phase3_reorder_legos.cjs spa_for_eng
```

**Reordering logic**:
1. **Frequency**: More common LEGOs first (appear in more seeds)
2. **Type priority**: BASE (A) before COMPOSITE (C) and MOLECULAR (M)
3. **Simplicity**: Shorter LEGOs before longer ones

**Why**: Ensures learners see most useful components first

---

#### 4d. Build Registry
**Script**: `scripts/phase3_build_lego_registry.cjs`
**Purpose**: Create searchable index of all LEGOs

```bash
node scripts/phase3_build_lego_registry.cjs spa_for_eng
```

**Output**: `lego_registry.json`
```json
{
  "quiero": {
    "lego_id": "S0001L01",
    "type": "A",
    "known": "I want",
    "target": "quiero",
    "frequency": 45,
    "first_seen": "S0001"
  }
}
```

**Use cases**:
- Fast LEGO lookup
- Frequency analysis
- Vocabulary progression tracking

---

### Complete Phase 3 Flow

```
1. preparePhase3Scaffolds()           [Pre-processing]
    ↓
2. Spawn 70 AI agents                 [Orchestration]
    ↓
3. Agents extract LEGOs → git commits [Agent work]
    ↓
4. mergePhase3Branches()              [Git merge]
    ↓
5. mergePhase3Legos()                 [Combine outputs]
    ↓
6. phase3_deduplicate_legos.cjs       [Dedup]
    ↓
7. phase3_reorder_legos.cjs           [Reorder]
    ↓
8. phase3_build_lego_registry.cjs     [Index]
    ↓
✅ lego_pairs.json (final, optimized)
```

---

## Phase 5: Practice Basket Generation - Complete Pipeline

### Step 1: PRE-PROCESSING (Scaffolding)
**Script**: `scripts/phase5_prep_scaffolds.cjs`
**When**: Before agents run
**Purpose**: Prepare batch files for agents

```javascript
const { preparePhase5Scaffolds } = require('./scripts/phase5_prep_scaffolds.cjs');
await preparePhase5Scaffolds(courseDir);
```

**What it creates**:
- `batches/batch_1.json`, `batch_2.json`, etc.
- Each batch contains LEGOs with metadata
- Marks which LEGOs need basket generation

**Batch structure**:
```json
{
  "legos": [
    {
      "lego_id": "S0001L01",
      "lego": ["I want", "quiero"],
      "type": "A",
      "generate": true,        // ← New LEGO, needs basket
      "available_legos": [],
      "cumulative_legos": 1
    }
  ]
}
```

---

### Step 2: ORCHESTRATION (AI Agents)
**Method**: Browser-based Claude Code agents
**Parallel agents**: 70 (7 segments × 10 agents)
**What they do**: Generate practice phrases for each LEGO

```
Phase 5 Orchestrator
    ↓
Spawns 7 segments (S0001-S0100, S0101-S0200, etc.)
    ↓
Each segment spawns 10 agents (10 seeds each)
    ↓
Each agent:
  - Reads batches for their seeds
  - For each LEGO with generate:true:
    - Creates 20 practice phrases
    - Follows GATE rules (overlap, distribution)
    - Commits to git: claude/phase5-segment-X-agent-Y
```

**Agent output**: Partial lego_baskets.json with practice phrases

---

### Step 3: GIT MERGE (Automatic)
**Function**: `mergePhase5Branches()`
**When**: After all agents complete
**What**: Merges all claude/phase5-* branches to main

```bash
# For each branch:
git merge claude/phase5-segment-1-agent-01 --no-edit
git merge claude/phase5-segment-1-agent-02 --no-edit
...
git push origin main
```

---

### Step 4: POST-PROCESSING (Scripts)

#### 4a. Extract Outputs
**Script**: `scripts/phase5_merge_outputs.cjs`
**Purpose**: Extract basket data from agent outputs

```javascript
const { mergePhase5Outputs } = require('./scripts/phase5_merge_outputs.cjs');
await mergePhase5Outputs(courseDir);
```

**What it does**:
- Reads all agent commit outputs
- Extracts basket JSON data
- Validates format

---

#### 4b. Validation (GATE Rules)
**Script**: `scripts/phase5_gate_validator.cjs`
**Purpose**: Validate practice phrases meet quality standards

```bash
node scripts/phase5_gate_validator.cjs spa_for_eng/phase5_outputs
```

**GATE Rules Checked**:
1. **Phrase Distribution**: Mix of 1-2, 3-4, 5-6+ LEGO phrases
2. **Overlap Control**: Available previous LEGOs used correctly
3. **No Vocabulary Jumps**: Only uses introduced LEGOs
4. **Decontextualization**: LEGO works independently of seed context

**Output**: Validation report with pass/fail per basket

---

#### 4c. Merge Baskets
**Script**: `scripts/phase5_merge_baskets.cjs`
**Purpose**: Combine all agent basket outputs into single file

```bash
node scripts/phase5_merge_baskets.cjs spa_for_eng
```

**What it does**:
- Reads all seed basket files
- Combines into single lego_baskets.json
- Preserves basket structure

**Input**: `phase5_outputs/seed_S0001.json`, `seed_S0002.json`, ...
**Output**: `lego_baskets.json`

```json
{
  "version": "7.7",
  "baskets": {
    "S0001L01": {
      "lego": ["I want", "quiero"],
      "type": "A",
      "practice_phrases": [
        ["I want", "Quiero", null, 1],
        ["I want coffee", "Quiero café", null, 2],
        ["I want to speak Spanish", "Quiero hablar español", null, 4]
      ],
      "phrase_distribution": {
        "really_short_1_2": 5,
        "quite_short_3": 3,
        "longer_4_5": 4,
        "long_6_plus": 8
      }
    }
  }
}
```

---

### Complete Phase 5 Flow

```
1. preparePhase5Scaffolds()           [Pre-processing]
    ↓ Creates batches with generate:true flags
    ↓
2. Spawn 70 AI agents                 [Orchestration]
    ↓
3. Agents generate baskets → commits  [Agent work]
    ↓
4. mergePhase5Branches()              [Git merge]
    ↓
5. mergePhase5Outputs()               [Extract data]
    ↓
6. phase5_gate_validator.cjs          [Validate GATE rules]
    ↓
7. mergePhase5Baskets()               [Combine into single file]
    ↓
✅ lego_baskets.json (final, validated)
```

---

## Phase 5.5: Deprecated

**Status**: ❌ No longer used

Phase 5.5 scripts (`phase5.5-deduplicate-baskets.cjs`, `phase5.5_grammar_review.cjs`) were part of older workflows. Current Phase 5 pipeline handles deduplication and validation inline.

**Why deprecated**:
- Phase 5 agents now generate higher quality baskets from the start
- GATE validation happens during generation, not post-processing
- Batch preparation (Phase 4) handles deduplication at LEGO level
- Grammar review was too slow for 668 seeds

---

## Summary: All Processing Steps

### Phase 3 Complete Pipeline
```
Pre:  phase3_prep_scaffolds.cjs
Run:  70 AI agents (LEGO extraction)
Post: mergePhase3Branches()
      → phase3_merge_legos.cjs
      → phase3_deduplicate_legos.cjs
      → phase3_reorder_legos.cjs
      → phase3_build_lego_registry.cjs
Out:  lego_pairs.json (deduplicated, reordered, indexed)
```

### Phase 5 Complete Pipeline
```
Pre:  phase5_prep_scaffolds.cjs (creates batches)
Run:  70 AI agents (basket generation)
Post: mergePhase5Branches()
      → phase5_merge_outputs.cjs
      → phase5_gate_validator.cjs
      → phase5_merge_baskets.cjs
Out:  lego_baskets.json (validated, merged)
```

---

## Key Processing Scripts

| Script | Phase | Type | Purpose |
|--------|-------|------|---------|
| `phase3_prep_scaffolds.cjs` | 3 | Pre | Prepare workspace |
| `phase3_merge_legos.cjs` | 3 | Post | Combine agent outputs |
| `phase3_deduplicate_legos.cjs` | 3 | Post | Remove duplicate LEGOs |
| `phase3_reorder_legos.cjs` | 3 | Post | Reorder by pedagogy |
| `phase3_build_lego_registry.cjs` | 3 | Post | Build searchable index |
| `phase5_prep_scaffolds.cjs` | 5 | Pre | Create batch files |
| `phase5_merge_outputs.cjs` | 5 | Post | Extract agent data |
| `phase5_gate_validator.cjs` | 5 | Post | Validate quality rules |
| `phase5_merge_baskets.cjs` | 5 | Post | Combine into single file |

---

## Quality Gates

### Phase 3 Quality Checks
- ✅ All seeds have LEGOs
- ✅ No duplicate LEGOs (same text)
- ✅ LEGOs properly ordered (frequency, type, length)
- ✅ Registry built successfully

### Phase 5 Quality Checks (GATE Rules)
- ✅ **Phrase Distribution**: 25% short (1-2), 25% medium (3-4), 50% conversational (5+)
- ✅ **Overlap Control**: Uses 2-3 previous LEGOs per phrase
- ✅ **No Jumps**: Only uses LEGOs from current and previous seeds
- ✅ **Decontextualization**: LEGO works in all practice phrases

---

## Monitoring Processing

### Check Phase 3 Post-Processing
```bash
# View logs
pm2 logs ssi-automation | grep "Phase 3"

# Check output files
ls -lh public/vfs/courses/spa_for_eng/lego_pairs.json
ls -lh public/vfs/courses/spa_for_eng/lego_registry.json
```

### Check Phase 5 Post-Processing
```bash
# View logs
pm2 logs ssi-automation | grep "Phase 5"

# Check intermediate outputs
ls -lh public/vfs/courses/spa_for_eng/phase5_outputs/

# Check final output
ls -lh public/vfs/courses/spa_for_eng/lego_baskets.json
```

---

## Manual Re-Run of Processing

If automation fails or you need to re-run processing:

### Re-run Phase 3 Post-Processing Only
```bash
cd /path/to/ssi-dashboard-v7

# Merge agent outputs
node scripts/phase3_merge_legos.cjs public/vfs/courses/spa_for_eng

# Deduplicate
node scripts/phase3_deduplicate_legos.cjs spa_for_eng

# Reorder
node scripts/phase3_reorder_legos.cjs spa_for_eng

# Build registry
node scripts/phase3_build_lego_registry.cjs spa_for_eng
```

### Re-run Phase 5 Post-Processing Only
```bash
cd /path/to/ssi-dashboard-v7

# Extract outputs
node scripts/phase5_merge_outputs.cjs public/vfs/courses/spa_for_eng

# Validate
node scripts/phase5_gate_validator.cjs public/vfs/courses/spa_for_eng/phase5_outputs

# Merge
node scripts/phase5_merge_baskets.cjs public/vfs/courses/spa_for_eng
```
