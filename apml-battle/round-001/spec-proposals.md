# APML Spec Proposals from Popty Battle Round 1

## Overview

These proposals address the 12 gaps identified during reverse-compilation of the SSi Dashboard (Popty) application. Each proposal includes the gap, original code, proposed APML syntax, and rationale.

---

## Proposal 1: Domain Vocabulary Construct

### Gap
No way to define domain-specific terminology that permeates an application.

### Original Code
```javascript
// Terms used throughout codebase with specific meanings:
// - "LEGO" = reusable language building block (not the toy)
// - "Seed" = canonical English sentence
// - "Basket" = practice phrase collection
// - "Debut" = first introduction of a LEGO
// - "Eternal" = LEGO that recurs throughout course
```

### Proposed APML Extension
```apml
vocabulary SSiPedagogy:
  # Domain-specific terminology with precise definitions

  seed:
    definition: "Canonical English sentence forming the backbone of a course"
    aliases: ["SEED", "canonical_seed"]
    plural: "seeds"
    example: "I want to speak Spanish with you now."

  lego:
    definition: "Reusable language building block extracted from seeds"
    aliases: ["LEGO", "amino_acid"]
    plural: "legos"
    subtypes:
      - A: "Atomic - single word or fixed phrase"
      - M: "Molecular - multi-word construct with components"

  basket:
    definition: "Collection of practice phrases for learning a LEGO"
    aliases: ["practice_basket"]
    contains: ["components", "debut", "practice_sentences"]

  debut:
    definition: "First introduction of a LEGO in the course"
    opposite: "reuse"
    marked_by: "new: true"

  eternal:
    definition: "LEGO that appears repeatedly across the course"
    property: "high pedagogical value"
```

### Rationale
- **Semantic preservation**: Domain knowledge embedded in spec, not lost in compilation
- **Consistency**: All agents interpret terms the same way
- **Documentation**: Self-documenting specifications
- **AI assistance**: Enables better AI understanding of intent

---

## Proposal 2: Pipeline Orchestration Construct

### Gap
No way to express multi-phase pipelines with dependencies, checkpoints, and approval gates.

### Original Code
```javascript
// Phase coordination across microservices
// Phase 1 (3457) -> Phase 2 (3458) -> Phase 3 (3459) -> Audio (3465) -> Manifest (3466)

// Approval gate for Audio (costs money)
async startAudioGeneration(courseCode, options = {}) {
  const response = await api.post('/api/audio/start', {
    approved: options.approved || false,  // Must be explicitly true
  })
}
```

### Proposed APML Extension
```apml
pipeline CourseGeneration:
  description: "Multi-phase course production workflow"

  orchestrator:
    port: 3456
    health: "/api/health"

  # Phase definitions with dependencies and gates
  phase Translation:
    id: "phase1"
    port: 3457
    input: canonical_seeds.json
    output: draft_lego_pairs.json

    endpoints:
      start: POST /translate
      status: GET /status
      stop: POST /stop/:courseCode

    on_complete: trigger ConflictResolution

  phase ConflictResolution:
    id: "phase2"
    port: 3458
    depends_on: Translation
    input: draft_lego_pairs.json
    output: lego_pairs.json

    checkpoint:
      name: "Phase 2 Validation"
      show: validation_stats
      require_approval: false  # Auto-continue if validation passes
      allow_review: true

    on_complete: trigger BasketGeneration

  phase BasketGeneration:
    id: "phase3"
    port: 3459
    depends_on: ConflictResolution
    input: lego_pairs.json
    output: lego_baskets.json

    on_complete: trigger AudioGeneration

  phase AudioGeneration:
    id: "audio"
    port: 3465
    depends_on: BasketGeneration
    input: lego_baskets.json
    output: Supabase.audio_samples

    cost_aware: true
    require_approval: true  # CRITICAL: Costs money

    approval_gate:
      show: cost_estimate
      message: "Audio generation will cost approximately ${estimate}. Proceed?"
      require: explicit_confirmation

    on_complete: trigger ManifestCompilation

  phase ManifestCompilation:
    id: "manifest"
    port: 3466
    depends_on: AudioGeneration
    input: [lego_baskets.json, Supabase.audio_samples]
    output: course_manifest.json

    on_complete: pipeline.complete

  # Error handling and rollback
  on_error:
    phase1: "Retry up to 3 times, then fail"
    phase2: "Rollback to draft_lego_pairs.json"
    audio: "Save progress, allow resume"

  # Progress tracking
  progress:
    emit: websocket "pipeline_progress"
    fields: [current_phase, seeds_completed, total_seeds, eta]
```

