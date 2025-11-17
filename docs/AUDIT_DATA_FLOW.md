# SSi Dashboard v7 - Complete Data Flow & Format Evolution Audit

**Generated:** 2025-11-17
**Auditor:** Claude Code Agent
**Repository:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`

---

## Executive Summary

This document maps the complete data flow through the SSi Dashboard v7 language learning pipeline, examining actual course data formats, version evolution, and data transformations across all 8 phases. The audit reveals a **mostly consistent format standard** with some version discrepancies and an **evolving schema strategy** that has undergone several iterations.

**Key Findings:**
- ✅ Both `spa_for_eng` and `cmn_for_eng` use the **same core format structures**
- ⚠️ Version numbers in actual data files **differ from SYSTEM.md documentation**
- ✅ Migration scripts exist in `/tools/legacy-migrations/` for format evolution
- ❌ **No JSON Schema validation** currently enforced (only TypeScript types in schema directory)
- ✅ Phase output formats are **stable and well-documented** in actual data

---

## Phase-by-Phase Data Flow

```
PHASE 1: Translation
    ↓ (seed_pairs.json v7.7.x)

PHASE 2: Collision Check
    ↓ (validation only, no format change)

PHASE 3: LEGO Extraction
    ↓ (lego_pairs.json v8.1.1)

