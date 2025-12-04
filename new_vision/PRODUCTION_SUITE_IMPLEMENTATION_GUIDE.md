# Course Production Suite - Implementation Guide

**Quick Reference for Developers**

Version: 1.0.0
Date: 2025-12-04

---

## Quick Start

### What You're Building

A unified system for language course production that connects:
- **Script Viewer** (QA review tool)
- **Audio Pipeline** (TTS batch generation)
- **Recording Studio** (manual voice recording)
- **Samples Browser** (audio quality review)

### The Big Picture

```
User flags a sample → Status updates in S3 → All tools see the change in real-time
```

That's it. Everything else is UI polish.

---

## Architecture in 3 Minutes

### Single Source of Truth: S3

```
courses/spa_for_eng/
  ├── course_manifest.json      (Phase 7 output - READ ONLY)
  ├── sample_flags.json          (QA decisions - READ/WRITE)
  └── audio_metadata.json        (Audio info - READ/WRITE)

ssiborg-assets/mastered/
  └── {uuid}.mp3                 (Audio files)
```

### Key Data Structure: sample_flags.json

```json
{
  "version": "1.0.0",
  "course_code": "spa_for_eng",
  "samples": {
    "uuid-here": {
      "uuid": "uuid-here",
      "status": "flagged_regen_tts",
      "flags": {
        "text_edit": false,
        "audio_regenerate": true,
        "human_recording": false
      },
      "notes": "Pronunciation issue",
      "flagged_by": "qa@example.com",
      "flagged_at": "2025-12-04T10:15:00Z",
      "context": {
        "seed_id": "S0042",
        "cycle_index": 3,
        "phrase": "Yo quiero aprender",
        "voice_id": "azure_es_ES_female_01"
      }
    }
  },
  "summary": {
    "total_samples": 12543,
    "pending": 8234,
    "flagged_regen_tts": 127,
    "approved": 3891
  }
}
```

### Status Flow

```
pending
  ↓
flagged_regen_tts → in_pipeline → tts_complete → needs_review → approved → complete
  OR
flagged_human_needed → in_recording → recorded → needs_review → approved → complete
```

---

## Implementation Checklist

### Phase 1: Shared Infrastructure (Week 1-2)

**1. Create Pinia Store: `stores/production.js`**

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useProductionStore = defineStore('production', () => {
  // State
  const currentCourse = ref(null);
  const sampleFlags = ref({});
  const audioMetadata = ref({});
  const manifest = ref(null);

  // Computed
  const flaggedSamples = computed(() => {
    return Object.values(sampleFlags.value).filter(
      s => s.status.startsWith('flagged_')
    );
  });

  // Actions
  async function loadCourse(courseCode) {
    const [manifestData, flagsData, metadataData] = await Promise.all([
      fetch(`/api/production/${courseCode}/manifest`).then(r => r.json()),
      fetch(`/api/production/${courseCode}/flags`).then(r => r.json()),
      fetch(`/api/production/${courseCode}/audio-metadata`).then(r => r.json())
    ]);

    manifest.value = manifestData;
    sampleFlags.value = flagsData.samples || {};
    audioMetadata.value = metadataData.audio_files || {};
    currentCourse.value = courseCode;
  }

  async function updateSampleFlag(uuid, updates) {
    const response = await fetch(
      `/api/production/${currentCourse.value}/flags/update`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, ...updates })
      }
    );

    if (response.ok) {
      const updated = await response.json();
      sampleFlags.value[uuid] = updated.sample;
    }
  }

  return {
    currentCourse,
    sampleFlags,
    audioMetadata,
    manifest,
    flaggedSamples,
    loadCourse,
    updateSampleFlag
  };
});
```

**2. Create WebSocket Service: `services/websocket.js`**

```javascript
import { io } from 'socket.io-client';

export class ProductionWebSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(courseCode) {
    this.socket = io('/api/production/websocket', {
      query: { courseCode }
    });

    this.socket.on('sample_updated', (data) => {
      this.emit('sample_updated', data);
    });

