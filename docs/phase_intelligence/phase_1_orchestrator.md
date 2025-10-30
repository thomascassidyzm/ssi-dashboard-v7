# Phase 1 Orchestrator Intelligence

**Version**: 1.1 (2025-10-30)
**Role**: Coordinate parallel translation of ~223 seeds using 10 sub-agents
**Output**: `chunk_NN.json` (your portion of seed_pairs.json)

---

## 🎯 YOUR TASK

You are an orchestrator agent responsible for translating **one chunk** (~223 seeds) of a 668-seed course. Your job is to:

1. Read your orchestrator batch file
2. Spawn 10 sub-agents (each translating ~22-23 seeds)
3. Validate their outputs
4. Merge into your chunk file
5. Report completion
6. Clean up iTerm2 windows

**After all 3 orchestrators complete, a validator agent will check consistency across chunks.**

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File & Fetch Seeds

**Read your batch file** at: `vfs/courses/{course_code}/orchestrator_batches/phase1/orchestrator_batch_NN.json`

It contains minimal config (not duplicate seed data):
```json
{
  "orchestrator_id": "phase1_orch_01",
  "chunk_number": 1,
  "course_code": "pol_for_eng",
  "seed_range": {
    "start": 1,
    "end": 223,
    "total": 223
  },
  "api": {
    "seeds_endpoint": "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds",
    "fetch_params": "?start=1&end=223"
  },
  "config": {
    "agents_to_spawn": 10,
    "seeds_per_agent": 23,
    "output_file": "chunk_01.json"
  }
}
```

**Fetch your seeds from the API:**
```bash
# Use the endpoint + params from batch file
curl "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?start=1&end=223"
```

Or use WebFetch tool to fetch the seeds for your range.

### STEP 2: Divide Work Among 10 Agents

Split your ~223 seeds into 10 equal portions:
- Agent 1: Seeds 1-22
- Agent 2: Seeds 23-44
- Agent 3: Seeds 45-66
- ...
- Agent 10: Seeds 201-223

### STEP 3: Spawn 10 Sub-Agents IN PARALLEL

**CRITICAL:** Use the Task tool to spawn all 10 agents **in a single message** (parallel execution):

```markdown
I will now spawn 10 translation agents to process seeds {start}-{end}.
```

Then use 10 Task tool invocations in one message:

```
Task 1: Translate seeds S0001-S0022
Task 2: Translate seeds S0023-S0044
...
Task 10: Translate seeds S0201-S0223
```

**Each Task prompt should include:**

```markdown
Translate seeds S0XXX-S0YYY using the translation-skill.

SKILL LOCATION: /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/skills/translation-skill

REQUIRED READING (in order):
1. rules/TWO_ABSOLUTE_RULES.md - NEVER violate these [ABSOLUTE]
2. rules/ZERO_VARIATION.md - First-come-first-served principle
3. rules/COGNATE_PREFERENCE.md - Check cognates FIRST (seeds 1-100)
4. workflow/EXTENDED_THINKING.md - Use for EVERY seed [MANDATORY]

INPUT:
- Seed list with IDs and canonical text
- Target language: {target_code}
- Known language: {known_code}

OUTPUT FORMAT:
- {"S0001": [target, known], "S0002": [target, known], ...}
- See schemas/OUTPUT_FORMAT.md for complete spec

CRITICAL:
- Extended thinking for EVERY seed
- TWO ABSOLUTE RULES never violated
- Cognate preference mandatory (seeds 1-100)
- Maintain vocabulary registry for consistency
```

### STEP 4: Receive All 10 Outputs

Wait for all 10 sub-agents to complete. You will receive 10 outputs, each containing ~22-23 translated seed pairs.

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
  "total_seeds": 223,
  "translations": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
    ... all 223 seeds
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

Seeds translated: ~223
Agents spawned: 10
Output: chunk_{NN}.json
Validation: PASSED
Issues: 0

Ready for validator step.
```

### STEP 9: Clean Up Agent Windows

**CRITICAL:** Kill the 10 iTerm2 windows spawned for sub-agents.

You spawned 10 agents using the Task tool. Each creates an iTerm2 window running Claude Code. Once they complete, these windows remain open.

**Cleanup command:**
```bash
# Get all iTerm2 windows for this orchestrator's agents
# Close them to free system resources
osascript -e 'tell application "iTerm2" to close (every window whose name contains "Phase 1")'
```

**Why this matters:**
- 3 orchestrators × 10 agents = 30 iTerm2 windows
- Each window consumes memory
- Without cleanup, system resources remain locked

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

**Total time per orchestrator: ~15-20 minutes for 223 seeds**

---

## 🎯 SUCCESS CRITERIA

- ✓ All ~223 seeds translated
- ✓ 10 agents spawned in parallel (not sequential)
- ✓ Validation passed (grammar, cognates, consistency)
- ✓ Chunk file written correctly
- ✓ Summary reported
- ✓ iTerm2 windows cleaned up

**Your chunk is now ready for the validator!**

---

## Version History

**v1.1 (2025-10-30)**:
- **Reduced concurrency**: 3 orchestrators × 10 agents = 30 concurrent agents (safer for system resources)
- **Increased seeds per orchestrator**: ~223 seeds (was ~134)
- **Added cleanup step**: STEP 9 kills iTerm2 windows after completion
- **Updated for skills directory**: Orchestrator points sub-agents to modular translation-skill files
- **Eliminated data duplication**: Batch files now contain seed ranges only, orchestrator fetches from API

**v1.0 (2025-10-29)**:
- Initial orchestrator intelligence for Phase 1
- 5 orchestrators × 10 agents = 50 concurrent agents
- Focus: Speed + quality within chunk
- Validator handles cross-chunk consistency