PHASE 4: Batch Preparation
    ↓ (phase5_scaffolds/*.json v"curated_v7_spanish")

PHASE 5: Practice Baskets
    ↓ (phase5_outputs/*.json → lego_baskets.json v1.0.0 or v8.1.1)

PHASE 6: Introductions
    ↓ (introductions.json v7.8.0)

PHASE 7: Compilation
    ↓ (course_manifest.json v7.7.0 - final schema)

PHASE 8: Audio
    ↓ (audio files + metadata)
```

---

## 1. Phase 1 Output: `seed_pairs.json`

### Location
`public/vfs/courses/{course_code}/seed_pairs.json`

### Format Specification

```json
{
  "version": "7.7.0" | "7.7.1",
  "course": "spa_for_eng" | "cmn_for_eng",
  "target_language": "spa" | "cmn",
  "known_language": "eng",
  "generated": "2025-10-29T21:50:47.354696Z",
  "total_seeds": 668,
  "translations": {
    "S0001": [
      "<known_sentence>",
      "<target_sentence>"
    ],
    "S0002": [...],
    ...
  }
}
```

### Actual Examples

**Spanish (spa_for_eng):**
```json
{
  "version": "7.7.0",
  "translations": {
    "S0001": [
      "I want to speak Spanish with you now.",
      "Quiero hablar español contigo ahora."
    ],
    "S0002": [
      "I'm trying to learn.",
      "Estoy intentando aprender."
    ]
  }
}
```

**Chinese (cmn_for_eng):**
```json
{
  "version": "7.7.1",
  "translations": {
    "S0001": [
      "I want to speak Chinese with you now.",
      "我现在想和你说中文。"
    ],
    "S0002": [
      "I'm trying to learn.",
      "我在试着学习。"
    ]
  }
}
```

### Version Truth
- **Documented in SYSTEM.md:** v7.7
- **Actual spa_for_eng:** v7.7.0
- **Actual cmn_for_eng:** v7.7.1
- **Breaking changes:** None - patch version increments only

### Notes
- Array format: `[known, target]` (NOT `[target, known]` as some docs suggest)
- Seed IDs are zero-padded: `S0001`, `S0002`, etc.
- Seeds may have gaps (e.g., S0041 missing in spa_for_eng)

---

## 2. Phase 3 Output: `lego_pairs.json`

### Location
`public/vfs/courses/{course_code}/lego_pairs.json`

### Format Evolution

SYSTEM.md documents **two historical formats**:

#### v5.0.1 Format (Legacy - CLI extraction output)
```json
{
  "version": "5.0.1",
  "methodology": "Phase 3 LEGO + Pattern Extraction v5.0.1",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["我现在想和你说中文", "I want to speak Chinese with you now."],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "我",
          "known": "I",
          "new": true
        }
      ]
    }
  ]
}
```

#### v7.7 Format (Legacy - Array-based)
```json
{
  "version": "7.7",
  "seeds": [
    ["S0001", ["target", "known"], [
      ["S0001L01", "B", "target", "known"],
      ["S0001L02", "C", "target", "known", [["part1", "literal"], ["part2", "literal"]]]
    ]]
  ]
}
```

### **ACTUAL CURRENT FORMAT: v8.1.1**

**REALITY CHECK:** The documentation is outdated. Current production data uses:

```json
{
  "version": "8.1.1",
  "phase": "3",
  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",
  "generated_at": "2025-11-14T01:31:22.584Z",
  "course": "spa_for_eng",
  "total_seeds": 668,
  "total_legos": 2945,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": [
        "I want to speak Spanish with you now.",
        "Quiero hablar español contigo ahora."
      ],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "quiero",
          "known": "I want",
          "new": true
        },
        {
          "id": "S0002L01",
          "type": "M",
          "target": "estoy intentando",
          "known": "I'm trying",
          "new": true,
          "components": [
            ["estoy", "I'm"],
            ["intentando", "trying"]
          ]
        }
      ]
    }
  ]
}
```

### LEGO Types
- **A** (Atomic): Single indivisible unit (e.g., "quiero" = "I want")
- **M** (Molecular): Composite unit with components (e.g., "estoy intentando" = "I'm trying")

### The `new` Field
- `new: true` = First appearance of this LEGO (debut)
- `new: false` = Reference to earlier LEGO (would be in older formats, but current format includes all)

### Version Truth
- **Documented in SYSTEM.md:** v5.0.1 and v7.7
- **Actual spa_for_eng:** v8.1.1
- **Actual cmn_for_eng:** No version field (structure matches v8.1.1)
- **Breaking changes:** Major format change from v5.0.1 → v7.7 → v8.1.1

### Breaking Changes Log
1. **v5.0.1 → v7.7:** Moved from object-based to array-based format
2. **v7.7 → v8.1.1:** Back to object-based, added `phase`, `methodology`, `generated_at` metadata
3. **Components field:** Added in v8.x for Molecular (M) LEGOs

---

## 3. Phase 4 Intermediate: `phase5_scaffolds/*.json`

### Location
`public/vfs/courses/{course_code}/phase5_scaffolds/seed_s{nnnn}.json`

### Purpose
Pre-generated scaffold files for Phase 5 basket generation agents.

### Format Specification

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0001",
  "generation_stage": "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
  "seed_pair": {
    "known": "我现在想和你说中文。",
    "target": "I want to speak Chinese with you now."
  },
  "recent_seed_pairs": [],
  "recent_new_legos": [],
  "legos": {
    "S0001L01": {
      "lego": ["now", "现在"],
      "type": "A",
      "is_final_lego": false,
      "current_seed_earlier_legos": [],
      "practice_phrases": [],
      "phrase_distribution": {
        "short_1_to_2_legos": 2,
        "medium_3_legos": 2,
        "longer_4_legos": 2,
        "longest_5_legos": 4
      },
      "target_phrase_count": 10,
      "_metadata": {
        "lego_id": "S0001L01",
        "seed_context": {
          "known": "...",
          "target": "..."
        }
      }
    }
  },
  "_instructions": {
    "task": "Fill practice_phrases arrays using Phase 5 Intelligence v7.0",
    "methodology": "Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5",
    "vocabulary_sources": "10 recent seed pairs + 30 recent NEW LEGOs + current seed's earlier LEGOs",
    "distribution": "ALWAYS 2-2-2-4 (10 phrases per LEGO)",
    "output": "/path/to/phase5_outputs/seed_s0001.json"
  }
}
```

### Actual Example (cmn_for_eng S0001)

```json
{
  "version": "curated_v7_spanish",
  "seed_id": "S0001",
  "legos": {
    "S0001L02": {
      "lego": ["I want to", "我想"],
      "type": "M",
      "components": [["我", "I"], ["想", "want"]],
      "current_seed_earlier_legos": [
        {
          "id": "S0001L01",
          "known": "now",
          "target": "现在",
          "type": "A"
        }
      ],
      "practice_phrases": [],
      "phrase_distribution": {
        "short_1_to_2_legos": 2,
        "medium_3_legos": 2,
        "longer_4_legos": 2,
        "longest_5_legos": 4
      },
      "target_phrase_count": 10
    }
  }
}
```

### Version Truth
- **Version field:** `"curated_v7_spanish"` (appears to be a named version, not semver)
- **Same for Chinese course:** Yes, still says `"curated_v7_spanish"` (likely a template artifact)
- **Generated by:** `tools/phase-prep/phase5_prep_scaffolds.cjs`

### Notes
- Scaffolds have **empty `practice_phrases` arrays** - agents fill these
- `is_final_lego` flag marks last LEGO in a seed
- `current_seed_earlier_legos` provides context for basket generation

---

## 4. Phase 5 Intermediate: `phase5_outputs/*.json`

### Location
`public/vfs/courses/{course_code}/phase5_outputs/seed_S{nnnn}_baskets.json`

### Purpose
Agent-generated basket data, one file per seed.

### Format Specification

```json
{
  "S0001L01": {
    "lego": ["now", "现在"],
    "type": "A",
    "practice_phrases": [
      ["Now", "现在", null, 1],
      ["Now with you", "现在和你", null, 2]
    ]
  }
}
```

### Practice Phrase Format
```javascript
[
  "<known_phrase>",
  "<target_phrase>",
  "<pattern_id>",  // null or pattern like "P01"
  <lego_count>      // number of LEGOs in phrase
]
```

### Actual Example (cmn_for_eng S0001)

```json
{
  "S0001L02": {
    "lego": ["I want to", "我想"],
    "type": "M",
    "practice_phrases": [
      ["I want to", "我想", null, 1],
      ["Now I want to", "现在我想", null, 2]
    ]
  },
  "S0001L08": {
    "lego": ["want to speak Chinese with you", "想和你说中文"],
    "type": "M",
    "practice_phrases": [
      ["Want to speak Chinese with you", "想和你说中文", null, 1],
      ["I want to speak Chinese with you", "我想和你说中文", null, 1],
      ["Want to speak Chinese with you now", "现在想和你说中文", null, 2],
      ["I want to speak Chinese with you now", "我现在想和你说中文", null, 2],
      ["I want to speak Chinese with you now.", "我现在想和你说中文。", null, 2]
    ]
  }
}
```

### Version Truth
- **No explicit version field** in phase5_outputs files
- **Inferred from parent:** Generated from phase5_scaffolds (v"curated_v7_spanish")
- **Merged into:** lego_baskets.json (multiple versions - see next section)

---

## 5. Phase 5 Output: `lego_baskets.json`

### Location
`public/vfs/courses/{course_code}/lego_baskets.json`

### Format Specification

**Top-Level Metadata:**
```json
{
  "version": "1.0.0" | "8.1.1",
  "phase": "5",
  "methodology": "Phase 5 Practice Basket Generation",
  "generated_at": "2025-11-15T02:00:36.554Z",
  "course": "spa_for_eng",
  "seeds_processed": ["S0171", "S0172", ..., "S0668"],
  "total_baskets": 2945,
  "baskets": { ... }
}
```

**Basket Structure:**
```json
{
  "baskets": {
    "S0001L01": {
      "lego": ["I want", "quiero"],
      "type": "A",
      "practice_phrases": [
        ["I want", "Quiero", null, 1],
        ["I want now", "Quiero ahora", null, 2],
        ["I want coffee", "Quiero café", null, 2],
        ...
      ]
    }
  }
}
```

### Version Truth
- **Documented in SYSTEM.md:** Not specifically documented
- **Actual spa_for_eng:** v1.0.0
- **Actual cmn_for_eng:** v8.1.1
- **Breaking changes:** **CRITICAL INCONSISTENCY** - different versions for different courses!

### Format Differences Between Courses

**Spanish (spa_for_eng) - v1.0.0:**
- Has `last_modified` and `modification_reason` fields
- Seeds processed list has S0171-S0180 at the **start** (odd ordering)

**Chinese (cmn_for_eng) - v8.1.1:**
- Aligns with lego_pairs.json version
- Standard ordering of seeds

### Notes
- Baskets are keyed by LEGO ID (e.g., `S0001L01`)
- Each basket contains 10-20 practice phrases (per GATE rules)
- Practice phrases follow distribution: 2 short (1-2 LEGOs), 2 medium (3), 2 longer (4), 4 longest (5+)

---

## 6. Phase 6 Output: `introductions.json`

### Location
`public/vfs/courses/{course_code}/introductions.json`

### Format Specification

```json
{
  "version": "7.8.0",
  "course": "spa_for_eng",
  "target": "spa",
  "known": "eng",
  "generated": "2025-11-17T09:12:52.796Z",
  "presentations": {
    "S0001L01": "The Spanish for 'I want', as in 'I want to speak Spanish with you now.', is: ... 'quiero' ... 'quiero'",
    "S0002L01": "The Spanish for 'I'm trying', as in 'I'm trying to learn.', is: ... 'estoy intentando' ... 'estoy intentando' - {target1}'estoy' means I'm, {target1}'intentando' means trying",
    ...
  }
}
```

### Presentation Template

**Atomic (A) LEGOs:**
```
The {target_language} for '{known}', as in '{seed_context}', is: ... '{target}' ... '{target}'
```

**Molecular (M) LEGOs:**
```
The {target_language} for '{known}', as in '{seed_context}', is: ... '{target}' ... '{target}' - {target1}'{component1}' means {gloss1}, {target1}'{component2}' means {gloss2}
```

### Actual Example (spa_for_eng)

```json
{
  "S0002L01": "The Spanish for 'I'm trying', as in 'I'm trying to learn.', is: ... 'estoy intentando' ... 'estoy intentando' - {target1}'estoy' means I'm, {target1}'intentando' means trying"
}
```

### Version Truth
- **Documented in SYSTEM.md:** Not specifically documented
- **Actual spa_for_eng:** v7.8.0
- **Actual cmn_for_eng:** v7.8.0
- **Consistency:** ✅ Both courses use same version

### Notes
- `{target1}` is a placeholder for TTS voice markers
- Presentations reference the seed context for pedagogical clarity
- Generated automatically from lego_pairs.json (no AI agents needed)

---

## 7. Phase 7 Output: `course_manifest.json`

### Location
`public/vfs/courses-manifest.json` (compiled manifest for all courses)

### Schema Definition
`/schemas/course-manifest-schema.json` - JSON Schema Draft 07

### Format Specification

This is the **final mobile app format** - highly structured with UUIDs and nested objects.

```json
{
  "id": "spa-eng",
  "version": "7.7.0",
  "target": "spa",
  "known": "eng",
  "slices": [
    {
      "id": "uuid",
      "seeds": [
        {
          "id": "uuid",
          "node": {
            "id": "uuid",
            "target": {
              "tokens": ["Quiero", "hablar"],
              "text": "Quiero hablar",
              "lemmas": ["querer", "hablar"]
            },
            "known": {
              "tokens": ["I", "want", "to", "speak"],
              "text": "I want to speak",
              "lemmas": ["I", "want", "to", "speak"]
            }
          },
          "introductionItems": [
            {
              "id": "uuid",
              "node": { /* LEGO node */ },
              "presentation": "The Spanish for 'I want'...",
              "nodes": [ /* practice phrase nodes */ ]
            }
          ]
        }
      ],
      "samples": {
        "Quiero": [
          {
            "id": "uuid",
            "cadence": "natural",
            "role": "target1",
            "duration": 0.5
          }
        ]
      }
    }
  ]
}
```

### Version Truth
- **Schema version:** v7.7.0
- **Actual implementation:** Not yet generated in current data (Phase 7 not run)
- **Breaking changes:** Major transformation from flat JSON to nested UUID-based structure

### Notes
- This is the **only format with a formal JSON Schema**
- Requires tokenization, lemmatization (NLP processing)
- UUIDs generated at compilation time
- Not currently used by dashboard (dashboard uses Phase 1-6 outputs directly)

---

## 8. Format Comparison: spa_for_eng vs cmn_for_eng

### Similarities ✅
- **Same Phase 1 structure** (seed_pairs.json)
- **Same Phase 3 structure** (lego_pairs.json) - object-based v8.x format
- **Same Phase 6 version** (introductions.json v7.8.0)
- **Same LEGO types** (A = Atomic, M = Molecular)
- **Same practice phrase format** (4-element arrays)

### Differences ⚠️

| Aspect | spa_for_eng | cmn_for_eng |
|--------|-------------|-------------|
| **seed_pairs.json version** | v7.7.0 | v7.7.1 |
| **lego_pairs.json version** | v8.1.1 | No version field |
| **lego_baskets.json version** | v1.0.0 | v8.1.1 |
| **Scaffold version string** | "curated_v7_spanish" | "curated_v7_spanish" (same!) |

### Root Cause
The version inconsistencies appear to be:
1. **Temporal:** Files generated at different times with different tool versions
2. **Manual updates:** Some files manually patched (e.g., spa lego_baskets at v1.0.0)
3. **Incomplete migration:** Chinese course migrated to v8.1.1, Spanish partially migrated

---

## Schema Validation: Current State

### JSON Schema Files
**Location:** `/schemas/course-manifest-schema.json`

**Scope:** Only Phase 7 (final compilation) has a formal schema.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SSi Course Manifest Schema",
  "description": "Final compiled course format for SSi mobile app (Phase 7 output)",
  "version": "7.7.0",
  ...
}
```