    this.socket.on('pipeline_progress', (data) => {
      this.emit('pipeline_progress', data);
    });

    this.socket.on('recording_completed', (data) => {
      this.emit('recording_completed', data);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
```

**3. API Routes (Express): `api/production.js`**

```javascript
import express from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();
const s3 = new S3Client({ region: 'eu-west-1' });
const BUCKET = 'popty-bach-lfs';

// Load sample flags
router.get('/:courseCode/flags', async (req, res) => {
  const { courseCode } = req.params;
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/sample_flags.json`
    });
    const response = await s3.send(command);
    const body = await response.Body.transformToString();
    res.json(JSON.parse(body));
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // First time - return empty structure
      res.json({
        version: '1.0.0',
        course_code: courseCode,
        samples: {},
        summary: { total_samples: 0, pending: 0 }
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update sample flag
router.post('/:courseCode/flags/update', async (req, res) => {
  const { courseCode } = req.params;
  const { uuid, status, note, flagged_by } = req.body;

  try {
    // Load current flags
    const current = await loadFlags(courseCode);

    // Update sample
    current.samples[uuid] = {
      ...current.samples[uuid],
      uuid,
      status,
      notes: note || '',
      flagged_by: flagged_by || 'system',
      flagged_at: new Date().toISOString(),
      history: [
        ...(current.samples[uuid]?.history || []),
        {
          status,
          timestamp: new Date().toISOString(),
          user: flagged_by || 'system',
          note
        }
      ]
    };

    // Update summary
    current.summary = calculateSummary(current.samples);

    // Save back to S3
    await saveFlags(courseCode, current);

    // Broadcast via WebSocket
    io.to(courseCode).emit('sample_updated', {
      uuid,
      status,
      course_code: courseCode
    });

    res.json({ success: true, sample: current.samples[uuid] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function loadFlags(courseCode) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/sample_flags.json`
  });
  const response = await s3.send(command);
  const body = await response.Body.transformToString();
  return JSON.parse(body);
}

async function saveFlags(courseCode, data) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/sample_flags.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  });
  await s3.send(command);
}

function calculateSummary(samples) {
  const summary = {
    total_samples: Object.keys(samples).length,
    pending: 0,
    flagged_text_edit: 0,
    flagged_regen_tts: 0,
    flagged_human_needed: 0,
    in_pipeline: 0,
    in_recording: 0,
    needs_review: 0,
    approved: 0,
    complete: 0
  };

  Object.values(samples).forEach(sample => {
    summary[sample.status] = (summary[sample.status] || 0) + 1;
  });

  return summary;
}

export default router;
```

---

### Phase 2: Script Viewer (Week 3-4)

**Component Structure:**

```
src/views/ScriptViewer.vue          (Main container)
src/components/script/
  ├── SeedNode.vue                  (Expandable seed)
  ├── CycleNode.vue                 (Cycle within seed)
  ├── SampleRow.vue                 (Individual sample)
  ├── FlagMenu.vue                  (Context menu for flagging)
  └── AudioPlaybackBar.vue          (Sticky bottom player)
```

**Key Component: SampleRow.vue**

```vue
<template>
  <div class="sample-row" :class="statusClass">
    <button @click="play" class="play-button">
      <Icon :name="isPlaying ? 'pause' : 'play'" />
    </button>

    <div class="sample-info">
      <div class="phrase">{{ sample.phrase }}</div>
      <div class="meta">
        UUID: {{ sample.uuid }} | Voice: {{ sample.voice_id }}
      </div>
    </div>

    <div class="status-badge" :class="statusColor">
      {{ statusLabel }}
    </div>

    <div class="actions">
      <button @click="showFlagMenu = true" class="flag-button">
        🚩 Flag
      </button>
      <button @click="$emit('edit', sample)" class="edit-button">
        ✏️ Edit
      </button>
      <button @click="$emit('listen', sample)" class="listen-button">
        👂 Listen
      </button>
    </div>

    <FlagMenu
      v-if="showFlagMenu"
      :sample="sample"
      @close="showFlagMenu = false"
      @flag="handleFlag"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useProductionStore } from '@/stores/production';
