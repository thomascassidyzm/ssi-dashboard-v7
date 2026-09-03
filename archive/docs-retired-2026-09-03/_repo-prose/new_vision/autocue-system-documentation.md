# Autocue Recording System - Complete Documentation

## Design Philosophy: "Studio Confidence"

The interface blends **vintage broadcast studio aesthetics** (warm amber indicators, tactile controls, VU meter-inspired waveforms) with **contemporary encouragement design** to create a supportive, professional recording environment that volunteers actually want to use.

### Key Design Decisions

1. **Typography Hierarchy**
   - **Fraunces** (display serif): Used for phrase text - high readability, warm personality, perfect for extended reading
   - **Public Sans**: Clean UI text with government-grade accessibility
   - **JetBrains Mono**: Technical data (timers, counters, waveform labels)

2. **Color System: Studio Warmth**
   - Deep charcoal workspace (#1a1d23) - reduces eye strain during long sessions
   - Amber glow (#f4a261) - recording indicators, primary actions
   - Sage green (#84a98c) - success states, progress
   - Cream (#f8f4ed) - readable text without harsh white
   - Subtle grain texture overlay - adds tactile quality

3. **Interaction Philosophy**
   - Large, confidence-inspiring buttons
   - Real-time visual feedback (waveform animations, progress bars)
   - Encouraging messages without being patronizing
   - Clear state transitions (idle → recording → review)

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP ENTRY POINT                          │
│                   View: Session Planning                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Review Today's Session       │
         │  - 47 phrases grouped by type │
         │  - Est. time: ~15 minutes     │
         │  - Strategy explanation       │
         └───────────┬───────────────────┘
                     │
                     │ [Start Recording Session]
                     │
                     ▼
         ┌───────────────────────────────┐
         │   Standard Recording Mode     │
         │                               │
         │  1. Read phrase on autocue    │
         │  2. Click "Start Recording"   │
         │  3. Speak clearly              │
         │  4. Click "Stop Recording"    │
         │  5. Review waveform           │
         │  6. Check quality indicators  │
         │     ├─ Silence Detection      │
         │     ├─ Clipping Check         │
         │     └─ Background Noise       │
         │  7. Listen to playback        │
         │  8. Decision:                 │
         │     ├─ [Retake] → back to 2   │
         │     └─ [Accept & Next]        │
         │           │                   │
         └───────────┼───────────────────┘
                     │
                     ├─── Next phrase → Loop
                     │
                     └─── OR switch to Slow-with-Gaps Mode
                              │
                              ▼
         ┌────────────────────────────────────┐
         │   Slow-with-Gaps Recording Mode    │
         │                                     │
         │  1. View phrase with gap markers   │
         │  2. Optional: Start metronome      │
         │  3. Click "Record with Gaps"       │
         │  4. Read slowly with pauses:       │
         │     "Word... [pause]... Word..."   │
         │  5. AI detects gaps automatically  │
         │  6. Review segment timeline:       │
         │     - Visual waveform display      │
         │     - Draggable chop markers       │
         │     - Manual adjustment if needed  │
         │  7. Preview each segment:          │
         │     ├─ Segment 1: "Hoffwn" (0.8s) │
         │     ├─ Segment 2: "i" (0.3s)      │
         │     └─ Segment 3: "goffi" (0.7s)  │
         │  8. Individual segment actions:    │
         │     ├─ [Play] - Listen            │
         │     └─ [Redo] - Re-record segment │
         │  9. [Accept All & Continue]        │
         │           │                        │
         └───────────┼────────────────────────┘
                     │
                     └─── Next phrase → Loop
                              │
                              ▼
         ┌───────────────────────────────┐
         │   Session Complete             │
         │                               │
         │  - Summary statistics         │
         │  - Upload to S3               │
         │  - Generate manifest          │
         │  - Gamification rewards       │
         └───────────────────────────────┘
```

---

## Component Structure (Vue 3 Architecture)

### Core Components

```
src/
├── App.vue                          # Root component, global state
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue            # Project title, stats, navigation
│   │   ├── ViewSwitcher.vue         # Tab navigation between views
│   │   └── ProgressBar.vue          # Global progress indicator
│   │
│   ├── planning/
│   │   ├── SessionPlanner.vue       # Main planning view container
│   │   ├── PhraseGroupCard.vue      # Grouped phrase display
│   │   ├── StrategyExplainer.vue    # Recording strategy info
│   │   └── EncouragementBanner.vue  # Motivational messages
│   │
│   ├── recording/
│   │   ├── RecordingInterface.vue   # Main recording view
│   │   ├── AutocueDisplay.vue       # Large phrase text display
│   │   ├── RecordingControls.vue    # Start/Stop/Retake/Accept buttons
│   │   ├── WaveformVisualizer.vue   # Real-time waveform display
│   │   ├── QualityChecks.vue        # Audio quality indicators
│   │   └── AudioPlayback.vue        # Playback controls
│   │
│   ├── gaps/
│   │   ├── GapsInterface.vue        # Slow-with-gaps main view
│   │   ├── GapsAutocue.vue          # Phrase with gap markers
│   │   ├── Metronome.vue            # Visual pacing guide
│   │   ├── SegmentChopper.vue       # Timeline editor
│   │   ├── ChopMarker.vue           # Draggable segment divider
│   │   ├── SegmentCard.vue          # Individual segment preview
│   │   └── SegmentTimeline.vue      # Waveform with markers
│   │
│   └── shared/
│       ├── Button.vue               # Reusable button component
│       ├── Card.vue                 # Generic card container
│       └── StatDisplay.vue          # Statistic number display
│
├── composables/
│   ├── useAudioRecorder.ts          # Web Audio API recording logic
│   ├── useWaveformAnalyzer.ts       # Audio visualization
│   ├── useGapDetector.ts            # Silence detection algorithm
│   ├── useQualityChecker.ts         # Audio quality analysis
│   └── useSessionManager.ts         # Session state management
│
├── stores/
│   ├── sessionStore.ts              # Pinia store: session data
│   ├── recordingStore.ts            # Pinia store: recording state
│   └── phraseStore.ts               # Pinia store: phrase data
│
├── utils/
│   ├── audioProcessor.ts            # Audio manipulation utilities
│   ├── s3Uploader.ts                # AWS S3 upload logic
│   └── manifestGenerator.ts         # Recording manifest creation
│
└── types/
    ├── Phrase.ts                    # Phrase data structure
    ├── Recording.ts                 # Recording metadata
    └── SessionConfig.ts             # Session configuration
```

---

## State Management Schema

### Session Store (Pinia)

```typescript
interface SessionState {
  // Project metadata
  languagePair: {
    source: string;      // "Welsh"
    target: string;      // "Mandarin"
  };

  // Progress tracking
  totalPhrases: number;       // 500
  recordedPhrases: number;    // 234
  completionPercentage: number; // 47

  // Current session
  currentSessionPhrases: Phrase[];
  currentPhraseIndex: number;
  sessionStartTime: Date | null;
  sessionDuration: number; // seconds

  // Grouping strategy
  phraseGroups: PhraseGroup[];
  activeGroup: string | null;

  // Gamification
  streak: number;
  badgesEarned: Badge[];
  leaderboardRank: number | null;
}

interface Phrase {
  id: string;
  text: string;                 // "Sut mae!"
  translation: string;          // "Hello!"
  category: string;             // "Greetings"
  estimatedDuration: number;    // seconds
  recordingMode: 'standard' | 'gaps';
  segments?: string[];          // For gaps mode: ["Sut", "mae"]
  recorded: boolean;
  recordingUrl?: string;
  qualityScore?: number;
}

interface PhraseGroup {
  id: string;
  title: string;                // "Greetings & Introductions"
  phraseCount: number;          // 12
  estimatedTime: number;        // 180 seconds
  phrases: Phrase[];
  examples: string[];           // First 3 phrases for preview
}
```

### Recording Store (Pinia)

```typescript
interface RecordingState {
  // Current recording
  isRecording: boolean;
  recordingStartTime: number | null;
  currentRecording: Blob | null;
  recordingDuration: number; // seconds

  // Waveform data
  audioBuffer: AudioBuffer | null;
  waveformData: Float32Array | null;

  // Quality checks
  qualityChecks: {
    silenceDetection: 'pass' | 'fail' | 'pending';
    clippingCheck: 'pass' | 'fail' | 'pending';
    backgroundNoise: 'pass' | 'fail' | 'pending';
  };

  // Gaps mode
  gapsMode: boolean;
  detectedGaps: GapMarker[];
  segments: AudioSegment[];

  // Playback
  isPlaying: boolean;
  playbackProgress: number; // 0-1
}

interface GapMarker {
  id: string;
  position: number;     // 0-1 (percentage of total duration)
  timeMs: number;       // Absolute time in milliseconds
  confidence: number;   // 0-1 (AI detection confidence)
  manuallyAdjusted: boolean;
}

interface AudioSegment {
  id: string;
  label: string;        // "Segment 1: Hoffwn"
  startTime: number;    // milliseconds
  endTime: number;      // milliseconds
  duration: number;     // milliseconds
  audioBlob: Blob;
  waveformData: Float32Array;
}
```

---

## Key Technical Implementations

### 1. Web Audio API Recording

```typescript
// composables/useAudioRecorder.ts
export function useAudioRecorder() {
  const audioContext = new AudioContext();
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const audioChunks = ref<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000
      }
    });

    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data);
    };

    mediaRecorder.value.start();
  }

  function stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      mediaRecorder.value!.onstop = () => {
        const audioBlob = new Blob(audioChunks.value, {
          type: 'audio/webm'
        });
        audioChunks.value = [];
        resolve(audioBlob);
      };

      mediaRecorder.value!.stop();
    });
  }

  return { startRecording, stopRecording };
}
```

### 2. Real-time Waveform Visualization

```typescript
// composables/useWaveformAnalyzer.ts
export function useWaveformAnalyzer(audioContext: AudioContext) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function getWaveformData(): number[] {
    analyser.getByteTimeDomainData(dataArray);

    // Sample 80 points for visualization
    const samples = 80;
    const step = Math.floor(bufferLength / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const value = dataArray[i * step];
      // Normalize to 0-100 for height
      waveform.push((value / 255) * 100);
    }

    return waveform;
  }

  function connectSource(source: MediaStreamAudioSourceNode) {
    source.connect(analyser);
  }

  return { analyser, getWaveformData, connectSource };
}
```

### 3. Gap Detection Algorithm

```typescript
// composables/useGapDetector.ts
export function useGapDetector() {
  function detectGaps(audioBuffer: AudioBuffer): GapMarker[] {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.02; // Silence threshold
    const minGapDuration = 0.2; // 200ms minimum gap

    const gaps: GapMarker[] = [];
    let silenceStart = -1;

    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);

      if (amplitude < threshold) {
        // Silence detected
        if (silenceStart === -1) {
          silenceStart = i;
        }
      } else {
        // Sound detected
        if (silenceStart !== -1) {
          const gapDuration = (i - silenceStart) / sampleRate;

          if (gapDuration >= minGapDuration) {
            // Valid gap found
            const gapCenter = (silenceStart + i) / 2;
            const timeMs = (gapCenter / sampleRate) * 1000;
            const position = gapCenter / channelData.length;

            gaps.push({
              id: crypto.randomUUID(),
              position,
              timeMs,
              confidence: Math.min(gapDuration / minGapDuration, 1),
              manuallyAdjusted: false
            });
          }

          silenceStart = -1;
        }
      }
    }

    return gaps;
  }

  function splitByGaps(
    audioBuffer: AudioBuffer,
    gaps: GapMarker[]
  ): AudioSegment[] {
    const segments: AudioSegment[] = [];
    const sortedGaps = [...gaps].sort((a, b) => a.timeMs - b.timeMs);

    let startTime = 0;

    sortedGaps.forEach((gap, index) => {
      const endTime = gap.timeMs;
      const segment = extractSegment(audioBuffer, startTime, endTime);

      segments.push({
        id: crypto.randomUUID(),
        label: `Segment ${index + 1}`,
        startTime,
        endTime,
        duration: endTime - startTime,
        audioBlob: segment.blob,
        waveformData: segment.waveform
      });

      startTime = endTime;
    });

    // Final segment after last gap
    const finalSegment = extractSegment(
      audioBuffer,
      startTime,
      audioBuffer.duration * 1000
    );

    segments.push({
      id: crypto.randomUUID(),
      label: `Segment ${sortedGaps.length + 1}`,
      startTime,
      endTime: audioBuffer.duration * 1000,
      duration: audioBuffer.duration * 1000 - startTime,
      audioBlob: finalSegment.blob,
      waveformData: finalSegment.waveform
    });

    return segments;
  }

  return { detectGaps, splitByGaps };
}
```

### 4. Quality Checker

```typescript
// composables/useQualityChecker.ts
export function useQualityChecker() {
  function checkAudioQuality(audioBuffer: AudioBuffer) {
    const silenceCheck = checkSilence(audioBuffer);
    const clippingCheck = checkClipping(audioBuffer);
    const noiseCheck = checkBackgroundNoise(audioBuffer);

    return {
      silenceDetection: silenceCheck.passed ? 'pass' : 'fail',
      clippingCheck: clippingCheck.passed ? 'pass' : 'fail',
      backgroundNoise: noiseCheck.passed ? 'pass' : 'fail',
      details: {
        silence: silenceCheck,
        clipping: clippingCheck,
        noise: noiseCheck
      }
    };
  }

  function checkSilence(audioBuffer: AudioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const threshold = 0.01;
    let silentSamples = 0;

    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) < threshold) {
        silentSamples++;
      }
    }

    const silencePercentage = (silentSamples / channelData.length) * 100;

    return {
      passed: silencePercentage < 70, // Fail if >70% silence
      percentage: silencePercentage,
      message: silencePercentage > 70
        ? 'Recording is too quiet or silent'
        : 'Good audio level'
    };
  }

  function checkClipping(audioBuffer: AudioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const clippingThreshold = 0.98;
    let clippedSamples = 0;

    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > clippingThreshold) {
        clippedSamples++;
      }
    }

    const clippingPercentage = (clippedSamples / channelData.length) * 100;

    return {
      passed: clippingPercentage < 0.5, // Fail if >0.5% clipping
      percentage: clippingPercentage,
      message: clippingPercentage > 0.5
        ? 'Audio is clipping - reduce microphone volume'
        : 'No clipping detected'
    };
  }

  function checkBackgroundNoise(audioBuffer: AudioBuffer) {
    // Simplified noise detection: check variance in "silent" portions
    const channelData = audioBuffer.getChannelData(0);
    const silentThreshold = 0.05;
    const silentPortions = [];

    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) < silentThreshold) {
        silentPortions.push(channelData[i]);
      }
    }

    if (silentPortions.length === 0) {
      return { passed: true, variance: 0, message: 'No silent portions to analyze' };
    }

    // Calculate variance
    const mean = silentPortions.reduce((a, b) => a + b, 0) / silentPortions.length;
    const variance = silentPortions.reduce(
      (sum, val) => sum + Math.pow(val - mean, 2),
      0
    ) / silentPortions.length;

    return {
      passed: variance < 0.001, // Fail if high variance in "silent" portions
      variance,
      message: variance > 0.001
        ? 'Background noise detected'
        : 'Clean recording'
    };
  }

  return { checkAudioQuality };
}
```

### 5. S3 Upload with Progress

```typescript
// utils/s3Uploader.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export async function uploadRecording(
  phraseId: string,
  audioBlob: Blob,
  metadata: RecordingMetadata,
  onProgress?: (progress: number) => void
): Promise<string> {
  const s3Client = new S3Client({
    region: process.env.VUE_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.VUE_APP_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.VUE_APP_AWS_SECRET_ACCESS_KEY!
    }
  });

  const fileName = `${metadata.languagePair}/${phraseId}_${Date.now()}.webm`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.VUE_APP_S3_BUCKET!,
      Key: fileName,
      Body: audioBlob,
      ContentType: 'audio/webm',
      Metadata: {
        phraseId,
        languagePair: metadata.languagePair,
        recordedBy: metadata.recordedBy,
        timestamp: new Date().toISOString(),
        qualityScore: metadata.qualityScore.toString()
      }
    }
  });

  upload.on('httpUploadProgress', (progress) => {
    if (onProgress && progress.loaded && progress.total) {
      onProgress((progress.loaded / progress.total) * 100);
    }
  });

  await upload.done();

  return `https://${process.env.VUE_APP_S3_BUCKET}.s3.${process.env.VUE_APP_AWS_REGION}.amazonaws.com/${fileName}`;
}

