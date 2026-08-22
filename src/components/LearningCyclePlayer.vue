<template>
  <div class="learning-cycle-player" :class="{ 'is-playing': isPlaying }">
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <button
        :class="{ active: mode === 'presentation' }"
        @click="mode = 'presentation'"
      >
        <span class="mode-icon">📖</span>
        Presentations
      </button>
      <button
        :class="{ active: mode === 'cycle' }"
        @click="mode = 'cycle'"
      >
        <span class="mode-icon">🔄</span>
        Prompt/Response
      </button>
    </div>

    <!-- Main Player Area -->
    <div class="player-stage">
      <!-- Presentation Mode -->
      <div v-if="mode === 'presentation'" class="presentation-view">
        <div class="presentation-visual">
          <div class="sound-wave" :class="{ animating: isPlaying && currentPhase === 'presentation' }">
            <span v-for="i in 5" :key="i" class="wave-bar"></span>
          </div>
          <div class="presentation-label">Introduction</div>
        </div>
        <p class="presentation-text" v-if="showPresentationText">{{ currentSample?.text }}</p>
      </div>

      <!-- Cycle Mode -->
      <div v-else class="cycle-view">
        <!-- Phase Indicator -->
        <div class="phase-track">
          <div
            v-for="phase in cyclePhases"
            :key="phase.id"
            class="phase-dot"
            :class="{
              active: currentPhase === phase.id,
              completed: phaseIndex > cyclePhases.findIndex(p => p.id === phase.id)
            }"
          >
            <span class="phase-label">{{ phase.label }}</span>
          </div>
          <div class="phase-progress" :style="{ width: progressWidth }"></div>
        </div>

        <!-- Content Display -->
        <div class="cycle-content">
          <!-- Source/Prompt Phase -->
          <Transition name="fade-up">
            <div v-if="currentPhase === 'source'" class="content-block source-block">
              <div class="language-badge known">Known</div>
              <p class="primary-text">{{ currentCycle?.sourceText }}</p>
              <div class="audio-indicator" :class="{ active: isPlaying }">
                <span class="pulse"></span>
              </div>
            </div>
          </Transition>

          <!-- Pause Phase -->
          <Transition name="fade">
            <div v-if="currentPhase === 'pause'" class="content-block pause-block">
              <div class="pause-visual">
                <div class="thinking-dots">
                  <span></span><span></span><span></span>
                </div>
                <p class="pause-hint">Think of the response...</p>
              </div>
            </div>
          </Transition>

          <!-- Target 1 Phase -->
          <Transition name="fade-up">
            <div v-if="currentPhase === 'target1'" class="content-block target1-block">
              <div class="language-badge target">Target</div>
              <div class="hidden-text-visual">
                <div class="blur-bars">
                  <span v-for="i in 8" :key="i"></span>
                </div>
                <p class="hint-text">Listen carefully...</p>
              </div>
              <div class="audio-indicator" :class="{ active: isPlaying }">
                <span class="pulse"></span>
              </div>
            </div>
          </Transition>

          <!-- Target 2 Phase -->
          <Transition name="fade-up">
            <div v-if="currentPhase === 'target2'" class="content-block target2-block">
              <div class="language-badge target reveal">Target</div>
              <!-- The reveal is the one place a learner READS the target
                   sentence, so it is the place the misplaced `!` was most
                   visible. `.content-block` centres its text, so binding `dir`
                   changes ordering only — no alignment shift. -->
              <p class="primary-text reveal-text" :dir="dirFor(currentCycle?.targetText)">{{ currentCycle?.targetText }}</p>
              <div class="audio-indicator" :class="{ active: isPlaying }">
                <span class="pulse"></span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="player-controls">
      <button class="control-btn skip-btn" @click="loadPrevious" :disabled="!hasPrevious">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>

      <button class="control-btn play-btn" @click="togglePlay" :disabled="loading">
        <span v-if="loading" class="loading-spinner"></span>
        <svg v-else-if="isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>

      <button class="control-btn skip-btn" @click="loadNext">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
    </div>

    <!-- Pause Duration Slider (Cycle Mode Only) -->
    <div v-if="mode === 'cycle'" class="pause-slider">
      <label>
        <span class="slider-label">Pause: {{ pauseDuration }}s</span>
        <input
          type="range"
          v-model.number="pauseDuration"
          min="0"
          max="5"
          step="0.5"
        />
      </label>
    </div>

    <!-- Sample Info -->
    <div class="sample-info">
      <span class="sample-id">{{ currentCycle?.id || currentSample?.id || '—' }}</span>
      <button class="flag-btn" @click="flagCurrent" title="Flag for review">
        🚩
      </button>
    </div>

    <!-- Hidden Audio Elements -->
    <audio ref="audioSource" @ended="onAudioEnded" @error="onAudioError"></audio>
    <audio ref="audioTarget1" @ended="onAudioEnded" @error="onAudioError"></audio>
    <audio ref="audioTarget2" @ended="onAudioEnded" @error="onAudioError"></audio>
    <audio ref="audioPresentation" @ended="onAudioEnded" @error="onAudioError"></audio>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import api from '../services/api.js'
