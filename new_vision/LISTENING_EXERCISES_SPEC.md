# Listening Exercises System Specification

**Version**: 1.0.0
**Date**: 2025-12-05
**Status**: Design Specification
**System**: SSi Dashboard v7 - Course Creation Suite

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Purpose and Philosophy](#purpose-and-philosophy)
3. [Exercise Type Specifications](#exercise-type-specifications)
4. [Data Architecture](#data-architecture)
5. [Integration Points](#integration-points)
6. [Exercise Generation](#exercise-generation)
7. [Difficulty Progression](#difficulty-progression)
8. [Scoring and Feedback](#scoring-and-feedback)
9. [Mobile-First Design](#mobile-first-design)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The **Listening Exercises System** provides comprehension practice without requiring learners to speak. This complements the main SSi speaking-focused method by reinforcing recognition, understanding, and recall through diverse interactive exercise types.

**Key Principles:**
- Use existing course audio (no additional recording needed)
- Source content from `lego_baskets.json` and `course_manifest.json`
- Parameterized generation for experimentation
- Mobile-friendly interaction patterns
- Insertable between LEGO sessions or standalone

---

## Purpose and Philosophy

### Why Listening Exercises?

The SSi method is primarily **speaking-focused** - learners hear a prompt and respond verbally. Listening exercises complement this by:

1. **Recognition Practice** - Distinguish between similar phrases
2. **Comprehension Check** - Verify understanding of meaning
3. **Passive Review** - Reinforce learning in low-cognitive-load mode
4. **Confidence Building** - Success before speaking reduces anxiety
5. **Flexible Practice** - Practice in contexts where speaking isn't possible (public transport, quiet environments)

### Design Philosophy

**"Audio-First, Always"**
- All exercises use existing audio from the Master Audio Registry (Supabase)
- No additional recording required
- Reuse audio from LEGO baskets and practice phrases

**"Parameterized Everything"**
- Exercise difficulty is adjustable
- Question types are configurable
- Insertion frequency is controllable
- Supports A/B testing and personalization

**"Mobile-Native Interactions"**
- Tap to play audio
- Swipe to reorder
- Drag and drop for sequencing
- Large touch targets

---

## Exercise Type Specifications

### 1. Recognition Exercise

**Format:** "Which phrase means X?"

**Presentation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING EXERCISE: Recognition                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Question: Which phrase means "I want to learn"?                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  A) [▶️] Quiero aprender                                │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  B) [▶️] Quiero hablar                                  │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  C) [▶️] Quiero ir                                      │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Replay All]                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**
```typescript
interface RecognitionExercise {
  type: 'recognition';
  id: string;                      // Unique exercise ID

  // Question
  question: {
    text: string;                  // "Which phrase means 'I want to learn'?"
    language: 'known' | 'target';  // Language of question text
  };

  // Options (3-4 options)
  options: Array<{
    id: string;                    // option-a, option-b, option-c
    audio_uuid: string;            // UUID from audio_samples table
    text_hidden: boolean;          // Hide text until after answer?
    is_correct: boolean;
  }>;

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;              // S0042 (if sourced from seed)
    lego_id?: string;              // S0042L01 (if sourced from LEGO)
    basket_index?: number;         // Position in basket
  };

  // Audio playback
  playback: {
    autoplay_options: boolean;     // Play all options on load?
    replay_limit?: number;         // Limit replays? (null = unlimited)
  };
}
```

**Generation Strategy:**
```typescript
function generateRecognitionExercise(
  correctPhrase: BasketPhrase,
  distractors: BasketPhrase[],
  params: RecognitionParams
): RecognitionExercise {
  // 1. Select 2-3 distractors (similar LEGOs or patterns)
  // 2. Shuffle correct + distractors
  // 3. Create question from known language phrase
  // 4. Return exercise structure
}

interface RecognitionParams {
  numOptions: number;              // 3 or 4
  distractorStrategy: 'similar_legos' | 'random_from_basket' | 'confusable_patterns';
  showTextAfterAnswer: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

### 2. Ordering Exercise

**Format:** "Put these phrases in order"

**Presentation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING EXERCISE: Ordering                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Listen and put these phrases in the order you hear them:       │
│                                                                  │
│  [▶️ Play Full Sequence]                                        │
│                                                                  │
│  YOUR ANSWER:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Drag items here]                                       │   │
│  │                                                           │   │
│  │  (Empty - drag from below)                               │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CHOICES:                                                        │
│  ┌───────────────────────────┐  ┌───────────────────────────┐  │
│  │ [▶️] Quiero ir             │  │ [▶️] Quiero hablar        │  │
│  │ 👆 Drag to reorder         │  │ 👆 Drag to reorder        │  │
│  └───────────────────────────┘  └───────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────┐                                  │
│  │ [▶️] Quiero aprender       │                                 │
│  │ 👆 Drag to reorder         │                                 │
│  └───────────────────────────┘                                  │
│                                                                  │
│  [Check Answer]                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**
```typescript
interface OrderingExercise {
  type: 'ordering';
  id: string;

  // Sequence
  sequence: {
    audio_uuid: string;            // UUID of concatenated sequence (or play individually)
    correct_order: string[];       // Array of option IDs in correct order
  };

  // Options (shuffled for learner)
  options: Array<{
    id: string;
    audio_uuid: string;
    text_hidden: boolean;
  }>;

  // Instructions
  instruction: string;             // "Put these phrases in the order you hear them"

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;
    basket_index?: number;
  };

  // Interaction
  interaction: {
    allow_replay_individual: boolean;  // Can replay each option separately?
    allow_replay_full: boolean;        // Can replay full sequence?
    show_numbers: boolean;             // Show position numbers (1, 2, 3)?
  };
}
```

**Generation Strategy:**
```typescript
function generateOrderingExercise(
  phrases: BasketPhrase[],
  params: OrderingParams
): OrderingExercise {
  // 1. Select 3-5 phrases from basket (sequential practice items)
  // 2. Record correct order
  // 3. Shuffle for presentation
  // 4. Optionally concatenate audio or use individual clips
}

interface OrderingParams {
  numPhrases: number;              // 3-5
  useSequentialFromBasket: boolean; // Take consecutive items?
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

### 3. Fill-in Exercise

**Format:** "What word is missing?"

**Presentation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING EXERCISE: Fill in the Blank                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Listen to the phrase. What word is missing?                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [▶️] Quiero ___ español                                │   │
│  │       (You will hear: "Quiero ... español")              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  SELECT THE MISSING WORD:                                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ [▶️] hablar  │  │ [▶️] aprender│  │ [▶️] ir      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  OR TYPE IT:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [____________________________________________]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Check Answer]                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**
```typescript
interface FillInExercise {
  type: 'fill_in';
  id: string;

  // The complete phrase
  complete_phrase: {
    target: string;                // "Quiero aprender español"
    known: string;                 // "I want to learn Spanish"
    audio_uuid: string;            // Full phrase audio
  };

  // The gap
  gap: {
    position: number;              // Word index (0-based)
    word: string;                  // "aprender"
    audio_uuid: string;            // Audio of just this word
  };

  // The phrase with gap (for audio playback)
  gapped_audio: {
    before_uuid?: string;          // "Quiero"
    gap_silence_ms: number;        // 500ms silence
    after_uuid?: string;           // "español"
  };

  // Answer options (if multiple choice)
  options?: Array<{
    id: string;
    word: string;
    audio_uuid: string;
    is_correct: boolean;
  }>;

  // Typed answer acceptance
  accept_typed: boolean;
  typed_answer_config?: {
    case_sensitive: boolean;
    accept_variations: string[];   // ["aprender", "Aprender"]
  };

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;
    lego_id?: string;
  };
}
```

**Generation Strategy:**
```typescript
function generateFillInExercise(
  phrase: BasketPhrase,
  targetLego: LegoInfo,
  params: FillInParams
): FillInExercise {
  // 1. Identify the target LEGO within the phrase
  // 2. Create gapped version (silence or beep)
  // 3. Generate distractors (similar LEGOs)
  // 4. Return exercise structure
}

interface FillInParams {
  gapStrategy: 'silence' | 'beep' | 'noise';
  silenceDuration: number;         // ms
  numOptions: number;              // 3-4 (if multiple choice)
  allowTyped: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

### 4. Comprehension Exercise

**Format:** "What did the speaker say?"

**Presentation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING EXERCISE: Comprehension                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Listen to the phrase:                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [▶️] (Target language audio)                           │   │
│  │       "Quiero aprender español"                          │   │
│  │       [waveform visualization]                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  What does this mean?                                            │
│                                                                  │
│  ⭕ I want to learn Spanish                                     │
│  ⭕ I want to speak Spanish                                     │
│  ⭕ I want to go to Spain                                       │
│  ⭕ I learned Spanish                                           │
│                                                                  │
│  [Replay] [Check Answer]                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**
```typescript
interface ComprehensionExercise {
  type: 'comprehension';
  id: string;

  // The audio to comprehend
  target_audio: {
    audio_uuid: string;            // Target language audio
    text: string;                  // "Quiero aprender español"
    show_text: 'never' | 'after_answer' | 'always';
  };

  // Question
  question: {
    text: string;                  // "What does this mean?"
    language: 'known';             // Always in known language
  };

  // Answer options (in known language)
  options: Array<{
    id: string;
    text: string;                  // "I want to learn Spanish"
    is_correct: boolean;
  }>;

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;
    lego_id?: string;
  };

  // Replay settings
  playback: {
    replay_limit?: number;         // null = unlimited
    slow_playback_available: boolean;
  };
}
```

**Generation Strategy:**
```typescript
function generateComprehensionExercise(
  phrase: BasketPhrase,
  params: ComprehensionParams
): ComprehensionExercise {
  // 1. Use target language audio
  // 2. Create question in known language
  // 3. Generate distractors (similar meanings, word substitutions)
  // 4. Return exercise structure
}

interface ComprehensionParams {
  numOptions: number;              // 3-4
  distractorStrategy: 'word_swap' | 'similar_meaning' | 'opposite_meaning';
  showTargetText: 'never' | 'after_answer' | 'always';
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

### 5. Discrimination Exercise

**Format:** "Which is different?"

**Presentation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING EXERCISE: Discrimination                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Which phrase is DIFFERENT from the others?                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  A) [▶️] Quiero aprender                                │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  B) [▶️] Quiero aprender  (same)                        │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  C) [▶️] Quiero hablar  (DIFFERENT - different verb!)  │   │
│  │     [waveform visualization]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Replay All]                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**TypeScript Interface:**
```typescript
interface DiscriminationExercise {
  type: 'discrimination';
  id: string;

  // Instructions
  question: string;                // "Which phrase is different?"

  // Options (one is different)
  options: Array<{
    id: string;
    audio_uuid: string;
    text: string;                  // Hidden until after answer
    is_different: boolean;         // True for the odd one out
    difference_type?: 'word_swap' | 'tonal' | 'pronunciation' | 'grammar';
  }>;

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;
    lego_ids?: string[];           // Multiple LEGOs involved
  };

  // Hint system
  hint?: {
    text: string;                  // "Listen carefully to the verb"
    available_after_attempts: number;
  };
}
```

