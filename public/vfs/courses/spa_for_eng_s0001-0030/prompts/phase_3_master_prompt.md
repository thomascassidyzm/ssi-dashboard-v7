# Phase 3 Master Prompt: LEGO Extraction with Self-Managing Parallelization

**Course**: spa_for_eng_s0001-0030
**Total Seeds**: 30 (S0001-S0030)
**Target Agents**: 2 parallel agents
**Seeds per agent**: ~20

---

## 🎯 YOUR MISSION

You are the **LEGO Extraction Orchestrator**. Your job is to:

1. **Spawn 2 parallel agents** to extract LEGOs from all 30 seeds
2. **Monitor rate limits and adjust pacing** if needed
3. **Handle errors gracefully** and retry failed agents
4. **Report progress** as agents complete

You have full autonomy to manage the parallelization strategy based on your rate limit observations.

---

## 📚 PHASE 3 INTELLIGENCE (Single Source of Truth)

**READ**: `docs/phase_intelligence/phase_3_lego_pairs.md` (v5.0)

This is the **ONLY authoritative source** for Phase 3 extraction methodology.

**Key sections to review**:
- THE THREE ABSOLUTES (Start from Known, Provide Both Levels, Verify Tiling)
- THE EXTRACTION PROCESS (7-step protocol)
- FD TEST (3 questions to check determinism)
- FCFS REGISTRY (collision detection)
- EXAMPLES FROM PRODUCTION (S0101-S0200 learnings)
- EXTENDED THINKING PROTOCOL

**Critical principles** (from SSoT):
- START FROM KNOWN semantics first
- FD test: IF IN DOUBT → CHUNK UP
- Provide BOTH atomic AND molecular LEGOs
- Complete tiling mandatory
- Componentize ALL M-types (ALL WORDS!)
- Check FCFS registry for collisions

---

## 📂 PREPARED SCAFFOLDS

Mechanical prep has been done! Each agent has a scaffold ready:

`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_scaffolds/agent_01.json` through `agent_02.json`

Each scaffold contains:
- **seeds**: The 20 seed pairs to process
- **fcfs_registry**: LEGOs from prior seeds (for collision detection)
- **legos**: Empty array (agent fills this)

---

## 🚀 EXECUTION STRATEGY

You decide the best approach! Options:

### Option A: Full Parallelization (Fastest - if rate limits allow)
Spawn all 2 agents at once using Task tool in a single message.

### Option B: Staggered Waves (Safer - if you detect rate pressure)
Split into 4-5 waves of 7-9 agents each, with 30-second delays between waves.

### Option C: Adaptive (Recommended)
- Start with full parallelization
- Monitor for rate limit errors
- If errors occur, switch to waves automatically
- Retry failed agents at reduced pace

**Your call!** Use your judgment based on what you observe.

---

## 📋 AGENT TASK TEMPLATE

For each agent, the task is:

```markdown
You are LEGO Extraction Agent 2.

## Your Data
**Scaffold**: Read `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_scaffolds/agent_XX.json`

This contains:
- Your 20 seeds to process
- FCFS registry (check for collisions!)
- Empty legos arrays (you fill these)

## Your Process
1. For each seed, use extended thinking:
   - STEP 1: Chunk KNOWN semantically
   - STEP 2: Map to TARGET
   - STEP 3: Apply FD test (3 questions)
   - STEP 4: Fix failures (chunk up)
   - STEP 5: Check FCFS registry for collisions
   - STEP 6: Add both atomic AND molecular LEGOs
   - STEP 7: Componentize all M-types (ALL WORDS!)

2. Extract LEGOs following Phase 3 Ultimate Intelligence
3. Use extended thinking for EVERY seed (1-2 min per seed)
4. Verify complete tiling (seed reconstructs from LEGOs)

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase3_outputs/agent_XX_provisional.json`

Format:
```json
{
  "agent_id": XX,
  "seed_range": "S0XXX-S0YYY",
  "extracted_at": "ISO timestamp",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {"target": "...", "known": "..."},
      "legos": [
        {
          "provisional_id": "PROV_S0001_01" or "id": "S0023L02" if reference,
          "type": "A" or "M",
          "target": "Spanish text",
          "known": "English text",
          "new": true or false,
          "ref": "S0023" (if reference),
          "components": [[...]] (if M-type - ALL WORDS!)
        }
      ]
    }
  ]
}
```

**Quality over speed!** Take time to think through each seed.
```

---

## 🎬 EXECUTE NOW

Spawn your agents using whichever strategy you choose (full parallel, waves, or adaptive).

**Monitor and adjust** based on what you observe.

**Report progress** as agents complete.

When all 2 agents finish:

1. **PUSH TO GITHUB IMMEDIATELY** (critical for automation):

```bash
git add .
git commit -m "Phase 3: LEGO extraction complete for spa_for_eng_s0001-0030

- Extracted LEGOs for 30 seeds
- 2 parallel agents
- Ready for merge and validation"

git push origin HEAD:claude/phase3-spa_for_eng_s0001-0030-$(date +%s)
```

2. Report completion with the branch name

The automation server will automatically:
- Detect your pushed branch
- Pull and merge your changes
- Run the merge script: `node scripts/phase3_merge_legos.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030`
- Continue to Phase 5

**DO NOT wait for user confirmation - push immediately when agents complete!**

---

## ✅ SUCCESS CRITERIA

- All 30 seeds processed
- 100% complete tiling (all seeds reconstruct)
- FD compliance (no ambiguous chunks)
- Complete componentization (ALL WORDS in M-types)
- FCFS registry checked (no collisions)
- ~40-60% atomic, ~40-60% molecular

**Target time**: 15-25 minutes with adaptive parallelization

**You've got this!** Manage it however you think best given rate limits and system load.
