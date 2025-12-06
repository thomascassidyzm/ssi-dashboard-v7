<template>
  <div class="progress-ring-container">
    <svg :width="size" :height="size" class="progress-ring">
      <!-- Background circle -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
        class="progress-ring-bg"
      />
      <!-- Progress circle -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="progress-ring-fill"
        :class="progressClass"
      />
    </svg>
    <div class="progress-ring-label">
      <div class="progress-ring-value">{{ value }}%</div>
      <div v-if="label" class="progress-ring-text">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
  label?: string
  size?: number
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  strokeWidth: 12
})

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => {
  const progress = Math.min(Math.max(props.value, 0), 100)
  return circumference.value - (progress / 100) * circumference.value
})

const progressClass = computed(() => {
  if (props.value >= 80) return 'progress-high'
  if (props.value >= 50) return 'progress-medium'
  return 'progress-low'
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
  fill: none;
  stroke: rgb(51 65 85 / 0.3);
}

.progress-ring-fill {
  fill: none;
  stroke: #10b981;
  transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease;
  stroke-linecap: round;
}

.progress-ring-fill.progress-high {
  stroke: #10b981;
}

.progress-ring-fill.progress-medium {
  stroke: #f59e0b;
}

.progress-ring-fill.progress-low {
  stroke: #ef4444;
}

.progress-ring-label {
  position: absolute;
  text-align: center;
}

.progress-ring-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1;
}

.progress-ring-text {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
