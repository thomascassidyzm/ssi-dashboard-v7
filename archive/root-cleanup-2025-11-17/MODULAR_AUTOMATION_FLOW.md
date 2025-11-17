# Modular Automation System - Complete Flow

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard (React)                         │
│                  http://localhost:5173                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Orchestrator (Express Server)                   │
│                  http://localhost:3456                       │
│                                                              │
│  - Course management                                         │
│  - Phase sequencing                                          │
│  - Checkpoint coordination                                   │
│  - VFS file serving                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Triggers phase servers
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase Servers                             │
│                                                              │
│  Phase 1: http://localhost:3457 (Translation)               │
│  Phase 3: http://localhost:3458 (LEGO Extraction)           │
│  Phase 5: http://localhost:3459 (Basket Generation)         │
│  Phase 6: http://localhost:3460 (Introductions)             │
│  Phase 8: http://localhost:3461 (Audio/TTS)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Startup Sequence

### 1. `start-automation.cjs` (Entry Point)

**Location**: `/start-automation.cjs`

**Input**: None (reads environment)

**Process**:
```javascript
1. Load environment variables (VFS_ROOT)
2. Start orchestrator on port 3456
3. Start Phase 1 server on port 3457
4. Start Phase 3 server on port 3458
5. Start Phase 5 server on port 3459
6. Start Phase 6 server on port 3460
7. Start Phase 8 server on port 3461
8. Wait for all servers to be healthy
```

**Output**: All services running, ready for requests

**Console Output**:
```
🚀 Starting SSi Automation System...
✅ Orchestrator ready on port 3456
✅ Phase 1 (Translation) ready on port 3457
✅ Phase 3 (LEGO Extraction) ready on port 3458
✅ Phase 5 (Baskets) ready on port 3459
✅ Phase 6 (Introductions) ready on port 3460
✅ Phase 8 (Audio) ready on port 3461
🎉 All services ready!
```

---

## Phase 0: User Initiates Course via Dashboard

### Dashboard → Orchestrator

**Endpoint**: `POST http://localhost:3456/api/courses/create`

**Request Body**:
```json
{
  "courseCode": "spa_for_eng",
  "target": "Spanish",
  "known": "English",
  "checkpointMode": "gated",
  "phases": ["phase1", "phase3", "phase5", "phase6", "phase8"]
}
```

**Orchestrator Process**:
1. Validate course doesn't exist
2. Create course directory: `public/vfs/courses/spa_for_eng/`
3. Initialize course manifest
4. Return course ID

**Response**:
```json
{
  "success": true,
  "courseCode": "spa_for_eng",
  "message": "Course created, ready for Phase 1"
}
```

---

## Phase 1: Translation (Pedagogical Seed Translation)

### User Triggers Phase 1

**Dashboard → Orchestrator**:
```http
POST /api/courses/spa_for_eng/start-phase1
```

**Orchestrator → Phase 1 Server**:
```http
POST http://localhost:3457/start
Content-Type: application/json

{
  "courseCode": "spa_for_eng",
  "target": "Spanish",
  "known": "English",
  "startSeed": 1,
  "endSeed": 668
}
```

### Phase 1 Server Process

**File**: `services/phases/phase1-translation-server.cjs`

**Input**:
- Course code: `spa_for_eng`
- Seed range: 1-668
- Target/Known languages

**Steps**:
1. **Load Config** (`config-loader.cjs`)
   ```javascript
   const config = loadConfig();
   const p1Config = config.phase1_translation;
   // browsers: 10, agents_per_browser: 10, seeds_per_agent: 10
   ```

2. **Calculate Parallelization**
   ```javascript
   browsers = 10
   agents_per_browser = 10
   seeds_per_agent = 10
   capacity = 10 × 10 × 10 = 1000 seeds ✅ (enough for 668)
   ```

