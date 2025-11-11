# Execute Phase 5: Generate Baskets for S0101-S0200

Generate 10 practice phrase baskets for 273 new LEGOs using 20 parallel agents.

---

## Quick Start

**Input Ready**: 20 batch files in `batch_input/` (agent_01 through agent_20)
**Registry**: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json` (551 LEGOs)
**Skill Reference**: `skills/basket-generation-skill/SKILL.md`
**Template**: `templates/AGENT_TASK_TEMPLATE.md`

---

## Launch 20 Agents in Parallel

### Agent 1-20: Generate Baskets

Each agent:
1. Reads `batch_input/agent_XX_legos.json` (~14 LEGOs)
2. Reads `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json` (registry)
3. Generates 10 practice phrases per LEGO
4. Follows 2-2-2-4 distribution (short → long)
5. Enforces GATE constraint (only earlier LEGOs)
6. Outputs to `batch_output/agent_XX_baskets.json`

**Time per agent**: ~30-40 minutes (14 LEGOs × 2-3 min/LEGO)

---

## Agent Prompt Template

```
Generate baskets for Phase 5.

Read your assignment: phase5_baskets_s0101_s0200/batch_input/agent_XX_legos.json

Load LEGO registry: phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json

Follow template: phase5_baskets_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md

For each LEGO in your batch:
1. Generate 10 practice phrases
2. Distribution: 2 short (1-2 LEGOs), 2 quite short (3), 2 longer (4-5), 4 long (6+)
3. GATE constraint: Only use LEGOs from earlier positions
4. Include full seed sentence as one of the long phrases
5. Mark patterns used

Output: phase5_baskets_s0101_s0200/batch_output/agent_XX_baskets.json

Use format from existing baskets:
- public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0050.json
- public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0023.json
```

---

## After All Agents Complete

### Step 1: Merge All Baskets

```bash
node scripts/phase5_merge_baskets.cjs
```

Merges 20 agent files → `lego_baskets_s0101_s0200.json`

### Step 2: Validate

```bash
node scripts/validate_baskets.cjs phase5_baskets_s0101_s0200/lego_baskets_s0101_s0200.json
```

Checks:
- GATE compliance (no future vocabulary)
- Distribution compliance (2-2-2-4)
- Pattern coverage
- Natural Spanish

### Step 3: Merge with Existing

```bash
# Combine S0001-S0100 baskets with S0101-S0200 baskets
node scripts/combine_baskets.cjs
```

Output: `lego_baskets_s0001_s0200_complete.json` (373 baskets total)

---

## Timing Estimate

- **Agent execution**: 30-40 minutes (all 20 in parallel)
- **Merge**: 2 minutes
- **Validation**: 3 minutes
- **Total**: ~35-45 minutes

---

## Success Criteria

✅ All 273 LEGOs have baskets generated
✅ 100% GATE compliance (no future vocabulary violations)
✅ 90%+ distribution compliance (2-2-2-4)
✅ Full seed included in each basket
✅ Natural Spanish throughout

---

## Key Files

**Batch Input** (20 files):
- `batch_input/agent_01_legos.json` (14 LEGOs: S0101L01-S0104L04)
- `batch_input/agent_02_legos.json` (14 LEGOs: S0105L01-S0108L04)
- ...
- `batch_input/agent_20_legos.json` (7 LEGOs: S0198L02-S0200L04)

**Registry**:
- `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json` (551 cumulative LEGOs)

**Reference Baskets**:
- `public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0001.json` through `s0100.json`

**Skill Documentation**:
- `skills/basket-generation-skill/SKILL.md` (basket generation rules)
- `skills/basket-generation-skill/rules/GATE_CONSTRAINT.md` (vocabulary rules)
- `skills/basket-generation-skill/rules/PHRASE_LENGTH.md` (distribution rules)

---

## Ready to Execute! 🚀

Launch all 20 agents in Claude Code on the Web and let them run in parallel.