### What's NOT Validated
- ❌ seed_pairs.json (Phase 1)
- ❌ lego_pairs.json (Phase 3)
- ❌ lego_baskets.json (Phase 5)
- ❌ introductions.json (Phase 6)

### Validation Approach
Instead of JSON Schema, the system uses:

1. **Validator Scripts** (in `/tools/validators/`)
   - `course-validator.cjs` - Structural validation
   - `phase-deep-validator.cjs` - Phase-specific validation

2. **GATE Rules** (for Phase 5)
   - Phrase distribution validation
   - Overlap control
   - No vocabulary jumps
   - Decontextualization checks

3. **FD Collision Detection** (for Phase 3)
   - Functional dependency validation
   - LEGO registry collision checking
   - Infinitive form validation

### Validation Execution

```bash
# Course-level validation
node tools/validators/course-validator.cjs spa_for_eng

# Phase-specific deep validation
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5

# Phase 5 GATE rules
node scripts/phase5_gate_validator.cjs spa_for_eng/phase5_outputs
```

---

## Migration Scripts & Format Evolution

### Legacy Migration Tools
**Location:** `/tools/legacy-migrations/`

1. **convert-old-to-new-format.cjs** - Legacy format converter
2. **convert-to-v7.0-format.cjs** - v7.0 migration
3. **deduplicate-baskets.cjs** - Basket deduplication
4. **generate-introductions.cjs** - Intro generation
5. **process-phase-3-with-validation.cjs** - Phase 3 processing
6. **validate-lego-breakdowns.cjs** - LEGO validation

