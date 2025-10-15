# DASHBOARD REQUIREMENTS
**Extracted from APML v7.0 Specification**
**Source:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

---

## OVERVIEW

This document extracts all dashboard requirements from the APML specification (lines 1288-1368) and API endpoints (lines 109-136). The APML file is the **Single Source of Truth** for all dashboard functionality.

---

## INTERFACE SECTION 1: Course Generation Pipeline

### Components Required
1. **CourseGeneration.vue** - Main generation interface
2. **ProcessOverview.vue** - Phase progress visualization
3. **TrainingPhase.vue** - Phase documentation and prompt display

### Functionality Requirements

#### TrainingPhase.vue - CRITICAL FEATURE
**APML Source:** Lines 1298-1303

**Must display ACTUAL prompts from registry:**
- Fetch from: `GET /api/registry/phase-prompts/:phase`
- Show **working reality** (not generic docs)
- Editable textarea allows prompt updates
- Updates POST to: `PUT /api/registry/phase-prompts/:phase`
- **Creates version history for every change**

**Purpose:** Enables prompt evolution by showing and editing the actual prompts used by Claude Code agents.

#### CourseGeneration.vue
**APML Source:** Lines 1305-1322

**User Flow:**
1. User selects languages + seed count
2. POST to `/api/courses/generate`
3. automation_server.cjs creates job
4. cascadePhases() reads PHASE_PROMPTS from registry
5. spawnPhaseAgent() via osascript
6. Claude Code receives actual working prompts
7. Outputs saved to VFS
8. Dashboard polls: `GET /api/courses/:code/status`
9. Displays results in real-time

**UI Requirements:**
- Language pair selection (target + known)
- Seed count input (default 574)
- Generate button triggers pipeline
- Real-time progress monitoring
- Phase-by-phase status display

#### ProcessOverview.vue
**Purpose:** Visual representation of the 8-phase pipeline

**Display Requirements:**
- Phase 0: Corpus Pre-Analysis
- Phase 1: Pedagogical Translation
- Phase 2: Corpus Intelligence
- Phase 3: LEGO Extraction
- Phase 3.5: Graph Construction (NEW in v7.0)
- Phase 4: Deduplication
- Phase 5: Pattern-Aware Baskets
- Phase 6: Introductions
- Compilation phase

---

## INTERFACE SECTION 2: Quality Review & Self-Healing

### Components Required
**APML Source:** Lines 1324-1335

1. **QualityDashboard.vue** - Overview and metrics
2. **SeedQualityReview.vue** - Individual seed review
3. **PromptEvolutionView.vue** - Prompt version history

### Functionality Requirements

**Quality System Purpose:**
- Visual review of all phase outputs
- Flag problematic seeds for regeneration
- Track prompt evolution over time
- **Self-healing:** automatic rerun of failed extractions

**Quality Dashboard Must Show:**
- Total seeds processed
- Flagged seeds count
- Average quality score
- Quality distribution (excellent/good/poor/critical)
- Attempt history summary

**Seed Review Must Support:**
- View translation + LEGOs for each seed
- View all extraction attempts with timestamps
- Flag/accept/reject individual attempts
- Trigger regeneration for specific seeds
- View quality issues (IRON RULE violations, low LEGO count, etc.)

**Prompt Evolution Must Track:**
- Version history of all phase prompts
- Success rate per prompt version
- Learned rules (committed + experimental)
- A/B testing results
- Rollback capability

---

## INTERFACE SECTION 3: Visualization & Editing

### Components Required
**APML Source:** Lines 1337-1354

1. **LegoVisualizer.vue** - Visual LEGO breakdown display
2. **SeedVisualizer.vue** - Seed pair visualization
3. **PhraseVisualizer.vue** - Phrase pattern visualization
4. **CourseEditor.vue** - Edit translations and LEGOs

### Edit Workflow - CRITICAL FEATURE
**APML Source:** Lines 1345-1354

**User edits translation in UI:**
1. User modifies translation text
2. PUT to `/api/courses/:code/translations/:uuid`
3. **Triggers regeneration of affected phases**
4. Phase 3+ re-run with updated translation
5. Dashboard shows updated results

