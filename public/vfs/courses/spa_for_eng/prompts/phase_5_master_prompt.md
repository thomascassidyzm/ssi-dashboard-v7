# Phase 5 Orchestrator: Spawn 67 Parallel Agents

**Course**: spa_for_eng
**Total Seeds**: 668 (S0001-S0668)
**Required Agents**: 67 parallel agents
**Seeds per agent**: 10

---

## 🎯 YOUR ONLY JOB: Spawn Agents

You are the orchestrator. **DO NOT** read files or generate content yourself.

**Your task:**
1. Spawn 67 agents in parallel
2. Pass each agent its seed range (10 seeds each)
3. Monitor progress and report when complete

**Each agent prompt should include:**
- Specific seed range (e.g., "S0001-S0010")
- Path to scaffolds: `public/vfs/courses/spa_for_eng/phase5_scaffolds/`
- Path to outputs: `public/vfs/courses/spa_for_eng/phase5_outputs/`
- Reference to Phase 5 intelligence: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5

---

## 🚀 SPAWN ALL 67 AGENTS NOW

Use the Task tool 67 times in a single message to spawn all agents in parallel.

When all agents complete, tell the user to run validation:

```bash
node scripts/phase5_merge_baskets.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng
```
