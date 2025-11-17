# Phase 5: Agent Extraction Process Analysis

**Date**: 2025-11-17
**Purpose**: Document the "fiddly" extraction process for Claude Code web agents in Phase 5

---

## Overview

Phase 5 is the most complex orchestration in the SSi pipeline because:

1. **Scale**: 240 concurrent agents (12 masters × 20 sub-agents each)
2. **Git coordination**: Agents commit locally, masters batch-push
3. **File distribution**: ~340 output files spread across seed groups
4. **Multi-level orchestration**: Master spawns sub-agents, tracks completion, merges results

---

## The "Fiddly" Parts (Why This Needs Careful Thought)

### 1. **Browser Tab Orchestration**
- 12 separate Claude Code web sessions (one per master)
- Each master maintains state for 20 sub-agents
- No cross-tab communication - each master is isolated
- **Fiddly bit**: User must keep all 12 tabs open until completion (~5 hours)

### 2. **Git Merge Conflicts**
- 240 agents writing to same repo simultaneously
- **Solution**: Sub-agents commit locally, DON'T push
- Masters batch-push after ALL 20 sub-agents complete
- **Fiddly bit**: If master crashes, local commits lost

### 3. **Scaffold Pre-generation**
- Must create 1,497 scaffold files BEFORE spawning agents
- Scaffolds contain context-dependent data (recent LEGOs, available vocab)
- **Fiddly bit**: Scaffold generation is slow (~10-15 minutes for all)

### 4. **File Grouping Strategy**
- Sub-agents group by SEED, not by LEGO
- One sub-agent processes 10 LEGOs → outputs to ~3-5 seed files
- **Fiddly bit**: File structure doesn't match LEGO list structure

### 5. **Completion Detection**
- Master must track 20 async sub-agent reports
- No auto-merge - master waits for ALL before pushing
- **Fiddly bit**: One failed sub-agent blocks entire patch push

### 6. **Manual Post-Processing**
- 3 separate validators (GATE, LUT, Grammar)
- Manual deletion of bad phrases using deletion tool
- Re-merge required after deletions
- **Fiddly bit**: Humans must interpret validation reports

---

## Current Implementation Details

### Infrastructure Files

| File | Purpose | Location |
|------|---------|----------|
| `detect_missing_baskets_new_only.cjs` | Find LEGOs without baskets | `scripts/` |
| `divide_into_patches.cjs` | Split into 12 patches | `scripts/universal_12master_orchestration/` |
| `generate_master_prompts.cjs` | Create 12 master prompts | `scripts/universal_12master_orchestration/` |
| `phase5_launch_12_masters.sh` | Open 12 Safari tabs | `scripts/` |
| `phase5_generate_scaffolds.cjs` | Create scaffolds | `scripts/` |
| `phase5_gate_validator_v2.cjs` | GATE validation | `scripts/` |
| `phase5_lut_validator.cjs` | LUT validation | `scripts/` |
| `phase5_grammar_review_v2.cjs` | Grammar review | `scripts/` |
| `phase5_delete_bad_phrases.cjs` | Manual deletion tool | `scripts/` |
| `phase5_merge_batches.cjs` | Final merge | `scripts/` |

### Data Flow (with File Counts)

```
lego_pairs.json (1 file)
    ↓
[Step 1: Detection]
    ↓
phase5_missing_baskets_new_only.json (1 file)
    ↓
[Step 2: Division]
    ↓
phase5_patch_manifest.json (1 file)
    ↓
[Step 3: Prompt Generation]
    ↓
scripts/phase5_master_prompts/*.md (12 files)
    ↓
[Step 4: Launch Masters]
    ↓
12 browser tabs open
    ↓
[Step 5-6: Masters Create Scaffolds]
    ↓
phase5_scaffolds/scaffold_SXXXXLXX.json (1,497 files)
    ↓
[Step 7-8: Masters Spawn Sub-Agents]
    ↓
240 sub-agents running concurrently
    ↓
[Step 9-17: Sub-Agents Generate Baskets]
    ↓
phase5_outputs/seed_SXXXX_baskets.json (~340 files)
    ↓
[Step 18-21: Masters Batch Push]
    ↓
All files in GitHub
    ↓
[Step 22-26: Manual Validation & Fixes]
    ↓
phase5_gate_violations.json (1 file)
phase5_lut_uncertainties.json (1 file)
phase5_grammar_review.json (1 file)
    ↓
[Step 27: Final Merge]
    ↓
lego_baskets.json (1 file - updated)
    ↓
[Step 30: Deploy]
    ↓
S3 production
```

