<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/canonical/scripts" class="text-accent-2 hover:opacity-80">Script Lab</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">Metagraph</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-accent-2 mb-1">The metagraph</h1>
      <p class="text-muted text-sm mb-1">
        The shape graph itself, whole — {{ graph.nodes.length }} shapes, {{ graph.compositionEdges.length }} composition edges,
        {{ graph.survivability.length }} survivability edges, {{ graph.outcomes.length }} outcome shapes.
        <strong>A pod is an overlay through it.</strong>
      </p>
      <p class="text-faint text-xs mb-5">Tap a shape to open it. Tap a pod to lay its walk over the graph. Everything here is read-only.</p>

      <!-- Overlay picker — tap only, one overlay at a time. -->
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          class="px-3 py-1.5 rounded border text-xs"
          :class="active === null ? 'border-accent-2 text-accent-2 bg-surface' : 'border-line text-muted bg-surface hover:border-accent-2'"
          @click="select(null)"
        >Graph only</button>
        <button
          v-for="pod in pods" :key="pod.slug"
          class="px-3 py-1.5 rounded border text-xs"
          :class="active === pod.slug ? 'border-accent-2 text-accent-2 bg-surface' : 'border-line text-muted bg-surface hover:border-accent-2'"
          @click="select(pod.slug)"
        >
          {{ pod.label }}
          <span class="text-faint ml-1">{{ pod.lines }} lines</span>
          <span v-if="pod.slug === loadingSlug" class="text-faint ml-1">·&nbsp;loading…</span>
        </button>
      </div>

      <p v-if="podsError" class="text-danger text-xs mb-3">Pod list unavailable — {{ podsError }}. The graph below is the store and needs no API.</p>
      <p v-if="overlayError" class="text-danger text-xs mb-3">Overlay unavailable — {{ overlayError }}</p>

      <!-- The read-out for the active overlay -->
      <div v-if="cov" class="bg-surface border border-line rounded-lg px-4 py-3 mb-4 text-xs">
        <div class="flex flex-wrap gap-x-5 gap-y-1">
          <span class="text-ink font-semibold">{{ activeLabel }}</span>
          <span class="text-muted">{{ cov.totals.steps }} lines · {{ cov.totals.scenes }} scenes</span>
          <span class="text-muted">{{ cov.totals.traversed }}/{{ cov.totals.nodes }} shapes traversed</span>
          <span class="text-muted">{{ cov.totals.hitTwice }} hit twice+</span>
          <span :class="cov.totals.neverReached ? 'text-danger font-semibold' : 'text-accent-2'">{{ cov.totals.neverReached }} never reached</span>
          <span class="text-faint">{{ cov.totals.unmapped }} lines unmapped</span>
          <span :class="cov.totals.outcomesDelivered ? 'text-accent-2' : 'text-accent'">{{ cov.totals.outcomesDelivered }} of {{ cov.outcomes.length }} outcome shapes delivered</span>
        </div>
        <div v-if="cov.neverReached.length" class="mt-2 text-danger">
          Never reached: <span v-for="(n, i) in cov.neverReached" :key="n.id">{{ i ? ' · ' : '' }}{{ n.id }} {{ n.title }}</span>
        </div>
      </div>

      <!-- The graph -->
      <div class="bg-surface border border-line rounded-lg p-2 sm:p-3 overflow-x-auto">
        <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" :style="{ minWidth: '640px', width: '100%' }" role="img" aria-label="the shape metagraph">
          <g>
            <text v-for="band in layout.bands" :key="band.key"
                  x="10" :y="band.y" class="band-label">{{ band.label }}</text>
          </g>
          <g fill="none">
            <path v-for="e in layout.edges" :key="e.id" :d="e.d"
                  :class="['edge', edgeClass(e)]" />
          </g>
          <g>
            <g v-for="n in graph.nodes" :key="n.id"
               class="tile" @click="tapNode(n.id)">
              <rect :x="pos(n.id).x" :y="pos(n.id).y" :width="pos(n.id).w" :height="pos(n.id).h"
                    rx="7" :class="['tile-box', tileClass(n.id)]" />
              <text :x="pos(n.id).x + 9" :y="pos(n.id).y + 19" class="tile-id">{{ n.id }}</text>
              <text v-if="visits(n.id)" :x="pos(n.id).x + pos(n.id).w - 9" :y="pos(n.id).y + 19"
                    text-anchor="end" class="tile-count">×{{ visits(n.id) }}</text>
              <text :x="pos(n.id).x + 9" :y="pos(n.id).y + 37" class="tile-name">{{ short(n.title) }}</text>
              <text :x="pos(n.id).x + 9" :y="pos(n.id).y + 49" class="tile-sub">{{ n.kind === 'bound-pair' ? 'bound pair' : n.origin }}</text>
            </g>
          </g>
        </svg>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-faint">
        <span><span class="key key-never"></span> never reached</span>
        <span><span class="key key-once"></span> traversed once</span>
        <span><span class="key key-twice"></span> hit twice or more</span>
        <span><span class="key key-base"></span> no overlay</span>
        <span>Edges are composition — contained into container. N5 → N5 is the store's declared reflexive edge and is shown on the shape, not as a line.</span>
      </div>

      <!-- The outcome overlay: nine shapes, delivery not siting -->
      <h2 class="text-sm font-semibold text-ink mt-7 mb-2">The outcome overlay — {{ graph.outcomes.length }} shapes</h2>
      <div class="flex flex-wrap gap-2">
        <button v-for="o in outcomes" :key="o.id"
                class="px-2.5 py-1.5 rounded border text-xs text-left"
                :class="[
                  selectedOutcome === o.id ? 'border-accent-2' : 'border-line',
                  o.delivered ? 'bg-surface text-accent-2' : 'bg-surface text-muted'
                ]"
                @click="tapOutcome(o.id)">
          <span class="font-mono">{{ o.id }}</span> {{ o.name }}
          <span v-if="cov" :class="o.delivered ? 'text-accent-2' : 'text-accent'">· {{ o.delivered ? 'delivered' : (o.siteInWalk ? 'site present, not delivered' : 'not delivered') }}</span>
        </button>
      </div>

      <!-- Detail: whatever was last tapped -->
      <div v-if="node" ref="panel" class="mt-6 bg-surface border border-line rounded-lg p-4">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-mono text-accent-2 text-lg">{{ node.id }}</span>
          <span class="text-ink font-semibold">{{ node.title }}</span>
          <span class="text-faint text-xs">{{ node.kind === 'bound-pair' ? 'bound pair' : node.origin }}</span>
          <button class="ml-auto text-xs text-faint hover:text-ink" @click="selectedNode = null">close</button>
        </div>
        <p class="text-muted text-sm mt-2"><span class="text-faint">positions:</span> {{ node.sequence || '—' }}</p>

        <div class="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p class="text-faint mb-1">Contained in</p>
            <p v-if="!containers.length" class="text-muted">nothing — this is a top-level shape</p>
            <button v-for="c in containers" :key="c" class="chip" @click="tapNode(c)">{{ c }} {{ titleOf(c) }}</button>
          </div>
          <div>
            <p class="text-faint mb-1">Contains</p>
            <p v-if="!contains.length" class="text-muted">nothing</p>
            <button v-for="c in contains" :key="c" class="chip" @click="tapNode(c)">{{ c }} {{ titleOf(c) }}</button>
          </div>
        </div>

        <div v-if="survForNode.length" class="mt-3 text-xs">
          <p class="text-faint mb-1">Survivability pressure on this shape</p>
          <p v-for="s in survForNode" :key="s.id" class="text-muted">
            <span class="font-mono text-accent-2">{{ s.id }}</span>
            {{ s.presupposes }} — attemptable only if {{ s.attemptable }}.
            <span :class="/never/i.test(String(s.recoveryAttested)) ? 'text-danger' : 'text-faint'">recovery: {{ s.recoveryAttested }}</span>
          </p>
        </div>

        <div v-if="cov" class="mt-4 border-t border-line pt-3">
          <p v-if="!nodeLines.length" class="text-danger text-sm">
            <strong>{{ activeLabel }} never reaches this shape.</strong>
            <span class="text-muted"> Nothing in the script walks it.</span>
          </p>
          <template v-else>
            <p class="text-xs text-faint mb-2">Where {{ activeLabel }} walks this shape — {{ nodeLines.length }} lines in {{ nodeScenes }} scenes</p>
            <div v-for="l in shownLines" :key="l.key" class="text-sm py-1 border-b border-line last:border-0">
              <span class="text-faint text-xs mr-2">sc{{ l.scene }}<span v-if="l.ref"> · {{ l.ref }}</span></span>
              <span class="text-accent-2 text-xs mr-1">{{ l.speaker }}</span>
              <span class="text-ink">{{ l.text }}</span>
              <span v-if="l.kind !== 'move'" class="text-accent text-xs ml-2">{{ l.kind }}</span>
            </div>
            <button v-if="nodeLines.length > shownLines.length" class="mt-2 text-xs text-accent-2" @click="showAll = true">
              Show all {{ nodeLines.length }}
            </button>
          </template>
        </div>
      </div>

      <div v-if="outcome" class="mt-6 bg-surface border border-line rounded-lg p-4 text-sm">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-mono text-accent-2 text-lg">{{ outcome.id }}</span>
          <span class="text-ink font-semibold">{{ outcome.name }}</span>
          <span class="text-faint text-xs">{{ outcome.mustBeMinted ? 'minted' : outcome.attested }}</span>
          <button class="ml-auto text-xs text-faint hover:text-ink" @click="selectedOutcome = null">close</button>
        </div>
        <p class="text-muted mt-2"><span class="text-faint">the learner must own:</span> {{ outcome.recovery }}</p>
        <p class="text-muted mt-1"><span class="text-faint">sited on:</span> {{ outcome.sitedOn }}</p>
        <p v-if="cov" class="mt-2" :class="outcome.delivered ? 'text-accent-2' : 'text-accent'">
          {{ activeLabel }}: {{ outcome.delivered ? 'delivered — a line declares it' : 'not delivered' }}<span v-if="!outcome.delivered && outcome.siteInWalk">, though the site it hangs from is in the script</span>.
        </p>
      </div>

      <div class="mt-8 text-xs text-faint space-y-1">
        <p>Source: <code>{{ graph.source }}</code>. {{ graph.provenance }}</p>
        <p>Coverage is computed by the same pure module the Script Lab uses — one graph, one home, many readers.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph } from '@/lib/metagraph/loadGraph.js'
