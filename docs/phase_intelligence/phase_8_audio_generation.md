# Phase 8: Audio Generation

**Version**: 1.0
**Status**: 🔧 Assigned to Kai (separate branch)
**Last Updated**: 2025-10-23
**Branch**: `feature/phase8-audio-generation`
**Output**: MP3 audio files (uploaded to S3)

---

## Purpose

Generate audio files for all text in the course manifest using text-to-speech. Each audio file is named with its deterministic UUID from Phase 7, ensuring perfect alignment between manifest references and actual audio files.

---

## Core Principles

### 1. **Manifest-Driven Generation**
Phase 8 reads ONLY from `course_manifest.json` - specifically the `samples` object. Do NOT read from individual phase files (seed_pairs, lego_pairs, etc).

### 2. **UUID Filenames**
Every audio file MUST be named exactly as its UUID from the manifest:
```
C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
```

No other naming scheme will work with the app.

### 3. **No Manifest Generation**
Phase 7 already created the complete manifest with all UUIDs. Phase 8 only generates audio files - it does NOT modify or regenerate the manifest.

### 4. **Role-Voice Mapping**
- **target1**: Primary target language voice (e.g., Italian voice 1)
- **target2**: Alternate target language voice (e.g., Italian voice 2)
- **source**: Known language voice (e.g., English voice)

---

## Input Format

**File**: `vfs/courses/{course_code}/course_manifest.json`

### Samples Structure
```json
{
  "slices": [
    {
      "samples": {
        "Voglio": [
          {
            "id": "C6A82DE8-6044-AC07-8F4E-412F54FEF5F7",
            "cadence": "natural",
            "role": "target1"
          },
          {
            "id": "4114E479-6044-E115-8F4E-8B1C4F02C6C8",
            "cadence": "natural",
            "role": "target2"
          }
        ],
        "I want": [
          {
            "id": "489C5783-6044-36CD-31D4-4CB55EF258B5",
            "cadence": "natural",
            "role": "source"
          }
        ],
        "Now, the Italian for \"I want\" as in...": [
          {
            "id": "...",
            "cadence": "natural",
            "role": "source"
          }
        ]
      }
    }
  ]
}
```

---

## Output Format

### Audio Files
```
audio/
├── C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3  (Voglio, target1)
├── 4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3  (Voglio, target2)
├── 489C5783-6044-36CD-31D4-4CB55EF258B5.mp3  (I want, source)
└── ...
```

### S3 Structure
```
s3://ssi-courses/
└── {course_code}/
    └── audio/
        ├── C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
        ├── 4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3
        └── ...
```

---

## Implementation Algorithm

### 1. Load Course Manifest
```javascript
const manifest = await fs.readJson(`vfs/courses/${courseCode}/course_manifest.json`);
const samples = manifest.slices[0].samples;
```

### 2. Extract Voice Configuration
From course metadata:
```javascript
const targetLang = manifest.target;  // e.g., "ita"
const knownLang = manifest.known;    // e.g., "eng"

const voiceConfig = {
  target1: getVoiceId(targetLang, 'primary'),    // Italian voice 1
  target2: getVoiceId(targetLang, 'alternate'),  // Italian voice 2
  source: getVoiceId(knownLang, 'primary')       // English voice
};
```

### 3. Iterate Through Samples
```javascript
for (const [text, variants] of Object.entries(samples)) {
  for (const variant of variants) {
    const { id, role, cadence } = variant;

    // Generate audio
    const audioBuffer = await generateTTS(text, voiceConfig[role], cadence);

    // Save locally
    await fs.writeFile(`audio/${id}.mp3`, audioBuffer);

    // Upload to S3
    await uploadToS3(`${courseCode}/audio/${id}.mp3`, audioBuffer);

    console.log(`✅ ${id}.mp3 - "${text}" (${role})`);
  }
}
```

---

## Voice ID Mapping

### Language → Voice ID
Maintain a mapping of language codes to ElevenLabs voice IDs:

```javascript
const VOICE_IDS = {
  'ita': {
    primary: 'voice-id-italian-1',
    alternate: 'voice-id-italian-2'
  },
  'spa': {
    primary: 'voice-id-spanish-1',
    alternate: 'voice-id-spanish-2'
  },
  'eng': {
    primary: 'voice-id-english-1',
    alternate: 'voice-id-english-2'
  },
  // Add more languages...
};
```

---

## Cadence Handling

Currently only "natural" cadence is used. Future support for "fast" and "slow":