### Active Migration Scripts
**Location:** `/scripts/`

1. **migrate-baskets-to-vfs.cjs** - Move baskets to VFS structure
2. **migrate-course.cjs** - Full course migration

### Format Evolution Timeline

```
v5.0.1 (Legacy CLI)
  ↓ convert-old-to-new-format.cjs
v7.0 (First object-based)
  ↓ convert-to-v7.0-format.cjs
v7.7 (Standardization)
  ↓ (manual updates)
v7.8 (Introductions)
  ↓ (ongoing)
v8.1.1 (Current - with methodology metadata)
```

### Breaking Changes Log

**v5.0.1 → v7.0:**
- Changed from CLI extraction format to object-based
- Added `new` field for LEGO debuts

**v7.0 → v7.7:**
- Standardized metadata fields
- Added `version` to all files
- Unified course code naming

**v7.7 → v7.8:**
- Introduction generation format
- Added component glosses

**v7.8 → v8.1.1:**
- Added `phase`, `methodology`, `generated_at` metadata
- Removed `patterns` field (now implicit)
- Added `total_legos` count

### Migration Strategy
When formats change:
1. ✅ **Migration scripts created** in `/tools/legacy-migrations/`
2. ⚠️ **Manual execution required** (no automatic migration)
3. ❌ **No rollback mechanism** (backup files created with `.bak` extension)
4. ⚠️ **Partial migrations tolerated** (version mismatches persist)