**Purpose:** Enable surgical edits with automatic downstream regeneration via provenance tracking.

### Visualization Requirements

**LegoVisualizer.vue:**
- Display LEGO breakdown for any translation
- Show provenance (S{seed}L{position} format)
- Visualize LEGO boundaries
- Highlight IRON RULE compliance

**SeedVisualizer.vue:**
- Show seed pair (source + target)
- Display extracted LEGOs
- Show LEGO positions in context

**PhraseVisualizer.vue:**
- Visualize phrase patterns
- Show graph edges (Phase 3.5)
- Display adjacency relationships

**CourseEditor.vue:**
- Browse all translations
- Edit translation text
- View affected LEGOs/baskets (provenance)
- Trigger regeneration workflow

---

## INTERFACE SECTION 4: APML Specification & Docs

### Components Required
**APML Source:** Lines 1356-1367

1. **APMLSpec.vue** - Displays this specification
2. **Dashboard.vue** - Main navigation
3. **PROJECT-DASHBOARD.html** - Auto-generated from APML

### Self-Documentation Principle
**APML Source:** Lines 1363-1367

**Critical Requirements:**
- This APML file is the **Single Source of Truth**
- Dashboard components fetch from this specification
- Changes to APML regenerate documentation
- **No drift between docs and reality**

**APMLSpec.vue Must:**
- Display the complete APML specification
- Show phase definitions
- Display API endpoints
- Show current version
- Enable searching/filtering

---

## API ENDPOINTS REQUIRED

**APML Source:** Lines 109-136

### Core Endpoints

#### POST /api/courses/generate
- **Purpose:** Start complete course generation pipeline
- **Parameters:** `{ target, known, seeds }`
- **Returns:** `{ courseCode, status }`

#### GET /api/courses/:courseCode/status
- **Purpose:** Poll for generation progress
- **Returns:** `{ phase, progress, status }`

#### GET /api/courses/:courseCode
- **Purpose:** Get complete course data
- **Returns:** Course metadata and manifest

#### POST /api/courses/:code/seeds/regenerate
- **Purpose:** Regenerate specific seeds after edits
- **Parameters:** `{ seedIds }`

### Prompt Management Endpoints

#### GET /api/registry/phase-prompts/:phase
- **Purpose:** Fetch actual prompt for phase (from APML registry)
- **Returns:** `{ name, prompt, metadata }`

#### PUT /api/registry/phase-prompts/:phase
- **Purpose:** Update phase prompt (writes to APML registry)
- **Parameters:** `{ prompt, changelog }`
- **Effect:** Creates new version in prompt history

### Additional API Endpoints (from automation_server.cjs analysis)

The automation server implements many additional endpoints:

#### Quality & Regeneration
- `GET /api/courses/:code/quality` - Get quality report
- `GET /api/courses/:code/seeds/:seedId/review` - Detailed seed review
- `POST /api/courses/:code/seeds/regenerate` - Trigger regeneration
- `GET /api/courses/:code/regeneration/:jobId` - Check regeneration status
- `POST /api/courses/:code/seeds/:seedId/accept` - Accept seed
- `DELETE /api/courses/:code/seeds/:seedId` - Exclude seed

#### Prompt Evolution
- `GET /api/courses/:code/prompt-evolution` - Get evolution data
- `POST /api/courses/:code/experimental-rules` - Test experimental rules
- `POST /api/courses/:code/prompt-evolution/commit` - Commit learned rules

#### Prompt Management (Self-Improving DNA)
- `GET /api/prompts/:phase` - Fetch current prompt from APML
- `PUT /api/prompts/:phase` - Update prompt in APML + Git commit
- `GET /api/prompts/:phase/history` - Git history of prompt changes

#### Course Management
- `GET /api/courses` - List all available courses
- `GET /api/courses/:courseCode/provenance/:seedId` - Trace provenance
- `PUT /api/courses/:courseCode/translations/:uuid` - Update translation

---

