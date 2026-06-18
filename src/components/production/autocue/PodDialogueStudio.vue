<template>
  <div class="pod-dialogue-studio">
    <!-- Loading -->
    <section v-if="phase === 'loading'" class="studio-card center">
      <div class="studio-spinner"></div>
      <p>Loading your dialogue lines...</p>
    </section>

    <!-- Casting not set up (plan endpoint 404s until the casting build lands a cast) -->
    <section v-else-if="phase === 'no-plan'" class="studio-card center">
      <h2>Casting not set up yet</h2>
      <p>
        Your course leader hasn't cast the conversations for this course yet.
        As soon as your character lines are assigned, they'll appear here.
      </p>
      <button class="btn-ghost" @click="loadPlan">Check again</button>
    </section>

    <!-- Error -->
    <section v-else-if="phase === 'error'" class="studio-card center">
      <h2>Couldn't load your lines</h2>
      <p>{{ loadError }}</p>
      <button class="btn-ghost" @click="loadPlan">Try again</button>
    </section>

    <!-- Plan ready: summary + begin -->
    <section v-else-if="phase === 'ready'" class="studio-card summary">
      <h2>Your dialogue lines</h2>
      <p v-if="planSpeakers" class="speakers-line">
        You're reading as <strong>{{ planSpeakers }}</strong>
      </p>

      <div class="summary-stats">
        <div class="sum-stat">
          <span class="sum-value">{{ totals.total }}</span>
          <span class="sum-label">Lines</span>
        </div>
        <div class="sum-stat">
          <span class="sum-value">{{ combinedRecordedCount }}</span>
          <span class="sum-label">Recorded</span>
        </div>
        <div class="sum-stat">
          <span class="sum-value">{{ remainingCount }}</span>
          <span class="sum-label">To go</span>
        </div>
        <div class="sum-stat">
          <span class="sum-value">{{ podBreakdown.length }}</span>
          <span class="sum-label">Conversations</span>
        </div>
      </div>

      <ul class="pod-breakdown">
        <li v-for="pod in podBreakdown" :key="pod.podId || pod.podTitle">
          <span class="pod-name">{{ pod.podTitle || pod.podId }}</span>
          <span class="pod-count" :class="{ complete: pod.recorded >= pod.total }">
            {{ pod.recorded }} / {{ pod.total }}
          </span>
        </li>
      </ul>

      <p v-if="combinedRecordedCount > 0 && remainingCount > 0" class="resume-note">
        Picking up where you left off — lines you've already recorded are skipped.
      </p>
      <p v-else-if="remainingCount === 0" class="resume-note all-done">
        Every line is recorded. Switch on "include recorded lines" to do another pass.
      </p>

      <div class="session-toggles">
        <label class="toggle-row">
          <input type="checkbox" v-model="reviewBeforeAdvance" />
          <span>
            <strong>Check each take before moving on</strong>
            <small>Listen back and redo a line before it's saved. Off = flow straight through, like the reading script.</small>
          </span>
        </label>
        <label class="toggle-row">
          <input type="checkbox" v-model="includeRecorded" />
          <span>
            <strong>Include already-recorded lines</strong>
            <small>Re-record everything in order. New takes replace old ones; nothing is deleted.</small>
          </span>
        </label>
      </div>

      <div class="summary-actions">
        <button
          class="btn-begin"
          :disabled="startIndex === -1"
          @click="beginSession"
        >Start recording</button>
      </div>
      <p v-if="micError" class="mic-error">{{ micError }}</p>
    </section>

    <!-- Recording -->
    <section v-else-if="phase === 'recording'" class="recording-stage">
      <!-- Progress strip -->
      <div class="progress-strip">
        <div class="progress-pod">
          <span class="progress-label">{{ currentPodProgress.podTitle || 'Conversation' }}</span>
          <span class="progress-count">{{ currentPodProgress.recorded }} / {{ currentPodProgress.total }}</span>
        </div>
        <div class="progress-total">
          <span class="progress-label">All lines</span>
          <span class="progress-count">{{ combinedRecordedCount }} / {{ totals.total }}</span>
        </div>
        <div class="progress-upload" v-if="uploadQueue.pendingCount.value > 0">
          <span class="progress-label">Saving</span>
          <span class="progress-count pending">{{ uploadQueue.pendingCount.value }}</span>
        </div>
      </div>

      <!-- VAD indicator -->
      <div v-if="isFlowing" class="vad-strip">
        <div class="vad-bar" :style="{ width: `${vadLevel * 100}%` }"></div>
        <span class="vad-status">{{ isSpeaking ? 'Hearing you...' : 'Listening...' }}</span>
      </div>

      <!-- The cue itself -->
      <DialogueCue
        v-if="currentItem"
        :item="currentItem"
        :previous-item="previousShownItem"
        :is-recording="isFlowing"
        :is-capturing="isCapturing"
      />

      <!-- Pending take review (review-before-advance mode) -->
      <div v-if="pendingTake" class="take-review">
        <span class="take-label">Take captured — happy with it?</span>
        <div class="take-actions">
          <button class="btn-take" @click="playPendingTake" :disabled="isPlayingBack">
            {{ isPlayingBack ? 'Playing...' : 'Listen' }}
          </button>
          <button class="btn-take redo" @click="redoPendingTake">Redo</button>
          <button class="btn-take keep" @click="keepPendingTake">Keep & next</button>
        </div>
        <small class="take-hint">Or just read the line again — speaking replaces the take.</small>
      </div>

      <!-- Controls: thumb-reachable on a phone -->
      <div class="dialogue-controls">
        <button class="ctl-nav" @click="goPrev" :disabled="!canGoPrev" aria-label="Previous line">‹</button>
        <button class="ctl-record" :class="{ live: isFlowing }" @click="toggleFlow">
          {{ isFlowing ? 'Pause' : 'Resume' }}
        </button>
        <button class="ctl-nav" @click="goNext" :disabled="!canGoNext" aria-label="Skip to next line">›</button>
      </div>
      <button class="btn-finish" @click="finishSession">Finish session</button>
    </section>

    <!-- Done -->
    <section v-else-if="phase === 'done'" class="studio-card center">
      <h2>Session complete</h2>
      <div class="summary-stats">
        <div class="sum-stat">
          <span class="sum-value">{{ sessionRecorded.size }}</span>
          <span class="sum-label">Lines this session</span>
        </div>
        <div class="sum-stat">
          <span class="sum-value">{{ uploadQueue.uploadedCount.value }}</span>
          <span class="sum-label">Saved</span>
        </div>
        <div class="sum-stat" v-if="uploadQueue.pendingCount.value > 0">
          <span class="sum-value pending">{{ uploadQueue.pendingCount.value }}</span>
          <span class="sum-label">Still saving...</span>
        </div>
        <div class="sum-stat" v-if="uploadQueue.failedIndices.size > 0">
          <span class="sum-value failed">{{ uploadQueue.failedIndices.size }}</span>
          <span class="sum-label">Failed</span>
        </div>
      </div>
      <p v-if="uploadQueue.pendingCount.value > 0" class="resume-note">
        Keep this page open until everything has saved.
      </p>
      <div class="summary-actions">
        <button class="btn-ghost" @click="reloadAfterSession">Back to my lines</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useContinuousRecorder } from '@/composables/useContinuousRecorder'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { getApiUrl } from '@/services/api'
