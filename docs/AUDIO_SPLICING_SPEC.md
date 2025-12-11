# Audio Splicing System Specification

> Intelligent audio generation for minority languages through phrase mining and LEGO-based concatenation.

---

## Overview

**Problem:** Minority languages (Breton, Manx, Catalan, Welsh, Cornish, etc.) lack quality TTS models, making traditional audio generation impossible.

**Solution:** Record a minimal set of natural phrases from human voice artists, then intelligently extract LEGO components and concatenate them to generate all required practice phrases.

**Key Insight:** Recording "Quiero hablar español contigo" naturally produces better-sounding "quiero", "hablar", "español" than recording each word in isolation.

**Efficiency Gain:** 10-20x reduction in recording time (record ~50 phrases → generate 500+ variations).

---

## Audio Strategy by Language Type

```
LANGUAGES WITH GOOD TTS:          LANGUAGES WITHOUT GOOD TTS:
─────────────────────────────     ─────────────────────────────
Spanish      ✓ Azure/ElevenLabs   Breton       ✗ No TTS
French       ✓                     Manx         ✗ No TTS
German       ✓                     Catalan      ⚠ Limited
Mandarin     ✓                     Welsh        ⚠ Limited
English      ✓                     Cornish      ✗ No TTS
Italian      ✓                     Scottish Gaelic ⚠ Limited
Portuguese   ✓                     Basque       ⚠ Limited
...                                Irish        ⚠ Limited

For these → TTS pipeline          For these → Human + Splice
```

### Audio Sources by Role

| Role | TTS Languages | Minority Languages |
|------|---------------|-------------------|
| source (known lang) | TTS (Azure/ElevenLabs) | TTS (usually English) |
| target1 (female) | TTS | Human recording + splice |
| target2 (male) | TTS | Human recording + splice |
| presentation | ElevenLabs | Human or ElevenLabs clone |

---

## Recording Modes

| Mode | Purpose | Characteristics |
|------|---------|-----------------|
| **Natural** | Flow, prosody, emotion | Normal speech rate, connected words |
| **Slow-gapped** | Splicing source | Clear word boundaries, slight pauses between words, natural intonation preserved |

**Important:** Words are NOT recorded as standalone LEGOs (too robotic). Chopping longer phrases produces more natural-sounding units.

---

## Architecture: Runtime vs Pre-built Audio

### Option A: Pre-build all phrase audio files
```
├── 966 samples → 966 MP3 files in S3
├── Simple playback (just fetch URL)
├── Works everywhere (browser, native, offline)
└── Storage cost scales with phrases
```

### Option B: Runtime concatenation
```
├── Store only LEGO segments (~200-300 files)
├── Player assembles phrases on-the-fly
├── Web Audio API stitches segments
├── Complex player, minimal storage
└── Problem: Browser limitations, latency, offline?
```

### Option C: Hybrid (RECOMMENDED)
```
├── QA/Preview: Runtime concat (fast iteration, no rebuild)
├── Production: Pre-build final MP3s (reliable delivery)
├── Store the "recipe" (which LEGOs make this phrase)
├── Preview instantly with Web Audio concatenation
├── Batch-render to MP3 for production delivery
```

---

## LEGO Extraction Hierarchy

```
Recorded phrase: "Quiero hablar español contigo"
                  ├─────┤├────┤├──────┤├──────┤
                     │      │      │       │
Yields:              │      │      │       │
  A-type (atomic):   quiero hablar español contigo
  M-type (molecular): quiero hablar
                      hablar español
                      español contigo
                      quiero hablar español
                      hablar español contigo
                      (full phrase)
```

---

## Phrase Selection Algorithm

### Goal
Find the **minimum set of phrases** to record that guarantees **100% LEGO coverage** for the target language.

### Algorithm: GuaranteedCoverage

```
INPUT:
- All LEGOs needed for course (from lego_pairs.json)
- Target language only (one voice session = one language)

OUTPUT:
- Minimal phrase set to record
- Recording script with context

ALGORITHM:

1. Extract ALL unique LEGOs needed for target language
   - Both A-type (atomic words) and M-type (molecular phrases)

2. Score each potential recording phrase by:
   - LEGO coverage (how many LEGOs does it contain?)
   - Phrase length (longer = more natural splices)
   - Word boundary clarity (some combinations splice better)

3. Greedy set cover:
   WHILE uncovered_legos > 0:
     - Find phrase that covers most uncovered LEGOs
     - Add to recording set
     - Mark covered LEGOs as covered

4. Optimization pass:
   - Remove redundant phrases (all LEGOs covered elsewhere)
   - Prefer phrases that appear in actual course content

5. Identify edge cases:
   - LEGOs that only appear in one phrase (can't splice, must record exactly)
   - Mark as "direct record" list

6. Output:
   - Primary recording script (covers most LEGOs)
   - Supplementary phrases (for edge cases)
   - "Direct record" list (phrases that can't be spliced)
```

