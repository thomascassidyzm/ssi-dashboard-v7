# Phase 5 Migration Checklist

## Comparison: Old Automation Server → New Modular System

### Core Components

| Component | Old Location | New Location | Status |
|-----------|-------------|--------------|--------|
| **Scaffold Generation** | `automation_server.cjs` (inline) | `scripts/phase5_prep_scaffolds.cjs` | ✅ **Migrated** |
| **Parallelization Strategy** | `automation_server.cjs` | `phase5-basket-server.cjs` lines 49-111 | ✅ **Migrated** |
| **Browser Spawning** | `automation_server.cjs` | `phase5-basket-server.cjs` lines 372-424 | ✅ **Migrated** |
| **Branch Watching** | Inline in automation_server | `scripts/watch_and_merge_branches.cjs` + server lines 296-367 | ✅ **Migrated** |
| **Merge Logic** | `automation_server.cjs` | `scripts/watch_and_merge_branches.cjs` | ✅ **Migrated** |
| **Orchestrator Prompts** | `generatePhase5OrchestratorPrompt()` | `generateWindowOrchestratorPrompt()` lines 431-489 | ✅ **Migrated** |

### Detailed Feature Comparison

#### 1. Scaffold Generation

**Old** (`automation_server.cjs` line 2258):
```javascript
const { preparePhase5Scaffolds } = require('./scripts/phase5_prep_scaffolds.cjs');
```

**New** (`scripts/phase5_prep_scaffolds.cjs`):
- ✅ `buildRecentContext()` - 10 most recent seeds (lines 39-65)
- ✅ `buildCurrentSeedEarlierLegos()` - Incremental LEGO availability (lines 71-87)
- ✅ `generateSeedScaffold()` - One scaffold per seed (lines 92-160)
- ✅ Creates `phase5_scaffolds/seed_sXXXX.json` files
- ✅ Creates `phase5_outputs/` directory

**Scaffold Structure:**
```javascript
{
  version: "curated_v7_spanish",
  seed_id: "S0171",
  seed_pair: { known: "...", target: "..." },
  recent_context: {
    "S0161": { sentence: [...], new_legos: [...] },
    // ... 10 most recent seeds
  },
  legos: {
    "S0171L01": {
      lego: ["conocer", "to know"],
      is_final_lego: false,
      current_seed_earlier_legos: [],
      practice_phrases: [],  // AI fills
      phrase_distribution: { ... }
    }
  }
}
```

**Status**: ✅ **Complete** - Scaffold generation identical to old system

#### 2. Parallelization Strategy

**Old** (`automation_server.cjs` lines 60-110):
- Complex strategy system with small/medium/large course thresholds
- Automatic strategy selection based on course size

**New** (`phase5-basket-server.cjs` lines 49-111):
- Simplified strategies: `conservative`, `balanced`, `fast`, `custom`
- User specifies strategy explicitly
- `balanced` (default): 10 windows × 10 agents × 7 seeds = 700 capacity

**Key Difference**: New system is **simpler and more transparent** - user controls parallelization directly

**Status**: ✅ **Improved** - Cleaner configuration

#### 3. Browser Spawning

**Old** (`automation_server.cjs`):
- Sequential browser spawns with 3000ms delay
- Inline prompt generation

**New** (`phase5-basket-server.cjs` lines 372-424):
- Sequential browser spawns with **5000ms** delay (improved)
- Each window spawns multiple Task agents in parallel
- Modular prompt generation

**Status**: ✅ **Improved** - Better delay timing, cleaner code

#### 4. Orchestrator Prompts

**Old** (`automation_server.cjs` line 744):
```javascript
function generatePhase5OrchestratorPrompt(courseCode, params, courseDir) {
  return `# Phase 5 Orchestrator: Spawn ${agentCount} Parallel Agents ...`;
}
```

**New** (`phase5-basket-server.cjs` line 431):
```javascript
function generateWindowOrchestratorPrompt(courseCode, windowNum, startSeed, endSeed, agentCount, seedsPerAgent) {
  return `# Phase 5 Window Orchestrator ${windowNum}: Spawn ${agentCount} Parallel Agents ...`;
}
```

**Key Content** (both versions include):
- ✅ Reference to Phase 5 Intelligence: `https://ssi-dashboard-v7.vercel.app/phase-intelligence/5`
- ✅ Instructions to spawn parallel Task agents
- ✅ Seed range calculation per agent
- ✅ Branch naming: `claude/baskets-${courseCode}-*`
- ✅ Output path: `phase5_outputs/`
- ✅ Push script: `scripts/push_segment.cjs`

**Status**: ✅ **Equivalent** - Same instructions, modularized

#### 5. Branch Watching & Merging

**Old** (`automation_server.cjs`):
- Inline branch watching logic
- Custom merge implementation

**New** (`scripts/watch_and_merge_branches.cjs`):
- Dedicated script for branch watching
- Pattern-based branch detection: `claude/baskets-${courseCode}-*`
- Auto-merge when all branches detected
- Auto-delete branches after merge

**Phase 5 Server Integration** (lines 296-367):
- Spawns watcher as child process
- Monitors stdout for merge completion
- Updates job status on merge

