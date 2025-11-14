# SSi Course Production - Automation Phases Overview

## Quick Reference

| Phase | Name | Input | Output | Automation Method | Agents |
|-------|------|-------|--------|-------------------|--------|
| **1** | Pedagogical Translation | Source text | `seed_pairs.json` | Orchestrator → Agents | 1 orchestrator → N agents (1 agent per 20 seeds) |
| **2** | Collision Check | `seed_pairs.json` | Validation report | Script (manual) | None (validation script) |
| **3** | LEGO Extraction | `seed_pairs.json` | `lego_pairs.json` | Orchestrator → Agents | 7 segments × 10 agents = 70 agents |
| **4** | Batch Preparation | `lego_pairs.json` | `batches/*.json` | Script (automatic) | None (preprocessing) |
| **5** | Practice Baskets | `lego_pairs.json` | `lego_baskets.json` | Orchestrator → Agents | 7 segments × 10 agents = 70 agents |
| **5.5** | Deduplication | `lego_baskets.json` | Cleaned baskets | Script (automatic) | None (deduplication) |
| **6** | Introductions | `lego_pairs.json` | `introductions.json` | Script (automatic) | None (template-based) |
| **7** | Compilation | All phase outputs | `compilation.json` | Script (automatic) | None (manifest building) |
| **8** | Audio Generation | All text | Audio files | Background queue | None (TTS service) |

---

## Phase 1: Pedagogical Translation

### Purpose
Transform source text into pedagogically-sequenced translation pairs that introduce vocabulary gradually.

### Input
- Source text file or manual input
- Target language (e.g., Spanish)
- Known language (e.g., English)
- Seed range (e.g., S0001-S0668)

### Output
```json
{
  "translations": {
    "S0001": ["Quiero", "I want"],
    "S0002": ["Quiero un café", "I want a coffee"],
    ...
  }
}
```

### Automation Method
**Orchestrator + Parallel Agents** (Browser-based)

```
Phase 1 Orchestrator
    ↓
    Spawns N agents (1 agent per 20 seeds)
    ↓
    Each agent: Translates 20 seeds
    ↓
    Commits to git branch: claude/phase1-agent-XX
    ↓
    Orchestrator merges all branches
    ↓
    Creates seed_pairs.json
```

### Configuration
- **Orchestrator**: `public/docs/phase_intelligence/phase_1_orchestrator.md`
- **Agent prompt**: Generated dynamically with seed range
- **Parallel agents**: ⌈total_seeds ÷ 20⌉
- **Git branches**: `claude/phase1-agent-01`, `claude/phase1-agent-02`, etc.
- **Auto-merge**: Yes (if `GIT_AUTO_MERGE=true`)

### Trigger
```bash
# Dashboard UI
POST /api/courses/:courseCode/phase/1/orchestrate

# Or via automation server
POST /api/courses/generate
{
  "phaseSelection": "phase1",
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668
}
```

---

## Phase 2: Collision Check

### Purpose
Validate that translation pairs don't introduce vocabulary too early (vocabulary collision detection).

### Input
- `seed_pairs.json`

### Output
- Validation report (console output)
- Identifies problematic seed pairs

### Automation Method
**Manual Script Execution**

```bash
node public/docs/phase_intelligence/phase_2_collision_check.cjs public/vfs/courses/spa_for_eng
```

### Configuration
- **Script**: `public/docs/phase_intelligence/phase_2_collision_check.cjs`
- **No automation**: Must be run manually
- **No agents**: Pure validation logic

### Notes
- Currently manual validation step
- Should be run after Phase 1, before Phase 3
- Not integrated into full automation flow

---

## Phase 3: LEGO Extraction

### Purpose
Extract atomic language units (LEGOs) from translation pairs. LEGOs are minimal meaning-bearing units.

### Input
- `seed_pairs.json`

### Output
```json
{
  "seeds": [
    {
      "seed_id": "S0001",
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "lego": ["I want", "quiero"],
          "components": null
        }
      ]
    }
  ]
}
```

