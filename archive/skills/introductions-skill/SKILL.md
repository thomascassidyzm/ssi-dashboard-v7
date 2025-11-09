# Introductions Generation Skill

---
name: introductions-skill
description: Generates pedagogical introductions for LEGO pairs with provenance awareness and componentization
version: 7.6.0
---

## Purpose

Generate contextual introductions for each LEGO pair that:
1. Provide seed-level context to anchor the learner
2. Explain the LEGO pair clearly and pedagogically
3. Skip duplicate LEGOs using provenance map
4. Include componentization for COMPOSITE LEGOs
5. Maintain consistency with SSi pedagogical principles

## Progressive Disclosure

**Level 1 - Quick Reference:**
- Input: `LEGO_BREAKDOWNS_COMPLETE.json` + `lego_provenance_map.json` + `translations.json`
- Output: `introductions.json`
- Format: `{"S0001L01": {"seed_context": "...", "introduction_text": "..."}}`

**Level 2 - Detailed Instructions:**
See [GENERATION_LOGIC.md](./GENERATION_LOGIC.md) for complete methodology

**Level 3 - Resources:**
- [SCHEMAS.md](./schemas/SCHEMAS.md) - JSON structure specifications
- [EXAMPLES.md](./examples/EXAMPLES.md) - Annotated examples
- [scripts/generate-introductions.cjs](./scripts/generate-introductions.cjs) - Executable script

## Quick Usage

```bash
# From course directory
node ../../skills/introductions-skill/scripts/generate-introductions.cjs \
  --legos LEGO_BREAKDOWNS_COMPLETE.json \
  --provenance lego_provenance_map.json \
  --translations translations.json \
  --output introductions.json
```

## Key Principles

1. **Provenance Awareness**: Skip LEGOs that appear as keys in provenance map (duplicates)
2. **Seed Context First**: Provide full seed translation before LEGO introduction
3. **Componentization**: For COMPOSITE LEGOs, append componentization explanation
4. **Natural Language**: Write as if explaining to a learner, not defining dictionary entries
5. **Consistency**: Use canonical SSi terminology and pedagogical voice

## Quality Standards

- ✅ All non-duplicate LEGOs have introductions
- ✅ Seed context matches translations.json exactly
- ✅ COMPOSITE LEGOs include componentization
- ✅ BASE LEGOs have simple, direct explanations
- ✅ FEEDER LEGOs reference parent context when helpful
- ✅ No technical jargon (lego_id, BASE/COMPOSITE, etc.) in learner-facing text

## Error Handling

- Missing provenance map → assume all LEGOs are original (no duplicates)
- Missing translations → skip seed_context, include introduction_text only
- Invalid LEGO structure → log error, skip that LEGO, continue processing
- Duplicate lego_id → keep first occurrence, warn about duplicate

## See Also

- [Phase 6 Training Docs](../../docs/phase-6-introduction-generation.md)
- [SSi Pedagogical Principles](../../docs/ssi-pedagogical-principles.md)
- [Provenance Map Specification](../../docs/provenance-map-spec.md)
