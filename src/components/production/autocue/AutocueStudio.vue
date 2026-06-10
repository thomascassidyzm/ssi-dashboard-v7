<template>
  <div class="autocue-studio">
    <!-- Film grain overlay -->
    <div class="film-grain"></div>

    <!-- Header -->
    <header class="studio-header">
      <div class="studio-branding">
        <div class="studio-badge">🎙️</div>
        <div class="studio-meta">
          <h1>Autocue Studio</h1>
          <p class="session-info">{{ sessionInfo }}</p>
        </div>
      </div>

      <div class="session-stats" v-if="state.currentPhase !== 'mode-select'">
        <div class="stat-item">
          <span class="stat-value">{{ recordedCount }}</span>
          <span class="stat-label">Recorded</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalPhrases }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionPercent }}%</span>
          <span class="stat-label">Complete</span>
        </div>
        <div class="stat-item" v-if="state.scriptMode">
          <span class="stat-value">{{ uploadedCount }}</span>
          <span class="stat-label">Uploaded</span>
        </div>
      </div>

      <router-link to="/" class="back-link">← Back to Dashboard</router-link>
    </header>

    <!-- Recording Status (Fixed) -->
    <RecordingStatus :is-recording="state.isRecording" />

    <!-- Phase: Mode Selection -->
    <ModeSelector
      v-if="state.currentPhase === 'mode-select'"
      @select="onModeSelect"
    />

    <!-- Phase: Loading -->
    <div v-else-if="state.isLoading" class="loading-phase">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading recording script...</p>
    </div>

    <!-- Phase: Script Loaded Confirmation (new-course mode) -->
    <div v-else-if="state.currentPhase === 'script-loaded'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Recording Script Ready</h2>
        <div class="script-stats">
          <div class="script-stat">
            <span class="script-stat-value">{{ state.scriptInfo?.totalPhrases || 0 }}</span>
            <span class="script-stat-label">Phrases</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">{{ state.scriptInfo?.totalDirect || 0 }}</span>
            <span class="script-stat-label">Direct Items</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">{{ state.scriptInfo?.totalItems || 0 }}</span>
            <span class="script-stat-label">Total Items</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">~{{ state.scriptInfo?.estimatedMinutes || 0 }}</span>
            <span class="script-stat-label">Minutes</span>
          </div>
        </div>
        <p class="script-instructions">
          Each phrase appears twice: <strong>white text</strong> for natural speed,
          then <strong class="amber-text">amber text</strong> for slow reading.
          VAD will auto-detect pauses and advance automatically.
        </p>
        <div class="script-actions">
          <button class="btn-begin" @click="onBeginContinuous">Begin Recording</button>
          <button class="btn-cancel" @click="resetSession">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Phase: Role Selection (regeneration mode only) -->
    <RoleSelector
      v-else-if="state.currentPhase === 'role-select'"
      :course-name="state.courseName"
      :known-language="state.knownLanguage"
      :target-language="state.targetLanguage"
      :phrase-count="totalPhrases || 12"
      @begin="onBeginSession"
    />

    <!-- Phase: Recording -->
    <div v-else-if="state.currentPhase === 'recording'" class="recording-phase">
      <!-- Pass Indicator -->
      <div class="pass-indicator">
        <div class="pass-info" v-if="!state.scriptMode">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ state.currentPass }}: {{ state.currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <div class="pass-info" v-else>
          <span class="pass-label">Continuous Recording</span>
          <span class="pass-title">
            {{ currentPhrase?.cadence === 'slow' ? 'Slow Pass' : 'Natural Speed' }}
            — {{ currentPhrase?.type === 'direct' ? 'Direct Item' : 'Phrase' }}
          </span>
        </div>
        <span class="pass-progress">
          Item {{ state.currentPhraseIndex + 1 }} / {{ totalPhrases }}
        </span>
      </div>

      <!-- VAD Level Indicator (script mode) -->
      <div v-if="state.scriptMode && state.isRecording" class="vad-indicator">
        <div class="vad-bar" :style="{ width: `${vadLevel * 100}%` }"></div>
        <span class="vad-status">{{ isSpeaking ? 'Speaking...' : 'Listening...' }}</span>
      </div>

      <!-- Teleprompter -->
      <TeleprompterDisplay
        :phrases="state.phrases"
        :current-index="state.currentPhraseIndex"
        :current-pass="state.currentPass"
        :is-recording="state.isRecording"
        :script-mode="state.scriptMode"
        :uploaded-indices="uploadQueue.uploadedIndices"
      />

      <!-- Controls -->
      <RecordingControls
        :is-recording="state.isRecording"
        :is-paused="state.isPaused"
        @toggle-recording="onToggleRecording"
        @pause="togglePause"
        @previous="navigatePhrase(-1)"
        @next="navigatePhrase(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />

      <!-- Upload progress bar (script mode) -->
      <div v-if="state.scriptMode && uploadQueue.pendingCount.value > 0" class="upload-progress-bar">
        <span class="upload-label">Uploading: {{ uploadQueue.uploadedCount.value }} done, {{ uploadQueue.pendingCount.value }} pending</span>
      </div>
    </div>

    <!-- Phase: Session Summary (script mode) -->
    <div v-else-if="state.currentPhase === 'summary'" class="summary-phase">
      <div class="summary-card">
        <h2>Session Complete</h2>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-value">{{ recordedCount }}</span>
            <span class="summary-label">Items Recorded</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ totalPhrases }}</span>
            <span class="summary-label">Total Items</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uploadQueue.uploadedCount.value }}</span>
            <span class="summary-label">Uploaded</span>
          </div>
          <div class="summary-stat" v-if="uploadQueue.pendingCount.value > 0">
            <span class="summary-value pending">{{ uploadQueue.pendingCount.value }}</span>
            <span class="summary-label">Uploading...</span>
          </div>
          <div class="summary-stat" v-if="uploadQueue.failedIndices.size > 0">
            <span class="summary-value failed">{{ uploadQueue.failedIndices.size }}</span>
            <span class="summary-label">Failed</span>
          </div>
        </div>
        <div class="summary-time">
          <span>Session time: {{ formattedTime }}</span>
        </div>
        <div class="summary-actions">
          <button class="btn-review" @click="goToReview">Review Recordings</button>
          <button class="btn-done" @click="resetSession">Done</button>
        </div>
      </div>
    </div>

    <!-- Phase: Review -->
    <div v-else-if="state.currentPhase === 'review'" class="review-phase">
      <SessionReview
        :segments="state.recordedSegments"
        @approve="approveSegment"
        @reject="rejectSegment"
        @approve-all="approveAllByConfidence"
        @finalize="finalizeSession"
        @back="backToRecording"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAutocueState } from '@/composables/useAutocueState'