### Automation Method
**Orchestrator + Parallel Agents** (Browser-based)

#### For Large Courses (>100 seeds):
```
Phase 3 Orchestrator
    ↓
    Spawns 7 segment orchestrators (100 seeds each)
    ↓
    Each segment orchestrator spawns 10 agents (10 seeds/agent)
    ↓
    Total: 7 × 10 = 70 concurrent agents
    ↓
    Each agent commits to: claude/phase3-segment-X-agent-Y
    ↓
    Orchestrator merges all branches
    ↓
    Post-processing:
      - Deduplication
      - Reordering
      - Registry building
    ↓
    Creates lego_pairs.json
```

#### For Small Courses (≤100 seeds):
```
Phase 3 Orchestrator
    ↓
    Spawns 10 agents (10 seeds each)
    ↓
    Each agent commits to: claude/phase3-agent-XX
    ↓
    Orchestrator merges all branches
    ↓
    Post-processing scripts
    ↓
    Creates lego_pairs.json
```

### Configuration
- **Orchestrator**: `public/docs/phase_intelligence/phase_3_orchestrator.md`
- **Agent intelligence**: `public/docs/phase_intelligence/phase_3_lego_pairs_v7.md`
- **Segment size**: 100 seeds
- **Agents per segment**: 10
- **Seeds per agent**: 10
- **Git branches**: `claude/phase3-segment-1-agent-01`, etc.
- **Auto-merge**: Yes

### Post-Processing Scripts
After agents complete:
1. `scripts/phase3_deduplicate_legos.cjs` - Remove duplicate LEGOs
2. `scripts/phase3_reorder_legos.cjs` - Reorder by frequency
3. `scripts/phase3_build_lego_registry.cjs` - Build LEGO index

### Trigger
```bash
# Dashboard UI
POST /api/courses/:courseCode/phase/3

# Or full generation
POST /api/courses/generate
{
  "phaseSelection": "phase3",
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668
}
```

---

## Phase 4: Batch Preparation

### Purpose
Prepare batches for Phase 5 basket generation. Groups LEGOs and marks which should generate practice baskets.

### Input
- `lego_pairs.json`

### Output
- `batches/batch_1.json`, `batch_2.json`, etc.
- Each batch contains LEGO metadata with `"generate": true/false`

### Automation Method
**Automatic Script** (runs before Phase 5)

```javascript
// Called automatically by Phase 5 orchestrator
const { preparePhase5Scaffolds } = require('./scripts/phase5_prep_scaffolds.cjs');
await preparePhase5Scaffolds(courseDir);
```

### Configuration
- **Script**: `scripts/phase5_prep_scaffolds.cjs`
- **No agents**: Pure data transformation
- **Auto-run**: Yes (before Phase 5)

### Notes
- Not a separate phase in the UI
- Automatically runs as prerequisite to Phase 5
- Deduplicates LEGOs and marks which need baskets

---

## Phase 5: Practice Basket Generation

### Purpose
Generate practice phrases for each LEGO. Practice phrases use the LEGO in different contexts with varying complexity.

### Input
- `lego_pairs.json`
- `batches/*.json` (from Phase 4)

### Output
```json
{
  "baskets": {
    "S0001L01": {
      "lego": ["I want", "quiero"],
      "type": "A",
      "practice_phrases": [
        ["I want", "Quiero", null, 1],
        ["I want a coffee", "Quiero un café", null, 3],
        ["I want to go to the park", "Quiero ir al parque", null, 5]
      ],
      "phrase_distribution": {
        "really_short_1_2": 5,
        "quite_short_3": 3,
        "longer_4_5": 4,
        "long_6_plus": 8
      }
    }
  }
}
```

### Automation Method
**Orchestrator + Parallel Agents** (Browser-based)

#### For Large Courses (>100 seeds):
```
Phase 5 Orchestrator
    ↓
    Spawns 7 segment orchestrators (100 seeds each)
    ↓
    Each segment orchestrator spawns 10 agents (10 seeds/agent)
    ↓
    Total: 7 × 10 = 70 concurrent agents
    ↓
    Each agent commits to: claude/phase5-segment-X-agent-Y
    ↓
    Orchestrator merges all branches
    ↓
    Creates lego_baskets.json
```

