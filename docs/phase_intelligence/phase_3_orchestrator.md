# Phase 3 Orchestrator Intelligence

**Version**: 1.0 (2025-10-29)
**Role**: Coordinate parallel LEGO extraction from ~134 seeds using 10 sub-agents
**Output**: `chunk_NN.json` (your portion of lego_pairs.json)

---

## 🎯 YOUR TASK

You are an orchestrator agent responsible for extracting LEGOs from **one chunk** (~134 seeds) of a 668-seed course. Your job is to:

1. Read your orchestrator batch file
2. Spawn 10 sub-agents (each extracting LEGOs from ~13-14 seeds)
3. Validate their outputs
4. Merge into your chunk file
5. Report completion

**After all 5 orchestrators complete, dashboard merges chunks directly (no validator needed per Phase 3 intelligence: "treat each seed as isolated").**

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File

Your batch file is at: `vfs/courses/{course_code}/orchestrator_batches/phase3/orchestrator_batch_NN.json`

It contains:
```json
{
  "orchestrator_id": "phase3_orch_01",
  "chunk_number": 1,
  "seeds": [
    {
      "seed_id": "S0001",
      "target": "Quiero hablar español contigo ahora.",
      "known": "I want to speak Spanish with you now."
    },
    ... ~134 total
  ],
  "metadata": {
    "agents_to_spawn": 10,
    "seeds_per_agent": 14
  }
}
```

### STEP 2: Divide Work Among 10 Agents

Split your ~134 seeds into 10 equal portions:
- Agent 1: Seeds 1-14
- Agent 2: Seeds 15-28
- Agent 3: Seeds 29-42
- ...
- Agent 10: Seeds 127-134

### STEP 3: Spawn 10 Sub-Agents IN PARALLEL

**CRITICAL:** Use the Task tool to spawn all 10 agents **in a single message** (parallel execution):

```markdown
I will now spawn 10 LEGO extraction agents to process seeds {start}-{end}.
```

Then use 10 Task tool invocations in one message:

```
Task 1: Extract LEGOs from seeds S0001-S0014
Task 2: Extract LEGOs from seeds S0015-S0028
...
Task 10: Extract LEGOs from seeds S0127-S0134
```

**Each Task prompt should include:**
1. The specific seeds to decompose (seed_id + target + known)
2. Reference to Phase 3 intelligence: "Read Phase 3 intelligence from the dashboard"
3. Output format: `{seed_id: [[lego_id, type, target, known, components], ...]}`
4. Instruction: "Use extended thinking, apply TILING FIRST, test uncertainty checklist"

### STEP 4: Receive All 10 Outputs

Wait for all 10 sub-agents to complete. You will receive 10 outputs, each containing LEGO extractions for ~13-14 seeds.

### STEP 5: Validate Outputs

For each seed's LEGO extraction, check:

**Tiling validation:**
- ✓ Do LEGOs reconstruct seed perfectly?
- ✓ No extra words, no missing words?

**Functional determinism:**
- ✓ Each LEGO passes uncertainty checklist (3 questions)?
- ✓ Ambiguous standalone words wrapped larger?

**Component structure (COMPOSITE LEGOs):**
- ✓ Format: `[[targetPart, literalKnown], ...]`
- ✓ Components are literal (not idiomatic)?

**If issues found:**
- For minor issues (<3 seeds): Fix manually
- For systematic issues (agent misunderstood TILING): Re-spawn that specific agent with clarification

### STEP 6: Merge Into Chunk File

Combine all 10 outputs into your chunk file using v7.7 format:

```json
{
  "orchestrator_id": "phase3_orch_01",
  "chunk_number": 1,
  "total_seeds": 134,

  "seeds": [
    [
      "S0001",
      ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      [
        ["S0001L01", "B", "Quiero", "I want", []],
        ["S0001L02", "B", "hablar", "to speak", []],
        ["S0001L03", "B", "español", "Spanish", []],
        ["S0001L04", "B", "contigo", "with you", []],
        ["S0001L05", "B", "ahora", "now", []]
      ]
    ],
    ... all 134 seeds
  ],

  "metadata": {
    "generated_by": "phase3_orch_01",
    "agents_used": 10,
    "validation_passed": true,
    "total_legos": 450
  }
}
```

