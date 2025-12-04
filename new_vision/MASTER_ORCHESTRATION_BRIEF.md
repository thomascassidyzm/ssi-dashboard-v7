# Master Orchestration Brief: SSi Course Production Suite

> **Purpose**: This document provides complete context for an orchestrating Claude Code agent to coordinate multiple master agents building the Course Production Suite.
> **Created**: 2024-12-04
> **Status**: Ready for execution

---

## Executive Summary

### What We're Building
A unified **Course Production Suite** that transforms 4 disconnected tools into an integrated pipeline:
- **Mission Control Dashboard** - Unified status overview
- **Script Viewer (QA Tool)** - Flag audio issues, filter views
- **Audio Pipeline** - Queue management, retry logic, QC gates
- **Recording Studio** - Volunteer recording with autocue
- **Samples Browser** - Review/approve audio samples

### Why It Matters
Currently there's no way to:
- Flag problematic TTS audio for regeneration
- Track QA decisions persistently
- Coordinate volunteer recordings
- See overall production status

### Key Innovation
`sample_flags.json` - A new S3 file that tracks status of every audio sample:
```json
{
  "samples": {
    "uuid-123": {
      "status": "flagged_regen_tts",
      "notes": "Pronunciation sounds unnatural",
      "flagged_by": "qa@ssi.org",
      "history": [...]
    }
  }
}
```

This closes the QA feedback loop: **Flag → Regenerate → Review → Approve**

---

## Project Context

### Repository
- **Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`
- **Stack**: Vue 3, Vite, Tailwind CSS, Express, S3 (AWS)
- **Key files**:
  - `CLAUDE.md` - Agent onboarding guide
  - `ssi-course-production.apml` - Main APML spec (156KB)
  - `services/orchestration/orchestrator.cjs` - Main API server (port 3456)

### Related Repository
- **Learning App**: `/Users/tomcassidy/SSi/ssi-learning-app/`
- Consumes course content from dashboard
- Has APML specs in `apml/` directory

### S3 Infrastructure
- **Bucket**: `popty-bach-lfs` (eu-west-1)
- **Audio**: `ssiborg-assets/mastered/{uuid}.mp3`
- **Course data**: `courses/{course_code}/`

### Existing Components to Enhance
- `src/views/CourseScriptView.vue` - Basic script viewer
- `src/views/AudioPipelineView.vue` - TTS generation UI
- `src/views/RecordingStudio.vue` - Proof-of-concept recorder

---

## Recently Completed Work (Phase 8 Fixes)

These fixes were just implemented and tested (32/32 tests passing):

### 1. UUID Service Hardening
**File**: `services/uuid-service.cjs`
- Added `generateAllFormatUUIDs()` - Returns all UUID format variants
- Added `lookupAudioByText()` - Multi-format lookup
- Added `toTwoLetterCode()` - Reverse language code lookup

### 2. S3 Index Cache Fix
**File**: `scripts/phase8-audio-generation.cjs`
- Changed `INDEX_MAX_AGE` from 24h to 5 minutes
- Added `invalidateS3Index()` function
- Auto-invalidates after uploads

### 3. Duration Extraction
**Files**: `scripts/phase8-audio-generation.cjs`, `services/mar-service.cjs`
- Added `extractDurationsForExistingFiles()`
- Added `updateSampleDuration()` and `batchUpdateSampleDurations()`

### 4. Voice Override Persistence
**File**: `services/phases/audio-server.cjs`
- Cache now stores `voiceOverrides` alongside plan
- Persists through plan → execute flow

### 5. APML v1.1 Transformer
**File**: `tools/generators/transform-to-v2-manifest.cjs`
- Transforms dashboard output to learning app format
- Includes audioRefs with S3 URLs and durations

### Test Suite
**File**: `scripts/tests/integration-test-phase8-fixes.cjs`
- Run: `node scripts/tests/integration-test-phase8-fixes.cjs`
- All 32 tests pass in 12ms

---

## Vision Documents (Already Written)

Located in `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/new_vision/`:

1. `autocue-recording-system.html` - Interactive prototype
2. `autocue-system-documentation.md` - Full spec
3. `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - System design
4. `course-production-suite-visual.html` - Visual diagrams
5. `PRODUCTION_SUITE_DIAGRAMS.md` - Architecture diagrams
6. `PRODUCTION_SUITE_IMPLEMENTATION_GUIDE.md` - Build guide
7. `PRODUCTION_SUITE_INDEX.md` - Document index
8. `PRODUCTION_SUITE_SUMMARY.md` - Executive summary
9. `QUICK_REFERENCE_CARD.md` - Cheat sheet

