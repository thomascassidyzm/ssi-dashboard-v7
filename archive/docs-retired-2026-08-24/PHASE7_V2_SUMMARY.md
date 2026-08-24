# Phase 7 - Manifest Compilation

**Status:** Active ✅
**Type:** Standalone Script
**Location:** `scripts/phase7-compile-manifest-v3.cjs`
**Version:** 3.0 (APML v10.0.0)

## Overview

Phase 7 compiles all previous phase outputs into a final course manifest that matches the Italian reference format exactly.

## Input Files

1. `lego_pairs.json` (Phase 2 - contains seeds, LEGOs with types and components)
2. `lego_baskets.json` (Phase 3 - practice phrases)
3. `seed_pairs.json` (optional - fallback for seed sentences)
4. `welcomes.json` (canonical)
5. `eng_encouragements.json` (canonical)

## Output

**Primary:** `course_manifest.json`

**Backup:** `{Target}_for_{Known}_speakers_COURSE_{YYYYMMDD_HHMMSS}.json`

**Example:** `Spanish_for_English_speakers_COURSE_20251203_094532.json`

## Key Features

### Audio Roles (CRITICAL - Only 5 Valid Roles)

| Role | Description | Count Per Text |
|------|-------------|----------------|
| `source` | English/known language text | 1 entry |
| `target1` | Target language (female voice) | 1 entry |
| `target2` | Target language (male voice) | 1 entry |
| `presentation` | LEGO introduction text | 1 entry |
| `presentation_encouragement` | Encouragement messages | 1 entry |

**Critical:** Every target language text MUST have TWO entries (target1 + target2).

### Practice Phrase Ordering

1. **Components** (M-type LEGOs only) - building blocks first
2. **LEGO Debut** - the complete LEGO itself
3. **Practice phrases** - remaining phrases sorted by length (shortest first)

### Other Features

- **Italian format match:** Exact structure validation ✓
- **Empty tokens/lemmas:** Fields exist but contain [] (size reduction)
- **Encouragements:** Pooled + ordered from eng_encouragements.json
- **Deterministic UUIDs:** Content-based MD5 hashing (UPPERCASE with hyphens)
- **1-space indent:** Compact but readable JSON

## Running

```bash
node scripts/phase7-compile-manifest-v3.cjs <course_code>

# Example:
node scripts/phase7-compile-manifest-v3.cjs spa_for_eng
```

## Comparison Tool

Validate manifest structure against Italian reference:

```bash
node scripts/compare-manifests.cjs <new_manifest> [reference_manifest]

# Example:
node scripts/compare-manifests.cjs public/vfs/courses/spa_for_eng/course_manifest.json
```

## Statistics (spa_for_eng)

- Seeds: 630
- Introduction items (LEGOs): 1,912
- Practice nodes: 18,820
- Unique sample texts: 30,118
- Total sample entries: 43,979
  - source: 14,358
  - target1: 13,841
  - target2: 13,841
  - presentation: 1,913
  - presentation_encouragement: 26
- File size: ~14.5 MB

## Version History

- **v3.0 (2025-12-03):** Clean rebuild with correct roles (source, target1, target2, presentation, presentation_encouragement). Removed invalid roles. Added comparison tool.
- **v2.0:** Used invalid roles (practice_known, lego_target, etc.) - DEPRECATED
- **v1.0-v1.1:** Archived to `archive/phase7-deprecated-2025-11-21/`

## See Also

- `apml/phases/phase-7-manifest-compilation.apml` - APML v10.0.0 spec
- `scripts/compare-manifests.cjs` - Structure comparison tool