### Example Output

```
RECORDING SCRIPT: Breton (Target Language)
Voice: Female (target1 role)
Estimated time: 45 minutes
Phrases: 47 (covers 312 unique LEGOs)

PASS 1: Natural Speed
─────────────────────────────────────────
001. "Me a garfe komz brezhoneg ganit"
     Context: Lesson 1 - expressing wants
     LEGOs covered: me, a, garfe, komz, brezhoneg, ganit,
                    me a garfe, a garfe komz, komz brezhoneg...

002. "N'hellan ket debriñ bremañ"
     Context: Lesson 2 - expressing inability
     LEGOs covered: n'hellan, ket, debriñ, bremañ,
                    n'hellan ket, ket debriñ...

... (47 phrases total)

PASS 2: Slow with Gaps
─────────────────────────────────────────
[Same 47 phrases, spoken slowly with clear word boundaries]

DIRECT RECORD (cannot be spliced):
─────────────────────────────────────────
- "Demat" (greeting, standalone)
- "Kenavo" (farewell, standalone)
```

---

## Recording Flow: Continuous Recording

### Design Principle
Voice artists should record **continuously without stopping** between phrases. Stop/start is painful and produces inconsistent audio.

### UI: Teleprompter View

```
┌─────────────────────────────────────────────────────────────┐
│  RECORDING SESSION (Continuous Flow)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   "Me a garfe komz brezhoneg ganit"                        │
│                                                             │
│   ─────────────────────────────────────────────────────    │
│                                                             │
│   "N'hellan ket debriñ bremañ"                             │
│                          ▲                                  │
│                     [NEXT IN 3s]                            │
│                                                             │
│   "Me a yelo da'n ti warc'hoazh"                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

  [● RECORDING] 02:34 elapsed │ 12 of 47 phrases │ [PAUSE]
```

### Controls
- **Start**: Begin continuous recording
- **Pause**: Pause (for breaks, coughing, etc.)
- **Done**: Complete session, upload audio

---

## Processing Pipeline

### Step 1: Recording Capture (Browser)

```
- Teleprompter shows phrases in sequence
- Voice artist reads continuously (no stopping)
- Single audio file captured
- Upload when session complete
- Minimal UI: Start, Pause, Done
```

### Step 2: Segmentation (Server-side)

```
- Detect phrase boundaries (longer silences ~500ms+)
- Match segments to expected phrase list
- Detect word boundaries within phrases (shorter silences ~100-200ms)
- Compute quality scores per segment
- Store: timestamps + quality scores (not separate files yet)
```

### Step 3: Review (Browser)

```
- Show phrases flagged below quality threshold
- Playback with visual waveform
- Option to re-record just the bad ones
- Manual boundary adjustment if auto-detect was wrong
- Approve/reject controls
```

### Step 4: LEGO Library Build (Server-side)

```
- Extract all LEGO segments from approved recordings
- Store as separate audio files (now worth it)
- Index by: text + voice + cadence
- Calculate coverage: which LEGOs do we have?
```

### Step 5: Phrase Generation (Server-side batch)

```
For each practice phrase needed:
- Look up required LEGO segments
- Concatenate with crossfade (~20ms)
- Normalize volume
- Export as MP3
- Upload to S3 with content-addressed UUID
```

---

## Audio Analysis (Web Audio API)

### Silence Detection

```javascript
async function detectWordBoundaries(audioBuffer, expectedWords) {
  // 1. Compute amplitude envelope
  const envelope = computeEnvelope(audioBuffer);

  // 2. Find silence gaps (threshold-based)
  const silenceRegions = findSilences(envelope, {
    minSilenceDuration: 100,  // ms - minimum gap to count as word boundary
    silenceThreshold: 0.05    // amplitude threshold
  });

  // 3. Segment between silences
  const segments = splitAtSilences(audioBuffer, silenceRegions);

  // 4. Validate segment count matches expected words
  if (segments.length !== expectedWords.length) {
    return { success: false, error: 'Word count mismatch', segments };
  }

  // 5. Return word-aligned segments
  return {
    success: true,
    segments: expectedWords.map((word, i) => ({
      word,
      audio: segments[i],
      startTime: segments[i].startTime,
      endTime: segments[i].endTime
    }))
  };
}
```

