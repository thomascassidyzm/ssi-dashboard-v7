# Master Prompt Improvement Plan

**Created**: 2025-11-09
**Status**: Planning Phase
**Priority**: Methodology Work (separate from code infrastructure)

---

## Context

The current execution modes (Web/Local/API) use phase-specific brief generators:
- `generatePhase1Brief()` - Pedagogical Translation
- `generatePhase3Brief()` - LEGO Extraction
- `generatePhase5Brief()` - Practice Baskets

These prompts work, but could be improved for better:
1. **Consistency** across execution modes
2. **Clarity** of instructions
3. **Quality** of outputs
4. **Error handling** and recovery

---

## Current Prompt Architecture

### Phase 1: Translation Brief (lines 212-294 in automation_server.cjs)

**Current approach**:
```markdown
# Phase 1: Pedagogical Translation

**Course**: spa_for_eng_s0001-0030
**Target Language**: spa
**Known Language**: eng
**Seed Range**: S0001-S0030 (30 seeds)

## Your Task
Translate seeds following Phase 1 intelligence.

**Fetch Instructions**: GET [ngrok URL]/phase-intelligence/1
**Fetch Seeds**: GET [ngrok URL]/api/seeds?limit=30

## Output Format
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "translations": { ... }
}
```

**Issues**:
- Relies on external Phase Intelligence fetch (ngrok required)
- No inline examples of good translations
- Limited error recovery guidance

### Phase 3: LEGO Extraction Brief (lines 296-450)

**Current approach**:
```markdown
# Phase 3: LEGO Extraction

**Input**: seed_pairs.json
**Output**: lego_pairs.json

Fetch Phase 3 intelligence from [ngrok URL]
```

**Issues**:
- Same external dependency problem
- LEGO extraction methodology not embedded
- No validation criteria

### Phase 5: Practice Baskets Brief (lines 452-600)

**Current approach**:
```markdown
# Phase 5: Practice Baskets

For each seed, generate practice phrases using LEGOs.
```

**Issues**:
- Most complex phase with least guidance
- No diversity requirements specified
- Missing quality criteria

---

## Improvement Goals

### 1. **Self-Contained Prompts**
- Embed full methodology inline (no external fetches)
- Include Phase Intelligence directly in prompt
- Work offline/locally without ngrok

### 2. **Better Examples**
- Show 3-5 examples of perfect output
- Demonstrate common mistakes to avoid
- Include edge cases (cognates, idioms, etc.)

### 3. **Quality Criteria**
- Explicit validation rules
- Self-check instructions
- Error recovery steps

### 4. **Consistency Across Modes**
- Same methodology for Web/Local/API
- Only execution differs, not intelligence
- Single source of truth for each phase

---

## Proposed Structure

### Template: Self-Contained Phase Prompt

```markdown
# Phase X: [Phase Name]

## Context
**Course**: [course_code]
**Seeds**: [range]
**Previous Phase Output**: [file]
**Your Output**: [file]

## Methodology (Embedded)

[Full Phase Intelligence content here - no external fetch]

### Key Principles
1. [Principle 1]
2. [Principle 2]
3. [Principle 3]

### Common Pitfalls
- ❌ [Bad practice 1]
- ❌ [Bad practice 2]
- ✅ [Good practice instead]

## Examples

### Example 1: [Scenario]
**Input**: [data]
**Output**: [result]
**Why**: [explanation]

### Example 2: [Scenario]
**Input**: [data]
**Output**: [result]
**Why**: [explanation]

## Your Task

[Specific instructions for this batch]

### Validation Checklist
- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

### Output Format
```json
{
  "version": "7.7.0",
  ...
}
```

## Error Recovery

If [problem], then [solution].

## Success Criteria
✅ [Criterion 1]
✅ [Criterion 2]
✅ [Criterion 3]
```

---

## Implementation Tasks

### Phase 1: Embed Translation Methodology

**Source**: `docs/phase_intelligence/phase_1_orchestrator.md`

**Tasks**:
1. Copy full Phase 1 intelligence into brief template
2. Add 5 examples of perfect translations
3. Add cognate recognition examples
4. Add {target} placeholder handling examples
5. Add zero-variation ("First Word Wins") examples
6. Remove ngrok dependency

**Files to modify**:
- `automation_server.cjs:212-294` (generatePhase1Brief)

### Phase 3: Embed LEGO Extraction Methodology

**Source**: `docs/phase_intelligence/phase_3_lego_pairs.md`

**Tasks**:
1. Embed complete LEGO extraction rules
2. Add examples of Type A/B/C LEGOs
3. Add examples of boundary detection
4. Add validation criteria (min/max LEGOs per seed)
5. Show tiling examples
6. Remove ngrok dependency

**Files to modify**:
- `automation_server.cjs:296-450` (generatePhase3Brief)

### Phase 5: Embed Practice Basket Methodology

**Source**: `docs/phase_intelligence/phase_5_lego_baskets.md`

**Tasks**:
1. Embed diversity requirements
2. Add examples of good vs bad practice phrases
3. Add LEGO recombination examples
4. Specify min phrases per basket (5-10)
5. Add natural language generation guidelines
6. Remove ngrok dependency

**Files to modify**:
- `automation_server.cjs:452-600` (generatePhase5Brief)

### Testing

For each improved prompt:
1. Test with Web mode (30 seeds)
2. Test with API mode (30 seeds)
3. Compare outputs for consistency
4. Validate against existing courses
5. Check execution time changes

---

## Success Metrics

### Before Improvement
- Prompts: ~50 lines each
- External dependencies: 3 (ngrok URLs)
- Examples: 0-1 per phase
- Error guidance: Minimal

### After Improvement
- Prompts: ~200-300 lines each (embedded intelligence)
- External dependencies: 0
- Examples: 5+ per phase
- Error guidance: Comprehensive

### Quality Improvements
- Reduced translation errors
- More consistent LEGO extraction
- Better practice phrase diversity
- Faster debugging (no external fetch failures)

---

## Timeline Estimate

- Phase 1 prompts: 2-3 hours
- Phase 3 prompts: 2-3 hours
- Phase 5 prompts: 3-4 hours
- Testing all modes: 2 hours
- **Total**: ~10-12 hours

---

## Next Steps

1. **Read Phase Intelligence files**:
   - `docs/phase_intelligence/phase_1_orchestrator.md`
   - `docs/phase_intelligence/phase_3_lego_pairs.md`
   - `docs/phase_intelligence/phase_5_lego_baskets.md`

2. **Create improved prompt templates** with embedded methodology

3. **Test with small batches** (30 seeds) to validate

4. **Roll out to all execution modes** once validated

---

## Notes

- This is **methodology work**, not infrastructure code
- Can be done in parallel with other development
- Improves quality without changing architecture
- Makes system more robust and offline-capable
- Reduces external dependencies (ngrok)

---

**Generated**: 2025-11-09
**Author**: Claude (Sonnet 4.5)
**Status**: Ready for implementation