interface RecordingMetadata {
  languagePair: string;
  recordedBy: string;
  qualityScore: number;
}
```

---

## Wireframes & Visual Design

### Session Planning View

```
┌────────────────────────────────────────────────────────────────┐
│  🎙️ Autocue Recording System    │   234 | 500 | 47%          │
│     Welsh → Mandarin              │  Recorded Total Complete   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Session Planning] [Record] [Slow-with-Gaps]                  │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │ Today's Session          │  │ Recording Strategy       │   │
│  │ [47 phrases]             │  │                          │   │
│  │                          │  │ 💡 Intelligent Grouping  │   │
│  │ ▌Greetings (12) ~3min    │  │ We've organized phrases  │   │
│  │ ▌Directions (18) ~5min   │  │ by similarity...         │   │
│  │ ▌Food & Drink (17) ~4min │  │                          │   │
│  │                          │  │ ⚡ Min Set Optimization  │   │
│  │ [Start Recording]        │  │ Only 35 unique needed!   │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Standard Recording View

```
┌────────────────────────────────────────────────────────────────┐
│  Progress: [████████░░░░] Phrase 235 of 500 | 47%             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PHRASE #235 • GREETINGS & INTRODUCTIONS                 │ │
│  │                                                           │ │
│  │            Sut mae! Sut dych chi heddiw?                 │ │
│  │                                                           │ │
│  │             Hello! How are you today?                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│     [🔊 Playback]  [⏺️ Start Recording]  [↻ Retake]           │
│                    [✓ Accept & Next]                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Audio Preview                              0:03          │ │
│  │  ▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✓ No Silence    ✓ No Clipping    ✓ No Noise                  │
│                                                                 │
│  💪 Great pacing! Your recordings are consistently high quality│
└────────────────────────────────────────────────────────────────┘
```

