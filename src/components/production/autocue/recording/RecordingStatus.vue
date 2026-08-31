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
/* House panel, floating top-right. */
.recording-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.625rem 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.recording-status.active {
  opacity: 1;
  transform: translateY(0);
}

/* A filled --danger pill, not a neon lamp. Solid red with a light dot is what
   reads as "recording" at a glance from a mic; the glow added nothing that the
   fill was not already saying, and it was the loudest thing on the estate. */
.rec-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid var(--danger);
  background: var(--danger);
}

.rec-dot {
  width: 8px;
  height: 8px;
  background: var(--canvas);
  border-radius: 50%;
  /* A slow, subtle blink — no scaling, no glow. */
  animation: recPulse 2s ease-in-out infinite;
}

@keyframes recPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .rec-dot { animation: none; }
}

.rec-label {
  font-size: 11px;
  line-height: 1.45;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--canvas);
}

.rec-timer {
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
</style>
