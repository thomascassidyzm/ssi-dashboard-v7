# Version Audit - Phase Intelligence & Scripts

**Audit Date**: 2025-11-11
**Purpose**: Verify all intelligence docs and processing scripts are using latest versions

---

## 📚 Phase Intelligence Documentation

### Phase 1: Seed Pair Translation
- **phase_1_seed_pairs.md**: v2.6 🔒 LOCKED (2025-10-28) ✅ Production
- **phase_1_orchestrator.md**: v1.1 (2025-10-30) ✅ Active

### Phase 3: LEGO Extraction
- **phase_3_lego_pairs.md**: v6.0 - Clarity Edition (2025-11-11) ✅ **Production Ready**
  - Status: Production Ready - Simplified M-LEGO Rules
  - Key features: A-before-M ordering, TILING FIRST, FD compliance

- **phase_3_orchestrator.md**: v7.0 - A-before-M Ordering (2025-11-11) ✅ **Latest**
  - Status: Production Ready
  - Key features: 10 parallel agents, A-before-M validation

### Phase 5: Practice Basket Generation
- **phase_5_lego_baskets.md**: v6.0 - Sliding Window (2025-11-11) ✅ **Production Ready**
  - Status: Production Ready - Pattern-Guided Natural Language Generation
  - Key features: Recent seed_pairs sliding window, vocabulary safety

- **phase_5_orchestrator.md**: v6.0 - Sliding Window Pipeline (2025-11-11) ✅ **Latest**
  - Status: Production Ready
  - Key features: Scaffold generation, GATE validation, violation removal

- **phase_5_complete_pipeline.md**: v6.0 (2025-11-11) ✅ **Complete Documentation**
  - Status: Production Ready
  - Full end-to-end pipeline reference

### Phase 5.5: Grammar Review & Basket Deduplication
- **phase_5.5_grammar_review.md**: v1.0 (2025-11-11) ✅ **NEW - Foundation Quality Gate**
  - Status: Production Ready
  - Applies to: Seeds 1-100 only
  - Key features: AI-assisted grammar validation, binary pass/fail criteria

- **phase_5.5_basket_deduplication.md**: v2.0 🔒 (2025-10-28) ✅ Locked

### Phase 6: Introductions
- **phase_6_introductions.md**: v2.0 🔒 LOCKED ✅ Active

### Phase 7: Compilation
- **phase_7_compilation.md**: v1.0 ✅ Active

### Phase 8: Audio Generation
- **phase_8_audio_generation.md**: v1.0 🔧 Assigned to Kai (separate branch)

---

## 🔧 Processing Scripts (in `/scripts`)

### Phase 3 Scripts

**phase3_deduplicate_legos.cjs**
- Location: `/scripts/phase3_deduplicate_legos.cjs`
- Purpose: Mark duplicate LEGOs across seeds (new: true/false)
- Intelligence reference: Implicit (deduplication logic)
- Usage: `node scripts/phase3_deduplicate_legos.cjs <course_path>`
- Status: ✅ **Parameterized, Production Ready**

**phase3_reorder_legos.cjs**
- Location: `/scripts/phase3_reorder_legos.cjs`
- Purpose: Ensure A-before-M ordering within each seed
- Intelligence reference: phase_3_orchestrator.md v7.0 (A-before-M ordering)
- Usage: `node scripts/phase3_reorder_legos.cjs <course_path>`
- Status: ✅ **Parameterized, Production Ready**

### Phase 5 Scripts

**phase5_generate_scaffolds.cjs**
- Location: `/scripts/phase5_generate_scaffolds.cjs`
- Purpose: Generate scaffolds with sliding window seed_pairs
- Version: v3 - Sliding Window
- Intelligence reference: `docs/phase_intelligence/phase_5_lego_baskets.md` (v6.0)
- Data version: `"curated_v7_spanish"`
- Usage: `node scripts/phase5_generate_scaffolds.cjs <course_path>`
- Status: ✅ **Parameterized, Matches v6.0 intelligence**

**phase5_gate_validator.cjs**
- Location: `/scripts/phase5_gate_validator.cjs`
- Purpose: Validate vocabulary compliance (GATE validation)
- Intelligence reference: Sliding window v6.0 logic
- Usage: `node scripts/phase5_gate_validator.cjs <course_path>`
- Status: ✅ **Parameterized, Production Ready**

**phase5_remove_gate_violations.cjs**
- Location: `/scripts/phase5_remove_gate_violations.cjs`
- Purpose: Auto-remove phrases with unavailable vocabulary
- Intelligence reference: v6.0 GATE compliance
- Usage: `node scripts/phase5_remove_gate_violations.cjs <course_path>`
- Status: ✅ **Parameterized, Production Ready**

**phase5_grammar_review.cjs** (Seeds 1-100 ONLY)
- Location: `/scripts/phase5_grammar_review.cjs`
- Purpose: Remove grammatically incorrect phrases using AI-assisted review
- Intelligence reference: `docs/phase_intelligence/phase_5.5_grammar_review.md` (v1.0)
- Usage: `node scripts/phase5_grammar_review.cjs <course_path>`
- Requirements: Requires ANTHROPIC_API_KEY environment variable
- Applies to: Seeds 1-100 only (foundation material)
- Status: ✅ **Parameterized, Requires API Integration**