**Generation Strategy:**
```typescript
function generateDiscriminationExercise(
  basePhrase: BasketPhrase,
  params: DiscriminationParams
): DiscriminationExercise {
  // 1. Select base phrase
  // 2. Create 2-3 identical repetitions
  // 3. Create 1 variation (word swap, tonal difference, etc.)
  // 4. Shuffle
  // 5. Return exercise structure
}

interface DiscriminationParams {
  numOptions: number;              // 3-4
  differenceType: 'word_swap' | 'tonal' | 'pronunciation';
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## Data Architecture

### Exercise Database Schema

```typescript
// Supabase table: listening_exercises
interface ListeningExerciseRecord {
  id: string;                      // UUID
  course_code: string;             // spa_for_eng

  // Exercise definition
  exercise_type: 'recognition' | 'ordering' | 'fill_in' | 'comprehension' | 'discrimination';
  exercise_data: JSON;             // Full exercise structure (type-specific)

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  source: {
    seed_id?: string;
    lego_ids?: string[];
    basket_index?: number;
  };

  // Generation info
  generation_strategy: string;     // Strategy used to generate exercise
  generated_at: Date;
  generated_by: string;            // 'system' or user email

  // Quality control
  is_reviewed: boolean;
  reviewed_by?: string;
  quality_score?: number;          // 1-5 from manual review