**These documents are comprehensive and should be read by each master agent.**

---

## Multi-Master Agent Architecture

### Structure
```
                         ┌─────────────────────┐
                         │   ORCHESTRATOR      │
                         │   (You/Claude Code) │
                         │   Reviews PRs       │
                         │   Merges branches   │
                         └──────────┬──────────┘
                                    │
       ┌────────────────┬───────────┼───────────┬────────────────┐
       │                │           │           │                │
       ▼                ▼           ▼           ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  MASTER 1   │  │  MASTER 2   │  │  MASTER 3   │  │  MASTER 4   │
│Infrastructure│  │ QA Workflow │  │Audio Tools │  │  Autocue    │
│ Branch:     │  │ Branch:     │  │ Branch:     │  │ Branch:     │
│ infra/      │  │ qa/         │  │ audio/      │  │ autocue/    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │               │                │
   Sub-agents       Sub-agents      Sub-agents       Sub-agents
```

### Branch Strategy
- Each master creates branch: `feature/production-suite-{area}`
- Sub-agents commit to master's branch
- Masters create PR to `main` when complete
- Orchestrator reviews and merges

---

## Master Agent Briefs

### Dependencies Between Masters
```
MASTER 1 (Infrastructure) ──► MASTER 2 (QA Workflow)
         │                            │
         │                            ▼
         └──────────────────► MASTER 3 (Audio Tools)
                                      │
                                      ▼
                              MASTER 4 (Autocue)
```

**Master 1 must complete first** - Others depend on:
- `sample_flags.json` schema
- Pinia store
- API endpoints
- WebSocket infrastructure

---

## MASTER AGENT 1: Infrastructure & Data Layer

### Branch: `feature/production-suite-infrastructure`

### Mission
Build the foundational data structures, state management, and API layer that all other components depend on.

### Deliverables

#### 1. sample_flags.json Schema & Service
**File**: `services/sample-flags-service.cjs`
```javascript
// Schema
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "updated_at": "ISO timestamp",
  "samples": {
    "uuid-123": {
      "status": "pending|flagged_regen_tts|flagged_human_needed|in_pipeline|tts_complete|needs_review|approved|rejected",
      "notes": "string",
      "flagged_by": "email",
      "flagged_at": "ISO timestamp",
      "voice_id": "azure_es-ES-AlvaroNeural",
      "history": [
        { "action": "flagged", "by": "email", "at": "timestamp", "reason": "string" }
      ]
    }
  },
  "summary": {
    "total": 12543,
    "pending": 8234,
    "flagged_regen_tts": 127,
    "approved": 3891,
    // ... other status counts
  }
}
```

**Functions needed**:
- `loadFlags(courseCode)` - Load from S3
- `saveFlags(courseCode, flags)` - Save to S3 (with locking)
- `updateSampleStatus(courseCode, uuid, status, notes, user)`
- `getSummary(courseCode)` - Get status counts
- `getFilteredSamples(courseCode, statusFilter)` - Query by status

#### 2. Pinia Store
**File**: `src/stores/production.js`

```javascript
// State
{
  courseCode: null,
  flags: null,           // sample_flags.json content
  manifest: null,        // course_manifest.json content
  audioMetadata: null,   // audio_metadata.json content
  loading: false,
  error: null,
  wsConnected: false
}

// Actions
- loadCourse(courseCode)
- updateSampleStatus(uuid, status, notes)
- refreshFlags()
- connectWebSocket()
```

#### 3. API Endpoints
**File**: `services/production-api.cjs` (new Express router)

```
GET  /api/production/:courseCode/flags
POST /api/production/:courseCode/flags/update
GET  /api/production/:courseCode/manifest
GET  /api/production/:courseCode/summary
POST /api/production/:courseCode/bulk-update
```

Mount in orchestrator.cjs at `/api/production`

#### 4. WebSocket Infrastructure
**File**: `services/websocket-service.cjs`

