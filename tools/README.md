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
