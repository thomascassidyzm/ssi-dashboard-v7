<template>
  <div class="script-playback-controls">
    <!-- Now Playing Header -->
    <div class="now-playing-header">
      <div class="text-info">
        <span class="now-playing-label">Now Playing:</span>
        <span class="text-pair">
          <span class="known-text">"{{ currentItem?.knownText || 'No item selected' }}"</span>
          <span class="arrow">→</span>
          <span class="target-text">"{{ currentItem?.targetText || '' }}"</span>
        </span>
      </div>

      <!-- Phase indicator dots -->
      <div class="phase-dots">
        <div
          v-for="(phase, index) in phases"
          :key="phase"
          class="phase-dot"
          :class="{
            completed: getPhaseIndex(currentPhase) > index,
            active: currentPhase === phase,
            upcoming: getPhaseIndex(currentPhase) < index
          }"
        >
          <span class="phase-label">{{ phaseLabels[phase] }}</span>
        </div>
      </div>
    </div>

    <!-- Main Controls -->
    <div class="main-controls">
      <!-- Transport Controls -->
      <div class="transport-controls">
        <button
          class="control-btn skip-back"
          @click="$emit('skip', -1)"
          :disabled="currentIndex === 0"
          title="Previous item"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          class="control-btn play-pause"
          @click="togglePlayPause"
          :class="{ playing: isPlaying }"
          title="Play/Pause"
        >
          <svg v-if="isPlaying && !isPaused" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <button
          class="control-btn skip-forward"
          @click="$emit('skip', 1)"
          :disabled="currentIndex >= totalItems - 1"
          title="Next item"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z"/>
          </svg>
        </button>
      </div>

      <!-- Item Counter -->
      <div class="item-counter">
        Item {{ currentIndex + 1 }} of {{ totalItems }}
      </div>
    </div>

    <!-- Progress Section -->
    <div class="progress-section">
      <!-- Mini progress for current item phases -->
      <div class="item-progress-bar" v-if="isPlaying">
        <div class="item-progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>

      <!-- Overall timeline -->
      <div class="timeline-container">
        <div
          class="timeline-bar"
          @click="handleSeek"
          ref="timelineBar"
        >
          <div class="timeline-progress" :style="{ width: `${overallProgress}%` }">
            <div class="timeline-handle"></div>
          </div>
        </div>

        <div class="time-labels">
          <span class="time-current">{{ formatTime(currentTime) }}</span>
          <span class="time-total">{{ formatTime(totalTime) }}</span>
        </div>
      </div>
    </div>

    <!-- Stop Button (bottom-right) -->
    <button
      class="control-btn stop-btn"
      @click="$emit('stop')"
      v-if="isPlaying || isPaused"
      title="Stop playback"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  currentItem: {
    type: Object,
    default: null
  },
  currentPhase: {
    type: String,
    default: 'prompt',
    validator: (value) => ['prompt', 'pause', 'voice1', 'voice2'].includes(value)
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  }
})

const emit = defineEmits(['play', 'pause', 'stop', 'skip', 'seek'])

// Phase configuration
const phases = ['prompt', 'pause', 'voice1', 'voice2']
const phaseLabels = {
  prompt: 'PROMPT',
  pause: 'THINK',
  voice1: 'LISTEN',
  voice2: 'REVEAL'
}

// Refs
const timelineBar = ref(null)

// Computed
const overallProgress = computed(() => {
  if (props.totalItems === 0) return 0
  return ((props.currentIndex / props.totalItems) * 100)
})

const currentTime = computed(() => {
  // Estimate: 8 seconds per item on average
  return props.currentIndex * 8
})

const totalTime = computed(() => {
  return props.totalItems * 8
})

// Methods
function getPhaseIndex(phase) {
  return phases.indexOf(phase)
}

function togglePlayPause() {
  if (props.isPlaying && !props.isPaused) {
    emit('pause')
  } else {
    emit('play')
  }
}

function handleSeek(event) {
  if (!timelineBar.value) return

  const rect = timelineBar.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = (x / rect.width) * 100
  const targetIndex = Math.floor((percentage / 100) * props.totalItems)

  emit('seek', Math.max(0, Math.min(targetIndex, props.totalItems - 1)))
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.script-playback-controls {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
  border-top: 1px solid #334155;
  padding: 16px 24px 20px;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
}

/* Now Playing Header */
.now-playing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.text-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.now-playing-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.text-pair {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.known-text {
  color: #a78bfa;
  font-weight: 500;
}

.arrow {
  color: #64748b;
  font-weight: 300;
}

.target-text {
  color: #10b981;
  font-weight: 500;
}

/* Phase Dots */
.phase-dots {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-right: 8px;
}

.phase-dot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.phase-dot::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #334155;
  border: 2px solid #475569;
  transition: all 0.3s ease;
}

.phase-dot.completed::before {
  background: #10b981;
  border-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.phase-dot.active::before {
  background: #10b981;
  border-color: #10b981;
  transform: scale(1.3);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  animation: pulse 1.5s ease-in-out infinite;
}

.phase-dot.upcoming::before {
  background: transparent;
  border-color: #475569;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
  }
}

.phase-label {
  font-size: 9px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.phase-dot.active .phase-label {
  color: #10b981;
}

/* Main Controls */
.main-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.transport-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  color: #f1f5f9;
  background: rgba(148, 163, 184, 0.1);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn svg {
  width: 20px;
  height: 20px;
}

.control-btn.play-pause {
  width: 48px;
  height: 48px;
  background: #10b981;
  color: white;
}

.control-btn.play-pause svg {
  width: 24px;
  height: 24px;
}

.control-btn.play-pause:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
  transform: scale(1.08);
}

.control-btn.play-pause.playing {
  animation: playingGlow 2s ease-in-out infinite;
}

@keyframes playingGlow {
  0%, 100% {
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
  }
}

.control-btn.stop-btn {
  position: absolute;
  bottom: 20px;
  right: 24px;
  width: 36px;
  height: 36px;
  background: #475569;
  color: white;
}

.control-btn.stop-btn:hover {
  background: #ef4444;
  transform: scale(1.08);
}

.control-btn.stop-btn svg {
  width: 18px;
  height: 18px;
}

/* Item Counter */
.item-counter {
  font-size: 13px;
  color: #cbd5e1;
  font-weight: 500;
  padding: 6px 12px;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 12px;
}

/* Progress Section */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-progress-bar {
  height: 3px;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 2px;
  overflow: hidden;
}

.item-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: visible;
}

.timeline-bar:hover {
  background: #3f4e63;
}

.timeline-progress {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 4px;
  position: relative;
  transition: width 0.2s ease;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}

.timeline-handle {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid #10b981;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.timeline-bar:hover .timeline-handle {
  opacity: 1;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .script-playback-controls {
    padding: 12px 16px 16px;
  }

  .now-playing-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .phase-dots {
    width: 100%;
    justify-content: space-between;
    padding-right: 0;
  }

  .text-pair {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .arrow {
    display: none;
  }

  .control-btn.stop-btn {
    bottom: 16px;
    right: 16px;
  }
}

/* Smooth transitions */
* {
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.phase-dot::before,
.timeline-progress,
.item-progress-fill {
  transition: all 0.3s ease;
}
</style>
