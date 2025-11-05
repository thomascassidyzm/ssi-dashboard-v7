# Claude Code Web Test - LEGO_BASKET Generation

## Purpose
Test whether Claude Code Web can generate LEGO_BASKETs for Spanish language learning course using parallel agents.

## Task
Generate practice phrase baskets for seeds S0001-S0030.

## Files in This Folder

### Input Files
1. **INSTRUCTIONS_FOR_CLAUDE_CODE_WEB.md** - Complete step-by-step instructions
2. **spa_for_eng_30_seed_pairs.json** - All 668 seed pairs (only use S0001-S0030)
3. **lego_extraction_s0001-s0010_HANDCRAFTED_v1.json** - LEGO extractions for S0001-S0010
4. **lego_extraction_s0011-s0020_HANDCRAFTED_v1.json** - LEGO extractions for S0011-S0020

### Reference Files
1. **REFERENCE_lego_baskets_s0001.json** - Example of correctly generated basket
2. **algorithmic_practice_selector_v1.json** - Detailed algorithm specification

### Output Directory
Create: `./output/` and save all generated baskets there.

Expected output:
- `lego_baskets_s0001.json`
- `lego_baskets_s0002.json`
- ... through ...
- `lego_baskets_s0030.json`

## Key Instructions for Claude Code Web

**Start here:** Read `INSTRUCTIONS_FOR_CLAUDE_CODE_WEB.md`

**CRITICAL POINTS:**
1. ✓ Orientation: KNOWN→TARGET = English→Spanish (learner sees English, produces Spanish)
2. ✓ Only create baskets for actual LEGOs (sensible standalone known→target mapping)
3. ✓ ~10 practice phrases per LEGO
4. ✓ Structure: First 2 (minimal) → Middle 4-6 (pattern coverage) → Last 4 (expansive)
5. ✓ GATE compliance: Only use LEGOs taught in previous seeds

## Suggested Approach

### Sequential (Recommended)
```
For seed S0001 to S0030:
  1. Read handcrafted extraction (if available) OR extract LEGOs from seed_pairs.json
  2. Track cumulative inventory (patterns + LEGOs)
  3. For each LEGO in seed:
     - Generate ~10 practice phrases
     - Ensure pattern coverage
     - Sort by complexity
  4. Save to output/lego_baskets_s00XX.json
  5. Update cumulative inventory
```

### Parallel (Advanced)
Spin up 3 agents working on different ranges:
- Agent A: S0001-S0010
- Agent B: S0011-S0020
- Agent C: S0021-S0030

Each maintains independent cumulative inventory.

## Success Metrics

For completion, verify:
- [ ] 30 files generated (S0001-S0030)
- [ ] All use English→Spanish orientation
- [ ] Only sensible LEGOs have baskets
- [ ] ~10 phrases per LEGO
- [ ] 100% pattern coverage per LEGO
- [ ] Natural Spanish (grammatically correct)
- [ ] GATE compliance (no future LEGOs used)

## Date Created
2025-11-05

## Next Steps
1. Push this folder to GitHub
2. Direct Claude Code Web to this folder
3. Run overnight
4. Review output in morning