### Configuration
- **Orchestrator**: `public/docs/phase_intelligence/phase_5_orchestrator.md`
- **Agent intelligence**: `public/docs/phase_intelligence/phase_5_lego_baskets.md`
- **Segment size**: 100 seeds
- **Agents per segment**: 10
- **Seeds per agent**: 10
- **Git branches**: `claude/phase5-segment-1-agent-01`, etc.
- **Auto-merge**: Yes

### Quality Gates
Each basket must meet:
- **Phrase distribution**: Mix of short (1-2 LEGOs), medium (3-4), and conversational (5+)
- **Decontextualization**: Each phrase uses LEGO independently
- **Overlap control**: Available previous LEGOs used appropriately
- **No vocabulary jumps**: Only use LEGOs introduced in previous seeds

### Trigger
```bash
# Dashboard UI
POST /api/courses/:courseCode/phase/5

# Or full generation
POST /api/courses/generate
{
  "phaseSelection": "phase5",
  "target": "spa",
  "known": "eng"
}
```

---

## Phase 5.5: Basket Deduplication & Grammar Review

### Purpose
Clean up generated baskets by removing duplicates and optionally reviewing grammar for first 100 seeds.

### Input
- `lego_baskets.json`

### Output
- Cleaned `lego_baskets.json` (deduplicated)
- Grammar review report (optional)

### Automation Method
**Scripts** (manual or automatic)

#### Deduplication:
```bash
node scripts/phase5.5_deduplicate_baskets.cjs public/vfs/courses/spa_for_eng
```

#### Grammar Review (Seeds 1-100 only):
```bash
node scripts/phase5.5_grammar_review.cjs public/vfs/courses/spa_for_eng
```

### Configuration
- **Dedup script**: `scripts/phase5.5_deduplicate_baskets.cjs`
- **Grammar script**: `scripts/phase5.5_grammar_review.cjs`
- **No agents**: Pure data processing
- **Manual**: Must be triggered explicitly

### Notes
- Phase 5.5 is optional quality improvement
- Deduplication removes identical practice phrases
- Grammar review only for first 100 seeds (most important for learner experience)

---

## Phase 6: Introduction Generation

### Purpose
Generate LEGO introductions - natural language explanations of how to use each LEGO.

### Input
- `lego_pairs.json`

### Output
```json
{
  "presentations": {
    "S0001L01": {
      "text": "Use 'quiero' (I want) to express desire. It's a fundamental building block that can be used alone or combined with other words.",
      "audio": null
    }
  }
}
```

### Automation Method
**Automatic Script** (Template-based generation)

```javascript
const { generateIntroductions } = require('./scripts/phase6-generate-introductions.cjs');
await generateIntroductions(courseDir);
```

The script uses template-based rules to generate natural language introductions:
- **BASE LEGOs (type: B)**: "Now, the Spanish for 'I want' as in '{seed}' is 'quiero', quiero."
- **COMPOSITE LEGOs (type: C)**: Detailed breakdown with component explanations

### Configuration
- **Script**: `scripts/phase6-generate-introductions.cjs`
- **Intelligence**: `public/docs/phase_intelligence/phase_6_introductions.md`
- **No agents**: Template-based text generation
- **Auto-run**: Yes (after Phase 5 in full automation flow)

### Trigger
```bash
# Dashboard UI
POST /api/courses/:courseCode/phase/6

# Or full generation (as part of all phases)
POST /api/courses/generate
```

---

## Phase 7: Course Compilation

### Purpose
Compile all phase outputs into a single course manifest file for deployment.

### Input
- `seed_pairs.json`
- `lego_pairs.json`
- `lego_baskets.json`
- `introductions.json`

### Output
```json
{
  "course_code": "spa_for_eng",
  "version": "7.7",
  "total_seeds": 668,
  "total_legos": 2487,
  "total_baskets": 2487,
  "generated_at": "2025-11-14T...",
  "seeds": [ ... ],
  "legos": [ ... ],
  "baskets": [ ... ],
  "introductions": [ ... ]
}
```

