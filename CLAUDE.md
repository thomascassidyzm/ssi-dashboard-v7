# CLAUDE.md - Agent Onboarding Guide

> **Welcome, future agent!** This document contains everything you need to work effectively on the SSi Dashboard v7 project without creating chaos.

## ⚠️ CRITICAL RULES

### **READ THE SCHEMA BEFORE MODIFYING DATABASE CODE**

Before writing any code that touches the database, you MUST read:
- `apml/core/audio-registry-v13.apml` - The canonical database schema (v13)

**v13 Key Tables (January 2026):**
- `courses` - Course metadata with `voice_config` JSONB
- `course_audio` - Audio owned by courses (flat, no joins)
- `shared_audio` - Encouragements/instructions only

**v13 Principles:**
- Course owns its audio directly (no texts/audio_files indirection)
- S3 is flat: `{uuid}.mp3` - all metadata in Supabase
- Roles: `known`, `target1`, `target2`, `presentation`
- Origin: `tts` (regenerable) or `human` (precious)

⚠️ **DEPRECATED TABLES - DO NOT USE:**
- `audio_samples` - Legacy, 145k duplicated records
- `texts` - v12, removed in v13
- `audio_files` - v12, removed in v13

### **CHECK EXISTING ARCHITECTURE BEFORE CODING**

Before writing new code or adding new services, ALWAYS check what already exists:

1. **Read the APML specs** in `apml/` directory - they define how services work
2. **Check existing services** - the orchestrator (port 3456) already proxies many routes
3. **Read CLAUDE.md and SYSTEM.md** - architecture is documented
4. **Test existing endpoints** before assuming they don't exist

**Why:** Avoid adding unnecessary complexity. Example: The orchestrator already proxies `/api/production/*` to the production API - no need for a separate proxy layer.

**Pattern:**
```
1. Understand existing architecture (read docs, test endpoints)
2. Only then decide if new code is needed
3. Simplest solution wins
```

### **Agent Autonomy Principle**

Solve problems autonomously and proceed to the next workflow step without human input **when**:
- Documentation clearly defines what to do
- Decisions won't incur unexpected costs (TTS API calls, cloud storage)
- Actions are reversible or non-destructive

**Require explicit user approval for:**
- TTS audio generation (costs money)
- Deleting generated assets (irreversible)
- Any action with cost or data-loss implications

### **NEVER Generate TTS Audio Without Approval**

**❌ NEVER:**
- Run `--execute` without showing `--plan` first and getting user approval
- Auto-regenerate samples without user consent
- Launch audio generation in the background

**✅ ALWAYS:**
- Show the plan with cost estimates first
- Wait for explicit "approved" / "proceed" / "yes" from user
- Let preflight auto-fix issues, but pause at the plan for approval

### **NEVER Delete Generated Assets Without Approval**

**❌ NEVER run cleanup commands on:**
- `temp/audio/` - Generated audio files (costly TTS API calls)
- `temp/video/` - Generated video files
- Any directory with generated MP3s, MP4s, or media files
- MAR databases with sample data

**✅ ALWAYS present a deletion plan including:**
- What will be deleted (file count, size, location)
- Backup situation (what's backed up, what isn't)
- Alternative options (archive vs delete, selective cleanup)
- Consequences (what would need to be regenerated, at what cost)

**Why:** Generated audio/video represents significant API costs (Azure TTS, ElevenLabs) and generation time. Deleting 1000+ files without permission wastes hours of work and money.

---

## 🌐 ECOSYSTEM CONTEXT (December 2025)

This dashboard (Popty) is the **content creation** half of the SSi system. The other half is the **learning app** that delivers content to learners.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SSi ECOSYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  THIS REPO (Popty)                       ssi-learning-app               │
│  ═══════════════════                     ═══════════════════            │
│  Content CREATION                         Content DELIVERY               │
│  • Phase 1-3: Translation, LEGOs         • @ssi/core: Engine            │
│  • Phase 8: Audio generation (TTS)       • player-vue: Demo UI          │
│  • Phase 9: Manifest compilation         • apps/web: PWA (TODO)         │
│  • Production API: QA, recording         • apps/schools-dashboard       │
│  • Database-first writes ✅               • Database-first reads (TODO)  │
│                                                                          │
│  Dashboard → Supabase/S3 → Learning App → Learner                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TRANSITION STATE

We are migrating from **manifest-first** to **database-first** architecture:

