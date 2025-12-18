<template>
  <div class="event-log">
    <!-- Header -->
    <div class="log-header">
      <div class="header-left">
        <span class="header-title">Event Log</span>
        <span class="event-count">{{ events.length }} events</span>
      </div>
      <div class="header-right">
        <button
          class="filter-btn"
          :class="{ active: showErrors }"
          @click="showErrors = !showErrors"
          title="Show only errors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </button>
        <button
          class="clear-btn"
          @click="$emit('clear')"
          title="Clear log"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button
          class="scroll-btn"
          :class="{ active: autoScroll }"
          @click="autoScroll = !autoScroll"
          title="Auto-scroll"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Log Entries -->
    <div ref="logContainer" class="log-container" @scroll="handleScroll">
      <TransitionGroup name="event" tag="div" class="log-entries">
        <div
          v-for="(event, index) in filteredEvents"
          :key="event.time + '-' + index"
          class="log-entry"
          :class="`level-${event.level}`"
        >
          <span class="entry-time">{{ formatTime(event.time) }}</span>
          <span class="entry-level" :class="`level-${event.level}`">
            {{ getLevelIcon(event.level) }}
          </span>
          <span class="entry-event">{{ event.event }}</span>
          <span class="entry-message">{{ event.message }}</span>
        </div>
      </TransitionGroup>

      <!-- Empty State -->
      <div v-if="filteredEvents.length === 0" class="empty-state">
        <span v-if="showErrors">No errors to display</span>
        <span v-else>Waiting for events...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  maxEvents: {
    type: Number,
    default: 100
  }
})

defineEmits(['clear'])

// State
const logContainer = ref(null)
const autoScroll = ref(true)
const showErrors = ref(false)
const userScrolled = ref(false)

// Computed
const filteredEvents = computed(() => {
  let filtered = props.events
  if (showErrors.value) {
    filtered = filtered.filter(e => e.level === 'error' || e.level === 'warning')
  }
  return filtered.slice(0, props.maxEvents)
})

// Watch for new events and auto-scroll
watch(() => props.events.length, async () => {
  if (autoScroll.value && !userScrolled.value) {
    await nextTick()
    scrollToTop()
  }
})

// Methods
function formatTime(timestamp) {
  if (!timestamp) return '--:--:--'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function getLevelIcon(level) {
  switch (level) {
    case 'error': return 'ERR'
    case 'warning': return 'WRN'
    case 'success': return 'OK'
    case 'info':
    default: return 'INF'
  }
}

function scrollToTop() {
  if (logContainer.value) {
    logContainer.value.scrollTop = 0
  }
}

function handleScroll() {
  if (!logContainer.value) return
  // If user scrolled away from top, disable auto-scroll temporarily
  userScrolled.value = logContainer.value.scrollTop > 20
}
</script>

<style scoped>
.event-log {
  background: var(--void, #0f172a);
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header */
.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--elevated, #334155);
  border-bottom: 1px solid var(--border, #334155);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text, #f1f5f9);
}

.event-count {
  font-size: 0.6875rem;
  color: var(--text-muted, #64748b);
  padding: 0.125rem 0.5rem;
  background: var(--void, #0f172a);
  border-radius: 4px;
}

.header-right {
  display: flex;
  gap: 0.25rem;
}

.filter-btn,
.clear-btn,
.scroll-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border, #334155);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn svg,
.clear-btn svg,
.scroll-btn svg {
  width: 14px;
  height: 14px;
  color: var(--text-muted, #64748b);
}

.filter-btn:hover,
.clear-btn:hover,
.scroll-btn:hover {
  background: var(--border, #334155);
}

.filter-btn.active {
  border-color: var(--error, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

.filter-btn.active svg {
  color: var(--error, #ef4444);
}

.scroll-btn.active {
  border-color: var(--accent, #10b981);
  background: rgba(16, 185, 129, 0.1);
}

.scroll-btn.active svg {
  color: var(--accent, #10b981);
}

/* Log Container */
.log-container {
  flex: 1;
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Log Entry */
.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.4;
  background: var(--elevated, #334155);
}

.log-entry.level-error {
  background: rgba(239, 68, 68, 0.1);
}

.log-entry.level-warning {
  background: rgba(234, 179, 8, 0.1);
}

.log-entry.level-success {
  background: rgba(34, 197, 94, 0.1);
}

.entry-time {
  color: var(--text-muted, #64748b);
  white-space: nowrap;
}

.entry-level {
  font-weight: 700;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  white-space: nowrap;
}

.entry-level.level-info {
  color: var(--info, #3b82f6);
  background: rgba(59, 130, 246, 0.15);
}

.entry-level.level-success {
  color: var(--success, #22c55e);
  background: rgba(34, 197, 94, 0.15);
}

.entry-level.level-warning {
  color: var(--warning, #eab308);
  background: rgba(234, 179, 8, 0.15);
}

.entry-level.level-error {
  color: var(--error, #ef4444);
  background: rgba(239, 68, 68, 0.15);
}

.entry-event {
  color: var(--text-dim, #94a3b8);
  white-space: nowrap;
}

.entry-message {
  color: var(--text, #f1f5f9);
  flex: 1;
  word-break: break-word;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-muted, #64748b);
  font-size: 0.8125rem;
}

/* Transitions */
.event-enter-active {
  transition: all 0.2s ease;
}

.event-leave-active {
  transition: all 0.15s ease;
}

.event-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.event-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Scrollbar */
.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: transparent;
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--border-light, #475569);
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted, #64748b);
}
</style>
