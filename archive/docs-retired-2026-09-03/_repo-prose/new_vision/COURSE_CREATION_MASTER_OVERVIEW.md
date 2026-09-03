# Course Creation Suite - Master Overview

**The Complete Picture: From Content to Delivery**

Version: 1.0.0
Date: 2025-12-05
Status: Architecture Overview

---

## Executive Summary

This document maps the complete SSi course creation system - from raw content through to learner delivery. Everything is parameterized for experimentation and future non-expert course creators.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COURSE CREATION SUITE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   CONTENT   │───▶│    AUDIO    │───▶│   COURSE    │───▶│   LEARNER   │  │
│  │  PIPELINE   │    │  PIPELINE   │    │  ASSEMBLY   │    │   DELIVERY  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  Phase 1-3:          Phase 8:           Phase 9:           App:             │
│  Translation         TTS/Human          Manifest           ssi-learning-app │
│  LEGO Extraction     Voice Config       Compilation        Adaptive Engine  │
│  Basket Generation   Preview            Session Assembly                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PRODUCTION SUITE (QA)                            │   │
│  │  Script Viewer │ Audio Pipeline │ Recording Studio │ Samples Browser │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Content Pipeline (Phases 1-3)
**Status**: ✅ Implemented
**Documentation**: `apml/`, `CLAUDE.md`

- Phase 1: Translation + LEGO Extraction → `draft_lego_pairs.json`
- Phase 2: Conflict Resolution → `lego_pairs.json` (SSoT for LEGOs)
- Phase 3: Basket Generation → `lego_baskets.json` (practice content)

### 2. Audio Pipeline (Phase 8)
**Status**: ✅ Implemented (TTS), 🔄 In Progress (Voice Config)
**Documentation**: `AUTOCUE_TWO_MODE_SYSTEM.md`

- TTS Generation (Azure/ElevenLabs)
- Human Recording (Autocue System)
- **NEW**: Voice Configuration Interface
- **NEW**: Audio Preview System

### 3. Course Assembly (Phase 9)
**Status**: ✅ Basic Implementation, 🔄 Needs Session Structure
**Documentation**: This document

- Manifest Compilation
- **NEW**: LEGO Session Assembly
- **NEW**: Timing/Pacing Parameters
- **NEW**: Encouragement Insertion

### 4. Learner Delivery
**Status**: ✅ Implemented (ssi-learning-app)
**Documentation**: External

- Adaptive Learning Engine
- **NEW**: Adaptations System
- **NEW**: Listening Exercises

### 5. Production Suite (QA)
**Status**: 📋 Designed, 🔄 Implementation
**Documentation**: `PRODUCTION_SUITE_*.md`

- Script Viewer
- Audio Pipeline Manager
- Recording Studio
- Samples Browser
- Mission Control

---

## Core Concept: The LEGO Session

**A LEGO Session is the atomic unit of learning** - everything from introducing a new LEGO until the next new LEGO is introduced.

```
═══════════════════════════════════════════════════════════════════
                        LEGO SESSION N
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ 1. INTRODUCTION                                                  │
│    "The {target_lang} for '{known_lego}' as in                  │
│     '{seed_sentence}' is: ... '{target_lego}' ... '{target_lego}'"│
│                                                                  │
│    Parameters:                                                   │
│    • intro_voice: instructor voice                              │
│    • intro_pace: natural | slow                                 │
│    • target_repetitions: 2 (default)                            │
│    • pause_before_target: 500ms                                 │
│    • pause_between_targets: 800ms                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PRACTICE: New LEGO N                                          │
│                                                                  │
│    a) Components (if M-type LEGO)                               │
│       - Building blocks, is_component: true                     │
│       - Parameters: component_cycles, component_pause           │
│                                                                  │
│    b) LEGO Debut (is_debut: true)                               │
│       - First appearance of complete LEGO in practice           │
│       - Parameters: debut_repetitions, debut_pace               │
│                                                                  │
│    c) DEBU Phrases (7x default)                                 │
│       - New LEGO used in context sentences                      │
│       - Parameters: debu_count: 7, debu_cycle_pause             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SPACED REVIEW: Previous LEGOs (ETER)                         │
│                                                                  │
│    N-1: 3x ETER cycles                                          │
│    N-2: 1x ETER cycle                                           │
│    N-3: 1x ETER cycle                                           │
│    N-5: 1x ETER cycle                                           │
│    ... until N-x < 1                                            │
│                                                                  │
│    Parameters:                                                   │
│    • eter_schedule: [                                           │
│        { offset: 1, cycles: 3 },                                │
│        { offset: 2, cycles: 1 },                                │
│        { offset: 3, cycles: 1 },                                │
│        { offset: 5, cycles: 1 }                                 │
│      ]                                                          │
│    • eter_decay_rate: configurable                              │
│    • eter_cycle_pause: 1000ms                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ENCOURAGEMENT POINT (optional)                                │
│                                                                  │
│    Inserted here - NEVER interrupts a session                   │
│                                                                  │
│    Parameters:                                                   │
│    • encouragement_frequency: every N sessions                  │
│    • encouragement_pool: random selection                       │
│    • encouragement_voice: instructor voice                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
═══════════════════════════════════════════════════════════════════
                      LEGO SESSION N+1
═══════════════════════════════════════════════════════════════════
```

