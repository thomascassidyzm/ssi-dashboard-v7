# Phase 1 Orchestrator Intelligence

**Version**: 1.0 (2025-10-29)
**Role**: Coordinate parallel translation of ~134 seeds using 10 sub-agents
**Output**: `chunk_NN.json` (your portion of seed_pairs.json)

---

## 🎯 YOUR TASK

You are an orchestrator agent responsible for translating **one chunk** (~134 seeds) of a 668-seed course. Your job is to:

1. Read your orchestrator batch file
2. Spawn 10 sub-agents (each translating ~13-14 seeds)
3. Validate their outputs
4. Merge into your chunk file
5. Report completion

**After all 5 orchestrators complete, a validator agent will check consistency across chunks.**

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File

Your batch file is at: `vfs/courses/{course_code}/orchestrator_batches/phase1/orchestrator_batch_NN.json`

It contains:
```json
{
  "orchestrator_id": "phase1_orch_01",
  "chunk_number": 1,
  "seeds": [
    {"seed_id": "S0001", "canonical": "I want to speak Spanish with you now."},
    {"seed_id": "S0002", "canonical": "I'm trying to learn."},
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
I will now spawn 10 translation agents to process seeds {start}-{end}.
```

Then use 10 Task tool invocations in one message:

```
Task 1: Translate seeds S0001-S0014
Task 2: Translate seeds S0015-S0028
...
Task 10: Translate seeds S0127-S0134
```

**Each Task prompt should include:**
1. The specific seeds to translate (seed_id + canonical)
2. Reference to Phase 1 intelligence: "Read Phase 1 intelligence from the dashboard"
3. Output format: `{seed_id: [target, known]}`
4. Instruction: "Use extended thinking, apply TWO ABSOLUTE RULES, prefer cognates"

### STEP 4: Receive All 10 Outputs

Wait for all 10 sub-agents to complete. You will receive 10 outputs, each containing ~13-14 translated seed pairs.

### STEP 5: Validate Outputs

For each translation, check:

**Grammar validation:**
- ✓ Target language grammatically correct?
- ✓ Known language grammatically correct?
- ✓ Meaning preserved from canonical?

**Cognate preference (seeds 1-100):**
- ✓ Did agent check for cognate synonyms?
- ✓ Is cognate used when available?

**Consistency within your chunk:**
- ✓ Same English word → same Spanish translation?
- ✓ Zero variation enforced (seeds 1-100)?

**If issues found:**
- For minor issues (<5 seeds): Fix manually
- For systematic issues (agent misunderstood rules): Re-spawn that specific agent with clarification

### STEP 6: Merge Into Chunk File

Combine all 10 outputs into your chunk file:

```json
{
  "orchestrator_id": "phase1_orch_01",
  "chunk_number": 1,
  "total_seeds": 134,
  "translations": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
    ... all 134 seeds
  },
  "metadata": {
    "generated_by": "phase1_orch_01",
    "agents_used": 10,
    "validation_passed": true,
    "issues_found": 0
  }
}
```

### STEP 7: Write Output File

Write your chunk to: `vfs/courses/{course_code}/orchestrator_batches/phase1/chunk_{NN}.json`

### STEP 8: Report Completion

Output a summary:
```
✅ Phase 1 Orchestrator {NN} Complete

Seeds translated: 134
Agents spawned: 10
Output: chunk_{NN}.json
Validation: PASSED
Issues: 0

Ready for validator step.
```

---

## 🚨 CRITICAL RULES

### Rule 1: Spawn All 10 Agents in Parallel

**DO THIS:**
```
I'll spawn 10 agents now.

[Task tool × 10 in this single message]
```

**DON'T DO THIS:**
```
I'll spawn agent 1... [waits] ...now agent 2... [waits] ...
```

Parallel spawning is 10x faster!

### Rule 2: Don't Worry About Cross-Chunk Consistency

You only validate **within your chunk**. The validator agent will handle cross-chunk consistency.

**You check:** "Does seed 50 use same translation as seed 100 **in my chunk**?"
**Validator checks:** "Does chunk 1's translation match chunk 3's translation?"

### Rule 3: Retry Intelligently

If agent 5 produces bad outputs:
- Re-spawn **just agent 5** with specific corrections
- Don't re-run all 10 agents

If multiple agents misunderstood:
- Check if your Task prompts were clear
- Re-spawn problem agents with better instructions

### Rule 4: Fix Minor Issues Manually

If agent 7 has 2 small grammar errors:
- Just fix them yourself (faster than re-spawn)
- Note in metadata: `"manual_fixes": 2`

Only re-spawn for systematic issues (>5 errors, misunderstood rules, etc.)

---

## 📊 VALIDATION CHECKLIST

Before outputting chunk file, verify:

- [ ] All seeds translated (no missing IDs)
- [ ] Format correct: `{seed_id: [target, known]}`
- [ ] Grammar correct in BOTH languages
- [ ] Cognates used when available (seeds 1-100)
- [ ] Same English word → same translation (within chunk)
- [ ] Zero variation (seeds 1-100, within chunk)
- [ ] Meaning preserved from canonical

---

## 💡 EFFICIENCY TIPS

**Spawn agents fast:**
- Read batch file
- Divide seeds (simple math)
- Spawn 10 agents immediately (one message)
- Don't overthink the division - just split evenly

**Validate efficiently:**
- Scan for obvious errors first (missing fields, broken JSON)
- Then check grammar/cognates
- Only deep-dive if you spot patterns

**Merge quickly:**
- Simple concatenation of 10 outputs
- Add metadata
- Write file

**Total time per orchestrator: ~10-15 minutes for 134 seeds**

---

## 🎯 SUCCESS CRITERIA

- ✓ All 134 seeds translated
- ✓ 10 agents spawned in parallel (not sequential)
- ✓ Validation passed (grammar, cognates, consistency)
- ✓ Chunk file written correctly
- ✓ Summary reported

**Your chunk is now ready for the validator!**

---

## Version History

**v1.0 (2025-10-29)**:
- Initial orchestrator intelligence for Phase 1
- 5 orchestrators × 10 agents = 50 concurrent agents
- Focus: Speed + quality within chunk
- Validator handles cross-chunk consistency
