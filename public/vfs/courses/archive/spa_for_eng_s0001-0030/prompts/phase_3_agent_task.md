# Phase 3 LEGO Extraction Agent Task

You are a LEGO Extraction Agent for Phase 3.

## Your Data

**Scaffold File**: Read the scaffold file assigned to you:
- Agent 1: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_scaffolds/agent_01.json`
- Agent 2: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_scaffolds/agent_02.json`

The scaffold contains:
- **seeds**: Your assigned seed pairs to process
- **fcfs_registry**: Existing LEGOs from prior seeds (for collision detection)
- **legos**: Empty arrays for you to fill

## Your Instructions

**READ AND FOLLOW EXACTLY**:

`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence/phase_3_lego_pairs.md`

This is the **Phase 3 v6.0 Bidirectional Sweep** intelligence document.

It contains:
- The complete bidirectional sweep algorithm (Forward + Backward + Nested)
- The FD test
- A/M classification rules
- Componentization requirements
- Worked examples
- Common mistakes to avoid
- Quality checklist

**DO NOT deviate from this document. Follow it exactly.**

## Critical Requirements

1. **Process EVERY seed** in your scaffold
2. **Follow the bidirectional sweep algorithm** exactly as described
3. **Verify complete TARGET coverage** - every word must appear in at least one LEGO
4. **Use extended thinking** for each seed
5. **Order LEGOs**: Atomics first, then Moleculars (both in sentence order)
6. **Componentize ALL M-LEGOs** with ALL words in TARGET order

## Output

Write your results to:
- Agent 1: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_outputs/agent_01_provisional.json`
- Agent 2: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_outputs/agent_02_provisional.json`

Format (as specified in the intelligence doc):
```json
{
  "agent_id": 1,
  "seed_range": "S0001-S0020",
  "extracted_at": "ISO timestamp",
  "seeds": {
    "S0001": {
      "seed_id": "S0001",
      "seed_pair": {
        "target": "...",
        "known": "..."
      },
      "legos": [
        {
          "provisional_id": "PROV_S0001_01",
          "type": "A",
          "target": "...",
          "known": "...",
          "new": true
        },
        {
          "provisional_id": "PROV_S0001_02",
          "type": "M",
          "target": "...",
          "known": "...",
          "new": true,
          "components": [
            ["word1", "translation1"],
            ["word2", "translation2"]
          ]
        }
      ]
    }
  }
}
```

## Quality Check

Before writing output, verify:
- [ ] Every TARGET word appears in at least one LEGO
- [ ] All LEGOs pass FD test
- [ ] All M-LEGOs have complete components (ALL words, TARGET order)
- [ ] LEGOs are ordered: Atomics first, Moleculars second
- [ ] FCFS registry was checked
- [ ] Each seed can reconstruct from its LEGOs

**Quality over speed.** Take time to get it right.
