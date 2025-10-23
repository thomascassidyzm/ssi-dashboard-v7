# Phase 8: Current Workflow Analysis

**Date**: 2025-01-23
**Purpose**: Document existing audio generation workflow for v7.7.0 integration

---

## 🎯 Current Workflow Overview

```
1. QUALITY CHECKS (01_clean_up_course.py)
   ↓
2. MAR SAMPLE MATCHING (02_add_MAR_samples.py)
   ↓
3. TTS GENERATION (03.2_elevenlabs or 03.3_azure)
   ↓
4. AUDIO PROCESSING (04_process_audio.py)
   ↓
5. MANUAL S3 UPLOAD
   ↓
6. S3 VALIDATION & DURATION EXTRACTION (01_check_s3.py)
   ↓
7. MAR DATABASE UPDATE (02_update_MAR.py)
```

---

## 📋 Script-by-Script Analysis

### **01_clean_up_course.py** - Quality Checks (Interactive)

**Purpose**: Pre-generation validation and sample placeholder creation

**Key Functions**:
- `find_orphaned_samples()` - Identifies samples in manifest but not referenced in course
- `create_missing_samples()` - Creates empty placeholders `{id: "", duration: 0, role: X, cadence: "natural"}`
- `find_duplicates()` - Detects duplicate seeds and intro items
- `extract_quoted_examples_from_explanation()` - Parses tagged text like `{target1}'Voglio'`
- `fix_empty_seeds()` - Adds self-referencing intro items to empty seeds

**Sample Placeholder Format**:
```python
{
  "duration": 0,
  "id": "",  # Empty - to be populated by MAR matching
  "cadence": "natural",
  "role": "target1"
}
```

**User Interaction**:
1. Check for duplicates
2. Check for orphaned samples
3. Create missing sample placeholders
4. Fix empty seeds
5. Save changes

---

### **02_add_MAR_samples.py** - Sample Matching

**Purpose**: Populate UUIDs and durations from existing MAR

**Key Functions**:
- `normalize_text(text)` - Strips punctuation, lowercases for matching
- `create_sample_index()` - Creates efficient lookup: `{(normalized_text, role, cadence): (uuid, sample)}`
- `update_course_with_mar_samples()` - Matches and populates samples

**Matching Logic**:
1. Normalize phrase text
2. Look up by `(normalized_text, role, preferred_cadence)`
3. If not found, fall back to original cadence
4. If match found: populate `id` and `duration`

**Cadence Handling**:
- User specifies preferred cadence per role
- Can override sample's cadence if match exists

---

### **03.3_azure_audiogen.py** - Azure TTS Generation

**Purpose**: Generate audio using Azure Speech Services

**Key Features**:
- **Voice Manager**: JSON config file (`voice_config_azure.json`) maps language → voice per role
- **SSML Support**: Speed control via `<prosody rate='{speed_str}'>`
- **Rate Limiting**: 0.1s between requests (generous for Azure)
- **Deterministic UUIDs**: Uses SHA256 of `text:lang_code3:role:cadence`

**Voice Configuration Structure**:
```json
{
  "languages": {
    "ga": {
      "name": "Irish",
      "voices": {
        "source": {"name": "en-US-GuyNeural"},
        "target1": {"name": "ga-IE-OrlaNeural"},
        "target2": {"name": "ga-IE-ColmNeural"}
      },
      "speed": {"source": 1.0, "target1": 0.8, "target2": 0.8}
    }
  }
}
```

**Generation Flow**:
1. Select role + cadence to generate
2. Filter samples by role/cadence
3. Generate audio with retry (max 3 attempts)
4. Save to local `audio/` directory
5. Update course JSON with UUIDs and durations

**Interactive Workflow**:
- Setup/configure voices
- Browse available voices
- Test voices
- Generate audio batch by batch

---

### **03.2_elevenlabs_audiogen.py** - ElevenLabs TTS Generation

