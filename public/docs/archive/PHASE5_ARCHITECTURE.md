# Phase 5 Basket Generation Architecture

**Status**: Ready for execution
**Last Updated**: 2025-10-30

## Overview

Phase 5 generates practice baskets for all LEGOs using a 3-segment parallelized architecture.

**Total capacity**: ~1,800 baskets in ~36 minutes

## Components

### 1. basket-generation-skill (v1.1.0)

**Location**: `skills/basket-generation-skill/`

**Purpose**: Canonical basket generation rules

**Files (9 total)**:
- `SKILL.md` - Main entry with progressive disclosure
- `rules/GATE_CONSTRAINT.md` - Use complete LEGO pairs from prior positions only
- `rules/PHRASE_LENGTH.md` - Scale with available vocabulary
- `rules/CULMINATING_LEGOS.md` - Seed sentence first
- `workflow/GENERATE_E_PHRASES.md` - Read vocab first, then assemble
- `workflow/EXTRACT_D_PHRASES.md` - Mechanical extraction
- `workflow/RECENCY_BIAS.md` - 30-50% recent vocabulary
- `examples/EXAMPLES.md` - Good vs bad baskets
- `schemas/OUTPUT_FORMAT.md` - JSON structure

**Key principle**: Available vocabulary = complete LEGO pairs (chunks), NOT individual words. Must use entire LEGO pair as unit.

### 2. phase_5_orchestrator.md (v3.0)

**Location**: `docs/phase_intelligence/phase_5_orchestrator.md`

**Purpose**: Instructions for individual orchestrators

**What it does**:
- References basket-generation-skill (no rule repetition)
- Explains how to spawn 10 agents in parallel
- Explains progressive saving at agent level
- Explains validation and merging

### 3. Preparation Script

**File**: `scripts/phase5-prepare-segments.cjs`

**What it does**:
- Divides ~1,800 LEGOs into 3 segments (~600 each)
- Creates segment files with orchestrator batch definitions
- Creates directory structure: `segment_XX/orch_YY/`

**Usage**:
```bash
node scripts/phase5-prepare-segments.cjs spa_for_eng
```

### 4. Merge Scripts

**Segment merge**: `scripts/phase5-merge-segment.cjs`
- Merges 3 orchestrator files into segment file
- Usage: `node scripts/phase5-merge-segment.cjs spa_for_eng 1`

**Final merge**: `scripts/phase5-merge-final.cjs`
- Merges 3 segment files into lego_baskets.json
- Validates against lego_pairs.json
- Usage: `node scripts/phase5-merge-final.cjs spa_for_eng`

## Architecture Diagram

```
Master Orchestrator
│
├─ Segment 1 (~600 baskets)
│  ├─ Orchestrator 1 (spawn + 30s delay)
│  │  └─ 10 agents × 20 baskets = 200 baskets
│  │     ├─ agent_01_baskets.json (immediate save)
│  │     ├─ agent_02_baskets.json
│  │     └─ ... → merge → orch_01_baskets.json
│  │
│  ├─ Orchestrator 2 (spawn + 30s delay)
│  │  └─ 10 agents × 20 baskets = 200 baskets
│  │     └─ ... → merge → orch_02_baskets.json
│  │
│  └─ Orchestrator 3 (spawn)
│     └─ 10 agents × 20 baskets = 200 baskets
│        └─ ... → merge → orch_03_baskets.json
│
│  → Merge 3 orch files → segment_01_baskets.json
│  → Kill all PIDs, close windows
│
├─ Segment 2 (~600 baskets) [same pattern]
│  → segment_02_baskets.json
│  → Kill all PIDs, close windows
│
└─ Segment 3 (~600 baskets) [same pattern]
   → segment_03_baskets.json
   → Kill all PIDs, close windows

→ Final merge → lego_baskets.json (~1,800 baskets)
```

## Progressive Saving (No Data Loss)

**Agent level (immediate)**:
- Each agent writes: `segment_XX/orch_YY/agent_ZZ_baskets.json`
- Happens as soon as agent completes
- Never lose work

**Orchestrator level**:
- Orchestrator merges 10 agent files
- Writes: `segment_XX/orch_YY_baskets.json`

**Segment level**:
- Master merges 3 orchestrator files
- Writes: `segment_XX_baskets.json`

**Final**:
- Master merges 3 segment files
- Writes: `lego_baskets.json`

## Process Management

**When spawning orchestrators**:
1. Capture window ID via osascript
2. Track window IDs: `window_ids="$window_ids $new_id"`
3. Capture Claude PIDs: `lsof -c claude -a -d cwd -Fn | grep segment_0X`
4. Track PIDs: `orch_pids="$orch_pids $new_pids"`

**After segment completes**:
1. Kill all PIDs: `kill -9 $pid` for each PID
2. Close all windows: `osascript -e "tell iTerm2 to close window id $wid"`
3. Clear variables: `window_ids=""` and `orch_pids=""`
4. Free RAM before starting next segment

## Timing Estimates

**Per agent**: 20 baskets × 30s = ~10 minutes
**Per orchestrator**: 10 agents (parallel) = ~10 minutes
**Per segment**: 3 orchestrators (30s delays) = ~12 minutes
**All 3 segments**: ~36 minutes total

## Master Orchestrator Workflow

### Segment 1

1. **Prep**: `node scripts/phase5-prepare-segments.cjs spa_for_eng`
2. **Spawn Orch 1**: osascript → capture window_id & PIDs
3. **Wait 30s**
4. **Spawn Orch 2**: osascript → capture window_id & PIDs
5. **Wait 30s**
6. **Spawn Orch 3**: osascript → capture window_id & PIDs
7. **Monitor**: Poll for 3 orch files every 30s
8. **Merge**: `node scripts/phase5-merge-segment.cjs spa_for_eng 1`
9. **Cleanup**: Kill all PIDs, close windows

### Segment 2 (repeat)

### Segment 3 (repeat)

### Final Merge

`node scripts/phase5-merge-final.cjs spa_for_eng`

## Quality Checks

**After each segment**:
- ✓ ~600 baskets generated
- ✓ All expected LEGO IDs present
- ✓ No duplicates
- ✓ Valid JSON structure

**After final merge**:
- ✓ ~1,800 baskets total
- ✓ Matches lego_pairs.json count
- ✓ 100% coverage
- ✓ Sample check: GATE compliance, phrase length, format

## Error Handling

**Agent fails**:
- Orchestrator retries that specific agent
- Don't restart entire batch

**Orchestrator fails**:
- Master checks for partial outputs
- Retries failed orchestrator only
- Don't restart entire segment

**Segment merge fails**:
- Re-run merge script
- Don't regenerate baskets

## Key Success Factors

1. ✅ **Skill reference** - No rule repetition in prompts
2. ✅ **Progressive saving** - Agent-level saves prevent data loss
3. ✅ **Parallel spawning** - 10 agents in one Task message
4. ✅ **PID tracking** - Clean process management
5. ✅ **Segment isolation** - Complete one fully before next
6. ✅ **RAM management** - Kill processes after each segment

## What's Next

To execute Phase 5:
1. Ensure lego_pairs.json exists from Phase 3
2. Run master orchestrator with Phase 5 instructions
3. Master orchestrator follows workflow above
4. Results in lego_baskets.json with ~1,800 baskets

---

**Architecture Status**: ✅ Complete and ready for execution
**Skills Status**: ✅ v1.1.0 production-ready
**Scripts Status**: ✅ All preparation and merge scripts ready
