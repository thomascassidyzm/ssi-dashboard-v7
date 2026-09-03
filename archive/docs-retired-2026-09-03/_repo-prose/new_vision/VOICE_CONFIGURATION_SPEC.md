# Voice Configuration Interface Specification

**Version:** 1.0.0
**Date:** 2025-12-05
**Status:** Design Specification
**System:** SSi Dashboard v7 - Course Production Suite
**Pipeline:** APML v11.0 (Supabase-backed)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Purpose & Users](#purpose--users)
3. [System Context](#system-context)
4. [Key Features](#key-features)
5. [Data Architecture](#data-architecture)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [UI Design](#ui-design)
8. [API Endpoints](#api-endpoints)
9. [Preview System](#preview-system)
10. [Configuration Hierarchy](#configuration-hierarchy)
11. [Presets System](#presets-system)
12. [Non-Expert Design Principles](#non-expert-design-principles)
13. [Implementation Roadmap](#implementation-roadmap)
14. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Executive Summary

The **Voice Configuration Interface** is a professional audio production tool simplified for language course creators. It provides:

- **Voice assignment** for each role (instructor, target_primary, target_echo, encouragement)
- **Timing controls** for pacing, pauses, and playback speeds
- **Real-time preview** of how courses will sound
- **Preset configurations** for common scenarios (Beginner Pace, Native Speed, etc.)
- **Parameter hierarchy** allowing course-level defaults with language-pair and session-specific overrides

This tool serves the SSi team initially (Tom, Kai, Aran, Deborah) and future non-expert volunteer course creators. It must feel approachable yet professional - like simplified audio production software.

---

## Purpose & Users

### Primary Purpose

Enable course creators to:
1. **Assign voices** to each role in a language course
2. **Adjust timing parameters** (speed, pauses, gaps) for optimal learning
3. **Preview audio** before committing to expensive TTS generation
4. **Save/load configurations** for consistency across courses

### Target Users

#### Immediate (Expert Users)
- **Tom, Kai, Aran, Deborah** - SSi team members familiar with course production
- Need granular control and technical precision
- Comfortable with audio production concepts

#### Future (Non-Expert Users)
- **Volunteer language course creators** with no audio engineering background
- Need clear labels, helpful tooltips, and preset templates
- Want to focus on pedagogy, not technical details

### User Scenarios

1. **Creating a new course** - Select voices and set default timing
2. **Adjusting pacing for beginner vs. advanced** - Use presets or custom settings
3. **Previewing a session** - Hear how it sounds before TTS generation
4. **Overriding timing for specific sessions** - Session 1 slower, Session 10 faster
5. **Mixing TTS and human voices** - Use TTS for most, human recordings for specific roles

---

## System Context

### Integration with Course Production Suite

The Voice Configuration Interface is part of the larger **Course Production Suite**:

```
┌─────────────────────────────────────────────────────────────┐
│           COURSE PRODUCTION SUITE (Mission Control)          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Script Viewer │   │ Audio Pipeline   │   │ Voice Config     │
│   (QA Tool)   │   │  (TTS Batch)     │   │   Interface      │
└───────────────┘   └──────────────────┘   └──────────────────┘
```

### Data Dependencies

**Input Sources:**
- `voices.json` - Registry of TTS and human voices (Supabase-backed)
- `lego_baskets.json` - Course content structure (Phase 3 output)
- `course_manifest.json` - Compiled course with audio references (Phase 9 output)

**Output:**
- `voice_config.json` - Voice assignments and timing parameters (per course)
- Updated `voices.json` - If creating new voice profiles

**Storage:**
- **Supabase:** `voices` table, `audio_samples` table, `course_audio_usage` table
- **S3:** `courses/{courseCode}/voice_config.json`

### Pipeline Integration

```
Phase 3: Basket Generation
    ↓
    lego_baskets.json
    ↓
┌────────────────────────────┐
│  Voice Configuration Tool  │  ← YOU ARE HERE
│  - Assign voices           │
│  - Set timing parameters   │
│  - Preview sessions        │
└────────────────────────────┘
    ↓
    voice_config.json
    ↓
Phase 8: Audio Generation (Port 3465)
    ↓
    audio_samples (Supabase) + S3
    ↓
Phase 9: Manifest Compilation (Port 3466)
    ↓
    course_manifest.json
```

---

## Key Features

### 1. Voice Assignment

**Roles:**
- `source` - Known language narrator (e.g., English instructor)
- `target1` - Primary target language voice (e.g., Spanish female)
- `target2` - Echo target language voice (e.g., Spanish male)
- `presentation` - Longer narration voice (introductions, explanations)
- `encouragement` - Motivational phrases (e.g., "Great job!")

**Capabilities:**
- Select from available TTS voices (Azure, ElevenLabs, Google)
- Assign human voice recordings (uploaded or imported)
- Test individual voices with sample phrases
- View voice characteristics: language, accent, gender, style

**Voice Types:**
- **TTS Voices:** Generated on-demand via APIs
- **Human Voices:** Pre-recorded audio clips (higher quality, more expensive)
- **Hybrid:** Mix TTS for most phrases, human for key phrases

### 2. Timing Controls

**Philosophy:** Everything is a parameter. No hardcoded timing.

#### Sample Speed
- **Range:** 0.5x - 2.0x (50% to 200% of natural speed)
- **Default:** 1.0x (natural speed)
- **Granularity:** 0.05x steps
- **UI:** Slider + numeric input

#### Introduction Pace
- **Cadence for presentation role** (introduction_items)
- Options: `slow`, `natural`, `fast`
- Default: `natural`

#### Pauses (in seconds)

| Pause Type | Description | Default | Range |
|------------|-------------|---------|-------|
| `prompt_to_response` | Gap between prompt and learner response window | 2.0s | 0.5s - 5.0s |
| `target1_to_target2` | Gap between target_primary and target_echo | 1.5s | 0.5s - 4.0s |
| `between_cycles` | Gap between practice cycles | 1.0s | 0.0s - 3.0s |
| `encouragement_gap` | Time before encouragement phrase | 0.8s | 0.0s - 2.0s |
| `intro_sentence_gap` | Gap between intro sentences | 1.2s | 0.0s - 3.0s |

**UI Controls:**
- Dual-mode: Slider for coarse adjustment, numeric input for precision
- Visual preview of timeline
- Real-time duration calculation

### 3. Preview System

**Preview Modes:**

#### A. Introduction Preview
- Plays a sample `introduction_items` sequence
- Uses `presentation` voice with `introduction_pace`
- Shows timing visually

#### B. Prompt/Response Cycle Preview
- Plays a single practice cycle:
  1. `source` voice: Prompt (e.g., "I want to")
  2. Pause: `prompt_to_response`
  3. `target1` voice: Target phrase (e.g., "quiero")
  4. Pause: `target1_to_target2`
  5. `target2` voice: Echo (e.g., "quiero")
  6. Pause: `between_cycles`

#### C. Full LEGO Session Preview
- Select which session to preview (dropdown)
- Plays complete LEGO Debut cycle:
  - Introduction (if first occurrence)
  - Component cycles
  - LEGO Debut cycle
  - Practice sentences
- Shows progress bar and phrase-by-phrase highlighting

#### D. Encouragement Preview
- Plays encouragement phrase with `encouragement_gap`
- Inserted between cycles randomly or at milestones

**Preview UI:**
- Waveform visualization (optional, future)
- Play/Pause/Stop controls
- Current phrase highlighting
- Timeline scrubber
- "Generate Preview" button (creates temp audio on-demand)

### 4. Parameter Hierarchy

Configuration cascades from broad to specific:

```
Global Defaults (system-wide)
    ↓
Course-Level Config (applies to all sessions)
    ↓
Language-Pair Overrides (e.g., Spanish for English speakers)
    ↓
Session-Specific Overrides (e.g., Session 1 slower)
```

**Example Cascade:**
```json
{
  "courseCode": "spa_for_eng",
  "defaults": {
    "sample_speed": 1.0,
    "prompt_to_response": 2.0
  },
  "language_pair_overrides": {
    "spa": {
      "sample_speed": 0.85,  // Spanish slightly slower
      "target1_to_target2": 1.8
    }
  },
  "session_overrides": {
    "S0001": {
      "sample_speed": 0.7,  // Session 1 very slow
      "prompt_to_response": 3.0
    },
    "S0010": {
      "sample_speed": 1.0  // Session 10 back to natural
    }
  }
}
```

---

## Data Architecture

### Voice Registry (Supabase)

**Table: `voices`**

```sql
CREATE TABLE voices (
  voice_id TEXT PRIMARY KEY,  -- e.g., "azure_es-ES-TrianaNeural"
  provider TEXT NOT NULL,  -- "azure", "elevenlabs", "google", "human"
  provider_id TEXT,  -- Provider's internal voice ID
  language TEXT NOT NULL,  -- ISO 639-3 code (e.g., "spa", "eng")
  display_name TEXT NOT NULL,  -- "Triana (Spanish Female)"
  gender TEXT,  -- "female", "male", "neutral"
  accent TEXT,  -- "castilian", "latin_american", "british", etc.
  style TEXT,  -- "conversational", "professional", "warm", etc.
  typical_roles TEXT[],  -- ["target1", "target2"]
  sample_count INT DEFAULT 0,
  is_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  processing JSONB  -- cadence configs, etc.
);
```

**Example Row:**
```json
{
  "voice_id": "azure_es-ES-TrianaNeural",
  "provider": "azure",
  "provider_id": "es-ES-TrianaNeural",
  "language": "spa",
  "display_name": "Triana (Spanish Female)",
  "gender": "female",
  "accent": "castilian",
  "style": "conversational",
  "typical_roles": ["target1"],
  "sample_count": 2143,
  "is_human": false,
  "processing": {
    "cadences": {
      "slow": { "azure_speed": 0.7, "time_stretch": 1, "normalize": true },
      "natural": { "azure_speed": 1.0, "time_stretch": 1, "normalize": true }
    }
  }
}
```

### Voice Configuration (S3 + Supabase)

**S3 Path:** `courses/{courseCode}/voice_config.json`

**Supabase Table: `course_voice_configs`** (optional, for UI state persistence)

```sql
CREATE TABLE course_voice_configs (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code TEXT NOT NULL UNIQUE,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  config JSONB NOT NULL  -- The full voice_config.json structure
);
```

---

## TypeScript Interfaces

### Core Interfaces

```typescript
/**
 * Voice Configuration for a Course
 */
interface VoiceConfig {
  courseCode: string;
  version: string;  // "1.0.0"
  createdAt: string;  // ISO 8601
  updatedAt: string;

  // Voice assignments
  voices: VoiceAssignments;

  // Timing parameters
  timing: TimingConfig;

  // Hierarchy overrides
  languagePairOverrides?: Record<string, Partial<TimingConfig>>;
  sessionOverrides?: Record<string, Partial<TimingConfig>>;

  // Metadata
  metadata: ConfigMetadata;
}

/**
 * Voice Assignments by Role
 */
interface VoiceAssignments {
  source: string;  // voice_id
  target1: string;
  target2: string;
  presentation: string;
  encouragement?: string;  // Optional
}

/**
 * Timing Configuration
 */
interface TimingConfig {
  // Playback speeds
  sampleSpeed: number;  // 0.5 - 2.0
  introductionPace: 'slow' | 'natural' | 'fast';

  // Pauses (in seconds)
  pauses: {
    promptToResponse: number;  // 0.5 - 5.0
    target1ToTarget2: number;  // 0.5 - 4.0
    betweenCycles: number;  // 0.0 - 3.0
    encouragementGap: number;  // 0.0 - 2.0
    introSentenceGap: number;  // 0.0 - 3.0
  };
}

/**
 * Configuration Metadata
 */
interface ConfigMetadata {
  createdBy: string;  // User ID or name
  description?: string;
  preset?: string;  // Name of preset used (if any)
  tags?: string[];  // ["beginner", "slow-paced", etc.]
}

/**
 * Voice Profile (from voices table)
 */
interface VoiceProfile {
  voiceId: string;
  provider: 'azure' | 'elevenlabs' | 'google' | 'human';
  providerId?: string;
  language: string;  // ISO 639-3
  displayName: string;
  gender?: 'female' | 'male' | 'neutral';
  accent?: string;
  style?: string;
  typicalRoles: Role[];
  sampleCount: number;
  isHuman: boolean;
  createdAt: string;
  notes?: string;
  processing?: VoiceProcessing;
}

/**
 * Voice Processing Config
 */
interface VoiceProcessing {
  cadences: {
    slow?: CadenceConfig;
    natural?: CadenceConfig;
    fast?: CadenceConfig;
  };
}

interface CadenceConfig {
  azureSpeed?: number;  // Azure-specific speed (0.5 - 2.0)
  timeStretch?: number;  // Post-processing time stretch
  normalize?: boolean;
  targetLufs?: number;  // Loudness normalization
}

/**
 * Roles in Course Audio
 */
type Role =
  | 'source'
  | 'target1'
  | 'target2'
  | 'presentation'
  | 'encouragement';

/**
 * Preview Request
 */
interface PreviewRequest {
  courseCode: string;
  voiceConfig: VoiceConfig;
  previewType: 'introduction' | 'cycle' | 'session' | 'encouragement';
  sessionId?: string;  // Required for 'session' type
  samplePhrase?: string;  // Custom phrase for testing
}

/**
 * Preview Response
 */
interface PreviewResponse {
  previewId: string;
  audioUrl: string;  // Signed S3 URL
  duration: number;  // Total duration in seconds
  timeline: PreviewTimeline[];
  expiresAt: string;  // URL expiration
}

/**
 * Preview Timeline Entry
 */
interface PreviewTimeline {
  startTime: number;  // Seconds from start
  endTime: number;
  role: Role;
  text: string;
  voiceId: string;
}

/**
 * Preset Configuration
 */
interface PresetConfig {
  presetId: string;
  name: string;
  description: string;
  icon?: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'custom';
  timing: TimingConfig;
  tags: string[];
}
```

---

## UI Design

### Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Configuration - spa_for_eng                     [Save]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PRESETS                                                │   │
│  │  [Beginner Pace] [Native Speed] [Fast Review] [Custom] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────────┐    │
│  │  VOICE ASSIGNMENTS     │  │  TIMING CONTROLS          │    │
│  │                        │  │                           │    │
│  │  Source (English)      │  │  Sample Speed     1.0x    │    │
│  │  ┌──────────────────┐  │  │  [----●--------]  [1.00] │    │
│  │  │ Bella (British)  ▼│  │  │                           │    │
│  │  └──────────────────┘  │  │  Introduction Pace        │    │
│  │  [Test Voice]          │  │  ( ) Slow  (●) Natural    │    │
│  │                        │  │  ( ) Fast                 │    │
│  │  Target 1 (Spanish)    │  │                           │    │
│  │  ┌──────────────────┐  │  │  Pauses (seconds)         │    │
│  │  │ Triana (Female)  ▼│  │  │                           │    │
│  │  └──────────────────┘  │  │  Prompt → Response  2.0s  │    │
│  │  [Test Voice]          │  │  [---●-----] [2.00]       │    │
│  │                        │  │                           │    │
│  │  Target 2 (Spanish)    │  │  Target1 → Target2  1.5s  │    │
│  │  ┌──────────────────┐  │  │  [---●-----] [1.50]       │    │
│  │  │ Álvaro (Male)    ▼│  │  │                           │    │
│  │  └──────────────────┘  │  │  Between Cycles     1.0s  │    │
│  │  [Test Voice]          │  │  [---●-----] [1.00]       │    │
│  │                        │  │                           │    │
│  │  Presentation          │  │  Encouragement Gap  0.8s  │    │
│  │  ┌──────────────────┐  │  │  [--●------] [0.80]       │    │
│  │  │ Aran Clone       ▼│  │  │                           │    │
│  │  └──────────────────┘  │  │  Intro Sentence Gap 1.2s  │    │
│  │  [Test Voice]          │  │  [---●-----] [1.20]       │    │
│  │                        │  │                           │    │
│  │  Encouragement         │  │  Total Cycle Time: ~8.3s  │    │
│  │  ┌──────────────────┐  │  │  Total Session: ~12m 15s  │    │
│  │  │ Aran Clone       ▼│  │  │                           │    │
│  │  └──────────────────┘  │  │                           │    │
│  │  [Test Voice]          │  │                           │    │
│  └────────────────────────┘  └───────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PREVIEW                                                │   │
│  │                                                         │   │
│  │  Preview Type:  (●) Introduction  ( ) Cycle            │   │
│  │                 ( ) Full Session  ( ) Encouragement    │   │
│  │                                                         │   │
│  │  [Select Session ▼ S0001]    [Generate Preview]        │   │
│  │                                                         │   │
│  │  ┌───────────────────────────────────────────────────┐ │   │
│  │  │  [▶ Play]  [■ Stop]  [⟳ Regenerate]              │ │   │
│  │  │                                                   │ │   │
│  │  │  ━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━  0:23 / 1:15 │ │   │
│  │  │                                                   │ │   │
│  │  │  Current: "I want to" (Source - Bella)           │ │   │
│  │  └───────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SESSION OVERRIDES (Optional)                           │   │
│  │                                                         │   │
│  │  S0001 (Beginner)    Sample Speed: 0.7x  [Edit]        │   │
│  │  S0010 (Advanced)    Sample Speed: 1.0x  [Edit]        │   │
│  │                                                         │   │
│  │  [+ Add Session Override]                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Preset Selector (Top Bar)

```
┌─────────────────────────────────────────────────────────┐
│  PRESETS                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 🐢 Beginner  │ │ ⚡ Native    │ │ 🚀 Fast      │   │
│  │    Pace      │ │    Speed     │ │   Review     │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
│  Active: Beginner Pace (0.8x speed, longer pauses)     │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking a preset loads its timing configuration
- Current preset highlighted
- "Custom" preset auto-selected when user modifies any parameter
- Tooltip shows preset details on hover

#### 2. Voice Assignment Panel (Left)

```
┌────────────────────────────────────────┐
│  VOICE ASSIGNMENTS                     │
│                                        │
│  Source (English) ℹ️                    │
│  ┌──────────────────────────────────┐  │
│  │ Bella (British Female)          ▼│  │
│  └──────────────────────────────────┘  │
│  [🔊 Test Voice]  [📊 Voice Details]   │
│                                        │
│  Characteristics:                      │
│  • Language: English (eng)             │
│  • Accent: British                     │
│  • Gender: Female                      │
│  • Provider: Azure                     │
│  • Sample Count: 3,241                 │
│                                        │
│  [Use Different Voice...]              │
└────────────────────────────────────────┘
```

**Voice Dropdown:**
```
┌──────────────────────────────────────────┐
│  Select Voice for Source Role            │
├──────────────────────────────────────────┤
│  🔍 Search voices...                     │
├──────────────────────────────────────────┤
│  ✓ Bella (British Female) - Azure       │
│    Ryan (US Male) - Azure                │
│    Emma (British Female) - Azure         │
│    ───────────────────────────────       │
│    Aran Clone (Narrator) - ElevenLabs    │
│    ───────────────────────────────       │
│  💎 Human Voices                         │
│    Tom (Instructor) - Human Recording    │
│    Kai (Narrator) - Human Recording      │
└──────────────────────────────────────────┘
```

**Features:**
- Searchable dropdown
- Grouped by provider (Azure, ElevenLabs, Google, Human)
- Icons distinguish TTS (🤖) from Human (💎)
- Voice characteristics shown inline
- "Test Voice" plays sample phrase ("Hello, this is a test")
- "Voice Details" expands panel showing full metadata

#### 3. Timing Controls Panel (Right)

```
┌─────────────────────────────────────────┐
│  TIMING CONTROLS                        │
│                                         │
│  Sample Speed                    1.0x   │
│  ├─────────────●──────────────┐ [1.00] │
│  0.5x                         2.0x      │
│                                         │
│  Introduction Pace                      │
│  ( ) Slow  (●) Natural  ( ) Fast        │
│                                         │
│  ─────────────────────────────────      │
│  Pauses (seconds)                       │
│                                         │
│  Prompt → Response            2.0s      │
│  ├───────────●─────────────┐ [2.00]    │
│  0.5s                      5.0s         │
│  ℹ️ Time for learner to respond         │
│                                         │
│  Target1 → Target2            1.5s      │
│  ├───────────●─────────────┐ [1.50]    │
│  0.5s                      4.0s         │
│  ℹ️ Gap between primary and echo        │
│                                         │
│  Between Cycles               1.0s      │
│  ├───────────●─────────────┐ [1.00]    │
│  0.0s                      3.0s         │
│  ℹ️ Pause between practice rounds       │
│                                         │
│  Encouragement Gap            0.8s      │
│  ├───────────●─────────────┐ [0.80]    │
│  0.0s                      2.0s         │
│  ℹ️ Time before "Great job!" phrase     │
│                                         │
│  Intro Sentence Gap           1.2s      │
│  ├───────────●─────────────┐ [1.20]    │
│  0.0s                      3.0s         │
│  ℹ️ Pause between intro sentences       │
│                                         │
│  ─────────────────────────────────      │
│  📊 Estimated Timing                    │
│  • Single cycle: ~8.3s                  │
│  • Full session: ~12m 15s               │
│  • Total course: ~8h 42m                │
│                                         │
│  [Reset to Defaults]                    │
└─────────────────────────────────────────┘
```

**Slider Behavior:**
- Draggable slider handle
- Click anywhere on track to jump
- Keyboard arrows for fine adjustment (0.05s steps)
- Numeric input for precise values
- Real-time duration calculation updates

#### 4. Preview Panel

```
┌───────────────────────────────────────────────────┐
│  PREVIEW                                          │
│                                                   │
│  Preview Type:                                    │
│  (●) Introduction   ( ) Single Cycle              │
│  ( ) Full Session   ( ) Encouragement             │
│                                                   │
│  Session: [S0001 - First LEGO ▼]                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Preview Status: Ready                      │ │
│  │  Estimated Duration: 1m 15s                 │ │
│  │  Estimated Cost: $0.08 (Azure TTS)          │ │
│  │                                             │ │
│  │  [🎬 Generate Preview]                      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Audio Player                               │ │
│  │  ┌─────────────────────────────────────┐   │ │
│  │  │ [▶ Play] [■ Stop] [⟳ Regenerate]    │   │ │
│  │  │                                     │   │ │
│  │  │ ━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━  │   │ │
│  │  │ 0:23 / 1:15                         │   │ │
│  │  └─────────────────────────────────────┘   │ │
│  │                                             │ │
│  │  Timeline View:                             │ │
│  │  ┌───────────────────────────────────────┐ │ │
│  │  │ 0:00  Intro (Presentation)            │ │ │
│  │  │ 0:12  "I want to" (Source - Bella)    │ │ │
│  │  │ 0:14  [pause 2.0s]                    │ │ │
│  │  │ 0:16  "quiero" (Target1 - Triana)     │ │ │
│  │  │ 0:18  [pause 1.5s]                    │ │ │
│  │  │ 0:19  "quiero" (Target2 - Álvaro)     │ │ │
│  │  │ 0:21  [pause 1.0s]                    │ │ │
│  │  │ 0:22  "I want to" (Source - Bella)    │ │ │
│  │  │ ...                                   │ │ │
│  │  └───────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  💡 Tip: Preview uses real TTS to match final     │
│     audio. Cost is charged to your account.       │
└───────────────────────────────────────────────────┘
```

**Preview Generation Flow:**
1. User selects preview type and session
2. UI shows estimated duration and cost
3. User clicks "Generate Preview"
4. Loading spinner appears
5. Backend generates TTS audio for preview (temp files)
6. Audio player becomes active
7. Timeline shows phrase-by-phrase breakdown
8. Current phrase highlights as audio plays

**Preview Types:**

| Type | Description | Duration | Cost |
|------|-------------|----------|------|
| Introduction | First 30s of session intro | ~30s | ~$0.01 |
| Single Cycle | One prompt/response cycle | ~8s | ~$0.005 |
| Full Session | Complete LEGO session | ~12m | ~$0.08 |
| Encouragement | Encouragement phrase + gap | ~3s | ~$0.002 |

#### 5. Session Overrides Panel (Collapsible)

```
┌─────────────────────────────────────────────────────┐
│  ▼ SESSION OVERRIDES (Optional)                     │
│                                                     │
│  Override timing for specific sessions:             │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ S0001 (First LEGO)                [Edit] [×]│   │
│  │ • Sample Speed: 0.7x (slower)               │   │
│  │ • Prompt → Response: 3.0s (longer)          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ S0010 (Advanced LEGO)             [Edit] [×]│   │
│  │ • Sample Speed: 1.0x (normal)               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [+ Add Session Override]                          │
│                                                     │
│  💡 Session overrides take precedence over          │
│     course-level defaults.                          │
└─────────────────────────────────────────────────────┘
```

**Add Session Override Modal:**
```
┌──────────────────────────────────────────┐
│  Add Session Override                    │
├──────────────────────────────────────────┤
│                                          │
│  Session:  [S0001 ▼]                     │
│                                          │
│  Override Parameters:                    │
│  ☑ Sample Speed           0.7x           │
│  ☑ Prompt → Response      3.0s           │
│  ☐ Target1 → Target2      (use default)  │
│  ☐ Between Cycles         (use default)  │
│                                          │
│  Reason (optional):                      │
│  ┌────────────────────────────────────┐ │
│  │ First session - extra slow for     │ │
│  │ beginners                           │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Cancel]                      [Add]     │
└──────────────────────────────────────────┘
```

---

## API Endpoints

### Base URL
```
http://localhost:3467/api/voice-config
```

### Endpoints

#### 1. Get Voice Configuration

**GET** `/api/voice-config/:courseCode`

**Response:**
```json
{
  "courseCode": "spa_for_eng",
  "version": "1.0.0",
  "createdAt": "2025-12-05T10:00:00Z",
  "updatedAt": "2025-12-05T12:30:00Z",
  "voices": {
    "source": "azure_en-GB-BellaNeural",
    "target1": "azure_es-ES-TrianaNeural",
    "target2": "azure_es-ES-AlvaroNeural",
    "presentation": "elevenlabs_FOIN928B9X0jwgJ95cLt",
    "encouragement": "elevenlabs_FOIN928B9X0jwgJ95cLt"
  },
  "timing": {
    "sampleSpeed": 1.0,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 2.0,
      "target1ToTarget2": 1.5,
      "betweenCycles": 1.0,
      "encouragementGap": 0.8,
      "introSentenceGap": 1.2
    }
  },
  "sessionOverrides": {
    "S0001": {
      "sampleSpeed": 0.7,
      "pauses": {
        "promptToResponse": 3.0
      }
    }
  },
  "metadata": {
    "createdBy": "tom@ssi.org",
    "description": "Spanish for English speakers - beginner pace",
    "preset": "beginner_pace",
    "tags": ["beginner", "slow-paced"]
  }
}
```

#### 2. Save Voice Configuration

**PUT** `/api/voice-config/:courseCode`

**Request Body:**
```json
{
  "voices": { /* VoiceAssignments */ },
  "timing": { /* TimingConfig */ },
  "sessionOverrides": { /* optional */ },
  "metadata": { /* optional */ }
}
```

**Response:**
```json
{
  "success": true,
  "courseCode": "spa_for_eng",
  "version": "1.0.1",
  "updatedAt": "2025-12-05T14:20:00Z",
  "s3Path": "courses/spa_for_eng/voice_config.json"
}
```

#### 3. List Available Voices

**GET** `/api/voice-config/voices`

**Query Parameters:**
- `language` (optional) - Filter by language (e.g., "spa", "eng")
- `role` (optional) - Filter by typical role (e.g., "target1", "source")
- `provider` (optional) - Filter by provider (e.g., "azure", "elevenlabs")
- `isHuman` (optional) - Filter human vs TTS (true/false)

**Response:**
```json
{
  "voices": [
    {
      "voiceId": "azure_es-ES-TrianaNeural",
      "provider": "azure",
      "language": "spa",
      "displayName": "Triana (Spanish Female)",
      "gender": "female",
      "accent": "castilian",
      "typicalRoles": ["target1"],
      "sampleCount": 2143,
      "isHuman": false
    },
    // ... more voices
  ],
  "total": 47
}
```

#### 4. Test Voice

**POST** `/api/voice-config/voices/:voiceId/test`

**Request Body:**
```json
{
  "text": "Hello, this is a test",
  "cadence": "natural",  // or "slow"
  "language": "eng"
}
```

**Response:**
```json
{
  "audioUrl": "https://s3.../temp/test-voice-abc123.mp3",
  "duration": 2.3,
  "expiresAt": "2025-12-05T15:00:00Z"
}
```

#### 5. Generate Preview

**POST** `/api/voice-config/:courseCode/preview`

**Request Body:**
```json
{
  "previewType": "session",  // "introduction" | "cycle" | "session" | "encouragement"
  "sessionId": "S0001",  // required for "session" type
  "voiceConfig": { /* VoiceConfig object */ }
}
```

**Response:**
```json
{
  "previewId": "preview-abc123",
  "status": "generating",
  "estimatedDuration": 75.0,
  "estimatedCost": 0.08
}
```

**Check Preview Status:**

**GET** `/api/voice-config/:courseCode/preview/:previewId`

**Response:**
```json
{
  "previewId": "preview-abc123",
  "status": "complete",  // "generating" | "complete" | "failed"
  "audioUrl": "https://s3.../temp/preview-abc123.mp3",
  "duration": 75.2,
  "timeline": [
    {
      "startTime": 0.0,
      "endTime": 2.5,
      "role": "presentation",
      "text": "In this session, you'll learn...",
      "voiceId": "elevenlabs_FOIN928B9X0jwgJ95cLt"
    },
    // ... more timeline entries
  ],
  "expiresAt": "2025-12-05T16:00:00Z"
}
```

#### 6. Get Presets

**GET** `/api/voice-config/presets`

**Response:**
```json
{
  "presets": [
    {
      "presetId": "beginner_pace",
      "name": "Beginner Pace",
      "description": "Slower speed, longer pauses - ideal for absolute beginners",
      "icon": "🐢",
      "category": "beginner",
      "timing": {
        "sampleSpeed": 0.8,
        "introductionPace": "slow",
        "pauses": {
          "promptToResponse": 3.0,
          "target1ToTarget2": 2.0,
          "betweenCycles": 1.5,
          "encouragementGap": 1.0,
          "introSentenceGap": 1.5
        }
      },
      "tags": ["beginner", "slow", "patient"]
    },
    {
      "presetId": "native_speed",
      "name": "Native Speed",
      "description": "Natural conversational pace",
      "icon": "⚡",
      "category": "intermediate",
      "timing": {
        "sampleSpeed": 1.0,
        "introductionPace": "natural",
        "pauses": {
          "promptToResponse": 2.0,
          "target1ToTarget2": 1.5,
          "betweenCycles": 1.0,
          "encouragementGap": 0.8,
          "introSentenceGap": 1.2
        }
      },
      "tags": ["intermediate", "natural"]
    },
    {
      "presetId": "fast_review",
      "name": "Fast Review",
      "description": "Quick pace for advanced learners reviewing",
      "icon": "🚀",
      "category": "advanced",
      "timing": {
        "sampleSpeed": 1.3,
        "introductionPace": "fast",
        "pauses": {
          "promptToResponse": 1.5,
          "target1ToTarget2": 1.0,
          "betweenCycles": 0.5,
          "encouragementGap": 0.5,
          "introSentenceGap": 0.8
        }
      },
      "tags": ["advanced", "fast", "review"]
    }
  ]
}
```

#### 7. Apply Preset

**POST** `/api/voice-config/:courseCode/apply-preset`

**Request Body:**
```json
{
  "presetId": "beginner_pace"
}
```

**Response:**
```json
{
  "success": true,
  "appliedPreset": "beginner_pace",
  "timing": { /* TimingConfig from preset */ }
}
```

#### 8. Validate Configuration

**POST** `/api/voice-config/:courseCode/validate`

**Request Body:**
```json
{
  "voiceConfig": { /* VoiceConfig object */ }
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "field": "timing.pauses.promptToResponse",
      "message": "Value 5.0s is at maximum. Learners may lose focus.",
      "severity": "warning"
    }
  ],
  "estimatedSessionDuration": 720.5,  // seconds
  "estimatedCourseDuration": 31320.0  // seconds (~8.7 hours)
}
```

**Validation Errors:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "voices.target1",
      "message": "Voice 'azure_es-ES-TrianaNeural' not found in registry",
      "severity": "error"
    },
    {
      "field": "timing.sampleSpeed",
      "message": "Value 2.5 exceeds maximum 2.0",
      "severity": "error"
    }
  ]
}
```

---

## Preview System

### Preview Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Voice Config UI)                         │
│  • User configures voices & timing                  │
│  • Selects preview type & session                   │
│  • Clicks "Generate Preview"                        │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Voice Config API (Port 3467)                       │
│  • Validates configuration                          │
│  • Generates preview request                        │
│  • Returns previewId                                │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Preview Generator Service                          │
│  • Loads session data from lego_baskets.json        │
│  • Extracts phrases based on preview type           │
│  • Generates TTS for each phrase                    │
│  • Stitches audio with pauses                       │
│  • Uploads temp file to S3                          │
│  • Returns signed URL                               │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Frontend Audio Player                              │
│  • Polls for preview completion                     │
│  • Displays timeline                                │
│  • Plays audio with phrase highlighting             │
└─────────────────────────────────────────────────────┘
```

### Preview Types Detail

#### 1. Introduction Preview

**What it does:**
- Extracts first 3-5 `introduction_items` from selected session
- Generates audio for `presentation` voice
- Applies `introSentenceGap` between sentences
- Total duration: ~30-60 seconds

**Use case:** Test how session introductions sound

**Example Timeline:**
```
0:00 - 0:04  "In this session, you'll learn how to talk about wanting things."
0:04 - 0:05  [pause 1.2s]
0:05 - 0:08  "We'll practice the verb 'to want' in Spanish."
0:08 - 0:09  [pause 1.2s]
0:09 - 0:13  "By the end, you'll be able to say what you want naturally."
```

#### 2. Single Cycle Preview

**What it does:**
- Generates one complete practice cycle
- Includes prompt, target1, target2, and all pauses
- Total duration: ~5-10 seconds

**Use case:** Quick test of timing between voices

**Example Timeline:**
```
0:00 - 0:01  "I want to" (source - Bella)
0:01 - 0:03  [pause 2.0s - prompt_to_response]
0:03 - 0:04  "quiero" (target1 - Triana)
0:04 - 0:05  [pause 1.5s - target1_to_target2]
0:05 - 0:06  "quiero" (target2 - Álvaro)
0:06 - 0:07  [pause 1.0s - between_cycles]
```

#### 3. Full Session Preview

**What it does:**
- Generates complete LEGO session including:
  - Introduction (if first occurrence)
  - Component cycles (for M-type LEGOs)
  - LEGO Debut cycle
  - Practice sentences (first 5-10)
- Total duration: ~10-15 minutes

**Use case:** Full experience test before committing to production

**Example Timeline:**
```
0:00 - 0:15   Introduction (presentation voice)
0:15 - 0:25   Component cycle 1: "I" (source + target1 + target2)
0:25 - 0:35   Component cycle 2: "want" (source + target1 + target2)
0:35 - 0:45   LEGO Debut: "I want to" (source + target1 + target2)
0:45 - 1:00   Practice sentence 1: "I want to go" (full cycle)
1:00 - 1:15   Practice sentence 2: "I want to eat" (full cycle)
...
```

#### 4. Encouragement Preview

**What it does:**
- Plays encouragement phrase with gap
- Total duration: ~2-4 seconds

**Use case:** Test motivational phrase timing

**Example Timeline:**
```
0:00 - 0:01  [pause 0.8s - encouragement_gap]
0:01 - 0:03  "Great job! Keep going!" (encouragement voice)
```

### Preview Caching

**Strategy:**
- Previews stored in S3 temp folder: `temp/previews/{courseCode}/{previewId}.mp3`
- Signed URLs expire after 1 hour
- Previews auto-delete after 24 hours
- If configuration unchanged, return cached preview (save cost)

**Cache Key:**
```typescript
const cacheKey = hash([
  courseCode,
  previewType,
  sessionId,
  JSON.stringify(voiceConfig)
]);
```

---

## Configuration Hierarchy

### Hierarchy Levels

```
1. System Defaults (hardcoded fallback)
    ↓
2. Course-Level Defaults (voice_config.json)
    ↓
3. Language-Pair Overrides (voice_config.json: languagePairOverrides)
    ↓
4. Session-Specific Overrides (voice_config.json: sessionOverrides)
```

### Resolution Logic

```typescript
function resolveTimingForSession(
  sessionId: string,
  targetLanguage: string,
  voiceConfig: VoiceConfig
): TimingConfig {
  // Start with course defaults
  let timing = { ...voiceConfig.timing };

  // Apply language-pair overrides if present
  if (voiceConfig.languagePairOverrides?.[targetLanguage]) {
    timing = merge(timing, voiceConfig.languagePairOverrides[targetLanguage]);
  }

  // Apply session-specific overrides if present
  if (voiceConfig.sessionOverrides?.[sessionId]) {
    timing = merge(timing, voiceConfig.sessionOverrides[sessionId]);
  }

  return timing;
}
```

### Example Configuration with Hierarchy

```json
{
  "courseCode": "spa_for_eng",
  "voices": {
    "source": "azure_en-GB-BellaNeural",
    "target1": "azure_es-ES-TrianaNeural",
    "target2": "azure_es-ES-AlvaroNeural",
    "presentation": "elevenlabs_FOIN928B9X0jwgJ95cLt"
  },

  "timing": {
    "sampleSpeed": 1.0,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 2.0,
      "target1ToTarget2": 1.5,
      "betweenCycles": 1.0,
      "encouragementGap": 0.8,
      "introSentenceGap": 1.2
    }
  },

  "languagePairOverrides": {
    "spa": {
      "sampleSpeed": 0.85,
      "pauses": {
        "target1ToTarget2": 1.8
      }
    },
    "cmn": {
      "sampleSpeed": 0.75,
      "pauses": {
        "target1ToTarget2": 2.0
      }
    }
  },

  "sessionOverrides": {
    "S0001": {
      "sampleSpeed": 0.7,
      "pauses": {
        "promptToResponse": 3.0,
        "betweenCycles": 1.5
      }
    },
    "S0002": {
      "sampleSpeed": 0.75
    },
    "S0010": {
      "sampleSpeed": 1.0
    }
  }
}
```

**Resolved Timing for Different Sessions:**

| Session | Sample Speed | Prompt→Response | Target1→Target2 | Source |
|---------|--------------|-----------------|-----------------|--------|
| S0001 | 0.7 (override) | 3.0 (override) | 1.8 (lang-pair) | Override + Lang-pair |
| S0002 | 0.75 (override) | 2.0 (default) | 1.8 (lang-pair) | Override + Lang-pair |
| S0005 | 0.85 (lang-pair) | 2.0 (default) | 1.8 (lang-pair) | Lang-pair |
| S0010 | 1.0 (override) | 2.0 (default) | 1.8 (lang-pair) | Override + Lang-pair |

---

## Presets System

### Built-in Presets

#### 1. Beginner Pace 🐢

**Target Audience:** Absolute beginners, older learners, learners with processing difficulties

**Characteristics:**
- Very slow speed (0.8x)
- Long pauses for processing
- Extra time for response

**Configuration:**
```json
{
  "presetId": "beginner_pace",
  "name": "Beginner Pace",
  "description": "Slower speed, longer pauses - ideal for absolute beginners",
  "icon": "🐢",
  "category": "beginner",
  "timing": {
    "sampleSpeed": 0.8,
    "introductionPace": "slow",
    "pauses": {
      "promptToResponse": 3.0,
      "target1ToTarget2": 2.0,
      "betweenCycles": 1.5,
      "encouragementGap": 1.0,
      "introSentenceGap": 1.5
    }
  },
  "tags": ["beginner", "slow", "patient", "accessible"]
}
```

#### 2. Native Speed ⚡

**Target Audience:** Intermediate learners, typical course speed

**Characteristics:**
- Natural conversational pace (1.0x)
- Standard pauses
- Balanced timing

**Configuration:**
```json
{
  "presetId": "native_speed",
  "name": "Native Speed",
  "description": "Natural conversational pace - standard course timing",
  "icon": "⚡",
  "category": "intermediate",
  "timing": {
    "sampleSpeed": 1.0,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 2.0,
      "target1ToTarget2": 1.5,
      "betweenCycles": 1.0,
      "encouragementGap": 0.8,
      "introSentenceGap": 1.2
    }
  },
  "tags": ["intermediate", "natural", "standard"]
}
```

#### 3. Fast Review 🚀

**Target Audience:** Advanced learners, review sessions

**Characteristics:**
- Faster speed (1.3x)
- Minimal pauses
- Quick pace for review

**Configuration:**
```json
{
  "presetId": "fast_review",
  "name": "Fast Review",
  "description": "Quick pace for advanced learners reviewing material",
  "icon": "🚀",
  "category": "advanced",
  "timing": {
    "sampleSpeed": 1.3,
    "introductionPace": "fast",
    "pauses": {
      "promptToResponse": 1.5,
      "target1ToTarget2": 1.0,
      "betweenCycles": 0.5,
      "encouragementGap": 0.5,
      "introSentenceGap": 0.8
    }
  },
  "tags": ["advanced", "fast", "review"]
}
```

#### 4. Listening Comprehension 👂

**Target Audience:** Learners focusing on listening skills

**Characteristics:**
- Native speed (1.0x)
- Shorter pauses (less response time)
- Focus on listening, not production

**Configuration:**
```json
{
  "presetId": "listening_comprehension",
  "name": "Listening Comprehension",
  "description": "Focus on listening skills with native speed and shorter pauses",
  "icon": "👂",
  "category": "intermediate",
  "timing": {
    "sampleSpeed": 1.0,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 1.0,
      "target1ToTarget2": 1.0,
      "betweenCycles": 0.8,
      "encouragementGap": 0.5,
      "introSentenceGap": 1.0
    }
  },
  "tags": ["listening", "comprehension", "passive"]
}
```

#### 5. Active Production 💬

**Target Audience:** Learners focusing on speaking/production

**Characteristics:**
- Slower speed (0.9x)
- Extra response time
- Focus on speaking out loud

**Configuration:**
```json
{
  "presetId": "active_production",
  "name": "Active Production",
  "description": "Extra time for speaking practice - encourages production",
  "icon": "💬",
  "category": "intermediate",
  "timing": {
    "sampleSpeed": 0.9,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 3.5,
      "target1ToTarget2": 2.0,
      "betweenCycles": 1.5,
      "encouragementGap": 1.0,
      "introSentenceGap": 1.2
    }
  },
  "tags": ["production", "speaking", "active"]
}
```

### Custom Presets

**Users can create and save custom presets:**

**UI Flow:**
1. User adjusts timing parameters
2. UI shows "Custom" badge
3. User clicks "Save as Preset"
4. Modal appears:
   ```
   ┌────────────────────────────────────┐
   │  Save Custom Preset                │
   ├────────────────────────────────────┤
   │  Preset Name:                      │
   │  [My Custom Timing]                │
   │                                    │
   │  Description:                      │
   │  [Optimized for my students]       │
   │                                    │
   │  Category:                         │
   │  ( ) Beginner  (●) Custom          │
   │                                    │
   │  Tags:                             │
   │  [custom, optimized, students]     │
   │                                    │
   │  [Cancel]              [Save]      │
   └────────────────────────────────────┘
   ```
5. Preset saved to user's library
6. Appears in preset selector for future use

---

## Non-Expert Design Principles

### 1. Progressive Disclosure

**Show simple by default, reveal complexity on demand:**

```
┌─────────────────────────────────────┐
│  VOICE CONFIGURATION                │
│                                     │
│  Quick Setup:                       │
│  [🐢 Beginner] [⚡ Standard] [🚀 Fast] │
│                                     │
│  ▼ Advanced Options                 │  ← Collapsed by default
└─────────────────────────────────────┘
```

**When expanded:**
```
┌─────────────────────────────────────┐
│  ▼ Advanced Options                 │
│                                     │
│  • Fine-tune individual pauses      │
│  • Adjust sample speeds             │
│  • Override specific sessions       │
│  • Mix TTS and human voices         │
└─────────────────────────────────────┘
```

### 2. Helpful Tooltips

**Every control has contextual help:**

```
Sample Speed  [?]
├─────────●──────────┐
0.5x               2.0x

Tooltip (on hover):
┌────────────────────────────────────┐
│ Sample Speed                       │
│                                    │
│ Controls how fast voices speak:   │
│ • 0.5x = Half speed (very slow)   │
│ • 1.0x = Normal speed              │
│ • 2.0x = Double speed (very fast) │
│                                    │
│ 💡 Tip: Start at 0.8-0.9x for     │
│    beginners, 1.0x for intermediate│
└────────────────────────────────────┘
```

### 3. Visual Feedback

**Real-time duration estimation:**

```
┌─────────────────────────────────────┐
│ Your Changes:                       │
│                                     │
│ • Single cycle: 8.3s → 10.5s       │
│ • Full session: 12m → 15m          │
│ • Total course: 8h 42m → 10h 15m   │
│                                     │
│ 💡 Longer pauses = more time to    │
│    think, but longer total course  │
└─────────────────────────────────────┘
```

### 4. Preset Templates

**Start with tested configurations:**

```
┌─────────────────────────────────────┐
│ Choose a starting point:            │
│                                     │
│ 🐢 Beginner Pace                    │
│    Best for: First-time learners   │
│    Speed: Slow (0.8x)              │
│    Pauses: Long                    │
│    [Use This]                      │
│                                     │
│ ⚡ Native Speed                     │
│    Best for: Intermediate learners │
│    Speed: Normal (1.0x)            │
│    Pauses: Standard                │
│    [Use This]                      │
└─────────────────────────────────────┘
```

### 5. Validation & Safety Nets

**Prevent mistakes before they happen:**

```
┌─────────────────────────────────────┐
│ ⚠️ Warning                          │
│                                     │
│ Your pause settings are very long. │
│ This will make the course 12 hours │
│ instead of 8 hours.                │
│                                     │
│ Are you sure?                      │
│                                     │
│ [Go Back]         [Continue Anyway]│
└─────────────────────────────────────┘
```

### 6. Plain Language

**Avoid jargon, use everyday terms:**

| Technical Term | Plain Language |
|----------------|----------------|
| "Cadence" | "Speaking pace" |
| "Time stretch" | "Speed adjustment" |
| "LUFS normalization" | "Volume balancing" |
| "TTS generation" | "Computer-generated voice" |
| "Latency" | "Pause" or "Gap" |

### 7. Examples & Context

**Show examples of what values mean:**

```
Pause After Prompt: 2.0s

Examples:
• 1.0s = Quick pace (like a quiz show)
• 2.0s = Normal (time to think)
• 3.0s = Patient (plenty of time)
• 5.0s = Very patient (extra processing time)

👉 You set: 2.0s (Normal) ✓
```

### 8. Undo & Experimentation

**Encourage trying things out:**

```
[Preview]  [Reset to Last Saved]  [Restore Defaults]

💡 Experiment freely! You can always undo or reset.
```

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-2)

**Goal:** Basic voice assignment and timing controls

**Features:**
- ✅ Voice assignment for 4 roles (source, target1, target2, presentation)
- ✅ Basic timing controls (5 pause types)
- ✅ Sample speed slider
- ✅ Save/load configuration to S3
- ✅ 3 built-in presets (Beginner, Native, Fast)
- ✅ Simple preview (single cycle only)

**Tech Stack:**
- Vue 3 (frontend)
- Express API (backend, port 3467)
- Supabase (voices table)
- S3 (voice_config.json storage)

**Deliverables:**
- `VoiceConfigInterface.vue` component
- `voice-config-api.cjs` service
- `voice_config.json` schema
- Basic documentation

### Phase 2: Preview System (Weeks 3-4)

**Goal:** Full preview capabilities

**Features:**
- ✅ Introduction preview
- ✅ Full session preview
- ✅ Encouragement preview
- ✅ Timeline visualization
- ✅ Audio player with phrase highlighting
- ✅ Preview caching

**Tech Stack:**
- Preview generator service
- TTS integration (Azure/ElevenLabs)
- Audio stitching (ffmpeg)
- S3 temp storage

**Deliverables:**
- `PreviewGenerator.cjs` service
- Audio player component
- Timeline visualizer

### Phase 3: Advanced Features (Weeks 5-6)

**Goal:** Power user features

**Features:**
- ✅ Session-specific overrides
- ✅ Language-pair overrides
- ✅ Custom presets (user-created)
- ✅ Voice testing
- ✅ Validation & warnings
- ✅ Duration estimation

**Tech Stack:**
- Enhanced API endpoints
- Configuration hierarchy logic
- Preset management

**Deliverables:**
- Session override UI
- Custom preset creator
- Validation service

### Phase 4: Non-Expert UX (Weeks 7-8)

**Goal:** Polish for volunteer creators

**Features:**
- ✅ Wizard-style onboarding
- ✅ Contextual help & tooltips
- ✅ Video tutorials (embedded)
- ✅ Example configurations
- ✅ Guided workflows

**Tech Stack:**
- Tooltip system
- Tutorial integration
- Example library

**Deliverables:**
- Onboarding wizard
- Help system
- Tutorial videos

### Phase 5: Production Integration (Week 9)

**Goal:** Integrate with Course Production Suite

**Features:**
- ✅ Deep link from Script Viewer
- ✅ Shared navigation
- ✅ WebSocket updates (config changes)
- ✅ Production API integration

**Tech Stack:**
- Production API (port 3470)
- WebSocket (Socket.io)
- Shared state management

**Deliverables:**
- Suite integration
- Navigation menu
- Real-time sync

---

## Edge Cases & Error Handling

### 1. Voice Not Available

**Scenario:** User selects a voice that's been removed from registry

**Handling:**
```typescript
// Validation on config load
if (!voiceExists(config.voices.target1)) {
  showWarning({
    title: "Voice Not Found",
    message: `Voice "${config.voices.target1}" is no longer available.`,
    suggestion: "Please select a replacement voice for Target 1.",
    action: "Select Voice"
  });
}
```

**UI:**
```
┌────────────────────────────────────┐
│ ⚠️ Voice Not Available             │
│                                    │
│ The voice "Triana" (Spanish) is    │
│ no longer available in the system. │
│                                    │
│ Please select a replacement:       │
│                                    │
│ [Select Voice for Target 1]        │
└────────────────────────────────────┘
```

### 2. TTS API Failure

**Scenario:** Preview generation fails due to TTS API error

**Handling:**
```typescript
try {
  const audio = await generateTTS(text, voiceId);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    showError({
      title: "Too Many Requests",
      message: "Please wait a moment before generating another preview.",
      retry: true,
      retryDelay: 30000  // 30 seconds
    });
  } else if (error.code === 'API_ERROR') {
    showError({
      title: "TTS Service Unavailable",
      message: "The voice service is temporarily unavailable. Try again later.",
      fallback: "Use cached audio if available"
    });
  }
}
```

### 3. Extremely Long Pauses

**Scenario:** User sets 5.0s pauses (maximum)

**Handling:**
```typescript
if (config.timing.pauses.promptToResponse > 4.0) {
  showWarning({
    title: "Very Long Pause",
    message: "A 5-second pause is very long. Learners may lose focus.",
    detail: "This will increase total course time by 45%.",
    allowOverride: true
  });
}
```

**UI:**
```
┌────────────────────────────────────┐
│ ⚠️ Pause May Be Too Long           │
│                                    │
│ You set: 5.0 seconds               │
│ Typical: 2.0 seconds               │
│                                    │
│ This will make your course:        │
│ • 45% longer (12.6 hours)          │
│ • Potentially less engaging        │
│                                    │
│ [Use 2.0s]        [Keep 5.0s]      │
└────────────────────────────────────┘
```

### 4. Missing Session

**Scenario:** Session override references non-existent session

**Handling:**
```typescript
// Validate session IDs on save
const validSessions = await loadSessionList(courseCode);
const invalidOverrides = Object.keys(config.sessionOverrides)
  .filter(sessionId => !validSessions.includes(sessionId));

if (invalidOverrides.length > 0) {
  showWarning({
    title: "Invalid Session Overrides",
    message: `Sessions ${invalidOverrides.join(', ')} don't exist in this course.`,
    action: "Remove invalid overrides",
    autoFix: true
  });
}
```

### 5. Preview Timeout

**Scenario:** Full session preview takes too long to generate

**Handling:**
```typescript
const PREVIEW_TIMEOUT = 5 * 60 * 1000;  // 5 minutes

const timeoutId = setTimeout(() => {
  showError({
    title: "Preview Timeout",
    message: "Preview generation is taking longer than expected.",
    suggestion: "Try a shorter preview (single cycle) or check back later.",
    detail: "Full session previews can take 3-5 minutes for long sessions."
  });
}, PREVIEW_TIMEOUT);
```

### 6. S3 Upload Failure

**Scenario:** Config save fails due to S3 error

**Handling:**
```typescript
try {
  await s3.upload('voice_config.json', config);
} catch (error) {
  // Save to local storage as backup
  localStorage.setItem(`voice_config_backup_${courseCode}`, JSON.stringify(config));

  showError({
    title: "Save Failed",
    message: "Unable to save to cloud. Your changes are backed up locally.",
    action: "Retry Save",
    detail: "Check your internet connection and try again."
  });
}
```

### 7. Concurrent Edits

**Scenario:** Two users editing same course configuration

**Handling:**
```typescript
// Optimistic locking with version check
const currentVersion = await getConfigVersion(courseCode);
if (currentVersion > config.version) {
  showWarning({
    title: "Configuration Changed",
    message: "Someone else modified this configuration while you were editing.",
    options: [
      { label: "Review Their Changes", action: "reload" },
      { label: "Overwrite with My Changes", action: "force_save" },
      { label: "Merge Changes", action: "merge" }
    ]
  });
}
```

### 8. Invalid Timing Cascade

**Scenario:** Session override + language override create invalid timing

**Handling:**
```typescript
// Validate resolved timing
const resolvedTiming = resolveTimingForSession(sessionId, language, config);
const validation = validateTiming(resolvedTiming);

if (!validation.valid) {
  showError({
    title: "Invalid Timing Configuration",
    message: `Session ${sessionId} has invalid timing after applying overrides.`,
    errors: validation.errors,
    suggestion: "Review your session and language-pair overrides.",
    autoFix: "Reset to defaults"
  });
}
```

---

## Appendix A: Complete Example Configuration

```json
{
  "courseCode": "spa_for_eng",
  "version": "1.0.0",
  "createdAt": "2025-12-05T10:00:00Z",
  "updatedAt": "2025-12-05T14:30:00Z",

  "voices": {
    "source": "azure_en-GB-BellaNeural",
    "target1": "azure_es-ES-TrianaNeural",
    "target2": "azure_es-ES-AlvaroNeural",
    "presentation": "elevenlabs_FOIN928B9X0jwgJ95cLt",
    "encouragement": "elevenlabs_FOIN928B9X0jwgJ95cLt"
  },

  "timing": {
    "sampleSpeed": 1.0,
    "introductionPace": "natural",
    "pauses": {
      "promptToResponse": 2.0,
      "target1ToTarget2": 1.5,
      "betweenCycles": 1.0,
      "encouragementGap": 0.8,
      "introSentenceGap": 1.2
    }
  },

  "languagePairOverrides": {
    "spa": {
      "sampleSpeed": 0.85,
      "pauses": {
        "target1ToTarget2": 1.8
      }
    }
  },

  "sessionOverrides": {
    "S0001": {
      "sampleSpeed": 0.7,
      "pauses": {
        "promptToResponse": 3.0,
        "betweenCycles": 1.5
      }
    },
    "S0002": {
      "sampleSpeed": 0.75
    },
    "S0010": {
      "sampleSpeed": 1.0
    }
  },

  "metadata": {
    "createdBy": "tom@ssi.org",
    "description": "Spanish for English speakers - beginner pace with gradual speed-up",
    "preset": "custom",
    "tags": ["beginner", "progressive", "slow-start"],
    "notes": "Sessions 1-2 extra slow, gradually increase to normal by Session 10"
  }
}
```

---

## Appendix B: Voice Registry Schema

```sql
-- Supabase: voices table
CREATE TABLE voices (
  voice_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('azure', 'elevenlabs', 'google', 'human')),
  provider_id TEXT,
  language TEXT NOT NULL,  -- ISO 639-3
  display_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('female', 'male', 'neutral')),
  accent TEXT,
  style TEXT,
  typical_roles TEXT[] DEFAULT '{}',
  sample_count INT DEFAULT 0,
  is_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  processing JSONB,
  metadata JSONB
);