import { dirFor } from '../utils/textDirection.js'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  targetItem: {
    type: Object,
    default: null
    // { sourceText, targetText, sourceId, target1Id, target2Id }
  }
})

const emit = defineEmits(['flag'])

// State
const mode = ref('cycle') // 'presentation' or 'cycle'
const isPlaying = ref(false)
const loading = ref(false)
const currentPhase = ref(null) // 'source', 'pause', 'target1', 'target2', 'presentation'
const pauseDuration = ref(1.5)
const showPresentationText = ref(false)

// Current content
const currentCycle = ref(null)
const currentSample = ref(null)
const history = ref([])
const historyIndex = ref(-1)

// Audio refs
const audioSource = ref(null)
const audioTarget1 = ref(null)
const audioTarget2 = ref(null)
const audioPresentation = ref(null)

// Timers
let pauseTimer = null

// Cycle phases config
const cyclePhases = [
  { id: 'source', label: 'Prompt' },
  { id: 'pause', label: 'Think' },
  { id: 'target1', label: 'Listen' },
  { id: 'target2', label: 'Reveal' }
]

const phaseIndex = computed(() => {
  return cyclePhases.findIndex(p => p.id === currentPhase.value)
})

const progressWidth = computed(() => {
  if (phaseIndex.value < 0) return '0%'
  return `${((phaseIndex.value + 1) / cyclePhases.length) * 100}%`
})

const hasPrevious = computed(() => historyIndex.value > 0)

// Load a random learning cycle
async function loadRandomCycle() {
  loading.value = true
  try {
    // If targetItem is provided, use it directly
    if (props.targetItem) {
      currentCycle.value = {
        id: props.targetItem.sourceId || 'preview',
        sourceText: props.targetItem.sourceText,
        targetText: props.targetItem.targetText,
        sourceId: props.targetItem.sourceId,
        target1Id: props.targetItem.target1Id,
        target2Id: props.targetItem.target2Id
      }

      // Calculate dynamic pause duration based on target1 audio duration
      if (props.targetItem.target1Id) {
        try {
          const audioElement = new Audio(api.getAudioStreamUrl(props.targetItem.target1Id))
          audioElement.addEventListener('loadedmetadata', () => {
            // Set pause to 2x the audio duration
            pauseDuration.value = Math.min(Math.max(audioElement.duration * 2, 1), 5)
          })
        } catch (err) {
          console.warn('Could not calculate dynamic pause duration:', err)
        }
      }

      // Add to history
      history.value.push(currentCycle.value)
      historyIndex.value = history.value.length - 1

      // Preload audio
      preloadCycleAudio(currentCycle.value)
    } else {
      // Fetch source, target1, target2 samples that share the same text pattern
      const response = await api.getRandomLearningCycle(props.courseCode)
      if (response.success && response.cycle) {
        currentCycle.value = response.cycle

        // Add to history
        history.value.push(response.cycle)
        historyIndex.value = history.value.length - 1

        // Preload audio
        preloadCycleAudio(response.cycle)
      }
    }
  } catch (err) {
    console.error('Failed to load learning cycle:', err)
  } finally {
    loading.value = false
  }
}

