# SSI Baskets Validation Scripts

This directory contains automated validation scripts for checking the quality and correctness of LEGO baskets in SSI courses.

## Scripts Overview

### 1. `run-all-checks.js` (Recommended)
Master script that runs all validation checks in sequence.

```bash
node scripts/validation/run-all-checks.js [course_path]
node scripts/validation/run-all-checks.js public/vfs/courses/spa_for_eng
```

### 2. `check-gate-violations.js`
Validates GATE compliance - ensures practice phrases only use LEGOs and patterns that are available at that point in the curriculum.

**What it checks:**
- LEGO count doesn't exceed available LEGOs
- Patterns used are in the available patterns list
- gate_compliance field exists

```bash
node scripts/validation/check-gate-violations.js [course_path]
```

**Exit codes:**
- 0: No violations found
- 1: Violations detected

### 3. `check-speakability.js`
Analyzes phrases with 4+ LEGOs for speakability issues in both languages.

**What it checks:**
- KNOWN language (English) grammar issues
  - Gerund violations (e.g., "to speaking")
  - Double "to" errors
  - Awkward constructions
- TARGET language (Spanish) grammar issues
  - Missing prepositions (e.g., "un poco español" → "un poco de español")
  - Double articles
- General issues
  - Very long phrases without conjunctions
  - Excessive length
  - Repetitive words

```bash
node scripts/validation/check-speakability.js [course_path]
```

**Issue Severity:**
- HIGH: Critical grammar errors (exit code 1)
- MEDIUM: Awkward phrasing, missing conjunctions (warning)
- LOW: Style suggestions (info)

### 4. `check-conjunctions.js`
Focuses specifically on conjunction usage in longer phrases to ensure natural flow.

**What it checks:**
- Missing conjunctions in long phrases (6+ LEGOs)
- Conjunction mismatch between languages
- Excessive conjunctions in short phrases
- Natural multi-clause construction

**Recognized conjunctions:**

English:
- Coordinating: and, but, or, nor, for, yet, so
- Subordinating: if, when, while, because, although, etc.

Spanish:
- Coordinating: y, e, pero, o, u, ni, mas, sino
- Subordinating: si, cuando, mientras, porque, aunque, etc.

```bash
node scripts/validation/check-conjunctions.js [course_path]
```

## Usage Examples

### Check all baskets in spa_for_eng course
```bash
node scripts/validation/run-all-checks.js public/vfs/courses/spa_for_eng
```

### Check specific validation type
```bash
node scripts/validation/check-gate-violations.js public/vfs/courses/spa_for_eng
node scripts/validation/check-speakability.js public/vfs/courses/spa_for_eng
node scripts/validation/check-conjunctions.js public/vfs/courses/spa_for_eng
```

### Check different course
```bash
node scripts/validation/run-all-checks.js public/vfs/courses/zho_for_eng
```

## Output Format

All scripts provide:
- Colored terminal output for easy reading
- Summary statistics
- Detailed issue breakdown
- Severity levels for prioritization

### Color Coding
- 🟢 Green: Pass / Good examples
- 🟡 Yellow: Warnings / Medium severity
- 🔴 Red: Failures / High severity
- 🔵 Blue: Informational
- 🟣 Magenta: Target language text
- 🔷 Cyan: Known language text

## Exit Codes

All scripts follow standard exit code conventions:
- **0**: All checks passed (or only LOW/MEDIUM severity issues)
- **1**: Critical issues found (HIGH severity or gate violations)

This allows integration with CI/CD pipelines:
```bash
if node scripts/validation/run-all-checks.js public/vfs/courses/spa_for_eng; then
  echo "Validation passed!"
else
  echo "Validation failed!"
  exit 1
fi
```

## File Structure

```
scripts/validation/
├── README.md                    # This file
├── run-all-checks.js            # Master script
├── check-gate-violations.js     # GATE compliance checker
├── check-speakability.js        # Speakability analyzer
└── check-conjunctions.js        # Conjunction usage checker
```

## Requirements

- Node.js (v12 or higher)
- Basket files must be in `[course_path]/baskets/` directory
- Basket files must follow naming pattern: `lego_baskets_s####.json`

## Development

To add new validation rules:

1. Choose the appropriate script based on what you're checking
2. Add the validation logic to the relevant patterns array
3. Test with the full spa_for_eng corpus
4. Update this README with the new check

## Notes

- Scripts are designed to handle all 100 baskets in spa_for_eng
- Performance is optimized for batch processing
- All scripts can run independently or via the master script
- Results are deterministic - same input always produces same output