### Slow-with-Gaps View

```
┌────────────────────────────────────────────────────────────────┐
│  Progress: [████████░░░░] Phrase 236 of 500 | 47%             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SLOW RECORDING MODE • FOOD & DRINK                       │ │
│  │                                                           │ │
│  │  Hoffwn ── i ── goffi ── os ── gwelwch ── yn ── dda      │ │
│  │                                                           │ │
│  │         I would like coffee, please                       │ │
│  │                                                           │ │
│  │  Metronome: ● ○ ○ ○ ○                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│     [🎵 Metronome]    [⏺️ Record with Gaps]                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Segment Timeline                                         │ │
│  │  Drag markers to adjust chop points                       │ │
│  │  ▁▂▃▅▇│█▇▅▃│▂▁▂▃│▅▇█│▇▅▃│▂▁                               │ │
│  │       1     2     3     4     5                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Hoffwn  │ │    i    │ │  goffi  │ │   os    │            │
│  │  0.8s   │ │  0.3s   │ │  0.7s   │ │  0.5s   │            │
│  │ ▶ Redo  │ │ ▶ Redo  │ │ ▶ Redo  │ │ ▶ Redo  │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                                 │
│              [✓ Accept All Segments & Continue]                │
└────────────────────────────────────────────────────────────────┘
```

