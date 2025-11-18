# Universal 12-Master Orchestration System

**The standard architecture for all SSi course generation phases.**

⚠️ **Important**: Launcher requires 5-second delays between tabs for reliability. Total launch time: ~2 minutes.

## Core Principle

```
668 seeds ÷ 12 masters = ~56 seeds per master
~56 seeds ÷ 10 sub-agents = ~6 seeds per sub-agent
```

This pattern applies to **content generation phases**: Phase 3, Phase 5, Phase 6, Phase 8.

**Note**: Phase 7 (Compile Manifest) is a single-agent compilation task and does NOT use this pattern.

---

## Architecture

### Master Agents (12 total)
- Own a patch of ~56 seeds
- Create scaffolds/prep for their patch
- Spawn 10 sub-agents
- Monitor completion
- No inter-master coordination needed

### Sub-Agents (~10 per master = ~120 total)
- Process ~6 seeds worth of work
- Follow phase-specific intelligence prompts
- Validate output
- Save to phase outputs directory
- Push to GitHub in batches

---

## Files

### Core Scripts

- **`divide_into_patches.cjs`** - Universal patch division (works for any phase)
- **`generate_master_prompts.cjs`** - Creates 12 individualized master prompts
- **`launch_12_masters.sh`** - Opens 12 browser tabs with auto-paste

### Templates

- **`phase3_master_template.md`** - LEGO deconstruction orchestrator
- **`phase5_master_template.md`** - Basket generation orchestrator
- **`phase6_master_template.md`** - Introduction generation orchestrator
- **`phase8_master_template.md`** - Audio generation orchestrator

**Note**: Phase 7 (compile manifest) is single-agent compilation, no template needed

---

## Usage

### Phase 3: LEGO Deconstruction

```bash
# 1. Divide seeds into patches
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase3

# 2. Generate master prompts
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase3

# 3. Launch masters
./scripts/universal_12master_orchestration/launch_12_masters.sh phase3
```

### Phase 5: Basket Generation

```bash
# 1. Divide seeds into patches (or use missing LEGOs list)
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase5

# 2. Generate master prompts
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase5

# 3. Launch masters
./scripts/universal_12master_orchestration/launch_12_masters.sh phase5
```

### Phase 6: Introductions

```bash
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase6
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase6
./scripts/universal_12master_orchestration/launch_12_masters.sh phase6
```

### Phase 7: Compile Manifest

**Does NOT use 12-master pattern** - single-agent compilation task:

```bash
node scripts/phase7_compile_manifest.cjs cmn_for_eng
```

### Phase 8: Audio Generation

```bash
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase8
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase8
./scripts/universal_12master_orchestration/launch_12_masters.sh phase8
```

---

## Benefits

✅ **Universal** - Same architecture across all phases
✅ **Scalable** - Works for 10 items or 3,000 items
✅ **Parallel** - 12 masters work independently
✅ **Simple** - Easy math, easy monitoring
✅ **Resumable** - Failed batches easy to retry
✅ **Validated** - Each phase has quality gates

---

## Philosophy

> "We don't have to make it too complicated."
>
> — User feedback that led to this architecture

The 12-master pattern emerged from Phase 5 regeneration but proved to be the **universal orchestration pattern** for all SSi course generation.

**Key insight**: Whether processing 668 seeds for the first time or regenerating 100 missing LEGOs, the pattern is the same. Only the input list changes.

---

**Last updated**: 2025-11-17
