# Phase Intelligence Modules

**Purpose**: Modular, publishable methodology documents for each course generation phase.

**SSoT Architecture**:
- Dashboard reads these modules and serves them to agents at runtime
- Agents read from dashboard API (`GET /phase-intelligence/:phase`)
- Each module is versioned and can be updated independently
- Dashboard always serves the latest published version

---

## Naming Convention

**Pattern**: `phase_[N]_[OUTPUT_FILE_NAME].md`

Each module is named after the **output file** it teaches agents to generate:
- Phase 1 → `phase_1_seed_pairs.md` (teaches seed_pairs.json generation)
- Phase 3 → `phase_3_lego_pairs.md` (teaches lego_pairs.json generation)
- Phase 5 → `phase_5_lego_baskets.md` (teaches lego_baskets.json generation)

**Benefits**:
- ✅ Instant clarity: module name = output name
- ✅ Schema alignment: easy to find which doc explains which output
- ✅ Discoverable: no confusion between extraction/decomposition/generation

---

## Module Structure

Each phase intelligence module contains:
1. **Version & Status** - Tracking evolution of methodology
2. **Task** - What this phase generates
3. **Input/Output** - File locations and formats
4. **Core Principles** - Fundamental rules and heuristics
5. **Patterns & Examples** - Language-specific applications
6. **Validation Checklist** - Quality assurance rules
7. **Anti-patterns** - Common mistakes to avoid (where applicable)
8. **Version History** - What changed and why

---

## System Architecture

For a complete overview of the course generation pipeline and canonical content system, see:

**📖 [Course Generation Architecture](./COURSE_GENERATION_ARCHITECTURE.md)** - Complete pipeline overview
**📖 [Canonical Content System](./CANONICAL_CONTENT.md)** - 3-parameter input model details

### Key Documents

**Course Generation Architecture:**
- 3-parameter input model (target, known, canonical content)
- Microservices architecture and phase servers
- Full pipeline flow: Phase 1 → 3 (includes 6) → 5 → 7 → 8
- Phase orchestration and coordination

**Canonical Content System:**
- canonical_seeds.json (668 language-agnostic seeds)
- encouragements.json (pooled + ordered motivational content)
- welcomes.json (course introduction templates)
- Single source of truth for all language courses

---

## Available Modules (Locked Intelligence - SSoT)

### Phase 1: Pedagogical Translation → seed_pairs.json
**File**: `phase_1_seed_pairs.md`
**Version**: 2.6 🔒 **LOCKED** (2025-10-28)
**Status**: ✅ **ACTIVE**
**Output**: `seed_pairs.json`

**Focus**:
- **TWO ABSOLUTE RULES**: (1) Never change canonical meaning, (2) Strongly prefer cognates
- **Synonym flexibility**: Canonical known can say "often" while target uses cognate "frecuentemente"
- Examples over precepts (Spanish, French, Mandarin thinking patterns)
- Use canonical English directly when English is target OR known (no back-translation)
- Balance principle: Cognate transparency vs known language smoothness
- Zero-variation principle ("First Word Wins")
- Progressive heuristic curve (seeds 1-100, 101-300, 301-668)

**Latest updates (v2.6)**:
- **Synonym flexibility principle**: Documented how literal componentization teaches synonym relationships
- Canonical naturalness ("often") + cognate transparency ("frecuentemente") → learner bridges "often = frequently"
- No need to force exact word matches between known and target

**Previous versions**:
- v2.5: "Learning by Example" section with multi-language thinking
- v2.4: TWO ABSOLUTE RULES section
- v2.3: English handling fix (use canonical directly)
- v2.2: Generation-focused (validation in Phase 1.5)
- v2.1: Extended Thinking requirement, cognate preference
- v1.0: Initial extraction from APML PHASE_PROMPTS.PHASE_1

---

