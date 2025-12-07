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

    <!-- Phase: Role Selection -->
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
        <div class="pass-info">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ state.currentPass }}: {{ state.currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <span class="pass-progress">
          Phrase {{ state.currentPhraseIndex + 1 }} / {{ totalPhrases }}
        </span>
      </div>

      <!-- Teleprompter -->
      <TeleprompterDisplay
        :phrases="state.phrases"
        :current-index="state.currentPhraseIndex"
        :current-pass="state.currentPass"
        :is-recording="state.isRecording"
      />

      <!-- Controls -->
      <RecordingControls
        :is-recording="state.isRecording"
        :is-paused="state.isPaused"
        @toggle-recording="toggleRecording"
        @pause="togglePause"
        @previous="navigatePhrase(-1)"
        @next="navigatePhrase(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />
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
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAutocueState } from '@/composables/useAutocueState'

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
  selectMode,
  beginSession,
  toggleRecording,
  togglePause,
  navigatePhrase,
  adjustSpeed,
  approveSegment,
  rejectSegment,
  approveAllByConfidence,
  backToRecording,
  finalizeSession,
  loadCourse,
  cleanup
} = useAutocueState()

// Event handlers
function onModeSelect(mode) {
  selectMode(mode)
}

function onBeginSession({ role, language }) {
  beginSession(role, language)
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (state.currentPhase !== 'recording') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      toggleRecording()
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

/* Recording Phase */
.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
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
}
</style>
