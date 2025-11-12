# Intelligence Location Map - Where Does Each Phase's Intelligence Live?

**Question**: For each step in the course generation process, where is the "how to do this" intelligence stored?

---

## Current State (v7.7.0 / v7.7.1)

### Phase 1: Pedagogical Translation
**Intelligence**: How to translate 668 seeds with cognate preference and variation reduction

**Current Location**:
- ⚠️ **LEGACY**: `ssi-course-production.apml` → `PHASE_PROMPTS.PHASE_1.prompt`
- ⚠️ **LEGACY**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_1.prompt`

**Target Location** (not yet created):
- ⏳ `docs/phase_intelligence/phase_1_translation.md` (v1.0)

**Accessed By Agents**:
- ✅ Currently: `GET /api/prompts/1` → Returns legacy prompt
- ⏳ Future: `GET /api/phase-intelligence/1` → Will return module

**Status**: **MIGRATION NEEDED** - Still using legacy, need to create module

---

### Phase 2: Corpus Intelligence
**Intelligence**: How to analyze corpus for FCFS ordering and utility scores

**Current Location**:
- ⚠️ **LEGACY**: `ssi-course-production.apml` → `PHASE_PROMPTS.PHASE_2.prompt`
- ⚠️ **LEGACY**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_2.prompt`

**Target Location** (not yet created):
- ⏳ `docs/phase_intelligence/phase_2_corpus.md` (v1.0)

**Accessed By Agents**:
- ✅ Currently: `GET /api/prompts/2` → Returns legacy prompt
- ⏳ Future: `GET /api/phase-intelligence/2` → Will return module

**Status**: **MIGRATION NEEDED** - Still using legacy, need to create module

---

### Phase 3: LEGO Extraction ✅ MIGRATED
**Intelligence**: How to break sentences into FD-compliant LEGOs with composability rules

**Current Location**:
- ✅ **PRIMARY**: `docs/phase_intelligence/phase_3_extraction.md` (v2.0)
- ⚠️ **LEGACY FALLBACK**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_3.prompt`

**Target Location**:
- ✅ **ACTIVE**: `docs/phase_intelligence/phase_3_extraction.md` (v2.0)

**Accessed By Agents**:
- ⏳ Future: `GET /api/phase-intelligence/3` → Returns v2.0 module
- ⚠️ Fallback: `GET /api/prompts/3` → Returns legacy prompt

**Status**: ✅ **MIGRATED** - Module created with latest intelligence
**Key Intelligence** (v2.0):
- Minimum reusable unit principle
- Preposition wrapping (must be buried)
- Multiple composites for reusability
- Phase 3/6 separation

---

### Phase 3.5: Graph Construction
**Intelligence**: How to build LEGO adjacency graph

**Current Location**:
- ⚠️ **LEGACY**: `ssi-course-production.apml` → `PHASE_PROMPTS.PHASE_3_5.prompt`
- ⚠️ **LEGACY**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_3_5.prompt`

**Target Location** (not yet created):
- ⏳ `docs/phase_intelligence/phase_3_5_graph.md` (v1.0)

**Accessed By Agents**:
- ✅ Currently: `GET /api/prompts/3.5` → Returns legacy prompt
- ⏳ Future: `GET /api/phase-intelligence/3.5` → Will return module

**Status**: **MIGRATION NEEDED** - Still using legacy, need to create module

---

### Phase 5: Basket Generation
**Intelligence**: How to generate e-phrases and d-phrases with vocabulary constraints

