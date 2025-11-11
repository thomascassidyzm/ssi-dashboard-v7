# APML Reverse-Compilation Plan for SSI Dashboard v8.0.0

**Created**: 2025-11-09
**Approach**: Extract APML specification FROM current working codebase
**Reason**: Code is clean and working - capture reality, not theory

---

## Why Reverse-Compilation?

**Traditional**: Write spec → Generate code
**Our situation**: Working code → Extract spec → Maintain as SSoT

**Benefits**:
- ✅ Captures what actually works (not assumptions)
- ✅ Based on clean v8.0.0 codebase (just cleaned)
- ✅ Spec matches reality 100%
- ✅ Future changes update spec + code together

---

## Segmented APML Architecture

**Problem**: Single massive `.apml` file gets stale, hard to maintain
**Solution**: Break into focused, maintainable segments

### Core Specification Files

```
apml/
├── ssi-dashboard-master.apml          # Master orchestrator (imports all)
├── core/
│   ├── variable-registry.apml         # All identifiers (single source)
│   ├── course-structure.apml          # VFS, file formats, protocols
│   └── execution-modes.apml           # Web/Local/API mode specs
├── phases/
│   ├── phase-1-translation.apml       # Phase 1 intelligence
│   ├── phase-3-lego-extraction.apml   # Phase 3 intelligence
│   ├── phase-5-baskets.apml           # Phase 5 intelligence
│   └── phase-orchestration.apml       # Sequential execution flow
├── interfaces/
│   ├── dashboard-ui.apml              # Main dashboard interface
│   ├── course-generation-ui.apml      # Generation interface
│   ├── course-editor-ui.apml          # Editor interface
│   └── quality-review-ui.apml         # Quality tools interface
├── services/
│   ├── automation-server.apml         # Backend API specification
│   ├── browser-automation.apml        # Web Mode automation
│   └── vfs-management.apml            # Virtual file system
└── validation/
    ├── gate-compliance.apml           # ABSOLUTE GATE validator
    ├── pattern-coverage.apml          # Pattern analysis
    └── completeness.apml              # Course completeness checks
```

### Import Strategy

**Master file imports all segments**:
```apml
# ssi-dashboard-master.apml

app SSiDashboard:
  title: "SSI Course Production Dashboard"
  version: "8.0.0"
  apml_version: "1.1.0"

  # Import core specifications
  import core/variable-registry
  import core/course-structure
  import core/execution-modes

  # Import phase intelligence
  import phases/phase-1-translation
  import phases/phase-3-lego-extraction
  import phases/phase-5-baskets
  import phases/phase-orchestration

  # Import interface definitions
  import interfaces/dashboard-ui
  import interfaces/course-generation-ui
  import interfaces/course-editor-ui
  import interfaces/quality-review-ui

  # Import service specifications
  import services/automation-server
  import services/browser-automation
  import services/vfs-management

  # Import validation specifications
  import validation/gate-compliance
  import validation/pattern-coverage
  import validation/completeness
```

---

## Reverse-Compilation Process

### Phase 1: Variable Registry Extraction

**Source files to analyze**:
- `automation_server.cjs` - All backend variables/functions
- `src/views/*.vue` - All component reactive variables
- `src/services/api.js` - All API endpoint definitions
- `spawn_claude_web_agent.cjs` - Browser automation variables

**Extract into `core/variable-registry.apml`**:

```apml
# core/variable-registry.apml

## Variable Registry: SSI Dashboard v8.0.0

### Backend State (automation_server.cjs)

STATE_MANAGEMENT:
  - STATE.jobs: Map<courseCode, JobStatus>
    PURPOSE: Track active course generation jobs
    SCHEMA:
      courseCode: string          # e.g., "spa_for_eng_s0001-0030"
      status: 'in_progress' | 'completed' | 'failed'
      phase: string              # Current phase identifier
      progress: number           # 0-100
      executionMode: 'web' | 'local' | 'api'
      startTime: Date
      error?: string
      windowIds: string[]        # iTerm2/browser window IDs

  - CONFIG.VFS_ROOT: string
    PURPOSE: Virtual file system root path
    VALUE: "./public/vfs/courses"

  - CONFIG.PORT: number
    PURPOSE: Server port
    VALUE: 3456

FUNCTIONS:
  - generateCourseCode: function
    PURPOSE: Creates course code with seed range suffix
    PARAMETERS:
      target: string              # ISO 639-3 code
      known: string               # ISO 639-3 code
      startSeed: number
      endSeed: number
    RETURNS: string
    FORMAT: "{target}_for_{known}_s{start}-{end}" OR "{target}_for_{known}"
    EXAMPLES:
      - generateCourseCode('spa', 'eng', 1, 30) → "spa_for_eng_s0001-0030"
      - generateCourseCode('spa', 'eng', 1, 668) → "spa_for_eng"

  - generatePhase1Brief: function
    PURPOSE: Creates Phase 1 translation prompt
    PARAMETERS:
      courseCode: string
      params: { target, known, startSeed, endSeed, batchNum, totalBatches }
      courseDir: string
    RETURNS: string (markdown prompt)

  - generatePhase3Brief: function
    PURPOSE: Creates Phase 3 LEGO extraction prompt
    PARAMETERS: [same as Phase 1]
    RETURNS: string (markdown prompt)

  - generatePhase5Brief: function
    PURPOSE: Creates Phase 5 basket generation prompt
    PARAMETERS: [same as Phase 1 + validatorOutput]
    RETURNS: string (markdown prompt)

  - spawnCourseOrchestratorWeb: function
    PURPOSE: Orchestrates Web Mode course generation
    PARAMETERS:
      courseCode: string
      params: { target, known, seeds, startSeed, endSeed }
    RETURNS: Promise<void>
    SIDE_EFFECTS:
      - Opens browser tabs
      - Pastes prompts
      - Polls for file outputs
      - Updates job status

  - spawnCourseOrchestratorAPI: function
    PURPOSE: Orchestrates API Mode course generation
    PARAMETERS: [same as Web]
    RETURNS: Promise<void>
    SIDE_EFFECTS:
      - Makes Anthropic API calls
      - Writes outputs to VFS
      - Updates job status

### Frontend State (Vue Components)

COMPONENT: CourseGeneration
  REACTIVE_VARIABLES:
    - knownLanguage: ref<string>
      DEFAULT: 'eng'
      PURPOSE: User's known language selection

    - targetLanguage: ref<string>
      DEFAULT: 'gle'
      PURPOSE: Language user wants to learn

    - startSeed: ref<number>
      DEFAULT: 1
      VALIDATION: 1 <= value <= 668

    - endSeed: ref<number>
      DEFAULT: 668
      VALIDATION: startSeed <= value <= 668

    - courseSize: ref<string | null>
      VALUES: 'test' | 'medium' | 'full' | 'custom' | null
      PURPOSE: Preset seed range selection

    - executionMode: ref<string>
      DEFAULT: 'web'
      VALUES: 'web' | 'local' | 'api'
      PURPOSE: How to execute course generation

    - isGenerating: ref<boolean>
      DEFAULT: false

    - courseCode: ref<string | null>
      FORMAT: Generated by backend

    - currentPhase: ref<string>
      VALUES: 'initializing' | 'phase_1' | 'phase_3' | 'phase_5' | 'completed'

    - progress: ref<number>
      RANGE: 0-100

    - analysis: ref<CourseAnalysis | null>
      PURPOSE: Smart resume analysis results

  COMPUTED_VARIABLES:
    - seedCount: computed<number>
      FORMULA: endSeed.value - startSeed.value + 1

    - currentPhaseIndex: computed<number>
      PURPOSE: Maps phase string to numeric index for UI

  METHODS:
    - startGeneration: function
      PURPOSE: Initiates course generation
      PARAMETERS: force: boolean = false
      SIDE_EFFECTS:
        - Calls API
        - Handles 409 conflicts
        - Shows confirmation dialogs
        - Starts polling

    - analyzeCourse: function
      PURPOSE: Checks existing course progress
      RETURNS: CourseAnalysis

    - clearStuckJob: function
      PURPOSE: Resets stuck generation job
      PARAMETERS: none
      SIDE_EFFECTS: Deletes job from STATE.jobs

### API Endpoints

ENDPOINTS:
  - POST /api/courses/generate
    PURPOSE: Start course generation
    BODY:
      target: string
      known: string
      startSeed: number
      endSeed: number
      executionMode: 'web' | 'local' | 'api'
      force: boolean = false
    RESPONSES:
      200: { courseCode: string, message: string }
      409: { error: string, courseCode: string, existingFiles: string[] }
      400: { error: string }

  - GET /api/courses/:courseCode/status
    PURPOSE: Poll generation progress
    RETURNS:
      status: 'in_progress' | 'completed' | 'failed'
      phase: string
      progress: number
      error?: string

  - GET /api/courses/:courseCode/analyze
    PURPOSE: Smart resume - analyze existing progress
    RETURNS: CourseAnalysis
      courseCode: string
      exists: boolean
      seed_pairs: { exists: boolean, count: number }
      lego_pairs: { exists: boolean, count: number, missing: string[] }
      recommendations: Recommendation[]

  - DELETE /api/courses/:courseCode/job
    PURPOSE: Clear stuck job
    RETURNS: { success: boolean }

### File Formats

FILE: seed_pairs.json
  SCHEMA:
    version: "8.0.0"
    course: string                # Course code
    target_language: string       # ISO code
    known_language: string        # ISO code
    seed_range:
      start: number
      end: number
    generated: string             # ISO timestamp
    total_seeds: number
    actual_seeds: number
    translations: Record<SeedID, [target: string, known: string]>
      # SeedID format: "S0001", "S0002", etc.

FILE: lego_pairs.json
  SCHEMA:
    version: "7.7"               # Legacy version (update in v8.1)
    seeds: Array<Seed>
      # Seed format:
      # [
      #   "S0001",               # Seed ID
      #   ["target", "known"],   # Seed pair
      #   [                      # LEGOs array
      #     ["S0001L01", "B", "target", "known"],
      #     ["S0001L02", "C", "target", "known", [["part1", "lit1"], ["part2", "lit2"]]]
      #   ]
      # ]

FILE: lego_baskets.json
  SCHEMA:
    version: "7.7"
    baskets: Record<LegoID, Basket>
      # Basket format:
      # {
      #   "lego": ["target", "known"],
      #   "e": [["eternal phrase", "translation"], ...],
      #   "d": {
      #     "2": [["2-word phrase", "translation"], ...],
      #     "3": [["3-word phrase", "translation"], ...]
      #   }
      # }
```