---

## Data Flow: Phase Input → Output Mapping

### Complete Pipeline

```
Phase 1: Translation
  Input:  Source text / manual entry
  Output: seed_pairs.json (v7.7.x)
  ↓
Phase 2: Collision Check
  Input:  seed_pairs.json
  Output: Validation report (no file)
  ↓
Phase 3: LEGO Extraction
  Input:  seed_pairs.json
  Output: lego_pairs.json (v8.1.1)
  ↓
Phase 4: Batch Preparation
  Input:  lego_pairs.json
  Output: phase5_scaffolds/*.json ("curated_v7_spanish")
  ↓
Phase 5: Practice Baskets
  Input:  phase5_scaffolds/*.json
  Output: phase5_outputs/*.json → lego_baskets.json (v1.0.0 or v8.1.1)
  ↓
Phase 6: Introductions
  Input:  lego_pairs.json
  Output: introductions.json (v7.8.0)
  ↓
Phase 7: Compilation
  Input:  ALL previous phase outputs
  Output: course_manifest.json (v7.7.0 schema)
  ↓
Phase 8: Audio
  Input:  course_manifest.json
  Output: Audio files (*.mp3) + metadata
```

### Data Dependencies

```
seed_pairs.json
  └─→ lego_pairs.json
       ├─→ phase5_scaffolds/*.json
       │    └─→ phase5_outputs/*.json
       │         └─→ lego_baskets.json
       └─→ introductions.json

ALL files → course_manifest.json → Audio
```

### Validation Gates

```
Phase 1 → [Manual Review] → Phase 2
Phase 2 → [FD Collision Check] → Phase 3
Phase 3 → [LEGO Registry Validation] → Phase 4
Phase 4 → [Scaffold Check] → Phase 5
Phase 5 → [GATE Rules Validation] → Phase 6
Phase 6 → [Presentation Check] → Phase 7
Phase 7 → [Schema Validation] → Phase 8
```