import { useContinuousRecorder } from '@/composables/useContinuousRecorder'
import { useUploadQueue } from '@/composables/useAudioUpload'

import ModeSelector from './ModeSelector.vue'
import RoleSelector from './RoleSelector.vue'
import TeleprompterDisplay from './teleprompter/TeleprompterDisplay.vue'
import RecordingControls from './recording/RecordingControls.vue'
import RecordingStatus from './recording/RecordingStatus.vue'
import SessionReview from './review/SessionReview.vue'

const route = useRoute()

// Use shared autocue state
const {
  state,
  totalPhrases,
  recordedCount,
  completionPercent,
  sessionInfo,
  formattedTime,
  selectMode,
  beginSession,
  beginContinuousSession,
  toggleRecording,
  startRecording,
  stopRecording,
  togglePause,
  navigatePhrase,
  adjustSpeed,
  onSegmentCaptured,
  advanceToNext,
  approveSegment,
  rejectSegment,
  approveAllByConfidence,
  backToRecording,
  finalizeSession,
  resetSession,
  loadCourse,
  cleanup
} = useAutocueState()

// Continuous recorder for script mode
const continuousRecorder = useContinuousRecorder({
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300,
  autoUpload: true,
  autoAdvance: true
})

const isSpeaking = continuousRecorder.isSpeaking
const vadLevel = continuousRecorder.currentLevel