import FlagMenu from './FlagMenu.vue';

const props = defineProps({
  sample: { type: Object, required: true },
  isPlaying: { type: Boolean, default: false }
});

const emit = defineEmits(['play', 'edit', 'listen']);
const store = useProductionStore();
const showFlagMenu = ref(false);

const statusClass = computed(() => `status-${props.sample.status}`);
const statusColor = computed(() => {
  const status = props.sample.status;
  if (status === 'approved') return 'status-success';
  if (status.startsWith('flagged_')) return 'status-warning';
  if (status === 'rejected') return 'status-danger';
  return 'status-neutral';
});

const statusLabel = computed(() => {
  return props.sample.status.replace(/_/g, ' ').toUpperCase();
});

function play() {
  emit('play', props.sample);
}

async function handleFlag({ flagType, note }) {
  await store.updateSampleFlag(props.sample.uuid, {
    status: `flagged_${flagType}`,
    note
  });
  showFlagMenu.value = false;
}
</script>
```

**Keyboard Shortcuts: `composables/useKeyboardShortcuts.js`**

```javascript
import { onMounted, onUnmounted } from 'vue';

export function useKeyboardShortcuts(handlers) {
  function handleKeydown(event) {
    // Space: Play/Pause
    if (event.code === 'Space' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      handlers.playPause?.();
    }

    // F: Flag current item
    if (event.code === 'KeyF' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      handlers.flag?.();
    }

    // N: Next item
    if (event.code === 'KeyN' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      handlers.next?.();
    }

    // P: Previous item
    if (event.code === 'KeyP' && !event.target.matches('input, textarea')) {
      event.preventDefault();
      handlers.previous?.();
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
}
```

---

### Phase 3: Audio Pipeline (Week 5)

**Component: AudioPipelineView.vue**

```vue
<template>
  <div class="audio-pipeline">
    <header class="pipeline-header">
      <h1>Audio Pipeline</h1>
      <div class="stats">
        <div class="stat">
          <span class="value">{{ queueCount }}</span>
          <span class="label">In Queue</span>
        </div>
        <div class="stat">
          <span class="value">{{ processingCount }}</span>
          <span class="label">Processing</span>
        </div>
        <div class="stat">
          <span class="value">{{ completedCount }}</span>
          <span class="label">Completed</span>
        </div>
      </div>
    </header>

    <!-- Progress Bar -->
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
      <p class="progress-text">
        {{ completedCount }} / {{ totalCount }} samples processed
      </p>
      <p class="eta">ETA: {{ estimatedTime }}</p>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button @click="addFlaggedToQueue" class="btn-primary">
        ➕ Add {{ flaggedCount }} Flagged Samples
      </button>
      <button @click="pauseQueue" :disabled="!isRunning" class="btn-secondary">
        ⏸️ Pause Queue
      </button>
      <button @click="cancelAll" class="btn-danger">
        ❌ Cancel All
      </button>
    </div>

    <!-- Currently Processing -->
    <section v-if="currentSample" class="processing-section">
      <h2>Processing Now</h2>
      <div class="processing-card">
        <div class="sample-info">
          <div class="phrase">{{ currentSample.phrase }}</div>
          <div class="meta">
            Seed: {{ currentSample.seed_id }} | Cycle: {{ currentSample.cycle_type }}
          </div>
        </div>
        <div class="progress-bar small">
          <div class="progress-fill" :style="{ width: `${currentProgress}%` }" />
        </div>
        <div class="progress-percent">{{ currentProgress }}%</div>
      </div>
    </section>

    <!-- Queue List -->
    <section class="queue-section">
      <h2>Queued ({{ queueCount }} items)</h2>
      <div class="queue-list">
        <div
          v-for="item in queuedItems"
          :key="item.uuid"
          class="queue-item"
        >
          <span class="index">{{ item.index }}.</span>
          <span class="phrase">{{ item.phrase }}</span>
          <button @click="removeFromQueue(item.uuid)" class="btn-remove">
            ✕
          </button>
        </div>
      </div>
    </section>

    <!-- Completed List -->
    <section class="completed-section">
      <h2>Completed ({{ completedCount }} items)</h2>
      <div class="completed-list">
        <div
          v-for="item in completedItems"
          :key="item.uuid"
          class="completed-item"
          :class="item.success ? 'success' : 'failed'"
        >
          <span class="status-icon">{{ item.success ? '✅' : '❌' }}</span>
          <span class="phrase">{{ item.phrase }}</span>
          <button v-if="item.success" @click="playAudio(item.uuid)" class="btn-play">
            👂
          </button>
          <button v-else @click="retryGeneration(item.uuid)" class="btn-retry">
            🔄 Retry
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProductionStore } from '@/stores/production';
import { useAudioPipeline } from '@/composables/useAudioPipeline';

const props = defineProps({
  courseCode: { type: String, required: true }
});

const store = useProductionStore();
const pipeline = useAudioPipeline(props.courseCode);

const queueCount = computed(() => pipeline.queue.value.length);
const processingCount = computed(() => pipeline.processing.value ? 1 : 0);
const completedCount = computed(() => pipeline.completed.value.length);
const totalCount = computed(() => queueCount.value + completedCount.value);

const progress = computed(() => {
  return totalCount.value > 0
    ? Math.round((completedCount.value / totalCount.value) * 100)
    : 0;
});

const flaggedCount = computed(() => {
  return store.flaggedSamples.filter(
    s => s.flags.audio_regenerate
  ).length;
});

async function addFlaggedToQueue() {
  const flaggedSamples = store.flaggedSamples.filter(
    s => s.flags.audio_regenerate
  );
  await pipeline.addToQueue(flaggedSamples);
}

onMounted(() => {
  store.loadCourse(props.courseCode);
  pipeline.connect();
});
</script>
```

**Composable: `composables/useAudioPipeline.js`**

```javascript
import { ref, computed } from 'vue';
import { ProductionWebSocket } from '@/services/websocket';

export function useAudioPipeline(courseCode) {
  const queue = ref([]);
  const processing = ref(null);
  const completed = ref([]);
  const isRunning = ref(false);
  const websocket = new ProductionWebSocket();

  async function addToQueue(samples) {
    const response = await fetch(
      `/api/production/${courseCode}/audio-pipeline/queue/add`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples })
      }
    );
    const data = await response.json();
    queue.value = data.queue;
  }

  async function pauseQueue() {
    await fetch(
      `/api/production/${courseCode}/audio-pipeline/queue/pause`,
      { method: 'POST' }
    );
    isRunning.value = false;
  }

  function connect() {
    websocket.connect(courseCode);

    websocket.on('pipeline_progress', (data) => {
      processing.value = data.current;
      queue.value = data.queue;
    });

    websocket.on('generation_complete', (data) => {
      completed.value.push(data);
      processing.value = null;
    });
  }

  return {
    queue,
    processing,
    completed,
    isRunning,
    addToQueue,
    pauseQueue,
    connect
  };
}
```

---

### Phase 4: Recording Studio (Week 6-7)

**Key Features to Implement:**

1. **Autocue Display** - Large, readable text
2. **Recording Controls** - Record, Stop, Playback, Accept
3. **Waveform Visualization** - Visual feedback during recording
4. **Queue Management** - Progress through queue
5. **S3 Upload** - Direct upload with metadata

**Composable: `composables/useRecorder.js`**

```javascript
import { ref } from 'vue';

