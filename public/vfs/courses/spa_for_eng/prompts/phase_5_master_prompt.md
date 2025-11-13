# Phase 5 Master Prompt: Practice Basket Generation with Three-Tier Overlap Detection

**Course**: spa_for_eng
**Total Seeds**: 10 (S0441-S0450)
**Target Agents**: 5 parallel agents
**Seeds per agent**: 2

---

## 🎯 YOUR MISSION

You are the **Practice Basket Orchestrator**. Your job is to:

1. **Spawn 5 parallel agents** to generate practice baskets for 10 seeds (S0441-S0450)
2. **Monitor rate limits and adjust pacing** if needed
3. **Handle errors gracefully** and retry failed agents
4. **Report progress** as agents complete

You have full autonomy to manage the parallelization strategy based on your rate limit observations.

---

## 📚 PHASE 5 INTELLIGENCE v6.2 (Single Source of Truth)

**READ**: `docs/phase_intelligence/phase_5_lego_baskets.md` (v6.2)

This is the **ONLY authoritative source** for Phase 5 basket generation methodology.

**NEW IN v6.2: Three-Tier Overlap Detection**

The scaffolds now automatically detect word overlap between LEGOs in the same seed and adjust phrase requirements:

- **`overlap_level: "none"`** → Fresh LEGO → **10 phrases** (full scaffolding)
- **`overlap_level: "partial"`** → Some word overlap → **7 phrases** (reduced buildup)
- **`overlap_level: "complete"`** → All words seen → **5 phrases** (skip simple practice)

**Key sections to review**:
- 🎚️ THREE-TIER OVERLAP DETECTION (NEW IN v6.2)
- 🔑 KEY PRINCIPLE: MEANINGFUL UTTERANCES FIRST
- 🎨 VOCABULARY SOURCES (WITH ENFORCEMENT)
- ⚠️ LEGO COVERAGE ENFORCEMENT RULE (60% minimum)
- 📐 PHRASE GENERATION PROCESS
- 🎯 PHRASE REQUIREMENTS

**Critical principles**:
- Start with meaningful English thoughts, then express in Spanish
- Use patterns as INSPIRATION (not rigid templates)
- Every Spanish word must be available (recent seeds + current seed LEGOs + current LEGO)
- Respect `target_phrase_count` (5-10 depending on overlap)
- Follow `phrase_distribution` buckets (LEGO count, not word count)
- Final LEGO last phrase = complete seed sentence

---

## 📂 PREPARED SCAFFOLDS

Mechanical prep has been done! Each seed has its own scaffold:

`public/vfs/courses/spa_for_eng/phase5_scaffolds/seed_s0441.json` through `seed_s0450.json`

Each scaffold contains:
- **seed_pair**: The seed sentence (target and known)
- **recent_context**: Last 5 seeds before this one (tiled with pipes separating LEGOs)
- **legos**: Each LEGO with metadata:
  - `lego`: [known, target]
  - `type`: "A" (atomic) or "M" (molecular)
  - `available_legos`: Count of LEGOs available before this one
  - `is_final_lego`: true/false
  - **`overlap_level`**: "none", "partial", or "complete" ← NEW
  - **`target_phrase_count`**: 10, 7, or 5 ← NEW
  - `practice_phrases`: [] ← **YOU FILL THIS**
  - **`phrase_distribution`**: Buckets adjusted for overlap ← NEW
  - `_metadata`: whitelist_pairs (available Spanish vocab)

**Whitelist was built using 3-category rule:**
1. Atomic LEGOs (A-type) - complete LEGO pair
2. Molecular LEGOs (M-type) - complete LEGO pair
3. Component pairs from M-types (literal translations)

This lets learners **reconstruct and recombine** - seeing grammar without explanation!

---

## 🚀 EXECUTION STRATEGY

### Strategy: FULL PARALLELIZATION (10 seeds, 5 agents)

**Agent assignments:**
- Agent 1: S0441, S0442
- Agent 2: S0443, S0444
- Agent 3: S0445, S0446
- Agent 4: S0447, S0448
- Agent 5: S0449, S0450

Spawn all 5 agents in parallel - maximize speed!

**After EACH agent completes → PUSH IMMEDIATELY:**

```bash
git add public/vfs/courses/spa_for_eng/phase5_outputs/seed_s04XX.json
git commit -m "Phase 5: Seeds S04XX-S04YY complete (Agent X)"
git push origin main
```

**Critical**: Push each file immediately so automation tracks progress and can detect stuck jobs!

---

## 📋 AGENT TASK TEMPLATE

For each agent, the task is:

```markdown
You are Practice Basket Generation Agent X.

## Your Seeds

Generate baskets for these seed scaffolds:
- `public/vfs/courses/spa_for_eng/phase5_scaffolds/seed_s04XX.json`
- `public/vfs/courses/spa_for_eng/phase5_scaffolds/seed_s04YY.json`

Each scaffold contains:
- Seeds with empty practice_phrases arrays (you fill these)
- `_metadata.whitelist_pairs`: Available Spanish vocabulary (3-category rule applied)
- `is_final_lego`: true for final LEGO (last phrase must be complete seed sentence)
- **`overlap_level`**: "none", "partial", or "complete" (NEW in v6.2)
- **`target_phrase_count`**: 5, 7, or 10 phrases (NEW in v6.2)
- **`phrase_distribution`**: Adjusted buckets based on overlap (NEW in v6.2)

## Your Process

1. **Read Phase 5 Ultimate Intelligence v6.2**: `docs/phase_intelligence/phase_5_lego_baskets.md`
   - Focus on: THREE-TIER OVERLAP DETECTION section
   - Understand: Overlap levels determine phrase count and distribution

2. **For each LEGO**, follow the linguistic reasoning approach:

   **STEP 1: Extract available vocabulary**
   - From `_metadata.whitelist_pairs`: All Spanish words available
   - Plus current LEGO being taught

   **STEP 2: Think of meaningful English utterances**
   - What would a learner want to say using this LEGO?
   - What relates to the seed theme?
   - Start with communicative intent

   **STEP 3: Express in Spanish using available vocabulary**
   - Translate your English thoughts to Spanish
   - Use patterns from `recent_context` as INSPIRATION (not templates)
   - Be creative and natural

   **STEP 4: Validate ALL words**
   - Split Spanish phrase on spaces
   - Check every word exists in whitelist_pairs
   - If any word unavailable → try different English thought

   **STEP 5: Respect overlap-adjusted requirements**
   - `overlap_level: "none"` → Generate 10 phrases (full distribution)
   - `overlap_level: "partial"` → Generate 7 phrases (reduced buildup)
   - `overlap_level: "complete"` → Generate 5 phrases (longer only)
   - Follow the `phrase_distribution` buckets provided

   **STEP 6: Special handling for final LEGO**
   - If `is_final_lego: true`, last phrase MUST be complete seed sentence
   - Example: ["I'm not sure if I can remember the whole sentence.", "No estoy seguro si puedo recordar toda la oración.", null, 8]

3. **Fill practice_phrases arrays** following Phase 5 v6.2
4. **Think linguistically, not mechanically** (quality over speed!)
5. Update `generation_stage` to "PHRASE_GENERATION_COMPLETE"

## Output Format

Write to: `public/vfs/courses/spa_for_eng/phase5_outputs/seed_s04XX.json`

Format: Same scaffold structure with practice_phrases filled:

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0441",
  "generation_stage": "PHRASE_GENERATION_COMPLETE",
  "seed_pair": {...},
  "recent_context": {...},
  "legos": {
    "S0441L01": {
      "lego": ["I want", "quiero"],
      "type": "A",
      "overlap_level": "none",
      "target_phrase_count": 10,
      "practice_phrases": [
        ["I want", "quiero", null, 1],
        ["I want coffee", "quiero café", null, 2],
        ["I want to speak", "quiero hablar", null, 3],
        ["I want to speak Spanish", "quiero hablar español", null, 4],
        ["I want to speak Spanish with you", "quiero hablar español contigo", null, 5],
        ...
      ],
      "phrase_distribution": {
        "short_1_to_2_legos": 2,
        "medium_3_legos": 2,
        "longer_4_legos": 2,
        "longest_5_legos": 4
      }
    },
    "S0441L02": {
      "lego": ["to speak", "hablar"],
      "type": "A",
      "overlap_level": "complete",
      "target_phrase_count": 5,
      "practice_phrases": [
        ["I want to speak Spanish", "quiero hablar español", null, 3],
        ["I can speak Spanish now", "puedo hablar español ahora", null, 4],
        ...
      ],
      "phrase_distribution": {
        "longer_3_to_5_legos": 5
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

When all 5 agents finish, report completion to user.

---

## ✅ SUCCESS CRITERIA

**Per LEGO:**
- Respect `target_phrase_count` (5, 7, or 10 depending on overlap)
- Follow `phrase_distribution` buckets (LEGO count, not word count)
- 100% GATE compliance (all Spanish words in whitelist)
- Natural language in both English and Spanish
- Final LEGO last phrase = complete seed sentence
- No template patterns detected

**Per Seed:**
- All LEGOs have practice_phrases filled
- `generation_stage` updated to "PHRASE_GENERATION_COMPLETE"
- Linguistic quality maintained across all LEGOs

**Overall:**
- All 10 seeds processed (S0441-S0450)
- All baskets formatted correctly
- Zero GATE violations
- "Top dollar content" quality achieved

**Target time**: 15-20 minutes with adaptive parallelization

**You've got this!** Manage it however you think best given rate limits and system load.
