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
        Every shape a conversation can take — <strong>{{ graph.nodes.length }} of them</strong>, drawn from the pods we have written,
        and joined by which shape happens inside which.
        <strong class="text-ink">A pod is a walk through this graph.</strong>
      </p>
      <p class="text-faint text-xs mb-5">
        Lay a pod over it and the shapes its script reaches go green, the ones it never reaches go red.
        Tap any shape to see the pod's own lines that walk it. Nothing here can be edited — editing lives in the Script Lab.
      </p>

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
          <span v-if="pod.lines != null" class="text-faint ml-1">{{ pod.lines }} lines</span>
          <span v-if="pod.slug === loadingSlug" class="text-faint ml-1">·&nbsp;loading…</span>
        </button>
      </div>

      <p v-if="podsError" class="text-danger text-xs mb-3">Pod list unavailable — {{ podsError }}. The graph below is the store and needs no API.</p>
      <p v-if="overlayError" class="text-danger text-xs mb-3">Overlay unavailable — {{ overlayError }}</p>

      <!-- The read-out for the active overlay -->
      <div v-if="cov" class="bg-surface border border-line rounded-lg px-4 py-3 mb-4 text-xs">
        <div class="flex flex-wrap gap-x-5 gap-y-1">
          <span class="text-ink font-semibold">{{ activeLabel }}</span>
          <span class="text-muted">{{ cov.totals.steps }} lines of script, in {{ cov.totals.scenes }} scenes</span>
          <span class="text-muted">reaches <strong class="text-ink">{{ cov.totals.traversed }} of the {{ cov.totals.nodes }} shapes</strong></span>
          <span class="text-muted">{{ cov.totals.hitTwice }} of them more than once</span>
          <span :class="cov.totals.neverReached ? 'text-danger font-semibold' : 'text-accent-2'">
            {{ cov.totals.neverReached ? cov.totals.neverReached + ' it never reaches' : 'it reaches every shape' }}
          </span>
        </div>

        <!-- Where the coverage sits, by which pod each shape was derived from. This
             is the sentence the bare "17 never reached" was hiding: a pod normally
             covers its OWN corpus completely and none of anybody else's. -->
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span v-for="g in byOrigin" :key="g.key"
                :class="g.reached === g.total ? 'text-accent-2' : g.reached ? 'text-muted' : 'text-faint'">
            {{ g.label }} <strong>{{ g.reached }}/{{ g.total }}</strong>
          </span>
        </div>

        <p v-if="fullyCovered.length" class="mt-2 text-accent-2">
          {{ activeLabel }} reaches <strong>every</strong> shape drawn from {{ fullyCovered.join(' and ') }}.
        </p>

        <div v-if="cov.neverReached.length" class="mt-2 space-y-0.5">
          <p v-for="g in neverByOrigin" :key="g.key" class="text-danger">
            <span class="text-muted">Never reached, from {{ g.label }} —</span>
            <span v-for="(n, i) in g.nodes" :key="n.id">{{ i ? ' · ' : ' ' }}{{ n.title }}</span>
          </p>
        </div>

        <div class="mt-2 pt-2 border-t border-line flex flex-wrap gap-x-5 gap-y-1">
          <span :class="cov.totals.outcomesDelivered ? 'text-accent-2' : 'text-muted'">
            <strong>{{ cov.totals.outcomesDelivered }} of {{ cov.outcomes.length }}</strong> outcomes actually delivered by a line
          </span>
          <span v-if="cov.totals.unmapped" class="text-muted">
            <strong>{{ cov.totals.unmapped }}</strong> of its lines are not placed on the graph yet<span v-if="walkGap">{{ walkGap }}</span>
          </span>
        </div>
      </div>

      <!-- The graph -->
      <div ref="graphBox" class="bg-surface border border-line rounded-lg p-2 sm:p-3 overflow-x-auto scroll-mt-24">
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
              <text v-for="(line, li) in titleLines(n.title)" :key="li"
                    :x="pos(n.id).x + 9" :y="pos(n.id).y + 35 + li * 13" class="tile-name">{{ line }}</text>
              <text :x="pos(n.id).x + 9" :y="pos(n.id).y + 64" class="tile-sub">{{ n.kind === 'bound-pair' ? 'bound pair' : originLabel(n.origin) }}</text>
            </g>
          </g>
        </svg>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-faint">
        <span><span class="key key-never"></span> this pod never reaches it</span>
        <span><span class="key key-once"></span> reached once</span>
        <span><span class="key key-twice"></span> reached twice or more <span class="text-faint">(×n on the tile)</span></span>
        <span><span class="key key-base"></span> no pod laid over the graph</span>
      </div>
      <p class="mt-1 text-xs text-faint">
        Lines read downwards: the shape at the bottom of a line happens <em>inside</em> the shape at the top.
        Acquaintance can contain another acquaintance, so the store draws that one on the tile rather than as a line.
      </p>

      <!-- Detail: whatever was last tapped -->
      <div v-if="node" ref="panel" class="mt-6 bg-surface border border-line rounded-lg p-4">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-mono text-accent-2 text-lg">{{ node.id }}</span>
          <span class="text-ink font-semibold">{{ node.title }}</span>
          <span class="text-faint text-xs">from {{ node.kind === 'bound-pair' ? 'the bound pairs' : originLabel(node.origin) }}</span>
          <button class="ml-auto ui-chip" @click="backToGraph">↑ back to the graph</button>
        </div>
        <p class="text-muted text-sm mt-2"><span class="text-faint">how it runs:</span> {{ node.sequence || '—' }}</p>

        <div class="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p class="text-faint mb-1">Happens inside</p>
            <p v-if="!containers.length" class="text-muted">nothing — this is a whole exchange in its own right</p>
            <button v-for="c in containers" :key="c" class="chip" @click="tapNode(c)">{{ c }} {{ titleOf(c) }}</button>
          </div>
          <div>
            <p class="text-faint mb-1">Contains, in turn</p>
            <p v-if="!contains.length" class="text-muted">nothing — nothing else happens inside it</p>
            <button v-for="c in contains" :key="c" class="chip" @click="tapNode(c)">{{ c }} {{ titleOf(c) }}</button>
          </div>
        </div>

        <div v-if="survForNode.length" class="mt-3 text-xs">
          <p class="text-faint mb-1">What the learner has to survive here</p>
          <p v-for="s in survForNode" :key="s.id" class="text-muted">
            <strong class="text-ink">{{ s.presupposes }}</strong> — a learner can only attempt <em>{{ s.attemptable }}</em> if they can survive this.
            <span :class="/never/i.test(String(s.recoveryAttested)) ? 'text-danger' : 'text-faint'">How often the scripts show anyone recovering from it: {{ s.recoveryAttested }}</span>
          </p>
        </div>

        <div v-if="cov" class="mt-4 border-t border-line pt-3">
          <p v-if="!nodeLines.length" class="text-danger text-sm">
            <strong>{{ activeLabel }} never reaches this shape.</strong>
            <span class="text-muted"> No line in its script walks it<span v-if="node && node.origin !== 'pod-1'">, and it was not drawn from this pod's corpus — it came from {{ originLabel(node.origin) }}</span>.</span>
          </p>
          <template v-else>
            <p class="text-xs text-faint mb-2">The lines of {{ activeLabel }} that walk this shape — {{ nodeLines.length }} of them, across {{ nodeScenes }} scenes</p>
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


      <!-- The outcome overlay: nine shapes, delivery not siting -->
      <h2 class="text-sm font-semibold text-ink mt-7 mb-1">What the learner has to survive — {{ graph.outcomes.length }} outcomes</h2>
      <p class="text-xs text-faint mb-2">Listed in the order the course delivers them, not by number. An outcome counts as delivered only when a line actually delivers it.</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="o in outcomes" :key="o.id"
                class="px-2.5 py-1.5 rounded border text-xs text-left"
                :class="[
                  selectedOutcome === o.id ? 'border-accent-2' : 'border-line',
                  o.delivered ? 'bg-surface text-accent-2' : 'bg-surface text-muted'
                ]"
                @click="tapOutcome(o.id)">
          <span class="font-mono">{{ o.id }}</span> {{ o.name }}
          <span v-if="cov" :class="o.delivered ? 'text-accent-2' : 'text-muted'">· {{ o.delivered ? 'delivered' : (o.siteInWalk ? 'moment present, not delivered' : 'not delivered') }}</span>
        </button>
      </div>

      <div v-if="outcome" class="mt-6 bg-surface border border-line rounded-lg p-4 text-sm">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="font-mono text-accent-2 text-lg">{{ outcome.id }}</span>
          <span class="text-ink font-semibold">{{ outcome.name }}</span>
          <span class="text-faint text-xs">{{ outcome.mustBeMinted ? 'minted' : outcome.attested }}</span>
          <button class="ml-auto ui-chip" @click="selectedOutcome = null">close</button>
        </div>
        <p class="text-muted mt-2"><span class="text-faint">what the learner must be able to do:</span> {{ outcome.recovery }}</p>
        <p class="text-muted mt-1"><span class="text-faint">where in the script it hangs from:</span> {{ outcome.sitedOn }}</p>
        <p v-if="cov" class="mt-2" :class="outcome.delivered ? 'text-accent-2' : 'text-accent'">
          {{ activeLabel }}: {{ outcome.delivered ? 'delivered — a line in the script declares it' : 'not delivered' }}<span v-if="!outcome.delivered && outcome.siteInWalk">, although the moment it hangs from IS in the script — the line that delivers it has not been written yet</span>.
        </p>
      </div>

      <div class="mt-8 text-xs text-faint space-y-1">
        <p>The graph comes from <code>{{ graph.source }}</code> and is read unchanged. {{ graph.provenance }}</p>
        <p>Coverage is computed by the same module the Script Lab uses — one graph, one home, many readers, no second opinion.</p>
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
const graphBox = ref(null)

