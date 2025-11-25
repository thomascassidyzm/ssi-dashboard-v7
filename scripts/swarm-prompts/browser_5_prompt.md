# Browser 5 Master - SPAWN EXACTLY 5 AGENTS

⚠️ YOU ARE BROWSER 5. YOU SPAWN ONLY AGENTS 5.1 THROUGH 5.5. NO OTHER AGENTS.

## Config
- Course: spa_for_eng_test
- Known: English
- Target: Spanish
- API: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

## YOUR 5 AGENTS (spawn ALL in ONE message)

**Agent 5.1**: Seeds S0061-S0063
**Agent 5.2**: Seeds S0064-S0066
**Agent 5.3**: Seeds S0067-S0069
**Agent 5.4**: Seeds S0070-S0072
**Agent 5.5**: Seeds S0073-S0075

## Sub-Agent Prompt (Use This for ALL 5)

For each agent, use `subagent_type: "general-purpose"` and this prompt (change only seed range and agent ID):

```markdown
# Phase 1+3 Sub-Agent: {AGENT_ID}

Process 3 seeds for spa_for_eng_test: S{START}-S{END}

## Get Seeds
Read: public/vfs/canonical/canonical_seeds.json
Filter seeds {START_NUM} to {END_NUM}. Replace {target} with "Spanish".

## Rules
- **A-type**: Single word EITHER side = A-type (can't split)
- **M-type**: 2+ words BOTH sides + teaches something unexpected (word order, linking word)
- **NOT M-type**: Trivial concatenation (quiero hablar = just A+A)

## For Each Seed
1. Translate to Spanish
2. Extract LEGOs (A-type or M-type with components)
3. All new: true

## Output Format
\`\`\`json
{
  "seed_id": "S00XX",
  "seed_pair": {"known": "...", "target": "..."},
  "legos": [
    {"id": "S00XXL01", "type": "A", "new": true, "lego": {"known": "...", "target": "..."}},
    {"id": "S00XXL02", "type": "M", "new": true, "lego": {"known": "...", "target": "..."},
     "components": [{"known": "...", "target": "..."}], "teaches": "..."}
  ]
}
\`\`\`

## POST EACH SEED (for real-time progress)
After processing EACH seed, POST it immediately:

\`\`\`bash
curl -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-seed \\
  -H "Content-Type: application/json" \\
  -d '{
    "course": "spa_for_eng_test",
    "agentId": "{AGENT_ID}",
    "seed": { /* single seed object */ }
  }'
\`\`\`

POST after EACH seed (3 total POSTs). This enables real-time dashboard progress.
Report after each: "Agent {AGENT_ID}: Posted S00XX (1/3)" etc.
```

## EXECUTE NOW - EXACTLY 5 TASK CALLS

Use ONE message with EXACTLY 5 Task tool invocations:

1. Task for Agent 5.1: S0061-S0063
2. Task for Agent 5.2: S0064-S0066
3. Task for Agent 5.3: S0067-S0069
4. Task for Agent 5.4: S0070-S0072
5. Task for Agent 5.5: S0073-S0075

⚠️ DO NOT spawn agents for other browsers. You are Browser 5 ONLY.

**GO!**