-- Index for fast lookups
CREATE INDEX idx_voices_language ON voices(language);
CREATE INDEX idx_voices_provider ON voices(provider);
CREATE INDEX idx_voices_roles ON voices USING GIN(typical_roles);

-- Example rows
INSERT INTO voices (voice_id, provider, provider_id, language, display_name, gender, accent, typical_roles, processing) VALUES
('azure_es-ES-TrianaNeural', 'azure', 'es-ES-TrianaNeural', 'spa', 'Triana (Spanish Female)', 'female', 'castilian', ARRAY['target1'],
  '{"cadences": {"slow": {"azure_speed": 0.7, "time_stretch": 1, "normalize": true, "target_lufs": -16}, "natural": {"azure_speed": 1.0, "time_stretch": 1, "normalize": true, "target_lufs": -16}}}'::jsonb),

('azure_es-ES-AlvaroNeural', 'azure', 'es-ES-AlvaroNeural', 'spa', 'Álvaro (Spanish Male)', 'male', 'castilian', ARRAY['target2'],
  '{"cadences": {"slow": {"azure_speed": 0.7, "time_stretch": 1, "normalize": true, "target_lufs": -16}, "natural": {"azure_speed": 1.0, "time_stretch": 1, "normalize": true, "target_lufs": -16}}}'::jsonb),