3. **Fetch Canonical Seeds**
   ```http
   GET https://ssi-dashboard-v7.vercel.app/api/seeds?limit=668
   ```

4. **Spawn Browser Windows** (10 windows)
   - Window 1: Seeds 1-100 (10 agents × 10 seeds)
   - Window 2: Seeds 101-200
   - ...
   - Window 7: Seeds 601-668
   - Each window opens Claude Code in browser
   - Delay 5000ms between windows

5. **Each Browser Window Spawns Agents**
   - Window 1 prompt: "Spawn 10 Task agents in parallel"
   - Agent 1: Seeds 1-10
   - Agent 2: Seeds 11-20
   - ...
   - Agent 10: Seeds 91-100

6. **Each Agent Translates Seeds**
   - Reads canonical seeds from API
   - Applies Phase 1 Intelligence
   - Creates pedagogical translations
   - Writes to `phase1_outputs/agent_XX.json`
   - Pushes to branch: `claude/phase1-spa_for_eng-agent-XX`

7. **Branch Watcher Merges**
   ```javascript
   // Watches for branches: claude/phase1-spa_for_eng-*
   // When all 70 agents complete:
   // - Merges all agent outputs
   // - Writes: public/vfs/courses/spa_for_eng/seed_pairs.json
   // - Deletes phase1_outputs/ directory
   ```

**Output**: `seed_pairs.json` (~500KB)
```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "total_seeds": 668,
  "seeds": [
    {
      "seed_id": "S0001",
      "known": "hola",
      "target": "hello"
    },
    // ... 668 seeds
  ]
}
```

**Phase 1 Server → Orchestrator**:
```http
POST http://localhost:3456/phase-complete
{
  "phase": 1,
  "courseCode": "spa_for_eng",
  "status": "complete"
}
```

---

## Phase 3: LEGO Extraction

### Orchestrator → Phase 3 Server

**Endpoint**: `POST http://localhost:3458/start`

**Request Body**:
```json
{
  "courseCode": "spa_for_eng",
  "startSeed": 1,
  "endSeed": 668,
  "target": "Spanish",
  "known": "English"
}
```

### Phase 3 Server Process

**File**: `services/phases/phase3-lego-extraction-server.cjs`

**Input**:
- `seed_pairs.json` (from Phase 1)

**Steps**:

1. **Check Prerequisites**
   ```javascript
   const seedPairsPath = `public/vfs/courses/spa_for_eng/seed_pairs.json`;
   if (!exists(seedPairsPath)) {
     throw new Error('Phase 3 requires seed_pairs.json - run Phase 1 first');
   }
   ```

2. **Load Config**
   ```javascript
   const config = loadConfig();
   const p3Config = config.phase3_lego_extraction;
   // browsers: 10, agents_per_browser: 10, seeds_per_agent: 10
   ```

3. **Check for Collision Manifest**
   ```javascript
   const manifestPath = 'phase3_collision_reextraction_manifest.json';
   const collisionManifest = loadCollisionManifest(baseCourseDir);
   // If exists: Auto-inject collision avoidance instructions
   ```

4. **Calculate Parallelization**
   ```javascript
   capacity = 10 × 10 × 10 = 1000 seeds
   ```

5. **Spawn Browser Windows** (10 windows)
   - Each window: 100 seeds
   - Each agent in window: 10 seeds

6. **Each Agent Extracts LEGOs**
   - Reads `seed_pairs.json`
   - Applies Phase 3 Intelligence (chunking rules)
   - **If collision manifest exists for this seed**:
     - Injects: "AVOID extracting phrase X (collides with S0123:L02)"
     - Claude naturally chunks up to avoid collision
   - Extracts LEGOs (A-type atoms, M-type molecules)
   - Writes to `phase3_outputs/segment_XX.json`
   - Pushes to branch: `claude/phase3-spa_for_eng-segment-XX`

7. **Branch Watcher Merges**
   ```javascript
   // Merges all segments
   // Writes: public/vfs/courses/spa_for_eng/lego_pairs.json
   ```

