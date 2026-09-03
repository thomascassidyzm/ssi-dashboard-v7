# Course Production Suite Architecture
**Integrated QA, Recording, and Audio Pipeline System**

Version: 2.0.0
Date: 2025-12-04
Status: Architecture Design
Pipeline: Supabase-backed (APML v10.2)

---

## Executive Summary

The **Course Production Suite** is an integrated system connecting four specialized tools for language course production:

1. **Script Viewer (QA Tool)** - Descript-style browser for reviewing entire courses
2. **Audio Pipeline** - TTS generation and batch audio processing
3. **Recording Studio** - Autocue system for manual recording
4. **Audio Samples Browser** - Quality review interface for all audio

This document defines how these components share data, communicate, and present a unified workflow to production teams and future volunteer course creators.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow & State Management](#data-flow--state-management)
3. [Shared Data Structures](#shared-data-structures)
4. [Navigation Design](#navigation-design)
5. [Status Dashboard](#status-dashboard)
6. [Component Specifications](#component-specifications)
7. [API Endpoints](#api-endpoints)
8. [Future-Proofing](#future-proofing)

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   COURSE PRODUCTION SUITE                            │
│                  (Mission Control Dashboard)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Script Viewer   │    │  Audio Pipeline  │    │ Recording Studio │
│   (QA Tool)      │    │   (TTS Batch)    │    │  (Manual Voice)  │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ • Flag items     │    │ • Batch TTS gen  │    │ • Autocue UI     │
│ • Text edits     │    │ • Status monitor │    │ • Phrase grouping│
│ • Filter view    │    │ • Retry failed   │    │ • Slow-with-gaps │
│ • Deep link      │    │ • Preview audio  │    │ • Upload to S3   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │  Audio Samples Browser   │
                    │   (Quality Review)       │
                    ├──────────────────────────┤
                    │ • Review all audio       │
                    │ • Approve/Reject         │
                    │ • Compare TTS vs Human   │
                    │ • Flag for re-record     │
                    └──────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Storage (SSoT)         │
                    ├──────────────────────────┤
                    │ Supabase:                │
                    │ • audio_samples (MAR)    │
                    │ • sample_flags (QA)      │
                    │ • voices (registry)      │
                    │                          │
                    │ S3 (popty-bach-lfs):     │
                    │ • course_manifest.json   │
                    │ • mastered/{uuid}.mp3    │
                    └──────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                            │
│                                                                      │
│  Supabase (Master Audio Registry):                                  │
│    ├── audio_samples             ← All audio metadata + UUIDs       │
│    ├── sample_flags              ← QA decisions & status tracking   │
│    ├── voices                    ← TTS & human voice registry       │
│    └── course_audio_usage        ← Which courses use which audio    │
│                                                                      │
│  S3 (popty-bach-lfs):                                               │
│    ├── courses/{code}/                                              │
│    │   ├── lego_baskets.json     ← Phase 3 output                  │
│    │   └── course_manifest.json  ← Phase 9 output                  │
│    └── ssiborg-assets/mastered/{uuid}.mp3  ← Audio files           │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    │ (All tools read/write through API)
                    │
    ┌───────────────┼───────────────┬────────────────┐
    ▼               ▼               ▼                ▼
┌────────┐   ┌──────────┐   ┌───────────┐   ┌─────────────┐
│ Script │   │  Audio   │   │ Recording │   │   Samples   │
│ Viewer │   │ Pipeline │   │  Studio   │   │   Browser   │
└────────┘   └──────────┘   └───────────┘   └─────────────┘
```

### Flag Status Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    Sample Status States                         │
└────────────────────────────────────────────────────────────────┘

   [pending]          Initial state for all samples
       │
       ├─→ [flagged_text_edit]     Text needs correction
       ├─→ [flagged_regen_tts]     Audio needs TTS regeneration
       ├─→ [flagged_human_needed]  Requires human recording
       ├─→ [approved]              Audio is good
       │
       ▼
   [in_pipeline]      TTS generation queued/running
       │
       ├─→ [tts_complete]          TTS file generated
       ├─→ [tts_failed]            TTS failed (retry or flag human)
       │
       ▼
   [in_recording]     Human recording session active
       │
       ├─→ [recorded]              Human recording uploaded
       │
       ▼
   [needs_review]     Audio ready for QA review
       │
       ├─→ [approved]              Final approval
       ├─→ [rejected]              Send back (regen_tts or human_needed)
       │
       ▼
   [complete]         Final state - audio published
```

---

## Data Flow & State Management

### Shared State Hierarchy

The system operates with **three tiers of truth**:

1. **S3 (Single Source of Truth)** - Persistent, versioned, shared across all users
2. **LocalStorage Cache** - Per-user draft edits and UI state
3. **In-Memory State** - Current session playback, filters, selections

```javascript
// S3 Storage Structure (SSoT)
courses/spa_for_eng/
  ├── course_manifest.json          // Phase 7 output (read-only for QA)
  ├── sample_flags.json              // QA decisions (read/write)
  └── audio_metadata.json            // Generated audio info (read/write)

ssiborg-assets/
  └── mastered/
      ├── a1b2c3d4-e5f6-7890.mp3     // TTS or human recording
      └── f7e8d9c0-b1a2-3456.mp3
```

### sample_flags Table Schema (Supabase)

**Note:** Sample flags are now stored in Supabase `sample_flags` table, not JSON files.

```json
// Example row structure (stored in Supabase)
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "last_updated": "2025-12-04T12:34:56Z",
  "updated_by": "user@example.com",
  "samples": {
    "a1b2c3d4-e5f6-7890": {
      "uuid": "a1b2c3d4-e5f6-7890",
      "status": "flagged_regen_tts",
      "flags": {
        "text_edit": false,
        "audio_regenerate": true,
        "human_recording": false
      },
      "notes": "Pronunciation of 'quiero' sounds unnatural",
      "flagged_by": "qa_reviewer@example.com",
      "flagged_at": "2025-12-04T10:15:00Z",
      "context": {
        "seed_id": "S0042",
        "cycle_index": 3,
        "phrase": "Yo quiero aprender español",
        "voice_id": "azure_es_ES_female_01"
      },
      "history": [
        {
          "status": "pending",
          "timestamp": "2025-12-01T08:00:00Z",
          "user": "system"
        },
        {
          "status": "flagged_regen_tts",
          "timestamp": "2025-12-04T10:15:00Z",
          "user": "qa_reviewer@example.com",
          "note": "Pronunciation issue"
        }
      ]
    }
  },
  "summary": {
    "total_samples": 12543,
    "pending": 8234,
    "flagged_text_edit": 42,
    "flagged_regen_tts": 127,
    "flagged_human_needed": 18,
    "in_pipeline": 56,
    "in_recording": 12,
    "needs_review": 89,
    "approved": 3891,
    "complete": 74
  }
}
```

### audio_metadata.json Schema

```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "last_updated": "2025-12-04T14:20:33Z",
  "audio_files": {
    "a1b2c3d4-e5f6-7890": {
      "uuid": "a1b2c3d4-e5f6-7890",
      "s3_key": "ssiborg-assets/mastered/a1b2c3d4-e5f6-7890.mp3",
      "duration_ms": 2340,
      "file_size_bytes": 37440,
      "voice_id": "azure_es_ES_female_01",
      "generation_method": "tts",
      "created_at": "2025-12-03T09:12:45Z",
      "created_by": "audio_pipeline_v8",
      "checksum_md5": "d41d8cd98f00b204e9800998ecf8427e",
      "waveform_peaks": [0.2, 0.8, 0.6, ...],  // For visualizations
      "metadata": {
        "seed_id": "S0042",
        "phrase": "Yo quiero aprender español",
        "language": "spa",
        "tts_engine": "azure",
        "voice_variant": "es-ES-ElviraNeural"
      }
    }
  }
}
```

### State Synchronization Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User Action: Flag sample for regeneration                   │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Update LocalStorage  │ (optimistic update)
        │  status: pending →    │
        │  flagged_regen_tts    │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  POST /api/samples/   │
        │      flag             │
        │  {uuid, status, note} │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Backend merges to    │
        │  S3: sample_flags.json│
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  WebSocket broadcast  │
        │  to all connected     │
        │  clients              │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Other users' UIs     │
        │  update automatically │
        └───────────────────────┘
```

---

## Shared Data Structures

### CourseManifest (from Phase 7 - Read Only)

```typescript
interface CourseManifest {
  version: string;              // "10.1.0"
  course_code: string;          // "spa_for_eng"
  target_language: string;      // "spa"
  known_language: string;       // "eng"
  total_seeds: number;          // 668
  generated_at: string;         // ISO timestamp

  seeds: Seed[];
}

interface Seed {
  seed_id: string;              // "S0042"
  seed_pair: [string, string];  // [target, known]
  legos: Lego[];
  cycles: Cycle[];              // All learning cycles for this seed
}

interface Lego {
  id: string;                   // "S0042L01"
  type: "A" | "M";              // Atomic or Molecular
  target: string;
  known: string;
  components?: [string, string][]; // For M-type
}

interface Cycle {
  uuid: string;                 // Deterministic UUID
  type: "introduction" | "lego_debut" | "lego_component" | "practice";
  seed_id: string;
  lego_id?: string;             // If related to a LEGO

  // The two key phrases
  target: string;               // Target language phrase
  known: string;                // Known language phrase

  // Audio references
  target_audio_uuid: string;
  known_audio_uuid: string;

  // Context for QA tools
  context: {
    is_debut?: boolean;
    is_component?: boolean;
    pattern_id?: string;
    cumulative_legos: number;
  };
}
```

### SampleFlag (QA Tool State)

```typescript
interface SampleFlag {
  uuid: string;                 // Audio file UUID
  status: SampleStatus;
  flags: {
    text_edit: boolean;         // Text needs correction
    audio_regenerate: boolean;  // TTS needs regeneration
    human_recording: boolean;   // Needs human voice
  };
  notes: string;                // QA reviewer notes
  flagged_by: string;           // User email
  flagged_at: string;           // ISO timestamp

  // Context for navigation
  context: {
    seed_id: string;
    cycle_index: number;
    phrase: string;
    voice_id: string;
  };

  // History tracking
  history: StatusChange[];
}

type SampleStatus =
  | "pending"
  | "flagged_text_edit"
  | "flagged_regen_tts"
  | "flagged_human_needed"
  | "in_pipeline"
  | "tts_complete"
  | "tts_failed"
  | "in_recording"
  | "recorded"
  | "needs_review"
  | "approved"
  | "rejected"
  | "complete";

interface StatusChange {
  status: SampleStatus;
  timestamp: string;
  user: string;
  note?: string;
}
```

### RecordingQueue (Recording Studio State)

```typescript
interface RecordingQueue {
  course_code: string;
  language: string;             // Target language code
  queue_id: string;             // Unique queue identifier
  assigned_to?: string;         // User email (for volunteer system)

  items: RecordingItem[];

  statistics: {
    total: number;
    recorded: number;
    remaining: number;
    estimated_time_minutes: number;
  };
}

interface RecordingItem {
  uuid: string;                 // Audio file UUID
  phrase: string;               // Text to record
  context: {
    seed_id: string;
    cycle_type: string;
    is_debut?: boolean;
  };

  // Autocue grouping
  group_id: string;             // For phrase grouping
  slow_mode: boolean;           // Slow-with-gaps mode

  // Recording metadata
  recorded_at?: string;
  recorded_by?: string;
  voice_id?: string;            // "human_maria_spa"
  s3_key?: string;              // Upload location

  // Quality flags
  needs_review: boolean;
  approved: boolean;
}
```

---

## Navigation Design

### Route Structure

```
/production                                    → Mission Control Dashboard
/production/:courseCode                        → Course Production Overview
/production/:courseCode/script                 → Script Viewer (QA Tool)
/production/:courseCode/script?seed=S0042      → Deep link to specific seed
/production/:courseCode/audio-pipeline         → Audio Pipeline Status
/production/:courseCode/recording              → Recording Studio
/production/:courseCode/recording?queue=xyz    → Specific recording queue
/production/:courseCode/samples                → Audio Samples Browser
/production/:courseCode/samples?status=flagged → Filtered sample view
```

### Navigation Component (Global)

```vue
<template>
  <nav class="production-suite-nav">
    <!-- Course Context -->
    <div class="course-context">
      <router-link to="/production">
        ← All Courses
      </router-link>
      <h2>{{ courseCode }}</h2>
      <div class="progress-ring">
        <svg><!-- Circular progress: samples complete / total --></svg>
        <span>{{ completionPercent }}%</span>
      </div>
    </div>

    <!-- Tool Tabs -->
    <div class="tool-tabs">
      <router-link
        :to="`/production/${courseCode}/script`"
        :class="{ active: isActive('script') }"
      >
        <Icon name="document-text" />
        Script Viewer
        <Badge v-if="flaggedCount > 0">{{ flaggedCount }}</Badge>
      </router-link>

      <router-link
        :to="`/production/${courseCode}/audio-pipeline`"
        :class="{ active: isActive('audio-pipeline') }"
      >
        <Icon name="cpu-chip" />
        Audio Pipeline
        <Badge v-if="pipelineActive">{{ pipelineCount }} running</Badge>
      </router-link>

      <router-link
        :to="`/production/${courseCode}/recording`"
        :class="{ active: isActive('recording') }"
      >
        <Icon name="microphone" />
        Recording Studio
        <Badge v-if="recordingQueue > 0">{{ recordingQueue }}</Badge>
      </router-link>

      <router-link
        :to="`/production/${courseCode}/samples`"
        :class="{ active: isActive('samples') }"
      >
        <Icon name="musical-note" />
        Samples Browser
        <Badge v-if="needsReview > 0">{{ needsReview }} review</Badge>
      </router-link>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button @click="sendToTTS" v-if="canSendToTTS">
        Send {{ flaggedTTSCount }} to TTS Pipeline
      </button>
      <button @click="createRecordingQueue" v-if="canCreateQueue">
        Queue {{ humanNeededCount }} for Recording
      </button>
    </div>
  </nav>
</template>
```

### Deep Linking Examples

```javascript
// From Script Viewer: "Open this in Recording Studio"
router.push({
  name: 'RecordingStudio',
  params: { courseCode: 'spa_for_eng' },
  query: {
    seed: 'S0042',
    uuid: 'a1b2c3d4-e5f6-7890'
  }
});

// From Recording Studio: "Review this in Samples Browser"
router.push({
  name: 'SamplesBrowser',
  params: { courseCode: 'spa_for_eng' },
  query: {
    uuid: 'a1b2c3d4-e5f6-7890',
    autoplay: 'true'
  }
});

// From Audio Pipeline: "Check QA flags for failed items"
router.push({
  name: 'ScriptViewer',
  params: { courseCode: 'spa_for_eng' },
  query: {
    filter: 'tts_failed',
    highlight: 'a1b2c3d4-e5f6-7890'
  }
});
```

### Breadcrumb Pattern

```
Production Suite  >  spa_for_eng  >  Script Viewer  >  Seed S0042
     [Home]            [Overview]     [Current Tool]    [Context]
```

---

## Status Dashboard (Mission Control)

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  COURSE PRODUCTION SUITE - MISSION CONTROL                      │
│  Course: Spanish for English (spa_for_eng)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OVERALL PROGRESS                                                │
│  ═══════════════════════════════════════════ 68% Complete       │
│                                                                  │
│  8,543 / 12,543 samples approved                                │
│  Estimated completion: 2025-12-15 (11 days)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BLOCKERS & ATTENTION NEEDED                                     │
│                                                                  │
│  🚨 18 samples flagged for human recording (Macedonian)         │
│     → [Create Recording Queue]                                  │
│                                                                  │
│  ⚠️  127 samples flagged for TTS regeneration                   │
│     → [Send to Audio Pipeline]                                  │
│                                                                  │
│  ✅ Audio Pipeline: 56 samples processing (ETA: 23 minutes)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PIPELINE STATUS BY STAGE                                        │
│                                                                  │
│  QA Review (Script Viewer)                                       │
│  ════════════════════════════════════ 8,234 / 12,543 reviewed   │
│  Status: In Progress                                            │
│  Last activity: 5 minutes ago (qa_reviewer@ssi.org)            │
│                                                                  │
│  TTS Generation (Audio Pipeline)                                │
│  ═════════════════════ 3,891 / 12,543 completed                │
│  Status: Running (56 in queue)                                 │
│  Last activity: Active now                                      │
│                                                                  │
│  Human Recording (Recording Studio)                             │
│  ══════ 12 / 18 recorded                                        │
│  Status: 6 remaining                                            │
│  Assigned to: maria@volunteers.org                             │
│  Last activity: 2 hours ago                                     │
│                                                                  │
│  Final Review (Samples Browser)                                 │
│  ════════════════════════ 89 samples awaiting review            │
│  Status: Needs attention                                        │
│  Last activity: 30 minutes ago                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TOOLS QUICK ACCESS                                              │
│                                                                  │
│  [📄 Script Viewer]    [⚙️ Audio Pipeline]                       │
│  [🎤 Recording Studio] [🔊 Samples Browser]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component: StatusDashboard.vue

```vue
<template>
  <div class="mission-control">
    <!-- Header -->
    <header class="dashboard-header">
      <h1>Course Production Suite</h1>
      <div class="course-selector">
        <select v-model="selectedCourse">
          <option v-for="course in courses" :value="course.code">
            {{ course.name }} ({{ course.code }})
          </option>
        </select>
      </div>
    </header>

    <!-- Overall Progress -->
    <section class="overall-progress">
      <h2>Overall Progress</h2>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${completionPercent}%` }"
        />
      </div>
      <div class="stats">
        <div class="stat">
          <span class="value">{{ approvedCount }}</span>
          <span class="label">Approved</span>
        </div>
        <div class="stat">
          <span class="value">{{ totalCount }}</span>
          <span class="label">Total Samples</span>
        </div>
        <div class="stat">
          <span class="value">{{ estimatedDays }}</span>
          <span class="label">Days to Complete</span>
        </div>
      </div>
    </section>

    <!-- Blockers -->
    <section class="blockers" v-if="hasBlockers">
      <h2>Attention Needed</h2>
      <div class="blocker-list">
        <div
          v-for="blocker in blockers"
          :key="blocker.id"
          class="blocker-card"
          :class="blocker.severity"
        >
          <div class="blocker-icon">{{ blocker.icon }}</div>
          <div class="blocker-content">
            <p class="blocker-message">{{ blocker.message }}</p>
            <button
              @click="resolveBlocker(blocker)"
              class="action-button"
            >
              {{ blocker.actionLabel }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Pipeline Stages -->
    <section class="pipeline-stages">
      <h2>Pipeline Status</h2>
      <div class="stage-list">
        <PipelineStage
          v-for="stage in pipelineStages"
          :key="stage.id"
          :stage="stage"
          @navigate="navigateToTool"
        />
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="quick-actions">
      <h2>Quick Access</h2>
      <div class="tool-grid">
        <ToolCard
          v-for="tool in tools"
          :key="tool.id"
          :tool="tool"
          @click="navigateToTool(tool.route)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '@/stores/production';
import PipelineStage from '@/components/production/PipelineStage.vue';
import ToolCard from '@/components/production/ToolCard.vue';

const router = useRouter();
const productionStore = useProductionStore();

const selectedCourse = ref('spa_for_eng');

// Computed properties for dashboard stats
const completionPercent = computed(() => {
  const stats = productionStore.getStats(selectedCourse.value);
  return Math.round((stats.approved / stats.total) * 100);
});

const blockers = computed(() => {
  return productionStore.getBlockers(selectedCourse.value);
});

const hasBlockers = computed(() => blockers.value.length > 0);

const pipelineStages = computed(() => {
  return productionStore.getPipelineStages(selectedCourse.value);
});

// Actions
function resolveBlocker(blocker) {
  if (blocker.type === 'human_recording_needed') {
    router.push({
      name: 'RecordingStudio',
      params: { courseCode: selectedCourse.value },
      query: { autoCreateQueue: 'true' }
    });
  } else if (blocker.type === 'tts_regeneration_needed') {
    router.push({
      name: 'AudioPipeline',
      params: { courseCode: selectedCourse.value },
      query: { autoQueue: 'flagged' }
    });
  }
}

function navigateToTool(route) {
  router.push(route);
}

// Real-time updates via WebSocket
onMounted(() => {
  productionStore.connectWebSocket(selectedCourse.value);
});
</script>
```

---

## Component Specifications

### 1. Script Viewer (QA Tool)

**Purpose:** Descript-style text browser for reviewing the entire course script with integrated audio playback.

**Key Features:**
- Hierarchical view: Seed → Cycles → Audio samples
- Inline audio playback
- Flag items with context menu
- Filter view (show only flagged items)
- Text editing (for corrections)
- Keyboard shortcuts (space = play/pause, F = flag)

**UI Wireframe:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Script Viewer - spa_for_eng                      [Filter ▼]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌── S0042: "Yo quiero aprender español" ──────────────────┐   │
│  │                                                           │   │
│  │  🔊 Introduction Cycle                                   │   │
│  │  ├─ [▶️] "Yo quiero aprender español"                    │   │
│  │  │   UUID: a1b2c3d4-e5f6-7890                           │   │
│  │  │   Status: 🟢 Approved                                │   │
│  │  │   [🚩 Flag] [✏️ Edit] [👂 Listen]                    │   │
│  │  │                                                       │   │
│  │  └─ [▶️] "I want to learn Spanish"                      │   │
│  │      UUID: b2c3d4e5-f6a7-8901                           │   │
│  │      Status: 🟢 Approved                                │   │
│  │                                                           │   │
│  │  🧱 LEGO Debut: "quiero" (S0042L01)                     │   │
│  │  ├─ [▶️] "quiero"                                        │   │
│  │  │   UUID: c3d4e5f6-a7b8-9012                           │   │
│  │  │   Status: 🟡 Flagged: Regen TTS                     │   │
│  │  │   Note: "Pronunciation unnatural"                    │   │
│  │  │   [🔄 Re-record] [👥 Send to Studio]                │   │
│  │  │                                                       │   │
│  │  └─ [▶️] "want"                                          │   │
│  │      UUID: d4e5f6a7-b8c9-0123                           │   │
│  │      Status: 🟢 Approved                                │   │
│  │                                                           │   │
│  │  📝 Practice Phrase 1                                    │   │
│  │  ├─ [▶️] "Yo quiero ir"                                 │   │
│  │  └─ [▶️] "I want to go"                                 │   │
│  │      Status: 🟢 Approved                                │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌── S0043: "¿Puedes ayudarme?" ────────────────────────────┐   │
│  │  ... (collapsed)                                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [📊 Export Report] [🔄 Sync Flags] [⚡ Batch Actions]          │
└─────────────────────────────────────────────────────────────────┘
```

**Component Structure:**

```vue
<template>
  <div class="script-viewer">
    <!-- Toolbar -->
    <div class="toolbar">
      <input
        v-model="searchQuery"
        placeholder="Search seeds or phrases..."
        class="search-input"
      />
      <select v-model="filterStatus" class="filter-select">
        <option value="all">All Samples</option>
        <option value="flagged">Flagged Only</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending Review</option>
      </select>
      <button @click="collapseAll">Collapse All</button>
      <button @click="expandAll">Expand All</button>
    </div>

    <!-- Script Tree -->
    <div class="script-tree">
      <SeedNode
        v-for="seed in filteredSeeds"
        :key="seed.seed_id"
        :seed="seed"
        :expanded="expandedSeeds.has(seed.seed_id)"
        @toggle="toggleSeed"
        @play="playSample"
        @flag="flagSample"
        @edit="editSample"
      />
    </div>

    <!-- Playback Bar (sticky bottom) -->
    <AudioPlaybackBar
      v-if="currentSample"
      :sample="currentSample"
      :is-playing="isPlaying"
      @play="play"
      @pause="pause"
      @next="playNext"
      @previous="playPrevious"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useScriptStore } from '@/stores/script';
import SeedNode from '@/components/script/SeedNode.vue';
import AudioPlaybackBar from '@/components/script/AudioPlaybackBar.vue';

const scriptStore = useScriptStore();
const props = defineProps({
  courseCode: { type: String, required: true }
});

const searchQuery = ref('');
const filterStatus = ref('all');
const expandedSeeds = ref(new Set());
const currentSample = ref(null);
const isPlaying = ref(false);

const filteredSeeds = computed(() => {
  return scriptStore.getFilteredSeeds(
    props.courseCode,
    searchQuery.value,
    filterStatus.value
  );
});

function playSample(sample) {
  currentSample.value = sample;
  isPlaying.value = true;
  // Audio playback logic
}

function flagSample({ sample, flagType, note }) {
  scriptStore.flagSample(props.courseCode, sample.uuid, {
    status: `flagged_${flagType}`,
    note
  });
}

onMounted(() => {
  scriptStore.loadCourse(props.courseCode);
});
</script>
```

---

### 2. Audio Pipeline View

**Purpose:** Monitor and control TTS batch generation, retry failed samples, preview generated audio.

**Key Features:**
- Queue management (add flagged items to queue)
- Real-time progress monitoring
- Retry failed generations
- Preview audio before approval
- Batch operations (regenerate all in seed)

**UI Wireframe:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Audio Pipeline - spa_for_eng                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUEUE STATUS                                                    │
│  ═══════════════════════════════════ 56 / 127 processed         │
│  Estimated completion: 23 minutes                                │
│  TTS Engine: Azure (es-ES-ElviraNeural)                         │
│                                                                  │
│  [⏸️ Pause Queue] [❌ Cancel All] [➕ Add Flagged Samples]       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROCESSING NOW                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ UUID: e5f6a7b8-c9d0-1234                                │    │
│  │ Phrase: "Yo quiero aprender"                            │    │
│  │ Seed: S0042 | Cycle: Practice 3                        │    │
│  │ Progress: ████████████████░░░░░░░░ 68%                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  QUEUED (71 items)                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 1. S0043 - "¿Puedes ayudarme?"                         │    │
│  │ 2. S0044 - "No estoy seguro"                           │    │
│  │ 3. S0045 - "¿Dónde está?"                              │    │
│  │ ... (68 more)                                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  COMPLETED (56 items)                                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ UUID: a1b2c3d4  | "Yo quiero"  | ✅ Success | [👂]   │    │
│  │ UUID: b2c3d4e5  | "aprender"   | ✅ Success | [👂]   │    │
│  │ UUID: c3d4e5f6  | "español"    | ❌ Failed  | [🔄]   │    │
│  │    Error: TTS API timeout                               │    │
│  │ ... (53 more)                                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Recording Studio

**Purpose:** Autocue system for manual recording, especially for exotic language pairs without good TTS.

**Key Features:**
- Queue-based workflow
- Autocue display (large text for reading)
- Phrase grouping (record related phrases in sequence)
- Slow-with-gaps mode (slower playback for difficult phrases)
- Recording controls (record, replay, accept, redo)
- Upload to S3 with metadata

**UI Wireframe:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Recording Studio - mkd_for_eng                  Queue: 18 items │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Progress: 12 / 18 recorded  ═════════════░░░░░░ 67%           │
│  Estimated time remaining: 15 minutes                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    AUTOCUE DISPLAY                               │
│                                                                  │
│                     Јас сакам да учам                           │
│                                                                  │
│                  (I want to learn)                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Context: S0042 - LEGO Debut                            │    │
│  │ UUID: f6a7b8c9-d0e1-2345                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  [🔴 Record]  [⏹️ Stop]  [▶️ Playback]  [✅ Accept]  │    │
│  │                                                         │    │
│  │  Waveform:  ▁▃▅▇▆▄▂▁▂▄▆▇▅▃▁                          │    │
│  │                                                         │    │
│  │  Duration: 2.3s                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [⏭️ Skip] [🔄 Redo] [📝 Add Note] [🐌 Slow Mode: OFF]        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUEUE PREVIEW                                                   │
│  ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯  │
│  ✅ #1: "Јас сакам"                                             │
│  ✅ #2: "да учам"                                               │
│  ✅ #3: "македонски"                                            │
│  ... (9 more completed)                                          │
│  ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯  │
│  ▶️ #13: "Јас сакам да учам" (current)                          │
│  ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯  │
│  ⏳ #14: "Можеш ли да ми помогнеш?"                             │
│  ⏳ #15: "Не сум сигурен"                                       │
│  ... (3 more remaining)                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Phrase Grouping Logic:**

```javascript
// Intelligent grouping for efficient recording
function groupRecordingItems(items) {
  const groups = [];

  // Group 1: All components for a LEGO
  // Example: ["quiero", "aprender", "español"] before the full phrase
  const componentGroup = items.filter(item =>
    item.context.is_component === true
  );

  // Group 2: LEGO Debut phrases
  const debutGroup = items.filter(item =>
    item.context.is_debut === true
  );

  // Group 3: Practice phrases using the same LEGOs
  const practiceGroup = items.filter(item =>
    item.context.type === 'practice'
  );

  return [
    ...componentGroup,
    ...debutGroup,
    ...practiceGroup
  ];
}
```

---

### 4. Audio Samples Browser

**Purpose:** Quality review interface for all generated/recorded audio. Listen, compare, approve, or reject.

**Key Features:**
- Grid or list view of all samples
- Filter by status, seed, voice_id
- Inline audio playback
- Compare TTS vs human recordings
- Approve or reject with notes
- Flag for re-recording

**UI Wireframe:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Audio Samples Browser - spa_for_eng                              │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Status: All ▼] [Voice: All ▼] [Seed: All ▼]         │
│  Sort: [Recently Added ▼]                      View: [Grid][List]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ a1b2c3d4      │ │ b2c3d4e5      │ │ c3d4e5f6      │         │
│  │ "Yo quiero"   │ │ "aprender"    │ │ "español"     │         │
│  │ ▶️ 2.3s       │ │ ▶️ 1.8s       │ │ ▶️ 2.1s       │         │
│  │ TTS: Azure    │ │ TTS: Azure    │ │ Human: Maria  │         │
│  │ 🟢 Approved   │ │ 🟡 Review     │ │ 🟢 Approved   │         │
│  │ [👂][✅][❌]  │ │ [👂][✅][❌]  │ │ [👂][✅][❌]  │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ d4e5f6a7      │ │ e5f6a7b8      │ │ f6a7b8c9      │         │
│  │ "¿Puedes?"    │ │ "ayudarme"    │ │ "No estoy"    │         │
│  │ ▶️ 1.5s       │ │ ▶️ 2.0s       │ │ ▶️ 1.9s       │         │
│  │ TTS: ElevenL  │ │ TTS: Azure    │ │ TTS: Azure    │         │
│  │ 🔴 Rejected   │ │ 🟢 Approved   │ │ 🟡 Review     │         │
│  │ [👂][✅][❌]  │ │ [👂][✅][❌]  │ │ [👂][✅][❌]  │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
│                                                                  │
│  ... (more samples)                                              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Showing 12 / 12,543 samples                     Page 1 of 1,045│
│  [◀️ Previous] [▶️ Next] [⏩ Jump to...]                         │
└─────────────────────────────────────────────────────────────────┘
```

**Compare View (TTS vs Human):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Compare Recordings - "Јас сакам да учам"                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TTS VERSION (Azure)                HUMAN VERSION (Maria)        │
│  ┌──────────────────────┐          ┌──────────────────────┐    │
│  │ ▶️ Play              │          │ ▶️ Play              │    │
│  │ Duration: 2.1s       │          │ Duration: 2.3s       │    │
│  │ Waveform:            │          │ Waveform:            │    │
│  │ ▁▃▅▇▆▄▂▁▂▄▆▇▅▃▁     │          │ ▂▄▆█▇▅▃▁▃▅▇█▆▄▂     │    │
│  │                      │          │                      │    │
│  │ Quality: 🟡 Flagged │          │ Quality: ✅ Approved │    │
│  │ "Unnatural accent"   │          │ "Native speaker"     │    │
│  └──────────────────────┘          └──────────────────────┘    │
│                                                                  │
│  [Use TTS] [Use Human] [Re-record Both] [Add Note]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Core API Structure

```
/api/production/:courseCode
  ├─ GET  /manifest              → Load course manifest (Phase 7 output)
  ├─ GET  /flags                 → Load sample_flags.json
  ├─ POST /flags/update          → Update flag status for sample(s)
  ├─ GET  /audio-metadata        → Load audio_metadata.json
  └─ POST /audio-metadata/update → Update audio metadata

/api/production/:courseCode/script
  ├─ GET  /seeds                 → Load all seeds with cycles
  ├─ GET  /seeds/:seedId         → Load specific seed
  └─ GET  /samples               → Load all samples (filtered)

/api/production/:courseCode/audio-pipeline
  ├─ GET  /status                → Pipeline status (queue, progress)
  ├─ POST /queue/add             → Add samples to TTS queue
  ├─ POST /queue/retry           → Retry failed samples
  └─ GET  /queue/history         → Generation history

/api/production/:courseCode/recording
  ├─ GET  /queues                → List recording queues
  ├─ POST /queues/create         → Create new recording queue
  ├─ GET  /queues/:queueId       → Load specific queue
  ├─ POST /upload                → Upload recorded audio
  └─ POST /complete              → Mark recording complete

/api/production/:courseCode/samples
  ├─ GET  /list                  → List all audio samples (paginated)
  ├─ GET  /:uuid                 → Get specific sample details
  ├─ POST /:uuid/approve         → Approve sample
  ├─ POST /:uuid/reject          → Reject sample
  └─ POST /:uuid/compare         → Get comparison data (TTS vs human)

/api/production/websocket         → Real-time updates via WebSocket
```

### Example API Request/Response

**POST /api/production/spa_for_eng/flags/update**

Request:
```json
{
  "uuid": "a1b2c3d4-e5f6-7890",
  "status": "flagged_regen_tts",
  "note": "Pronunciation of 'quiero' sounds unnatural",
  "flagged_by": "qa_reviewer@ssi.org"
}
```

Response:
```json
{
  "success": true,
  "updated": {
    "uuid": "a1b2c3d4-e5f6-7890",
    "status": "flagged_regen_tts",
    "flagged_at": "2025-12-04T15:23:45Z"
  },
  "broadcast": {
    "event": "sample_flagged",
    "data": {
      "course_code": "spa_for_eng",
      "uuid": "a1b2c3d4-e5f6-7890",
      "new_status": "flagged_regen_tts"
    }
  }
}
```

---

## Future-Proofing

### Multi-Tenant Volunteer System

**Design Considerations:**

1. **Per-User Recording Queues**
   - Assign specific batches to volunteers
   - Track progress per user
   - Avoid conflicts (two people recording same phrase)

2. **Permission Levels**
   - Admin: Full access to all tools
   - QA Reviewer: Script Viewer, Samples Browser
   - Audio Engineer: Audio Pipeline
   - Voice Talent: Recording Studio only
   - Volunteer: Assigned recording queues only

3. **Recording Queue Assignment**

```json
{
  "queue_id": "mkd_batch_001",
  "course_code": "mkd_for_eng",
  "assigned_to": "maria@volunteers.org",
  "assigned_at": "2025-12-04T10:00:00Z",
  "status": "in_progress",
  "items": [
    {
      "uuid": "...",
      "phrase": "...",
      "recorded": false
    }
  ],
  "progress": {
    "completed": 12,
    "total": 18,
    "percent": 67
  }
}
```

4. **Collaboration Features**
   - Comments on samples (threaded discussions)
   - @mentions for flagging specific reviewers
   - Notifications (email/in-app) for new assignments
   - Activity feed ("Maria completed queue mkd_batch_001")

### Integration with ssi-learning-app

**Current State:**
- Dashboard creates `course_manifest.json`
- App consumes manifest for learner experience

**Future Integration Points:**

1. **QA Approval → Auto-Deploy**
   - When all samples in a seed are approved, auto-publish to app
   - Versioned releases ("Course v1.2.3")
   - Rollback capability

2. **A/B Testing Audio**
   - Serve TTS to 50% of users, human recording to 50%
   - Collect engagement metrics
   - Automatically promote better-performing audio

3. **Learner Feedback Loop**
   - Flag samples directly from app
   - "Report audio quality issue" button
   - Feeds back into QA dashboard

---

## Design Aesthetic

### Visual Language

**Inspiration:** Mission control meets music production software

**Color Palette:**
- **Primary:** Deep slate (`#0f172a`) - Background
- **Accent:** Emerald (`#10b981`) - Success, progress, approved items
- **Warning:** Amber (`#f59e0b`) - Flagged items, needs attention
- **Danger:** Red (`#ef4444`) - Rejected, errors
- **Neutral:** Slate grays (`#64748b`, `#94a3b8`) - Text, borders

**Typography:**
- **Headings:** Inter (bold, uppercase tracking)
- **Body:** System UI fonts (cross-platform consistency)
- **Monospace:** JetBrains Mono (UUIDs, technical data)

**Layout Principles:**
- **Dense but breathable** - Lots of data, but organized
- **Sticky controls** - Playback bar always accessible
- **Progressive disclosure** - Collapse/expand detailed views
- **Real-time feedback** - Visual indicators for all state changes

**Animations:**
- **Progress bars** - Smooth fill animations
- **Status changes** - Color transitions (pending → approved)
- **Waveform visualizations** - Live audio playback
- **Toast notifications** - Slide in from top-right

### Component Library

**Base Components:**
- `<StatusBadge>` - Colored pill showing status
- `<ProgressBar>` - Horizontal bar with percentage
- `<AudioPlayer>` - Inline playback control
- `<FlagButton>` - Context menu for flagging
- `<WaveformDisplay>` - Visual audio representation

**Compound Components:**
- `<SeedNode>` - Expandable seed in script tree
- `<PipelineStage>` - Status card for pipeline view
- `<RecordingCard>` - Autocue + controls
- `<SampleCard>` - Audio sample grid item

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Define shared data structures
- [ ] Implement S3 sync for `sample_flags.json`
- [ ] Build API endpoints for flags and metadata
- [ ] Set up WebSocket for real-time updates
- [ ] Create base component library

### Phase 2: Script Viewer (Week 3-4)
- [ ] Build hierarchical seed tree
- [ ] Implement inline audio playback
- [ ] Add flagging UI with context menu
- [ ] Create filter views
- [ ] Keyboard shortcuts

### Phase 3: Audio Pipeline (Week 5)
- [ ] Queue management UI
- [ ] Real-time progress monitoring
- [ ] Retry logic for failed generations
- [ ] Preview and approval flow

### Phase 4: Recording Studio (Week 6-7)
- [ ] Autocue display
- [ ] Recording controls
- [ ] Queue-based workflow
- [ ] Phrase grouping algorithm
- [ ] S3 upload with metadata

### Phase 5: Samples Browser (Week 8)
- [ ] Grid/list view
- [ ] Filtering and sorting
- [ ] Inline playback
- [ ] Compare view (TTS vs human)
- [ ] Bulk approval actions

### Phase 6: Mission Control Dashboard (Week 9)
- [ ] Overall progress visualization
- [ ] Blocker detection and alerts
- [ ] Pipeline stage cards
- [ ] Quick action buttons
- [ ] Real-time updates

### Phase 7: Polish & Launch (Week 10)
- [ ] End-to-end testing
- [ ] Documentation for volunteers
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Production deployment

---

## Technical Stack

**Frontend:**
- Vue 3 (Composition API)
- Vite
- Tailwind CSS 4
- Pinia (state management)
- VueUse (composables)
- Howler.js (audio playback)

**Backend:**
- Express.js (API server)
- AWS SDK v3 (S3 operations)
- Socket.io (WebSocket)
- Node.js 18+

**Infrastructure:**
- S3 (Single Source of Truth)
- Vercel (frontend hosting)
- Railway (backend services)
- PM2 (process management)

**Development:**
- TypeScript
- ESLint + Prettier
- Vitest (unit tests)
- Playwright (e2e tests)

---

## Conclusion

The **Course Production Suite** unifies four specialized tools into a cohesive system for language course production. By establishing clear data flows, shared state management, and intuitive navigation, the system enables efficient QA review, audio generation, manual recording, and quality control.

**Key Architectural Decisions:**

1. **S3 as Single Source of Truth** - Eliminates data sync issues
2. **Flag-Based Workflow** - Clear status lifecycle for all samples
3. **Real-Time Collaboration** - WebSocket updates keep all users in sync
4. **Progressive Disclosure** - Complex data presented hierarchically
5. **Future-Proof Design** - Multi-tenant volunteer system ready

This architecture provides a **maintainable, scalable foundation** for current production needs and future volunteer-driven course creation.

---

**Next Steps:**
1. Review architecture with team
2. Validate API endpoints with backend engineers
3. Create detailed component specs for developers
4. Begin Phase 1 implementation

---

*Document prepared by Claude Code*
*Date: 2025-12-04*
*Version: 1.0.0*
