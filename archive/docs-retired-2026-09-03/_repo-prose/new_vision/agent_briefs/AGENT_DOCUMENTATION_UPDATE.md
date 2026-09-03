# Agent: Documentation Update

## Mission

Update all documentation to reflect the new Supabase-based audio pipeline architecture. This includes in-repo docs, the dashboard UI help/about sections, and any architecture diagrams.

**Branch:** `feature/documentation-update`

---

## Context: What Changed

### Old Architecture (Deprecated)
```
Phase 7 (Manifest) → Phase 8 (Audio) → MAR (JSON files)
```
- Manifest compiled first with UUIDs
- Audio generated after manifest
- MAR was JSON file-based (`audio_index.json`)
- Vulnerable to data loss, no proper database

### New Architecture (Current)
```
lego_baskets.json → Phase 8 (Audio Gen) → Supabase + S3 → Phase 9 (Manifest)
```
- Audio generated directly from baskets
- Supabase is source of truth for audio samples
- Manifest compiled last by looking up UUIDs from Supabase
- Proper database with RLS, realtime, audit trails

---

## Files to Update

### 1. Root Documentation

#### `README.md`
- Update architecture overview
- Add Supabase as a dependency
- Update setup instructions with Supabase config

#### `SYSTEM.md`
- Update system architecture diagram
- Document new Phase 8 and Phase 9 flow
- Add Supabase integration section

#### `CLAUDE.md`
- Update phase server list (add Phase 8 & 9)
- Update port assignments table
- Add Supabase environment variables

### 2. Architecture Documentation

#### `docs/architecture/` or `new_vision/`

Look for and update:
- `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md`
- `PRODUCTION_SUITE_SUMMARY.md`
- `PRODUCTION_SUITE_INDEX.md`
- Any pipeline flow diagrams

### 3. Dashboard UI Documentation

#### Find and update any in-app help:
- About page/modal
- Help tooltips
- Feature documentation in UI

### 4. Workflow Documentation

#### `docs/workflows/AUDIO_GENERATION_WORKFLOW.md`
- Complete rewrite needed
- Document new Phase 8 flow
- Document Phase 9 manifest compilation
- Update API endpoints

---

## New Architecture Details

### Port Assignments (Updated)

| Port | Service | Description |
|------|---------|-------------|
| 3456 | Orchestrator | Main coordinator |
| 3457 | Phase 1 | Translation |
| 3458 | Phase 1 | LEGO Extraction |
| 3459 | Phase 3 | Basket Generation |
| 3464 | Manifest (Legacy) | Old manifest compilation |
| 3465 | **Phase 8** | Audio Generator (NEW - Supabase) |
| 3466 | **Phase 9** | Manifest Compiler (NEW - Supabase) |
| 3470 | Production API | QA workflow + WebSocket |

### Environment Variables (New)

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx
```

### New Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COURSE PRODUCTION PIPELINE                    │
└─────────────────────────────────────────────────────────────────┘

Phase 1-3: Content Generation (unchanged)
─────────────────────────────────────────
seeds.json → Phase 1 (Translation) → Phase 3 (Baskets) → lego_baskets.json

Phase 8: Audio Generation (NEW)
───────────────────────────────
lego_baskets.json
       ↓
┌──────────────────────────────────────┐
│  For each unique (text, lang, role): │
│    1. UUID = hash(voice|text|lang|role|cadence)
│    2. Check Supabase - exists? SKIP  │
│    3. Generate TTS (Azure/ElevenLabs)│
│    4. Upload to S3                   │
│    5. Insert into Supabase           │
└──────────────────────────────────────┘
       ↓
     Supabase audio_samples table

Phase 9: Manifest Compilation (NEW)
───────────────────────────────────
Supabase audio_samples
       ↓
┌──────────────────────────────────────┐
│  For each sample needed:             │
│    1. Query Supabase by text+role    │
│    2. Get UUID                       │
│    3. Build manifest entry           │
│                                      │
│  Validation: 100% audio coverage     │
│    YES → write course_manifest.json  │
│    NO  → fail with missing list      │
└──────────────────────────────────────┘
       ↓
   course_manifest.json
```

### Supabase Schema Overview

```
Tables:
├── voices              # TTS and human voice registry
├── audio_samples       # Master audio registry (MAR)
├── course_audio_usage  # Which courses use which audio
├── sample_flags        # QA workflow state
├── recording_provenance # Human recording metadata
└── courses             # Course configuration
```

### Key API Endpoints

#### Phase 8 Audio Generator (port 3465)
```
POST /generate          # Start audio generation
GET  /status/:courseCode # Check job status
GET  /health            # Health check
```

#### Phase 9 Manifest Compiler (port 3466)
```
POST /compile           # Compile manifest from Supabase
GET  /validate/:courseCode # Validate audio coverage
GET  /health            # Health check
```

---

## Documentation Style Guide

1. **Be concise** - Developers should find info quickly
2. **Include examples** - Show actual API calls, not just descriptions
3. **Update diagrams** - ASCII diagrams are fine, keep them current
4. **Mark deprecated** - Don't delete old docs, mark as deprecated with pointer to new
5. **Version numbers** - Note this is APML v10.2 / Pipeline v2.0

---

## Search Patterns

Find files that may need updates:

```bash
# Find markdown files
find . -name "*.md" -not -path "./node_modules/*"

# Find references to old MAR
grep -r "audio_index" --include="*.md"
grep -r "MAR" --include="*.md"

# Find references to Phase 7/8
grep -r "Phase 7" --include="*.md"
grep -r "Phase 8" --include="*.md"

# Find port references
grep -r "3464\|3465" --include="*.md"
```

---

## Dashboard UI Updates

If there are any UI components showing architecture or help:

1. **Architecture diagrams** - Update to show Supabase
2. **API documentation** - Update endpoint references
3. **Setup guides** - Add Supabase configuration steps
4. **About/Help modals** - Update feature descriptions

Look in:
- `src/components/` for help/about components
- `src/views/` for documentation pages
- `public/` for static documentation

---

## Deliverables

1. Updated `README.md` with new architecture
2. Updated `SYSTEM.md` with pipeline changes
3. Updated `CLAUDE.md` with new ports/env vars
4. Updated or new `docs/workflows/AUDIO_GENERATION_WORKFLOW.md`
5. Updated architecture docs in `new_vision/`
6. Any dashboard UI help content updated

---

## Branch & PR

1. Create branch: `feature/documentation-update`
2. Make all documentation changes
3. Commit with clear message about what was updated
4. Create PR to main

---

## Success Criteria

- [ ] All references to old MAR/audio_index updated
- [ ] New Phase 8/9 documented with endpoints
- [ ] Supabase setup instructions added
- [ ] Port table updated everywhere
- [ ] Pipeline diagrams show new flow
- [ ] No broken links or outdated references