**Current Location**:
- ⚠️ **LEGACY**: `ssi-course-production.apml` → `PHASE_PROMPTS.PHASE_5.prompt`
- ⚠️ **LEGACY**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_5.prompt`

**Target Location** (not yet created):
- ⏳ `docs/phase_intelligence/phase_5_baskets.md` (v1.0)

**Accessed By Agents**:
- ✅ Currently: `GET /api/prompts/5` → Returns legacy prompt
- ⏳ Future: `GET /api/phase-intelligence/5` → Will return module

**Status**: **MIGRATION NEEDED** - Still using legacy, need to create module

---

### Phase 5.5: Basket Deduplication
**Intelligence**: How to deduplicate baskets (NOTE: Prompt mislabeled as "Phase 6")

**Current Location**:
- ⚠️ **LEGACY**: `ssi-course-production.apml` → `PHASE_PROMPTS.PHASE_5_5.prompt`
- ⚠️ **LEGACY**: `.apml-registry.json` → `variable_registry.PHASE_PROMPTS.PHASE_5_5.prompt`

**Target Location** (not yet created):
- ⏳ `docs/phase_intelligence/phase_5_5_dedup.md` (v1.0)

**Accessed By Agents**:
- ✅ Currently: `GET /api/prompts/5.5` → Returns legacy prompt
- ⏳ Future: `GET /api/phase-intelligence/5.5` → Will return module

**Status**: **MIGRATION NEEDED** - Still using legacy, need to create module
**Note**: Legacy prompt header says "Phase 6: Introductions" but is actually deduplication logic

---

### Phase 6: Introduction Generation (Future)
**Intelligence**: How to read component arrays and generate intelligent explanations

**Current Location**:
- ❌ **DOES NOT EXIST YET**

**Target Location**:
- ⏳ `docs/phase_intelligence/phase_6_introductions.md` (v0.1)

**Accessed By Agents**:
- ⏳ Future: `GET /api/phase-intelligence/6` → Will return module

**Status**: **FUTURE PHASE** - Not yet implemented
**Purpose**: Read Phase 3 component arrays and generate explanations like:
> "The Italian for 'I'm trying' as in seed S0002 is **Sto provando** - where **Sto** represents 'I'm', **provando** is 'trying'..."

---

## Visual Map

```
Phase 1: Translation
├─ Current: APML PHASE_PROMPTS ⚠️ LEGACY
└─ Target:  phase_1_translation.md ⏳ TODO

Phase 2: Corpus Intelligence
├─ Current: APML PHASE_PROMPTS ⚠️ LEGACY
└─ Target:  phase_2_corpus.md ⏳ TODO

Phase 3: LEGO Extraction ✅ DONE
├─ Current: phase_3_extraction.md v2.0 ✅ ACTIVE
└─ Fallback: APML PHASE_PROMPTS ⚠️ (backwards compat)

Phase 3.5: Graph Construction
├─ Current: APML PHASE_PROMPTS ⚠️ LEGACY
└─ Target:  phase_3_5_graph.md ⏳ TODO

Phase 5: Basket Generation
├─ Current: APML PHASE_PROMPTS ⚠️ LEGACY
└─ Target:  phase_5_baskets.md ⏳ TODO

Phase 5.5: Deduplication
├─ Current: APML PHASE_PROMPTS ⚠️ LEGACY
└─ Target:  phase_5_5_dedup.md ⏳ TODO

Phase 6: Introductions
├─ Current: DOES NOT EXIST ❌
└─ Target:  phase_6_introductions.md ⏳ FUTURE
```

---

## Access Patterns

### Current (Legacy Pattern)
```javascript
// Agent reads from APML PHASE_PROMPTS
const registry = require('./.apml-registry.json');
const phase1Intelligence = registry.variable_registry.PHASE_PROMPTS.PHASE_1.prompt;
```

**OR via Dashboard**:
```javascript
// Agent reads via Dashboard API
const response = await fetch('http://localhost:3456/api/prompts/1');
const { prompt } = await response.json();
```

---

### Target (Module Pattern)
```javascript
// Agent reads from phase intelligence module
const response = await fetch('http://localhost:3456/api/phase-intelligence/1');
const methodology = await response.json();
console.log(`Applying v${methodology.version} methodology`);
// Use methodology.content
```

**Backwards Compatible Fallback**:
If module doesn't exist, Dashboard automatically falls back to legacy PHASE_PROMPTS.

---

## Migration Priority

### High Priority (Core Phases)
1. ✅ **Phase 3** - DONE (v2.0 with today's learnings)
2. ⏳ **Phase 1** - Translation rules critical for quality
3. ⏳ **Phase 5** - Basket generation has complex rules

### Medium Priority (Supporting Phases)
4. ⏳ **Phase 2** - Corpus analysis (less frequently updated)
5. ⏳ **Phase 3.5** - Graph construction (stable algorithm)
6. ⏳ **Phase 5.5** - Deduplication (simple logic)

### Future Priority
7. ⏳ **Phase 6** - Doesn't exist yet, will create when implementing

---

## Intelligence Update Workflow

### Current State (Legacy)
```
1. Discovery: "Prepositions must be wrapped"
2. Update: Edit ssi-course-production.apml (huge file, scary)
3. Compile: node scripts/compile-apml-registry.cjs
4. Restart: Server picks up new prompt
5. Hope: Nothing broke in the 60k-line file
```

**Problems**:
- ❌ Single huge file
- ❌ No per-phase version tracking
- ❌ Risky to edit
- ❌ Git history mixed across all phases

---

### Target State (Modular)
```
1. Discovery: "Prepositions must be wrapped"
2. Update: Edit docs/phase_intelligence/phase_3_extraction.md
   - Small focused file
   - Bump version 2.0 → 2.1
