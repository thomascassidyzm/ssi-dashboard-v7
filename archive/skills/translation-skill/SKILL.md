---
name: translation-skill
description: Pedagogical translation for SSi language courses. Applies zero-variation principle, cognate preference, and grammatical simplicity to create optimized learning material. Use when translating canonical seeds into target/known language pairs.
version: 2.6.0
---

# Translation Skill (Phase 1)

Translate canonical concepts into pedagogically optimized target/known language pairs.

## Quick Reference

**Input**: 668 canonical seed concepts (English reference format)
**Output**: `seed_pairs.json` with pedagogically optimized translations

**Core Philosophy**: Enable learners to produce fluent target language from day one through **functional determinism** (zero variation in early seeds).

## Progressive Disclosure

### Level 1: TWO ABSOLUTE RULES ⚠️ (READ FIRST - NEVER VIOLATE)

**These override ALL other heuristics:**

1. **[NEVER CHANGE CANONICAL MEANING](rules/TWO_ABSOLUTE_RULES.md#rule-1)** - Even to avoid complex grammar
2. **[COGNATE PREFERENCE FOR SEEDS 1-100](rules/TWO_ABSOLUTE_RULES.md#rule-2)** - Mandatory, builds semantic networks

### Level 2: Core Principles

**Critical for seeds 1-100:**

1. **[Zero Variation Principle](rules/ZERO_VARIATION.md)** - One concept = ONE word (first-come-first-served)
2. **[Cognate Preference](rules/COGNATE_PREFERENCE.md)** - Check cognates FIRST, use synonyms to match
3. **[Grammatical Simplicity](rules/GRAMMATICAL_SIMPLICITY.md)** - Avoid subjunctive when meaning permits

### Level 3: Workflow

1. **[Extended Thinking Protocol](workflow/EXTENDED_THINKING.md)** - MANDATORY for every seed translation
2. **[Translation Workflow](workflow/TRANSLATION_WORKFLOW.md)** - Step-by-step process
3. **[Vocabulary Registry](workflow/VOCABULARY_REGISTRY.md)** - Maintain consistency tracking

### Level 4: Examples & Edge Cases

- **[Learning by Example](examples/LEARNING_BY_EXAMPLE.md)** - Multi-language translation thinking
- **[Language-Specific Rules](examples/LANGUAGE_SPECIFIC.md)** - Spanish, French, Italian, Mandarin patterns
- **[Grammatical Mismatches](examples/GRAMMATICAL_MISMATCHES.md)** - Gender, articles, aspect handling

### Level 5: Output

- **[Output Format](schemas/OUTPUT_FORMAT.md)** - JSON structure for seed_pairs.json

## Quick Start (Typical Translation Task)

For translating a batch of seeds:

1. **Read [TWO_ABSOLUTE_RULES.md](rules/TWO_ABSOLUTE_RULES.md)** - Never violate these
2. **Read [ZERO_VARIATION.md](rules/ZERO_VARIATION.md)** - Understand first-come-first-served
3. **Read [COGNATE_PREFERENCE.md](rules/COGNATE_PREFERENCE.md)** - Check cognates FIRST for seeds 1-100
4. **Read [EXTENDED_THINKING.md](workflow/EXTENDED_THINKING.md)** - Use for EVERY seed
5. **Read [LEARNING_BY_EXAMPLE.md](examples/LEARNING_BY_EXAMPLE.md)** - See thinking patterns

Then translate using extended thinking for each seed.

## Common Mistakes (From Testing)

❌ **Back-translating English** - If known is English, use canonical directly (don't back-translate)
❌ **Changing meaning to simplify grammar** - Use subjunctive if canonical requires it (see S0015 example)
❌ **Skipping cognate check** - ALWAYS check cognate FIRST for seeds 1-100 (see S0003: frecuentemente)
❌ **Introducing variation** - Once "intentar" = "to try", NEVER use "tratar" in seeds 1-100
❌ **Missing extended thinking** - Without it, ~30% inconsistent translations

## Success Criteria

- ✓ TWO ABSOLUTE RULES never violated
- ✓ Zero variation enforced (vocabulary registry maintained)
- ✓ Cognate preference applied to seeds 1-100 (semantic network building)
- ✓ Grammatical simplicity where meaning permits (no unnecessary subjunctive)
- ✓ Extended thinking used for EVERY seed translation
- ✓ If English is target OR known: canonical used directly (no back-translation)
- ✓ Grammar perfect in BOTH languages
- ✓ All 668 seeds translated consistently

## Core Philosophy Summary

**Three-Way Tension**: Naturalness vs Transparency vs Consistency

**Resolution for Seeds 1-100**: **Consistency trumps naturalness**

- Cognitive fluency > Native perfection
- Automatic retrieval > Comprehensive vocabulary
- Zero variation > Natural alternatives
- Cognates build semantic networks (not just ease)

After seed 100, natural variation can be gradually introduced.

## Version History

**v2.6.0 (2025-10-30)**:
- Initial skill creation from phase_1_seed_pairs.md v2.6
- Progressive disclosure structure
- Modular rules for clarity
- Critical rules elevated to Level 1

**Source**: docs/phase_intelligence/phase_1_seed_pairs.md v2.6 🔒 LOCKED