| Aspect | Old (Manifest-first) | New (Database-first) |
|--------|---------------------|---------------------|
| Phase outputs | JSON files only | Supabase + JSON (dual-write) |
| Manifest compilation | Read JSON files | Query Supabase |
| Content updates | Recompile + rebuild app | Hot-swap in database |
| Learning app | Load manifest.json | Query Supabase directly |

**Current Status (Dec 2025):**
- ✅ Phase 1-3 services write to Supabase (dual-write with JSON)
- ✅ `course-data-service.cjs` provides unified database operations
- ✅ Manifest generator queries Supabase for audio UUIDs
- 🔄 Learning app still uses manifest (Supabase integration pending)
- 📋 PWA with cache-as-you-go planned for community courses

### Backwards Compatibility Strategy

1. **Dual-write**: All phase outputs go to BOTH Supabase AND JSON files
2. **DB-first reads**: New code reads from Supabase, falls back to JSON
3. **Manifest still generated**: Legacy native app requires it
4. **Feature flags**: `USE_DATABASE_WRITES`, `USE_DATABASE_READS` in `.env`

---

## 🎯 Project Overview

**SSi Dashboard v7 Clean** is a language learning pipeline that generates and manages course content through multiple processing phases. You're working on a system that transforms seed phrases into complete language courses with LEGO-based recombination for maximum learning efficiency.

### Quick Facts
- **Primary Language**: Spanish for English speakers (spa_for_eng)
- **Pipeline**: Phase 1 → Phase 2 → Phase 3 → Audio Generation → Manifest Compilation (APML v11.0)
- **Data Format**: APML (Adaptive Pedagogy Markup Language)
- **Scale**: 668 seeds per course, thousands of LEGO components
- **Architecture**: Multi-agent orchestration with validation gates
- **Storage**: S3 for files (ssi-audio-stage, eu-west-1), **Supabase for audio registry**
- **Audio Key**: `voiceId:lang:role:cadence:text` → UUID v5 (RFC 4122) - see `services/uuid-v11.cjs`
- **Flow**: Audio-first (generate audio BEFORE manifest compilation)
- **Orchestrator**: Port 3456

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
```
services/
├── orchestration/       # Multi-agent coordination (Port 3456)
├── phases/             # Phase servers (APML v11.0)
│   ├── phase1-translation/       # Port 3457: Translation + LEGO Extraction
│   ├── phase1-lego-extraction/   # Port 3458: Conflict Resolution (Phase 2)
│   ├── phase3-basket-generation/ # Port 3459: Basket Generation (Phase 3)
│   ├── manifest-compilation/     # Port 3464: Legacy Manifest (deprecated)
│   ├── phase8-audio-supabase.cjs # Port 3465: Audio Generation (Supabase)
│   └── phase9-manifest-supabase.cjs # Port 3466: Manifest Compilation (Supabase)
├── supabase-client.cjs  # Shared Supabase client configuration
└── web/                # Web services
```

**Phase 8 Audio Generation** (`services/phases/phase8-audio-generator.cjs`)
- Port: 3465
- Reads `lego_baskets.json` directly (not manifest)
- Generates TTS audio (Azure/ElevenLabs)
- Stores audio files in S3, records in Supabase `audio_samples` table
- Deduplicates audio across courses

**Phase 9 Manifest Compilation** (`services/phases/phase9-manifest-compiler.cjs`)
- Port: 3466
- Queries Supabase for audio UUIDs by text+role
- Validates 100% audio coverage
- Outputs final `course_manifest.json`

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

### **Phase Outputs (APML v11.0)**
- **Phase 1 (Translation + LEGO Extraction)**: `draft_lego_pairs.json` - Translated seeds with LEGOs (may have conflicts)
- **Phase 2 (Conflict Resolution)**: `lego_pairs.json` - Conflict-free LEGOs with `new: true/false` flags (SSoT)
- **Phase 3 (Basket Generation)**: `lego_baskets.json` - Practice baskets with LEGO Debut cycle
- **Audio Generation (Script)**: Supabase `audio_samples` table + S3 `mastered/{uuid}.mp3` (Audio-first!)
- **Manifest Compilation (Script)**: `course_manifest.json` - Compiled LAST, referencing existing audio UUIDs

### **v11 Key Changes**
- **Audio-first**: Generate audio BEFORE manifest (not after)
- **Manifest Pruning**: LEGOs with `new: false` don't get introduction_items (already introduced earlier)
- **Deterministic UUID**: `hash(voice_id|text|lang|role|cadence)` ensures same phrase = same UUID
- **Cadence Rules**: source=natural, target=slow

