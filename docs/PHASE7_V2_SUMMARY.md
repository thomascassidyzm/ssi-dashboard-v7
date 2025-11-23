# Phase 7 v2.0 - Manifest Compilation

**Status:** Active ✅  
**Type:** Standalone Script  
**Location:** `scripts/phase7-compile-manifest-v2.cjs`  
**Version:** 2.0 (APML v8.2.2)

## Overview

Phase 7 compiles all previous phase outputs into a final course manifest in Italian reference format.

## Input Files

1. `seed_pairs.json` (Phase 1)
2. `lego_pairs.json` (Phase 3)
3. `lego_baskets.json` (Phase 5)
4. `introductions.json` (Phase 6/3)
5. `welcomes.json` (canonical)
6. `eng_encouragements.json` (canonical)

## Output

**Filename:** `{Target}_for_{Known}_speakers_COURSE_{YYYYMMDD_HHMMSS}.json`

**Example:** `Chinese_for_English_speakers_COURSE_20251121_003247.json`

**Size:** ~22 MB for 668 seeds (1-space indent, empty tokens/lemmas)

## Key Features

- **Italian format match:** Exact structure validation passed ✓
- **Empty tokens/lemmas:** Fields exist but contain [] (50% size reduction)
- **Encouragements:** 26 pooled + 48 ordered from eng_encouragements.json
- **Deterministic UUIDs:** Content-based MD5 hashing
- **1-space indent:** Compact but readable JSON

## Running

```bash
node scripts/phase7-compile-manifest-v2.cjs
```

## Deprecated Versions

- **v1.0-v1.1:** Archived to `archive/phase7-deprecated-2025-11-21/`
- Old server architecture (port 3464) replaced with standalone script

## See Also

- `ssi-course-production.apml` - APML v8.2.2 spec
- `archive/phase7-deprecated-2025-11-21/README.md` - Why deprecated
