# Phase 6 Orchestrator Intelligence

**Version**: 1.0 (2025-10-29)
**Role**: Coordinate parallel introduction generation from ~362 LEGOs using 10 sub-agents
**Output**: `chunk_NN.json` (your portion of lego_intros.json)

---

## 🎯 YOUR TASK

You are an orchestrator agent responsible for generating introductions for **one chunk** (~362 LEGOs) of a 1,808-LEGO course. Your job is to:

1. Read your orchestrator batch file
2. Spawn 10 sub-agents (each generating ~36 introductions)
3. Validate their outputs
4. Merge into your chunk file
5. Report completion

**After all 5 orchestrators complete, dashboard merges chunks directly (no validator needed - introductions are independent).**

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File

Your batch file is at: `vfs/courses/{course_code}/orchestrator_batches/phase6/orchestrator_batch_NN.json`

It contains:
```json
{
  "orchestrator_id": "phase6_orch_01",
  "chunk_number": 1,
  "course_code": "spa_for_eng",
  "legos": [
    {
      "lego_id": "S0001L01",
      "seed_id": "S0001",
      "type": "B",
      "target": "Quiero",
      "known": "I want",
      "components": [],
      "seed_sentence": {
        "target": "Quiero hablar español.",
        "known": "I want to speak Spanish."
      }
    },
    ... ~362 total
  ],
  "metadata": {
    "total_legos": 362,
    "lego_range": "S0001L01 - S0134L05",
    "agents_to_spawn": 10,
    "legos_per_agent": 36
  }
}
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
I will now spawn 10 introduction generation agents to process LEGOs in parallel.
```

Then use 10 Task tool invocations in one message:

```
Task 1: Generate introductions for LEGOs #1-36
Task 2: Generate introductions for LEGOs #37-72
...
Task 10: Generate introductions for LEGOs #325-362
```

**Each Task prompt should include:**
1. The specific LEGOs to generate introductions for
2. Reference to Phase 6 intelligence: "Read Phase 6 intelligence from the dashboard"
3. Output format: `{lego_id: {intro_target, intro_known}, ...}`
4. Instruction: "Use extended thinking, write 2-3 sentence introductions that motivate and contextualize each LEGO"

### STEP 4: Receive All 10 Outputs

Wait for all 10 sub-agents to complete. You will receive 10 outputs, each containing introduction data for ~36 LEGOs.

### STEP 5: Validate Outputs

For each introduction, check:

**Length and structure:**
- ✓ 2-3 sentences (not too long, not too short)?
- ✓ Written in known language (English for spa_for_eng)?
- ✓ Proper grammar and punctuation?

**Content quality:**
- ✓ Explains practical usage of the LEGO?
- ✓ Provides real-world context or scenario?
- ✓ Motivates why this LEGO is useful?
- ✓ Uses accessible, simple language?

**COMPOSITE LEGOs:**
- ✓ Explains the idiomatic meaning (not just literal)?
- ✓ Clarifies when/why to use the composite vs. components?

**Tone:**
- ✓ Encouraging and motivating?
- ✓ Not condescending or overly technical?
- ✓ Learner-friendly?

**If issues found:**
- For minor issues (<3 intros): Fix manually
- For systematic issues (agent misunderstood tone): Re-spawn that specific agent with clarification

### STEP 6: Merge Into Chunk File

Combine all 10 outputs into your chunk file using v7.7 format:

```json
{
  "orchestrator_id": "phase6_orch_01",
  "chunk_number": 1,
  "total_legos": 362,

  "introductions": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "target": "Quiero",
      "known": "I want",
      "type": "B",
      "intro": "This is one of the most essential building blocks in Spanish. You'll use 'quiero' constantly when expressing desires, making requests, or talking about what you want to do. It's your go-to word for everything from ordering coffee to planning your day."
    },
    ... all 362 introductions
  },

  "metadata": {
    "generated_by": "phase6_orch_01",
    "agents_used": 10,
    "validation_passed": true,
    "total_introductions": 362
  }
}
```

**Format notes:**
- Each introduction: keyed by lego_id
- Intro text: single string (known language)
- Include LEGO metadata (target, known, type) for reference

### STEP 7: Write Output File

Write your chunk to: `vfs/courses/{course_code}/orchestrator_batches/phase6/chunk_{NN}.json`

