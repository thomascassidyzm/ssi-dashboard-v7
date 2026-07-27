<script setup>
// HowThisWorks — Popty's self-explaining reference surface
// (docs/self-explaining-popty.md §4). One quiet text link; tap → an inline
// card with the persona-scoped explanation for `section`, straight from the
// compiled pack. Static data, zero requests, nothing opens uninvited.
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import pack from '@/explainer/pack.json'

const props = defineProps({
  section: { type: String, required: true },
})

const { isAdmin, isRecorder, hasDashboardAccess } = useAuth()

const persona = computed(() => {
  if (!hasDashboardAccess.value) return null
  if (isAdmin.value) return 'admin'
  if (isRecorder.value) return 'recorder'
  return 'editor'
})

const open = ref(false)

const text = computed(() => {
  if (!persona.value) return null
  return pack.explanations?.[persona.value]?.[props.section] ?? null
})

// Markdown-lite: paragraphs + **bold**. The pack is repo-authored (compiled,
// reviewed) content, but escape anyway so the renderer never trusts input.
const html = computed(() => {
  if (!text.value) return ''
  const escaped = text.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, ' ')}</p>`)
    .join('')
})
</script>

<template>
  <div v-if="text" class="htw">
    <button type="button" class="htw-toggle" @click="open = !open">
      {{ open ? 'Close' : 'How this works' }}
    </button>
    <transition name="htw-fade">
      <div v-if="open" class="htw-card">
        <span class="htw-kicker">How this works</span>
        <!-- eslint-disable-next-line vue/no-v-html — pack content is compiled repo data, escaped above -->
        <div class="htw-body" v-html="html"></div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.htw { display: flex; flex-direction: column; gap: 0.5rem; }
.htw-toggle {
  align-self: flex-start; background: none; border: none; cursor: pointer; padding: 2px 0;
  font: inherit; font-size: 0.8125rem; color: var(--faint);
  text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--faint) 50%, transparent);
}
.htw-toggle:hover { color: var(--muted); }
.htw-card {
  padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
}
.htw-kicker {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--accent);
}
.htw-body { font-size: 0.875rem; color: var(--muted); line-height: 1.6; }
.htw-body :deep(p) { margin: 0 0 10px; }
.htw-body :deep(p:last-child) { margin-bottom: 0; }
.htw-body :deep(strong) { color: var(--ink); font-weight: 600; }
.htw-fade-enter-active, .htw-fade-leave-active { transition: opacity 0.15s ease; }
.htw-fade-enter-from, .htw-fade-leave-to { opacity: 0; }
</style>