8. **FCFS Collision Detection** (post-merge)
   ```javascript
   // Run: scripts/validation/detect_fd_collisions.cjs
   // If collisions found (e.g., 96 collisions):
   //   - Keep first occurrence (FCFS)
   //   - Generate collision manifest for re-extraction
   //   - Writes: phase3_collision_reextraction_manifest.json
   ```

9. **Re-extraction** (if collisions detected)
   ```javascript
   // Manifest contains 77 seeds needing re-extraction
   // Each seed has collision avoidance instructions:
   // "AVOID extracting 'muy inusual' (collides with S0165:L03)"
   // Re-run Phase 3 for those 77 seeds with instructions
   ```

**Output**: `lego_pairs.json` (~2MB)
```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "total_seeds": 668,
  "total_legos": 2716,
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["hello", "hola"],
      "legos": [
        {
          "id": "S0001L01",
          "known": "hola",
          "target": "hello",
          "type": "A",
          "new": true
        }
      ]
    },
    // ... 668 seeds, 2716 LEGOs
  ]
}
```

**Phase 3 Server → Orchestrator**:
```http
POST http://localhost:3456/phase-complete
{
  "phase": 3,
  "courseCode": "spa_for_eng",
  "status": "complete"
}
```

---

## Phase 5: Practice Basket Generation

### Orchestrator → Phase 5 Server

**Endpoint**: `POST http://localhost:3459/start`

**Request Body**:
```json
{
  "courseCode": "spa_for_eng",
  "startSeed": 1,
  "endSeed": 668,
  "target": "Spanish",
  "known": "English"
}
```

### Phase 5 Server Process

**File**: `services/phases/phase5-basket-server.cjs`

**Input**:
- `seed_pairs.json` (from Phase 1)
- `lego_pairs.json` (from Phase 3)

**Steps**:

1. **Check Prerequisites**
   ```javascript
   if (!exists('seed_pairs.json')) throw Error('Need Phase 1');
   if (!exists('lego_pairs.json')) throw Error('Need Phase 3');
   ```

2. **Check if Already Complete**
   ```javascript
   const legoPairs = readJson('lego_pairs.json');
   const expectedBaskets = legoPairs.seeds
     .flatMap(s => s.legos.filter(l => l.new)).length; // 2716 new LEGOs

   const baskets = readJson('lego_baskets.json');
   const basketCount = Object.keys(baskets.baskets).length;

   if (basketCount >= expectedBaskets) {
     return { alreadyComplete: true };
   }
   ```

3. **Generate Scaffolds** (Mechanical Prep)
   ```javascript
   const { preparePhase5Scaffolds } = require('scripts/phase5_prep_scaffolds.cjs');
   await preparePhase5Scaffolds('public/vfs/courses/spa_for_eng');
   ```

   **Scaffold Generation** (`scripts/phase5_prep_scaffolds.cjs`):
   ```javascript
   // For each seed (S0001 - S0668):
   for (const seed of seeds) {
     const scaffold = {
       seed_id: "S0171",
       seed_pair: { known: "...", target: "..." },

       // 10 most recent seed pairs (just sentences)
       recent_seed_pairs: [
         { seed_id: "S0170", known: "...", target: "..." },
         // ... 10 seeds
       ],

       // 30 most recent NEW LEGOs (sliding window)
       recent_new_legos: [
         { id: "S0170L04", known: "que necesitas", target: "that you need" },
         { id: "S0170L03", known: "lo que necesitas", target: "what you need" },
         // ... 30 recent NEW LEGOs
       ],

       // LEGOs in this seed that need baskets
       legos: {
         "S0171L01": {
           lego: ["quieres que te ayude", "you want me to help you"],
           type: "M",
           is_final_lego: false,
           current_seed_earlier_legos: [], // Incremental
           practice_phrases: [], // AI fills this
           phrase_distribution: {
             short_1_to_2_legos: 2,
             medium_3_legos: 2,
             longer_4_legos: 2,
             longest_5_legos: 4
           },
           target_phrase_count: 10
         }
       }
     };

     // Write: phase5_scaffolds/seed_s0171.json
   }
   ```

   **Output**: 668 scaffold files (.gitignored)
   - `phase5_scaffolds/seed_s0001.json` (~15KB each)
   - `phase5_scaffolds/seed_s0002.json`
   - ... 668 files total

