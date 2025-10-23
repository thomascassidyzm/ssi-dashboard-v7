# Phase 8: Audio Generation - Spec for Kai

**Branch**: `feature/phase8-audio-generation`
**Assignee**: Kai
**Status**: Ready to start
**Parallel with**: Main branch SSoT migration (minimal conflicts)

---

## Task Overview

Generate TTS audio for all course content using ElevenLabs API and upload to S3 for app deployment.

---

## What Needs Audio?

### 1. Seed Pairs (Phase 1 output)
**File**: `vfs/courses/{code}/seed_pairs.json`
**Content**: All 668 seed translations
```json
{
  "S0001": ["Quiero hablar español.", "I want to speak Spanish."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."]
}
```
**Audio needed**: Target language only ("Quiero hablar español.")
**Output**: `S0001_target.mp3`, `S0002_target.mp3`

### 2. LEGO Pairs (Phase 3 output)
**File**: `vfs/courses/{code}/lego_pairs.json`
**Content**: All extracted LEGOs
```json
["S0001", ["Quiero hablar español.", "I want to speak Spanish."], [
  ["S0001L01", "B", "Quiero", "I want"],
  ["S0001L02", "B", "hablar", "to speak"]
]]
```
**Audio needed**: Each LEGO's target text ("Quiero", "hablar")
**Output**: `S0001L01_target.mp3`, `S0001L02_target.mp3`

### 3. LEGO Baskets (Phase 5 output)
**File**: `vfs/courses/{code}/lego_baskets.json`
**Content**: E-phrases and D-phrases for each LEGO
```json
{
  "S0001L01": {
    "lego": ["Quiero", "I want"],
    "e": [
      ["Quiero hablar español.", "I want to speak Spanish."]
    ],
    "d": {
      "2": [["Quiero hablar", "I want to speak"]]
    }
  }
}
```
**Audio needed**: All e-phrases and d-phrases (target only)
**Output**: `S0001L01_e1.mp3`, `S0001L01_e2.mp3`, `S0001L01_d2_1.mp3`

---

## Implementation Steps

### Step 1: ElevenLabs Service Integration

Create: `services/elevenlabs.cjs`

```javascript
const fetch = require('node-fetch')

async function generateSpeech(text, voiceId, languageCode) {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

module.exports = { generateSpeech }
```

### Step 2: S3 Upload Integration

Create: `services/s3-upload.cjs`

```javascript
const AWS = require('aws-sdk')
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
})

async function uploadAudio(courseCode, filename, audioBuffer) {
  const bucket = process.env.S3_BUCKET || 'popty-bach-lfs'
  const key = `courses/${courseCode}/audio/${filename}`

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  }).promise()

  return `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`
}

module.exports = { uploadAudio }
```

### Step 3: Audio Generation Endpoint

Add to: `automation_server.cjs` (around line 2900)

