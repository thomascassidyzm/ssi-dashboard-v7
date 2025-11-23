# Canonical Content System

**Version**: 1.0
**Status**: ✅ Active
**Last Updated**: 2025-11-20
**Location**: `public/vfs/canonical/`

---

## Purpose

The canonical content system provides the **language-agnostic source of truth** for all SSi courses. Instead of maintaining course-specific content, we maintain three canonical input parameters that generate courses for ANY target language:

1. **Canonical Seeds** - 668 pedagogically-ordered seed sentences
2. **Encouragements** - Motivational messages (pooled + ordered)
3. **Welcomes** - Course introduction templates

**Key Principle**: **3 input parameters only** → Course generation works for ANY target language

---

## Architecture Overview

### Input Parameter Model

**Traditional Approach (deprecated)**:
- Separate seed files per language pair (spa_for_eng_seeds.json, fra_for_eng_seeds.json, etc.)
- Duplication of pedagogical ordering across languages
- Difficult to improve curriculum (change 668 seeds × N languages)

**Canonical Approach (current)**:
- Single canonical seed file with `{target}` placeholders
- Language-agnostic pedagogical ordering
- Improve curriculum once → applies to all languages

**Benefits**:
- ✅ Single source of truth for curriculum
- ✅ Easy to improve pedagogy (edit 668 seeds, not 668 × N)
- ✅ Consistent learning progression across all languages
- ✅ Reduced maintenance burden

---

## File Structure

### Location: `public/vfs/canonical/`

```
canonical/
├── canonical_seeds.json          # 668 pedagogically-ordered seeds
├── eng_encouragements.json       # English encouragement messages (26 pooled)
├── spa_encouragements.json       # Spanish encouragements (future)
├── fra_encouragements.json       # French encouragements (future)
└── welcomes.json                 # Course welcome message template
```

---

## 1. Canonical Seeds

**File**: `canonical_seeds.json`
**Records**: 668 seed sentences
**Format**: Language-agnostic with `{target}` placeholders

### Structure

```json
[
  {
    "seed_id": "S0001",
    "canonical_id": "C0001",
    "source": "I want to speak {target} with you now."
  },
  {
    "seed_id": "S0002",
    "canonical_id": "C0002",
    "source": "I'm trying to learn."
  },
  {
    "seed_id": "S0004",
    "canonical_id": "C0004",
    "source": "how to say something in {target}"
  }
]
```

### Field Descriptions

- **seed_id**: Unique identifier (S0001-S0668)
- **canonical_id**: Canonical reference (C0001-C0668)
- **source**: English sentence with `{target}` placeholder for language name

### Placeholder Substitution

The `{target}` placeholder is replaced during Phase 1 (Translation):

```javascript
// Example for Spanish course (target: "spa", name: "Spanish")
"I want to speak {target} with you now."
↓ becomes ↓
"I want to speak Spanish with you now."

// Example for French course (target: "fra", name: "French")
"I want to speak {target} with you now."
↓ becomes ↓
"I want to speak French with you now."
```

### Pedagogical Ordering

Seeds are ordered by:
1. **Cognitive load** (simple → complex)
2. **Grammatical complexity** (present → future → conditional → subjunctive)
3. **Vocabulary utility** (high-frequency words first)
4. **Recombination potential** (build on previous LEGOs)

**Example progression**:
- S0001-S0010: Core present tense, high-frequency verbs (want, speak, learn, try)
- S0011-S0100: Expanding verb tenses, common adjectives
- S0101-S0300: Increasing sentence complexity, more conjunctions
- S0301-S0668: Advanced grammar (subjunctive, conditionals, complex clauses)

---

## 2. Encouragements

**Purpose**: Motivational messages spoken between lessons to encourage learners.

### Two Types

#### **Pooled Encouragements** (Randomized)
Messages that can appear at any point, selected randomly:
- "Remember that learning comes in layers..."
- "You're doing excellently..."
- "Don't worry if you forget a word..."

**Characteristics**:
- Context-independent
- Can be shuffled/randomized
- No specific ordering required

#### **Ordered Encouragements** (Sequential)
Messages that appear at specific curriculum points:
- Empty for now (future use)
- Will contain milestone-specific encouragement
- Example: "You've completed 100 seeds! You're now conversational."

### File Format