---

## ✅ Version Compatibility Matrix

| Intelligence Doc | Version | Script | Version | Compatible? |
|-----------------|---------|--------|---------|-------------|
| phase_3_lego_pairs.md | v6.0 | phase3_deduplicate_legos.cjs | - | ✅ Yes |
| phase_3_orchestrator.md | v7.0 | phase3_reorder_legos.cjs | - | ✅ Yes |
| phase_5_lego_baskets.md | v6.0 | phase5_generate_scaffolds.cjs | v3 | ✅ Yes |
| phase_5_orchestrator.md | v6.0 | phase5_gate_validator.cjs | - | ✅ Yes |
| phase_5_orchestrator.md | v6.0 | phase5_remove_gate_violations.cjs | - | ✅ Yes |
| phase_5.5_grammar_review.md | v1.0 | phase5_grammar_review.cjs | - | ✅ Yes |

---

## 🎯 Key Features by Version

### Phase 3 (v6.0/v7.0)
- ✅ A-before-M ordering enforcement
- ✅ TILING FIRST principle
- ✅ Functional determinism (same input → same output)
- ✅ Component tracking for M-types
- ✅ Deduplication with `new: true/false` flags

### Phase 5 (v6.0)
- ✅ Sliding window with last 10 seed_pairs
- ✅ Pattern-guided natural language generation
- ✅ Incremental LEGO availability within seed
- ✅ GATE validation post-generation
- ✅ Auto-removal of vocabulary violations
- ✅ 100% vocabulary compliance guarantee
- ✅ 12-15 phrases per LEGO target

---

## 📝 Script Migration Status

**Old Location**: `public/vfs/courses/<course_name>/*.cjs` (course-specific)
**New Location**: `scripts/*.cjs` (universal, parameterized)

**Migration Complete**:
- ✅ All 6 processing scripts moved to `/scripts`
- ✅ All scripts accept `<course_path>` parameter
- ✅ All scripts executable (`chmod +x`)
- ✅ All scripts have proper shebang (`#!/usr/bin/env node`)
- ✅ All scripts validated with help messages
- ✅ Compatible with dashboard automation
- ✅ Phase 5.5 grammar review added (seeds 1-100 only)

---

## 🚀 Ready for Production

**All systems are using the latest versions:**
- Phase 3 intelligence: v6.0/v7.0 (2025-11-11) ✅
- Phase 5 intelligence: v6.0 (2025-11-11) ✅
- Phase 5.5 intelligence: v1.0 (2025-11-11) ✅ **NEW**
- Processing scripts: Parameterized & centralized ✅
- Version compatibility: 100% ✅

**Recommended pipeline for S0001-S0100:**
1. Phase 3: Agent-based LEGO extraction (v6.0 intelligence)
2. Phase 3.5: `node scripts/phase3_deduplicate_legos.cjs <course_path>`
3. Phase 3.6: `node scripts/phase3_reorder_legos.cjs <course_path>`
4. Phase 5.1: `node scripts/phase5_generate_scaffolds.cjs <course_path>`
5. Phase 5.2: Agent-based phrase generation (v6.0 intelligence)
6. Phase 5.3: `node scripts/phase5_gate_validator.cjs <course_path>`
7. Phase 5.4: `node scripts/phase5_remove_gate_violations.cjs <course_path>`
8. **Phase 5.5**: `node scripts/phase5_grammar_review.cjs <course_path>` ⭐ **Seeds 1-100 ONLY**

---

## 🔄 Segmentation Architecture (NEW)

**Added**: 2025-11-11
**Purpose**: Automatic 100-seed segmentation for large courses

### Architecture Components

**segment-coordinator.cjs**
- Location: `/scripts/segment-coordinator.cjs`
- Purpose: Manage segment creation, tracking, and reporting
- Functions: calculateSegments, createSegmentStructure, updateSegmentProgress, getAggregateProgress
- Usage: `node scripts/segment-coordinator.cjs <command> <course_dir> [args]`
- Commands: create, update, report, progress
- Status: ✅ **Production Ready**

**orchestrator-workflow.cjs** (Modified)
- Added: Automatic segmentation detection (mode: "segmented" or seeds > 100)
- Creates: Segment structure with metadata on job initialization
- Behavior: Pauses workflow for manual segment processing
- Status: ✅ **Integrated**

### Documentation

**SEGMENT_ARCHITECTURE.md**
- Comprehensive architecture design
- File structure and metadata schemas
- Phase independence matrix
- Workflow modes (auto, manual, hybrid)
- Status: ✅ **Complete**

**SEGMENT_WORKFLOW_GUIDE.md**
- Step-by-step user guide
- Segment processing prompts
- Progress monitoring commands
- Merge phase instructions
- Status: ✅ **Complete**

### Key Features

- ✅ Automatic 100-seed segmentation for courses > 100 seeds
- ✅ Segment-based file structure with metadata tracking
- ✅ Independent processing for Phases 1, 3, 5, 6
- ✅ Aggregate progress tracking across segments
- ✅ CLI tools for segment management and reporting
- ✅ Manual dispatch support for Claude Code web instances
- ✅ Boundary context handling for cross-segment dependencies

---

**Status**: ✅ **All versions verified and compatible - Segmentation feature added!**
