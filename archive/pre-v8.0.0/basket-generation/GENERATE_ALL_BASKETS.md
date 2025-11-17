# Generate All Conversational Baskets (S0001-S0050)

This document explains how to use Claude Code to automatically generate all 50 conversational LEGO baskets.

## Quick Start

Simply say to Claude Code:

```
Generate conversational baskets for S0001-S0050 in batches of 5
```

Claude Code will:
1. Process seeds in batches (prevents overwhelming the system)
2. For each seed, spawn parallel Task agents for each LEGO
3. Generate 15 high-quality conversational phrases per LEGO
4. Automatically apply conjunction usage based on availability
5. Compile and validate each basket
6. Save to `generated_baskets/` directory

## Batch Processing Strategy

### Recommended Batch Sizes:
- **Small batches (5 seeds)**: Most reliable, good for initial generation
- **Medium batches (10 seeds)**: Faster, still manageable
- **Large batches (20 seeds)**: Fastest, but may need retries

### Example Commands:

**Conservative approach (recommended for first run):**
```
Generate baskets S0001-S0010 (batch 1 of 5)
Generate baskets S0011-S0020 (batch 2 of 5)
Generate baskets S0021-S0030 (batch 3 of 5)
Generate baskets S0031-S0040 (batch 4 of 5)
Generate baskets S0041-S0050 (batch 5 of 5)
```

**Faster approach:**
```
Generate baskets S0001-S0025 (first half)
Generate baskets S0026-S0050 (second half)
```

## What Gets Generated

For each seed (e.g., S0011):
- ✅ 15 phrases per LEGO (vs 10 in hand-crafted)
- ✅ 5+ phrases with 5+ LEGOs (conversational)
- ✅ Heavy conjunction usage (si, y, pero, porque)
- ✅ GATE compliant (no forward references)
- ✅ Pattern variety across all available patterns
- ✅ Quality metrics tracked

## Expected Results

Based on our test seeds (S0011, S0021, S0031):
- **53-67% conversational rate** (vs 10% hand-crafted)
- **42-60% conjunction usage** (vs 13% hand-crafted)
- **100/100 quality scores** (vs 20/100 hand-crafted)
- **5-7x better** than manual generation

## Conjunction Availability by Seed Range

| Seed Range | Available Conjunctions | Expected Quality |
|-----------|----------------------|------------------|
| S0001-S0009 | None yet | Still excellent |
| S0010-S0014 | si (if) | Good fluency |
| S0015-S0018 | si, y (and) | Better fluency |
| S0019-S0021 | si, y, pero (but) | Great fluency |
| S0022-S0050 | si, y, pero, porque (because) | Excellent fluency |

## Monitoring Progress

Claude Code will show:
- Real-time generation status for each LEGO
- Compilation progress for each seed
- Validation results showing quality scores
- Any errors or retries needed

## Output Files

Generated files will be saved to:
```
generated_baskets/
  ├── lego_baskets_s0001_conversational.json
  ├── lego_baskets_s0002_conversational.json
  ├── ...
  ├── lego_baskets_s0050_conversational.json
  └── temp_s00*_phrases.json (individual LEGO files)
```

## Viewing Generated Baskets

Use the enhanced basket viewer:
1. Start your dev server
2. Navigate to the basket viewer
3. Toggle to "AI-Generated ✨" source
4. Browse all generated seeds

## Tips for Success

1. **Start with small batches** - Test with 5 seeds first
2. **Monitor quality** - Check a few baskets after each batch
3. **Let it run** - Generation takes time, don't interrupt
4. **Retry if needed** - If a seed fails, regenerate just that one
5. **Trust the process** - The automation has proven to beat manual quality

## Technical Details

### Phase Intelligence Used:
- `docs/phase_intelligence/phase_5_conversational_baskets.md`
- Full instructions for LLM phrase generation
- Conversational requirements and examples

### Extraction Map:
- `claude_code_web_test/LEGO_EXTRACTION_MAP_S0001-S0050_AUTHORITATIVE.json`
- Complete vocabulary and pattern tracking
- GATE compliance verification

### Validators:
- `validate_conversational_quality.cjs` - Quality metrics
- `validate_basket_phrases.cjs` - GATE compliance
- `validate_baskets_batch.cjs` - Batch validation

## Expected Timeline

- **Small batch (5 seeds)**: ~5-10 minutes
- **Medium batch (10 seeds)**: ~10-15 minutes
- **Large batch (20 seeds)**: ~15-25 minutes
- **Complete generation (50 seeds)**: ~45-60 minutes total

## After Generation

1. **Validate results**: Run batch validator on all generated baskets
2. **Compare with hand-crafted**: Check quality improvements
3. **Review edge cases**: Manually review any low-scoring baskets
4. **Deploy**: Copy to production basket directory
5. **Celebrate**: You've automated high-quality content generation! 🎉

## Troubleshooting

**If a seed fails:**
```
Regenerate basket for S0015
```

**If you want to regenerate a specific LEGO:**
```
Regenerate S0015L03 with more conversational phrases
```

**If quality seems low:**
```
Show me the validation report for S0015
```

## Next Steps

After all baskets are generated:
- Run comprehensive validation across all 50 seeds
- Compare aggregate quality metrics vs hand-crafted baseline
- Document the time saved and quality improvement
- Scale the approach to remaining seeds (S0051-S0100+)