export function useRecorder() {
  const isRecording = ref(false);
  const audioBlob = ref(null);
  const duration = ref(0);
  const waveformData = ref([]);

  let mediaRecorder = null;
  let audioChunks = [];
  let startTime = 0;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      audioChunks = [];
      startTime = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(audioChunks, { type: 'audio/mp3' });
        duration.value = (Date.now() - startTime) / 1000;
      };

      mediaRecorder.start();
      isRecording.value = true;

      // Generate waveform data (simplified)
      generateWaveform(stream);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      isRecording.value = false;
    }
  }

  async function uploadToS3(uuid, metadata) {
    const formData = new FormData();
    formData.append('audio', audioBlob.value, `${uuid}.mp3`);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`/api/production/recording/upload`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }

  function generateWaveform(stream) {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function updateWaveform() {
      if (!isRecording.value) return;

      analyser.getByteTimeDomainData(dataArray);
      waveformData.value = Array.from(dataArray).slice(0, 50);

      requestAnimationFrame(updateWaveform);
    }

    updateWaveform();
  }

  return {
    isRecording,
    audioBlob,
    duration,
    waveformData,
    startRecording,
    stopRecording,
    uploadToS3
  };
}
```

---

## Testing Checklist

### Unit Tests

- [ ] `stores/production.js` - State management
- [ ] `composables/useAudioPipeline.js` - Pipeline logic
- [ ] `composables/useRecorder.js` - Recording functionality
- [ ] `services/websocket.js` - WebSocket connection

### Integration Tests

- [ ] Flag sample → Status updates in all views
- [ ] Add to pipeline → Queue updates → Completion
- [ ] Record audio → Upload → Appears in samples browser
- [ ] Approve sample → Status changes → Dashboard updates

### E2E Tests

- [ ] Complete QA workflow: View → Flag → Pipeline → Review → Approve
- [ ] Complete recording workflow: Queue → Record → Upload → Review
- [ ] Multi-user collaboration: Two users seeing same updates

---

## Performance Considerations

### Optimization Tips

1. **Lazy Load Components**
   ```javascript
   const AudioPipelineView = () => import('@/views/AudioPipelineView.vue');
   ```

2. **Virtual Scrolling** for long lists
   ```vue
   <RecycleScroller
     :items="samples"
     :item-size="60"
     key-field="uuid"
   >
     <template #default="{ item }">
       <SampleRow :sample="item" />
     </template>
   </RecycleScroller>
   ```

3. **Debounce Real-Time Updates**
   ```javascript
   import { debounce } from 'lodash-es';

   const handleUpdate = debounce((data) => {
     store.updateSample(data);
   }, 300);
   ```

4. **Cache Audio Files** (IndexedDB)
   ```javascript
   const audioCache = new Map();

   async function loadAudio(uuid) {
     if (audioCache.has(uuid)) {
       return audioCache.get(uuid);
     }
     const blob = await fetchAudioFromS3(uuid);
     audioCache.set(uuid, blob);
     return blob;
   }
   ```

---

## Deployment

### Environment Variables

```bash
# .env
VITE_API_BASE_URL=https://api.popty.org
VITE_S3_BUCKET=popty-bach-lfs
VITE_S3_REGION=eu-west-1
VITE_WEBSOCKET_URL=wss://api.popty.org
```

### Build & Deploy

```bash
# Frontend
npm run build
vercel --prod

