# Autocue Two-Mode Recording System
## Teleprompter-First Design Specification

**Version**: 2.0 - Teleprompter Flow State Architecture
**Last Updated**: 2025-12-04
**Status**: Production Specification

---

## Executive Summary

The original autocue system was a "joy suck" - volunteers had to click through every single phrase, making 20-minute sessions feel like hours of repetitive button-mashing. This redesign transforms the experience into **studio teleprompter sessions** where volunteers enter a flow state and record dozens of phrases continuously.

### The Core Problem

**Old Way**: Click → Read → Click → Review → Click → Next → Repeat 668 times
**New Way**: Start session → Read continuously for 20 minutes → AI handles segmentation → Done

### The Solution: Two Recording Modes

1. **Mode 1: New Course Recording (Two-Pass Flow)** - For creating courses from scratch
2. **Mode 2: Regeneration Recording (Targeted Fixes)** - For QA and refinement

---

## Design Philosophy

### Flow State Over Control
Minimize interruptions. Once recording starts, the volunteer should be **reading, not clicking**.

### Teleprompter, Not Form
The interface feels like a professional broadcast studio, not a data entry form.

### AI Does the Work
Silence detection, segment chopping, boundary alignment - all automated. Volunteers focus on performance.

### Volunteer Joy
Make people WANT to record for hours. Make it feel like contributing to something meaningful, not data entry drudgery.

---

## MODE 1: New Course Recording (Two-Pass System)

### Use Case
Creating a new language course from scratch (e.g., Welsh→Mandarin) where no TTS or existing recordings exist.

### The Two-Pass Strategy

#### **Pass 1: Natural Speed Recording**
**Goal**: Capture natural prosody and native rhythm

**Experience**:
- Volunteer sees all course phrases in teleprompter format
- Large, readable text scrolls smoothly
- Upcoming phrases visible for context
- Natural reading pace - no pauses, no gaps
- Continuous recording for entire session (10-30 minutes)
- Minimal UI - just the text and subtle recording indicator

**Output**:
- One long recording session file (e.g., `session_001_pass1_full.webm`)
- Phrase boundary timestamps (AI-detected via text alignment)
- Individual phrase files (e.g., `phrase_001_full.mp3`, `phrase_002_full.mp3`)

**Technical Process**:
1. Record entire session as single audio file
2. Use text-to-audio alignment (forced alignment algorithms)
3. Detect phrase boundaries automatically
4. Split into individual phrase files
5. Generate quality reports per phrase

#### **Pass 2: Slow-with-Gaps Recording**
**Goal**: Capture LEGO components and sub-phrases for recombination

**Experience**:
- Same phrases, shown again with gap markers
- Volunteer reads deliberately: "Word... [pause]... Word... [pause]... Word"
- Visual cues show where to pause (gap markers: `──`)
- Optional metronome for pacing consistency
- Still continuous recording (one long session)

**Phrase Display Example**:
```
Hoffwn ── i ── goffi ── os ── gwelwch ── yn ── dda
I would like ── coffee ── please
```

**Output**:
- One long recording session file (e.g., `session_001_pass2_gaps.webm`)
- AI-detected silence boundaries
- Chopped component files (e.g., `lego_hoffwn.mp3`, `lego_i.mp3`, `lego_goffi.mp3`)
- Manual adjustment interface for boundary refinement

**Technical Process**:
1. Record entire session with deliberate gaps
2. Run silence detection algorithm (threshold: -40dB, min duration: 200ms)
3. Identify segment boundaries (gap centers)
4. Split into LEGO component files
5. Present adjustment UI for volunteer review

### Post-Recording Review Interface

After BOTH passes complete, volunteer reviews:

**Waveform Timeline View**:
- Full session waveform displayed
- Detected segments highlighted with boundaries
- Color-coded by confidence level:
  - Green (>90%): High confidence, likely correct
  - Yellow (70-90%): Medium confidence, review recommended
  - Red (<70%): Low confidence, manual adjustment needed

**Segment Cards**:
```
┌─────────────────────────────────────┐
│ Phrase #001: "Sut mae!"            │
│ Duration: 1.2s | Confidence: 95%   │
│ [▶ Play] [↻ Re-record] [✓ Approve] │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ LEGO Component: "hoffwn"           │
│ Duration: 0.8s | Confidence: 88%   │
│ [▶ Play] [↻ Re-record] [✓ Approve] │
└─────────────────────────────────────┘
```

