# Phase 3 Test Run: S0101-S0200 LEGO Extraction

**Goal**: Test parallel LEGO extraction with 10 agents × 10 seeds each before scaling to full 668-seed course

**Status**: ✅ Infrastructure ready, awaiting agent launch

---

## 📁 Directory Structure

```
phase3_test_s0101_s0200/
├── README.md                          # This file
├── batch_input/                       # ✅ Ready (10 batch files)
│   ├── seeds_0101_0110.json          # Agent 1
│   ├── seeds_0111_0120.json          # Agent 2
│   ├── seeds_0121_0130.json          # Agent 3
│   ├── seeds_0131_0140.json          # Agent 4
│   ├── seeds_0141_0150.json          # Agent 5
│   ├── seeds_0151_0160.json          # Agent 6
│   ├── seeds_0161_0170.json          # Agent 7
│   ├── seeds_0171_0180.json          # Agent 8
│   ├── seeds_0181_0190.json          # Agent 9
│   └── seeds_0191_0200.json          # Agent 10
├── batch_output/                      # ⏳ Pending (agents write here)
│   ├── batch_01_provisional.json     # Agent 1 output
│   ├── batch_02_provisional.json     # Agent 2 output
│   └── ...
├── templates/
│   ├── AGENT_TASK_TEMPLATE.md        # ✅ Comprehensive extraction guide
│   └── lego_registry_s0001_s0100.json # ✅ 278 existing LEGOs for reference
└── lego_pairs_s0101_s0200.json       # ⏳ Final output (after merge)
```

---

## 🚀 Execution Plan

### Phase 1: Parallel Extraction (Est. 20 minutes)

**Launch 10 agents in parallel**, each with this task:

```markdown
# Agent X Task: Extract LEGOs from S0XXX-S0XXX

**Your batch**: Read `phase3_test_s0101_s0200/batch_input/seeds_0XXX_0XXX.json`
**Reference LEGOs**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Instructions**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md` exactly
**Output**: Write `phase3_test_s0101_s0200/batch_output/batch_0X_provisional.json`

Key principles:
1. **FD compliance** - IF IN DOUBT → CHUNK UP
2. **Complete tiling** - show ALL LEGOs (new + referenced)
3. **Componentization** - ALL WORDS in M-type LEGOs
4. **Registry check** - mark existing LEGOs with proper ID and ref

Work carefully. Take 15-20 minutes per batch (10 seeds).
```

**Agent Assignments**:
- Agent 1: S0101-S0110 → `batch_01_provisional.json`
- Agent 2: S0111-S0120 → `batch_02_provisional.json`
- Agent 3: S0121-S0130 → `batch_03_provisional.json`
- Agent 4: S0131-S0140 → `batch_04_provisional.json`
- Agent 5: S0141-S0150 → `batch_05_provisional.json`
- Agent 6: S0151-S0160 → `batch_06_provisional.json`
- Agent 7: S0161-S0170 → `batch_07_provisional.json`
- Agent 8: S0171-S0180 → `batch_08_provisional.json`
- Agent 9: S0181-S0190 → `batch_09_provisional.json`
- Agent 10: S0191-S0200 → `batch_10_provisional.json`

### Phase 2: Sequential Merge (Est. 2 minutes)

Once all 10 agents complete:

```bash
node scripts/phase3_merge_batches.cjs
```

This will:
1. Load S0001-S0100 master registry (278 LEGOs)
2. Process each batch sequentially
3. Assign final LEGO IDs (S0101L01, S0101L02, etc.)
4. Mark references vs new LEGOs
5. Calculate cumulative counts
6. Output: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`

**Expected output**:
- ~250-300 new LEGOs (2.5-3 per seed)
- ~150-200 references (reuse from S0001-S0100)
- Cumulative: 278 + 250 = ~528 LEGOs through S0200

### Phase 3: Validation (Est. 5 minutes)

**Automated checks**:
```bash
node scripts/validate_lego_pairs.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```

**Manual spot-check** (5 random seeds):
- [ ] Seed reconstruction works (all LEGOs → original seed)
- [ ] FD compliance (no ambiguous chunks)
- [ ] Complete tiling (new + ref LEGOs shown)
- [ ] Componentization quality (ALL WORDS in M-types)
- [ ] Registry alignment (existing LEGOs properly referenced)

---

## 📊 Success Criteria

### Must Pass ✅
- [ ] 100% seed reconstruction (all 100 seeds)
- [ ] Zero ambiguous LEGOs (FD check)
- [ ] Complete tiling maintained
- [ ] ALL WORDS in M-type components
- [ ] Total time < 30 minutes (20 min extract + 2 min merge + validation)

### Should Pass ⚠️
- [ ] A/M balance ~40/60 ±10%
- [ ] Reuse rate 30-50% (references from S0001-S0100)
- [ ] Quality matches S0001-S0100 baseline
- [ ] No agent interference or errors

### Nice to Have 💡
- [ ] Pattern consistency across batches
- [ ] Component note quality
- [ ] Self-validation pass rate

