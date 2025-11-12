# Phase Evolution - Architecture Decisions

**Last Updated**: 2025-11-10

This document tracks major architectural changes to the phase pipeline, explaining WHY phases were deprecated and HOW their functionality was replaced.

---

## Active Workflow (Web Orchestrator)

**Current Pipeline**: Phase 1 → 3 → 5

```
Phase 1: Pedagogical Translation
   ↓ (seed_pairs.json)
Phase 3: LEGO Extraction + Deduplication
   ↓ (lego_pairs.json with "new" flags)
Phase 5: Practice Basket Generation
   ↓ (baskets/lego_baskets_s*.json)
```

**Key Characteristics**:
- **Mechanical scripts** handle structure (prep scaffolds, merge validation)
- **AI agents** handle linguistics (translation quality, LEGO extraction, phrase generation)
- **Self-managing parallelization** (master prompts spawn agents based on rate limits)
- **Intelligent resume** (checks for existing outputs, skips completed phases)

---

## Deprecated: Phase 4 (Batch Preparation)

**Status**: ⚠️ Deprecated (2025-11-10)

**Original Design**:
- Read `lego_pairs.json`
- Identify duplicate LEGOs (same target + known)
- Create batch files with only first occurrences
- Map duplicates to canonical IDs
- Output: `batches/batch_*.json` + `batches/manifest.json`

**Why Deprecated**:
Phase 4's functionality was superseded by a simpler, more elegant solution:

1. **Phase 3 merge script** (`phase3_merge_legos.cjs`) marks duplicates during LEGO extraction:
   - New LEGOs: `"new": true`
   - Duplicates: `"new": null`
   - All LEGOs appear in vocabulary context (preserves recency bias)

2. **Phase 5 prep script** (`phase5_prep_scaffolds.cjs`) filters directly:
   ```javascript
   // Only generate baskets for NEW LEGOs
   if (!lego.new) continue;
   ```

3. **Result**: Same deduplication benefit (36% time savings) without intermediate batching step

**Architecture Benefit**:
- Simpler: Phase 1 → 3 → 5 (no batching layer)
- Cleaner: Deduplication happens where LEGOs are identified
- Faster: No separate batch preparation script to run

**Status in Codebase**:
- Script exists: `scripts/phase4-prepare-batches.cjs` (for old API workflow)
- Docs archived: `archive/phase_intelligence/phase_4_batch_preparation.md`
- Web orchestrator: Does NOT use Phase 4

---

## Deprecated: Phase 5.5 (Post-Generation Deduplication)

**Status**: ⚠️ Obsolete (replaced by Phase 3 deduplication)

**Original Design**:
- Run AFTER basket generation
- Read `lego_pairs.json` and `lego_baskets.json`
- Identify character-identical duplicates
- Create deduplicated versions of both files
- Output: `lego_pairs_deduplicated.json`, `lego_baskets_deduplicated.json`

**Why Obsolete**:
Post-generation deduplication was wasteful because it:
1. Generated baskets for duplicates first (wasted AI tokens)
2. Deleted them afterwards (wasted time)
3. Required separate merge/dedup step

**Replaced By**:
Phase 3 merge script + Phase 5 prep script (pre-generation deduplication)
- Identify duplicates BEFORE generation
- Only scaffold new LEGOs
- Save 36% generation time

**Status in Codebase**:
- Script exists: `scripts/phase5.5-deduplicate-baskets.cjs` (for reference)
- Docs kept: `docs/phase_intelligence/phase_5.5_basket_deduplication.md` (marked obsolete)

---

## Evolution Timeline

### October 2024: Original Design
- Phase 1 → 3 → 5 → 5.5
- Post-generation deduplication
- 2.9 hours for 668-seed Spanish course (8 agents)

### October 29, 2024: Phase 4 Introduction
- Phase 1 → 3 → 4 → 5
- Pre-generation deduplication via batching
- 1.9 hours for 668-seed Spanish course (8 agents)
- 36% time savings

### November 10, 2025: Phase 4 Deprecated
- Phase 1 → 3 → 5 (current)
- Deduplication in Phase 3 merge + Phase 5 prep
- Same 36% time savings, simpler architecture
- Web orchestrator uses staged pipeline (prep → AI → merge)

---

## Key Learnings

### 1. Deduplication Belongs in Phase 3
**Insight**: LEGOs are inherently identified in Phase 3. Marking duplicates there (with `"new"` flag) is more natural than creating separate batch files.

**Benefits**:
- Single source of truth (`lego_pairs.json`)
- No intermediate files to manage
- Vocabulary context preserved (all LEGOs present)

### 2. Staged Pipeline > Monolithic Prompts
**Insight**: Separating mechanical (scripts) from linguistic (AI) work makes better use of AI capabilities.

**Phase 3 Example**:
```
Mechanical (script):  Build FCFS registry, create scaffolds
Linguistic (AI):      Extract LEGOs, validate tiling
Mechanical (script):  Assign IDs, validate completeness, merge
```

**Phase 5 Example**:
```
Mechanical (script):  Build whitelist, create scaffolds
Linguistic (AI):      Generate practice phrases
Mechanical (script):  Validate GATE, validate distributions, merge
```

**Benefits**:
- AI focuses on linguistic intelligence only
- Scripts handle structure/validation
- Faster iteration (change scripts without re-prompting)

### 3. "new" Flag > Separate Batch Files
**Insight**: A simple boolean flag is clearer than maintaining separate batch manifests.

**Before** (Phase 4):
- `lego_pairs.json` (all LEGOs)
- `batches/batch_01.json` (LEGOs to generate)
- `batches/manifest.json` (duplicate mapping)

**After** (Phase 3 + 5):
- `lego_pairs.json` (all LEGOs with `"new": true/null`)
- Phase 5 prep filters directly: `if (lego.new) scaffold(lego)`

### 4. Web Orchestrator > API Mode
**Insight**: Claude Code on the Web with self-managing parallelization is faster and more observable than API calls.

**Benefits**:
- Rate limit awareness (AI adjusts strategy)
- Progress visibility (watch agents complete)
- Caching benefits (prompt caching in browser)
- Better error handling (AI reports issues)

---

## Future Evolution

**Possible Changes**:
1. Phase 6 integration (introductions after baskets)
2. Phase 7 integration (compilation to legacy format)
3. Phase 8 integration (audio generation)

**Guiding Principles**:
- Document WHY phases are deprecated (not just WHAT)
- Archive old designs (for "Tom and Kai under a bus" scenario)
- Prefer simplicity over optimization
- Let AI handle linguistics, scripts handle mechanics

---

**Remember**: Phase numbers represent OUTPUT types, not chronological steps. It's OK to skip numbers (Phase 1 → 3 → 5) if intermediate phases are unnecessary.