4. **Load Config & Calculate Parallelization**
   ```javascript
   const config = loadConfig();
   const p5Config = config.phase5_basket_generation;

   browsers = 10
   agents_per_browser = 10
   seeds_per_agent = 10
   capacity = 10 × 10 × 10 = 1000 seeds ✅
   ```

5. **Start Branch Watcher**
   ```javascript
   // Pattern: claude/baskets-spa_for_eng-*
   // Waiting for 10 branches (one per window)
   // Output: lego_baskets.json
   ```

6. **Spawn Browser Windows** (10 windows)
   - Window 1: Seeds 1-100
   - Window 2: Seeds 101-200
   - ... with 5000ms delay between

7. **Each Window Spawns Agents**
   - Window 1 prompt: "Spawn 10 agents in parallel"
   - Agent 1: Seeds 1-10
   - Agent 2: Seeds 11-20
   - ...

8. **Each Agent Generates Baskets**

   **Agent reads scaffold**:
   ```javascript
   // Reads: phase5_scaffolds/seed_s0171.json
   const scaffold = readJson(`phase5_scaffolds/seed_s0171.json`);
   ```

   **Agent follows Phase 5 Intelligence**:
   - Uses vocabulary from:
     - 10 recent seed pairs
     - 30 recent NEW LEGOs
     - Current seed's earlier LEGOs
     - Current LEGO
   - Generates 10 practice phrases per LEGO
   - Distribution: 2-2-2-4 (short/medium/longer/longest)
   - Final LEGO: Phrase 10 = complete seed sentence

   **Agent writes output**:
   ```json
   // phase5_outputs/seed_s0171.json
   {
     "version": "curated_v7_spanish",
     "seed_id": "S0171",
     "legos": {
       "S0171L01": {
         "lego": ["quieres que te ayude", "you want me to help you"],
         "practice_phrases": [
           {
             "phrase": [
               { "known": "quieres", "target": "you want" },
               { "known": "que", "target": "me to" },
               { "known": "te ayude", "target": "help you" }
             ],
             "translation": "you want me to help you"
           },
           // ... 10 phrases
         ]
       }
     }
   }
   ```

   **Agent pushes to GitHub**:
   ```bash
   git checkout -b claude/baskets-spa_for_eng-w01-agent-01
   git add phase5_outputs/seed_s0171.json
   git commit -m "Phase 5: Seeds 1-10"
   git push origin claude/baskets-spa_for_eng-w01-agent-01
   ```

9. **Branch Watcher Merges Baskets**
   ```javascript
   // When all 70 agents complete:
   // - Reads all phase5_outputs/seed_*.json files
   // - Merges baskets from all seeds
   // - Writes: lego_baskets.json
   // - Deletes phase5_outputs/ directory
   ```

**Output**: `lego_baskets.json` (~5MB)
```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "total_baskets": 2716,
  "baskets": {
    "S0001L01": {
      "lego": ["hola", "hello"],
      "practice_phrases": [
        { "phrase": [...], "translation": "..." },
        // ... 10 phrases
      ]
    },
    "S0171L01": {
      "lego": ["quieres que te ayude", "you want me to help you"],
      "practice_phrases": [
        // ... 10 phrases
      ]
    },
    // ... 2716 baskets
  }
}
```

**Phase 5 Server → Orchestrator**:
```http
POST http://localhost:3456/phase-complete
{
  "phase": 5,
  "courseCode": "spa_for_eng",
  "status": "complete"
}
```