  // Usage tracking
  times_presented: number;
  times_correct: number;
  times_incorrect: number;
  average_time_seconds: number;

  // Status
  is_active: boolean;              // Can be presented to learners?

  created_at: Date;
  updated_at: Date;
}
```

### Exercise Pool Structure

```typescript
interface ExercisePool {
  course_code: string;
  version: string;

  // Organization
  exercises_by_seed: {
    [seed_id: string]: {
      recognition: ListeningExercise[];
      ordering: ListeningExercise[];
      fill_in: ListeningExercise[];
      comprehension: ListeningExercise[];
      discrimination: ListeningExercise[];
    };
  };

  // Difficulty progression
  exercises_by_difficulty: {
    easy: ListeningExercise[];
    medium: ListeningExercise[];
    hard: ListeningExercise[];
  };

  // Statistics
  stats: {
    total_exercises: number;
    by_type: Record<ExerciseType, number>;
    by_difficulty: Record<Difficulty, number>;
    generated_at: Date;
  };
}
```

---

## Integration Points

### 1. Between LEGO Sessions (Optional Insertion)

**Use Case:** Insert a listening exercise between two LEGO sessions for variety and reinforcement.

```typescript
interface SessionWithListeningExercise {
  type: 'lego_session_with_listening';

  // Main LEGO session
  lego_session: LegoSession;