```javascript
function getCadenceSettings(cadence) {
  switch (cadence) {
    case 'natural':
      return { speed: 1.0 };
    case 'fast':
      return { speed: 1.3 };
    case 'slow':
      return { speed: 0.7 };
  }
}
```

---

## Progress Tracking

Track progress for long-running generation:

```javascript
const total = Object.values(samples).reduce((sum, arr) => sum + arr.length, 0);
let completed = 0;

// Update progress
completed++;
console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
```

---

## Error Handling

### Retry Logic
```javascript
async function generateWithRetry(text, voiceId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateTTS(text, voiceId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Retry ${i+1}/${maxRetries} for: ${text}`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### Failed Samples Log
```javascript
const failedSamples = [];

// On error
failedSamples.push({ uuid: id, text, role, error: error.message });

// Write log
await fs.writeJson('failed_samples.json', failedSamples, { spaces: 2 });
```

---

## Validation Checklist

✅ Reading from `course_manifest.json` (not individual phase files)
✅ Using UUID from manifest as filename (not generating new UUIDs)
✅ All variants generated for each phrase (target1, target2, source)
✅ Audio files saved with `.mp3` extension
✅ Uploaded to correct S3 path: `{course_code}/audio/{uuid}.mp3`
✅ Voice IDs correctly mapped (target → target lang, source → known lang)
✅ Progress tracking implemented for long-running generation
✅ Error handling with retry logic
✅ Failed samples logged for retry

---

## Anti-patterns

❌ **Don't read from individual phase files**
Bad: Reading seed_pairs.json, lego_pairs.json separately
Good: Reading samples object from course_manifest.json

❌ **Don't generate new UUIDs**
Bad: Creating your own UUIDs for filenames
Good: Using exact UUID from manifest

❌ **Don't modify the manifest**
Bad: Adding duration or other metadata to manifest
Good: Only generate audio files, leave manifest alone

❌ **Don't use text as filename**
Bad: `Voglio.mp3` or `I_want.mp3`
Good: `C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3`

❌ **Don't skip role variants**
Bad: Only generating target1, skipping target2
Good: Generate ALL variants listed in samples

---

## Example Statistics

**Test Course**: `ita_for_eng_10seeds`
- Unique phrases: 1,141
- Total audio files: 1,681
  - Target1 (Italian voice 1): ~560 files
  - Target2 (Italian voice 2): ~560 files
  - Source (English): ~560 files

**Larger Course**: `ita_for_eng_668seeds` (full curriculum)
- Estimated audio files: ~110,000
- Generation time: ~30-60 minutes (depends on TTS API speed)

---

## API Integration

### ElevenLabs Example
```javascript
async function generateTTS(text, voiceId, cadence = 'natural') {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: getCadenceSettings(cadence).speed
      }
    })
  });

  return await response.buffer();
}
```

### S3 Upload Example
```javascript
async function uploadToS3(key, buffer) {
  const s3 = new AWS.S3();

  await s3.putObject({
    Bucket: 'ssi-courses',
    Key: key,
    Body: buffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  }).promise();
}
```

---

## Requirements

### API Keys
- ElevenLabs API key (for TTS)
- AWS credentials (for S3 upload)

### Voice IDs
Configure voice IDs for each language:
- Italian: 2 voices (target1, target2)
- Spanish: 2 voices
- French: 2 voices
- Mandarin: 2 voices
- English: 1 voice (source)
- etc.

### Environment Variables
```bash
ELEVENLABS_API_KEY=your_key_here
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
S3_BUCKET=ssi-courses
```

---

## Testing

### Test with Small Course
Start with `ita_for_eng_10seeds` (1,681 files) before attempting full 668-seed course.

### Verify Filenames
```bash
# Check first 5 filenames match manifest UUIDs
ls audio/ | head -5
cat vfs/courses/ita_for_eng_10seeds/course_manifest.json | jq '.slices[0].samples | to_entries | limit(5;.[])'
```

### Sample Playback
```bash
# Play a sample to verify quality
afplay audio/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
```

---

## Version History

### v1.0 (2025-10-23)
- Initial implementation guidelines
- Manifest-driven approach (no individual file reading)
- UUID-based filenames from Phase 7
- Role-voice mapping strategy
- ElevenLabs integration example
- S3 upload structure

---

## Related Phases

- **Phase 7**: Provides course_manifest.json with all sample UUIDs
- **Phase 6**: Generated presentation text (included in samples)
- **App**: Expects audio files at S3 paths matching UUIDs in manifest

---

**Remember**: Phase 8 is purely audio generation. The manifest is complete from Phase 7 - don't modify it, just generate the audio files it references!
