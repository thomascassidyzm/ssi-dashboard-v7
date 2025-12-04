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
      <PhraseCard
        v-for="(phrase, index) in phrases"
        :key="phrase.id"
        :phrase="phrase"
        :state="getPhraseState(index)"
        :show-gaps="currentPass === 2"
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
  scrollSpeed: { type: Number, default: 3 } // seconds per phrase
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
  background: var(--color-void, #0a0b0f);
  border: 3px solid var(--color-graphite, #34384a);
  border-radius: 20px;
  padding: 2rem;
  height: 500px;
  overflow: hidden;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
  transition: all 0.3s ease;
}

.teleprompter-viewport.recording {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(255, 166, 48, 0.3);
}

/* Recording indicator bar */
.teleprompter-viewport.recording::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-tungsten, #ffa630), transparent);
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
  background: linear-gradient(to bottom, var(--color-void, #0a0b0f), transparent);
}

.gradient-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--color-void, #0a0b0f), transparent);
}
</style>
