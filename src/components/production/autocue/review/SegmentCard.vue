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
          {{ status === 'approved' ? '✓ Approved' : '⚑ Flagged' }}
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
      ⚠ {{ segment.issues[0] }}
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
          ⚠ {{ chunks.length }} heard, script has {{ segment.chunksExpected }}
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
          <span class="btn-icon">{{ playingChunkIndex === chunk.index ? '⏸' : '▶' }}</span>
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
        <span class="btn-icon">{{ playing ? '⏸' : '▶' }}</span> {{ playing ? 'Playing' : 'Play' }}
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
        <span class="btn-icon">⚑</span> {{ status === 'rejected' ? 'Flagged' : 'Flag' }}
      </button>
      <button
        class="segment-btn approve"
        :class="{ active: status === 'approved' }"
        :title="status === 'approved' ? 'Approved for upload — click to undo' : 'Approve this take for upload'"
        @click="$emit('approve', segment)"
      >
        <span class="btn-icon">✓</span> {{ status === 'approved' ? 'Approved' : 'Approve' }}
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
  background: var(--color-shadow, var(--surface));
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid var(--color-graphite, var(--surface-3));
  transition: all 0.3s ease;
}

.segment-card.flagged {
  border-left-color: var(--color-film-red, #e63946);
}

.segment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.segment-label {
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-paper, var(--ink));
}

.segment-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.2rem;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 0.75rem;
  font-style: italic;
}

.segment-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim, var(--muted));
}

.segment-warning {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-film-red, #e63946);
  background: rgba(230, 57, 70, 0.12);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.75rem;
}

/* LEGO pieces of a slow-pass take */
.chunk-strip {
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
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
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-paper-dim, var(--muted));
}

.chunk-warning {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--color-tungsten, var(--accent));
  cursor: help;
}

.chunk-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chunk-btn {
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.chunk-btn:hover {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.chunk-btn.playing {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.segment-actions {
  display: flex;
  gap: 0.5rem;
}

.segment-btn {
  flex: 1;
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.btn-icon {
  font-size: 0.9em;
}

.segment-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.segment-btn:disabled:hover {
  background: var(--color-void, var(--canvas));
  color: var(--color-paper, var(--ink));
  border-color: var(--color-graphite, var(--surface-3));
}

.segment-btn.playing {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.segment-btn:hover {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-color: var(--color-tungsten, var(--accent));
}

.source-tag {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.55rem; letter-spacing: 0.08em;
  padding: 0.05rem 0.28rem; border-radius: 3px; margin-left: 0.35rem;
}
.source-tag.stored { background: var(--color-emerald, #06ffa5); color: #04211a; font-weight: 700; }
.source-tag.local { background: #ffb703; color: #241a00; font-weight: 700; }

.segment-btn.approve:hover {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
}

/* A verdict has to be visible from across the booth, not just remembered. */
.segment-btn.approve.active {
  background: var(--color-emerald, #06ffa5);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.segment-btn.redo.active {
  background: var(--color-film-red, #e63946);
  border-color: var(--color-film-red, #e63946);
  color: var(--color-void, var(--canvas));
}

.segment-card.approved {
  border-left-color: var(--color-emerald, #06ffa5);
  box-shadow: inset 0 0 0 1px rgba(6, 255, 165, 0.25);
}

/* Flagged means "come back to this", so the card has to pull the eye across a
   grid of thirty, not recede into it — it used to be dimmed to 0.75, which read
   as "dealt with, ignore me": exactly backwards for the one state the recordist
   is scanning for. */
.segment-card.rejected {
  border-left-color: var(--color-film-red, #e63946);
  box-shadow: inset 0 0 0 1px rgba(230, 57, 70, 0.45);
  background: rgba(230, 57, 70, 0.07);
}

.take-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  margin-left: 0.5rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  text-transform: uppercase;
  background: rgba(255, 166, 48, 0.18);
  color: var(--color-tungsten, var(--accent));
}

.verdict-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  margin-left: 0.5rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.verdict-badge.approved {
  background: rgba(6, 255, 165, 0.2);
  color: var(--color-emerald, #06ffa5);
}

.verdict-badge.rejected {
  background: rgba(230, 57, 70, 0.2);
  color: var(--color-film-red, #e63946);
}

:root[data-theme="light"] .verdict-badge.approved {
  background: rgba(4, 120, 87, 0.14);
  color: #03543c;
}

:root[data-theme="light"] .verdict-badge.rejected {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

/* Light-mode refinements: dark mode untouched.
   Lift the faint button border, and darken the warning text so it clears
   WCAG AA on the pale card. */
:root[data-theme="light"] .segment-warning {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

:root[data-theme="light"] .segment-btn {
  border-color: var(--line);
}

:root[data-theme="light"] .segment-card:hover {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}
</style>