**File**: `eng_encouragements.json` (English source language)
**Future files**: `spa_encouragements.json`, `fra_encouragements.json`, etc.

```json
{
  "language": "eng",
  "version": "1.0.0",
  "generated": "2025-11-19",
  "pooledEncouragements": [
    {
      "text": "Remember that learning comes in layers, so don't worry if you forget a word...",
      "id": "E9829BC7-F77D-4B56-B7EB-B4573ED32654"
    },
    {
      "text": "You're doing excellently—yes, I know you want to make fewer mistakes...",
      "id": "08AEAB90-B104-4EE7-9376-988A81D5DE88"
    }
  ],
  "orderedEncouragements": []
}
```

### Field Descriptions

- **language**: Source language code (eng, spa, fra, etc.)
- **version**: Encouragements version (semver)
- **generated**: ISO timestamp when file was created
- **pooledEncouragements**: Array of randomizable encouragements
  - **text**: Encouragement message
  - **id**: Deterministic UUID for audio file
- **orderedEncouragements**: Array of sequential encouragements (future use)

### Language-Specific Encouragements

Each source language (known language) has its own encouragement file:
- `eng_encouragements.json` - For courses where English is the known language (spa_for_eng, fra_for_eng, etc.)
- `spa_encouragements.json` - For courses where Spanish is the known language (eng_for_spa, future)
- `fra_encouragements.json` - For courses where French is the known language (eng_for_fra, future)

**Why per-language?** Encouragements are spoken in the **source (known) language**, so they must be translated for each known language variant.

### Current State

**English encouragements** (`eng_encouragements.json`):
- 26 pooled encouragements ✅ Complete
- 0 ordered encouragements (future enhancement)

**Other languages**: Not yet created (will be needed when we support non-English source languages)

---

## 3. Welcomes

**Purpose**: Course-specific welcome messages spoken at the beginning of each course.

**File**: `welcomes.json`
**Current State**: Template only (no actual welcomes yet)

### Structure

```json
{
  "welcomes": {
    "_comment": "Course-specific welcome messages. Each course (language pair) has its own welcome.",
    "_structure": {
      "course_code": {
        "text": "Welcome message text in source language",
        "id": "UUID for audio sample (null if not generated yet)",
        "generated_date": "ISO timestamp when text was created",
        "voice": "Voice ID used for audio generation (null if not generated)",
        "duration": "Audio duration in seconds (0 if not generated)"
      }
    }
  }
}
```

### Field Descriptions

- **course_code**: Course identifier (e.g., "spa_for_eng", "fra_for_eng")
- **text**: Welcome message in source (known) language
- **id**: Deterministic UUID for welcome audio file (populated by Phase 8)
- **generated_date**: ISO timestamp when text was created
- **voice**: Voice ID used for TTS (populated by Phase 8)
- **duration**: Audio duration in seconds (populated by Phase 8)

### Example Welcome (Future)

```json
{
  "welcomes": {
    "spa_for_eng": {
      "text": "Welcome to Spanish for English speakers. This course will teach you conversational Spanish using the SSi method. Let's begin!",
      "id": null,
      "generated_date": "2025-11-20T10:00:00Z",
      "voice": null,
      "duration": 0
    }
  }
}
```

### Usage in Phase 7

Phase 7 (manifest compilation) reads welcomes and creates top-level `introduction` field:

```json
{
  "introduction": {
    "id": "",           // Populated by Phase 8 after generating welcome audio
    "cadence": "natural",
    "role": "presentation",
    "duration": 0       // Populated by Phase 8 after measuring audio duration
  }
}
```

**See**: `phase_7_compilation.md` for details on introduction field structure.

---

## Course Generation Flow

### 3-Parameter Input Model

**Input Parameters**:
1. **Target language code** (e.g., "spa")
2. **Known language code** (e.g., "eng")
3. **Canonical content** (seeds, encouragements, welcomes)

**Output**: Complete course with ~110,000 audio files

### Pipeline Integration

**Phase 1 (Translation)**:
- Reads `canonical_seeds.json`
- Substitutes `{target}` with target language name
- Translates 668 seeds to target language
- Outputs `seed_pairs.json`

**Phase 3 (LEGO Extraction)**:
- Reads `seed_pairs.json`
- Extracts LEGO components
- Outputs `lego_pairs.json`