- Add Socket.io to orchestrator.cjs
- Broadcast events: `sample-updated`, `flags-changed`, `pipeline-progress`
- Client reconnection logic

#### 5. Install Dependencies
```bash
npm install pinia socket.io socket.io-client
```

### Sub-Agent Breakdown (Suggested)
- **Sub-agent 1a**: sample_flags.json schema + S3 service
- **Sub-agent 1b**: Pinia store implementation
- **Sub-agent 1c**: API endpoints + mount in orchestrator
- **Sub-agent 1d**: WebSocket server + client service

### Success Criteria
- [ ] `sample_flags.json` can be read/written to S3
- [ ] Pinia store loads and caches course data
- [ ] API endpoints respond correctly
- [ ] WebSocket broadcasts work
- [ ] Unit tests pass

### Estimated Time: 1-2 days with parallel sub-agents

---

## MASTER AGENT 2: QA Workflow Tools

### Branch: `feature/production-suite-qa`

### Dependencies
- Master 1 complete (needs Pinia store, API endpoints)

### Mission
Enhance the Script Viewer for QA workflow and build the Samples Browser for audio review.

### Deliverables

#### 1. Enhanced Script Viewer
**File**: `src/views/CourseScriptView.vue` (enhance existing)

**New features**:
- Status badges next to each sample (🟢 approved, 🟡 flagged, ⚪ pending)
- Right-click context menu:
  - 🚩 Flag for TTS Regeneration
  - 👥 Flag for Human Recording
  - ✏️ Add Note
  - ✅ Approve
- Filter dropdown: All | Flagged | Approved | Pending | Needs Review
- Keyboard shortcuts (F = flag, A = approve, N = next flagged)
- Deep linking: `?seed=S0042&uuid=xxx&filter=flagged`

#### 2. Flag Menu Component
**File**: `src/components/production/FlagMenu.vue`

- Reusable context menu for flagging
- Dropdown with flag reasons
- Notes input field
- Emits: `@flag`, `@approve`, `@reject`

#### 3. Samples Browser (NEW)
**File**: `src/views/SamplesBrowser.vue`

**Features**:
- Grid/list view toggle
- Filter by: status, seed, voice_id, text search
- Sort by: status, seed_id, flagged_at
- Inline audio playback (Howler.js)
- Compare mode: TTS vs Human side-by-side
- Bulk actions: Approve selected, Reject selected
- Pagination/virtual scroll for performance

#### 4. Status Badge Component
**File**: `src/components/production/StatusBadge.vue`

- Shows status with color coding
- Tooltip with details (flagged by, notes, etc.)

### Sub-Agent Breakdown (Suggested)
- **Sub-agent 2a**: Script Viewer enhancements (badges, filters, deep links)
- **Sub-agent 2b**: FlagMenu component + context menu integration
- **Sub-agent 2c**: Samples Browser (grid view, filtering, pagination)
- **Sub-agent 2d**: Audio playback + compare mode

### Success Criteria
- [ ] Can flag samples from Script Viewer
- [ ] Flags persist to S3 via API
- [ ] Filters work correctly
- [ ] Samples Browser displays all samples
- [ ] Compare mode works for samples with both TTS and human audio

### Estimated Time: 2-3 days with parallel sub-agents

---

## MASTER AGENT 3: Audio Production Tools

### Branch: `feature/production-suite-audio`

### Dependencies
- Master 1 complete (needs API, WebSocket)
- Can run in parallel with Master 2

### Mission
Enhance the Audio Pipeline for queue management and build the Mission Control Dashboard.

### Deliverables

#### 1. Enhanced Audio Pipeline
**File**: `src/views/AudioPipelineView.vue` (enhance existing)

**New features**:
- Read `sample_flags.json` to queue flagged samples
- "Regenerate Flagged" button - sends flagged_regen_tts to TTS
- Real-time progress via WebSocket (replace polling)
- Retry logic visualization (show retry count)
- "Send to Human Recording" for tts_failed samples
- Status updates: pending → in_pipeline → tts_complete

#### 2. Audio Server Integration
**File**: `services/phases/audio-server.cjs` (enhance existing)