---

## 🔍 Quality Checks from S0001-S0100 Review

### FD Compliance Examples

✅ **Good**:
- "quiero" = "I want" (1:1, unambiguous)
- "estoy intentando" = "I'm trying" (1:1, chunked pattern)
- "después de que termines" = "after you finish" (subjunctive trigger included)

❌ **Bad**:
- "que" alone (ambiguous without context)
- "de" alone (preposition needs context)
- "estar" without auxiliary (could be infinitive or conjugated)

### Complete Tiling Example

**S0015**: "Y quiero que hables español conmigo mañana."

```json
{
  "legos": [
    {"id": "S0015L01", "target": "y", "known": "and", "new": true},
    {"id": "S0001L01", "target": "quiero", "known": "I want", "ref": "S0001"},
    {"id": "S0015L02", "target": "que hables", "known": "you to speak", "new": true},
    {"id": "S0001L03", "target": "español", "known": "Spanish", "ref": "S0001"},
    {"id": "S0015L03", "target": "conmigo", "known": "with me", "new": true},
    {"id": "S0012L04", "target": "mañana", "known": "tomorrow", "ref": "S0012"}
  ]
}
```

**Reconstruction**: y + quiero + que hables + español + conmigo + mañana ✅

### Componentization Example

**S0016L04**: "con todos los demás" = "with everyone else"

```json
{
  "type": "M",
  "components": [
    ["con", "with"],
    ["todos", "all/everyone"],
    ["los demás", "the others/else"]
  ]
}
```

ALL WORDS accounted for ✅

---

## 🐛 Common Issues to Watch For

### Issue 1: Over-Atomization

**Problem**: Splitting too aggressively
**Example**: "después" + "de" + "que" separately
**Solution**: Keep "después de que" as M-type (subjunctive trigger)

### Issue 2: Missing References

**Problem**: Marking "quiero" as NEW when it exists in S0001
**Solution**: Always check `lego_registry_s0001_s0100.json` before marking new

### Issue 3: Incomplete Components

**Problem**: M-type LEGO missing words in components
**Example**: "estoy intentando" only shows `[["estoy", "I am"]]` (missing "intentando")
**Solution**: Account for ALL WORDS in components array

### Issue 4: Inconsistent Types

**Problem**: Same LEGO classified differently (A in one batch, M in another)
**Solution**: Follow A/M rules strictly (multi-word OR pattern → M)

---

## 📈 Expected Timing

| Phase | Time | Notes |
|-------|------|-------|
| Batch preparation | ~1 min | ✅ Complete |
| Agent launch | ~2 min | Spawning 10 agents |
| Parallel extraction | ~20 min | All agents work simultaneously |
| Merge coordinator | ~2 min | Sequential processing |
| Validation | ~5 min | Automated + spot-checks |
| **Total** | **~30 min** | vs ~3 hours sequential (6x speedup) |

---

## 🔄 If Test Fails

### Minor Issues (Fix & Retry)
- Agent task template unclear → refine and relaunch
- Merge script bugs → fix and re-run merge only
- Validation false positives → adjust thresholds

### Major Issues (Rethink Strategy)
- Quality degradation across agents → reduce batch size to 5 seeds
- Agent interference → serialize some batches
- FD violations widespread → provide more examples in template

---

## ✅ If Test Succeeds

### Next Steps

1. **Merge S0101-S0200 into master**
   ```bash
   node scripts/merge_into_master.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
   ```

2. **Generate baskets for S0101-S0200** (Phase 5)
   - Launch 10 agents again (reuse same batches)
   - Each generates baskets for their 10 seeds
   - Est. 30-40 minutes

3. **Scale to S0201-S0668** (remaining 468 seeds)
   - 47 agents × 10 seeds each
   - Same methodology
   - Est. ~2 hours total (extraction + baskets)

---

## 📝 Notes

### Key Decisions from Quality Review

1. **Merge IS necessary** (9% of time, ensures correctness)
2. **Small batch size (10 seeds)** prevents context fatigue
3. **Registry check mandatory** to avoid duplicates
4. **Componentization non-negotiable** for M-types

### Lessons from S0001-S0100

- 37% Atomic, 63% Molecular (healthy balance)
- Complete tiling crucial for basket generation
- FD compliance non-negotiable (no ambiguous chunks)
- Component quality directly impacts learning experience

---

## 🆘 Troubleshooting

**Q: Agent can't find batch file**
A: Check path is relative to project root: `phase3_test_s0101_s0200/batch_input/seeds_0XXX_0XXX.json`

**Q: Registry lookup fails**
A: Ensure lowercase matching: `lego.target.toLowerCase()` vs registry keys

**Q: Merge script errors on duplicate IDs**
A: Check agents properly marked existing LEGOs with `ref` instead of `new`

**Q: Seed reconstruction fails**
A: Missing LEGO or wrong boundaries - recheck bidirectional sweep

---

**Ready to launch!** 🚀

Once all 10 agents complete their extraction, run the merge script and validate output.