### Phase 2: Corpus Intelligence → corpus_intelligence.json
**File**: `phase_2_corpus_intelligence.md`
**Version**: 1.0
**Status**: ⚠️ **NEEDS UPDATE** (not currently in use for v7.0 workflow)
**Output**: `phase_2_corpus_intelligence.json`

**Focus**:
- FCFS (First-Can-First-Say) semantic priority
- Utility scoring formula
- Concept ownership mapping
- Dependency tracking

**Note**: Phase 2 not currently invoked in locked workflow. Phases 1 → 3 → 5 active.

---

### Phase 3: LEGO Extraction + Introduction Generation → lego_pairs.json, introductions.json
**File**: `phase_3_lego_pairs.md`
**Version**: 7.1 🔒 **LOCKED** (2025-11-20)
**Status**: ✅ **ACTIVE** (includes Phase 6 integration)
**Outputs**: `lego_pairs.json` AND `introductions.json`

**Focus**:
- **TWO CORE HEURISTICS**: (1) Remove learner uncertainty, (2) Maximize patterns with minimum vocab
- Forward + backward sweep methodology (catches grammatical triggers)
- A-type (atomic) vs M-type (molecular) LEGOs with components
- Overlapping chains for maximum recombination power
- Functional Determinism compliance (zero standalone pronouns/articles/particles)
- **INCLUDES PHASE 6**: Introduction generation runs automatically after LEGO extraction (<1s overhead)

**Latest updates (v7.1)**:
- **Phase 6 integration**: Introduction generation now built into Phase 3 server
- Dual output: `lego_pairs.json` + `introductions.json` (single phase completion)
- Examples-first edition (Spanish, Chinese patterns)
- Language-agnostic methodology
- Overlapping LEGOs permitted when pedagogically valuable

**Previous versions**:
- v7.0: Examples-first edition, overlaps permitted
- v6.3: Pragmatic FD heuristic
- v3.4: Strengthened STEP 4 - literal componentization rule
- v3.3: TILING FIRST principle, isolated seed decomposition
- v1.0: Initial extraction from APML

---

### Phase 3.5: Graph Construction → lego_graph.json
**File**: `phase_3.5_lego_graph.md`
**Version**: 1.0
**Status**: ⚠️ **NEEDS UPDATE** (not currently in use for v7.0 workflow)
**Output**: `phase_3.5_lego_graph.json`

**Focus**:
- Adjacency pattern detection
- Directed graph construction
- Edge weight calculation (frequency × pedagogical value)
- Graph validation (connectivity, cycles)

**Note**: Graph construction not currently invoked. Basket generation goes directly from Phase 3 → Phase 5.

---

### Phase 4: Batch Preparation with Smart Deduplication → batches/*.json
**File**: `phase_4_batch_preparation.md`
**Version**: 1.0 (2025-10-29)
**Status**: ⚠️ **DEPRECATED** (not used in Web orchestrator)
**Output**: `batches/batch_*.json`, `batches/manifest.json`

**Note**: This phase was designed for API-based orchestration but is NOT used in the current Web orchestrator workflow. Deduplication is handled more elegantly by Phase 3's `"new": true` flag + Phase 5 prep script filtering.

**Why deprecated**:
- Web orchestrator goes directly: Phase 1 → Phase 3 → Phase 5
- Phase 3 merge script marks duplicates with `"new": null`
- Phase 5 prep script only scaffolds LEGOs with `"new": true`
- Achieves same deduplication without separate batching step
- Script exists (`phase4-prepare-batches.cjs`) but only used in old API workflow

**Original design** (for reference):
- Smart deduplication: Generate only FIRST occurrences
- Identify duplicate LEGOs (same target + known, normalized)
- Keep ALL LEGOs in vocabulary context (preserves recency bias)
- Prepare balanced batches for parallel Phase 5 execution
- Time savings: ~36% (1-2 hours for Spanish course)

---

### Phase 5: Basket Generation → lego_baskets.json
**File**: `phase_5_lego_baskets.md`
**Version**: 3.0 🔒 **LOCKED** (2025-10-29)
**Status**: ✅ **ACTIVE**
**Output**: `lego_baskets.json`