import {
  normalizeRecordingPlan,
  podProgress,
  firstUnrecordedIndex,
  nextRecordableIndex,
  buildPodUploadMetadata
} from '@/utils/podRecordingPlan'
import DialogueCue from './DialogueCue.vue'

// Dialogue (pod) autocue session shell. Additive sibling of AutocueStudio:
// same capture spine (useContinuousRecorder VAD + useUploadQueue background
// uploads, wake lock and phone-safe containers included), different script —
// per-voice dialogue lines from the pods recording-plan endpoint.
const props = defineProps({
  courseCode: { type: String, required: true },
  voiceId: { type: String, required: true }
})

const emit = defineEmits(['progress'])

// ─── Plan state ────────────────────────────────────────────────────────────
const phase = ref('loading') // loading | no-plan | error | ready | recording | done
const loadError = ref(null)
const micError = ref(null)
const plan = ref(null)
const items = computed(() => plan.value?.items || [])
const totals = computed(() => plan.value?.totals || { total: 0, recorded: 0, remaining: 0 })
const planSpeakers = computed(() => {
  const s = plan.value?.speakers
  return Array.isArray(s) && s.length > 0 ? s.filter(x => x !== '__explainer__').join(', ') : null
})

// ─── Session state ───────────────────────────────────────────────────────────
const currentIndex = ref(0)
const sessionRecorded = ref(new Set()) // sentenceIds captured (committed) this session
const reviewBeforeAdvance = ref(false)
const includeRecorded = ref(false)
const pendingTake = ref(null) // { segment, index } awaiting keep/redo
const isPlayingBack = ref(false)
const sessionId = ref(null)
// Track what was last SHOWN so pod/scene headers fire on boundaries even when
// recorded lines in between were skipped.
const previousShownItem = ref(null)
let playbackAudio = null