### Rationale
- **Explicit orchestration**: Clear phase dependencies and transitions
- **Cost safety**: Approval gates prevent accidental expensive operations
- **Checkpoints**: Human review points embedded in workflow
- **Error handling**: Rollback and retry semantics defined
- **Progress**: Real-time tracking specification

---

## Proposal 3: Reactive Store Construct

### Gap
No way to express reactive state stores with computed properties and actions.

### Original Code
```javascript
export const useProductionStore = defineStore('production', () => {
  const currentCourseCode = ref(null)
  const courseManifest = ref(null)
  const sampleFlags = ref({})

  const samplesByStatus = computed(() => {
    const grouped = { pending: [], flagged: [], approved: [] }
    for (const [uuid, data] of Object.entries(sampleFlags.value.samples)) {
      grouped[data.status].push({ uuid, ...data })
    }
    return grouped
  })

  async function loadCourse(courseCode) { ... }

  return { currentCourseCode, samplesByStatus, loadCourse }
})
```

### Proposed APML Extension
```apml
store ProductionStore:
  description: "Production QA state management"

  # Reactive state
  state:
    current_course_code: string nullable
    course_manifest: CourseManifest nullable
    sample_flags: SampleFlagsMap default({})
    audio_metadata: AudioMetadataMap default({})
    is_loading: boolean default(false)
    error: string nullable
    ws_connected: boolean default(false)

  # Computed properties (reactive derivations)
  computed:
    samples_by_status:
      derive_from: sample_flags.samples
      logic: |
        group by status
        return { pending, flagged_regen_tts, flagged_human_needed, approved, rejected }

    progress_stats:
      derive_from: sample_flags.samples
      logic: |
        total = count(samples)
        approved = count where status == "approved"
        flagged = count where status starts_with "flagged_"
        return { total, approved, flagged, percent_complete: approved/total * 100 }

    has_blockers:
      derive_from: samples_by_status
      logic: samples_by_status.flagged_human_needed.length > 0

  # Actions (methods with side effects)
  actions:
    load_course(course_code):
      set is_loading = true
      try:
        fetch [manifest, flags, metadata] in parallel
        set course_manifest, sample_flags, audio_metadata
      catch error:
        set error = error.message
      finally:
        set is_loading = false

    update_sample_flag(uuid, flag_data):
      await POST /api/production/{course_code}/flags/update
      update sample_flags[uuid] locally

    handle_websocket_update(data):
      if data.type == "sample_updated":
        update sample_flags[data.uuid]
      if data.type == "audio_metadata_updated":
        update audio_metadata[data.uuid]

    reset():
      clear all state to defaults

  # Subscriptions (external events)
  subscriptions:
    websocket.on("sample_updated"): handle_websocket_update
    websocket.on("audio_metadata_updated"): handle_websocket_update

  # Persistence (optional)
  persistence:
    key: "production_store"
    include: [current_course_code]
    exclude: [is_loading, error]
```

### Rationale
- **Reactivity model**: Clear separation of state, computed, actions
- **Derivation logic**: Computed properties with explicit dependencies
- **Side effects**: Actions clearly marked as async/effectful
- **Subscriptions**: External event handling defined
- **Persistence**: Optional state persistence specification

---

## Proposal 4: WebSocket Events Construct

### Gap
No way to express bidirectional real-time communication with rooms.

### Original Code
```javascript
import { io } from 'socket.io-client'

socket.on('connect', () => { store.setWsConnected(true) })
socket.on('sample_updated', (data) => { store.handleWebSocketUpdate(data) })

function joinCourseRoom(courseCode) {
  socket?.emit('join', { room: courseCode })
}
```

