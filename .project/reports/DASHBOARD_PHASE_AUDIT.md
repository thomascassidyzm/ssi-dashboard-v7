# Dashboard Phase Audit Report
**Date:** 2025-10-17
**Status:** ❌ Dashboard OUT OF SYNC with working reality

## Executive Summary

The published dashboard (ProcessOverview.vue) displays outdated v7.0 phase information that doesn't match:
1. The actual APML v7.6 specification
2. The working reality of recent course generation

## Version Discrepancy

| Component | Current Version | Correct Version |
|-----------|----------------|-----------------|
| Dashboard (ProcessOverview.vue) | v7.0 | v7.6 |
| APML Specification | v7.6 | ✓ |
| Working Implementation | v7.6 (simplified) | ✓ |

## Phase Comparison

### Dashboard ProcessOverview.vue (OUTDATED - showing v7.0)
- ❌ Phase 0: Corpus Pre-Analysis (doesn't exist!)
- ✅ Phase 1: Pedagogical Translation
- ✅ Phase 2: Corpus Intelligence
- ⚠️ Phase 3: LEGO Extraction (wrong name)
- ⚠️ Phase 3.5: Graph Construction (not used)
- ❌ Phase 4: Deduplication (DEPRECATED!)
- ⚠️ Phase 5: Pattern-Aware Baskets (wrong description)
- ❌ Phase 6: Introductions (wrong description: "Known-only introduction phrases")

### APML v7.6 Specification (DECLARED)
1. Phase 1: Pedagogical Translation
2. Phase 2: Corpus Intelligence
3. Phase 3: LEGO Decomposition
4. Phase 3.5: Graph Construction
5. Phase 4: DEPRECATED - Merged into Phase 5.5
6. Phase 5: Basket Generation (Edge-Aware + d-phrases/e-phrases)
7. Phase 5.5: Basket Deduplication
8. Phase 6: Introductions
9. Phase 3.9: Automated Quality Validation

### Working Reality (ACTUAL - as of Oct 17, 2025)

Based on recent course generation for Spanish/Italian/French/Mandarin:

1. **Phase 1: Pedagogical Translation**
   - ✅ Input: canonical_seeds.json
   - ✅ Output: translations.json
   - ✅ Purpose: Apply 6 pedagogical heuristics

2. **Phase 3: LEGO Breakdowns**
   - ✅ Input: translations.json
   - ✅ Output: LEGO_BREAKDOWNS_COMPLETE.json
   - ✅ Purpose: Extract BASE/COMPOSITE/FEEDER LEGOs with componentization
   - ✅ Working: Generated for all 4 languages

3. **Phase 5: Basket Generation**
   - ✅ Input: LEGO_BREAKDOWNS_COMPLETE.json
   - ✅ Output: baskets.json
   - ✅ Purpose: Generate e-phrases and d-phrases for ALL LEGOs (including feeders)
   - ✅ Working: Generated 115+ baskets per language

4. **Phase 5.5: Basket Deduplication**
   - ✅ Input: baskets.json
   - ✅ Output: baskets_deduplicated.json + lego_provenance_map.json
   - ✅ Purpose: Remove duplicate LEGOs, keep first occurrence
   - ✅ Working: Removed 32 duplicates across 4 languages
   - ✅ Script: deduplicate-baskets.cjs

5. **Phase 6: Introductions**
   - ✅ Input: LEGO_BREAKDOWNS_COMPLETE.json + lego_provenance_map.json
   - ✅ Output: introductions.json
   - ✅ Purpose: Generate contextual introductions using seed context, skip duplicates
   - ✅ Working: Generated 417 unique introductions
   - ✅ Script: generate-introductions.cjs

### Phases NOT Currently Used

- ❌ Phase 0: Never existed
- ❌ Phase 2: Corpus Intelligence (skipped in current workflow)
- ❌ Phase 3.5: Graph Construction (not implemented)
- ❌ Phase 3.9: Quality Validation (mentioned in APML but not used)
- ❌ Phase 4: DEPRECATED (merged into 5.5)

## Critical Findings

### 1. ProcessOverview.vue Inaccuracies

**Line 56:**
```
<p>...uses APML v7.0 specification to generate...</p>
```
Should be: **v7.6**

**Line 69-76:** Shows "Phase 0: Corpus Pre-Analysis"
- This phase never existed
- Should be removed entirely

**Line 105-112:** Shows "Phase 3.5: Graph Construction (NEW v7.0)"
- Mentioned in APML but not implemented
- Should be marked as "Future Enhancement" or removed

**Line 114-122:** Shows "Phase 4: Deduplication"
- Explicitly DEPRECATED in APML line 1826
- Should be removed, replaced with Phase 5.5

**Line 136:**
```
<p class="text-sm text-slate-400 mt-1">Input: Baskets → Output: Known-only introduction phrases</p>
```
Should be: **Input: LEGO_BREAKDOWNS + provenance_map → Output: Contextual introductions with seed context**

### 2. Missing Phase Documentation

The dashboard doesn't show:
- Phase 5.5: Basket Deduplication (critical phase!)
- Correct Phase 6 description

### 3. Architecture Description Outdated

**Line 143-150:** Lists "Key Innovations in v7.0" including:
- "Graph Intelligence (Phase 3.5)" - not implemented
- "Pattern-Aware Baskets" - description doesn't match Phase 5 reality
- "DEBUT/ETERNAL" - these terms not used in current implementation

## Recent Course Generation Evidence

**Spanish (spa_for_eng_30seeds):**
- translations.json ✓
- LEGO_BREAKDOWNS_COMPLETE.json ✓
- baskets.json (115 LEGOs) ✓
- baskets_deduplicated.json (105 unique) ✓
- lego_provenance_map.json (10 duplicates) ✓
- introductions.json (105 introductions) ✓

**Italian, French, Mandarin:** Same structure ✓

**Missing files:**
- No corpus_intelligence.json (Phase 2)
- No graph.json (Phase 3.5)
- No validation reports (Phase 3.9)

## Recommended Actions

### Immediate (Dashboard UI)

1. **Update ProcessOverview.vue (src/views/ProcessOverview.vue)**
   - Change v7.0 → v7.6
   - Remove Phase 0
   - Remove or mark Phase 2, 3.5, 3.9 as "Not Currently Implemented"
   - Remove Phase 4
   - Add Phase 5.5: Basket Deduplication
   - Fix Phase 6 description
   - Update "Key Innovations" section

2. **Update TrainingPhase.vue routes**
   - Ensure phase routes match actual phases (1, 3, 5, 5.5, 6)
   - Remove or disable routes for unused phases

3. **Update Dashboard.vue**
   - Check for any hardcoded phase references
   - Ensure version displayed is v7.6

### Secondary (APML Specification)

4. **Update APML ssi-course-production.apml**
   - Mark unused phases clearly (Phase 2, 3.5, 3.9)
   - Update "7-phase pipeline" to "5-phase pipeline (simplified)"
   - Or: Document full 7-phase as "future complete implementation"

5. **Add workflow clarity section**
   - "Current Simplified Workflow" vs "Full Specification"
   - Make it clear which phases are active

## Files to Update

1. `/src/views/ProcessOverview.vue` - Primary update needed
2. `/src/views/TrainingPhase.vue` - Check phase routing
3. `/src/views/Dashboard.vue` - Check version display
4. `/ssi-course-production.apml` - Update workflow documentation
5. `/README.md` - Update if it references phases

## Success Criteria

✅ Dashboard shows v7.6
✅ Only active phases displayed (1, 3, 5, 5.5, 6)
✅ Phase descriptions match working reality
✅ No reference to non-existent Phase 0
✅ No reference to deprecated Phase 4
✅ Phase 5.5 properly documented
✅ Phase 6 correctly described (provenance-aware introductions)

## Next Steps

1. Create updated ProcessOverview.vue
2. Test dashboard locally
3. Build and deploy to dist/
4. Verify on published dashboard
5. Update APML for clarity
6. Commit all changes with "Dashboard Phase Sync v7.6" message