---

### Phase 2: Course Structure Extraction

**Extract into `core/course-structure.apml`**:

```apml
# core/course-structure.apml

## Course File Protocols

COURSE_CODE_FORMAT:
  PATTERN: "{target}_for_{known}_s{start}-{end}"
  EXAMPLES:
    - "spa_for_eng_s0001-0030"     # 30 seed test
    - "spa_for_eng_s0001-0100"     # 100 seed medium
    - "spa_for_eng"                # Full 668 seeds (no suffix)

  RULES:
    - Target and known MUST be ISO 639-3 codes
    - Start/end MUST be 4-digit zero-padded
    - Full course (1-668) MUST NOT have suffix
    - Different ranges create separate directories

DIRECTORY_STRUCTURE:
  VFS_ROOT: "./public/vfs/courses"

  COURSE_DIRECTORY: "{VFS_ROOT}/{courseCode}/"
    FILES:
      - seed_pairs.json          # Phase 1 output
      - lego_pairs.tmp.json      # Phase 3 output (pre-validation)
      - lego_pairs.json          # Phase 3 output (validated)
      - lego_baskets.json        # Phase 5 output
      - gate_violations.json     # Validation output
      - pattern_coverage_report.json
      - completeness_report.json

    SUBDIRECTORIES:
      - prompts/                 # Generated phase prompts
        - phase_1_translation.md
        - phase_3_lego_extraction.md
        - phase_5_baskets.md

SEED_ID_FORMAT:
  PATTERN: "S{number}"
  PADDING: 4 digits
  EXAMPLES:
    - "S0001"
    - "S0030"
    - "S0668"

LEGO_ID_FORMAT:
  PATTERN: "{SeedID}L{number}"
  PADDING: 2 digits for LEGO number
  EXAMPLES:
    - "S0001L01"
    - "S0001L02"
    - "S0668L03"
```

---

### Phase 3: Execution Mode Extraction

**Extract into `core/execution-modes.apml`**:

```apml
# core/execution-modes.apml

## Execution Modes

MODE: web
  NAME: "Claude Code on the Web"
  DESCRIPTION: "Browser automation to claude.ai/code"
  DEFAULT: true

  REQUIREMENTS:
    - Chrome browser installed
    - Claude Pro account
    - Internet connection

  COST: $0 (uses Pro subscription)
  RAM: ~0GB (runs on Anthropic servers)

  WORKFLOW:
    1. Server generates phase prompt (markdown)
    2. Browser automation opens claude.ai/code
    3. Prompt pasted to clipboard via pbcopy
    4. AppleScript pastes and submits (Cmd+V, Enter)
    5. Claude processes and writes to VFS
    6. Claude commits and force pushes to main
       COMMAND: git push origin HEAD:main --force
    7. Server polls for output files
    8. Repeat for next phase

  SEQUENTIAL: true
    REASON: Phase 3 needs Phase 1 output, Phase 5 needs Phase 3 output

  IMPLEMENTATION:
    FUNCTION: spawnCourseOrchestratorWeb
    FILE: automation_server.cjs:1200-1332
    BROWSER_MODULE: spawn_claude_web_agent.cjs

MODE: local
  NAME: "Local Machine (iTerm2)"
  DESCRIPTION: "Parallel agent spawning with Claude CLI"
  DEFAULT: false

  REQUIREMENTS:
    - iTerm2 installed
    - Claude CLI configured
    - Anthropic API key

  COST: ~$0.34 per 30-seed batch
  RAM: ~10GB for 34 parallel agents

  WORKFLOW:
    - Spawns multiple iTerm2 windows
    - Each runs Claude CLI agent
    - Parallel execution (batched)
    - Outputs written to VFS

  DEPRECATED: Being phased out in favor of Web Mode
  STATUS: Still supported but not recommended

MODE: api
  NAME: "Direct API"
  DESCRIPTION: "Server-side Anthropic API calls"
  DEFAULT: false

  REQUIREMENTS:
    - Anthropic API key in .env
    - Server has sufficient resources

  COST: ~$0.34 per 30-seed batch
  RAM: Server-side only

  WORKFLOW:
    - Server makes direct Anthropic API calls
    - Sequential phase execution
    - Fully automated (no browser/CLI needed)

  IMPLEMENTATION:
    FUNCTION: spawnCourseOrchestratorAPI
    FILE: automation_server.cjs:1338+
```

