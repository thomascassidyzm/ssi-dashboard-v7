# APML Intelligence Architecture - SSoT Flow

**Version**: 7.0.1 (2025-10-23)
**Status**: Active architecture for phase intelligence management

---

## The Three-Layer SSoT Model

### Layer 1: Source Files (Version Controlled)
**Location**: `docs/phase_intelligence/*.md`
**Purpose**: Canonical source, version controlled in git
**Who writes**: Developers during hands-on work

**Modules**:
- `phase_1_translation.md` - Pedagogical translation methodology
- `phase_3_extraction.md` - LEGO extraction methodology (v2.0 ACTIVE)
- `phase_5_baskets.md` - Basket generation methodology
- `phase_6_introductions.md` - Introduction generation (future)

### Layer 2: APML Registry (Pointer)
**Location**: `.apml-registry.json`
**Purpose**: References to intelligence modules, not full content
**Who reads**: Dashboard sync process

**Structure**:
```json
{
  "phase_intelligence": {
    "phase_1": {
      "module": "docs/phase_intelligence/phase_1_translation.md",
      "api_endpoint": "/api/phase-intelligence/1",
      "current_version": "1.0",
      "last_published": "2025-10-23T10:00:00Z"
    },
    "phase_3": {
      "module": "docs/phase_intelligence/phase_3_extraction.md",
      "api_endpoint": "/api/phase-intelligence/3",
      "current_version": "2.0",
      "last_published": "2025-10-23T11:30:00Z"
    }
  }
}
```

### Layer 3: Dashboard (Runtime SSoT)
**Location**: Dashboard API endpoints
**Purpose**: What agents ACTUALLY read at runtime
**Who reads**: Claude Code agents triggered from dashboard

**API Endpoints**:
- `GET /api/phase-intelligence/:phase` - Fetch current methodology
- `PUT /api/phase-intelligence/:phase` - Publish updated module
- `GET /api/phase-intelligence/:phase/history` - Version history
- `GET /api/phase-intelligence` - List all modules

---

## Intelligence Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DISCOVERY (hands-on work)                                │
│    Developer identifies new intelligence                     │
│    Example: "prepositions must be wrapped in composites"    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CAPTURE (local files)                                     │
│    Update: docs/phase_intelligence/phase_3_extraction.md    │
│    Version bump: v1.0 → v2.0                                │
│    Git commit: "Add preposition wrapping intelligence"      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PUBLISH (push to dashboard)                               │
│    POST /api/phase-intelligence/3                            │
│    Body: Full markdown content                               │
│    Dashboard stores: content + version + timestamp          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RUNTIME (agents read from dashboard)                     │
│    Agent triggered: "Generate Phase 3 LEGOs"                │
│    Agent fetches: GET /api/phase-intelligence/3             │
│    Agent applies: v2.0 methodology with wrapping rules      │
│    Agent validates: Output checked against v2.0 rules       │
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Architecture?

### Problem: Monolithic APML
- `.apml-registry.json` was growing too large (60k+ lines)
- Editing prompt intelligence was difficult
- Risk of losing newly discovered methodology
- No version tracking of intelligence evolution

### Solution: Modular Intelligence + Dashboard SSoT
- ✅ Modular files (easy to edit one phase at a time)
- ✅ Version controlled (git tracks changes)
- ✅ Published via API (dashboard is runtime authority)
- ✅ Agents always read latest (no stale local files)
- ✅ Audit trail (who published what when)

---

## Publishing Workflow

### Manual Publish (Development)
```bash
# After updating phase_3_extraction.md locally:
curl -X PUT http://localhost:5000/api/phase-intelligence/3 \
  -H "Content-Type: text/markdown" \
  --data-binary @docs/phase_intelligence/phase_3_extraction.md

# Response:
{
  "phase": 3,
  "version": "2.0",
  "published_at": "2025-10-23T11:30:00Z",
  "status": "active"
}
```

### Automatic Publish (CI/CD - Future)
```yaml
# .github/workflows/publish-intelligence.yml
on:
  push:
    paths:
      - 'docs/phase_intelligence/**'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Publish to Dashboard
        run: |
          for file in docs/phase_intelligence/phase_*.md; do
            phase=$(echo $file | grep -oP 'phase_\K[0-9]+')
            curl -X PUT $DASHBOARD_URL/api/phase-intelligence/$phase \
              -H "Content-Type: text/markdown" \
              --data-binary @$file
          done
```

