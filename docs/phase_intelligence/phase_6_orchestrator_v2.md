# Phase 6 Orchestrator Intelligence

**Version**: 2.0 (2025-10-30)
**Role**: Coordinate 10 sub-agents to generate ~320 LEGO introductions
**Input**: Segment config JSON, `lego_pairs.json`
**Output**: `segment_XX/orch_YY/agent_ZZ_intros.json` (per agent)

---

## CRITICAL: Atomic Agent Saves

**Each agent MUST:**
1. Write output to: `vfs/courses/{course}/phase6_segments/segment_0{segment}/orch_0{orch}/agent_{N:02d}_intros.json`
2. Return ONLY: "✅ Agent {N} complete: {count} intros written"
3. DO NOT return full JSON (exceeds token limits)

**File path format:**
- segment_01/orch_01/agent_01_intros.json
- segment_01/orch_01/agent_02_intros.json
- ... etc

**Orchestrator's job:**
- Spawn 10 agents in parallel
- Wait for all completions
- Do NOT merge (dashboard handles that)
- Exit when done

---

## 🎯 YOUR TASK

You are one of 3 orchestrators processing a segment.

**Your job:**
1. Spawn 10 sub-agents (parallel via Task tool)
2. Each agent generates ~95 introductions
3. Each agent saves its own file
4. Report completion when all agents done

**Total output: ~950 introductions**

---

## 📚 INTRODUCTION GENERATION RULES

**All introduction rules are in the introduction-generation-skill.**

**Your agents MUST use the skill:**
- `skills/introduction-generation-skill/SKILL.md`

**Do NOT repeat rules in agent prompts.** Simply tell them:
```
"Use the introduction-generation-skill for all introduction generation rules."
```

The skill covers:
- BASE vs COMPOSITE format
- Seed context requirement
- Component grammar rules
- Output format (write file, return confirmation)
- Examples of good/bad introductions

---

## 📋 WORKFLOW

### STEP 1: Read Segment Config

Read your segment config file:
```
vfs/courses/{courseCode}/phase6_segments/segment_{segment}.json
```

This contains:
```json
{
  "segment_number": 1,
  "total_legos": 951,
  "orchestrator_count": 3,
  "agents_per_orchestrator": 10,
  "orchestrator_batches": [
    {
      "orchestrator_id": 1,
      "total_legos": 317,
      "lego_ids": ["S0001L01", ...],
      "agent_batches": [
        ["S0001L01", "S0001L02", ...], // Agent 1
        ["S0033L01", ...],              // Agent 2
        ...
      ]
    },
    ...
  ]
}
```

Find your orchestrator batch by matching `orchestrator_id`.

### STEP 2: Read LEGO Pairs

Read the complete LEGO pairs file:
```
vfs/courses/{courseCode}/lego_pairs.json
```

This contains all LEGO data including:
- LEGO type (B=BASE, C=COMPOSITE)
- Target/known text
- Components (for COMPOSITE LEGOs)
- Seed sentence context

Your agents need this to generate introductions.

### STEP 3: Extract Agent Batches

Your orchestrator batch contains pre-divided `agent_batches` array.
Each agent gets one batch (~32 LEGOs).

### STEP 4: Spawn 10 Agents in Parallel

**CRITICAL: Use Task tool to spawn all 10 agents in ONE message.**

**Agent prompt template:**
```markdown
You are Agent {N} for Phase 6 Orchestrator #{orch_id}, Segment {segment}.

Your task: Generate introductions for these LEGOs: {lego_ids}

**Instructions:**
1. Read the introduction-generation-skill: skills/introduction-generation-skill/SKILL.md
2. Read lego_pairs.json: vfs/courses/{courseCode}/lego_pairs.json
3. For each LEGO in your list:
   - Find LEGO data in lego_pairs.json
   - Determine type (B=BASE, C=COMPOSITE)
   - Extract seed sentence for context
   - Generate introduction following skill format
4. Write output: vfs/courses/{courseCode}/phase6_segments/segment_{segment}/orch_{orch}/agent_{agent:02d}_intros.json

**Output format (compact JSON):**
```json
{
  "S0001L01": "Now, the Spanish for \"I want\" as in \"I want to speak Spanish with you now\" is \"Quiero\", Quiero.",
  "S0001L02": "Now, the Spanish for \"to speak\" as in \"I want to speak Spanish with you now\" is \"hablar\", hablar.",
  "S0002L01": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\"."
}
```

**Critical:**
- Follow introduction-generation-skill for all formatting
- Include seed context in EVERY introduction
- Write file immediately when done
- Return ONLY: "✅ Agent {N} complete: {count} intros written"
- Use extended thinking for planning

Begin now.
```

### STEP 5: Monitor Agent Completion

Poll every 30 seconds for agent output files:
```bash
ls vfs/courses/{courseCode}/phase6_segments/segment_{segment}/orch_{orch}/agent_*_intros.json | wc -l
```

When count reaches 10 → all agents complete.

### STEP 6: Validate Agent Outputs (Quick Check)