  // Optional listening exercise
  listening_exercise?: {
    insert_before: boolean;        // Before or after LEGO session?
    exercise: ListeningExercise;
    skip_allowed: boolean;         // Can learner skip?
  };
}
```

**Insertion Strategy:**
```typescript
interface ListeningInsertionParams {
  frequency: 'every_n_sessions' | 'after_difficult_session' | 'random';
  frequency_value: number;         // e.g., every 5 sessions

  // Selection criteria
  exercise_selection: {
    prefer_type?: ExerciseType[];  // Prefer certain types
    difficulty_match: boolean;     // Match difficulty to LEGO session?
    source_from_current_seed: boolean; // Use exercises from same seed?
  };

  // Learner control
  allow_skip: boolean;
  max_time_seconds?: number;       // Time limit (null = unlimited)
}
```

---

### 2. Standalone Listening Mode

**Use Case:** Dedicated listening practice mode outside main course flow.

```typescript
interface ListeningMode {
  mode: 'standalone_listening';

  // Session configuration
  session: {
    num_exercises: number;         // How many exercises in session
    mix_types: boolean;            // Mix exercise types or single type?
    difficulty: 'adaptive' | 'easy' | 'medium' | 'hard';
  };

  // Content selection
  content_filter: {
    seed_range?: { start: string; end: string }; // S0001-S0050
    lego_ids?: string[];           // Specific LEGOs
    recently_practiced: boolean;   // Include recently practiced LEGOs?
  };

  // Progress tracking
  progress: {
    current_exercise: number;
    total_exercises: number;
    score: number;
    time_elapsed: number;
  };
}
```

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│  LISTENING PRACTICE SESSION                                      │
├─────────────────────────────────────────────────────────────────┤
│  Progress: [████████░░] 8/10 exercises                          │
│  Score: 7/8 correct (87%)                                       │
│  Time: 12:34                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Current Exercise Here]                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Previous] [Skip] [Next]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Review/Reinforcement Tool

**Use Case:** Review previously learned LEGOs through listening exercises.

```typescript
interface ReviewSession {
  type: 'listening_review';

  // Target content
  review_scope: {
    seeds: string[];               // Seeds to review
    legos: string[];               // Specific LEGOs to review
    date_range?: {                 // Content learned in date range
      from: Date;
      to: Date;
    };
  };

  // Review strategy
  strategy: {
    spaced_repetition: boolean;    // Use SRS algorithm?
    focus_on_errors: boolean;      // Prioritize previously incorrect?
    difficulty_adjustment: 'adaptive' | 'fixed';
  };

  // Presentation
  presentation: {
    num_exercises: number;
    exercise_types: ExerciseType[]; // Which types to include
    shuffle: boolean;
  };
}
```

---

### 4. End-of-Lesson Comprehension Check

**Use Case:** Quick comprehension check after completing a lesson/seed.

```typescript
interface ComprehensionCheck {
  type: 'comprehension_check';

  // Scope
  lesson_scope: {
    seed_id: string;               // Seed just completed
    lego_ids: string[];            // LEGOs introduced
  };

  // Check configuration
  config: {
    num_exercises: number;         // 3-5 quick checks
    required_score: number;        // % required to pass (e.g., 80%)
    allow_retry: boolean;
    max_attempts?: number;
  };

  // Exercise selection
  exercise_selection: {
    types: ExerciseType[];         // Prefer comprehension + recognition
    difficulty: 'easy' | 'medium'; // Don't use hard for end-of-lesson
  };

  // Outcome
  outcome: {
    passed: boolean;
    score: number;
    time_seconds: number;
    feedback: string;              // Encouragement or guidance
  };
}
```

---

## Exercise Generation

### Automatic Generation Pipeline

```typescript
class ListeningExerciseGenerator {
  /**
   * Generate a full pool of exercises for a course
   */
  async generateExercisePool(
    courseCode: string,
    params: GenerationParams
  ): Promise<ExercisePool> {
    // 1. Load lego_baskets.json
    const baskets = await this.loadLegoBaskets(courseCode);

    // 2. Load course_manifest.json (for audio UUIDs)
    const manifest = await this.loadManifest(courseCode);

    // 3. Generate exercises for each seed
    const exercises = [];
    for (const [legoId, basket] of Object.entries(baskets.baskets)) {
      // Generate multiple exercise types per LEGO
      exercises.push(...this.generateForLego(legoId, basket, manifest, params));
    }

    // 4. Quality filter
    const filtered = this.filterQualityExercises(exercises);

    // 5. Build pool structure
    return this.buildExercisePool(courseCode, filtered);
  }

