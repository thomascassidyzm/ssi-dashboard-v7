# Course File Protocols v1.0

**Date**: 2025-11-09
**Status**: Official Protocol Documentation
**Version**: 1.0

---

## Table of Contents

1. [Course Naming Conventions](#course-naming-conventions)
2. [Directory Structure](#directory-structure)
3. [Phase Output Files](#phase-output-files)
4. [Seed Range Management](#seed-range-management)
5. [File Format Standards](#file-format-standards)
6. [Testing vs Production](#testing-vs-production)

---

## Course Naming Conventions

### Course Code Format

**Standard Format**: `{target}_for_{known}`

Examples:
- `spa_for_eng` (Spanish for English speakers)
- `zho_for_eng` (Chinese for English speakers)
- `cym_for_eng` (Welsh for English speakers)

**With Seed Range** (for testing/partial courses):

**Option 1: Separate Directory** (Recommended)
```
spa_for_eng_s0001-0030/    (Test course: seeds 1-30)
spa_for_eng_s0001-0668/    (Full course: seeds 1-668)
```

**Option 2: Metadata Only** (Alternative)
```
spa_for_eng/               (Course code same, metadata differs)
├── seed_pairs.json        (contains seed_range metadata)
```

**Decision**: Use **Option 1** for clarity and separation of test vs production data.

### Naming Rules

1. **Language codes**: Use ISO 639-3 three-letter codes (lowercase)
   - `spa` = Spanish
   - `eng` = English
   - `zho` = Chinese (Mandarin)
   - `cym` = Welsh

2. **Separator**: Use `_for_` to indicate learning direction

3. **Seed range notation**: `s{start}-{end}` (zero-padded to 4 digits, matching seed ID format)
   - `s0001-0030` = Seeds 1 to 30 (S0001-S0030)
   - `s0001-0668` = Full course (all seeds)
   - `s0100-0200` = Seeds 100 to 200 (S0100-S0200)

4. **No spaces or special characters** in course codes

---

## Directory Structure

### VFS Root

All course data stored in: `public/vfs/courses/`

### Standard Course Directory

```
public/vfs/courses/
└── {course_code}/
    ├── seed_pairs.json          # Phase 1 output
    ├── lego_pairs.json          # Phase 3 output
    ├── lego_baskets.json        # Phase 5 output (consolidated)
    ├── introductions.json       # Phase 6 output
    ├── compilation.json         # Phase 7 output
    ├── baskets/                 # Phase 5 output (individual files)
    │   ├── lego_baskets_s0001.json
    │   ├── lego_baskets_s0002.json
    │   └── ...
    ├── prompts/                 # Generated prompts (reference)
    │   ├── phase_1_translation.md
    │   ├── phase_3_lego_extraction.md
    │   ├── phase_5_baskets.md
    │   ├── phase_6_introductions.md
    │   └── phase_7_compilation.md
    └── compiled/                # Compiled course files
        ├── {course_code}_30seeds.json
        ├── {course_code}_100seeds.json
        └── {course_code}_668seeds.json
```

### Directory Creation Rules

1. **Course directory**: Created when generation starts via `ensureCourseDirectory(courseCode)`
2. **Baskets subdirectory**: Created during Phase 5 if using individual file strategy
3. **Prompts subdirectory**: Created when generating phase prompts (Web/API modes)
4. **Compiled subdirectory**: Created during Phase 7 compilation

### File Naming Rules

1. **Seed ID format**: `S{id}` where `{id}` is zero-padded to 4 digits
   - `S0001`, `S0030`, `S0668`

2. **Basket files**: `lego_baskets_s{id}.json` (lowercase 's', 4-digit zero-padded)
   - `lego_baskets_s0001.json`

3. **Compiled files**: `{course_code}_{n}seeds.json`
   - `spa_for_eng_30seeds.json`
   - `spa_for_eng_668seeds.json`

---

## Phase Output Files

### Phase 1: Pedagogical Translation

**Output File**: `seed_pairs.json`

**Purpose**: Contains canonical English sentences translated to target language

**Required Fields**:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "target_language": "spa",
  "known_language": "eng",
  "seed_range": {
    "start": 1,
    "end": 30
  },
  "generated": "2025-11-09T19:15:55.094Z",
  "total_seeds": 30,
  "actual_seeds": 30,
  "translations": {
    "S0001": [
      "Quiero hablar español contigo ahora.",
      "I want to speak Spanish with you now."
    ],
    "S0002": [
      "Estoy intentando aprender.",
      "I'm trying to learn."
    ]
  }
}
```

**Validation Rules**:
- `total_seeds` must match `seed_range.end - seed_range.start + 1`
- `actual_seeds` must equal number of keys in `translations`
- All seed IDs in `translations` must be within seed range
- Each translation array must have exactly 2 elements: [target, known]

### Phase 3: LEGO Extraction

**Output File**: `lego_pairs.json`

**Purpose**: Linguistic building blocks extracted from seed pairs

**Required Fields**:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "target_language": "spa",
  "known_language": "eng",
  "generated": "2025-11-09T20:30:12.456Z",
  "total_legos": 87,
  "legos": [
    {
      "lego_id": "L0001",
      "target": "quiero",
      "known": "I want",
      "category": "verb_phrase",
      "source_seeds": ["S0001", "S0015", "S0028"]
    }
  ]
}
```

**Validation Rules**:
- `total_legos` must equal length of `legos` array
- Each LEGO must have unique `lego_id`
- `source_seeds` must reference valid seeds from Phase 1
- All LEGOs must have `target`, `known`, `category`

### Phase 5: Practice Baskets

**Output File Options**:

**Option 1: Consolidated** - `lego_baskets.json`
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "generated": "2025-11-09T21:45:33.789Z",
  "total_baskets": 30,
  "baskets": {
    "S0001": {
      "seed_id": "S0001",
      "legos_used": ["L0001", "L0003", "L0012"],
      "practice_phrases": [
        ["Quiero agua", "I want water"],
        ["Quiero café", "I want coffee"]
      ]
    }
  }
}
```

**Option 2: Individual Files** - `baskets/lego_baskets_s{id}.json`
```json
{
  "version": "7.7.0",
  "seed_id": "S0001",
  "course": "spa_for_eng_s0001-0030",
  "generated": "2025-11-09T21:45:33.789Z",
  "legos_used": ["L0001", "L0003", "L0012"],
  "practice_phrases": [
    ["Quiero agua", "I want water"],
    ["Quiero café", "I want coffee"]
  ]
}
```

**Validation Rules**:
- Each basket corresponds to one seed
- `legos_used` must reference valid LEGOs from Phase 3
- Practice phrases must be arrays of [target, known] pairs
- Minimum 5 practice phrases per basket (recommended)

### Phase 6: Introductions

**Output File**: `introductions.json`

**Purpose**: Introduction dialogues for each learning level

**Required Fields**:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "generated": "2025-11-09T22:00:00.000Z",
  "introductions": [
    {
      "level": 1,
      "target_audio_path": "/audio/spa_for_eng/intro_level_1.mp3",
      "known_audio_path": "/audio/spa_for_eng/intro_level_1_eng.mp3",
      "transcript_target": "Bienvenido al nivel uno...",
      "transcript_known": "Welcome to level one..."
    }
  ]
}
```

### Phase 7: Compilation

**Output File**: `compilation.json`

**Purpose**: Full compiled course data for training app consumption

**Required Fields**:
```json
{
  "version": "7.7.0",
  "course": "spa_for_eng_s0001-0030",
  "compiled_at": "2025-11-09T22:30:00.000Z",
  "seed_count": 30,
  "lego_count": 87,
  "has_audio": false,
  "seeds": [...],
  "legos": [...],
  "baskets": [...],
  "introductions": [...]
}
```

---

## Seed Range Management

### Default Ranges

1. **Test Range**: 1-30 seeds
   - Purpose: Rapid testing of course structure, phase logic
   - Use case: Development, debugging, validation
   - Execution time: ~5-10 minutes

2. **Medium Range**: 1-100 seeds
   - Purpose: Validate LEGO extraction patterns at moderate scale
   - Use case: Quality checking, methodology refinement
   - Execution time: ~20-30 minutes

3. **Full Range**: 1-668 seeds
   - Purpose: Complete course for production deployment
   - Use case: Final production courses, automation stress testing
   - Execution time: ~2-3 hours (depending on mode)

### Testing Philosophy

**Different ranges test different things**:

- **30 seeds**: Tests course generation logic, file structure, phase dependencies
- **100 seeds**: Tests LEGO diversity, basket quality, pattern recognition
- **668 seeds**: Tests automation robustness, resource management, parallel processing

### UI Selector Design

**Preset Options**:
1. Test (1-30)
2. Medium (1-100)
3. Full (1-668)
4. Custom (user specifies start/end)

**Implementation**:
```vue
<div class="seed-range-selector">
  <label>Seed Range</label>
  <select v-model="seedRangePreset">
    <option value="test">Test (1-30)</option>
    <option value="medium">Medium (1-100)</option>
    <option value="full">Full (1-668)</option>
    <option value="custom">Custom Range</option>
  </select>

  <div v-if="seedRangePreset === 'custom'">
    <input v-model="startSeed" type="number" placeholder="Start Seed">
    <input v-model="endSeed" type="number" placeholder="End Seed">
  </div>
</div>
```

### Backend Handling

**Course Code Generation**:
```javascript
function generateCourseCode(target, known, startSeed, endSeed) {
  const baseCode = `${target}_for_${known}`;

  // Full range: no suffix
  if (startSeed === 1 && endSeed === 668) {
    return baseCode;
  }

  // Custom range: add suffix
  const start = String(startSeed).padStart(3, '0');
  const end = String(endSeed).padStart(3, '0');
  return `${baseCode}_s${start}-${end}`;
}
```

**Examples**:
- `spa_for_eng` (full 1-668)
- `spa_for_eng_s0001-0030` (test range)
- `spa_for_eng_s0100-0200` (custom range)

---

## File Format Standards

### Version Numbering

**Current Version**: `7.7.0`

**Versioning Rules**:
- Major version (7): Breaking changes to file structure
- Minor version (7): New fields or phase outputs
- Patch version (0): Bug fixes, metadata updates

### Required Metadata (All Files)

All JSON output files must include:
```json
{
  "version": "7.7.0",
  "course": "{course_code}",
  "generated": "2025-11-09T19:15:55.094Z"
}
```

### Encoding

- **Character encoding**: UTF-8
- **Line endings**: LF (Unix-style)
- **JSON formatting**: 2-space indentation, no trailing commas

### File Size Guidelines

- `seed_pairs.json`: ~125KB per 100 seeds
- `lego_pairs.json`: ~200KB per 100 LEGOs
- `lego_baskets.json`: ~300KB per 100 baskets
- Individual basket files: ~3-5KB each

---

## Testing vs Production

### Test Courses (1-30 seeds)

**Purpose**:
- Validate phase logic
- Test file creation protocols
- Debug course generation issues
- Rapid iteration during development

**Characteristics**:
- Fast execution (~5-10 minutes)
- Minimal resource usage
- Sufficient for structure validation
- NOT sufficient for LEGO pattern quality

**Directory**: `{course_code}_s0001-0030/`

### Production Courses (1-668 seeds)

**Purpose**:
- Deployable courses for training app
- Stress test automation at scale
- Validate parallel processing
- Ensure resource management

**Characteristics**:
- Long execution (~2-3 hours)
- High resource usage (especially Local mode)
- Tests automation robustness
- Produces complete, deployable courses

**Directory**: `{course_code}/` or `{course_code}_s0001-0668/`

### Quality Validation Rules

1. **Test courses**: Focus on structural correctness
   - All phases complete successfully
   - Files created in correct locations
   - JSON validates against schema
   - No missing dependencies

2. **Production courses**: Focus on content quality
   - LEGO extraction patterns consistent
   - Practice phrases diverse and pedagogically sound
   - No duplicate or redundant content
   - Audio generation (Phase 8) successful

---

## Migration Path

### Existing Courses

Current courses (`spa_for_eng`, `zho_for_eng`) are implicitly full-range (1-668).

**No migration needed** - these remain valid under new protocol.

### New Naming for Existing Courses (Optional)

If seed range clarity desired:
```
spa_for_eng/           →  spa_for_eng_s0001-0668/  (or keep as is)
zho_for_eng/           →  zho_for_eng_s0001-0668/  (or keep as is)
```

**Recommendation**: Keep existing courses as-is, apply new naming only to new courses.

---

## Summary of Key Decisions

1. ✅ **Course naming**: `{target}_for_{known}_s{start}-{end}` (4-digit zero-padding, suffix only if not full range)
2. ✅ **Directory structure**: Separate directories for different seed ranges
3. ✅ **Phase outputs**: Clearly defined file names and formats
4. ✅ **Seed range presets**: Test (1-30), Medium (1-100), Full (1-668), Custom
5. ✅ **Testing philosophy**: Different ranges test different aspects
6. ✅ **Version format**: 7.7.0 (current)
7. ✅ **Metadata requirements**: version, course, generated (minimum)

---

**Generated**: 2025-11-09
**Author**: Claude (Sonnet 4.5)
**Status**: Official Protocol v1.0 ✅
