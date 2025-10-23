# APML Registry Update: v7.7.0 → v7.7.1

**Purpose**: Add phase intelligence module references and architecture documentation
**Date**: 2025-10-23
**Changes**: Add `architecture` and `phase_intelligence` sections to registry

---

## Changes Summary

### Version Bump
```json
{
  "version": "7.7.0"  // OLD
  "version": "7.7.1"  // NEW
}
```

### New Top-Level Sections
1. `architecture` - Documents distributed SSoT architecture
2. `phase_intelligence` - References phase intelligence modules
3. `PHASE_PROMPTS.deprecation_notice` - Marks legacy prompts as deprecated

---

## Section 1: Architecture Documentation

Add this section after `"apml_file"`:

```json
{
  "version": "7.7.1",
  "generated_at": "2025-10-23T12:00:00.000Z",
  "apml_file": "ssi-course-production.apml",

  "architecture": {
    "note": "SSoT is distributed across three tiers due to file size constraints",
    "documentation": "docs/DISTRIBUTED_SSOT_ARCHITECTURE.md",

    "tier1_source": {
      "authority": "Canonical source - what developers edit",
      "format": "Human-readable files (markdown, JSON, APML)",
      "locations": {
        "phase_methodology": "docs/phase_intelligence/*.md",
        "data_schemas": "schemas/*.json",
        "variables": "ssi-course-production.apml",
        "legacy_prompts": "ssi-course-production.apml"
      },
      "version_control": "git"
    },

    "tier2_compiled": {
      "authority": "Build artifact - pointer index",
      "format": "JSON registry",
      "file": ".apml-registry.json",
      "generated_by": "scripts/compile-apml-registry.cjs",
      "purpose": "Fast lookups, backwards compatibility, cross-references"
    },

    "tier3_runtime": {
      "authority": "Runtime SSoT - what agents read",
      "format": "REST API",
      "base_url": "http://localhost:3456/api/",
      "endpoints": {
        "phase_intelligence": "/api/phase-intelligence/:phase",
        "prompts_legacy": "/api/prompts/:phase",
        "courses": "/api/courses/:code",
        "schemas": "/api/schemas/:phase"
      },
      "purpose": "Current published methodology that agents execute"
    }
  }
}
```

---

## Section 2: Phase Intelligence Module References

Add this section after `"architecture"`:

```json
{
  "phase_intelligence": {
    "status": "ACTIVE",
    "documentation": "docs/phase_intelligence/README.md",
    "architecture_doc": "docs/DISTRIBUTED_SSOT_ARCHITECTURE.md",
    "api_endpoints_doc": "docs/API_PHASE_INTELLIGENCE_ENDPOINTS.md",

    "modules_directory": "docs/phase_intelligence/",
    "runtime_ssot": "Dashboard API (http://localhost:3456/api/phase-intelligence/:phase)",

    "migration": {
      "status": "In progress",
      "old_pattern": "Agents read PHASE_PROMPTS from .apml-registry.json",
      "new_pattern": "Agents fetch from Dashboard API /api/phase-intelligence/:phase",
      "transition_start": "2025-10-23",
      "deprecation_target": "2025-11-23",
      "reason": "APML too large (60k+ lines), need version tracking per phase"
    },

    "modules": {
      "phase_1": {
        "name": "Pedagogical Translation",
        "source_file": "docs/phase_intelligence/phase_1_translation.md",
        "dashboard_endpoint": "/api/phase-intelligence/1",
        "current_version": null,
        "status": "pending_creation",
        "last_updated": null,
        "key_intelligence": [
          "Cognate preference heuristic",
          "Variation reduction (First Word Wins)",
          "Progressive heuristic curve (seeds 1-100 vs 101-300 vs 301-668)"
        ]
      },

      "phase_2": {
        "name": "Corpus Intelligence",
        "source_file": "docs/phase_intelligence/phase_2_corpus.md",
        "dashboard_endpoint": "/api/phase-intelligence/2",
        "current_version": null,
        "status": "pending_creation",
        "last_updated": null,
        "key_intelligence": [
          "FCFS (First-Can-First-Say) ordering",
          "Utility scoring formula",
          "Semantic territory claiming"
        ]
      },

      "phase_3": {
        "name": "LEGO Extraction",
        "source_file": "docs/phase_intelligence/phase_3_extraction.md",
        "dashboard_endpoint": "/api/phase-intelligence/3",
        "current_version": "2.0",
        "status": "active",
        "last_updated": "2025-10-23T11:30:00Z",
        "key_intelligence": [
          "Minimum reusable unit principle",
          "Preposition wrapping (must be buried in composites)",
          "Multiple composites for maximum reusability",
          "Phase 3/6 separation (data structure vs explanations)",
          "BASE vs COMPOSITE (no separate feeders in v7.0 compact format)"
        ]
      },

      "phase_5": {
        "name": "Basket Generation",
        "source_file": "docs/phase_intelligence/phase_5_baskets.md",
        "dashboard_endpoint": "/api/phase-intelligence/5",
        "current_version": null,
        "status": "pending_creation",
        "last_updated": null,
        "key_intelligence": [
          "E-phrases vs D-phrases (eternal vs debut)",
          "Vocabulary constraint (progressive availability)",
          "LEGO ordering and chronological position",
          "Culminating LEGO rules",
          "7-10 word minimum for e-phrases"
        ]
      },

      "phase_6": {
        "name": "Introduction Generation",
        "source_file": "docs/phase_intelligence/phase_6_introductions.md",
        "dashboard_endpoint": "/api/phase-intelligence/6",
        "current_version": null,
        "status": "future_phase",
        "last_updated": null,
        "note": "Phase 6 reads component arrays from Phase 3 and generates intelligent introductions explaining composite breakdowns"
      }
    },

    "publishing_workflow": [
      "1. Discover intelligence during hands-on work",
      "2. Update local module: docs/phase_intelligence/phase_X.md",
      "3. Bump version in module header",
      "4. Git commit with description of changes",
      "5. Update this registry: phase_intelligence.modules.phase_X.current_version",
      "6. Publish to dashboard: PUT /api/phase-intelligence/:phase",
      "7. Dashboard becomes runtime SSoT for agents"
    ]
  }
}
```

