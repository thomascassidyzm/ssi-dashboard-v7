# CLAUDE.md - Agent Onboarding Guide

> **Welcome, future agent!** This document contains everything you need to work effectively on the SSi Dashboard v7 project without creating chaos.

## 🎯 Project Overview

**SSi Dashboard v7 Clean** is a language learning pipeline that generates and manages course content through multiple processing phases. You're working on a system that transforms seed phrases into complete language courses with LEGO-based recombination for maximum learning efficiency.

### Quick Facts
- **Primary Language**: Spanish for English speakers (spa_for_eng)
- **Pipeline**: Phase 1 → Phase 3 → Phase 5 → Phase 6 → Phase 7
- **Data Format**: APML (Adaptive Pedagogy Markup Language)
- **Scale**: 668 seeds per course, thousands of LEGO components
- **Architecture**: Multi-agent orchestration with validation gates

---

## 📂 Repository Structure

### **Root Directory - Keep It Clean!**
```
/
├── README.md              # Project overview
├── SYSTEM.md              # System architecture
├── CLAUDE.md              # ← You are here
├── package.json           # Node dependencies
├── vite.config.js         # Build config
├── tailwind.config.js     # Styling config
└── [essential configs only]
```

**⚠️ DO NOT create files in root!** Use appropriate directories.

### **Core Directories**

#### `tools/` - Shared Utilities (IN GIT)
Essential scripts shared with collaborators (Kai). These are stable, documented tools.
```
tools/
├── orchestrators/    # Multi-agent coordination
├── validators/       # Quality gates & checks
├── generators/       # Content generation
├── mergers/          # Branch & data merging
├── sync/             # S3 sync utilities
└── phase-prep/       # Phase scaffolding
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

#### `docs/` - Documentation (ORGANIZED)
```
docs/
├── setup/            # Installation & configuration
├── workflows/        # Process documentation
├── architecture/     # Design documents
├── validation/       # Validation specs
├── configuration/    # Config references
├── guides/           # How-to guides
└── testing/          # QA documentation
```

#### `src/` - Frontend Dashboard
React/Vite dashboard for course visualization and management.

#### `api/` - Backend Services
Express API for course data access and validation.

#### `services/` - Background Services
Orchestration, automation, and processing services.

#### `public/vfs/courses/` - Course Data
Language course data organized by language pair (e.g., `spa_for_eng/`).

---

## 🚫 CRITICAL: What NOT to Do

### **Never Create These in Root:**
- ❌ Markdown files (use `docs/`)
- ❌ Python scripts (use `scripts/` or `tools/`)
- ❌ JavaScript files (except configs - use `scripts/` or `tools/`)
- ❌ JSON reports (use `archive/` or temp dirs)
- ❌ Log files (already gitignored)
- ❌ Test files (use `scripts/experiments/` or `tests/`)

### **Never Commit These:**
- ❌ `scripts/` contents (workspace is gitignored)
- ❌ `.project/` (project management - local only)
- ❌ `archive/` (historical data)
- ❌ `docs/sessions/` (ephemeral agent communications)
- ❌ Agent-generated batch processors
- ❌ Large log files
- ❌ Temporary analysis files

### **Always Check .gitignore Before Creating Files!**
If you're generating files, verify they're in gitignored directories.

---

## 🧬 APML Specification

**Location**: `ssi-course-production.apml` (root) and `apml/` directory

APML is our custom format for language learning content. Key concepts:

### **Phase Outputs**
- **Phase 1**: `seed_pairs.json` - Core translations (~500KB)
- **Phase 3**: `lego_pairs.json` - Deconstructed components (~2MB)
- **Phase 5**: `lego_baskets.json` - Practice baskets (~5MB)
- **Phase 6**: `introductions.json` - Presentation content (~500KB)

### **LEGO Components**
Language is broken into reusable "LEGO" pieces:
- **FD** (Fundamental Dependencies): Core building blocks
- **LUT** (Look-Up Tables): Higher-order patterns
- **Recombination**: LEGOs combine to form new phrases

### **Validation Gates**
Every phase has quality gates:
- Grammar validation
- Infinitive form checks
- FD/LUT collision detection
- Coverage analysis

**📖 For deep dive**: See `docs/architecture/` and `apml/` directory.

---

## 🔧 Essential Tools

### **For Course Processing**

**Orchestrators** (`tools/orchestrators/`)
```bash
# Main automation server (coordinates multi-agent work)
node tools/orchestrators/automation_server.cjs