**Purpose**: Generate audio using ElevenLabs API (for Aran clone + presentations)

**Key Features**:
- **Multi-model Support**: Flash V2.5, Multilingual V2, Eleven v3
- **Tier-Based Rate Limiting**: Free (1 req/s) → Business (15 req/s)
- **Language Priming**: Adds context like "In Italian, we say: ..."
- **Voice Registry**: 30+ pre-configured voices (now outdated)
- **Threading**: Parallel generation with ThreadPoolExecutor

**Voice Examples**:
```python
VOICE_OPTIONS = {
    "Irish Target1": "fd1CgHdFbLMH4S7lvsp7",
    "Irish Target2": "oLY5KLpk59apl6Nwk6pg",
    "Irish Teacher (Source)": "UjzMjyZm3R5FbU1gwrBd",
    # ... 30+ others
}
```

**Priming System**:
```python
LANGUAGE_CODES = {
    'it': {
        'name': 'Italian',
        'code3': 'ita',
        'priming': 'In italiano, si dice: ...'
    }
}
```

**Note**: Voice list is outdated, many non-functional. New system will use voice registry per course.

---

### **04_process_audio.py** - Audio Processing

**Purpose**: Normalize and optionally slow down audio

**Key Features**:
- **Time Stretching**: Uses `audiostretchy` to slow down (typically for target1/target2)
- **Normalization**: Uses `pydub.effects.normalize()` with 0.1 headroom
- **Parallel Processing**: ProcessPoolExecutor with 16 workers
- **In-place Processing**: Modifies files, then moves to `{dir}_processed/`

**Process Flow**:
1. User selects directory
2. User chooses: apply stretching? (yes/no)
3. User chooses: stretch factor? (e.g., 1.2 for slower)
4. User chooses: apply normalization? (yes/no)
5. Batch process all MP3s
6. Move to processed directory

**Typical Usage**:
- Target1/Target2: Stretch 1.1-1.2x + normalize
- Source/Presentation: Normalize only

---

### **MANUAL S3 UPLOAD**

**Current Process**: Manual upload to S3

**Target Buckets**:
- **Stage**: `s3://ssi-audio-stage/mastered/`
- **Production**: `s3://ssiborg-assets/mastered/`

**Structure**: Flat - all files at same level with UUID filenames
```
s3://ssi-audio-stage/mastered/
├── A1B2C3D4-E5F6-5789-ABCD-EF0123456789.mp3
├── B2C3D4E5-F6A7-6890-BCDE-F0123456789A.mp3
└── ...
```

---

### **01_check_s3.py** - S3 Validation & Duration Extraction

**Purpose**: Validate S3 presence and extract audio durations

**Key Functions**:
- `validate_and_fix_uuids()` - Ensures all IDs are valid UUIDs
- `find_file_in_s3()` - Checks if UUID exists in S3
- `get_audio_duration()` - Downloads file, uses `sox stat` to extract duration
- `collect_sample_ids()` - Collects all sample IDs from course structure

**Duration Extraction**:
```bash
sox {file}.mp3 -n stat
# Parses stderr for "Length (seconds): 2.145"
```

**Validation Flow**:
1. Check all UUIDs are valid format
2. Check all UUIDs exist in S3
3. Extract durations from S3 files
4. Update course JSON with durations
5. Validate no empty ID fields remain

**S3 Configuration**:
```python
S3_BUCKET = 'ssi-audio-stage'
S3_PREFIX = 'mastered/'
AWS_REGION = 'eu-west-1'
```

---

### **02_update_MAR.py** - MAR Database Update

**Purpose**: Add newly generated samples to MAR and archive course

**Key Functions**:
- `process_course()` - Extracts samples from course, adds to MAR
- `archive_course()` - Saves completed course to archive directory
- `infer_language()` - Maps role → language (target1/2 → target lang, source → known lang)

**Role → Language Mapping**:
```python
{
  'target1': target_lang,
  'target2': target_lang,
  'source': known_lang,
  'presentation': known_lang,
  'presentation_encouragement': known_lang
}
```

