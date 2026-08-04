<script setup>
// NoticingInvitations — Popty's self-explaining noticing surface
// (docs/self-explaining-popty.md §5). Renders the pack's declarative rules,
// evaluated over pack.snapshot + the mounting page's own payload, as gentle
// tappable invitations. Never modal, never forced, dismissible (14 days per
// rule × subject), never more than 3 at once. Invitations, not missions.
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import pack from '@/explainer/pack.json'
import { evaluateRules } from '@/explainer/evaluateRules'
import { startWalk } from '@/walkthrough/useWalkthrough'

const props = defineProps({
  mount: { type: String, required: true }, // 'home' | 'record-room' | 'qa'
  payload: { type: Object, default: () => ({}) },
  subjectKey: { type: String, default: 'global' }, // dismissal scope, e.g. course code
})

const { isAdmin, isRecorder, hasDashboardAccess } = useAuth()

const persona = computed(() => {
  if (!hasDashboardAccess.value) return null
  if (isAdmin.value) return 'admin'
  if (isRecorder.value) return 'recorder'
  return 'editor'
})

const DISMISS_KEY = 'popty-noticing-dismissed'
const DISMISS_DAYS = 14

function readDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') } catch { return {} }
}
const dismissed = ref(readDismissed())

function dismiss(key) {
  const map = readDismissed()
  map[`${props.subjectKey}:${key}`] = Date.now()
  const cutoff = Date.now() - DISMISS_DAYS * 86400000
  for (const k of Object.keys(map)) if (map[k] < cutoff) delete map[k]
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(map)) } catch { /* storage unavailable */ }
  dismissed.value = map
}

const invitations = computed(() => {
  if (!persona.value) return []
  const all = evaluateRules(pack.rules ?? [], { snapshot: pack.snapshot, payload: props.payload }, persona.value, props.mount)
  const cutoff = Date.now() - DISMISS_DAYS * 86400000
  return all
    .filter((inv) => !(dismissed.value[`${props.subjectKey}:${inv.key}`] > cutoff))
    .slice(0, 3)
})
</script>

<template>
  <transition-group v-if="invitations.length" name="notice" tag="div" class="noticing">
    <div v-for="inv in invitations" :key="inv.key" class="notice-card">
      <span class="notice-text">{{ inv.text }}</span>
      <span class="notice-actions">
        <!-- A walk: CTA offers a clip rather than navigating. The tap is the
             only way a clip ever starts — the compiler forbids any other
             call site (gateNoAutoPlay). -->
        <button
          v-if="inv.walk" type="button" class="notice-cta notice-cta-btn"
          @click="startWalk(inv.walk)"
        >{{ inv.ctaLabel || 'Show me' }}</button>
        <router-link v-else-if="inv.to" :to="inv.to" class="notice-cta">{{ inv.ctaLabel }}</router-link>
        <button type="button" class="notice-dismiss" aria-label="Dismiss" @click="dismiss(inv.key)">×</button>
      </span>
    </div>
  </transition-group>
</template>

<style scoped>
.noticing { display: flex; flex-direction: column; gap: 0.5rem; }
.notice-card {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent);
  border-radius: 8px;
}
.notice-text { font-size: 0.8125rem; color: var(--muted); line-height: 1.5; }
.notice-actions { display: inline-flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.notice-cta {
  font-size: 0.75rem; font-weight: 600; color: var(--accent);
  text-decoration: none; white-space: nowrap;
}
.notice-cta:hover { text-decoration: underline; text-underline-offset: 3px; }
.notice-cta-btn { background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
.notice-dismiss {
  background: none; border: none; cursor: pointer; padding: 0 4px; line-height: 1;
  font-size: 15px; color: var(--faint);
}
.notice-dismiss:hover { color: var(--ink); }
.notice-enter-active, .notice-leave-active { transition: opacity 0.15s ease; }
.notice-enter-from, .notice-leave-to { opacity: 0; }
</style>
