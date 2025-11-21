# Phase 5 GATE Validator

**GATE** = **Grammar And Timing Enforcement**

Validates that practice phrases only use vocabulary that has been introduced in previous legos. Prevents "leaking" of future vocabulary into practice phrases.

## The Problem

Practice phrases sometimes use words that the learner hasn't been taught yet:

```
Basket S0010L01 (position 47 - only 47 legos learned so far):
  Phrase: "No estoy seguro si puedo hablar"
  Problem: Uses "si" (if) and "puedo" (I can) - not taught until later legos!
```

This breaks the pedagogical flow - learners shouldn't see words before they're formally introduced.

## Usage

### Report Violations
```bash
node tools/validators/phase5-gate-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_pairs.json \
  public/vfs/courses/spa_for_eng/lego_baskets.json
```

### Auto-Fix (Remove Violating Phrases)
```bash
node tools/validators/phase5-gate-validator.cjs \
  lego_pairs.json \
  lego_baskets.json \
  --fix
```

### Verbose Output
```bash
node tools/validators/phase5-gate-validator.cjs \
  lego_pairs.json \
  lego_baskets.json \
  --verbose
```

## How It Works

1. **Build Lego Registry** - Reads `lego_pairs.json` to create ordered list of all legos
2. **Build Vocabulary Map** - For each position, tracks cumulative vocabulary available
3. **Check Each Basket** - Ensures practice phrases only use words from legos 1 to current position
4. **Report/Fix** - Identifies violations and optionally removes violating phrases

## Example Output

```
🔍 GATE Validation

📚 Building lego registry from: lego_pairs.json
   Total legos: 2796
   Final vocabulary size: 1016 words

📦 Reading baskets: lego_baskets.json

======================================================================
📊 GATE VALIDATION REPORT
======================================================================

Total baskets checked: 2392
Total phrases checked: 21406
Lego registry size: 2796 legos

❌ GATE VIOLATIONS FOUND

Violations: 3463 phrases (16.2%)
Baskets affected: 1217

First 10 violations:

1. S0010L01 (position 47/2796):
   5/10 phrases have violations
   Example: "No estoy seguro si puedo hablar"
   Unknown words: si, puedo

2. S0012L01 (position 60/2796):
   1/10 phrases have violations
   Example: "no me gustaría adivinar algo"
   Unknown words: adivinar

...

Most common unknown words (top 20):
  dije: 69 violations
  pregunto: 56 violations
  tratando: 39 violations
  hacerlo: 38 violations
  ...

💡 Run with --fix to automatically remove violating phrases
======================================================================
```

## Integration with Phase 5 Server

### As a Pre-Merge Quality Gate

```javascript
const GateValidator = require('./tools/validators/phase5-gate-validator.cjs');

// After generating baskets, before merging
const validator = new GateValidator({ fix: true, verbose: false });
const result = validator.validate(
  './lego_pairs.json',
  './phase5_outputs/lego_baskets.json'
);

if (!result.valid) {
  console.error(`GATE violations: ${result.stats.violations}`);
  console.log(`Auto-fixed: removed ${result.stats.phrasesRemoved} phrases`);
}
```

### In Bash Scripts

```bash
#!/bin/bash
# phase5_merge.sh

echo "Running GATE validation..."
node tools/validators/phase5-gate-validator.cjs \
  public/vfs/courses/spa_for_eng/lego_pairs.json \
  public/vfs/courses/spa_for_eng/lego_baskets.json \
  --fix

if [ $? -ne 0 ]; then
  echo "⚠️  GATE violations found and fixed"
  # Continue with merge
fi
```

## Options

- `--fix` - Automatically remove violating phrases
- `--report-only` - Only report, don't fix (default)
- `--verbose` - Show detailed violation examples
- `--threshold N` - Allow up to N violations (default: 0)

## What Gets Removed with --fix

Only phrases that use words **not yet introduced** are removed. The validator:

1. Checks each practice phrase's Spanish text
2. Extracts all words from the phrase
3. Compares against vocabulary available up to current lego position
4. Removes phrases with unknown words

**Example:**
```
Basket S0010L01 (position 47):
  Available vocab: quiero, hablar, español, ahora, estoy, intentando, aprender, ...
  Phrase: "No estoy seguro si puedo hablar"
  Unknown: "si", "puedo"
  Action: Remove this phrase
```

## Word Matching Strategy

Currently uses **exact word matching** (lowercased, alphanumeric only).

### What This Means

- "hablar" (taught) matches "hablar" in phrases ✓
- "hablar" (taught) does NOT match "hablo" (conjugation) ✗

### Future Enhancement

Consider adding stemming/lemmatization for Spanish to handle:
- Conjugations: hablar → hablo, hablas, habla, etc.
- Gender/number: bueno → buena, buenos, buenas
- Verb forms: tener → tengo, tienes, tiene, etc.

For now, conservative exact matching prevents false positives.

## Exit Codes

- `0` - No violations (or within threshold)
- `1` - Violations found

## Real-World Stats (spa_for_eng)

Based on scan of current `lego_baskets.json`:

- **Total phrases:** 21,406
- **GATE violations:** 3,463 (16.2%)
- **Baskets affected:** 1,217 (51%)
- **Most common unknowns:** dije, pregunto, tratando, hacerlo

This suggests many practice phrases were generated without strict vocabulary control.

## Recommendations

1. **Run before every merge** - Make this a required quality gate
2. **Use --fix in development** - Remove violations automatically
3. **Track violations over time** - Should decrease as generation improves
4. **Review common unknowns** - If same words keep appearing, check generation logic

## Technical Details

### Vocabulary Registry

The validator builds a cumulative vocabulary map:

```
Position 1: [quiero]
Position 2: [quiero, hablar]
Position 3: [quiero, hablar, español]
...
Position 2796: [all 1016 unique words]
```

### Memory Efficiency

- Uses Sets for O(1) vocabulary lookups
- Stores cumulative vocab at each position (small overhead)
- Processes ~20K phrases in <1 second

### False Positives

Rare, but possible:
- Same word in different contexts (homonyms)
- Acceptable word forms not recognized (conjugations)

If you see suspicious violations, review with `--verbose`.

## See Also

- `phase5-baskets-validator.cjs` - Checks duplicates and phrase quality
- `course-validator.cjs` - Overall course structure validation
- `phase-deep-validator.cjs` - Deep phase-specific checks
