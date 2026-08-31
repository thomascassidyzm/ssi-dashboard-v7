<template>
  <div class="review-interface">
    <!-- Review Header -->
    <div class="review-header">
      <h2 class="review-title">Session Review</h2>
      <p class="review-subtitle">
        Recording complete! Review AI-detected segments and approve for upload.
      </p>
      <div class="review-summary">
        <div class="summary-stat">
          <span class="summary-value captured">{{ stats.captured }}</span>
          <span class="summary-label">Takes Captured</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value flagged">{{ stats.flagged }}</span>
          <span class="summary-label">Needs a Look</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value approved">{{ approvedIds.length }}</span>
          <span class="summary-label">Approved</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value rejected">{{ rejectedIds.length }}</span>
          <span class="summary-label">Flagged for Re-record</span>
        </div>
      </div>
    </div>

    <!-- Batch Actions -->
    <div class="batch-actions">
      <button class="batch-btn" @click="$emit('approve-all')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> Approve All Unflagged ({{ stats.captured }})
      </button>
      <button
        class="batch-btn"
        :class="{ active: activeFilter === 'flagged' }"
        :disabled="!stats.flagged"
        @click="$emit('filter', 'flagged')"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg> Show Flagged ({{ stats.flagged }})
      </button>
      <button class="batch-btn" :disabled="!stats.flagged" @click="$emit('queue-redo')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg> Queue Flagged for Re-record ({{ stats.flagged }})
      </button>
      <button class="batch-btn" :disabled="!playableCount" @click="$emit('play-all')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 13 8-13 8z" /></svg> Play All ({{ playableCount }})
      </button>
    </div>

    <!-- Active filter: never leave the grid narrowed with no way back -->
    <div v-if="activeFilter" class="filter-bar">
      <span>Showing flagged takes only — {{ visible.length }} of {{ segments.length }}</span>
      <button class="filter-clear" @click="$emit('clear-filter')">Show all</button>
    </div>

    <!-- Segments Grid -->
    <div class="segments-grid">
      <SegmentCard
        v-for="segment in visible"
        :key="segment.id"
        :segment="segment"
        :playing="segment.id === playingSegmentId"
        :status="statusOf(segment)"
        :playing-chunk-index="playingChunkIndexOf(segment)"
        :playback-source="playbackSources[segment.id] || ''"
        @play="$emit('play', $event)"
        @play-chunk="(seg, chunk) => $emit('play-chunk', seg, chunk)"
        @redo="$emit('reject', $event)"
        @approve="$emit('approve', $event)"
      />
    </div>

    <!-- Final Actions -->
    <div class="final-actions">
      <button class="control-btn" @click="$emit('back')">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg> Back to Recording
      </button>

      <!-- The button that makes flagging mean something: go round again over
           the flagged takes only. Script mode uploads as it records, so a flag
           on its own changes nothing until a new take supersedes the old. -->
      <button
        v-if="scriptMode"
        class="control-btn retake"
        :disabled="!rejectedIds.length"
        :title="rejectedIds.length
          ? 'Record the flagged takes again — each new take replaces the old one'
          : 'Flag at least one take first'"
        @click="$emit('re-record-flagged')"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg> Re-record Flagged {{ rejectedIds.length ? `(${rejectedIds.length})` : '' }}
      </button>

      <!-- Script mode has already uploaded every take, so there is nothing left
           to "finalize & upload" — saying so would be a lie, and the old
           handler re-POSTed the bytes under the wrong identity. It ends the
           session instead, and says plainly if flags are still outstanding. -->
      <button
        v-if="scriptMode"
        class="control-btn success"
        :title="rejectedIds.length
          ? `${rejectedIds.length} take(s) still flagged — ending now leaves them as they are`
          : 'All takes saved — end the session'"
        @click="$emit('finalize')"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> Done
        <span v-if="rejectedIds.length" class="done-warn">{{ rejectedIds.length }} still flagged</span>
      </button>

      <!-- Queue mode still uploads at the end, where approval IS the gate.
           Finalizing with nothing approved uploads nothing and resets the
           session, taking every unsaved take with it. Don't offer that. -->
      <button
        v-else
        class="control-btn success"
        :disabled="!approvedIds.length"
        :title="approvedIds.length ? 'Upload approved takes' : 'Approve at least one take first'"
        @click="$emit('finalize')"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> Finalize &amp; Upload {{ approvedIds.length ? `(${approvedIds.length})` : '' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SegmentCard from './SegmentCard.vue'

const props = defineProps({
  segments: { type: Array, required: true },
  playingSegmentId: { type: String, default: null },
  // segmentId -> 'stored' | 'local': which bytes each play button will fetch.
  // The review screen must never let a raw local preview read as the stored,
  // processed clip — that is the whole point of the control.
  playbackSources: { type: Object, default: () => ({}) },
  // `<segmentId>:<chunkIndex>` of the single LEGO piece now playing, or null.
  playingChunkKey: { type: String, default: null },
  approvedIds: { type: Array, default: () => [] },
  rejectedIds: { type: Array, default: () => [] },
  activeFilter: { type: String, default: null },
  // Script mode uploads as it records; queue mode uploads at the end. That one
  // difference decides what the final actions can honestly offer.
  scriptMode: { type: Boolean, default: false }
})

defineEmits([
  'approve', 'reject', 'approve-all', 'queue-redo', 'filter', 'clear-filter',
  'play', 'play-chunk', 'play-all', 'back', 're-record-flagged', 'finalize'
])

// A take is flagged only for something observable: nothing captured, or a
// file too small to hold speech.
const isFlagged = s => !s.hasRecording || !!s.issues?.length

// Which piece of THIS card is playing — null for every other card, so only one
// piece anywhere in the grid is ever lit.
function playingChunkIndexOf(segment) {
  if (!props.playingChunkKey) return null
  const [segmentId, index] = props.playingChunkKey.split(':')
  return segmentId === segment.id ? Number(index) : null
}

const visible = computed(() => (
  props.activeFilter === 'flagged' ? props.segments.filter(isFlagged) : props.segments
))

const playableCount = computed(() => props.segments.filter(s => s.audioUrl).length)

function statusOf(segment) {
  if (props.approvedIds.includes(segment.id)) return 'approved'
  if (props.rejectedIds.includes(segment.id)) return 'rejected'
  return null
}

const stats = computed(() => {
  const flagged = props.segments.filter(isFlagged).length
  return { flagged, captured: props.segments.length - flagged, total: props.segments.length }
})
</script>

<style scoped>
.review-interface {
  max-width: 1400px;
  margin: 0 auto;
}

.review-header {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.review-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
}

.review-subtitle {
  font-size: 0.9375rem;
  color: var(--muted);
  margin: 0 0 1.5rem 0;
}

.review-summary {
  display: flex;
  gap: 0.75rem;
}

.summary-stat {
  flex: 1;
  text-align: center;
  padding: 1rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.summary-value {
  font-size: 1.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: block;
  margin-bottom: 0.25rem;
}

.summary-value.captured { color: var(--ink); }
.summary-value.flagged { color: var(--danger); }
.summary-value.approved { color: var(--success); }
.summary-value.rejected { color: var(--danger); }

.summary-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Batch Actions */
.batch-actions {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
}

.batch-btn {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  width: 16px;
  height: 16px;
  flex: none;
}

.batch-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.batch-btn.active {
  background: var(--accent);
  color: var(--canvas);
  border-color: var(--accent);
}

.batch-btn:disabled,
.control-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 0.875rem;
  color: var(--muted);
}

.filter-clear {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 0.8125rem;
  min-height: 44px;
}

.filter-clear:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Segments Grid */
.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

/* Final Actions */
.final-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--line);
}

.control-btn {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9375rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.control-btn.retake {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--canvas);
}

.control-btn.retake:hover:not(:disabled) {
  border-color: var(--danger);
  opacity: 0.9;
}

/* An outstanding-flag count rides on the Done button rather than blocking it:
   ending with flags left is allowed, it just must never be silent. */
.done-warn {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.85;
  margin-left: 0.4rem;
}

.control-btn.success {
  background: var(--accent-2);
  border-color: var(--accent-2);
  color: var(--canvas);
}

.control-btn.success:hover:not(:disabled) {
  border-color: var(--accent-2);
  opacity: 0.9;
}

@media (max-width: 768px) {
  .review-summary {
    flex-direction: column;
  }

  .batch-actions {
    flex-direction: column;
  }

  .segments-grid {
    grid-template-columns: 1fr;
  }

  .final-actions {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
