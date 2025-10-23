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

## Available Modules (Migrated)

### Phase 1: Pedagogical Translation → seed_pairs.json
**File**: `phase_1_seed_pairs.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `seed_pairs.json`

**Focus**:
- Cognate preference (maximize vocabulary similarity)
- Variation reduction ("First Word Wins")
- Progressive heuristic curve (seeds 1-100, 101-300, 301-668)
- Language-specific examples (Spanish, French, Italian, Mandarin)

**Extracted from**: APML PHASE_PROMPTS.PHASE_1 (2025-10-23)

---

### Phase 2: Corpus Intelligence → corpus_intelligence.json
**File**: `phase_2_corpus_intelligence.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `phase_2_corpus_intelligence.json`

**Focus**:
- FCFS (First-Can-First-Say) semantic priority
- Utility scoring formula
- Concept ownership mapping
- Dependency tracking

**Extracted from**: APML PHASE_PROMPTS.PHASE_2 (2025-10-23)

---

### Phase 3: LEGO Extraction → lego_pairs.json
**File**: `phase_3_lego_pairs.md`
**Version**: 2.0
**Status**: ✅ **ACTIVE**
**Output**: `lego_pairs.json`

**Focus**:
- Minimum reusable unit principle
- Preposition wrapping (must be buried in composites)
- Multiple composites for reusability
- Component data vs explanations (Phase 3/6 separation)
- BASE vs COMPOSITE (no separate feeders in v7.0 compact format)

**Latest updates (2025-10-23)**:
- Added minimum unit heuristic (no "Sto", "a" fragments)
- Clarified preposition wrapping with component array format
- Multiple composites strategy (maximize reusability)
- Phase 3/Phase 6 responsibility separation
- Removed FEEDER type (compact v7.0 format)

**Previously**: `phase_3_extraction.md` (renamed to match output file)

---

### Phase 3.5: Graph Construction → lego_graph.json
**File**: `phase_3.5_lego_graph.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `phase_3.5_lego_graph.json`

**Focus**:
- Adjacency pattern detection
- Directed graph construction
- Edge weight calculation (frequency × pedagogical value)
- Graph validation (connectivity, cycles)

**Extracted from**: APML PHASE_PROMPTS.PHASE_3_5 (2025-10-23)
**New in**: APML v7.0 (replaces manual DEBUT/ETERNAL logic)

---

### Phase 5: Basket Generation → lego_baskets.json
**File**: `phase_5_lego_baskets.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `lego_baskets.json`

**Focus**:
- E-phrases (7-10 words, natural, conversational)
- D-phrases (expanding windows: 2, 3, 4, 5 LEGOs)
- Vocabulary constraints (LEGO #N can only use LEGOs #1 to N-1)
- Culminating LEGO rules (E-phrase #1 = complete seed)
- Italian-specific grammar rules (infinitive + preposition requirements)
- Bilingual validation (perfect grammar in BOTH languages)

**Extracted from**: APML PHASE_PROMPTS.PHASE_5 (2025-10-23)

---

### Phase 5.5: Basket Deduplication → lego_baskets_deduplicated.json
**File**: `phase_5.5_basket_deduplication.md`
**Version**: 1.0
**Status**: ✅ **ACTIVE**
**Output**: `lego_baskets_deduplicated.json`

**Focus**:
- Identify duplicate LEGOs (same target + known text)
- First occurrence wins (by LEGO ID order)
- Remove ~22% duplicates (typical deduplication rate)
- Generate deduplication report

**Note**: Logic created from Phase 5 requirements (not in separate APML prompt)
**Created**: 2025-10-23

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

## Migration Status

**Completed**: 8 of 8 phases documented (100%) ✅

| Phase | Status | File | Version | Assignee |
|-------|--------|------|---------|----------|
| 1 | ✅ Complete | phase_1_seed_pairs.md | 1.0 | - |
| 2 | ✅ Complete | phase_2_corpus_intelligence.md | 1.0 | - |
| 3 | ✅ Complete | phase_3_lego_pairs.md | 2.0 | - |
| 3.5 | ✅ Complete | phase_3.5_lego_graph.md | 1.0 | - |
| 5 | ✅ Complete | phase_5_lego_baskets.md | 1.0 | - |
| 5.5 | ✅ Complete | phase_5.5_basket_deduplication.md | 1.0 | - |
| 6 | ✅ Complete | phase_6_introductions.md | 1.0 | ✅ This session |
| 7 | ✅ Complete | phase_7_compilation.md | 1.0 | ✅ This session |
| 8 | ✅ Documented | phase_8_audio_generation.md | 1.0 | 🔧 Kai (implementation) |

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
const response = await fetch('http://localhost:3456/phase-intelligence/3')
const methodology = await response.text()  // Raw markdown
```

### For Humans (Dashboard UI)
Visit: `https://ssi-dashboard-v7.vercel.app/intelligence`
- Select phase from tabs
- View rendered methodology
- Check version and status

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
