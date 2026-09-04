<template>
  <div class="autocue-display">
    <!-- Context: Previous Phrase -->
    <div v-if="contextPhrases.previous && !slowMode" class="context-phrase previous">
      <span class="context-label">Previous</span>
      <p class="context-text">{{ contextPhrases.previous.text }}</p>
    </div>

    <!-- Current Phrase (Large Display) -->
    <div class="current-phrase" :class="{ 'slow-mode': slowMode }">
      <div class="phrase-meta">
        <span class="meta-item">{{ phrase.role }}</span>
        <span class="meta-separator">•</span>
        <span class="meta-item">{{ phrase.language }}</span>
        <span class="meta-separator">•</span>
        <span class="meta-item">{{ slowMode ? 'Slow with Gaps' : 'Natural Speed' }}</span>
      </div>

      <h2 class="phrase-text">
        <template v-if="slowMode">
          <span
            v-for="(word, index) in words"
            :key="index"
            class="word-segment"
          >
            {{ word }}
          </span>
        </template>
        <template v-else>
          {{ phrase.text }}
        </template>
      </h2>

      <div v-if="phrase.translation" class="phrase-translation">
        {{ phrase.translation }}
      </div>

      <!-- Slow Mode Instructions -->
      <div v-if="slowMode" class="slow-mode-instructions">
        <svg class="icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <p>Speak slowly with small pauses between words for LEGO extraction</p>
      </div>
    </div>

    <!-- Context: Next Phrase -->
    <div v-if="contextPhrases.next && !slowMode" class="context-phrase next">
      <span class="context-label">Next</span>
      <p class="context-text">{{ contextPhrases.next.text }}</p>
    </div>

    <!-- Slow Mode Toggle -->
    <div class="controls-footer">
      <button
        class="slow-mode-toggle"
        :class="{ active: slowMode }"
        @click="toggleSlowMode"
      >
        <svg class="icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Slow-with-gaps Mode
      </button>

      <div class="phrase-metadata">
        <span class="uuid-display">{{ phrase.uuid?.slice(0, 8) }}...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Phrase {
  uuid: string
  text: string
  language: string
  role: string
  cadence: string
  translation?: string
}

interface ContextPhrases {
  previous: Phrase | null
  next: Phrase | null
}

const props = defineProps<{
  phrase: Phrase
  contextPhrases: ContextPhrases
  slowMode: boolean
}>()

const emit = defineEmits<{
  (e: 'update:slowMode', value: boolean): void
}>()

const words = computed(() => {
  if (!props.phrase.text) return []
  return props.phrase.text.split(/\s+/)
})

function toggleSlowMode() {
  emit('update:slowMode', !props.slowMode)
}
</script>

<style scoped>
.autocue-display {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
}

.context-phrase {
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.context-phrase:hover {
  opacity: 0.8;
}

.context-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 0.5rem;
}

.context-text {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
}

.current-phrase {
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.current-phrase.slow-mode {
  background: linear-gradient(135deg, var(--color-slate, var(--surface-2)), var(--color-graphite, var(--surface-3)));
}

.phrase-meta {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.875rem;
  color: var(--color-paper-dim, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.meta-item {
  color: var(--color-tungsten, var(--accent));
}

.meta-separator {
  margin: 0 0.75rem;
  opacity: 0.5;
}

.phrase-text {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-paper, var(--ink));
  margin: 0;
}

.word-segment {
  display: inline-block;
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--line);
  border-radius: 4px;
  animation: wordPulse 2s ease-in-out infinite;
}

.word-segment:nth-child(odd) {
  animation-delay: 0.1s;
}

.word-segment:nth-child(even) {
  animation-delay: 0.2s;
}

@keyframes wordPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

.phrase-translation {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.25rem;
  color: var(--color-paper-dim, var(--muted));
  /* No italic: the translation is often Tamil, Han, Hangul, Devanagari or
     Arabic, none of which HAVE an italic — the browser shears the upright
     glyphs to fake one (Tom, 2026-09-04). Colour and weight already tell this
     line apart from the prompt above it, and they work in every script. */
  font-weight: 400;
}

.slow-mode-instructions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
  border-radius: 6px;
  margin-top: 1rem;
}

.slow-mode-instructions .icon {
  flex-shrink: 0;
}

.slow-mode-instructions p {
  margin: 0;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  font-weight: 500;
}

.controls-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-graphite, var(--surface-3));
}

.slow-mode-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.slow-mode-toggle:hover {
  background: var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
}

.slow-mode-toggle.active {
  background: var(--color-tungsten, var(--accent));
  border-color: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
}

.slow-mode-toggle .icon {
  transition: transform 0.3s ease;
}

.slow-mode-toggle.active .icon {
  transform: scale(1.2);
}

.phrase-metadata {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  opacity: 0.5;
}

.uuid-display {
  padding: 0.25rem 0.5rem;
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--line);
  border-radius: 4px;
}

@media (max-width: 768px) {
  .phrase-text {
    font-size: 2rem;
  }

  .controls-footer {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
