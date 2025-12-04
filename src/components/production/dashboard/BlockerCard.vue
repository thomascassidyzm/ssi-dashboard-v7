<template>
  <div class="blocker-card" :class="severityClass">
    <div class="blocker-icon">{{ icon }}</div>
    <div class="blocker-content">
      <h4 class="blocker-title">{{ title }}</h4>
      <p class="blocker-description">{{ description }}</p>
      <span class="blocker-count">{{ count }} items</span>
    </div>
    <button class="blocker-action" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'warning' }, // critical, warning, info
  title: { type: String, required: true },
  description: { type: String, default: '' },
  count: { type: Number, default: 0 },
  actionLabel: { type: String, default: 'Resolve' }
})

defineEmits(['action'])

const severityClass = computed(() => `severity-${props.type}`)

const icon = computed(() => {
  switch (props.type) {
    case 'critical': return '!!'
    case 'warning': return '!'
    default: return 'i'
  }
})
</script>

<style scoped>
.blocker-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #16181f;
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.blocker-card:hover {
  transform: translateX(4px);
}

.severity-critical {
  border-left-color: #e63946;
  background: linear-gradient(90deg, rgba(230, 57, 70, 0.1), transparent);
}

.severity-warning {
  border-left-color: #ffa630;
  background: linear-gradient(90deg, rgba(255, 166, 48, 0.1), transparent);
}

.severity-info {
  border-left-color: #06b6d4;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.1), transparent);
}

.blocker-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.severity-critical .blocker-icon {
  color: #e63946;
  background: rgba(230, 57, 70, 0.2);
}

.severity-warning .blocker-icon {
  color: #ffa630;
  background: rgba(255, 166, 48, 0.2);
}

.severity-info .blocker-icon {
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.2);
}

.blocker-content {
  flex: 1;
}

.blocker-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #f7f7f2;
  margin: 0 0 0.25rem 0;
}

.blocker-description {
  font-size: 0.85rem;
  color: #c1c1bb;
  margin: 0 0 0.25rem 0;
}

.blocker-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
}

.blocker-action {
  padding: 0.5rem 1rem;
  background: #23262f;
  border: 1px solid #34384a;
  border-radius: 8px;
  color: #f7f7f2;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.blocker-action:hover {
  background: #ffa630;
  color: #0a0b0f;
  border-color: #ffa630;
}
</style>