  /**
   * Generate exercises for a single LEGO
   */
  private generateForLego(
    legoId: string,
    basket: BasketData,
    manifest: CourseManifest,
    params: GenerationParams
  ): ListeningExercise[] {
    const exercises: ListeningExercise[] = [];

    // Recognition exercises (2-3 per LEGO)
    exercises.push(...this.generateRecognition(legoId, basket, params.recognition));

    // Ordering exercises (1-2 per LEGO)
    exercises.push(...this.generateOrdering(legoId, basket, params.ordering));

    // Fill-in exercises (1-2 per LEGO)
    exercises.push(...this.generateFillIn(legoId, basket, params.fillIn));

    // Comprehension exercises (2-3 per LEGO)
    exercises.push(...this.generateComprehension(legoId, basket, params.comprehension));

    // Discrimination exercises (1 per LEGO, if applicable)
    if (this.hasConfusablePhrases(legoId, basket)) {
      exercises.push(...this.generateDiscrimination(legoId, basket, params.discrimination));
    }

    return exercises;
  }
}

interface GenerationParams {
  recognition: RecognitionParams;
  ordering: OrderingParams;
  fillIn: FillInParams;
  comprehension: ComprehensionParams;
  discrimination: DiscriminationParams;

  // Quality control
  minQualityScore: number;         // 1-5 threshold
  requireManualReview: boolean;

  // Variation
  exercisesPerLego: {
    recognition: [number, number]; // [min, max]
    ordering: [number, number];
    fillIn: [number, number];
    comprehension: [number, number];
    discrimination: [number, number];
  };
}
```

---

### Content Sourcing from lego_baskets

The `lego_baskets.json` file structure:

```json
{
  "version": "7.7.0",
  "baskets": {
    "S0001L01": [
      ["Quiero", "I want"],           // LEGO itself
      [
        ["Quiero hablar ahora contigo", "I want to speak now with you"]
      ],                                // Seed sentence (DEBU)
      [
        [["Quiero hablar", "I want to speak"]],           // ETER cycle 1
        [["Quiero hablar ahora", "I want to speak now"]], // ETER cycle 2
        [["Quiero hablar español ahora", "I want to speak Spanish now"]], // ETER cycle 3
        []                              // ETER cycle 4 (empty)
      ]
    ]
  }
}
```

**Sourcing Strategy:**

```typescript
class BasketContentExtractor {
  /**
   * Extract usable phrases from basket for exercise generation
   */
  extractPhrases(basket: BasketData): PhraseCollection {
    const phrases: PhraseCollection = {
      lego: basket[0],                 // The LEGO itself
      seedSentence: basket[1][0],      // Seed sentence (DEBU)
      eterCycles: basket[2].flat(),    // All ETER practice phrases
    };

    return phrases;
  }

  /**
   * Find similar LEGOs for distractor generation
   */
  findSimilarLegos(
    targetLegoId: string,
    allBaskets: Record<string, BasketData>,
    criteria: 'same_word_length' | 'same_pattern' | 'similar_meaning'
  ): string[] {
    // Search through all baskets for similar LEGOs
    // Based on criteria (word count, pattern type, etc.)
  }

  /**
   * Get audio UUID for a phrase
   */
  async getAudioUuid(
    phrase: [string, string],
    role: 'source' | 'target1' | 'target2',
    cadence: 'natural' | 'slow'
  ): Promise<string> {
    // Query Supabase audio_samples table
    // Using text_normalized + lang + role + cadence
  }
}
```

---

## Difficulty Progression

### Difficulty Criteria

```typescript
interface DifficultyClassification {
  easy: {
    // Recognition
    recognition: {
      numOptions: 3;               // Fewer options
      distractorSimilarity: 'low'; // Very different phrases
      audioQuality: 'clear';
    };

    // Ordering
    ordering: {
      numPhrases: 3;               // Fewer phrases to order
      phraseLength: 'short';       // Short phrases only
      allowReplay: true;
    };

    // Fill-in
    fillIn: {
      numOptions: 3;
      gapPosition: 'end';          // Gap at end (easier)
      showHint: true;
    };

    // Comprehension
    comprehension: {
      numOptions: 3;
      distractorType: 'unrelated'; // Clearly different meanings
      allowSlowPlayback: true;
    };

    // Discrimination
    discrimination: {
      numOptions: 3;
      differenceType: 'word_swap'; // Obvious difference
    };
  };

  medium: {
    recognition: {
      numOptions: 4;
      distractorSimilarity: 'medium'; // Similar patterns
      audioQuality: 'clear';
    };

    ordering: {
      numPhrases: 4;
      phraseLength: 'medium';
      allowReplay: true;
    };

    fillIn: {
      numOptions: 4;
      gapPosition: 'middle';
      showHint: false;
    };

    comprehension: {
      numOptions: 4;
      distractorType: 'similar_meaning';
      allowSlowPlayback: true;
    };

    discrimination: {
      numOptions: 4;
      differenceType: 'pronunciation';
    };
  };