import { computeLayout } from '@/lib/metagraph/layout.js'
import { walkFromCanonicalRows, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'

const graph = loadGraph()
const layout = computeLayout(graph)

const pods = ref([])
const podsError = ref('')
const overlayError = ref('')
const loadingSlug = ref('')
const active = ref(null)
const walk = ref(null)
const cov = ref(null)
const selectedNode = ref(null)
const selectedOutcome = ref(null)
const showAll = ref(false)
const panel = ref(null)

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

const LABELS = {
  'pod-0': 'POD 1',
  'pod-1': 'pod-1 (sacked slate)',
  'pod-0.5': 'pod-0.5 (sacked slate)',
  'learning-flagship': 'Learning flagship',
  'method-pod-chapters': 'Method Pod — chapters',
  'method-pod-43-scene': 'Method Pod — 43 scenes'
}

const ORDER = ['pod-0', 'method-pod-43-scene', 'method-pod-chapters', 'learning-flagship', 'pod-0.5', 'pod-1']

const activeLabel = computed(() => LABELS[active.value] || active.value || '')

function pos (id) { return layout.positions.get(id) || { x: 0, y: 0, w: 0, h: 0 } }
function short (t) { return t && t.length > 22 ? t.slice(0, 21) + '…' : t }
function titleOf (id) { return (graph.nodes.find(n => n.id === id) || {}).title || '' }

const covByNode = computed(() => {
  const m = new Map()
  for (const n of cov.value?.nodes || []) m.set(n.id, n)
  return m
})
function visits (id) { return covByNode.value.get(id)?.traversals || 0 }
function tileClass (id) {
  const c = covByNode.value.get(id)
  const sel = selectedNode.value === id ? ' is-selected' : ''
  if (!cov.value) return 'is-base' + sel
  if (!c || c.status === 'never') return 'is-never' + sel
  return (c.status === 'twice' ? 'is-twice' : 'is-once') + sel
}
function edgeClass (e) {
  if (!selectedNode.value) return ''
  return (e.contained === selectedNode.value || e.container === selectedNode.value) ? 'is-lit' : 'is-dim'
}

function tapNode (id) {
  selectedOutcome.value = null
  showAll.value = false
  selectedNode.value = selectedNode.value === id ? null : id
  if (selectedNode.value) nextTick(() => panel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}
function tapOutcome (id) {
  selectedNode.value = null
  selectedOutcome.value = selectedOutcome.value === id ? null : id
}

const node = computed(() => graph.nodes.find(n => n.id === selectedNode.value) || null)
const containers = computed(() => selectedNode.value ? [...new Set(layout.containersOf.get(selectedNode.value) || [])] : [])
const contains = computed(() => selectedNode.value ? [...new Set(layout.containedIn.get(selectedNode.value) || [])] : [])
const survForNode = computed(() => {
  if (!selectedNode.value) return []
  const id = selectedNode.value
  return graph.survivability.filter(s => `${s.attemptable} ${s.presupposes}`.includes(id))
})

const outcomes = computed(() => {
  const byId = new Map((cov.value?.outcomes || []).map(o => [o.id, o]))
  return graph.outcomes.map(o => ({ ...o, ...(byId.get(o.id) || { delivered: false, siteInWalk: false }) }))
})
const outcome = computed(() => outcomes.value.find(o => o.id === selectedOutcome.value) || null)

const nodeLines = computed(() => {
  if (!walk.value || !selectedNode.value) return []
  const out = []
  for (const s of walk.value.steps) {
    if (!(s.nodeIds || []).includes(selectedNode.value)) continue
    out.push({
      key: s.payload?.id || `${s.sceneNumber}-${out.length}`,
      scene: s.sceneNumber,
      ref: s.ref,
      speaker: s.payload?.speaker || '',
      text: s.payload?.text || '',
      kind: s.kind
    })
  }
  return out
})
const nodeScenes = computed(() => new Set(nodeLines.value.map(l => l.scene)).size)
const shownLines = computed(() => showAll.value ? nodeLines.value : nodeLines.value.slice(0, 12))

async function select (slug) {
  active.value = slug
  showAll.value = false
  overlayError.value = ''
  if (!slug) { walk.value = null; cov.value = null; return }
  loadingSlug.value = slug
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(slug)}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    // A pod carrying a stored walk is read through it; pod-0 and the sacked
    // slates carry none and keep the row-reference path. Same reading as the
    // Script Lab — no second opinion about what a pod's walk is.
    const w = (body.walk || []).length
      ? walkFromStoredPod(body.scenarios || [], body.walk, graph, { id: slug, slug })
      : walkFromCanonicalRows(body.scenarios || [], graph, { id: slug, slug })
    if (active.value !== slug) return
    walk.value = w
    cov.value = computeCoverage(graph, w)
  } catch (e) {
    if (active.value === slug) { overlayError.value = e.message; walk.value = null; cov.value = null }
  } finally {
    if (loadingSlug.value === slug) loadingSlug.value = ''
  }
}

