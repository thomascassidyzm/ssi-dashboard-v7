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
  "model": "sonnet",
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
- 15-20 phrases per basket (server filters to best 10)
- Grammar must be correct in both languages

### 3. Process Each LEGO

For each LEGO in your assignment:

**Fetch its scaffold:**
```bash
curl {{ORCHESTRATOR_URL}}/scaffold-v9/{{COURSE_CODE}}/S0001L01
```
The scaffold shows:
- YOUR LEGO with [brackets]
- Recent seed patterns with [NEW LEGOs] bracketed
- Available vocabulary for GATE compliance

### 4. Generate Phrases
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
2. Fetches methodology: `GET {{ORCHESTRATOR_URL}}/api/phase-intelligence/3`
3. For each LEGO: fetches scaffold `GET {{ORCHESTRATOR_URL}}/scaffold-v9/{{COURSE_CODE}}/[LEGO_ID]`
4. Generates basket (~10 phrases) and uploads: `POST {{ORCHESTRATOR_URL}}/upload-basket`

Report: "Master complete: {{WORKERS_TO_SPAWN}} workers spawned for {{LEGO_COUNT}} LEGOs"
