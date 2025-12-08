# Phase 8: Audio Generation

**Port**: 3465
**Version**: 1.1
**Status**: Active
**Input**: lego_baskets.json (APML v11.0: audio-first approach)
**Output**:
- MP3 audio files (uploaded to S3)
- Supabase `audio_samples` table records

---

## Overview

Generate audio files for all text in the course using text-to-speech. In APML v11.0, audio generation happens **BEFORE** manifest compilation (audio-first approach).

---

## Core Principles

### 1. **Audio-First (APML v11.0)**

Phase 8 reads from `lego_baskets.json` directly - NOT from course_manifest.json. Audio is generated BEFORE the manifest exists.

### 2. **Deterministic UUID**

Every audio file is named with a deterministic UUID:
```
hash(voice_id | text | lang | role | cadence) → UUID
```
Same inputs always produce same UUID, enabling cross-course deduplication.

### 3. **Supabase Audio Registry**

Audio metadata is stored in Supabase `audio_samples` table, not file-based MAR:
```sql
audio_samples (
  uuid TEXT PRIMARY KEY,
  text TEXT,
  language TEXT,
  role TEXT,
  cadence TEXT,
  voice_id TEXT,
  s3_key TEXT,
  duration REAL,
  created_at TIMESTAMP
)
```

### 4. **Role-Voice Mapping**

- **target1**: Primary target language voice (female)
- **target2**: Alternate target language voice (male)
- **source**: Known language voice (English)
- **presentation**: LEGO introduction text (English)

### 5. **Cadence Rules (APML v11.0)**

- **source**: `natural` cadence
- **target**: `slow` cadence (helps learner comprehension)

---

## Input Format

**File**: `vfs/courses/{course_code}/lego_baskets.json`

```json
{
  "version": "11.0",
  "baskets": {
    "S0001L01": {
      "lego_id": "S0001L01",
      "lego": {"known": "I want", "target": "quiero"},
      "practice_phrases": [
        {"known": "I want to speak", "target": "Quiero hablar"},
        {"known": "I want to go", "target": "Quiero ir"}
      ]
    }
  }
}
```

---

## Output

### S3 Structure
```
s3://popty-bach-lfs/
└── mastered/
    └── {uuid}.mp3
```

### Supabase Records
```json
{
  "uuid": "C6A82DE8-6044-AC07-8F4E-412F54FEF5F7",
  "text": "Quiero hablar",
  "language": "spa",
  "role": "target1",
  "cadence": "slow",
  "voice_id": "azure-es-female-1",
  "s3_key": "mastered/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3",
  "duration": 1.45,
  "created_at": "2025-12-08T10:30:00Z"
}
```

---

## Implementation Algorithm

### 1. Load Baskets
```javascript
const baskets = await fs.readJson(`vfs/courses/${courseCode}/lego_baskets.json`);
```

### 2. Extract All Phrases
```javascript
const allPhrases = [];
for (const [legoId, basket] of Object.entries(baskets.baskets)) {
  // Add LEGO itself
  allPhrases.push({
    known: basket.lego.known,
    target: basket.lego.target,
    legoId
  });

  // Add practice phrases
  for (const phrase of basket.practice_phrases) {
    allPhrases.push({
      known: phrase.known,
      target: phrase.target,
      legoId
    });
  }
}
```

### 3. Generate Audio for Each Phrase
```javascript
for (const phrase of allPhrases) {
  // Generate source audio (known language)
  const sourceUUID = generateDeterministicUUID(phrase.known, knownLang, 'source', 'natural', sourceVoiceId);
  if (!await audioExists(sourceUUID)) {
    const audio = await generateTTS(phrase.known, sourceVoiceId, 'natural');
    await uploadToS3(`mastered/${sourceUUID}.mp3`, audio);
    await insertSupabaseRecord(sourceUUID, phrase.known, knownLang, 'source', 'natural', sourceVoiceId);
  }

  // Generate target1 audio (target language, female)
  const target1UUID = generateDeterministicUUID(phrase.target, targetLang, 'target1', 'slow', target1VoiceId);
  if (!await audioExists(target1UUID)) {
    const audio = await generateTTS(phrase.target, target1VoiceId, 'slow');
    await uploadToS3(`mastered/${target1UUID}.mp3`, audio);
    await insertSupabaseRecord(target1UUID, phrase.target, targetLang, 'target1', 'slow', target1VoiceId);
  }

  // Generate target2 audio (target language, male)
  const target2UUID = generateDeterministicUUID(phrase.target, targetLang, 'target2', 'slow', target2VoiceId);
  // ... same pattern
}
```

### 4. Deduplication

Because UUIDs are deterministic, the same phrase across different courses or LEGOs produces the same UUID. The `audioExists()` check prevents regenerating audio that already exists.

---

## Voice Configuration

### Azure TTS Voices (Recommended)

```javascript
const VOICE_CONFIG = {
  'spa': {
    target1: 'es-ES-ElviraNeural',      // Female Spanish
    target2: 'es-ES-AlvaroNeural'       // Male Spanish
  },
  'cmn': {
    target1: 'zh-CN-XiaoxiaoNeural',    // Female Mandarin
    target2: 'zh-CN-YunxiNeural'        // Male Mandarin
  },
  'eng': {
    source: 'en-GB-RyanNeural'          // Male English (Aran-like)
  }
};
```

---

## API Endpoints

```
POST /generate              Start audio generation for course
POST /plan                  Show generation plan (dry-run with cost estimate)
GET  /status/:courseCode    Check job status
DELETE /cancel/:courseCode  Cancel active job
GET  /health               Health check
```

---

## Progress Tracking

```javascript
const total = allPhrases.length * 3; // source + target1 + target2
let completed = 0;
let skipped = 0;  // Already exists (deduplication)

// Update progress
if (audioExists) {
  skipped++;
} else {
  // Generate...
  completed++;
}

console.log(`Progress: ${completed + skipped}/${total} (${skipped} skipped)`);
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
failedSamples.push({ uuid, text, role, error: error.message });

// Write log for retry
await fs.writeJson('failed_samples.json', failedSamples, { spaces: 2 });
```

---

## Validation Checklist

✅ Reading from `lego_baskets.json` (NOT course_manifest.json - audio-first!)
✅ Using deterministic UUID generation
✅ All variants generated (source, target1, target2)
✅ Audio files uploaded to S3 `mastered/` prefix
✅ Records inserted into Supabase `audio_samples` table
✅ Deduplication working (skipping existing UUIDs)
✅ Progress tracking implemented
✅ Error handling with retry logic
✅ Failed samples logged for retry

---

## Environment Variables

```bash
# Azure TTS
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=westeurope

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx

# AWS S3
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
```

---

## Handoff to Phase 9

Phase 9 (Manifest Compilation) queries Supabase for audio UUIDs by text+role, then compiles the final course_manifest.json with audio references.

---

## Version History

- v1.0: Initial implementation with manifest-driven approach
- v1.1: Added duration measurement, welcome audio support
- v2.0 (APML v11.0): Audio-first approach, Supabase integration, deterministic UUIDs

**Last Updated**: Dec 8, 2025
