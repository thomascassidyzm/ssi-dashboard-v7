<template>
  <div class="progress-ring-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg class="progress-ring" :width="size" :height="size">
      <!-- Background circle -->
      <circle
        class="progress-ring-bg"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
      />
      <!-- Progress circle -->
      <circle
        class="progress-ring-progress"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :style="{ stroke: progressColor }"
      />
    </svg>
    <div class="progress-content">
      <span class="progress-value">{{ percent }}%</span>
      <span class="progress-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percent: { type: Number, default: 0 },
  size: { type: Number, default: 120 },
  strokeWidth: { type: Number, default: 8 },
  label: { type: String, default: 'Complete' },
  color: { type: String, default: 'emerald' } // emerald, tungsten, film-red
})

const colors = {
  emerald: '#06ffa5',
  tungsten: '#ffa630',
  'film-red': '#e63946'
}

const progressColor = computed(() => colors[props.color] || colors.emerald)
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  const progress = Math.min(Math.max(props.percent, 0), 100)
  return circumference.value - (progress / 100) * circumference.value
})
</script>

<style scoped>
.progress-ring-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  stroke: #475569;
}

.progress-ring-progress {
  transition: stroke-dashoffset 0.5s ease;
  filter: drop-shadow(0 0 8px currentColor);
}

.progress-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: #f7f7f2;
}

.progress-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.7rem;
  color: #c1c1bb;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