### LEGO Extraction

```javascript
function extractLegos(segments, phraseText) {
  const legos = [];

  // A-type: individual words
  for (const seg of segments) {
    legos.push({
      type: 'A',
      text: seg.word,
      audio: seg.audio,
      startMs: seg.startTime,
      endMs: seg.endTime
    });
  }

  // M-type: consecutive word combinations
  for (let len = 2; len <= segments.length; len++) {
    for (let start = 0; start <= segments.length - len; start++) {
      const wordSegs = segments.slice(start, start + len);
      legos.push({
        type: 'M',
        text: wordSegs.map(s => s.word).join(' '),
        audio: concatenateSegments(wordSegs),
        startMs: wordSegs[0].startTime,
        endMs: wordSegs[wordSegs.length - 1].endTime
      });
    }
  }

  return legos;
}
```

### Concatenation with Crossfade

```javascript
function concatenateWithCrossfade(segments, options = {}) {
  const { crossfadeDuration = 20 } = options; // ms

  let output = new AudioBuffer(/* ... */);
  let position = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (i > 0) {
      // Apply crossfade with previous segment
      applyCrossfade(output, segment, position, crossfadeDuration);
    } else {
      // First segment, just copy
      copyToBuffer(output, segment, position);
    }

    position += segment.duration - crossfadeDuration;
  }

  return output;
}
```

---

## Quality Thresholds

### Automatic Classification

```javascript
const QUALITY_THRESHOLDS = {
  AUTO_ACCEPT: -20,    // dB - clearly audible, good SNR
  NEEDS_REVIEW: -35,   // dB - might be okay, human check
  AUTO_REJECT: -45     // dB - too quiet, definitely re-record
};

function classifySegment(segment) {
  const peakDb = computePeakDb(segment);
  const snr = computeSNR(segment);

  if (peakDb >= QUALITY_THRESHOLDS.AUTO_ACCEPT && snr > 20) {
    return 'auto_accepted';
  } else if (peakDb >= QUALITY_THRESHOLDS.NEEDS_REVIEW) {
    return 'needs_review';
  } else {
    return 'rejected';
  }
}
```

### What Makes a Good Splice?

1. **Clean word boundaries** - No clipped consonants
2. **Consistent volume** - Normalized across segments
3. **Natural prosody** - Intonation patterns preserved
4. **Matching room tone** - Same recording session

---

## Data Model (Supabase)

```sql
-- Recording sessions (one long audio file per session)
CREATE TABLE recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  recording_mode TEXT NOT NULL,     -- 'natural' or 'slow_gapped'
  audio_url TEXT NOT NULL,          -- Full session audio in S3
  duration_ms INTEGER,
  phrase_count INTEGER,
  recorded_by UUID REFERENCES auth.users,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT DEFAULT 'uploaded'  -- 'uploaded', 'processing', 'ready', 'failed'
);

-- Phrase segments within a session (timestamps, no separate files yet)
CREATE TABLE phrase_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES recording_sessions ON DELETE CASCADE,
  phrase_index INTEGER NOT NULL,    -- Order in session
  phrase_text TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  quality_score FLOAT,
  status TEXT DEFAULT 'pending',    -- 'pending', 'auto_accepted', 'needs_review', 'rejected', 'approved'
  reviewed_by UUID REFERENCES auth.users,
  reviewed_at TIMESTAMPTZ
);

-- Word boundaries within phrases (timestamps into session audio)
CREATE TABLE word_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_segment_id UUID REFERENCES phrase_segments ON DELETE CASCADE,
  word_index INTEGER NOT NULL,
  word_text TEXT NOT NULL,
  start_ms INTEGER NOT NULL,        -- Relative to session start
  end_ms INTEGER NOT NULL,
  quality_score FLOAT,
  manually_adjusted BOOLEAN DEFAULT FALSE
);

-- Extracted LEGO library (actual audio files, built after approval)
CREATE TABLE lego_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lego_text TEXT NOT NULL,
  lego_type TEXT NOT NULL,          -- 'A' (atomic) or 'M' (molecular)
  voice_id TEXT NOT NULL,
  cadence TEXT NOT NULL,            -- 'natural' or 'slow'
  audio_url TEXT NOT NULL,          -- Extracted segment in S3
  source_session_id UUID REFERENCES recording_sessions,
  source_phrase_text TEXT,
  quality_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lego_text, voice_id, cadence)
);

-- Generated phrase audio (from splicing)
CREATE TABLE spliced_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  cadence TEXT NOT NULL,
  source_legos JSONB NOT NULL,      -- Array of lego_library IDs used
  audio_url TEXT NOT NULL,          -- Final spliced audio in S3
  audio_uuid TEXT NOT NULL,         -- Content-addressed UUID for manifest
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phrase_text, voice_id, cadence)
);

-- Indexes for performance
CREATE INDEX idx_lego_library_lookup ON lego_library(lego_text, voice_id, cadence);
CREATE INDEX idx_phrase_segments_session ON phrase_segments(session_id);
CREATE INDEX idx_word_boundaries_phrase ON word_boundaries(phrase_segment_id);
```