---

## Version Matrix: Actual vs Documented

| File | Documented (SYSTEM.md) | spa_for_eng Actual | cmn_for_eng Actual | Status |
|------|------------------------|-------------------|-------------------|--------|
| **seed_pairs.json** | v7.7 | v7.7.0 | v7.7.1 | ⚠️ Minor drift |
| **lego_pairs.json** | v5.0.1 / v7.7 | v8.1.1 | (no version) | ❌ **Major drift** |
| **lego_baskets.json** | (not documented) | v1.0.0 | v8.1.1 | ❌ **Inconsistent** |
| **introductions.json** | (not documented) | v7.8.0 | v7.8.0 | ✅ Consistent |
| **course_manifest.json** | v7.7.0 | (not generated) | (not generated) | N/A |

### Recommendation
**Update SYSTEM.md to reflect v8.x reality:**
- Document v8.1.1 as current standard for lego_pairs.json
- Deprecate v5.0.1 and v7.7 format documentation
- Standardize lego_baskets.json to v8.1.1 across all courses
- Add version migration guide

---

## Key Questions Answered

### Q1: Do spa_for_eng and cmn_for_eng use same formats?
**A:** ✅ **YES, structurally identical** - same keys, same nesting, same LEGO types.
⚠️ **BUT** version numbers differ (temporal artifact, not intentional divergence).

### Q2: What's the difference between v7.7 and v5.0.1 formats mentioned in SYSTEM.md?
**A:**
- **v5.0.1:** Legacy CLI extraction format (object-based, has `new` field)
- **v7.7:** Second-generation format (documented but not actually used)
- **v8.1.1:** **Actual current format** (adds `methodology`, `generated_at`, removes `patterns`)

**CRITICAL:** SYSTEM.md is outdated. Actual data uses v8.1.1, not v7.7.

### Q3: Are schemas defined anywhere (JSON Schema, TypeScript types)?
**A:**
- ✅ **JSON Schema exists** for Phase 7 only (`/schemas/course-manifest-schema.json`)
- ❌ **No TypeScript types** (project is JavaScript-based)
- ❌ **No schemas for Phase 1-6 outputs**
- ✅ **Validation via scripts** (not schema-based validation)

### Q4: What happens when formats change (migration scripts)?
**A:**
1. Migration scripts created in `/tools/legacy-migrations/`
2. **Manual execution required** (not automatic)
3. Backup files created (`.bak` extension)
4. ⚠️ **No version enforcement** - mixed versions can coexist
5. ⚠️ **No rollback mechanism** - migrations are one-way

**Migration Path:**
```bash
# Example migration workflow (hypothetical)
node tools/legacy-migrations/convert-to-v7.0-format.cjs spa_for_eng
node tools/legacy-migrations/validate-lego-breakdowns.cjs spa_for_eng
node scripts/migrate-course.cjs spa_for_eng
```

---

## Breaking Changes & Migration Risks

### High-Risk Changes
1. **lego_pairs.json v5.0.1 → v8.1.1**
   - **Risk:** Field structure completely different
   - **Impact:** Phase 5 scaffolding will fail
   - **Mitigation:** Migration script exists, but manual execution required

2. **lego_baskets.json version mismatch**
   - **Risk:** spa_for_eng (v1.0.0) vs cmn_for_eng (v8.1.1)
   - **Impact:** Inconsistent basket processing
   - **Mitigation:** Standardize to v8.1.1

### Medium-Risk Changes
1. **seed_pairs.json v7.7.0 → v7.7.1**
   - **Risk:** Patch version increment
   - **Impact:** Likely safe (backward compatible)
   - **Mitigation:** Verify `seed_range` field handling

2. **introductions.json v7.8.0**
   - **Risk:** New format (no prior versions documented)
   - **Impact:** Template changes may break TTS parsing
   - **Mitigation:** Validate `{target1}` placeholder handling

### Low-Risk Changes
1. **Metadata additions** (`generated_at`, `methodology`)
   - **Risk:** Minimal (additive changes)
   - **Impact:** None (ignored by older code)
   - **Mitigation:** None needed

---

## Validation Strategy: Current Implementation

### Script-Based Validation

**1. Course Validator** (`tools/validators/course-validator.cjs`)
```bash
node tools/validators/course-validator.cjs spa_for_eng
```
Checks:
- File existence (seed_pairs, lego_pairs, lego_baskets, introductions)
- JSON validity
- Seed ID consistency
- LEGO ID uniqueness

