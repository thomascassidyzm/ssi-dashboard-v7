---
name: basket-generation-skill
description: Generate practice phrase baskets for LEGO pairs in SSi language courses. Assemble e-phrases from complete LEGO pairs (never break them apart). Critical: GATE constraint (only use prior LEGO pairs) and phrase length guidelines.
version: 1.1.0
---

# Basket Generation Skill

Generate practice phrase baskets for SSi language course LEGOs.

## Quick Reference

**Input**: `lego_pairs.json` (LEGO breakdowns from Phase 3)
**Output**: `lego_baskets.json` (practice baskets)

**Critical concept**: Available vocabulary = complete LEGO pairs (target/known chunks), NOT individual words. Must use entire LEGO pair as a unit.

**Each basket contains**:
- **E-phrases** (eternal): 3-5 natural sentences assembled from complete LEGO pairs
- **D-phrases** (debut): 2-5 LEGO fragments extracted from e-phrases

**Output format**: Single-line compact JSON, zero commentary

## Progressive Disclosure

### Level 1: Critical Rules (READ THESE FIRST)

1. **[GATE Constraint](rules/GATE_CONSTRAINT.md)** - LEGO #N can ONLY use complete LEGO pairs from LEGOs #1 to #(N-1)
2. **[Phrase Length](rules/PHRASE_LENGTH.md)** - E-phrases must match available vocabulary (7-10 words for LEGO #100+)
3. **[Culminating LEGOs](rules/CULMINATING_LEGOS.md)** - Last LEGO in seed: first e-phrase = complete seed sentence

**Key principle**: Use entire LEGO pairs as chunks, never break them into component words (unless those words are also separate LEGOs).

### Level 2: Workflow

1. **[Generate E-Phrases](workflow/GENERATE_E_PHRASES.md)** - Read available vocab first, then assemble natural sentences
2. **[Extract D-Phrases](workflow/EXTRACT_D_PHRASES.md)** - Mechanically extract 2-5 LEGO windows
3. **[Recency Bias](workflow/RECENCY_BIAS.md)** - Use 30-50% recent vocabulary for LEGOs #50+

### Level 3: Examples & Output

- **[Examples](examples/EXAMPLES.md)** - Good baskets vs common mistakes
- **[Output Format](schemas/OUTPUT_FORMAT.md)** - JSON structure, zero-commentary requirement

## Quick Start

For a typical basket generation task:

1. Read [GATE_CONSTRAINT.md](rules/GATE_CONSTRAINT.md) - vocabulary ordering
2. Read [PHRASE_LENGTH.md](rules/PHRASE_LENGTH.md) - phrase length requirements
3. Read [GENERATE_E_PHRASES.md](workflow/GENERATE_E_PHRASES.md) - read vocab first, then generate sentences
4. Read [EXTRACT_D_PHRASES.md](workflow/EXTRACT_D_PHRASES.md) - extract fragments mechanically
5. Read [CULMINATING_LEGOS.md](rules/CULMINATING_LEGOS.md) - seed sentence must be first
6. Read [EXAMPLES.md](examples/EXAMPLES.md) - see good vs bad baskets

## Common Mistakes (From Testing)

❌ **Making 3-4 word phrases when 7-10 words are possible**
- LEGO #126 has 125 LEGOs available → should make 7-10 word phrases
- Read [PHRASE_LENGTH.md](rules/PHRASE_LENGTH.md)

❌ **Using future vocabulary (GATE violation)**
- LEGO #50 cannot use LEGOs #51-2000
- Read available vocabulary BEFORE generating phrases
- See [GATE_CONSTRAINT.md](rules/GATE_CONSTRAINT.md)

❌ **Culminating LEGO with seed not first**
- Last LEGO in seed must have complete seed sentence as first e-phrase
- See [CULMINATING_LEGOS.md](rules/CULMINATING_LEGOS.md)

❌ **Not using recency bias**
- LEGOs #50+ should use 30-50% recent vocabulary
- See [RECENCY_BIAS.md](workflow/RECENCY_BIAS.md)

## Success Criteria

- ✓ GATE constraint: 100% compliance (only use prior LEGOs)
- ✓ Phrase length: Matches available vocabulary
- ✓ Culminating LEGOs: first e-phrase = complete seed
- ✓ Recency bias: 30-50% recent vocabulary (for LEGOs #50+)
- ✓ Natural, grammatical phrases in both languages
- ✓ Complete d-phrase extraction (mechanical, no curation)
- ✓ Zero commentary in output

## Version History

**v1.1.0 (2025-10-30)**:
- Simplified from 12 files to 9 files
- Removed tiling validation (read vocab first instead)
- Removed grammar perfection (implicit requirement)
- Consolidated examples into single file
- Emphasized read-vocab-first workflow
- **Critical clarification**: Available vocabulary = complete LEGO pairs (chunks), NOT individual words
- Must use entire LEGO pair as unit (never break into component words)

**v1.0.0 (2025-10-30)**:
- Initial skill creation from phase_5_lego_baskets.md v3.0
- Progressive disclosure structure
- Modular rules for clarity