**Focus**:
- **Simplified workflow**: Generate E-phrases → Extract D-phrases → Output
- **E-phrases (eternal)**: Natural sentences for spaced repetition (3-5 per basket)
- **D-phrases (debut)**: Mechanically extracted fragments (2-5 LEGO windows)
- **GATE constraint**: LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1) - ABSOLUTE
- **Grammar perfection**: Both languages, 100% compliance
- **Recency bias**: 30-50% vocabulary from last 10 seeds (for LEGOs #50+)
- **Culminating LEGOs**: E-phrase #1 MUST be complete seed sentence

**Latest updates (v3.0)**:
- Radical simplification: 778 lines → 318 lines
- Removed: Batch-aware edge targeting, pattern density targets, two-stage selection
- D-phrases are mechanically extracted from e-phrases (no independent generation)
- Focus on essentials: GATE + Grammar + Recency bias
- Trust the agent to make good phrases

**Previous versions**:
- v2.2: Batch-aware edge targeting with pattern density (removed in v3.0)
- v2.1: Generation-focused, removed validation loops
- v2.0: Vocabulary constraint as absolute gate
- v1.0: Initial extraction from APML PHASE_PROMPTS.PHASE_5

---

### Phase 5.5: Basket Deduplication → lego_pairs_deduplicated.json, lego_baskets_deduplicated.json
**File**: `phase_5.5_basket_deduplication.md`
**Version**: 2.0
**Status**: ⚠️ **OBSOLETE** (replaced by Phase 4 smart deduplication)
**Output**: `lego_pairs_deduplicated.json`, `lego_baskets_deduplicated.json`

**Note**: This post-generation deduplication phase is OBSOLETE. Deduplication now happens in Phase 3 merge script (marks duplicates with `"new": null`) and Phase 5 prep script (only scaffolds `"new": true` LEGOs). Phase 5.5 kept for reference only.

**Why obsolete**:
- Phase 3 merge script marks duplicates during LEGO extraction
- Phase 5 prep script filters to only new LEGOs (achieves same time savings)
- No separate deduplication step needed
- Simpler architecture: Phase 1 → 3 → 5 (no intermediate batching)

**Old focus** (for reference):
- Character-identical deduplication (trim + lowercase, preserve punctuation)
- First occurrence wins (by chronological order in seed sequence)
- Script: `scripts/phase5.5-deduplicate-baskets.cjs`

---

### Phase 6: Introduction Generation → introductions.json
**File**: `phase_6_introductions.md`
**Version**: 2.1 🔒 **LOCKED** (2025-11-20)
**Status**: 🔗 **INTEGRATED INTO PHASE 3** (not a separate service)
**Output**: `introductions.json` (generated by Phase 3 server)

**Focus**:
- Reading literal component arrays from Phase 3 LEGOs
- Generating natural language presentations with pedagogical transparency
- Seed context requirement ("as in...")
- Two types: BASE (simple) and COMPOSITE (component breakdown)
- Component wording: "means" (not "is")
- Reveals target language construction patterns

**Latest updates (v2.1)**:
- **Execution model change**: Integrated into Phase 3 server (no longer separate service)
- Runs automatically after LEGO extraction (<1s overhead)
- Simplifies pipeline: No parallel coordination needed
- Output unchanged: Still generates `introductions.json` in same format

**Previous versions**:
- v2.0: Simplified to BASE/COMPOSITE only (removed FEEDER)
- v1.0: Initial implementation with three types (BASE/FEEDER/COMPOSITE)

---

### Phase 7: Course Manifest Compilation → course_manifest.json
**File**: `phase_7_compilation.md`
**Version**: 1.1 🔒 **LOCKED** (2025-11-20)
**Status**: ✅ **ACTIVE**
**Output**: `course_manifest.json`

**Focus**:
- Compiling v7.7 format to legacy app manifest
- Deterministic UUID generation (SSi legacy format)
- Single slice architecture
- Comprehensive audio sample registration
- **Top-level introduction field** with placeholders for Phase 8
- **Duration fields** in all samples (placeholder: 0)

**Latest updates (v1.1)**:
- Added top-level `introduction` field (placeholder for welcome audio)
- Added `duration` field to all audio samples (placeholder: 0)
- Field ordering matches Italian course reference format
- Placeholders populated by Phase 8 (audio generation)

**Previous versions**:
- v1.0: Initial implementation (2025-10-23)

---

### Phase 8: Audio Generation → audio/*.mp3 (S3)
**File**: `phase_8_audio_generation.md`
**Version**: 1.1 (2025-11-20)
**Status**: ✅ **DOCUMENTED** → 🔧 **ASSIGNED TO KAI** (separate branch)
**Outputs**:
- MP3 audio files uploaded to S3
- Duration field population in course manifest (optional)
**Branch**: `feature/phase8-audio-generation`

**Focus**:
- Manifest-driven generation (reads course_manifest.json samples object)
- UUID-based filenames (deterministic from Phase 7)
- ElevenLabs TTS API integration
- Role-voice mapping (target1/target2/source)
- S3 upload with correct path structure
- **Optional duration measurement and manifest update**
- **Welcome audio generation** (top-level introduction field)
- Progress tracking and error handling

**Latest updates (v1.1)**:
- Duration field population (optional)
- Top-level introduction (welcome audio) handling
- Updated sample structure with `duration` field
- Aligned with Phase 7 v1.1 manifest format

**Key Principle**: Phase 8 does NOT read individual files (seed_pairs, lego_pairs, etc) or generate manifests. It ONLY reads the samples object from course_manifest.json and generates audio files with UUID filenames.

**Requirements**:
- ElevenLabs API key
- AWS S3 credentials
- Voice IDs for each language (target: 2 voices, source: 1 voice)

**Test Course**: ita_for_eng_10seeds → 1,681 audio files
**Full Course**: ita_for_eng_668seeds → ~110,000 audio files

**Assigned to**: Kai (parallel work, no conflicts with main branch)

---

## Locked Intelligence Status

**Active Workflow (Web Orchestrator)**: Phase 1 → 3 (includes 6) → 5 → 7 → 8

**Output Pipeline**:
- Phase 1: `seed_pairs.json` (pedagogical translations)
- Phase 3: `lego_pairs.json` + `introductions.json` (LEGO extraction + introduction generation)
- Phase 5: `baskets/lego_baskets_s*.json` (practice phrases)
- Phase 7: `course_manifest.json` (legacy format with placeholders)
- Phase 8: `audio/*.mp3` + duration population (TTS generation)

**Note**: Phase 6 (introduction generation) is integrated into Phase 3 and runs automatically after LEGO extraction (<1s overhead).

| Phase | Status | File | Version | Locked | Notes |
|-------|--------|------|---------|--------|-------|
| 1 | ✅ ACTIVE | phase_1_seed_pairs.md | 2.6 | 🔒 | Examples over precepts, English handling |
| 2 | ⚠️ Inactive | phase_2_corpus_intelligence.md | 1.0 | - | Not in current workflow |
| 3 | ✅ ACTIVE | phase_3_lego_pairs.md | 7.1 | 🔒 | Includes Phase 6 integration, dual output |
| 3.5 | ⚠️ Inactive | phase_3.5_lego_graph.md | 1.0 | - | Not in current workflow |
| 4 | ⚠️ Deprecated | phase_4_batch_preparation.md | 1.0 | - | Web orchestrator uses Phase 3 "new" flag instead |
| 5 | ✅ ACTIVE | phase_5_lego_baskets.md | 5.0 | 🔒 | 3-category whitelist, staged pipeline |
| 5.5 | ⚠️ Obsolete | phase_5.5_basket_deduplication.md | 2.0 | - | Replaced by Phase 3 merge deduplication |
| 6 | 🔗 INTEGRATED | phase_6_introductions.md | 2.1 | 🔒 | Built into Phase 3 server (<1s overhead) |
| 7 | ✅ ACTIVE | phase_7_compilation.md | 1.1 | 🔒 | Manifest format v1.1 with placeholders |
| 8 | 📋 Documented | phase_8_audio_generation.md | 1.1 | - | Assigned to Kai, duration population |

**Locked versions** (🔒) represent tested, production-ready intelligence serving as SSoT for course generation.

---

## Usage Pattern

### Development Workflow
1. Discover new intelligence during hands-on work
2. Update relevant phase module immediately
3. Bump version number in module header
4. Commit to version control
5. Restart automation server (loads new modules)

### Runtime Workflow
1. Agent triggered from dashboard
2. Agent fetches: `GET /phase-intelligence/:phase`
3. Dashboard serves latest module (raw markdown)
4. Agent applies methodology
5. Results validated against intelligence rules

---

## Update Workflow

**Simple 3-step process**:

```bash
# 1. Edit module
vim docs/phase_intelligence/phase_3_lego_pairs.md
# Bump version, add new intelligence

# 2. Commit
git commit -m "Phase 3 v2.1: Add composability scoring examples"

# 3. Restart server
pm2 restart automation-server
# OR: kill <pid> && node automation_server.cjs

# Done - next agent run gets v2.1 methodology
```

---

## API Access

### For Agents (Runtime)
```javascript
// Current endpoint (served from automation_server.cjs)
const response = await fetch('http://localhost:3456/api/prompts/3')
const data = await response.json()
const methodology = data.prompt  // Raw markdown from phase_3_lego_pairs.md
const version = data.version     // e.g., "7.0.1"
const phase = data.phase         // e.g., "3"
```

**Available phases**: 1, 3, 5 (locked intelligence)

### For Humans (Dashboard UI)
Visit: `https://ssi-dashboard-v7.vercel.app/intelligence` (planned)
- Select phase from tabs
- View rendered methodology
- Check version and status

**Current access**: Via ngrok tunnel to local automation server
- `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/api/prompts/:phase`

---

## Why Modular Intelligence?

**Problem**: APML registry grew too large (60k+ lines) to edit atomically

**Solution**: Break intelligence into publishable modules

**Benefits**:
1. ✅ Incremental updates (edit one phase at a time)
2. ✅ Version tracking (know what changed when)
3. ✅ Dashboard SSoT (agents always read latest)
4. ✅ Independent evolution (Phase 3 updates don't affect Phase 5)
5. ✅ Easier review (focused, single-concern documents)
6. ✅ Git history per phase (clear evolution tracking)

**Principle**: Capture intelligence the moment we discover it, publish immediately to runtime SSoT.

---

## Version Control

Each module maintains its own version history:

```markdown
## Version History

**v2.0 (2025-10-23)**:
- Added minimum reusable unit principle
- Clarified preposition wrapping rule
- Documented multiple composites strategy

**v1.0 (2025-10-15)**:
- Initial extraction rules
- FD compliance focus
```

This allows:
- Tracking methodology evolution per phase
- Comparing versions (git diff)
- Rolling back if needed
- Understanding why rules changed

---

## Cloud-Native Architecture

**See**: `docs/CLOUD_NATIVE_DASHBOARD_ARCHITECTURE.md`

The entire system is designed to be cloud-native:
- **Dashboard + S3 = SSoT** (no local files)
- **VFS API endpoints** (all file operations through REST)
- **Phase intelligence** served from docs/ (static files)
- **Course data** served from S3 (cloud storage)
- **Audio files** stored in S3 (public access)

**Vision**: "The dashboard is everything" - a single published URL containing everything for both humans AND agents. Claude Code just executes, no file management.

---

**Remember**: The dashboard is the SSoT for agents. These docs are the source, but dashboard is the authority.
