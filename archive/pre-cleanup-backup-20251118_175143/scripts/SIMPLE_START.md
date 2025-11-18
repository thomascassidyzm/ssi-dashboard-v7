# Simple 100-Seed Start Guide

## ✅ YES - Agents WILL Follow Proper Intelligence!

Here's exactly how the intelligence flows:

### Intelligence Chain

```
1. You spawn Master Orchestrator
   ↓
2. Master Orchestrator reads: docs/phase_intelligence/phase_1_orchestrator.md
   ↓
3. Orchestrator spawns 10 sub-agents
   ↓
4. Each sub-agent prompt includes: "Read docs/phase_intelligence/phase_1_seed_pairs.md"
   ↓
5. Sub-agents follow v2.6 methodology:
   - TWO ABSOLUTE RULES
   - Cognate preference (Spanish)
   - Simplicity preference (Chinese)
   - Extended thinking
   - Array format: [known, target]
```

---

## 🚨 CRITICAL FIX NEEDED FIRST

The current orchestrator doc references a `skills/translation-skill` directory **that doesn't exist**.

**We need to update the orchestrator prompts to directly reference the phase intelligence docs.**

---

## 🔧 Quick Fix Option 1: Manual Orchestrator Prompts

**Skip the automated orchestration** and manually run orchestrators with proper prompts:

### For Spanish (Seeds 1-100):

**Orchestrator 1 (Seeds 1-33):**
```
You are Phase 1 Orchestrator #1 for spa_for_eng_s0001-0100.

Task: Translate seeds S0001-S0033 from English to Spanish.

STEP 1: Read complete Phase 1 methodology
Read: docs/phase_intelligence/phase_1_seed_pairs.md

This contains EVERYTHING:
- TWO ABSOLUTE RULES (never violate)
- Cognate preference (mandatory seeds 1-100)
- Zero variation (first word wins)
- Extended thinking (use for EVERY seed)
- Array format: [known, target]

STEP 2: Fetch canonical seeds
curl "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/seeds?start=1&end=33"

STEP 3: Spawn 10 sub-agents in parallel using Task tool

Each agent gets 3-4 seeds and this prompt:

"Translate seeds SXXXX-SXXXX using Phase 1 methodology.

REQUIRED READING: docs/phase_intelligence/phase_1_seed_pairs.md

Focus on:
- Lines 44-71: TWO ABSOLUTE RULES
- Lines 447-505: Cognate preference (check FIRST for Spanish)
- Lines 551-628: Zero variation principle
- Lines 260-396: Extended thinking (EVERY seed)
- Line 884-889: Array format [known, target]

Input: [canonical seeds list]

Output format:
{
  \"S0001\": [\"I want to speak Spanish with you now.\", \"Quiero hablar español contigo ahora.\"],
  ...
}

Use extended thinking. Check cognates first. Output JSON."

STEP 4: Validate & merge all 10 outputs
STEP 5: Write chunk_01.json
```

---

## 🔧 Quick Fix Option 2: Update Orchestrator Intelligence Doc

Update `docs/phase_intelligence/phase_1_orchestrator.md` to reference the actual phase intelligence instead of the missing skill structure.

**Lines 92-114 should be:**

```markdown
**Each Task prompt should include:**

Translate seeds S0XXX-S0YYY for {course_code}.

REQUIRED READING: docs/phase_intelligence/phase_1_seed_pairs.md

This document contains the complete Phase 1 methodology. Pay special attention to:

1. TWO ABSOLUTE RULES (lines 44-71) - NEVER violate these
2. Cognate Preference (lines 447-505) - Check cognates FIRST for seeds 1-100
3. Zero Variation (lines 551-628) - First-come-first-served principle
4. Extended Thinking (lines 260-396) - Use for EVERY seed translation
5. Array Format (lines 884-889) - [known, target] format required

INPUT:
- Seed list: [provide canonical English sentences with IDs]
- Target language: {target_code}
- Known language: {known_code}

OUTPUT FORMAT:
{
  "S0001": ["Known language", "Target language"],
  "S0002": ["Known language", "Target language"],
  ...
}

CRITICAL:
- Extended thinking for EVERY seed
- TWO ABSOLUTE RULES never violated
- Cognate preference mandatory (seeds 1-100)
- Maintain vocabulary registry for consistency
- Array format: [known, target]
```

---

## 📋 RECOMMENDED: Do the Fix, Then Run

1. **Update the orchestrator doc** (Option 2 above)
2. **Then run the overnight pipeline**

This ensures all orchestrators get proper intelligence.

---

## 🎯 Bottom Line

**Question:** Will agents follow the proper phase intelligence?

**Answer:** YES, but only after we fix the orchestrator prompts to reference the correct docs (phase_1_seed_pairs.md) instead of the missing skills structure.

**Time to fix:** 5 minutes
**Impact:** Critical - without this, agents won't get the updated v2.6 methodology

---

Would you like me to:
1. Update the phase_1_orchestrator.md doc now?
2. Create corrected orchestrator prompt templates?
3. Both?