---

## Phase 6: Introduction Generation

### Orchestrator → Phase 6 Server

**Endpoint**: `POST http://localhost:3460/start`

**Request Body**:
```json
{
  "courseCode": "spa_for_eng",
  "target": "Spanish",
  "known": "English"
}
```

### Phase 6 Server Process

**File**: `services/phases/phase6-introduction-server.cjs`

**Input**:
- `lego_baskets.json` (from Phase 5)

**Steps**:

1. **Load Config**
   ```javascript
   const config = loadConfig();
   const p6Config = config.phase6_introductions;
   ```

2. **Spawn Single Claude Code Session**
   - Reads `lego_baskets.json`
   - Generates introduction presentations
   - Creates welcome content
   - Explains LEGO methodology

3. **Write Output**
   ```javascript
   // Writes: introductions.json
   ```

**Output**: `introductions.json` (~500KB)
```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "introductions": [
    {
      "id": "welcome",
      "title": "Welcome to Spanish for English Speakers",
      "content": "..."
    },
    {
      "id": "lego_explanation",
      "title": "The LEGO Method",
      "content": "..."
    }
  ]
}
```

**Phase 6 Server → Orchestrator**:
```http
POST http://localhost:3456/phase-complete
{
  "phase": 6,
  "courseCode": "spa_for_eng",
  "status": "complete"
}
```

---

## Phase 8: Audio Generation (TTS)

### Orchestrator → Phase 8 Server

**Endpoint**: `POST http://localhost:3461/start`

**Request Body**:
```json
{
  "courseCode": "spa_for_eng",
  "target": "Spanish"
}
```

### Phase 8 Server Process

**File**: `services/phases/phase8-audio-server.cjs`

**Input**:
- `lego_baskets.json` (all Spanish text to convert)

**Steps**:

1. **Extract All Spanish Phrases**
   ```javascript
   const baskets = readJson('lego_baskets.json');
   const phrases = [];
   for (const basket of baskets.baskets) {
     phrases.push(basket.lego[0]); // Spanish LEGO
     for (const practice of basket.practice_phrases) {
       phrases.push(practice.phrase.map(p => p.known).join(' '));
     }
   }
   // Total: ~30,000 phrases
   ```

2. **Generate Audio with TTS**
   ```javascript
   const { generateAudio } = require('services/tts-service.cjs');
   for (const phrase of phrases) {
     const audio = await generateAudio(phrase, 'es-ES');
     // Saves to: audio/spa_for_eng/${phraseId}.mp3
   }
   ```

3. **Upload to S3** (if configured)
   ```javascript
   const { uploadToS3 } = require('services/s3-audio-service.cjs');
   for (const audioFile of audioFiles) {
     await uploadToS3(audioFile, 'spa_for_eng');
   }
   ```

4. **Generate Audio Manifest**
   ```json
   // Writes: audio_manifest.json
   {
     "version": "1.0.0",
     "course_code": "spa_for_eng",
     "total_audio_files": 30000,
     "audio_files": [
       {
         "phrase_id": "S0001L01_practice_01",
         "url": "https://s3.amazonaws.com/ssi-audio/spa_for_eng/..."
       }
     ]
   }
   ```

**Output**:
- `audio/` directory with ~30,000 MP3 files (.gitignored)
- `audio_manifest.json` (~2MB) - URLs to audio files

**Phase 8 Server → Orchestrator**:
```http
POST http://localhost:3456/phase-complete
{
  "phase": 8,
  "courseCode": "spa_for_eng",
  "status": "complete"
}
```

---

## Orchestrator Checkpoint Management

### Checkpoint Modes

**1. Manual Mode** (User approves each phase)
```javascript
// Phase 1 completes
orchestrator.emit('phase-1-complete');
// ⏸️ WAIT for user approval

// User clicks "Approve Phase 1" in dashboard
POST /api/courses/spa_for_eng/approve-phase1
// ▶️ Orchestrator triggers Phase 3
```

