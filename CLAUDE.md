# CLAUDE.md - Agent Onboarding Guide

> **Welcome, future agent!** This document contains everything you need to work effectively on the SSi Dashboard v7 project without creating chaos.

**Last Updated:** 2025-11-20
**Current Spec:** APML v8.2.0
**Architecture:** REST API Microservices

---

## 🎯 Project Overview

**SSi Dashboard v7 Clean** is a language learning pipeline that transforms 668 canonical concepts into complete language courses through REST API microservices orchestration.

### Quick Facts
- **Canonical Input**: 668 pedagogically-ordered seeds (language-agnostic)
- **Pipeline**: Phase 1 → 3 (includes 6) → 5 → 7 → 8
- **Data Format**: APML v8.2.0 (Adaptive Pedagogy Markup Language)
- **Architecture**: Layered microservices with REST APIs
- **No Git Branching**: Agents submit via POST endpoints
- **Current Spec**: `ssi-course-production.apml` v8.2.0

---

## 📂 Repository Structure

### **Root Directory - Keep It Clean!**
```
/
├── README.md                      # Project overview
├── SYSTEM.md                      # System architecture
├── CLAUDE.md                      # ← You are here
├── ssi-course-production.apml     # APML v8.2.0 specification (SSoT)
├── start-automation.cjs           # Start all microservices
├── package.json                   # Node dependencies
├── vite.config.js                 # Build config
└── [essential configs only]
```

**⚠️ DO NOT create files in root!** Use appropriate directories.

### **Core Directories**

#### `services/` - Microservices (CURRENT ARCHITECTURE)
Self-contained phase servers with REST APIs.
```
services/
├── orchestration/
│   └── orchestrator.cjs                    # Main orchestrator (port 3456)
├── phases/
│   ├── phase1-translation/
│   │   └── server.cjs                      # Translation (port 3457, includes Phase 2 LUT)
│   ├── phase3-lego-extraction/
│   │   ├── server.cjs                      # LEGO extraction (port 3458)
│   │   └── generate-introductions.cjs      # Phase 6 integrated (<1s overhead)
│   ├── phase5-basket-generation/
│   │   ├── server.cjs                      # Baskets (port 3459)
│   │   ├── prep-scaffolds.cjs
│   │   └── generate-text-scaffold.cjs
│   ├── phase5.5-grammar-validation-server.cjs  # Grammar check (DEPRECATED v8.2.1)
│   ├── phase7-manifest-server.cjs          # Compilation (port 3464)
│   └── phase8-audio-server.cjs             # TTS/Audio (port 3465, Kai's domain)
└── shared/
    ├── spawn-agent.cjs                     # Browser automation
    └── config-loader.cjs                   # Configuration loading
```

#### `public/` - Static Assets & Course Data
```
public/
├── vfs/
│   ├── canonical/
│   │   ├── canonical_seeds.json           # 668 language-agnostic seeds
│   │   ├── eng_encouragements.json        # Pooled encouragements
│   │   └── welcomes.json                  # Course intro template
│   └── courses/
│       ├── spa_for_eng/                   # Spanish for English speakers
│       │   ├── seed_pairs.json            # Phase 1 output
│       │   ├── lego_pairs.json            # Phase 3 output
│       │   ├── lego_baskets.json          # Phase 5 output
│       │   ├── introductions.json         # Phase 6 output (in Phase 3)
│       │   └── course_manifest.json       # Phase 7 output
│       └── cmn_for_eng/                   # Mandarin for English speakers
└── docs/
    └── phase_intelligence/                 # Phase methodology docs (SSoT)
        ├── phase_1_translation.md
        ├── phase_3_lego_extraction.md
        ├── phase_5_basket_generation.md
        ├── phase_6_introductions.md
        ├── phase_7_compilation.md
        ├── phase_8_audio.md
        └── CANONICAL_CONTENT.md
```

#### `scripts/` - Your Workspace (GITIGNORED)
Your experimental scripts, agent-generated code, one-off fixes.
```
scripts/
├── batch-temp/       # Agent-generated batch processors
├── experiments/      # Testing & prototyping
├── fixes/            # One-off fixes
└── deprecated/       # Old versions
```

#### `tools/` - Shared Utilities (IN GIT)
Essential scripts shared with collaborators (Kai). These are stable, documented tools.
```
tools/
├── validators/       # Quality gates & checks
├── generators/       # Content generation
├── sync/             # S3 sync utilities
└── phase-prep/       # Phase scaffolding
```

**⚠️ ARCHIVED:** `tools/orchestrators/automation_server.cjs` - Replaced by layered microservices
**Location:** `archive/automation-server-2025-11-20/`

