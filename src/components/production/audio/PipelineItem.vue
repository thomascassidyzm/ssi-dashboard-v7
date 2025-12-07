<template>
  <div class="pipeline-item" :class="[`status-${item.status}`, { expanded }]">
    <div class="item-header" @click="expanded = !expanded">
      <div class="item-status-icon">
        <span v-if="item.status === 'pending'" class="icon-pending">...</span>
        <span v-else-if="item.status === 'processing'" class="icon-processing spinning">*</span>
        <span v-else-if="item.status === 'complete'" class="icon-complete">OK</span>
        <span v-else-if="item.status === 'failed'" class="icon-failed">X</span>
      </div>

      <div class="item-info">
        <span class="item-id">{{ item.seedId || item.uuid?.slice(0, 8) }}</span>
        <span class="item-text">{{ truncateText(item.targetText) }}</span>
      </div>

      <div class="item-progress" v-if="item.status === 'processing'">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: item.progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ item.progress }}%</span>
      </div>

      <div class="item-meta">
        <span class="item-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</span>
        <span class="item-time">{{ formatTime(item.queuedAt) }}</span>
      </div>

      <button class="expand-btn">{{ expanded ? '^' : 'v' }}</button>
    </div>

    <Transition name="expand">
      <div v-if="expanded" class="item-details">
        <div class="detail-row">
          <span class="detail-label">UUID:</span>
          <span class="detail-value mono">{{ item.uuid }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Target:</span>
          <span class="detail-value">{{ item.targetText }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Known:</span>
          <span class="detail-value">{{ item.knownText }}</span>
        </div>
        <div class="detail-row" v-if="item.error">
          <span class="detail-label">Error:</span>
          <span class="detail-value error">{{ item.error }}</span>
        </div>

        <div class="item-actions">
          <button
            v-if="item.status === 'failed'"
            class="action-btn retry"
            @click="$emit('retry', item)"
          >
            Retry
          </button>
          <button
            v-if="item.status === 'complete'"
            class="action-btn play"
            @click="$emit('play', item)"
          >
            Play
          </button>
          <button
            class="action-btn remove"
            @click="$emit('remove', item)"
          >
            Remove
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  item: { type: Object, required: true }
})

defineEmits(['retry', 'play', 'remove'])

const expanded = ref(false)

function truncateText(text, maxLength = 40) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

function formatDuration(seconds) {
  if (!seconds) return ''
  return `${seconds.toFixed(1)}s`
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.pipeline-item {
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.pipeline-item:hover {
  border-color: #ffa630;
}

.pipeline-item.status-processing {
  border-color: #06b6d4;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
}

.pipeline-item.status-complete {
  border-color: #06ffa5;
}

.pipeline-item.status-failed {
  border-color: #e63946;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.item-status-icon {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.icon-pending { color: #c1c1bb; }
.icon-processing { color: #06b6d4; }
.icon-complete { color: #06ffa5; }
.icon-failed { color: #e63946; }

.spinning {
  display: inline-block;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
  display: block;
}

.item-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1rem;
  color: #f7f7f2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 150px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #475569;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #06b6d4;
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
}

.progress-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #06b6d4;
  min-width: 35px;
}

.item-meta {
  text-align: right;
  flex-shrink: 0;
}

.item-duration,
.item-time {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: #c1c1bb;
}

.expand-btn {
  background: transparent;
  border: none;
  color: #c1c1bb;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
}

/* Expanded Details */
.item-details {
  padding: 1rem;
  background: #0f172a;
  border-top: 1px solid #475569;
}

.detail-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.detail-label {
  color: #c1c1bb;
  min-width: 60px;
  flex-shrink: 0;
}

.detail-value {
  color: #f7f7f2;
}

.detail-value.mono {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}

.detail-value.error {
  color: #e63946;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 0.4rem 0.75rem;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 6px;
  color: #f7f7f2;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #475569;
}

.action-btn.retry:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
}

.action-btn.play:hover {
  background: rgba(6, 255, 165, 0.2);
  border-color: #06ffa5;
}

.action-btn.remove:hover {
  background: rgba(230, 57, 70, 0.2);
  border-color: #e63946;
}

/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