---

## Extraction Points (Where Agents Save Work)

### Sub-Agent Outputs (Step 15)

**Pattern**: `phase5_outputs/seed_SXXXX_baskets.json`

**Structure**:
```json
{
  "seed_id": "S0042",
  "baskets": {
    "S0042L01": {
      "lego": ["I don't", "我不"],
      "practice_phrases": [
        ["I don't want", "我不想"],
        ["I don't like", "我不喜欢"],
        // ... 8 more phrases
      ]
    },
    "S0042L02": {
      "lego": ["want", "想"],
      "practice_phrases": [
        ["I want", "我想"],
        ["I don't want", "我不想"],
        // ... 8 more phrases
      ]
    }
  }
}
```

**Extraction method**: `Write` tool to create JSON file

**Grouping logic**:
```javascript
// Sub-agent processes 10 LEGOs:
// S0042L01, S0042L02, S0042L03, S0043L01, S0043L02, S0044L01...

// Groups by seed:
// → seed_S0042_baskets.json (L01, L02, L03)
// → seed_S0043_baskets.json (L01, L02)
// → seed_S0044_baskets.json (L01...)
```

### Git Commits (Step 16)

**Command**: `git add phase5_outputs/seed_S00*.json && git commit -m "Phase 5 Patch X Agent Y: Seeds SXXXX-SXXXX"`

**NO PUSH** - commits stay local until master batch-pushes

**Why?**: Prevents 240 concurrent push conflicts

### Master Batch Push (Step 20)

**Command**: `git pull --rebase && git push origin main`

**Timing**: ONLY after ALL 20 sub-agents report completion

**Size**: ~196 baskets × 10 phrases = ~1,960 phrases per patch

---

## Why Phase 5 is "Fiddly"

### Problem 1: State Management Across Browser Tabs

**Issue**: 12 isolated Claude Code sessions with no shared state

**Current solution**: Each master tracks its own sub-agents in-memory

**Risk**: If user closes tab, all state lost

**Potential improvement**: Save progress checkpoints to filesystem
```json
{
  "patch_id": 3,
  "sub_agents_completed": [1, 2, 5, 8],
  "sub_agents_pending": [3, 4, 6, 7, 9, 10, ...],
  "sub_agents_failed": [],
  "last_updated": "2025-11-17T14:32:00Z"
}
```

### Problem 2: Asynchronous Completion Detection

**Issue**: Master spawns 20 agents, must wait for all to finish

**Current solution**: Master monitors Task tool responses

**Risk**: If one sub-agent hangs, entire patch stalls

**Potential improvement**: Timeout + auto-respawn
```javascript
// Master logic (pseudo-code)
for (batch of batches) {
  spawnSubAgent(batch);
  setTimeout(() => {
    if (!batch.completed) {
      console.warn(`Batch ${batch.id} timeout - respawning`);
      spawnSubAgent(batch);
    }
  }, 30 * 60 * 1000); // 30 min timeout
}
```

### Problem 3: File Scatter Pattern

**Issue**: 10 LEGOs → 3-5 output files (grouped by seed)

**Why it's fiddly**: Can't easily map "LEGO X failed" to "file Y needs fixing"