### Automation Method
**Automatic Script** (runs after all phases complete)

```javascript
// Called automatically by orchestrator
const { compileCourseLegacy } = require('./scripts/phase7_compile_course.cjs');
await compileCourseLegacy(courseDir);
```

### Configuration
- **Script**: `scripts/phase7_compile_course.cjs`
- **No agents**: Pure data aggregation
- **Auto-run**: Yes (after Phase 6)

### Trigger
Runs automatically when full course generation completes, or:
```bash
POST /api/courses/:courseCode/phase/7
```

---

## Phase 8: Audio Generation

### Purpose
Generate audio files for all phrases in the course using text-to-speech.

### Input
- `compilation.json` (or individual phase outputs)

### Output
- Audio files in S3: `s3://bucket/courses/spa_for_eng/audio/S0001L01_target.mp3`
- Local cache: `public/vfs/courses/spa_for_eng/audio/`

### Automation Method
**Background Queue** (asynchronous processing)

```
Audio Generation Queue
    ↓
    For each phrase:
      - Check if audio exists (S3 or local cache)
      - If not: Generate via TTS service
      - Upload to S3
      - Update local cache
    ↓
    Progress tracked in STATE.audioJobs
```

### Configuration
- **TTS Service**: `services/tts-service.cjs`
- **S3 Service**: `services/s3-audio-service.cjs`
- **Intelligence**: `public/docs/phase_intelligence/phase_8_audio_generation.md`
- **Provider**: ElevenLabs (primary) or Azure TTS (fallback)
- **No agents**: API-based service calls

### Trigger
```bash
# Generate all missing audio
POST /api/audio/generate-missing
{
  "courseCode": "spa_for_eng"
}

# Generate specific phrase
POST /api/audio/generate
{
  "text": "Quiero un café",
  "language": "es",
  "courseCode": "spa_for_eng"
}
```

### Status Check
```bash
GET /api/audio/status/:courseCode
```

---

## Full Automation Flow

### Option 1: All Phases Sequential
```bash
POST /api/courses/generate
{
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668,
  "executionMode": "web",
  "phaseSelection": "all"
}
```

**Flow:**
```
Phase 1: Translation (Orchestrator + Agents)
    ↓
Phase 2: Collision Check (Manual - skipped in automation)
    ↓
Phase 3: LEGO Extraction (Orchestrator + Agents)
    ↓ Post-processing (dedupe, reorder, registry)
    ↓
Phase 4: Batch Prep (Automatic script)
    ↓
Phase 5: Practice Baskets (Orchestrator + Agents)
    ↓
Phase 6: Introductions (Single Agent)
    ↓
Phase 7: Compilation (Automatic script)
    ↓
Phase 8: Audio Generation (Background queue)
```

### Option 2: Individual Phase
```bash
POST /api/courses/:courseCode/phase/3
```

Runs only Phase 3 with all its orchestration and post-processing.

### Option 3: Staged Segments (For Large Courses)
```bash
POST /api/courses/generate
{
  "target": "spa",
  "known": "eng",
  "startSeed": 1,
  "endSeed": 668,
  "executionMode": "web",
  "phaseSelection": "phase3",
  "segmentMode": "staged"
}
```

Spawns multiple segment orchestrators in parallel for faster processing.

---

## Checkpoint Modes

Control automation behavior with `CHECKPOINT_MODE` in `.env.automation`:

### `manual` (Default)
- Pauses between phases
- Requires user approval to continue
- Safest for testing

### `gated`
- Auto-runs phases
- Pauses if validation fails
- Checks quality thresholds

### `full`
- Full automation, no stops
- Use only after validation
- For production after testing

---

## Git Workflow

