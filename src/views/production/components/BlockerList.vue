<template>
  <div v-if="blockers.length > 0" class="blocker-list">
    <h2 class="blocker-list-title">Blockers & Attention Needed</h2>
    <div class="blocker-cards">
      <div
        v-for="blocker in blockers"
        :key="blocker.id"
        class="blocker-card"
        :class="`severity-${blocker.severity}`"
      >
        <div class="blocker-icon">{{ blocker.icon }}</div>
        <div class="blocker-content">
          <div class="blocker-message">{{ blocker.message }}</div>
          <button
            class="blocker-action-btn"
            @click="$emit('resolve', blocker)"
          >
            {{ blocker.suggestedAction }}
          </button>
        </div>
        <div class="blocker-count">{{ blocker.count }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Blocker {
  id: string
  severity: 'high' | 'medium' | 'low'
  icon: string
  count: number
  message: string
  suggestedAction: string
  action: string
}

interface Props {
  blockers: Blocker[]
}

defineProps<Props>()

defineEmits<{
  resolve: [blocker: Blocker]
}>()
</script>

<style scoped>
.blocker-list {
  margin-bottom: 2rem;
}

.blocker-list-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.blocker-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.blocker-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgb(15 23 42 / 0.6);
  border: 2px solid;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.blocker-card.severity-high {
  border-color: #ef4444;
  background: rgb(239 68 68 / 0.05);
}

.blocker-card.severity-medium {
  border-color: #f59e0b;
  background: rgb(245 158 11 / 0.05);
}

.blocker-card.severity-low {
  border-color: #3b82f6;
  background: rgb(59 130 246 / 0.05);
}

.blocker-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
}

.blocker-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.blocker-content {
  flex: 1;
  min-width: 0;
}

.blocker-message {
  font-size: 1rem;
  color: #e2e8f0;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.blocker-action-btn {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: #0f172a;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.blocker-action-btn:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgb(16 185 129 / 0.3);
}

.blocker-count {
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  opacity: 0.5;
  min-width: 4rem;
  text-align: right;
}
</style>
