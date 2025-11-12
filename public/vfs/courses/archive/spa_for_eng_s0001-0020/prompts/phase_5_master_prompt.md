# Phase 5 Master Prompt: Practice Basket Generation with Self-Managing Parallelization

**Course**: spa_for_eng_s0001-0020
**Total Seeds**: 20 (S0001-S0020)
**Target Agents**: 1 parallel agents
**Seeds per agent**: ~20

---

## 🎯 YOUR MISSION

You are the **Practice Basket Orchestrator**. Your job is to:

1. **Spawn 1 parallel agents** to generate practice baskets for all 20 seeds
2. **Monitor rate limits and adjust pacing** if needed
3. **Handle errors gracefully** and retry failed agents
4. **Report progress** as agents complete

You have full autonomy to manage the parallelization strategy based on your rate limit observations.

---

## 📚 PHASE 5 INTELLIGENCE (Single Source of Truth)

**READ**: `docs/phase_intelligence/phase_5_lego_baskets.md` (v5.0)

This is the **ONLY authoritative source** for Phase 5 basket generation methodology.

**Key sections to review**:
- 🚨 CRITICAL: THIS IS A LINGUISTIC TASK, NOT A CODING TASK
- 🔑 UNDERSTANDING THE WHITELIST (3-Category Rule)
- 🎨 PHRASE GENERATION PROCESS (Per LEGO)
- WORD CLASS RECOGNITION (verb/noun/adjective/phrase)
- 🛡️ GATE COMPLIANCE (Zero Tolerance)
- EXTENDED THINKING PROTOCOL

**Critical principles** (from SSoT):
- NO scripts, NO templates, NO automation
- Use extended thinking for EVERY LEGO
- Understand word class before generating
- GATE compliance: Every Spanish word in whitelist
- 2-2-2-4 distribution mandatory
- Final LEGO phrase #10 = complete seed sentence

---

## 📂 PREPARED SCAFFOLDS

Mechanical prep has been done! Each agent has a scaffold ready:

`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020/phase5_scaffolds/agent_01.json` through `agent_01.json`

Each scaffold contains:
- **whitelist**: Available Spanish vocabulary (3-category rule applied)
- **seeds**: The seed pairs with LEGOs
- **legos**: Empty practice_phrases arrays (agent fills these)
- **is_final_lego**: Flag marking final LEGO in each seed

**Whitelist was built using 3-category rule:**
1. Atomic LEGOs (A-type) - complete words
2. Molecular LEGOs (M-type) - complete phrases split into words
3. Component words from M-types - literal translations

This lets learners **reconstruct and recombine** - seeing grammar without explanation!

---

## 🚀 EXECUTION STRATEGY


### Strategy: FULL PARALLELIZATION (20 seeds, 1 agents)

Spawn all 1 agents in parallel - maximize speed!

**After EACH agent completes → PUSH IMMEDIATELY:**

```bash
git add public/vfs/courses/spa_for_eng_s0001-0020/phase3_outputs/agent_XX_provisional.json
git commit -m "Phase 3: Agent XX complete (seeds S0XXX-S0YYY)"
git push origin main
```

**Critical**: Push each file immediately so automation tracks progress and can detect stuck jobs!


---

## 📋 AGENT TASK TEMPLATE

For each agent, the task is:

```markdown
You are Practice Basket Generation Agent XX.

## Your Data
**Scaffold**: Read `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020/phase5_scaffolds/agent_XX.json`

This contains:
- Seeds with empty practice_phrases arrays (you fill these)
- Whitelist (3-category rule applied)
- is_final_lego flags (phrase #10 must be seed sentence)

## Your Process
1. Read Phase 5 Ultimate Intelligence v5.0
2. For each NEW LEGO, use extended thinking:
   - STEP 1: Understand the LEGO (word class, natural usage, seed theme)
   - STEP 2: Identify grammatical role (verb/noun/adjective/phrase)
   - STEP 3: Generate 10 natural phrases (2-2-2-4 distribution)
   - STEP 4: Validate EVERY Spanish word against whitelist
   - STEP 5: If is_final_lego: true, phrase #10 = complete seed sentence
   - STEP 6: Check phrases sound natural in BOTH languages

3. Fill practice_phrases arrays following Phase 5 v5.0
4. Use extended thinking for EVERY LEGO (quality over speed!)
5. Update phrase_distribution to match actual counts

## Output
Write to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020/phase5_outputs/agent_XX_provisional.json`

Format: Same scaffold structure with practice_phrases filled:

```json
{
  "version": "curated_v7_spanish",
  "agent_id": XX,
  "seed_range": "S0XXX-S0YYY",
  "generation_stage": "PHRASES_GENERATED",
  "seeds": {
    "S0001": {
      "seed": "S0001",
      "legos": {
        "S0001L01": {
          "lego": ["I want", "quiero"],
          "practice_phrases": [
            ["I want", "quiero", null, 1],
            ["I want coffee", "quiero café", null, 2],
            ...
            ["I want to speak Spanish with you now", "quiero hablar español contigo ahora", null, 7]
          ],
          "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
          }
        }
      }
    }
  }
}
```

**Quality over speed!** Think linguistically, not mechanically.
```

---

## 🎬 EXECUTE NOW

Spawn your agents using whichever strategy you choose (full parallel, waves, or adaptive).

**Monitor and adjust** based on what you observe.

**Report progress** as agents complete.

When all 1 agents finish, instruct the user to run the validation/merge script:

```bash
node scripts/phase5_merge_baskets.cjs /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0020
```

---

## ✅ SUCCESS CRITERIA

**Per Agent:**
- All LEGOs have exactly 10 practice_phrases
- 2-2-2-4 distribution maintained
- 100% GATE compliance (all Spanish words in whitelist)
- Natural language in both English and Spanish
- Final LEGO phrase #10 = complete seed sentence
- No template patterns detected

**Overall:**
- All 20 seeds processed
- All baskets validated and formatted
- Zero GATE violations
- "Top dollar content" quality achieved

**Target time**: 20-30 minutes with adaptive parallelization

**You've got this!** Manage it however you think best given rate limits and system load.
