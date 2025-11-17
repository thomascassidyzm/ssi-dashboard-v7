# Tools Directory - Essential SSi Dashboard Utilities

> **Purpose**: Stable, documented utilities for course processing, validation, and orchestration.
> **Audience**: Kai, collaborators, and future maintainers.
> **Status**: Production-ready tools only. Experimental scripts belong in `scripts/`.

---

## 📂 Directory Structure

```
tools/
├── orchestrators/    # Multi-agent coordination & automation
├── validators/       # Quality gates & validation
├── generators/       # Content generation & compilation
├── mergers/          # Branch & data merging utilities
├── sync/             # S3 synchronization
├── phase-prep/       # Phase scaffolding & preparation
└── legacy-migrations/ # Historical format conversions (deprecated)
```

---

## 🎯 Quick Start

### Prerequisites
```bash
# Ensure dependencies are installed
npm install

# Verify Node.js version
node --version  # Should be v18+
```

### Common Tasks

**Validate a course**
```bash
node tools/validators/course-validator.cjs spa_for_eng
```

**Merge phase 5 outputs**
```bash
node tools/generators/phase5-merge-batches.cjs spa_for_eng
```

**Sync to S3**
```bash
node tools/sync/sync-course-to-s3.cjs spa_for_eng
```

---

## 📖 Detailed Tool Reference

### `orchestrators/` - Coordination & Automation

#### `automation_server.cjs`
**Purpose**: Main orchestration server for multi-agent coordination.

**Usage**:
```bash
node tools/orchestrators/automation_server.cjs
```

**What it does**:
- Watches for git pushes from agents
- Coordinates work across multiple branches
- Automatically merges validated outputs
- Manages agent task queues

**Configuration**: `automation.config.json` (in scripts/automation/)

---

#### `orchestrator-workflow.cjs`
**Purpose**: Workflow orchestration helpers and utilities.

**Usage**:
```bash
node tools/orchestrators/orchestrator-workflow.cjs [command] [args]
```

**Commands**:
- `prepare-batch` - Set up agent batch work
- `validate-batch` - Check batch completion
- `merge-batch` - Merge completed batch work

---

#### `spawn_basket_windows.cjs`
**Purpose**: Spawn multiple agent windows for parallel basket generation.

**Usage**:
```bash
node tools/orchestrators/spawn_basket_windows.cjs spa_for_eng S0001-S0100 --agents 10
```

**Options**:
- `--agents N` - Number of parallel agents (default: 5)
- `--batch-size N` - Seeds per agent (default: 10)

---

### `validators/` - Quality Assurance

#### `course-validator.cjs`
**Purpose**: Comprehensive course validation across all phases.

**Usage**:
```bash
node tools/validators/course-validator.cjs <course-id> [options]
```

**Example**:
```bash
# Full validation with detailed output
node tools/validators/course-validator.cjs spa_for_eng --verbose

# Validate specific seeds
node tools/validators/course-validator.cjs spa_for_eng --seeds S0001-S0050

# Output to JSON
node tools/validators/course-validator.cjs spa_for_eng --format json > report.json
```

**Checks**:
- Phase output integrity
- Grammar validation
- Infinitive form correctness
- FD/LUT collision detection
- LEGO coverage analysis
- Basket quality metrics

---

#### `phase-deep-validator.cjs`
**Purpose**: Deep phase-specific validation with detailed diagnostics.

**Usage**:
```bash
node tools/validators/phase-deep-validator.cjs <course-id> <phase> [seed-range]
```

**Example**:
```bash
# Validate entire phase 5
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5

# Validate specific seed range
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5 S0121-S0130
```

**Output**: Detailed error reports with line-level diagnostics.

---

#### `validate-course.cjs`
**Purpose**: Quick validation wrapper for CI/CD pipelines.

**Usage**:
```bash
node tools/validators/validate-course.cjs <course-id>
```

**Exit codes**:
- `0` - Validation passed
- `1` - Validation failed (errors found)
- `2` - Critical errors (missing files, corrupted data)

---

### `generators/` - Content Generation

#### `generate-course-manifest.js`
**Purpose**: Generate `courses-manifest.json` from available courses.

**Usage**:
```bash
node tools/generators/generate-course-manifest.js
```

**Output**: `public/vfs/courses/courses-manifest.json`

**What it generates**:
- Course metadata (language pairs, seed counts)
- Phase completion status
- File sizes and checksums
- Last updated timestamps

---

#### `phase5-merge-batches.cjs`
**Purpose**: Merge phase 5 basket outputs into `lego_baskets.json`.

**Usage**:
```bash
node tools/generators/phase5-merge-batches.cjs <course-id> [seed-range]
```

**Example**:
```bash
# Merge all phase5 outputs
node tools/generators/phase5-merge-batches.cjs spa_for_eng

# Merge specific range
node tools/generators/phase5-merge-batches.cjs spa_for_eng S0001-S0100
```

**Process**:
1. Reads individual basket files from `phase5_outputs/`
2. Validates each basket
3. Merges into unified `lego_baskets.json`
4. Strips debug metadata
5. Generates checksums

---

#### `phase6-generate-introductions.cjs`
**Purpose**: Generate presentation introductions for seeds.

**Usage**:
```bash
node tools/generators/phase6-generate-introductions.cjs <course-id> [options]
```

**Options**:
- `--seeds S0001-S0100` - Specific seed range
- `--force` - Regenerate existing introductions

---