('azure_en-GB-BellaNeural', 'azure', 'en-GB-BellaNeural', 'eng', 'Bella (British English Female)', 'female', 'british', ARRAY['source', 'presentation'],
  '{"cadences": {"slow": {"azure_speed": 0.7, "time_stretch": 1, "normalize": true, "target_lufs": -16}, "natural": {"azure_speed": 1.0, "time_stretch": 1, "normalize": true, "target_lufs": -16}}}'::jsonb),

('elevenlabs_FOIN928B9X0jwgJ95cLt', 'elevenlabs', 'FOIN928B9X0jwgJ95cLt', 'eng', 'Aran Clone (Narrator)', 'male', 'british', ARRAY['presentation', 'encouragement'],
  '{"model": "eleven_flash_v2_5", "stability": 0.5, "similarity_boost": 0.75}'::jsonb);
```

---

## Appendix C: API Service Structure

```
services/
├── voice-config-api.cjs              # Main API server (port 3467)
├── voice-config-service.cjs          # Business logic
├── preview-generator.cjs             # Preview generation
├── preset-manager.cjs                # Preset CRUD
└── voice-registry-service.cjs        # Voice lookup & filtering
```

**Port Allocation:**
- 3465: Phase 8 (Audio Generation)
- 3466: Phase 9 (Manifest Compilation)
- 3467: Voice Configuration API (new)
- 3470: Production API (QA Workflow)

---

## Summary

This specification defines a professional yet approachable **Voice Configuration Interface** for language course creators. Key design principles:

1. **Professional Controls** - Granular timing and voice assignment
2. **Non-Expert Friendly** - Presets, tooltips, plain language
3. **Real-Time Preview** - Hear before committing to expensive TTS
4. **Flexible Hierarchy** - Course, language-pair, and session overrides
5. **Future-Proof** - Extensible for new voices, providers, and features

The interface balances power-user needs (SSi team) with accessibility for future volunteer creators, ensuring high-quality language courses can be produced efficiently.

---

**End of Specification**

*Version 1.0.0 - 2025-12-05*
