<template>
  <div class="audio-preview-player" :class="{ 'is-playing': isPlaying }">
    <!-- Phase indicator dots -->
    <div class="phase-dots">
      <div
        v-for="(phase, i) in phases"
        :key="phase.id"
        class="phase-dot"
        :class="{
          active: currentPhase === phase.id,
          completed: phaseIndex > i
        }"
      >
        <span class="phase-label">{{ phase.label }}</span>
      </div>
    </div>

    <!-- Content display -->
    <div class="content-area">
      <!-- Known text (always visible) -->
      <div class="text-block known-text">
        <div class="language-badge known">Known</div>
        <p class="primary-text">{{ knownText }}</p>
      </div>

      <!-- Target text (only visible in VOICE_2) -->
      <div class="text-block target-text" :class="{ revealed: currentPhase === 'voice2' }">
        <div class="language-badge target">Target</div>
        <p class="primary-text" v-if="currentPhase === 'voice2'" :dir="dirFor(targetText)">{{ targetText }}</p>
        <div v-else class="blur-placeholder">
          <span v-for="i in 5" :key="i" class="blur-bar"></span>
        </div>
      </div>

      <!-- Ring progress during PAUSE -->
      <div v-if="currentPhase === 'pause'" class="ring-container">
        <svg class="ring-svg" viewBox="0 0 128 128">
          <circle
            class="ring-bg"
            cx="64" cy="64" r="56"
          />
          <circle
            class="ring-progress"
            cx="64" cy="64" r="56"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="circumference * (1 - pauseProgress)"
          />
        </svg>
        <div class="ring-label">Think...</div>
      </div>

      <!-- Phase status indicator -->
      <div class="phase-status">
        <span v-if="currentPhase === 'prompt'" class="status-text">Playing prompt...</span>
        <span v-else-if="currentPhase === 'pause'" class="status-text">Your turn to speak</span>
        <span v-else-if="currentPhase === 'voice1'" class="status-text">Listen (voice 1)...</span>
        <span v-else-if="currentPhase === 'voice2'" class="status-text">Listen (voice 2)...</span>
        <span v-else class="status-text">Ready</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="play-btn" @click="togglePlay" :disabled="loading || !hasAudio">
        <span v-if="loading" class="loading-spinner"></span>
        <svg v-else-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>

    <!-- Audio status -->
    <div class="audio-status">
      <span v-if="!hasAudio" class="no-audio">No audio available for this phrase</span>
      <span v-else-if="audioError" class="audio-error">{{ audioError }}</span>
    </div>

    <!-- Hidden audio elements (reuse single element for mobile) -->
    <audio ref="audioElement" @ended="onAudioEnded" @error="onAudioError" @loadedmetadata="onAudioLoaded"></audio>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import api from '@/services/api'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  knownText: {
    type: String,
    required: true
  },
  targetText: {
    type: String,
    required: true
  },
  // Course code for audio lookup
  courseCode: {
    type: String,
    default: null
  },
  // Audio UUIDs - if provided directly
  sourceId: {
    type: String,
    default: null
  },
  target1Id: {
    type: String,
    default: null
  },
  target2Id: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'cycle-complete'])

// State
const isPlaying = ref(false)
const loading = ref(false)
const currentPhase = ref(null)
const pauseProgress = ref(0)
const audioError = ref(null)
const targetAudioDuration = ref(3000) // Default 3s, updated when audio loads

// Audio element ref
const audioElement = ref(null)

// Timers
let pauseTimer = null
let pauseProgressInterval = null

// Phase definitions
const phases = [
  { id: 'prompt', label: 'Prompt' },
  { id: 'pause', label: 'Think' },
  { id: 'voice1', label: 'Listen' },
  { id: 'voice2', label: 'Reveal' }
]

// Ring progress calculation
const circumference = 2 * Math.PI * 56 // r=56

const phaseIndex = computed(() => {
  return phases.findIndex(p => p.id === currentPhase.value)
})

// Audio UUIDs (loaded from API or props)
const audioIds = ref({
  sourceId: props.sourceId || null,
  target1Id: props.target1Id || null,
  target2Id: props.target2Id || null
})

// Resolve audio URLs from UUIDs
const resolvedAudioUrls = computed(() => {
  const ids = audioIds.value
  return {
    source: ids.sourceId ? api.getAudioStreamUrl(ids.sourceId) : null,
    target1: ids.target1Id ? api.getAudioStreamUrl(ids.target1Id) : null,
    target2: ids.target2Id ? api.getAudioStreamUrl(ids.target2Id) : api.getAudioStreamUrl(ids.target1Id)
  }
})