**Batch Actions**:
- "Approve All High-Confidence Segments" (one click approves all green items)
- "Review Medium Confidence" (filters to yellow items)
- "Re-record Failed Segments" (queues red items for re-recording)

### Session Flow Diagram (Mode 1)

```
┌─────────────────────────────────────────────────┐
│         START NEW COURSE SESSION                │
│  "Welsh→Mandarin - Session 001 (47 phrases)"   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   PASS 1: Natural    │
        │   Speed Recording    │
        │                      │
        │ • Teleprompter mode  │
        │ • Continuous scroll  │
        │ • 47 phrases total   │
        │ • Est. time: 10 min  │
        └──────────┬───────────┘
                   │
                   │ [Record Complete]
                   │
                   ▼
        ┌──────────────────────┐
        │  AI Processing       │
        │  • Text alignment    │
        │  • Phrase detection  │
        │  • Quality checks    │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   PASS 2: Gaps       │
        │   Recording          │
        │                      │
        │ • Same 47 phrases    │
        │ • Slow with pauses   │
        │ • Gap markers shown  │
        │ • Est. time: 15 min  │
        └──────────┬───────────┘
                   │
                   │ [Record Complete]
                   │
                   ▼
        ┌──────────────────────┐
        │  AI Processing       │
        │  • Silence detection │
        │  • Segment chopping  │
        │  • Component extract │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Review & Approve    │
        │  • Waveform viewer   │
        │  • Segment cards     │
        │  • Batch approval    │
        │  • Re-record queue   │
        └──────────┬───────────┘
                   │
                   │ [Approve & Upload]
                   │
                   ▼
        ┌──────────────────────┐
        │  Session Complete    │
        │  • 47 full phrases   │
        │  • 127 LEGO pieces   │
        │  • Uploaded to S3    │
        │  • Manifest updated  │
        └──────────────────────┘
```

---

## MODE 2: Regeneration Recording (Targeted Fixes)

### Use Case
Fixing specific phrases flagged during QA review in Script Viewer. Could be 5 items, could be 50 - any subset of the course that needs re-recording.

### The Regeneration Flow

**Pre-Session Setup**:
1. Course producer flags items in Script Viewer QA interface
2. Flagging includes reason (e.g., "Background noise", "Mispronunciation", "Clipping")
3. Flagged items generate a "Regeneration Queue"
4. Queue exports to autocue system

**Recording Experience**:
- Teleprompter shows ONLY flagged items
- Each item displays:
  - Original phrase text
  - Reason for flagging
  - Original audio (playback available)
  - Suggested fixes (if applicable)
- Still feels like continuous flow (not one-by-one clicking)
- Option to skip items and return later
- Quick review after each, or batch review at end

**Display Example**:
```
┌────────────────────────────────────────────────┐
│ REGENERATION QUEUE: 12 items remaining        │
│ Current: Item 3 of 12                          │
├────────────────────────────────────────────────┤
│                                                │
│ Phrase #037: "Hoffwn i goffi os gwelwch yn dda"│
│ Translation: "I would like coffee please"      │
│                                                │
│ ⚠️ Flagged: Background noise detected         │
│ 🔊 [Play Original Recording]                  │
│                                                │
│ ⏺️ Ready to record replacement                │
│                                                │
└────────────────────────────────────────────────┘
```

**Recording Options**:

1. **Individual Re-record**: Record one item, instant review, approve/retake
2. **Batch Record Mode**: Record multiple items continuously, review all at end
3. **Skip & Return**: Skip problematic items, queue for later in session

**Post-Recording Review**:
- Side-by-side comparison: Original vs. New
- Waveform comparison view
- Quality indicators (clipping, noise, silence)
- Option to keep original or use new recording

### Session Flow Diagram (Mode 2)

```
┌─────────────────────────────────────────────────┐
│      START REGENERATION SESSION                 │
│   "12 flagged items from Script Viewer QA"     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Flagged Item #1     │
        │  • Show context      │
        │  • Play original     │
        │  • Display issue     │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Record or Skip?     │
        │  • [Record Now]      │
        │  • [Skip & Return]   │
        └──────┬─────────┬─────┘
               │         │
     [Record] │         │ [Skip]
               │         │
               ▼         └─────────┐
        ┌──────────────────────┐  │
        │  Recording           │  │
        │  • Teleprompter      │  │
        │  • Single item       │  │
        └──────────┬───────────┘  │
                   │               │
                   ▼               │
        ┌──────────────────────┐  │
        │  Quick Review        │  │
        │  • Compare waveforms │  │
        │  • Play new vs old   │  │
        │  • [Approve/Retake]  │  │
        └──────────┬───────────┘  │
                   │               │
     [Approved]   │               │
                   │               │
                   ▼               │
        ┌──────────────────────┐  │
        │  Next Item           │◀─┘
        │  (Loop until done)   │
        └──────────┬───────────┘
                   │
                   │ [All items processed]
                   │
                   ▼
        ┌──────────────────────┐
        │  Session Summary     │
        │  • 10 re-recorded    │
        │  • 2 skipped         │
        │  • Upload changes    │
        └──────────────────────┘
```

