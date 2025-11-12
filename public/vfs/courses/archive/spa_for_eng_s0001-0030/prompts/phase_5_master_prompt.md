# Phase 5 Master Prompt - Basket Generation

**Course**: spa_for_eng_s0001-0030 (30 seeds)
**Task**: Generate practice phrase baskets for 116 new LEGOs
**Agents**: 5 (running in parallel)

---

## 🎯 YOUR MISSION

You are the **Phase 5 Master Orchestrator**. Your job is to spawn 5 specialized agents in parallel to generate practice phrase baskets.

**IMPORTANT**: Spawn ALL 5 agents in a SINGLE message using multiple Task tool calls.

---

## 📋 AGENT ASSIGNMENTS

**Agent 1**: Seeds S0001-S0006 (21 LEGOs, 210 phrases)
**Agent 2**: Seeds S0007-S0012 (19 LEGOs, 190 phrases)
**Agent 3**: Seeds S0013-S0018 (18 LEGOs, 180 phrases)
**Agent 4**: Seeds S0019-S0024 (27 LEGOs, 270 phrases)
**Agent 5**: Seeds S0025-S0030 (31 LEGOs, 310 phrases)

---

## 🚀 SPAWNING INSTRUCTIONS

Use the Task tool 5 times in a SINGLE message to spawn all agents in parallel.

For each agent, use this prompt template:

```
You are Phase 5 Basket Generation Agent {N}.

## Your Task

Generate practice phrase baskets for Spanish LEGOs using Phase 5 Ultimate Intelligence v5.0.

## Instructions

1. **Read the intelligence doc**:
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence/phase_5_lego_baskets.md`

2. **Read your scaffold**:
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase5_scaffolds/agent_{NN}.json`

3. **Follow the methodology EXACTLY**:
   - Use extended thinking for EVERY LEGO
   - Understand word class before generating phrases
   - Generate 10 phrases per LEGO (2 short, 2 quite short, 2 longer, 4 long)
   - Use whitelist vocabulary only
   - NO template-based generation
   - NO automated loops/scripts

4. **Write output**:
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase5_outputs/agent_{NN}_provisional.json`

## Quality Requirements

- [ ] Extended thinking used for every LEGO
- [ ] Correct word class understanding
- [ ] Natural, conversational Spanish
- [ ] Whitelist compliance
- [ ] Distribution: 2+2+2+4 per LEGO
- [ ] No template patterns

**Take your time. Quality over speed.**
```

Replace `{N}` with agent number (1-5) and `{NN}` with zero-padded number (01-05).

---

## ✅ SUCCESS CRITERIA

After all 5 agents complete:
- 5 provisional JSON files in `phase5_outputs/`
- 1,160 total practice phrases generated
- All LEGOs have 10 phrases each
- No template-based phrases detected
- All phrases use whitelist vocabulary only

---

## 📊 MONITORING

Watch for agents completing. When all 5 are done, report:
- Total phrases generated
- Any issues encountered
- Ready for Phase 5 merge validation

**GO!**