---

## Gamification & Motivation

### Encouragement System

The system provides contextual, data-driven encouragement without being annoying:

**After completing a group:**
> "Excellent work! You've completed all 12 greeting phrases in just 2 minutes 47 seconds. That's 15% faster than your average!"

**During a long session:**
> "You're on fire! 18 phrases recorded without a single retake. Your consistency is impressive."

**When quality is consistently high:**
> "Your audio quality has been perfect for the last 25 recordings. Professional-grade work!"

**Milestone achievements:**
> "Congratulations! You've just crossed 250 phrases. You're now in the top 10% of contributors for Welsh-Mandarin!"

### Gamification Elements

1. **Streak Tracking**
   - Record daily to maintain streak
   - Visual indicator in header
   - Rewards for 7-day, 30-day, 100-day streaks

2. **Badges**
   - "First 100" - Record first 100 phrases
   - "Marathon" - Complete 50+ phrases in one session
   - "Perfectionist" - 25 consecutive accepts without retakes
   - "Early Bird" - Record before 8am
   - "Night Owl" - Record after 10pm
   - "Quality Champion" - 95%+ quality score average

3. **Community Leaderboard** (Optional)
   - Weekly top contributors
   - Most phrases recorded
   - Highest average quality score
   - Longest streak
   - **Privacy-first**: Volunteers opt-in, anonymous usernames