---

## Technical Architecture

### Component Structure (Vue 3)

```
src/components/autocue/
├── modes/
│   ├── NewCourseMode.vue           # Mode 1 orchestrator
│   ├── RegenerationMode.vue        # Mode 2 orchestrator
│   └── ModeSelector.vue            # Choose recording mode
│
├── teleprompter/
│   ├── TeleprompterDisplay.vue     # Core scrolling text display
│   ├── PhraseCard.vue              # Individual phrase in prompter
│   ├── ScrollController.vue        # Speed controls & navigation
│   ├── RecordingIndicator.vue      # Subtle REC indicator
│   └── UpcomingPhrasePreview.vue   # Context preview
│
├── passes/
│   ├── PassOneInterface.vue        # Natural speed recording UI
│   ├── PassTwoInterface.vue        # Gaps recording UI
│   ├── PassIndicator.vue           # "Pass 1 of 2" display
│   └── GapMarkerDisplay.vue        # Visual gap markers (──)
│
├── review/
│   ├── SessionReviewInterface.vue  # Post-recording review
│   ├── WaveformTimeline.vue        # Full session waveform
│   ├── SegmentCard.vue             # Individual segment review
│   ├── SegmentBatchActions.vue     # Bulk approve/reject
│   └── ComparisonViewer.vue        # Old vs. new (Mode 2)
│
├── recording/
│   ├── ContinuousRecorder.vue      # Handles long-form recording
│   ├── AudioBufferManager.vue      # Memory management for long files
│   ├── RecordingControls.vue       # Start/stop/pause controls
│   └── QualityMonitor.vue          # Real-time quality checks
│
└── shared/
    ├── Metronome.vue               # Optional pacing guide
    ├── ConfidenceBadge.vue         # AI confidence indicators
    └── ProgressTracker.vue         # Session progress display
```

### Composables

```typescript
// composables/useContinuousRecorder.ts
export function useContinuousRecorder() {
  // Handles long-form recording (30+ minutes)
  // Memory-efficient chunking
  // Background upload of chunks
  const startSession = () => { ... }
  const pauseSession = () => { ... }
  const endSession = () => { ... }
  return { startSession, pauseSession, endSession, ... }
}

// composables/useTextAudioAlignment.ts
export function useTextAudioAlignment() {
  // Forced alignment algorithm
  // Text-to-timestamp mapping
  // Phrase boundary detection
  const alignTextToAudio = (text: string[], audioBuffer: AudioBuffer) => { ... }
  return { alignTextToAudio, ... }
}

// composables/useSilenceDetection.ts
export function useSilenceDetection() {
  // Advanced silence detection
  // Adaptive threshold calculation
  // Gap boundary identification
  const detectGaps = (audioBuffer: AudioBuffer) => { ... }
  const splitByGaps = (audioBuffer: AudioBuffer, gaps: Gap[]) => { ... }
  return { detectGaps, splitByGaps, ... }
}

// composables/useSegmentChopper.ts
export function useSegmentChopper() {
  // Audio segment extraction
  // LEGO component generation
  // Quality validation per segment
  const extractSegments = (audioBuffer: AudioBuffer, boundaries: Boundary[]) => { ... }
  return { extractSegments, ... }
}

// composables/useTeleprompterScroll.ts
export function useTeleprompterScroll() {
  // Smooth scrolling logic
  // Speed adjustment
  // Auto-scroll based on recording progress
  const startScroll = (speed: number) => { ... }
  const adjustSpeed = (delta: number) => { ... }
  return { startScroll, adjustSpeed, ... }
}
```

### State Management (Pinia)

