<script setup>
// HowThisWorks — Popty's self-explaining reference surface
// (docs/self-explaining-popty.md §4). One quiet text link; tap → an inline
// card with the persona-scoped explanation for `section`, straight from the
// compiled pack. Static data, zero requests, nothing opens uninvited.
//
// Since 2026-08-04 it is also THE single surfacing point for "how this works"
// clips (docs/walkthrough-clips.md): the panel lists the clips offerable at
// this persona × section as "Show me — …" taps, and carries the current
// noticing invitations. The link throbs on first visit and re-arms when
// something new shows up — see explainer/howThisWorksThrob.js.
import { ref, computed, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import pack from '@/explainer/pack.json'
import { evaluateRules } from '@/explainer/evaluateRules'
import { walksFor, startWalk } from '@/walkthrough/useWalkthrough'
import { shouldThrob, markSeen } from '@/explainer/howThisWorksThrob'

const props = defineProps({
  section: { type: String, required: true },
  // Mount key for the noticing rules, where this surface has one. Omit and
  // the panel simply shows no invitations.
  mount: { type: String, default: null },
  payload: { type: Object, default: () => ({}) },
})

const { isAdmin, isRecorder, hasDashboardAccess, learner } = useAuth()

const persona = computed(() => {
  if (!hasDashboardAccess.value) return null
  if (isAdmin.value) return 'admin'
  if (isRecorder.value) return 'recorder'
  return 'editor'
})

const viewerId = computed(() => learner?.value?.email ?? 'anon')

const open = ref(false)

const text = computed(() => {
  if (!persona.value) return null
  return pack.explanations?.[persona.value]?.[props.section] ?? null
})

// Clips offerable right here. Only authored ones ever reach the pack, so a
// skeleton entry in the inventory can never surface as a tappable clip.
const clips = computed(() => (persona.value ? walksFor(persona.value, props.section) : []))

const invitations = computed(() => {
  if (!persona.value || !props.mount) return []
  return evaluateRules(pack.rules ?? [], { snapshot: pack.snapshot, payload: props.payload }, persona.value, props.mount)
})

// Throb keys: what this panel would surface if opened. A new clip or a newly
// firing invitation re-arms the throb; opening the panel disarms it.
const throbKeys = computed(() => [
  ...clips.value.map((w) => `walk:${w.id}`),
  ...invitations.value.map((i) => `inv:${i.key}`),
])
const throbbing = ref(false)
watch([persona, throbKeys], () => {
  throbbing.value = !!persona.value && shouldThrob(viewerId.value, props.section, throbKeys.value)
}, { immediate: true })

function toggle() {
  open.value = !open.value
  if (open.value) {
    markSeen(viewerId.value, props.section, throbKeys.value)
    throbbing.value = false
  }
}

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
  <div v-if="text || clips.length" class="htw">
    <button type="button" class="htw-toggle" :class="{ 'is-throbbing': throbbing && !open }" @click="toggle">
      {{ open ? 'Close' : 'How this works' }}
      <span v-if="throbbing && !open" class="htw-dot" aria-hidden="true"></span>
    </button>
    <transition name="htw-fade">
      <div v-if="open" class="htw-card">
        <span class="htw-kicker">How this works</span>
        <!-- eslint-disable-next-line vue/no-v-html — pack content is compiled repo data, escaped above -->
        <div v-if="text" class="htw-body" v-html="html"></div>

        <div v-if="clips.length" class="htw-clips">
          <button
            v-for="clip in clips" :key="clip.id" type="button" class="htw-clip"
            @click="open = false; startWalk(clip.id)"
          >Show me — {{ clip.title }}</button>
        </div>

        <ul v-if="invitations.length" class="htw-invites">
          <li v-for="inv in invitations" :key="inv.key">{{ inv.text }}</li>
        </ul>
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
  display: inline-flex; align-items: center; gap: 5px;
}
.htw-toggle:hover { color: var(--muted); }
.htw-toggle.is-throbbing { color: var(--muted); }
.htw-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
  animation: htwThrob 2s ease-in-out infinite;
}
@keyframes htwThrob {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) { .htw-dot { animation: none; opacity: 1; } }
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
.htw-clips { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.htw-clip {
  background: none; border: none; padding: 2px 0; cursor: pointer; font: inherit;
  font-size: 0.8125rem; font-weight: 600; color: var(--accent); text-align: left;
}
.htw-clip:hover { text-decoration: underline; text-underline-offset: 3px; }
.htw-invites {
  margin: 4px 0 0; padding: 0.5rem 0 0 1rem; border-top: 1px solid var(--line);
  font-size: 0.8125rem; color: var(--faint); line-height: 1.5;
}
.htw-fade-enter-active, .htw-fade-leave-active { transition: opacity 0.15s ease; }
.htw-fade-enter-from, .htw-fade-leave-to { opacity: 0; }
</style>