```javascript
/**
 * POST /api/courses/:code/generate-audio
 * Generate TTS audio for all course content
 */
app.post('/api/courses/:code/generate-audio', async (req, res) => {
  const { code } = req.params

  try {
    const courseDir = path.join(__dirname, 'vfs', 'courses', code)

    // Read course data
    const seedPairs = JSON.parse(await fs.readFile(path.join(courseDir, 'seed_pairs.json'), 'utf8'))
    const legoPairs = JSON.parse(await fs.readFile(path.join(courseDir, 'lego_pairs.json'), 'utf8'))
    const legoBaskets = JSON.parse(await fs.readFile(path.join(courseDir, 'lego_baskets.json'), 'utf8'))

    // Detect language from course code
    const targetLang = code.split('_')[0] // "ita", "spa", "fra"
    const voiceId = getVoiceIdForLanguage(targetLang)

    const manifest = {
      seed_audio: {},
      lego_audio: {},
      basket_audio: {}
    }

    // Generate seed audio
    for (const [seedId, [target, known]] of Object.entries(seedPairs)) {
      const audioBuffer = await generateSpeech(target, voiceId, targetLang)
      const url = await uploadAudio(code, `${seedId}_target.mp3`, audioBuffer)
      manifest.seed_audio[seedId] = url
    }

    // Generate LEGO audio
    for (const [seedId, [seedTarget, seedKnown], legos] of legoPairs) {
      for (const lego of legos) {
        const [legoId, type, target, known] = lego
        const audioBuffer = await generateSpeech(target, voiceId, targetLang)
        const url = await uploadAudio(code, `${legoId}_target.mp3`, audioBuffer)
        manifest.lego_audio[legoId] = url
      }
    }

    // Generate basket audio (e-phrases and d-phrases)
    for (const [legoId, basket] of Object.entries(legoBaskets)) {
      manifest.basket_audio[legoId] = {
        e_phrases: [],
        d_phrases: {}
      }

      // E-phrases
      for (let i = 0; i < basket.e.length; i++) {
        const [target, known] = basket.e[i]
        const audioBuffer = await generateSpeech(target, voiceId, targetLang)
        const url = await uploadAudio(code, `${legoId}_e${i + 1}.mp3`, audioBuffer)
        manifest.basket_audio[legoId].e_phrases.push(url)
      }

      // D-phrases
      for (const [windowSize, phrases] of Object.entries(basket.d)) {
        manifest.basket_audio[legoId].d_phrases[windowSize] = []
        for (let i = 0; i < phrases.length; i++) {
          const [target, known] = phrases[i]
          const audioBuffer = await generateSpeech(target, voiceId, targetLang)
          const url = await uploadAudio(code, `${legoId}_d${windowSize}_${i + 1}.mp3`, audioBuffer)
          manifest.basket_audio[legoId].d_phrases[windowSize].push(url)
        }
      }
    }

    // Save manifest
    await fs.writeFile(
      path.join(courseDir, 'audio_manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    res.json({
      success: true,
      total_audio_files: Object.keys(manifest.seed_audio).length +
                         Object.keys(manifest.lego_audio).length +
                         Object.keys(manifest.basket_audio).length,
      manifest_path: `vfs/courses/${code}/audio_manifest.json`,
      s3_base_url: `https://ssi-courses-audio.s3.amazonaws.com/${code}/audio/`
    })

  } catch (error) {
    console.error('Audio generation error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

### Step 4: Voice ID Mapping

```javascript
function getVoiceIdForLanguage(langCode) {
  const voices = {
    'ita': 'ITALIAN_VOICE_ID',    // Get from ElevenLabs dashboard
    'spa': 'SPANISH_VOICE_ID',
    'fra': 'FRENCH_VOICE_ID',
    'cmn': 'MANDARIN_VOICE_ID',
    'eng': 'ENGLISH_VOICE_ID'
  }
  return voices[langCode] || voices['eng']
}
```

### Step 5: Dashboard UI Component

Create: `src/views/AudioGeneration.vue`

```vue
<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <h1 class="text-3xl font-bold text-emerald-400 mb-6">Phase 8: Audio Generation</h1>

    <div class="bg-slate-800 rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-slate-100 mb-4">Select Course</h2>
      <select v-model="selectedCourse" class="bg-slate-700 text-slate-100 p-2 rounded">
        <option v-for="course in courses" :key="course">{{ course }}</option>
      </select>
    </div>

    <button
      @click="generateAudio"
      :disabled="generating"
      class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg"
    >
      {{ generating ? 'Generating...' : 'Generate Audio' }}
    </button>

    <div v-if="progress" class="mt-6">
      <div class="bg-slate-800 rounded-lg p-4">
        <div class="text-slate-300 mb-2">{{ progress.status }}</div>
        <div class="w-full bg-slate-700 rounded-full h-4">
          <div
            class="bg-emerald-500 h-4 rounded-full"
            :style="{ width: `${progress.percent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="result" class="mt-6 bg-slate-800 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-emerald-400 mb-3">Audio Generated!</h3>
      <p class="text-slate-300">Total files: {{ result.total_audio_files }}</p>
      <p class="text-slate-400 text-sm">S3 URL: {{ result.s3_base_url }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const courses = ref(['ita_for_eng_30seeds', 'spa_for_eng_30seeds', 'fra_for_eng_30seeds'])
const selectedCourse = ref(courses.value[0])
const generating = ref(false)
const progress = ref(null)
const result = ref(null)

async function generateAudio() {
  generating.value = true
  progress.value = { status: 'Starting audio generation...', percent: 0 }

  try {
    const response = await fetch(`http://localhost:3456/api/courses/${selectedCourse.value}/generate-audio`, {
      method: 'POST'
    })

    const data = await response.json()

    if (data.success) {
      progress.value = { status: 'Complete!', percent: 100 }
      result.value = data
    } else {
      alert('Error: ' + data.error)
    }
  } catch (error) {
    alert('Error: ' + error.message)
  } finally {
    generating.value = false
  }
}
</script>
```

### Step 6: Router Update

Add to: `src/router/index.js`

```javascript
import AudioGeneration from '../views/AudioGeneration.vue'

// In routes array:
{
  path: '/audio',
  name: 'AudioGeneration',
  component: AudioGeneration,
  meta: { title: 'Audio Generation' }
}
```

---

## Requirements from Tom

### 1. ElevenLabs API Key
**Env var**: `ELEVENLABS_API_KEY`
**Get from**: Tom will provide

### 2. AWS S3 Credentials
**Env vars**:
- `AWS_ACCESS_KEY_ID=AKIAYOZ5W4WS34FFVFOJ`
- `AWS_SECRET_ACCESS_KEY=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`
**Bucket**: `popty-bach-lfs`
**Region**: `eu-west-1`

### 3. Voice IDs for Each Language
**Required**:
- Italian (ita)
- Spanish (spa)
- French (fra)
- Mandarin (cmn)
- English (eng)

Tom will provide the specific voice IDs from ElevenLabs dashboard.

---

## Expected File Conflicts (Minimal)

### automation_server.cjs
- **You add**: Audio generation endpoint (~line 2900)
- **Main adds**: Phase intelligence endpoint (~line 2822)
- **Resolution**: Easy - both are new endpoints, just keep both

### package.json
- **You add**: `aws-sdk` dependency
- **Main adds**: Nothing (no new deps)
- **Resolution**: Easy - no conflict

### src/router/index.js
- **You add**: Audio generation route
- **Main adds**: Phase intelligence route
- **Resolution**: Easy - both are new routes, just keep both

---

## Testing Plan

### 1. Test ElevenLabs Integration
```bash
node -e "const {generateSpeech} = require('./services/elevenlabs.cjs'); generateSpeech('Ciao', 'ITALIAN_VOICE_ID', 'ita').then(buf => console.log('Got', buf.length, 'bytes'))"
```

### 2. Test S3 Upload
```bash
# Create test audio file
# Upload to S3
# Verify public URL works
```

### 3. Test Full Pipeline
```bash
curl -X POST http://localhost:3456/api/courses/ita_for_eng_30seeds/generate-audio
# Should generate ~500-800 audio files
# Check S3 bucket for files
```

---

## Success Criteria

✓ ElevenLabs API integration working
✓ S3 upload working
✓ Audio generated for all seed_pairs
✓ Audio generated for all lego_pairs
✓ Audio generated for all basket e-phrases and d-phrases
✓ Audio manifest JSON created
✓ Dashboard UI triggers generation
✓ Progress tracking visible
✓ Error handling for API failures
✓ Ready to merge to main

---

## Timeline

**Estimated**: 4-6 hours total

- Setup (ElevenLabs + S3): 1 hour
- Audio generation endpoint: 2 hours
- Dashboard UI: 1 hour
- Testing: 1-2 hours

---

## Questions for Tom

1. What's the ElevenLabs API key?
2. What are the AWS S3 credentials?
3. What voice IDs should we use for each language?
4. Should we generate audio for BOTH target and known languages? (Spec assumes target only)
5. What's the audio quality/bitrate preference?

---

**Ready to start!** Checkout `feature/phase8-audio-generation` and let's build this! 🎙️