---

## The Six Major Systems

### SYSTEM 1: LEGO Session Engine
**Purpose**: Define and assemble learning sessions
**See**: `LEGO_SESSION_SPECIFICATION.md` (to be created)

**Key Parameters**:
```typescript
interface SessionParameters {
  // Introduction
  intro: {
    voice: VoiceId;
    pace: 'natural' | 'slow';
    targetRepetitions: number;      // default: 2
    pauseBeforeTarget: number;      // ms, default: 500
    pauseBetweenTargets: number;    // ms, default: 800
  };

  // Practice
  practice: {
    componentCycles: number;        // default: 1
    debuCount: number;              // default: 7
    debuCyclePause: number;         // ms
  };

  // Spaced Review
  eter: {
    schedule: Array<{offset: number; cycles: number}>;
    decayRate: number;              // adjustable for experimentation
    cyclePause: number;             // ms
  };

  // Encouragement
  encouragement: {
    frequency: number;              // every N sessions
    insertionPoint: 'end_of_session' | 'before_next_intro';
  };
}
```

---

### SYSTEM 2: Voice Configuration Interface
**Purpose**: Assign voices, adjust speeds, preview audio
**See**: `VOICE_CONFIGURATION_SPEC.md` (to be created)

**Target Users**:
- Immediate: Tom, Kai, Aran, Deborah
- Future: Non-expert course creators

**Key Features**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE CONFIGURATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ROLE ASSIGNMENT                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Instructor (Known Lang)    [▼ Select Voice    ] [▶ Test]│    │
│  │ Target Voice 1 (Primary)   [▼ Select Voice    ] [▶ Test]│    │
│  │ Target Voice 2 (Echo)      [▼ Select Voice    ] [▶ Test]│    │
│  │ Encouragement Voice        [▼ Select Voice    ] [▶ Test]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  TIMING CONTROLS                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Default Sample Speed       [====●=====] 1.0x            │    │
│  │ Intro Pace                 [===●======] 0.9x (slower)   │    │
│  │ Pause: Prompt → Response   [=====●====] 1500ms          │    │
│  │ Pause: Targ1 → Targ2       [====●=====] 800ms           │    │
│  │ Pause: Between Cycles      [======●===] 2000ms          │    │
│  │ Gap Before Encouragement   [=======●==] 3000ms          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  PREVIEW                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [▶ Preview Introduction]                                 │    │
│  │ [▶ Preview Prompt/Response Cycle]                        │    │
│  │ [▶ Preview Full LEGO Session]        Session: [▼ S0042] │    │
│  │ [▶ Preview with Encouragement]                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### SYSTEM 3: Adaptations Engine
**Purpose**: Dynamic difficulty adjustment based on learner performance
**See**: `ADAPTATIONS_SPECIFICATION.md` (to be created)

**Key Concepts**:
- Adaptive ETER scheduling (faster/slower decay based on performance)
- Dynamic repetition counts
- Difficulty ramping
- Error recovery patterns

**Parameters**:
```typescript
interface AdaptationParameters {
  // Performance thresholds
  successThreshold: number;         // % correct to accelerate
  struggleThreshold: number;        // % to slow down

  // ETER adjustments
  eterBoostOnSuccess: number;       // reduce cycles when doing well
  eterExtendOnStruggle: number;     // add cycles when struggling

  // Difficulty
  initialDifficulty: 'easy' | 'normal' | 'challenging';
  rampUpRate: number;               // how fast to increase difficulty

  // Recovery
  maxConsecutiveErrors: number;     // before intervention
  recoverySessionLength: number;    // shorter sessions after struggle
}
```

---

### SYSTEM 4: Listening Exercises
**Purpose**: Comprehension practice without speaking
**See**: `LISTENING_EXERCISES_SPEC.md` (to be created)

**Exercise Types**:
1. **Recognition** - "Which phrase means X?"
2. **Ordering** - "Put these phrases in order"
3. **Fill-in** - "What word is missing?"
4. **Comprehension** - "What did the speaker say?"

**Integration Points**:
- Can be inserted between LEGO sessions
- Standalone listening mode
- Review/reinforcement tool

---

### SYSTEM 5: Production Suite (QA Workflow)
**Purpose**: Quality assurance for audio production
**See**: `PRODUCTION_SUITE_*.md` (existing)

**Components**:
- Script Viewer - Browse course content, flag issues
- Audio Pipeline - Manage TTS regeneration queue
- Recording Studio - Human recording with autocue
- Samples Browser - Review/approve audio samples
- Mission Control - Dashboard overview