**Phase 5 (Basket Generation)**:
- Reads `lego_pairs.json`
- Generates practice phrases
- Outputs `lego_baskets.json`

**Phase 7 (Manifest Compilation)**:
- Reads all phase outputs + canonical encouragements + welcomes
- Compiles final manifest with audio sample metadata
- Embeds encouragements into manifest
- Outputs `course_manifest.json`

**Phase 8 (Audio Generation)**:
- Reads `course_manifest.json`
- Generates ~110,000 audio files (TTS)
- Uploads to S3
- Optionally populates duration fields in manifest

---

## Benefits of Canonical Content

### 1. **Single Source of Truth**
- Curriculum improvements apply to ALL languages
- No duplication of pedagogical ordering
- Easier to test and refine learning progression

### 2. **Language Agnostic**
- Same 668 seeds work for Spanish, French, Mandarin, Welsh, etc.
- Only placeholders differ (`{target}` → "Spanish", "French", "Mandarin")
- Pedagogical ordering is universal

### 3. **Simplified Maintenance**
- Update 668 canonical seeds once
- Regenerate ALL courses (spa_for_eng, fra_for_eng, etc.)
- No need to maintain N × language_count seed files

### 4. **Rapid Course Creation**
- Add new target language: Just provide translation in Phase 1
- No need to recreate curriculum from scratch
- Same proven pedagogy for every language

### 5. **Consistency**
- Learners experience same pedagogical progression regardless of target language
- Quality improvements benefit all learners
- A/B testing curriculum changes affects all languages equally

---

## File Locations

### Canonical Content (SSoT)
```
/public/vfs/canonical/
├── canonical_seeds.json          # 668 seeds with {target} placeholders
├── eng_encouragements.json       # English encouragements (26 pooled)
└── welcomes.json                 # Welcome message template
```

### Course-Specific Content (Generated)
```
/public/vfs/courses/{course_code}/
├── seed_pairs.json               # Phase 1 output (canonical seeds → translated)
├── lego_pairs.json               # Phase 3 output
├── lego_baskets.json             # Phase 5 output
├── introductions.json            # Phase 6 output (integrated into Phase 3)
└── course_manifest.json          # Phase 7 output (final manifest)
```

---

## Validation

### Canonical Seeds
✅ Exactly 668 seeds (S0001-S0668)
✅ Each seed has unique seed_id and canonical_id
✅ `{target}` placeholder present where needed
✅ Pedagogical ordering preserved (S0001 = easiest, S0668 = hardest)

### Encouragements
✅ Language code matches source language
✅ Each encouragement has unique UUID
✅ All UUIDs are deterministic (same text = same UUID)
✅ Pooled encouragements are context-independent

### Welcomes
✅ One welcome per course (course_code key)
✅ Text in source (known) language
✅ UUID/duration fields ready for Phase 8 population

---

## Future Enhancements

### Ordered Encouragements
Add milestone-specific encouragement:
- "You've completed 100 seeds! You're now conversational."
- "Halfway through! You're doing amazingly well."
- "Final stretch! You're almost fluent."

### Multi-Source Languages
Add encouragement files for non-English source languages:
- `spa_encouragements.json` - For eng_for_spa course
- `fra_encouragements.json` - For eng_for_fra course
- `cmn_encouragements.json` - For eng_for_cmn course

### Dynamic Welcomes
Generate course-specific welcomes automatically:
```javascript
const welcomeText = `Welcome to ${targetLangName} for ${knownLangName} speakers. This course will teach you conversational ${targetLangName} using the SSi method. Let's begin!`;
```

---

## Version History

### v1.0 (2025-11-20)
- Initial documentation
- Canonical seeds (668) documented
- Encouragements structure (pooled + ordered) documented
- Welcomes template documented
- 3-parameter input model explained
- Pipeline integration documented

---

## Related Documentation

- **Phase 1**: Uses canonical seeds, substitutes `{target}` placeholder
- **Phase 7**: Embeds encouragements and welcomes in final manifest
- **Phase 8**: Generates welcome audio, populates introduction field
- **COURSE_GENERATION_ARCHITECTURE.md**: Overall course generation workflow

---

**Remember**: The canonical content system reduces course generation to **3 input parameters**: target language, known language, and canonical content. Everything else is derived through the pipeline.
