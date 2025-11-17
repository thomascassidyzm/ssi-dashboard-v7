# Phase 5 Cascade Impact: LEGO Chunking-Up Remediation

## The Challenge

When Phase 3 LEGO registry collisions are remediated through **chunking-up**, the changes cascade into Phase 5 (basket generation), requiring basket regeneration.

## Why Baskets Must Regenerate

### LEGO Dependency Chain

**Phase 3 → Phase 5 dependency:**
```
Phase 3: Extract LEGOs from seeds
    ↓
Phase 5: Group LEGOs into baskets (thematic learning units)
```

When a LEGO is re-extracted with chunking-up:
- The LEGO's `known` field changes (larger molecular unit)
- The LEGO's `target` field changes (larger molecular unit)
- Baskets that referenced the original LEGO now reference **outdated content**

### Example: "you are correct" Collision

**Before chunking-up (collision detected):**
```json
S0042L05: {
  "target": "你是对的",
  "known": "you are correct",
  "id": "S0042L05"
}

S0087L12: {
  "target": "你们是对的",
  "known": "you are correct",  ← COLLISION!
  "id": "S0087L12"
}
```

**After chunking-up S0087 (collision resolved):**
```json
S0042L05: {
  "target": "你是对的",
  "known": "you are correct",
  "id": "S0042L05"
}

S0087L12: {
  "target": "我觉得你们是对的",        ← Changed!
  "known": "I think you are correct",  ← Changed!
  "id": "S0087L12"
}
```

**Basket impact:**
If a basket previously grouped S0087L12 with other LEGOs about "correctness", it now needs to reconsider:
- Does "I think you are correct" still fit this basket theme?
- Should it move to a different basket (e.g., "expressing opinions")?
- Does the basket title/description still make sense?

## Cascade Scope Assessment

### Spanish Course (spa_for_eng)
- **96 colliding LEGO pairs** detected
- **237 seeds** affected (35% of 679 seeds)
- **Estimated baskets requiring regeneration**: ~15-20 baskets
  - Assuming 10-15 LEGOs per basket
  - 237 LEGOs / 12 LEGOs per basket ≈ 20 baskets

### Chinese Course (cmn_for_eng)
- **125 colliding LEGO pairs** detected
- **312 seeds** affected (47% of 662 seeds)
- **Estimated baskets requiring regeneration**: ~25-30 baskets
  - Assuming 10-15 LEGOs per basket
  - 312 LEGOs / 12 LEGOs per basket ≈ 26 baskets

### Critical Zone: First 100 Seeds
- **Spanish**: 32 collisions in S0001-S0100 → ~3 baskets affected
- **Chinese**: 60 collisions in S0001-S0100 → ~5 baskets affected

**Priority**: First 100 seeds are most critical for learner experience. These baskets should be regenerated first.

## Remediation Workflow

### Option A: Full Regeneration (Safest)
```
1. Detect LEGO registry collisions (Phase 3.6 validator)
2. Generate re-extraction manifest with affected seed IDs
3. Re-run Phase 3 for affected seeds with chunking-up instructions
4. Run deduplication (Phase 3.5)
5. **DELETE all baskets** (Phase 5 output)
6. Re-run Phase 5 for entire course
7. Re-run Phase 6 (seed_instructions) if baskets changed
8. Re-run Phase 8 (audio) if seed_instructions changed
```

**Pros**: Clean slate, no orphaned references
**Cons**: Expensive (regenerates ALL baskets, even unaffected ones)

### Option B: Selective Regeneration (Efficient)
```
1. Detect LEGO registry collisions (Phase 3.6 validator)
2. Generate re-extraction manifest with affected seed IDs
3. Identify which baskets contain affected LEGOs:
   - Read baskets.json
   - For each basket, check if any LEGO ID matches affected seeds
   - Track: basket_id → [affected_lego_ids]
4. Re-run Phase 3 for affected seeds with chunking-up instructions
5. Run deduplication (Phase 3.5)
6. **DELETE only affected baskets** from baskets.json
7. Re-run Phase 5 ONLY for affected baskets
8. Merge regenerated baskets back into baskets.json
9. Re-run Phase 6 for affected seeds
10. Re-run Phase 8 for affected seeds
```

**Pros**: Faster, preserves unaffected work
**Cons**: Complex dependency tracking, risk of edge cases