**Example**:
```
Sub-agent batch: [S0042L01, S0042L02, S0042L03, S0043L01, S0043L02, ...]

Outputs:
  seed_S0042_baskets.json (contains L01, L02, L03)
  seed_S0043_baskets.json (contains L01, L02)
  seed_S0044_baskets.json (...)
```

**If S0042L02 has grammar error**, you must:
1. Run validator to find which file
2. Open `seed_S0042_baskets.json`
3. Find L02 basket
4. Use deletion tool: `node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0042 S0042L02 <index>`

### Problem 4: Validation is Slow & Manual

**Current workflow**:
```bash
# 1. Wait for all 12 masters (human monitoring ~5 hours)
# 2. Run 3 validators
node scripts/phase5_gate_validator_v2.cjs cmn_for_eng
node scripts/phase5_lut_validator.cjs cmn_for_eng
node scripts/phase5_grammar_review_v2.cjs cmn_for_eng batch

# 3. Review violation files
cat public/vfs/courses/cmn_for_eng/phase5_gate_violations.json
# Shows: 47 violations across 23 LEGOs

# 4. Manual deletion for EACH bad phrase
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0042 S0042L02 3
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0042 S0042L02 7
# ... repeat 47 times

# 5. Re-merge
node scripts/phase5_merge_batches.cjs cmn_for_eng
```

**Why it's fiddly**: No bulk delete, must process violations one-by-one

**Potential improvement**: Batch deletion from violation file
```bash
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete-from-file phase5_gate_violations.json
```

### Problem 5: Scaffold Generation Bottleneck

**Issue**: Must generate 1,497 scaffolds BEFORE spawning agents

**Current timing**: ~10-15 minutes (sequential processing)

**Why it's slow**: Each scaffold requires:
- Load `lego_pairs.json` (~2MB)
- Load `seed_pairs.json` (~500KB)
- Calculate sliding window (last 10 seeds)
- Extract available LEGOs
- Format and write JSON

**Current code** (`phase5_generate_scaffolds.cjs`):
```javascript
// Processes seeds sequentially
legoPairs.seeds.forEach((seedData, seedIdx) => {
  // Build recent_seed_pairs window
  const recentSeedPairs = {};
  const startIdx = Math.max(0, seedIdx - 10);
  for (let i = startIdx; i < seedIdx; i++) {
    // Process each previous seed...
  }

  // Build scaffold for each LEGO
  seedData.legos.forEach((lego, legoIdx) => {
    // Create scaffold...
    fs.writeFileSync(scaffoldPath, JSON.stringify(scaffold));
  });
});
```

**Potential improvement**: Parallelize scaffold generation
```javascript
// Batch into 12 chunks (one per master)
const chunks = divideIntoChunks(legoPairs.seeds, 12);
Promise.all(chunks.map(chunk => generateScaffoldsForChunk(chunk)));
```

---

## Success Patterns (What Works Well)

### ✅ 1. Division Logic is Simple & Robust
```javascript
// 668 seeds ÷ 12 = ~56 seeds per patch
const SEEDS_PER_PATCH = Math.ceil(TOTAL_SEEDS / NUM_MASTERS);
```
- No overlap between patches
- Each master owns clear range
- Easy to verify completeness

### ✅ 2. Template-Based Prompt Generation
- Single template (`phase5_master_orchestrator_prompt.md`)
- Simple variable substitution (`{{PATCH_ID}}`, `{{LEGO_LIST}}`)
- Each master gets identical workflow, different data

### ✅ 3. Git-Based Coordination
- Sub-agents commit but don't push (no conflicts)
- Master batch-pushes after all complete
- Human can inspect commits before push

### ✅ 4. Scaffold Format is Self-Contained
```json
{
  "S0042L01": {
    "lego": ["I don't", "我不"],
    "type": "FD",
    "recent_seed_pairs": {...},  // Has all context needed
    "current_seed_legos_available": [...],
    "practice_phrases": []
  }
}
```
- Agent doesn't need to load entire lego_pairs.json
- All context bundled in scaffold
- Reduces sub-agent complexity