For each agent file, verify:
- ✓ Valid JSON?
- ✓ Contains expected LEGO IDs?
- ✓ Each intro is a string?
- ✓ Intros include seed context ("as in...")?
- ✓ BASE LEGOs start with "Now, the"?
- ✓ COMPOSITE LEGOs include "where" and component explanations?
- ✓ No commentary outside JSON?

If validation fails → retry that specific agent.

### STEP 7: Report Completion

**DO NOT merge files.** The dashboard handles segment merging.

Output:
```
✅ Phase 6 Orchestrator {orch}: All 10 agents complete ({total_count} intros)
```

**Your work is done. Dashboard will merge via phase6-merge-segment.cjs.**

---

## 🚨 CRITICAL RULES

### Rule 1: Use Introduction-Generation-Skill
**Do NOT repeat intro rules in agent prompts.** Reference the skill.

### Rule 2: Spawn All 10 Agents in Parallel
**One Task tool message with 10 invocations.** Not sequential.

### Rule 3: Progressive Saving
**Each agent writes its own file immediately.** Never lose work.

### Rule 4: No Merging
**Agents write individual files.** Dashboard merges them.

### Rule 5: Minimal Output
Keep your output concise:
- "Reading config" (1 line)
- "Spawning 10 agents" (1 line)
- Wait silently
- "Validating outputs" (1 line)
- "✅ Completion" (1 line)

**Target: <10 lines total output**

---

## 📊 SUCCESS CRITERIA

- ✓ All 10 agents spawned in parallel
- ✓ All agent outputs received and validated
- ✓ Each agent file exists: `segment_{segment}/orch_{orch}/agent_{N:02d}_intros.json`
- ✓ Format correct (LEGO_ID: "intro text" pairs)
- ✓ All expected LEGO IDs present
- ✓ No duplicate LEGO IDs
- ✓ All intros include seed context
- ✓ BASE/COMPOSITE formats correct
- ✓ Minimal console output (<10 lines)

---

## 📁 OUTPUT FILE STRUCTURE

**Each agent output file:**
```json
{
  "S0001L01": "Now, the Spanish for \"I want\" as in \"I want to speak Spanish with you now\" is \"Quiero\", Quiero.",
  "S0001L02": "Now, the Spanish for \"to speak\" as in \"I want to speak Spanish with you now\" is \"hablar\", hablar.",
  "S0002L01": "The Spanish for \"I'm trying\" as in \"I'm trying to learn\" is \"Estoy intentando\" - where \"Estoy\" means \"I am\" and \"intentando\" means \"trying\".",
  ... (~95 intros per agent)
}
```

**After dashboard merge (segment level):**
Dashboard runs `phase6-merge-segment.cjs` to create:
```
phase6_segments/segment_01/introductions.json
```

**After final merge:**
Dashboard runs `phase6-merge-all-intros.cjs` to create:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-30T12:15:44.447Z",
  "total_introductions": 2854,
  "introductions": {
    "S0001L01": "Now, the Spanish for \"I want\"...",
    ... (all 2854 intros)
  }
}
```

---

## ⏱️ TIMING ESTIMATES

**Per Agent:**
- 95 intros × 3 seconds/intro = ~5 minutes

**Your Orchestrator:**
- 10 agents in parallel = ~5 minutes total
- Validation = ~30 seconds
- **Total: ~6 minutes**

---

## 🔧 ERROR HANDLING

**If agent fails (no output after 10 min):**
1. Check if partial output exists in agent file
2. Retry that specific agent only
3. Don't restart entire batch

**If validation fails:**
1. Identify specific intro with issues
2. Check format (BASE vs COMPOSITE)
3. Verify seed context present
4. If major issues → retry agent

**If merge fails (dashboard level):**
1. Use `phase6-detect-gaps.cjs` to find missing files
2. Regenerate only missing agents
3. Re-run `phase6-merge-segment.cjs`

---

## 📖 LEGO Data Structure Reference

From `lego_pairs.json`, each LEGO is:

**BASE LEGO:**
```json
[
  "S0001L01",      // LEGO ID
  "B",             // Type: BASE
  "Quiero",        // Target text
  "I want",        // Known text
  []               // Empty components array
]
```

**COMPOSITE LEGO:**
```json
[
  "S0002L01",                  // LEGO ID
  "C",                         // Type: COMPOSITE
  "Estoy intentando",          // Target text
  "I'm trying",                // Known text
  [                            // Components array
    ["Estoy", "I am"],
    ["intentando", "trying"]
  ]
]
```

**Seed structure:**
```json
[
  "S0001",                                             // Seed ID
  [
    "Quiero hablar español contigo ahora.",           // Target seed
    "I want to speak Spanish with you now."           // Known seed
  ],
  [
    [...LEGO_01...],
    [...LEGO_02...],
    ...
  ]
]
```

Agents need to find the parent seed to extract `known_seed` for context.

---

## Version History

**v2.0 (2025-10-30)**:
- Created for segmented Phase 6 architecture
- 3 orchestrators × 10 agents per segment
- References introduction-generation-skill
- Atomic agent saves (no orchestrator merging)
- Simplified orchestrator role
- Reduced output target to <10 lines

**v1.0 (2025-10-28)**:
- Initial Phase 6 orchestrator intelligence
- Single orchestrator model (deprecated)
