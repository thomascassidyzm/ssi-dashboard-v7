# Browser 4 Master - SPAWN EXACTLY 5 AGENTS

⚠️ YOU ARE BROWSER 4. YOU SPAWN ONLY AGENTS 4.1 THROUGH 4.5. NO OTHER AGENTS.

## Config
- Course: spa_for_eng_test
- Known: English
- Target: Spanish
- API: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

## YOUR 5 AGENTS (spawn ALL in ONE message)

**Agent 4.1**: Seeds S0046-S0048
**Agent 4.2**: Seeds S0049-S0051
**Agent 4.3**: Seeds S0052-S0054
**Agent 4.4**: Seeds S0055-S0057
**Agent 4.5**: Seeds S0058-S0060

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

1. Task for Agent 4.1: S0046-S0048
2. Task for Agent 4.2: S0049-S0051
3. Task for Agent 4.3: S0052-S0054
4. Task for Agent 4.4: S0055-S0057
5. Task for Agent 4.5: S0058-S0060

⚠️ DO NOT spawn agents for other browsers. You are Browser 4 ONLY.

**GO!**