### Proposed APML Extension
```apml
websocket ProductionWebSocket:
  endpoint: "/api/production/websocket"
  protocol: "socket.io"

  # Connection lifecycle
  connection:
    on_connect:
      set store.ws_connected = true

    on_disconnect:
      set store.ws_connected = false

    on_error(error):
      log error
      retry with_backoff(1s, 2s, 4s, max: 30s)

  # Room semantics
  rooms:
    course_room:
      join(course_code):
        emit "join" with { room: course_code }

      leave(course_code):
        emit "leave" with { room: course_code }

  # Server -> Client events
  events:
    sample_updated:
      payload: { course_code, uuid, update }
      handler: store.handle_websocket_update(payload)

    audio_metadata_updated:
      payload: { course_code, uuid, metadata }
      handler: store.handle_websocket_update(payload)

    pipeline_progress:
      payload: { course_code, phase, progress, eta }
      handler: update_pipeline_display(payload)

  # Client -> Server events
  emits:
    join:
      payload: { room: string }
      description: "Join a course-specific room"

    leave:
      payload: { room: string }
      description: "Leave a course-specific room"
```

### Rationale
- **Bidirectional**: Both receive (events) and send (emits)
- **Room semantics**: Subscription to specific resources
- **Connection lifecycle**: Retry and backoff patterns
- **Type safety**: Payload schemas defined

---

## Proposal 5: Composable Logic Units

### Gap
No way to express reusable logic units that aren't components or services.

### Original Code
```javascript
export function useAuth() {
  const user = ref(null)
  const isLoading = ref(true)

  async function login(email, password) { ... }
  async function logout() { ... }

  onMounted(() => { checkSession() })

  return { user, isLoading, login, logout }
}

// Usage: const { user, login } = useAuth()
```

### Proposed APML Extension
```apml
composable useAuth:
  description: "Authentication state and methods"

  # Internal state (encapsulated)
  state:
    user: User nullable
    is_loading: boolean default(true)
    error: string nullable
    token: string nullable stored_in(localStorage)

  # Lifecycle hooks
  lifecycle:
    on_mount:
      check_session()

    on_unmount:
      cleanup_listeners()

  # Exposed methods
  methods:
    login(email, password):
      try:
        response = await POST /api/auth/login { email, password }
        set user = response.user
        set token = response.token
      catch:
        set error = "Login failed"

    logout():
      await POST /api/auth/logout
      clear user, token
      navigate("/login")

    check_session():
      if token:
        response = await GET /api/auth/me
        set user = response.user

  # What gets returned when used
  returns:
    user: readonly
    is_loading: readonly
    error: readonly
    login: method
    logout: method

composable useScriptPlayer:
  description: "Audio playback for course scripts"

  state:
    is_playing: boolean default(false)
    current_item: PlaylistItem nullable
    playlist: PlaylistItem[]
    playback_rate: number default(1.0)

  methods:
    play(item):
      audio_element.src = get_audio_url(item.uuid)
      audio_element.play()
      set is_playing = true
      set current_item = item

    pause():
      audio_element.pause()
      set is_playing = false

    next():
      index = playlist.indexOf(current_item)
      if index < playlist.length - 1:
        play(playlist[index + 1])

  returns:
    is_playing, current_item, playback_rate: readonly
    play, pause, next, set_rate: methods
```

### Rationale
- **Logic reuse**: Share behavior across components
- **Encapsulation**: Internal state vs exposed interface
- **Lifecycle**: Hook into component lifecycle
- **Composition**: Can use other composables

---

## Proposal 6: Enhanced Interface Props/Events

### Gap
Component contracts (props, events, expose) not expressible.

### Original Code
```vue
<script setup>
const props = defineProps({
  courseCode: { type: String, required: true },
  editable: { type: Boolean, default: true },
  initialFilters: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['lego-edited', 'show-provenance'])

defineExpose({ loadLegos, resetFilters })
</script>
```