# Backend API
npm run build:api
docker build -t popty-api .
docker push popty-api:latest
```

### PM2 Configuration

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'production-api',
      script: './api/production.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

---

## Troubleshooting

### Common Issues

**1. WebSocket not connecting**
- Check firewall rules
- Verify WebSocket URL in environment
- Check CORS settings

**2. S3 access denied**
- Verify IAM permissions
- Check bucket CORS configuration
- Ensure credentials are set

**3. Audio not playing**
- Check browser audio permissions
- Verify S3 file URLs are signed
- Test with different audio formats

**4. Real-time updates not working**
- Check WebSocket connection in DevTools
- Verify server is broadcasting events
- Check client event listeners are registered

---

## Support & Resources

**Documentation:**
- Full Architecture: `COURSE_PRODUCTION_SUITE_ARCHITECTURE.md`
- Visual Diagrams: `course-production-suite-visual.html`

**Code Examples:**
- SSi Dashboard: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`
- Existing Script Viewer: `src/views/CourseScriptView.vue`
- Existing Recording Studio: `src/views/RecordingStudio.vue`

**Contact:**
- Architecture questions: [architecture team]
- API issues: [backend team]
- UI/UX feedback: [design team]

---

*Implementation Guide v1.0.0*
*Created: 2025-12-04*