// Background upload queue
const uploadQueue = useUploadQueue()
const uploadedCount = uploadQueue.uploadedCount

// Wire continuous recorder: on segment captured, store + queue upload + advance
continuousRecorder.onSegmentCaptured((segment) => {
  const itemIndex = state.currentPhraseIndex
  const phrase = state.phrases[itemIndex]
  if (!phrase) return

  // Store in state
  onSegmentCaptured(segment, itemIndex)

  // Queue background upload — script-mode takes carry the script's identity
  // (seedNumber/legoId/text); the server mints the audio uuid per take.
  uploadQueue.queueUpload({
    blob: segment.blob,
    courseCode: state.courseCode,
    uuid: null,
    metadata: {
      mode: 'script',
      role: 'target1',
      cadence: phrase.cadence,
      text: phrase.text,
      type: phrase.type,
      phraseIndex: phrase.phraseIndex,
      seedNumber: phrase.seedNumber ?? null,
      legoId: phrase.legoId || null,
      coversLegos: phrase.coversLegos,
      scriptSessionId: state.scriptSessionId
    },
    provenance: {
      recorded_by: 'autocue-studio',
      recorded_at: new Date().toISOString(),
      session_id: state.scriptSessionId,
      mode: 'continuous'
    },
    itemIndex
  })

  // Auto-advance to next item
  advanceToNext()
})

// Event handlers
function onModeSelect(mode) {
  selectMode(mode)
}

function onBeginSession({ role, language }) {
  beginSession(role, language)
}

async function onBeginContinuous() {
  beginContinuousSession()
}

async function onToggleRecording() {
  if (state.isRecording) {
    // Stop
    if (state.scriptMode) {
      continuousRecorder.stopFlow()
    }
    stopRecording()
  } else {
    // Start
    startRecording()
    if (state.scriptMode) {
      try {
        await continuousRecorder.startFlow()
      } catch (err) {
        console.error('[Autocue] Failed to start continuous recorder:', err)
        state.error = err.message
        stopRecording()
      }
    }
  }
}

function goToReview() {
  // Generate segments for review from script mode recordings
  state.currentPhase = 'review'
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (state.currentPhase !== 'recording') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      onToggleRecording()
      break
    case 'ArrowLeft':
      e.preventDefault()
      navigatePhrase(-1)
      break
    case 'ArrowRight':
      e.preventDefault()
      navigatePhrase(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      adjustSpeed(-1)
      break
    case 'ArrowDown':
      e.preventDefault()
      adjustSpeed(1)
      break
    case 'p':
    case 'P':
      togglePause()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)

  // Load course data if available from route
  const courseCode = route.params.courseCode
  if (courseCode) {
    loadCourse(courseCode)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (continuousRecorder.isFlowMode.value) {
    continuousRecorder.stopFlow()
  }
  uploadQueue.resetQueue()
  cleanup()
})
</script>

<style scoped>
.autocue-studio {
  min-height: 100vh;
  background: var(--color-void, #0f172a);
  padding: 2rem;
  position: relative;

  /* CSS Variables for the cinematic theme */
  --color-void: #0f172a;
  --color-shadow: #1e293b;
  --color-slate: #334155;
  --color-graphite: #475569;
  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;
  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;
}

/* Film grain overlay */
.film-grain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
  animation: grainShift 8s steps(10) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -5%); }
  20% { transform: translate(-10%, 5%); }
  30% { transform: translate(5%, -10%); }
  40% { transform: translate(-5%, 10%); }
  50% { transform: translate(10%, 5%); }
  60% { transform: translate(5%, -5%); }
  70% { transform: translate(-10%, -10%); }
  80% { transform: translate(10%, 10%); }
  90% { transform: translate(-5%, 0); }
}

/* Header */
.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite);
  position: relative;
  z-index: 1;
}

