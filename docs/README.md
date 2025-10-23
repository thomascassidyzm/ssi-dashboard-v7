# SSi Dashboard v7 Documentation

**Version**: 7.7.1
**Last Updated**: 2025-10-23

---

## Quick Start

- **Dashboard URL**: https://ssi-dashboard-v7.vercel.app
- **API URL** (dev): http://localhost:3456
- **Architecture**: Cloud-native (Dashboard + S3)

---

## Core Documentation

### 🏗️ Architecture

**[Cloud-Native Dashboard Architecture](CLOUD_NATIVE_DASHBOARD_ARCHITECTURE.md)**
- Dashboard + S3 as SSoT (no local files)
- VFS API endpoints for all file operations
- Multi-user, scalable, distributed architecture
- Migration path from local files to cloud

### 🧠 Phase Intelligence

**[Phase Intelligence Modules](phase_intelligence/README.md)**
- Modular methodology documents for each course generation phase
- 8 phases fully documented (Phase 1 through Phase 8)
- Static file serving via dashboard (`GET /phase-intelligence/:phase`)
- Version control per phase

### 📋 Phase Specifications

**For Kai**: [Phase 8 Audio Generation Spec](PHASE_8_SPEC_FOR_KAI.md)
- ElevenLabs TTS integration
- S3 audio upload
- Dashboard UI for triggering generation
- Parallel work on `feature/phase8-audio-generation` branch

---

## Phase Intelligence Modules

All located in `docs/phase_intelligence/`:

| Phase | Output File | Status | Version | Description |
|-------|-------------|--------|---------|-------------|
| 1 | `seed_pairs.json` | ✅ Active | 1.0 | Pedagogical translation |
| 2 | `corpus_intelligence.json` | ✅ Active | 1.0 | FCFS semantic priority |
| 3 | `lego_pairs.json` | ✅ Active | 2.0 | LEGO extraction & componentisation |
| 3.5 | `lego_graph.json` | ✅ Active | 1.0 | Adjacency graph construction |
| 5 | `lego_baskets.json` | ✅ Active | 1.0 | E-phrase & D-phrase generation |
| 5.5 | `lego_baskets_deduplicated.json` | ✅ Active | 1.0 | Duplicate LEGO removal |
| 6 | `introductions.json` | 🔄 Creating | 1.0 | Natural language presentations |
| 7 | `course_manifest.json` | 🔄 Creating | 1.0 | Legacy app manifest compilation |
| 8 | `audio/*.mp3` (S3) | 🔧 Kai | 1.0 | TTS audio generation & S3 upload |

---

## System Architecture

### Current State (v7.7.1)
- **Intelligence**: Static markdown files served from `docs/phase_intelligence/`
- **Course Data**: Local VFS (`vfs/courses/`) with manual S3 sync
- **Dashboard**: Vue.js frontend (Vercel) + Express backend (local/Railway)

### Target State (Cloud-Native)
- **Intelligence**: Static markdown files (unchanged)
- **Course Data**: S3 storage with REST API proxy
- **Dashboard**: Vue.js frontend + VFS API backend (all cloud)

**See**: [CLOUD_NATIVE_DASHBOARD_ARCHITECTURE.md](CLOUD_NATIVE_DASHBOARD_ARCHITECTURE.md) for full details.

---

## API Endpoints

### Phase Intelligence (Active)
```
GET /phase-intelligence/:phase
```
Returns markdown methodology for specified phase.

Example: `GET /phase-intelligence/3` → `phase_3_lego_pairs.md`

### VFS API (Planned - Cloud-Native)
```
GET /api/vfs/courses                          # List all courses
GET /api/vfs/courses/:code/:file              # Read course file
PUT /api/vfs/courses/:code/:file              # Write course file
DELETE /api/vfs/courses/:code/:file           # Delete course file
GET /api/vfs/courses/:code/audio/:uuid        # Read audio file
```

All backed by S3 storage.

---

## Development Workflow

### Phase Intelligence Updates

1. **Edit module**: `vim docs/phase_intelligence/phase_X_[output_file].md`
2. **Bump version**: Update version number in module header
3. **Commit**: `git commit -m "Phase X v2.0: Added new heuristic"`
4. **Restart server**: `pm2 restart automation-server`
5. **Done**: Next agent run gets updated methodology

### Course Generation

1. **Trigger from dashboard**: Select course → Click "Generate Phase X"
2. **Agent fetches intelligence**: `GET /phase-intelligence/X`
3. **Agent processes**: Applies methodology to generate output
4. **Agent writes output**: Currently local VFS, moving to S3 API
5. **View results**: Dashboard shows generated files

---

## File Naming Convention

### Phase Intelligence Modules
**Pattern**: `phase_[N]_[OUTPUT_FILE].md`