### Branch Naming
- Phase 1: `claude/phase1-agent-01`, `claude/phase1-agent-02`, ...
- Phase 3: `claude/phase3-segment-1-agent-01`, `claude/phase3-segment-2-agent-01`, ...
- Phase 5: `claude/phase5-segment-1-agent-01`, `claude/phase5-segment-2-agent-01`, ...
- Phase 6: `claude/phase6-introductions`

### Auto-Merge
If `GIT_AUTO_MERGE=true` in `.env.automation`:
- Orchestrator polls for new branches
- Detects branches created after job start time
- Merges to main automatically
- Deletes merged branches

### Manual Merge
If `GIT_AUTO_MERGE=false`:
- Branches remain after generation
- Must manually merge: `git merge claude/phase3-segment-1-agent-01`
- Safer but requires intervention

---

## Monitoring

### PM2 Logs
```bash
pm2 logs ssi-automation
```

### Job Status
```bash
GET /api/courses/:courseCode/status
```

Returns:
```json
{
  "courseCode": "spa_for_eng",
  "status": "in_progress",
  "phase": "phase_5",
  "progress": 70,
  "events": [
    {"type": "window_opening", "window": 1, "timestamp": "..."},
    {"type": "git_branch_detected", "branch": "claude/phase5-...", "timestamp": "..."}
  ]
}
```

### Progress Monitor UI
Dashboard shows real-time progress:
- Active phase
- Git activity
- Window spawning
- Merge events

---

## Scripts Reference

| Script | Purpose | Phase | Trigger |
|--------|---------|-------|---------|
| `phase5_prep_scaffolds.cjs` | Prepare Phase 5 batches | 4 | Auto before Phase 5 |
| `phase3_deduplicate_legos.cjs` | Remove duplicate LEGOs | 3 | Auto after Phase 3 agents |
| `phase3_reorder_legos.cjs` | Reorder LEGOs by frequency | 3 | Auto after dedup |
| `phase3_build_lego_registry.cjs` | Build LEGO index | 3 | Auto after reorder |
| `phase5.5_deduplicate_baskets.cjs` | Remove duplicate baskets | 5.5 | Manual |
| `phase5.5_grammar_review.cjs` | Grammar check (S1-100) | 5.5 | Manual |
| `phase7_compile_course.cjs` | Compile manifest | 7 | Auto after Phase 6 |
| `fix-component-infinitives.cjs` | Fix infinitive translations | Post-3 | Manual |
| `fix-basket-infinitives.cjs` | Fix infinitives in baskets | Post-5 | Manual |
| `merge_phase5_to_lego_baskets.cjs` | Merge phase5_outputs | Post-5 | Manual |

---

## Common Workflows

### Generate Full Course
```bash
pm2 start ecosystem.config.js  # Start automation server
ngrok http --domain=YOUR-DOMAIN.ngrok-free.dev 3456  # Start tunnel

# Then from dashboard UI:
# Click "Generate Course" → Configure → Start
```

### Re-run Single Phase
```bash
# From dashboard UI, click phase button
# Or via API:
curl -X POST http://localhost:3456/api/courses/spa_for_eng/phase/5
```

### Fix Quality Issues
```bash
# Check Phase 3 LEGOs
node scripts/validate_lego_pairs.cjs public/vfs/courses/spa_for_eng

# Fix infinitives in LEGOs
node scripts/fix-component-infinitives.cjs public/vfs/courses/spa_for_eng

# Fix infinitives in baskets
node scripts/fix-basket-infinitives.cjs public/vfs/courses/spa_for_eng

# Deduplicate baskets
node scripts/phase5.5_deduplicate_baskets.cjs public/vfs/courses/spa_for_eng
```

### Deploy to Production
```bash
# Ensure all phases complete
# Check git status - all changes should be on main
git status

# Push to GitHub (triggers Vercel deployment)
git push origin main

# Vercel auto-deploys to: https://ssi-dashboard-v7.vercel.app
```

---

## See Also

- **FULL_SETUP_GUIDE.md** - Complete setup instructions
- **AUTOMATION_SETUP.md** - Configuration system
- **public/docs/phase_intelligence/** - Individual phase documentation
- **ecosystem.config.js** - PM2 configuration