const currentItem = computed(() => items.value[currentIndex.value] || null)

const combinedRecordedCount = computed(() =>
  items.value.reduce(
    (n, it) => n + ((it.recorded || sessionRecorded.value.has(it.sentenceId)) ? 1 : 0),
    0
  )
)
const remainingCount = computed(() => totals.value.total - combinedRecordedCount.value)

const podBreakdown = computed(() => podProgress(items.value, sessionRecorded.value))

const currentPodProgress = computed(() => {
  const podId = currentItem.value?.podId
  return podBreakdown.value.find(p => p.podId === podId)
    || { podTitle: currentItem.value?.podTitle, recorded: 0, total: 0 }
})

const startIndex = computed(() =>
  includeRecorded.value
    ? (items.value.length > 0 ? 0 : -1)
    : firstUnrecordedIndex(items.value, sessionRecorded.value)
)

watch([combinedRecordedCount, totals], () => {
  emit('progress', { recorded: combinedRecordedCount.value, total: totals.value.total })
})

// ─── Capture spine (same as script mode) ─────────────────────────────────────
const recorder = useContinuousRecorder({
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300,
  autoUpload: true,
  autoAdvance: true
})
const isFlowing = recorder.isFlowMode
const isCapturing = recorder.isCapturing
const isSpeaking = recorder.isSpeaking
const vadLevel = recorder.currentLevel

const uploadQueue = useUploadQueue()

recorder.onSegmentCaptured((segment) => {
  // A take captured while a kept take is being played back is the speaker's
  // own audio coming out of the phone — discard it.
  if (isPlayingBack.value) return
  const index = currentIndex.value
  const item = items.value[index]
  if (!item) return

  if (reviewBeforeAdvance.value) {
    // Speaking again before keep/redo simply replaces the pending take.
    pendingTake.value = { segment, index }
    return
  }

  commitTake(segment, index)
  advance()
})

function commitTake(segment, index) {
  const item = items.value[index]
  if (!item) return

  uploadQueue.queueUpload({
    blob: segment.blob,
    courseCode: props.courseCode,
    uuid: null, // server mints the audio identity per take (new row + re-point)
    metadata: buildPodUploadMetadata(item, {
      voiceId: props.voiceId,
      sessionId: sessionId.value
    }),
    provenance: {
      recorded_by: 'dialogue-autocue',
      recorded_at: new Date().toISOString(),
      session_id: sessionId.value,
      mode: 'dialogue'
    },
    itemIndex: index
  })

  sessionRecorded.value.add(item.sentenceId)
  // Set replacement context for any further re-record of the same line.
  sessionRecorded.value = new Set(sessionRecorded.value) // trigger reactivity
}

function advance() {
  previousShownItem.value = currentItem.value
  const next = nextRecordableIndex(items.value, currentIndex.value, {
    extraRecorded: sessionRecorded.value,
    includeRecorded: includeRecorded.value
  })
  if (next === -1) {
    finishSession()
  } else {
    currentIndex.value = next
  }
}

// ─── Manual nav (recorders are humans mid-performance) ───────────────────────
const canGoPrev = computed(() => currentIndex.value > 0)
const canGoNext = computed(() =>
  nextRecordableIndex(items.value, currentIndex.value, {
    extraRecorded: sessionRecorded.value,
    includeRecorded: true // skipping forward may pass anything
  }) !== -1
)

function goPrev() {
  if (!canGoPrev.value) return
  pendingTake.value = null
  previousShownItem.value = items.value[currentIndex.value - 2] || null
  currentIndex.value = currentIndex.value - 1
}

function goNext() {
  pendingTake.value = null
  previousShownItem.value = currentItem.value
  const next = currentIndex.value + 1
  if (next < items.value.length) currentIndex.value = next
}

// ─── Pending-take review ─────────────────────────────────────────────────────
function playPendingTake() {
  if (!pendingTake.value) return
  stopPlayback()
  const url = URL.createObjectURL(pendingTake.value.segment.blob)
  playbackAudio = new Audio(url)
  isPlayingBack.value = true
  playbackAudio.onended = playbackAudio.onerror = () => {
    isPlayingBack.value = false
    URL.revokeObjectURL(url)
    playbackAudio = null
  }
  playbackAudio.play().catch(() => { isPlayingBack.value = false })
}

function stopPlayback() {
  if (playbackAudio) {
    try { playbackAudio.pause() } catch { /* already stopped */ }
    playbackAudio = null
  }
  isPlayingBack.value = false
}