#### `src/` - Frontend Dashboard (Vue 3)
```
src/
├── views/
│   ├── ProcessOverview.vue            # Pipeline visualization
│   ├── PhaseIntelligence.vue          # Phase methodology viewer
│   └── CourseGeneration.vue           # Course creation UI
└── services/
    └── api.js                         # REST API client
```

---

## 🚫 CRITICAL: What NOT to Do

### **Never Create These in Root:**
- ❌ Markdown files (use `docs/` or `public/docs/`)
- ❌ Python scripts (use `scripts/` or `tools/`)
- ❌ JavaScript files (except configs - use `scripts/` or `services/`)
- ❌ JSON reports (use `archive/` or temp dirs)
- ❌ Log files (already gitignored)
- ❌ Test files (use `scripts/experiments/`)

### **Never Commit These:**
- ❌ `scripts/` contents (workspace is gitignored)
- ❌ `.project/` (project management - local only)
- ❌ `archive/` (historical data)
- ❌ Agent-generated batch processors
- ❌ Large log files
- ❌ Temporary analysis files

### **Always Check .gitignore Before Creating Files!**
If you're generating files, verify they're in gitignored directories.

---

## 🧬 APML v8.2.0 Specification

**Location**: `ssi-course-production.apml` (root - Single Source of Truth)

**Current Version**: 8.2.0 (2025-11-20)

### **Major Changes in v8.2.0**
- ✅ Phase 6 integrated into Phase 3 (<1s overhead)
- ✅ Phase 4 deprecated (linear pipeline)
- ✅ REST API architecture (no git branching)
- ✅ Self-contained phase intelligence (embedded in dashboard)
- ✅ Canonical content system (3-parameter input model)