4. **Progress Milestones**
   - Visual celebration at 25%, 50%, 75%, 100%
   - Animated confetti effect
   - Special encouragement message
   - Download certificate of contribution

---

## Accessibility Considerations

1. **Keyboard Navigation**
   - All controls accessible via keyboard
   - Space bar: Start/Stop recording
   - Enter: Accept and next
   - R: Retake
   - Arrow keys: Navigate segments

2. **Screen Reader Support**
   - ARIA labels on all interactive elements
   - Live regions for status updates
   - Descriptive button labels

3. **Visual Indicators**
   - Never rely on color alone
   - Icons accompany color states
   - High contrast mode support

4. **Font Size & Readability**
   - Phrase text: 2.5rem minimum
   - Adjustable text size option
   - Line height: 1.4-1.8 for readability

5. **Focus States**
   - Clear focus indicators
   - Consistent focus order
   - Skip navigation links

---

## Technical Requirements

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required APIs
- Web Audio API
- MediaRecorder API
- Web Workers (for audio processing)
- Local Storage (session persistence)

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Audio processing latency: < 200ms
- Upload progress feedback: Real-time

### Audio Specifications
- Format: WebM Opus (primary), MP3 (fallback)
- Sample Rate: 48kHz
- Bit Rate: 128kbps
- Channels: Mono
- Echo Cancellation: Enabled
- Noise Suppression: Enabled