### **LEGO Types**
- **A-type (Atomic)**: Single words (e.g., "want" / "quiero")
- **M-type (Molecular)**: Multi-word phrases (e.g., "I want to" / "quiero")

### **Basket Cycle Sequence (v11.0)**
For M-type LEGOs, baskets follow this order:
1. **Components** (is_component: true) - Building blocks
2. **LEGO Debut** (is_debut: true) - The complete LEGO
3. **Practice sentences** - LEGO used in context

### **LEGO Components**
Language is broken into reusable "LEGO" pieces:
- **FD** (Fundamental Dependencies): Core building blocks
- **LUT** (Look-Up Tables): Higher-order patterns
- **Recombination**: LEGOs combine to form new phrases

### **Phase Servers**
A "Phase" = one server = one prompt = one agent job

| Port | Phase | Service | Endpoints |
|------|-------|---------|-----------|
| 3456 | - | Orchestrator | Multi-agent coordination |
| 3457 | 1 | Translation + LEGO Extraction | POST /translate, GET /status, GET /health |
| 3458 | 2 | Conflict Resolution | POST /resolve, GET /status, GET /health |
| 3459 | 3 | Basket Generation | POST /generate, GET /status, GET /health |
| 3464 | - | Legacy Manifest (deprecated) | - |
| **3465** | **8** | **Audio Generator** | **POST /generate, POST /plan, GET /status/:courseCode, DELETE /cancel/:courseCode, GET /health** |
| **3466** | **9** | **Manifest Compiler** | **POST /compile, GET /validate/:courseCode, GET /status/:courseCode, GET /health** |
| **3470** | **-** | **Production API** | **See detailed list above (QA + WebSocket)** |

### **Environment Variables**

```bash
# Supabase Configuration (required for Phase 8 & 9)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# TTS APIs
AZURE_SPEECH_KEY=xxxxx
AZURE_SPEECH_REGION=westeurope
ELEVENLABS_API_KEY=xxxxx

# S3 Configuration
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1
```

### **Service Mesh URLs**

Services discover each other via environment variables (auto-configured by `start-automation.cjs`):

- `ORCHESTRATOR_URL` - Main orchestrator (port 3456)
- `PHASE1_TRANSLATION_URL` - Translation service (port 3457)
- `PHASE1_LEGO_URL` - LEGO extraction (port 3458)
- `PHASE3_URL` - Basket generation (port 3459)
- `PHASE8_URL` - Audio generation (port 3465)
- `PHASE9_URL` - Manifest compilation (port 3466)
- `PRODUCTION_API_URL` - QA workflow API (port 3470)

**Default:** All services run on localhost. Override for ngrok tunnels or remote services.

**📖 For deep dive**: See `docs/setup/SERVICE_MESH.md`, `docs/architecture/`, `docs/PHASE_SERVER_ARCHITECTURE.md`, and `apml/` directory.

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
node tools/validators/phase-deep-validator.cjs spa_for_eng phase3
```

**Generators** (`tools/generators/`)
```bash
# Generate course manifest
node tools/generators/generate-course-manifest.js

# Merge phase3 outputs
node tools/generators/phase3-merge-batches.cjs
```

**Sync** (`tools/sync/`)
```bash
# Sync course to S3
node tools/sync/sync-course-to-s3.cjs spa_for_eng

# Pull from S3
node tools/sync/sync-course-from-s3.cjs spa_for_eng

# Publish to course-configs repo (author branch)
node tools/sync/publish-to-course-configs.cjs spa_for_eng --dry-run
node tools/sync/publish-to-course-configs.cjs spa_for_eng --commit
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
phase3_process_s0121_s0130.py    # Batch-specific processor
generate_agent_04_phrases.py     # Agent-specific generator
refine_phase3_cmn_s0521.cjs      # One-off refinement
```

### **Stable Tools** (committed - goes in `tools/`)
```
course-validator.cjs             # Reusable validator
phase3-merge-batches.cjs         # Standard merger
automation_server.cjs            # Core orchestrator
```

### **Documentation** (goes in `docs/`)
```
docs/setup/AUTOMATION_SETUP.md   # Setup guide
docs/workflows/PHASE3_WORKFLOW.md # Process doc
```

---

## 🔄 Common Workflows

### **1. Processing a New Batch (Phase 3 - Basket Generation)**

```bash
# 1. Prepare scaffolds
node tools/phase-prep/phase3_prep_scaffolds.cjs spa_for_eng S0121-S0130

