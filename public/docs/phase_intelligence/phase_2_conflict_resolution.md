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
4. **Apply LEGO reuse tracking** (see below)
5. Write lego_pairs.json (conflict-free, with reuse markers)
6. Auto-script introductions at end

---

## 🔄 LEGO Reuse Tracking (CRITICAL)

Phase 2 is responsible for marking LEGO reuse across the entire course. Every seed's breakdown must be **complete** (all LEGOs needed to reconstruct the sentence), with proper `new` flags.

### The Algorithm

```
seen_legos = {} // key: "known|target" (normalized) → value: original LEGO ID

FOR each seed in order (S0001, S0002, ...):
    FOR each LEGO in seed.legos:
        key = normalize(lego.known) + "|" + normalize(lego.target)

        IF key in seen_legos:
            // REUSED LEGO - mark as not new, reference original ID
            lego.new = false
            lego.ref = seen_legos[key]  // Original LEGO ID
        ELSE:
            // NEW LEGO - first occurrence
            lego.new = true
            seen_legos[key] = lego.id
```

### Key Rules

1. **NEVER remove** a LEGO from a seed's breakdown just because it appeared before
2. **Mark as `new: false`** any LEGO that matches a previously-seen LEGO
3. **Keep complete breakdowns** - every seed lists ALL LEGOs needed to decompose it
4. **Reference original ID** via `ref` field for traceability

### Example Output

```json
{
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {"known": "I want to speak", "target": "Quiero hablar"},
      "legos": [
        {"id": "S0001L01", "type": "A", "new": true, "lego": {"known": "I want to", "target": "quiero"}},
        {"id": "S0001L02", "type": "A", "new": true, "lego": {"known": "to speak", "target": "hablar"}}
      ]
    },
    {
      "seed_id": "S0010",
      "seed_pair": {"known": "I want to go", "target": "Quiero ir"},
      "legos": [
        {"id": "S0001L01", "type": "A", "new": false, "ref": "S0001L01", "lego": {"known": "I want to", "target": "quiero"}},
        {"id": "S0010L01", "type": "A", "new": true, "lego": {"known": "to go", "target": "ir"}}
      ]
    }
  ]
}
```

### Why This Matters

The dashboard displays complete seed breakdowns. Without reuse tracking:
- ❌ Seeds appear incomplete (missing LEGOs)
- ❌ Can't show how sentences decompose into their LEGO parts
- ❌ No visibility into vocabulary building progression

With proper reuse tracking:
- ✅ Every seed shows complete breakdown
- ✅ New LEGOs highlighted, reused LEGOs shown dimmed
- ✅ Clear visualization of how vocabulary builds over time

## Validation Gates

✅ **Pre-Phase 2**:
- draft_lego_pairs.json exists
- Valid v9.0 format
- All seeds have LEGOs

✅ **Post-Phase 2**:
- lego_pairs.json exists
- No KNOWN→TARGET conflicts
- All upchunks are valid M-types (2+ words both sides)
- **All seeds have complete breakdowns** (no missing LEGOs)
- **Reuse tracking applied** (new: true/false flags set correctly)
- Introductions auto-scripted

## Handoff to Phase 3

Phase 3 (Basket Generation) reads lego_pairs.json and generates practice baskets. No manual intervention needed - the pipeline is fully automated.

---

**Last Updated**: Nov 25, 2025
**Related**: See `public/docs/APML_v9.0_PIPELINE_ARCHITECTURE.md` for full specification
