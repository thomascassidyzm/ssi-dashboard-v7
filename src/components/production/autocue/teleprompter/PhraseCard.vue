<template>
  <div class="phrase-card" :class="state">
    <div class="phrase-marker">
      <span v-if="uploaded" class="uploaded-dot"></span>
      <svg v-if="state === 'done'" class="marker-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      <svg v-else-if="state === 'current'" class="marker-glyph current-marker" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      <svg v-else class="marker-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg>
    </div>

    <div class="phrase-content">
      <!-- Slow cadence label -->
      <div v-if="isSlowCadence" class="cadence-label">SLOW</div>

      <!-- Normal display -->
      <!-- The line the speaker reads ALOUD. Under an LTR paragraph an Arabic
           phrase puts its trailing neutral (`!` `.` `,`) on the visual right;
           `dir` from the phrase's own script fixes it. -->
      <div v-if="!showGaps" class="phrase-text" :class="{ 'slow-cadence': isSlowCadence }" :dir="dirFor(phrase.text)">
        {{ phrase.text }}
      </div>

      <!-- Chunk-level gap display for Pass 2.
           Each chunk is a group of words the speaker reads without pausing;
           pauses (gap markers) fall BETWEEN chunks. -->
      <!-- Chunks are sibling elements with gap markers BETWEEN them, so the
           order they lay out in IS the reading order — an LTR container renders
           an Arabic phrase back-to-front and puts every pause in the wrong
           place. `dir` belongs on the container here, not on each chunk. -->
      <div v-else class="phrase-with-gaps" :class="{ 'slow-cadence': isSlowCadence }" :dir="dirFor(phrase.text)">
        <template v-for="(chunk, i) in displayChunks" :key="i">
          <span class="chunk-segment" :class="{ 'has-absorbed-glue': chunk.mergedGlue && chunk.mergedGlue.length > 0 }">
            {{ chunk.text }}
          </span>
          <span v-if="i < displayChunks.length - 1" class="gap-marker"></span>
        </template>
      </div>

      <div class="phrase-translation" v-if="phrase.translation" :dir="dirFor(phrase.translation)">
        {{ phrase.translation }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolvePhraseChunks } from '@/utils/phraseChunks'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  phrase: { type: Object, required: true },
  state: { type: String, default: 'upcoming' }, // done, current, upcoming
  showGaps: { type: Boolean, default: false },
  uploaded: { type: Boolean, default: false }
})

// Slow cadence detection — from phrase's own cadence field (optimizer mode)
const isSlowCadence = computed(() => props.phrase.cadence === 'slow')

// Resolve chunks from whichever format the phrase provides. Shared with the
// recorder (src/utils/phraseChunks.js) so the gap markers drawn here and the
// silence the VAD will tolerate are computed from the same chunk map — the UI
// must never invite a pause the recorder cannot survive.
const displayChunks = computed(() => resolvePhraseChunks(props.phrase).chunks)
</script>

<style scoped>
.phrase-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  transition: opacity 0.6s ease, background 0.4s ease, border-color 0.4s ease;
  border-left: 3px solid transparent;
}

.phrase-marker {
  min-width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.marker-glyph { width: 20px; height: 20px; }

/* State: Done */
.phrase-card.done {
  opacity: 0.35;
}

.phrase-card.done .phrase-marker {
  color: var(--success);
}

.phrase-card.done .phrase-text {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-color: var(--success);
  text-decoration-thickness: 1px;
}

/* State: Current */
.phrase-card.current {
  opacity: 1;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-left-color: var(--accent);
}

.phrase-card.current .phrase-marker {
  color: var(--accent);
}

.phrase-card.current .marker-glyph { width: 24px; height: 24px; }

/* The current card's amber highlight used to be painted onto the TEXT, which
   made the natural-speed line amber too — so natural and slow read identically
   and the "white for natural, amber for slow" promise on the script-loaded
   screen was false. The current-card cue now lives in the card (border, wash,
   marker); the text itself stays the ink colour for natural, and .slow-cadence
   below repaints only the slow pass amber. */
.phrase-card.current .phrase-text,
.phrase-card.current .phrase-with-gaps {
  font-size: 2rem;
  font-weight: 600;
  color: var(--ink);
}

/* State: Upcoming */
.phrase-card.upcoming {
  opacity: 0.6;
}

.phrase-card.upcoming .phrase-marker {
  color: var(--muted);
}

.phrase-content {
  flex: 1;
}

.phrase-text {
  /* text-align pinned: the line binds `dir` so its punctuation resolves
     correctly, but the teleprompter's left-hung column must not move. */
  text-align: left;
  /* Deliberately large — this is read aloud from a phone at arm's length. The
     shell font, not a serif display face: the estate has one typeface. */
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.4;
}

.phrase-with-gaps {
  /* text-align pinned — see .phrase-text. The chunk ORDER mirrors for an RTL
     phrase, which is the fix; the column itself must stay where it is. */
  text-align: left;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.9;
}

/* A chunk is a group of words the speaker reads without pausing.
   Internal spaces inside chunk.text are preserved naturally. */
.chunk-segment {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  white-space: nowrap;
  transition: background 0.4s ease, border-color 0.4s ease;
}

.phrase-card.current .chunk-segment {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

/* Chunks that absorbed glue words are functionally identical to pure-LEGO
   chunks for the speaker — but we keep a subtle hint for dev/debugging mode. */
.chunk-segment.has-absorbed-glue {
  /* no visual distinction by default — speaker shouldn't care. */
}

/* The pause between two chunks, drawn. Solid amber rule, no pulse and no glow —
   it marks a place, it does not need to attract attention to itself. */
.gap-marker {
  display: inline-block;
  width: 40px;
  height: 4px;
  background: var(--accent);
  margin: 0 0.75rem;
  border-radius: 2px;
  vertical-align: middle;
}

/* Slow cadence treatment. Micro-label, the one place the house keeps caps. */
.cadence-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.slow-cadence {
  color: var(--accent) !important;
}

/* Uploaded indicator */
.uploaded-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  margin-right: 0.25rem;
  vertical-align: middle;
}

.phrase-translation {
  text-align: left;
  font-size: 1rem;
  color: var(--muted);
  font-style: italic;
  margin-top: 0.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .phrase-card, .chunk-segment { transition: none; }
}
</style>
