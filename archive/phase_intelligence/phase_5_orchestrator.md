# Phase 5 Orchestrator Intelligence

**Version**: 3.0 (2025-10-30)
**Role**: Coordinate 10 sub-agents to generate ~200 LEGO baskets
**Input**: `orchestrator_batch_NN.json`, `lego_pairs.json`
**Output**: `segment_XX/orch_YY_baskets.json`

---

## 🎯 YOUR TASK

You are one of 3 orchestrators processing a segment.

**Your job:**
1. Spawn 10 sub-agents (parallel via Task tool)
2. Each agent generates ~20 baskets
3. Collect agent outputs
4. Merge into your orchestrator file
5. Report completion

**Total output: ~200 baskets**

---

## 📚 BASKET GENERATION RULES

**Include this full prompt for each agent:**

### THE TASK
Generate practice phrase baskets for each LEGO.

Each basket contains:
- **E-phrases** (eternal): Natural sentences for spaced repetition
- **D-phrases** (debut): Fragments extracted from e-phrases

### THE ABSOLUTE CONSTRAINT: GATE
**LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)**

This is non-negotiable. Everything else is secondary.

Examples:
- LEGO #1: Empty basket {} (no prior vocabulary)
- LEGO #5: Max 5-6 word phrases (LEGOs #1-4 available)
- LEGO #100: Can make 7-10 word phrases (99 LEGOs available)

**If you can't make a good phrase within the vocabulary constraint, make a shorter phrase or leave the basket empty. NEVER use future vocabulary.**

### THE WORKFLOW

**STEP 1: Generate E-Phrases**

