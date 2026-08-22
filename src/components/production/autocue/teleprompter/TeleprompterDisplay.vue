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
.teleprompter-viewport {
  position: relative;
  background: var(--color-void, var(--canvas));
  border: 3px solid var(--color-graphite, var(--surface-3));
  border-radius: 20px;
  padding: 2rem;
  height: 500px;
  overflow: hidden;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
  transition: all 0.3s ease;
}

/* Light mode: the heavy black inset vignette reads as a muddy stain on a
   light canvas, and surface-3 borders are near-invisible (~1.05:1 on canvas).
   Use a readable --line border + a soft neutral inset for crisp separation.
   Scoped so dark mode is untouched. */
:root[data-theme="light"] .teleprompter-viewport {
  border-color: var(--line);
  box-shadow: inset 0 0 30px rgba(15, 23, 42, 0.06);
}

.teleprompter-viewport.recording {
  border-color: var(--color-tungsten, var(--accent));
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(255, 166, 48, 0.3);
}

/* Light mode recording: keep the orange glow (hue identity) but swap the
   muddy black inset for a soft neutral one. Scoped — dark untouched. */
:root[data-theme="light"] .teleprompter-viewport.recording {
  box-shadow:
    inset 0 0 30px rgba(15, 23, 42, 0.06),
    0 0 40px rgba(168, 85, 8, 0.28);
}

/* Recording indicator bar */
.teleprompter-viewport.recording::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-tungsten, var(--accent)), transparent);
  animation: shimmer 3s linear infinite;
  z-index: 10;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.teleprompter-scroller {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding: 200px 0; /* Space for centering */
}

/* Gradient overlays */
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
  background: linear-gradient(to bottom, var(--color-void, var(--canvas)), transparent);
}

.gradient-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--color-void, var(--canvas)), transparent);
}
</style>