3. Commit: git commit -m "Add preposition wrapping rule"
4. Publish: PUT /api/phase-intelligence/3
5. Dashboard: Serves v2.1 to agents
6. History: Clear git log for just this phase
```

**Benefits**:
- ✅ Small focused files
- ✅ Per-phase version tracking
- ✅ Safe to edit
- ✅ Clear git history per phase
- ✅ Can rollback one phase without affecting others

---

## Where Intelligence Is RIGHT NOW (Summary Table)

| Phase | Intelligence Location | Format | Version | Status |
|-------|----------------------|---------|---------|--------|
| 1 | APML PHASE_PROMPTS | APML prompt | 7.7.0 | ⚠️ Legacy |
| 2 | APML PHASE_PROMPTS | APML prompt | 7.7.0 | ⚠️ Legacy |
| **3** | **phase_3_extraction.md** | **Markdown** | **v2.0** | **✅ Migrated** |
| 3.5 | APML PHASE_PROMPTS | APML prompt | 7.7.0 | ⚠️ Legacy |
| 5 | APML PHASE_PROMPTS | APML prompt | 7.7.0 | ⚠️ Legacy |
| 5.5 | APML PHASE_PROMPTS | APML prompt | 7.7.0 | ⚠️ Legacy |
| 6 | DOES NOT EXIST | N/A | N/A | ⏳ Future |

---

## Migration Tracking

### Completed (1/7)
- ✅ Phase 3 extracted and documented (v2.0)

### Pending (5/7)
- ⏳ Phase 1 - Need to extract from APML
- ⏳ Phase 2 - Need to extract from APML
- ⏳ Phase 3.5 - Need to extract from APML
- ⏳ Phase 5 - Need to extract from APML
- ⏳ Phase 5.5 - Need to extract from APML

### Future (1/7)
- ⏳ Phase 6 - Doesn't exist yet

**Progress**: 14% complete (1 of 7 phases migrated)

---

## Next Actions

### Immediate (Today)
1. ✅ Phase 3 module created (v2.0)
2. ⏳ Update registry to v7.7.1 (add phase_intelligence section)
3. ⏳ Add API endpoints to automation_server.cjs
4. ⏳ Test Phase 3 via new endpoint

### This Week
1. Extract Phase 1 intelligence from APML → create module
2. Extract Phase 5 intelligence from APML → create module
3. Test agents using new endpoints

### This Month
1. Complete migration of all phases
2. Dashboard UI for viewing modules
3. Deprecate APML PHASE_PROMPTS
4. All agents reading from phase intelligence

---

## Key Insight

**Right now**: Intelligence is **split** between:
- ✅ 1 modern module (Phase 3)
- ⚠️ 5 legacy APML prompts (Phases 1, 2, 3.5, 5, 5.5)
- ⏳ 1 future phase (Phase 6)

**Target**: All intelligence in modular format
- Each phase has its own versioned markdown file
- Clear git history per phase
- Easy to update without touching other phases
- Dashboard serves latest via API

**The registry (v7.7.1) will document this split** and provide the map showing where each phase's intelligence lives.
