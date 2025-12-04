# Course Production Suite - Executive Summary

**Comprehensive Architecture Design**

Version: 2.0.0
Date: 2025-12-04
Pipeline: Supabase-backed (APML v10.2)

---

## What You Have

A complete architectural design for the **Course Production Suite** - an integrated system that unifies QA review, audio generation, manual recording, and quality control into a cohesive production workflow.

---

## Deliverables

### 1. Main Architecture Document
**File:** `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` (60+ pages)

**Contents:**
- System architecture diagrams
- Data flow & state management
- Shared data structures (sample_flags.json, audio_metadata.json)
- Navigation design with deep linking
- Mission Control dashboard specification
- Complete component specifications for all 4 tools
- API endpoint definitions
- Future-proofing for multi-tenant volunteers
- Design aesthetic guidelines

**What it answers:**
✅ How do flagged items flow from Script Viewer → Audio Pipeline?
✅ How do flagged items flow from Script Viewer → Recording Studio?
✅ Where is the single source of truth for audio status? (S3)
✅ How do users navigate between tools? (Route structure + deep links)
✅ How does it integrate with existing dashboard? (Route hierarchy)

---

### 2. Visual Architecture Guide
**File:** `course-production-suite-visual.html`

**Contents:**
- Interactive HTML visualization
- Component overview cards
- Data flow diagrams (ASCII art)
- Status lifecycle grid
- Mission Control wireframe
- Script Viewer wireframe
- Recording Studio wireframe
- API endpoint structure
- Navigation hierarchy

**How to use:**
Open in any web browser for a styled, visual representation of the architecture.

