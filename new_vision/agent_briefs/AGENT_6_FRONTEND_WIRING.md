# Agent 6: Frontend Wiring

## Mission
Wire the existing Production Suite UI components to the backend API and WebSocket server. Set up routes and ensure the dashboard connects to real data.

---

## Context

### What Already Exists (Built by Previous Agents)

**Components:**
```
src/components/production/
├── audio/
│   ├── AudioPipeline.vue      # Queue management UI
│   └── PipelineItem.vue       # Individual queue item
├── autocue/
│   ├── AutocueStudio.vue      # Main recording interface
│   ├── ModeSelector.vue       # New Course vs Regeneration
│   ├── RoleSelector.vue       # Voice role selection
│   ├── teleprompter/          # Teleprompter components
│   ├── recording/             # Recording controls
│   └── review/                # Session review
├── dashboard/
│   ├── MissionControl.vue     # Course overview
│   ├── ProgressRing.vue       # Circular progress
│   └── BlockerCard.vue        # Issue display
└── qa/
    ├── SamplesBrowser.vue     # Browse by status
    ├── SampleCard.vue         # Individual sample
    ├── FlagMenu.vue           # Flag status selector
    └── StatusBadge.vue        # Visual status indicator
```

**State Management:**
- `src/stores/production.js` - Pinia store with API methods
- `src/services/websocket.js` - WebSocket client

### What Backend Agent 5 Is Building
- REST API at `/api/production/:courseCode/*`
- WebSocket server at `/api/production/websocket`
- Flag persistence in course directories

---

## Implementation Tasks

### Task 1: Add Production Routes

Edit `src/router/index.js`:

```javascript
import { createRouter, createWebHistory } from 'vue-router'

// Import production components
import MissionControl from '@/components/production/dashboard/MissionControl.vue'
import SamplesBrowser from '@/components/production/qa/SamplesBrowser.vue'
import AudioPipeline from '@/components/production/audio/AudioPipeline.vue'
import AutocueStudio from '@/components/production/autocue/AutocueStudio.vue'

const routes = [
  // ... existing routes ...

  // Production Suite Routes
  {
    path: '/production',
    name: 'production-home',
    redirect: '/production/courses'
  },
  {
    path: '/production/courses',
    name: 'production-courses',
    component: () => import('@/components/production/CourseSelector.vue')
  },
  {
    path: '/production/:courseCode',
    name: 'production-dashboard',
    component: MissionControl,
    props: true
  },
  {
    path: '/production/:courseCode/qa',
    name: 'production-qa',
    component: SamplesBrowser,
    props: true
  },
  {
    path: '/production/:courseCode/pipeline',
    name: 'production-pipeline',
    component: AudioPipeline,
    props: true
  },
  {
    path: '/production/:courseCode/autocue',
    name: 'production-autocue',
    component: AutocueStudio,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### Task 2: Create Course Selector Component

Create `src/components/production/CourseSelector.vue`:

```vue
<template>
  <div class="course-selector">
    <h1 class="title">Course Production Suite</h1>
    <p class="subtitle">Select a course to begin production workflow</p>

    <div v-if="loading" class="loading">Loading courses...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="course-grid">
      <div
        v-for="course in courses"
        :key="course.code"
        class="course-card"
        @click="selectCourse(course.code)"
      >
        <div class="course-code">{{ course.code }}</div>
        <div class="course-name">{{ course.name }}</div>
        <div class="course-stats">
          <span>{{ course.sampleCount }} samples</span>
          <span v-if="course.progress">{{ course.progress }}% complete</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const courses = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    // Fetch available courses from orchestrator
    const response = await fetch('/api/courses')
    if (!response.ok) throw new Error('Failed to load courses')
    courses.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

function selectCourse(courseCode) {
  router.push(`/production/${courseCode}`)
}
</script>

<style scoped>
.course-selector {
  padding: 2rem;
  background: var(--color-void, #0a0b0f);
  min-height: 100vh;
}

.title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 2.5rem;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 2rem;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.course-card {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-2px);
}

