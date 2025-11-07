# Execute All 3 Waves: S0201-S0668

Extract LEGOs from remaining 468 seeds in 3 waves (47 agents total).

---

## Wave 1: S0201-S0360 (16 agents × 10 seeds)

**Registry**: Use `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json` (551 existing LEGOs through S0200)

**Agents**: Launch 16 agents in parallel

**Batches**: `wave1_s0201_s0360/batch_input/seeds_0201_0210.json` through `seeds_0351_0360.json`

**Output**: `wave1_s0201_s0360/batch_output/batch_01_provisional.json` through `batch_16_provisional.json`

**Merge**:
```bash
node scripts/phase3_merge_batches.cjs wave1_s0201_s0360
```

**Expected**: ~160 new LEGOs, 711 cumulative through S0360

---

## Wave 2: S0361-S0520 (16 agents × 10 seeds)

**Registry**: Use Wave 1 output `wave1_s0201_s0360/lego_pairs_s0201_s0360.json` (711 existing LEGOs)

**Agents**: Launch 16 agents in parallel

**Batches**: `wave2_s0361_s0520/batch_input/seeds_0361_0370.json` through `seeds_0511_0520.json`

**Output**: `wave2_s0361_s0520/batch_output/batch_01_provisional.json` through `batch_16_provisional.json`

**Merge**:
```bash
node scripts/phase3_merge_batches.cjs wave2_s0361_s0520
```

**Expected**: ~160 new LEGOs, 871 cumulative through S0520

---

## Wave 3: S0521-S0668 (15 agents, last has 8 seeds)

**Registry**: Use Wave 2 output `wave2_s0361_s0520/lego_pairs_s0361_s0520.json` (871 existing LEGOs)

**Agents**: Launch 15 agents in parallel

**Batches**: `wave3_s0521_s0668/batch_input/seeds_0521_0530.json` through `seeds_0661_0668.json` (last batch has 8 seeds)

**Output**: `wave3_s0521_s0668/batch_output/batch_01_provisional.json` through `batch_15_provisional.json`

**Merge**:
```bash
node scripts/phase3_merge_batches.cjs wave3_s0521_s0668
```

**Expected**: ~148 new LEGOs, ~1019 cumulative through S0668

---

## Core Principles (Same as S0101-S0200)

**FD Compliance**: IF IN DOUBT → CHUNK UP

**Complete Tiling**: Show ALL LEGOs (new + referenced)

**Componentization**: For M-type, show ALL WORDS with literal translations

**Registry Check**: Always check existing LEGOs before marking as new

---

## Simple Agent Task (Copy for Each)

```
Extract LEGOs from [batch_file].

Read: phase3_s0201_s0668/[wave]/batch_input/[batch_file].json
Reference: [wave_registry].json
Output: phase3_s0201_s0668/[wave]/batch_output/batch_XX_provisional.json

Follow Phase 3 methodology:
1. Bidirectional sweep (forward + backward)
2. FD chunking (IF IN DOUBT → CHUNK UP)
3. Check registry for existing LEGOs
4. Mark new vs referenced
5. Componentize M-types (ALL WORDS)
6. Validate complete tiling

Use same format as S0101-S0200 test.
```

---

## Total Time Estimate

- Wave 1: ~9 minutes (7 min extraction + 2 min merge)
- Wave 2: ~9 minutes
- Wave 3: ~9 minutes
- Setup between waves: ~5 minutes

**Total: ~32 minutes for 468 seeds**

---

## Final Output

After all 3 waves:
- Wave 1: `lego_pairs_s0201_s0360.json` (~711 cumulative)
- Wave 2: `lego_pairs_s0361_s0520.json` (~871 cumulative)
- Wave 3: `lego_pairs_s0521_s0668.json` (~1019 cumulative)

**Combine all** → `lego_pairs_s0001_s0668_COMPLETE.json` (~1019 total LEGOs)

---

**Ready to execute!** 🚀
