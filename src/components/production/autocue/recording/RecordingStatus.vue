<template>
  <div class="recording-status" :class="{ active: isRecording }">
    <div class="rec-indicator">
      <div class="rec-dot"></div>
      <span class="rec-label">REC</span>
    </div>
    <span class="rec-timer">{{ formattedTime }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  isRecording: { type: Boolean, default: false }
})

const elapsedSeconds = ref(0)
let timerInterval = null

const formattedTime = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600)
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
  const seconds = elapsedSeconds.value % 60

  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
})

watch(() => props.isRecording, (recording) => {
  if (recording) {
    elapsedSeconds.value = 0
    timerInterval = setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
  } else {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.recording-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.recording-status.active {
  opacity: 1;
  transform: translateY(0);
}

.rec-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rec-dot {
  width: 12px;
  height: 12px;
  background: var(--color-film-red, #e63946);
  border-radius: 50%;
  box-shadow: 0 0 16px var(--color-film-red, #e63946);
  animation: recPulse 2s ease-in-out infinite;
}

@keyframes recPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.rec-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-film-red, #e63946);
  text-transform: uppercase;
}

.rec-timer {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  color: var(--color-paper, #f7f7f2);
}
</style>