### Proposed APML Extension
```apml
interface LegoVisualizer:
  type: component  # vs "view" (route-based)

  # Input contract (props)
  props:
    course_code:
      type: string
      required: true
      description: "Course code to load LEGOs from"

    editable:
      type: boolean
      default: true
      description: "Allow editing LEGO text"

    initial_filters:
      type: FilterConfig
      default: {}
      description: "Pre-applied filters"

  # Output contract (events)
  events:
    lego_edited:
      payload: { lego: LEGO, previous_text: string }
      description: "Emitted when user saves an edit"

    show_provenance:
      payload: { lego: LEGO, provenance: Provenance }
      description: "Emitted when user clicks provenance link"

  # Imperative handle (exposed methods)
  expose:
    load_legos():
      description: "Reload LEGOs from API"

    reset_filters():
      description: "Clear all filters to defaults"

  # Two-way binding support
  model:
    prop: selected_lego
    event: update:selected_lego

  # Slots for composition
  slots:
    header: "Custom header content"
    lego_card: "Custom LEGO card template"
    empty: "Content when no LEGOs match"
```

### Rationale
- **Type safety**: Props with types and validation
- **Contract clarity**: Clear input/output boundaries
- **v-model**: Two-way binding specification
- **Slots**: Content projection patterns

---

## Proposal 7: Cost-Aware Operation Modifier

### Gap
No way to mark operations that cost money and require approval.

### Original Code
```javascript
// From CLAUDE.md
// **NEVER Generate TTS Audio Without Approval**

async startAudioGeneration(courseCode, options = {}) {
  approved: options.approved || false,  // MUST be true
}
```

### Proposed APML Extension
```apml
# Modifier that can be applied to any action/process
action generate_audio:
  cost_aware:
    estimate_from: count_phrases * voice_cost_per_phrase
    currency: USD
    warning_threshold: $1.00
    approval_required: true

  approval_gate:
    show_before_execution: true
    display:
      - "Estimated cost: {cost_estimate}"
      - "Phrases to generate: {phrase_count}"
      - "Estimated time: {time_estimate}"
    require: explicit_user_confirmation
    confirmation_text: "approved" | "proceed" | "yes"
    cancel_action: abort_and_notify

  on_approval:
    proceed_with_generation()

  on_cancel:
    log "User declined audio generation"
    return { cancelled: true }

# Alternative: attribute syntax
@cost_aware(estimate: "{phrase_count} * $0.004", approval: required)
action generate_audio:
  ...

# Usage in pipeline
phase AudioGeneration:
  @cost_aware
  @requires_approval
  action: generate_tts_audio
```

### Rationale
- **Cost safety**: Explicit marking prevents accidental expensive calls
- **Transparency**: Users see costs before committing
- **Flexibility**: Can be applied to any action
- **Audit trail**: Approval logged for accountability

---

## Proposal 8: Multi-Layer Cache Strategy

### Gap
No way to express caching with fallback chains.

### Original Code
```javascript
// Check IndexedDB -> Try S3 -> Fallback to GitHub
const cachedData = await getCachedCourse(courseCode)
if (cachedData) return cached

const s3Response = await fetch(s3Url)
if (s3Response.ok) { cache(data); return data }

const githubResponse = await fetch(githubUrl)
if (githubResponse.ok) { cache(data); return data }

throw new Error('Not found')
```

### Proposed APML Extension
```apml
cache CourseDataCache:
  description: "Multi-layer caching for course data"

  layers:
    memory:
      type: in_memory
      ttl: 5 minutes
      max_size: 50MB

    indexeddb:
      type: persistent
      database: "ssi_cache"
      ttl: 24 hours
      max_size: 500MB

    s3:
      type: remote
      bucket: "popty-bach-lfs"
      region: "eu-west-1"
      is_source_of_truth: true

    github:
      type: remote
      base_url: "https://raw.githubusercontent.com/..."
      is_fallback: true
      readonly: true

  strategy:
    read:
      order: [memory, indexeddb, s3, github]
      on_miss: try_next_layer
      on_hit: populate_upper_layers

    write:
      target: s3
      invalidate: [memory, indexeddb]

    invalidation:
      on_course_update: clear [memory, indexeddb] for course_code
      manual: allow

  key_pattern: "{course_code}/{filename}"

  versioning:
    enabled: true
    version_key: "cache_version"
    on_version_mismatch: invalidate_all
```

### Rationale
- **Performance**: Cache strategy critical for UX
- **Resilience**: Fallback chains for reliability
- **Consistency**: Clear invalidation rules
- **Versioning**: Handle schema migrations

