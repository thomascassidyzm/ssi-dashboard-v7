# Universal 12-Master Orchestration Pattern

**Status**: ✅ Production Architecture
**Created**: 2025-11-17
**Applies to**: SSi content generation phases (3, 5, 6, 8)

---

## Executive Summary

The **12-Master Pattern** is the universal architecture for generating all SSi course content. Whether processing 668 seeds for the first time or regenerating 100 missing items, the same orchestration pattern applies.

### Core Formula

```
668 seeds ÷ 12 masters = ~56 seeds per master
~56 seeds ÷ 10 sub-agents = ~6 seeds per sub-agent
```

This creates:
- **12 browser tabs** (one master per tab)
- **~120 sub-agents** (spawned by masters)
- **Predictable resource usage**
- **Simple monitoring**

---

## Why This Pattern Works

### 1. **Parallelization Without Coordination**
Each master owns a patch of ~56 seeds. No inter-master communication needed.

### 2. **Human-Scale Monitoring**
12 browser tabs is manageable. You can visually scan all masters at once.

### 3. **Clean Mathematics**
- 668 ÷ 12 = ~56 (seed range per master)
- ~56 ÷ 10 = ~6 (seeds per sub-agent)
- Simple to calculate, simple to reason about

### 4. **Granular Resumability**
If a sub-agent fails, only ~6 seeds need retry. If a master fails, only 1/12 of work is affected.

### 5. **Uniform Across Phases**
Same pattern for Phase 3, 5, 6, 7. Learn once, apply everywhere.

---

## Phase-Specific Applications

### Phase 3: LEGO Deconstruction

**Input**: `seed_pairs.json` (668 seed pairs)
**Output**: `lego_pairs.json` (deconstructed LEGOs)

**Master responsibilities**:
1. Read 56 seed pairs from their patch
2. Prepare scaffolds (recent context, available LEGOs)
3. Spawn 10 sub-agents

**Sub-agent workflow** (each processes ~6 seeds):
1. Read seed pairs
2. Deconstruct into LEGOs (FD/LUT identification)
3. Validate no collisions
4. Save to `phase3_outputs/seed_SXXXX_legos.json`

**Intelligence prompt**: https://ssi-dashboard-v7.vercel.app/phase-intelligence/3

---

### Phase 5: Basket Generation

**Input**: `lego_pairs.json` (LEGOs marked `new: true`)
**Output**: `lego_baskets.json` (practice phrases)

**Master responsibilities**:
1. Read LEGO list for their patch (~125 LEGOs from ~56 seeds)
2. Create scaffolds for each LEGO
3. Spawn 10 sub-agents (~10 baskets per agent)

**Sub-agent workflow** (each processes ~10 LEGOs):
1. Read scaffolds
2. Generate 10 practice phrases per LEGO (2-2-2-4 distribution)
3. Grammar self-check
4. Save to `phase5_outputs/seed_SXXXX_baskets.json`

**Intelligence prompt**: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

**Key insight**: Same pattern for initial generation AND regeneration. Only difference is the LEGO list (all vs missing).

---

### Phase 6: Introduction Generation

**Input**: `seed_pairs.json` + `lego_pairs.json`
**Output**: `introductions.json` (presentation content)

**Master responsibilities**:
1. Read 56 seeds from their patch
2. Prepare pedagogical context
3. Spawn 10 sub-agents

**Sub-agent workflow** (each processes ~6 seeds):
1. Read seed data and LEGOs
2. Create introduction content
3. Validate pedagogy
4. Save to `phase6_outputs/seed_SXXXX_intro.json`

**Intelligence prompt**: https://ssi-dashboard-v7.vercel.app/phase-intelligence/6

---

### Phase 7: Compile Manifest

**Input**: All previous phases (seed_pairs, lego_pairs, lego_baskets, introductions)
**Output**: `course_manifest.json` (unified course structure)

**Does NOT use 12-master pattern** - this is a single-agent compilation task that merges all previous outputs into a unified course manifest.

---

### Phase 8: Audio Generation

**Input**: All previous phase outputs
**Output**: Audio files + timing markers

**Master responsibilities**:
1. Read all content for 56 seeds
2. Prepare audio generation configs
3. Spawn 10 sub-agents

**Sub-agent workflow** (each processes ~6 seeds):
1. Generate TTS audio for all content
2. Create timing markers
3. Validate audio quality
4. Save to `phase7_outputs/seed_SXXXX_audio/`

**Intelligence prompt**: https://ssi-dashboard-v7.vercel.app/phase-intelligence/8

---

## Implementation

### Directory Structure

```
scripts/universal_12master_orchestration/
├── README.md                          # Quick reference
├── divide_into_patches.cjs            # Universal patch divider
├── generate_master_prompts.cjs        # Prompt generator
├── launch_12_masters.sh               # Safari automation
├── templates/
│   ├── phase3_master_template.md      # LEGO deconstruction
│   ├── phase5_master_template.md      # Basket generation
│   ├── phase6_master_template.md      # Introduction generation
│   └── phase8_master_template.md      # Audio generation
│   # Note: Phase 7 (compile manifest) is single-agent, no template needed
└── generated_prompts/
    └── [phase-specific directories]
```

### Workflow

**For any phase:**

```bash
# 1. Divide work into 12 patches
node scripts/universal_12master_orchestration/divide_into_patches.cjs <course> <phase>

# 2. Generate 12 master prompts
node scripts/universal_12master_orchestration/generate_master_prompts.cjs <course> <phase>

# 3. Launch 12 browser tabs
./scripts/universal_12master_orchestration/launch_12_masters.sh <phase>
```