# Workflow orchestration
node tools/orchestrators/orchestrator-workflow.cjs
```

**Validators** (`tools/validators/`)
```bash
# Validate entire course
node tools/validators/course-validator.cjs spa_for_eng

# Deep phase-specific validation
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5
```

**Generators** (`tools/generators/`)
```bash
# Generate course manifest
node tools/generators/generate-course-manifest.js

# Merge phase5 outputs
node tools/generators/phase5-merge-batches.cjs
```

**Sync** (`tools/sync/`)
```bash
# Sync course to S3
node tools/sync/sync-course-to-s3.cjs spa_for_eng

# Pull from S3
node tools/sync/sync-course-from-s3.cjs spa_for_eng
```

### **For Development**

**Frontend Dashboard**
```bash
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Build for production
```

**Backend API**
```bash
npm run api          # Start Express API (port 3000)
```

---

## 📝 File Naming Conventions

### **Phase-Specific Scripts** (gitignored - goes in `scripts/batch-temp/`)
```
phase5_process_s0121_s0130.py    # Batch-specific processor
generate_agent_04_phrases.py     # Agent-specific generator
refine_phase5_cmn_s0521.cjs      # One-off refinement
```

### **Stable Tools** (committed - goes in `tools/`)
```
course-validator.cjs             # Reusable validator
phase5-merge-batches.cjs         # Standard merger
automation_server.cjs            # Core orchestrator
```

### **Documentation** (goes in `docs/`)
```
docs/setup/AUTOMATION_SETUP.md   # Setup guide
docs/workflows/PHASE5_WORKFLOW.md # Process doc
```

---

## 🔄 Common Workflows

### **1. Processing a New Batch (Phase 5)**

```bash
# 1. Prepare scaffolds
node tools/phase-prep/phase5_prep_scaffolds.cjs spa_for_eng S0121-S0130

# 2. Generate baskets (agent does this in scripts/batch-temp/)
python scripts/batch-temp/phase5_process_s0121_s0130.py

# 3. Validate output
node tools/validators/phase-deep-validator.cjs spa_for_eng phase5 S0121-S0130

# 4. Merge if valid
node tools/generators/phase5-merge-batches.cjs spa_for_eng S0121-S0130
```

### **2. Fixing Validation Errors**

```bash
# 1. Run validator to identify issues
node tools/validators/course-validator.cjs spa_for_eng > validation_report.json

# 2. Create fix script in scripts/fixes/
# e.g., scripts/fixes/fix_infinitive_s0121.cjs

# 3. Run fix
node scripts/fixes/fix_infinitive_s0121.cjs

# 4. Re-validate
node tools/validators/course-validator.cjs spa_for_eng
```

### **3. Multi-Agent Orchestration**

```bash
# Start automation server
node tools/orchestrators/automation_server.cjs

# Server watches for git pushes and coordinates agents
# Agents work in isolated branches (agent-01, agent-02, etc.)
# Server merges completed work automatically
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
git log --oneline -- tools/
git log --oneline -- docs/

# See full details of recent cleanup/reorganization
git log --grep="cleanup\|cleanup\|reorganize" -5
```

**Why this matters:**
- Understand recent refactoring/cleanup work
- See what directories were reorganized
- Learn from commit messages what NOT to do
- Discover new tools or conventions

### **Common Recent Changes to Know About**

Check commits for patterns like:
- "Major cleanup" - Repository reorganization
- "Remove from git tracking" - Files moved to .gitignore
- "Add tools/" - New shared utilities
- "Archive" - Historical data management

### **Before Creating Files:**

```bash
# Check if similar files exist
git log --all --full-history -- "**/filename*"

# See if directory was recently gitignored
git log --oneline -- .gitignore | head -5