```typescript
// stores/twoModeRecordingStore.ts
interface TwoModeRecordingState {
  // Mode selection
  activeMode: 'new-course' | 'regeneration' | null;

  // Mode 1: Two-pass state
  currentPass: 1 | 2 | null;
  pass1Complete: boolean;
  pass2Complete: boolean;
  pass1Segments: AudioSegment[];  // Full phrases
  pass2Segments: AudioSegment[];  // LEGO components

  // Mode 2: Regeneration state
  regenerationQueue: FlaggedItem[];
  currentQueueIndex: number;
  skippedItems: string[];          // IDs of skipped items
  replacements: Map<string, AudioSegment>;  // New recordings

  // Teleprompter state
  phrases: Phrase[];
  currentPhraseIndex: number;
  scrollSpeed: number;              // words per minute
  isScrolling: boolean;

  // Recording state
  isRecording: boolean;
  sessionStartTime: number | null;
  recordingBuffer: Float32Array[];  // Chunked audio data

  // Review state
  segmentsForReview: ReviewSegment[];
  approvedSegments: string[];
  rejectedSegments: string[];

  // Quality metrics
  sessionQualityScore: number;
  segmentQualityScores: Map<string, number>;
}

interface Phrase {
  id: string;
  text: string;                      // "Hoffwn i goffi"
  translation: string;               // "I would like coffee"
  gapMarkers?: number[];             // [7, 9] - character positions for gaps
  components?: string[];             // ["Hoffwn", "i", "goffi"]
}

interface FlaggedItem extends Phrase {
  flagReason: string;                // "Background noise"
  originalAudioUrl: string;
  flaggedBy: string;
  flaggedAt: Date;
  suggestedFix?: string;
}

interface AudioSegment {
  id: string;
  phraseId: string;
  label: string;                     // "Phrase #001" or "LEGO: hoffwn"
  startTime: number;                 // milliseconds
  endTime: number;
  duration: number;
  audioBlob: Blob;
  waveformData: Float32Array;
  confidence: number;                // 0-1 (AI confidence)
  qualityScore: number;              // 0-1
  approved: boolean;
}

interface ReviewSegment extends AudioSegment {
  confidenceLevel: 'high' | 'medium' | 'low';
  issues: string[];                  // ["clipping", "noise"]
  originalAudioUrl?: string;         // For Mode 2 comparison
}
```

---

## Teleprompter UX Design Specifications

### Typography & Readability