**2. Gated Mode** (Auto-proceed with validation)
```javascript
// Phase 1 completes
orchestrator.emit('phase-1-complete');
// ✅ Auto-validate seed_pairs.json
if (validation.passed) {
  // ▶️ Auto-trigger Phase 3
  POST http://localhost:3458/start
} else {
  // ⏸️ HALT - notify user
  orchestrator.emit('validation-failed', { phase: 1, errors });
}
```

**3. Full Auto Mode** (No stops)
```javascript
// Phase 1 completes
// ▶️ Immediately trigger Phase 3
// Phase 3 completes
// ▶️ Immediately trigger Phase 5
// ... until Phase 8 complete
```

---

## File Structure After All Phases

```
public/vfs/courses/spa_for_eng/
├── seed_pairs.json                 ✅ Phase 1 output (~500KB)
├── lego_pairs.json                 ✅ Phase 3 output (~2MB)
├── lego_baskets.json               ✅ Phase 5 output (~5MB)
├── introductions.json              ✅ Phase 6 output (~500KB)
├── audio_manifest.json             ✅ Phase 8 output (~2MB)
│
├── phase1_outputs/                 ❌ .gitignored (deleted after merge)
├── phase3_outputs/                 ❌ .gitignored (deleted after merge)
├── phase5_scaffolds/               ❌ .gitignored (local only)
├── phase5_outputs/                 ❌ .gitignored (deleted after merge)
└── audio/                          ❌ .gitignored (uploaded to S3)
```

**Total committed to git**: ~10MB
- All essential phase outputs
- No intermediate/temporary files
- Audio files on S3

---

## API Endpoints Summary

### Orchestrator (`http://localhost:3456`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/courses` | GET | List all courses |
| `/api/courses/create` | POST | Create new course |
| `/api/courses/:code/start` | POST | Start course automation |
| `/api/courses/:code/status` | GET | Get course progress |
| `/api/courses/:code/approve-phase:N` | POST | Approve phase (manual mode) |
| `/api/courses/:code/files/:filename` | GET | Serve VFS files |
| `/phase-complete` | POST | Phase server reports completion |
| `/health` | GET | Health check |

### Phase 1 Server (`http://localhost:3457`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start` | POST | Start Phase 1 translation |
| `/status/:courseCode` | GET | Get Phase 1 progress |
| `/abort/:courseCode` | POST | Emergency stop |
| `/health` | GET | Health check |

### Phase 3 Server (`http://localhost:3458`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start` | POST | Start Phase 3 LEGO extraction |
| `/status/:courseCode` | GET | Get Phase 3 progress |
| `/abort/:courseCode` | POST | Emergency stop |
| `/health` | GET | Health check |

### Phase 5 Server (`http://localhost:3459`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start` | POST | Start Phase 5 basket generation |
| `/status/:courseCode` | GET | Get Phase 5 progress |
| `/abort/:courseCode` | POST | Emergency stop |
| `/health` | GET | Health check |

### Phase 6 Server (`http://localhost:3460`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start` | POST | Start Phase 6 introductions |
| `/status/:courseCode` | GET | Get Phase 6 progress |
| `/health` | GET | Health check |

### Phase 8 Server (`http://localhost:3461`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/start` | POST | Start Phase 8 audio generation |
| `/status/:courseCode` | GET | Get Phase 8 progress |
| `/health` | GET | Health check |

---

## Configuration System

### `automation.config.simple.json`

```json
{
  "phase1_translation": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10,
    "browser_spawn_delay_ms": 5000
  },
  "phase3_lego_extraction": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10,
    "browser_spawn_delay_ms": 5000,
    "collision_avoidance": {
      "auto_inject": true,
      "block_on_collision": true
    }
  },
  "phase5_basket_generation": {
    "browsers": 10,
    "agents_per_browser": 10,
    "seeds_per_agent": 10,
    "browser_spawn_delay_ms": 5000,
    "target_phrases_per_lego": 10
  },
  "orchestrator": {
    "checkpoint_mode": "gated"
  }
}
```