const hasAudio = computed(() => {
  const ids = audioIds.value
  return ids.sourceId && ids.target1Id
})

// Load audio IDs from API if courseCode provided but no direct IDs
async function loadAudioIds() {
  if (props.sourceId && props.target1Id) {
    // Already have IDs from props
    audioIds.value = {
      sourceId: props.sourceId,
      target1Id: props.target1Id,
      target2Id: props.target2Id || props.target1Id
    }
    return
  }

  if (!props.courseCode) {
    console.warn('[AudioPreviewPlayer] No courseCode provided for audio lookup')
    return
  }

  loading.value = true
  try {
    const response = await api.lookupAudio(props.courseCode, props.knownText, props.targetText)
    if (response.success && response.audio) {
      audioIds.value = {
        sourceId: response.audio.sourceId,
        target1Id: response.audio.target1Id,
        target2Id: response.audio.target2Id || response.audio.target1Id
      }
    }
  } catch (err) {
    console.error('[AudioPreviewPlayer] Failed to lookup audio:', err)
    audioError.value = 'Failed to lookup audio'
  } finally {
    loading.value = false
  }
}

// Toggle play/stop
function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startCycle()
  }
}

// Start the 4-phase cycle
async function startCycle() {
  if (!hasAudio.value) return

  isPlaying.value = true
  audioError.value = null

  // Phase 1: PROMPT
  currentPhase.value = 'prompt'
  await playAudio(resolvedAudioUrls.value.source)
}

// Play audio and wait for it to end
function playAudio(url) {
  return new Promise((resolve) => {
    if (!audioElement.value || !url) {
      resolve()
      return
    }

    const onEnded = () => {
      audioElement.value.removeEventListener('ended', onEnded)
      audioElement.value.removeEventListener('error', onError)
      resolve()
    }

    const onError = (e) => {
      console.error('Audio error:', e)
      audioElement.value.removeEventListener('ended', onEnded)
      audioElement.value.removeEventListener('error', onError)
      resolve()
    }

    audioElement.value.addEventListener('ended', onEnded)
    audioElement.value.addEventListener('error', onError)

    audioElement.value.src = url
    audioElement.value.load()
    audioElement.value.play().catch(err => {
      console.error('Play failed:', err)
      resolve()
    })
  })
}

// Handle audio ended event (used for phase transitions)
function onAudioEnded() {
  if (!isPlaying.value) return

  switch (currentPhase.value) {
    case 'prompt':
      // Move to PAUSE
      currentPhase.value = 'pause'
      startPauseTimer()
      break

    case 'voice1':
      // Move to VOICE_2
      currentPhase.value = 'voice2'
      playAudio(resolvedAudioUrls.value.target2)
      break

    case 'voice2':
      // Cycle complete
      isPlaying.value = false
      currentPhase.value = null
      emit('cycle-complete')
      break
  }
}

// Start pause timer with progress updates
function startPauseTimer() {
  const pauseDuration = targetAudioDuration.value * 2 // 2x target audio length
  const startTime = Date.now()
  pauseProgress.value = 0

  pauseProgressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    pauseProgress.value = Math.min(elapsed / pauseDuration, 1)
  }, 50)

  pauseTimer = setTimeout(() => {
    clearInterval(pauseProgressInterval)
    pauseProgress.value = 1

    if (isPlaying.value) {
      // Move to VOICE_1
      currentPhase.value = 'voice1'
      playAudio(resolvedAudioUrls.value.target1)
    }
  }, pauseDuration)
}

// Handle audio load to get duration
function onAudioLoaded() {
  if (audioElement.value && audioElement.value.duration) {
    // Store duration for pause calculation (convert to ms)
    if (currentPhase.value === 'prompt') {
      // We want target duration, so we'll update when target loads
    } else if (currentPhase.value === 'voice1') {
      targetAudioDuration.value = audioElement.value.duration * 1000
    }
  }
}

// Stop everything
function stopPlayback() {
  isPlaying.value = false
  currentPhase.value = null
  pauseProgress.value = 0

  if (pauseTimer) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }
  if (pauseProgressInterval) {
    clearInterval(pauseProgressInterval)
    pauseProgressInterval = null
  }

  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
  }
}

function onAudioError(e) {
  audioError.value = 'Failed to load audio'
  stopPlayback()
}

