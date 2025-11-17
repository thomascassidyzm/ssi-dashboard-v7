# Scripts & Tools Inventory Audit

**Date**: 2025-11-17
**Auditor**: Claude Code
**Purpose**: Complete forensic inventory of scripts/, tools/, and root directories to identify actual usage vs abandoned files

---

## Executive Summary

### File Counts
- **scripts/**: 212 files (.cjs, .js, .py)
- **tools/**: 32 files (.cjs, .js, .py)
- **root/**: 49 files (.cjs, .js, .py) - **32 COMMITTED to git, 17 configs**

### Critical Findings

1. **EXACT DUPLICATES EXIST**: Root files are identical copies of tools/ files (automation_server.cjs, orchestrator-workflow.cjs, course-validator.cjs, etc.)
2. **ROOT POLLUTION**: 32 phase5 batch processors and generators committed to git in root (should be in scripts/)
3. **CHAOS PATTERN**: 6 variations of "phase5 generators" (improved, enhanced, intelligent, contextual, natural, agent)
4. **ACTIVE DUPLICATES**: Same merge scripts in root, scripts/, and tools/

---

## 1. ROOT DIRECTORY ANALYSIS

### 1.1 Configuration Files (LEGITIMATE - Keep in Root)
| File | Purpose | Last Modified | Status |
|------|---------|---------------|--------|
| `vite.config.js` | Vite build config | 2025-11-17 07:04 | ✅ Essential |
| `tailwind.config.js` | Tailwind CSS config | 2025-10-13 22:46 | ✅ Essential |
| `postcss.config.js` | PostCSS config | 2025-10-14 00:14 | ✅ Essential |
| `ecosystem.config.cjs` | PM2 config (Tom) | 2025-11-17 07:04 | ✅ Essential |
| `ecosystem.config.kai.cjs` | PM2 config (Kai) | 2025-11-17 17:17 | ✅ Essential |

### 1.2 DUPLICATES - Exist in Both Root AND tools/ (IDENTICAL MD5 HASHES)

| Root File | Tools Equivalent | MD5 Match | Size | Recommendation |
|-----------|------------------|-----------|------|----------------|
| `automation_server.cjs` | `tools/orchestrators/automation_server.cjs` | ✅ IDENTICAL | 353KB | **DELETE ROOT** - Keep tools/ version |
| `orchestrator-workflow.cjs` | `tools/orchestrators/orchestrator-workflow.cjs` | ✅ IDENTICAL | 28KB | **DELETE ROOT** - Keep tools/ version |
| `course-validator.cjs` | `tools/validators/course-validator.cjs` | ✅ IDENTICAL | 7.9KB | **DELETE ROOT** - Keep tools/ version |
| `course-analyzer.cjs` | `tools/validators/course-analyzer.cjs` | ✅ IDENTICAL | 12KB | **DELETE ROOT** - Keep tools/ version |
| `phase-deep-validator.cjs` | `tools/validators/phase-deep-validator.cjs` | ✅ IDENTICAL | 16KB | **DELETE ROOT** - Keep tools/ version |
| `merge_all_basket_branches.cjs` | `tools/mergers/merge_all_basket_branches.cjs` | ✅ IDENTICAL | 3.8KB | **DELETE ROOT** - Keep tools/ version |
| `generate-course-manifest.js` | `tools/generators/generate-course-manifest.js` | ✅ IDENTICAL | 8.0KB | **DELETE ROOT** - Keep tools/ version |

**ACTION REQUIRED**: Root copies serve NO purpose. Package.json references root versions, which creates confusion.

### 1.3 Phase5 Batch Processors (COMMITTED TO GIT - Should be GITIGNORED)

**Pattern**: `phase5_process_sXXXX_sYYYY.js/cjs` and `phase5_*_generator.cjs`

These are **agent-generated, one-time batch processors** that should live in `scripts/phase5-batch-processors/` (gitignored workspace), NOT in root committed to git.

| File | Size | Last Modified | Category |
|------|------|---------------|----------|
| `phase5_process_s0081_s0090.cjs` | 6.7KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0161_s0170.js` | 6.5KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0181_s0190.js` | 8.3KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0191_s0200.js` | 8.7KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0241_s0250.js` | 10KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0241_s0250_v2.js` | 10KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0241_s0250_v3.js` | 9.2KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0241_s0250_final.js` | 9.0KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0251_s0260.js` | 11KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0281_s0290.js` | 7.4KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0291_s0300.js` | 9.3KB | 2025-11-17 17:17 | Batch Processor |
| `phase5_process_s0401_s0410.js` | 8.9KB | 2025-11-17 17:17 | Batch Processor |
| `process_phase5_s0011_s0020.cjs` | 13KB | 2025-11-17 17:17 | Batch Processor |
| `process_phase5_s0131_s0140.cjs` | 6.4KB | 2025-11-17 17:17 | Batch Processor |
| `process_phase5_improved.cjs` | 5.7KB | 2025-11-17 17:17 | Batch Processor |
| `process-phase5-seeds.cjs` | 8.8KB | 2025-11-17 17:17 | Batch Processor |
| `process_phase5_seeds.cjs` | 10KB | 2025-11-17 17:17 | Batch Processor |
| `process-phase5-enhanced.cjs` | 8.1KB | 2025-11-17 17:17 | Batch Processor |
| `process-phase5-final.cjs` | 7.5KB | 2025-11-17 17:17 | Batch Processor |
| `refine_phase5_s0131.cjs` | 4.2KB | 2025-11-17 17:17 | Batch Processor |

**GENERATOR CHAOS** - 6 variations of "phase5 generator":
| File | Size | Note |
|------|------|------|
| `phase5_improved_generator.cjs` | 6.6KB | "Improved" version |
| `phase5_enhanced_generator.cjs` | 10KB | "Enhanced" version |
| `phase5_intelligent_generator.cjs` | 8.4KB | "Intelligent" version |
| `phase5_contextual_generator.cjs` | 9.2KB | "Contextual" version |
| `phase5_natural_generator.cjs` | 4.2KB | "Natural" version |
| `phase5_agent_generator.cjs` | 8.9KB | "Agent" version |

**OBSERVATION**: Naming suggests iterative development (improved → enhanced → intelligent). Likely all abandoned except one. No clear indication which is "current".

### 1.4 Other Root Files

| File | Size | Category | Recommendation |
|------|------|----------|----------------|
| `phase5-processor.js` | 7.3KB | Generic processor | MOVE to scripts/ or DELETE (duplicates exist) |
| `phase5_processor.js` | 7.9KB | Generic processor | MOVE to scripts/ or DELETE (duplicates exist) |
| `phase5_generate_cmn.cjs` | 5.9KB | Chinese generation | MOVE to scripts/ |
| `phase5_generate_cmn.js` | 5.6KB | Chinese generation | MOVE to scripts/ |
| `phase5_orchestrator_s0211_s0220.cjs` | 12KB | Batch orchestrator | MOVE to scripts/ |
| `merge_phase3_chunk01.js` | 2.5KB | Phase3 merge | MOVE to scripts/merge/ |
| `merge_phase3_v7_segments.js` | 5.9KB | Phase3 merge | MOVE to scripts/merge/ |
| `spawn_claude_web_agent.cjs` | 11KB | Automation helper | MOVE to scripts/automation/ |
| `start-automation.cjs` | 6.9KB | Startup script | **KEEP** - Referenced by ecosystem.config.cjs |
| `orchestrator-prompt-helpers.cjs` | 14KB | Helper utilities | MOVE to scripts/automation/ |

---

## 2. tools/ DIRECTORY (COMMITTED, SHARED WITH KAI)

**Total**: 32 files organized in subdirectories

### 2.1 Structure
```
tools/
├── generators/         (4 files) - Content generation utilities
├── legacy-migrations/  (7 files) - Historical conversion scripts
├── mergers/            (4 files) - Branch & data merging
├── orchestrators/      (3 files) - Multi-agent coordination
├── phase-prep/         (3 files) - Phase scaffolding
├── sync/               (2 files) - S3 sync utilities
├── validators/         (3 files) - Quality gates
└── [root level]        (6 files) - Phase5 Python processors
```

### 2.2 Active Tools (Referenced by package.json or ecosystem configs)

| File | Location | Referenced By | Last Modified |
|------|----------|---------------|---------------|
| `automation_server.cjs` | `tools/orchestrators/` | ecosystem.config.kai.cjs | 2025-11-17 17:24 |
| `orchestrator-workflow.cjs` | `tools/orchestrators/` | automation_server.cjs | 2025-11-17 17:24 |
| `spawn_basket_windows.cjs` | `tools/orchestrators/` | automation_server.cjs | 2025-11-17 17:24 |
| `course-validator.cjs` | `tools/validators/` | Validation workflows | 2025-11-17 17:24 |
| `phase-deep-validator.cjs` | `tools/validators/` | Validation workflows | 2025-11-17 17:24 |
| `merge_all_basket_branches.cjs` | `tools/mergers/` | Branch workflows | 2025-11-17 17:34 |
| `merge_phase5_to_lego_baskets.cjs` | `tools/mergers/` | Phase5 completion | 2025-11-17 17:34 |
| `sync-course-to-s3.cjs` | `tools/sync/` | S3 workflows | 2025-11-17 17:24 |
| `sync-course-from-s3.cjs` | `tools/sync/` | S3 workflows | 2025-11-17 17:24 |

### 2.3 Phase5 Python Processors (Root Level in tools/)

| File | Size | Purpose | Referenced |
|------|------|---------|-----------|
| `phase5_generator.py` | 9.5KB | Generic generator | ❌ Not found |
| `phase5_direct_processor.py` | 14KB | Direct processing | ✅ Self-documented |
| `phase5_final_processor.py` | 9.8KB | Final processing | ❌ Not found |
| `phase5_intelligent_generator.py` | 13KB | Intelligent generation | ❌ Not found |
| `phase5_s0611_s0620_processor.py` | 12KB | Batch-specific | ❌ Not found |
| `phase5-scaffold-processor.cjs` | 7.4KB | Scaffold generation | ❌ Not found |

**OBSERVATION**: These Python files appear to be batch-specific processors that should be in scripts/, not tools/ (shared utilities).

### 2.4 Legacy Migrations (Archived Functionality)

All files in `tools/legacy-migrations/` dated **2025-10-29** - likely superseded by current workflows.

| File | Purpose |
|------|---------|
| `convert-old-to-new-format.cjs` | Format migration |
| `convert-to-v7.0-format.cjs` | v7.0 migration |
| `deduplicate-baskets.cjs` | Deduplication |
| `generate-introductions.cjs` | Phase6 generation (old) |
| `process-phase-3-with-validation.cjs` | Phase3 processing (old) |
| `process-phase-5.cjs` | Phase5 processing (old) |
| `validate-lego-breakdowns.cjs` | Validation (old) |

**RECOMMENDATION**: Archive these to `archive/legacy-tools/` since they're superseded.

---

## 3. scripts/ DIRECTORY (GITIGNORED WORKSPACE)

**Total**: 212 files - Agent workspace for experimental/batch-specific work

### 3.1 Structure
```
scripts/
├── automation/              (13 files) - Automation & orchestration
├── merge/                   (6 files) - Merge utilities
├── phase5-batch-processors/ (50 files) - Batch-specific processors
├── validation/              (23 files) - Validation scripts
└── [root level]             (120 files) - Mixed utilities
```

### 3.2 Automation Subdirectory (scripts/automation/)

Contains **DUPLICATE** automation files also in root:

| File | Also Exists In | Status |
|------|----------------|--------|
| `automation_server.cjs` | Root, tools/orchestrators/ | 3-way duplicate |
| `orchestrator-workflow.cjs` | Root, tools/orchestrators/ | 3-way duplicate |
| `orchestrator-prompt-helpers.cjs` | Root | 2-way duplicate |
| `spawn_claude_web_agent.cjs` | Root | 2-way duplicate |
| `spawn_basket_windows.cjs` | tools/orchestrators/ | 2-way duplicate |
| `ecosystem.config.kai.cjs` | Root | 2-way duplicate |

**FINDING**: scripts/automation/ appears to be a testing ground for automation scripts before promoting to tools/.

### 3.3 Phase5 Batch Processors (scripts/phase5-batch-processors/)

**50 files** - Agent-generated, batch-specific processors.

**Categories**:
1. **Generic processors** (6 files): `phase5_processor.py`, `phase5_processor_v2.py`, `phase5_batch_processor.py`
2. **Segment-specific** (20 files): `phase5_process_s0161_s0170.js`, etc.
3. **Generators** (8 files): `phase5_improved_generator.cjs`, `phase5_enhanced_generator.cjs`, etc.
4. **Process wrappers** (5 files): `process_phase5_improved.cjs`, `process-phase5-enhanced.cjs`, etc.
5. **Language-specific** (6 files): `process_phase5_cmn*.py` (Chinese generation)
6. **Agent-specific** (5 files): `generate_agent_01_phrases.py`, `generate_agent_02_phrases.py`, etc.

**PATTERN**: Multiple iterations of same concept (processor → processor_v2, improved → enhanced → intelligent)

**DUPLICATES with Root**:
- All 6 "generator" variants exist in BOTH root and scripts/phase5-batch-processors/
- All segment processors (s0081_s0090, s0161_s0170, etc.) exist in BOTH locations

### 3.4 Validation Subdirectory (scripts/validation/)

**23 files** - Quality checking and analysis

**Active validators** (also in tools/validators/):
- `course-validator.cjs` (duplicate of tools/)
- `phase-deep-validator.cjs` (duplicate of tools/)
- `course-analyzer.cjs` (duplicate of tools/)

**Specialized validators** (unique to scripts/):
- `check-infinitive-forms.js`, `check-infinitive-forms-lib.cjs` - Grammar checking
- `check-lego-fd-violations.cjs` - FD/LUT collision detection
- `analyze-basket-gaps.cjs` - Coverage analysis
- `auto-upchunk-collisions.cjs` - Collision resolution
- `delete-colliding-baskets.cjs` - Cleanup utility
- `restore-baskets.cjs` - Recovery utility
- `track-basket-dependencies.cjs` - Dependency tracking

**RECOMMENDATION**: Move active specialized validators to tools/validators/

### 3.5 Merge Subdirectory (scripts/merge/)

**6 files** - Merging utilities

| File | Also in Root | Also in tools/ | Status |
|------|--------------|----------------|--------|
| `merge_all_basket_branches.cjs` | ✅ Root | ✅ tools/mergers/ | 3-way duplicate |
| `merge_phase3_chunk01.js` | ✅ Root | ❌ | 2-way duplicate |
| `merge_phase3_v7_segments.js` | ✅ Root | ❌ | 2-way duplicate |
| `consolidate_cmn_baskets.cjs` | ❌ | ❌ | Unique (Chinese) |
| `merge-chinese-baskets.cjs` | ❌ | ❌ | Unique (Chinese) |
| `merge_basket_branches.cjs` | ❌ | ❌ | Unique |

---

## 4. DUPLICATE ANALYSIS

### 4.1 Exact Duplicates (Same File, Multiple Locations)

| File Name | Locations | MD5 Verified | Recommendation |
|-----------|-----------|--------------|----------------|
| `automation_server.cjs` | root, tools/orchestrators/, scripts/automation/ | ✅ | **Keep tools/**, delete others |
| `orchestrator-workflow.cjs` | root, tools/orchestrators/, scripts/automation/ | ✅ | **Keep tools/**, delete others |
| `course-validator.cjs` | root, tools/validators/, scripts/validation/ | ✅ | **Keep tools/**, delete others |
| `course-analyzer.cjs` | root, tools/validators/, scripts/validation/ | ✅ | **Keep tools/**, delete others |
| `phase-deep-validator.cjs` | root, tools/validators/, scripts/validation/ | ✅ | **Keep tools/**, delete others |
| `merge_all_basket_branches.cjs` | root, tools/mergers/, scripts/merge/ | ✅ | **Keep tools/**, delete others |
| `generate-course-manifest.js` | root, tools/generators/ | ✅ | **Keep tools/**, delete root |
| `spawn_basket_windows.cjs` | tools/orchestrators/, scripts/automation/ | ✅ | **Keep tools/**, delete scripts/ |

### 4.2 Conceptual Duplicates (Different Implementations, Same Purpose)

**Phase5 Processors**:
- `phase5_processor.js` (root)
- `phase5_processor.js` (scripts/)
- `phase5_processor.py` (scripts/phase5-batch-processors/)
- `phase5_processor_v2.py` (scripts/phase5-batch-processors/)
- `phase5_processor.py` (tools/)
- `phase5-processor.js` (root)
- `phase5-processor.js` (scripts/)

**Recommendation**: Consolidate to ONE canonical processor in tools/

**Phase5 Generators** (6 variations):
1. `phase5_improved_generator.cjs` (root + scripts/phase5-batch-processors/)
2. `phase5_enhanced_generator.cjs` (root + scripts/phase5-batch-processors/)
3. `phase5_intelligent_generator.cjs` (root + scripts/phase5-batch-processors/)
4. `phase5_contextual_generator.cjs` (root + scripts/phase5-batch-processors/)
5. `phase5_natural_generator.cjs` (root + scripts/phase5-batch-processors/)
6. `phase5_agent_generator.cjs` (root + scripts/phase5-batch-processors/)

**Recommendation**: Identify ONE current generator, archive the rest

**Merge Scripts**:
- `merge_all_basket_branches.cjs` (root, tools/mergers/, scripts/merge/)
- `merge_all_segments.cjs` (scripts/, tools/mergers/)
- `merge_basket_branches.cjs` (scripts/merge/)
- `watch_and_merge_branches.cjs` (scripts/, tools/mergers/)

**Recommendation**: Keep tools/mergers/ versions, delete duplicates

---

## 5. WHAT'S ACTUALLY USED?

### 5.1 Referenced by package.json

```json
{
  "generate-manifest": "node generate-course-manifest.js",  // Root file (should use tools/)
  "server": "node automation_server.cjs",                   // Root file (should use tools/)
  "automation": "node start-automation.js"                  // Root file (KEEP - legit starter)
}
```

**FINDING**: package.json references ROOT files, but identical versions exist in tools/. Need to update package.json to use tools/ versions.

### 5.2 Referenced by ecosystem.config.cjs (Tom's PM2)

```javascript
script: 'start-automation.cjs'  // Starts automation_server.cjs
```

**FINDING**: Uses root `start-automation.cjs` which internally runs root `automation_server.cjs`

### 5.3 Referenced by ecosystem.config.kai.cjs (Kai's PM2)

```javascript
script: 'automation_server.cjs'  // Root version
```

**FINDING**: Directly runs root `automation_server.cjs`

### 5.4 Actually Used Files

Based on grep analysis and ecosystem configs:

**ACTIVE**:
- ✅ `tools/orchestrators/automation_server.cjs` (353KB) - **Master orchestrator**
- ✅ `tools/orchestrators/orchestrator-workflow.cjs` (28KB) - Referenced by automation_server
- ✅ `tools/orchestrators/spawn_basket_windows.cjs` - Referenced by automation_server
- ✅ `tools/validators/course-validator.cjs` - Core validation
- ✅ `tools/validators/phase-deep-validator.cjs` - Phase validation
- ✅ `tools/mergers/merge_all_basket_branches.cjs` - Branch merging
- ✅ `tools/mergers/merge_phase5_to_lego_baskets.cjs` - Phase5 completion
- ✅ `tools/sync/sync-course-to-s3.cjs` - S3 upload
- ✅ `tools/sync/sync-course-from-s3.cjs` - S3 download
- ✅ `start-automation.cjs` (root) - PM2 startup wrapper

**PROBABLY ABANDONED** (No references found):
- ❌ All 6 phase5 generator variations (improved, enhanced, intelligent, etc.)
- ❌ All segment-specific batch processors (s0081_s0090, s0161_s0170, etc.) - one-time use
- ❌ Phase5 Python processors in tools/ root (not referenced anywhere)
- ❌ Legacy migration scripts in tools/legacy-migrations/

---

## 6. ROOT CLEANUP RECOMMENDATIONS

### 6.1 IMMEDIATE DELETIONS (Exact Duplicates of tools/)

**Delete from root** (keep tools/ versions):
```bash
rm automation_server.cjs                    # 353KB - Use tools/orchestrators/
rm orchestrator-workflow.cjs                # 28KB  - Use tools/orchestrators/
rm orchestrator-prompt-helpers.cjs          # 14KB  - Use tools/orchestrators/ (if exists)
rm course-validator.cjs                     # 7.9KB - Use tools/validators/
rm course-analyzer.cjs                      # 12KB  - Use tools/validators/
rm phase-deep-validator.cjs                 # 16KB  - Use tools/validators/
rm merge_all_basket_branches.cjs            # 3.8KB - Use tools/mergers/
rm generate-course-manifest.js              # 8.0KB - Use tools/generators/
rm spawn_claude_web_agent.cjs               # 11KB  - Use scripts/automation/
```

**Total saved**: ~453KB, 9 files

### 6.2 MOVE TO scripts/ (Batch-Specific Work)

**Phase5 batch processors** (20 files):
```bash
# Move all phase5_process_sXXXX_sYYYY.* files
mv phase5_process_s0081_s0090.cjs scripts/phase5-batch-processors/
mv phase5_process_s0161_s0170.js scripts/phase5-batch-processors/
# ... (18 more files)
```

**Phase5 generators** (6 files - but first identify which ONE is current):
```bash
# Archive 5 old versions, keep 1 current
# Need to determine which is actually used
mv phase5_improved_generator.cjs scripts/phase5-batch-processors/
mv phase5_enhanced_generator.cjs scripts/phase5-batch-processors/
# ... etc
```

**Other processors**:
```bash
mv phase5_processor.js scripts/phase5-batch-processors/
mv phase5-processor.js scripts/phase5-batch-processors/
mv process_phase5_improved.cjs scripts/phase5-batch-processors/
mv process_phase5_s0011_s0020.cjs scripts/phase5-batch-processors/
mv process_phase5_s0131_s0140.cjs scripts/phase5-batch-processors/
mv process_phase5_seeds.cjs scripts/phase5-batch-processors/
mv process-phase5-seeds.cjs scripts/phase5-batch-processors/
mv process-phase5-enhanced.cjs scripts/phase5-batch-processors/
mv process-phase5-final.cjs scripts/phase5-batch-processors/
mv refine_phase5_s0131.cjs scripts/phase5-batch-processors/
```

**Chinese generation**:
```bash
mv phase5_generate_cmn.cjs scripts/phase5-batch-processors/
mv phase5_generate_cmn.js scripts/phase5-batch-processors/
```

**Merge utilities**:
```bash
mv merge_phase3_chunk01.js scripts/merge/
mv merge_phase3_v7_segments.js scripts/merge/
```

**Orchestration helpers**:
```bash
mv phase5_orchestrator_s0211_s0220.cjs scripts/automation/
```

### 6.3 UPDATE REFERENCES

**package.json** changes:
```json
{
  "scripts": {
    "generate-manifest": "node tools/generators/generate-course-manifest.js",
    "server": "node tools/orchestrators/automation_server.cjs",
    "automation": "node start-automation.cjs"  // Keep as-is (wrapper)
  }
}
```

**ecosystem.config.kai.cjs** changes:
```javascript
script: 'tools/orchestrators/automation_server.cjs'
```

**start-automation.cjs** changes:
```javascript
// Update internal reference from:
spawn('node', ['automation_server.cjs'])
// To:
spawn('node', ['tools/orchestrators/automation_server.cjs'])
```

### 6.4 POST-CLEANUP ROOT STATE

After cleanup, root should contain ONLY:
```
/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── ecosystem.config.cjs
├── ecosystem.config.kai.cjs
├── start-automation.cjs        # Wrapper script (updates internal path)
├── README.md
├── SYSTEM.md
├── CLAUDE.md
└── .gitignore
```

**Total root files**: ~10 essential configs/docs

---

## 7. tools/ CLEANUP RECOMMENDATIONS

### 7.1 Archive Legacy Migrations

```bash
mkdir -p archive/legacy-tools/migrations
mv tools/legacy-migrations/* archive/legacy-tools/migrations/
```

**Reason**: All dated 2025-10-29, superseded by current phase processors

### 7.2 Consolidate Phase5 Python Processors

**Current state**: 6 Python files in tools/ root level
**Problem**: These appear batch-specific, not general utilities

**Options**:
1. **If reusable**: Create `tools/phase5-processors/` subdirectory
2. **If batch-specific**: Move to `scripts/phase5-batch-processors/`
3. **If abandoned**: Move to `archive/old-phase5-processors/`

**Recommendation**: Review file headers/documentation to determine actual purpose.

### 7.3 Verify Mergers

All 4 files in `tools/mergers/` recently modified (2025-11-17), appear active:
- ✅ `merge_all_basket_branches.cjs` - Used by workflows
- ✅ `merge_all_segments.cjs` - Segment merging
- ✅ `merge_phase5_to_lego_baskets.cjs` - Phase5 completion
- ✅ `watch_and_merge_branches.cjs` - Auto-merge watcher

**Action**: Keep all, ensure no duplicates in scripts/

---

## 8. scripts/ CLEANUP RECOMMENDATIONS

### 8.1 Remove Duplicates of tools/

Since scripts/ is gitignored workspace, keep for experimentation but document:

**Create scripts/README.md**:
```markdown
# scripts/ - Development Workspace (GITIGNORED)

This directory contains experimental, batch-specific, and one-time-use scripts.

## ⚠️ DO NOT CREATE DUPLICATES
Before creating a script here, check if it exists in tools/:
- tools/orchestrators/
- tools/validators/
- tools/mergers/
- tools/generators/

## Promote to tools/
When a script becomes stable and reusable:
1. Move to appropriate tools/ subdirectory
2. Document in tools/README.md
3. Commit to git
```

### 8.2 Organize Phase5 Batch Processors

**Current state**: 50 files in scripts/phase5-batch-processors/

**Organize by category**:
```bash
mkdir -p scripts/phase5-batch-processors/{segments,generators,processors,chinese,agents}

# Move segment-specific (s0XXX_sYYY)
mv scripts/phase5-batch-processors/phase5_process_s*.* scripts/phase5-batch-processors/segments/

# Move generators
mv scripts/phase5-batch-processors/*generator* scripts/phase5-batch-processors/generators/

# Move generic processors
mv scripts/phase5-batch-processors/phase5_processor* scripts/phase5-batch-processors/processors/

# Move Chinese-specific
mv scripts/phase5-batch-processors/*cmn* scripts/phase5-batch-processors/chinese/

# Move agent-specific
mv scripts/phase5-batch-processors/generate_agent* scripts/phase5-batch-processors/agents/
```

---

## 9. CRITICAL QUESTIONS TO ANSWER

### 9.1 Phase5 Generators - Which ONE is Current?

**6 variations exist**:
1. `phase5_improved_generator.cjs`
2. `phase5_enhanced_generator.cjs`
3. `phase5_intelligent_generator.cjs`
4. `phase5_contextual_generator.cjs`
5. `phase5_natural_generator.cjs`
6. `phase5_agent_generator.cjs`

**Investigation needed**:
- Check git history for most recent active development
- Check file contents for "DEPRECATED" or "USE X INSTEAD" comments
- Check automation_server.cjs for which is actually spawned
- Ask Kai which is current

**Current hypothesis**: `phase5_intelligent_generator.cjs` based on naming pattern (matches tools/phase5_intelligent_generator.py)

### 9.2 Phase5 Processors - What's the Difference?

**Multiple files with similar names**:
- `phase5_processor.js` vs `phase5-processor.js` (hyphen vs underscore)
- `process_phase5_*.cjs` vs `phase5_process_*.cjs` (prefix order)
- `phase5_processor.py` vs `phase5_processor_v2.py` vs `phase5_batch_processor.py`

**Investigation needed**:
- Compare file contents
- Check for functional differences
- Identify canonical version

### 9.3 Python vs JavaScript - Why Both?

**Observation**: Phase5 has both Python and JavaScript implementations

**Possibilities**:
1. Python for LLM-heavy processing (OpenAI/Anthropic APIs)
2. JavaScript for file I/O and orchestration
3. Historical - migrating from Python to JavaScript
4. Team preference - Tom uses JS, Kai uses Python

**Investigation needed**:
- Check which is actively maintained
- Check performance characteristics
- Document why both exist

---

## 10. AUTOMATION_SERVER FORENSICS

### 10.1 File Locations

| Location | Size | MD5 | Last Modified |
|----------|------|-----|---------------|
| Root | 353KB | c1d2d454b4732c482e2aade86c7fceee | 2025-11-17 17:17 |
| tools/orchestrators/ | 353KB | c1d2d454b4732c482e2aade86c7fceee | 2025-11-17 17:24 |
| scripts/automation/ | 353KB | c1d2d454b4732c482e2aade86c7fceee | 2025-11-17 18:09 |

**Verification**: All three copies are BYTE-FOR-BYTE IDENTICAL

### 10.2 References

**Callers**:
- `ecosystem.config.kai.cjs` → `automation_server.cjs` (root)
- `start-automation.cjs` → `automation_server.cjs` (root)
- `package.json` → `automation_server.cjs` (root via npm script)

**Internal references**:
- `orchestrator-workflow.cjs` mentions `automation_server.cjs` in comments

### 10.3 Recommendation

**CANONICAL LOCATION**: `tools/orchestrators/automation_server.cjs`

**Why**:
1. tools/ is committed to git and shared with Kai
2. Follows project organization (orchestrators belong in tools/orchestrators/)
3. Already has other orchestrator files there

**Actions**:
1. Delete root and scripts/ copies
2. Update ecosystem.config.kai.cjs
3. Update start-automation.cjs
4. Update package.json
5. Test all startup paths

---

## 11. FINAL INVENTORY TABLES

### 11.1 Root Files (After Cleanup)

| Category | Count | Files |
|----------|-------|-------|
| Essential Configs | 5 | vite.config.js, tailwind.config.js, postcss.config.js, ecosystem.config.cjs, ecosystem.config.kai.cjs |
| Documentation | 3 | README.md, SYSTEM.md, CLAUDE.md |
| Package Management | 1 | package.json |
| Automation Wrapper | 1 | start-automation.cjs |
| **TOTAL** | **10** | |

### 11.2 tools/ Files (Active)

| Subdirectory | Count | Purpose |
|--------------|-------|---------|
| orchestrators | 3 | Multi-agent coordination |
| validators | 3 | Quality gates |
| mergers | 4 | Branch & data merging |
| generators | 4 | Content generation |
| sync | 2 | S3 operations |
| phase-prep | 3 | Phase scaffolding |
| **TOTAL** | **19** | |

### 11.3 tools/ Files (Archive)

| Subdirectory | Count | Destination |
|--------------|-------|-------------|
| legacy-migrations | 7 | Move to archive/legacy-tools/ |
| [root level Python] | 6 | Evaluate: keep, move to scripts/, or archive |

### 11.4 scripts/ Files (Organized)

| Subdirectory | Count | Purpose |
|--------------|-------|---------|
| automation | 13 | Testing ground for automation scripts |
| merge | 6 | Merge utilities (some duplicates of tools/) |
| validation | 23 | Quality checking (some duplicates of tools/) |
| phase5-batch-processors | 50 | One-time batch processors (further organize) |
| [root level] | 120 | Mixed utilities (needs organization) |
| **TOTAL** | **212** | |

---

## 12. IMPLEMENTATION PLAN

### Phase 1: IMMEDIATE (No Breaking Changes)
1. ✅ Document current state (this audit)
2. Create archive directories
3. Archive legacy-migrations
4. Create scripts/README.md with guidelines

### Phase 2: SAFE DELETIONS (Test After Each)
1. Delete exact duplicates in root (keep tools/ versions)
   - Verify each file is identical (md5)
   - Test ecosystem startup
   - Test package.json scripts
2. Move phase5 batch processors from root → scripts/
   - Since scripts/ is gitignored, this removes them from git
   - Test that no workflows break

### Phase 3: REFERENCE UPDATES (Requires Testing)
1. Update package.json to use tools/ paths
2. Update ecosystem.config.kai.cjs to use tools/ paths
3. Update start-automation.cjs to use tools/ paths
4. Test full automation startup flow

### Phase 4: ORGANIZE scripts/
1. Organize scripts/phase5-batch-processors/ by category
2. Remove duplicates of tools/ files from scripts/
3. Promote useful unique scripts from scripts/ → tools/

### Phase 5: TOOLS CLEANUP
1. Identify current phase5 generator (archive others)
2. Consolidate phase5 processors (Python vs JS decision)
3. Document which tools are actually used
4. Update tools/README.md

---

## 13. SUCCESS METRICS

### After Cleanup:
- ✅ Root directory: ~10 files (down from 49)
- ✅ Zero exact duplicates between root, tools/, scripts/
- ✅ tools/ contains only shared, documented utilities
- ✅ scripts/ organized by category, no duplicates of tools/
- ✅ All ecosystem configs reference tools/ versions
- ✅ package.json references tools/ versions
- ✅ Documentation explains purpose of each directory
- ✅ Git history reduced (phase5 batch processors removed)

### Verification Commands:
```bash
# No duplicates
md5 automation_server.cjs tools/orchestrators/automation_server.cjs
# (should fail - root deleted)

# Root is clean
ls *.cjs *.js *.py 2>/dev/null | wc -l
# (should be ~3: start-automation.cjs, vite.config.js, tailwind.config.js, postcss.config.js, ecosystem.config.js, ecosystem.config.kai.cjs)

# Tools are organized
find tools -type f \( -name "*.cjs" -o -name "*.js" -o -name "*.py" \) | wc -l
# (should be ~19 active files)

# Ecosystem works
pm2 start ecosystem.config.cjs
pm2 logs
# (no errors about missing files)
```

---

## 14. APPENDIX: FULL FILE LISTINGS

### A. Root Files (Current State - Before Cleanup)

<details>
<summary>Click to expand (49 files)</summary>

```
automation_server.cjs (353KB)
course-analyzer.cjs (12KB)
course-validator.cjs (7.9KB)
ecosystem.config.cjs (2.0KB)
ecosystem.config.js (2.5KB)
ecosystem.config.kai.cjs (2.0KB)
generate-course-manifest.js (8.0KB)
merge_all_basket_branches.cjs (3.8KB)
merge_phase3_chunk01.js (2.5KB)
merge_phase3_v7_segments.js (5.9KB)
orchestrator-prompt-helpers.cjs (14KB)
orchestrator-workflow.cjs (28KB)
phase-deep-validator.cjs (16KB)
phase5_agent_generator.cjs (8.9KB)
phase5_contextual_generator.cjs (9.2KB)
phase5_enhanced_generator.cjs (10KB)
phase5_generate_cmn.cjs (5.9KB)
phase5_generate_cmn.js (5.6KB)
phase5_improved_generator.cjs (6.6KB)
phase5_intelligent_generator.cjs (8.4KB)
phase5_natural_generator.cjs (4.2KB)
phase5_orchestrator_s0211_s0220.cjs (12KB)
phase5_process_s0081_s0090.cjs (6.7KB)
phase5_process_s0161_s0170.js (6.5KB)
phase5_process_s0181_s0190.js (8.3KB)
phase5_process_s0191_s0200.js (8.7KB)
phase5_process_s0241_s0250.js (10KB)
phase5_process_s0241_s0250_final.js (9.0KB)
phase5_process_s0241_s0250_v2.js (10KB)
phase5_process_s0241_s0250_v3.js (9.2KB)
phase5_process_s0251_s0260.js (11KB)
phase5_process_s0281_s0290.js (7.4KB)
phase5_process_s0291_s0300.js (9.3KB)
phase5_process_s0401_s0410.js (8.9KB)
phase5_processor.js (7.9KB)
phase5-processor.js (7.3KB)
postcss.config.js (80B)
process_phase5_improved.cjs (5.7KB)
process_phase5_s0011_s0020.cjs (13KB)
process_phase5_s0131_s0140.cjs (6.4KB)
process_phase5_seeds.cjs (10KB)
process-phase5-enhanced.cjs (8.1KB)
process-phase5-final.cjs (7.5KB)
process-phase5-seeds.cjs (8.8KB)
refine_phase5_s0131.cjs (4.2KB)
spawn_claude_web_agent.cjs (11KB)
start-automation.cjs (6.9KB)
tailwind.config.js (186B)
vite.config.js (1.8KB)
```
</details>

### B. tools/ Files (Current State)

<details>
<summary>Click to expand (32 files)</summary>

```
tools/generators/generate-course-manifest.js (8.0KB)
tools/generators/phase5-merge-batches.cjs (6.9KB)
tools/generators/phase6-generate-introductions.cjs (7.5KB)
tools/generators/phase8-generate-audio.cjs (3.2KB)
tools/legacy-migrations/convert-old-to-new-format.cjs (4.5KB)
tools/legacy-migrations/convert-to-v7.0-format.cjs (3.9KB)
tools/legacy-migrations/deduplicate-baskets.cjs (2.8KB)
tools/legacy-migrations/generate-introductions.cjs (6.2KB)
tools/legacy-migrations/process-phase-3-with-validation.cjs (8.7KB)
tools/legacy-migrations/process-phase-5.cjs (5.4KB)
tools/legacy-migrations/validate-lego-breakdowns.cjs (4.1KB)
tools/mergers/merge_all_basket_branches.cjs (3.8KB)
tools/mergers/merge_all_segments.cjs (5.6KB)
tools/mergers/merge_phase5_to_lego_baskets.cjs (8.2KB)
tools/mergers/watch_and_merge_branches.cjs (4.7KB)
tools/orchestrators/automation_server.cjs (353KB)
tools/orchestrators/orchestrator-workflow.cjs (28KB)
tools/orchestrators/spawn_basket_windows.cjs (6.4KB)
tools/phase-prep/phase3_prepare_batches.cjs (5.8KB)
tools/phase-prep/phase5_generate_scaffolds.cjs (7.3KB)
tools/phase-prep/phase5_prep_scaffolds.cjs (6.1KB)
tools/phase5_direct_processor.py (14KB)
tools/phase5_final_processor.py (9.8KB)
tools/phase5_generator.py (9.5KB)
tools/phase5_intelligent_generator.py (13KB)
tools/phase5_s0611_s0620_processor.py (12KB)
tools/phase5-scaffold-processor.cjs (7.4KB)
tools/sync/sync-course-from-s3.cjs (4.2KB)
tools/sync/sync-course-to-s3.cjs (3.9KB)
tools/validators/course-validator.cjs (7.9KB)
tools/validators/phase-deep-validator.cjs (16KB)
tools/validators/validate-course.cjs (5.3KB)
```
</details>

### C. scripts/ Files (Top 50 Most Recently Modified)

<details>
<summary>Click to expand (50 files)</summary>

```
scripts/merge_phase5_to_lego_baskets.cjs
scripts/generate_recovery_prompts.cjs
scripts/detect_missing_baskets.cjs
scripts/automation/recover_from_browser.cjs
scripts/merge/consolidate_cmn_baskets.cjs
scripts/phase7-compile-manifest.cjs
scripts/phase7-compile-spa-v8.cjs
scripts/merge/merge-chinese-baskets.cjs
scripts/generate-course-manifest.js
scripts/automation/spawn_clear_windows.cjs
scripts/merge/merge_all_basket_branches.cjs
scripts/watch_and_merge_branches.cjs
scripts/validation/track-basket-dependencies.cjs
scripts/validation/run-all-checks.js
scripts/validation/restore-baskets.cjs
scripts/validation/phase-deep-validator.cjs
scripts/validation/generate-collision-aware-reextraction.cjs
scripts/validation/delete-colliding-baskets.cjs
scripts/validation/course-validator.cjs
scripts/validation/course-analyzer.cjs
scripts/validation/check-lego-fd-violations.cjs
scripts/validation/check-infinitive-forms.js
scripts/validation/check-infinitive-forms-lib.cjs
scripts/validation/auto-upchunk-collisions.cjs
scripts/validation/analyze-basket-gaps.cjs
scripts/strip-basket-metadata.cjs
scripts/strip_phase5_metadata.cjs
scripts/push_segment.cjs
scripts/phase6-generate-introductions.cjs
scripts/phase5-processor.js
scripts/phase5-batch-processors/refine_phase5_s0131.cjs
scripts/phase5-batch-processors/refine_phase5_cmn_s0521_s0530.py
scripts/phase5-batch-processors/process-phase5-seeds.cjs
scripts/phase5-batch-processors/process-phase5-final.cjs
scripts/phase5-batch-processors/process-phase5-enhanced.cjs
scripts/phase5-batch-processors/process_phase5_seeds.py
scripts/phase5-batch-processors/process_phase5_seeds.cjs
scripts/phase5-batch-processors/process_phase5_s0131_s0140.cjs
scripts/phase5-batch-processors/process_phase5_s0011_s0020.cjs
scripts/phase5-batch-processors/process_phase5_improved.cjs
scripts/phase5-batch-processors/process_phase5_cmn.py
scripts/phase5-batch-processors/process_phase5_cmn_s0521_s0530.py
scripts/phase5-batch-processors/process_phase5_cmn_intelligent.py
scripts/phase5-batch-processors/process_phase5_cmn_final.py
scripts/phase5-batch-processors/phase5_processor.py
scripts/phase5-batch-processors/phase5_processor_v2.py
scripts/phase5-batch-processors/phase5_process_s0401_s0410.js
scripts/phase5-batch-processors/phase5_process_s0291_s0300.js
scripts/phase5-batch-processors/phase5_process_s0281_s0290.js
scripts/phase5-batch-processors/phase5_process_s0251_s0260.js
```
</details>

---

**END OF AUDIT**

Generated: 2025-11-17
Next Review: After Phase 1-2 cleanup implementation
Owner: Tom Cassidy
Reviewed By: Claude Code