function redoPendingTake() {
  stopPlayback()
  pendingTake.value = null
}

function keepPendingTake() {
  if (!pendingTake.value) return
  stopPlayback()
  commitTake(pendingTake.value.segment, pendingTake.value.index)
  pendingTake.value = null
  advance()
}

// ─── Session lifecycle ───────────────────────────────────────────────────────
async function beginSession() {
  if (startIndex.value === -1) return
  micError.value = null
  sessionId.value = `pod_session_${Date.now()}`
  currentIndex.value = startIndex.value
  previousShownItem.value = null
  pendingTake.value = null
  phase.value = 'recording'
  try {
    await recorder.startFlow()
  } catch (err) {
    micError.value = err?.message || 'Microphone unavailable. Allow microphone access and try again.'
    phase.value = 'ready'
  }
}

async function toggleFlow() {
  if (isFlowing.value) {
    recorder.stopFlow()
  } else {
    try {
      await recorder.startFlow()
    } catch (err) {
      micError.value = err?.message || 'Microphone unavailable.'
    }
  }
}

function finishSession() {
  stopPlayback()
  pendingTake.value = null
  if (isFlowing.value) recorder.stopFlow()
  phase.value = 'done'
}

async function reloadAfterSession() {
  // Re-fetch the plan so the recorded flags now reflect what the server
  // registered — the summary becomes the honest resume point.
  sessionRecorded.value = new Set()
  await loadPlan()
}

// ─── Plan loading ────────────────────────────────────────────────────────────
function apiBase() {
  return localStorage.getItem('api_base_url') || getApiUrl()
}

async function loadPlan() {
  phase.value = 'loading'
  loadError.value = null
  try {
    const url = `${apiBase()}/api/production/${props.courseCode}/pods/recording-plan?voiceId=${encodeURIComponent(props.voiceId)}`
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (res.status === 404) {
      phase.value = 'no-plan'
      return
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `Could not load dialogue lines (${res.status})`)
    }
    const data = await res.json()
    plan.value = normalizeRecordingPlan(data)
    if (plan.value.items.length === 0) {
      // Endpoint live but nothing cast to this voice yet
      phase.value = 'no-plan'
      return
    }
    phase.value = 'ready'
  } catch (err) {
    loadError.value = err?.message || 'Network error'
    phase.value = 'error'
  }
}

watch(() => [props.courseCode, props.voiceId], () => {
  sessionRecorded.value = new Set()
  loadPlan()
}, { immediate: true })

onUnmounted(() => {
  stopPlayback()
  if (isFlowing.value) recorder.stopFlow()
  // The upload queue is a module singleton shared with script mode — only
  // clear it when nothing is mid-flight, so leaving the room never drops takes.
  if (uploadQueue.pendingCount.value === 0) uploadQueue.resetQueue()
})
</script>

<style scoped>
.pod-dialogue-studio {
  max-width: 760px;
  margin: 0 auto;
  padding: 1rem;
  color: var(--color-paper, var(--ink));
}

/* Cards */
.studio-card {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 16px;
  padding: 2rem 1.5rem;
}

.studio-card.center {
  text-align: center;
  max-width: 520px;
  margin: 2rem auto;
}

.studio-card h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.studio-card p {
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.9rem;
  line-height: 1.6;
}

.studio-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, var(--surface-3));
  border-top-color: var(--color-tungsten, var(--accent));
  border-radius: 50%;
  animation: pod-spin 1s linear infinite;
}

@keyframes pod-spin {
  to { transform: rotate(360deg); }
}

/* Summary */
.speakers-line {
  margin-top: -0.25rem;
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin: 1.25rem 0;
}

.sum-stat {
  text-align: center;
  padding: 0.85rem 1rem;
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  min-width: 86px;
}

.sum-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-emerald, #06ffa5);
}

.sum-value.pending { color: var(--color-tungsten, var(--accent)); }
.sum-value.failed { color: var(--color-film-red, #e63946); }

.sum-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, var(--muted));
  margin-top: 0.3rem;
}

.pod-breakdown {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
}

.pod-breakdown li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  font-size: 0.85rem;
}

.pod-breakdown li:last-child { border-bottom: none; }

.pod-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-count {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--color-paper-dim, var(--muted));
  flex-shrink: 0;
}

