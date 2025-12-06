<template>
  <div class="waveform-visualizer">
    <!-- Recording Waveform (real-time) -->
    <div v-if="isRecording" class="waveform waveform-recording">
      <div
        v-for="i in barCount"
        :key="i"
        class="waveform-bar"
        :style="{ height: `${getBarHeight(i)}%` }"
      />
    </div>

    <!-- Playback Waveform (static) -->
    <div v-else-if="hasRecording" class="waveform waveform-playback">
      <div
        v-for="i in barCount"
        :key="i"
        class="waveform-bar static"
        :style="{ height: `${50 + Math.random() * 40}%` }"
      />
    </div>

    <!-- Idle State -->
    <div v-else class="waveform waveform-idle">
      <div class="idle-message">
        <svg class="icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <p>Ready to record</p>
      </div>
    </div>

    <!-- Level Meter -->
    <div v-if="isRecording" class="level-meter">
      <div class="meter-bar">
        <div
          class="meter-fill"
          :style="{ width: `${audioLevel * 100}%` }"
          :class="{
            'level-low': audioLevel < 0.3,
            'level-medium': audioLevel >= 0.3 && audioLevel < 0.7,
            'level-high': audioLevel >= 0.7
          }"
        />
      </div>
      <div class="meter-label">{{ Math.round(audioLevel * 100) }}%</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  isRecording: boolean
  audioLevel?: number
  hasRecording: boolean
}>()

const barCount = 40
const audioLevelHistory = ref<number[]>([])
let historyInterval: number | null = null

// Track audio level over time for waveform
watch(() => props.audioLevel, (level) => {
  if (props.isRecording && level !== undefined) {
    audioLevelHistory.value.push(level)
    if (audioLevelHistory.value.length > barCount) {
      audioLevelHistory.value.shift()
    }
  }
})

// Start/stop history tracking
watch(() => props.isRecording, (recording) => {
  if (recording) {
    audioLevelHistory.value = []
  } else {
    if (historyInterval) {
      clearInterval(historyInterval)
      historyInterval = null
    }
  }
})

function getBarHeight(index: number): number {
  const historyIndex = audioLevelHistory.value.length - barCount + index
  if (historyIndex >= 0 && historyIndex < audioLevelHistory.value.length) {
    return 20 + audioLevelHistory.value[historyIndex] * 80
  }
  return 20 + Math.random() * 10 // Baseline noise
}

onUnmounted(() => {
  if (historyInterval) {
    clearInterval(historyInterval)
  }
})
</script>

<style scoped>
.waveform-visualizer {
  background: var(--color-slate, #23262f);
  border-radius: 8px;
  padding: 1.5rem;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.waveform {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 150px;
}

.waveform-recording,
.waveform-playback {
  padding: 1rem 0;
}

.waveform-bar {
  flex: 1;
  min-width: 3px;
  max-width: 8px;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  transition: height 0.1s ease-out;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.4);
}

.waveform-recording .waveform-bar {
  animation: barPulse 1s ease-in-out infinite;
}

.waveform-playback .waveform-bar {
  background: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.3);
  opacity: 0.6;
}

.waveform-bar.static {
  transition: none;
}

@keyframes barPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.waveform-idle {
  background: transparent;
}

.idle-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  opacity: 0.4;
}

.idle-message .icon {
  color: var(--color-paper-dim, #c1c1bb);
}

.idle-message p {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin: 0;
}

.level-meter {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.meter-bar {
  flex: 1;
  height: 8px;
  background: var(--color-void, #0a0b0f);
  border-radius: 4px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  transition: width 0.1s ease-out;
  border-radius: 4px;
}

.meter-fill.level-low {
  background: var(--color-paper-dim, #c1c1bb);
}

.meter-fill.level-medium {
  background: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 10px rgba(255, 166, 48, 0.5);
}

.meter-fill.level-high {
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 10px rgba(6, 255, 165, 0.5);
}

.meter-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: var(--color-emerald, #06ffa5);
  min-width: 50px;
  text-align: right;
}
</style>
