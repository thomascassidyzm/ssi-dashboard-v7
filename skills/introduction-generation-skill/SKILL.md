---
name: introduction-generation-skill
description: Generate natural language presentation text for LEGO pairs in SSi courses. Introduces each language component to learners with context.
version: 1.0.0
---

# Introduction Generation Skill

Generate presentation text for SSi course LEGOs.

## Quick Reference

**Input**: `lego_pairs.json` (LEGO breakdowns from Phase 3)
**Output**: JSON object `{LEGO_ID: "presentation text"}`

**Critical**: Write to file, return confirmation only (avoid token limits)

## Progressive Disclosure

### Level 1: Critical Rules
1. **[Intro Format](rules/INTRO_FORMAT.md)** - BASE vs COMPOSITE presentation styles
2. **[Seed Context](rules/SEED_CONTEXT.md)** - Always include "as in {seed sentence}"
3. **[Output Format](schemas/OUTPUT_FORMAT.md)** - Write file, return confirmation

### Level 2: Examples
- **[Examples](examples/EXAMPLES.md)** - Good vs bad introductions

## Common Mistakes
- Missing seed context
- Returning full JSON (token limit)
- Wrong component grammar

## Success Criteria
- Every LEGO has exactly one intro
- BASE LEGOs use simple format
- COMPOSITE LEGOs explain components
- All include seed context
- Written to file with confirmation only