### ✅ 5. 2-2-2-4 Distribution is Clear
- 2 phrases: 1-2 LEGOs (really short, fragments OK)
- 2 phrases: 2-3 LEGOs (quite short)
- 2 phrases: 3-4 LEGOs (longer)
- 4 phrases: 4-5 LEGOs (long, full grammar)
- **Total**: 10 phrases per LEGO

---

## Failure Modes & Recovery

### Failure Mode 1: Sub-Agent Hangs
**Symptom**: Master waits indefinitely for one sub-agent

**Current recovery**: Master respawns sub-agent (Step 19)

**Detection**: Master tracks completion, times out after ~30 min

### Failure Mode 2: Master Tab Crashes
**Symptom**: Browser tab closes, entire patch lost

**Current recovery**: Manual re-run of entire patch

**Data loss**: Local commits not pushed = LOST

**Prevention**: Masters push incrementally (every 5 batches)

### Failure Mode 3: GATE Violations
**Symptom**: Practice phrases use untaught vocabulary

**Example**:
```json
{
  "lego_id": "S0042L03",
  "violation_phrase": "I want to eat breakfast",
  "untaught_words": ["breakfast"],
  "reason": "Breakfast not taught until S0127"
}
```

**Current recovery**: Manual deletion using `phase5_delete_bad_phrases.cjs`

### Failure Mode 4: Git Merge Conflicts
**Symptom**: Two masters edit same seed file simultaneously

**Current prevention**: Patch division prevents overlap

**Edge case**: If human manually fixes seed file during generation

**Recovery**: Human resolves conflict manually

---

## Optimization Opportunities

### 1. Parallel Scaffold Generation (Save ~10 minutes)
```javascript
// Instead of sequential:
legoPairs.seeds.forEach(seed => generateScaffolds(seed));

// Do parallel:
const chunks = divideIntoChunks(legoPairs.seeds, 12);
await Promise.all(chunks.map(chunk => generateScaffoldsForChunk(chunk)));
```

### 2. Incremental Master Pushes (Reduce data loss risk)
```javascript
// Instead of push once at end:
// Push every 5 batches
if (completedBatches % 5 === 0) {
  git push origin main
}
```

### 3. Checkpoint Files (Recover from crashes)
```json
// phase5_outputs/patch_03_checkpoint.json
{
  "patch_id": 3,
  "completed_batches": [1, 2, 3, 4, 5],
  "pending_batches": [6, 7, 8, ...],
  "failed_batches": []
}
```

### 4. Bulk Violation Deletion (Save manual work)
```bash
# Instead of 47 individual commands:
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0042 S0042L02 3
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete S0042 S0042L02 7
# ...

# Do batch:
node scripts/phase5_delete_bad_phrases.cjs cmn_for_eng delete-from-file phase5_gate_violations.json
```

### 5. Auto-Respawn Failed Sub-Agents (Reduce stalls)
```javascript
// Master tracks timeout:
const TIMEOUT = 30 * 60 * 1000; // 30 minutes
setTimeout(() => {
  if (!batch.completed) {
    console.warn(`Batch ${batch.id} timeout - respawning`);
    spawnSubAgent(batch);
  }
}, TIMEOUT);
```

---

## Key Insights for Future Agent Design

### 1. **Browser Tab Isolation is Both Strength & Weakness**
- ✅ **Strength**: 12 masters work independently, no coordination overhead
- ❌ **Weakness**: If one tab crashes, work lost

**Lesson**: Save checkpoints to filesystem, not just in-memory

### 2. **Git Commits as Progress Checkpoints**
- ✅ **Strength**: Each commit is recoverable point
- ❌ **Weakness**: Not pushed = not safe

**Lesson**: Push incrementally (every N batches)

### 3. **File Grouping Mismatch Creates Complexity**
- Agent processes: 10 LEGOs
- Agent outputs: 3-5 seed files
- Validator finds: LEGO-level errors
- Human deletes: Phrase-level fixes in seed files