---

## Export & Data Management

### Recording Manifest Format (JSON)

```json
{
  "projectId": "welsh-mandarin-v1",
  "sessionId": "sess_20250104_234123",
  "volunteer": {
    "id": "vol_12345",
    "name": "Anonymous Contributor #47"
  },
  "recordingDate": "2025-01-04T23:41:23Z",
  "statistics": {
    "totalPhrases": 47,
    "recordedPhrases": 47,
    "retakes": 3,
    "averageQualityScore": 0.94,
    "totalDuration": 892
  },
  "recordings": [
    {
      "phraseId": "phrase_001",
      "phraseText": "Sut mae! Sut dych chi heddiw?",
      "translation": "Hello! How are you today?",
      "category": "Greetings",
      "recordingUrl": "s3://bucket/welsh-mandarin/phrase_001_1704409283.webm",
      "duration": 3.2,
      "recordingMode": "standard",
      "qualityChecks": {
        "silence": "pass",
        "clipping": "pass",
        "noise": "pass"
      },
      "metadata": {
        "attempts": 1,
        "timestamp": "2025-01-04T23:42:15Z",
        "deviceInfo": "Chrome/120.0.0.0 (macOS)"
      }
    },
    {
      "phraseId": "phrase_002",
      "phraseText": "Hoffwn i goffi os gwelwch yn dda",
      "translation": "I would like coffee please",
      "category": "Food & Drink",
      "recordingMode": "gaps",
      "segments": [
        {
          "segmentId": "seg_001",
          "label": "Hoffwn",
          "recordingUrl": "s3://bucket/welsh-mandarin/phrase_002_seg1_1704409295.webm",
          "duration": 0.8,
          "startTime": 0,
          "endTime": 0.8
        },
        {
          "segmentId": "seg_002",
          "label": "i",
          "recordingUrl": "s3://bucket/welsh-mandarin/phrase_002_seg2_1704409295.webm",
          "duration": 0.3,
          "startTime": 1.2,
          "endTime": 1.5
        }
      ],
      "gapMarkers": [
        { "position": 0.12, "timeMs": 800, "confidence": 0.95 },
        { "position": 0.24, "timeMs": 1500, "confidence": 0.89 }
      ]
    }
  ]
}
```

---

## Future Enhancements

### Phase 2 Features
1. **AI-Powered Feedback**
   - Pronunciation scoring
   - Accent consistency analysis
   - Suggest retakes for outlier recordings

2. **Collaborative Recording**
   - Multiple volunteers work on same project
   - Real-time progress synchronization
   - Assign specific phrase groups to volunteers

3. **Advanced Audio Processing**
   - Automatic background noise removal
   - Dynamic volume normalization
   - AI-powered audio enhancement

4. **Mobile App**
   - Native iOS/Android apps
   - Offline recording capability
   - Push notifications for session reminders

5. **Analytics Dashboard**
   - Volunteer contribution tracking
   - Quality trends over time
   - Project completion forecasting

---

## Conclusion

The Autocue Recording System transforms the tedious task of recording thousands of phrases into an engaging, professional experience. By combining intelligent recording strategies (long phrase recording, slow-with-gaps mode, intelligent grouping) with a warm, supportive interface design, volunteers feel empowered rather than overwhelmed.

**Key Success Factors:**
- **Professional aesthetics** inspire confidence
- **Real-time feedback** (waveforms, quality checks) reduces anxiety
- **Encouragement system** maintains motivation
- **Flexible recording modes** accommodate different phrase types
- **Clear progress tracking** shows tangible impact

This system doesn't just collect audio—it respects volunteers' time and effort by making the recording process as efficient and pleasant as possible.