**MAR Sample Format**:
```json
{
  "uuid": {
    "phrase": "Voglio parlare italiano",
    "language": "ita",
    "role": "target1",
    "cadence": "natural",
    "duration": 2.145,
    "filename": "uuid.mp3"
  }
}
```

**Special Handling**:
- Converts `presentation_encouragement` → `presentation` in course file
- Keeps `presentation_encouragement` in MAR for tracking
- Updates version number
- Archives to `completed/{target_lang}_for_{known_lang}_speakers/`

---

## 🏗️ Key Architecture Decisions

### **1. Dual TTS Provider Strategy**
- **Azure**: Target1/Target2 (short phrases, no priming needed)
- **ElevenLabs**: Source/Presentations (Aran clone, minimal priming)

**Rationale**:
- Azure more consistent for short phrases
- ElevenLabs Aran clone trained on actual Aran recordings
- ElevenLabs robust for longer presentation text

### **2. UUID Generation**
**Current**: Custom deterministic using SHA256
```python
hash = SHA256(text + ":" + lang_code3 + ":" + role + ":" + cadence)
uuid = hash[:8] + "-" + lang_hash[:4] + "-" + role_hash[:4] + "-" + cadence_hash[:4] + "-" + hash[8:20]
```

**Problem**: Not RFC 4122 compliant

**v7.7.0 Solution**: Use UUID v5 (RFC 4122 compliant, still deterministic)

### **3. MAR Organization**
**Current**: Language-based files (`eng.json`, `ita.json`)

**v7.7.0 Solution**: Voice-based organization (`elevenlabs_XyZ123/samples.json`)

**Rationale**:
- Better tracking of which voice generated which sample
- Easier to manage multi-provider setup
- Clearer delineation between Azure and ElevenLabs samples

### **4. Sample Matching Strategy**
**Current**: Normalize text, match by `(text, role, cadence)` tuple

**v7.7.0**: Same approach, but search within voice-specific databases

**Text Normalization**:
```python
def normalize_text(text):
    return re.sub(r'[^\w\s\'-]', '', text).lower().strip()
```

### **5. Audio Processing**
**Current**: Separate script, manual invocation

**v7.7.0 Integration**: Can be integrated into generation pipeline or kept separate

**Processing Steps**:
1. Time-stretch (optional, typically target1/2 only)
2. Normalize (all samples)
3. Move to processed directory

---

## 🎯 v7.7.0 Integration Plan

### **Phase 8 Pipeline for v7.7.0**

```javascript
// 1. Load course manifest
const manifest = await fs.readJson('course_manifest.json');
const samples = manifest.slices[0].samples;

// 2. Load voice registry and get course voice assignments
const voiceAssignments = await getVoicesForCourse(courseCode);
// { target1: 'azure_ga-IE-OrlaNeural', target2: 'azure_ga-IE-ColmNeural', source: 'elevenlabs_UjzMjyZm...' }

// 3. For each sample, determine voice and check MAR
const toGenerate = [];
for (const [text, variants] of Object.entries(samples)) {
  for (const variant of variants) {
    const { role, cadence } = variant;
    const voiceId = voiceAssignments[role];

    // Load voice-specific MAR
    const voiceSamples = await loadVoiceSamples(voiceId);

    // Try to find existing sample
    const existing = findExistingSample(voiceSamples, text, role, language, cadence);

    if (existing) {
      variant.id = existing.uuid;
      variant.duration = existing.duration;
    } else {
      // Generate new valid UUID v5
      const newUUID = generateSampleUUID(text, language, role, cadence);
      variant.id = newUUID;
      toGenerate.push({ text, role, cadence, uuid: newUUID, voiceId });
    }
  }
}

// 4. Generate missing audio
await generateAudioBatch(toGenerate, 'target1');  // Azure
await generateAudioBatch(toGenerate, 'target2');  // Azure
await generateAudioBatch(toGenerate, 'source');   // ElevenLabs

// 5. Process audio (normalize + optional stretch)
await processAudioFiles(courseCode);

// 6. Upload to S3 stage
await uploadToS3(courseCode);

// 7. Validate S3 and extract durations
await validateAndExtractDurations(manifest, courseCode);

// 8. Update MAR with new samples
await updateMAR(toGenerate);

// 9. Finalize manifest (update version, convert encouragement roles)
await finalizeManifest(manifest);
```

