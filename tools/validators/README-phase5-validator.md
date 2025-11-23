# Phase 5 Baskets Validator

Validates `lego_baskets.json` for quality issues and can automatically fix them.

## Usage

### Report Only (default)
```bash
node tools/validators/phase5-baskets-validator.cjs path/to/lego_baskets.json
```

### Auto-fix Issues
```bash
node tools/validators/phase5-baskets-validator.cjs path/to/lego_baskets.json --fix
```

### Verbose Output
```bash
node tools/validators/phase5-baskets-validator.cjs path/to/lego_baskets.json --verbose
```

## What It Checks

### 1. **Duplicate Phrases** ❌ Auto-fixable
Identical phrases in both languages appearing multiple times in the same basket.

**Example:**
```
Basket S0249L02 has:
  - "I want you to help me before you go" / "Quiero que me ayudes antes de que te vayas" (3x)
```

**Fix:** Removes duplicates, keeping first occurrence.

### 2. **Partial Matches** ⚠️ Manual review required
Same text in one language but different in the other (usually punctuation or typos).

**Example:**
```
Basket S0250L01 has:
  - "Can you tell me" / "Puedes decirme"
  - "Can you tell me" / "¿Puedes decirme?"  (different punctuation)
```

**Fix:** Not auto-fixed. These need manual review to choose the correct version.

### 3. **Missing Lego Content** ❌ Auto-fixable
Practice phrases that don't contain the lego they're supposed to practice.

**Example:**
```
Basket S0001L07:
  Lego: "now" / "ahora"
  Phrase: "I want to speak Spanish" (no "now" or "ahora")
```

**Fix:** Removes completely unrelated phrases (where lego appears in NEITHER language).

## Integration with Phase 5 Server

### In Your Phase 5 Processing Script

```javascript
const BasketsValidator = require('./tools/validators/phase5-baskets-validator.cjs');

// After generating baskets, validate them
const validator = new BasketsValidator({ fix: true, verbose: false });
const result = validator.validate('./phase5_outputs/lego_baskets.json');

if (!result.valid) {
  console.error('Validation issues found:', result.stats);
  // Decide: fail the build or continue with warnings
}
```

### As a Quality Gate

```bash
#!/bin/bash
# In your phase 5 merge script

echo "Validating baskets..."
node tools/validators/phase5-baskets-validator.cjs public/vfs/courses/spa_for_eng/lego_baskets.json --fix

if [ $? -ne 0 ]; then
  echo "⚠️  Validation found issues (partial matches - manual review recommended)"
  # Continue but warn
fi
```

## Exit Codes

- `0` - Validation passed (no issues)
- `1` - Validation failed (issues found)

## Output Example

```
🔍 Validating: lego_baskets.json

======================================================================
📊 VALIDATION REPORT
======================================================================

Total baskets: 2392

✅ No duplicate phrases found

⚠️  PARTIAL MATCHES (potential typos): 12
   Baskets affected: 12
   ⚠️  Manual review recommended

✅ All phrases contain their lego content

======================================================================
✅ VALIDATION PASSED
======================================================================
```

## Common Workflow

1. **Generate Phase 5 baskets** (AI agent or script)
2. **Run validator with --fix** to clean up obvious issues
3. **Review partial matches** manually if any
4. **Merge to main** when clean

## Notes

- Keeps first occurrence when removing duplicates
- Only removes phrases completely unrelated to the lego (missing in BOTH languages)
- Punctuation variants are flagged but not auto-fixed
- Safe to run multiple times (idempotent)