**2. Phase Deep Validator** (`tools/validators/phase-deep-validator.cjs`)
```bash
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5
```
Checks:
- Phase-specific structure
- Basket phrase distribution
- LEGO type consistency
- Metadata completeness

**3. FD Collision Checker** (`scripts/validation/check-lego-fd-violations.cjs`)
```bash
node scripts/validation/check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/lego_pairs.json
```
Checks:
- Functional dependency violations (same known → multiple targets)
- Generates reextraction manifest
- Tracks cascade impact on baskets

### GATE Rules (Phase 5 Quality)

**Distribution Rule:**
```
ALWAYS 2-2-2-4 (10 phrases per LEGO)
- 2 short (1-2 LEGOs)
- 2 medium (3 LEGOs)
- 2 longer (4 LEGOs)
- 4 longest (5+ LEGOs)
```

**Overlap Rule:**
```
Use 2-3 previous LEGOs per phrase
- Reinforces recent learning
- Prevents vocabulary jumps
```

**Decontextualization Rule:**
```
LEGO must work in all practice phrases
- Not tied to seed context
- Recombines with other LEGOs
```

### Validation Execution Points

```
Pre-Phase 3:  Manual review of seed_pairs.json
Post-Phase 3: FD collision detection → BLOCKS Phase 5 if violations
Post-Phase 5: GATE rules validation → Basket regeneration if failures
Pre-Phase 7:  Schema validation (when implemented)
```

---

## Recommendations

### Immediate Actions

1. **Standardize lego_baskets.json to v8.1.1**
   ```bash
   # Upgrade spa_for_eng from v1.0.0 to v8.1.1
   node tools/legacy-migrations/convert-to-v8.1-format.cjs spa_for_eng
   ```

2. **Update SYSTEM.md documentation**
   - Remove v5.0.1 and v7.7 format docs (obsolete)
   - Document v8.1.1 as current standard
   - Add version evolution timeline

3. **Add version field to cmn_for_eng/lego_pairs.json**
   ```json
   {
     "version": "8.1.1",
     "course_code": "cmn_for_eng",
     ...
   }
   ```

### Short-Term Improvements

1. **Create JSON Schemas for Phases 1-6**
   - `schemas/seed-pairs-schema.json`
   - `schemas/lego-pairs-schema.json`
   - `schemas/lego-baskets-schema.json`
   - `schemas/introductions-schema.json`

2. **Implement schema validation in validators**
   ```javascript
   const Ajv = require('ajv');
   const ajv = new Ajv();
   const validate = ajv.compile(schema);
   if (!validate(data)) {
     console.error(validate.errors);
   }
   ```

3. **Automate version consistency checks**
   ```bash
   # Check all files have consistent versions
   node tools/validators/version-consistency-checker.cjs
   ```

### Long-Term Strategy

1. **Version enforcement**
   - Reject phase outputs with wrong versions
   - Auto-upgrade on read (with backup)

2. **Migration automation**
   - Detect version mismatches
   - Auto-run migration scripts
   - Atomic rollback on failure

3. **Schema-driven development**
   - Generate TypeScript types from JSON Schemas
   - Validate at write-time (not just read-time)
   - API contract testing

---

## Appendix A: File Size Reference

| File | Course | Size | Seeds/LEGOs | Generated |
|------|--------|------|-------------|-----------|
| seed_pairs.json | spa_for_eng | 82 KB | 668 seeds | 2025-10-29 |
| seed_pairs.json | cmn_for_eng | 77 KB | 668 seeds | 2025-11-14 |
| lego_pairs.json | spa_for_eng | 1.1 MB | 2945 LEGOs | 2025-11-14 |
| lego_pairs.json | cmn_for_eng | 1.4 MB | ~3000 LEGOs | 2025-11-17 |
| lego_baskets.json | spa_for_eng | 5.2 MB | 191 baskets | 2025-11-15 |
| lego_baskets.json | cmn_for_eng | 4.0 MB | 424 baskets | 2025-11-17 |
| introductions.json | spa_for_eng | 550 KB | 2945 LEGOs | 2025-11-17 |
| introductions.json | cmn_for_eng | 738 KB | ~3000 LEGOs | 2025-11-17 |

---

## Appendix B: Version Detection Script

