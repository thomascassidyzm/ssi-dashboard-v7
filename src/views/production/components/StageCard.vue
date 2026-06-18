<template>
  <div class="stage-card" :class="statusClass">
    <div class="stage-header">
      <div class="stage-icon">{{ stage.icon }}</div>
      <div class="stage-info">
        <h3 class="stage-name">{{ stage.name }}</h3>
        <div class="stage-meta">
          <span class="stage-count">{{ stage.count }} / {{ stage.total }}</span>
          <span class="stage-activity">{{ stage.lastActivity }}</span>
        </div>
      </div>
      <div class="stage-badge" :class="badgeClass">
        {{ statusLabel }}
      </div>
    </div>

    <div class="stage-progress">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${stage.progress}%` }"
        />
      </div>
      <div class="progress-label">{{ stage.progress }}%</div>
    </div>

    <div v-if="blockerCount > 0" class="stage-blockers">
      <span class="blocker-icon">⚠️</span>
      <span class="blocker-text">{{ blockerCount }} items need attention</span>
    </div>

    <button
      class="stage-action-btn"
      @click="$emit('navigate', stage.route)"
    >
      Open {{ stage.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Stage {
  id: string
  name: string
  icon: string
  route: string
  progress: number
  status: string
  count: number
  total: number
  lastActivity: string
}

interface Props {
  stage: Stage
  blockerCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  blockerCount: 0
})

defineEmits<{
  navigate: [route: string]
}>()

const statusClass = computed(() => `status-${props.stage.status}`)
const badgeClass = computed(() => {
  switch (props.stage.status) {
    case 'in_progress':
    case 'processing':
      return 'badge-processing'
    case 'needs_attention':
      return 'badge-warning'
    case 'complete':
      return 'badge-success'
    default:
      return 'badge-idle'
  }
})

const statusLabel = computed(() => {
  switch (props.stage.status) {
    case 'in_progress':
      return 'In Progress'
    case 'processing':
      return 'Processing'
    case 'needs_attention':
      return 'Needs Attention'
    case 'complete':
      return 'Complete'
    case 'idle':
      return 'Idle'
    default:
      return props.stage.status
  }
})
</script>

<style scoped>
.stage-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.stage-card:hover {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.stage-card.status-needs_attention {
  border-color: #f59e0b;
}

.stage-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stage-icon {
  font-size: 2rem;
  line-height: 1;
}

.stage-info {
  flex: 1;
  min-width: 0;
}

.stage-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.25rem 0;
}

.stage-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--muted);
}

.stage-count {
  font-weight: 500;
}

.stage-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-processing {
  background: rgb(16 185 129 / 0.2);
  color: #10b981;
}

.badge-warning {
  background: rgb(245 158 11 / 0.2);
  color: #f59e0b;
}

.badge-success {
  background: rgb(34 197 94 / 0.2);
  color: #22c55e;
}

.badge-idle {
  background: rgb(100 116 139 / 0.2);
  color: var(--muted);
}

/* Light mode: darken pill text/fill so it passes AA on the pale tint.
   Hue families preserved (green / amber / green / slate). */
:root[data-theme="light"] .badge-processing {
  background: rgb(4 120 87 / 0.14);
  color: #047857;
}

:root[data-theme="light"] .badge-warning {
  background: rgb(180 83 9 / 0.14);
  color: #b45309;
}

:root[data-theme="light"] .badge-success {
  background: rgb(4 120 87 / 0.14);
  color: #047857;
}

:root[data-theme="light"] .badge-idle {
  background: rgb(71 85 105 / 0.14);
  color: var(--muted);
}

.stage-progress {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 0.5rem;
  background: var(--surface-3);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 9999px;
  transition: width 0.6s ease;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  min-width: 3rem;
  text-align: right;
}

.stage-blockers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgb(245 158 11 / 0.1);
  border: 1px solid rgb(245 158 11 / 0.3);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.blocker-icon {
  font-size: 1.125rem;
}

.blocker-text {
  font-size: 0.875rem;
  color: #fbbf24;
}

/* Light mode: amber blocker panel + text need to read on a pale tint. */
:root[data-theme="light"] .stage-blockers {
  background: rgb(180 83 9 / 0.1);
  border-color: rgb(180 83 9 / 0.35);
}

:root[data-theme="light"] .blocker-text {
  color: #b45309;
}

.stage-action-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stage-action-btn:hover {
  background: var(--surface-3);
  border-color: var(--accent-2);
  color: var(--accent-2);
}
</style>
