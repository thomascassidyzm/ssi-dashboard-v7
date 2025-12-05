# Blue Analysis: Popty/SSi Dashboard v7 Codebase Structure

## Executive Summary

The SSi Dashboard v7 (Popty) is a **language learning course production dashboard** built with Vue 3 + TypeScript + Vite. It orchestrates a multi-phase pipeline that transforms canonical English sentences ("seeds") into complete language courses through LEGO-based recombination pedagogy.

## Technology Stack

- **Frontend**: Vue 3 (Composition API), Pinia state management, Vue Router
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Backend**: Express.js API routes (serverless-compatible)
- **Storage**: S3 (primary), GitHub (fallback)
- **Real-time**: WebSocket (Socket.IO)
- **Audio**: Azure TTS, ElevenLabs TTS

## Core Domain Model

### 1. Seeds (Canonical Sentences)
- 668 empirically-optimized English sentences forming the course backbone
- Each seed has a unique ID (S0001-S0668)
- Seeds are translated to target languages in Phase 1

### 2. LEGOs (Language Building Blocks)
- **A-type (Atomic)**: Single words or fixed phrases
- **M-type (Molecular)**: Multi-word constructs with components
- Each LEGO has:
  - `id`: S{seed}L{num} (e.g., S0001L01)
  - `type`: 'A' or 'M'
  - `new`: boolean (first introduction vs reuse)
  - `lego.known`: English phrase
  - `lego.target`: Target language phrase
  - `components`: For M-type, the atomic parts
  - `teaches`: Pedagogical note

### 3. Baskets (Practice Collections)
- Practice phrases for each LEGO
- Include debut cycle: components → LEGO debut → practice sentences

### 4. Slices (Course Segments)
- Groups of seeds (typically 30-50)
- Used for batched processing

## Pipeline Architecture (APML v11.0)

```
Phase 1 (Translation + LEGO Extraction)
    ↓
Phase 2 (Conflict Resolution)
    ↓
Phase 3 (Basket Generation)
    ↓
Audio Generation (TTS)
    ↓
Manifest Compilation
```

### Phase Outputs

| Phase | Input | Output | Description |
|-------|-------|--------|-------------|
| Phase 1 | canonical_seeds.json | draft_lego_pairs.json | Translation + LEGO extraction |
| Phase 2 | draft_lego_pairs.json | lego_pairs.json | Conflict resolution, new/reuse flags |
| Phase 3 | lego_pairs.json | lego_baskets.json | Practice basket generation |
| Audio | lego_baskets.json | Supabase audio_samples | TTS audio generation |
| Manifest | * | course_manifest.json | Final compiled course |

## Application Architecture

### Views (src/views/)

| View | Route | Purpose |
|------|-------|---------|
| Dashboard | / | Main navigation hub |
| CourseGeneration | /generate | Start pipeline workflow |
| CourseBrowser | /courses | List all courses |
| CourseEditor | /courses/:code | Edit course data |
| CourseValidator | /validate | Validate course integrity |
| PhaseIntelligence | /intelligence | View phase prompts |
| RecordingStudio | /record | Record human audio |
| AudioPipelineView | /courses/:code/audio-pipeline | Audio generation |

### Key Components (src/components/)

| Component | Purpose |
|-----------|---------|
| LegoVisualizer | Display/filter/edit LEGOs |
| LegoBasketViewer | View practice baskets |
| ProgressMonitor | Track pipeline progress |
| PipelineProgress | Visual phase indicator |
| MissionControl | Production QA dashboard |
| AutocueStudio | Teleprompter recording |
| SamplesBrowser | Audio QA interface |

### Services (src/services/)

| Service | Purpose |
|---------|---------|
| api.js | Main API client with caching |
| vfs.js | Virtual file system wrapper |
| seedService.js | SEED/LEGO data loading |
| websocket.js | Real-time updates |
| courseCache.js | IndexedDB caching |

### State Management (src/stores/)

