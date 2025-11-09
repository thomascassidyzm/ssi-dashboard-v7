# Generate Conversational Baskets - Claude Code Workflow

## How This Works (Semi-Automatic)

You trigger manually, Claude Code does everything else automatically using Task agents.

## Step-by-Step

### 1. You Say:
```
Generate conversational basket for S0005
```

### 2. Claude Code Does Automatically:

```
For each LEGO in S0005:
  ├─> Spawn Task agent with phase intelligence
  ├─> Agent generates 15 phrases
  ├─> Validate conversational quality
  ├─> If pass: Save ✅
  └─> If fail: Retry with feedback (max 3x)
```

### 3. You Get Results:
```
generated_baskets/lego_baskets_s0005_conversational.json
```

## Example Trigger

Just say in Claude Code:

> Generate conversational baskets for S0005. Use the phase intelligence from `docs/phase_intelligence/phase_5_conversational_baskets.md`. For each LEGO, spawn a Task agent to generate 15 phrases, then validate with `validate_conversational_quality.cjs`. Retry with feedback if validation fails. Save to `generated_baskets/`.

## What Claude Code Will Do

**For S0005L01** ("I'm going to" / "Voy a"):

1. **Spawn Task Agent**
   - Prompt: Phase intelligence + LEGO context + GATE vocabulary
   - Task: Generate 15 conversational phrases
   - Requirements: 5+ phrases with 5+ LEGOs, 40%+ conjunctions

2. **Agent Returns**
   ```json
   [
     ["I'm going to", "Voy a", "P03", 1],
     ["I'm going to speak and I want to learn", "Voy a hablar y quiero aprender", "P03", 4],
     ["I'm going to speak Spanish but I'm trying to learn because I'm not sure", "Voy a hablar español pero estoy intentando aprender porque no estoy seguro", "P03", 9],
     ...
   ]
   ```

3. **Validate Automatically**
   - Conversational score: 100/100 ✅
   - Conjunction score: 100/100 ✅
   - GATE compliance: 0 violations ✅

4. **Save** → Move to next LEGO

**Repeat for S0005L02, S0005L03, S0005L04**

## The Magic

- ✅ **No external API calls** - Everything happens in Claude Code
- ✅ **Task tool spawns sub-agents** - Parallel phrase generation
- ✅ **Automatic validation** - Scripts check quality
- ✅ **Retry with feedback** - If fails, Claude Code tries again with specific guidance
- ✅ **You just watch** - Semi-automatic workflow

## Files Used

- `docs/phase_intelligence/phase_5_conversational_baskets.md` - Instructions for agents
- `claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json` - GATE vocabulary
- `validate_conversational_quality.cjs` - Quality checker
- `generated_baskets/` - Output directory

## Requirements Enforced

Every basket MUST meet:
- ✅ At least 5 phrases with 5+ LEGOs (conversational)
- ✅ 40%+ conjunction usage (pero, y, porque, si, cuando)
- ✅ GATE compliance (only taught vocabulary)
- ✅ Pattern variety (all available patterns)

## Baseline to Beat

Current hand-crafted baskets:
- Conversational score: ~20/100
- Conjunction score: ~25/100

Claude Code automation target:
- Conversational score: 100/100
- Conjunction score: 100/100

## Try It Now

Just say:

> Generate conversational baskets for S0005 using the workflow in WORKFLOW_INSTRUCTIONS.md
