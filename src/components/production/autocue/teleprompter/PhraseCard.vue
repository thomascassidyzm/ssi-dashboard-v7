<template>
  <div class="phrase-card" :class="state">
    <div class="phrase-marker">
      <span v-if="uploaded" class="uploaded-dot"></span>
      <span v-if="state === 'done'">✓</span>
      <span v-else-if="state === 'current'" class="current-marker">══►</span>
      <span v-else>○</span>
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
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border-left: 3px solid transparent;
}

.phrase-marker {
  font-size: 1.2rem;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

/* State: Done */
.phrase-card.done {
  opacity: 0.35;
}

.phrase-card.done .phrase-marker {
  color: var(--color-emerald, #06ffa5);
}

.phrase-card.done .phrase-text {
  color: var(--color-paper-dim, var(--muted));
  text-decoration: line-through;
  text-decoration-color: var(--color-emerald, #06ffa5);
  text-decoration-thickness: 1px;
}

/* State: Current */
.phrase-card.current {
  opacity: 1;
  background: linear-gradient(90deg, transparent, rgba(255, 166, 48, 0.1), transparent);
  border-left-color: var(--color-tungsten, var(--accent));
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.2);
}

.phrase-card.current .phrase-marker {
  color: var(--color-tungsten, var(--accent));
  font-size: 1.5rem;
}

/* The current card's amber highlight used to be painted onto the TEXT, which
   made the natural-speed line amber too — so natural and slow read identically
   and the "white for natural, amber for slow" promise on the script-loaded
   screen was false. The current-card cue now lives in the card (border, wash,
   marker); the text itself stays white for natural, and .slow-cadence below
   repaints only the slow pass amber. */
.phrase-card.current .phrase-text,
.phrase-card.current .phrase-with-gaps {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  /* One rule for both themes — a white glow is invisible on the light canvas,
     so this needs no :root[data-theme=light] override. */
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
}

/* State: Upcoming */
.phrase-card.upcoming {
  opacity: 0.6;
}

.phrase-card.upcoming .phrase-marker {
  color: var(--color-paper-dim, var(--muted));
}

.phrase-content {
  flex: 1;
}

.phrase-text {
  /* text-align pinned: the line binds `dir` so its punctuation resolves
     correctly, but the teleprompter's left-hung column must not move. */
  text-align: left;
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, var(--ink));
  line-height: 1.4;
  transition: all 0.5s ease;
}

.phrase-with-gaps {
  /* text-align pinned — see .phrase-text. The chunk ORDER mirrors for an RTL
     phrase, which is the fix; the column itself must stay where it is. */
  text-align: left;
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, var(--ink));
  line-height: 1.9;
}

/* A chunk is a group of words the speaker reads without pausing.
   Internal spaces inside chunk.text are preserved naturally. */
.chunk-segment {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(255, 166, 48, 0.08);
  transition: all 0.4s ease;
}

/* Light mode: the dark-tuned white@3% fill + 8%-orange hairline give the
   chunk tiles no separation on a light card. Use a real raised surface +
   a visible border token so the tiles read. Dark mode is untouched. */
:root[data-theme="light"] .chunk-segment {
  background: var(--surface-2);
  box-shadow: inset 0 0 0 1px var(--line);
}

:root[data-theme="light"] .phrase-card.current .chunk-segment {
  background: rgba(168, 85, 8, 0.1);
  box-shadow: inset 0 0 0 1px rgba(168, 85, 8, 0.35);
}

.phrase-card.current .chunk-segment {
  background: rgba(255, 166, 48, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 166, 48, 0.25);
}

/* Chunks that absorbed glue words are functionally identical to pure-LEGO
   chunks for the speaker — but we keep a subtle hint for dev/debugging mode. */
.chunk-segment.has-absorbed-glue {
  /* no visual distinction by default — speaker shouldn't care.
     Uncomment for debugging:
     border-bottom: 2px dotted rgba(255, 166, 48, 0.3); */
}

.gap-marker {
  display: inline-block;
  width: 40px;
  height: 4px;
  background: var(--color-tungsten, var(--accent));
  margin: 0 0.75rem;
  border-radius: 2px;
  vertical-align: middle;
  animation: gapPulse 2.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.6);
}

@keyframes gapPulse {
  0%, 100% { opacity: 0.5; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.15); }
}

/* Slow cadence treatment */
.cadence-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--color-tungsten, var(--accent));
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.25rem;
  opacity: 0.8;
}

/* Light mode: 0.8 opacity drops the small mono label below AA on the light
   canvas (~4.0:1). Use the full accent token (5.6:1) instead. Dark untouched. */
:root[data-theme="light"] .cadence-label {
  opacity: 1;
}

.slow-cadence {
  color: var(--color-tungsten, var(--accent)) !important;
}

.phrase-card.current .slow-cadence {
  text-shadow: 0 0 20px rgba(255, 166, 48, 0.6);
}

/* Uploaded indicator */
.uploaded-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 6px rgba(6, 255, 165, 0.6);
  margin-right: 0.25rem;
  vertical-align: middle;
}

.phrase-translation {
  text-align: left;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-paper-dim, var(--muted));
  font-style: italic;
  margin-top: 0.5rem;
}
</style>