  hard: {
    recognition: {
      numOptions: 4;
      distractorSimilarity: 'high'; // Very similar phrases
      audioQuality: 'natural';      // Natural speed only
    };

    ordering: {
      numPhrases: 5;
      phraseLength: 'long';
      allowReplay: false;           // No replay!
    };

    fillIn: {
      numOptions: 4;
      gapPosition: 'beginning';     // Gap at start (harder)
      showHint: false;
      requireTyped: true;           // Must type, not select
    };

    comprehension: {
      numOptions: 4;
      distractorType: 'confusable'; // Minimal differences
      allowSlowPlayback: false;
    };

    discrimination: {
      numOptions: 4;
      differenceType: 'tonal';      // Subtle tonal differences
    };
  };
}
```

### Adaptive Difficulty

```typescript
interface AdaptiveDifficulty {
  // Performance tracking
  learner_performance: {
    recent_exercises: ExerciseResult[]; // Last 10-20 exercises
    success_rate: number;            // % correct
    average_time: number;            // Average time per exercise
  };

  // Adjustment rules
  adjustment: {
    increase_difficulty_threshold: number; // e.g., 90% success
    decrease_difficulty_threshold: number; // e.g., 60% success

    // Gradual progression
    difficulty_step: 'gradual' | 'immediate';
    mixed_difficulty: boolean;       // Mix difficulties or single level?
  };

  // Current state
  current_difficulty: 'easy' | 'medium' | 'hard';
  next_adjustment_after: number;     // Exercises until next adjustment
}
```

---

## Scoring and Feedback

### Scoring System

```typescript
interface ExerciseResult {
  exercise_id: string;
  exercise_type: ExerciseType;

  // Attempt tracking
  attempt: {
    is_correct: boolean;
    time_seconds: number;
    attempts_count: number;          // How many tries?
    hints_used: number;
  };

  // Scoring
  score: {
    points_earned: number;           // Points for this exercise
    points_possible: number;         // Max points
    bonus_points: number;            // Speed bonus, first-try bonus
  };

  // Timestamp
  completed_at: Date;
}

interface ScoringParams {
  // Base points
  points_per_exercise: number;       // 10 points base

  // Bonuses
  first_try_bonus: number;           // +5 points for first try
  speed_bonus: {
    enabled: boolean;
    fast_threshold_seconds: number;  // e.g., 10 seconds
    bonus_points: number;            // +3 points
  };

  // Penalties
  penalty_per_attempt: number;       // -2 points per wrong attempt
  penalty_for_hint: number;          // -1 point per hint

  // Minimum score
  min_points_per_exercise: number;   // 0 (can't go negative)
}
```

---

### Feedback Mechanisms

```typescript
interface ExerciseFeedback {
  // Immediate feedback (after answer)
  immediate: {
    is_correct: boolean;
    message: string;                 // "Great job!" or "Not quite..."

    // For incorrect answers
    correction?: {
      show_correct_answer: boolean;
      explanation?: string;          // Why this answer is correct
      play_correct_audio: boolean;
    };
  };

  // Progressive feedback (during attempts)
  progressive?: {
    attempt_number: number;
    hint_level: 'subtle' | 'explicit';
    hint_message: string;
  };

  // End-of-session feedback
  session_summary?: {
    total_exercises: number;
    correct_count: number;
    score: number;
    strengths: string[];             // "Great at recognition!"
    areas_to_improve: string[];      // "Try fill-in exercises"
    encouragement: string;
  };
}

class FeedbackGenerator {
  generateImmediateFeedback(
    result: ExerciseResult,
    params: FeedbackParams
  ): ExerciseFeedback {
    if (result.attempt.is_correct) {
      return this.generatePositiveFeedback(result, params);
    } else {
      return this.generateCorrectiveFeedback(result, params);
    }
  }

  private generatePositiveFeedback(
    result: ExerciseResult,
    params: FeedbackParams
  ): ExerciseFeedback {
    const messages = [
      "Excellent!",
      "Perfect!",
      "Well done!",
      "Great listening!",
      "You got it!",
    ];

    // Bonus messages for fast/first-try
    if (result.attempt.attempts_count === 1) {
      messages.push("First try! Amazing!");
    }

    if (result.attempt.time_seconds < params.fast_threshold) {
      messages.push("Lightning fast!");
    }

    return {
      immediate: {
        is_correct: true,
        message: this.randomChoice(messages),
      }
    };
  }

  private generateCorrectiveFeedback(
    result: ExerciseResult,
    params: FeedbackParams
  ): ExerciseFeedback {
    return {
      immediate: {
        is_correct: false,
        message: "Not quite. Listen again!",
        correction: {
          show_correct_answer: result.attempt.attempts_count >= params.max_attempts,
          explanation: params.show_explanations ? this.getExplanation(result) : undefined,
          play_correct_audio: true,
        }
      }
    };
  }
}