**Capacity Calculation** (for all phases):
```
capacity = browsers × agents_per_browser × seeds_per_agent
        = 10 × 10 × 10
        = 1000 seeds
```

**Dashboard Override**:
```javascript
// User sets custom values:
POST /api/courses/spa_for_eng/start-phase5
{
  "browserWindows": 20,       // Override config (20 instead of 10)
  "agentsPerWindow": 7,        // Override config (7 instead of 10)
  "seedsPerAgent": 5           // Override config (5 instead of 10)
}
// New capacity: 20 × 7 × 5 = 700 seeds
```

---

## Data Flow Diagram

```
User Input (Dashboard)
    │
    ├─► Orchestrator
    │       │
    │       ├─► Phase 1 Server
    │       │       │
    │       │       ├─► Spawn 10 Browser Windows
    │       │       │       │
    │       │       │       ├─► Each window spawns 10 Task agents
    │       │       │       │       │
    │       │       │       │       └─► Each agent translates 10 seeds
    │       │       │       │               │
    │       │       │       │               └─► Push to branch
    │       │       │       │
    │       │       │       └─► Branch watcher merges
    │       │       │               │
    │       │       └───────────────┴─► seed_pairs.json
    │       │
    │       ├─► Phase 3 Server
    │       │       │
    │       │       ├─► Spawn 10 Browser Windows
    │       │       │       │
    │       │       │       └─► Each extracts LEGOs
    │       │       │               │
    │       │       │               └─► Push to branch
    │       │       │
    │       │       └─► Branch watcher merges
    │       │               │
    │       │               ├─► lego_pairs.json
    │       │               │
    │       │               └─► Collision detection
    │       │                       │
    │       │                       └─► Re-extraction manifest (if needed)
    │       │
    │       ├─► Phase 5 Server
    │       │       │
    │       │       ├─► Generate scaffolds (668 files)
    │       │       │
    │       │       ├─► Spawn 10 Browser Windows
    │       │       │       │
    │       │       │       └─► Each generates baskets
    │       │       │               │
    │       │       │               └─► Push to branch
    │       │       │
    │       │       └─► Branch watcher merges
    │       │               │
    │       │               └─► lego_baskets.json
    │       │
    │       ├─► Phase 6 Server
    │       │       │
    │       │       └─► introductions.json
    │       │
    │       └─► Phase 8 Server
    │               │
    │               ├─► Generate 30,000 audio files
    │               │
    │               └─► audio_manifest.json
    │
    └─► Course Complete! 🎉
```

---

## Summary

**Total System Components**:
- 1 Orchestrator (coordinates everything)
- 5 Phase Servers (independent, parallelized)
- 1 Config System (shared configuration)
- Multiple branch watchers (auto-merge)
- Dashboard UI (user control)

**Key Features**:
- ✅ Fully modular (each phase is independent)
- ✅ Configurable parallelization per phase
- ✅ Dashboard control with real-time progress
- ✅ Checkpoint management (manual/gated/auto)
- ✅ Collision detection and re-extraction
- ✅ Clean git history (intermediate files .gitignored)
- ✅ Resume capability (check if phase complete)
- ✅ Health monitoring for all services

**Performance**:
- Spanish course (668 seeds, 2716 LEGOs):
  - Phase 1: ~20 minutes (10 browsers × 10 agents)
  - Phase 3: ~30 minutes (with collision detection)
  - Phase 5: ~40 minutes (basket generation)
  - Phase 6: ~5 minutes (introductions)
  - Phase 8: ~60 minutes (30,000 audio files)
  - **Total**: ~2.5 hours for complete course generation