**Phrase Display**:
- Font: Fraunces (display serif) - optimized for extended reading
- Size: 3.5rem (56px) for current phrase
- Line height: 1.5 for comfortable reading
- Color: Cream (#f8f4ed) - warm, non-harsh
- Shadow: Subtle glow during recording (0 0 20px rgba(244, 162, 97, 0.3))

**Upcoming Phrases (Context)**:
- Font: Same (Fraunces)
- Size: 2rem (32px) - smaller but readable
- Opacity: 0.4 (ghosted)
- Position: Above and below current phrase
- Purpose: Volunteer knows what's coming, maintains flow

**Translation Text**:
- Font: Public Sans (UI font)
- Size: 1.3rem (21px)
- Style: Italic
- Color: Cream dim (#d4cfc2)
- Position: Below phrase, separated by 1.5rem gap

### Visual Hierarchy

```
┌────────────────────────────────────────────────┐
│                                                │
│        [Upcoming phrase, ghosted]              │  ← Context
│                                                │
│                                                │
│          Hoffwn i goffi os gwelwch yn dda     │  ← CURRENT (large, prominent)
│          I would like coffee please            │  ← Translation
│                                                │
│                                                │
│        [Next phrase, ghosted]                  │  ← Context
│                                                │
└────────────────────────────────────────────────┘
```

### Recording Indicator

**Subtle, Not Distracting**:
- Position: Top-right corner, fixed
- Style: Small pulsing red dot (12px diameter)
- Text: "REC" in monospace font
- Animation: Gentle pulse (opacity 0.6 → 1.0, 2s cycle)
- Timer: Small elapsed time counter (00:03:47)

**During Recording**:
- Amber accent bar at top of display (4px height)
- Shimmering animation (left-to-right gradient movement)
- Current phrase text gains subtle amber glow

### Scroll Control

**Automatic Scroll Mode** (Default):
- Smooth, constant velocity scrolling
- Speed: Adjustable (100-200 WPM typical)
- Auto-pause: On phrase boundaries (brief 0.5s pause)
- Progress: Invisible to volunteer (no distracting progress bars)

**Manual Control** (Advanced):
- Keyboard shortcuts:
  - `↑/↓`: Adjust scroll speed
  - `Space`: Pause/resume scroll
  - `←/→`: Skip backward/forward one phrase
  - `R`: Restart from beginning of current phrase
- Mouse wheel: Speed adjustment
- Touch: Swipe up/down for speed control

### Gap Markers (Pass 2)

**Visual Representation**:
```
Word ── Word ── Word
```

**Styling**:
- Width: 40px horizontal line
- Height: 6px
- Color: Amber glow (#f4a261)
- Animation: Subtle pulse (opacity 0.4 → 1.0)
- Spacing: 1rem before and after marker

**Purpose**:
Clear visual cue where volunteer should pause between words in Pass 2.

### Metronome (Optional, Pass 2)

**Display**:
```
● ○ ○ ○ ○
```

**Behavior**:
- Visual beats at consistent interval (configurable, default 600ms)
- Active beat: Amber glow, larger size (1.5x scale)
- Inactive beats: Dim gray
- Position: Below phrase text, centered
- Optional audio tick (toggleable)

**Purpose**:
Helps volunteers maintain consistent pacing for gap recording.

---

## Post-Recording Review Interface

### Waveform Timeline View

**Full Session Visualization**:
- Height: 200px
- Width: Full viewport width (responsive)
- Background: Studio dark (#1a1d23)
- Waveform bars: 200-300 bars for session duration
- Color coding:
  - Green (#84a98c): Approved segments
  - Yellow (#e9c46a): Under review
  - Red (#e76f51): Flagged for re-recording
  - Gray (#3a404c): Not yet reviewed

**Interactive Features**:
- Hover: Highlight segment, show tooltip with phrase text
- Click: Jump to segment card in review list
- Scrub: Click-and-drag to playback position
- Zoom: Pinch/scroll to zoom into specific section

**Boundary Markers**:
- Vertical lines at detected boundaries
- Draggable for manual adjustment
- Confidence indicator (line thickness):
  - Thick (3px): High confidence (>90%)
  - Medium (2px): Medium confidence (70-90%)
  - Thin (1px): Low confidence (<70%)

### Segment Review Cards

**Card Layout**:
```
┌─────────────────────────────────────────────────┐
│ [●●●●●○○○○○] 95% Confidence                    │  ← Confidence bar
│                                                 │
│ Phrase #037: "Hoffwn i goffi"                  │  ← Label
│ Translation: "I would like coffee"             │
│                                                 │
│ Duration: 1.8s | Quality: Excellent            │  ← Metadata
│                                                 │
│ ▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁                          │  ← Mini waveform
│                                                 │
│ [▶ Play] [↻ Re-record] [✏ Adjust] [✓ Approve] │  ← Actions
│                                                 │
│ ✓ No clipping   ✓ Clean audio   ⚠ Slight noise│  ← Quality checks
└─────────────────────────────────────────────────┘
```

**Color-Coded by Confidence**:
- High (>90%): Green left border (4px)
- Medium (70-90%): Yellow left border
- Low (<70%): Red left border

### Batch Actions Panel

**Bulk Operations**:
```
┌─────────────────────────────────────────────────┐
│ BATCH ACTIONS                                   │
│                                                 │
│ [✓ Approve All High Confidence (37 items)]     │
│ [⚠ Review Medium Confidence (12 items)]        │
│ [↻ Queue Low Confidence for Re-record (3)]     │
│ [▶ Play All in Sequence]                       │
│                                                 │
│ Selection: 52 items | Approved: 37 | Pending: 15│
└─────────────────────────────────────────────────┘
```

**Smart Filters**:
- "Show Only Unapproved"
- "Show Issues Only" (clipping, noise, etc.)
- "Show LEGO Components Only" (vs. full phrases)
- "Show Pass 1" / "Show Pass 2"

### Comparison View (Mode 2: Regeneration)

**Side-by-Side Display**:
```
┌──────────────────────┐  ┌──────────────────────┐
│ ORIGINAL RECORDING   │  │ NEW RECORDING        │
│                      │  │                      │
│ [▶ Play]             │  │ [▶ Play]             │
│ ▁▂▃▅▇█▇▅▃▂▁         │  │ ▁▂▃▅▇█▇▅▃▂▁         │
│                      │  │                      │
│ Quality: 72%         │  │ Quality: 94%         │
│ Issues:              │  │ Issues: None         │
│ • Background noise   │  │                      │
│ • Slight clipping    │  │                      │
│                      │  │                      │
│ [Keep Original]      │  │ [Use New Recording]  │
└──────────────────────┘  └──────────────────────┘
```

**Comparison Features**:
- Synchronized playback (both play at once)
- Visual diff highlighting (waveform overlay)
- Quality metric comparison
- Issue resolution tracking

---

## AI Processing Pipeline

### Text-to-Audio Alignment (Pass 1)

**Algorithm**: Forced Alignment (Montreal Forced Aligner or similar)

**Input**:
- Long-form audio file (session_001_pass1.webm)
- Phrase text list with expected order
- Language model (Welsh phoneme dictionary)

**Process**:
1. Convert audio to acoustic features (MFCCs)
2. Align phonemes to audio frames
3. Map phonemes to words
4. Map words to phrases
5. Generate timestamp boundaries

**Output**:
```json
{
  "sessionId": "session_001_pass1",
  "duration": 627.4,
  "phrases": [
    {
      "phraseId": "phrase_001",
      "text": "Sut mae!",
      "startTime": 0.0,
      "endTime": 1.2,
      "confidence": 0.94
    },
    {
      "phraseId": "phrase_002",
      "text": "Hoffwn i goffi",
      "startTime": 1.8,
      "endTime": 3.6,
      "confidence": 0.87
    }
  ]
}
```

### Silence Detection (Pass 2)

**Algorithm**: Adaptive Threshold Silence Detection

**Parameters**:
- Silence threshold: -40dB (adaptive based on recording level)
- Minimum gap duration: 200ms
- Minimum segment duration: 150ms
- Edge padding: 50ms (add to segment boundaries)

**Process**:
1. Calculate RMS energy per frame (10ms frames)
2. Compute adaptive threshold (median RMS * 0.1)
3. Identify silent regions below threshold
4. Filter gaps by minimum duration
5. Find gap centers (silence midpoint)
6. Validate segments (not too short)

**Output**:
```json
{
  "sessionId": "session_001_pass2",
  "duration": 892.1,
  "gaps": [
    {
      "gapId": "gap_001",
      "startTime": 1.15,
      "endTime": 1.35,
      "centerTime": 1.25,
      "confidence": 0.96,
      "silenceDuration": 0.2
    }
  ],
  "segments": [
    {
      "segmentId": "seg_001",
      "label": "hoffwn",
      "startTime": 0.0,
      "endTime": 1.15,
      "duration": 1.15,
      "confidence": 0.96
    },
    {
      "segmentId": "seg_002",
      "label": "i",
      "startTime": 1.35,
      "endTime": 1.72,
      "duration": 0.37,
      "confidence": 0.91
    }
  ]
}
```

### Quality Validation

**Automated Checks** (per segment):

1. **Clipping Detection**
   - Threshold: >98% amplitude
   - Fail if: >0.5% of samples clipped
   - Confidence impact: -20% per occurrence

2. **Silence Validation**
   - Leading/trailing silence: Should be <100ms
   - Fail if: >500ms silence at edges
   - Confidence impact: -15%

3. **Background Noise Analysis**
   - Calculate noise floor in silent regions
   - Threshold: -50dB SNR
   - Fail if: SNR < -50dB
   - Confidence impact: -10% per 10dB below threshold

4. **Duration Validation**
   - Expected duration: Estimate from text length
   - Tolerance: ±40%
   - Fail if: Outside tolerance range
   - Confidence impact: -25%

**Quality Score Calculation**:
```typescript
qualityScore = baseScore - clippingPenalty - silencePenalty - noisePenalty - durationPenalty
confidence = alignmentConfidence * qualityScore

// Categorization
if (confidence >= 0.9) return 'high';
if (confidence >= 0.7) return 'medium';
return 'low';
```

---

## Technical Considerations

### Handling Long Recordings

**Challenge**: 30-minute recording = ~50MB in memory = browser performance issues

**Solution**: Chunked Recording with Background Upload

```typescript
// Chunked Recording Strategy
const CHUNK_DURATION = 60; // 60 seconds per chunk

class ChunkedRecorder {
  private chunks: Blob[] = [];
  private uploadQueue: Blob[] = [];

  async startRecording() {
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    });

    // Emit data every 60 seconds
    this.mediaRecorder.start(CHUNK_DURATION * 1000);

    this.mediaRecorder.ondataavailable = (event) => {
      // Save chunk locally
      this.chunks.push(event.data);

      // Upload in background (don't wait)
      this.backgroundUpload(event.data);
    };
  }

  async backgroundUpload(chunk: Blob) {
    // Upload to S3 immediately, don't block recording
    const chunkId = crypto.randomUUID();
    await uploadChunkToS3(chunkId, chunk);

    // Store metadata for later reassembly
    this.chunkManifest.push({ chunkId, timestamp: Date.now() });
  }

  async finalizeRecording() {
    // All chunks already uploaded in background
    // Just upload manifest for reassembly
    await uploadManifest(this.chunkManifest);
  }
}
```

**Benefits**:
- No memory bloat
- Upload happens during recording (parallel)
- If browser crashes, partial session is saved
- Fast finalization (no large file upload at end)

### Text-to-Audio Alignment Libraries

**Option 1: Montreal Forced Aligner (Server-side)**
- Pros: Most accurate, industry standard
- Cons: Requires Python backend, language model training
- Use case: Production quality alignment

**Option 2: Gentle (Docker container)**
- Pros: Pre-built Docker image, good accuracy
- Cons: Requires server deployment
- Use case: Self-hosted solution

**Option 3: Web-based Approximation (Client-side)**
```typescript
// Rough alignment using speech-to-text timestamps
async function approximateAlignment(audio: AudioBuffer, expectedPhrases: string[]) {
  // Use Web Speech API or Whisper.js for rough transcription
  const transcription = await transcribeAudio(audio);

  // Match transcription timestamps to expected phrases
  const alignments = matchTranscriptionToPhrases(
    transcription.segments,
    expectedPhrases
  );

  return alignments;
}
```

**Recommendation**: Use Option 1 (Montreal Forced Aligner) for production. Option 3 for prototyping.

### S3 Upload Strategy

**Naming Convention**:
```
recordings/
  {language_pair}/
    {session_id}/
      pass1/
        full_session.webm          # Complete Pass 1 recording
        chunks/
          chunk_001.webm           # 60-second chunks
          chunk_002.webm
          ...
        phrases/
          phrase_001.mp3           # Extracted phrase audio
          phrase_002.mp3
          ...
      pass2/
        full_session.webm          # Complete Pass 2 recording
        chunks/
          chunk_001.webm
          ...
        legos/
          lego_hoffwn.mp3          # LEGO component audio
          lego_i.mp3
          ...
      metadata/
        session_manifest.json      # Complete session metadata
        pass1_alignment.json       # Text-audio alignment data
        pass2_gaps.json            # Gap detection results
        quality_report.json        # Quality validation results
```

**Upload Process**:
1. **During Recording**: Upload chunks as they're recorded (background)
2. **Post-Recording**: Upload alignment/gap detection results
3. **Post-Review**: Upload approved segments only (deduplicated)
4. **Finalization**: Upload session manifest, update course database

---

## Volunteer Experience Design

### Onboarding Flow

**First-Time User** (Mode 1):
1. **Welcome Screen**: "Welcome to the Autocue Studio!"
2. **Mode Explanation**: "You'll record each phrase twice - natural speed, then slow with gaps"
3. **Equipment Check**: Microphone test, audio level adjustment
4. **Practice Round**: 3 phrases to get comfortable with teleprompter
5. **Ready Check**: "Ready to record 47 phrases? Estimated time: 25 minutes total"

**Returning User**:
1. **Session Resume**: "Welcome back! You have 23 phrases remaining from yesterday"
2. **Quick Check**: "Test your microphone?" (optional skip)
3. **Jump In**: Immediate start, no unnecessary steps

### Encouragement System

**During Recording** (Minimal, Non-Intrusive):
- Progress indicator: Small, corner-based (e.g., "12 / 47")
- Milestone celebrations: Brief animation at 25%, 50%, 75% (non-blocking)
- Error recovery: Gentle "Let's try that again" messaging, not "ERROR: FAILED"

**Post-Session** (Celebration):
- **Session Complete Screen**:
  ```
  🎉 Excellent Work!

  Session Summary:
  • 47 phrases recorded in 24 minutes
  • 127 LEGO components extracted
  • 94% average quality score
  • You're 68% complete with Welsh→Mandarin!

  Impact: Your recordings will help 1,200+ learners master Welsh!

  [View Session Report] [Start Another Session] [Take a Break]
  ```

- **Badges & Achievements**:
  - "Marathon Runner" - 30+ minute session
  - "Quality Champion" - 95%+ average quality
  - "Consistency King" - 50 phrases without rejection
  - "LEGO Master" - 500+ components extracted

### Error Recovery

**Low Confidence Segments**:
- Don't interrupt during recording
- Flag for review post-session
- Explain issue clearly: "This segment was quieter than others, but still usable. Would you like to re-record?"

**Technical Issues** (browser crash, mic disconnect):
- Auto-save every 60 seconds
- Resume from last checkpoint
- Don't make volunteer re-record already-uploaded chunks

---

## Accessibility

### Keyboard Shortcuts

**Global**:
- `Space`: Pause/Resume recording or playback
- `Esc`: Stop recording, exit review mode
- `Tab`: Navigate between UI elements

**Teleprompter Mode**:
- `↑/↓`: Adjust scroll speed
- `←/→`: Skip backward/forward one phrase
- `R`: Restart current phrase
- `P`: Toggle playback of original

**Review Mode**:
- `↑/↓`: Navigate between segment cards
- `Enter`: Approve current segment
- `Delete/Backspace`: Reject current segment, queue for re-record
- `Space`: Play/pause current segment audio

### Screen Reader Support

**Announcements**:
- "Recording started for Pass 1: Natural Speed"
- "Phrase 12 of 47: Hoffwn i goffi os gwelwch yn dda"
- "Recording stopped. Processing audio..."
- "37 segments approved. 12 segments pending review."

**ARIA Labels**:
- All interactive elements have descriptive labels
- Progress communicated via `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Live regions for status updates (non-intrusive)

### Visual Accessibility

**High Contrast Mode**:
- Increase contrast ratios to WCAG AAA (7:1 minimum)
- Bold borders on interactive elements
- No color-only indicators (always paired with icons/text)

**Font Size Adjustment**:
- Settings panel: "Teleprompter Text Size"
- Range: 2rem - 5rem (default: 3.5rem)
- Persisted in localStorage

---

## Future Enhancements (Phase 2)

### Advanced Features

1. **AI Voice Coaching**:
   - Real-time pronunciation feedback
   - Accent consistency analysis
   - Pacing recommendations

2. **Multi-Volunteer Sessions**:
   - Same course, multiple volunteers
   - Automatic voice-matching for consistent courses
   - Collaborative progress tracking

3. **Mobile App** (iOS/Android):
   - Native recording optimizations
   - Offline recording with background upload
   - Push notifications for session reminders

4. **Live QA Review**:
   - Course producer can listen live during recording
   - Flag items in real-time
   - Volunteer gets immediate feedback

5. **Advanced Editing Tools**:
   - Manual waveform editing (cut, fade, normalize)
   - Noise reduction post-processing
   - Pitch/tempo adjustment for consistency

---

## Success Metrics

### Key Performance Indicators

**Volunteer Experience**:
- Average session duration: Target 20-30 minutes (vs. 60+ with old system)
- Session completion rate: >90% (vs. 60% with old system)
- Volunteer satisfaction score: >4.5/5
- Return rate: >80% within 7 days

**Recording Quality**:
- Average segment quality score: >0.90
- Manual re-record rate: <10% (vs. 30% with old system)
- Automated approval rate: >75% (high-confidence segments)

**Technical Performance**:
- Browser crash rate: <1% of sessions
- Upload success rate: >99.5%
- Average alignment accuracy: >95% (phrase boundaries within ±200ms)

**Course Production Efficiency**:
- Time to complete 668-seed course: <10 volunteer hours (vs. 40+ with old system)
- Re-recording required: <5% of total phrases
- QA approval rate: >95% first-time

---

## Conclusion

The Two-Mode Autocue Recording System transforms volunteer recording from a tedious button-clicking chore into a professional, flow-state studio experience. By minimizing interruptions, automating tedious work (segmentation, quality checks), and designing for joy, we create a system that volunteers WANT to use for hours at a time.

**Key Innovations**:
1. **Continuous teleprompter flow** - Read for 20 minutes, not click 668 times
2. **Two-pass strategy** - One session produces ALL audio (full + LEGO)
3. **AI-powered segmentation** - Volunteers don't manually chop audio
4. **Targeted regeneration mode** - Fix specific issues without re-recording entire courses
5. **Post-recording batch review** - Approve 80% in one click, focus on the 20% that need attention

**Volunteer Impact**:
Recording 668 phrases goes from a multi-day slog to a few focused, enjoyable sessions. Volunteers feel like professional voice actors, not data entry clerks.

**Production Impact**:
Course creation speed increases 4x. Quality improves (fewer errors from fatigue). Re-recording drops dramatically (better first-time capture).

---

**Document Version**: 2.0
**Last Updated**: 2025-12-04
**Author**: Claude (Anthropic)
**Project**: SSi Dashboard v7 - Autocue Recording System Redesign