### `mergers/` - Data & Branch Merging

#### `merge_all_segments.cjs`
**Purpose**: Merge segmented phase outputs (e.g., phase3 chunks).

**Usage**:
```bash
node tools/mergers/merge_all_segments.cjs <course-id> <phase>
```

**Example**:
```bash
# Merge phase3 segments
node tools/mergers/merge_all_segments.cjs spa_for_eng phase3
```

---

#### `watch_and_merge_branches.cjs`
**Purpose**: Watch for agent branch pushes and auto-merge when validated.

**Usage**:
```bash
node tools/mergers/watch_and_merge_branches.cjs [options]
```

**Options**:
- `--interval N` - Polling interval in seconds (default: 30)
- `--branches agent-*` - Branch pattern to watch
- `--auto-merge` - Automatically merge validated branches

**Safety**: Only merges if validation passes.

---

#### `merge_all_basket_branches.cjs`
**Purpose**: Merge multiple agent basket branches into main.

**Usage**:
```bash
node tools/mergers/merge_all_basket_branches.cjs <course-id> [branch-pattern]
```

**Example**:
```bash
# Merge all agent-* branches
node tools/mergers/merge_all_basket_branches.cjs spa_for_eng "agent-*"

# Merge specific agents
node tools/mergers/merge_all_basket_branches.cjs spa_for_eng "agent-0[1-5]"
```

---

### `sync/` - S3 Synchronization

#### `sync-course-to-s3.cjs`
**Purpose**: Upload course data to S3 for backup/deployment.

**Usage**:
```bash
node tools/sync/sync-course-to-s3.cjs <course-id> [options]
```

**Example**:
```bash
# Sync entire course
node tools/sync/sync-course-to-s3.cjs spa_for_eng

# Dry run (preview changes)
node tools/sync/sync-course-to-s3.cjs spa_for_eng --dry-run

# Sync only phase outputs
node tools/sync/sync-course-to-s3.cjs spa_for_eng --phases-only
```

**Environment**: Requires AWS credentials in `.env` or environment variables.

---

#### `sync-course-from-s3.cjs`
**Purpose**: Download course data from S3.

**Usage**:
```bash
node tools/sync/sync-course-from-s3.cjs <course-id> [options]
```

**Example**:
```bash
# Download entire course
node tools/sync/sync-course-from-s3.cjs spa_for_eng

# Download only if newer
node tools/sync/sync-course-from-s3.cjs spa_for_eng --if-newer
```

---

### `phase-prep/` - Phase Scaffolding

#### `phase3_prepare_batches.cjs`
**Purpose**: Prepare phase 3 processing batches and scaffolds.

**Usage**:
```bash
node tools/phase-prep/phase3_prepare_batches.cjs <course-id> [options]
```

**Options**:
- `--batch-size N` - Seeds per batch (default: 50)
- `--output-dir DIR` - Custom output directory

---

#### `phase5_prep_scaffolds.cjs`
**Purpose**: Generate phase 5 input scaffolds from phase 3 output.

**Usage**:
```bash
node tools/phase-prep/phase5_prep_scaffolds.cjs <course-id> [seed-range]
```

**Example**:
```bash
# Prepare all scaffolds
node tools/phase-prep/phase5_prep_scaffolds.cjs spa_for_eng

# Prepare specific range
node tools/phase-prep/phase5_prep_scaffolds.cjs spa_for_eng S0121-S0130
```

**Output**: `public/vfs/courses/<course-id>/phase5_scaffolds/`

---

#### `phase5_generate_scaffolds.cjs`
**Purpose**: Alternative scaffold generator with enhanced metadata.

**Usage**:
```bash
node tools/phase-prep/phase5_generate_scaffolds.cjs <course-id> [options]
```

**Options**:
- `--with-metadata` - Include debug metadata
- `--validate` - Validate scaffolds after generation

---

## 🔧 Development & Contribution

### Adding New Tools

1. **Develop in `scripts/experiments/`** first
2. **Test thoroughly** with real course data
3. **Document** with clear comments and usage examples
4. **Add to appropriate `tools/` subdirectory**
5. **Update this README** with usage instructions
6. **Commit to git** for team access

### Tool Guidelines

✅ **Good tool characteristics**:
- Idempotent (running twice = same result)
- Well-documented (usage, parameters, examples)
- Error handling (graceful failures with helpful messages)
- Validation-aware (checks inputs/outputs)
- Reusable (parameterized, not hardcoded)

❌ **Avoid**:
- Hardcoded paths or course IDs
- Silent failures
- Destructive operations without confirmation
- Side effects without logging
- Coupling to specific environments

---

## 🐛 Troubleshooting

### "Module not found"
```bash
# Install dependencies
npm install

# Check if you're in repo root
pwd  # Should end in ssi-dashboard-v7-clean
```

### "Permission denied"
```bash
# Make script executable
chmod +x tools/path/to/script.cjs
```

### "AWS credentials not found" (sync tools)
```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1

# Or add to .env file
```

### "Validation failed"
- Check `logs/` directory for detailed error reports
- Run with `--verbose` flag for more output
- Use phase-specific validator for detailed diagnostics

---

## 📚 See Also

- **CLAUDE.md** - Agent onboarding guide
- **SYSTEM.md** - System architecture
- **docs/workflows/** - Process documentation
- **docs/validation/** - Validation specs

---

**Need help?** Check the main project documentation or reach out to the team.

*Last updated: 2025-11-17*
