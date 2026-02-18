<template>
  <div
    class="browser-lane"
    :class="`status-${browser?.status}`"
  >
    <!-- Browser Header -->
    <div class="lane-header">
      <div class="header-left">
        <div class="browser-icon" :class="`status-${browser?.status}`">
          <svg v-if="browser?.status === 'complete'" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="browser?.status === 'failed' || browser?.status === 'timeout'" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div v-else-if="browser?.status === 'running'" class="running-dot"></div>
          <div v-else-if="browser?.status === 'spawning' || browser?.status === 'ready'" class="spawning-dot"></div>
          <div v-else class="idle-dot"></div>
        </div>
        <div class="browser-info">
          <span class="browser-name">{{ browser?.browserId || 'Browser' }}</span>
          <span class="browser-status">{{ statusLabel }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="seed-count">{{ completedSeeds }}/{{ totalSeeds }} seeds</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="lane-progress">
      <div
        class="progress-fill"
        :class="`status-${browser?.status}`"
        :style="{ width: progressPercent + '%' }"
      ></div>
    </div>

    <!-- Agent Cards -->
    <div v-if="browser?.agents && browser.agents.length > 0" class="agents-grid">
      <div
        v-for="agent in browser.agents"
        :key="agent.agentId"
        class="agent-card"
        :class="`status-${agent.status}`"
      >
        <div class="agent-header">
          <span class="agent-id">{{ formatAgentId(agent.agentId) }}</span>
          <span class="agent-status-dot" :class="`status-${agent.status}`"></span>
        </div>

        <!-- Agent's Seed Progress -->
        <div class="agent-seeds">
          <div
            v-for="seedId in agent.assignedSeeds || []"
            :key="seedId"
            class="seed-indicator"
            :class="getSeedClass(seedId, agent)"
            :title="seedId"
          >
            <span v-if="isCompleted(seedId, agent)">+</span>
            <span v-else-if="isFailed(seedId, agent)">x</span>
            <span v-else-if="isCurrent(seedId, agent)">...</span>
            <span v-else>-</span>
          </div>
        </div>

        <!-- Current Seed -->
        <div v-if="agent.currentSeed" class="current-seed">
          Processing: {{ agent.currentSeed }}
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="browser?.error" class="error-message">
      {{ browser.error }}
    </div>

    <!-- Timing Info -->
    <div v-if="browser?.spawnedAt" class="timing-info">
      <span v-if="browser.readyAt" class="timing-item">
        Ready in {{ timeDiff(browser.spawnedAt, browser.readyAt) }}
      </span>
      <span v-if="browser.completedAt" class="timing-item">
        Total: {{ timeDiff(browser.spawnedAt, browser.completedAt) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  browser: {
    type: Object,
    default: () => ({})
  }
})

// Computed
const statusLabel = computed(() => {
  const statuses = {
    spawning: 'Spawning...',
    ready: 'Ready',
    running: 'Running',
    complete: 'Complete',
    failed: 'Failed',
    timeout: 'Timeout'
  }
  return statuses[props.browser?.status] || 'Pending'
})

const totalSeeds = computed(() => {
  return props.browser?.assignedSeeds?.length || 0
})

const completedSeeds = computed(() => {
  if (!props.browser?.agents) return 0
  return props.browser.agents.reduce((sum, agent) => {
    return sum + (agent.completedSeeds?.length || 0)
  }, 0)
})

const progressPercent = computed(() => {
  if (totalSeeds.value === 0) return 0
  return Math.round((completedSeeds.value / totalSeeds.value) * 100)
})

// Methods
function formatAgentId(agentId) {
  if (!agentId) return 'Agent'
  // Format "browser-1-agent-1" as "A1" or similar
  const match = agentId.match(/agent-(\d+)/)
  return match ? `Agent ${match[1]}` : agentId
}

function isCompleted(seedId, agent) {
  return agent.completedSeeds?.includes(seedId)
}

function isFailed(seedId, agent) {
  return agent.failedSeeds?.includes(seedId)
}

function isCurrent(seedId, agent) {
  return agent.currentSeed === seedId
}

function getSeedClass(seedId, agent) {
  if (isCompleted(seedId, agent)) return 'seed-complete'
  if (isFailed(seedId, agent)) return 'seed-failed'
  if (isCurrent(seedId, agent)) return 'seed-processing'
  return 'seed-pending'
}

function timeDiff(start, end) {
  if (!start || !end) return ''
  const diff = Math.round((new Date(end) - new Date(start)) / 1000)
  if (diff < 60) return `${diff}s`
  const mins = Math.floor(diff / 60)
  return `${mins}m ${diff % 60}s`
}
</script>

<style scoped>
.browser-lane {
  background: var(--void, #0f172a);
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.browser-lane.status-running {
  border-color: var(--accent, #10b981);
}

.browser-lane.status-complete {
  border-color: rgba(34, 197, 94, 0.3);
}

.browser-lane.status-failed,
.browser-lane.status-timeout {
  border-color: rgba(239, 68, 68, 0.3);
}

/* Header */
.lane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.browser-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #64748b);
}

.browser-icon.status-complete {
  color: var(--success, #22c55e);
}

.browser-icon.status-failed,
.browser-icon.status-timeout {
  color: var(--error, #ef4444);
}

.browser-icon.status-running {
  color: var(--accent, #10b981);
}

.browser-icon svg {
  width: 18px;
  height: 18px;
}

.running-dot {
  width: 10px;
  height: 10px;
  background: var(--accent, #10b981);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.spawning-dot {
  width: 10px;
  height: 10px;
  background: var(--warning, #eab308);
  border-radius: 50%;
  animation: blink 0.8s ease-in-out infinite;
}

.idle-dot {
  width: 8px;
  height: 8px;
  background: var(--border-light, #475569);
  border-radius: 50%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.browser-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.browser-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text, #f1f5f9);
}

.browser-status {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
}

.status-running .browser-status {
  color: var(--accent, #10b981);
}

.seed-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-dim, #94a3b8);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Progress Bar */
.lane-progress {
  height: 4px;
  background: var(--border, #334155);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: var(--accent, #10b981);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-fill.status-complete {
  background: var(--success, #22c55e);
}

.progress-fill.status-failed,
.progress-fill.status-timeout {
  background: var(--error, #ef4444);
}

/* Agents Grid */
.agents-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.agent-card {
  background: var(--elevated, #334155);
  border: 1px solid var(--border, #334155);
  border-radius: 6px;
  padding: 0.625rem;
}

.agent-card.status-running {
  border-color: rgba(16, 185, 129, 0.3);
}

.agent-card.status-complete {
  border-color: rgba(34, 197, 94, 0.2);
  opacity: 0.8;
}

.agent-card.status-failed {
  border-color: rgba(239, 68, 68, 0.3);
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.agent-id {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim, #94a3b8);
}

.agent-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-light, #475569);
}

.agent-status-dot.status-running {
  background: var(--accent, #10b981);
  animation: pulse 1.5s ease-in-out infinite;
}

.agent-status-dot.status-complete {
  background: var(--success, #22c55e);
}

.agent-status-dot.status-failed {
  background: var(--error, #ef4444);
}

/* Seed Indicators */
.agent-seeds {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.seed-indicator {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 3px;
  background: var(--void, #0f172a);
  color: var(--text-muted, #64748b);
}

.seed-indicator.seed-complete {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success, #22c55e);
}

.seed-indicator.seed-failed {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error, #ef4444);
}

.seed-indicator.seed-processing {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent, #10b981);
  animation: pulse 1s ease-in-out infinite;
}

.current-seed {
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--accent, #10b981);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Error Message */
.error-message {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
  font-size: 0.75rem;
  color: #f87171;
}

/* Timing Info */
.timing-info {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border, #334155);
}

.timing-item {
  font-size: 0.6875rem;
  color: var(--text-muted, #64748b);
}
</style>
