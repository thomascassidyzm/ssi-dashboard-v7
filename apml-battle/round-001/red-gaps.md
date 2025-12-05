# RED Analysis: APML Gaps Found in Popty/SSi Dashboard

## Executive Summary

After reverse-compiling the SSi Dashboard to APML v1.0.0, I identified **12 significant gaps** where current APML syntax cannot adequately express the patterns found in the codebase. These gaps fall into four categories:

1. **Domain Vocabulary** - No way to define domain-specific terminology
2. **Pipeline/Workflow** - Multi-phase orchestration patterns
3. **State Management** - Reactive stores and computed properties
4. **Real-time Communication** - WebSocket integration patterns

---

## Gap 1: Domain Vocabulary Definition

### Problem
APML has no construct for defining domain-specific vocabulary that permeates an entire application. SSi uses terms like "Seed", "LEGO", "Basket", "Slice", "Debut", "Eternal" with precise pedagogical meanings.

### Original Code
```javascript
// Found throughout: src/services/seedService.js, src/components/*.vue
// Domain terms used without formal definition

// "LEGO" appears 500+ times
// "Seed" appears 800+ times
// "Basket" appears 300+ times
// These terms have specific meanings that differ from common usage
```

### Current APML Limitation
No `vocabulary` or `domain` construct exists. The spec only has `app`, `data`, `interface`, `logic`.

### Impact
- **Semantic loss**: An AI compiling from APML wouldn't understand "LEGO" means "reusable language building block"
- **Inconsistent interpretation**: Different agents might interpret the same term differently
- **Documentation gap**: No way to embed domain knowledge in the specification

---

## Gap 2: Multi-Phase Pipeline Orchestration

### Problem
APML has no native way to express multi-phase pipelines with dependencies, checkpoints, approval gates, and orchestration.

### Original Code
```javascript
// services/phases/phase8-audio-supabase.cjs
// Phase coordination with approval gates

pipeline CourseGeneration:
  Phase1 -> Phase2 -> Phase3 -> Audio -> Manifest

// Each phase has:
// - Input files
// - Output files
// - Port/endpoint
// - Dependencies
// - Approval requirements (Audio requires user approval due to cost)
```

### Current APML Limitation
The `logic` construct handles processes but not:
- Sequential phase dependencies
- Approval gates (cost-aware operations)
- Checkpoint/rollback patterns
- Parallel vs sequential execution
- Port/service mesh configuration

### Impact
- **Pipeline logic scattered**: No central definition of workflow
- **Missing cost awareness**: No way to mark operations requiring approval
- **No rollback semantics**: Can't express how to handle phase failures

---

## Gap 3: Reactive State Management (Pinia/Vuex Pattern)

### Problem
APML has no construct for reactive state stores with computed properties, actions, and module composition.

### Original Code
```javascript
// src/stores/production.js
export const useProductionStore = defineStore('production', () => {
  // State
  const currentCourseCode = ref(null)
  const courseManifest = ref(null)
  const sampleFlags = ref({})

  // Computed (reactive derivations)
  const samplesByStatus = computed(() => {
    const grouped = { pending: [], flagged_regen_tts: [], ... }
    for (const [uuid, data] of Object.entries(sampleFlags.value.samples)) {
      grouped[data.status].push({ uuid, ...data })
    }
    return grouped
  })

  const progressStats = computed(() => {
    const total = Object.keys(samples).length
    const approved = Object.values(samples).filter(s => s.status === 'approved').length
    return { total, approved, percentComplete: (approved / total) * 100 }
  })

  // Actions
  async function loadCourse(courseCode) { ... }
  async function updateSampleFlag(uuid, flagData) { ... }
  function handleWebSocketUpdate(data) { ... }

  return { state, computed, actions }
})
```

### Current APML Limitation
APML `data` defines static schemas but not:
- Reactive state containers
- Computed/derived properties
- Actions with side effects
- Store composition and modules
- Reactivity system semantics

### Impact
- **State logic orphaned**: Must be reimplemented in target framework
- **No computed property semantics**: Derivation logic not expressible
- **Missing reactivity model**: APML doesn't specify when/how UI updates

---

## Gap 4: WebSocket/Real-time Event Patterns

### Problem
APML has no construct for bidirectional real-time communication with room-based subscriptions.

### Original Code
```javascript
// src/services/websocket.js
import { io } from 'socket.io-client'

let socket = null

export function initWebSocket() {
  socket = io(PRODUCTION_API_URL + '/api/production/websocket')

  socket.on('connect', () => { store.setWsConnected(true) })
  socket.on('disconnect', () => { store.setWsConnected(false) })
  socket.on('sample_updated', (data) => { store.handleWebSocketUpdate(data) })
  socket.on('audio_metadata_updated', (data) => { store.handleWebSocketUpdate(data) })
}

export function joinCourseRoom(courseCode) {
  socket?.emit('join', { room: courseCode })
}

export function leaveCourseRoom(courseCode) {
  socket?.emit('leave', { room: courseCode })
}
```

### Current APML Limitation
API routes can define REST endpoints but not:
- WebSocket connections
- Event subscription patterns
- Room/channel semantics
- Bidirectional messaging
- Connection lifecycle

