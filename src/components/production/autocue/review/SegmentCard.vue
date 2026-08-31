<template>
  <div class="segment-card" :class="[status, { flagged: hasWarning }]">
    <div class="segment-header">
      <div class="segment-label">
        {{ segment.label }}
        <!-- A retake in the same voice sounds like the take it replaced, so
             say plainly that it landed and which take you are hearing. -->
        <span v-if="segment.takeNumber > 1" class="take-badge">
          Take {{ segment.takeNumber }}
        </span>
        <span v-if="status" class="verdict-badge" :class="status">
          <svg v-if="status === 'approved'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          <svg v-else class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
          {{ status === 'approved' ? 'Approved' : 'Flagged' }}
        </span>
      </div>
    </div>

    <div class="segment-text">"{{ segment.text }}"</div>

    <div class="segment-meta">
      <span>Duration: {{ segment.duration }}s</span>
    </div>

    <!-- The one thing we can honestly say without listening: this file is too
         small to hold speech. No score, no waveform — both were decorative. -->
    <div v-if="hasWarning" class="segment-warning">
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
      <span>{{ segment.issues[0] }}</span>
    </div>

    <!-- The pieces of a slow-pass take, one button each.
         A slow take is a whole phrase read in one go with a deliberate pause at
         every LEGO boundary; the recorder hears those pauses and now keeps
         their timings, so each piece can be heard on its own. That answers the
         two questions the whole-take button cannot: was it cut where the LEGOs
         actually are, and does the piece stand up in isolation — and it means
         one bad LEGO costs one piece, not the whole phrase again. -->
    <div v-if="chunks.length" class="chunk-strip">
      <div class="chunk-strip-head">
        <span class="chunk-strip-title">LEGO pieces</span>
        <span v-if="chunkMismatch" class="chunk-warning" :title="chunkMismatchTitle">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          {{ chunks.length }} heard, script has {{ segment.chunksExpected }}
        </span>
      </div>
      <div class="chunk-list">
        <button
          v-for="chunk in chunks"
          :key="chunk.index"
          class="chunk-btn"
          :class="{ playing: playingChunkIndex === chunk.index }"
          :title="`Play this piece on its own (${(chunk.durationMs / 1000).toFixed(1)}s)`"
          @click="$emit('play-chunk', segment, chunk)"
        >
          <template v-if="playingChunkIndex === chunk.index"><svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg></template>
          <template v-else><svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 13 8-13 8z" /></svg></template>
          {{ chunk.label }}
        </button>
      </div>
    </div>

    <div class="segment-actions">
      <button
        class="segment-btn"
        :class="{ playing }"
        :disabled="!hasAudio"
        :title="hasAudio ? playHint : 'No audio captured for this phrase'"
        @click="$emit('play', segment)"
      >
        <template v-if="playing"><svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg></template>
        <template v-else><svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 13 8-13 8z" /></svg></template>
        {{ playing ? 'Playing' : 'Play' }}
        <!-- Stored bytes and raw local bytes never wear the same word. A raw
             preview that reads as "the take" is exactly how a butchered trim
             chain sounded perfect for months. -->
        <span v-if="hasAudio && sourceTag" class="source-tag" :class="playbackSource">{{ sourceTag }}</span>
      </button>
      <button
        class="segment-btn redo"
        :class="{ active: status === 'rejected' }"
        :title="status === 'rejected' ? 'Flagged for re-record — click to unflag' : 'Flag this take for re-record'"
        @click="$emit('redo', segment)"
      >
<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg> {{ status === 'rejected' ? 'Flagged' : 'Flag' }}
      </button>
      <button
        class="segment-btn approve"
        :class="{ active: status === 'approved' }"
        :title="status === 'approved' ? 'Approved for upload — click to undo' : 'Approve this take for upload'"
        @click="$emit('approve', segment)"
      >