// Load random presentation
async function loadRandomPresentation() {
  loading.value = true
  try {
    const response = await api.getRandomAudioSample(props.courseCode, 'presentation')
    if (response.success && response.sample) {
      currentSample.value = response.sample

      // Preload audio
      if (audioPresentation.value) {
        audioPresentation.value.src = api.getAudioStreamUrl(response.sample.id)
      }
    }
  } catch (err) {
    console.error('Failed to load presentation:', err)
  } finally {
    loading.value = false
  }
}

function preloadCycleAudio(cycle) {
  if (audioSource.value && cycle.sourceId) {
    audioSource.value.src = api.getAudioStreamUrl(cycle.sourceId)
  }
  if (audioTarget1.value && cycle.target1Id) {
    audioTarget1.value.src = api.getAudioStreamUrl(cycle.target1Id)
  }
  if (audioTarget2.value && cycle.target2Id) {
    audioTarget2.value.src = api.getAudioStreamUrl(cycle.target2Id)
  }
}

// Play control
async function togglePlay() {
  if (isPlaying.value) {
    stopPlayback()
    return
  }

  if (mode.value === 'presentation') {
    if (!currentSample.value) {
      await loadRandomPresentation()
    }
    playPresentation()
  } else {
    if (!currentCycle.value) {
      await loadRandomCycle()
    }
    playCycle()
  }
}

function stopPlayback() {
  isPlaying.value = false
  currentPhase.value = null

  if (pauseTimer) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }

  audioSource.value?.pause()
  audioTarget1.value?.pause()
  audioTarget2.value?.pause()
  audioPresentation.value?.pause()
}

function playPresentation() {
  isPlaying.value = true
  currentPhase.value = 'presentation'
  audioPresentation.value?.play()
}

function playCycle() {
  isPlaying.value = true
  currentPhase.value = 'source'
  audioSource.value?.play()
}

function onAudioEnded() {
  if (!isPlaying.value) return

  if (mode.value === 'presentation') {
    // Presentation finished
    isPlaying.value = false
    currentPhase.value = null
    return
  }

  // Cycle mode - advance to next phase
  switch (currentPhase.value) {
    case 'source':
      currentPhase.value = 'pause'
      pauseTimer = setTimeout(() => {
        if (isPlaying.value) {
          currentPhase.value = 'target1'
          audioTarget1.value?.play()
        }
      }, pauseDuration.value * 1000)
      break

    case 'target1':
      currentPhase.value = 'target2'
      audioTarget2.value?.play()
      break

    case 'target2':
      // Cycle complete
      isPlaying.value = false
      currentPhase.value = null
      break
  }
}

function onAudioError(e) {
  console.error('Audio error:', e)
  stopPlayback()
}

function loadNext() {
  stopPlayback()
  if (mode.value === 'presentation') {
    loadRandomPresentation()
  } else {
    loadRandomCycle()
  }
}

function loadPrevious() {
  if (!hasPrevious.value) return
  stopPlayback()
  historyIndex.value--
  currentCycle.value = history.value[historyIndex.value]
  preloadCycleAudio(currentCycle.value)
}

function flagCurrent() {
  const id = currentCycle.value?.id || currentSample.value?.id
  if (id) {
    emit('flag', id)
  }
}

// Watch mode changes
watch(mode, (newMode) => {
  stopPlayback()
  if (newMode === 'presentation' && !currentSample.value) {
    loadRandomPresentation()
  } else if (newMode === 'cycle' && !currentCycle.value) {
    loadRandomCycle()
  }
})

// Cleanup
onUnmounted(() => {
  stopPlayback()
})