// Load audio IDs and preload on mount
onMounted(async () => {
  await loadAudioIds()

  // Preload target audio to get duration
  if (resolvedAudioUrls.value.target1) {
    try {
      const tempAudio = new Audio()
      tempAudio.src = resolvedAudioUrls.value.target1
      tempAudio.addEventListener('loadedmetadata', () => {
        targetAudioDuration.value = tempAudio.duration * 1000
      })
      tempAudio.load()
    } catch (e) {
      // Ignore preload errors
    }
  }
})

// Cleanup
onUnmounted(() => {
  stopPlayback()
})

// Watch for prop changes and reload audio
watch(() => props.knownText + props.targetText, async () => {
  stopPlayback()
  await loadAudioIds()
})
</script>

<style scoped>
.audio-preview-player {
  --accent: #10b981;
  --accent-glow: rgba(16, 185, 129, 0.3);
  --bg: var(--surface);
  --bg-elevated: var(--surface-2);
  --text: var(--ink);
  --text-muted: var(--muted);
  --known-color: #a78bfa;
  --target-color: var(--accent-2);

  background: var(--bg);
  border-radius: 0 0 12px 12px;
  padding: 20px;
  max-width: 440px;
  margin: 0 auto;
}

/* Phase dots */
.phase-dots {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
  padding: 0 10px;
}

.phase-dots::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 10px;
  right: 10px;
  height: 2px;
  background: var(--bg-elevated);
  transform: translateY(-50%);
  z-index: 0;
}

.phase-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--bg-elevated);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.phase-dot.active {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
  transform: scale(1.3);
}

.phase-dot.completed {
  background: var(--accent);
  border-color: var(--accent);
}

.phase-label {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}

.phase-dot.active .phase-label {
  color: var(--accent);
}

/* Content area */
.content-area {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.text-block {
  background: var(--bg-elevated);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--line);
}

.language-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.language-badge.known {
  background: rgba(167, 139, 250, 0.2);
  color: var(--known-color);
}

.language-badge.target {
  background: rgba(52, 211, 153, 0.2);
  color: var(--target-color);
}

.primary-text {
  font-size: 16px;
  color: var(--text);
  line-height: 1.4;
  margin: 0;
  /* Pinned, not inherited: the target line binds `dir` so its punctuation
     resolves correctly, and dir="rtl" would otherwise right-align it away from
     the "Target" badge above. Direction is the fix; alignment stays put. */
  text-align: left;
}

/* Blur placeholder for hidden target */
.blur-placeholder {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.blur-bar {
  height: 20px;
  background: linear-gradient(90deg, var(--bg) 0%, var(--bg-elevated) 100%);
  border-radius: 4px;
  animation: shimmer 2s ease-in-out infinite;
}

.blur-bar:nth-child(1) { width: 60px; }
.blur-bar:nth-child(2) { width: 45px; animation-delay: 0.1s; }
.blur-bar:nth-child(3) { width: 70px; animation-delay: 0.2s; }
.blur-bar:nth-child(4) { width: 50px; animation-delay: 0.3s; }
.blur-bar:nth-child(5) { width: 40px; animation-delay: 0.4s; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.target-text.revealed .primary-text {
  animation: revealText 0.4s ease-out;
}

@keyframes revealText {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ring progress */
.ring-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

.ring-svg {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: var(--bg-elevated);
  stroke-width: 6;
}

.ring-progress {
  fill: none;
  stroke: var(--accent);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 50ms linear;
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.ring-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

/* Phase status */
.phase-status {
  text-align: center;
}

.status-text {
  font-size: 12px;
  color: var(--text-muted);
}

/* Controls */
.controls {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.play-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 20px var(--accent-glow);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn svg {
  width: 28px;
  height: 28px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Audio status */
.audio-status {
  text-align: center;
  font-size: 11px;
  min-height: 16px;
}

.no-audio {
  color: #fbbf24;
}

.audio-error {
  color: #f87171;
}

/* Light-mode-only contrast fixes (dark mode untouched) */
:root[data-theme="light"] .language-badge.known {
  background: rgba(124, 58, 237, 0.14);
  color: #6d28d9;
}

:root[data-theme="light"] .language-badge.target {
  background: rgba(4, 120, 87, 0.14);
  color: var(--accent-2);
}

:root[data-theme="light"] .no-audio {
  color: #b45309;
}

:root[data-theme="light"] .audio-error {
  color: var(--danger);
}
</style>