**Example (Phase 5):**
```bash
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase5
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase5
./scripts/universal_12master_orchestration/launch_12_masters.sh phase5
```

---

## Master Agent Template Structure

All master prompts follow this structure:

```markdown
# Phase X Master Orchestrator: Patch N

**Course**: `course_code`
**Your Patch**: Seeds `SXXXX` to `SXXXX` (56 seeds)
**Items in your patch**: XXX

---

## 🎯 YOUR MISSION

You are responsible for processing ALL items in your patch range.

**Your workflow:**
1. ✅ Read your item list (provided below)
2. ✅ Create scaffolds for all items in your list
3. ✅ Spawn sub-agents (~10 items per agent)
4. ✅ Monitor completion and report summary

---

## 📋 YOUR ITEM LIST (XXX items)

```json
[
  "ITEM_ID_001",
  "ITEM_ID_002",
  ...
]
```

---

## 🔧 STEP 1: Create Scaffolds
[Phase-specific scaffold instructions]

---

## 🚀 STEP 2: Spawn Sub-Agents
[Phase-specific sub-agent spawning instructions]

---

## 📊 STEP 3: Monitor & Report
[Phase-specific completion tracking]

---

## ⚠️ IMPORTANT NOTES
[Phase-specific gotchas and reminders]
```

---

## Benefits Over Alternative Architectures

### vs. Single Agent Processing
- ❌ Single agent: 668 seeds × 5 min = ~55 hours
- ✅ 12 masters: 56 seeds × 5 min = ~4.7 hours (parallel)

### vs. 100+ Independent Agents
- ❌ 100 agents: Coordination nightmare, merge conflicts, no visibility
- ✅ 12 masters: Human-scale monitoring, clean territories, simple merges

### vs. Dynamic Task Queue
- ❌ Queue: Complex state management, opaque progress
- ✅ 12 masters: Visual progress (12 tabs), simple math

---

## Quality Gates

Every phase includes validation:

1. **Pre-processing**: Input validation (files exist, format correct)
2. **During processing**: Sub-agent self-checks (GATE, grammar, completeness)
3. **Post-processing**: Master validation before merge
4. **Final validation**: Course-level validators run on merged output

**Philosophy**: Catch errors early, fail fast, validate often.

---

## Error Handling

### Sub-Agent Failure
- Master detects failure (no output or error in output)
- Master respawns sub-agent for failed batch only
- Other sub-agents continue unaffected

### Master Failure
- Other 11 masters continue unaffected
- Re-run failed master with same prompt
- Outputs are idempotent (safe to re-run)

### Merge Conflicts
- Each patch writes to separate seed ranges
- No overlap = no conflicts
- Simple linear merge of all outputs

---

## Scalability

### Current: 668 seeds
```
12 masters × 10 sub-agents × 6 seeds = 720 capacity
668 seeds = 93% utilization ✅
```

### If expanded to 1,000 seeds
```
12 masters × 10 sub-agents × 8 seeds = 960 capacity
1000 seeds = 104% utilization (spawn 1 extra sub-agent per master)
```

### If expanded to 2,000 seeds
```
20 masters × 10 sub-agents × 10 seeds = 2000 capacity
Still human-monitorable (20 tabs)
```

**Conclusion**: Pattern scales from hundreds to thousands of seeds without architectural changes.

---

## Historical Context

### Evolution

1. **Initial approach**: Single agent processing seeds sequentially
2. **First parallelization**: 4 agents processing quarters of course
3. **Dynamic spawning**: Agents self-spawning based on workload
4. **12-master pattern**: Emerged from Phase 5 regeneration (2025-11-17)

### The Breakthrough

User feedback: *"this is NOT the way to do it - I think we should go back to the main flow"*

Key insight: **Don't create special "regeneration mode"** - use same architecture, just different input lists.

Result: Universal pattern that works for initial generation AND regeneration.

### Quote

> "We don't have to make it too complicated."
> — User feedback that crystallized the architecture

---

## Future Extensions

### Potential Enhancements

1. **Progress API**: Real-time progress tracking across all masters
2. **Auto-retry**: Automatic respawn of failed sub-agents
3. **Load balancing**: Dynamic redistribution if one master falls behind
4. **Validation dashboard**: Live quality metrics as agents work

### Non-Goals

- ❌ **Complex coordination** - Keep masters independent
- ❌ **Dynamic task stealing** - Territorial ownership is feature, not bug
- ❌ **Adaptive batching** - Predictable math > optimization
- ❌ **Cloud orchestration** - Local browser tabs work perfectly

**Philosophy**: Keep it simple. Optimize for human understanding, not theoretical throughput.

---

## Success Metrics

You know the system is working when:

✅ **Predictable timing**: Each master completes in similar timeframes
✅ **Clean outputs**: All `phase_outputs/` files valid
✅ **No merge conflicts**: Patches merge cleanly
✅ **Human-scale monitoring**: Can see progress at a glance
✅ **Easy debugging**: Failed batch = failed master = visible in one tab
✅ **Reusable**: Same scripts work across Phase 3, 5, 6, 7

---

## Conclusion

The **12-Master Pattern** is the universal orchestration architecture for SSi course generation.

**Core principle**: Divide 668 seeds among 12 masters, each spawning 10 sub-agents processing ~6 seeds.

**Key insight**: Same pattern for ALL phases - only the intelligence prompts and output formats differ.

**Philosophy**: Simple, predictable, human-scale, universal.

---

**Related Documents**:
- `scripts/universal_12master_orchestration/README.md` - Quick reference
- `docs/workflows/PHASE5_WORKFLOW.md` - Phase 5 specifics
- `SYSTEM.md` - Overall system architecture

**Last updated**: 2025-11-17
