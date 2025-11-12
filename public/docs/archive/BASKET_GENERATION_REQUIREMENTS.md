# LEGO Basket Generation Requirements

## Critical Pedagogical Insight

**Problem**: Current phrases are too short and don't reflect natural conversation.
- "I want to speak" (2 LEGOs)
- "I'm trying to learn Spanish" (3 LEGOs)

**Solution**: Generate conversational phrases that mimic real thought processes.
- "I want to speak Spanish and I'm trying to learn but I'm not sure if I can remember" (8+ LEGOs)

## Generation Requirements

### Phrase Distribution (10-12 phrases per basket)

```javascript
{
  minimal_pairs: 2,         // 1-2 LEGOs: building blocks
  pattern_coverage: 3-5,    // 3-4 LEGOs: pattern practice
  conversational: 5+        // ⭐ AT LEAST 5 phrases with 5+ LEGOs
}
```

### Conjunction Priority (GOLD for conversation)

**Must use liberally** - aim for 40%+ of phrases containing:

| Spanish | English | Usage |
|---------|---------|-------|
| pero | but | Contrasting ideas |
| y | and | Connecting thoughts |
| porque | because | Explaining reasons |
| o | or | Presenting options |
| así que | so | Showing consequence |
| cuando | when | Time connections |
| si | if | Conditionals |

### Quality Scoring

```javascript
function scorePhraseQuality(phrases) {
  const conversationalCount = phrases.filter(p => p.lego_count >= 5).length;
  const conjunctionUsage = phrases.filter(p => hasConjunction(p)).length / phrases.length;

  return {
    conversational_score: conversationalCount >= 5 ? 100 : (conversationalCount / 5) * 100,
    conjunction_score: conjunctionUsage * 100,
    pass: conversationalCount >= 5 && conjunctionUsage >= 0.3
  };
}
```

## Examples of GOOD Conversational Phrases

### Using "but" (pero)
- "I want to speak Spanish but I'm trying to learn how to say something" (7 LEGOs)
- "I'm going to practise but I'm not sure if I can remember the whole sentence" (9 LEGOs)

### Using "and" (y)
- "I'm going to practise and I'd like to speak with you tomorrow" (8 LEGOs)
- "I speak Spanish and I'm trying to learn how to explain things" (8 LEGOs)

### Using "because" (porque)
- "I'm not sure if I can remember because I'm trying to learn quickly" (9 LEGOs)
- "I want to speak with you because I'm trying to practise now" (8 LEGOs)

### Complex chains
- "I want to speak Spanish and I'm trying to learn but I'm not sure if I remember" (11 LEGOs)
- "I'm going to try to speak because I want to learn but I'm not sure" (10 LEGOs)

## Agent Instructions

When generating phrases, agents MUST:

1. **Generate 15 phrases** (over-booking for validation)
2. **At least 7-8 MUST be 5+ LEGOs** (so after filtering, 5+ remain)
3. **Use conjunctions in 40%+ of phrases**
4. **Chain thoughts naturally** - how people actually think/speak
5. **Maintain GATE compliance** - only use taught vocabulary
6. **Cover all available patterns** - but in conversational context

## Validation Checks

Post-generation validation must verify:

### 1. Conversational Requirement
```bash
✓ At least 5 phrases with 5+ LEGOs
❌ Only 2 conversational phrases - REJECT, retry with feedback
```

### 2. Conjunction Usage
```bash
✓ 6/10 phrases use conjunctions (60%)
❌ 2/10 phrases use conjunctions (20%) - REJECT, retry with feedback
```

### 3. GATE Compliance
```bash
✓ All phrases use only taught vocabulary
❌ 3 phrases use untaught words - REJECT, retry with feedback
```

### 4. Pattern Variety
```bash
✓ Uses 7/7 available patterns
⚠️ Uses 4/7 available patterns - WARN but may accept
```

## Why This Matters

**Building Confidence**: Longer phrases with conjunctions:
- Mimic natural thought processes
- Allow learners to chain ideas together
- Build fluency, not just pattern drilling
- Prepare for real conversations where thoughts connect

**Under-represented in Seeds**: Seeds often focus on isolated patterns, but real conversation requires:
- Connecting multiple thoughts
- Contrasting ideas (but)
- Explaining reasoning (because)
- Presenting options (or)

These conjunctions are **GOLD** for getting learners confident in expressing complex thoughts.

## Orchestrator Implementation

The orchestrator must:

1. **Spawn agents** with clear conversational requirements
2. **Validate results** against all criteria
3. **Retry with feedback** if conversational score < 100
4. **Learn patterns** of successful generation
5. **Track metrics** across all baskets

Example retry feedback:
```
Previous attempt failed conversational requirement:
- Only 3/10 phrases had 5+ LEGOs (need 5+)
- Only 20% used conjunctions (need 40%+)

Please regenerate with:
- More complex chained thoughts
- Liberal use of: pero, y, porque
- Natural speech patterns: "I want to X but Y because Z"
```

## Success Metrics

A successful basket generation session achieves:

- ✅ 100% conversational score (5+ phrases with 5+ LEGOs)
- ✅ 40%+ conjunction usage
- ✅ 0 GATE violations
- ✅ 80%+ pattern coverage
- ✅ Generated in < 2 minutes per LEGO
- ✅ < 2 retry attempts needed

This ensures "top dollar content" quality at scale.
