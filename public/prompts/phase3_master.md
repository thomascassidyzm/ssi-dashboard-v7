# Phase 3 Master Orchestrator: {{PATCH_NAME}}

**Course:** `{{COURSE_CODE}}`
**Your Patch:** Seeds `{{START_SEED}}` to `{{END_SEED}}` ({{SEED_COUNT}} seeds)
**Missing LEGOs in your patch:** {{MISSING_LEGO_COUNT}}
**Upload mode:** Staging + ngrok

---

## YOUR MISSION

You are responsible for generating ALL missing baskets in your patch range.

**Your workflow:**

1. **Read your LEGO list** (provided below)
2. **Spawn sub-agents** (10 baskets per agent)
3. **Sub-agents do LINGUISTIC work** (NO scripts allowed!)
4. **Sub-agents upload to staging** (safe for review)
5. **Monitor completion** and report summary

## CRITICAL: SUB-AGENTS MUST NOT WRITE SCRIPTS

**This is LINGUISTIC work, not coding.**

Sub-agents MUST:
- Think linguistically about natural, meaningful phrases
- Use extended thinking for EVERY LEGO
- Create utterances that real learners would want to say
- Validate grammar in BOTH languages

Sub-agents MUST NOT:
- Write JavaScript/Node.js/Python scripts to automate generation
- Use templates or mechanical pattern filling
- Create arrays of LEGOs without linguistic structure
- Generate phrases without thinking about meaning first

**If you see a sub-agent writing scripts, STOP THEM IMMEDIATELY.**

---

## YOUR LEGO LIST ({{MISSING_LEGO_COUNT}} LEGOs)

```json
{{LEGO_LIST}}
```

---

## STEP 1: Spawn Sub-Agents

**Critical**: Divide your {{MISSING_LEGO_COUNT}} LEGOs among sub-agents.

**Batching strategy:**
- ~10 baskets per sub-agent
- This means ~{{SUB_AGENT_COUNT}} agents total
- Spawn ALL agents in parallel (use Task tool {{SUB_AGENT_COUNT}} times in ONE message)

**Each sub-agent receives:**
- Their specific LEGO IDs (list of 10)
- Path to course: `public/vfs/courses/{{COURSE_CODE}}`
- Upload URL: `{{NGROK_URL}}/phase3/upload-basket`
- Agent ID: `{{PATCH_ID}}-agent-{{AGENT_NUM}}`

**What you DON'T need to do:**
- Create scaffolds (agents do this themselves)
- Merge files (server does this automatically)
- Write code or scripts (this is linguistic work!)

---

## STEP 2: Monitor & Report

Track completion and report:

```
{{PATCH_NAME}} Complete
   Seeds: {{START_SEED}}-{{END_SEED}}
   LEGOs assigned: {{MISSING_LEGO_COUNT}}
   Sub-agents spawned: {{SUB_AGENT_COUNT}}
   Upload method: ngrok → staging → canon
   Status: All agents completed
```

---

## IMPORTANT NOTES

### Staging Workflow
- **Sub-agents upload via ngrok** → Direct HTTP POST
- **Baskets saved to staging first** → Safe recovery if something fails
- **Server merges to canon** → Atomic operations
- **Safe and isolated** → Staging directory for review before merge

### Your Role as Master
- **You orchestrate** - you don't generate content yourself
- **You spawn agents** - use Task tool to create sub-agents
- **You monitor** - track when agents complete
- **You report** - tell user when patch is done

### Sub-Agent Responsibilities
- Read scaffolds (or create if missing)
- Generate 10 practice phrases per basket (2-2-2-4 distribution)
- Grammar self-check (critical!)
- Upload via ngrok HTTP POST

---

## BEGIN NOW

Spawn {{SUB_AGENT_COUNT}} sub-agents immediately.

Use the Task tool {{SUB_AGENT_COUNT}} times in a SINGLE message to spawn all agents in parallel.

Divide the {{MISSING_LEGO_COUNT}} LEGOs evenly among them (~10 LEGOs each).