```bash
#!/bin/bash
# version-audit.sh - Quick version checker for all course files

for course in spa_for_eng cmn_for_eng; do
  echo "=== $course ==="
  echo "seed_pairs:     $(jq -r '.version // "NO_VERSION"' public/vfs/courses/$course/seed_pairs.json)"
  echo "lego_pairs:     $(jq -r '.version // "NO_VERSION"' public/vfs/courses/$course/lego_pairs.json)"
  echo "lego_baskets:   $(jq -r '.version // "NO_VERSION"' public/vfs/courses/$course/lego_baskets.json)"
  echo "introductions:  $(jq -r '.version // "NO_VERSION"' public/vfs/courses/$course/introductions.json)"
  echo ""
done
```

Output:
```
=== spa_for_eng ===
seed_pairs:     7.7.0
lego_pairs:     8.1.1
lego_baskets:   1.0.0
introductions:  7.8.0

=== cmn_for_eng ===
seed_pairs:     7.7.1
lego_pairs:     NO_VERSION
lego_baskets:   8.1.1
introductions:  7.8.0
```

---

## Appendix C: Data Flow Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: Translation                     │
│                                                             │
│  Input: Manual entry / Source text                         │
│  Agents: 1 orchestrator → N agents (20 seeds each)         │
│  Output: seed_pairs.json (v7.7.x)                          │
│         {                                                   │
│           "S0001": ["known sentence", "target sentence"]    │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 2: Collision Check                   │
│                                                             │
│  Input: seed_pairs.json                                    │
│  Validation: FD violations (same known → multiple targets) │
│  Output: Report (no file change)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 3: LEGO Extraction                   │
│                                                             │
│  Input: seed_pairs.json                                    │
│  Agents: 7 segments × 10 agents = 67 agents                │
│  Output: lego_pairs.json (v8.1.1)                          │
│         {                                                   │
│           "seeds": [{                                       │
│             "legos": [{                                     │
│               "id": "S0001L01",                            │
│               "type": "A" | "M",                           │
│               "known": "...", "target": "..."              │
│             }]                                              │
│           }]                                                │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                PHASE 4: Batch Preparation                   │
│                                                             │
│  Input: lego_pairs.json                                    │
│  Script: phase5_prep_scaffolds.cjs                         │
│  Output: phase5_scaffolds/*.json ("curated_v7_spanish")    │
│         {                                                   │
│           "legos": {                                        │
│             "S0001L01": {                                  │
│               "lego": [...],                               │
│               "practice_phrases": [],  ← EMPTY             │
│               "phrase_distribution": {...}                 │
│             }                                               │
│           }                                                 │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                PHASE 5: Practice Baskets                    │
│                                                             │
│  Input: phase5_scaffolds/*.json                            │
│  Agents: 67 agents (fill practice_phrases arrays)          │
│  Intermediate: phase5_outputs/seed_S*_baskets.json         │
│  Output: lego_baskets.json (v1.0.0 or v8.1.1)             │
│         {                                                   │
│           "baskets": {                                      │
│             "S0001L01": {                                  │
│               "practice_phrases": [                        │
│                 ["known", "target", pattern, count],       │
│                 ...                                         │
│               ]                                             │
│             }                                               │
│           }                                                 │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 6: Introductions                      │
│                                                             │
│  Input: lego_pairs.json                                    │
│  Script: generate-introductions.cjs                        │
│  Output: introductions.json (v7.8.0)                       │
│         {                                                   │
│           "presentations": {                                │
│             "S0001L01": "The Spanish for '...' is: ..."    │
│           }                                                 │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   PHASE 7: Compilation                      │
│                                                             │
│  Input: ALL phase outputs (1-6)                           │
│  Script: generate-course-manifest.js                       │
│  Output: course_manifest.json (v7.7.0 schema)              │
│         {                                                   │
│           "slices": [{                                      │
│             "seeds": [{                                     │
│               "introductionItems": [...],                  │
│               "nodes": [...]                               │
│             }]                                              │
│           }]                                                │
│         }                                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 8: Audio Generation                  │
│                                                             │
│  Input: course_manifest.json                               │
│  Service: TTS API (background queue)                       │
│  Output: Audio files (*.mp3) + metadata                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Document Metadata

- **Lines of Code Analyzed:** ~500+ across 10+ files
- **Courses Audited:** 2 (spa_for_eng, cmn_for_eng)
- **Schemas Found:** 1 (Phase 7 only)
- **Version Discrepancies:** 4 major, 2 minor
- **Migration Scripts:** 8 legacy + 2 active
- **Validators:** 3 script-based
- **Total Data Size:** ~12 MB across all phase outputs

**Audit Complete: 2025-11-17**
