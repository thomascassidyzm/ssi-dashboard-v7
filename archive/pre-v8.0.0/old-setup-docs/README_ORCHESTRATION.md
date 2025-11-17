# LEGO Basket Generation: Automated Orchestration System

## The Problem We Solved

Your insight: **Current baskets are too short and don't reflect natural conversation.**

Validation proves it:
```
Current "hand-crafted" baskets: 0/20 passed conversational requirements
- Conversational score: ~20/100 (need 100)
- Conjunction score: ~25/100 (need 100)
```

Most phrases are 2-3 LEGOs, like:
- "I want to speak" (2 LEGOs)
- "I'm trying to learn" (2 LEGOs)

What learners need:
- "I want to speak Spanish and I'm trying to learn but I'm not sure if I can remember" (9+ LEGOs)

## What We Built

### 1. Conversational Quality Requirements
**File**: `docs/BASKET_GENERATION_REQUIREMENTS.md`

Critical requirements for every basket:
- **At least 5 phrases with 5+ LEGOs** (conversational, chained thoughts)
- **40%+ conjunction usage** (pero, y, porque, si, cuando)
- **GATE compliance** (only taught vocabulary)
- **Pattern variety** (use all available patterns)

Why conjunctions are GOLD:
- Mimic natural thought processes
- Connect sequences of ideas
- Build conversational confidence
- Under-represented in seeds but critical for real conversations

### 2. Conversational Quality Validator
**File**: `validate_conversational_quality.cjs`

Automated validation that scores baskets:

```bash
# Single seed detailed report
node validate_conversational_quality.cjs S0010

# Multiple seeds summary
node validate_conversational_quality.cjs S0001-S0020

# Brief status check
node validate_conversational_quality.cjs S0001-S0020 --brief
```

Checks:
- ✅ Phrase length distribution (1-2, 3-4, 5+ LEGOs)
- ✅ Conjunction usage percentage
- ✅ Conversational score (need 5+ phrases with 5+ LEGOs)
- ✅ Conjunction score (need 40%+ usage)
- ✅ Generates retry feedback for failed baskets

Example output:
```
❌ S0010L01: "not" → "No"
   Conversational: 0/10 phrases with 5+ LEGOs (need 5+)
   Conjunctions: 0% (need 40%+)

   Feedback:
   ❌ Add 5 more complex phrases chaining thoughts
   ❌ Use more: pero (but), y (and), porque (because)
```

### 3. Orchestration System
**File**: `orchestrate_basket_generation.cjs`

Automated workflow that:

1. **Spawns agents** for each LEGO with detailed requirements
2. **Validates results** against conversational criteria
3. **Retries with feedback** if requirements not met (max 3 attempts)
4. **Tracks success/failure** across all seeds
5. **Saves final baskets** with validation scores

```bash
# Generate single seed
node orchestrate_basket_generation.cjs S0005

# Generate range
node orchestrate_basket_generation.cjs S0001-S0020
```

## Agent Prompt Template

The orchestrator generates prompts like this for each LEGO:

```markdown
# LEGO Basket Generation Task

## CRITICAL REQUIREMENTS

### 1. CONVERSATIONAL REALISM (★★★★★)
Generate at least 7-8 phrases with 5+ LEGOs

Examples:
- "I want to speak Spanish and I'm trying to learn but I'm not sure" (8 LEGOs)
- "I'm going to try because I want to practise but I can remember" (9 LEGOs)

### 2. CONJUNCTION GOLD (★★★★★)
Use conjunctions in 40%+ of phrases (aim for 6+ out of 15)

GOLD conjunctions:
- pero (but) - contrasting ideas
- y (and) - connecting thoughts
- porque (because) - explaining reasons
- si (if) - conditionals

### 3. GATE COMPLIANCE (★★★★★)
ONLY use vocabulary from previously taught LEGOs

### 4. Pattern Variety
Use all available patterns

## Phrase Distribution Target
- 2 phrases: 1-2 LEGOs (building blocks)
- 5-6 phrases: 3-4 LEGOs (pattern practice)
- 7-8 phrases: 5+ LEGOs (conversational, with conjunctions)

[If retry]
## RETRY FEEDBACK
Previous attempt failed:
- Only 2/15 phrases had 5+ LEGOs (need 7-8)
- Only 20% used conjunctions (need 40%+)

Focus on chaining thoughts: "I want X and I'm trying Y but I'm not sure if Z"
```

