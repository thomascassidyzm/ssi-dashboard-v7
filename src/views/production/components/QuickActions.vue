<template>
  <div class="quick-actions">
    <h2 class="quick-actions-title">Quick Actions</h2>
    <div class="action-grid">
      <button
        v-for="action in actions"
        :key="action.id"
        class="action-card"
        :class="{ disabled: action.disabled }"
        :disabled="action.disabled"
        @click="$emit('execute', action.id)"
      >
        <div class="action-icon">{{ action.icon }}</div>
        <div class="action-content">
          <div class="action-label">{{ action.label }}</div>
          <div v-if="action.description" class="action-description">
            {{ action.description }}
          </div>
        </div>
        <div v-if="action.badge" class="action-badge">
          {{ action.badge }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Action {
  id: string
  icon: string
  label: string
  description?: string
  badge?: string | number
  disabled?: boolean
}

interface Props {
  actions: Action[]
}

defineProps<Props>()

defineEmits<{
  execute: [actionId: string]
}>()
</script>

<style scoped>
.quick-actions {
  margin-top: 2rem;
}

.quick-actions-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:not(.disabled):hover {
  border-color: var(--accent-2);
  background: color-mix(in srgb, var(--accent-2) 5%, var(--surface));
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15);
}

.action-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 2rem;
  line-height: 1;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 0.25rem;
}

.action-description {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.4;
}

.action-badge {
  padding: 0.25rem 0.75rem;
  background: rgb(16 185 129 / 0.2);
  color: #10b981;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 700;
}

:root[data-theme="light"] .action-badge {
  background: color-mix(in srgb, var(--accent-2) 14%, var(--surface));
  color: var(--accent-2);
}
</style>