# Check recent activity in target directory
git log --oneline -5 -- path/to/directory/
```

---

## 🤝 Working with Kai (Collaborator)

Kai uses the `tools/` directory for stable utilities. When you create a reusable script:

1. **Test it thoroughly** in `scripts/experiments/`
2. **Document it** with comments and usage examples
3. **Move to `tools/`** in the appropriate subdirectory
4. **Update `tools/README.md`** with usage instructions
5. **Commit to git** so Kai can access it

---

## 🏗️ Architecture Principles

### **1. Idempotency**
All phase processors must be idempotent - running twice produces the same result.

### **2. Validation First**
Never merge invalid data. Always run validators before merging.

### **3. Preserve Pipeline State**
Keep phase outputs (seed_pairs.json, lego_pairs.json, etc.) - they're checkpoints.

### **4. Branch Isolation**
Agent work happens in branches. Main branch only gets validated, merged work.

### **5. Metadata Stripping**
Debug metadata stays local (gitignored). Only production data goes to git.

---

## 🐛 Troubleshooting

### **"Scripts not found"**
- Check if script is in `tools/` (shared) or `scripts/` (local)
- Run `npm install` to ensure dependencies are installed

### **"Validation failed"**
- Check `logs/` directory for detailed error logs
- Run phase-specific validator for detailed output
- Common issues: infinitive forms, FD/LUT collisions, missing LEGO coverage

### **"Git showing too many changes"**
- You created files in wrong directories
- Check `.gitignore` is up to date
- Use `git status --ignored` to see what's being ignored

### **"Agent coordination issues"**
- Check automation server logs: `logs/automation-server-*.log`
- Verify branch naming: `agent-XX` format
- Ensure clean merges - resolve conflicts locally first

---

## 📚 Key Documents to Read

1. **SYSTEM.md** - High-level system architecture
2. **README.md** - Project setup and overview
3. **docs/workflows/** - Process documentation
4. **ssi-course-production.apml** - APML format spec
5. **tools/README.md** - Tool usage reference

---

## 🎓 Learning the Codebase

### **Day 1: Understand the Pipeline**
- Read `SYSTEM.md`
- Examine one course: `public/vfs/courses/spa_for_eng/`
- Look at phase outputs: `seed_pairs.json`, `lego_pairs.json`, `lego_baskets.json`

### **Day 2: Run a Validation**
- Run `node tools/validators/course-validator.cjs spa_for_eng`
- Understand validation output
- Explore validator code

### **Day 3: Process a Small Batch**
- Pick 10 seeds (e.g., S0001-S0010)
- Generate phase 5 baskets
- Validate and merge

### **Week 1: Multi-Agent Coordination**
- Understand orchestration patterns
- Review `tools/orchestrators/automation_server.cjs`
- Coordinate with other agents via branches

---

## ✅ Pre-Flight Checklist

Before starting work, verify:

- [ ] I've read `CLAUDE.md`, `SYSTEM.md`, and `README.md`
- [ ] **I've checked recent commits** (`git log --oneline -10`)
- [ ] **I understand what changed recently** (cleanup? new tools?)
- [ ] I understand the phase pipeline (1 → 3 → 5 → 6 → 7)
- [ ] I know where to create files (NOT in root!)
- [ ] I've checked `.gitignore` for file placement
- [ ] I have access to `tools/` for shared utilities
- [ ] I understand validation gates and quality standards
- [ ] I won't commit experimental scripts to git
- [ ] I'll document any new tools I create

---

## 🆘 When in Doubt

1. **Check recent commits** (`git log --oneline -10`) - See what changed!
2. **Check this file** (CLAUDE.md) - Your guide to the repo
3. **Read the relevant docs** in `docs/` - Detailed specs
4. **Look at existing examples** in `tools/` - Learn from working code
5. **Check .gitignore** - Before creating files
6. **Ask before creating root files!** - Keep it clean
7. **Validate before merging!** - Quality gates exist for a reason

---

## 🎯 Success Criteria

You're doing well if:

✅ Root directory stays clean (only essential configs)
✅ Your scripts are in appropriate directories
✅ You're using tools from `tools/` directory
✅ Validation passes before merging
✅ Git only tracks essential files
✅ Kai can use your shared tools easily

---

**Welcome to the team! Keep the mojo alive, keep the repo clean. 🚀**

*Last updated: 2025-11-17*
