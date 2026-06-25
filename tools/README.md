# SSi Tools - Canonical Utilities

All stable, production-ready tools for SSi course generation.

## 🎯 Design Principles

1. **One tool, one job** - No duplicate functionality
2. **Latest version only** - Old versions → archive/
3. **Well documented** - Clear usage examples
4. **Tested & stable** - Used in production

## 📂 Directory Structure

### `phase-prep/` - Scaffold Generation
**phase5_prep_scaffolds_v10.cjs** ⭐ CURRENT
- Generates Phase 5 scaffolds with embedded prompts
- Usage: `node tools/phase-prep/phase5_prep_scaffolds_v10.cjs <courseDir>`

### `generators/` - Content Generation
**phase5-merge-batches.cjs** - Merge basket outputs
**phase6-generate-introductions.cjs** - Generate introductions
**generate-course-manifest.js** - Phase 7 compilation
**phase8-generate-audio.cjs** - Audio generation

### `validators/` - Quality Assurance
**course-validator.cjs** ⭐ Comprehensive validation
**phase-deep-validator.cjs** ⭐ Phase-specific validation

### Basket quality (root of `tools/`)
**audit-frame-diversity.cjs** - Frame-diversity audit of USE baskets (7th principle: vary along the axis that carries the new distinction). `node tools/audit-frame-diversity.cjs <course_code> [out.md]` — per-basket plug-in-signature diversity (pronoun swaps = one pattern), frame-family monotony lens, duplicate-target groups.
**basket-rework.cjs** - Check + apply USE-basket replacement plans. `check` gates: vocab tiling ≤ seed, course-wide ZUT, LEGO containment, declared `convergence_pairs` (same target, distinct known intentions — deliberate teaching, not dups). `apply`: side-aware audio-FK nulling, version bump, rollback snapshot. Plan JSONs live in `scripts/` (gitignored).

### `orchestrators/` - Multi-Agent Coordination
**automation_server.cjs** ⭐ Main automation server
**orchestrator-workflow.cjs** - Workflow coordination

### `sync/` - S3 Synchronization & Publishing
**sync-course-to-s3.cjs** - Upload to S3
**sync-course-from-s3.cjs** - Download from S3
**publish-to-course-configs.cjs** - Publish manifests to course-configs repo

## 📖 See Also
- `CLAUDE.md` - Agent onboarding
- `archive/deprecated-2025-11-18/` - Old versions

**Last updated**: 2025-11-18