## The Strategy

### Test on Known Data First
Generate S0001-S0020 with automation (even though they exist) to prove the system can **beat hand-crafted quality**.

Success criteria:
- ✅ Conversational score: 100/100 (5+ phrases with 5+ LEGOs)
- ✅ Conjunction score: 100/100 (40%+ usage)
- ✅ GATE compliance: 0 violations
- ✅ Pattern variety: 80%+ coverage

If automation passes and hand-crafted fails, we've proven the system works!

### Then Scale to New Seeds
Once validated on S0001-S0020:
- Generate S0021-S0050 with confidence
- Continue to S0051+ as needed
- Minimal manual intervention required

## Next Steps: Integration

The orchestrator has a placeholder for agent spawning:

```javascript
// orchestrate_basket_generation.cjs:186

async function generatePhrasesForLego(lego, state, isLastInSeed, seedPair, attempt = 1, feedback = null) {
  const prompt = generateAgentPrompt(lego, state, isLastInSeed, seedPair, attempt, feedback);

  // TODO: Integrate with your agent spawning system
  // const result = await spawnClaudeAgent(prompt);
  // return result;

  return {
    success: false,
    phrases: [],
    error: "Agent spawning not yet implemented"
  };
}
```

**To complete**:
1. Integrate with Claude API or your agent spawning system
2. Parse agent responses (expecting JSON array of phrases)
3. Handle agent errors/timeouts
4. Test on S0005 first (single seed)
5. If successful, scale to S0001-S0020

## Workflow Visualization

```
┌─────────────────────────────────────────┐
│  Orchestrator                            │
│  - Read extraction map                   │
│  - For each LEGO in seed:               │
└─────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────┐
│  Spawn Agent with Requirements          │
│  - Generate 15 phrases                   │
│  - 7-8 with 5+ LEGOs                    │
│  - 40%+ conjunctions                    │
│  - GATE compliant                       │
└─────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────┐
│  Validate Generated Phrases             │
│  - Conversational score                 │
│  - Conjunction score                    │
│  - GATE compliance                      │
└─────────────────────────────────────────┘
            │
            ├─> Pass ✅ → Save basket
            │
            └─> Fail ❌ → Retry with feedback
                        (max 3 attempts)
```

## Success Metrics

A fully operational system achieves:

- ✅ **100% conversational score** across all baskets
- ✅ **100% conjunction score** across all baskets
- ✅ **0 GATE violations**
- ✅ **< 2 minutes per LEGO** generation time
- ✅ **< 2 retry attempts** average per LEGO
- ✅ **Beats hand-crafted baskets** on all conversational metrics

## Files in This System

```
docs/
  BASKET_GENERATION_REQUIREMENTS.md    # Detailed requirements spec

validate_conversational_quality.cjs    # Validator for conversational metrics
validate_baskets_batch.cjs             # Parallel GATE compliance validator
validate_basket_phrases.cjs            # Single-LEGO detailed validator

orchestrate_basket_generation.cjs      # Main orchestrator (needs agent integration)

example_overbook_s0010l05.json         # Example of phrase filtering
OVERBOOK_WORKFLOW.md                   # Manual workflow docs
```

## The Key Insight

> **Conjunctions (pero, y, porque, si) are GOLD** for joining sequences of thoughts. They're under-represented in seeds but critical for building conversational confidence. Learners need to practice chaining 5+ LEGOs together to mimic natural thought processes.

This system automates generation of these longer, more natural phrases while maintaining strict GATE compliance and pattern variety.

---

**Status**: Framework complete, ready for agent integration testing on S0005.
