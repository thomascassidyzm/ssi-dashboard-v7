# Phase 7: Course Manifest Generation Service

Phase 7 transforms validated phase outputs into final APML 3.2.0 course manifests ready for TTS and delivery.

## Architecture

```
services/phase7/
├── generate_manifest.py    # Main manifest generator
├── data/                    # Encouragements by language
│   ├── pooled_encouragements_en.json
│   └── ordered_encouragements_en.json
└── README.md               # This file
```

## What Phase 7 Does

**Input:** Phase outputs from course directory
- `seed_pairs.json` (Phase 1)
- `lego_pairs.json` (Phase 3)
- `lego_baskets_deduplicated.json` (Phase 5)
- `introductions.json` (Phase 6)

**Output:** Complete APML course manifest
- `{Target}_for_{Known}_speakers_COURSE_YYYYMMDD_HHMMSS.json`

**Transformations:**
1. ✅ Assembles seeds with introduction_items and practice nodes
2. ✅ Generates deterministic UUIDs for all samples (SSi legacy format)
3. ✅ Extracts tagged phrases from presentations
4. ✅ Embeds language-specific encouragements
5. ✅ Creates dual-voice sample entries (target1/target2)
6. ✅ Validates and structures complete APML manifest

## Usage

```bash
# Generate Spanish course manifest
python3 services/phase7/generate_manifest.py public/vfs/courses/spa_for_eng

# Generate with custom output path
python3 services/phase7/generate_manifest.py public/vfs/courses/spa_for_eng custom_output.json

# Generate any language pair
python3 services/phase7/generate_manifest.py public/vfs/courses/cmn_for_eng
```

## Output Structure

```json
{
  "id": "en-es",
  "known": "en",
  "target": "es",
  "version": "3.2.0",
  "status": "alpha",
  "introduction": {
    "id": "UUID",
    "cadence": "natural",
    "role": "presentation",
    "duration": null
  },
  "slices": [{
    "id": "UUID",
    "seeds": [
      {
        "id": "UUID",
        "seed_sentence": {"canonical": "English sentence"},
        "node": {
          "id": "UUID",
          "known": {"text": "...", "tokens": [...], "lemmas": [...]},
          "target": {"text": "...", "tokens": [...], "lemmas": [...]}
        },
        "introduction_items": [
          {
            "id": "UUID",
            "node": {...},
            "nodes": [...],
            "presentation": "The Spanish for 'I want', is: ... {target1}'quiero' ..."
          }
        ]
      }
    ],
    "pooledEncouragements": [...],
    "orderedEncouragements": [...],
    "samples": {
      "phrase text": [
        {
          "id": "deterministic-uuid",
          "role": "source|target1|target2|presentation",
          "cadence": "natural",
          "duration": null
        }
      ]
    },
    "version": "3.2.0"
  }]
}
```

## Deterministic UUIDs

Uses **SSi Legacy Format** compatible with Kai's JavaScript implementation.

**Algorithm:**
1. Create key: `text|language|role|cadence`
2. Generate SHA1 hash
3. Use fixed role-specific segments

**Format:** `XXXXXXXX-SSSS-RRRR-CCCC-XXXXXXXXXXXX`

**Role Segments:**
- `target1`: `6044-AC07-8F4E` (female voice)
- `target2`: `6044-E115-8F4E` (male voice)
- `source`: `6044-36CD-31D4` (known language)
- `presentation`: `9CFE-2486-8F4E` (instruction audio)

**Example:**
```
Text: "Quiero hablar español"
Role: target1
UUID: BF4042D3-6044-AC07-8F4E-A7E1F8200692
```

Same text with different role = different UUID (role is in hash key).

## Encouragements

Motivational content embedded per known language:

**English (en):**
- 26 pooled encouragements (random selection)
- 48 ordered encouragements (sequential delivery)

**Adding New Languages:**
1. Add pooled encouragements to `ENCOURAGEMENTS_BY_LANGUAGE` in `generate_manifest.py`
2. Create `data/ordered_encouragements_{lang}.json`
3. Script auto-loads for `{lang}_for_xx` courses

## Key Features

### Tagged Phrase Extraction
Presentations can include tagged phrases that become sample entries:
```
"The Spanish for 'I want', is: ... {target1}'quiero' ... 'quiero'"
```
The `{target1}'quiero'` becomes a sample with role="target1".

### Dual-Voice Support
All target language phrases get TWO sample entries:
- `target1` - female voice (uses feminine forms during TTS)
- `target2` - male voice (uses masculine forms during TTS)

Course data uses masculine forms by default. Gender agreement happens at TTS phase.

### Fixed Issues
This implementation fixes:
- ✅ Swapped target/known in basket metadata
- ✅ Swapped practice_phrases arrays ([Spanish, English] → [English, Spanish])
- ✅ Missing tagged phrase samples
- ✅ Inconsistent UUID generation

## Integration Points

**Upstream (Phases 1-6):**
- Consumes validated phase outputs
- Expects fixed basket data structure

**Downstream (TTS/Audio):**
- Provides deterministic UUIDs for audio file naming
- Duration field populated by TTS process
- Sample roles determine voice/gender selection

**Related Services:**
- `services/orchestration/` - Multi-agent coordination
- `tools/validators/` - Pre-phase-7 validation
- `tools/sync/` - S3 course deployment

## Development

**Testing:**
```bash
# Test with Spanish course
python3 services/phase7/generate_manifest.py public/vfs/courses/spa_for_eng

# Verify UUID format
python3 -c "
from services.phase7.generate_manifest import CourseManifestGenerator
gen = CourseManifestGenerator('.')
uuid = gen.generate_deterministic_uuid('test', 'es', 'target1', 'natural')
print(uuid)
"
```

**Adding Languages:**
See ENCOURAGEMENTS_BY_LANGUAGE dict in generate_manifest.py

## Notes

- Durations set to `null` - populated during TTS phase
- All UUIDs are deterministic and reproducible
- Gender agreement applied at TTS, not in manifest
- Separated from legacy `scripts/phase7-*` implementations
- Part of SSi Phase 7 service layer, not general tools

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0
**Status:** Production-ready
