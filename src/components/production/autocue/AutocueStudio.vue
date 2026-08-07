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
    <div v-if="state.currentPhase === 'mode-select'">
      <!-- Script loading failures used to reset the phase silently, so the
           mode buttons just looked dead. Say what went wrong. -->
      <div v-if="state.error" class="mode-error">{{ state.error }}</div>
      <ModeSelector @select="onModeSelect" />
    </div>

    <!-- Phase: Loading -->
    <div v-else-if="state.currentPhase === 'loading' || state.isLoading" class="loading-phase">
      <div class="loading-spinner"></div>
      <p class="loading-text">
        Building recording script<span v-if="state.maxSeed"> for seeds 1–{{ state.maxSeed }}</span>…
      </p>
    </div>

    <!-- Phase: Script Loaded Confirmation (new-course mode) -->
    <div v-else-if="state.currentPhase === 'script-loaded'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Recording Script Ready</h2>
        <p v-if="state.scriptInfo?.maxSeed" class="script-cap-note">
          Limited to seeds 1–{{ state.scriptInfo.maxSeed }} of the course.
        </p>
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
      @back="resetSession"
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
        <div class="vad-bar" :style="{ width: `${vadMeterPercent}%` }"></div>
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

      <!-- Failed takes, DURING the session. Waiting for the summary screen means a
           recordist can talk through a whole script with a dead mic and only find
           out at the end — the takes were never saved and there is nothing to retry. -->
      <div v-if="state.scriptMode && uploadQueue.failedIndices.size > 0" class="upload-failed-bar">
        <span class="failed-count">{{ uploadQueue.failedIndices.size }} NOT saved</span>
        <span class="failed-reason">{{ latestFailureReason }}</span>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

// Recording identity, threaded in by the Record Room shell. Left at defaults
// when mounted from the production console (/production/:courseCode/recording),
// where the session falls back to the explicit target1 default.
const props = defineProps({
  recordSlot: { type: String, default: null }, // 'known' | 'target1' | 'target2' | 'presentation'
  voiceId: { type: String, default: null }     // human voice id from courses.voice_config
})

const route = useRoute()

// Use shared autocue state
const {
  state,
  totalPhrases,
  recordedCount,
  completionPercent,
  sessionInfo,
  formattedTime,
  setRecordingIdentity,
  setMaxSeed,
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

// vadLevel is a time-domain RMS, so speech measures ~0.2-0.4 and would only
// ever paint a third of the bar. Scale it for the meter (the DECISION still uses
// the raw value against silenceThreshold — see useVAD.ts). x3 puts the 0.02
// silence threshold at a visible 6% and normal speech near full.
const vadMeterPercent = computed(() => Math.min(100, Math.round(vadLevel.value * 300)))

// Background upload queue
const uploadQueue = useUploadQueue()
const uploadedCount = uploadQueue.uploadedCount

// The server's own words for the most recent take it refused (e.g. "no audible
// speech"), so the in-session failure bar says WHY, not just how many.
const latestFailureReason = computed(() => {
  let latest = null
  for (const idx of uploadQueue.failedIndices) {
    if (latest === null || idx > latest) latest = idx
  }
  return latest === null ? '' : (uploadQueue.failedReasons.get(latest) || 'Upload failed')
})

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
      role: state.selectedRole || 'target1',
      voiceId: state.voiceId || null,
      cadence: phrase.cadence,
      text: phrase.text,
      type: phrase.type,
      phraseIndex: phrase.phraseIndex,
      seedNumber: phrase.seedNumber ?? null,
      legoId: phrase.legoId || null,
      coversLegos: phrase.coversLegos,
      // Pipe-delimited pause map — the aligner's required input; persisted
      // server-side with the take so slow passes stay alignable.
      chunksString: phrase.chunksString || null,
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
function onModeSelect(mode, opts = {}) {
  // Re-establish the cap on every choice rather than relying on the value set
  // at mount: resetSession() clears it (singleton hygiene), so a recorder who
  // backs out of a session and picks again would otherwise silently lose the
  // link's ?maxSeed and start an uncapped run. An explicit opts.maxSeed (the
  // test-batch button) wins over the link.
  setMaxSeed(opts.maxSeed ?? route.query.maxSeed)
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

  // Autocue state is a module-level singleton (shared across mounts), so a
  // mode/role picked in a previous visit otherwise leaks into this one and
  // strands the learner on role-select/script-loaded with no way back to
  // the chooser. Every fresh mount re-enters at the chooser.
  resetSession()

  // Bind (or clear) the session's voice-slot identity on every mount so a
  // Record Room session never leaks into a production-console session.
  setRecordingIdentity({ role: props.recordSlot, voiceId: props.voiceId })

  // ?maxSeed=N on the recorder link caps the script to seeds 1..N — used to
  // hand a tester a short, listenable session instead of the whole course.
  // Set after resetSession() so it survives the mount-time reset.
  setMaxSeed(route.query.maxSeed)

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
  background: var(--color-void, var(--canvas));
  padding: 2rem;
  position: relative;

  /* CSS Variables for the cinematic theme */
  --color-void: var(--canvas);
  --color-shadow: var(--surface);
  --color-slate: var(--surface-2);
  --color-graphite: var(--surface-3);
  --color-film-red: #e63946;
  --color-tungsten: var(--accent);
  --color-emerald: #06ffa5;
  --color-paper: var(--ink);
  --color-paper-dim: var(--muted);
}

/*
 * Light-mode legibility: the cinematic palette uses two hardcoded neon
 * literals (emerald #06ffa5, film-red #e63946) that are unreadable on the
 * light canvas/surface, and remaps borders to --surface-3 (too faint on
 * white). Re-point these to the theme's accent-2/danger/line ONLY in light
 * mode so dark mode keeps its neon identity untouched.
 */
:root[data-theme="light"] .autocue-studio {
  --color-emerald: var(--accent-2);
  --color-film-red: var(--danger);
  --color-graphite: var(--line);
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

/* Surfaces a script-load failure above the mode buttons, which otherwise
   just look unresponsive. */
.mode-error {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  padding: 0.875rem 1.25rem;
  border: 1px solid var(--color-film-red);
  border-radius: 8px;
  background: var(--color-shadow);
  color: var(--color-film-red);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.script-cap-note {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: var(--color-paper-dim);
  margin: -1.25rem 0 1.75rem 0;
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

.upload-failed-bar {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid #dc2626;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.failed-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fca5a5;
}

.failed-reason {
  font-size: 0.7rem;
  color: #fca5a5;
  line-height: 1.3;
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
    /* Four stat tiles at 1.25rem side padding and a 2rem number measure 493px;
       without wrapping they widened the studio to 549px on a 390px phone and
       the whole recording screen scrolled sideways. */
    flex-wrap: wrap;
    gap: 0.5rem;
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

/* Phone. Kai records standing, holding the phone — nothing here may need a
   sideways scroll to reach. */
@media (max-width: 480px) {
  .autocue-studio {
    padding: 1rem 0.75rem;
  }

  .stat-item {
    padding: 0.5rem 0.75rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .stat-value {
    font-size: 1.35rem;
  }
}
</style>
