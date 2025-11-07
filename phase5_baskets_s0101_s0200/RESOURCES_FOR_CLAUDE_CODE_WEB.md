# Resources for Claude Code on the Web - Phase 5 Basket Generation

**Task**: Generate baskets for 273 new LEGOs (S0101-S0200)
**Strategy**: 20 agents in parallel × ~14 LEGOs each
**Est. Time**: 30-40 minutes total

---

## Essential Files (Must Read)

### 1. Your Assignment
```
phase5_baskets_s0101_s0200/batch_input/agent_XX_legos.json
```
- Contains ~14 LEGOs you need to generate baskets for
- Includes: lego_id, type, target, known, cumulative_legos
- Read this FIRST to know your workload

### 2. Complete LEGO Registry
```
phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```
- 551 total LEGOs (S0001-S0200)
- Use this to check available vocabulary for GATE constraint
- Build vocabulary map: lego_id → {target, known, type}

### 3. Agent Task Template (Instructions)
```
phase5_baskets_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md
```
- Complete step-by-step guide
- GATE constraint explained with examples
- Distribution requirements (2-2-2-4)
- Output format specifications

### 4. Execution Guide
```
phase5_baskets_s0101_s0200/EXECUTE_BASKETS.md
```
- High-level overview
- Success criteria
- Timing estimates

---

## Reference Materials

### Example Baskets (Study These!)
```bash
# Look at existing baskets for format
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0023.json
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0050.json
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0100.json
```

### Basket Generation Skill
```
skills/basket-generation-skill/SKILL.md
skills/basket-generation-skill/rules/GATE_CONSTRAINT.md
skills/basket-generation-skill/rules/PHRASE_LENGTH.md
```

---

## Output Location

Write your baskets to:
```
phase5_baskets_s0101_s0200/batch_output/agent_XX_baskets.json
```

Format:
```json
{
  "agent_number": XX,
  "total_legos_processed": 14,
  "total_baskets_generated": 14,
  "generated_at": "ISO timestamp",
  "baskets": {
    "S0101L01": { /* basket data */ },
    "S0101L02": { /* basket data */ },
    ...
  }
}
```

---

## Core Rules (Quick Reference)

### GATE Constraint
**Only use LEGOs from earlier positions**

Example: For S0150L02, you can use:
- ✅ Any LEGO from S0001L01 through S0150L01
- ❌ S0150L03 onwards (future vocabulary)

### Distribution (2-2-2-4)
Every basket must have:
- 2 really short phrases (1-2 LEGOs)
- 2 quite short phrases (3 LEGOs)
- 2 longer phrases (4-5 LEGOs)
- 4 long phrases (6+ LEGOs)

### Full Seed Inclusion
- Include the original seed sentence as one of your phrases
- Usually as one of the long phrases (6+ LEGOs)

---

## Common Patterns to Use

Mark these in your phrases:
- **P01**: quiero + infinitive (I want to...)
- **P02**: estoy + gerund (I'm doing...)
- **P03**: voy a + infinitive (I'm going to...)
- **P04**: me gustaría + infinitive (I'd like...)
- **P05**: Simple present tense
- **P10**: Subjunctive triggers
- **P12**: Question words
- **P18**: puedo + infinitive (I can...)

---

## Checklist Before Submitting

✅ Read my assignment file
✅ Load complete LEGO registry
✅ Generate 10 phrases per LEGO
✅ Verify 2-2-2-4 distribution for each basket
✅ Check GATE compliance (no future vocabulary)
✅ Include full seed in each basket
✅ Mark patterns used
✅ Natural Spanish throughout
✅ Output to correct batch_output file

---

## If You Get Stuck

**GATE violations**:
- Check cumulative_legos field for your LEGO
- Only use LEGOs with position < your current LEGO

**Distribution issues**:
- Count LEGO pairs in each phrase (not words!)
- Must be exactly 2-2-2-4

**Pattern marking**:
- Look at cumulative_patterns in registry
- Mark which pattern each phrase uses (or null if none)

---

## Example Workflow

```bash
# 1. Read assignment
cat phase5_baskets_s0101_s0200/batch_input/agent_01_legos.json

# 2. Read template
cat phase5_baskets_s0101_s0200/templates/AGENT_TASK_TEMPLATE.md

# 3. Load registry
cat phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json

# 4. Study example baskets
cat public/vfs/courses/spa_for_eng/baskets/lego_baskets_s0050.json

# 5. Generate your baskets
# (Follow template step-by-step)

# 6. Output
# Write to: phase5_baskets_s0101_s0200/batch_output/agent_01_baskets.json
```

---

## Time Management

- **Per LEGO**: 2-3 minutes (10 phrases + validation)
- **Your batch**: ~14 LEGOs × 2.5 min = 35 minutes
- **Don't rush**: Quality > Speed

---

## Ready to Start! 🧺

You have everything you need. Read the template carefully and follow the examples!
