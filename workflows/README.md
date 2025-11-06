# Automated Basket Generation Workflows

## The Right Tool for Each Job

```
YOU TRIGGER MANUALLY → AUTOMATION ORCHESTRATES → LLMs CREATE → AUTOMATION VALIDATES
```

### What LLMs Do (Creative Work)
- Generate 15 natural, conversational Spanish phrases
- Use conjunctions to chain thoughts together
- Create phrases that mimic real conversation

### What Automation Does (Workflow Management)
- Spawn agents for each LEGO
- Validate conversational quality
- Check GATE compliance
- Retry with specific feedback if needed
- Save final baskets

## Quick Start

### 1. Set Up Environment

```bash
# Add to .env file
ANTHROPIC_API_KEY=your_api_key_here
```

### 2. Generate Baskets (Single Seed Test)

```bash
# Test on one seed first
node workflows/generate_conversational_baskets.cjs S0005
```

**What happens:**
1. ✅ System spawns LLM agent for S0005L01
2. 🤖 LLM generates 15 phrases
3. 📊 System validates: conversational score, conjunction usage, GATE compliance
4. ✅ Pass → Save basket
5. ❌ Fail → Retry with feedback (max 3 attempts)
6. Repeat for S0005L02, S0005L03, S0005L04

### 3. Validate Quality

```bash
# Check conversational quality
node validate_conversational_quality.cjs S0005

# Compare to hand-crafted baseline
node validate_conversational_quality.cjs S0005 --brief
```

**Success criteria:**
- ✅ Conversational score: 100/100 (at least 5 phrases with 5+ LEGOs)
- ✅ Conjunction score: 100/100 (40%+ usage)
- ✅ GATE compliance: 0 violations

### 4. Scale to Multiple Seeds

```bash
# Generate range
node workflows/generate_conversational_baskets.cjs S0001-S0020

# Validate all
node validate_conversational_quality.cjs S0001-S0020 --brief
```

## Workflow Details

### Phase Intelligence

The LLM receives this instruction set:
- **File**: `docs/phase_intelligence/phase_5_conversational_baskets.md`
- **Requirements**: 5+ conversational phrases, 40%+ conjunctions, GATE compliance
- **Examples**: Shows good vs bad phrases
- **Context**: Previously taught LEGOs, available patterns

### Validation Loop

```
Generate 15 phrases
  ↓
Validate quality
  ↓
Pass? → Save ✅
  ↓
Fail? → Retry with feedback (max 3x)
  ↓
Still failing? → Manual review needed ❌
```

### Retry Feedback Examples

If conversational score too low:
```
❌ CONVERSATIONAL REQUIREMENT NOT MET
You generated 2/15 phrases with 5+ LEGOs.
You need 3 MORE conversational phrases.

Focus on chaining thoughts together:
- "I want to speak Spanish and I'm trying to learn but I'm not sure" (8 LEGOs)
- "I'm going to try because I want to practise but I can remember" (9 LEGOs)
```

If conjunction usage too low:
```
❌ CONJUNCTION REQUIREMENT NOT MET
Only 20% of phrases use conjunctions (need 40%+).

Use more conjunctions to connect ideas:
- pero (but) - "I want to speak pero I'm not sure"
- y (and) - "I'm trying to learn y I want to practise"
- porque (because) - "I'm practising porque I want to learn"
```

## Output

### Generated Baskets
```
generated_baskets/
  lego_baskets_s0005_conversational.json
  lego_baskets_s0010_conversational.json
  ...
```

### Basket Structure
```json
{
  "version": "generative_v5_conversational",
  "seed": "S0005",
  "note": "Generated with LLM agents + automated validation",
  "generation_metadata": {
    "generated_at": "2025-11-05T...",
    "max_retries": 3,
    "requirements": {
      "min_conversational_phrases": 5,
      "min_conjunction_percentage": 40
    }
  },
  "S0005L01": {
    "lego": ["I'm going to", "Voy a"],
    "practice_phrases": [
      ["I'm going to speak", "Voy a hablar", "P03", 2],
      ["I'm going to speak Spanish and I'm trying to learn", "Voy a hablar español y estoy intentando aprender", "P03", 5],
      ...
    ],
    "validation_score": {
      "conversational": 100,
      "conjunctions": 100
    },
    "attempt": 1
  }
}
```

## Testing Strategy

### Baseline Comparison

Current hand-crafted baskets:
```bash
node validate_conversational_quality.cjs S0001-S0020 --brief
```

**Result**: 0/20 passed (avg scores: ~20/100 conversational, ~25/100 conjunctions)

Generated baskets (after this workflow):
```bash
node validate_conversational_quality.cjs --all --brief
```

**Target**: 20/20 passed (100/100 on both scores)

### Success Metrics

For automation to "beat" hand-crafted:
- ✅ Conversational score: 100/100 (vs ~20/100)
- ✅ Conjunction score: 100/100 (vs ~25/100)
- ✅ GATE compliance: 0 violations
- ✅ Generation time: < 2 min per LEGO
- ✅ Retry rate: < 30% need retries

## Troubleshooting

### API Key Issues
```bash
❌ ERROR: ANTHROPIC_API_KEY not set in environment
```

**Fix**: Add to `.env` file:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### LLM Returns Invalid JSON
```
❌ LLM agent failed: No JSON array found in response
```

**Fix**: System automatically retries. If persistent, check phase intelligence prompt.

### All Retries Failed
```
❌ FAILED after 3 attempts
```

**Fix**:
1. Check validation feedback in console
2. May need to adjust phase intelligence prompt
3. May need more specific GATE vocabulary list

### Rate Limits
```
❌ LLM agent failed: rate_limit_error
```

**Fix**: Add delays between requests or reduce parallel processing.

## Performance

### Expected Timing (S0005 = 4 LEGOs)
- S0005L01: ~15-30s (generate + validate)
- S0005L02: ~15-30s
- S0005L03: ~15-30s
- S0005L04: ~15-30s
- **Total**: ~60-120s

### Parallel Processing (Future)
Could parallelize LEGO generation within a seed:
- All 4 LEGOs at once
- **Total**: ~30-45s

## Next Steps

1. **Test on S0005**: `node workflows/generate_conversational_baskets.cjs S0005`
2. **Validate quality**: Compare scores to hand-crafted baseline
3. **If successful**: Scale to S0001-S0020
4. **If automation beats manual**: Use for S0021+

The goal: **Prove automation can beat hand-crafted on conversational metrics.**
