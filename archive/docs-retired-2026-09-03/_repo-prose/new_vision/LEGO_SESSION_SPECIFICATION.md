# LEGO Session Specification

**The Atomic Unit of Learning in SSi Courses**

Version: 1.0.0
Date: 2025-12-05
Status: Specification Document
APML Version: v11.0

---

## Executive Summary

A **LEGO Session** is the atomic unit of learning in SSi language courses. It encompasses everything from introducing a new LEGO until the next new LEGO is introduced. This document defines the complete structure, parameters, and behavior of LEGO Sessions to enable:

1. **Consistent course assembly** across all language pairs
2. **Parameterized experimentation** with learning schedules
3. **Future non-expert course creators** to configure courses without code changes
4. **A/B testing** of pedagogical approaches
5. **Learner adaptations** based on performance

**Key Principle**: Everything is a parameter. No hard-coded values.

---

## Table of Contents

1. [Session Structure Overview](#session-structure-overview)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [Parameter Hierarchy](#parameter-hierarchy)
4. [Session Components](#session-components)
5. [ETER Schedule System](#eter-schedule-system)
6. [JSON Schema Examples](#json-schema-examples)
7. [Session Configuration Examples](#session-configuration-examples)
8. [A/B Testing Framework](#ab-testing-framework)
9. [Manifest Integration](#manifest-integration)
10. [Encouragement System](#encouragement-system)

---

## Session Structure Overview

### Conceptual Flow

```
═══════════════════════════════════════════════════════════════════
                        LEGO SESSION N
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ 1. INTRODUCTION                                                  │
│    Pattern: "The {target_lang} for '{known_lego}' as in         │
│             '{seed_sentence}' is: ... '{target_lego}' ...        │
│             '{target_lego}'"                                     │
│                                                                  │
│    Parameters:                                                   │
│    • intro_voice: VoiceId                                       │
│    • intro_pace: 'natural' | 'slow'                             │
│    • target_repetitions: number (default: 2)                    │
│    • pause_before_target: number (ms, default: 500)             │
│    • pause_between_targets: number (ms, default: 800)           │
│    • pause_after_intro: number (ms, default: 1000)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PRACTICE: New LEGO N                                          │
│                                                                  │
│    a) Components (if COMPOSITE LEGO)                            │
│       - is_component: true                                      │
│       - FEEDER LEGOs practiced individually                     │
│       - Parameters:                                              │
│         • component_cycles: number (default: 1)                 │
│         • component_pause: number (ms, default: 800)            │
│         • component_voice: VoiceId                              │
│                                                                  │
│    b) LEGO Debut (is_debut: true)                               │
│       - First complete appearance of the LEGO                   │
│       - Parameters:                                              │
│         • debut_repetitions: number (default: 2)                │
│         • debut_pace: 'natural' | 'slow'                        │
│         • debut_pause: number (ms, default: 1000)               │
│         • debut_voice: VoiceId                                  │
│                                                                  │
│    c) DEBU Phrases (default 7x)                                 │
│       - New LEGO used in context sentences                      │
│       - Parameters:                                              │
│         • debu_count: number (default: 7)                       │
│         • debu_cycle_pause: number (ms, default: 1500)          │
│         • debu_response_pause: number (ms, default: 2000)       │
│         • debu_voice_target: VoiceId                            │
│         • debu_voice_known: VoiceId                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SPACED REVIEW: Previous LEGOs (ETER)                         │
│                                                                  │
│    Default Schedule:                                             │
│    • N-1: 3x ETER cycles                                        │
│    • N-2: 1x ETER cycle                                         │
│    • N-3: 1x ETER cycle                                         │
│    • N-5: 1x ETER cycle                                         │
│    • Continue until N-x < 1                                     │
│                                                                  │
│    Parameters:                                                   │
│    • eter_schedule: Array<{offset: number, cycles: number}>     │
│    • eter_decay_function: 'exponential' | 'linear' | 'custom'   │
│    • eter_decay_rate: number (adjustable)                       │
│    • eter_cycle_pause: number (ms, default: 1000)               │
│    • eter_response_pause: number (ms, default: 2000)            │
│    • eter_voice_target: VoiceId                                 │
│    • eter_voice_known: VoiceId                                  │
│    • eter_max_lookback: number (default: 50)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ENCOURAGEMENT POINT (optional)                                │
│                                                                  │
│    Inserted here - NEVER interrupts a session                   │
│    Always at natural boundary between sessions                  │
│                                                                  │
│    Parameters:                                                   │
│    • encouragement_enabled: boolean (default: true)             │
│    • encouragement_frequency: number (every N sessions)         │
│    • encouragement_pool_type: 'random' | 'sequential'           │
│    • encouragement_pool: Array<string>                          │
│    • encouragement_voice: VoiceId                               │
│    • pause_before_encouragement: number (ms, default: 2000)     │
│    • pause_after_encouragement: number (ms, default: 1500)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
═══════════════════════════════════════════════════════════════════
                      LEGO SESSION N+1
═══════════════════════════════════════════════════════════════════
```

### Session Boundary Rules

1. **Session Start**: Introduction of a new LEGO
2. **Session End**: Completion of ETER cycles for that LEGO
3. **Encouragements**: ONLY inserted between sessions (never interrupt)
4. **Natural Boundaries**: Sessions are atomic - cannot be split

---

## TypeScript Interfaces

### Core Session Structure

```typescript
/**
 * Complete LEGO Session definition
 * Represents one atomic learning unit from LEGO introduction through practice
 */
interface LegoSession {
  // Identity
  session_id: string;                    // Unique session identifier (e.g., "S0042")
  session_index: number;                 // Position in course (0-based)
  lego_id: string;                       // Primary LEGO being introduced
  lego_type: 'BASE' | 'COMPOSITE';       // Type of LEGO

  // Session Components
  introduction: IntroductionComponent;
  practice: PracticeComponent;
  spaced_review: SpacedReviewComponent;

  // Session Metadata
  estimated_duration_ms: number;         // Total session time estimate
  difficulty_level: number;              // 1-10 scale
  cumulative_legos: number;              // Total LEGOs learned up to this point

  // Parameterization
  parameters: SessionParameters;         // Session-specific parameter overrides

  // Context for learner app
  context: SessionContext;
}

/**
 * Session context for learner delivery
 */
interface SessionContext {
  seed_sentence: {
    target: string;                      // Target language sentence
    known: string;                       // Known language sentence
  };
  previous_legos: Array<{                // LEGOs learned in previous sessions
    lego_id: string;
    lego_text_target: string;
    lego_text_known: string;
    sessions_ago: number;                // How many sessions ago was it learned
  }>;
  course_progress: {
    sessions_completed: number;
    total_sessions: number;
    legos_learned: number;
    total_legos: number;
  };
}
```

### Introduction Component

```typescript
/**
 * Introduction phase of a LEGO Session
 * Pattern: "The {target_lang} for '{known_lego}' as in '{seed_sentence}' is..."
 */
interface IntroductionComponent {
  type: 'introduction';

  // Introduction Script
  script: {
    template: string;                    // Introduction template string
    variables: {
      target_language: string;           // e.g., "Spanish", "Italian"
      known_lego: string;                // Known language LEGO text
      seed_sentence: string;             // Full seed sentence (known lang)
      target_lego: string;               // Target language LEGO text
    };
  };

  // Audio Items
  items: Array<{
    item_id: string;                     // Unique item identifier
    audio_uuid: string;                  // Reference to audio_samples table
    role: 'presentation';                // Always presentation voice
    text: string;                        // Spoken text
    cadence: 'natural' | 'slow';
    pause_after_ms: number;              // Pause after this item
  }>;

  // Target Repetitions
  target_repetitions: Array<{
    item_id: string;
    audio_uuid: string;
    role: 'target1' | 'target2';         // Target voice(s)
    text: string;                        // Target LEGO text
    cadence: 'slow';                     // Usually slow for introduction
    pause_after_ms: number;
  }>;

  // Parameters
  parameters: IntroductionParameters;
}

/**
 * Configurable parameters for introduction phase
 */
interface IntroductionParameters {
  voice: VoiceId;                        // Voice for introduction narration
  pace: 'natural' | 'slow';              // Pace of introduction
  target_repetitions: number;            // How many times to repeat target (default: 2)
  pause_before_target: number;           // Pause before first target (ms)
  pause_between_targets: number;         // Pause between repetitions (ms)
  pause_after_intro: number;             // Pause after intro before practice (ms)

  // Advanced
  enable_example_sentence: boolean;      // Include seed sentence example
  example_sentence_pause: number;        // Pause after example (ms)
}
```

### Practice Component

```typescript
/**
 * Practice phase of a LEGO Session
 * Includes components (if COMPOSITE), LEGO debut, and DEBU phrases
 */
interface PracticeComponent {
  type: 'practice';

  // Sub-phases
  components?: ComponentPhase;           // Only for COMPOSITE LEGOs
  debut: DebutPhase;                     // LEGO debut (first complete appearance)
  debu_phrases: DebuPhase;               // Context sentences using the LEGO

  // Parameters
  parameters: PracticeParameters;
}

/**
 * Component practice (for COMPOSITE LEGOs only)
 * Practice FEEDERs before introducing the full COMPOSITE
 */
interface ComponentPhase {
  enabled: boolean;                      // false for BASE LEGOs
  feeders: Array<{
    feeder_id: string;                   // e.g., "S0042F01"
    lego_id: string;                     // Original BASE LEGO id
    is_component: true;

    // Prompt-Response Cycle
    cycles: Array<{
      cycle_id: string;
      prompt_audio_uuid: string;         // Known language prompt
      response_audio_uuid: string;       // Target language response
      pause_after_cycle_ms: number;
    }>;
  }>;

  parameters: ComponentParameters;
}

interface ComponentParameters {
  component_cycles: number;              // How many cycles per FEEDER (default: 1)
  component_pause: number;               // Pause between cycles (ms)
  component_voice_target: VoiceId;
  component_voice_known: VoiceId;
  enable_feeder_introduction: boolean;   // Brief intro for each FEEDER
}

/**
 * LEGO Debut phase
 * First complete appearance of the LEGO in isolation
 */
interface DebutPhase {
  is_debut: true;
  lego_id: string;

  // Debut Cycle
  cycles: Array<{
    cycle_id: string;
    prompt_audio_uuid: string;           // Known language LEGO
    response_audio_uuid: string;         // Target language LEGO
    pause_after_cycle_ms: number;
  }>;

  parameters: DebutParameters;
}

interface DebutParameters {
  debut_repetitions: number;             // How many debut cycles (default: 2)
  debut_pace: 'natural' | 'slow';        // Pace for debut
  debut_pause: number;                   // Pause after debut (ms)
  debut_voice_target: VoiceId;
  debut_voice_known: VoiceId;
  debut_cadence_target: 'slow';          // Usually slow for debut
  debut_cadence_known: 'natural';        // Usually natural for known
}

/**
 * DEBU practice phrases
 * Context sentences using the new LEGO
 */
interface DebuPhase {
  debu_count: number;                    // How many DEBU phrases (default: 7)

  phrases: Array<{
    phrase_id: string;
    basket_id: string;                   // Reference to lego_baskets.json
    seed_id: string;                     // Which seed this comes from

    // Prompt-Response Cycle
    cycle: {
      cycle_id: string;
      prompt_audio_uuid: string;         // Known language phrase
      response_audio_uuid: string;       // Target language phrase
      pause_after_cycle_ms: number;
    };

    // Context
    uses_lego: string;                   // Which LEGO is being practiced
    difficulty: number;                  // 1-10 scale
  }>;

  parameters: DebuParameters;
}

interface DebuParameters {
  debu_count: number;                    // Number of DEBU phrases (default: 7)
  debu_cycle_pause: number;              // Pause between cycles (ms)
  debu_response_pause: number;           // Pause after learner response (ms)
  debu_voice_target: VoiceId;
  debu_voice_known: VoiceId;
  debu_cadence_target: 'slow';           // Target cadence for DEBU
  debu_cadence_known: 'natural';         // Known cadence for DEBU

  // Selection strategy
  selection_strategy: 'sequential' | 'difficulty_curve' | 'random';
  difficulty_curve?: Array<number>;      // Difficulty progression (e.g., [3,4,5,6,7,6,5])
}
```

### Spaced Review Component

```typescript
/**
 * ETER (Expanding Time-based Exponential Review) System
 * Reviews previous LEGOs with decreasing frequency
 */
interface SpacedReviewComponent {
  type: 'eter';

  // Review items
  reviews: Array<{
    review_id: string;
    lego_id: string;                     // Which LEGO is being reviewed
    sessions_ago: number;                // N-1, N-2, N-3, etc.
    cycle_count: number;                 // How many cycles for this LEGO

    // Cycles
    cycles: Array<{
      cycle_id: string;
      prompt_audio_uuid: string;         // Known language prompt
      response_audio_uuid: string;       // Target language response
      pause_after_cycle_ms: number;
    }>;

    // Context
    lego_text_target: string;
    lego_text_known: string;
    original_session_index: number;      // When was this LEGO introduced
  }>;

  // Parameters
  parameters: EterParameters;
}

/**
 * ETER schedule parameters
 * Highly configurable for experimentation
 */
interface EterParameters {
  // Schedule Definition
  schedule: Array<EterScheduleEntry>;

  // Decay Function
  decay_function: 'exponential' | 'linear' | 'custom';
  decay_rate: number;                    // Adjustable decay multiplier

  // Constraints
  max_lookback: number;                  // Maximum sessions to look back (default: 50)
  min_cycles: number;                    // Minimum cycles per LEGO (default: 1)
  max_cycles: number;                    // Maximum cycles per LEGO (default: 5)

  // Timing
  cycle_pause: number;                   // Pause between ETER cycles (ms)
  response_pause: number;                // Pause after learner response (ms)

  // Voice
  voice_target: VoiceId;
  voice_known: VoiceId;
  cadence_target: 'slow' | 'natural';    // Usually natural for review
  cadence_known: 'natural';

  // Adaptive (for future implementation)
  adaptive_schedule: boolean;            // Enable performance-based adaptation
  success_boost: number;                 // Reduce cycles on success
  struggle_extend: number;               // Add cycles on struggle
}

/**
 * ETER schedule entry
 * Defines review frequency at different intervals
 */
interface EterScheduleEntry {
  offset: number;                        // Sessions ago (1 = previous session)
  cycles: number;                        // How many cycles at this offset

  // Optional overrides
  cadence_override?: 'slow' | 'natural';
  pause_override?: number;
}

/**
 * Default ETER schedules (presets)
 */
const DEFAULT_ETER_SCHEDULES = {
  standard: [
    { offset: 1, cycles: 3 },            // N-1: 3x cycles
    { offset: 2, cycles: 1 },            // N-2: 1x cycle
    { offset: 3, cycles: 1 },            // N-3: 1x cycle
    { offset: 5, cycles: 1 },            // N-5: 1x cycle
    { offset: 8, cycles: 1 },            // N-8: 1x cycle
    { offset: 13, cycles: 1 },           // N-13: 1x cycle
    { offset: 21, cycles: 1 },           // N-21: 1x cycle (Fibonacci-like)
  ],

  intensive: [
    { offset: 1, cycles: 5 },            // More practice of recent LEGOs
    { offset: 2, cycles: 3 },
    { offset: 3, cycles: 2 },
    { offset: 4, cycles: 1 },
    { offset: 6, cycles: 1 },
    { offset: 9, cycles: 1 },
    { offset: 14, cycles: 1 },
  ],

  relaxed: [
    { offset: 1, cycles: 2 },            // Less frequent review
    { offset: 3, cycles: 1 },
    { offset: 6, cycles: 1 },
    { offset: 10, cycles: 1 },
    { offset: 15, cycles: 1 },
  ],

  exponential: [
    { offset: 1, cycles: 3 },
    { offset: 2, cycles: 2 },
    { offset: 4, cycles: 2 },
    { offset: 8, cycles: 1 },
    { offset: 16, cycles: 1 },
    { offset: 32, cycles: 1 },
  ],
};
```

### Session Parameters

```typescript
/**
 * Complete parameterization for a LEGO Session
 * Supports course-level defaults, session overrides, and learner adaptations
 */
interface SessionParameters {
  // Meta
  parameter_set_id: string;              // Identifier for this parameter set
  version: string;                       // Parameter schema version

  // Component Parameters
  introduction: IntroductionParameters;
  practice: {
    components: ComponentParameters;
    debut: DebutParameters;
    debu: DebuParameters;
  };
  eter: EterParameters;
  encouragement: EncouragementParameters;

  // Session-Level Overrides
  overrides?: SessionParameterOverrides;
}

/**
 * Session-specific parameter overrides
 * Allow individual sessions to deviate from course defaults
 */
interface SessionParameterOverrides {
  reason: string;                        // Why these overrides exist

  // Targeted overrides
  intro_voice?: VoiceId;
  target_repetitions?: number;
  debu_count?: number;
  eter_schedule?: Array<EterScheduleEntry>;

  // Any parameter can be overridden
  [key: string]: any;
}
```

### Encouragement System

```typescript
/**
 * Encouragement insertion system
 * Never interrupts sessions - only inserted at boundaries
 */
interface EncouragementParameters {
  enabled: boolean;                      // Enable/disable encouragements
  frequency: number;                     // Every N sessions (default: 5)

  // Pool Configuration
  pool_type: 'random' | 'sequential' | 'weighted';
  pool: Array<EncouragementItem>;

  // Insertion Behavior
  insertion_point: 'end_of_session' | 'before_next_intro';
  pause_before: number;                  // Pause before encouragement (ms)
  pause_after: number;                   // Pause after encouragement (ms)

  // Voice
  voice: VoiceId;                        // Encouragement voice (usually presentation)
  cadence: 'natural';                    // Always natural for encouragement

  // Adaptive
  performance_triggered: boolean;        // Trigger based on learner performance
  success_threshold?: number;            // Trigger on X% success
  struggle_threshold?: number;           // Trigger on X% struggle (different message)
}

interface EncouragementItem {
  encouragement_id: string;
  text: string;                          // Encouragement text (known language)
  audio_uuid: string;                    // Audio file UUID
  type: 'motivational' | 'instructional' | 'celebratory';
  weight?: number;                       // Weight for random selection
  trigger_condition?: string;            // Optional condition (e.g., "session_count >= 10")
}
```

### Voice Configuration

```typescript
/**
 * Voice assignment for all roles in a course
 */
interface VoiceConfiguration {
  course_code: string;
  target_language: string;
  known_language: string;

  // Voice Assignments
  voices: {
    // Target language voices
    target1: VoiceId;                    // Primary target voice
    target2?: VoiceId;                   // Alternate target voice (optional)

    // Known language voices
    source: VoiceId;                     // Known language prompts
    presentation: VoiceId;               // Teaching/instruction voice

    // Special
    encouragement?: VoiceId;             // Encouragement voice (defaults to presentation)
  };

  // Voice Metadata
  voice_registry: Array<{
    voice_id: VoiceId;
    display_name: string;
    engine: 'azure' | 'elevenlabs' | 'human';
    language_code: string;
    gender: 'male' | 'female' | 'neutral';
    age_range: string;
    accent?: string;
    sample_url?: string;                 // Sample audio for preview
  }>;
}

type VoiceId = string;  // e.g., "azure_es_ES_ElviraNeural", "human_maria_spa"
```

---

## Parameter Hierarchy

Parameters cascade from course defaults through to learner-specific adaptations:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARAMETER CASCADE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SYSTEM DEFAULTS                                              │
│     └─ Hard-coded fallback values                               │
│        (e.g., debu_count: 7, eter N-1: 3 cycles)                │
│                                                                  │
│  2. LANGUAGE PAIR DEFAULTS                                       │
│     └─ Overrides for language-specific needs                    │
│        (e.g., Spanish might need slower pace than Italian)      │
│                                                                  │
│  3. COURSE CONFIGURATION                                         │
│     └─ Course creator's chosen parameters                       │
│        (stored in course_parameters.json)                       │
│                                                                  │
│  4. SESSION OVERRIDES                                            │
│     └─ Specific sessions with special needs                     │
│        (e.g., difficult LEGO gets extra DEBU phrases)           │
│                                                                  │
│  5. LEARNER ADAPTATIONS                                          │
│     └─ Runtime adjustments based on performance                 │
│        (e.g., reduce ETER cycles if learner excelling)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Parameter Resolution Example

```typescript
/**
 * Resolve parameters with cascade logic
 */
function resolveParameters(
  systemDefaults: SessionParameters,
  languagePairDefaults: Partial<SessionParameters>,
  courseConfig: Partial<SessionParameters>,
  sessionOverrides: Partial<SessionParameters>,
  learnerAdaptations: Partial<SessionParameters>
): SessionParameters {
  return deepMerge(
    systemDefaults,
    languagePairDefaults,
    courseConfig,
    sessionOverrides,
    learnerAdaptations
  );
}

// Example usage
const resolvedParams = resolveParameters(
  SYSTEM_DEFAULTS,
  SPANISH_FOR_ENGLISH_DEFAULTS,
  courseConfig,
  { debu_count: 10 },  // This session needs more practice
  { eter_schedule: adaptiveEterSchedule }  // Learner-specific adaptation
);
```

---

## Session Components

### 1. Introduction Component

#### Purpose
Introduce a new LEGO with zero unknowns by referencing the seed sentence context.

#### Audio Sequence
```
1. [PRESENTATION VOICE - NATURAL]
   "The Spanish for 'I want to learn' as in 'I want to learn Spanish' is..."

   [PAUSE: pause_before_target]

2. [TARGET VOICE 1 - SLOW]
   "quiero aprender"

   [PAUSE: pause_between_targets]

3. [TARGET VOICE 1 - SLOW] (repetition)
   "quiero aprender"

   [PAUSE: pause_after_intro]
```

#### Configurable Aspects
- **Voice selection**: Which voice delivers the introduction
- **Pace**: Natural or slow pace for introduction
- **Repetitions**: How many times to repeat the target LEGO
- **Pauses**: Timing between each element
- **Example inclusion**: Whether to include seed sentence context

#### Implementation Notes
- Introduction text is generated from template + variables
- Audio UUIDs are resolved from Supabase `audio_samples` table
- Pauses are silences inserted during playback (not audio files)

---

### 2. Practice Component

#### 2a. Components Phase (COMPOSITE LEGOs only)

**Purpose**: Practice FEEDERs before introducing the full COMPOSITE LEGO.

**Example**: For COMPOSITE "voy a decir" (I'm going to say)
```
FEEDER 1: "voy" (I'm going)
  Cycle 1:
    Prompt: "I'm going"
    Response: "voy"
    [PAUSE: component_pause]

FEEDER 2: "decir" (to say)
  Cycle 1:
    Prompt: "to say"
    Response: "decir"
    [PAUSE: component_pause]
```

**When Skipped**: For BASE LEGOs (no components to practice).

---

#### 2b. LEGO Debut Phase

**Purpose**: First complete appearance of the LEGO in isolation.

**Audio Sequence**:
```
Cycle 1:
  Prompt [KNOWN VOICE - NATURAL]: "I want to learn"
  Response [TARGET VOICE - SLOW]: "quiero aprender"
  [PAUSE: debut_pause]

Cycle 2:
  Prompt [KNOWN VOICE - NATURAL]: "I want to learn"
  Response [TARGET VOICE - SLOW]: "quiero aprender"
  [PAUSE: debut_pause]
```

**Configurable Aspects**:
- **Repetitions**: How many debut cycles (default: 2)
- **Pace**: Usually slow for debut
- **Pause**: Time after each cycle
- **Voice**: Target and known voices

---

#### 2c. DEBU Phrases Phase

**Purpose**: Practice the new LEGO in context sentences.

**Example** (7 DEBU phrases for "quiero aprender"):
```
DEBU 1: "Yo quiero aprender español"
  Prompt: "I want to learn Spanish"
  Response: "Yo quiero aprender español"
  [PAUSE: debu_response_pause]
  [PAUSE: debu_cycle_pause]

DEBU 2: "¿Quieres aprender conmigo?"
  Prompt: "Do you want to learn with me?"
  Response: "¿Quieres aprender conmigo?"
  [PAUSE: debu_response_pause]
  [PAUSE: debu_cycle_pause]

... (5 more)
```

**Configurable Aspects**:
- **Count**: How many DEBU phrases (default: 7)
- **Selection**: Sequential, difficulty curve, or random
- **Difficulty curve**: Array of difficulty values (e.g., [3,4,5,6,7,6,5])
- **Pauses**: Timing between cycles
- **Voices**: Target and known voices

---

### 3. Spaced Review (ETER) Component

#### Purpose
Review previously learned LEGOs with decreasing frequency to ensure long-term retention.

#### ETER Schedule Logic

**Default Schedule**:
```
N-1 (previous session):        3 cycles
N-2 (2 sessions ago):          1 cycle
N-3 (3 sessions ago):          1 cycle
N-5 (5 sessions ago):          1 cycle
N-8 (8 sessions ago):          1 cycle
N-13 (13 sessions ago):        1 cycle
...
```

**Implementation**:
```typescript
function getEterReviews(
  currentSessionIndex: number,
  eterSchedule: Array<EterScheduleEntry>,
  allSessions: Array<LegoSession>
): Array<EterReviewItem> {
  const reviews: Array<EterReviewItem> = [];

  for (const entry of eterSchedule) {
    const targetSessionIndex = currentSessionIndex - entry.offset;

    // Stop if we've gone past the beginning
    if (targetSessionIndex < 0) break;

    const targetSession = allSessions[targetSessionIndex];
    if (!targetSession) continue;

    // Create review item
    reviews.push({
      review_id: generateId(),
      lego_id: targetSession.lego_id,
      sessions_ago: entry.offset,
      cycle_count: entry.cycles,
      // ... generate cycles from lego_baskets.json
    });
  }

  return reviews;
}
```

#### Configurable ETER Schedules

**Standard** (default):
```typescript
{
  schedule: [
    { offset: 1, cycles: 3 },
    { offset: 2, cycles: 1 },
    { offset: 3, cycles: 1 },
    { offset: 5, cycles: 1 },
    { offset: 8, cycles: 1 },
  ],
  decay_function: 'exponential',
  decay_rate: 1.0
}
```

**Intensive** (more review):
```typescript
{
  schedule: [
    { offset: 1, cycles: 5 },
    { offset: 2, cycles: 3 },
    { offset: 3, cycles: 2 },
    { offset: 4, cycles: 1 },
    { offset: 6, cycles: 1 },
    { offset: 9, cycles: 1 },
  ],
  decay_function: 'linear',
  decay_rate: 1.2
}
```

**Relaxed** (less review):
```typescript
{
  schedule: [
    { offset: 1, cycles: 2 },
    { offset: 3, cycles: 1 },
    { offset: 6, cycles: 1 },
    { offset: 10, cycles: 1 },
  ],
  decay_function: 'exponential',
  decay_rate: 0.8
}
```

#### Adaptive ETER (Future)

```typescript
interface AdaptiveEterConfig {
  enabled: boolean;

  // Performance thresholds
  success_threshold: number;             // % correct to reduce cycles
  struggle_threshold: number;            // % to increase cycles

  // Adjustments
  success_boost: number;                 // Reduce cycles by this amount
  struggle_extend: number;               // Add cycles by this amount

  // Constraints
  min_cycles: number;                    // Never go below
  max_cycles: number;                    // Never go above
}

// Example: Learner doing well on N-1 LEGO
// Standard: 3 cycles
// Adaptive: 2 cycles (reduced by success_boost: 1)
```

---

### 4. Encouragement System

#### Purpose
Provide motivation and feedback at natural session boundaries.

#### Insertion Rules
1. **NEVER interrupt a session** - only between sessions
2. Insert based on frequency (e.g., every 5 sessions)
3. Can be triggered by performance (optional)
4. Always uses presentation voice
5. Has dedicated pause_before and pause_after

#### Types of Encouragements

**Motivational**:
```
"You're doing great! Keep going!"
"Excellent progress so far."
"You're really getting the hang of this!"
```

**Instructional**:
```
"Remember to listen carefully to each phrase before responding."
"Take your time - accuracy is more important than speed."
"If you get stuck, just listen to the pattern again."
```

**Celebratory**:
```
"Fantastic work! You've learned 25 LEGOs already!"
"Wow! You're halfway through this lesson!"
"Amazing! You're on a roll!"
```

#### Configuration Example

```typescript
const encouragementConfig: EncouragementParameters = {
  enabled: true,
  frequency: 5,  // Every 5 sessions

  pool_type: 'weighted',
  pool: [
    {
      encouragement_id: "enc_001",
      text: "You're doing great! Keep going!",
      audio_uuid: "audio-uuid-here",
      type: "motivational",
      weight: 3
    },
    {
      encouragement_id: "enc_002",
      text: "Excellent progress!",
      audio_uuid: "audio-uuid-here",
      type: "celebratory",
      weight: 2
    },
    // ... more
  ],

  insertion_point: 'end_of_session',
  pause_before: 2000,
  pause_after: 1500,

  voice: "azure_en_US_JennyNeural",
  cadence: "natural"
};
```

---

## ETER Schedule System

### Mathematical Model

The ETER system is based on spaced repetition research (Ebbinghaus, Leitner, SuperMemo).

#### Exponential Decay
```
cycles(n) = base_cycles * (decay_rate ^ n)

Where:
  n = offset (sessions ago)
  base_cycles = initial cycle count (e.g., 3 for N-1)
  decay_rate = rate of decay (< 1.0)

Example with decay_rate = 0.5:
  N-1: 3 * (0.5^0) = 3 cycles
  N-2: 3 * (0.5^1) = 1.5 → 2 cycles (rounded)
  N-4: 3 * (0.5^2) = 0.75 → 1 cycle (minimum)
  N-8: 3 * (0.5^3) = 0.375 → 1 cycle (minimum)
```

#### Linear Decay
```
cycles(n) = max(base_cycles - (decay_rate * n), min_cycles)

Example with decay_rate = 0.5:
  N-1: max(3 - (0.5*1), 1) = 2.5 → 3 cycles (rounded)
  N-2: max(3 - (0.5*2), 1) = 2 cycles
  N-3: max(3 - (0.5*3), 1) = 1.5 → 2 cycles
  N-5: max(3 - (0.5*5), 1) = 0.5 → 1 cycle (minimum)
```

#### Fibonacci-Based (Custom)
```
Offsets follow Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21, 34...
Cycles decrease as: 3, 2, 2, 1, 1, 1, 1...

This creates natural spacing that matches memory consolidation.
```

### Schedule Experimentation

To experiment with different schedules, modify the `eter_schedule` parameter:

```typescript
// Example: Aggressive early review, then rapid decay
const experimentalSchedule: Array<EterScheduleEntry> = [
  { offset: 1, cycles: 5 },  // Lots of immediate review
  { offset: 2, cycles: 3 },
  { offset: 4, cycles: 1 },  // Then drop off quickly
  { offset: 8, cycles: 1 },
  { offset: 16, cycles: 1 },
];

// Example: Gentle, sustained review
const gentleSchedule: Array<EterScheduleEntry> = [
  { offset: 1, cycles: 2 },
  { offset: 2, cycles: 2 },
  { offset: 3, cycles: 2 },
  { offset: 5, cycles: 1 },
  { offset: 7, cycles: 1 },
  { offset: 10, cycles: 1 },
  { offset: 15, cycles: 1 },
];
```

### A/B Testing ETER Schedules

```typescript
interface EterExperiment {
  experiment_id: string;
  name: string;
  description: string;

  // Cohorts
  cohorts: Array<{
    cohort_id: string;
    name: string;
    weight: number;  // % of learners in this cohort
    schedule: Array<EterScheduleEntry>;
  }>;

  // Metrics to track
  metrics: Array<'retention_rate' | 'completion_time' | 'error_rate' | 'learner_satisfaction'>;

  // Duration
  start_date: string;
  end_date: string;
}

// Example experiment
const eterExperiment: EterExperiment = {
  experiment_id: "exp_eter_001",
  name: "Intensive vs Relaxed ETER",
  description: "Compare intensive early review with relaxed spacing",

  cohorts: [
    {
      cohort_id: "control",
      name: "Standard Schedule",
      weight: 0.33,
      schedule: DEFAULT_ETER_SCHEDULES.standard
    },
    {
      cohort_id: "intensive",
      name: "Intensive Review",
      weight: 0.33,
      schedule: DEFAULT_ETER_SCHEDULES.intensive
    },
    {
      cohort_id: "relaxed",
      name: "Relaxed Review",
      weight: 0.34,
      schedule: DEFAULT_ETER_SCHEDULES.relaxed
    }
  ],

  metrics: ['retention_rate', 'completion_time', 'error_rate'],
  start_date: "2026-01-01",
  end_date: "2026-03-31"
};
```

---

## JSON Schema Examples

### Example 1: Complete Session Configuration

```json
{
  "session_id": "S0042",
  "session_index": 41,
  "lego_id": "S0042L01",
  "lego_type": "BASE",

  "parameters": {
    "parameter_set_id": "spa_for_eng_standard_v1",
    "version": "1.0.0",

    "introduction": {
      "voice": "azure_en_US_JennyNeural",
      "pace": "natural",
      "target_repetitions": 2,
      "pause_before_target": 500,
      "pause_between_targets": 800,
      "pause_after_intro": 1000,
      "enable_example_sentence": true,
      "example_sentence_pause": 1200
    },

    "practice": {
      "components": {
        "component_cycles": 1,
        "component_pause": 800,
        "component_voice_target": "azure_es_ES_ElviraNeural",
        "component_voice_known": "azure_en_US_JennyNeural",
        "enable_feeder_introduction": false
      },

      "debut": {
        "debut_repetitions": 2,
        "debut_pace": "slow",
        "debut_pause": 1000,
        "debut_voice_target": "azure_es_ES_ElviraNeural",
        "debut_voice_known": "azure_en_US_JennyNeural",
        "debut_cadence_target": "slow",
        "debut_cadence_known": "natural"
      },

      "debu": {
        "debu_count": 7,
        "debu_cycle_pause": 1500,
        "debu_response_pause": 2000,
        "debu_voice_target": "azure_es_ES_ElviraNeural",
        "debu_voice_known": "azure_en_US_JennyNeural",
        "debu_cadence_target": "slow",
        "debu_cadence_known": "natural",
        "selection_strategy": "difficulty_curve",
        "difficulty_curve": [3, 4, 5, 6, 7, 6, 5]
      }
    },

    "eter": {
      "schedule": [
        { "offset": 1, "cycles": 3 },
        { "offset": 2, "cycles": 1 },
        { "offset": 3, "cycles": 1 },
        { "offset": 5, "cycles": 1 },
        { "offset": 8, "cycles": 1 },
        { "offset": 13, "cycles": 1 }
      ],
      "decay_function": "exponential",
      "decay_rate": 1.0,
      "max_lookback": 50,
      "min_cycles": 1,
      "max_cycles": 5,
      "cycle_pause": 1000,
      "response_pause": 2000,
      "voice_target": "azure_es_ES_ElviraNeural",
      "voice_known": "azure_en_US_JennyNeural",
      "cadence_target": "natural",
      "cadence_known": "natural",
      "adaptive_schedule": false
    },

    "encouragement": {
      "enabled": true,
      "frequency": 5,
      "pool_type": "weighted",
      "pool": [
        {
          "encouragement_id": "enc_001",
          "text": "You're doing great! Keep going!",
          "audio_uuid": "uuid-here",
          "type": "motivational",
          "weight": 3
        }
      ],
      "insertion_point": "end_of_session",
      "pause_before": 2000,
      "pause_after": 1500,
      "voice": "azure_en_US_JennyNeural",
      "cadence": "natural",
      "performance_triggered": false
    }
  },

  "context": {
    "seed_sentence": {
      "target": "Yo quiero aprender español",
      "known": "I want to learn Spanish"
    },
    "previous_legos": [
      {
        "lego_id": "S0041L01",
        "lego_text_target": "necesito",
        "lego_text_known": "I need",
        "sessions_ago": 1
      }
    ],
    "course_progress": {
      "sessions_completed": 41,
      "total_sessions": 668,
      "legos_learned": 42,
      "total_legos": 850
    }
  }
}
```

### Example 2: Course-Level Parameter Defaults

```json
{
  "course_code": "spa_for_eng",
  "parameter_version": "1.0.0",
  "language_pair": {
    "target": "spa",
    "known": "eng"
  },

  "default_parameters": {
    "introduction": {
      "voice": "azure_en_US_JennyNeural",
      "pace": "natural",
      "target_repetitions": 2,
      "pause_before_target": 500,
      "pause_between_targets": 800,
      "pause_after_intro": 1000
    },

    "practice": {
      "debu_count": 7,
      "debut_repetitions": 2
    },

    "eter": {
      "schedule_preset": "standard",
      "decay_rate": 1.0
    },

    "encouragement": {
      "enabled": true,
      "frequency": 5
    }
  },

  "voices": {
    "target1": "azure_es_ES_ElviraNeural",
    "target2": "azure_es_ES_AlvaroNeural",
    "source": "azure_en_US_JennyNeural",
    "presentation": "azure_en_US_JennyNeural",
    "encouragement": "azure_en_US_JennyNeural"
  },

  "session_overrides": {
    "S0100": {
      "reason": "Milestone session - extra encouragement",
      "encouragement": {
        "enabled": true,
        "pool": ["milestone_100"]
      }
    },
    "S0250": {
      "reason": "Difficult LEGO - extra practice",
      "debu_count": 10
    }
  }
}
```

### Example 3: Learner-Specific Adaptations

```json
{
  "learner_id": "learner_12345",
  "course_code": "spa_for_eng",
  "adaptations_version": "1.0.0",

  "performance_metrics": {
    "overall_accuracy": 0.87,
    "recent_accuracy": 0.92,
    "completion_rate": 0.95,
    "struggle_legos": ["S0042L01", "S0067L02"]
  },

  "adaptive_parameters": {
    "eter": {
      "schedule": [
        { "offset": 1, "cycles": 2 },  // Reduced from 3 (high performance)
        { "offset": 2, "cycles": 1 },
        { "offset": 4, "cycles": 1 },  // Skipped N-3 (accelerated)
        { "offset": 7, "cycles": 1 }
      ],
      "reason": "Learner performing above 90% accuracy - accelerated review"
    },

    "encouragement": {
      "frequency": 10,  // Less frequent (learner confident)
      "pool_type": "celebratory"  // Focus on celebration
    }
  },

  "lego_specific_overrides": {
    "S0042L01": {
      "debu_count": 10,  // Extra practice for struggle LEGO
      "eter_boost": 2,   // More ETER cycles for this LEGO
      "reason": "Learner struggling with this LEGO"
    }
  }
}
```

---

## Session Configuration Examples

### Example 1: Standard Spanish Course

```typescript
const spanishCourseConfig: SessionParameters = {
  parameter_set_id: "spa_for_eng_standard",
  version: "1.0.0",

  introduction: {
    voice: "azure_en_US_JennyNeural",
    pace: "natural",
    target_repetitions: 2,
    pause_before_target: 500,
    pause_between_targets: 800,
    pause_after_intro: 1000,
    enable_example_sentence: true,
    example_sentence_pause: 1200
  },

  practice: {
    components: {
      component_cycles: 1,
      component_pause: 800,
      component_voice_target: "azure_es_ES_ElviraNeural",
      component_voice_known: "azure_en_US_JennyNeural",
      enable_feeder_introduction: false
    },
    debut: {
      debut_repetitions: 2,
      debut_pace: "slow",
      debut_pause: 1000,
      debut_voice_target: "azure_es_ES_ElviraNeural",
      debut_voice_known: "azure_en_US_JennyNeural",
      debut_cadence_target: "slow",
      debut_cadence_known: "natural"
    },
    debu: {
      debu_count: 7,
      debu_cycle_pause: 1500,
      debu_response_pause: 2000,
      debu_voice_target: "azure_es_ES_ElviraNeural",
      debu_voice_known: "azure_en_US_JennyNeural",
      debu_cadence_target: "slow",
      debu_cadence_known: "natural",
      selection_strategy: "difficulty_curve",
      difficulty_curve: [3, 4, 5, 6, 7, 6, 5]
    }
  },

  eter: {
    schedule: DEFAULT_ETER_SCHEDULES.standard,
    decay_function: "exponential",
    decay_rate: 1.0,
    max_lookback: 50,
    min_cycles: 1,
    max_cycles: 5,
    cycle_pause: 1000,
    response_pause: 2000,
    voice_target: "azure_es_ES_ElviraNeural",
    voice_known: "azure_en_US_JennyNeural",
    cadence_target: "natural",
    cadence_known: "natural",
    adaptive_schedule: false
  },

  encouragement: {
    enabled: true,
    frequency: 5,
    pool_type: "weighted",
    pool: STANDARD_ENCOURAGEMENTS,
    insertion_point: "end_of_session",
    pause_before: 2000,
    pause_after: 1500,
    voice: "azure_en_US_JennyNeural",
    cadence: "natural",
    performance_triggered: false
  }
};
```

### Example 2: Intensive Mandarin Course

```typescript
const mandarinIntensiveConfig: SessionParameters = {
  parameter_set_id: "cmn_for_eng_intensive",
  version: "1.0.0",

  introduction: {
    voice: "azure_en_US_JennyNeural",
    pace: "slow",  // Slower for tonal language
    target_repetitions: 3,  // Extra repetitions
    pause_before_target: 800,  // Longer pauses
    pause_between_targets: 1200,
    pause_after_intro: 1500,
    enable_example_sentence: true,
    example_sentence_pause: 1500
  },

  practice: {
    components: {
      component_cycles: 2,  // More practice on components
      component_pause: 1200,
      component_voice_target: "azure_zh_CN_XiaoxiaoNeural",
      component_voice_known: "azure_en_US_JennyNeural",
      enable_feeder_introduction: true
    },
    debut: {
      debut_repetitions: 3,  // Extra debut cycles
      debut_pace: "slow",
      debut_pause: 1500,
      debut_voice_target: "azure_zh_CN_XiaoxiaoNeural",
      debut_voice_known: "azure_en_US_JennyNeural",
      debut_cadence_target: "slow",
      debut_cadence_known: "natural"
    },
    debu: {
      debu_count: 10,  // More DEBU phrases
      debu_cycle_pause: 2000,
      debu_response_pause: 3000,  // More time to respond
      debu_voice_target: "azure_zh_CN_XiaoxiaoNeural",
      debu_voice_known: "azure_en_US_JennyNeural",
      debu_cadence_target: "slow",
      debu_cadence_known: "natural",
      selection_strategy: "difficulty_curve",
      difficulty_curve: [2, 3, 4, 5, 6, 7, 8, 7, 6, 5]
    }
  },

  eter: {
    schedule: DEFAULT_ETER_SCHEDULES.intensive,  // More frequent review
    decay_function: "linear",
    decay_rate: 1.2,
    max_lookback: 50,
    min_cycles: 1,
    max_cycles: 5,
    cycle_pause: 1500,
    response_pause: 3000,
    voice_target: "azure_zh_CN_XiaoxiaoNeural",
    voice_known: "azure_en_US_JennyNeural",
    cadence_target: "slow",  // Keep slow for longer
    cadence_known: "natural",
    adaptive_schedule: false
  },

  encouragement: {
    enabled: true,
    frequency: 3,  // More frequent encouragement
    pool_type: "weighted",
    pool: MANDARIN_ENCOURAGEMENTS,
    insertion_point: "end_of_session",
    pause_before: 2000,
    pause_after: 1500,
    voice: "azure_en_US_JennyNeural",
    cadence: "natural",
    performance_triggered: true,
    success_threshold: 0.85,
    struggle_threshold: 0.60
  }
};
```

### Example 3: Relaxed Welsh Course

```typescript
const welshRelaxedConfig: SessionParameters = {
  parameter_set_id: "cym_for_eng_relaxed",
  version: "1.0.0",

  introduction: {
    voice: "azure_en_GB_RyanNeural",
    pace: "natural",
    target_repetitions: 2,
    pause_before_target: 400,
    pause_between_targets: 600,
    pause_after_intro: 800,
    enable_example_sentence: true,
    example_sentence_pause: 1000
  },

  practice: {
    components: {
      component_cycles: 1,
      component_pause: 600,
      component_voice_target: "azure_cy_GB_NiaNeural",
      component_voice_known: "azure_en_GB_RyanNeural",
      enable_feeder_introduction: false
    },
    debut: {
      debut_repetitions: 2,
      debut_pace: "slow",
      debut_pause: 800,
      debut_voice_target: "azure_cy_GB_NiaNeural",
      debut_voice_known: "azure_en_GB_RyanNeural",
      debut_cadence_target: "slow",
      debut_cadence_known: "natural"
    },
    debu: {
      debu_count: 5,  // Fewer DEBU phrases
      debu_cycle_pause: 1200,
      debu_response_pause: 1800,
      debu_voice_target: "azure_cy_GB_NiaNeural",
      debu_voice_known: "azure_en_GB_RyanNeural",
      debu_cadence_target: "slow",
      debu_cadence_known: "natural",
      selection_strategy: "sequential",  // Simple sequential
      difficulty_curve: null
    }
  },

  eter: {
    schedule: DEFAULT_ETER_SCHEDULES.relaxed,  // Less frequent review
    decay_function: "exponential",
    decay_rate: 0.8,
    max_lookback: 30,  // Shorter lookback
    min_cycles: 1,
    max_cycles: 3,  // Fewer max cycles
    cycle_pause: 800,
    response_pause: 1500,
    voice_target: "azure_cy_GB_NiaNeural",
    voice_known: "azure_en_GB_RyanNeural",
    cadence_target: "natural",
    cadence_known: "natural",
    adaptive_schedule: false
  },

  encouragement: {
    enabled: true,
    frequency: 8,  // Less frequent
    pool_type: "sequential",
    pool: WELSH_ENCOURAGEMENTS,
    insertion_point: "end_of_session",
    pause_before: 1500,
    pause_after: 1000,
    voice: "azure_en_GB_RyanNeural",
    cadence: "natural",
    performance_triggered: false
  }
};
```

---

## A/B Testing Framework

### Test Configuration

```typescript
interface ABTest {
  test_id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';

  // Test parameters
  start_date: string;
  end_date: string;
  target_sample_size: number;

  // Variants
  variants: Array<{
    variant_id: string;
    name: string;
    description: string;
    weight: number;  // Traffic allocation (0-1)
    parameters: Partial<SessionParameters>;
  }>;

  // Success metrics
  primary_metric: MetricDefinition;
  secondary_metrics: Array<MetricDefinition>;

  // Learner targeting
  targeting: {
    include_new_learners: boolean;
    include_returning_learners: boolean;
    language_pairs?: Array<string>;
    min_session_count?: number;
  };
}

interface MetricDefinition {
  metric_id: string;
  name: string;
  type: 'retention_rate' | 'completion_time' | 'error_rate' | 'session_duration' | 'learner_satisfaction';
  goal: 'increase' | 'decrease';
  baseline_value?: number;
  target_value?: number;
}
```

### Example A/B Test: ETER Schedule Comparison

```typescript
const eterScheduleTest: ABTest = {
  test_id: "ab_eter_001",
  name: "ETER Schedule Optimization",
  description: "Compare standard, intensive, and relaxed ETER schedules",
  status: "active",

  start_date: "2026-01-01",
  end_date: "2026-03-31",
  target_sample_size: 3000,

  variants: [
    {
      variant_id: "control",
      name: "Standard ETER",
      description: "Current default schedule",
      weight: 0.33,
      parameters: {
        eter: {
          schedule: DEFAULT_ETER_SCHEDULES.standard,
          decay_rate: 1.0
        }
      }
    },
    {
      variant_id: "intensive",
      name: "Intensive ETER",
      description: "More frequent early review",
      weight: 0.33,
      parameters: {
        eter: {
          schedule: DEFAULT_ETER_SCHEDULES.intensive,
          decay_rate: 1.2
        }
      }
    },
    {
      variant_id: "relaxed",
      name: "Relaxed ETER",
      description: "Less frequent review",
      weight: 0.34,
      parameters: {
        eter: {
          schedule: DEFAULT_ETER_SCHEDULES.relaxed,
          decay_rate: 0.8
        }
      }
    }
  ],

  primary_metric: {
    metric_id: "retention_30_day",
    name: "30-Day Retention Rate",
    type: "retention_rate",
    goal: "increase",
    baseline_value: 0.72,
    target_value: 0.80
  },

  secondary_metrics: [
    {
      metric_id: "avg_completion_time",
      name: "Average Session Completion Time",
      type: "session_duration",
      goal: "decrease",
      baseline_value: 1800,  // 30 minutes
      target_value: 1500     // 25 minutes
    },
    {
      metric_id: "error_rate",
      name: "Error Rate",
      type: "error_rate",
      goal: "decrease",
      baseline_value: 0.15,
      target_value: 0.10
    }
  ],

  targeting: {
    include_new_learners: true,
    include_returning_learners: false,
    min_session_count: 0
  }
};
```

### Example A/B Test: DEBU Count Optimization

```typescript
const debuCountTest: ABTest = {
  test_id: "ab_debu_001",
  name: "DEBU Phrase Count Optimization",
  description: "Test if 5, 7, or 10 DEBU phrases is optimal",
  status: "draft",

  start_date: "2026-02-01",
  end_date: "2026-04-30",
  target_sample_size: 2000,

  variants: [
    {
      variant_id: "control",
      name: "7 DEBU Phrases",
      description: "Current default",
      weight: 0.33,
      parameters: {
        practice: {
          debu: {
            debu_count: 7
          }
        }
      }
    },
    {
      variant_id: "fewer",
      name: "5 DEBU Phrases",
      description: "Fewer phrases, faster completion",
      weight: 0.33,
      parameters: {
        practice: {
          debu: {
            debu_count: 5
          }
        }
      }
    },
    {
      variant_id: "more",
      name: "10 DEBU Phrases",
      description: "More practice, better retention?",
      weight: 0.34,
      parameters: {
        practice: {
          debu: {
            debu_count: 10
          }
        }
      }
    }
  ],

  primary_metric: {
    metric_id: "lego_retention_7_day",
    name: "LEGO Retention After 7 Days",
    type: "retention_rate",
    goal: "increase",
    baseline_value: 0.85,
    target_value: 0.90
  },

  secondary_metrics: [
    {
      metric_id: "session_completion_rate",
      name: "Session Completion Rate",
      type: "completion_time",
      goal: "increase",
      baseline_value: 0.92,
      target_value: 0.95
    }
  ],

  targeting: {
    include_new_learners: true,
    include_returning_learners: true
  }
};
```

### Analysis Framework

```typescript
interface ABTestResults {
  test_id: string;
  analysis_date: string;
  sample_size: number;

  variant_results: Array<{
    variant_id: string;
    learner_count: number;

    // Primary metric
    primary_metric_value: number;
    primary_metric_confidence: number;  // 0-1 (e.g., 0.95 for 95% confidence)

    // Secondary metrics
    secondary_metric_values: Record<string, number>;

    // Statistical significance
    is_significant: boolean;
    p_value: number;
  }>;

  // Winner
  winning_variant?: string;
  recommendation: 'adopt' | 'reject' | 'continue_testing';
  notes: string;
}
```

---

## Manifest Integration

### How Sessions Map to Manifest Structure

The manifest is compiled from LEGO Sessions in Phase 9. Here's how the mapping works:

```typescript
/**
 * Compile LEGO Sessions into course manifest
 */
function compileSessionsToManifest(
  sessions: Array<LegoSession>,
  courseMetadata: CourseMetadata,
  audioRegistry: AudioRegistry
): CourseManifest {
  // Group sessions into slices (lessons)
  const slices = groupSessionsIntoSlices(sessions, SESSIONS_PER_SLICE);

  return {
    id: courseMetadata.course_code,
    version: courseMetadata.version,
    target: courseMetadata.target_language,
    known: courseMetadata.known_language,

    introduction: {
      id: audioRegistry.getWelcomeAudioUuid(),
      cadence: "natural",
      role: "presentation",
      duration: 0  // Populated by audio system
    },

    slices: slices.map(slice => compileSlice(slice, audioRegistry))
  };
}

/**
 * Compile a slice (group of sessions) into manifest format
 */
function compileSlice(
  sessionsInSlice: Array<LegoSession>,
  audioRegistry: AudioRegistry
): ManifestSlice {
  const seeds = sessionsInSlice.map(session => compileSeed(session, audioRegistry));
  const samples = collectAllSamples(sessionsInSlice, audioRegistry);

  return {
    id: generateSliceUuid(),
    version: "1.0",
    seeds: seeds,
    samples: samples,
    pooledEncouragements: [],  // Populated separately
    orderedEncouragements: []
  };
}

/**
 * Compile a session into a manifest seed
 */
function compileSeed(
  session: LegoSession,
  audioRegistry: AudioRegistry
): ManifestSeed {
  return {
    id: generateSeedUuid(),
    node: {
      id: generateNodeUuid(),
      known: {
        text: session.context.seed_sentence.known,
        tokens: tokenize(session.context.seed_sentence.known),
        lemmas: lemmatize(session.context.seed_sentence.known)
      },
      target: {
        text: session.context.seed_sentence.target,
        tokens: tokenize(session.context.seed_sentence.target),
        lemmas: lemmatize(session.context.seed_sentence.target)
      }
    },
    seed_sentence: {
      canonical: session.context.seed_sentence.known
    },
    introduction_items: compileIntroductionItems(session)
  };
}

/**
 * Compile introduction items (LEGOs) from session
 */
function compileIntroductionItems(session: LegoSession): Array<ManifestIntroductionItem> {
  const items: Array<ManifestIntroductionItem> = [];

  // Main LEGO introduction
  items.push({
    id: generateUuid(),
    node: {
      known: { text: session.introduction.script.variables.known_lego, ... },
      target: { text: session.introduction.script.variables.target_lego, ... }
    },
    presentation: session.introduction.script.template,
    nodes: []  // Practice nodes compiled from practice component
  });

  return items;
}

/**
 * Collect all audio samples referenced in sessions
 */
function collectAllSamples(
  sessions: Array<LegoSession>,
  audioRegistry: AudioRegistry
): ManifestSamples {
  const samples: ManifestSamples = {};

  for (const session of sessions) {
    // Introduction samples
    for (const item of session.introduction.items) {
      addSample(samples, item.text, {
        id: item.audio_uuid,
        cadence: item.cadence,
        role: item.role,
        duration: audioRegistry.getDuration(item.audio_uuid)
      });
    }

    // Practice samples (debut, DEBU, components)
    // ...

    // ETER samples
    // ...
  }

  return samples;
}
```

### Manifest Sample Format

```json
{
  "samples": {
    "I want to learn": [
      {
        "id": "audio-uuid-source",
        "cadence": "natural",
        "role": "source",
        "duration": 1.2
      }
    ],
    "quiero aprender": [
      {
        "id": "audio-uuid-target-slow",
        "cadence": "slow",
        "role": "target1",
        "duration": 2.1
      },
      {
        "id": "audio-uuid-target-natural",
        "cadence": "natural",
        "role": "target1",
        "duration": 1.5
      }
    ]
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Session Structure (Week 1-2)
- [ ] Define TypeScript interfaces
- [ ] Implement session builder
- [ ] Create parameter resolution system
- [ ] Build ETER schedule engine
- [ ] Write validation functions

### Phase 2: Parameter Configuration (Week 3)
- [ ] Create course-level parameter files
- [ ] Implement parameter hierarchy
- [ ] Build override system
- [ ] Add parameter validation
- [ ] Document parameter tuning

### Phase 3: Session Compilation (Week 4)
- [ ] Implement session-to-manifest compiler
- [ ] Integrate with Phase 9 manifest compilation
- [ ] Add audio UUID resolution
- [ ] Test with real course data
- [ ] Validate output against schema

### Phase 4: Encouragement System (Week 5)
- [ ] Build encouragement pool manager
- [ ] Implement insertion logic
- [ ] Add performance-triggered encouragements
- [ ] Create encouragement library
- [ ] Test encouragement timing

### Phase 5: A/B Testing Framework (Week 6)
- [ ] Design A/B test configuration
- [ ] Implement variant assignment
- [ ] Add metric tracking
- [ ] Build analysis dashboard
- [ ] Document testing workflow

### Phase 6: Adaptive System (Week 7-8)
- [ ] Design adaptation engine
- [ ] Implement performance tracking
- [ ] Build adaptive ETER scheduler
- [ ] Add learner-specific overrides
- [ ] Test adaptation logic

### Phase 7: Production Integration (Week 9-10)
- [ ] Integrate with course production suite
- [ ] Add session preview functionality
- [ ] Build parameter configuration UI
- [ ] Create course creator documentation
- [ ] Production testing and deployment

---

## Validation & Quality Assurance

### Session Validation Rules

```typescript
function validateLegoSession(session: LegoSession): Array<ValidationError> {
  const errors: Array<ValidationError> = [];

  // 1. Introduction validation
  if (session.introduction.parameters.target_repetitions < 1) {
    errors.push({
      severity: "error",
      message: "target_repetitions must be at least 1",
      path: "introduction.parameters.target_repetitions"
    });
  }

  // 2. DEBU count validation
  if (session.practice.debu_phrases.debu_count < 1) {
    errors.push({
      severity: "error",
      message: "debu_count must be at least 1",
      path: "practice.debu_phrases.debu_count"
    });
  }

  // 3. ETER schedule validation
  const eterSchedule = session.spaced_review.parameters.schedule;
  if (eterSchedule.length === 0) {
    errors.push({
      severity: "warning",
      message: "ETER schedule is empty - no spaced review will occur",
      path: "spaced_review.parameters.schedule"
    });
  }

  // Check offsets are in ascending order
  for (let i = 1; i < eterSchedule.length; i++) {
    if (eterSchedule[i].offset <= eterSchedule[i-1].offset) {
      errors.push({
        severity: "error",
        message: "ETER schedule offsets must be in ascending order",
        path: `spaced_review.parameters.schedule[${i}]`
      });
    }
  }

  // 4. Audio UUID validation
  const allAudioUuids = collectAllAudioUuids(session);
  for (const uuid of allAudioUuids) {
    if (!isValidUuid(uuid)) {
      errors.push({
        severity: "error",
        message: `Invalid audio UUID: ${uuid}`,
        path: "audio_references"
      });
    }
  }

  // 5. Parameter bounds checking
  if (session.parameters.eter.max_cycles < session.parameters.eter.min_cycles) {
    errors.push({
      severity: "error",
      message: "max_cycles cannot be less than min_cycles",
      path: "parameters.eter"
    });
  }

  return errors;
}
```

### Parameter Validation

```typescript
function validateParameters(params: SessionParameters): Array<ValidationError> {
  const errors: Array<ValidationError> = [];

  // Timing parameters must be positive
  const timingParams = [
    'pause_before_target',
    'pause_between_targets',
    'pause_after_intro',
    'component_pause',
    'debut_pause',
    'debu_cycle_pause',
    'debu_response_pause',
    'eter_cycle_pause',
    'eter_response_pause'
  ];

  for (const param of timingParams) {
    const value = getNestedValue(params, param);
    if (value !== undefined && value < 0) {
      errors.push({
        severity: "error",
        message: `${param} must be non-negative`,
        path: param
      });
    }
  }

  // Counts must be positive integers
  const countParams = [
    'target_repetitions',
    'component_cycles',
    'debut_repetitions',
    'debu_count'
  ];

  for (const param of countParams) {
    const value = getNestedValue(params, param);
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      errors.push({
        severity: "error",
        message: `${param} must be a positive integer`,
        path: param
      });
    }
  }

  return errors;
}
```

---

## Conclusion

This specification defines the complete LEGO Session structure for SSi language courses. By parameterizing every aspect of the learning experience, we enable:

1. **Consistent quality** across all language pairs
2. **Scientific experimentation** with pedagogical approaches
3. **Future-proofing** for non-expert course creators
4. **Adaptive learning** based on individual performance
5. **Data-driven optimization** through A/B testing

**Key Takeaways**:

- **Sessions are atomic** - natural boundaries for encouragements and progress tracking
- **Everything is a parameter** - no hard-coded values
- **ETER is configurable** - experiment with different spacing schedules
- **Hierarchy matters** - parameters cascade from system → language → course → session → learner
- **A/B testing built-in** - scientific approach to course optimization

This specification serves as the foundation for the Session Assembly Engine (Phase 9) and the learner delivery system (ssi-learning-app).

---

**Version**: 1.0.0
**Created**: 2025-12-05
**Author**: Claude (Anthropic)
**Project**: SSi Dashboard v7 - Course Creation Suite
**Related Documents**:
- `COURSE_CREATION_MASTER_OVERVIEW.md` - Big picture overview
- `VOICE_CONFIGURATION_SPEC.md` - Voice configuration interface (to be created)
- `ADAPTATIONS_SPECIFICATION.md` - Adaptive learning engine (to be created)
- `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - QA workflow
