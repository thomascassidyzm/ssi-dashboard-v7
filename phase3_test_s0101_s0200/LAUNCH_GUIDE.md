# 🚀 Launch Guide: 10 Parallel Agents for S0101-S0200

**Status**: ✅ All infrastructure ready
**Next step**: Launch 10 agents in parallel

---

## Quick Start (Copy-Paste for Each Agent)

### Agent 1: S0101-S0110

```
Extract LEGOs from Spanish seeds S0101-S0110 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0101_0110.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json` (278 existing LEGOs)
**Guide**: Follow all instructions in `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`

**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_01_provisional.json`

**Key principles**:
1. **FD compliance** - IF IN DOUBT → CHUNK UP (no ambiguous chunks like "que" alone)
2. **Complete tiling** - Show ALL LEGOs (new + referenced) so seed is reconstructible
3. **Componentization** - For M-type LEGOs, show ALL WORDS with literal translations
4. **Registry check** - Use lego_registry to mark existing LEGOs with proper ID and ref

**Output format**:
```json
{
  "batch_id": "S0101_S0110",
  "batch_number": 1,
  "extractor": "Agent 1",
  "extracted_at": "2025-11-07T...",
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {
        "target": "Estoy disfrutando descubrir más sobre este lenguaje",
        "known": "I'm enjoying finding out more about this language."
      },
      "legos": [
        {
          "provisional_id": "PROV_S0101_01",
          "type": "M",
          "target": "estoy disfrutando",
          "known": "I'm enjoying",
          "new": true,
          "components": [
            ["estoy", "I am"],
            ["disfrutando", "enjoying"]
          ]
        },
        {
          "id": "S0023L02",
          "type": "A",
          "target": "más",
          "known": "more",
          "ref": "S0023",
          "new": false
        },
        ... (continue for all LEGOs in this seed)
      ]
    },
    ... (continue for all 10 seeds)
  ]
}
```

**Take your time** - aim for 15-20 minutes for high quality extraction of 10 seeds.
```

---

### Agent 2: S0111-S0120

```
Extract LEGOs from Spanish seeds S0111-S0120 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0111_0120.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_02_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 3: S0121-S0130

```
Extract LEGOs from Spanish seeds S0121-S0130 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0121_0130.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_03_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 4: S0131-S0140

```
Extract LEGOs from Spanish seeds S0131-S0140 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0131_0140.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_04_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 5: S0141-S0150

```
Extract LEGOs from Spanish seeds S0141-S0150 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0141_0150.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_05_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 6: S0151-S0160

```
Extract LEGOs from Spanish seeds S0151-S0160 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0151_0160.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_06_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 7: S0161-S0170

```
Extract LEGOs from Spanish seeds S0161-S0170 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0161_0170.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_07_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 8: S0171-S0180

```
Extract LEGOs from Spanish seeds S0171-S0180 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0171_0180.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_08_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 9: S0181-S0190

```
Extract LEGOs from Spanish seeds S0181-S0190 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0181_0190.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_09_provisional.json`

[Same principles and format as Agent 1]
```

---

### Agent 10: S0191-S0200

```
Extract LEGOs from Spanish seeds S0191-S0200 following Phase 3 methodology.

**Input**: Read `phase3_test_s0101_s0200/batch_input/seeds_0191_0200.json`
**Reference**: Read `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Guide**: Follow `phase3_test_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md`
**Output**: Write to `phase3_test_s0101_s0200/batch_output/batch_10_provisional.json`

[Same principles and format as Agent 1]
```

---

## After All Agents Complete

### Step 1: Verify all outputs exist

```bash
ls -la phase3_test_s0101_s0200/batch_output/
```

Should see:
- batch_01_provisional.json
- batch_02_provisional.json
- ...
- batch_10_provisional.json

### Step 2: Run merge coordinator

```bash
node scripts/phase3_merge_batches.cjs
```

Expected output:
- Processes 10 batches sequentially
- Assigns final LEGO IDs
- Marks references vs new
- Outputs: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`

### Step 3: Validate quality

```bash
node scripts/validate_lego_pairs.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```

Should report:
- ✅ No critical errors
- Statistics on A/M balance, reuse rate
- Any warnings to review

### Step 4: Manual spot-check

Pick 5 random seeds and verify:
- Seed reconstruction works
- FD compliance maintained
- Complete tiling (new + ref)
- Component quality

---

## Success Criteria

**Must pass** ✅:
- [ ] All 10 batch files generated
- [ ] Merge completes successfully
- [ ] 100% seed reconstruction
- [ ] Zero FD violations
- [ ] Complete tiling maintained

**Should pass** ⚠️:
- [ ] A/M balance ~40/60 ±10%
- [ ] Reuse rate 30-50%
- [ ] Total time < 30 minutes
- [ ] Quality matches S0001-S0100

---

## If Successful

1. **Document results** in quality review
2. **Proceed to Phase 5** (basket generation for S0101-S0200)
3. **Scale strategy** to S0201-S0668 (remaining 468 seeds)

---

## If Issues Arise

- **Minor quality issues**: Refine template, relaunch specific agents
- **Merge errors**: Debug script, re-run merge only
- **Major quality problems**: Reduce batch size to 5 seeds, adjust methodology

---

**Ready to launch!** 🎯

Copy-paste each agent task into Claude Code's agent system and launch them in parallel.
