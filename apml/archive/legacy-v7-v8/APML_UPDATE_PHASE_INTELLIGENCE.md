# APML Registry Update: Phase Intelligence References

**Purpose**: Add phase intelligence module references to `.apml-registry.json`

**Location to update**: `.apml-registry.json` → Add new top-level section

---

## New Section to Add

Add this as a sibling to `"variable_registry"`, `"PHASE_PROMPTS"`, and `"system"`:

```json
{
  "version": "7.0.1",
  "generated_at": "2025-10-23T12:00:00.000Z",
  "apml_file": "ssi-course-production.apml",

  "phase_intelligence": {
    "architecture_doc": "docs/APML_INTELLIGENCE_ARCHITECTURE.md",
    "modules_directory": "docs/phase_intelligence/",
    "runtime_ssot": "Dashboard API (http://localhost:5000/api/phase-intelligence/:phase)",
    "status": "ACTIVE - Dashboard is runtime SSoT for agents",

    "modules": {
      "phase_1": {
        "name": "Pedagogical Translation",
        "source_file": "docs/phase_intelligence/phase_1_translation.md",
        "dashboard_endpoint": "/api/phase-intelligence/1",
        "current_version": "1.0",
        "status": "pending_creation",
        "last_updated": null
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
          "Multiple composites for reusability",
          "Phase 3/6 separation (data vs explanations)"
        ]
      },

      "phase_5": {
        "name": "Basket Generation",
        "source_file": "docs/phase_intelligence/phase_5_baskets.md",
        "dashboard_endpoint": "/api/phase-intelligence/5",
        "current_version": "1.0",
        "status": "pending_creation",
        "last_updated": null
      },

      "phase_6": {
        "name": "Introduction Generation",
        "source_file": "docs/phase_intelligence/phase_6_introductions.md",
        "dashboard_endpoint": "/api/phase-intelligence/6",
        "current_version": "0.1",
        "status": "future_phase",
        "last_updated": null,
        "note": "Phase 6 will read component arrays from Phase 3 and generate intelligent introductions"
      }
    },

    "migration_notes": {
      "old_pattern": "Agents read PHASE_PROMPTS from .apml-registry.json",
      "new_pattern": "Agents fetch from Dashboard API /api/phase-intelligence/:phase",
      "transition_period": "2025-10-23 to 2025-11-23",
      "deprecation_date": "2025-11-23",
      "reason": "APML too large (60k+ lines), risk of losing intelligence, need version tracking"
    },

    "publishing_workflow": [
      "1. Discover intelligence during hands-on work",
      "2. Update local module: docs/phase_intelligence/phase_X.md",
      "3. Git commit with description of changes",
      "4. Publish to dashboard: PUT /api/phase-intelligence/:phase",
      "5. Dashboard becomes runtime SSoT for agents"
    ]
  },

  "variable_registry": { ... existing content ... },
  "PHASE_PROMPTS": {
    "deprecation_notice": "PHASE_PROMPTS in APML are deprecated. Agents should read from Dashboard API /api/phase-intelligence/:phase for latest methodology. See phase_intelligence.modules for module locations.",
    ... existing content ...
  },
  "system": { ... existing content ... }
}
```

---

## Key Changes

### 1. New Top-Level Section: `phase_intelligence`
References modular intelligence system:
- Module locations
- Dashboard endpoints
- Current versions
- Status tracking

### 2. Deprecation Notice in PHASE_PROMPTS
Clear signal that old pattern is deprecated:
```json
"PHASE_PROMPTS": {
  "deprecation_notice": "Read from Dashboard API instead",
  ...
}
```

### 3. Migration Tracking
- Old pattern documented
- New pattern documented
- Transition timeline
- Reason for change

---

## Why This Structure?

### APML Remains Pointer Registry
- References WHERE intelligence lives
- Points to dashboard as runtime SSoT
- Tracks versions and status
- Explains the architecture

### Dashboard Becomes Authority
- Agents read from dashboard API
- Always latest published methodology
- Version history available
- Audit trail of changes

### Local Files Remain Source
- Version controlled in git
- Easy to edit (markdown)
- Commit messages explain changes
- Push to dashboard when ready

---

## Agent Usage Pattern

### Old (Deprecated)
```javascript
const registry = require('.apml-registry.json')
const phase3Prompt = registry.PHASE_PROMPTS.PHASE_3.prompt
```

### New (Active)
```javascript
const dashboardUrl = process.env.DASHBOARD_URL
const phase = 3

// Fetch latest methodology from dashboard
const response = await fetch(`${dashboardUrl}/api/phase-intelligence/${phase}`)
const methodology = await response.json()

// Apply methodology
console.log(`Applying Phase ${phase} methodology v${methodology.version}`)
// ... use methodology.content ...
```

---

## Manual Update Steps

Since `.apml-registry.json` is large (60k+ lines), we can't edit it directly with tools. Instead:

1. **Manual edit**:
   - Open `.apml-registry.json` in editor
   - Find line with `"version": "7.0.0"`
   - Change to `"version": "7.0.1"`
   - Add `phase_intelligence` section after `"apml_file"` property
   - Add deprecation notice in `PHASE_PROMPTS` section
   - Save file

2. **Validate JSON**:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('.apml-registry.json', 'utf8'))"
   ```

3. **Commit**:
   ```bash
   git add .apml-registry.json
   git commit -m "Add phase intelligence module references to APML registry"
   ```

---

## Verification

After update, verify:
```bash
# Extract phase_intelligence section
node -e "const r = require('./.apml-registry.json'); console.log(JSON.stringify(r.phase_intelligence, null, 2))"

# Should show modules, endpoints, versions
```

---

**This update makes APML a lightweight pointer to the real SSoT (Dashboard), while keeping intelligence modular and version controlled.**