### **Phase Outputs**
- **Phase 1 (v2.6)**: `seed_pairs.json` - Pedagogical translations
- **Phase 3 (v7.1)**: `lego_pairs.json` + `introductions.json` (dual output)
- **Phase 5 (v6.1)**: `lego_baskets.json` - Practice phrases
- **Phase 6 (v2.1)**: Integrated into Phase 3 (no standalone file)
- **Phase 7 (v1.1)**: `course_manifest.json` - Final manifest with placeholders
- **Phase 8 (v1.1)**: Audio files + populated duration fields (Kai's domain)

### **LEGO Terminology (v8.2.0)**
- **ATOMIC LEGO**: Single indivisible unit (e.g., "I" → "我")
- **MOLECULAR LEGO**: Composite unit with components (e.g., "with you" → "和你" = ["和", "你"])
- **Type Codes**:
  - `A` = Atomic (single unit)
  - `M` = Molecular (has components)

### **Validation Gates**
Every phase has quality gates:
- ~~Grammar validation (Phase 5.5)~~ DEPRECATED v8.2.1 - Human review used instead
- Language detection (Spanish in Chinese courses rejected)
- Structure validation (format consistency)
- LUT collision detection (Phase 1 inline check)

**📖 For deep dive**: See `public/docs/phase_intelligence/` and `ssi-course-production.apml`

---

## 🔧 Current Architecture: REST API Microservices

### **Starting the System**

```bash
# Start all microservices (recommended)
npm run automation

# Or manually
node start-automation.cjs
```

**This starts:**
- Orchestrator (port 3456)
- Phase 1 Server (port 3457)
- Phase 3 Server (port 3458)
- Phase 5 Server (port 3459)
- ~~Phase 5.5 Server (port 3460)~~ DEPRECATED v8.2.1
- Phase 7 Server (port 3464)
- Phase 8 Server (port 3465)

### **REST API Endpoints**

**Orchestrator** (port 3456):
```bash
# Canonical content
GET  /api/canonical-seeds                          # 668 canonical seeds
GET  /api/phase-intelligence/:phase                # Phase methodology docs

# Phase outputs
GET  /api/courses/:courseCode/phase-outputs/:phase/:file

# Agent submission endpoints
POST /api/phase1/:courseCode/submit                # Submit seed_pairs.json
POST /api/phase3/:courseCode/submit                # Submit lego_pairs.json + introductions.json
POST /api/phase5/:courseCode/submit                # Submit lego_baskets.json
POST /api/phase7/:courseCode/submit                # Submit course_manifest.json
```

**Phase 5 Server** (port 3459):
```bash
POST /upload-basket                                 # Submit baskets to staging
  Body: { course, seed, baskets, agentId }

# Staging workflow:
# 1. Agent POSTs to /upload-basket
# 2. Server validates + saves to phase5_baskets_staging/
# 3. Use extract-and-normalize.cjs to merge to production
```

### **How Agents Work (No Git Branching)**

**OLD WAY (Deprecated):**
- Agents work in git branches
- automation_server merges branches
- Complex coordination needed

**NEW WAY (v8.2.0):**
```bash
# 1. Agent fetches data via GET
curl http://localhost:3456/api/courses/spa_for_eng/phase-outputs/3/lego_pairs.json

# 2. Agent generates content
# ... Claude Code does the work ...

# 3. Agent submits via POST
curl -X POST http://localhost:3456/api/phase5/spa_for_eng/submit \
  -H "Content-Type: application/json" \
  -d '{"version": "8.2.0", "course": "spa_for_eng", "baskets": {...}}'
```

**Benefits:**
- ✅ No git merge conflicts
- ✅ Parallel execution without coordination
- ✅ Immediate HTTP feedback
- ✅ Simple, scalable architecture

---

## 📝 File Naming Conventions

### **Phase-Specific Scripts** (gitignored - goes in `scripts/batch-temp/`)
```
phase5_process_s0121_s0130.py    # Batch-specific processor
generate_agent_04_phrases.py     # Agent-specific generator
refine_phase5_cmn_s0521.cjs      # One-off refinement
```

### **Stable Services** (committed - goes in `services/phases/`)
```
phase1-translation/server.cjs
phase3-lego-extraction/server.cjs
phase5-basket-generation/server.cjs
```

### **Documentation** (goes in `public/docs/phase_intelligence/`)
```
phase_1_translation.md
phase_3_lego_extraction.md
phase_5_basket_generation.md
```

---

## 🔄 Common Workflows

### **1. Generate a New Course (Full Pipeline)**

```bash
# Start all services
npm run automation

# Trigger via dashboard or direct API
curl -X POST http://localhost:3456/api/start-course-generation \
  -H "Content-Type: application/json" \
  -d '{
    "targetLang": "spa",
    "knownLang": "eng",
    "phases": [1, 3, 5, 7]
  }'

# Monitor progress
curl http://localhost:3456/api/course-status/spa_for_eng
```

### **2. Run Single Phase**

```bash
# Example: Phase 5 only
curl -X POST http://localhost:3459/start \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "spa_for_eng",
    "startSeed": 1,
    "endSeed": 10
  }'
```

### **3. Fix Language Leakage (Spanish in Chinese Course)**

```bash
# 1. Detect issues
node scripts/check_language_leakage.js

# 2. Review report
cat language_leakage_report.json

# 3. Fix (creates backup automatically)
node scripts/fix_language_leakage.js

# 4. Verify cleanup
grep -c "Spanish text" public/vfs/courses/cmn_for_eng/lego_baskets.json
```

---

## 🔀 Git Workflow & Recent Changes

### **Understanding What's Happened Recently**

**ALWAYS check recent commit history before starting work:**

```bash
# See last 10 commits with details
git log --oneline -10

# See recent changes with diffs
git log -5 --stat

# Check what changed in a specific directory
git log --oneline -- services/
git log --oneline -- public/docs/

# See full details of APML v8.2.0 migration
git log --grep="8.2.0" -5
```

**Why this matters:**
- Understand recent refactoring (automation_server → microservices)
- See what directories were reorganized
- Learn from commit messages what NOT to do
- Discover new tools or conventions

### **Recent Major Changes (Last 24 Hours)**

Check commits for these patterns:
- **f94df2fc**: "APML v8.2.0" - Major spec update
- **9adedf0a**: "REST API architecture" - No more git branching
- **29dee48a**: "Modular architecture" - Self-contained phase servers
- **bbe17e4d**: "Linear pipeline" - Phase 6 integrated into Phase 3

### **Before Creating Files:**

```bash
# Check if similar files exist
git log --all --full-history -- "**/filename*"

# See if directory was recently gitignored
git log --oneline -- .gitignore | head -5

# Check recent activity in target directory
git log --oneline -5 -- services/phases/
```

---

## 🤝 Working with Kai (Collaborator)

Kai owns **Phase 8 (Audio/TTS generation)**:
- Port: 3465
- Location: `services/phases/phase8-audio-server.cjs`
- Responsibility: Generate ~110,000 audio files + populate duration fields

When creating tools Kai might use:
1. **Test in `scripts/experiments/`**
2. **Move to `tools/`** when stable
3. **Document** with usage examples
4. **Commit** so Kai can access

---

## 🏗️ Architecture Principles

### **1. REST API First**
All agent communication via HTTP POST/GET. No git branching needed.

### **2. Self-Contained Services**
Each phase server has all dependencies. Can run in isolation.

### **3. Validation at Boundaries**
POST endpoints validate before accepting data.

### **4. Staging Before Production**
Phase 5 uses `phase5_baskets_staging/` → validate → merge to `lego_baskets.json`

### **5. Canonical Content System**
668 language-agnostic seeds → substitute `{target}` → any language pair

### **6. Idempotency**
Running twice produces same result. Safe to retry.

---

## 🐛 Troubleshooting

### **"Services won't start"**
```bash
# Check VFS_ROOT is set
cat .env.automation

# Verify services exist
ls services/orchestration/orchestrator.cjs
ls services/phases/phase1-translation/server.cjs

# Check ports aren't in use
lsof -i :3456
lsof -i :3457
```

### **"Agent can't submit baskets"**
```bash
# Check Phase 5 server is running
curl http://localhost:3459/health

# Verify staging directory exists
ls public/vfs/courses/spa_for_eng/phase5_baskets_staging/

# Check permissions
ls -la public/vfs/courses/spa_for_eng/
```

### **"Language leakage detected"**
```bash
# Spanish found in Chinese course
# Run cleanup script (creates backup automatically)
node scripts/fix_language_leakage.js

# Verify backup exists
ls public/vfs/courses/cmn_for_eng/*.pre-spanish-cleanup-backup.json
```

### **"Phase output missing"**
```bash
# Check phase completed successfully
curl http://localhost:3456/api/course-status/spa_for_eng

# Verify file exists
ls public/vfs/courses/spa_for_eng/seed_pairs.json
ls public/vfs/courses/spa_for_eng/lego_pairs.json
```

---

## 📚 Key Documents to Read

### **MUST READ (in order)**
1. **SYSTEM.md** - High-level system architecture
2. **ssi-course-production.apml** - APML v8.2.0 specification (SSoT)
3. **CLAUDE.md** - This file (agent onboarding)
4. **public/docs/phase_intelligence/** - Phase methodology docs

### **Workflows**
- `docs/workflows/REST_API_ARCHITECTURE.md`
- `docs/workflows/COURSE_GENERATION_ARCHITECTURE.md`

### **Canonical Content**
- `public/docs/phase_intelligence/CANONICAL_CONTENT.md`

---

## 🎓 Learning the Codebase

### **Day 1: Understand APML v8.2.0**
- Read `ssi-course-production.apml` (lines 1-500)
- Understand canonical content system
- Review phase outputs format

### **Day 2: Explore a Course**
- Examine `public/vfs/courses/spa_for_eng/`
- Look at phase outputs: `seed_pairs.json`, `lego_pairs.json`, `lego_baskets.json`
- Check file sizes: `ls -lh public/vfs/courses/spa_for_eng/`

### **Day 3: Run the Services**
```bash
# Start all services
npm run automation

# Check health
curl http://localhost:3456/health
curl http://localhost:3457/health
curl http://localhost:3459/health

# Explore APIs
curl http://localhost:3456/api/canonical-seeds | jq '.seeds | length'
curl http://localhost:3456/api/phase-intelligence/5
```

### **Week 1: Generate a Test Course**
```bash
# Small test (10 seeds)
curl -X POST http://localhost:3456/api/start-course-generation \
  -H "Content-Type: application/json" \
  -d '{
    "targetLang": "fra",
    "knownLang": "eng",
    "seedCount": 10,
    "phases": [1, 3, 5]
  }'
```

---

## ✅ Pre-Flight Checklist

Before starting work, verify:

- [ ] I've read `CLAUDE.md`, `SYSTEM.md`, and `ssi-course-production.apml`
- [ ] **I've checked recent commits** (`git log --oneline -10`)
- [ ] **I understand APML v8.2.0** (not v7.7)
- [ ] **I know automation_server is ARCHIVED** (use microservices)
- [ ] I understand the REST API architecture (no git branching)
- [ ] I understand the phase pipeline (1 → 3 (includes 6) → 5 → 7 → 8)
- [ ] I know where to create files (NOT in root!)
- [ ] I've checked `.gitignore` for file placement
- [ ] I understand staging workflow (Phase 5)
- [ ] I won't commit experimental scripts to git

---

## 🆘 When in Doubt

1. **Check recent commits** (`git log --oneline -10`) - See what changed!
2. **Read this file** (CLAUDE.md) - Your guide to the repo
3. **Check APML spec** (ssi-course-production.apml) - SSoT for data formats
4. **Read SYSTEM.md** - High-level architecture
5. **Check .gitignore** - Before creating files
6. **Look at existing code** in `services/phases/` - Learn from working examples
7. **Ask before creating root files!** - Keep it clean
8. **Use REST APIs** - Not git branching
9. **Validate before merging!** - Quality gates exist for a reason

---

## 🎯 Success Criteria

You're doing well if:

✅ Root directory stays clean (only essential configs)
✅ Your scripts are in appropriate directories (`scripts/` or `services/`)
✅ You're using REST APIs (not git branching)
✅ You understand APML v8.2.0 (not outdated v7.7)
✅ You know automation_server is archived
✅ Validation passes before merging
✅ Git only tracks essential files
✅ Kai can use your shared tools easily

---

**Welcome to the team! Keep the mojo alive, keep the repo clean. 🚀**

*Last updated: 2025-11-20*
*APML Version: 8.2.0*
*Architecture: REST API Microservices*
