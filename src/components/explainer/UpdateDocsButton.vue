<script setup>
// UpdateDocsButton — the admin "Update docs" verb (founder-requested,
// 2026-07-27; same pattern as the learning app's "Refresh demo activity").
// Re-runs the deterministic explainer compiler on the production machine
// against live truth and refreshes what the Docs surface serves. The scope
// copy is deliberately honest: live-state derivables (schema references,
// course list, queue counts) refresh on demand; code-derived facts refresh
// when a commit deploys — the button cannot outrun git.
import { computed, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePack } from '@/explainer/usePack'

const { isAdmin, session } = useAuth()
const { pack, source, refresh, refreshing, refreshError } = usePack()

const done = ref(false)

const stamp = computed(() => {
  const live = pack.value.snapshot?.live?.generatedAt
  if (live) return `live state as of ${new Date(live).toLocaleString()}`
  return `compiled ${pack.value.generatedAt} (deployed bundle)`
})

async function onUpdate() {
  done.value = false
  try {
    await refresh(session.value?.access_token)
    done.value = true
    setTimeout(() => { done.value = false }, 4000)
  } catch { /* refreshError is shown below */ }
}
</script>

<template>
  <div class="udb">
    <div class="udb-status">
      <span class="udb-dot" :class="source"></span>
      <span>Docs pack <code>{{ pack.version }}</code> · {{ stamp }}</span>
    </div>
    <template v-if="isAdmin">
      <button type="button" class="udb-btn" :disabled="refreshing" @click="onUpdate">
        {{ refreshing ? 'Updating…' : done ? 'Docs updated ✓' : 'Update docs' }}
      </button>
      <p class="udb-scope">
        Re-reads live state — course list, audio-pass queue, database counts — from the
        production machine. Facts derived from code refresh when a commit deploys.
      </p>
      <p v-if="refreshError" class="udb-error">{{ refreshError }} — is the production machine reachable?</p>
    </template>
  </div>
</template>

<style scoped>
.udb { display: flex; flex-direction: column; gap: 0.4rem; }
.udb-status {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.75rem; color: var(--faint);
}
.udb-status code { font-family: var(--font-mono); color: var(--muted); }
.udb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }
.udb-dot.live { background: var(--accent-2, #047857); }
.udb-btn {
  align-self: flex-start; cursor: pointer; padding: 0.35rem 0.9rem;
  font: inherit; font-size: 0.8125rem; color: var(--ink);
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
}
.udb-btn:hover:not(:disabled) { border-color: var(--accent-2, #047857); }
.udb-btn:disabled { opacity: 0.6; cursor: default; }
.udb-scope { margin: 0; font-size: 0.7rem; color: var(--faint); line-height: 1.5; max-width: 46rem; }
.udb-error { margin: 0; font-size: 0.75rem; color: var(--danger, #dc2626); }
</style>
