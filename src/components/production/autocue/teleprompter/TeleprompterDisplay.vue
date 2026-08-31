<template>
  <div
    class="teleprompter-viewport"
    :class="{ recording: isRecording }"
  >
    <div
      class="teleprompter-scroller"
      ref="scrollerRef"
      :style="{ transform: `translateY(-${scrollOffset}px)` }"
    >
      <!-- show-gaps: script mode carries a real pause map per item
           (chunksString / recordingChunks, LEGO boundaries from the recording
           optimiser), so its slow pass gets the same gap markers the two-pass
           mode gets on Pass 2. It was hardcoded off, leaving the recordist to
           guess where the pauses fell. -->
      <PhraseCard
        v-for="(phrase, index) in phrases"
        :key="phrase.id"
        :phrase="phrase"
        :state="getPhraseState(index)"
        :show-gaps="scriptMode ? phrase.cadence === 'slow' : currentPass === 2"
        :uploaded="uploadedIndices.has(index)"
      />
    </div>

    <!-- Gradient overlays for smooth edges -->
    <div class="gradient-top"></div>
    <div class="gradient-bottom"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PhraseCard from './PhraseCard.vue'

const props = defineProps({
  phrases: { type: Array, required: true },
  currentIndex: { type: Number, default: 0 },
  currentPass: { type: Number, default: 1 },
  isRecording: { type: Boolean, default: false },
  scrollSpeed: { type: Number, default: 3 }, // seconds per phrase
  scriptMode: { type: Boolean, default: false }, // optimizer script mode — cadence per phrase
  uploadedIndices: { type: Set, default: () => new Set() } // indices with completed uploads
})

const emit = defineEmits(['phrase-change'])

const scrollerRef = ref(null)
const scrollOffset = ref(0)

// Calculate phrase state (done, current, upcoming)
function getPhraseState(index) {
  if (index < props.currentIndex) return 'done'
  if (index === props.currentIndex) return 'current'
  return 'upcoming'
}

// Auto-scroll to keep current phrase centered
watch(() => props.currentIndex, (newIndex) => {
  scrollToPhraseIndex(newIndex)
})

function scrollToPhraseIndex(index) {
  nextTick(() => {
    if (!scrollerRef.value) return

    const phraseCards = scrollerRef.value.querySelectorAll('.phrase-card')
    if (phraseCards[index]) {
      const card = phraseCards[index]
      const viewportHeight = scrollerRef.value.parentElement.clientHeight
      const cardTop = card.offsetTop
      const cardHeight = card.clientHeight

      // Center the card in the viewport
      scrollOffset.value = cardTop - (viewportHeight / 2) + (cardHeight / 2)
    }
  })
}

onMounted(() => {
  scrollToPhraseIndex(props.currentIndex)
})
</script>

<style scoped>
/* The reading surface is a house card: --surface on a 1px --line, 16px radius.
   The old black vignette and 3px graphite frame were the only ones on the
   estate, and the vignette read as a stain in light mode. */
.teleprompter-viewport {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 2rem;
  height: 500px;
  overflow: hidden;
  transition: border-color 0.3s ease;
}

/* Live, the frame turns amber and grows a solid rule along the top edge. Same
   amber as everywhere else, no glow and no travelling shimmer — the REC pill
   and the on-air meter are what shout; this only has to confirm. */
.teleprompter-viewport.recording {
  border-color: var(--accent);
}

.teleprompter-viewport.recording::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  z-index: 10;
}

.teleprompter-scroller {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding: 200px 0; /* Space for centering */
}

/* Gradient overlays — the fade at each edge of the scroll, so a half-visible
   line does not read as a whole one. Matches the card surface behind it. */
.gradient-top,
.gradient-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 100px;
  pointer-events: none;
  z-index: 5;
}

.gradient-top {
  top: 0;
  background: linear-gradient(to bottom, var(--surface), transparent);
}

.gradient-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--surface), transparent);
}

@media (prefers-reduced-motion: reduce) {
  .teleprompter-scroller { transition: none; }
}
</style>