### Impact
- **Real-time features undefined**: No spec for how data syncs
- **Room patterns unexpressed**: Course-specific subscriptions not capturable
- **Connection state invisible**: No way to specify ws_connected behavior

---

## Gap 5: Multi-Layer Caching Strategy

### Problem
The app uses sophisticated multi-layer caching (memory → IndexedDB → S3 → GitHub fallback) that APML cannot express.

### Original Code
```javascript
// src/services/api.js
async get(courseCode) {
  // Layer 1: Check IndexedDB cache
  const cachedData = await getCachedCourse(courseCode)
  if (cachedData) return reconstructFromCache(cachedData)

  // Layer 2: Try S3 (primary storage)
  try {
    const res = await fetch(storage.getCourseFileUrl(courseCode, 'lego_pairs.json'))
    if (res.ok) { cacheAndReturn(await res.json()) }
  } catch {}

  // Layer 3: Fallback to GitHub
  try {
    const res = await fetch(githubStorage.getCourseFileUrl(courseCode, 'lego_pairs.json'))
    if (res.ok) { cacheAndReturn(await res.json()) }
  } catch {}

  throw new Error('Course not found')
}
```

### Current APML Limitation
APML `service` can define operations but not:
- Caching strategy layers
- Fallback chains
- Cache invalidation rules
- TTL/expiration semantics
- Storage backend abstraction

### Impact
- **Performance logic invisible**: Caching is critical for UX but unexpressed
- **Fallback behavior undefined**: Graceful degradation not capturable
- **Cache coherence unexplained**: When/how caches invalidate

---

## Gap 6: Composables (Reusable Logic Units)

### Problem
Vue 3 composables (`useAuth`, `useScriptPlayer`, `useAutocueState`) are reusable logic units that APML cannot express.

### Original Code
```javascript
// src/composables/useAuth.js
export function useAuth() {
  const user = ref(null)
  const isLoading = ref(true)
  const error = ref(null)

  async function login(email, password) { ... }
  async function logout() { ... }
  async function checkSession() { ... }

  // Auto-check session on mount
  onMounted(() => { checkSession() })

  return { user, isLoading, error, login, logout }
}

// Usage in any component:
const { user, login, logout } = useAuth()
```

### Current APML Limitation
No construct for:
- Reusable logic units (not components, not services)
- Lifecycle hook integration
- State sharing across components
- Composition pattern

### Impact
- **Logic reuse unexpressed**: Common patterns must be duplicated
- **Lifecycle coupling lost**: Hook-bound logic not capturable
- **Composition invisible**: How units combine not specified

---

## Gap 7: Conditional/Dynamic Layouts

### Problem
APML `interface` defines static layouts, but SSi has highly dynamic UIs based on state.

### Original Code
```vue
<!-- src/views/CourseGeneration.vue -->
<template>
  <!-- Phase 1: Form mode -->
  <div v-if="!isGenerating && !isCompleted" class="form-container">
    <!-- 200+ lines of form UI -->
  </div>

  <!-- Phase 2: Progress mode -->
  <div v-if="isGenerating || isCompleted" class="progress-container">
    <PipelineProgress v-if="!isCompleted" ... />
    <CompletionCard v-if="isCompleted" ... />
    <ErrorDisplay v-if="errorMessage" ... />
  </div>

  <!-- Modals -->
  <Phase2CheckpointModal v-if="showPhase2Checkpoint" ... />
  <PushToGitHubModal v-if="showPushModal" ... />
</template>
```

### Current APML Limitation
`interface` has `show` blocks but limited:
- Conditional rendering (`when` is basic)
- Mode/state-based layouts
- Modal/overlay patterns
- Slot/projection semantics

### Impact
- **Dynamic UI unexpressed**: Complex conditional rendering lost
- **Modal patterns undefined**: Overlay semantics not capturable
- **State-driven layouts**: Major feature gaps

---

## Gap 8: Component Props and Events (Input/Output Contract)

### Problem
Vue components have strict prop/event contracts that APML doesn't capture.

### Original Code
```vue
<!-- src/components/LegoVisualizer.vue -->
<script setup>
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: true
  },
  initialFilters: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['lego-edited', 'show-provenance'])

// Expose methods for parent
defineExpose({
  loadLegos,
  resetFilters
})
</script>
```

### Current APML Limitation
`interface` doesn't have:
- Props with types, defaults, required flags
- Events/emits contract
- Expose/imperative handle
- Two-way binding (v-model)

### Impact
- **Component contracts undefined**: Props/events lost in compilation
- **Type safety gap**: No way to specify prop types
- **Parent-child communication**: Emit patterns not capturable

---

## Gap 9: Error Handling and Retry Patterns

### Problem
Sophisticated error handling with retry logic and exponential backoff is used throughout.