.pod-count.complete { color: var(--color-emerald, #06ffa5); }

.resume-note {
  font-size: 0.8rem;
  color: var(--color-tungsten, var(--accent));
}

.resume-note.all-done { color: var(--color-emerald, #06ffa5); }

.session-toggles {
  text-align: left;
  margin: 1.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.toggle-row {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  cursor: pointer;
}

.toggle-row input {
  margin-top: 0.25rem;
  width: 18px;
  height: 18px;
  accent-color: var(--color-emerald, #06ffa5);
  flex-shrink: 0;
}

.toggle-row strong {
  display: block;
  font-size: 0.9rem;
}

.toggle-row small {
  display: block;
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  line-height: 1.45;
  margin-top: 0.15rem;
}

.summary-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-begin {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-void, var(--canvas));
  background: var(--color-emerald, #06ffa5);
  border: none;
  border-radius: 8px;
  padding: 0.9rem 2rem;
  cursor: pointer;
  min-height: 48px;
}

.btn-begin:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-ghost {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--color-paper-dim, var(--muted));
  background: transparent;
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  padding: 0.7rem 1.4rem;
  cursor: pointer;
  margin-top: 0.75rem;
  min-height: 44px;
}

.mic-error {
  color: var(--color-film-red, #e63946);
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

/* Recording stage */
.recording-stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.progress-strip {
  display: flex;
  gap: 0.75rem;
}

.progress-pod,
.progress-total,
.progress-upload {
  flex: 1;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
}

.progress-label {
  display: block;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.05rem;
  color: var(--color-emerald, #06ffa5);
}

.progress-count.pending { color: var(--color-tungsten, var(--accent)); }

.vad-strip {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.vad-bar {
  height: 4px;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  transition: width 0.05s linear;
  min-width: 2px;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.vad-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
  margin-left: auto;
}

/* Take review bar */
.take-review {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-tungsten, var(--accent));
  border-radius: 12px;
  padding: 0.85rem 1rem;
  text-align: center;
}

.take-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-tungsten, var(--accent));
  margin-bottom: 0.6rem;
}

.take-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
}

.btn-take {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.65rem 1.1rem;
  cursor: pointer;
  min-height: 44px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper, var(--ink));
}

.btn-take.redo {
  border-color: var(--color-film-red, #e63946);
  color: var(--color-film-red, #e63946);
}

.btn-take.keep {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.take-hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--color-paper-dim, var(--muted));
}

/* Controls */
.dialogue-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.ctl-nav {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  font-size: 1.6rem;
  line-height: 1;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  cursor: pointer;
}

.ctl-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ctl-record {
  flex: 1;
  max-width: 280px;
  min-height: 56px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 28px;
  border: none;
  cursor: pointer;
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.ctl-record.live {
  background: var(--color-film-red, #e63946);
  color: var(--color-paper, var(--ink));
}

.btn-finish {
  align-self: center;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
  background: transparent;
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  padding: 0.6rem 1.3rem;
  cursor: pointer;
  min-height: 44px;
}

/* Phone-first */
/* Light mode: the default surface-3 borders (#e2e8f0) are nearly invisible
   on white cards over the slate canvas, and the raised stat tiles use --canvas
   as their fill so they vanish. Darken borders to --line (#cbd5e1, ~1.3:1 vs
   white = the most visible UI border the tokens offer) and add a soft shadow
   for card separation. Dark mode is untouched. */
[data-theme="light"] .studio-card,
[data-theme="light"] .progress-pod,
[data-theme="light"] .progress-total,
[data-theme="light"] .progress-upload,
[data-theme="light"] .vad-strip,
[data-theme="light"] .ctl-nav,
[data-theme="light"] .pod-breakdown,
[data-theme="light"] .sum-stat,
[data-theme="light"] .btn-ghost,
[data-theme="light"] .btn-finish,
[data-theme="light"] .btn-take {
  border-color: var(--line);
}

[data-theme="light"] .pod-breakdown li {
  border-bottom-color: var(--line);
}

[data-theme="light"] .studio-card,
[data-theme="light"] .progress-pod,
[data-theme="light"] .progress-total,
[data-theme="light"] .progress-upload {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

/* The stat tiles fill with --canvas (== page bg in light) so they don't read
   as raised. Lift them onto the raised input surface so the border + fill
   separate them from the white card behind. */
[data-theme="light"] .sum-stat {
  background: var(--surface-2);
}

@media (max-width: 480px) {
  .pod-dialogue-studio {
    padding: 0.5rem;
  }

  .progress-strip {
    gap: 0.5rem;
  }

  .progress-pod,
  .progress-total,
  .progress-upload {
    padding: 0.5rem 0.65rem;
  }

  .summary-stats {
    gap: 0.5rem;
  }

  .sum-stat {
    min-width: 72px;
    padding: 0.65rem 0.75rem;
  }
}
</style>