---

## Proposal 9: Data Version and Migration

### Gap
No way to express schema versions and migrations.

### Original Code
```javascript
// Detect format by checking first seed structure
if (Array.isArray(firstSeed)) {
  // v7.7 format: [[seed_id, [target, known], [[lego_id, type, t, k], ...]]]
} else if (firstSeed.seed_id) {
  // v5.0.1 format: {seed_id, seed_pair, legos: [...]}
}
```

### Proposed APML Extension
```apml
data LegoPairs:
  version: "5.0.1"
  previous_versions: ["7.7", "4.0"]

  schema:
    seeds: Seed[]

  # Version-specific parsing
  version_detection:
    "7.7":
      detect: first_element is array
      parse: legacy_array_format

    "5.0.1":
      detect: first_element.seed_id exists
      parse: current_object_format

  # Migrations
  migrations:
    "7.7" -> "5.0.1":
      transform: |
        for [seed_id, [target, known], legos] in seeds:
          yield {
            seed_id: seed_id,
            seed_pair: { known, target },
            legos: transform_legos(legos)
          }

    "4.0" -> "7.7":
      transform: legacy_to_v77()

  # Backwards compatibility
  compatibility:
    write_format: "5.0.1"
    read_formats: ["5.0.1", "7.7", "4.0"]
```

### Rationale
- **Evolution**: Schemas change over time
- **Migration paths**: Clear transformation rules
- **Compatibility**: Read old, write new
- **Detection**: Auto-identify version

---

## Proposal 10: Environment Configuration

### Gap
No way to express multi-environment configuration.

### Original Code
```javascript
function getApiBaseUrl() {
  const storedUrl = localStorage.getItem('api_base_url')
  if (storedUrl) return storedUrl
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
}

const environments = [
  { name: 'Local', url: 'http://localhost:3456' },
  { name: 'Ngrok', url: 'https://xxx.ngrok.io' },
  { name: 'Production', url: 'https://api.popty.app' }
]
```

### Proposed APML Extension
```apml
environments:
  # Define available environments
  local:
    name: "Local Development"
    api_base: "http://localhost:3456"
    websocket: "ws://localhost:3456"
    features:
      debug_mode: true
      mock_audio: true

  staging:
    name: "Staging (Ngrok)"
    api_base: env.NGROK_URL or "https://staging.popty.app"
    websocket: "{api_base}/ws"
    features:
      debug_mode: true
      mock_audio: false

  production:
    name: "Production"
    api_base: "https://api.popty.app"
    websocket: "wss://api.popty.app/ws"
    features:
      debug_mode: false
      mock_audio: false
      analytics: true

  # Runtime switching
  switching:
    allowed: true
    persist_in: localStorage
    key: "api_base_url"
    require_reload: true

  # Default selection
  default:
    from_env: VITE_ENVIRONMENT
    fallback: "local"

  # Build-time configuration
  build_time:
    inject: [api_base, websocket]
    prefix: "VITE_"
```

### Rationale
- **Multi-env**: Dev, staging, production clearly defined
- **Runtime switching**: Support environment selector UI
- **Feature flags**: Per-environment features
- **Build integration**: Connect to build tools

---

## Summary

| Proposal | Construct | Priority | Complexity |
|----------|-----------|----------|------------|
| 1 | `vocabulary` | High | Low |
| 2 | `pipeline` | Critical | High |
| 3 | `store` | Critical | High |
| 4 | `websocket` | High | Medium |
| 5 | `composable` | High | Medium |
| 6 | Enhanced `interface` | High | Medium |
| 7 | `@cost_aware` | Critical | Low |
| 8 | `cache` | Medium | Medium |
| 9 | Data `version` | Medium | Medium |
| 10 | `environments` | Medium | Low |

### Implementation Roadmap

**Phase 1 (Critical)**: `pipeline`, `store`, `@cost_aware`
**Phase 2 (High)**: `vocabulary`, `websocket`, `composable`, enhanced `interface`
**Phase 3 (Medium)**: `cache`, `version`, `environments`

These extensions would allow APML to fully express the Popty application without semantic loss.
