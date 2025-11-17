# Deep Phase Validation

Extension to the Course Validator that dives into each phase file to detect data quality issues.

## What It Does

While the basic validator checks for **file existence**, the deep validator checks **file contents** for:

### Phase 1: Seeds
- ✅ Seed count matches expected (668)
- ✅ No missing seeds in sequence (S0001-S0668)
- ✅ No empty translations
- ⚠️ Very short seeds (potential quality issues)

### Phase 3: LEGOs
- ✅ All LEGOs have valid structure
- ✅ No empty LEGO pairs
- ✅ LEGO count makes sense (should exceed seed count)
- ✅ Supports both v8.1.1 (seeds array) and legacy (lego_pairs object) formats

### Phase 5: Baskets
- ✅ No completely empty baskets
- ✅ E-phrases present (expects 3-5 per basket)
- ✅ D-phrases complete (expects sizes 2, 3, 4, 5)
- ⚠️ E-phrases meet length requirements (7-10 words)
- ✅ Identifies which specific LEGOs have issues

### Phase 6: Introductions
- ✅ All introductions present
- ✅ No empty introduction arrays

### Phase 7: Scaffolds
- ✅ Scaffold count matches expected (should be 668 files)
- ⚠️ Scaffold directory completeness

## Usage

### CLI

```bash
# Validate all phases for a course
node phase-deep-validator.cjs spa_for_eng

# Validate specific phase
node phase-deep-validator.cjs cmn_for_eng phase_5
```

### API

```bash
# Get deep validation for all phases
curl http://localhost:3456/api/courses/spa_for_eng/validate/deep

# Get deep validation for specific phase
curl http://localhost:3456/api/courses/spa_for_eng/validate/deep/phase_5
```

### UI

1. Navigate to `/validate`
2. Select a course
3. Click the **🔬 Deep Dive** button
4. View detailed issues and warnings per phase

## Example Output

### spa_for_eng Deep Validation

```json
{
  "courseCode": "spa_for_eng",
  "summary": {
    "totalIssues": 2,
    "totalWarnings": 0,
    "criticalIssues": [
      {
        "severity": "error",
        "message": "8 baskets are completely empty",
        "count": 8,
        "phase": "phase_5"
      },
      {
        "severity": "error",
        "message": "Missing scaffold outputs: expected 668, got 647",
        "expected": 668,
        "actual": 647,
        "missing": 21,
        "phase": "phase_7"
      }
    ]
  },
  "phases": {
    "phase_1": {
      "valid": true,
      "stats": {
        "totalSeeds": 668,
        "actualSeeds": 668,
        "completeness": "100.0%"
      }
    },
    "phase_3": {
      "valid": true,
      "stats": {
        "totalLegos": 2949,
        "uniqueSeeds": 668,
        "avgLegosPerSeed": "4.41"
      }
    },
    "phase_5": {
      "valid": false,
      "stats": {
        "totalBaskets": 2949,
        "emptyBaskets": 8,
        "completeness": "99.7%"
      },
      "issues": [
        {
          "severity": "error",
          "message": "8 baskets are completely empty",
          "count": 8
        }
      ]
    }
  }
}
```

## Real Issues Found

Running deep validation on spa_for_eng revealed:
- **Phase 5**: 8 empty baskets need regeneration
- **Phase 7**: 21 missing scaffold outputs (647/668 = 96.9% complete)

These issues would not be caught by basic file existence checks!

## Integration with Course Validator

The deep validator works alongside the basic validator:
- **Basic validator**: Checks if files/directories exist
- **Deep validator**: Checks content quality within existing files

Both are accessible from the same UI at `/validate`.

## Architecture

```
┌─────────────────────────────────────┐
│   CourseValidator.vue (UI)          │
│   - Shows file existence status     │
│   - "Deep Dive" button              │
└──────────┬──────────────────────────┘
           │
           ├─> GET /api/courses/:code/validate
           │   (basic file existence check)
           │
           └─> GET /api/courses/:code/validate/deep
               (content quality check)
               │
               ▼
         ┌─────────────────────────────────┐
         │  phase-deep-validator.cjs       │
         │  - validatePhase1Seeds()        │
         │  - validatePhase3Legos()        │
         │  - validatePhase5Baskets()      │
         │  - validatePhase6Introductions()│
         │  - validatePhase7Scaffolds()    │
         └─────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │  VFS Files (JSON content)       │
         │  - seed_pairs.json              │
         │  - lego_pairs.json              │
         │  - lego_baskets.json            │
         │  - introductions.json           │
         │  - phase5_outputs/              │
         └─────────────────────────────────┘
```

## Issue Types

### Errors (Red)
Block course from being used:
- Missing seeds in sequence
- Empty baskets
- Invalid LEGO structure
- Missing scaffold outputs

### Warnings (Yellow)
Quality concerns but not blockers:
- Very short seeds (< 5 chars)
- Short e-phrases (< 7 words)
- Unusual LEGO/seed ratios

## Next Steps

Deep validation identifies issues - next you'll want to:
1. **Fix empty baskets**: Rerun Phase 5 for specific LEGOs
2. **Complete scaffolds**: Rerun Phase 7 for missing seeds
3. **Review warnings**: Manually check flagged content

The validator tells you **what's wrong** and **where** - you decide how to fix it!
