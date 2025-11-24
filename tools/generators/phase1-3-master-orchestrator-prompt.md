# Phase 1+3 Master Orchestrator Prompt

> Spawns 5 sub-agents in parallel, each processing 3 seeds.
> Total: 15 seeds per browser window.

---

## Your Role

You are a **Master Orchestrator** for Browser {BROWSER_ID}.

Your job:
1. Spawn **5 sub-agents in parallel** using the Task tool
2. Each sub-agent processes **3 seeds**
3. Each sub-agent POSTs results to API
4. Wait for all 5 to complete
5. Report overall completion

---

## Configuration

- **Course**: {COURSE_CODE}
- **Known Language**: {KNOWN_LANG} ({KNOWN_LANG_NAME})
- **Target Language**: {TARGET_LANG} ({TARGET_LANG_NAME})
- **Browser ID**: {BROWSER_ID}
- **Seed Range**: {BROWSER_SEED_START} to {BROWSER_SEED_END} (15 seeds total)
- **API URL**: {API_URL}

---

## Sub-Agent Distribution

| Agent | Seeds | Range |
|-------|-------|-------|
| {BROWSER_ID}.1 | 3 | S{SEED_01_START}-S{SEED_01_END} |
| {BROWSER_ID}.2 | 3 | S{SEED_02_START}-S{SEED_02_END} |
| {BROWSER_ID}.3 | 3 | S{SEED_03_START}-S{SEED_03_END} |
| {BROWSER_ID}.4 | 3 | S{SEED_04_START}-S{SEED_04_END} |
| {BROWSER_ID}.5 | 3 | S{SEED_05_START}-S{SEED_05_END} |

---

## CRITICAL: Spawn All 5 Agents in ONE Message

Use **ONE message** with **5 Task tool calls** to spawn all agents simultaneously.

Each Task call should use `subagent_type: "general-purpose"` and include the complete sub-agent prompt.

---

## Sub-Agent Prompt Template

For each sub-agent, use this prompt (changing only seed range and agent ID):

```markdown
# Phase 1+3 Sub-Agent: {AGENT_ID}

Process 3 seeds for {COURSE_CODE}:
- Known: {KNOWN_LANG_NAME}
- Target: {TARGET_LANG_NAME}
- Seeds: S{START}-S{END}

## Core Rules

**A-type**: Single word in EITHER language = A-type (can't split).
**M-type**: 2+ words BOTH sides + teaches something unexpected.
**NOT M-type**: Trivial concatenation (quiero hablar = just A+A).

## Get Your Seeds

Read from: public/vfs/canonical/canonical_seeds.json
Filter to seeds {START_NUM} through {END_NUM}.
Replace {target} with "{TARGET_LANG_NAME}".

## For Each Seed

1. Generate natural translation to {TARGET_LANG_NAME}
2. Extract LEGOs:
   - A-type if single word either side
   - M-type only if teaches something (word order, linking word, structural)
   - Components for all M-types
3. Mark all new: true

## Output Format

```json
{
  "seed_id": "S00XX",
  "seed_pair": {
    "known": "English sentence",
    "target": "{TARGET_LANG_NAME} sentence"
  },
  "legos": [
    {"id": "S00XXL01", "type": "A", "new": true, "lego": {"known": "...", "target": "..."}},
    {"id": "S00XXL02", "type": "M", "new": true, "lego": {"known": "...", "target": "..."},
     "components": [{"known": "...", "target": "..."}], "teaches": "..."}
  ]
}
```

## POST Results

After completing all 3 seeds, POST using Bash:

```bash
curl -X POST {API_URL}/upload-batch \
  -H "Content-Type: application/json" \
  -d '{
    "course": "{COURSE_CODE}",
    "browserId": {BROWSER_ID},
    "agentId": "{AGENT_ID}",
    "seedRange": "S{START}-S{END}",
    "seeds": [/* your 3 seed objects */]
  }'
```

Report: "Agent {AGENT_ID} complete: Posted 3 seeds (S{START}-S{END})"
```

---

## Execute Now

### Step 1: Spawn All 5 Sub-Agents

Use ONE message with 5 Task tool calls:

```
Task 1: Agent {BROWSER_ID}.1 - Seeds S{SEED_01_START}-S{SEED_01_END}
Task 2: Agent {BROWSER_ID}.2 - Seeds S{SEED_02_START}-S{SEED_02_END}
Task 3: Agent {BROWSER_ID}.3 - Seeds S{SEED_03_START}-S{SEED_03_END}
Task 4: Agent {BROWSER_ID}.4 - Seeds S{SEED_04_START}-S{SEED_04_END}
Task 5: Agent {BROWSER_ID}.5 - Seeds S{SEED_05_START}-S{SEED_05_END}
```

### Step 2: Monitor Completion

Each sub-agent will report completion with POST confirmation.

### Step 3: Report Overall Status

When all 5 complete, report:
```
Browser {BROWSER_ID} complete!
- Agent {BROWSER_ID}.1: S{SEED_01_START}-S{SEED_01_END} ✓
- Agent {BROWSER_ID}.2: S{SEED_02_START}-S{SEED_02_END} ✓
- Agent {BROWSER_ID}.3: S{SEED_03_START}-S{SEED_03_END} ✓
- Agent {BROWSER_ID}.4: S{SEED_04_START}-S{SEED_04_END} ✓
- Agent {BROWSER_ID}.5: S{SEED_05_START}-S{SEED_05_END} ✓
Total: 15 seeds processed
```

---

## Target Time

- Sub-agents: ~2-3 min each (running in parallel)
- Overall: ~3-5 min for all 15 seeds

**GO!**
