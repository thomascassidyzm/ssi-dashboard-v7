# Tiered Model Strategy for Phase 3 Basket Generation

## The Problem

Generating 10 practice phrases per LEGO × ~2,800 LEGOs = expensive.
Using Opus for everything is overkill. Using Haiku for everything fails on hard cases.

## LEGO Difficulty Factors

| Factor | Easy | Hard |
|--------|------|------|
| Available vocab | > 50 words | < 20 words |
| Seed position | S0100+ | S0001-S0020 |
| LEGO type | A (atomic) | M (molecular, 3+ words) |
| Prior rejections | 0 | 1+ |

## Recommended Model Tiers

### Tier 1: HAIKU (~33% of LEGOs)
**Criteria:**
- Vocab size > 50 words
- Simple LEGO (1-2 words)
- No prior rejections

**Cost:** $0.25/$1.25 per 1M tokens (input/output)
**Use for:** Seeds S0050+ with atomic LEGOs

### Tier 2: SONNET (~60% of LEGOs)
**Criteria:**
- Vocab size 20-50 words
- OR molecular LEGO (3+ words)
- OR 1 prior rejection

**Cost:** $3/$15 per 1M tokens
**Use for:** Most LEGOs, default tier

### Tier 3: OPUS (~7% of LEGOs)
**Criteria:**
- Vocab size < 20 words (early seeds)
- OR 2+ prior rejections
- OR complex M-type with grammar challenges

**Cost:** $15/$75 per 1M tokens
**Use for:** S0001-S0020, persistent failures

## Implementation: Adaptive Escalation

```
1. Start with recommended tier based on scaffold analysis
2. If server rejects (GATE violation/missing LEGO):
   - Retry ONCE with same model (different approach)
   - If still fails: ESCALATE to next tier
3. Track success rates per model × difficulty
```

## Server-Side Tier Assignment

Add to scaffold generation (`generate-all-scaffolds.cjs`):

```javascript
function assignTier(scaffold) {
  const vocabSize = scaffold.available_vocab.target.length;
  const legoWords = scaffold.lego.target.split(' ').length;
  const seedNum = parseInt(scaffold.lego_id.substring(1, 5));

  // Early seeds are ALWAYS hard (limited vocab)
  if (seedNum <= 20) return 'opus';
  if (vocabSize < 20) return 'opus';

  // Complex LEGOs need Sonnet minimum
  if (legoWords >= 3) return 'sonnet';
  if (vocabSize < 50) return 'sonnet';

  // Rich vocab + simple LEGO = Haiku can handle
  return 'haiku';
}
```

## Cost Comparison (668 seeds, ~2,800 LEGOs)

| Strategy | Model Mix | Est. Cost |
|----------|-----------|-----------|
| All Opus | 100% Opus | ~$840 |
| All Sonnet | 100% Sonnet | ~$168 |
| **Tiered** | 33% H / 60% S / 7% O | ~$75 |
| All Haiku | 100% Haiku | ~$14 |

*Note: Haiku-only fails ~20-30% of hard cases, requiring escalation anyway.*

## Running Comparison Tests

```bash
# Test default sample (3 LEGOs from different difficulties)
ANTHROPIC_API_KEY=sk-... node scripts/model-comparison-test.cjs \
  public/vfs/courses/spa_for_eng_v2

# Test specific LEGOs
ANTHROPIC_API_KEY=sk-... node scripts/model-comparison-test.cjs \
  public/vfs/courses/spa_for_eng_v2 \
  --legos S0001L01,S0010L01,S0015L04

# Results saved to: model_comparison_results.json
```

## Future: Server-Side Model Routing

The Phase 3 server could expose:

```
POST /generate-basket
{
  "course": "spa_for_eng_v2",
  "legoId": "S0050L02",
  "model": "auto"  // Server picks based on difficulty
}
```

Server picks model, calls Anthropic API directly, validates, returns basket.
This centralizes model selection logic and enables A/B testing.