# 2. Generate baskets (agent does this in scripts/batch-temp/)
python scripts/batch-temp/phase3_process_s0121_s0130.py

# 3. Validate output
node tools/validators/phase-deep-validator.cjs spa_for_eng phase3 S0121-S0130

# 4. Merge if valid
node tools/generators/phase3-merge-batches.cjs spa_for_eng S0121-S0130
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

### **4. Audio Generation (Supabase-backed)**

📖 **Read the workflow doc**: `docs/workflows/AUDIO_GENERATION_WORKFLOW.md`

The audio pipeline now uses Supabase as the Master Audio Registry (MAR):

**Phase 8: Audio Generation**
```bash
# Start audio generation service
node services/phases/phase8-audio-generator.cjs

# API Endpoints (port 3465):
POST   /generate                 # Start audio generation
POST   /plan                     # Show generation plan (dry-run)
GET    /status/:courseCode       # Check job status
DELETE /cancel/:courseCode       # Cancel active job
GET    /health                   # Health check
```

**Phase 9: Manifest Compilation**
```bash
# Start manifest compilation service
node services/phases/phase9-manifest-compiler.cjs

# API Endpoints (port 3466):
POST /compile               # Compile manifest from Supabase
GET  /validate/:courseCode  # Validate audio coverage
GET  /status/:courseCode    # Get manifest status
GET  /health                # Health check
```

**Production API: QA + WebSocket** (`services/production-api.cjs`)
```bash
# Start production API server
node services/production-api.cjs

# API Endpoints (port 3470):
GET  /api/production/health                              # Health check
GET  /api/production/:courseCode/manifest                # Get course manifest
GET  /api/production/:courseCode/flags                   # Get sample flags
POST /api/production/:courseCode/flags/update            # Update single flag
POST /api/production/:courseCode/flags/bulk-update       # Bulk update flags
GET  /api/production/:courseCode/audio-metadata          # Get audio metadata
GET  /api/production/:courseCode/audio/:uuid/url         # Get signed audio URL
GET  /api/production/:courseCode/audio/:uuid/exists      # Check audio exists
POST /api/production/:courseCode/recording/upload        # Upload human recording
POST /api/production/internal/emit                       # Internal WebSocket emit

# WebSocket endpoint:
/api/production/websocket    # Socket.IO for real-time updates
```

**Flow:**
1. Phase 8 reads `lego_baskets.json` and generates TTS audio
2. Audio files uploaded to S3, records inserted into Supabase
3. Phase 9 queries Supabase for UUIDs and compiles `course_manifest.json`

⚠️ **Remember**: Audio generation costs money (TTS API calls). Always require user approval.

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
Keep phase outputs (draft_lego_pairs.json, lego_pairs.json, lego_baskets.json, course_manifest.json) - they're checkpoints.

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
6. **new_vision/** - Future architecture plans:
   - `COURSE_CREATION_MASTER_OVERVIEW.md` - Full system overview
   - `LEARNING_APP_DATA_FLOW.md` - Database-first architecture
   - `LEGO_SESSION_SPECIFICATION.md` - Session structure & parameters
   - `VOICE_CONFIGURATION_SPEC.md` - Voice configuration UI spec

---

## 🎓 Learning the Codebase

### **Day 1: Understand the Pipeline**
- Read `SYSTEM.md`
- Examine one course: `public/vfs/courses/spa_for_eng/`
- Look at phase outputs: `draft_lego_pairs.json` (Phase 1), `lego_pairs.json` (Phase 2), `lego_baskets.json` (Phase 3)

### **Day 2: Run a Validation**
- Run `node tools/validators/course-validator.cjs spa_for_eng`
- Understand validation output
- Explore validator code

### **Day 3: Process a Small Batch**
- Pick 10 seeds (e.g., S0001-S0010)
- Generate Phase 3 baskets (lego_baskets.json)
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
- [ ] I understand the APML v11.0 pipeline (Phase 1 → Phase 2 → Phase 3 → Audio → Manifest)
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

---

## 🔗 Related Projects

| Project | Purpose | CLAUDE.md |
|---------|---------|-----------|
| **ssi-learning-app** | Content delivery (learner-facing) | Yes - see ecosystem overview |
| **ssi-learning-app/apps/web** | PWA for community courses (TODO) | Planned |
| **ssi-learning-app/apps/schools-dashboard** | Schools/classroom version | Planned |

---

*Last updated: 2025-12-13*
*APML: v11.0 | Pipeline: v2.0 (Supabase + Audio-first)*
*Status: TRANSITION - Manifest-first → Database-first*