- `phase_1_seed_pairs.md` → generates `seed_pairs.json`
- `phase_3_lego_pairs.md` → generates `lego_pairs.json`
- `phase_5_lego_baskets.md` → generates `lego_baskets.json`

**Benefit**: Instant clarity - module name = output file name

### Course Data Files
**Location**: `vfs/courses/{course_code}/` (local) → S3 bucket (cloud)

- `seed_pairs.json` - Phase 1 output
- `corpus_intelligence.json` - Phase 2 output
- `lego_pairs.json` - Phase 3 output
- `lego_graph.json` - Phase 3.5 output
- `lego_baskets.json` - Phase 5 output
- `lego_baskets_deduplicated.json` - Phase 5.5 output
- `introductions.json` - Phase 6 output
- `course_manifest.json` - Phase 7 output
- `audio/{UUID}.mp3` - Phase 8 output

---

## Environment Setup

### Backend (automation_server.cjs)
```bash
# Phase Intelligence (active)
PORT=3456

# AWS (for cloud-native VFS, planned)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=ssi-courses

# ElevenLabs (Phase 8, Kai)
ELEVENLABS_API_KEY=your_key

# API Authentication (planned)
VFS_API_KEY=your_api_key
```

### Frontend (Dashboard)
```bash
# Development
VITE_API_URL=http://localhost:3456

# Production
VITE_API_URL=https://api.ssi-dashboard.com
```

---

## Parallel Work

### Main Branch (You)
- ✅ Phase intelligence migration (Phases 1, 2, 3, 3.5, 5, 5.5)
- ✅ Cloud-native architecture documentation
- 🔄 VFS API endpoint implementation (next)

### Parallel Agent
- 🔄 Phase 6 intelligence module (introductions)
- 🔄 Phase 7 intelligence module (compilation)

### Kai (Feature Branch)
- 🔄 Phase 8 audio generation implementation
- 🔄 ElevenLabs TTS integration
- 🔄 S3 audio upload

**Branch**: `feature/phase8-audio-generation`

**Minimal conflicts**: Each workstream touches different files.

---

## Testing

### Phase Intelligence
```bash
# Test serving phase 3 intelligence
curl http://localhost:3456/phase-intelligence/3

# Should return phase_3_lego_pairs.md content
```

### VFS API (When Implemented)
```bash
# List courses
curl http://localhost:3456/api/vfs/courses

# Read seed pairs
curl http://localhost:3456/api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json

# Write seed pairs
curl -X PUT http://localhost:3456/api/vfs/courses/ita_for_eng_668seeds/seed_pairs.json \
  -H "Content-Type: application/json" \
  -d @seed_pairs.json
```

---

## Migration Status

### Intelligence Migration
**Completed**: 6 of 8 phases (75%)
- ✅ Phase 1 - Translation
- ✅ Phase 2 - Corpus
- ✅ Phase 3 - LEGO Extraction
- ✅ Phase 3.5 - Graph
- ✅ Phase 5 - Baskets
- ✅ Phase 5.5 - Deduplication
- 🔄 Phase 6 - Introductions (parallel agent)
- 🔄 Phase 7 - Compilation (parallel agent)
- ✅ Phase 8 - Audio (documented, Kai implementing)

### Cloud-Native Architecture
**Status**: Documented, ready for implementation
- ✅ Architecture design complete
- ✅ API endpoints specified
- 🔄 Backend implementation (next)
- 🔄 Frontend VFS client (next)

---

## Key Principles

### 1. Dashboard is Everything
> "I wanted the dashboard to be everything to the extent that I didn't want any local read or write shenanigans, I wanted it all to be done in dashboard memory as a virtual file system and then saved and synced with the AWS system"
> — Tom

### 2. Simple is Better
- Markdown files (easy to edit, view, commit)
- Static file serving (30 lines vs 200+ line API)
- REST APIs (standard, stateless, scalable)

### 3. Intelligence is Vital
> "you cannot skimp on the phase intelligence - it's vital"
> — Tom

Every detail matters. Full extraction, no summaries.

### 4. Naming Consistency
Module names match output files for instant schema alignment.

### 5. Version Everything
Each module tracks its own evolution independently.

---

## Links

- **Dashboard**: https://ssi-dashboard-v7.vercel.app
- **Phase Intelligence UI**: https://ssi-dashboard-v7.vercel.app/intelligence
- **GitHub Issues**: https://github.com/tomcassidy/ssi-dashboard-v7/issues
- **APML Registry**: `.apml-registry.json` (legacy, being migrated)

---

## Next Steps

1. **Implement VFS API endpoints** (backend)
2. **Create VFS client wrapper** (frontend)
3. **Migrate test course to S3** (proof of concept)
4. **Test cloud-native workflow** (end-to-end)
5. **Merge Kai's Phase 8 work** (audio generation)
6. **Full migration to cloud-native** (all courses)

---

**Remember**: Dashboard + S3 = SSoT. No local files. Claude Code just executes.