**Format notes:**
- Each seed: `[seed_id, [target, known], [[lego_id, type, target, known, components], ...]]`
- Type: "B" = BASE, "C" = COMPOSITE
- Components: Empty array `[]` for BASE, `[[targetPart, knownPart], ...]` for COMPOSITE

### STEP 7: Write Output File

Write your chunk to: `vfs/courses/{course_code}/orchestrator_batches/phase3/chunk_{NN}.json`

### STEP 8: Report Completion

Output a summary:
```
✅ Phase 3 Orchestrator {NN} Complete

Seeds processed: 134
LEGOs extracted: 450
Agents spawned: 10
Output: chunk_{NN}.json
Validation: PASSED

Ready for merge step.
```

---

## 🚨 CRITICAL RULES

### Rule 1: Spawn All 10 Agents in Parallel

**DO THIS:**
```
I'll spawn 10 LEGO extraction agents now.

[Task tool × 10 in this single message]
```

**DON'T DO THIS:**
```
I'll spawn agent 1... [waits] ...now agent 2... [waits] ...
```

Parallel spawning is 10x faster!

### Rule 2: Enforce TILING FIRST

Every seed MUST tile perfectly from its LEGOs. This is THE fundamental rule.

```
Seed: "Quiero hablar español"
LEGOs: ["Quiero", "hablar", "español"]
Reconstruct: "Quiero" + "hablar" + "español" = "Quiero hablar español" ✓

If reconstruction ≠ original seed → INVALID
```

### Rule 3: Apply Uncertainty Checklist

Each LEGO must pass all 3 questions:
1. Does learner already know a simpler form? (NO)
2. Is this ambiguous standalone? (NO)
3. Can this mean multiple things in known language? (NO)

If ANY answer is YES → wrap larger

### Rule 4: Validate Component Format

COMPOSITE LEGOs must have proper component structure:

```json
["S0002L01", "C", "Estoy intentando", "I'm trying", [
  ["Estoy", "I am"],
  ["intentando", "trying"]
]]
```

**Check:**
- ✓ Type is "C"
- ✓ Components is array (not empty)
- ✓ Each component is [targetPart, literalKnown]

---

## 📊 VALIDATION CHECKLIST

Before outputting chunk file, verify:

- [ ] All seeds processed (no missing IDs)
- [ ] Format correct (v7.7 seed array structure)
- [ ] Every seed tiles perfectly from LEGOs
- [ ] All LEGOs pass uncertainty checklist
- [ ] COMPOSITE components formatted correctly
- [ ] No cross-seed dependencies (seeds are isolated)

---

## 💡 EFFICIENCY TIPS

**Spawn agents fast:**
- Read batch file
- Divide seeds (simple math)
- Spawn 10 agents immediately (one message)
- Don't overthink - just split evenly

**Validate efficiently:**
- Check tiling first (quick spot-check)
- Verify a few LEGOs per seed for uncertainty
- Only deep-dive if patterns emerge

**Merge quickly:**
- Simple concatenation of 10 outputs
- Follow v7.7 format exactly
- Count total LEGOs for metadata

**Total time per orchestrator: ~20-25 minutes for 134 seeds**

---

## 🎯 SUCCESS CRITERIA

- ✓ All 134 seeds processed
- ✓ 10 agents spawned in parallel (not sequential)
- ✓ Validation passed (tiling, FD, components)
- ✓ Chunk file written in v7.7 format
- ✓ Summary reported

**Your chunk is now ready for merge!**

---

## Version History

**v1.0 (2025-10-29)**:
- Initial orchestrator intelligence for Phase 3
- 5 orchestrators × 10 agents = 50 concurrent agents
- Focus: TILING FIRST + functional determinism
- No validator needed (seeds isolated)
