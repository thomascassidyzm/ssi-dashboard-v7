<template>
  <div class="recording-queue">
    <!-- Header -->
    <div class="queue-header">
      <h3 class="queue-title">Recording Queue</h3>
      <div class="queue-stats">
        {{ recordedCount }} / {{ items.length }} recorded
      </div>
    </div>

    <!-- Filters -->
    <div class="queue-filters">
      <select v-model="localFilters.status" @change="updateFilters" class="filter-select">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="recorded">Recorded</option>
        <option value="uploaded">Uploaded</option>
      </select>

      <select v-model="localFilters.role" @change="updateFilters" class="filter-select">
        <option value="">All Roles</option>
        <option value="target">Target</option>
        <!-- value is a legacy API filter key; the label uses SSi vocabulary -->
        <option value="source">Known</option>
      </select>

      <select v-model="localFilters.cadence" @change="updateFilters" class="filter-select">
        <option value="">All Cadences</option>
        <option value="natural">Natural</option>
        <option value="slow">Slow</option>
      </select>
    </div>

    <!-- Queue Items -->
    <div class="queue-items">
      <div
        v-for="item in filteredItems"
        :key="item.uuid"
        class="queue-item"
        :class="{
          active: item.uuid === currentItemUuid,
          recorded: item.status === 'recorded',
          uploaded: item.status === 'uploaded'
        }"
        @click="emit('select', item)"
      >
        <!-- Status Indicator -->
        <div class="item-status">
          <div class="status-dot" :class="item.status || 'pending'"></div>
        </div>

        <!-- Item Content -->
        <div class="item-content">
          <p class="item-text">{{ item.text }}</p>
          <div class="item-meta">
            <span class="meta-badge">{{ item.role }}</span>
            <span class="meta-badge">{{ item.cadence }}</span>
            <span v-if="item.context" class="meta-badge">{{ item.context.cycle_type }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="item-actions">
          <svg
            v-if="item.status === 'recorded'"
            class="icon check-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredItems.length === 0" class="queue-empty">
        <p>No items match the current filters</p>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="queue-footer">
      <div class="footer-stat">
        <span class="footer-label">Pending:</span>
        <span class="footer-value">{{ pendingCount }}</span>
      </div>
      <div class="footer-stat">
        <span class="footer-label">Recorded:</span>
        <span class="footer-value">{{ recordedCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface QueueItem {
  uuid: string
  text: string
  language: string
  role: string
  cadence: string
  status: string
  context?: {
    seed_id: string
    cycle_type: string
    is_debut?: boolean
  }
}

interface Filters {
  voice: string | null
  role: string | null
  cadence: string | null
  status: string | null
}

const props = defineProps<{
  items: QueueItem[]
  currentItemUuid?: string
  filters: Filters
}>()

const emit = defineEmits<{
  (e: 'select', item: QueueItem): void
  (e: 'filter', filters: Filters): void
}>()

const localFilters = ref({ ...props.filters })

const filteredItems = computed(() => {
  return props.items.filter(item => {
    if (localFilters.value.status && item.status !== localFilters.value.status) {
      return false
    }
    if (localFilters.value.role && item.role !== localFilters.value.role) {
      return false
    }
    if (localFilters.value.cadence && item.cadence !== localFilters.value.cadence) {
      return false
    }
    return true
  })
})

const recordedCount = computed(() => {
  return props.items.filter(item => item.status === 'recorded').length
})

const pendingCount = computed(() => {
  return props.items.filter(item => item.status === 'pending').length
})

function updateFilters() {
  emit('filter', localFilters.value)
}
</script>

<style scoped>
.recording-queue {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.queue-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

.queue-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem 0;
}

.queue-stats {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: var(--color-emerald, #06ffa5);
}

.queue-filters {
  padding: 1rem 1.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

.filter-select {
  flex: 1;
  min-width: 120px;
  padding: 0.5rem 0.75rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-emerald, #06ffa5);
}

.queue-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Light mode: white card on slate canvas needs a shadow to separate */
:root[data-theme="light"] .queue-item {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.queue-item:hover {
  background: var(--surface-2);
  border-color: var(--color-emerald, #06ffa5);
}

.queue-item.active {
  background: var(--color-graphite, var(--surface-3));
  border-color: var(--color-tungsten, var(--accent));
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.2);
}

.queue-item.recorded {
  opacity: 0.6;
}

.queue-item.uploaded {
  opacity: 0.4;
}

.item-status {
  flex-shrink: 0;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.pending {
  background: var(--color-paper-dim, var(--muted));
}

.status-dot.recorded {
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 10px rgba(6, 255, 165, 0.5);
}

.status-dot.uploaded {
  background: var(--color-tungsten, var(--accent));
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-text {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.9375rem;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta-badge {
  padding: 0.125rem 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.6875rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-actions {
  flex-shrink: 0;
}

.check-icon {
  color: var(--color-emerald, #06ffa5);
}

.queue-empty {
  padding: 2rem;
  text-align: center;
}

.queue-empty p {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
}

.queue-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-graphite, var(--surface-3));
  display: flex;
  justify-content: space-around;
}

.footer-stat {
  text-align: center;
}

.footer-label {
  display: block;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.footer-value {
  display: block;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--color-emerald, #06ffa5);
}
</style>
