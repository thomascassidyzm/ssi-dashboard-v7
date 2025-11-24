# Phase 2: Conflict Resolution (Upchunking)

**Version**: 9.0.0
**Status**: Active
**Input**: draft_lego_pairs.json
**Output**: lego_pairs.json (SINGLE SOURCE OF TRUTH)

## Overview

Phase 2 resolves KNOWN→TARGET conflicts identified in draft_lego_pairs.json through **upchunking** - creating M-type LEGOs that teach the conflicting patterns explicitly.

## Key Concepts

### Conflict Types

1. **KNOWN→TARGET conflicts**: Same KNOWN word maps to multiple TARGET translations
   - Example: "tarde" → "afternoon" (in some seeds) vs "tarde" → "late" (in others)

2. **Resolution Strategy**: Upchunking
   - Create M-type LEGO that includes the conflicting word + disambiguating context
   - Example: Create "por la tarde" → "in the afternoon" to resolve "tarde" conflict

### Upchunking Algorithm

```
For each conflict in draft_lego_pairs.json:
  1. Identify all seeds where conflict occurs
  2. Analyze context words around conflicting KNOWN word
  3. Create M-type LEGO with:
     - KNOWN: conflicting word + context (2+ words)
     - TARGET: full translation (2+ words)
     - Type: "M" (Molecular)
  4. Record resolution in upchunk_resolutions.json
```

### Output Structure

**lego_pairs.json** (APML v9.0 format):
```json
{
  "version": "9.0",
  "seeds": [
    [
      "S0001",
      ["I want", "Dw i"],
      [
        ["S0001L01", "B", "I", "Dw i"],
        ["S0001L02", "B", "want", "eisiau"]
      ]
    ]
  ]
}
```

**Key Properties**:
- Embeds seed_pairs (no separate seed_pairs.json file)
- All conflicts resolved
- Ready for Phase 3 (basket generation)

## Agent Instructions

### Detection Phase (POST /phase2/detect)

1. Load draft_lego_pairs.json
2. Build KNOWN→TARGET collision map
3. Identify conflicts (same KNOWN → multiple TARGETs)
4. Output conflict report with:
   - Conflict count
   - Affected LEGOs
   - Suggested upchunk opportunities

### Upchunking Phase (Claude Agent)

1. Read conflict report
2. For each conflict:
   - Read source seeds
   - Analyze context
   - Design M-type upchunk
   - Record resolution
3. Write upchunk_resolutions.json

### Apply Phase (POST /phase2/apply)

1. Load draft_lego_pairs.json
2. Load upchunk_resolutions.json
3. Apply resolutions:
   - Add M-type upchunks
   - Update affected A-types if needed
4. Write lego_pairs.json (conflict-free)
5. Auto-script introductions at end

## Validation Gates

✅ **Pre-Phase 2**:
- draft_lego_pairs.json exists
- Valid v9.0 format
- All seeds have LEGOs

✅ **Post-Phase 2**:
- lego_pairs.json exists
- No KNOWN→TARGET conflicts
- All upchunks are valid M-types (2+ words both sides)
- Introductions auto-scripted

## Handoff to Phase 3

Phase 3 (Basket Generation) reads lego_pairs.json and generates practice baskets. No manual intervention needed - the pipeline is fully automated.

---

**Last Updated**: Nov 24, 2025
**Related**: See `public/docs/APML_v9.0_PIPELINE_ARCHITECTURE.md` for full specification
