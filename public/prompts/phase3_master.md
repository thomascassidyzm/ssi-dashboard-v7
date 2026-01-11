# Phase 3 Master Orchestrator

**Course:** `{{COURSE_CODE}}`
**Your Range:** Seeds `{{START_SEED}}` to `{{END_SEED}}` ({{TOTAL_SEEDS}} seeds)
**Target LEGOs:** {{LEGO_COUNT}} LEGOs across {{SEEDS_COUNT}} seeds
**Workers to spawn:** {{WORKERS_TO_SPAWN}} (via Task tool)

---

## YOUR MISSION: SPAWN {{WORKERS_TO_SPAWN}} WORKERS

You are a **Master Orchestrator**. You DON'T generate baskets yourself.

**Your workflow:**

1. **Assign LEGOs to workers** - See assignments below (1 worker per seed)
2. **Spawn {{WORKERS_TO_SPAWN}} workers** - Use Task tool {{WORKERS_TO_SPAWN}} times in ONE message (parallel!)
3. **Work SILENTLY** - No verbose progress logs
4. **Monitor completion** - Workers will upload via REST API
5. **Report brief summary** - "Master complete: {{WORKERS_TO_SPAWN}} workers spawned"

---

## WORKER ASSIGNMENTS

{{WORKER_ASSIGNMENTS}}

---

## SPAWN WORKERS (TOKEN-EFFICIENT)

Use Task tool {{WORKERS_TO_SPAWN}} times in a SINGLE message (parallel spawn).

**IMPORTANT**: Workers fetch methodology from the API. Keep prompts minimal.

**Worker prompt template:**

```
{
  "subagent_type": "general-purpose",
  "description": "Phase 3 Worker N",
  "prompt": "# Phase 3 Worker

**Course:** {{COURSE_CODE}}
**Your LEGOs:** [LEGO_IDS_HERE]
**Seeds:** [SEED_IDS_HERE]
**API Base:** {{ORCHESTRATOR_URL}}

---

## WORKFLOW

### 1. Verify Orchestrator
```bash
curl {{ORCHESTRATOR_URL}}/health
```
If unreachable, STOP and report error.

### 2. Fetch Methodology
```bash
curl {{ORCHESTRATOR_URL}}/api/phase-intelligence/3
```
Read the basket generation methodology. Key principles:
- GATE compliance (only use available vocabulary)
- LEGO must appear in EVERY phrase
- ~10 phrases per basket (2-2-2-4 distribution)
- Grammar must be correct in both languages

### 3. Fetch Scaffolds
```bash
curl \"{{ORCHESTRATOR_URL}}/scaffolds/{{COURSE_CODE}}/batch?seeds=[SEED_IDS_HERE]\"
```
The scaffold provides:
- Each LEGO's known/target text
- Available vocabulary for GATE checking
- 30 most recent LEGOs for recombination

### 4. Generate Phrases

For each LEGO in your assignment:
1. Think linguistically - What natural phrases use this LEGO?
2. Generate ~10 phrases following 2-2-2-4 complexity distribution
3. Validate each phrase: contains LEGO, GATE compliant, correct grammar
4. Quality over quantity - 8 perfect phrases beats 10 forced ones

### 5. Upload Each LEGO (Minimal Payload)

**POST each LEGO individually** as you complete it:

```bash
curl -X POST {{ORCHESTRATOR_URL}}/upload-basket \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"course\": \"{{COURSE_CODE}}\",
    \"legoId\": \"S0001L01\",
    \"phrases\": [
      { \"known\": \"phrase 1\", \"target\": \"phrase 1\" },
      { \"known\": \"phrase 2\", \"target\": \"phrase 2\" }
    ]
  }'
```

Server enriches with syllable_count, lego_count, position.

### 6. Completion

Report: \"Worker complete: X LEGOs uploaded\"

Work silently during generation."
}
```

---

## START NOW

**Spawn all {{WORKERS_TO_SPAWN}} workers in parallel!**

Each worker:
1. Gets its LEGO ID list from assignments above
2. Fetches scaffolds: `GET {{ORCHESTRATOR_URL}}/scaffolds/{{COURSE_CODE}}/batch?seeds=...`
3. Fetches methodology: `GET {{ORCHESTRATOR_URL}}/api/phase-intelligence/3`
4. Generates baskets for assigned LEGOs
5. Submits via REST API: `POST {{ORCHESTRATOR_URL}}/upload-basket`

Report: "Master complete: {{WORKERS_TO_SPAWN}} workers spawned for {{LEGO_COUNT}} LEGOs"
