<template>
  <div class="step-indicator flex items-center justify-center gap-2 mb-6">
    <div
      v-for="step in steps"
      :key="step.number"
      class="step-item flex items-center"
    >
      <!-- Step circle -->
      <div
        class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200"
        :class="getStepClass(step.number)"
      >
        <!-- Checkmark for completed steps -->
        <svg
          v-if="completedSteps.includes(step.number)"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <!-- Number for incomplete steps -->
        <span v-else>{{ step.number }}</span>
      </div>

      <!-- Step label -->
      <span
        class="step-label ml-2 text-sm font-medium hidden sm:inline"
        :class="getLabelClass(step.number)"
      >
        {{ step.label }}
      </span>

      <!-- Connector line -->
      <div
        v-if="step.number < steps.length"
        class="connector w-8 sm:w-12 h-0.5 mx-2 transition-colors duration-200"
        :class="getConnectorClass(step.number)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentStep: number
  completedSteps: number[]
}>()

const steps = [
  { number: 1, label: 'Generate' },
  { number: 2, label: 'Verify S3' },
  { number: 3, label: 'Publish' },
  { number: 4, label: 'Deploy' }
]

function getStepClass(stepNumber: number): string {
  if (props.completedSteps.includes(stepNumber)) {
    return 'bg-emerald-500 text-white'
  }
  if (stepNumber === props.currentStep) {
    return 'bg-blue-500 text-white ring-2 ring-blue-300'
  }
  return 'bg-surface-3 text-muted'
}

function getLabelClass(stepNumber: number): string {
  if (props.completedSteps.includes(stepNumber)) {
    return 'text-emerald-400'
  }
  if (stepNumber === props.currentStep) {
    return 'text-blue-400'
  }
  return 'text-faint'
}

function getConnectorClass(stepNumber: number): string {
  if (props.completedSteps.includes(stepNumber)) {
    return 'bg-emerald-500'
  }
  return 'bg-surface-3'
}
</script>

<style scoped>
.step-indicator {
  padding: 1rem 0;
}

.step-circle {
  flex-shrink: 0;
}

.connector {
  min-width: 1.5rem;
}
</style>
