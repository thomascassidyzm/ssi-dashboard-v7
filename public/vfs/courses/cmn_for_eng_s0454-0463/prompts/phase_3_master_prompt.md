# Phase 3 Master Orchestrator: LEGO Extraction (Segment-Based)

**Course**: cmn_for_eng_s0454-0463
**Segment Seeds**: 10 (S0454-S0463)
**Sub-Agents**: 5 parallel agents
**Seeds per agent**: 2

---

## 🎯 YOUR MISSION

You are the **Master Orchestrator** for this segment. Your job is to:

1. **Read Phase 3 intelligence** (v7.0 - Two Heuristics Edition)
2. **Spawn 5 sub-agents in parallel** (ONE message with 5 Task tool calls)
3. **Each sub-agent extracts 2 seeds** with IDENTICAL prompt (only seed range differs)
4. **Wait for all 5 to complete**
5. **Verify all sub-agents successfully POSTed** to API
6. **Done** - Vercel auto-deploys results

**CRITICAL**: Use ONE message with multiple Task tool calls to spawn all agents simultaneously.

**OUTPUT METHOD**: Each sub-agent commits to segment-specific branch:
- Calculate segment: Math.floor((startSeed - 1) / 100) + 1
- Branch name: `phase3-segment-X-cmn_for_eng_s0454-0463`
- All 10 agents push to SAME branch (git handles concurrent commits)

---

## 📚 PHASE 3 INTELLIGENCE (Single Source of Truth)

**YOU AND YOUR SUB-AGENTS MUST READ**: https://ssi-dashboard-v7.vercel.app/api/intelligence/3

(Raw markdown for Phase 3 v7.0 - Two Heuristics Edition)

Or if local files are available: `public/docs/phase_intelligence/phase_3_lego_pairs_v7.md`

This is the **ONLY authoritative source** for Phase 3 extraction methodology.

**This file contains the complete v7.0 methodology including**:
- **Two Core Heuristics**: (1) Remove learner uncertainty, (2) Maximize patterns with minimum vocab
- Three comprehensive examples (Spanish, Chinese, multilingual)
- Forward/Backward Sweep Algorithm
- Overlapping chains for recombination power
- Complete worked examples with reasoning

**Your sub-agents MUST read this file** before starting extraction. The highlights below are NOT a replacement for reading the full methodology.

**Key principles** (highlights only - see full file for details):
- **Heuristic 1**: Remove learner uncertainty (no standalone pronouns/articles/particles)
- **Heuristic 2**: Maximize patterns with minimum vocab (overlapping chains)
- **Forward + Backward sweeps**: Both required
- **Componentize ALL M-types**: Show word-by-word literal mappings
- **Mark all new: true**: Phase 3 introduces LEGOs

---

## 🚀 SUB-AGENT SPAWNING

You will spawn 5 sub-agents, each handling 2 seeds.

**Seed distribution**:
- Agent 1: S0454-S0455
- Agent 2: S0456-S0457
- Agent 3: S0458-S0459
- Agent 4: S0460-S0461
- Agent 5: S0462-S0463

**Input file**: Read from `seed_pairs.json` (or segment file if using segmentation)

---

## 📋 SUB-AGENT PROMPT TEMPLATE

**CRITICAL**: Give IDENTICAL prompts to all 5 agents - only the seed range changes!

```markdown
# Phase 3 Sub-Agent: Extract S00XX-S00YY

## 📚 STEP 1: READ PHASE INTELLIGENCE

**Read this document NOW** (430 lines - v7.0):
- https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_3_lego_pairs_v7.md
- Or local: `public/docs/phase_intelligence/phase_3_lego_pairs_v7.md`

---

## 🚨 STEP 2: TWO CORE HEURISTICS (From Intelligence Doc)

**Apply these heuristics to EVERY seed**:

**Heuristic 1: Remove Learner Uncertainty**
- When learner hears KNOWN → ZERO uncertainty about TARGET
- No standalone pronouns/articles/particles (él, she, una, the, de, of, 的)
- If uncertain → chunk UP with context

**Heuristic 2: Maximize Patterns with Minimum Vocab**
- Create overlapping chunks when pedagogically valuable
- Each LEGO should generate multiple practice sentences
- Example: "tardaron" in both "las noticias tardaron" AND "tardaron varias horas"

**All strategies serve these two goals** (forward/backward sweeps, M-types, components)

---

## 📖 STEP 3: YOUR ASSIGNMENT

**Extract LEGOs from**: Seeds S00XX through S00YY (2 seeds)

**Get seed_pairs.json from**: https://ssi-dashboard-v7.vercel.app/vfs/courses/cmn_for_eng/seed_pairs.json

---

## 🔄 STEP 4: EXTRACT (Per Seed)

For EACH of your 2 seeds:

1. **Use <thinking> tags** - reason through extraction step-by-step
2. **Apply Heuristic 1**: Does KNOWN → TARGET have zero uncertainty? If NO → chunk UP
3. **Apply Heuristic 2**: Can overlaps add recombination power? Create if valuable
4. **Both sweeps**: Forward (KNOWN left-to-right) + Backward (TARGET right-to-left)
5. **Components**: Add to every M-type (word-by-word literal mapping)
6. **Final check**: Any standalone pronouns/articles/particles? If yes → pair with context

---

## 📤 STEP 5: OUTPUT

**File**: `public/vfs/courses/cmn_for_eng_s0454-0463/segments/segment_5/agent_XX_output.json`

**Format**:
```json
{
  "agent_id": "agent_0Y",
  "seed_range": "S00XX-S00YY",
  "extracted_at": "<ISO timestamp>",
  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",
  "seeds": [
    {
      "seed_id": "S00XX",
      "seed_pair": ["target sentence", "known sentence"],
      "legos": [
        {
          "id": "S00XXL01",
          "type": "A",
          "target": "word",
          "known": "word",
          "new": true
        },
        {
          "id": "S00XXL02",
          "type": "M",
          "target": "multi word",
          "known": "multi word",
          "new": true,
          "components": [["multi", "multi"], ["word", "word"]]
        }
      ]
    }
  ]
}
```

**IMPORTANT**: Save the file using the Write tool, then commit and push to your session branch (Claude Code on Web handles git automatically).
```

---

## 🎬 EXECUTE NOW

### Step 1: Spawn All 5 Sub-Agents in Parallel

**CRITICAL**: Use ONE message with 5 Task tool calls.

For each agent, use this exact prompt structure (changing only the seed range):

```
[Copy the entire "Phase 3 Sub-Agent" prompt template above]
[Change only: "Extract S00XX through S00YY" to match agent's range]
```

### Step 2: Monitor Completion

Watch for all 5 sub-agents to report successful API POST.

Each will show:
```
✅ Successfully POSTed 10 seeds to API
   Total seeds in lego_pairs.json: XX
```

### Step 3: Verify

Once all complete, verify results at:
https://ssi-dashboard-v7.vercel.app/courses/cmn_for_eng_s0454-0463

### Step 4: Done!

All agents will commit to their session branches. The master orchestrator will merge them automatically.

---

## ✅ SUCCESS CRITERIA

- All 10 seeds extracted
- Zero Pragmatic FD violations (no standalone pronouns/articles/particles)
- Overlapping chains used where pedagogically valuable
- Components on all M-types
- All marked `new: true`

**Target time**: ~15-20 minutes for 10 seeds

**You are building world-class language learning materials!**