<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> {{ status === 'approved' ? 'Approved' : 'Approve' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { STORED_HINT, LOCAL_HINT } from '@/composables/useStoredClip'

const props = defineProps({
  segment: { type: Object, required: true },
  playing: { type: Boolean, default: false },
  // 'approved' | 'rejected' | null — the verdict this card is carrying, so the
  // Approve/Redo clicks land somewhere the recordist can actually see.
  status: { type: String, default: null },
  // Index of the LEGO piece of THIS take that is currently playing, or null.
  playingChunkIndex: { type: Number, default: null },
  // Which bytes the play button will actually fetch: 'stored' (the processed
  // clip off the server) or 'local' (the raw capture still in this browser).
  playbackSource: { type: String, default: '' }
})

defineEmits(['play', 'redo', 'approve', 'play-chunk'])

// A card with no captured audio says so on the button instead of offering a
// control that can only ever be silent.
const hasAudio = computed(() => !!props.segment.audioUrl)

const sourceTag = computed(() =>
  props.playbackSource === 'stored' ? 'STORED'
    : props.playbackSource === 'local' ? 'RAW LOCAL'
      : ''
)
const playHint = computed(() =>
  props.playbackSource === 'stored'
    ? STORED_HINT
    : props.playbackSource === 'local'
      ? LOCAL_HINT
      : 'Play this take'
)

const hasWarning = computed(() => !!props.segment.issues?.length)

// Only a take the recorder actually heard pauses in has pieces. A phrase read
// straight through has none, and its card looks exactly as it did before.
const chunks = computed(() => (hasAudio.value && props.segment.chunks) || [])

// Pieces heard ≠ pieces the script asks for. Said out loud rather than hidden,
// because it is precisely what a recordist is checking for: a missed pause
// welds two LEGOs into one piece, an extra breath splits one in two, and either
// way the labels are withheld (see takeChunks.js) so nothing is mislabelled.
const chunkMismatch = computed(() =>
  chunks.value.length > 0 && props.segment.chunksExpected > 0 && !props.segment.chunksMatchScript
)
const chunkMismatchTitle = computed(() =>
  'The pauses heard in this take do not line up with the script\'s LEGO boundaries, '
  + 'so the pieces are numbered rather than named. Listen through and re-record if a piece is cut wrong.'
)
</script>

<style scoped>
.segment-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--surface-3);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.segment-card.flagged {
  border-left-color: var(--danger);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.segment-label {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--ink);
}

.segment-text {
  font-size: 1.0625rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
  font-style: italic;
}

.segment-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.8125rem;
  color: var(--muted);
}

.segment-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.75rem;
}

/* LEGO pieces of a slow-pass take */
.chunk-strip {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
}

.chunk-strip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.chunk-strip-title {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.chunk-warning {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--accent);
  cursor: help;
}

.chunk-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chunk-btn {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.4rem 0.7rem;
  border-radius: 9999px;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.chunk-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chunk-btn.playing {
  background: var(--accent);
  color: var(--canvas);
  border-color: var(--accent);
}

.segment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.segment-btn {
  flex: 1 1 auto;
  min-width: 0;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.5rem;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  font-size: 0.8125rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.btn-icon {
  width: 15px;
  height: 15px;
  flex: none;
}

.badge-icon {
  width: 12px;
  height: 12px;
  vertical-align: -0.1em;
}

.segment-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.segment-btn:disabled:hover {
  border-color: var(--line);
  color: var(--ink);
}

.segment-btn.playing {
  background: var(--accent);
  color: var(--canvas);
  border-color: var(--accent);
}

.segment-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

/* Stored bytes and raw local bytes never wear the same word — and never the
   same colour. */
.source-tag {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  padding: 0.05rem 0.3rem;
  border-radius: 9999px;
  margin-left: 0.35rem;
  font-weight: 700;
}
.source-tag.stored { background: var(--success); color: var(--canvas); }
.source-tag.local { background: var(--accent); color: var(--canvas); }

.segment-btn.approve:hover:not(:disabled) {
  border-color: var(--success);
  color: var(--success);
}

/* A verdict has to be visible from across the booth, not just remembered. */
.segment-btn.approve.active,
.segment-btn.approve.active:hover {
  background: var(--success);
  border-color: var(--success);
  color: var(--canvas);
}

.segment-btn.redo:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

.segment-btn.redo.active,
.segment-btn.redo.active:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--canvas);
}

.segment-card.approved {
  border-left-color: var(--success);
}

/* Flagged means "come back to this", so the card has to pull the eye across a
   grid of thirty, not recede into it — it used to be dimmed to 0.75, which read
   as "dealt with, ignore me": exactly backwards for the one state the recordist
   is scanning for. */
.segment-card.rejected {
  border-left-color: var(--danger);
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.take-badge,
.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 500;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.take-badge {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.verdict-badge.approved {
  background: color-mix(in srgb, var(--success) 16%, transparent);
  border-color: var(--success);
  color: var(--success);
}

.verdict-badge.rejected {
  background: color-mix(in srgb, var(--danger) 16%, transparent);
  border-color: var(--danger);
  color: var(--danger);
}
</style>