---

## Section 3: Deprecation Notice in PHASE_PROMPTS

Update the existing `PHASE_PROMPTS` section:

```json
{
  "PHASE_PROMPTS": {
    "deprecation": {
      "status": "DEPRECATED",
      "reason": "APML too large for atomic edits, need per-phase version tracking",
      "migration_to": "phase_intelligence modules (see phase_intelligence section above)",
      "fallback_until": "2025-11-23",
      "instructions": "Agents should read from /api/phase-intelligence/:phase instead"
    },

    "PHASE_1": {
      "phase": "1",
      "name": "Pedagogical Translation",
      "prompt": "..."  // Existing content for backwards compatibility
    },

    "PHASE_2": {
      "phase": "2",
      "name": "Corpus Intelligence",
      "prompt": "..."
    },

    // ... rest of existing prompts ...
  }
}
```

---

## Manual Update Steps

Since `.apml-registry.json` is large and was just regenerated, we need to carefully add these sections:

### Step 1: Open Registry
```bash
code .apml-registry.json
```

### Step 2: Update Version (Line 2)
```json
"version": "7.7.1",
```

### Step 3: Update Generated Timestamp (Line 3)
```json
"generated_at": "2025-10-23T12:00:00.000Z",
```

### Step 4: Insert Architecture Section
After line 4 (`"apml_file": "ssi-course-production.apml",`), add the `architecture` section.

### Step 5: Insert Phase Intelligence Section
After the `architecture` section, add the `phase_intelligence` section.

### Step 6: Update PHASE_PROMPTS
Find the `"PHASE_PROMPTS"` key (around line 25 in current file) and add the deprecation notice at the top of that object.

### Step 7: Validate JSON
```bash
node -e "JSON.parse(require('fs').readFileSync('.apml-registry.json', 'utf8'))"
```

### Step 8: Commit
```bash
git add .apml-registry.json
git commit -m "v7.7.1: Add phase intelligence module references and architecture docs"
```

---

## Verification Commands

After update, verify the structure:

```bash
# Check version
node -e "console.log(require('./.apml-registry.json').version)"
# Should output: 7.7.1

# Check architecture section exists
node -e "console.log(JSON.stringify(require('./.apml-registry.json').architecture, null, 2))"

# Check phase intelligence section exists
node -e "console.log(JSON.stringify(require('./.apml-registry.json').phase_intelligence, null, 2))"

# List phase intelligence modules
node -e "const r = require('./.apml-registry.json'); Object.keys(r.phase_intelligence.modules).forEach(k => console.log(k, r.phase_intelligence.modules[k].status))"
# Should output:
# phase_1 pending_creation
# phase_2 pending_creation
# phase_3 active
# phase_5 pending_creation
# phase_6 future_phase
```

---

## What This Update Achieves

### ✅ Self-Documenting Registry
- Architecture explained in registry itself
- References to docs for more detail
- Clear authority hierarchy (Tier 1/2/3)

### ✅ Phase Intelligence Tracking
- Module locations documented
- Current versions tracked
- Status per phase (active, pending, future)
- Key intelligence summarized

### ✅ Migration Path
- Deprecation notices clear
- Timeline specified
- Old and new patterns documented
- Backwards compatibility maintained

### ✅ API Endpoints Referenced
- Dashboard endpoints documented
- Easy for agents to find
- Clear runtime SSoT authority

---

## Testing After Update

### Test 1: Registry Loads
```bash
node automation_server.cjs
# Should start without errors
# Should see: ✅ Loaded X phase prompts from APML registry
```

### Test 2: Architecture Available
```javascript
const registry = require('./.apml-registry.json');
console.log(registry.architecture.tier3_runtime.base_url);
// Should output: http://localhost:3456/api/
```

### Test 3: Phase Intelligence Available
```javascript
const registry = require('./.apml-registry.json');
const phase3 = registry.phase_intelligence.modules.phase_3;
console.log(phase3.current_version, phase3.status);
// Should output: 2.0 active
```

---

## Changelog for v7.7.1

**Added**:
- `architecture` section documenting distributed SSoT tiers
- `phase_intelligence` section with module references
- `phase_intelligence.modules` tracking for phases 1, 2, 3, 5, 6
- Deprecation notice in `PHASE_PROMPTS`

**Changed**:
- Version: 7.7.0 → 7.7.1
- Generated timestamp updated

**Backwards Compatible**:
- ✅ All existing `PHASE_PROMPTS` remain
- ✅ No breaking changes to structure
- ✅ Agents using old endpoints still work

---

**This update makes the registry self-documenting and creates the foundation for the distributed SSoT architecture.**
