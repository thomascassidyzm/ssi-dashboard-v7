# Phase 5 Orchestrator Intelligence

**Version**: 2.0 (2025-10-30)
**Role**: Coordinate parallel basket generation using 10 sub-agents
**Output**: `chunk_NN.json`

---

## 🎯 YOUR TASK

Generate baskets for ~354 LEGOs using 10 sub-agents.

Each basket contains:
- **e-phrases**: 3-5 full practice sentences
- **d-phrases**: Extracted 2-5 LEGO fragments (auto-extracted from e-phrases)

**Format:**
```json
{
  "S0018L04": {
    "lego": ["de la tarde", "this evening"],
    "e": [
      ["Queremos encontrarnos a las seis de la tarde", "We want to meet at six o'clock this evening"],
      ["Quiero hablar español de la tarde", "I want to speak Spanish this evening"]
    ],
    "d": {
      "2": [["de la tarde", "this evening"]],
      "3": [["seis de la tarde", "six o'clock this evening"]],
      "4": [["a las seis de la tarde", "at six o'clock this evening"]],
      "5": [["encontrarnos a las seis de la tarde", "to meet at six o'clock this evening"]]
    }
  }
}
```

---

## 🚨 CRITICAL: MINIMAL OUTPUT

**What to output:**
1. "Reading files" (1 line)
2. "Spawning 10 agents" (1 line)
3. Wait for agents (no commentary)
4. "Writing chunk" (1 line)
5. "✅ Phase 5 Orchestrator NN: chunk_NN.json written (354 baskets)" (1 line)

**FORBIDDEN:**
- ❌ File read confirmations ("Successfully read lego_pairs.json...")
- ❌ Validation narration ("Checking GATE constraint...")
- ❌ Agent spawn details ("Agent 1 processing LEGOs 1-36...")
- ❌ Progress updates during wait
- ❌ Merge commentary

**Target: 5 lines total output**

---

## 📋 WORKFLOW

### STEP 1: Read Files
```
vfs/courses/{course}/orchestrator_batches/phase5/orchestrator_batch_NN.json
vfs/courses/{course}/orchestrator_batches/phase5/canonical_order.json
vfs/courses/{course}/lego_pairs.json
```

### STEP 2: Spawn 10 Agents in Parallel

**Use Task tool, all 10 in ONE message:**

```
Generate baskets for LEGOs #X-Y.

Read:
- vfs/courses/{course}/lego_pairs.json
- vfs/courses/{course}/orchestrator_batches/phase5/canonical_order.json
- Phase 5 spec: docs/phase_intelligence/phase_5_lego_baskets.md

CRITICAL CONTENT REQUIREMENTS:
- GATE constraint: available_vocab = canonical_order.slice(0, canonical_order.indexOf(lego_id))
- Perfect grammar in BOTH languages
- e-phrases: 3-5 natural sentences per basket
- d-phrases: extract ALL 2-5 LEGO windows containing operative LEGO (full extraction)

OUTPUT FORMAT (compact to save tokens):
- Return compact JSON (no indentation, no line breaks)
- NO thinking blocks in your response
- NO commentary, explanations, or validation notes
- NO markdown code blocks
- Just raw JSON: {"S0001L01":{"lego":[...],"e":[...],"d":{...}},"S0001L02":{...}}

Orchestrator will format as one line per basket in final chunk file.
```

### STEP 3: Receive & Cleanup

**After each sub-agent completes:**
1. Receive JSON output
2. Parse and store
3. **IMMEDIATELY close the agent** (critical for RAM management)

**How to close agents:**
- If agent returned data successfully → close that shell/window immediately
- Don't wait for all 10 to complete before cleanup
- Use KillShell tool if available, or note completion for external cleanup

### STEP 4: Validate (Silently)

Spot-check 5 baskets from merged data:
- Format correct? (lego/e/d structure)
- GATE compliance? (no future vocabulary)
- Grammar perfect?

Fix minor issues silently. Only report critical failures.

### STEP 5: Merge

```json
{
  "orchestrator_id": "phase5_orch_NN",
  "chunk_number": N,
  "total_legos": 354,
  "baskets": {
    "S0018L04": {
      "lego": ["de la tarde", "this evening"],
      "e": [
        ["Queremos encontrarnos a las seis de la tarde", "We want to meet at six o'clock this evening"],
        ["Quiero hablar español de la tarde", "I want to speak Spanish this evening"],
        ["Me gustaría practicar de la tarde", "I'd like to practise this evening"]
      ],
      "d": {
        "2": [
          ["de la tarde", "this evening"]
        ],
        "3": [
          ["seis de la tarde", "six o'clock this evening"],
          ["hablar de la tarde", "to speak this evening"]
        ],
        "4": [
          ["a las seis de la tarde", "at six o'clock this evening"]
        ],
        "5": [
          ["Queremos encontrarnos a las seis de la tarde", "We want to meet at six o'clock this evening"]
        ]
      }
    },
    "S0018L05": { ... },
    ...all 354 baskets
  },
  "metadata": {
    "generated_by": "phase5_orch_NN",
    "agents_used": 10,
    "validation_passed": true,
    "total_baskets": 354
  }
}
```

Write to: `vfs/courses/{course}/orchestrator_batches/phase5/chunk_NN.json`

### STEP 6: Report & Self-Cleanup

```
✅ Phase 5 Orchestrator NN: chunk_NN.json written (354 baskets)
```

**Then EXIT immediately. Do not wait. Your process/window will be closed by the dashboard.**

**Critical for RAM management:** The dashboard needs to spawn next orchestrator.

---

## 🚨 CRITICAL RULES

### Rule 1: Spawn All 10 Agents in Parallel
**One message with 10 Task invocations. Not sequential.**

### Rule 2: Enforce GATE Constraint
LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1). Non-negotiable.

### Rule 3: Perfect Grammar
Both languages must be grammatically perfect. No exceptions.

### Rule 4: No File Pollution
Sub-agents return JSON directly. If they must write files: `vfs/courses/{course}/orchestrator_batches/phase5/temp/`

---

## 📊 SUCCESS CRITERIA

- ✓ All LEGOs processed
- ✓ Format matches spec exactly (lego/e/d structure)
- ✓ GATE constraint enforced
- ✓ Perfect grammar
- ✓ Chunk file written
- ✓ <100 lines output

---

## Version History

**v2.0 (2025-10-30)**:
- Complete rewrite to match actual phase_5_lego_baskets.md spec
- Removed incorrect "focus"/"components_used" format
- Enforced e/d phrase structure
- Reduced output target to <100 lines
