# Adaptations System Specification

**Dynamic Learning Experience Adjustment for SSi Courses**

Version: 1.0.0
Date: 2025-12-05
Status: Specification
APML Version: 11.0

---

## Executive Summary

The **Adaptations System** is what makes SSi courses "adaptive" rather than static. It dynamically adjusts the learning experience based on individual learner performance, optimizing the balance between challenge and retention. The system modifies ETER (spaced repetition) schedules, adjusts difficulty levels, and personalizes session parameters to match each learner's pace and capability.

**Core Principle**: *Every learner is different. The system should accelerate when they're succeeding and provide support when they're struggling.*

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Key Concepts](#key-concepts)
3. [Adaptive ETER Scheduling](#adaptive-eter-scheduling)
4. [Performance Metrics](#performance-metrics)
5. [Adjustment Types](#adjustment-types)
6. [Difficulty Levels](#difficulty-levels)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [Adaptation Algorithm](#adaptation-algorithm)
9. [Integration with LEGO Sessions](#integration-with-lego-sessions)
10. [Adaptation Scenarios](#adaptation-scenarios)
11. [Learner Profiles](#learner-profiles)
12. [Data Tracking](#data-tracking)
13. [A/B Testing Framework](#ab-testing-framework)
14. [Integration with ssi-learning-app](#integration-with-ssi-learning-app)
15. [Configuration Management](#configuration-management)

---

## System Overview

### What Gets Adapted?

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADAPTATION TARGETS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ETER SCHEDULE                                                │
│     • Decay rate (faster/slower)                                │
│     • Number of review cycles                                   │
│     • Spacing intervals (offset values)                         │
│                                                                  │
│  2. REPETITION COUNTS                                            │
│     • LEGO debut repetitions                                    │
│     • Practice phrase repetitions                               │
│     • Target language repetitions in introduction               │
│                                                                  │
│  3. SESSION STRUCTURE                                            │
│     • Number of DEBU phrases                                    │
│     • Component practice cycles                                 │
│     • Session length/duration                                   │
│                                                                  │
│  4. DIFFICULTY LEVEL                                             │
│     • Phrase complexity                                         │
│     • New LEGO introduction rate                                │
│     • Challenge basket selection                                │
│                                                                  │
│  5. TIMING & PACING                                              │
│     • Pause durations                                           │
│     • Playback speed                                            │
│     • Response time expectations                                │
│                                                                  │
│  6. RECOVERY INTERVENTIONS                                       │
│     • Simplified review sessions                                │
│     • Encouragement insertion                                   │
│     • Break suggestions                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Adaptation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  LEARNER ACTION                                                  │
│  └─→ Completes LEGO Session N                                  │
│                                                                  │
│  PERFORMANCE CAPTURE                                             │
│  └─→ Accuracy, Response Time, Skips, Replays                   │
│                                                                  │
│  METRIC CALCULATION                                              │
│  └─→ Success Rate, Struggle Score, Confidence                  │
│                                                                  │
│  ADAPTATION DECISION                                             │
│  └─→ Decision Tree / ML Model                                   │
│                                                                  │
│  PARAMETER ADJUSTMENT                                            │
│  └─→ Modify ETER, Difficulty, Timing                           │
│                                                                  │
│  NEXT SESSION GENERATION                                         │
│  └─→ Apply adapted parameters to Session N+1                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Adaptive ETER Scheduling

**ETER (Exponentially-Timed Expanding Retrieval)** is the spaced repetition system at the core of SSi learning. The default schedule ensures optimal memory consolidation:

**Default ETER Schedule:**
- **N-1**: 3 cycles (most recent LEGO - high frequency)
- **N-2**: 1 cycle
- **N-3**: 1 cycle
- **N-5**: 1 cycle
- **N-8**: 1 cycle (if course is long enough)
- ...continues with expanding intervals

**Adaptation Strategy:**

```
High Performance (Success)        Low Performance (Struggle)
─────────────────────────────────────────────────────────────
Accelerate Decay                  Slow Decay
└─→ Fewer review cycles           └─→ More review cycles
    Longer intervals                  Shorter intervals

Example:                          Example:
N-1: 2 cycles (↓ from 3)          N-1: 4 cycles (↑ from 3)
N-2: 1 cycle                       N-2: 2 cycles (↑ from 1)
N-3: Skip (↓ from 1)               N-3: 2 cycles (↑ from 1)
N-5: 1 cycle                       N-4: 1 cycle (new!)
                                   N-5: 1 cycle
```

### 2. Performance Metrics

The system tracks multiple performance indicators to make informed adaptation decisions:

#### Primary Metrics

**Accuracy** (correctness of responses)
- **Measure**: % correct responses in session
- **High**: ≥ 90% correct
- **Medium**: 70-89% correct
- **Low**: < 70% correct

**Response Time** (speed of learner response)
- **Measure**: Time from prompt to response attempt
- **Fast**: < 2 seconds (confident)
- **Normal**: 2-5 seconds (thinking)
- **Slow**: > 5 seconds (struggling)

**Engagement** (learner interaction patterns)
- **Skip Rate**: % of phrases skipped
- **Replay Rate**: % of phrases replayed
- **Completion Rate**: % of session completed

#### Derived Metrics

**Success Score** (weighted composite)
```
Success Score = (Accuracy × 0.5) +
                ((1 - NormalizedResponseTime) × 0.3) +
                (EngagementScore × 0.2)

Range: 0.0 (complete struggle) to 1.0 (perfect mastery)
```

**Struggle Indicators**
- Consecutive errors ≥ 3
- Slow response time on recent LEGO (N-1)
- High skip rate in current session
- Decreasing accuracy trend over last 5 sessions

**Confidence Level**
- **High**: Success Score > 0.8, Response Time consistently fast
- **Medium**: Success Score 0.6-0.8, Variable response time
- **Low**: Success Score < 0.6, Slow responses, high replays

### 3. Adjustment Types

#### ETER Adjustments

**Boost on Success** (accelerate learning)
```typescript
// Conditions: Success Score > 0.85 for 3 consecutive sessions
adjustments = {
  reduceCycles: true,        // N-1: 3→2, N-2: 1→skip
  extendIntervals: true,     // N-1,N-2,N-3,N-6 (skip N-5)
  skipOldReviews: true       // Skip reviews older than N-5
}
```

**Extend on Struggle** (reinforce learning)
```typescript
// Conditions: Success Score < 0.65 or Consecutive Errors ≥ 3
adjustments = {
  increaseCycles: true,      // N-1: 3→4, N-2: 1→2
  shortenIntervals: true,    // N-1,N-2,N-3,N-4,N-5 (add N-4)
  repeatRecent: true         // Add extra N-1 cycles
}
```

#### Repetition Adjustments

**Increase Repetitions** (when struggling with new LEGOs)
```typescript
adjustments = {
  debutRepetitions: 3,       // ↑ from default 2
  targetRepetitions: 3,      // ↑ from default 2
  componentCycles: 2         // ↑ from default 1
}
```

**Decrease Repetitions** (when mastering quickly)
```typescript
adjustments = {
  debutRepetitions: 1,       // ↓ from default 2
  targetRepetitions: 1,      // ↓ from default 2
  debuCount: 5               // ↓ from default 7
}
```

#### Session Length Adjustments

**Shorter Sessions** (prevent overwhelm)
```typescript
// Triggered by: fatigue indicators, consecutive errors
adjustments = {
  maxNewLEGOs: 1,            // ↓ from default 2-3
  debuCount: 5,              // ↓ from default 7
  eterCycles: reduce(20%)    // Fewer reviews per session
}
```

**Longer Sessions** (for engaged, high-performing learners)
```typescript
// Triggered by: high success, fast completion, request for more
adjustments = {
  maxNewLEGOs: 3,            // ↑ from default 2
  debuCount: 10,             // ↑ from default 7
  eterCycles: increase(20%)  // More reviews per session
}
```

---

## Difficulty Levels

### Difficulty System

SSi courses have three difficulty levels, each affecting phrase complexity and learning pace:

```
┌─────────────────────────────────────────────────────────────────┐
│                     DIFFICULTY LEVELS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EASY                                                            │
│  • Slower LEGO introduction rate (1 per session)                │
│  • More repetitions (debut: 3, practice: 7-10)                  │
│  • Simpler basket selection (avoid complex patterns)            │
│  • Longer pauses (1.5x default)                                 │
│  • Conservative ETER (no skips, full schedule)                  │
│                                                                  │
│  NORMAL (Default)                                                │
│  • Standard LEGO rate (1-2 per session)                         │
│  • Standard repetitions (debut: 2, practice: 7)                 │
│  • Balanced basket selection                                    │
│  • Default pauses                                               │
│  • Standard ETER schedule                                       │
│                                                                  │
│  CHALLENGING                                                     │
│  • Fast LEGO introduction (2-3 per session)                     │
│  • Fewer repetitions (debut: 1, practice: 5)                    │
│  • Complex basket selection (advanced patterns)                 │
│  • Shorter pauses (0.8x default)                                │
│  • Aggressive ETER (skip reviews when mastered)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Automatic Difficulty Adjustment

The system can **automatically ramp difficulty** based on sustained performance:

**Upward Ramping** (increase challenge)
```
Conditions:
• Success Score > 0.85 for 10 consecutive sessions
• Response Time consistently fast (< 2s average)
• No recent struggles or replays

Action:
• Shift difficulty: Easy → Normal → Challenging
• Notify learner: "You're doing great! Moving to [level]."
```

**Downward Adjustment** (reduce overwhelm)
```
Conditions:
• Success Score < 0.6 for 5 consecutive sessions
• High skip rate or incomplete sessions
• Struggling with recent LEGOs (N-1, N-2)

Action:
• Shift difficulty: Challenging → Normal → Easy
• Notify learner: "Let's take it easier for a bit."
```

### Manual Override

Learners can **manually set difficulty** at any time:

```typescript
interface DifficultySettings {
  level: 'easy' | 'normal' | 'challenging';
  allowAutoAdjust: boolean;  // Let system adapt automatically?
  minLevel: 'easy' | 'normal';  // Prevent dropping below this
  maxLevel: 'normal' | 'challenging';  // Prevent rising above this
}
```

---

## TypeScript Interfaces

### Core Adaptation Interfaces

```typescript
// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

interface SessionPerformance {
  sessionId: string;
  learnerId: string;
  courseCode: string;
  sessionNumber: number;
  completedAt: string;  // ISO timestamp

  // Raw metrics
  totalPrompts: number;
  correctResponses: number;
  incorrectResponses: number;
  skippedPrompts: number;
  replayedPrompts: number;

  // Timing metrics
  averageResponseTime: number;  // milliseconds
  fastResponses: number;  // < 2s
  slowResponses: number;  // > 5s
  totalSessionTime: number;  // milliseconds

  // Engagement
  completionRate: number;  // 0.0 - 1.0
  pauseCount: number;
  restartCount: number;

  // Calculated scores
  accuracyRate: number;  // 0.0 - 1.0
  successScore: number;  // 0.0 - 1.0 (weighted composite)
  confidenceLevel: 'low' | 'medium' | 'high';

  // Context
  newLEGOsIntroduced: string[];  // LEGO IDs
  reviewedLEGOs: string[];  // LEGO IDs
  struggledLEGOs: string[];  // LEGOs with errors
}

interface PerformanceHistory {
  learnerId: string;
  courseCode: string;
  sessions: SessionPerformance[];

  // Aggregate metrics
  averageSuccessScore: number;
  successTrend: 'improving' | 'stable' | 'declining';
  currentStreak: number;  // consecutive high-success sessions
  totalSessions: number;
  totalLEGOsMastered: number;
}

// ============================================================================
// ADAPTATION PARAMETERS
// ============================================================================

interface AdaptationParameters {
  // Performance thresholds
  thresholds: {
    successAccelerate: number;  // e.g., 0.85 - accelerate if above
    struggleSlow: number;  // e.g., 0.65 - slow down if below
    consecutiveErrorsMax: number;  // e.g., 3
    fastResponseTime: number;  // ms, e.g., 2000
    slowResponseTime: number;  // ms, e.g., 5000
  };

  // ETER adjustments
  eter: {
    defaultSchedule: ETERScheduleItem[];
    boostSchedule: ETERScheduleItem[];  // For high performers
    extendSchedule: ETERScheduleItem[];  // For struggling learners
    minCycles: number;  // Don't reduce below this
    maxCycles: number;  // Don't increase above this
  };

  // Repetition adjustments
  repetitions: {
    debutDefault: number;  // default: 2
    debutRange: [number, number];  // e.g., [1, 3]
    targetDefault: number;  // default: 2
    targetRange: [number, number];  // e.g., [1, 3]
    debuDefault: number;  // default: 7
    debuRange: [number, number];  // e.g., [5, 10]
  };

  // Session structure
  session: {
    defaultNewLEGOs: number;  // e.g., 2
    newLEGOsRange: [number, number];  // e.g., [1, 3]
    defaultDuration: number;  // minutes, e.g., 20
    durationRange: [number, number];  // e.g., [10, 30]
  };

  // Difficulty settings
  difficulty: {
    initialLevel: 'easy' | 'normal' | 'challenging';
    allowAutoRamp: boolean;
    rampUpThreshold: {
      sessionsRequired: number;  // e.g., 10
      minSuccessScore: number;  // e.g., 0.85
    };
    rampDownThreshold: {
      sessionsRequired: number;  // e.g., 5
      maxSuccessScore: number;  // e.g., 0.6
    };
  };

  // Recovery settings
  recovery: {
    triggerAfterErrors: number;  // e.g., 3 consecutive
    recoverySessionLength: number;  // % of normal, e.g., 0.5
    includeEncouragement: boolean;
    simplifyReviews: boolean;  // Only N-1, skip others
  };
}

interface ETERScheduleItem {
  offset: number;  // N-1, N-2, N-3, etc.
  cycles: number;  // Number of review cycles
}

// ============================================================================
// ADAPTATION STATE
// ============================================================================

interface LearnerAdaptationState {
  learnerId: string;
  courseCode: string;
  lastUpdated: string;  // ISO timestamp

  // Current settings
  currentDifficulty: 'easy' | 'normal' | 'challenging';
  currentETERSchedule: ETERScheduleItem[];
  currentRepetitions: {
    debut: number;
    target: number;
    debu: number;
  };

  // Adaptation history
  adaptationHistory: AdaptationEvent[];

  // Performance summary
  recentPerformance: {
    last5Sessions: SessionPerformance[];
    averageSuccessScore: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  // Flags
  isRecovering: boolean;  // In recovery mode?
  lastRecoverySession: string | null;  // ISO timestamp
  consecutiveHighSessions: number;  // For difficulty ramping
  consecutiveLowSessions: number;  // For difficulty reduction
}

interface AdaptationEvent {
  timestamp: string;  // ISO timestamp
  trigger: AdaptationTrigger;
  adjustments: AdaptationAdjustments;
  reason: string;  // Human-readable explanation
  sessionNumber: number;
}

type AdaptationTrigger =
  | 'high_success_sustained'
  | 'struggle_detected'
  | 'consecutive_errors'
  | 'difficulty_ramp_up'
  | 'difficulty_ramp_down'
  | 'manual_override'
  | 'recovery_complete'
  | 'ab_test_assignment';

interface AdaptationAdjustments {
  eter?: {
    from: ETERScheduleItem[];
    to: ETERScheduleItem[];
  };
  repetitions?: {
    from: { debut: number; target: number; debu: number };
    to: { debut: number; target: number; debu: number };
  };
  difficulty?: {
    from: 'easy' | 'normal' | 'challenging';
    to: 'easy' | 'normal' | 'challenging';
  };
  sessionLength?: {
    from: number;  // minutes
    to: number;
  };
}

// ============================================================================
// LEARNER PROFILE
// ============================================================================

interface LearnerProfile {
  learnerId: string;

  // Preferences
  preferences: {
    difficulty: 'easy' | 'normal' | 'challenging';
    allowAutoAdjust: boolean;
    minDifficulty?: 'easy' | 'normal';
    maxDifficulty?: 'normal' | 'challenging';
    sessionLengthPreference: 'short' | 'medium' | 'long';  // 10/20/30 min
    pacePreference: 'slow' | 'normal' | 'fast';
  };

  // Learning style (inferred from behavior)
  learningStyle: {
    prefersRepetition: boolean;  // Replays often
    quickLearner: boolean;  // High success, fast responses
    needsEncouragement: boolean;  // Benefits from encouragement
    prefersShorterSessions: boolean;  // Completes better in short bursts
  };

  // Goals
  goals: {
    dailyGoalMinutes: number;
    weeklyGoalSessions: number;
    targetCompletionDate?: string;  // ISO date
  };

  // Historical data
  history: {
    totalSessions: number;
    totalMinutes: number;
    averageSessionLength: number;
    currentStreak: number;  // consecutive days
    longestStreak: number;
  };
}

// ============================================================================
// A/B TESTING
// ============================================================================

interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  startDate: string;  // ISO timestamp
  endDate: string;  // ISO timestamp
  active: boolean;

  // Variants
  variants: ABTestVariant[];

  // Assignment
  assignmentStrategy: 'random' | 'stratified' | 'manual';
  sampleSize: number;  // Total learners in test

  // Metrics to track
  primaryMetric: 'success_score' | 'completion_rate' | 'retention';
  secondaryMetrics: string[];
}

interface ABTestVariant {
  variantId: string;
  name: string;
  weight: number;  // 0.0 - 1.0 (must sum to 1.0 across variants)

  // Overrides to adaptation parameters
  parameterOverrides: Partial<AdaptationParameters>;
}

interface ABTestAssignment {
  learnerId: string;
  testId: string;
  variantId: string;
  assignedAt: string;  // ISO timestamp
}
```

---

## Adaptation Algorithm

### Decision Tree

The adaptation system uses a **decision tree** to determine when and how to adjust parameters:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADAPTATION DECISION TREE                      │
└─────────────────────────────────────────────────────────────────┘

After Each Session:
└─→ Calculate Success Score

    ├─→ Success Score > 0.85?
    │   └─→ YES
    │       ├─→ Check: 3+ consecutive high sessions?
    │       │   └─→ YES: Apply ETER Boost
    │       │       • Reduce cycles (N-1: 3→2)
    │       │       • Skip older reviews (N-3→skip)
    │       │       • Log: "high_success_sustained"
    │       │
    │       └─→ Check: 10+ consecutive high sessions?
    │           └─→ YES: Ramp Up Difficulty
    │               • Easy → Normal or Normal → Challenging
    │               • Log: "difficulty_ramp_up"
    │
    └─→ Success Score < 0.65?
        └─→ YES
            ├─→ Check: 3+ consecutive errors?
            │   └─→ YES: Trigger Recovery Mode
            │       • Shorten session (50% length)
            │       • Simplify ETER (only N-1)
            │       • Add encouragement
            │       • Log: "consecutive_errors"
            │
            └─→ Check: 5+ consecutive low sessions?
                └─→ YES: Ramp Down Difficulty
                    • Challenging → Normal or Normal → Easy
                    • Extend ETER (add cycles, shorten intervals)
                    • Log: "difficulty_ramp_down"

Special Checks:
├─→ High skip rate (> 20%)?
│   └─→ Suggest break or shorten next session
│
├─→ Slow response time on N-1 LEGOs?
│   └─→ Add extra N-1 cycles
│
└─→ Learner manually adjusts difficulty?
    └─→ Respect override, disable auto-adjust if requested
```

### Pseudocode Implementation

```typescript
function adaptAfterSession(
  performance: SessionPerformance,
  history: PerformanceHistory,
  currentState: LearnerAdaptationState,
  config: AdaptationParameters
): LearnerAdaptationState {

  const adjustments: AdaptationAdjustments = {};
  const events: AdaptationEvent[] = [];

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Check for High Success (Acceleration)
  // ═══════════════════════════════════════════════════════════════

  if (performance.successScore >= config.thresholds.successAccelerate) {
    currentState.consecutiveHighSessions++;
    currentState.consecutiveLowSessions = 0;

    // Apply ETER Boost after 3 consecutive high sessions
    if (currentState.consecutiveHighSessions >= 3) {
      adjustments.eter = {
        from: currentState.currentETERSchedule,
        to: config.eter.boostSchedule
      };

      events.push({
        timestamp: new Date().toISOString(),
        trigger: 'high_success_sustained',
        adjustments,
        reason: 'Accelerating ETER decay due to sustained high performance',
        sessionNumber: performance.sessionNumber
      });
    }

    // Ramp up difficulty after 10 consecutive high sessions
    if (currentState.consecutiveHighSessions >= 10 &&
        config.difficulty.allowAutoRamp) {
      const newDifficulty = rampUpDifficulty(currentState.currentDifficulty);

      if (newDifficulty !== currentState.currentDifficulty) {
        adjustments.difficulty = {
          from: currentState.currentDifficulty,
          to: newDifficulty
        };

        events.push({
          timestamp: new Date().toISOString(),
          trigger: 'difficulty_ramp_up',
          adjustments,
          reason: `Increasing difficulty to ${newDifficulty} after sustained mastery`,
          sessionNumber: performance.sessionNumber
        });

        currentState.consecutiveHighSessions = 0;  // Reset counter
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Check for Struggle (Support)
  // ═══════════════════════════════════════════════════════════════

  else if (performance.successScore < config.thresholds.struggleSlow) {
    currentState.consecutiveLowSessions++;
    currentState.consecutiveHighSessions = 0;

    // Trigger Recovery Mode after consecutive errors
    const consecutiveErrors = countConsecutiveErrors(performance);

    if (consecutiveErrors >= config.thresholds.consecutiveErrorsMax) {
      currentState.isRecovering = true;
      currentState.lastRecoverySession = new Date().toISOString();

      adjustments.eter = {
        from: currentState.currentETERSchedule,
        to: [{ offset: 1, cycles: 3 }]  // Simplify: only N-1
      };

      adjustments.sessionLength = {
        from: config.session.defaultDuration,
        to: config.session.defaultDuration * 0.5  // 50% shorter
      };

      events.push({
        timestamp: new Date().toISOString(),
        trigger: 'consecutive_errors',
        adjustments,
        reason: 'Entering recovery mode due to consecutive errors',
        sessionNumber: performance.sessionNumber
      });
    }

    // Extend ETER after sustained low performance
    else if (currentState.consecutiveLowSessions >= 3) {
      adjustments.eter = {
        from: currentState.currentETERSchedule,
        to: config.eter.extendSchedule
      };

      adjustments.repetitions = {
        from: currentState.currentRepetitions,
        to: {
          debut: Math.min(currentState.currentRepetitions.debut + 1, 3),
          target: Math.min(currentState.currentRepetitions.target + 1, 3),
          debu: Math.min(currentState.currentRepetitions.debu + 2, 10)
        }
      };

      events.push({
        timestamp: new Date().toISOString(),
        trigger: 'struggle_detected',
        adjustments,
        reason: 'Extending ETER and repetitions due to sustained low performance',
        sessionNumber: performance.sessionNumber
      });
    }

    // Ramp down difficulty after 5 consecutive low sessions
    if (currentState.consecutiveLowSessions >= 5 &&
        config.difficulty.allowAutoRamp) {
      const newDifficulty = rampDownDifficulty(currentState.currentDifficulty);

      if (newDifficulty !== currentState.currentDifficulty) {
        adjustments.difficulty = {
          from: currentState.currentDifficulty,
          to: newDifficulty
        };

        events.push({
          timestamp: new Date().toISOString(),
          trigger: 'difficulty_ramp_down',
          adjustments,
          reason: `Reducing difficulty to ${newDifficulty} to prevent overwhelm`,
          sessionNumber: performance.sessionNumber
        });

        currentState.consecutiveLowSessions = 0;  // Reset counter
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Apply Adjustments
  // ═══════════════════════════════════════════════════════════════

  if (adjustments.eter) {
    currentState.currentETERSchedule = adjustments.eter.to;
  }

  if (adjustments.repetitions) {
    currentState.currentRepetitions = adjustments.repetitions.to;
  }

  if (adjustments.difficulty) {
    currentState.currentDifficulty = adjustments.difficulty.to;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Update State
  // ═══════════════════════════════════════════════════════════════

  currentState.adaptationHistory.push(...events);
  currentState.recentPerformance.last5Sessions = [
    performance,
    ...currentState.recentPerformance.last5Sessions.slice(0, 4)
  ];
  currentState.lastUpdated = new Date().toISOString();

  return currentState;
}

// Helper functions
function rampUpDifficulty(current: string): string {
  if (current === 'easy') return 'normal';
  if (current === 'normal') return 'challenging';
  return 'challenging';  // Already at max
}

function rampDownDifficulty(current: string): string {
  if (current === 'challenging') return 'normal';
  if (current === 'normal') return 'easy';
  return 'easy';  // Already at min
}

function countConsecutiveErrors(performance: SessionPerformance): number {
  // Count consecutive incorrect responses within session
  // Implementation depends on detailed response tracking
  return performance.incorrectResponses;
}
```

---

## Integration with LEGO Sessions

### How Adaptations Affect Session Generation

The adaptation system **modifies the next LEGO Session** based on performance:

```typescript
function generateNextSession(
  sessionNumber: number,
  adaptationState: LearnerAdaptationState,
  courseManifest: CourseManifest
): LEGOSession {

  // Base session structure from manifest
  const baseLEGOs = courseManifest.getLEGOsForSession(sessionNumber);

  // Apply adaptations
  const session: LEGOSession = {
    sessionId: `S${String(sessionNumber).padStart(4, '0')}`,
    sessionNumber,

    // Introduction (apply repetition adjustments)
    introduction: {
      targetRepetitions: adaptationState.currentRepetitions.target,
      pauseBeforeTarget: 500,
      pauseBetweenTargets: 800
    },

    // Practice (apply LEGO count and repetition adjustments)
    practice: {
      newLEGOs: baseLEGOs.slice(0, getNewLEGOCount(adaptationState)),
      debutRepetitions: adaptationState.currentRepetitions.debut,
      debuCount: adaptationState.currentRepetitions.debu
    },

    // Spaced Review (apply ETER adjustments)
    spacedReview: {
      schedule: adaptationState.currentETERSchedule,
      reviews: generateReviews(sessionNumber, adaptationState.currentETERSchedule, courseManifest)
    },

    // Encouragement (insert if recovering)
    encouragement: adaptationState.isRecovering ? {
      insertAfterSession: true,
      message: "You're doing great! Keep going!"
    } : null
  };

  return session;
}

function getNewLEGOCount(state: LearnerAdaptationState): number {
  switch (state.currentDifficulty) {
    case 'easy': return 1;
    case 'normal': return 2;
    case 'challenging': return 3;
    default: return 2;
  }
}
```

### Example: Adapted Session vs. Default Session

**Default Session (Normal Difficulty)**
```
Session N
├─ Introduction: "I want" → "quiero" (2x)
├─ Practice:
│  ├─ New LEGO: "quiero" (debut 2x)
│  ├─ New LEGO: "aprender" (debut 2x)
│  └─ DEBU phrases: 7
└─ Spaced Review:
   ├─ N-1: 3 cycles
   ├─ N-2: 1 cycle
   ├─ N-3: 1 cycle
   └─ N-5: 1 cycle
```

**Adapted Session (After Struggle)**
```
Session N (Recovery Mode)
├─ Introduction: "I want" → "quiero" (3x, +1 repetition)
├─ Practice:
│  ├─ New LEGO: "quiero" (debut 3x, +1 repetition)
│  └─ DEBU phrases: 10 (+3 phrases for reinforcement)
└─ Spaced Review:
   ├─ N-1: 4 cycles (+1 cycle)
   ├─ N-2: 2 cycles (+1 cycle)
   └─ N-3: 2 cycles (+1 cycle)
   [N-5 skipped to shorten session]
└─ Encouragement: "You're doing great! Take your time."
```

**Adapted Session (After Success)**
```
Session N (Accelerated)
├─ Introduction: "I want" → "quiero" (1x, -1 repetition)
├─ Practice:
│  ├─ New LEGO: "quiero" (debut 1x, -1 repetition)
│  ├─ New LEGO: "aprender" (debut 1x)
│  ├─ New LEGO: "español" (debut 1x, +1 new LEGO)
│  └─ DEBU phrases: 5 (-2 phrases)
└─ Spaced Review:
   ├─ N-1: 2 cycles (-1 cycle)
   └─ N-2: 1 cycle
   [N-3 and N-5 skipped due to mastery]
```

---

## Adaptation Scenarios

### Scenario 1: Rapid Learner (Accelerate)

**Profile:**
- High accuracy (> 90%)
- Fast response times (< 2s)
- Completes sessions quickly
- Rarely replays or skips

**System Response:**
1. **After 3 consecutive high sessions:**
   - Apply ETER Boost (reduce cycles)
   - Reduce repetitions (debut: 2→1, debu: 7→5)

2. **After 10 consecutive high sessions:**
   - Ramp up difficulty (Normal → Challenging)
   - Introduce 3 new LEGOs per session (up from 2)
   - Shorter pauses (0.8x)

3. **Ongoing:**
   - Skip older reviews (N-5+) if mastered
   - Suggest longer sessions if interested

**Expected Outcome:** Learner progresses through course faster while maintaining high retention.

---

### Scenario 2: Struggling Learner (Support)

**Profile:**
- Low accuracy (< 60%)
- Slow response times (> 5s)
- High skip rate (> 20%)
- Frequently replays phrases

**System Response:**
1. **After 3 consecutive errors:**
   - Trigger Recovery Mode
   - Simplify ETER (only N-1 reviews)
   - Shorten session (50% length)
   - Add encouragement

2. **After 5 consecutive low sessions:**
   - Ramp down difficulty (Normal → Easy)
   - Increase repetitions (debut: 2→3, debu: 7→10)
   - Extend ETER (add N-4, increase cycles)

3. **Ongoing:**
   - Monitor for improvement
   - Gradually return to normal parameters
   - Suggest breaks if fatigue detected

**Expected Outcome:** Learner regains confidence and improves without feeling overwhelmed.

---

### Scenario 3: Inconsistent Learner (Stabilize)

**Profile:**
- Variable performance (sessions: 85%, 60%, 90%, 55%)
- Inconsistent response times
- Some sessions completed, some abandoned

**System Response:**
1. **After detecting variability:**
   - Avoid aggressive adjustments
   - Use conservative ETER (standard schedule)
   - Monitor for patterns (time of day? session length?)

2. **If pattern detected:**
   - Suggest optimal session times
   - Offer shorter session option
   - Add encouragement at session start

3. **Ongoing:**
   - Track for stabilization
   - Apply gentle adaptations (±1 cycle, not ±2)

**Expected Outcome:** Learner finds consistent rhythm and steady progress.

---

### Scenario 4: Fatigue Detection (Intervention)

**Profile:**
- Started strong (85%+) but declining within session
- Increasing response times as session progresses
- Skipping final phrases

**System Response:**
1. **During session:**
   - Detect declining performance (accuracy drop)
   - Offer break: "Want to take a quick break?"
   - Shorten remaining session if break declined

2. **After session:**
   - Log fatigue event
   - Suggest shorter sessions next time
   - Check if learner prefers different time of day

3. **Next session:**
   - Start with shorter target duration
   - Monitor for similar pattern
   - Adjust session length recommendation

**Expected Outcome:** Learner completes sessions without fatigue, maintains engagement.

---

## Learner Profiles

### Profile Types

The system can **infer learning styles** from behavior patterns and adapt accordingly:

#### Type 1: The Repeater
**Characteristics:**
- High replay rate (> 30%)
- Prefers hearing phrases multiple times
- Slow but accurate responses

**Adaptations:**
- Increase default repetitions (+1)
- Longer pauses (1.2x)
- Conservative ETER (no skips)

---

#### Type 2: The Speedster
**Characteristics:**
- Low replay rate (< 5%)
- Fast responses (< 2s average)
- High completion rate

**Adaptations:**
- Reduce repetitions (-1)
- Shorter pauses (0.8x)
- Aggressive ETER (skip mastered)

---

#### Type 3: The Cautious Learner
**Characteristics:**
- High accuracy but slow responses (> 4s)
- Rarely skips
- Completes sessions methodically

**Adaptations:**
- Standard repetitions
- Longer pauses (1.5x)
- Standard ETER
- Encouragement for confidence

---

#### Type 4: The Sprinter
**Characteristics:**
- Prefers short, intense sessions (10-15 min)
- High accuracy in short bursts
- Performance drops in longer sessions

**Adaptations:**
- Shorter session defaults (10-15 min)
- Higher new LEGO rate (compensate for shorter sessions)
- Encourage multiple short sessions per day

---

### Profile-Based Configuration

```typescript
interface LearnerProfileConfig {
  profileType: 'repeater' | 'speedster' | 'cautious' | 'sprinter' | 'custom';

  // Inferred from behavior
  inferredAt: string;  // ISO timestamp
  confidenceScore: number;  // 0.0 - 1.0 (how confident we are in profile)

  // Profile-specific overrides
  overrides: Partial<AdaptationParameters>;
}

// Example: The Repeater
const repeaterProfile: LearnerProfileConfig = {
  profileType: 'repeater',
  inferredAt: '2025-12-05T10:30:00Z',
  confidenceScore: 0.85,

  overrides: {
    repetitions: {
      debutDefault: 3,  // +1 from standard
      targetDefault: 3,  // +1 from standard
      debuDefault: 9    // +2 from standard
    },
    eter: {
      defaultSchedule: [
        { offset: 1, cycles: 4 },  // +1 cycle
        { offset: 2, cycles: 2 },  // +1 cycle
        { offset: 3, cycles: 2 },  // +1 cycle
        { offset: 5, cycles: 1 }
      ]
    }
  }
};
```

---

## Data Tracking

### Required Data Points

To enable effective adaptation, the system must track:

#### Session-Level Data
```typescript
interface SessionData {
  // Identity
  sessionId: string;
  learnerId: string;
  courseCode: string;
  sessionNumber: number;

  // Timing
  startedAt: string;  // ISO timestamp
  completedAt: string;  // ISO timestamp
  duration: number;  // milliseconds

  // Performance
  prompts: PromptResult[];  // Detailed per-prompt data

  // Aggregates
  totalPrompts: number;
  correctResponses: number;
  incorrectResponses: number;
  skippedPrompts: number;
  replayedPrompts: number;

  // Context
  adaptationState: LearnerAdaptationState;  // State BEFORE session
  adaptationStateAfter: LearnerAdaptationState;  // State AFTER session
}

interface PromptResult {
  promptId: string;
  legoId: string;
  cycleType: 'introduction' | 'debut' | 'practice' | 'review';
  eterOffset?: number;  // If review, which N-x

  // Learner response
  responseType: 'correct' | 'incorrect' | 'skip' | 'replay';
  responseTime: number;  // milliseconds (time to attempt)
  replayCount: number;  // How many times replayed before attempting

  // Context
  isNewLEGO: boolean;  // First time seeing this LEGO?
  legoAge: number;  // How many sessions since introduced?
}
```

#### Longitudinal Data (Learner Progress)
```typescript
interface LearnerProgress {
  learnerId: string;
  courseCode: string;

  // Milestones
  startedAt: string;  // ISO timestamp
  lastSessionAt: string;  // ISO timestamp
  currentSession: number;
  totalSessions: number;

  // Performance trends
  performanceHistory: SessionPerformance[];  // All sessions
  averageSuccessScore: number;
  successTrend: 'improving' | 'stable' | 'declining';

  // LEGO mastery
  legosIntroduced: string[];  // LEGO IDs
  legosMastered: string[];  // LEGOs with 90%+ accuracy over 5 reviews
  currentLEGOs: string[];  // LEGOs in active review

  // Adaptation history
  adaptationEvents: AdaptationEvent[];
  currentAdaptationState: LearnerAdaptationState;
}
```

#### Storage Schema (Database)

**Tables:**
1. `learners` - Learner profiles and preferences
2. `sessions` - Session-level data
3. `prompt_results` - Per-prompt response data
4. `adaptation_events` - Adaptation history
5. `learner_progress` - Longitudinal tracking
6. `ab_test_assignments` - A/B test variant assignments

**Indexes:**
- `sessions.learner_id, sessions.course_code, sessions.session_number`
- `prompt_results.session_id, prompt_results.lego_id`
- `adaptation_events.learner_id, adaptation_events.timestamp`

---

## A/B Testing Framework

### Purpose

Test different adaptation strategies to optimize learning outcomes:

**Example Tests:**
- **Test A:** Standard ETER schedule vs. Accelerated ETER
- **Test B:** Conservative repetitions vs. Adaptive repetitions
- **Test C:** Auto-difficulty ramping vs. Manual-only difficulty

### Test Configuration

```typescript
const abTest: ABTestConfig = {
  testId: 'eter_acceleration_2025_12',
  name: 'ETER Acceleration Study',
  description: 'Compare standard ETER vs. accelerated decay for high performers',
  startDate: '2025-12-01T00:00:00Z',
  endDate: '2026-01-31T23:59:59Z',
  active: true,

  variants: [
    {
      variantId: 'control',
      name: 'Standard ETER',
      weight: 0.5,  // 50% of learners
      parameterOverrides: {
        eter: {
          defaultSchedule: [
            { offset: 1, cycles: 3 },
            { offset: 2, cycles: 1 },
            { offset: 3, cycles: 1 },
            { offset: 5, cycles: 1 }
          ]
        }
      }
    },
    {
      variantId: 'treatment',
      name: 'Accelerated ETER',
      weight: 0.5,  // 50% of learners
      parameterOverrides: {
        eter: {
          boostSchedule: [
            { offset: 1, cycles: 2 },  // -1 cycle
            { offset: 2, cycles: 1 },
            // Skip offset 3
            { offset: 5, cycles: 1 }
          ]
        }
      }
    }
  ],

  assignmentStrategy: 'random',
  sampleSize: 1000,
  primaryMetric: 'success_score',
  secondaryMetrics: ['completion_rate', 'retention', 'session_duration']
};
```

### Implementation

```typescript
function assignLearnerToTest(
  learnerId: string,
  testConfig: ABTestConfig
): ABTestAssignment {

  // Check if already assigned
  const existing = getExistingAssignment(learnerId, testConfig.testId);
  if (existing) return existing;

  // Random assignment based on weights
  const rand = Math.random();
  let cumulativeWeight = 0;

  for (const variant of testConfig.variants) {
    cumulativeWeight += variant.weight;

    if (rand <= cumulativeWeight) {
      const assignment: ABTestAssignment = {
        learnerId,
        testId: testConfig.testId,
        variantId: variant.variantId,
        assignedAt: new Date().toISOString()
      };

      // Store assignment
      saveAssignment(assignment);

      return assignment;
    }
  }

  // Fallback to control
  return {
    learnerId,
    testId: testConfig.testId,
    variantId: 'control',
    assignedAt: new Date().toISOString()
  };
}

function getAdaptationParametersForLearner(
  learnerId: string,
  baseConfig: AdaptationParameters
): AdaptationParameters {

  // Check for active A/B tests
  const activeTests = getActiveTestsForLearner(learnerId);

  if (activeTests.length === 0) {
    return baseConfig;  // No overrides
  }

  // Apply overrides from test variants
  let config = { ...baseConfig };

  for (const test of activeTests) {
    const assignment = getExistingAssignment(learnerId, test.testId);
    const variant = test.variants.find(v => v.variantId === assignment.variantId);

    if (variant && variant.parameterOverrides) {
      config = deepMerge(config, variant.parameterOverrides);
    }
  }

  return config;
}
```

### Metrics Collection

Track outcomes for each variant:

```typescript
interface ABTestMetrics {
  testId: string;
  variantId: string;

  // Participant data
  totalParticipants: number;
  activeParticipants: number;  // Still engaged

  // Performance metrics
  averageSuccessScore: number;
  medianSuccessScore: number;
  successScoreStdDev: number;

  // Engagement metrics
  averageSessionsCompleted: number;
  completionRate: number;  // % who finish course
  retentionRate: number;  // % still active after 30 days

  // Secondary metrics
  averageSessionDuration: number;
  totalLearningTime: number;
  adaptationEventCount: number;

  // Statistical significance
  pValue: number;  // Compared to control
  confidenceInterval: [number, number];
}
```

---

## Integration with ssi-learning-app

### Architecture

The **Adaptations System** lives in the `ssi-learning-app` (learner-facing app), but is **configured** via the `ssi-dashboard-v7-clean` (course creation system).

```
┌─────────────────────────────────────────────────────────────────┐
│                     ssi-dashboard-v7-clean                       │
│                   (Course Production System)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Define course-level adaptation parameters                    │
│  • Configure A/B tests                                          │
│  • Set default ETER schedules                                   │
│  • Publish course_manifest.json with adaptation config          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ (course_manifest.json + adaptation_config.json)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ssi-learning-app                           │
│                    (Learner Experience)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Load course manifest + adaptation config                     │
│  • Track learner performance per session                        │
│  • Calculate success scores and metrics                         │
│  • Apply adaptation algorithm                                   │
│  • Generate adapted LEGO sessions                               │
│  • Store learner progress and adaptation state                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Manifest Integration

**course_manifest.json** includes adaptation configuration:

```json
{
  "version": "11.0.0",
  "course_code": "spa_for_eng",
  "target_language": "spa",
  "known_language": "eng",

  "adaptation_config": {
    "enabled": true,
    "version": "1.0.0",

    "default_parameters": {
      "thresholds": {
        "successAccelerate": 0.85,
        "struggleSlow": 0.65,
        "consecutiveErrorsMax": 3,
        "fastResponseTime": 2000,
        "slowResponseTime": 5000
      },

      "eter": {
        "defaultSchedule": [
          { "offset": 1, "cycles": 3 },
          { "offset": 2, "cycles": 1 },
          { "offset": 3, "cycles": 1 },
          { "offset": 5, "cycles": 1 }
        ],
        "boostSchedule": [
          { "offset": 1, "cycles": 2 },
          { "offset": 2, "cycles": 1 },
          { "offset": 5, "cycles": 1 }
        ],
        "extendSchedule": [
          { "offset": 1, "cycles": 4 },
          { "offset": 2, "cycles": 2 },
          { "offset": 3, "cycles": 2 },
          { "offset": 4, "cycles": 1 },
          { "offset": 5, "cycles": 1 }
        ]
      },

      "difficulty": {
        "initialLevel": "normal",
        "allowAutoRamp": true
      }
    },

    "ab_tests": [
      {
        "testId": "eter_acceleration_2025_12",
        "active": true,
        "variants": [...]
      }
    ]
  },

  "seeds": [...]
}
```

### API Endpoints (ssi-learning-app)

```typescript
// Track session performance
POST /api/learner/:learnerId/sessions
Body: SessionPerformance
Response: { adaptationState: LearnerAdaptationState }

// Get next session (with adaptations applied)
GET /api/learner/:learnerId/next-session
Response: LEGOSession (adapted)

// Get learner progress
GET /api/learner/:learnerId/progress
Response: LearnerProgress

// Update learner preferences
PUT /api/learner/:learnerId/preferences
Body: LearnerProfile.preferences
Response: { success: boolean }

// Get adaptation history
GET /api/learner/:learnerId/adaptations
Response: AdaptationEvent[]
```

---

## Configuration Management

### Course-Level Configuration

**Default configuration** set in dashboard during course creation:

```typescript
// In ssi-dashboard-v7-clean
const courseAdaptationConfig: AdaptationParameters = {
  thresholds: {
    successAccelerate: 0.85,
    struggleSlow: 0.65,
    consecutiveErrorsMax: 3,
    fastResponseTime: 2000,
    slowResponseTime: 5000
  },

  eter: {
    defaultSchedule: [
      { offset: 1, cycles: 3 },
      { offset: 2, cycles: 1 },
      { offset: 3, cycles: 1 },
      { offset: 5, cycles: 1 }
    ],
    boostSchedule: [...],
    extendSchedule: [...]
  },

  // ... other parameters
};

// Included in course_manifest.json
manifest.adaptation_config = {
  enabled: true,
  version: '1.0.0',
  default_parameters: courseAdaptationConfig
};
```

### Learner-Level Overrides

**Learners can override** certain parameters in the app:

```typescript
// In ssi-learning-app
interface LearnerPreferences {
  difficulty: 'easy' | 'normal' | 'challenging';
  allowAutoAdjust: boolean;
  sessionLengthPreference: 'short' | 'medium' | 'long';
  pacePreference: 'slow' | 'normal' | 'fast';
}

// Learner sets preferences → stored in app database
// Adaptations respect preferences (e.g., won't auto-ramp if disabled)
```

### Environment-Specific Configuration

Different configurations for **testing vs. production**:

```typescript
// Development: Aggressive adaptations for testing
const devConfig: Partial<AdaptationParameters> = {
  thresholds: {
    successAccelerate: 0.7,  // Lower threshold for faster testing
    consecutiveErrorsMax: 2   // Trigger recovery sooner
  }
};

// Production: Conservative adaptations for real learners
const prodConfig: Partial<AdaptationParameters> = {
  thresholds: {
    successAccelerate: 0.85,
    consecutiveErrorsMax: 3
  }
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Define TypeScript interfaces (all types above)
- [ ] Implement performance tracking in ssi-learning-app
- [ ] Create database schema for learner progress
- [ ] Build basic adaptation algorithm (ETER boost/extend only)

### Phase 2: Core Adaptations (Weeks 3-4)
- [ ] Implement difficulty ramping (up/down)
- [ ] Add repetition adjustments
- [ ] Implement recovery mode
- [ ] Create adaptation event logging

### Phase 3: Learner Profiles (Week 5)
- [ ] Infer learner profiles from behavior
- [ ] Apply profile-specific overrides
- [ ] Build preference UI in app
- [ ] Test with real learners

### Phase 4: A/B Testing (Week 6)
- [ ] Implement test assignment logic
- [ ] Create test configuration UI in dashboard
- [ ] Build metrics collection
- [ ] Statistical analysis tools

### Phase 5: Refinement (Weeks 7-8)
- [ ] Tune thresholds based on data
- [ ] Optimize adaptation algorithm
- [ ] Add ML model (optional - future)
- [ ] Performance optimization

### Phase 6: Launch (Week 9)
- [ ] Full integration testing
- [ ] Documentation for learners
- [ ] Launch with spa_for_eng course
- [ ] Monitor and iterate

---

## Success Metrics

### System-Level Metrics

**Effectiveness:**
- Improved learner success scores over time
- Higher course completion rates
- Better retention (30-day, 90-day)

**Engagement:**
- Increased session frequency
- Longer average engagement (total learning time)
- Lower dropout rates

**Personalization:**
- % of learners receiving adaptations (target: 80%+)
- Variety of adaptation paths (not one-size-fits-all)
- Learner satisfaction with pace

### A/B Test Metrics

**Primary:**
- Success score improvement (treatment vs. control)
- Course completion rate
- Retention rate (30-day, 90-day)

**Secondary:**
- Session duration
- Total learning time
- Adaptation event frequency
- Learner-reported satisfaction

---

## Future Enhancements

### Machine Learning Model (Phase 2)

Replace decision tree with **ML model** for more sophisticated adaptations:

**Features:**
- Historical performance (last 10 sessions)
- LEGO-specific accuracy
- Time of day, day of week
- Session length trends
- Response time patterns

**Target:**
- Predict optimal ETER schedule
- Predict optimal difficulty level
- Predict risk of dropout

**Model:**
- Supervised learning (regression/classification)
- Train on historical learner data
- Continuous retraining with new data

### Social Adaptations

**Peer comparison** (optional, opt-in):
- "You're progressing faster than 70% of learners at this stage"
- "Other learners found Session 42 challenging - you're doing great!"

**Community challenges:**
- Encourage consistency with streaks
- Group goals (total learning time)

### Voice Assistant Integration

**Adaptive prompts** based on performance:
- "You're doing amazing! Ready to speed up?"
- "Let's take it slower for this session."
- "Would you like a quick review of recent LEGOs?"

---

## Conclusion

The **Adaptations System** transforms SSi courses from static to dynamic, personalizing the learning experience for each individual. By monitoring performance, adjusting parameters intelligently, and respecting learner preferences, the system optimizes the balance between challenge and retention.

**Key Principles:**
1. **Monitor continuously** - Track performance at session and prompt level
2. **Adapt intelligently** - Use thresholds and algorithms to make informed decisions
3. **Respect preferences** - Allow learners to control their experience
4. **Test rigorously** - Use A/B testing to optimize strategies
5. **Iterate constantly** - Refine based on data and learner feedback

This specification provides the **foundation** for implementing adaptive learning at SSi. The system is designed to be configurable at the course level but personalized to individual learners, ensuring every learner has the best possible chance of success.

---

**Version**: 1.0.0
**Created**: 2025-12-05
**Author**: Claude Code
**Project**: SSi Dashboard v7 - Adaptations System
**Related Documents**:
- `COURSE_CREATION_MASTER_OVERVIEW.md` - Big picture overview
- `LEGO_SESSION_SPECIFICATION.md` - Session structure
- `VOICE_CONFIGURATION_SPEC.md` - Voice config interface