**Lesson**: Consider LEGO-per-file structure for easier debugging

### 4. **Validation Should Be Automated, Not Manual**
- 3 validators = 3 manual steps
- 47 violations = 47 manual deletions
- Re-merge = 1 more manual step

**Lesson**: Build bulk operations from the start

### 5. **The 2-2-2-4 Distribution Works**
- Simple rule
- Agents understand it
- Creates good variety
- Self-check catches errors

**Lesson**: Clear, numeric rules > vague guidelines

---

## Testing Checklist (Before Production Run)

- [ ] **Scaffold generation completes** (~1,497 files in ~15 min)
- [ ] **12 master prompts generated** correctly with LEGO lists
- [ ] **Browser tabs launch** via shell script
- [ ] **One master spawns 20 sub-agents** successfully
- [ ] **Sub-agents save to phase5_outputs/** correctly
- [ ] **Git commits work** (no permission errors)
- [ ] **Master batch-push works** (no conflicts)
- [ ] **GATE validator runs** and outputs violations JSON
- [ ] **LUT validator runs** and outputs uncertainties JSON
- [ ] **Grammar validator runs** and outputs review JSON
- [ ] **Manual deletion tool works** (`phase5_delete_bad_phrases.cjs`)
- [ ] **Final merge works** (`phase5_merge_batches.cjs`)
- [ ] **Output format matches** lego_baskets.json schema

---

## File Count Summary

| Stage | File Type | Count | Total Size (approx) |
|-------|-----------|-------|---------------------|
| Detection | JSON | 1 | 50KB |
| Division | JSON | 1 | 10KB |
| Prompts | Markdown | 12 | 60KB |
| Scaffolds | JSON | 1,497 | 15MB |
| Outputs | JSON | 340 | 25MB |
| Validation | JSON | 3 | 500KB |
| Final | JSON | 1 | 5MB |
| **TOTAL** | | **1,855** | **~46MB** |

---

## Time Breakdown (for 1,497 LEGOs)

| Step | Duration | Automated? |
|------|----------|------------|
| 1. Detection | 5 sec | ✅ |
| 2. Division | 2 sec | ✅ |
| 3. Prompt generation | 5 sec | ✅ |
| 4. Launch masters | 1 min | ⚠️ Manual |
| 5-6. Create scaffolds | 15 min | ✅ (per master) |
| 7-8. Spawn sub-agents | 2 min | ✅ (per master) |
| 9-17. Generate baskets | 4 hours | ✅ (240 agents parallel) |
| 18-21. Batch push | 5 min | ✅ (per master) |
| 22. Wait for all masters | ~5 hours | ⚠️ Manual monitoring |
| 23. GATE validation | 2 min | ✅ |
| 24. LUT validation | 1 min | ✅ |
| 25. Grammar validation | 3 min | ✅ |
| 26. Fix violations | 30 min | ❌ Manual |
| 27. Merge baskets | 1 min | ✅ |
| 28. Final commit | 1 min | ✅ |
| 30. S3 sync | 2 min | ✅ |
| **TOTAL** | **~5.5 hours** | **85% automated** |

---

**Conclusion**: Phase 5 extraction is "fiddly" primarily because:
1. **Browser tab orchestration** (12 isolated sessions)
2. **Manual monitoring required** (5 hours of waiting)
3. **Validation is manual** (47+ individual deletions)
4. **File scatter** (LEGO → seed grouping mismatch)

**But it works** because:
- Git-based coordination prevents conflicts
- Template-based prompts are consistent
- Scaffold format is self-contained
- 2-2-2-4 distribution is clear

**Future improvements** should focus on:
- Checkpoint files (crash recovery)
- Incremental pushes (reduce data loss)
- Bulk violation deletion (reduce manual work)
- Parallel scaffold generation (save 10 min)

---

*Last updated: 2025-11-17*