Generate 3-5 natural, conversational sentences that:
- Use ONLY vocabulary from prior LEGOs (GATE)
- Include the operative LEGO (what's being taught)
- Have perfect grammar in BOTH languages
- Are things people actually say
- Tile perfectly from LEGOs (no extra/missing words)

**Recency bias** (for LEGOs #50+):
- ~30-50% vocabulary from recent seeds (last 10 seeds)
- ~50-70% from older seeds (foundational)

**Culminating LEGOs** (last LEGO in seed):
- E-phrase #1 MUST be the complete seed sentence

**STEP 2: Extract D-Phrases (Mechanical)**

From each e-phrase, extract expanding windows containing the operative LEGO:
- All 2-LEGO windows containing operative
- All 3-LEGO windows containing operative
- All 4-LEGO windows containing operative
- All 5-LEGO windows containing operative

This is automatic - no thinking needed.

### E-PHRASE QUALITY CHECKLIST

Before accepting an e-phrase, verify:
1. **GATE**: All LEGOs < current? (ABSOLUTE)
2. **Grammar**: Perfect in BOTH languages? (ABSOLUTE)
3. **Tiling**: Composes exactly from LEGOs? (ABSOLUTE)
4. **Natural**: Something people actually say? (IMPORTANT)
5. **Operative**: Contains the LEGO being taught? (ABSOLUTE)

If all YES → accept. If any ABSOLUTE fails → reject.

**Bottom line:** Generate natural phrases respecting GATE constraint. Extract fragments mechanically. Done.

---

## 📋 WORKFLOW

### STEP 1: Read Your Batch File

Read your orchestrator batch:
```
vfs/courses/{courseCode}/orchestrator_batches/phase5/orchestrator_batch_NN.json
```

This contains:
```json
{
  "orchestrator_id": 1,
  "segment_number": 1,
  "lego_ids": ["S0001L01", "S0002L01", ..., "S0200L03"],
  "total_legos": 200
}
```

### STEP 2: Read LEGO Pairs

Read the complete LEGO pairs file:
```
vfs/courses/{courseCode}/lego_pairs.json
```

Your agents need this to know available vocabulary for GATE constraint.

### STEP 3: Divide Work Into 10 Batches

Split your LEGO IDs into 10 equal batches (~20 LEGOs each):
- Agent 1: LEGOs 1-20
- Agent 2: LEGOs 21-40
- ... etc.

### STEP 4: Spawn 10 Agents in Parallel

**CRITICAL: Use Task tool to spawn all 10 agents in ONE message.**

**Agent prompt template:**
```markdown
You are Agent {N} for Phase 5 Orchestrator #{orch_id}, Segment {segment}.

Your task: Generate baskets for these LEGOs: {lego_list}

**Instructions:**
1. Read lego_pairs.json: vfs/courses/{courseCode}/lego_pairs.json
2. For each LEGO in your list, generate a basket following these rules:

## THE ABSOLUTE CONSTRAINT: GATE
**LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)**

Never use future vocabulary. If you can't make a good phrase, make a shorter phrase or leave it empty.

## THE WORKFLOW

**Generate E-Phrases:** Create 3-5 natural, conversational sentences that:
- Use ONLY vocabulary from prior LEGOs (GATE)
- Include the operative LEGO being taught
- Have perfect grammar in BOTH languages
- Are things people actually say
- Tile perfectly from LEGOs (no extra/missing words)

For LEGOs #50+: Use ~30-50% vocabulary from recent seeds (last 10 seeds)

For culminating LEGOs (last in seed): E-phrase #1 MUST be the complete seed sentence

**Extract D-Phrases (Mechanical):** From each e-phrase, extract all 2-5 LEGO windows containing the operative LEGO.

**Quality Check:**
1. GATE: All LEGOs < current? (ABSOLUTE)
2. Grammar: Perfect in BOTH languages? (ABSOLUTE)
3. Tiling: Composes exactly from LEGOs? (ABSOLUTE)
4. Natural: Something people actually say? (IMPORTANT)

**Bottom line:** Generate natural phrases respecting GATE. Extract fragments mechanically.

3. Write output to: vfs/courses/{courseCode}/segment_{segment}/orch_{orch}/agent_{agent}_baskets.json

**Output format (compact JSON, one-line per basket):**
```json
{
  "S0001L01": {
    "lego": ["Hola", "Hello"],
    "e": [
      ["Hola amigo.", "Hello friend."],
      ["Hola, cómo estás.", "Hello, how are you."]
    ],
    "d": {
      "2": [["Hola amigo", "Hello friend"]],
      "3": [["Hola, cómo estás", "Hello, how are you"]],
      "4": [],
      "5": []
    }
  },
  "S0001L02": {...}
}
```

**Critical:**
- Zero commentary in output
- Write file immediately when done
- Use extended thinking for planning

Begin now.
```

### STEP 5: Monitor Agent Completion

Poll every 30 seconds for agent output files:
```bash
ls vfs/courses/{courseCode}/segment_{segment}/orch_{orch}/agent_*_baskets.json | wc -l
```

When count reaches 10 → all agents complete.

### STEP 6: Validate Agent Outputs (Quick Check)

For each agent file, verify:
- ✓ Valid JSON?
- ✓ Contains expected LEGO IDs?
- ✓ Each basket has "lego", "e", "d" keys?
- ✓ E-phrases are arrays of [target, known] pairs?
- ✓ D-phrases have keys "2", "3", "4", "5"?
- ✓ No commentary?

If validation fails → retry that specific agent.

### STEP 7: Merge Agent Outputs

Read all 10 agent files and merge into single object:

```javascript
const merged = {};

for (let i = 1; i <= 10; i++) {
  const agentFile = `segment_{segment}/orch_{orch}/agent_{String(i).padStart(2, '0')}_baskets.json`;
  const agentData = JSON.parse(fs.readFileSync(agentFile));
  Object.assign(merged, agentData);
}

fs.writeFileSync(
  `segment_{segment}/orch_{String(orch).padStart(2, '0')}_baskets.json`,
  JSON.stringify(merged, null, 2)
);
```

### STEP 8: Report Completion

Output:
```
✅ Phase 5 Orchestrator {orch}: segment_{segment}/orch_{orch}_baskets.json written ({count} baskets)
```

**Your work is done. Master orchestrator will merge your output with other orchestrators.**

---

## 🚨 CRITICAL RULES

### Rule 1: Use Basket-Generation-Skill
**Do NOT repeat basket rules in agent prompts.** Reference the skill.

### Rule 2: Spawn All 10 Agents in Parallel
**One Task tool message with 10 invocations.** Not sequential.

### Rule 3: Progressive Saving
**Each agent writes its own file immediately.** Never lose work.

### Rule 4: Minimal Output
Keep your output concise:
- "Reading files" (1 line)
- "Spawning 10 agents" (1 line)
- Wait silently
- "Validating outputs" (1 line)
- "Merging outputs" (1 line)
- "✅ Completion" (1 line)

**Target: <10 lines total output**

---

## 📊 SUCCESS CRITERIA

- ✓ All 10 agents spawned in parallel
- ✓ All agent outputs received and validated
- ✓ Merged file written: `segment_{segment}/orch_{orch}_baskets.json`
- ✓ Format correct (lego/e/d structure)
- ✓ All expected LEGO IDs present
- ✓ No duplicate LEGO IDs
- ✓ Minimal console output (<10 lines)

---

## 📁 OUTPUT FILE STRUCTURE

**Your merged output file:**
```json
{
  "S0001L01": {
    "lego": ["Hola", "Hello"],
    "e": [
      ["Hola amigo.", "Hello friend."],
      ["Hola, cómo estás.", "Hello, how are you."]
    ],
    "d": {
      "2": [["Hola amigo", "Hello friend"]],
      "3": [["Hola, cómo estás", "Hello, how are you"]],
      "4": [],
      "5": []
    }
  },
  "S0001L02": {...},
  ... (~200 baskets total)
}
```

---

## ⏱️ TIMING ESTIMATES

**Per Agent:**
- 20 baskets × 30 seconds/basket = ~10 minutes

**Your Orchestrator:**
- 10 agents in parallel = ~10 minutes total
- Validation + merge = ~1 minute
- **Total: ~11 minutes**

---

## 🔧 ERROR HANDLING

**If agent fails (no output after 10 min):**
1. Check if partial output exists in agent file
2. Retry that specific agent only
3. Don't restart entire batch

**If validation fails:**
1. Identify specific basket with issues
2. Fix if minor (e.g., formatting)
3. If major (e.g., GATE violation) → retry agent

**If merge fails:**
1. Check all 10 agent files exist and are valid JSON
2. Re-run merge logic
3. Don't re-generate baskets

---

## Version History

**v3.0 (2025-10-30)**:
- Rewritten for segmented architecture (3 orchestrators × 10 agents)
- References basket-generation-skill (no rule repetition)
- Progressive saving at agent level
- Simplified orchestrator role (no master coordination)
- Reduced output target to <10 lines

**v2.0 (2025-10-30)**:
- Complete rewrite for actual basket spec
- Enforced e/d phrase structure

**v1.0 (2025-10-23)**:
- Initial orchestrator intelligence
