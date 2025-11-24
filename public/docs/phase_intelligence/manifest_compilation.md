# Manifest: Course Compilation (Script)

**Version**: 9.0.0
**Status**: Active
**Type**: Script (runs instantly - not a phase)
**Input**: lego_pairs.json, lego_baskets.json, introductions.json
**Output**: course_manifest.json

## Overview

The Manifest script compiles all phase outputs into a final course manifest ready for audio generation. This is **not a phase** - it's a deterministic script that runs instantly without agent orchestration.

## Key Distinction: Script vs Phase

- **Phase**: Triggers Claude Code agents (takes time, requires orchestration)
- **Script**: Runs instantly, deterministic transformation

**Manifest is a script** - it transforms existing data into the fixed format required by the mobile app.

## Input Files

### 1. lego_pairs.json (SINGLE SOURCE OF TRUTH)
```json
{
  "version": "9.0",
  "seeds": [
    ["S0001", ["I want", "Dw i"], [["S0001L01", "B", "I", "Dw i"]]]
  ]
}
```

### 2. lego_baskets.json
```json
{
  "version": "9.0",
  "baskets": {
    "S0001L01": [
      [["S0001L01", "B", "I", "Dw i"]],
      [["I want", "Dw i eisiau"]],
      [["Do you want?", "Wyt ti eisiau?"]]
    ]
  }
}
```

### 3. introductions.json (auto-scripted at end of Phase 2)
```json
{
  "version": "9.0",
  "intros": [
    {
      "id": "INTRO_S0001",
      "seed_id": "S0001",
      "target": "Dw i eisiau",
      "known": "I want"
    }
  ]
}
```

## Output Format: course_manifest.json

Fixed format consumed by mobile app (iOS/Android):

```json
{
  "version": "9.0.0",
  "course_code": "spa_for_eng",
  "target_language": "Spanish",
  "known_language": "English",
  "created_at": "2025-11-24T12:00:00Z",
  "samples": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "type": "introduction",
      "seed_id": "S0001",
      "target": "Quiero",
      "known": "I want",
      "audio": {
        "target": "audio/intros/S0001_target.mp3",
        "known": "audio/intros/S0001_known.mp3"
      }
    },
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "type": "basket",
      "lego_id": "S0001L01",
      "phrases": [...],
      "audio": [...]
    }
  ]
}
```

## Compilation Algorithm

```javascript
// 1. Load all inputs
const legoPairs = readJSON('lego_pairs.json')
const legoBaskets = readJSON('lego_baskets.json')
const introductions = readJSON('introductions.json')

// 2. Compile samples
const samples = []

// 2a. Add introductions
for (const intro of introductions.intros) {
  samples.push({
    uuid: generateDeterministicUUID(intro.id),
    type: 'introduction',
    seed_id: intro.seed_id,
    target: intro.target,
    known: intro.known,
    audio: {
      target: `audio/intros/${intro.seed_id}_target.mp3`,
      known: `audio/intros/${intro.seed_id}_known.mp3`
    }
  })
}

// 2b. Add baskets
for (const [legoId, basket] of Object.entries(legoBaskets.baskets)) {
  samples.push({
    uuid: generateDeterministicUUID(legoId),
    type: 'basket',
    lego_id: legoId,
    phrases: basket[0], // LEGOs
    enabling_phrases: basket[1],
    discovery_phrases: basket[2],
    audio: generateAudioPaths(legoId)
  })
}

// 3. Write manifest
writeJSON('course_manifest.json', { version: '9.0.0', samples })
```

## UUID Generation (SSi Legacy Format)

For backward compatibility with existing mobile apps:

```javascript
function generateDeterministicUUID(id) {
  // Use MD5 hash of ID string
  const hash = crypto.createHash('md5').update(id).digest('hex')

  // Format as UUID v4
  return `${hash.substr(0,8)}-${hash.substr(8,4)}-${hash.substr(12,4)}-${hash.substr(16,4)}-${hash.substr(20,12)}`
}
```

## Language-Specific Encouragements

The manifest embeds language-specific encouragements from `public/vfs/canonical/encouragements_{target_lang}.json`:

```json
{
  "encouragements": [
    { "target": "¡Excelente!", "known": "Excellent!" },
    { "target": "¡Muy bien!", "known": "Very good!" }
  ]
}
```

## Validation Gates

✅ **Pre-Manifest**:
- lego_pairs.json exists (conflict-free)
- lego_baskets.json exists
- introductions.json exists

✅ **Post-Manifest**:
- course_manifest.json exists
- Valid v9.0.0 format
- All UUIDs are deterministic (reproducible)
- All audio paths are correct

## Handoff to Audio Generation

The Audio process reads course_manifest.json and generates MP3 files using TTS services (Azure/ElevenLabs). This is handled by Kai as a separate process.

---

**Last Updated**: Nov 24, 2025
**Related**: See `public/docs/APML_v9.0_PIPELINE_ARCHITECTURE.md` for full specification