.course-code {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.25rem;
  color: var(--color-tungsten, #ffa630);
  margin-bottom: 0.5rem;
}

.course-name {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 1rem;
}

.course-stats {
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
  display: flex;
  gap: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.error {
  color: var(--color-film-red, #e63946);
}
</style>
```

### Task 3: Update MissionControl to Load Data

Ensure `src/components/production/dashboard/MissionControl.vue` initializes properly:

```vue
<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import { initWebSocket, joinCourseRoom, leaveCourseRoom, disconnectWebSocket } from '@/services/websocket'

const route = useRoute()
const store = useProductionStore()

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

onMounted(async () => {
  // Initialize WebSocket connection
  initWebSocket()

  // Load course data
  await store.loadCourse(props.courseCode)

  // Join course room for real-time updates
  joinCourseRoom(props.courseCode)
})

onUnmounted(() => {
  leaveCourseRoom(props.courseCode)
})

// Handle route changes (switching courses)
watch(() => props.courseCode, async (newCode, oldCode) => {
  if (oldCode) leaveCourseRoom(oldCode)
  await store.loadCourse(newCode)
  joinCourseRoom(newCode)
})
</script>
```

### Task 4: Update SamplesBrowser for Data Loading

Ensure `src/components/production/qa/SamplesBrowser.vue` uses the store:

```vue
<script setup>
import { computed, onMounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import SampleCard from './SampleCard.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()

// Load course if not already loaded
onMounted(async () => {
  if (store.currentCourseCode !== props.courseCode) {
    await store.loadCourse(props.courseCode)
  }
})

const samplesByStatus = computed(() => store.samplesByStatus)
const progressStats = computed(() => store.progressStats)

// Get sample details from manifest
function getSampleDetails(uuid) {
  const manifest = store.courseManifest
  if (!manifest) return null

  // Search through slices to find sample
  for (const slice of manifest.slices || []) {
    for (const [text, samples] of Object.entries(slice.samples || {})) {
      const sample = samples.find(s => s.id === uuid)
      if (sample) {
        return { text, ...sample }
      }
    }
  }
  return null
}

// Get audio metadata for sample
function getAudioMetadata(uuid) {
  return store.audioMetadata?.audio?.[uuid] || null
}
</script>
```

### Task 5: Wire SampleCard Audio Playback

Update `src/components/production/qa/SampleCard.vue` for audio:

```vue
<script setup>
import { ref, computed } from 'vue'
import { useProductionStore } from '@/stores/production'
import FlagMenu from './FlagMenu.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  uuid: String,
  text: String,
  role: String,
  status: String,
  metadata: Object
})

const emit = defineEmits(['flag-changed'])

const store = useProductionStore()
const isPlaying = ref(false)
const audioRef = ref(null)

// Construct audio URL
const audioUrl = computed(() => {
  const courseCode = store.currentCourseCode
  // S3 URL pattern or local path
  return `/api/production/${courseCode}/audio/${props.uuid}.mp3`
})

function togglePlay() {
  if (!audioRef.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
  isPlaying.value = !isPlaying.value
}

function onAudioEnded() {
  isPlaying.value = false
}

async function handleFlagChange(newStatus) {
  const success = await store.updateSampleFlag(props.uuid, { status: newStatus })
  if (success) {
    emit('flag-changed', { uuid: props.uuid, status: newStatus })
  }
}
</script>

<template>
  <div class="sample-card" :class="[`status-${status}`]">
    <div class="sample-text">{{ text }}</div>
    <div class="sample-role">{{ role }}</div>

    <div class="audio-controls">
      <audio ref="audioRef" :src="audioUrl" @ended="onAudioEnded" />
      <button @click="togglePlay" class="play-btn">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <span v-if="metadata?.duration" class="duration">
        {{ metadata.duration }}s
      </span>
    </div>

    <div class="sample-actions">
      <StatusBadge :status="status" />
      <FlagMenu :current-status="status" @change="handleFlagChange" />
    </div>
  </div>
</template>
```

### Task 6: Wire FlagMenu to Store

Update `src/components/production/qa/FlagMenu.vue`:

```vue
<script setup>
import { ref } from 'vue'

const props = defineProps({
  currentStatus: {
    type: String,
    default: 'pending'
  }
})

const emit = defineEmits(['change'])
const isOpen = ref(false)

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'flagged_regen_tts', label: 'Regenerate TTS', color: 'orange' },
  { value: 'flagged_human_needed', label: 'Human Recording', color: 'red' },
  { value: 'in_pipeline', label: 'In Pipeline', color: 'blue' },
  { value: 'needs_review', label: 'Needs Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
]

function selectStatus(status) {
  if (status !== props.currentStatus) {
    emit('change', status)
  }
  isOpen.value = false
}
</script>
```

### Task 7: Wire AudioPipeline to Backend

Update `src/components/production/audio/AudioPipeline.vue`:

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import PipelineItem from './PipelineItem.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()
const pipelineStatus = ref(null)
const isRunning = ref(false)

// Listen for pipeline progress events
function handlePipelineProgress(event) {
  pipelineStatus.value = event.detail
}

onMounted(() => {
  window.addEventListener('pipeline_progress', handlePipelineProgress)
})

onUnmounted(() => {
  window.removeEventListener('pipeline_progress', handlePipelineProgress)
})

// Get flagged samples that need regeneration
const flaggedForRegen = computed(() => {
  return store.samplesByStatus.flagged_regen_tts || []
})

// Start pipeline for flagged samples
async function startPipeline() {
  isRunning.value = true

  try {
    const uuids = flaggedForRegen.value.map(s => s.uuid)

    const response = await fetch(`/api/production/${props.courseCode}/pipeline/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuids })
    })

    if (!response.ok) throw new Error('Failed to start pipeline')

    // Mark samples as in_pipeline
    await store.bulkUpdateFlags(
      uuids.map(uuid => ({ uuid, status: 'in_pipeline' }))
    )
  } catch (err) {
    console.error('Pipeline start failed:', err)
  }
}
</script>
```

### Task 8: Add Production Navigation

Create `src/components/production/ProductionNav.vue`:

```vue
<template>
  <nav class="production-nav">
    <router-link
      :to="`/production/${courseCode}`"
      class="nav-item"
      :class="{ active: route.name === 'production-dashboard' }"
    >
      Dashboard
    </router-link>
    <router-link
      :to="`/production/${courseCode}/qa`"
      class="nav-item"
      :class="{ active: route.name === 'production-qa' }"
    >
      QA Browser
    </router-link>
    <router-link
      :to="`/production/${courseCode}/pipeline`"
      class="nav-item"
      :class="{ active: route.name === 'production-pipeline' }"
    >
      Audio Pipeline
    </router-link>
    <router-link
      :to="`/production/${courseCode}/autocue`"
      class="nav-item"
      :class="{ active: route.name === 'production-autocue' }"
    >
      Autocue Studio
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const route = useRoute()
</script>