**New features**:
- Read sample_flags.json before generation
- Skip samples with status "approved"
- Queue samples with status "flagged_regen_tts"
- Update status during generation
- After 3 failures: status → tts_failed → flagged_human_needed
- Broadcast WebSocket events on status change

#### 3. Mission Control Dashboard (NEW)
**File**: `src/views/MissionControl.vue`

**Features**:
- Course selector dropdown
- Overall progress bar: "8,543 / 12,543 samples approved (68%)"
- Status breakdown cards:
  - QA Progress: X% reviewed
  - TTS Pipeline: X in queue, X failed
  - Human Recording: X needed, X complete
  - Ready for Release: X approved
- Blockers section: "18 samples need human recording"
- Quick actions:
  - "Send 127 flagged to TTS Pipeline"
  - "Create Recording Queue for 18 samples"
  - "Export QA Report (CSV)"
- Real-time updates via WebSocket

#### 4. Pipeline Queue Component
**File**: `src/components/production/PipelineQueue.vue`

- Shows current TTS generation queue
- Progress per item
- Cancel/retry buttons
- Estimated time remaining

### Sub-Agent Breakdown (Suggested)
- **Sub-agent 3a**: Audio Pipeline enhancements (queue from flags, retry viz)
- **Sub-agent 3b**: Audio Server integration (read flags, update status)
- **Sub-agent 3c**: Mission Control Dashboard (progress, blockers)
- **Sub-agent 3d**: Pipeline Queue component + WebSocket integration

### Success Criteria
- [ ] Audio Pipeline shows flagged samples
- [ ] "Regenerate Flagged" triggers TTS for flagged samples
- [ ] Status updates propagate to sample_flags.json
- [ ] Mission Control shows accurate summary
- [ ] WebSocket updates work in real-time

### Estimated Time: 2-3 days with parallel sub-agents

---

## MASTER AGENT 4: Autocue Recording System

### Branch: `feature/autocue-recording`

### Dependencies
- Master 1 complete (needs API for S3 upload)
- Can start UI work immediately

### Mission
Build the volunteer recording interface with autocue, quality checks, and S3 integration.

### Deliverables

#### 1. Autocue Recording View
**File**: `src/views/AutocueRecording.vue`

**Features**:
- Large phrase display (autocue style)
- Recording controls: Start (spacebar), Stop, Retake, Accept (Enter)
- Waveform visualization during recording
- Quality checks: silence detection, clipping, background noise
- Progress: "234 / 500 phrases (47%)"
- Session management: pause/resume, save progress

#### 2. Recording Service
**File**: `src/services/recording-service.js`

- MediaRecorder API integration (WebM Opus, 48kHz, mono)
- Web Audio API for waveform extraction
- Quality analysis (silence %, clipping %, noise level)
- S3 upload with progress

#### 3. Slow-with-Gaps Mode
**File**: `src/components/recording/GapsRecorder.vue`

- Metronome guide for pacing
- Gap detection algorithm (silence threshold + min gap duration)
- Visual timeline with chop markers
- Drag to adjust segment boundaries
- Preview individual segments
- Export segments as separate files

#### 4. Recording Queue Management
**File**: `src/components/recording/RecordingQueue.vue`

- Load queue from sample_flags.json (flagged_human_needed)
- Phrase grouping: components → LEGO → practice
- Assignment to volunteer (stored in queue metadata)
- Progress tracking per volunteer

#### 5. Gamification
**File**: `src/components/recording/RecordingStats.vue`

- Session stats: phrases recorded, time spent, quality score
- Streak tracking: consecutive days recording
- Badges: "First 100", "Quality Champion", etc.
- Contextual encouragement based on performance

### Sub-Agent Breakdown (Suggested)
- **Sub-agent 4a**: Core autocue UI + recording controls
- **Sub-agent 4b**: Recording service (MediaRecorder, Web Audio, quality checks)
- **Sub-agent 4c**: Gaps mode (gap detection, timeline editor)
- **Sub-agent 4d**: Queue management + S3 upload integration

### Success Criteria
- [ ] Can record a phrase and hear playback
- [ ] Quality checks warn about bad recordings
- [ ] Waveform displays correctly
- [ ] Gaps mode segments phrases into words
- [ ] Recordings upload to S3 with correct UUID
- [ ] sample_flags.json updates to "recording_complete"