interface FeedbackParams {
  // Positive feedback
  vary_messages: boolean;            // Vary success messages?
  celebration_threshold: number;     // Consecutive correct for celebration

  // Corrective feedback
  max_attempts: number;              // Show answer after N attempts
  show_explanations: boolean;
  play_correct_audio_on_error: boolean;

  // Encouragement
  encouragement_frequency: number;   // Every N exercises

  // Speed thresholds
  fast_threshold: number;            // Seconds
  slow_threshold: number;            // Seconds (offer hint)
}
```

---

## Mobile-First Design

### Touch Interactions

```typescript
interface MobileInteractions {
  // Recognition exercises
  recognition: {
    tap_to_play: boolean;            // Tap option to play audio
    tap_to_select: boolean;          // Tap to select answer
    swipe_between_options: boolean;  // Swipe left/right
  };

  // Ordering exercises
  ordering: {
    drag_and_drop: boolean;          // Drag to reorder
    long_press_to_move: boolean;     // Alternative: long press
    tap_to_swap: boolean;            // Alternative: tap two items to swap
  };

  // Fill-in exercises
  fillIn: {
    tap_to_select_word: boolean;
    on_screen_keyboard: boolean;     // For typed answers
    autocomplete: boolean;
  };

  // General
  general: {
    large_touch_targets: boolean;    // 44x44pt minimum
    haptic_feedback: boolean;        // Vibrate on correct/incorrect
    audio_controls_sticky: boolean;  // Keep play button accessible
  };
}
```

---

### Responsive Layout

```typescript
interface ResponsiveLayout {
  // Breakpoints
  breakpoints: {
    mobile: '< 640px';
    tablet: '640px - 1024px';
    desktop: '> 1024px';
  };

  // Layout adaptations
  mobile: {
    layout: 'vertical';              // Stack vertically
    options_per_row: 1;              // One option per row
    font_size: 'large';              // 18px base
    spacing: 'comfortable';          // More padding
  };

  tablet: {
    layout: 'flexible';              // Can be 2 columns
    options_per_row: 2;
    font_size: 'medium';
    spacing: 'normal';
  };

  desktop: {
    layout: 'horizontal';            // Side-by-side when possible
    options_per_row: 2;              // Or 3 for recognition
    font_size: 'normal';
    spacing: 'compact';
  };
}
```

---

### Performance Optimization

```typescript
interface PerformanceOptimizations {
  // Audio
  audio: {
    preload_strategy: 'eager' | 'lazy' | 'progressive';
    cache_audio: boolean;            // Cache downloaded audio
    compression: 'high' | 'medium';  // MP3 quality
  };

  // Images/Waveforms
  images: {
    lazy_load_waveforms: boolean;
    use_svg_waveforms: boolean;      // Lightweight SVG instead of canvas
  };

  // Data
  data: {
    paginate_exercises: boolean;     // Load exercises in batches
    prefetch_next: boolean;          // Prefetch next exercise
  };

  // Offline support
  offline: {
    cache_exercise_data: boolean;    // Cache exercise JSON
    cache_audio_files: boolean;      // Cache audio for offline
    service_worker: boolean;         // PWA support
  };
}
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

**Deliverables:**
- [ ] TypeScript interfaces defined
- [ ] Supabase `listening_exercises` table created
- [ ] Exercise generator base classes implemented
- [ ] Audio UUID lookup from Supabase integrated

**Tasks:**
1. Define all TypeScript interfaces in `/types/listening-exercises.ts`
2. Create Supabase migration for `listening_exercises` table
3. Implement `ListeningExerciseGenerator` base class
4. Implement `BasketContentExtractor` for sourcing from `lego_baskets.json`
5. Create audio lookup utilities (query Supabase `audio_samples`)

---

### Phase 2: Exercise Type Implementation (Week 3-4)

**Deliverables:**
- [ ] Recognition exercise generator
- [ ] Ordering exercise generator
- [ ] Fill-in exercise generator
- [ ] Comprehension exercise generator
- [ ] Discrimination exercise generator

**Tasks:**
1. Implement `generateRecognitionExercise()`
2. Implement `generateOrderingExercise()`
3. Implement `generateFillInExercise()`
4. Implement `generateComprehensionExercise()`
5. Implement `generateDiscriminationExercise()`
6. Unit tests for each generator
7. Quality filters and validation

---

### Phase 3: UI Components (Week 5-6)

**Deliverables:**
- [ ] Recognition exercise UI
- [ ] Ordering exercise UI (drag & drop)
- [ ] Fill-in exercise UI
- [ ] Comprehension exercise UI
- [ ] Discrimination exercise UI
- [ ] Shared audio player component
- [ ] Feedback/results display