---

## UI Components

### 1. Recording Script Generator
**Route:** `/production/:courseCode/recording-script`

Features:
- Run phrase selection algorithm
- Display optimized recording script
- Show LEGO coverage statistics
- Export as PDF/printable format
- Estimated recording time

### 2. Recording Session
**Route:** `/production/:courseCode/recording-session`

Features:
- Teleprompter with auto-advance
- Continuous recording (single file)
- Pass toggle (Natural / Slow-gapped)
- Visual recording indicator
- Pause/resume capability

### 3. Segmentation Review
**Route:** `/production/:courseCode/splice-review`

Features:
- Visual waveform display
- Detected phrase boundaries
- Detected word boundaries
- Drag to adjust boundaries manually
- Play individual segments
- Approve/reject controls

### 4. LEGO Coverage Dashboard
**Route:** `/production/:courseCode/audio-coverage`

Features:
- List all LEGOs needed
- Coverage status (TTS / Human / Spliced / Missing)
- Identify gaps requiring more recordings
- Suggest additional phrases to record
- Progress percentage

### 5. Phrase Generation
**Route:** `/production/:courseCode/generate-spliced`

Features:
- List phrases to generate
- Preview before generation (runtime concat)
- Batch generate to S3
- Progress tracking
- Quality report

---

## Implementation Phases

### Phase 1: Recording Infrastructure
- [ ] Teleprompter recording UI (extend existing autocue)
- [ ] S3 storage for raw recordings
- [ ] Supabase tables for tracking
- [ ] Upload handling

### Phase 2: Phrase Selection Algorithm
- [ ] LEGO coverage analysis
- [ ] Minimal phrase set computation
- [ ] Recording script generation
- [ ] PDF export

### Phase 3: Audio Analysis
- [ ] Server-side audio processing service
- [ ] Silence/phrase boundary detection
- [ ] Word boundary detection
- [ ] Quality scoring

### Phase 4: Review UI
- [ ] Waveform visualization
- [ ] Boundary adjustment controls
- [ ] Segment playback
- [ ] Approve/reject workflow

### Phase 5: LEGO Extraction
- [ ] Extract segments from approved recordings
- [ ] Store in lego_library table
- [ ] Generate separate audio files
- [ ] Coverage reporting

### Phase 6: Splice Generation
- [ ] Concatenation with crossfade
- [ ] Batch generation pipeline
- [ ] Quality validation
- [ ] S3 upload with UUIDs

### Phase 7: Integration
- [ ] Connect to main audio pipeline
- [ ] Fallback to TTS for missing LEGOs
- [ ] Manifest compilation support
- [ ] QA review for spliced audio

---

## Efficiency Comparison

### Traditional Approach
```
Record every phrase individually:
- 500 practice phrases × 2 cadences = 1000 recordings
- @ 10 seconds each = 2.7 hours of recording
- Plus: fatigue, inconsistency, scheduling nightmare
- Cost: Voice artist time for 1000 recordings
```

### LEGO Splice Approach
```
Record optimized phrase set:
- ~50 phrases × 2 cadences = 100 recordings
- @ 10 seconds each = 17 minutes of recording
- System generates 1000+ phrase variations
- 10-20x efficiency gain
- Cost: Voice artist time for 100 recordings
```

**For minority language communities with one volunteer voice artist, this is the difference between "possible" and "impossible."**

---

## Open Questions

1. **Server-side processing:** Node.js with ffmpeg? Python with librosa? Dedicated audio processing service?

2. **Real-time preview:** How much can we do in-browser vs requiring server round-trip?

3. **Quality threshold tuning:** Will need experimentation per language (some languages have different phonetic characteristics).

4. **Prosody preservation:** How do we handle intonation patterns when concatenating? May need smarter crossfade at prosodic boundaries.

5. **Multiple voice artists:** Can we mix recordings from different sessions/artists? Probably not without noticeable quality issues.

---

*Last updated: 2024-12-11*
*Version: 1.0*
