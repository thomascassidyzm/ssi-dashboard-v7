<template>
  <div
    class="phase-detail"
    :class="{
      'is-current': isCurrent,
      'is-expanded': isExpanded,
      [`status-${phase?.status}`]: phase?.status
    }"
  >
    <!-- Phase Header (clickable to expand) -->
    <button class="phase-header" @click="$emit('toggle')">
      <div class="header-left">
        <!-- Status Icon -->
        <div class="status-icon">
          <svg v-if="phase?.status === 'complete' || phase?.status === 'completed'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="phase?.status === 'failed'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div v-else-if="phase?.status === 'running'" class="running-spinner"></div>
          <div v-else class="pending-dot"></div>
        </div>

        <!-- Phase Info -->
        <div class="phase-info">
          <span class="phase-title">{{ phaseTitle }}</span>
          <span class="phase-subtitle">{{ phaseSubtitle }}</span>
        </div>
      </div>

      <div class="header-right">
        <!-- Job ID -->
        <span v-if="phase?.jobId" class="job-badge">{{ phase.jobId }}</span>

        <!-- Progress / Duration -->
        <span class="progress-text">{{ progressText }}</span>

        <!-- Expand Icon -->
        <svg class="expand-icon" :class="{ rotated: isExpanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </button>

    <!-- Expanded Content -->
    <div v-if="isExpanded" class="phase-content">
      <!-- Phase Metadata -->
      <div class="phase-meta">
        <div v-if="phase?.startedAt" class="meta-item">
          <span class="meta-label">Started</span>
          <span class="meta-value">{{ formatTime(phase.startedAt) }}</span>
        </div>
        <div v-if="phase?.duration" class="meta-item">
          <span class="meta-label">Duration</span>
          <span class="meta-value">{{ formatDuration(phase.duration) }}</span>
        </div>
        <div v-if="phase?.inputCount" class="meta-item">
          <span class="meta-label">Input</span>
          <span class="meta-value">{{ phase.inputCount }} items</span>
        </div>
        <div v-if="phase?.outputCount !== undefined" class="meta-item">
          <span class="meta-label">Output</span>
          <span class="meta-value">{{ phase.outputCount }} items</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="phase?.error" class="error-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ phase.error }}</span>
      </div>

      <!-- Slot for browsers/seeds/custom content -->
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  phaseKey: {
    type: String,
    required: true
  },
  phase: {
    type: Object,
    default: () => ({})
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])

// Phase display config (v14 - Course Builder consolidation)
const phaseLabels = {
  courseBuilder: { title: 'Course Builder', subtitle: 'Seeds + LEGOs + Phrases' },
  phase1: { title: 'Phase 1', subtitle: 'Deprecated - use Course Builder' },
  phase2: { title: 'Phase 2', subtitle: 'Deprecated - use Course Builder' },
  phase3: { title: 'Phase 3', subtitle: 'Deprecated - use Course Builder' },
  audio: { title: 'Phase 8', subtitle: 'Audio Generation (TTS)' },
  manifest: { title: 'Phase 9', subtitle: 'Manifest Compilation' }
}

// Computed
const phaseTitle = computed(() => {
  return phaseLabels[props.phaseKey]?.title || props.phaseKey
})

const phaseSubtitle = computed(() => {
  return phaseLabels[props.phaseKey]?.subtitle || ''
})

const progressText = computed(() => {
  const phase = props.phase

  if (!phase) return 'pending'

  if (phase.status === 'complete' || phase.status === 'completed') {
    if (phase.duration) {
      return formatDuration(phase.duration)
    }
    return 'complete'
  }

  if (phase.status === 'running') {
    if (phase.outputCount !== undefined && phase.inputCount) {
      const pct = Math.round((phase.outputCount / phase.inputCount) * 100)
      return `${phase.outputCount}/${phase.inputCount} (${pct}%)`
    }
    return 'running...'
  }

  if (phase.status === 'failed') return 'failed'
  if (phase.status === 'skipped') return 'skipped'

  return 'pending'
})

// Methods
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function formatDuration(seconds) {
  if (!seconds) return ''
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}
</script>

<style scoped>
.phase-detail {
  background: var(--elevated, #334155);
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.phase-detail.is-current {
  border-color: var(--accent, #10b981);
  box-shadow: 0 0 0 1px var(--accent, #10b981);
}

.phase-detail.status-complete,
.phase-detail.status-completed {
  border-color: rgba(34, 197, 94, 0.3);
}

.phase-detail.status-failed {
  border-color: rgba(239, 68, 68, 0.3);
}

/* Header */
.phase-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.phase-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #64748b);
}

.status-complete .status-icon,
.status-completed .status-icon {
  color: var(--success, #22c55e);
}

.status-failed .status-icon {
  color: var(--error, #ef4444);
}

.status-running .status-icon {
  color: var(--accent, #10b981);
}

.status-icon svg {
  width: 24px;
  height: 24px;
}

.running-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border, #334155);
  border-top-color: var(--accent, #10b981);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pending-dot {
  width: 10px;
  height: 10px;
  background: var(--border-light, #475569);
  border-radius: 50%;
}

.phase-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
}

.phase-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text, #f1f5f9);
}

.phase-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.job-badge {
  padding: 0.25rem 0.5rem;
  background: var(--void, #0f172a);
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.6875rem;
  color: var(--text-muted, #64748b);
}

.progress-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-dim, #94a3b8);
  min-width: 80px;
  text-align: right;
}

.status-running .progress-text {
  color: var(--accent, #10b981);
}

.status-complete .progress-text,
.status-completed .progress-text {
  color: var(--success, #22c55e);
}

.status-failed .progress-text {
  color: var(--error, #ef4444);
}

.expand-icon {
  width: 20px;
  height: 20px;
  color: var(--text-muted, #64748b);
  transition: transform 0.2s;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* Content */
.phase-content {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--border, #334155);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.phase-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 0;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.meta-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #64748b);
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text, #f1f5f9);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.error-banner svg {
  width: 18px;
  height: 18px;
  color: var(--error, #ef4444);
  flex-shrink: 0;
}

.error-banner span {
  font-size: 0.8125rem;
  color: #f87171;
}
</style>