**Tasks:**
1. Create `RecognitionExercise.vue` component
2. Create `OrderingExercise.vue` with drag-and-drop
3. Create `FillInExercise.vue` with typed input support
4. Create `ComprehensionExercise.vue`
5. Create `DiscriminationExercise.vue`
6. Create `AudioPlayer.vue` shared component
7. Create `ExerciseFeedback.vue` component
8. Mobile responsiveness testing

---

### Phase 4: Integration (Week 7)

**Deliverables:**
- [ ] Listening exercises integrated into LEGO session flow
- [ ] Standalone listening mode
- [ ] Exercise selection algorithms
- [ ] Difficulty adaptation system

**Tasks:**
1. Integrate listening exercises into session flow
2. Implement insertion logic (every N sessions)
3. Create standalone listening practice mode
4. Implement adaptive difficulty system
5. Create review/reinforcement mode
6. End-of-lesson comprehension checks

---

### Phase 5: Generation Pipeline (Week 8)

**Deliverables:**
- [ ] Automated exercise pool generation
- [ ] Quality filtering
- [ ] Manual review interface
- [ ] Exercise export/import

**Tasks:**
1. Implement `generateExercisePool()` batch generator
2. Create quality scoring algorithm
3. Build manual review interface for QA
4. Exercise pool export to JSON/database
5. Batch generation CLI tool

---

### Phase 6: Analytics & Optimization (Week 9)

**Deliverables:**
- [ ] Performance tracking
- [ ] Analytics dashboard
- [ ] A/B testing framework
- [ ] Optimization based on learner data

**Tasks:**
1. Implement exercise result tracking
2. Create analytics dashboard (success rates, time, etc.)
3. A/B testing infrastructure
4. Exercise optimization based on data
5. Difficulty calibration refinement

---

### Phase 7: Polish & Launch (Week 10)

**Deliverables:**
- [ ] End-to-end testing
- [ ] Documentation
- [ ] Performance optimization
- [ ] Launch

**Tasks:**
1. E2E testing (all exercise types, all flows)
2. Performance optimization (lazy loading, caching)
3. Accessibility audit (WCAG 2.1 AA)
4. Documentation for course creators
5. Beta testing with real learners
6. Production deployment

---

## Appendix: Example Configurations

### Example: Recognition Exercise Configuration

```typescript
const recognitionConfig: RecognitionParams = {
  numOptions: 4,
  distractorStrategy: 'similar_legos',
  showTextAfterAnswer: true,
  difficulty: 'medium',
};

// Generate exercise
const exercise = generateRecognitionExercise(
  correctPhrase,
  distractors,
  recognitionConfig
);
```

---

### Example: Ordering Exercise Configuration

```typescript
const orderingConfig: OrderingParams = {
  numPhrases: 4,
  useSequentialFromBasket: true,
  difficulty: 'medium',
};

const exercise = generateOrderingExercise(
  phrases,
  orderingConfig
);
```

---

### Example: Adaptive Insertion

```typescript
const insertionParams: ListeningInsertionParams = {
  frequency: 'every_n_sessions',
  frequency_value: 5,               // Every 5 sessions

  exercise_selection: {
    prefer_type: ['recognition', 'comprehension'],
    difficulty_match: true,          // Match LEGO session difficulty
    source_from_current_seed: true,  // Use exercises from same seed
  },

  allow_skip: true,
  max_time_seconds: 120,             // 2-minute time limit
};
```

---

## Summary

The **Listening Exercises System** provides a comprehensive framework for generating, managing, and delivering listening comprehension exercises that:

1. **Complement the SSi Method** - Reinforce speaking practice with comprehension checks
2. **Use Existing Audio** - Leverage the Master Audio Registry (no new recordings)
3. **Parameterized Generation** - Highly configurable for experimentation
4. **Mobile-First Design** - Touch-optimized, responsive, performant
5. **Adaptive Difficulty** - Adjusts to learner performance
6. **Multiple Integration Points** - Flexible insertion into course flow

**Key Files:**
- `/new_vision/LISTENING_EXERCISES_SPEC.md` - This document
- `/types/listening-exercises.ts` - TypeScript interfaces (to be created)
- `/services/listening-exercise-generator.cjs` - Generation service (to be created)
- `/src/components/listening/` - UI components (to be created)

**Next Steps:**
1. Review specification with team
2. Create TypeScript interfaces
3. Implement exercise generators
4. Build UI components
5. Integrate into course flow
6. Test with real learners

---

**Version**: 1.0.0
**Created**: 2025-12-05
**Author**: Claude (Anthropic)
**Project**: SSi Dashboard v7 - Course Creation Suite