// Initial load
if (props.targetItem) {
  // If targetItem is provided, always use cycle mode
  mode.value = 'cycle'
  loadRandomCycle()
} else if (mode.value === 'cycle') {
  loadRandomCycle()
} else {
  loadRandomPresentation()
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');

.learning-cycle-player {
  --player-bg: #0d1117;
  --player-surface: #161b22;
  --player-border: #30363d;
  --player-accent: #58a6ff;
  --player-accent-glow: rgba(88, 166, 255, 0.3);
  --player-success: #3fb950;
  --player-warning: #d29922;
  --player-text: #e6edf3;
  --player-text-muted: #8b949e;
  --player-known: #a371f7;
  --player-target: #7ee787;

  font-family: 'DM Sans', -apple-system, sans-serif;
  background: var(--player-bg);
  border: 1px solid var(--player-border);
  border-radius: 16px;
  padding: 24px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* Light-mode retheme: this widget is built on a self-contained dark palette
   (--player-*). Override only those variables under the light theme so the
   whole component re-themes without touching any dark-mode value. */
:root[data-theme="light"] .learning-cycle-player {
  --player-bg: var(--canvas);
  --player-surface: var(--surface);
  --player-border: var(--line);
  --player-accent: #1d6fe0;        /* 4.6:1 on white (was #58a6ff = 2.0:1) */
  --player-accent-glow: rgba(29, 111, 224, 0.25);
  --player-success: #15803d;       /* darkened for legible dot fills */
  --player-warning: #b45309;       /* border-only accent */
  --player-text: var(--ink);
  --player-text-muted: var(--muted);
  --player-known: #7c3aed;         /* 5.3:1 on white (was #a371f7 = 2.6:1) */
  --player-target: #047857;        /* 4.9:1 on white (was #7ee787 = 1.3:1) */

  /* card separation: white cards on slate canvas need a visible edge */
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05);
}

/* Mode-toggle active pill on light: surface on canvas needs an edge */
:root[data-theme="light"] .mode-toggle button.active {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
  border: 1px solid var(--player-border);
}

/* Content card separation on light */
:root[data-theme="light"] .content-block:not(.pause-block) {
  border: 1px solid var(--player-border);
}

.learning-cycle-player::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: radial-gradient(ellipse at top, var(--player-accent-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.learning-cycle-player.is-playing::before {
  opacity: 1;
}

/* Mode Toggle */
.mode-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--player-surface);
  padding: 4px;
  border-radius: 10px;
}

.mode-toggle button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--player-text-muted);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mode-toggle button:hover {
  color: var(--player-text);
}

.mode-toggle button.active {
  background: var(--player-bg);
  color: var(--player-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.mode-icon {
  font-size: 16px;
}

/* Player Stage */
.player-stage {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

/* Presentation View */
.presentation-view {
  text-align: center;
}

.presentation-visual {
  margin-bottom: 16px;
}

.sound-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 48px;
  margin-bottom: 12px;
}

.wave-bar {
  width: 4px;
  height: 20px;
  background: var(--player-accent);
  border-radius: 2px;
  opacity: 0.4;
}

.sound-wave.animating .wave-bar {
  animation: wave 0.8s ease-in-out infinite;
}

.sound-wave.animating .wave-bar:nth-child(1) { animation-delay: 0s; }
.sound-wave.animating .wave-bar:nth-child(2) { animation-delay: 0.1s; }
.sound-wave.animating .wave-bar:nth-child(3) { animation-delay: 0.2s; }
.sound-wave.animating .wave-bar:nth-child(4) { animation-delay: 0.1s; }
.sound-wave.animating .wave-bar:nth-child(5) { animation-delay: 0s; }

@keyframes wave {
  0%, 100% { height: 20px; opacity: 0.4; }
  50% { height: 40px; opacity: 1; }
}

.presentation-label {
  font-size: 14px;
  color: var(--player-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.presentation-text {
  font-size: 16px;
  color: var(--player-text);
  line-height: 1.6;
  max-width: 400px;
}

/* Cycle View */
.cycle-view {
  width: 100%;
}

/* Phase Track */
.phase-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  position: relative;
  padding: 0 20px;
}

.phase-track::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 20px;
  right: 20px;
  height: 2px;
  background: var(--player-border);
  transform: translateY(-50%);
  z-index: 0;
}

.phase-progress {
  position: absolute;
  top: 50%;
  left: 20px;
  height: 2px;
  background: var(--player-accent);
  transform: translateY(-50%);
  transition: width 0.3s ease;
  z-index: 1;
}

.phase-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--player-surface);
  border: 2px solid var(--player-border);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.phase-dot.active {
  background: var(--player-accent);
  border-color: var(--player-accent);
  box-shadow: 0 0 12px var(--player-accent-glow);
  transform: scale(1.2);
}

.phase-dot.completed {
  background: var(--player-success);
  border-color: var(--player-success);
}

.phase-label {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--player-text-muted);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.phase-dot.active .phase-label {
  color: var(--player-accent);
}

/* Cycle Content */
.cycle-content {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-block {
  text-align: center;
  padding: 24px;
  background: var(--player-surface);
  border-radius: 12px;
  width: 100%;
  position: relative;
}

.language-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.language-badge.known {
  background: rgba(163, 113, 247, 0.15);
  color: var(--player-known);
}

.language-badge.target {
  background: rgba(126, 231, 135, 0.15);
  color: var(--player-target);
}

.primary-text {
  font-size: 20px;
  font-weight: 500;
  color: var(--player-text);
  line-height: 1.5;
  margin: 0;
}

.audio-indicator {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--player-text-muted);
}

.audio-indicator.active {
  background: var(--player-accent);
}

.audio-indicator.active .pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--player-accent);
  animation: pulse 1.5s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