<style scoped>
.production-nav {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-shadow, #16181f);
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.nav-item {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  padding: 0.5rem 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: var(--color-paper, #f7f7f2);
  background: var(--color-slate, #23262f);
}

.nav-item.active {
  color: var(--color-tungsten, #ffa630);
  background: var(--color-slate, #23262f);
}
</style>
```

### Task 9: Add Layout Wrapper

Create `src/components/production/ProductionLayout.vue`:

```vue
<template>
  <div class="production-layout">
    <header class="production-header">
      <router-link to="/production/courses" class="back-link">
        &larr; Courses
      </router-link>
      <h1 class="course-title">{{ courseCode }}</h1>
      <div class="connection-status" :class="{ connected: wsConnected }">
        {{ wsConnected ? 'Connected' : 'Disconnected' }}
      </div>
    </header>

    <ProductionNav :course-code="courseCode" />

    <main class="production-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProductionStore } from '@/stores/production'
import ProductionNav from './ProductionNav.vue'

defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()
const wsConnected = computed(() => store.wsConnected)
</script>

<style scoped>
.production-layout {
  min-height: 100vh;
  background: var(--color-void, #0a0b0f);
}

.production-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: var(--color-shadow, #16181f);
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.back-link {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-paper, #f7f7f2);
}

.course-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 1.5rem;
  color: var(--color-paper, #f7f7f2);
  flex: 1;
}

.connection-status {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-film-red, #e63946);
  color: white;
}

.connection-status.connected {
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, #0a0b0f);
}

.production-content {
  padding: 2rem;
}
</style>
```

---

## CSS Variables (Add to style.css if missing)

```css
:root {
  /* Cinematic Dark Palette */
  --color-void: #0a0b0f;
  --color-shadow: #16181f;
  --color-slate: #23262f;
  --color-graphite: #34384a;

  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;

  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-ui: 'Josefin Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

---

## Files to Create/Modify

**Create:**
- `src/components/production/CourseSelector.vue`
- `src/components/production/ProductionNav.vue`
- `src/components/production/ProductionLayout.vue`

**Modify:**
- `src/router/index.js` - Add production routes
- `src/style.css` - Add CSS variables if missing
- `src/components/production/dashboard/MissionControl.vue` - Wire to store
- `src/components/production/qa/SamplesBrowser.vue` - Wire to store
- `src/components/production/qa/SampleCard.vue` - Wire audio + flags
- `src/components/production/audio/AudioPipeline.vue` - Wire to backend

---

## Testing

1. **Routes work:**
   - Navigate to `/production` → redirects to `/production/courses`
   - Click course → goes to `/production/{courseCode}`
   - Nav links work between views

2. **Data loads:**
   - MissionControl shows course stats
   - SamplesBrowser shows samples by status
   - Audio plays in SampleCard

3. **WebSocket updates:**
   - Connection status shows "Connected"
   - Flag changes reflect immediately
   - Pipeline progress updates in real-time

---

## Branch

Work in branch: `feature/production-frontend-wiring`

---

## Dependencies

**On Backend Agent 5:**
- API endpoints must be available
- WebSocket server must accept connections
- Flag persistence must work

Can develop in parallel using mock data, then integrate when backend is ready.

---

## Success Criteria

- [ ] Production routes accessible from main app
- [ ] Course selector lists available courses
- [ ] Navigation between production views works
- [ ] Store loads data from API
- [ ] WebSocket connects and shows status
- [ ] Samples display with audio playback
- [ ] Flag changes persist via API
- [ ] Real-time updates work across views