**Status**: ✅ **Improved** - Reusable, cleaner separation of concerns

### Missing Components Check

#### ❓ Scaffold Whitelist Generation

**Question**: Does new system include whitelist vocab in scaffolds?

**Old System** (`scripts/phase5_prep_scaffolds.cjs` lines 39-65):
```javascript
function buildRecentContext(legoPairsData, currentSeedIndex, maxRecent = 10) {
  // Returns 10 most recent seeds with LEGO tiles
  // BUT does NOT include full whitelist
}
```

**Finding**: Old scaffold system uses **recent context** (10 seeds with LEGO tiles), NOT full whitelist

**User's requirement** (from conversation):
> "the scaffolds should show the 10 most recent seed_pairs for context, as well as the 30 most recent lego_pairs, as well as the whitelist vocab"

**Status**: ⚠️ **DISCREPANCY** - Current scaffold does NOT include:
1. ❌ 30 most recent LEGO pairs (only has 10 seeds with LEGOs)
2. ❌ Full whitelist vocab
3. ✅ 10 most recent seed pairs (has this)

#### ❓ Metadata Stripping

**Question**: Does new system strip metadata before push?

**Old System** (`automation_server.cjs`):
- Agents generated full baskets with metadata
- Automation server stripped metadata during merge

**New System** (`phase5-basket-server.cjs`):
- Line 10 mentions "Strip metadata before merge"
- BUT: No actual stripping logic in server
- Relies on `watch_and_merge_branches.cjs` script

**Status**: ⚠️ **UNCLEAR** - Need to check merge script

#### ❓ Validation

**Old System** (`automation_server.cjs` lines 91-92):
```javascript
phase5_gate_violations: parseFloat(process.env.VALIDATION_THRESHOLD_PHASE5_GATE_VIOLATIONS || '0.02'),
phase5_quality_score: parseFloat(process.env.VALIDATION_THRESHOLD_PHASE5_QUALITY_SCORE || '0.95')
```

**New System** (`phase5-basket-server.cjs`):
- No validation mentioned

**Status**: ❌ **MISSING** - Phase 5 validation not implemented

### Critical Gaps to Address

#### 1. **Scaffold Whitelist Enhancement** ⚠️

Current scaffold has:
- ✅ 10 most recent seed pairs (via `recent_context`)
- ❌ 30 most recent LEGO pairs
- ❌ Full whitelist vocab

**Required**: Update `scripts/phase5_prep_scaffolds.cjs` to include:
1. Extend `recent_context` to include 30 most recent LEGOs (not just 10 seeds)
2. Add `whitelist_vocab` field with all Spanish + English words available up to current seed

#### 2. **Metadata Stripping** ⚠️

**User's new requirement**: Agents should strip metadata BEFORE pushing to GitHub

**Current flow**:
1. Agent generates basket with metadata → `phase5_outputs/S0171_basket_FULL.json`
2. Agent strips metadata → `phase5_outputs/S0171_baskets.json`
3. Agent pushes stripped file to GitHub
4. Server merges stripped files

**Need to verify**: Is this implemented in agent prompts?

**Action**: Check `generateWindowOrchestratorPrompt()` to see if it instructs agents to strip metadata

#### 3. **Phase 5 Validation** ❌

Old system had validation thresholds. New system has none.

**Required**: Either:
- Implement validation in Phase 5 server, OR
- Document that validation is removed by design

#### 4. **Configuration Integration** ⚠️

**Old System**: Used complex `automation.config.json` with thresholds

**New System**: Has `automation.config.simple.json` but Phase 5 server doesn't load it

**Phase 5 Server** (line 57-110): Hardcoded strategies

**Question**: Should Phase 5 server read from `automation.config.simple.json`?

**Current Config** (`automation.config.simple.json` lines 17-24):
```json
"phase5_basket_generation": {
  "browsers": 10,
  "agents_per_browser": 10,
  "legos_per_agent": 10,
  "browser_spawn_delay_ms": 5000,
  "headless": false,
  "target_phrases_per_lego": 10
}
```

**Action**: Integrate config loader into Phase 5 server

## Summary

### ✅ Successfully Migrated

1. Scaffold generation (recent context)
2. Browser spawning
3. Parallelization strategies
4. Branch watching
5. Orchestrator prompts

### ⚠️ Needs Attention

1. **Scaffold enhancement** - Add 30 recent LEGOs + full whitelist
2. **Metadata stripping** - Verify agents strip before push
3. **Config integration** - Load from `automation.config.simple.json`

### ❌ Missing

1. **Phase 5 validation** - Quality thresholds not implemented
2. **Cleanup logic** - .gitignore + file deletion after merge

## Recommendations

### Immediate Actions

1. **Update scaffold generator** to include whitelist vocab (see `PHASE5_IMPROVED_WORKFLOW.md`)
2. **Verify merge script** strips metadata correctly
3. **Add .gitignore rules** for `phase5_scaffolds/` and `*_FULL.json`
4. **Update agent prompts** to generate stripped files before push

### Optional Enhancements

1. Add Phase 5 validation back (quality scoring)
2. Integrate config loader for dynamic parallelization
3. Add progress tracking (WebSocket events)
4. Add resume capability (check existing baskets)
