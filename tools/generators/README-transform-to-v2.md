# Transform to v2 Manifest

## Overview

The `transform-to-v2-manifest.cjs` script converts SSi Dashboard output (Phase 2/3) into the simplified CourseManifest format expected by the ssi-learning-app.

## Purpose

The SSi Dashboard generates complex, detailed course data for editing and management. The Learning App needs a simpler, flatter structure optimized for the player experience. This transformer bridges the gap.

## Input Files

The script reads from the course directory (`public/vfs/courses/{course_code}/`):

1. **lego_pairs.json** - Seeds with LEGOs (from Phase 2)
   - Contains the source of truth for all seeds and their LEGOs
   - Includes LEGO types (A=Atomic, M=Molecular)
   - Has component breakdowns for M-type LEGOs

2. **lego_baskets.json** - Practice baskets (from Phase 3)
   - Currently NOT used by this transformer (future enhancement)
   - Could be used to add practice phrases to the manifest

3. **s3_durations.json** - Audio durations from S3
   - Contains actual durations for generated audio files
   - Overrides MAR durations when available

4. **MAR (Master Audio Registry)** - `samples_database/voices/[voice_id]/samples.json`
   - Maps text → UUID for audio lookups
   - Contains duration metadata
   - Multiple voices per language (voice1, voice2)

## Output File

**course_manifest_v2.json** - Simplified manifest for ssi-learning-app

```json
{
  "course_id": "spa_for_eng",
  "title": "Spanish for English Speakers",
  "known_language": "en",
  "target_language": "es",
  "version": "2.0.0",
  "seeds": [...],
  "audio_count": 2013,
  "estimated_hours": 2
}
```

### Seed Structure

```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "known": "I want to speak Spanish with you now.",
    "target": "Quiero hablar español contigo ahora."
  },
  "legos": [...],
  "audioRefs": {
    "known": {
      "id": "UUID",
      "url": "https://s3.../UUID.mp3",
      "duration_ms": 1234
    },
    "target": {
      "voice1": { "id": "UUID", "url": "...", "duration_ms": 2136 },
      "voice2": { "id": "UUID", "url": "...", "duration_ms": 2832 }
    }
  }
}
```

### LEGO Structure

```json
{
  "id": "S0001L01",
  "type": "A",
  "new": true,
  "lego": {
    "known": "I want",
    "target": "quiero"
  },
  "audioRefs": { ... },
  "components": [  // Only for M-type LEGOs
    {
      "known": "I'm",
      "target": "estoy",
      "audioRefs": { ... }
    }
  ]
}
```

## Usage

### Basic Usage

```bash
# Generate v2 manifest for Spanish course
node tools/generators/transform-to-v2-manifest.cjs spa_for_eng

# Preview transformation without writing
node tools/generators/transform-to-v2-manifest.cjs spa_for_eng --dry-run

# Help
node tools/generators/transform-to-v2-manifest.cjs --help
```

### Supported Courses

- `spa_for_eng` - Spanish for English Speakers
- `cmn_for_eng` - Mandarin for English Speakers
- `ita_for_eng` - Italian for English Speakers
- `fra_for_eng` - French for English Speakers
- `bre_for_eng` - Breton for English Speakers
- `eng_for_cmn` - English for Mandarin Speakers

## How It Works

### 1. Load Input Data

- Parses course code to extract target/known languages
- Loads lego_pairs.json and lego_baskets.json
- Builds text→UUID index from MAR (optimized for large files)
- Loads S3 durations for accurate timing

### 2. Audio Lookup

For each text pair (seed, LEGO, component):

1. Normalize text (lowercase, trim)
2. Build lookup key: `{text}|{language}|{role}|{cadence}`
3. Find UUID in MAR text index
4. Build S3 URL: `https://popty-bach-lfs.s3.eu-west-1.amazonaws.com/courses/{course}/audio/{uuid}.mp3`
5. Get duration from s3_durations.json or MAR

**Audio Roles:**
- Known language: `role=source`, `cadence=natural`
- Target language voice1: `role=target1`, `cadence=slow`
- Target language voice2: `role=target2`, `cadence=slow`

**Language Code Handling:**
The MAR is inconsistent with language codes:
- English: uses ISO 639-1 code `en`
- Spanish: uses ISO 639-3 code `spa`
- Mandarin: uses ISO 639-3 code `cmn`

The script handles this by:
- Converting known language to ISO 639-1 (eng→en)
- Keeping target language as-is (spa, cmn, etc.)

### 3. Transform Seeds

For each seed:
1. Get audio refs for seed sentence
2. Transform each LEGO:
   - Get audio refs for LEGO
   - For M-type: add components with audio refs
3. Build final seed structure

### 4. Build Manifest

- Count total audio references
- Estimate hours (3 sec avg per audio)
- Generate metadata
- Write JSON file

## Optimization

The script is optimized for large MAR files (50MB+):

1. **Selective Loading** - Skips MAR files not relevant to the course
2. **Text Index** - Creates `text|lang|role|cadence` → UUID lookup for O(1) searches
3. **Single Pass** - Processes all seeds in one iteration

## Missing Audio Handling

If audio is not found for a text pair:
- Sets `audioRefs` to `null` (not omitted - explicit null)
- Continues processing (doesn't fail)
- Reports count of found vs missing audio

This allows the manifest to be generated even if audio generation is incomplete.

## Output Stats

Example for spa_for_eng:

```
✓ Transformed 668 seeds
✓ Found audio for 504 items
✓ Missing audio for 2960 items
✓ Total audio references: 2013
✓ Estimated hours: 2h
✓ File size: 2.2MB
```

## Integration with Learning App

The generated `course_manifest_v2.json` can be directly consumed by ssi-learning-app:

1. Copy to learning app: `packages/player-vue/public/courses/`
2. Or serve via API endpoint
3. App loads manifest and uses audioRefs for player

## Future Enhancements

1. **Practice Phrases** - Include baskets data for more practice variety
2. **Eternal Rotation** - Add mastered LEGOs for continuous review
3. **Metadata Enrichment** - Add difficulty scores, topics, etc.
4. **Incremental Updates** - Only regenerate changed seeds
5. **Validation** - Check manifest against APML spec before writing

## Troubleshooting

### "No audio found"
- Check that MAR exists in `samples_database/voices/`
- Verify language codes match (en, spa, cmn, etc.)
- Ensure audio has been generated for the course

### "Large memory usage"
- Script optimized to skip large irrelevant MAR files
- Only loads voices matching course languages

### "Wrong durations"
- s3_durations.json should contain latest durations
- Run audio generation to update durations

## Related Scripts

- `phase8-generate-audio.cjs` - Generates TTS audio
- `sync-course-to-s3.cjs` - Syncs course to S3
- `course-validator.cjs` - Validates course data

## Version History

- **2.0.0** (2025-12-04) - Initial v2 manifest transformer
  - Optimized MAR loading for large files
  - Text index for O(1) audio lookups
  - Handles missing audio gracefully
  - Supports M-type LEGO components