/* Pause Block */
.pause-block {
  background: transparent;
}

.pause-visual {
  padding: 20px;
}

.thinking-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.thinking-dots span {
  width: 10px;
  height: 10px;
  background: var(--player-text-muted);
  border-radius: 50%;
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) { animation-delay: 0s; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
}

.pause-hint {
  color: var(--player-text-muted);
  font-size: 14px;
  font-style: italic;
  margin: 0;
}

/* Target 1 - Hidden text */
.hidden-text-visual {
  padding: 8px 0;
}

.blur-bars {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;
}

.blur-bars span {
  height: 24px;
  background: linear-gradient(90deg, var(--player-border), var(--player-surface));
  border-radius: 4px;
  animation: shimmer 2s ease-in-out infinite;
}

.blur-bars span:nth-child(1) { width: 60px; }
.blur-bars span:nth-child(2) { width: 45px; animation-delay: 0.1s; }
.blur-bars span:nth-child(3) { width: 70px; animation-delay: 0.2s; }
.blur-bars span:nth-child(4) { width: 50px; animation-delay: 0.3s; }
.blur-bars span:nth-child(5) { width: 40px; animation-delay: 0.4s; }
.blur-bars span:nth-child(6) { width: 65px; animation-delay: 0.5s; }
.blur-bars span:nth-child(7) { width: 55px; animation-delay: 0.6s; }
.blur-bars span:nth-child(8) { width: 35px; animation-delay: 0.7s; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.hint-text {
  font-size: 13px;
  color: var(--player-text-muted);
  margin: 0;
}

/* Target 2 - Reveal */
.target2-block .reveal-text {
  animation: revealText 0.5s ease-out;
}

@keyframes revealText {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

/* Controls */
.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.control-btn {
  border: none;
  background: var(--player-surface);
  color: var(--player-text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn svg {
  width: 24px;
  height: 24px;
}

.skip-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.skip-btn:hover:not(:disabled) {
  background: var(--player-border);
}

.play-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--player-accent);
  color: var(--player-bg);
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 24px var(--player-accent-glow);
}

.play-btn svg {
  width: 32px;
  height: 32px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pause Slider */
.pause-slider {
  margin-bottom: 20px;
  padding: 0 20px;
}

.pause-slider label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-label {
  font-size: 12px;
  color: var(--player-text-muted);
}

.pause-slider input[type="range"] {
  width: 100%;
  height: 4px;
  background: var(--player-border);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.pause-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--player-accent);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.pause-slider input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Sample Info */
.sample-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--player-border);
}

.sample-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--player-text-muted);
  opacity: 0.6;
}

.flag-btn {
  background: transparent;
  border: 1px solid var(--player-border);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.flag-btn:hover {
  background: rgba(210, 153, 34, 0.1);
  border-color: var(--player-warning);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.3s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