| Store | Purpose |
|-------|---------|
| production.js | Production QA state (manifest, flags, audio metadata) |

## API Structure (api/)

### Course Operations
- `GET /api/courses` - List all courses
- `GET /api/courses/:code/status` - Pipeline status
- `POST /api/courses/generate` - Start generation
- `GET /api/courses/:code/analyze` - Smart recommendations

### File Operations
- `GET /api/courses/:code/baskets/:seedId` - Get basket
- `GET /api/courses/:code/files/:filename` - Get file

### Audio Operations
- `POST /api/audio/plan` - Generation plan
- `POST /api/audio/start` - Start generation
- `GET /api/audio/status/:code` - Job status
- `GET /api/audio/stream/:uuid` - Stream audio

### Intelligence
- `GET /api/intelligence/:phase` - Phase prompts

## Data Flow Patterns

### 1. Course Loading
```
User selects course
    → Check IndexedDB cache
    → If miss: fetch from S3 → fallback to GitHub
    → Parse lego_pairs.json, lego_baskets.json
    → Transform to Vue-friendly format
    → Cache in IndexedDB
```

### 2. Course Generation
```
User configures generation
    → POST /api/courses/generate
    → Orchestrator starts Phase 1
    → Phase servers process in sequence
    → WebSocket broadcasts progress
    → Dashboard polls/receives updates
    → Completion triggers next phase
```

### 3. Production QA
```
Load course manifest
    → Load sample flags from Supabase
    → Display in SamplesBrowser
    → User reviews audio
    → Flag updates via WebSocket
    → Real-time sync across clients
```

## Key Technical Patterns

### 1. Composables (Vue Composition API)
- `useAuth` - Authentication state
- `useAutocueState` - Recording state
- `useScriptPlayer` - Audio playback
- `usePromptManager` - Prompt loading

### 2. Multi-Environment Support
- Environment switcher component
- localStorage persisted API URL
- Support for local, ngrok, production

### 3. Error Handling
- Axios interceptors for 404 suppression
- Retry logic with exponential backoff
- Graceful degradation (S3 → GitHub)

### 4. Real-time Updates
- Socket.IO rooms per course
- Optimistic UI updates
- Server-side event emission

## File Naming Conventions

### Course Data Files
```
{target}_for_{known}/
├── seed_pairs.json         # Phase 1 output
├── lego_pairs.json         # Phase 2 output (SSoT)
├── lego_baskets.json       # Phase 3 output
├── introductions.json      # LEGO presentations
└── course_manifest.json    # Final manifest
```

### Component Files
```
{Name}.vue                  # Vue SFC
{Name}Example.vue           # Demo/example variant
use{Name}.js                # Composable
{name}Service.js            # Service module
```

## Domain-Specific Vocabulary

| Term | Definition |
|------|------------|
| SEED | Canonical English sentence (backbone of course) |
| LEGO | Reusable language building block |
| Basket | Collection of practice phrases for a LEGO |
| Slice | Group of seeds for batched processing |
| Phase | Pipeline processing stage |
| Provenance | Origin tracking (S{seed}L{num}) |
| Debut | First introduction of a LEGO |
| Eternal | LEGO that appears repeatedly |
| FD | Fundamental Dependency |
| LUT | Look-Up Table (pattern registry) |

## Notable Complexity Areas

1. **Multi-format data handling**: Supports both legacy array format and new object format
2. **Phase coordination**: Complex orchestration across multiple microservices
3. **Caching strategy**: Multi-layer (memory, IndexedDB, S3, GitHub)
4. **Audio pipeline**: Cost-aware generation with approval gates
5. **Real-time sync**: WebSocket-based multi-client updates
6. **Domain vocabulary**: Rich pedagogical terminology throughout

## Metrics

- **Views**: 24 view components
- **Components**: 40+ reusable components
- **API endpoints**: 50+ routes
- **Lines of code**: ~25,000 (Vue/JS only)
- **Domain models**: 5 core (Seed, LEGO, Basket, Slice, Manifest)
