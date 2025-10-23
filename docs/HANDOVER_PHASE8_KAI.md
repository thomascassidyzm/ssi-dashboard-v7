# Phase 8 Audio Generation - Handover to Kai

**Date**: 2025-10-23
**Branch**: `feature/phase8-audio-generation` (create from `main`)
**Assignee**: Kai
**Status**: Ready for implementation

---

## Overview

You're implementing **Phase 8: Audio Generation** - the final phase that converts text into audio files. Everything before this (Phases 1-7) is complete and working.

Your job: Read the course manifest and generate audio files for all the text, naming each file with its deterministic UUID.

---

## What You're Getting

### Input File: `course_manifest.json`

A complete course package located at:
```
vfs/courses/{course_code}/course_manifest.json
```

**Test course**: `ita_for_eng_10seeds` (1,681 audio files)
**Full course**: `ita_for_eng_668seeds` (~110,000 audio files)

Start with the test course!

### Key Section: The `samples` Object

Inside the manifest, there's a `samples` object that looks like this:

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
        ]
      }
    }
  ]
}
```

**Translation**:
- Generate audio for "Voglio" with Italian voice 1 → save as `C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3`
- Generate audio for "Voglio" with Italian voice 2 → save as `4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3`
- Generate audio for "I want" with English voice → save as `489C5783-6044-36CD-31D4-4CB55EF258B5.mp3`

---

## What You're Producing

### Output: MP3 Audio Files

```
audio/
├── C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
├── 4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3
├── 489C5783-6044-36CD-31D4-4CB55EF258B5.mp3
└── ... (1,678 more for test course)
```

### Uploaded to S3

```
s3://ssi-courses/
└── {course_code}/
    └── audio/
        ├── C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
        ├── 4114E479-6044-E115-8F4E-8B1C4F02C6C8.mp3
        └── ...
```

---

## The Algorithm (Step by Step)

### 1. Load the Course Manifest

```javascript
const fs = require('fs-extra');

const courseCode = 'ita_for_eng_10seeds'; // Start with test course
const manifestPath = `vfs/courses/${courseCode}/course_manifest.json`;
const manifest = await fs.readJson(manifestPath);

const samples = manifest.slices[0].samples;
const targetLang = manifest.target;  // e.g., "ita"
const knownLang = manifest.known;    // e.g., "eng"
```

### 2. Set Up Voice Configuration

```javascript
// Map role → voice ID
const VOICE_IDS = {
  'ita': {
    target1: 'your-italian-voice-1-id',
    target2: 'your-italian-voice-2-id'
  },
  'eng': {
    source: 'your-english-voice-id'
  }
  // Add more languages...
};

// Get voice IDs for this course
const voices = {
  target1: VOICE_IDS[targetLang].target1,
  target2: VOICE_IDS[targetLang].target2,
  source: VOICE_IDS[knownLang].source
};
```

### 3. Iterate and Generate

```javascript
// Count total for progress tracking
const total = Object.values(samples).reduce((sum, arr) => sum + arr.length, 0);
let completed = 0;

// Process each phrase
for (const [text, variants] of Object.entries(samples)) {
  for (const variant of variants) {
    const { id, role, cadence } = variant;
    const voiceId = voices[role];

    console.log(`Generating: "${text.substring(0, 50)}..." (${role})`);

    // Generate audio via TTS
    const audioBuffer = await generateTTS(text, voiceId, cadence);

    // Save locally
    const localPath = `audio/${id}.mp3`;
    await fs.ensureDir('audio');
    await fs.writeFile(localPath, audioBuffer);

    // Upload to S3
    const s3Key = `${courseCode}/audio/${id}.mp3`;
    await uploadToS3(s3Key, audioBuffer);

    // Progress
    completed++;
    console.log(`✅ ${completed}/${total} (${Math.round(completed/total*100)}%)`);
  }
}

