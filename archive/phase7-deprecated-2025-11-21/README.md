# Deprecated Phase 7 Compilers - Archived 2025-11-21

These Phase 7 implementations have been replaced by `scripts/phase7-compile-manifest-v2.cjs`.

## Archived Files

### `phase7-manifest-server.cjs`
- **Type:** Microservice server (port 3462)
- **Status:** Deprecated in APML v8.2.2
- **Reason:** Replaced with standalone script for simpler architecture
- **Issues:** Complex server orchestration, harder to debug

### `phase7-compile-manifest.cjs`
- **Type:** Standalone compiler (v1)
- **Status:** Deprecated in APML v8.2.2
- **Reason:** Didn't match Italian format exactly, produced 668 seeds with empty introduction_items
- **Issues:**
  - Missing introduction_items bug
  - Incorrect structure validation
  - Missing encouragements system

### `generate-course-manifest.js`
- **Type:** Early manifest generator
- **Status:** Deprecated (pre-v8.0)
- **Reason:** Replaced by phase7-compile-manifest.cjs, then v2

## Current Implementation

**Active:** `scripts/phase7-compile-manifest-v2.cjs` (Phase 7 v2.0)

**Features:**
- Exact Italian format match (verified structure validation)
- Empty tokens/lemmas arrays (50% size reduction)
- Ordered + pooled encouragements (74 total)
- Timestamped naming: `{Target}_for_{Known}_speakers_COURSE_{timestamp}.json`
- 1-space indent (compact but readable)
- Deterministic UUID generation

**Output:**
- 21.95 MB for cmn_for_eng (668 seeds, 2,895 LEGOs, 27,684 phrases, 56,156 samples)
- 0.033 MB/seed (vs Italian: 0.055 MB/seed)

## Migration Notes

If you need to restore these for reference:
```bash
cp archive/phase7-deprecated-2025-11-21/phase7-manifest-server.cjs services/phases/
```

But we recommend updating to v2 instead.

## See Also

- APML v8.2.2 changelog in `ssi-course-production.apml`
- Phase 7 intelligence: `public/docs/phase_intelligence/phase_7_compilation.md`