## DATA FLOWS

### Course Generation Flow
**APML Source:** Lines 1305-1322

```
User Input (languages, seeds)
  ↓
POST /api/courses/generate
  ↓
automation_server.cjs creates job
  ↓
cascadePhases() reads PHASE_PROMPTS from registry
  ↓
spawnPhaseAgent() via osascript
  ↓
Claude Code receives actual working prompts
  ↓
Outputs saved to VFS
  ↓
Dashboard polls GET /api/courses/:code/status
  ↓
Real-time display of results
```

### Edit Propagation Flow
**APML Source:** Lines 1345-1354

```
User edits translation in UI
  ↓
PUT /api/courses/:code/translations/:uuid
  ↓
Triggers regeneration of affected phases
  ↓
Phase 3+ re-run with updated translation
  ↓
Dashboard shows updated results
```

---

## CRITICAL FEATURES SUMMARY

### 1. TrainingPhase.vue Displays ACTUAL Prompts
**APML Line 1298:** "CRITICAL_FEATURE: TrainingPhase.vue displays ACTUAL prompts from registry"

- Fetch from registry via API
- Show working reality (not docs)
- Editable with version history
- Single source of truth

### 2. Self-Healing Quality System
**APML Lines 1324-1335**

- Visual review of outputs
- Flag/regenerate problematic seeds
- Track prompt evolution
- Automatic rerun of failures

### 3. Edit Workflow with Regeneration
**APML Lines 1345-1354**

- Edit translations in UI
- Trigger downstream regeneration
- Provenance tracking enables surgical updates
- Dashboard shows updated results

### 4. APML as Single Source of Truth
**APML Lines 1363-1367**

- APML file is authoritative
- Dashboard fetches from specification
- Changes regenerate docs
- No docs/reality drift

---

## BATCH CONFIGURATION

**APML Source:** Lines 138-145

```
PHASE_1_TRANSLATION: 100 seeds per batch
PHASE_3_LEGO_DECOMPOSITION: 20 seeds per batch
PHASE_5_BASKETS: 20 LEGOs per batch
TOTAL_SEEDS: 668 (canonical SSi corpus)
```

---

## ARCHITECTURE NOTES

### VFS Structure
```
vfs/courses/{courseCode}/
  ├── amino_acids/
  │   ├── translations/
  │   ├── legos/
  │   ├── legos_deduplicated/
  │   ├── baskets/
  │   └── introductions/
  ├── phase_outputs/
  └── proteins/
```

### Communication Architecture
```
Dashboard (Vercel)
  ↓ (via ngrok tunnel)
automation_server.cjs (local port 3456)
  ↓ (via osascript)
Claude Code agents (Terminal)
  ↓
VFS storage
```

### Amino Acid Model
- **Translations** = amino acids (immutable)
- **LEGOs** = amino acids (immutable)
- **Baskets** = amino acids (immutable)
- **Manifest** = protein (compiled from amino acids)
- **Deterministic UUIDs** = content-based hashing
- **Provenance** = S{seed}L{position} format

---

## TECHNOLOGY STACK

**Frontend:**
- Vue 3 with Composition API
- Vue Router
- Tailwind CSS
- Axios for API calls

**Backend:**
- Express.js (automation_server.cjs)
- fs-extra for VFS management
- osascript for agent spawning
- Git for prompt version control

**Integration:**
- ngrok tunnel for Vercel → local server
- CORS enabled for Vercel domain
- Polling for status updates (2 second interval)

---

## SUMMARY

The dashboard must provide:

1. **Course Generation UI** - Select languages, start pipeline, monitor progress
2. **Quality Review System** - View/flag/regenerate seeds, track quality metrics
3. **Prompt Management** - View/edit/version actual working prompts
4. **Visualization Tools** - Display LEGOs, seeds, phrases, patterns
5. **Edit Workflow** - Edit translations with automatic regeneration
6. **APML Viewer** - Display specification as single source of truth

All functionality must align with the APML specification and use the documented API endpoints. The dashboard is the **human interface** to the SSi Course Production system.