### Recommended: Hybrid Approach
```
IF (affected_baskets < 30% of total):
  Use Option B (selective regeneration)
ELSE:
  Use Option A (full regeneration)
```

**Rationale**:
- Spanish: 20/~100 baskets ≈ 20% → **Selective regeneration**
- Chinese: 26/~100 baskets ≈ 26% → **Selective regeneration**
- If collision rate ever exceeds 30%, full regeneration is cleaner

## Implementation Requirements

### 1. Basket Dependency Tracker
**New script**: `scripts/validation/track-basket-dependencies.cjs`

**Purpose**: Map LEGOs → Baskets to identify cascade impact

```javascript
// Input: lego_pairs.json, baskets.json, re-extraction manifest
// Output: basket_regeneration_manifest.json

{
  "affected_baskets": [
    {
      "basket_id": "B0003",
      "affected_legos": ["S0042L05", "S0087L12"],
      "reason": "Contains LEGOs with registry collisions"
    }
  ],
  "regeneration_strategy": "selective", // or "full"
  "estimated_time": "5 minutes"
}
```

### 2. Orchestrator Enhancement
**File**: `services/orchestration/orchestrator.cjs`

**Add Phase 3.6 validation step:**
```javascript
if (phase === 3) {
  // Run LEGO-level validators (existing)
  const validationPassed = await runPhaseValidation(courseCode, phase);

  if (!validationPassed) {
    // Generate basket dependency analysis
    const basketAnalysisPath = path.join(__dirname, '../../scripts/validation/track-basket-dependencies.cjs');
    execSync(`node "${basketAnalysisPath}" "${courseCode}"`, { stdio: 'inherit' });

    // Present user with cascade impact
    console.log('\n⚠️  LEGO COLLISION CASCADE IMPACT:');
    console.log('   - LEGOs require chunking-up remediation');
    console.log('   - Affected baskets will need regeneration');
    console.log('   - See basket_regeneration_manifest.json for details\n');

    // User decision point
    if (checkpointMode === 'manual') {
      // Wait for user to:
      // 1. Review cascade impact
      // 2. Approve remediation strategy
      // 3. Trigger re-extraction + basket regeneration
    }
  }
}
```

### 3. Re-extraction Manifest Enhancement
**File**: `scripts/validation/check-lego-fd-violations.cjs`

**Add cascade awareness to manifest:**
```javascript
const reExtractionManifest = {
  reason: 'FD_VIOLATIONS',
  affected_seeds: Array.from(affectedSeeds).sort(),
  cascade_impact: {
    phase_5_baskets: 'REGENERATION_REQUIRED',
    phase_6_instructions: 'REGENERATION_REQUIRED_IF_BASKETS_CHANGE',
    phase_8_audio: 'REGENERATION_REQUIRED_IF_INSTRUCTIONS_CHANGE'
  },
  violations_by_seed: { /* ... */ }
};
```

## Testing Strategy

### Test Case 1: Single Basket Impact
```
1. Identify one basket with known collision
2. Re-extract affected seed with chunking-up
3. Verify basket regenerates correctly
4. Verify unaffected baskets remain unchanged
```

### Test Case 2: Cross-Basket LEGO Movement
```
1. LEGO originally in "correctness" basket
2. After chunking to "I think you are correct"
3. Verify it moves to "opinions" basket
4. Verify basket titles/descriptions update
```

### Test Case 3: Full Course Regeneration
```
1. Run collision detection on Spanish course
2. Generate basket dependency manifest
3. Execute selective regeneration
4. Verify all 20 affected baskets regenerate
5. Verify 80 unaffected baskets unchanged
```

## Open Questions

1. **Basket stability**: How often do LEGOs move between baskets after chunking?
2. **Cascade depth**: Do Phase 6 seed_instructions need regeneration even if basket LEGOs just get longer?
3. **Audio impact**: If LEGO changes from "你是对的" to "我觉得你们是对的", does audio need re-recording?
4. **Deduplication impact**: After chunking, will new molecular LEGOs create NEW deduplications?

## Next Steps

1. Implement `track-basket-dependencies.cjs` script
2. Test on first 100 seeds of Spanish course (32 collisions → ~3 baskets)
3. Measure actual cascade impact vs estimates
4. Decide between selective vs full regeneration
5. Update orchestrator with cascade detection
6. Document Phase 6/8 cascade rules
