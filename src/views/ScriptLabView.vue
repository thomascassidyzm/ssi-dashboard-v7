<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">Script Lab</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-accent-2 mb-1">Script Lab</h1>
      <p class="text-muted text-sm mb-1">
        The canonical pod scripts, whole and editable, with <strong>no course loaded</strong>.
        Each script is a walk over the shape metagraph; the read-out is coverage.
      </p>
      <p class="text-accent text-xs mb-6">
        These are the language-neutral English masters. Editing one changes the source every course flexes from — it changes no generated pod.
      </p>

      <p v-if="stale" class="text-accent text-xs mb-4 border border-line rounded px-3 py-2 bg-surface">
        This API has not been restarted onto the script index yet, so only <code>pod-0</code> is listed. The script page itself works.
      </p>

      <div v-if="loading" class="text-faint py-12 text-center">Loading…</div>
      <div v-else-if="error" class="error-box border rounded-lg p-4">{{ error }}</div>

      <div v-else class="space-y-3">
        <router-link
          v-for="pod in pods" :key="pod.slug"
          :to="`/canonical/scripts/${pod.slug}`"
          class="block bg-surface border border-line rounded-lg p-4 hover:border-accent-2 transition-colors"
        >
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="font-mono text-accent-2">{{ pod.slug }}</span>
            <span v-if="pod.note" class="text-xs text-accent">{{ pod.note }}</span>
            <span v-if="pod.scenes != null" class="ml-auto text-xs text-faint">{{ pod.scenes }} scenes · {{ pod.lines }} lines</span>
          </div>
          <div v-if="pod.coverage" class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span class="text-muted">{{ pod.coverage.totals.traversed }}/{{ pod.coverage.totals.nodes }} shapes traversed</span>
            <span class="text-muted">{{ pod.coverage.totals.hitTwice }} hit twice+</span>
            <span :class="pod.coverage.totals.neverReached ? 'text-danger font-semibold' : 'text-accent-2'">
              {{ pod.coverage.totals.neverReached }} never reached
            </span>
            <span class="text-faint">{{ pod.coverage.totals.unmapped }} unmapped</span>
          </div>
          <div v-else-if="pod.coverageError" class="mt-2 text-xs text-danger">coverage unavailable — {{ pod.coverageError }}</div>
        </router-link>
      </div>

      <div class="mt-8 text-xs text-faint space-y-1">
        <p><strong class="text-muted">The graph.</strong> {{ graph.nodes.length }} shapes, {{ graph.compositionEdges.length }} composition edges, {{ graph.survivability.length }} survivability edges, {{ graph.outcomes.length }} outcome shapes under the selector.</p>
        <p>Source: <code>{{ graph.source }}</code>. {{ graph.provenance }}</p>
        <p>One graph, one home, many readers — the Seed/Basket Lab reads the same object for admissions.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph, loadMethodPodFlow } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromFlow } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'

const graph = loadGraph()
const pods = ref([])
const stale = ref(false)
const loading = ref(true)
const error = ref(null)

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

const NOTES = {
  'pod-0': 'the live POD 1 — the graph is derived from this slate',
  'pod-1': 'a separate slate — the graph speaks pod-0’s row numbers, not these',
  'pod-0.5': 'a separate slate — outside the graph’s reference space'
}

async function load () {
  loading.value = true
  error.value = null
  try {
    // The index endpoint is new; an API process that has not been restarted onto
    // it 404s. Rather than show nothing, fall back to the pod the graph is derived
    // from — reachable through the per-slug endpoint, which is not new — and say so.
    let list = []
    const res = await authedFetch('/api/admin/canonical-pods')
    if (res.ok) {
      const body = await res.json()
      list = (body.pods || []).map(p => ({ ...p, note: NOTES[p.slug] || '', coverage: null, coverageError: '' }))
    } else if (res.status === 404) {
      stale.value = true
      list = [{ slug: 'pod-0', note: NOTES['pod-0'], scenes: null, lines: null, coverage: null, coverageError: '' }]
    } else {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `HTTP ${res.status}`)
    }

    // The Method Pod has no store yet — it lives in the re-cut document, so it is
    // shown here read-only rather than left out of the instrument.
    const method = loadMethodPodFlow()
    list.push({
      slug: 'method-pod',
      note: 'read-only — lives in the re-cut document, not in the store',
      scenes: method.scenes.length,
      lines: method.scenes.reduce((a, s) => a + s.lines.length, 0),
      coverage: computeCoverage(graph, walkFromFlow(method, graph)),
      coverageError: ''
    })
    pods.value = list

    for (const pod of list) {
      if (pod.slug === 'method-pod') continue
      authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(pod.slug)}`)
        .then(async r => {
          const b = await r.json()
          if (!r.ok) throw new Error(b?.error || `HTTP ${r.status}`)
          const walk = walkFromCanonicalRows(b.scenarios || [], graph, { id: pod.slug, slug: pod.slug })
          pod.coverage = computeCoverage(graph, walk)
        })
        .catch(e => { pod.coverageError = e.message })
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.error-box { color: var(--danger); border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface)); }
:root[data-theme="light"] .error-box { background: color-mix(in srgb, var(--danger) 8%, #ffffff); }
</style>
