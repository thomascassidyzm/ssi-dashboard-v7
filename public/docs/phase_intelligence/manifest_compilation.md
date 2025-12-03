# Manifest Compilation (Script)

**Version**: 10.0.0
**Status**: Active
**Type**: Script (deterministic transformation - not a phase)
**Script**: `scripts/phase7-compile-manifest-v3.cjs`
**Input**: `lego_pairs.json`, `lego_baskets.json`, `welcomes.json`, `eng_encouragements.json`
**Output**: `course_manifest.json`

---

## Overview

The Manifest Compilation script transforms SSoT files into the app-ready course manifest format that the SSi mobile app expects. This is **not a phase** - it's a deterministic transformation with no agent intelligence required. Same inputs always produce same outputs.

## Key Distinction: Script vs Phase

- **Phase**: Triggers Claude Code agents (takes time, requires orchestration)
- **Script**: Runs instantly, deterministic transformation

**Manifest is a script** - it transforms existing data into the fixed format required by the mobile app.

---

## Input Files

### 1. lego_pairs.json (SSoT - from Phase 2)
Contains seeds with LEGOs, types (A/M), and components:
```json
{
  "version": "10.0",
  "known_language": "eng",
  "target_language": "spa",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed": { "known": "I want to speak Spanish...", "target": "Quiero hablar español..." },
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "new": true,
          "lego": { "known": "I want", "target": "quiero" }
        }
      ]
    }
  ]
}
```

### 2. lego_baskets.json (from Phase 3)
Practice phrases for each LEGO:
```json
{
  "version": "10.0",
  "baskets": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "practice_phrases": [
        { "known": "I want to speak", "target": "Quiero hablar" }
      ]
    }
  }
}
```

### 3. welcomes.json (canonical)
Course welcome messages with pre-generated audio references.

### 4. eng_encouragements.json (canonical)
Pooled and ordered encouragement messages.

---

## Output Format: course_manifest.json

### Top-Level Structure
```json
{
  "id": "en-spa",
  "known": "en",
  "target": "spa",
  "version": "8.2.0",
  "status": "alpha",
  "introduction": {
    "id": "UUID",
    "cadence": "natural",
    "role": "presentation",
    "duration": 45.83
  },
  "slices": [...]
}
```

### Language Codes
- **Known (English)**: Uses 2-letter code `en`
- **Target languages**: Use 3-letter codes (`spa`, `cmn`, `ita`, etc.)
- **ID format**: `{known}-{target}` (e.g., `en-spa`, `en-cmn`)

---

## Audio Roles (CRITICAL - Only 5 Valid Roles)

| Role | Description | Entries Per Text | Voice |
|------|-------------|------------------|-------|
| `source` | English/known language text | 1 | English (Aran clone) |
| `target1` | Target language - female | 1 | Female target voice |
| `target2` | Target language - male | 1 | Male target voice |
| `presentation` | LEGO introduction text | 1 | English (Aran clone) |
| `presentation_encouragement` | Encouragement messages | 1 | English (Aran clone) |

### Critical Rules
- Every **target language text** MUST have TWO entries: `target1` AND `target2`
- Every **known/English text** has ONE entry: `source`
- Presentations have ONE entry: `presentation`
- Encouragements have ONE entry: `presentation_encouragement`

---

## Samples Dictionary Structure

The samples dictionary maps text content to audio file references. The app looks up audio by TEXT CONTENT, not by LEGO ID.

```json
{
  "samples": {
    "I want to speak Spanish with you now.": [
      { "duration": 0, "id": "UUID1", "cadence": "natural", "role": "source" }
    ],
    "Quiero hablar español contigo ahora.": [
      { "duration": 0, "id": "UUID2", "cadence": "natural", "role": "target1" },
      { "duration": 0, "id": "UUID3", "cadence": "natural", "role": "target2" }
    ],
    "The Spanish for 'i want', is: ... 'quiero' ... 'quiero'": [
      { "duration": 0, "id": "UUID4", "cadence": "natural", "role": "presentation" }
    ],
    "And remember that your brain has got...": [
      { "duration": 0, "id": "UUID5", "cadence": "natural", "role": "presentation_encouragement" }
    ]
  }
}
```

---

## Practice Phrase Ordering (nodes array)

The `nodes` array in each introduction_item follows pedagogical principles:

### For A-type (Atomic) LEGOs
1. **LEGO debut** - The LEGO itself
2. **Practice phrases** - Sorted by length (shortest first)

### For M-type (Molecular) LEGOs
1. **Components** - Building blocks first (active practice before combining)
2. **LEGO debut** - The complete LEGO
3. **Practice phrases** - Sorted by length (shortest first)

**Pedagogical rationale**: Component drills come BEFORE the LEGO debut so learners actively practice the building blocks before combining them.

---

## UUID Generation

Deterministic UUIDs ensure same inputs always produce same outputs:

```javascript
function generateUUID(content) {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-').toUpperCase();
}
```

**Format**: `UPPERCASE` with hyphens (8-4-4-4-12)
**Example**: `C6A82DE8-6044-AC07-8F4E-412F54FEF5F7`

---

## Presentation Text Format

```
The {TargetLanguage} for '{known}', is: ... '{target}' ... '{target}'
```

**Example**: `The Spanish for 'i want', is: ... 'quiero' ... 'quiero'`

Note: Known text is lowercased in the template.

---

## Running the Script

```bash
node scripts/phase7-compile-manifest-v3.cjs <course_code>

# Examples:
node scripts/phase7-compile-manifest-v3.cjs spa_for_eng
node scripts/phase7-compile-manifest-v3.cjs cmn_for_eng
```

### Output
- **Primary**: `course_manifest.json`
- **Backup**: `{Target}_for_{Known}_speakers_COURSE_{timestamp}.json`

---

## Validation

Use the comparison tool to validate manifest structure:

```bash
node scripts/compare-manifests.cjs <manifest_path> [reference_path]

# Example:
node scripts/compare-manifests.cjs public/vfs/courses/spa_for_eng/course_manifest.json
```

Validates against Italian reference manifest for structural compatibility.

---

## Statistics (Production Courses)

### Spanish (spa_for_eng)
- Seeds: 630
- Introduction items: 1,912
- Practice nodes: 18,820
- Unique sample texts: 30,118
- Total sample entries: 43,979
- File size: ~14.5 MB

### Chinese (cmn_for_eng)
- Seeds: 659
- Introduction items: 2,266
- Practice nodes: 34,979
- Unique sample texts: 47,821
- Total sample entries: 69,974
- File size: ~23.7 MB

---

## Validation Gates

**Pre-Manifest**:
- ✅ lego_pairs.json exists (conflict-free, from Phase 2)
- ✅ lego_baskets.json exists (from Phase 3)
- ✅ welcomes.json exists (canonical)
- ✅ eng_encouragements.json exists (canonical)

**Post-Manifest**:
- ✅ course_manifest.json exists
- ✅ Valid structure (matches Italian reference)
- ✅ All UUIDs are deterministic (reproducible)
- ✅ Target texts have both target1 AND target2 entries
- ✅ All 5 roles present and correct

---

## Handoff to Audio Generation

The Audio process (Phase 8) reads course_manifest.json and generates MP3 files:
- Iterates through samples dictionary
- Generates audio for each entry using appropriate voice
- Names files with UUID from manifest
- Uploads to S3

---

**Last Updated**: Dec 3, 2025
**Related**: See `apml/phases/phase-7-manifest-compilation.apml` for full APML specification