**Design aesthetic:**
- Dark mode with terminal/mission-control vibe
- Berkeley Mono font for technical authenticity
- Emerald green accents (#10b981)
- Animated hover states
- Responsive design

---

### 3. Implementation Guide
**File:** `PRODUCTION_SUITE_IMPLEMENTATION_GUIDE.md` (40+ pages)

**Contents:**
- Quick start (architecture in 3 minutes)
- Phase-by-phase implementation checklist
- Complete code examples:
  - Pinia store setup
  - WebSocket service
  - Express API routes
  - Vue component examples
  - Composables (useAudioPipeline, useRecorder)
- Testing checklist
- Performance optimization tips
- Deployment instructions
- Troubleshooting guide

**What it provides:**
✅ Copy-paste code snippets
✅ File structure
✅ Step-by-step implementation order
✅ Testing strategies
✅ Common pitfalls & solutions

---

### 4. Mermaid Diagrams
**File:** `PRODUCTION_SUITE_DIAGRAMS.md`

**Contents:**
14 professional Mermaid diagrams:
1. System architecture overview
2. Data flow sequence diagram
3. Sample status state machine
4. Component interaction flow
5. Navigation structure
6. API endpoint structure
7. Flag update process flow
8. Recording studio workflow
9. Audio pipeline processing flow
10. Mission control data flow
11. Multi-user collaboration flow
12. Component hierarchy tree
13. State management class diagram
14. S3 storage structure

**How to use:**
- Render in GitHub/GitLab
- Use VS Code Mermaid extension
- Export as PNG/SVG for presentations

---

## Key Architectural Decisions

### 1. Supabase + S3 as Single Source of Truth

**Why:**
- Supabase for audio registry and QA workflow (structured queries, realtime updates)
- S3 for course files and audio storage (scalable, cost-effective)
- Proper database with RLS, audit trails, and realtime subscriptions
- Cross-course audio deduplication via Supabase

**Storage:**
```
Supabase:
  ├── audio_samples              (Master Audio Registry - MAR)
  ├── sample_flags               (QA decisions - read/write)
  ├── voices                     (TTS & human voice registry)
  └── course_audio_usage         (cross-course deduplication)

S3 (popty-bach-lfs):
  ├── courses/{code}/
  │   ├── lego_baskets.json      (Phase 3 output)
  │   └── course_manifest.json   (Phase 9 output)
  └── ssiborg-assets/mastered/{uuid}.mp3 (all audio files)
```

---

### 2. Flag-Based Workflow

**Status Lifecycle:**
```
pending → flagged → in_pipeline/in_recording → complete
```

**Benefits:**
- Clear state machine
- Easy to track progress
- Simple to add new statuses
- History tracking built-in

---

### 3. Real-Time Collaboration via WebSocket

**Events:**
- `sample_updated` - Flag status changed
- `pipeline_progress` - TTS generation progress
- `generation_complete` - Audio ready for review
- `recording_completed` - Human recording uploaded

**Benefits:**
- Multiple users see same state
- No polling/refresh needed
- Instant feedback loops
- Live progress tracking

---

### 4. Progressive Disclosure UI

**Hierarchy:**
```
Mission Control (overview)
  └── Course Production View (summary)
      └── Tool View (detailed)
          └── Item View (granular)
```

**Benefits:**
- Not overwhelming for new users
- Quick access for power users
- Context preserved when drilling down
- Deep linking for collaboration

---

### 5. Composable Architecture

**Vue 3 Composition API:**
- `useScriptPlayer()` - Audio playback state
- `useAudioPipeline()` - TTS queue management
- `useRecorder()` - Audio capture & upload
- `useKeyboardShortcuts()` - Accessibility

**Benefits:**
- Reusable logic
- Easy to test
- Clean component code
- Type-safe with TypeScript

---

## How the Tools Connect

### Script Viewer → Audio Pipeline

```
User flags sample for TTS regeneration
  ↓
sample_flags.json updated (status: flagged_regen_tts)
  ↓
Audio Pipeline sees flagged item in queue
  ↓
User clicks "Send to Pipeline"
  ↓
TTS generation starts (status: in_pipeline)
  ↓
Audio generated and uploaded to S3
  ↓
Status updated (status: needs_review)
  ↓
Sample appears in Samples Browser for QA
```

### Script Viewer → Recording Studio

```
User flags sample for human recording
  ↓
sample_flags.json updated (status: flagged_human_needed)
  ↓
Recording Studio sees flagged items
  ↓
User clicks "Create Recording Queue"
  ↓
Queue created and assigned to voice talent
  ↓
Voice talent records in autocue interface
  ↓
Recording uploaded to S3 with metadata
  ↓
Status updated (status: recorded)
  ↓
Sample appears in Samples Browser for QA
```

### Samples Browser → Script Viewer

```
QA reviewer listening to audio
  ↓
Finds issue with pronunciation
  ↓
Clicks "Reject" with note
  ↓
sample_flags.json updated (status: rejected)
  ↓
Script Viewer shows rejected status
  ↓
User can re-flag for regeneration
  ↓
Cycle starts again
```

---

## Mission Control Dashboard

### At-a-Glance View

```
┌────────────────────────────────────────┐
│  OVERALL PROGRESS                       │
│  ══════════════════ 68% Complete       │
│  8,543 / 12,543 samples approved       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  BLOCKERS                               │
│  🚨 18 human recordings needed         │
│     → [Create Recording Queue]         │
│  ⚠️  127 TTS regenerations needed      │
│     → [Send to Audio Pipeline]         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  PIPELINE STAGES                        │
│  QA Review: 8,234 / 12,543 ███████░░░  │
│  TTS Gen:   3,891 / 12,543 ████░░░░░░  │
│  Recording: 12 / 18        ████████░░  │
│  Final QA:  89 pending     ████████░░  │
└────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1-2)
- [ ] Pinia store for shared state
- [ ] WebSocket service
- [ ] API routes for flags/metadata
- [ ] Base component library

### Phase 2: Script Viewer (Week 3-4)
- [ ] Hierarchical seed tree
- [ ] Inline audio playback
- [ ] Flag menu with context
- [ ] Filter views
- [ ] Keyboard shortcuts

### Phase 3: Audio Pipeline (Week 5)
- [ ] Queue management UI
- [ ] Real-time progress
- [ ] Retry logic
- [ ] Preview & approval

### Phase 4: Recording Studio (Week 6-7)
- [ ] Autocue display
- [ ] Recording controls
- [ ] Phrase grouping
- [ ] S3 upload

### Phase 5: Samples Browser (Week 8)
- [ ] Grid/list views
- [ ] Filtering & sorting
- [ ] Compare view
- [ ] Bulk actions

### Phase 6: Mission Control (Week 9)
- [ ] Progress visualization
- [ ] Blocker detection
- [ ] Quick actions
- [ ] Real-time updates

### Phase 7: Polish & Launch (Week 10)
- [ ] E2E testing
- [ ] Documentation
- [ ] Performance optimization
- [ ] Production deployment

---

## Tech Stack

**Frontend:**
- Vue 3 + Composition API
- Vite (build tool)
- Tailwind CSS 4
- Pinia (state management)
- Socket.io-client (WebSocket)
- Howler.js (audio playback)

**Backend:**
- Express.js (API server)
- Socket.io (WebSocket server)
- AWS SDK v3 (S3 operations)
- PM2 (process management)

**Infrastructure:**
- S3 (data storage)
- Vercel (frontend hosting)
- Railway (backend hosting)

**Development:**
- TypeScript
- ESLint + Prettier
- Vitest (unit tests)
- Playwright (e2e tests)

---

## API Quick Reference

```
GET  /api/production/:courseCode/manifest
GET  /api/production/:courseCode/flags
POST /api/production/:courseCode/flags/update

GET  /api/production/:courseCode/script/seeds
GET  /api/production/:courseCode/script/seeds/:seedId

GET  /api/production/:courseCode/audio-pipeline/status
POST /api/production/:courseCode/audio-pipeline/queue/add

GET  /api/production/:courseCode/recording/queues
POST /api/production/:courseCode/recording/queues/create
POST /api/production/:courseCode/recording/upload

GET  /api/production/:courseCode/samples/list
POST /api/production/:courseCode/samples/:uuid/approve
POST /api/production/:courseCode/samples/:uuid/reject

WS   /api/production/websocket
```

---

## Route Structure

```
/production
  → Mission Control (overview of all courses)

/production/:courseCode
  → Course Production Overview

/production/:courseCode/script
  → Script Viewer (QA Tool)
  → ?seed=S0042 (deep link to specific seed)

/production/:courseCode/audio-pipeline
  → Audio Pipeline Status & Control

/production/:courseCode/recording
  → Recording Studio
  → ?queue=xyz (specific recording queue)

/production/:courseCode/samples
  → Audio Samples Browser
  → ?status=flagged (filtered view)
```

---

## Future Features (Multi-Tenant)

### Volunteer System

**Queue Assignment:**
- Admin creates recording queue
- System assigns to volunteer
- Volunteer sees only their queue
- Progress tracked per user

**Permission Levels:**
- Admin: Full access
- QA Reviewer: Script Viewer + Samples Browser
- Audio Engineer: Audio Pipeline
- Voice Talent: Recording Studio (assigned queues only)

**Collaboration:**
- Comments on samples
- @mentions
- Activity feed
- Email notifications

---

## Design Philosophy

### Visual Language

**Inspiration:**
Mission control meets music production software

**Color Palette:**
- Background: Deep slate (#0f172a)
- Primary: Emerald green (#10b981)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)
- Info: Cyan (#06b6d4)

**Typography:**
- Headings: Inter (bold, uppercase tracking)
- Body: System fonts (cross-platform)
- Code: JetBrains Mono

**Principles:**
- Dense but breathable
- Sticky controls (playback bar)
- Progressive disclosure
- Real-time feedback

---

## Success Metrics

### Quality Metrics
- % samples flagged vs approved on first pass
- Average time from flag → resolution
- TTS success rate (vs. requiring human recording)

### Efficiency Metrics
- Samples processed per day
- Average time per manual recording
- Pipeline queue wait time

### Collaboration Metrics
- Number of active QA reviewers
- Number of active voice talents
- Average response time to blockers

---

## Next Steps

### 1. Review & Approval
- [ ] Share architecture docs with team
- [ ] Get feedback on data structures
- [ ] Validate API endpoints with backend team
- [ ] Confirm UI/UX direction

### 2. Development Setup
- [ ] Create repository structure
- [ ] Set up Vite + Vue 3 project
- [ ] Configure Tailwind CSS
- [ ] Set up testing framework

### 3. Phase 1 Implementation
- [ ] Implement Pinia store
- [ ] Build API endpoints
- [ ] Set up WebSocket service
- [ ] Create base components

### 4. Iterative Development
- Follow phase-by-phase implementation guide
- Weekly demos with stakeholders
- Continuous testing & refinement

---

## Files Summary

| File | Purpose | Pages |
|------|---------|-------|
| `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` | Complete technical specification | 60+ |
| `course-production-suite-visual.html` | Interactive visual guide | HTML |
| `PRODUCTION_SUITE_IMPLEMENTATION_GUIDE.md` | Developer quick-start guide | 40+ |
| `PRODUCTION_SUITE_DIAGRAMS.md` | Mermaid diagram collection | 14 diagrams |
| `PRODUCTION_SUITE_SUMMARY.md` | This document | Executive overview |

**Total documentation:** 100+ pages of specifications, diagrams, and implementation guides

---

## Contact & Support

**Questions about:**
- Architecture decisions → See main architecture doc
- Implementation details → See implementation guide
- Visual design → See HTML visualization
- Data flow → See Mermaid diagrams

**Project Context:**
- Existing codebase: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`
- Current routes: `/courses`, `/generate`, `/record`, `/audio-pipeline`
- S3 bucket: `popty-bach-lfs` (region: eu-west-1)
- App integration: `ssi-learning-app` consumes course manifests

---

## Final Notes

This architecture is designed for:

✅ **Clarity** - Clear data flows and state management
✅ **Maintainability** - Composable architecture, well-documented
✅ **Scalability** - Multi-tenant ready, efficient pipelines
✅ **Collaboration** - Real-time updates, deep linking
✅ **Future-proof** - Volunteer system ready, extensible design

The integrated Course Production Suite will transform how SSi creates language courses - from manual, error-prone processes to a streamlined, collaborative workflow with quality controls at every step.

---

**Architecture Design Complete**

*Created: 2025-12-04*
*Version: 1.0.0*
*Status: Ready for Review & Implementation*

---

**Next Action:** Share this summary + architecture docs with the team for review and feedback before beginning implementation.
