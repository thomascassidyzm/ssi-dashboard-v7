---
name: basket-generation-skill
description: Generate practice phrase baskets for LEGO pairs in SSi language courses. Use when generating baskets, creating practice phrases, or working with lego_pairs.json and lego_baskets.json files. Critical: Enforces GATE constraint (vocabulary ordering) and phrase length guidelines.
version: 1.0.0
---

# Basket Generation Skill

Generate practice phrase baskets for SSi language course LEGOs.

## Quick Reference

**Input**: `lego_pairs.json` (LEGO breakdowns from Phase 3)
**Output**: `lego_baskets.json` (practice baskets)

**Each basket contains**:
- **E-phrases** (eternal): 3-5 natural sentences for spaced repetition
- **D-phrases** (debut): 2-5 LEGO fragments extracted from e-phrases

**Output format**: Single-line compact JSON, zero commentary

## Progressive Disclosure

### Level 1: Critical Rules (READ THESE FIRST)

**These are ABSOLUTE requirements - non-negotiable**:

1. **[GATE Constraint](rules/GATE_CONSTRAINT.md)** - LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)
2. **[Tiling Validation](rules/TILING_VALIDATION.md)** - Use greedy search to validate phrases tile from available LEGOs (COMPOSITE before BASE)
3. **[Phrase Length](rules/PHRASE_LENGTH.md)** - E-phrases must match available vocabulary (7-10 words for LEGO #100+)
4. **[Grammar Perfection](rules/GRAMMAR_PERFECTION.md)** - Perfect grammar in BOTH languages
5. **[Culminating LEGOs](rules/CULMINATING_LEGOS.md)** - Last LEGO in seed: first e-phrase = complete seed sentence

### Level 2: Workflow

1. **[Generate E-Phrases](workflow/GENERATE_E_PHRASES.md)** - Create natural, conversational sentences
2. **[Extract D-Phrases](workflow/EXTRACT_D_PHRASES.md)** - Mechanically extract 2-5 LEGO windows
3. **[Recency Bias](workflow/RECENCY_BIAS.md)** (optional) - Use 30-50% recent vocabulary for LEGOs #50+

### Level 3: Quality & Examples

- **[Good Baskets](examples/GOOD_BASKETS.md)** - Correct length, GATE compliance, natural phrases
- **[Bad Baskets](examples/BAD_BASKETS.md)** - Common mistakes (short phrases, future vocab, grammar errors)

### Level 4: Output Format

- **[Output Format](schemas/OUTPUT_FORMAT.md)** - JSON structure, zero-commentary requirement

## Quick Start

For a typical basket generation task:

1. Read [GATE_CONSTRAINT.md](rules/GATE_CONSTRAINT.md) - understand vocabulary ordering
2. Read [TILING_VALIDATION.md](rules/TILING_VALIDATION.md) - **CRITICAL: greedy search for GATE validation**
3. Read [PHRASE_LENGTH.md](rules/PHRASE_LENGTH.md) - understand phrase length requirements
4. Read [GENERATE_E_PHRASES.md](workflow/GENERATE_E_PHRASES.md) - generate natural sentences
5. Read [EXTRACT_D_PHRASES.md](workflow/EXTRACT_D_PHRASES.md) - extract fragments mechanically
6. Read [OUTPUT_FORMAT.md](schemas/OUTPUT_FORMAT.md) - format output correctly

## Common Mistakes (From Testing)

❌ **Making 3-4 word phrases when 7-10 words are possible**
- LEGO #126 has 125 LEGOs available → can make 7-10 word phrases
- Read [PHRASE_LENGTH.md](rules/PHRASE_LENGTH.md) to understand length guidelines

❌ **Using future vocabulary (GATE violation)**
- LEGO #50 cannot use LEGOs #51-2000
- **Must validate with greedy tiling** - see [TILING_VALIDATION.md](rules/TILING_VALIDATION.md)
- Read [GATE_CONSTRAINT.md](rules/GATE_CONSTRAINT.md) - this is absolute

❌ **Not using greedy search for COMPOSITE LEGOs**
- "esta tarde" (this afternoon) is 1 LEGO, not "esta" + "tarde" (2 LEGOs)
- Read [TILING_VALIDATION.md](rules/TILING_VALIDATION.md) - longest match first

❌ **Grammar errors in target language**
- Both languages must be grammatically perfect
- Read [GRAMMAR_PERFECTION.md](rules/GRAMMAR_PERFECTION.md) for language-specific rules

## Success Criteria

- ✓ GATE constraint: 100% compliance
- ✓ Grammar perfection: 100% (both languages)
- ✓ Phrase length: Matches available vocabulary (see PHRASE_LENGTH.md)
- ✓ E-phrase tiling: 100% (composes exactly from LEGOs)
- ✓ D-phrases contain operative: 100%
- ✓ Culminating LEGOs: first e-phrase = complete seed (100%)
- ✓ Naturalness: >95%
- ✓ Zero commentary in output

## Version History

**v1.0.0 (2025-10-30)**:
- Initial skill creation from phase_5_lego_baskets.md v3.0
- Progressive disclosure structure
- Explicit phrase length guidance (fixes common mistake)
- Modular rules for clarity
