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

## Available Modules (Locked Intelligence - SSoT)

### Phase 1: Pedagogical Translation → seed_pairs.json
**File**: `phase_1_seed_pairs.md`
**Version**: 2.5 🔒 **LOCKED** (2025-10-28)
**Status**: ✅ **ACTIVE**
**Output**: `seed_pairs.json`

**Focus**:
- **TWO ABSOLUTE RULES**: (1) Never change canonical meaning, (2) Strongly prefer cognates
- Examples over precepts (Spanish, French, Mandarin thinking patterns)
- Use canonical English directly when English is target OR known (no back-translation)
- Balance principle: Cognate transparency vs known language smoothness
- Zero-variation principle ("First Word Wins")
- Progressive heuristic curve (seeds 1-100, 101-300, 301-668)

**Latest updates (v2.5)**:
- Added "Learning by Example" section with multi-language thinking
- Softened cognate rule from "MANDATORY" to "strongly prefer" (avoid overfitting)
- Cross-language examples showing decision-making process
- Balance principle for transparent vs natural translations

**Previous versions**:
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

### Phase 3: LEGO Extraction → lego_pairs.json
**File**: `phase_3_lego_pairs.md`
**Version**: 3.3 🔒 **LOCKED** (2025-10-27)
**Status**: ✅ **ACTIVE**
**Output**: `lego_pairs.json`

**Focus**:
- **TILING FIRST**: Every seed must decompose into LEGOs that reconstruct it perfectly
- Treat each seed as isolated (no "reused LEGOs from earlier seeds" thinking)
- 4-step decomposition sequence (tiling, feeders, composite marking, FD validation)
- COMPOSITE LEGOs with componentization arrays and feeder references
- Functional Determinism compliance (one input = one output)
- Literal component translations (reveal target language construction)

**Latest updates (v3.3)**:
- TILING FIRST principle (primary focus)
- Generation-focused (validation in Phase 3.5)
- 4-step decomposition sequence
- Isolated seed approach (no premature de-duplication thinking)
- Emphasis on FD compliance and semantic preservation

**Previous versions**:
- v3.2: Validation-focused iteration
- v2.0: Multiple composites strategy, preposition wrapping
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

### Phase 5: Basket Generation → lego_baskets.json
**File**: `phase_5_lego_baskets.md`
**Version**: 2.1 🔒 **LOCKED** (2025-10-26)
**Status**: ✅ **ACTIVE**
**Output**: `lego_baskets.json`

