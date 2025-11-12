# Phase 5 Learnings: Basket Generation Quality

## Date: 2025-10-30
## Course: spa_for_eng_30 (30-seed Spanish course)

---

## What We Learned

### Issue 1: Inconsistent Word Count Targeting

**Problem:** Agents interpreted "MAX 10 words" as a ceiling, not a target. Produced:
- 5-6 word phrases when 80+ LEGOs available (too conservative)
- 12-14 word phrases (too long, unnatural)

**Root Cause:** Prompt said "AIM FOR 8-10" but also "MAX 10 words" - agents prioritized the constraint over the goal.

**Solution:**
- Changed language to "TARGET 8-10 words (don't go under 7, prefer 9-10)"
- Added explicit: "NEVER create 5-6 word phrases when 80+ LEGOs available"
- Clarified: "Going 1-2 words over target is BETTER than going 2-3 words under"

### Issue 2: No Pre-Write Validation

**Problem:** Agents wrote baskets without validating quality first, leading to empty arrays, wrong word counts, missing operative LEGOs.

**Root Cause:** Quality checklist was presented as guidelines, not mandatory validation.

**Solution:**
- Added: "BEFORE WRITING TO FILE, validate EVERY basket"
- Made checklist 8 explicit criteria
- Added: "If any basket fails validation, regenerate it before writing"

### Issue 3: "Extract ALL" D-Phrases Ambiguous

**Problem:** Some baskets had 0 d-phrases, others had 4-5 per length.

**Root Cause:** Prompt said "Extract ALL 2-5 LEGO windows" without clarifying max 2 per length.

**Solution:**
- Changed to: "Extract 2-5 LEGO windows containing operative LEGO, MAXIMUM 2 per length"
- Added: "Never leave d-phrase arrays empty if vocabulary exists"

### Issue 4: Too Conservative with Rich Vocabulary

**Problem:** With 86 LEGOs available, agents still created 5-word phrases like "Porque quiero hablar español."

**Root Cause:** Agents defaulted to simple phrases unless strongly pushed to use more vocabulary.

**Solution:**
- Added bad example showing this exact problem
- Emphasized: "Don't leave vocabulary on the table"
- Made word count validation explicit in checklist

---

## Quality Metrics Observed

### Seeds 1-15 (Human-supervised generation):
- ✅ Appropriate word counts for vocabulary available
- ✅ Natural, grammatical Spanish
- ✅ Max 2 d-phrases per length
- ✅ All e-phrases ≤10 words

### Seeds 16-30 (Agent generation, v1 prompt):
- ❌ Inconsistent word counts (5-14 words)
- ⚠️ Some phrases too long (12-14 words)
- ⚠️ Some phrases too short (5-6 words with 80+ LEGOs)
- ⚠️ Some empty d-phrase arrays
- ✅ Grammar mostly good
- ✅ Culminating seed sentences correct

---

## System Improvements Made

1. **phase_5_improved_prompt.md** - Updated with:
   - Explicit word count validation
   - Pre-write quality checklist
   - Clear "max 2 per length" for d-phrases
   - Bad examples showing over-conservative and over-long phrases

2. **Next iteration should:**
   - Test with Seeds 16-30 regeneration
   - Measure word count distribution
   - Verify no empty d-phrase arrays
   - Confirm agent follows validation checklist

---

## Key Insight

**The system is language-agnostic.** We're using Spanish as the quality control because it's known well enough to evaluate decisions. The improvements to Phase 5 prompt will benefit ANY language course generation, not just Spanish.

**Prompt engineering is iterative.** Each generation teaches us what agents misunderstand, allowing progressive refinement of instructions.
