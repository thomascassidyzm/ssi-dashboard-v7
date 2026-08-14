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
        <span class="btn-icon">✓</span> Approve All Unflagged ({{ stats.captured }})
      </button>
      <button
        class="batch-btn"
        :class="{ active: activeFilter === 'flagged' }"
        :disabled="!stats.flagged"
        @click="$emit('filter', 'flagged')"
      >
        <span class="btn-icon">⚠</span> Show Flagged ({{ stats.flagged }})
      </button>
      <button class="batch-btn" :disabled="!stats.flagged" @click="$emit('queue-redo')">
        <span class="btn-icon">↻</span> Queue Flagged for Re-record ({{ stats.flagged }})
      </button>
      <button class="batch-btn" :disabled="!playableCount" @click="$emit('play-all')">
        <span class="btn-icon">▶</span> Play All ({{ playableCount }})
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
        <span class="btn-icon">⬅️</span> Back to Recording
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
        <span class="btn-icon">⚑</span> Re-record Flagged {{ rejectedIds.length ? `(${rejectedIds.length})` : '' }}
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
        <span class="btn-icon">✓</span> Done
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
        <span class="btn-icon">✓</span> Finalize &amp; Upload {{ approvedIds.length ? `(${approvedIds.length})` : '' }}
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
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.review-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-subtitle {
  color: var(--color-paper-dim, var(--muted));
  margin: 0 0 1.5rem 0;
}

.review-summary {
  display: flex;
  gap: 1.5rem;
}

.summary-stat {
  flex: 1;
  text-align: center;
  padding: 1rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--line);
  border-radius: 8px;
}

.summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.summary-value.captured {
  color: var(--color-paper, var(--ink));
}

.summary-value.flagged {
  color: var(--color-film-red, #e63946);
  text-shadow: 0 0 20px rgba(230, 57, 70, 0.5);
}

.summary-label {
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Batch Actions */
.batch-actions {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
}

.batch-btn {
  flex: 1;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--line);
  color: var(--color-paper, var(--ink));
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  font-size: 1.1em;
}

.batch-btn:hover {
  background: var(--color-graphite, var(--surface-3));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.batch-btn.active {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.batch-btn:disabled,
.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.batch-btn:disabled:hover,
.control-btn:disabled:hover {
  transform: none;
  box-shadow: none;
  background: var(--color-slate, var(--surface-2));
}

.summary-value.approved {
  color: var(--color-emerald, #06ffa5);
}

.summary-value.rejected {
  color: var(--color-film-red, #e63946);
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--line);
  border-radius: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
}

.filter-clear {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--color-paper, var(--ink));
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.filter-clear:hover {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
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
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--line);
}

.control-btn {
  background: var(--color-slate, var(--surface-2));
  border: 2px solid var(--line);
  color: var(--color-paper, var(--ink));
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  border-color: var(--color-tungsten, var(--accent));
}

.control-btn.retake {
  background: var(--color-film-red, #e63946);
  border-color: var(--color-film-red, #e63946);
  color: #fff;
}

.control-btn.retake:hover:not(:disabled) {
  box-shadow: 0 8px 32px rgba(230, 57, 70, 0.4);
}

/* An outstanding-flag count rides on the Done button rather than blocking it:
   ending with flags left is allowed, it just must never be silent. */
.done-warn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  text-transform: none;
  opacity: 0.85;
  margin-left: 0.4rem;
}

.control-btn.success {
  background: linear-gradient(135deg, var(--color-emerald, #06ffa5), #04cc84);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.control-btn.success:hover {
  box-shadow: 0 8px 32px rgba(6, 255, 165, 0.4);
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