**Focus**:
- **Eternal phrases (e)**: 3-4 high-value phrases for spaced repetition (returned to repeatedly)
- **Debut phrases (d)**: Expanding windows (2, 3, 4, 5 LEGOs) for first presentation only
- **ABSOLUTE GATE**: Vocabulary constraint (LEGO #N can only use LEGOs #1 to N-1)
- Balanced vocabulary coverage across eternal phrases
- Grammatical accuracy in BOTH languages (never sacrifice for variety)
- Natural, semantically valuable phrases only

**Latest updates (v2.1)**:
- Clarified eternal vs debut distinction (spaced rep vs first exposure)
- ABSOLUTE GATE vocabulary constraint (immutable rule)
- Eternal phrase selection: high-value, balanced previous vocab
- Debut phrases: systematic expanding windows from eternal phrases

**Previous versions**:
- v1.0: Initial extraction from APML PHASE_PROMPTS.PHASE_5

---

### Phase 5.5: Basket Deduplication → lego_pairs_deduplicated.json, lego_baskets_deduplicated.json
**File**: `phase_5.5_basket_deduplication.md`
**Version**: 2.0 🔒 **LOCKED** (2025-10-28)
**Status**: ✅ **ACTIVE**
**Output**: `lego_pairs_deduplicated.json`, `lego_baskets_deduplicated.json`

**Focus**:
- Character-identical deduplication (trim + lowercase, preserve punctuation)
- First occurrence wins (by chronological order in seed sequence)
- Remove ~20-30% duplicates (typical deduplication rate)
- Punctuation preserved (semantic difference: "quieres" ≠ "¿quieres?")

**Latest updates (v2.0)**:
- Simplified to character-identical logic (removed feeder-specific logic)
- Case-insensitive matching with trimmed whitespace
- Punctuation semantic preservation
- Script implemented: `scripts/phase5.5-deduplicate-baskets.cjs`
- Tested: 28.1% deduplication on spa_for_eng_20seeds

**Previous versions**:
- v1.0: Initial feeder-based deduplication logic

---

### Phase 6: Introduction Generation → introductions.json
**File**: `phase_6_introductions.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `introductions.json`

**Focus**:
- Reading component arrays from Phase 3
- Generating natural language presentations
- Seed context requirement ("as in...")
- Type-specific formats (BASE/COMPOSITE with components)
- FEEDER recognition with "learned earlier" text

**Completed**: 2025-10-23

---

### Phase 7: Course Manifest Compilation → course_manifest.json
**File**: `phase_7_compilation.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `course_manifest.json`

**Focus**:
- Compiling v7.7 format to legacy app manifest
- Deterministic UUID generation (SSi legacy format)
- Single slice architecture
- Comprehensive audio sample registration

**Completed**: 2025-10-23

---

### Phase 8: Audio Generation → audio/*.mp3 (S3)
**File**: `phase_8_audio_generation.md`
**Version**: 1.0
**Status**: ✅ **DOCUMENTED** → 🔧 **ASSIGNED TO KAI** (separate branch)
**Output**: MP3 audio files uploaded to S3
**Branch**: `feature/phase8-audio-generation`

**Focus**:
- Manifest-driven generation (reads course_manifest.json samples object)
- UUID-based filenames (deterministic from Phase 7)
- ElevenLabs TTS API integration
- Role-voice mapping (target1/target2/source)
- S3 upload with correct path structure
- Progress tracking and error handling

**Key Correction**: Phase 8 does NOT read individual files (seed_pairs, lego_pairs, etc) or generate manifests. It ONLY reads the samples object from course_manifest.json and generates audio files with UUID filenames.

**Requirements**:
- ElevenLabs API key
- AWS S3 credentials
- Voice IDs for each language (target: 2 voices, source: 1 voice)

**Test Course**: ita_for_eng_10seeds → 1,681 audio files
**Full Course**: ita_for_eng_668seeds → ~110,000 audio files

**Assigned to**: Kai (parallel work, no conflicts with main branch)

---

## Locked Intelligence Status

**Active Workflow**: Phase 1 → 3 → 5 (seed_pairs → lego_pairs → lego_baskets)

| Phase | Status | File | Version | Locked | Notes |
|-------|--------|------|---------|--------|-------|
| 1 | ✅ ACTIVE | phase_1_seed_pairs.md | 2.5 | 🔒 | Examples over precepts, English handling |
| 2 | ⚠️ Inactive | phase_2_corpus_intelligence.md | 1.0 | - | Not in current workflow |
| 3 | ✅ ACTIVE | phase_3_lego_pairs.md | 3.3 | 🔒 | TILING FIRST, generation-focused |
| 3.5 | ⚠️ Inactive | phase_3.5_lego_graph.md | 1.0 | - | Not in current workflow |
| 5 | ✅ ACTIVE | phase_5_lego_baskets.md | 2.1 | 🔒 | Eternal/debut, ABSOLUTE GATE |
| 5.5 | 🔨 TODO | phase_5.5_basket_deduplication.md | 1.0 | - | Next implementation target |
| 6 | 🔨 TODO | phase_6_introductions.md | 1.0 | - | After deduplication |
| 7 | ✅ Complete | phase_7_compilation.md | 1.0 | - | Legacy format compilation |
| 8 | 📋 Documented | phase_8_audio_generation.md | 1.0 | - | Assigned to Kai |

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