---

## 🔧 Services to Build

### **1. Azure TTS Service** (`services/azure-tts-service.cjs`)
- Wrap Azure Speech SDK
- SSML generation with speed control
- Voice configuration from registry
- Rate limiting
- Retry logic

### **2. ElevenLabs Service** (`services/elevenlabs-service.cjs`)
- API integration
- Model selection (Flash v2.5 for most, v3 for edge cases)
- Optional priming for single words
- Tier-based rate limiting
- Retry logic

### **3. Audio Processor Service** (`services/audio-processor.cjs`)
- Time-stretching wrapper (`audiostretchy`)
- Normalization wrapper (`pydub` or `ffmpeg`)
- Batch processing with parallel workers
- Duration extraction

### **4. S3 Service** (already created ✅)
- Upload/download
- Batch exists check
- Flat mastered/ folder structure

### **5. MAR Service** (already created ✅)
- Voice-based sample lookup
- Sample matching by text+role+cadence
- Save new samples to voice databases

### **6. UUID Service** (already created ✅)
- Generate valid UUID v5
- Deterministic from text+role+language+cadence
- Buffer period: accept old invalid UUIDs

---

## 🎯 Next Steps

1. **Create Azure TTS Service** - Wrap Azure SDK
2. **Create ElevenLabs Service** - API integration
3. **Create Audio Processor Service** - Normalization + stretching
4. **Build Phase 8 Main Script** - Orchestrate full pipeline
5. **Add Voice Registry** - Configure Azure + ElevenLabs voices per course
6. **Test with ita_for_eng_10seeds** - Small test course (1,681 samples)
7. **Migrate Old MAR** - After validation

---

## 📝 Voice Configuration Template

```json
{
  "version": "1.0.0",
  "voices": {
    "azure_ga-IE-OrlaNeural": {
      "provider": "azure",
      "provider_id": "ga-IE-OrlaNeural",
      "language": "ga",
      "display_name": "Orla (Irish Female)",
      "typical_roles": ["target1"],
      "processing": {
        "speed": 0.8,
        "time_stretch": 1.1,
        "normalize": true
      }
    },
    "azure_ga-IE-ColmNeural": {
      "provider": "azure",
      "provider_id": "ga-IE-ColmNeural",
      "language": "ga",
      "display_name": "Colm (Irish Male)",
      "typical_roles": ["target2"],
      "processing": {
        "speed": 0.8,
        "time_stretch": 1.1,
        "normalize": true
      }
    },
    "elevenlabs_UjzMjyZm3R5FbU1gwrBd": {
      "provider": "elevenlabs",
      "provider_id": "UjzMjyZm3R5FbU1gwrBd",
      "language": "en",
      "display_name": "Aran (English Teacher)",
      "typical_roles": ["source", "presentation"],
      "model": "eleven_flash_v2_5",
      "priming": "minimal",
      "processing": {
        "normalize": true
      }
    }
  },
  "course_assignments": {
    "ita_for_eng_10seeds": {
      "target1": "azure_it-IT-ElsaNeural",
      "target2": "azure_it-IT-DiegoNeural",
      "source": "elevenlabs_UjzMjyZm3R5FbU1gwrBd",
      "presentation": "elevenlabs_UjzMjyZm3R5FbU1gwrBd"
    }
  }
}
```

---

**Status**: Ready for implementation
**Estimated Time**: 10-15 hours (services + main script + testing)
