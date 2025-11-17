# Phase 8 Setup & Troubleshooting Guide

Complete guide for setting up and troubleshooting Phase 8 audio generation for new courses.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Pre-flight Checks](#pre-flight-checks)
3. [Voice Discovery & Selection](#voice-discovery--selection)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Quick Reference](#quick-reference)

---

## Initial Setup

### 1. Install Dependencies

All audio generation dependencies are now in `package.json`:

```bash
npm install
```

This installs:
- `microsoft-cognitiveservices-speech-sdk` - Azure TTS
- `elevenlabs` - ElevenLabs TTS
- `@aws-sdk/client-s3` - S3 upload
- `fs-extra` - File operations
- `dotenv` - Environment variables

### 2. Install SoX (Audio Processor)

```bash
# macOS
brew install sox

# Ubuntu/Debian
sudo apt-get install sox libsox-fmt-all

# Verify
sox --version
```

### 3. Configure Environment Variables

Create/update `.env` file in project root:

```bash
# Azure TTS Configuration
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=your_region_here  # CRITICAL: Must match Azure Portal!

# ElevenLabs (for English voices)
ELEVENLABS_API_KEY=your_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=eu-west-1
S3_BUCKET=your-bucket-name
```

**⚠️ CRITICAL:** Verify `AZURE_SPEECH_REGION` matches your Azure resource:
1. Go to https://portal.azure.com
2. Open your Speech Service resource
3. Check "Location" field
4. Use exact region name (e.g., `ukwest`, NOT `westeurope`)

---

## Pre-flight Checks

Phase 8 now includes automatic pre-flight checks that run before audio generation starts.

### What Gets Checked

✅ **Node Dependencies** - All required packages installed
✅ **Azure Speech API** - Connection, authentication, available voices
✅ **ElevenLabs API** - Connection and subscription status
✅ **S3 Configuration** - Environment variables present
✅ **SoX Audio Processor** - Installed and accessible

### Running Checks Manually

```bash
node -e "
require('dotenv').config();
const preflight = require('./services/preflight-check-service.cjs');
preflight.runPreflightChecks();
"
```

### Example Output

```
============================================================
Phase 8: Pre-flight Checks
============================================================

Checking dependencies...
Checking Azure Speech API...
Checking ElevenLabs API...
Checking S3 configuration...
Checking SoX audio processor...

============================================================
Pre-flight Check Results
============================================================

✅ PASSED:
  Node Dependencies: All 5 required modules installed
  Azure Speech: Connected to ukwest (550 voices available)
    region: ukwest
    voiceCount: 550
  ElevenLabs: Connected (creator tier)
    tier: creator
    characterCount: 1250
    characterLimit: 10000
  AWS S3: Configuration found
    region: eu-west-1
    bucket: your-bucket
  SoX (Audio Processor): Installed: SoX v14.4.2

============================================================
Summary: 5 passed, 0 failed
============================================================
```

---

## Voice Discovery & Selection

### Step 1: Discover Available Voices

Create a temporary script to list voices for your target language:

```javascript
// Save as: temp_discover_voices.cjs
require('dotenv').config();
const https = require('https');

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const targetLocale = 'es-ES'; // CHANGE THIS (es-ES, fr-FR, de-DE, etc.)

const options = {
  hostname: `${region}.tts.speech.microsoft.com`,
  path: '/cognitiveservices/voices/list',
  method: 'GET',
  headers: { 'Ocp-Apim-Subscription-Key': key }
};

https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const voices = JSON.parse(data);
    const filtered = voices.filter(v =>
      v.Locale === targetLocale &&
      !v.ShortName.includes('Multilingual') // Exclude Multilingual for clarity
    );

    console.log(`\nFound ${filtered.length} Standard Neural voices for ${targetLocale}\n`);

    console.log('FEMALE VOICES:');
    filtered.filter(v => v.Gender === 'Female').forEach(v =>
      console.log(`  ${v.LocalName} (${v.ShortName})`)
    );

    console.log('\nMALE VOICES:');
    filtered.filter(v => v.Gender === 'Male').forEach(v =>
      console.log(`  ${v.LocalName} (${v.ShortName})`)
    );
  });
}).end();
```

Run it:
```bash
node temp_discover_voices.cjs
```

### Step 2: Generate Audio Samples

Use the provided template or create your own:

```javascript
// Save as: generate_samples.cjs
require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const azureTTS = require('./services/azure-tts-service.cjs');

const testPhrase = "I want to learn Spanish now";  // IN TARGET LANGUAGE
const voices = [
  'es-ES-ElviraNeural',
  'es-ES-AlvaroNeural',
  // Add more voices to test
];

async function generateSamples() {
  const outputDir = path.join(__dirname, 'temp', 'voice_samples');
  await fs.ensureDir(outputDir);

  for (const voiceName of voices) {
    const simpleName = voiceName.replace('es-ES-', '');

    // Generate slow version (what learners hear)
    const slowPath = path.join(outputDir, `${simpleName}_slow.mp3`);
    await azureTTS.generateAudioWithRetry(testPhrase, voiceName, slowPath, 0.7);
    console.log(`✓ ${simpleName}_slow.mp3`);

    // Generate natural version (reference)
    const naturalPath = path.join(outputDir, `${simpleName}_natural.mp3`);
    await azureTTS.generateAudioWithRetry(testPhrase, voiceName, naturalPath, 1.0);
    console.log(`✓ ${simpleName}_natural.mp3`);
  }

  console.log(`\nSamples saved to: ${outputDir}`);
  console.log(`Open folder: open "${outputDir}"`);
}

generateSamples().catch(console.error);
```

Run it:
```bash
node generate_samples.cjs
```

### Step 3: Listen and Choose

1. **Open the samples folder**
2. **Listen primarily to `_slow` versions** (what learners hear)
3. **Choose one female and one male voice**
4. **Verify they're from the SAME locale** (e.g., both es-ES)

**Selection criteria:**
- Clear pronunciation at slow speed
- Natural tone (not robotic)
- Consistent style between the two voices
- Appropriate accent for your audience

---

## Common Issues & Solutions

### Issue 1: Azure API Returns 401 Unauthorized

**Symptoms:**
```
❌ Azure Speech: Invalid API key (HTTP 401)
```

**Solution:**
1. Go to https://portal.azure.com
2. Navigate to your Speech Service resource
3. Click "Keys and Endpoint" in sidebar
4. Copy Key 1 or Key 2
5. Update `AZURE_SPEECH_KEY` in `.env`

### Issue 2: Azure API Timeout or 403 Forbidden

**Symptoms:**
```
❌ Azure Speech: Connection timeout (10s)
❌ Azure Speech: Access forbidden (HTTP 403)
```

**Solution:**
Check region mismatch:
```bash
# Test if your region is correct
curl -I https://ukwest.tts.speech.microsoft.com/

# If this times out or fails, your region is wrong
# Check Azure Portal → Speech Service → Overview → Location
# Update AZURE_SPEECH_REGION in .env
```

### Issue 3: SoX Not Found

**Symptoms:**
```
❌ SoX (Audio Processor): sox not found in PATH
```

**Solution:**
```bash
# macOS
brew install sox

# Linux
sudo apt-get install sox libsox-fmt-all

# Verify
which sox
sox --version
```

### Issue 4: No Voice Assignments Found

**Symptoms:**
```
Error: No voice assignments found for course: spa_for_eng_10seeds

You need to configure voices before running audio generation.
```

**Solution:**
1. Follow voice discovery process above
2. Add voice definitions to `samples_database/voices.json`:

```json
{
  "voices": {
    "azure_es-ES-ElviraNeural": {
      "provider": "azure",
      "provider_id": "es-ES-ElviraNeural",
      "language": "spa",
      "display_name": "Elvira (Spanish Female)",
      "gender": "female",
      "typical_roles": ["target1"],
      "sample_count": 0,
      "created_at": "2025-11-12T00:00:00Z",
      "notes": "Primary Spanish voice for target1 role",
      "processing": {
        "cadences": {
          "slow": {
            "azure_speed": 0.7,
            "time_stretch": 1,
            "normalize": true,
            "target_lufs": -16
          },
          "natural": {
            "azure_speed": 1,
            "time_stretch": 1,
            "normalize": true,
            "target_lufs": -16
          }
        }
      }
    }
  },
  "course_assignments": {
    "spa_for_eng_10seeds": {
      "target1": "azure_es-ES-ElviraNeural",
      "target2": "azure_es-ES-AlvaroNeural",
      "source": "elevenlabs_ENGLISH_VOICE_ID_HERE",
      "presentation": "elevenlabs_ENGLISH_VOICE_ID_HERE"
    }
  }
}
```

### Issue 5: Missing Dependencies

**Symptoms:**
```
❌ Node Dependencies: Missing modules: microsoft-cognitiveservices-speech-sdk
```

**Solution:**
```bash
npm install
```

All dependencies are now in `package.json` and will be installed automatically.

---

## Quick Reference

### Complete Setup Checklist

- [ ] Install Node dependencies: `npm install`
- [ ] Install SoX: `brew install sox` (macOS)
- [ ] Configure `.env` with all API keys
- [ ] Verify Azure region matches Portal
- [ ] Run pre-flight checks
- [ ] Discover voices for target language
- [ ] Generate and listen to samples
- [ ] Choose voices and update `voices.json`
- [ ] Run Phase 8

### Quick Commands

```bash
# Pre-flight check
node -e "require('dotenv').config(); require('./services/preflight-check-service.cjs').runPreflightChecks();"

# Test Azure connectivity
curl -I https://ukwest.tts.speech.microsoft.com/

# Check SoX
sox --version

# Run Phase 8 (after voice configuration)
node scripts/phase8-audio-generation.cjs <course_code> --plan
node scripts/phase8-audio-generation.cjs <course_code> --execute
```

### Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_SPEECH_KEY` | Yes | Azure Speech API key | `3kti0TC8UP...` |
| `AZURE_SPEECH_REGION` | Yes | Azure region (MUST match Portal!) | `ukwest` |
| `ELEVENLABS_API_KEY` | Yes* | ElevenLabs API key | `5aa9301...` |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key | `AKIAY...` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key | `47InCY...` |
| `AWS_REGION` | Yes | AWS region | `eu-west-1` |
| `S3_BUCKET` | Yes | S3 bucket name | `my-bucket` |

*Only required if using ElevenLabs voices (typically for English source/presentation)

---

## Additional Resources

- **Voice Selection Guide:** `docs/VOICE_SELECTION_GUIDE.md`
- **Phase 8 Workflow:** `docs/PHASE8_WORKFLOW.md`
- **S3 Architecture:** `docs/S3_BUCKET_ARCHITECTURE.md`
- **Azure Voice Gallery:** https://speech.microsoft.com/portal/voicegallery
- **Azure TTS Docs:** https://learn.microsoft.com/azure/cognitive-services/speech-service/

---

**Last Updated:** 2025-11-12