.studio-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.studio-badge {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-film-red), #c4313d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 0 40px rgba(230, 57, 70, 0.4);
  position: relative;
}

.studio-badge::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-film-red);
  border-radius: 50%;
  opacity: 0.3;
  animation: badgePulse 3s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0; }
}

.studio-meta h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.session-info {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
  color: var(--color-paper-dim);
  margin: 0;
}

.session-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 1.25rem;
  background: var(--color-shadow);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 500;
  color: var(--color-emerald);
  display: block;
  line-height: 1;
  text-shadow: 0 0 20px rgba(6, 255, 165, 0.5);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
  display: block;
}

.back-link {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--color-emerald);
  text-decoration: none;
  transition: all 0.3s ease;
}

.back-link:hover {
  color: var(--color-tungsten);
  text-decoration: underline;
}

/* Loading Phase */
.loading-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  position: relative;
  z-index: 1;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-graphite);
  border-top-color: var(--color-tungsten);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-family: 'IBM Plex Mono', monospace;
  color: var(--color-paper-dim);
  margin-top: 1.5rem;
}

/* Script Loaded Phase */
.script-loaded-phase {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.script-summary {
  max-width: 600px;
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
}

.script-summary h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  color: var(--color-paper);
  margin: 0 0 2rem 0;
}

.script-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.script-stat {
  text-align: center;
  padding: 1rem;
  background: var(--color-void);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
  min-width: 80px;
}

.script-stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-emerald);
  display: block;
}

.script-stat-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.script-instructions {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.amber-text {
  color: var(--color-tungsten);
}

.script-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-begin {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-void);
  background: var(--color-emerald);
  border: none;
  border-radius: 8px;
  padding: 0.85rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-begin:hover {
  background: #00e693;
  box-shadow: 0 0 20px rgba(6, 255, 165, 0.4);
}

.btn-cancel {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-paper-dim);
  background: transparent;
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
  padding: 0.85rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  border-color: var(--color-paper-dim);
  color: var(--color-paper);
}

/* Pass Indicator */
.pass-indicator {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pass-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
}

.pass-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-tungsten);
}

.pass-progress {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  color: var(--color-emerald);
}

/* VAD Indicator */
.vad-indicator {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  position: relative;
}

.vad-bar {
  height: 4px;
  background: var(--color-emerald);
  border-radius: 2px;
  transition: width 0.05s linear;
  min-width: 2px;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.vad-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim);
  white-space: nowrap;
}

/* Upload Progress Bar */
.upload-progress-bar {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
  text-align: center;
}

.upload-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim);
}

/* Recording Phase */
.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Summary Phase */
.summary-phase {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.summary-card {
  max-width: 600px;
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
}

.summary-card h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  color: var(--color-emerald);
  margin: 0 0 2rem 0;
}

.summary-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.summary-stat {
  text-align: center;
  padding: 1rem;
  background: var(--color-void);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
  min-width: 80px;
}

.summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-emerald);
  display: block;
}

.summary-value.pending {
  color: var(--color-tungsten);
}

.summary-value.failed {
  color: var(--color-film-red);
}

.summary-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.summary-time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
  color: var(--color-paper-dim);
  margin-bottom: 2rem;
}

.summary-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-review {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-void);
  background: var(--color-tungsten);
  border: none;
  border-radius: 8px;
  padding: 0.85rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-review:hover {
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.4);
}

.btn-done {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-void);
  background: var(--color-emerald);
  border: none;
  border-radius: 8px;
  padding: 0.85rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-done:hover {
  box-shadow: 0 0 20px rgba(6, 255, 165, 0.4);
}

/* Review Phase */
.review-phase {
  position: relative;
  z-index: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .studio-header {
    flex-direction: column;
    gap: 1rem;
  }

  .session-stats {
    width: 100%;
    justify-content: space-around;
  }

  .back-link {
    position: absolute;
    top: 0;
    right: 0;
  }

  .script-stats,
  .summary-stats {
    flex-wrap: wrap;
  }
}
</style>
