<template>
  <!-- Gated by the same inject as every other piece of teaching copy. Renders
       an empty comment node in the live recorder. See tutorialMode.js. -->
  <p v-if="on && text" class="tutorial-hint">{{ text }}</p>
</template>

<script setup>
import { useTutorialMode } from './tutorialMode'

// A one-line fact pinned next to the control it describes. Text comes from
// HINTS in tutorialScript.js — do not inline copy at the call site, or it stops
// being greppable in one place.
defineProps({ text: { type: String, default: '' } })

const on = useTutorialMode()
</script>

<style scoped>
.tutorial-hint {
  margin: 0.75rem 0 0;
  padding: 0.55rem 0.8rem;
  border-radius: 8px;
  background: var(--color-void, var(--canvas));
  border: 1px dashed var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  text-align: center;
}

:root[data-theme="light"] .tutorial-hint {
  border-color: var(--line);
}
</style>