### Original Code
```javascript
// From CLAUDE.md - Git operations
// Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

// src/services/api.js
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status !== 404) {
      console.error('[API Error]', error.message)
    }
    return Promise.reject(error)
  }
)

// CourseGeneration.vue
catch (error) {
  if (error.response?.status === 409 && error.response?.data?.existingFiles) {
    const confirmed = confirm('Course exists. Overwrite?')
    if (confirmed) {
      startGeneration(true)  // Retry with force flag
      return
    }
  }
  errorMessage.value = error.response?.data?.error || 'Failed'
}
```

### Current APML Limitation
No constructs for:
- Retry policies
- Exponential backoff
- Error classification (retryable vs fatal)
- Interceptor patterns
- Graceful degradation

### Impact
- **Resilience logic invisible**: Critical for production apps
- **Retry behavior undefined**: Manual reimplementation needed
- **Error categorization lost**: 404 handling vs 500 handling

---

## Gap 10: Cost-Aware Operations with Approval Gates

### Problem
Audio generation costs money (TTS API calls). The app has explicit approval gates before expensive operations.

### Original Code
```javascript
// From CLAUDE.md
// **NEVER Generate TTS Audio Without Approval**
// - Show the plan with cost estimates first
// - Wait for explicit "approved" / "proceed" / "yes" from user

// src/services/api.js
async startAudioGeneration(courseCode, options = {}) {
  const response = await api.post('/api/audio/start', {
    courseCode,
    approved: options.approved || false,  // Must be explicitly approved
    // ...
  })
  return response.data
}

// CourseGeneration.vue - Phase 2 checkpoint
const showPhase2Checkpoint = ref(false)  // Pause for user review
```

### Current APML Limitation
No way to express:
- Cost estimates
- Approval requirements
- Human-in-the-loop checkpoints
- "Dangerous operation" markers
- Confirmation dialogs tied to cost

### Impact
- **Cost safety lost**: No protection against accidental expensive calls
- **Checkpoint semantics undefined**: Pause-for-approval not expressible
- **Human review requirements**: Critical safety feature unexpressed

---

## Gap 11: File Format Versioning and Migration

### Problem
Data files have versions, and the app handles multiple format versions gracefully.

### Original Code
```javascript
// src/services/api.js
// Detect format by checking first seed structure
if (seedsArray.length > 0) {
  const firstSeed = seedsArray[0]

  if (Array.isArray(firstSeed)) {
    // v7.7 format: [[seed_id, [target, known], [[lego_id, type, t, k], ...]]]
    for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
      // Parse v7.7 format
    }
  } else if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
    // v5.0.1 format: {seed_id, seed_pair, legos: [...]}
    for (const seed of seedsArray) {
      // Parse v5.0.1 format
    }
  }
}
```

### Current APML Limitation
`data` defines one schema but not:
- Version annotations
- Migration paths
- Multi-version parsing
- Format detection logic
- Backwards compatibility

### Impact
- **Schema evolution lost**: Can't express format changes over time
- **Migration logic undefined**: How to upgrade old data
- **Compatibility invisible**: Multi-version support not capturable

---

## Gap 12: Environment Configuration and Runtime Switching

### Problem
App supports multiple environments (local, ngrok, production) with runtime switching.

### Original Code
```javascript
// src/services/api.js
function getApiBaseUrl() {
  // Check localStorage for user-selected environment
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) return storedUrl

  // Fall back to environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
}

// src/components/EnvironmentSwitcher.vue
const environments = [
  { name: 'Local', url: 'http://localhost:3456' },
  { name: 'Ngrok', url: 'https://xxx.ngrok.io' },
  { name: 'Production', url: 'https://api.popty.app' }
]

function switchEnvironment(env) {
  localStorage.setItem('api_base_url', env.url)
  window.location.reload()  // Full app reload to apply
}
```

### Current APML Limitation
No constructs for:
- Environment definitions
- Runtime configuration
- Environment switching
- localStorage patterns
- Build-time vs runtime config

### Impact
- **Multi-env support undefined**: Dev/staging/prod not expressible
- **Runtime config invisible**: Dynamic URL switching lost
- **Configuration persistence**: localStorage patterns not capturable

---

## Summary Table

| Gap # | Category | Severity | APML Extension Needed |
|-------|----------|----------|----------------------|
| 1 | Domain | High | `vocabulary` construct |
| 2 | Pipeline | Critical | `pipeline` with phases, gates |
| 3 | State | Critical | `store` with computed |
| 4 | Real-time | High | `websocket` events/rooms |
| 5 | Performance | Medium | `cache` strategy |
| 6 | Logic | High | `composable` construct |
| 7 | Interface | High | Enhanced `when`/modal |
| 8 | Interface | High | `props`/`emits` contract |
| 9 | Logic | Medium | `retry`/`error_handling` |
| 10 | Safety | Critical | `requires_approval` |
| 11 | Data | Medium | `version`/`migration` |
| 12 | Config | Medium | `environment` construct |

---

## Recommendations for APML v2.0

1. **Highest Priority**: Pipeline orchestration, state management, cost-aware operations
2. **High Priority**: Domain vocabulary, WebSocket, composables, prop contracts
3. **Medium Priority**: Caching, error handling, versioning, environments

The Popty codebase revealed that **APML v1.0.0 is strong on static structure but weak on dynamic behavior, state, and domain semantics.**