---

### SYSTEM 6: Autocue/Teleprompter System
**Purpose**: Human recording interface
**See**: `AUTOCUE_TWO_MODE_SYSTEM.md` (existing)

**Modes**:
- Mode 1: New Course Recording (Two-Pass)
- Mode 2: Regeneration Recording (Targeted Fixes)

---

## Parameter Philosophy

**"Everything is a parameter"**

### Why Parameterize Everything?

1. **Experimentation** - Test different ETER schedules, timing, pacing
2. **Course Variation** - Different languages may need different rhythms
3. **Learner Adaptation** - Adjust based on individual performance
4. **Future-Proofing** - Non-experts can tweak without code changes
5. **A/B Testing** - Compare approaches scientifically

### Parameter Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARAMETER HIERARCHY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COURSE-LEVEL DEFAULTS                                          │
│  └── Language pair defaults (e.g., spa_for_eng)                 │
│      └── Course-specific overrides                              │
│          └── Session-specific overrides                         │
│              └── Learner-specific adaptations                   │
│                                                                  │
│  VOICE PARAMETERS                                                │
│  • voice_id, speed, pitch, cadence                              │
│  • role: instructor | target_primary | target_echo              │
│                                                                  │
│  TIMING PARAMETERS                                               │
│  • pauses (ms): prompt_response, target_echo, cycle_gap         │
│  • speeds: intro_pace, practice_pace, review_pace               │
│                                                                  │
│  SESSION STRUCTURE PARAMETERS                                    │
│  • debu_count, eter_schedule, encouragement_frequency           │
│  • component_handling, debut_emphasis                           │
│                                                                  │
│  ADAPTATION PARAMETERS                                           │
│  • thresholds, boost/extend rates, recovery settings            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
                         CONTENT
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     lego_pairs.json                              │
│                     lego_baskets.json                            │
│                   (SSoT for content)                             │
└─────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │    TTS      │ │   Human     │ │   Voice     │
    │ Generation  │ │ Recording   │ │   Config    │
    └─────────────┘ └─────────────┘ └─────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase: audio_samples                       │
│                    S3: mastered/{uuid}.mp3                       │
│                   (SSoT for audio)                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SESSION ASSEMBLY ENGINE                          │
│                                                                  │
│  Inputs:                                                         │
│  • lego_baskets.json (content)                                  │
│  • audio_samples (audio UUIDs)                                  │
│  • session_parameters.json (timing/structure)                   │
│  • voice_config.json (voice assignments)                        │
│                                                                  │
│  Output:                                                         │
│  • course_manifest.json (complete course)                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNER DELIVERY                              │
│                                                                  │
│  ssi-learning-app                                                │
│  • Reads course_manifest.json                                   │
│  • Applies adaptation parameters                                │
│  • Delivers LEGO sessions                                       │
│  • Tracks learner progress                                      │
│  • Adjusts based on performance                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Core Session Engine
1. ✅ LEGO Session structure definition
2. 🔄 Session parameters schema
3. 🔄 Manifest compilation with sessions
4. 🔄 Preview capability

### Phase 2: Voice Configuration
1. 🔄 Voice assignment interface
2. 🔄 Timing controls
3. 🔄 Preview system (introduction, cycle, full session)

### Phase 3: Production Suite
1. 📋 Script Viewer
2. 📋 Audio Pipeline Manager
3. 📋 Recording Studio integration
4. 📋 Samples Browser

### Phase 4: Advanced Features
1. 📋 Adaptations engine
2. 📋 Listening exercises
3. 📋 A/B testing framework

---

## Document Index

| Document | Status | Purpose |
|----------|--------|---------|
| `COURSE_CREATION_MASTER_OVERVIEW.md` | ✅ This document | Big picture overview |
| `LEGO_SESSION_SPECIFICATION.md` | 🔄 Creating | Session structure & parameters |
| `VOICE_CONFIGURATION_SPEC.md` | 🔄 Creating | Voice config interface |
| `ADAPTATIONS_SPECIFICATION.md` | 📋 Planned | Adaptive learning engine |
| `LISTENING_EXERCISES_SPEC.md` | 📋 Planned | Listening exercise system |
| `PRODUCTION_SUITE_*.md` | ✅ Existing | QA workflow documentation |
| `AUTOCUE_TWO_MODE_SYSTEM.md` | ✅ Existing | Recording interface |

---

## Next Steps

1. **Define LEGO Session schema** with all parameters
2. **Design Voice Configuration UI** for team use
3. **Integrate session structure** into manifest compilation
4. **Build preview system** to hear sessions before committing
5. **Document Adaptations** for future implementation
6. **Document Listening Exercises** for future implementation

---

**Version**: 1.0.0
**Created**: 2025-12-05
**Author**: Claude (Anthropic)
**Project**: SSi Dashboard v7 - Course Creation Suite
