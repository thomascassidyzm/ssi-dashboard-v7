# Phase 5 Orchestrator Intelligence

**Version**: 1.0 (2025-10-29)
**Role**: Coordinate parallel basket generation from ~362 LEGOs using 10 sub-agents
**Output**: `chunk_NN.json` (your portion of all_baskets.json)

---

## 🎯 YOUR TASK

You are an orchestrator agent responsible for generating baskets for **one chunk** (~362 LEGOs) of a 1,808-LEGO course. Your job is to:

1. Read your orchestrator batch file
2. Spawn 10 sub-agents (each generating ~36 baskets)
3. Validate their outputs
4. Merge into your chunk file
5. Report completion

**After all 5 orchestrators complete, dashboard merges chunks directly (no validator needed - baskets are independent).**

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File

Your batch file is at: `vfs/courses/{course_code}/orchestrator_batches/phase5/orchestrator_batch_NN.json`

It contains:
```json
{
  "batch_number": 1,
  "course_code": "spa_for_eng",
  "lego_ids": ["S0001L01", "S0001L02", "S0001L03", ... ~354 IDs],
  "canonical_order": ["S0001L01", "S0001L02", ... all 1766 unique LEGOs]
}
```

**CRITICAL: Reading LEGO details**
- LEGO details (target, known, type, seed_sentence) are in `vfs/courses/{course_code}/lego_pairs.json`
- Read `lego_pairs.json` ONCE at the start
- Look up each LEGO by ID as you process

**Computing available vocabulary (GATE constraint):**
```javascript
// For LEGO at position N in canonical_order:
const legoIndex = batch.canonical_order.indexOf(lego_id);
const available_vocab = batch.canonical_order.slice(0, legoIndex);

// For recency bias (prefer recent 20 LEGOs):
const recent_vocab = batch.canonical_order.slice(Math.max(0, legoIndex - 20), legoIndex);
```

### STEP 2: Divide Work Among 10 Agents

Split your ~362 LEGOs into 10 equal portions:
- Agent 1: LEGOs 1-36
- Agent 2: LEGOs 37-72
- Agent 3: LEGOs 73-108
- ...
- Agent 10: LEGOs 325-362

### STEP 3: Spawn 10 Sub-Agents IN PARALLEL

**CRITICAL:** Use the Task tool to spawn all 10 agents **in a single message** (parallel execution):

```markdown
I will now spawn 10 basket generation agents to process LEGOs in parallel.
```

Then use 10 Task tool invocations in one message:

```
Task 1: Generate baskets for LEGOs #1-36
Task 2: Generate baskets for LEGOs #37-72
...
Task 10: Generate baskets for LEGOs #325-362
```

**Each Task prompt should include:**
1. Path to lego_pairs.json: `vfs/courses/{course_code}/lego_pairs.json`
2. The specific LEGO IDs to generate baskets for (from lego_ids array)
3. The canonical_order array (for computing available_vocab)
4. Instruction on computing available_vocab: `canonical_order.slice(0, canonical_order.indexOf(lego_id))`
5. Reference to Phase 5 intelligence: "Read Phase 5 intelligence from the dashboard"
6. Output format: `{lego_id: {basket_data}, ...}`
7. Instruction: "Use extended thinking, apply quality iteration loop, enforce GATE constraint and recency bias"

### STEP 4: Receive All 10 Outputs

Wait for all 10 sub-agents to complete. You will receive 10 outputs, each containing basket data for ~36 LEGOs.

### STEP 5: Validate Outputs

For each basket, check:

**Focus sentence validation:**
- ✓ Contains the target LEGO being practiced?
- ✓ Natural and contextually appropriate?
- ✓ Uses realistic scenario?

**GATE constraint (vocabulary availability):**
- ✓ All LEGOs in focus sentence are available (position < current LEGO)?
- ✓ No "future" vocabulary used?

**Recency bias:**
- ✓ 30-50% of vocabulary from recent_window (last 10 seeds)?
- ✓ Fresh, recent vocabulary prioritized?

**Culminating baskets (is_culminating: true):**
- ✓ Focus sentence uses the full seed sentence?
- ✓ Validates learner can reconstruct the seed?

**Component structure:**
- ✓ Format correct: `{lego_id: {focus: {target, known}, ...}, ...}`
- ✓ All required fields present?

**If issues found:**
- For minor issues (<3 baskets): Fix manually
- For systematic issues (agent misunderstood GATE): Re-spawn that specific agent with clarification

### STEP 6: Merge Into Chunk File

Combine all 10 outputs into your chunk file using v7.7 format:

```json
{
  "orchestrator_id": "phase5_orch_01",
  "chunk_number": 1,
  "total_legos": 362,

  "baskets": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "target": "Quiero",
      "known": "I want",
      "type": "B",
      "focus": {
        "target": "Quiero café.",
        "known": "I want coffee."
      },
      "components_used": ["S0001L01"]
    },
    ... all 362 baskets
  },

  "metadata": {
    "generated_by": "phase5_orch_01",
    "agents_used": 10,
    "validation_passed": true,
    "total_baskets": 362
    }
  }
}
```

**Format notes:**
- Each basket: keyed by lego_id
- Focus sentence: {target, known} pair
- available_vocab: array of prior LEGO IDs
- recent_vocab_used: array of LEGO IDs from recent_window

### STEP 7: Write Output File

Write your chunk to: `vfs/courses/{course_code}/orchestrator_batches/phase5/chunk_{NN}.json`

### STEP 8: Report Completion

Output a summary:
```
✅ Phase 5 Orchestrator {NN} Complete

LEGOs processed: 362
Baskets generated: 362 (231 unique + 131 duplicates mapped)
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
I'll spawn 10 basket generation agents now.

[Task tool × 10 in this single message]
```

**DON'T DO THIS:**
```
I'll spawn agent 1... [waits] ...now agent 2... [waits] ...
```

Parallel spawning is 10x faster!

### Rule 2: Enforce GATE Constraint

Every LEGO in a focus sentence MUST be available (position < current LEGO).

```
LEGO #50: "hablar" (to speak)
Available vocabulary: LEGOs #1-49

VALID focus sentence:
"Quiero hablar español" (uses Quiero=#1, hablar=#50, español=#3)

INVALID focus sentence:
"Hablar es importante ahora" (uses importante=#120, which is FUTURE vocabulary)
```

### Rule 3: Enforce Recency Bias

30-50% of vocabulary in focus sentence should come from recent_window (last 10 seeds).

```
LEGO #50: recent_window = [S0040L01, S0040L02, ..., S0049L05]

GOOD focus sentence:
"Quiero hablar español contigo ahora"
(uses contigo=#48, ahora=#49 from recent window = 40% recent)

POOR focus sentence:
"Quiero hablar español"
(uses only early LEGOs, no recent vocabulary = 0% recent)
```

### Rule 4: Validate Culminating Baskets

For LEGOs with `is_culminating: true`, the focus sentence MUST be the seed sentence.

```json
{
  "lego_id": "S0001L05",
  "is_culminating": true,
  "seed_sentence": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],

  "focus": {
    "target": "Quiero hablar español contigo ahora.",  // MUST match seed
    "known": "I want to speak Spanish with you now."
  }
}
```

**Purpose:** Validates learner can reconstruct the full seed sentence.

---

## 📊 VALIDATION CHECKLIST

Before outputting chunk file, verify:

- [ ] All LEGOs processed (no missing IDs)
- [ ] Format correct (v7.7 basket structure)
- [ ] Every focus sentence uses the target LEGO
- [ ] All vocabulary available (GATE constraint)
- [ ] Recency bias met (30-50% from recent_window)
- [ ] Culminating baskets use seed sentence
- [ ] Duplicate map referenced correctly

---

## 💡 EFFICIENCY TIPS

**Spawn agents fast:**
- Read batch file
- Divide LEGOs (simple math)
- Spawn 10 agents immediately (one message)
- Don't overthink - just split evenly

**Validate efficiently:**
- Spot-check GATE constraint (quick position check)
- Verify a few baskets for recency bias
- Check culminating baskets carefully
- Only deep-dive if patterns emerge

**Merge quickly:**
- Simple concatenation of 10 outputs
- Follow v7.7 format exactly
- Count total baskets for metadata

**Total time per orchestrator: ~15-20 minutes for 362 baskets**

---

## 🎯 SUCCESS CRITERIA

- ✓ All 362 LEGOs processed
- ✓ 10 agents spawned in parallel (not sequential)
- ✓ Validation passed (GATE, recency, culminating)
- ✓ Chunk file written in v7.7 format
- ✓ Summary reported

**Your chunk is now ready for merge!**

---

## 🔍 QUALITY ITERATION LOOP

Each basket should go through quality iteration:

1. **Generate** initial focus sentence
2. **Test** against constraints:
   - Uses target LEGO?
   - GATE constraint satisfied?
   - Recency bias met?
   - Natural and realistic?
3. **Refine** if needed:
   - Add recent vocabulary
   - Adjust context
   - Simplify if too complex
4. **Validate** final version

**Goal:** High-quality, contextually rich baskets that enforce spaced repetition through recency bias.

---

## Version History

**v1.0 (2025-10-29)**:
- Initial orchestrator intelligence for Phase 5
- 5 orchestrators × 10 agents = 50 concurrent agents
- Focus: GATE constraint + recency bias + quality iteration
- No validator needed (baskets independent)
