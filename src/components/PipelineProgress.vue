<template>
  <div class="bg-surface rounded-lg border border-line shadow-sm p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <span class="text-xl">{{ phaseEmoji }}</span>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-ink">{{ title }}</h3>
        <p class="text-sm text-muted">{{ getCourseName(courseCode) }}</p>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mb-4">
      <div class="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${progressPercent}%` }"
        >
          <div class="h-full w-full animate-pulse bg-white/20"></div>
        </div>
      </div>
      <div class="flex justify-between mt-2 text-sm">
        <span class="text-muted">{{ progressText }}</span>
        <span class="text-accent-2 font-medium">{{ progressPercent }}%</span>
      </div>
    </div>

    <!-- Status Message -->
    <div class="flex items-center gap-3 mb-6 p-3 bg-surface-2 border border-line rounded-lg">
      <div class="relative">
        <div class="w-3 h-3 bg-accent-2 rounded-full"></div>
        <div class="absolute inset-0 w-3 h-3 bg-accent-2 rounded-full animate-ping"></div>
      </div>
      <span class="text-ink">{{ statusMessage }}</span>
    </div>

    <!-- Time Estimate -->
    <p v-if="timeEstimate" class="text-sm text-faint mb-6">
      {{ timeEstimate }}
    </p>

    <!-- Phase Steps -->
    <div class="flex items-center justify-between">
      <div
        v-for="(phase, index) in phases"
        :key="phase.id"
        class="flex items-center"
      >
        <!-- Phase Circle -->
        <div class="flex flex-col items-center">
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300"
            :class="getPhaseClasses(phase)"
          >
            <!-- Completed -->
            <svg v-if="phase.status === 'completed'" class="w-6 h-6 text-accent-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <!-- Active -->
            <div v-else-if="phase.status === 'active'" class="flex gap-1">
              <div class="w-1.5 h-1.5 bg-accent-2 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-1.5 h-1.5 bg-accent-2 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 bg-accent-2 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
            <!-- Pending -->
            <div v-else class="w-2 h-2 bg-surface-3 rounded-full"></div>
          </div>
          <span
            class="text-xs mt-2 font-medium transition-colors"
            :class="phase.status === 'active' ? 'text-accent-2' : phase.status === 'completed' ? 'text-muted' : 'text-faint'"
          >
            {{ phase.label }}
          </span>
        </div>

        <!-- Connector Line -->
        <div
          v-if="index < phases.length - 1"
          class="w-8 h-0.5 mx-2 transition-colors duration-300"
          :class="phase.status === 'completed' ? 'bg-emerald-500/50' : 'bg-surface-2'"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCourses } from '../composables/useCourses'

const { getCourseName } = useCourses()

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  currentPhase: {
    type: Number,
    default: 1
  },
  seedsProcessed: {
    type: Number,
    default: 0
  },
  totalSeeds: {
    type: Number,
    default: 30
  },
  startedAt: {
    type: String,
    default: null
  }
})

const phaseConfig = {
  1: { label: 'Translate', emoji: '🌱', message: 'Translating your seeds...' },
  3: { label: 'Extract', emoji: '🔍', message: 'Discovering language patterns...' },
  5: { label: 'Practice', emoji: '🧩', message: 'Building practice exercises...' },
  7: { label: 'Build', emoji: '📦', message: 'Compiling your course...' }
}

const phases = computed(() => {
  const phaseOrder = [1, 3, 5, 7]
  return phaseOrder.map(phaseNum => {
    let status = 'pending'
    if (phaseNum < props.currentPhase) status = 'completed'
    else if (phaseNum === props.currentPhase) status = 'active'

    return {
      id: phaseNum,
      label: phaseConfig[phaseNum].label,
      status
    }
  })
})

const title = computed(() => {
  return 'Creating your course'
})

const phaseEmoji = computed(() => {
  return phaseConfig[props.currentPhase]?.emoji || '🚀'
})

const statusMessage = computed(() => {
  return phaseConfig[props.currentPhase]?.message || 'Processing...'
})

const progressPercent = computed(() => {
  if (props.totalSeeds === 0) return 0

  // Each phase contributes 25% to overall progress
  const phaseOrder = [1, 3, 5, 7]
  const currentPhaseIndex = phaseOrder.indexOf(props.currentPhase)
  const completedPhasesPercent = currentPhaseIndex * 25

  // Add progress within current phase
  const withinPhasePercent = (props.seedsProcessed / props.totalSeeds) * 25

  return Math.min(100, Math.round(completedPhasesPercent + withinPhasePercent))
})

const progressText = computed(() => {
  if (props.seedsProcessed > 0) {
    return `${props.seedsProcessed} of ${props.totalSeeds} seeds`
  }
  return 'Starting...'
})

const timeEstimate = computed(() => {
  if (!props.startedAt) return null

  const elapsed = Date.now() - new Date(props.startedAt).getTime()
  const elapsedMinutes = Math.floor(elapsed / 60000)

  if (props.seedsProcessed > 0 && progressPercent.value > 0) {
    const estimatedTotal = elapsed / (progressPercent.value / 100)
    const remaining = estimatedTotal - elapsed
    const remainingMinutes = Math.ceil(remaining / 60000)

    if (remainingMinutes <= 1) return 'Almost there...'
    return `About ${remainingMinutes} minutes remaining`
  }

  if (elapsedMinutes < 1) return 'Just started...'
  return `Running for ${elapsedMinutes} minute${elapsedMinutes > 1 ? 's' : ''}...`
})

function getPhaseClasses(phase) {
  if (phase.status === 'completed') {
    return 'bg-emerald-500/20 border border-emerald-500/30'
  } else if (phase.status === 'active') {
    return 'bg-emerald-500/10 border-2 border-emerald-500'
  } else {
    return 'bg-surface border border-line'
  }
}
</script>