function backToGraph () {
  selectedNode.value = null
  graphBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

const LABELS = {
  'pod-1': 'POD 1',
  'learning-flagship': 'Learning flagship',
  'method-pod-chapters': 'Method Pod — chapters',
  'method-pod-43-scene': 'Method Pod — 43 scenes'
}

const ORDER = ['pod-1', 'method-pod-43-scene', 'method-pod-chapters', 'learning-flagship']

// Slates whose row numbers collide with this graph's by accident read as 0 of 35
// shapes and every tile red, which is true of the numbers and a lie about the pod.
// Such a slate is not shown here at all — nothing on this graph is theirs to say.
// The two that were hidden here, 'pod-1' and 'pod-0.5', were the sacked
// pre-metagraph slates; they were archived and deleted on 2026-09-01 and the live
// slate took the name 'pod-1'. Nothing needs hiding today. Reversible in one line.
const HIDDEN = new Set([])

// The store names each shape's provenance in its own slugs; the page says them
// the way a person says them. Same shape, one name, everywhere on screen.
const ORIGINS = {
  'pod-1': 'POD 1',
  'method-pod': 'the Method Pod',
  'talk-bollocks': 'Talk Bollocks',
  trades: 'the Trades pod'
}
function originLabel (o) { return ORIGINS[o] || o }

const activeLabel = computed(() => LABELS[active.value] || active.value || '')

function pos (id) { return layout.positions.get(id) || { x: 0, y: 0, w: 0, h: 0 } }
/** A tile title over at most two lines, broken at a space or a hyphen, never
 *  mid-word if a break point will do. Four titles in the store are long enough
 *  that the old single-line 22-character cut left "Complaint-with-partne…" on
 *  the graph; the budget here is what actually FITS a 152px tile at 12px. */
const TITLE_CHARS = 18
function titleLines (t) {
  const text = String(t || '')
  if (text.length <= TITLE_CHARS) return [text]
  // Keep the hyphen on the end of the piece it belongs to, so "Complaint-with-"
  // wraps where a reader would wrap it.
  const parts = text.split(/(?<=-)|\s+/).filter(Boolean)
  let first = ''
  for (const part of parts) {
    const next = first && !first.endsWith('-') ? first + ' ' + part : first + part
    if (next.length > TITLE_CHARS) break
    first = next
  }
  if (!first) return [text.slice(0, TITLE_CHARS - 1) + '…']
  let rest = text.slice(first.length).trim()
  if (!rest) return [first]
  if (rest.length > TITLE_CHARS) rest = rest.slice(0, TITLE_CHARS - 1) + '…'
  return [first, rest]
}
function titleOf (id) { return (graph.nodes.find(n => n.id === id) || {}).title || '' }

const covByNode = computed(() => {
  const m = new Map()
  for (const n of cov.value?.nodes || []) m.set(n.id, n)
  return m
})
function visits (id) { return covByNode.value.get(id)?.traversals || 0 }

/** Coverage grouped by WHERE each shape was derived from. The bare "17 never
 *  reached" reads as seventeen failures; grouped, it says the true thing — a pod
 *  covers its own corpus and none of anybody else's, which is the whole point of
 *  laying one pod over a graph the others also live on. */
const byOrigin = computed(() => {
  if (!cov.value) return []
  const groups = new Map()
  for (const n of graph.nodes) {
    const key = n.kind === 'bound-pair' ? 'bound-pairs' : n.origin
    if (!groups.has(key)) groups.set(key, { key, label: key === 'bound-pairs' ? 'bound pairs' : originLabel(n.origin), reached: 0, total: 0 })
    const g = groups.get(key)
    g.total++
    if (visits(n.id)) g.reached++
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
})

/** The store's own named gap, said in a sentence, and ONLY for the pod whose
 *  accounting it is. Not a defect in this page and not hidden: the walks that
 *  place those lines have not been encoded yet. */
const walkGap = computed(() => {
  if (active.value !== 'pod-1') return ''
  const a = graph.accounting
  if (!a?.complete_walks_encoded_here || !a?.complete_walks_in_corpus) return ''
  return ` — ${a.complete_walks_encoded_here} of its ${a.complete_walks_in_corpus} complete walks are encoded in the store so far`
})

/** The shapes this pod never reaches, grouped by where each was drawn from —
 *  seventeen names with seventeen repeated parentheticals was a wall of red. */
const neverByOrigin = computed(() => {
  const groups = new Map()
  const kindOf = new Map(graph.nodes.map(n => [n.id, n.kind]))
  for (const n of cov.value?.neverReached || []) {
    // Same grouping as the per-origin line above: a bound pair is its own thing,
    // not a POD 1 shape, and listing it as one contradicted the counts.
    const key = kindOf.get(n.id) === 'bound-pair' ? 'bound-pairs' : (n.origin || 'other')
    if (!groups.has(key)) groups.set(key, { key, label: key === 'bound-pairs' ? 'the bound pairs' : originLabel(key), nodes: [] })
    groups.get(key).nodes.push(n)
  }
  return [...groups.values()].sort((a, b) => b.nodes.length - a.nodes.length)
})

const fullyCovered = computed(() =>
  byOrigin.value.filter(g => g.total && g.reached === g.total).map(g => g.label))
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
    // A pod carrying a stored walk is read through it; pod-1 carries none and
    // keeps the row-reference path. Same reading as the Script Lab — no second
    // opinion about what a pod's walk is.
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
    // The pod the graph was derived from leads. Alphabetical order buried POD 1
    // in the middle of a row of also-rans.
    const rank = s => ORDER.indexOf(s) === -1 ? ORDER.length : ORDER.indexOf(s)
    pods.value = (body.pods || [])
      .filter(p => !HIDDEN.has(p.slug))
      .map(p => ({ ...p, label: LABELS[p.slug] || p.slug }))
      .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug))
  } catch (e) {
    podsError.value = e.message
    pods.value = [{ slug: 'pod-1', label: LABELS['pod-1'], lines: null }]
  }
  // Arrive with a picture, not with a grey lattice: POD 1 is the pod this graph
  // was derived from and the one whose overlay tells the story. "Graph only" is
  // still one tap away.
  if (active.value === null && pods.value.some(p => p.slug === 'pod-1')) await select('pod-1')
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
.key-base { background: var(--surface-2); border-color: var(--muted); }
.key-never { background: color-mix(in srgb, var(--danger) 16%, var(--surface-2)); border-color: var(--danger); }
.key-once { background: color-mix(in srgb, var(--accent-2) 20%, var(--surface-2)); border-color: var(--accent-2); }
.key-twice { background: color-mix(in srgb, var(--accent-2) 42%, var(--surface-2)); border-color: var(--accent-2); }
.chip { display: inline-block; margin: 0 4px 4px 0; padding: 2px 7px; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: 11px; }
.chip:hover { border-color: var(--accent-2); color: var(--ink); }
</style>