### Estimated Time: 3-4 days with parallel sub-agents

---

## Router Updates Required

**File**: `src/router/index.js`

Add routes:
```javascript
{
  path: '/production/mission-control',
  name: 'MissionControl',
  component: () => import('../views/MissionControl.vue')
},
{
  path: '/production/samples/:courseCode',
  name: 'SamplesBrowser',
  component: () => import('../views/SamplesBrowser.vue')
},
{
  path: '/production/recording/:courseCode',
  name: 'AutocueRecording',
  component: () => import('../views/AutocueRecording.vue')
}
```

---

## Merge Order

1. **Master 1 (Infrastructure)** → main
2. **Master 2 (QA Workflow)** → main (after Master 1 merged)
3. **Master 3 (Audio Tools)** → main (after Master 1 merged)
4. **Master 4 (Autocue)** → main (after Master 1 merged)

Masters 2, 3, 4 can merge in any order after Master 1.

---

## Testing Strategy

### Unit Tests
Each master creates tests in `scripts/tests/`:
- `test-sample-flags-service.cjs`
- `test-production-api.cjs`
- `test-production-store.cjs`

### Integration Test
After all masters merge:
- `scripts/tests/integration-test-production-suite.cjs`

### E2E Test (Manual)
1. Flag sample in Script Viewer
2. See it appear in Audio Pipeline queue
3. Regenerate → status updates
4. Review in Samples Browser
5. Approve → Mission Control shows progress

---

## Coordination Protocol

### For Orchestrating Agent

1. **Launch Master 1 first** - Others depend on infrastructure
2. **Wait for Master 1 PR** - Review and merge
3. **Launch Masters 2, 3, 4 in parallel** - They can work simultaneously
4. **Review PRs as they come** - Check for conflicts
5. **Final integration test** - Run full E2E after all merged

### Communication
- Each master creates detailed PR description
- List all files created/modified
- Include test results
- Note any deviations from spec

### Conflict Resolution
If branches conflict:
1. Master that merged first wins
2. Later master rebases on main
3. Orchestrator assists with complex conflicts

---

## Quick Reference: File Locations

### New Files to Create
```
src/stores/production.js                    # Master 1
src/views/MissionControl.vue                # Master 3
src/views/SamplesBrowser.vue                # Master 2
src/views/AutocueRecording.vue              # Master 4
src/components/production/FlagMenu.vue      # Master 2
src/components/production/StatusBadge.vue   # Master 2
src/components/production/PipelineQueue.vue # Master 3
src/components/recording/GapsRecorder.vue   # Master 4
src/components/recording/RecordingQueue.vue # Master 4
src/components/recording/RecordingStats.vue # Master 4
src/services/recording-service.js           # Master 4
services/sample-flags-service.cjs           # Master 1
services/production-api.cjs                 # Master 1
services/websocket-service.cjs              # Master 1
```

### Files to Modify
```
src/views/CourseScriptView.vue              # Master 2
src/views/AudioPipelineView.vue             # Master 3
services/orchestration/orchestrator.cjs     # Master 1 (mount API + WebSocket)
services/phases/audio-server.cjs            # Master 3
src/router/index.js                         # All masters
package.json                                # Master 1 (add dependencies)
```

---

## Launch Checklist

Before starting:
- [ ] Read `CLAUDE.md` in repo root
- [ ] Read vision docs in `new_vision/` directory
- [ ] Verify Phase 8 fixes are working: `node scripts/tests/integration-test-phase8-fixes.cjs`
- [ ] Create feature branch from main
- [ ] Install dependencies if Master 1: `npm install pinia socket.io socket.io-client`

---

## Success Metrics

### Phase 1 Complete (Infrastructure)
- sample_flags.json can be read/written
- Pinia store works
- API endpoints respond
- WebSocket broadcasts

### Phase 2 Complete (Full Suite)
- QA can flag samples
- Flagged samples regenerate automatically
- Samples can be reviewed and approved
- Recording queue works
- Mission Control shows accurate data

### Production Ready
- All tests pass
- Performance acceptable (< 3s page load)
- WebSocket reconnects gracefully
- S3 operations don't race condition
- Volunteer guide documentation complete

---

*This brief should provide complete context for any orchestrating agent to coordinate the multi-master build.*