### STEP 8: Report Completion

Output a summary:
```
✅ Phase 6 Orchestrator {NN} Complete

LEGOs processed: 362
Introductions generated: 362
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
I'll spawn 10 introduction generation agents now.

[Task tool × 10 in this single message]
```

**DON'T DO THIS:**
```
I'll spawn agent 1... [waits] ...now agent 2... [waits] ...
```

Parallel spawning is 10x faster!

### Rule 2: Write in Known Language

All introductions must be written in the **known language** (English for spa_for_eng, Spanish for eng_for_spa).

```
✓ CORRECT (spa_for_eng):
"This is one of the most essential building blocks in Spanish..."

✗ INCORRECT (spa_for_eng):
"Este es uno de los bloques más esenciales..."
```

### Rule 3: Focus on Practical Usage

Introductions should emphasize **real-world scenarios** and **practical applications**.

```
✓ GOOD:
"You'll use 'contigo' when inviting friends to join you, making plans, or expressing togetherness. It's warmer and more personal than formal alternatives."

✗ POOR:
"'Contigo' is the informal second-person singular prepositional pronoun in Spanish grammar."
```

### Rule 4: Explain COMPOSITE LEGOs Idiomatically

For COMPOSITE LEGOs, explain the **idiomatic meaning**, not just the literal translation.

```
LEGO: "estar de acuerdo" (to agree)
Type: COMPOSITE
Components: [["estar", "to be"], ["de acuerdo", "in agreement"]]

✓ GOOD:
"While literally 'to be in agreement,' this phrase is how you naturally express agreement in Spanish. You'll use it constantly in conversations when you want to say you agree with someone's opinion or plan."

✗ POOR:
"This means 'to be in agreement.' It's composed of 'estar' (to be) and 'de acuerdo' (in agreement)."
```

---

## 📊 VALIDATION CHECKLIST

Before outputting chunk file, verify:

- [ ] All LEGOs processed (no missing IDs)
- [ ] Format correct (v7.7 introduction structure)
- [ ] Every introduction is 2-3 sentences
- [ ] All introductions in known language
- [ ] Practical usage emphasized
- [ ] COMPOSITE LEGOs explain idiomatic meaning
- [ ] Tone is encouraging and learner-friendly

---

## 💡 EFFICIENCY TIPS

**Spawn agents fast:**
- Read batch file
- Divide LEGOs (simple math)
- Spawn 10 agents immediately (one message)
- Don't overthink - just split evenly

**Validate efficiently:**
- Spot-check a few introductions for tone
- Check COMPOSITE LEGOs carefully
- Verify language is correct
- Only deep-dive if patterns emerge

**Merge quickly:**
- Simple concatenation of 10 outputs
- Follow v7.7 format exactly
- Count total introductions for metadata

**Total time per orchestrator: ~10-15 minutes for 362 introductions**

---

## 🎯 SUCCESS CRITERIA

- ✓ All 362 LEGOs processed
- ✓ 10 agents spawned in parallel (not sequential)
- ✓ Validation passed (length, content, tone)
- ✓ Chunk file written in v7.7 format
- ✓ Summary reported

**Your chunk is now ready for merge!**

---

## 📝 INTRODUCTION EXAMPLES

### BASE LEGO Example

**LEGO**: "hablar" (to speak)
**Type**: BASE

**Good Introduction**:
"This is your essential verb for talking about communication in any form. Whether you're discussing a phone call, a conversation with a friend, or your language learning journey, 'hablar' is the word you need. You'll use it dozens of times a day."

### COMPOSITE LEGO Example

**LEGO**: "tener que" (to have to)
**Type**: COMPOSITE
**Components**: [["tener", "to have"], ["que", "that"]]

**Good Introduction**:
"While literally 'to have that,' this phrase is how Spanish expresses obligation or necessity—like English 'have to' or 'must.' You'll use 'tener que' constantly when talking about things you need to do, from daily tasks to important responsibilities. It's one of the most common expressions in everyday Spanish."

---

## Version History

**v1.0 (2025-10-29)**:
- Initial orchestrator intelligence for Phase 6
- 5 orchestrators × 10 agents = 50 concurrent agents
- Focus: Practical usage + motivation + learner-friendly tone
- No validator needed (introductions independent)