onMounted(async () => {
  try {
    const res = await authedFetch('/api/admin/canonical-pods')
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    // The pod the graph was derived from leads; the two sacked slates go last.
    // Alphabetical order buried POD 1 in the middle of a row of also-rans.
    const rank = s => ORDER.indexOf(s) === -1 ? ORDER.length : ORDER.indexOf(s)
    pods.value = (body.pods || [])
      .map(p => ({ ...p, label: LABELS[p.slug] || p.slug }))
      .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug))
  } catch (e) {
    podsError.value = e.message
    pods.value = [{ slug: 'pod-0', label: LABELS['pod-0'], lines: null }]
  }
})
</script>

<style scoped>
.band-label { fill: var(--faint); font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.edge { stroke: var(--line); stroke-width: 1.4; opacity: .85; }
.edge.is-lit { stroke: var(--accent-2); stroke-width: 2.2; opacity: 1; }
.edge.is-dim { opacity: .15; }
.tile { cursor: pointer; }
.tile-box { fill: var(--surface-2); stroke: var(--line); stroke-width: 1.2; }
.tile:hover .tile-box { stroke: var(--accent-2); }
.tile-box.is-selected { stroke: var(--accent-2); stroke-width: 2.4; }
.tile-box.is-never { fill: color-mix(in srgb, var(--danger) 16%, var(--surface-2)); stroke: var(--danger); }
.tile-box.is-once { fill: color-mix(in srgb, var(--accent-2) 20%, var(--surface-2)); stroke: var(--accent-2); }
.tile-box.is-twice { fill: color-mix(in srgb, var(--accent-2) 42%, var(--surface-2)); stroke: var(--accent-2); }
.tile-id { fill: var(--accent-2); font-size: 12px; font-weight: 700; font-family: ui-monospace, monospace; }
.tile-count { fill: var(--ink); font-size: 11px; font-family: ui-monospace, monospace; }
.tile-name { fill: var(--ink); font-size: 12px; }
.tile-sub { fill: var(--ink); opacity: .5; font-size: 9.5px; }
.key { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; border: 1px solid var(--line); }
.key-base { background: var(--surface-2); }
.key-never { background: color-mix(in srgb, var(--danger) 16%, var(--surface-2)); border-color: var(--danger); }
.key-once { background: color-mix(in srgb, var(--accent-2) 20%, var(--surface-2)); border-color: var(--accent-2); }
.key-twice { background: color-mix(in srgb, var(--accent-2) 42%, var(--surface-2)); border-color: var(--accent-2); }
.chip { display: inline-block; margin: 0 4px 4px 0; padding: 2px 7px; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: 11px; }
.chip:hover { border-color: var(--accent-2); color: var(--ink); }
</style>
