# SSi Audio Samples Database (MAR)

**Version**: 1.0.0
**Created**: 2025-01-23
**Architecture**: Voice-based organization

---

## Overview

This is the Master Audio Registry (MAR) for all SSi course audio samples. It tracks every audio clip generated across all courses, organized by voice ID rather than language.

---

## Structure

```
samples_database/
├── README.md                    # This file
├── voices.json                  # Voice registry and course assignments
├── voices/
│   ├── {voice_id}/
│   │   ├── metadata.json        # Voice configuration
│   │   └── samples.json         # All samples for this voice
│   └── ...
└── migration/
    └── import-old-mar.cjs       # Migration scripts (for later)
```

---

## Voice ID Naming Convention

Format: `{provider}_{provider_id}`

**Examples**:
- `elevenlabs_21m00Tcm4TlvDq8ikWAM`
- `azure_en-US-AriaNeural`

This ensures consistency across providers (ElevenLabs, Azure, etc.)

---

## S3 Audio Storage

All audio files are stored in a **flat structure**:

- **Stage bucket**: `s3://ssi-audio-stage/mastered/{uuid}.mp3`
- **Production bucket**: `s3://ssiborg-assets/mastered/{uuid}.mp3`

No subdirectories - all files at the same level.

---

## UUID Strategy

### Valid UUIDs (New System)
All new samples use RFC 4122 compliant UUID v5:
- Deterministic (same text + language + role = same UUID)
- Format: `A1B2C3D4-E5F6-5789-ABCD-EF0123456789`

### Legacy UUIDs (Buffer Period)
Old samples may have non-RFC-4122 UUIDs - these are accepted but marked with `is_valid_uuid: false`

---

## Sample Types

- **phrase**: Regular course content (seeds, LEGOs, practice phrases)
- **presentation**: Instructional text read by narrator
- **encouragement**: Motivational content (pooled across courses)
- **welcome**: Course introduction (unique per course, often human-recorded)

---

## Usage

### Query Samples
```javascript
const { loadVoiceSamples, findExistingSample } = require('../services/mar-service.cjs');

const voiceSamples = await loadVoiceSamples('elevenlabs_21m00Tcm4TlvDq8ikWAM');
const existing = findExistingSample(voiceSamples, 'I want to speak Italian', 'source', 'eng', 'natural');
```

### Add New Sample
```javascript
const { saveSample } = require('../services/mar-service.cjs');

await saveSample('elevenlabs_21m00Tcm4TlvDq8ikWAM', 'A1B2C3D4-...', {
  text: 'I want to speak Italian',
  language: 'eng',
  role: 'source',
  cadence: 'natural',
  duration: 2.145,
  s3_bucket: 'ssi-audio-stage',
  s3_key: 'mastered/A1B2C3D4-E5F6-5789-ABCD-EF0123456789.mp3',
  is_valid_uuid: true,
  sample_type: 'phrase',
  courses_used: ['ita_for_eng_10seeds']
});
```

---

## Migration from Old MAR

The old MAR was organized by language (`eng.json`, `ita.json`, etc.). Migration scripts are in `migration/` directory but will be run **after** the new system is tested and validated.

For now, we're starting with a **clean slate** for testing.

---

## Version Control

This database is version-controlled with git. When adding samples:
1. Update the relevant voice's `samples.json`
2. Update `sample_count` in voice metadata
3. Commit with descriptive message: `"Add 50 samples for ita_for_eng_10seeds"`

---

## Related Documentation

- Phase 8 Spec: `docs/phase_intelligence/phase_8_audio_generation.md`
- Service Layer: `services/mar-service.cjs`
- UUID Generation: `services/uuid-service.cjs`