---

## Agent Integration

### Before (Old Pattern)
```javascript
// Agent reads local file
const prompt = fs.readFileSync('.apml-registry.json')
const phase3 = prompt.PHASE_PROMPTS.PHASE_3
// Stale if dashboard updated!
```

### After (New Pattern)
```javascript
// Agent reads from dashboard API
const intelligence = await fetch(`${DASHBOARD_URL}/api/phase-intelligence/3`)
const phase3Methodology = await intelligence.json()
// Always latest published version
```

---

## Dashboard Storage

### Database Schema
```sql
CREATE TABLE phase_intelligence (
  id SERIAL PRIMARY KEY,
  phase INT NOT NULL,
  version VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMP DEFAULT NOW(),
  published_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(phase, version)
);

-- Active version per phase
CREATE INDEX idx_active_phase ON phase_intelligence(phase, is_active);
```

### API Response Format
```json
{
  "phase": 3,
  "version": "2.0",
  "content": "# Phase 3: LEGO Extraction Intelligence\n\n...",
  "published_at": "2025-10-23T11:30:00Z",
  "status": "active"
}
```

---

## Backward Compatibility

### During Transition
Dashboard serves BOTH:
1. Old: `.apml-registry.json` PHASE_PROMPTS (deprecated)
2. New: Phase intelligence modules (active)

Agents gradually migrate from old to new pattern.

### Deprecation Timeline
- **Phase 1** (now): Create modules, publish to dashboard
- **Phase 2** (1 week): Agents read from dashboard API
- **Phase 3** (2 weeks): Old PHASE_PROMPTS marked deprecated
- **Phase 4** (1 month): Remove old PHASE_PROMPTS entirely

---

## Version Management

### Semantic Versioning
- **Major** (1.0 → 2.0): Breaking changes in methodology
- **Minor** (2.0 → 2.1): New patterns/examples added
- **Patch** (2.1.0 → 2.1.1): Typo fixes, clarifications

### Version History API
```bash
GET /api/phase-intelligence/3/history

Response:
[
  {
    "version": "2.0",
    "published_at": "2025-10-23T11:30:00Z",
    "changes": "Added preposition wrapping, minimum unit principle",
    "is_active": true
  },
  {
    "version": "1.0",
    "published_at": "2025-10-15T10:00:00Z",
    "changes": "Initial extraction rules, FD compliance",
    "is_active": false
  }
]
```

---

## Benefits for Development

### Immediate Intelligence Capture
- Discover intelligence → Update module → Commit
- No risk of losing insights
- Version controlled evolution

### Rapid Iteration
- Edit single file (not 60k line JSON)
- Test locally, publish when ready
- Rollback to previous version if needed

### Audit Trail
- Who changed what methodology when
- Why changes were made (git commit messages)
- Which agents used which version

### Collaboration
- Multiple developers can work on different phases
- Clear ownership per module
- Review process focuses on one methodology at a time

---

## Critical Rules

1. **Dashboard is Runtime SSoT**
   - Agents MUST read from dashboard API
   - Local files are source, not authority

2. **Publish Immediately**
   - When methodology changes, publish same day
   - Don't let local and dashboard versions diverge

3. **Version Bumps**
   - Breaking changes → major version
   - Always document what changed in version history

4. **No Inline Edits**
   - Edit local modules, not dashboard database directly
   - Publish flow ensures audit trail

---

## Next Implementation Tasks

### Dashboard API (Priority 1)
- [ ] `GET /api/phase-intelligence/:phase` - Fetch active methodology
- [ ] `PUT /api/phase-intelligence/:phase` - Publish new version
- [ ] `GET /api/phase-intelligence/:phase/history` - Version history
- [ ] Database schema + migrations

### Agent Integration (Priority 2)
- [ ] Update agent trigger to fetch from dashboard
- [ ] Add version logging (which agent used which version)
- [ ] Error handling (dashboard unavailable fallback)

### Dashboard UI (Priority 3)
- [ ] Phase intelligence viewer
- [ ] Version diff viewer
- [ ] Publish interface (manual upload)
- [ ] Usage analytics (which versions used when)

---

**This architecture ensures we never lose intelligence and agents always use the latest methodology.**
