# Phase 5 Validators

Quality gates for Phase 5 basket generation.

## Available Validators

### 1. Baskets Quality Validator
**File:** `phase5-baskets-validator.cjs`

Checks for:
- ✅ Duplicate phrases (auto-fixable)
- ⚠️ Partial matches / typos (manual review)
- ✅ Missing lego content (auto-fixable)

```bash
node tools/validators/phase5-baskets-validator.cjs lego_baskets.json --fix
```

[Full documentation →](./README-phase5-validator.md)

---

### 2. GATE Validator
**File:** `phase5-gate-validator.cjs`

**GATE** = Grammar And Timing Enforcement

Ensures practice phrases only use vocabulary from legos already taught.

Checks for:
- ✅ Vocabulary leakage (auto-fixable)
- Unknown words appearing before they're introduced

```bash
node tools/validators/phase5-gate-validator.cjs lego_pairs.json lego_baskets.json --fix
```

[Full documentation →](./README-gate-validator.md)

---

## Quick Start

### 1. Quality Check (duplicates, missing content)
```bash
node tools/validators/phase5-baskets-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_baskets.json
```

### 2. GATE Check (vocabulary timing)
```bash
node tools/validators/phase5-gate-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_pairs.json \
  public/vfs/courses/spa_for_eng/lego_baskets.json
```

### 3. Fix All Issues
```bash
# Fix quality issues
node tools/validators/phase5-baskets-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_baskets.json --fix

# Fix GATE violations
node tools/validators/phase5-gate-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_pairs.json \
  public/vfs/courses/spa_for_eng/lego_baskets.json --fix
```

---

## Integration Example

### In Phase 5 Processing Script

```javascript
const BasketsValidator = require('./tools/validators/phase5-baskets-validator.cjs');
const GateValidator = require('./tools/validators/phase5-gate-validator.cjs');

async function validateAndFixBaskets() {
  console.log('Running quality checks...');

  // 1. Quality check
  const qualityValidator = new BasketsValidator({ fix: true });
  const qualityResult = qualityValidator.validate('./lego_baskets.json');

  if (!qualityResult.valid) {
    console.log(`Quality issues fixed: ${qualityResult.stats.duplicatesRemoved + qualityResult.stats.unrelatedPhrasesRemoved} items`);
  }

  // 2. GATE check
  const gateValidator = new GateValidator({ fix: true });
  const gateResult = gateValidator.validate('./lego_pairs.json', './lego_baskets.json');

  if (!gateResult.valid) {
    console.log(`GATE violations fixed: ${gateResult.stats.phrasesRemoved} phrases removed`);
  }

  return qualityResult.valid && gateResult.valid;
}
```

### As Merge Quality Gate

```bash
#!/bin/bash
# phase5_merge_with_validation.sh

set -e

PAIRS="public/vfs/courses/spa_for_eng/lego_pairs.json"
BASKETS="public/vfs/courses/spa_for_eng/lego_baskets.json"

echo "================================"
echo "Phase 5 Validation & Merge"
echo "================================"

# Step 1: Quality validation
echo ""
echo "1. Running quality validation..."
node tools/validators/phase5-baskets-validator.cjs "$BASKETS" --fix

if [ $? -ne 0 ]; then
  echo "⚠️  Quality issues found (partial matches - review recommended)"
fi

# Step 2: GATE validation
echo ""
echo "2. Running GATE validation..."
node tools/validators/phase5-gate-validator.cjs "$PAIRS" "$BASKETS" --fix

if [ $? -ne 0 ]; then
  echo "❌ GATE violations found and fixed"
fi

# Step 3: Merge
echo ""
echo "3. Merging to main..."
# ... your merge logic here ...

echo ""
echo "✅ Validation and merge complete!"
```

---

## Validation Pipeline

Recommended order:

1. **Generate baskets** (AI or script)
2. **Quality validator** - Remove duplicates and unrelated phrases
3. **GATE validator** - Remove vocabulary violations
4. **Manual review** - Check partial matches if any
5. **Merge to main** - Once clean

---

## Current Stats (spa_for_eng)

### Quality Issues
- Duplicates: ~0 (cleaned)
- Partial matches: 12 (punctuation variants)
- Missing lego: ~0 (cleaned)

### GATE Violations
- **Total phrases:** 21,406
- **Violations:** 3,463 (16.2%)
- **Baskets affected:** 1,217 (51%)
- **Action:** Run GATE validator with --fix

---

## Common Issues

### Issue: "Basket not found in lego registry"
**Cause:** Basket ID doesn't exist in lego_pairs.json
**Fix:** Remove orphaned basket or regenerate

### Issue: "High GATE violation rate"
**Cause:** Practice phrases generated without vocabulary control
**Fix:** Run with --fix to remove violations, update generation logic

### Issue: "Partial matches with punctuation"
**Cause:** Inconsistent punctuation in generation
**Fix:** Manual review and standardization, or update generation prompts

---

## Exit Codes

Both validators return:
- `0` - Validation passed
- `1` - Issues found (check output for details)

---

## See Also

- Course validator: `course-validator.cjs`
- Phase deep validator: `phase-deep-validator.cjs`
- Haiku quality gate: `haiku_quality_gate.py`
