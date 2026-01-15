<template>
  <div class="pipeline-progress">
    <!-- Phase boxes with connectors -->
    <div class="phase-track">
      <div
        v-for="(phase, key) in phaseConfig"
        :key="key"
        class="phase-wrapper"
      >
        <!-- Phase Box -->
        <div
          class="phase-box"
          :class="getPhaseClasses(key)"
        >
          <div class="phase-header">
            <span class="phase-name">{{ phase.name }}</span>
            <span class="phase-label">{{ phase.label }}</span>
          </div>

          <!-- Progress bar inside phase -->
          <div class="phase-progress-bar">
            <div
              class="phase-progress-fill"
              :style="{ width: getPhaseProgress(key) + '%' }"
            ></div>
          </div>

          <!-- Phase status -->
          <div class="phase-status-row">
            <span class="phase-status-text">{{ getPhaseStatusText(key) }}</span>
            <span v-if="getPhaseJobId(key)" class="phase-job-id">{{ getPhaseJobId(key) }}</span>
          </div>
        </div>

        <!-- Connector arrow (except for last phase) -->
        <div v-if="!isLastPhase(key)" class="phase-connector">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  phases: {
    type: Object,
    default: () => ({})
  },
  currentPhase: {
    type: String,
    default: null
  }
})

// Phase configuration with display names (v14 - Course Builder consolidation)
const phaseConfig = {
  courseBuilder: { name: 'COURSE BUILDER', label: 'Seeds + LEGOs + Phrases' },
  phase1: { name: 'PHASE 1', label: 'Deprecated' },
  phase2: { name: 'PHASE 2', label: 'Deprecated' },
  phase3: { name: 'PHASE 3', label: 'Deprecated' },
  audio: { name: 'PHASE 8', label: 'Audio Generation' },
  manifest: { name: 'PHASE 9', label: 'Manifest' }
}

const phaseOrder = ['courseBuilder', 'audio', 'manifest']

// Methods
function getPhaseData(key) {
  return props.phases?.[key] || { status: 'pending' }
}

function getPhaseClasses(key) {
  const phase = getPhaseData(key)
  const isCurrent = props.currentPhase === key

  return {
    'phase-pending': phase.status === 'pending',
    'phase-running': phase.status === 'running',
    'phase-complete': phase.status === 'complete' || phase.status === 'completed',
    'phase-failed': phase.status === 'failed',
    'phase-skipped': phase.status === 'skipped',
    'phase-current': isCurrent
  }
}

function getPhaseProgress(key) {
  const phase = getPhaseData(key)

  if (phase.status === 'complete' || phase.status === 'completed') return 100
  if (phase.status === 'pending' || phase.status === 'skipped') return 0

  // Calculate progress from input/output counts
  if (phase.inputCount && phase.outputCount !== undefined) {
    return Math.round((phase.outputCount / phase.inputCount) * 100)
  }

  // Running but no specific progress
  if (phase.status === 'running') return 50

  return 0
}

function getPhaseStatusText(key) {
  const phase = getPhaseData(key)

  if (phase.status === 'complete' || phase.status === 'completed') {
    if (phase.outputCount !== undefined && phase.inputCount) {
      return `${phase.outputCount}/${phase.inputCount} done`
    }
    return 'complete'
  }

  if (phase.status === 'running') {
    if (phase.outputCount !== undefined && phase.inputCount) {
      return `${phase.outputCount}/${phase.inputCount}`
    }
    return 'running...'
  }

  if (phase.status === 'failed') return 'failed'
  if (phase.status === 'skipped') return 'skipped'

  return 'pending'
}

function getPhaseJobId(key) {
  const phase = getPhaseData(key)
  return phase.jobId ? `Job: ${phase.jobId}` : null
}

function isLastPhase(key) {
  return key === phaseOrder[phaseOrder.length - 1]
}
</script>

<style scoped>
.pipeline-progress {
  background: var(--elevated, #334155);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.phase-track {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: max-content;
}

.phase-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.phase-box {
  width: 140px;
  padding: 0.75rem;
  background: var(--void, #0f172a);
  border: 2px solid var(--border, #334155);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.phase-box.phase-pending {
  border-color: var(--border, #334155);
  opacity: 0.6;
}

.phase-box.phase-running {
  border-color: var(--accent, #10b981);
  box-shadow: 0 0 0 1px var(--accent, #10b981), 0 0 20px rgba(16, 185, 129, 0.2);
}

.phase-box.phase-complete {
  border-color: var(--success, #22c55e);
  background: rgba(34, 197, 94, 0.05);
}

.phase-box.phase-failed {
  border-color: var(--error, #ef4444);
  background: rgba(239, 68, 68, 0.05);
}

.phase-box.phase-skipped {
  border-color: var(--border, #334155);
  opacity: 0.4;
}

.phase-box.phase-current {
  transform: scale(1.02);
}

.phase-header {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-bottom: 0.5rem;
}

.phase-name {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted, #64748b);
}

.phase-running .phase-name {
  color: var(--accent, #10b981);
}

.phase-complete .phase-name {
  color: var(--success, #22c55e);
}

.phase-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text, #f1f5f9);
}

.phase-progress-bar {
  height: 4px;
  background: var(--border, #334155);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.phase-progress-fill {
  height: 100%;
  background: var(--accent, #10b981);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.phase-complete .phase-progress-fill {
  background: var(--success, #22c55e);
}

.phase-failed .phase-progress-fill {
  background: var(--error, #ef4444);
}

.phase-status-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.phase-status-text {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-muted, #64748b);
}

.phase-running .phase-status-text {
  color: var(--accent, #10b981);
}

.phase-job-id {
  font-size: 0.625rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-muted, #64748b);
  opacity: 0.7;
}

.phase-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
}

.phase-connector svg {
  width: 20px;
  height: 20px;
  color: var(--border-light, #475569);
}

/* Responsive: stack on small screens */
@media (max-width: 900px) {
  .phase-track {
    flex-direction: column;
    align-items: stretch;
  }

  .phase-wrapper {
    flex-direction: column;
  }

  .phase-box {
    width: 100%;
  }

  .phase-connector {
    width: 100%;
    height: 24px;
    transform: rotate(90deg);
  }
}
</style>