console.log(`\n🎉 Complete! Generated ${total} audio files.`);
```

---

## The TTS Function (ElevenLabs Example)

```javascript
async function generateTTS(text, voiceId, cadence = 'natural') {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

  // Cadence settings (currently only 'natural' used, but future-proofed)
  const speedMap = {
    natural: 1.0,
    fast: 1.3,
    slow: 0.7
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: speedMap[cadence]
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

---

## The S3 Upload Function

```javascript
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function uploadToS3(key, buffer) {
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

## Environment Variables You'll Need

Create `.env` file:

```bash
# ElevenLabs API
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
AWS_REGION=us-east-1
S3_BUCKET=ssi-courses
```

---

## Voice IDs You'll Need

Configure voice IDs for each language + role combination:

| Language | Role | Voice Type | Your Voice ID |
|----------|------|------------|---------------|
| Italian (ita) | target1 | Primary Italian voice | `???` |
| Italian (ita) | target2 | Alternate Italian voice | `???` |
| English (eng) | source | English voice | `???` |
| Spanish (spa) | target1 | Primary Spanish voice | `???` |
| Spanish (spa) | target2 | Alternate Spanish voice | `???` |

You'll need to set these up in ElevenLabs and map them in your code.

---

## Critical Rules (What NOT to Do)

### ❌ DON'T Read Individual Phase Files
```javascript
// WRONG - Don't do this!
const seedPairs = await fs.readJson('vfs/courses/.../seed_pairs.json');
const legoPairs = await fs.readJson('vfs/courses/.../lego_pairs.json');
```

### ✅ DO Read the Manifest
```javascript
// RIGHT - Do this!
const manifest = await fs.readJson('vfs/courses/.../course_manifest.json');
const samples = manifest.slices[0].samples;
```

### ❌ DON'T Generate New UUIDs
```javascript
// WRONG - Don't do this!
const uuid = uuidv4(); // Random UUID
const filename = `${uuid}.mp3`;
```

### ✅ DO Use UUIDs from Manifest
```javascript
// RIGHT - Do this!
const uuid = variant.id; // UUID from manifest
const filename = `${uuid}.mp3`;
```

### ❌ DON'T Use Text as Filename
```javascript
// WRONG - Don't do this!
const filename = `${text.replace(/\s+/g, '_')}.mp3`;
```

### ✅ DO Use UUID as Filename
```javascript
// RIGHT - Do this!
const filename = `${variant.id}.mp3`;
```

---

## Error Handling (Add Retry Logic)

```javascript
async function generateWithRetry(text, voiceId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateTTS(text, voiceId);
    } catch (error) {
      if (i === maxRetries - 1) {
        // Log failure and continue
        console.error(`❌ Failed after ${maxRetries} attempts: "${text.substring(0, 50)}..."`);
        throw error;
      }
      console.warn(`⚠️  Retry ${i + 1}/${maxRetries}: ${error.message}`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Testing Your Implementation

### 1. Start Small
```bash
# Generate first 10 samples only
node phase8.js --course ita_for_eng_10seeds --limit 10
```

### 2. Verify Filenames Match
```bash
# Check your audio files
ls audio/ | head -5

# Check manifest UUIDs
cat vfs/courses/ita_for_eng_10seeds/course_manifest.json | \
  jq '.slices[0].samples | to_entries | .[0:2]'
```

### 3. Listen to Samples
```bash
# Play a file (Mac)
afplay audio/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3

# Play a file (Linux)
mpg123 audio/C6A82DE8-6044-AC07-8F4E-412F54FEF5F7.mp3
```

### 4. Verify S3 Upload
```bash
# Check S3
aws s3 ls s3://ssi-courses/ita_for_eng_10seeds/audio/ | head -10
```

---

## Progress Tracking (Nice to Have)

```javascript
// Write progress to file for resumability
const progressFile = `progress_${courseCode}.json`;

// Load existing progress
let completed = {};
if (await fs.pathExists(progressFile)) {
  completed = await fs.readJson(progressFile);
}

// Skip already completed
if (completed[variant.id]) {
  console.log(`⏭️  Skipping ${variant.id} (already done)`);
  continue;
}

// Generate audio...

// Mark as completed
completed[variant.id] = true;
await fs.writeJson(progressFile, completed);
```

This lets you resume if the process crashes halfway through!

---

## Expected Statistics

### Test Course (`ita_for_eng_10seeds`)
- Unique phrases: 1,141
- Total audio files: **1,681**
  - Italian target1: ~560
  - Italian target2: ~560
  - English source: ~560
- Generation time: ~10-20 minutes (depends on API speed)
- Total size: ~50-100 MB

### Full Course (`ita_for_eng_668seeds`)
- Unique phrases: ~76,000
- Total audio files: **~110,000**
- Generation time: ~2-4 hours
- Total size: ~3-5 GB

---

## Deliverables

When you're done, you should have:

1. ✅ Script: `scripts/phase8-audio-generation.js` (or .cjs)
2. ✅ Audio files: `vfs/courses/{course_code}/audio/*.mp3`
3. ✅ S3 uploads: All files in `s3://ssi-courses/{course_code}/audio/`
4. ✅ Progress log: Failed samples (if any)
5. ✅ Test results: Verification that filenames match manifest UUIDs

---

## Documentation Reference

Full technical documentation:
📄 `docs/phase_intelligence/phase_8_audio_generation.md`

This includes:
- Complete API integration examples
- Anti-patterns (what not to do)
- Validation checklist
- Version history

---

## Questions?

**Tom is available for**:
- Voice ID setup questions
- API key provisioning
- S3 bucket access
- Testing approach

**Don't hesitate to ask** before diving in - better to clarify upfront!

---

## Quick Start Checklist

- [ ] Clone repo and checkout main branch
- [ ] Create feature branch: `feature/phase8-audio-generation`
- [ ] Install dependencies: `npm install`
- [ ] Set up `.env` with API keys
- [ ] Configure voice IDs in code
- [ ] Test with first 10 samples
- [ ] Verify filenames match manifest
- [ ] Run full test course (1,681 files)
- [ ] Verify S3 uploads
- [ ] Document any issues/improvements
- [ ] Create PR to merge back to main

---

**Good luck! This is the final piece that makes everything come together.** 🎵

---

**Generated**: 2025-10-23
**Course Pipeline**: Phases 1-7 ✅ Complete | Phase 8 🔧 In Progress