---

### Phase 4: Phase Intelligence Extraction

**Wait for master prompt completion, then extract into**:
- `phases/phase-1-translation.apml`
- `phases/phase-3-lego-extraction.apml`
- `phases/phase-5-baskets.apml`

**Contents**:
- Full phase intelligence methodology
- Examples and quality criteria
- Validation rules
- Git workflow instructions

---

### Phase 5: Interface Extraction

**Extract from Vue components**:

```apml
# interfaces/course-generation-ui.apml

interface CourseGenerationView:
  ROUTE: /generate
  COMPONENT: src/views/CourseGeneration.vue

  SECTIONS:
    - language_selection
    - smart_resume_analysis
    - execution_mode_selector
    - seed_range_selection
    - progress_monitor

  PRESETS:
    test:
      SEEDS: 1-30
      DESCRIPTION: "Quick test: Validate pipeline structure ~5-10 min"

    medium:
      SEEDS: 1-100
      DESCRIPTION: "LEGO patterns & quality check ~20-30 min"

    full:
      SEEDS: 1-668
      DESCRIPTION: "Production course + automation test ~2-3 hrs"

  SMART_RESUME:
    TRIGGER: "Analyze Course Progress" button
    FUNCTION: analyzeCourse
    RECOMMENDATIONS:
      - Resume incomplete generation
      - Fill missing LEGOs
      - Generate baskets only
      - Start fresh test run
```

---

## Extraction Tasks (Ordered)

### Immediate (While Waiting for Master Prompt)

1. **Extract Variable Registry** ⏳
   - Scan automation_server.cjs for all functions/variables
   - Scan Vue components for reactive state
   - Scan api.js for endpoints
   - Create `apml/core/variable-registry.apml`

2. **Extract Course Structure** ⏳
   - Read COURSE_FILE_PROTOCOLS.md
   - Document VFS directory structure
   - Capture file format schemas
   - Create `apml/core/course-structure.apml`

3. **Extract Execution Modes** ⏳
   - Document Web/Local/API workflows
   - Extract browser automation logic
   - Capture orchestration patterns
   - Create `apml/core/execution-modes.apml`

### After Master Prompt Completes

4. **Extract Phase Intelligence** ⏳
   - Copy complete phase prompts with examples
   - Extract validation rules
   - Document quality criteria
   - Create `apml/phases/*.apml`

5. **Extract Interface Specifications** ⏳
   - Map all Vue routes and components
   - Document UI state management
   - Capture user workflows
   - Create `apml/interfaces/*.apml`

6. **Extract Service Specs** ⏳
   - Document automation server API
   - Capture VFS management logic
   - Browser automation protocol
   - Create `apml/services/*.apml`

7. **Create Master Orchestrator** ⏳
   - Import all segments
   - Define compilation targets
   - Specify validation rules
   - Create `apml/ssi-dashboard-master.apml`

---

## Success Criteria

✅ All code identifiers in variable registry
✅ All file formats documented
✅ All execution modes specified
✅ All phase intelligence captured
✅ All UI workflows documented
✅ Master APML imports all segments successfully
✅ Segmented files < 500 lines each (maintainable)
✅ Spec matches v8.0.0 codebase 100%

---

## Maintenance Strategy

**When code changes**:
1. Update relevant APML segment(s)
2. Update variable registry if new identifiers
3. Commit code + APML changes together
4. APML stays current with code

**Benefits**:
- APML is living documentation
- Always reflects reality
- Small focused files easy to update
- Single source of truth maintained

---

## Timeline Estimate

- Variable Registry: 1-2 hours
- Course Structure: 30 minutes
- Execution Modes: 1 hour
- Phase Intelligence: 2 hours (after master prompt ready)
- Interface Specs: 1.5 hours
- Service Specs: 1 hour
- Master Orchestrator: 30 minutes

**Total**: ~7.5-8.5 hours

---

**Status**: Ready to begin extraction while waiting for master prompt completion
