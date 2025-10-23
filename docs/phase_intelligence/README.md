# Phase Intelligence Modules

**Purpose**: Modular, publishable methodology documents for each course generation phase.

**SSoT Architecture**:
- Dashboard reads these modules and serves them to agents at runtime
- Agents read from dashboard API (not local files)
- Each module is versioned and can be updated independently
- Dashboard always serves the latest published version

---

## Module Structure

Each phase intelligence module contains:
1. **Version & Status** - Tracking evolution of methodology
2. **Core Principles** - Fundamental rules and heuristics
3. **Patterns & Examples** - Language-specific applications
4. **Validation Checklist** - Quality assurance rules
5. **Anti-patterns** - Common mistakes to avoid
6. **Version History** - What changed and why

---

## Available Modules

### Phase 1: Pedagogical Translation
**File**: `phase_1_translation.md`
**Status**: ⏳ Not yet created
**Focus**:
- Cognate preference
- Variation reduction
- Progressive heuristic curve

### Phase 3: LEGO Extraction
**File**: `phase_3_extraction.md`
**Status**: ✅ **Active (v2.0)**
**Focus**:
- Minimum reusable unit principle
- Preposition wrapping
- Multiple composites for reusability
- Component data vs explanations (Phase 3/6 separation)

**Latest updates (2025-10-23)**:
- Added minimum unit heuristic (no "Sto", "a" fragments)
- Clarified preposition wrapping (must be buried in composites)
- Multiple composites strategy (maximize reusability)
- Phase 3/Phase 6 responsibility separation

### Phase 5: Basket Generation
**File**: `phase_5_baskets.md`
**Status**: ⏳ Not yet created
**Focus**:
- E-phrases vs d-phrases
- Vocabulary constraint (progressive availability)
- LEGO ordering and chronological position
- Culminating LEGO rules

### Phase 6: Introduction Generation
**File**: `phase_6_introductions.md`
**Status**: ✅ **Active (v1.0)**
**Focus**:
- Reading component arrays from Phase 3
- Generating natural language presentations
- Seed context requirement ("as in...")
- Type-specific formats (BASE/FEEDER/COMPOSITE)

**Latest updates (2025-10-23)**:
- Initial implementation complete
- Three presentation types with distinct formats
- Component grammar rules for COMPOSITE LEGOs
- FEEDER recognition with "learned earlier" text

### Phase 7: Course Manifest Compilation
**File**: `phase_7_compilation.md`
**Status**: ✅ **Active (v1.0)**
**Focus**:
- Compiling v7.7 format to legacy app manifest
- Deterministic UUID generation (SSi legacy format)
- Single slice architecture
- Comprehensive audio sample registration

**Latest updates (2025-10-23)**:
- Initial implementation complete
- Role-specific UUID segments (target1/target2/source)
- Empty tokens/lemmas for backwards compatibility
- Practice phrase flattening from expanding windows

---

## Usage Pattern

### Development Workflow
1. Discover new intelligence during hands-on work
2. Update relevant phase module immediately
3. Commit to version control
4. Publish to dashboard via API

### Runtime Workflow
1. Agent triggered from dashboard
2. Dashboard serves latest phase intelligence via API
3. Agent applies methodology
4. Results validated against intelligence rules

---

## Publishing to Dashboard

**API Endpoint**: `PUT /api/phase-intelligence/:phase`

**Example**:
```bash
curl -X PUT http://localhost:5000/api/phase-intelligence/3 \
  -H "Content-Type: text/markdown" \
  --data-binary @docs/phase_intelligence/phase_3_extraction.md
```

Dashboard stores:
- Latest version of each module
- Version history
- Timestamp of last update
- Agent access logs

---

## Why Modular Intelligence?

**Problem**: APML registry is too large to edit atomically
**Solution**: Break intelligence into publishable modules

**Benefits**:
1. ✅ Incremental updates (edit one phase at a time)
2. ✅ Version tracking (know what changed when)
3. ✅ Dashboard SSoT (agents always read latest)
4. ✅ Independent evolution (Phase 3 updates don't affect Phase 5)
5. ✅ Easier review (focused, single-concern documents)

**Principle**: Capture intelligence the moment we discover it, publish immediately to runtime SSoT.

---

## Next Steps

1. Create Phase 1 and Phase 5 intelligence modules
2. Implement dashboard API endpoint for phase intelligence
3. Update agent trigger logic to read from dashboard
4. Build version diffing UI in dashboard

---

**Remember**: The dashboard is the SSoT for agents. These docs are the source, but dashboard is the authority.
