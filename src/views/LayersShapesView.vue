<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="mx-auto">
      <LabCrumbs :trail="[{ label: 'Home', to: '/' }, { label: 'Script Lab', to: '/canonical/scripts' }, { label: 'Layers × shapes' }]" />

      <h1 class="text-2xl sm:text-3xl page-title mb-1">Layers × Q/R/S × shapes</h1>
      <p class="page-lede text-sm mb-1 max-w-4xl">
        Where the seeds and the pods sit on the seven speakability layers, whether each line asks, responds or states,
        and which metagraph shape it occupies — so the empty cells are a picture, not a hunch.
        <router-link to="/canonical/metagraph" class="underline">The metagraph →</router-link>
      </p>
      <p class="text-faint text-xs mb-4 max-w-4xl">
        Generated on every load from the stored tags and the live seeds and pod lines. A new line, or one whose text was edited since it was tagged,
        is counted as <strong class="text-ink">untagged</strong> — never guessed. Nothing here is edited by hand.
      </p>

      <p v-if="error" class="text-danger text-xs mb-3">Unavailable — {{ error }}</p>
      <p v-else-if="!d" class="text-muted text-sm">Loading…</p>

      <template v-if="d">
        <div class="bg-surface border border-line rounded-lg px-4 py-3 mb-5 text-xs">
          <div class="flex flex-wrap gap-x-5 gap-y-1">
            <span v-for="s in d.sources" :key="s.id" class="text-muted">
              <strong class="text-ink">{{ s.label }}</strong> {{ s.tagged }} of {{ s.total }} tagged
              <template v-if="s.untaggedCount"> · <strong class="text-ink">{{ s.untaggedCount }} untagged</strong></template>
            </span>
            <span class="text-faint">generated {{ stamp }}</span>
            <button class="underline text-muted" @click="load(true)">refresh</button>
          </div>
        </div>

        <h2 class="text-lg font-semibold mb-1">1. The grid</h2>
        <p class="text-faint text-xs mb-2">Each cell: seeds · then each pod, in the column order above. ◌ = empty or thin in the seeds (≤ {{ d.thinLimit }}).</p>
        <div class="overflow-x-auto mb-2">
          <table class="text-xs border-collapse">
            <thead><tr><th class="cell head">Layer</th><th v-for="q in QL" :key="q.k" class="cell head">{{ q.n }}</th></tr></thead>
            <tbody>
              <tr v-for="row in d.grid" :key="row.layer">
                <th class="cell head text-left">{{ row.layer }} {{ d.layers[row.layer] }}</th>
                <td v-for="c in row.cells" :key="c.qrs" class="cell" :class="{ thin: c.thin }">{{ cellText(c) }}<span v-if="c.thin"> ◌</span></td>
              </tr>
              <tr>
                <th class="cell head text-left">All</th>
                <td v-for="t in d.totals" :key="t.qrs" class="cell">{{ [t.seeds].concat(podIds.map(p => t.pods[p])).join(' · ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-faint text-xs mb-5">Column order after the seeds: {{ podIds.map(podLabel).join(' · ') }}.</p>

        <h3 class="text-base font-semibold mb-1">Named gaps — the empty and thin cells</h3>
        <ul class="text-xs mb-5 space-y-2 max-w-4xl">
          <li v-for="g in d.gaps" :key="g.layer + g.qrs">
            <strong class="text-ink">L{{ g.layer }} {{ d.layers[g.layer] }} × {{ g.qrs }}</strong>
            <span class="text-muted"> — seeds {{ g.seeds }}, {{ podIds.map(p => podLabel(p) + ' ' + g.pods[p]).join(', ') }}</span>
            <div v-if="g.seedExamples.length" class="text-muted">seeds: {{ quoted(g.seedExamples) }}</div>
            <div v-if="g.podExamples.length" class="text-muted">pods: {{ quoted(g.podExamples) }}</div>
          </li>
          <li v-if="!d.gaps.length" class="text-muted">No thin cells in the seeds.</li>
        </ul>

        <h3 class="text-base font-semibold mb-1">When each cell first opens in the seed order</h3>
        <div class="overflow-x-auto mb-2">
          <table class="text-xs border-collapse">
            <thead><tr><th class="cell head">Layer</th><th v-for="q in QL" :key="q.k" class="cell head">{{ q.k }}</th></tr></thead>
            <tbody>
              <tr v-for="row in d.firstOpen" :key="row.layer">
                <th class="cell head text-left">{{ row.layer }} {{ d.layers[row.layer] }}</th>
                <td v-for="(c, i) in row.cells" :key="i" class="cell">{{ c ? `${c.first} (+${c.more})` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-faint text-xs mb-6">Q / R / S share by seed band: {{ d.bands.map(b => `${b.band}: Q ${b.Q}, R ${b.R}, S ${b.S}`).join('; ') }}.</p>

        <h2 class="text-lg font-semibold mb-1">2. Layer × shape</h2>
        <p class="text-faint text-xs mb-2 max-w-4xl">
          Shape = the metagraph exchange node a pod line is a position in. A line in two nodes counts in both. Only pod lines that carry shape information appear here.
        </p>
        <div class="overflow-x-auto mb-3">
          <table class="text-xs border-collapse">
            <thead><tr><th class="cell head">Shape</th><th v-for="l in LAYERS" :key="l" class="cell head">L{{ l }}</th><th class="cell head">lines</th><th class="cell head">layers</th></tr></thead>
            <tbody>
              <tr v-for="s in d.layerShape.shapes" :key="s.id">
                <th class="cell head text-left">{{ s.name }}</th>
                <td v-for="(n, i) in s.counts" :key="i" class="cell text-center">{{ n || '·' }}</td>
                <td class="cell text-center">{{ s.lines }}</td><td class="cell text-center">{{ s.span }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs mb-2 max-w-4xl"><strong class="text-ink">Shapes in the store no pod line occupies ({{ d.layerShape.unusedShapes.length }}):</strong>
          <span class="text-muted"> {{ d.layerShape.unusedShapes.map(s => s.name).join(', ') || 'none' }}.</span></p>
        <p class="text-xs mb-1"><strong class="text-ink">Layer with no shape</strong> <span class="text-faint">— pod lines that sit in no node</span></p>
        <ul class="text-xs mb-3 text-muted max-w-4xl">
          <li v-for="n in d.layerShape.layerNoShape" :key="n.layer">
            L{{ n.layer }} {{ d.layers[n.layer] }}:
            <template v-if="!n.total">no pod lines at all.</template>
            <template v-else>{{ n.unshaped }}/{{ n.total }} unshaped<span v-if="n.examples.length"> — e.g. {{ quoted(n.examples) }}</span></template>
          </li>
        </ul>
        <p class="text-xs mb-1"><strong class="text-ink">Shape that is a layer</strong> <span class="text-faint">— ≥ 80% of its lines in one layer</span></p>
        <ul class="text-xs mb-4 text-muted">
          <li v-for="s in d.layerShape.shapeIsLayer" :key="s.shape">{{ s.shape }} → L{{ s.layer }} {{ d.layers[s.layer] }} ({{ s.n }}/{{ s.of }})</li>
          <li v-if="!d.layerShape.shapeIsLayer.length">none yet.</li>
        </ul>
        <p class="text-xs mb-1"><strong class="text-ink">Response moves (F-families) by layer</strong></p>
        <div class="overflow-x-auto mb-2">
          <table class="text-xs border-collapse">
            <thead><tr><th class="cell head">Move</th><th v-for="l in LAYERS" :key="l" class="cell head">L{{ l }}</th><th class="cell head">lines</th></tr></thead>
            <tbody>
              <tr v-for="f in d.layerShape.fmoves" :key="f.id">
                <th class="cell head text-left">{{ f.id }} {{ f.name }}</th>
                <td v-for="(n, i) in f.counts" :key="i" class="cell text-center">{{ n || '·' }}</td>
                <td class="cell text-center">{{ f.lines }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-muted mb-6">F-families no pod line fills: {{ d.layerShape.unusedFmoves.map(f => `${f.id} ${f.name}`).join(', ') || 'none' }}.</p>

        <h2 class="text-lg font-semibold mb-1">3. Found flows</h2>
        <p class="text-faint text-xs mb-2 max-w-4xl">Where one shape hands on to the next inside a conversation (≥ 2 times), with the hinge turns verbatim.</p>
        <ul class="text-xs mb-4 space-y-1 max-w-4xl">
          <li v-for="t in d.flows.transitions" :key="t.from + t.to">
            <strong class="text-ink">{{ t.from }} → {{ t.to }}</strong> <span class="text-muted">×{{ t.n }} ({{ t.srcs.map(podLabel).join(', ') }}): {{ quoted([t.hinge[0]]) }} → {{ quoted([t.hinge[1]]) }}</span>
          </li>
          <li v-if="!d.flows.transitions.length" class="text-muted">None recur yet.</li>
        </ul>
        <p class="text-xs mb-1"><strong class="text-ink">The store's own complete pod-1 walks</strong></p>
        <ul class="text-xs mb-4 text-muted">
          <li v-for="w in d.flows.storeWalks" :key="w.id">{{ w.id }} {{ w.name }}: {{ w.nodes.join(' → ') }}<span v-if="w.opens"> — opens "{{ w.opens }}"</span></li>
        </ul>
        <p class="text-xs mb-1"><strong class="text-ink">Move sequences that recur</strong> <span class="text-faint">(runs of one move collapsed; ≥ 3 times)</span></p>
        <ul class="text-xs mb-4 text-muted max-w-4xl">
          <li v-for="m in d.flows.moveSeqs" :key="m.seq"><strong class="text-ink">{{ m.seq }}</strong> ×{{ m.n }} — {{ quoted(m.lines) }}</li>
        </ul>
        <p class="text-xs mb-1"><strong class="text-ink">The conversation-flow moves themselves</strong></p>
        <div class="overflow-x-auto mb-6">
          <table class="text-xs border-collapse">
            <thead><tr><th class="cell head">Move</th><th v-for="p in podIds" :key="p" class="cell head">{{ podLabel(p) }}</th></tr></thead>
            <tbody>
              <tr v-for="m in d.flows.moveTable" :key="m.move">
                <th class="cell head text-left">{{ m.move }}</th>
                <td v-for="p in podIds" :key="p" class="cell text-center">{{ m.byPod[p] || '·' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 class="text-lg font-semibold mb-1">4. Untagged, and how this was made</h2>
        <div v-for="s in d.sources.filter(x => x.untaggedCount)" :key="s.id" class="text-xs mb-3 max-w-4xl">
          <strong class="text-ink">{{ s.label }}: {{ s.untaggedCount }} untagged</strong>
          <span class="text-faint"> (first {{ s.untagged.length }})</span>
          <ul class="text-muted">
            <li v-for="u in s.untagged" :key="u.id">{{ u.id }} <em>{{ u.reason === 'changed' ? 'text changed since tagged' : u.reason }}</em> — "{{ u.text }}"</li>
          </ul>
        </div>
        <p v-if="!d.untaggedTotal" class="text-xs text-muted mb-3">Every live line has a current tag.</p>
        <p v-if="d.namedGaps.emptyPodLayers.length" class="text-xs mb-3 max-w-4xl">
          <strong class="text-ink">Layers no tagged pod line reaches:</strong>
          <span class="text-muted"> {{ d.namedGaps.emptyPodLayers.map(l => 'L' + l + ' ' + d.layers[l]).join(', ') }}.</span>
        </p>
        <p class="text-faint text-xs max-w-4xl">{{ d.provenance }}</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import LabCrumbs from '@/components/LabCrumbs.vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const LAYERS = ['0', '1', '2', '3', '4', '5', '6']
const QL = [{ k: 'Q', n: 'Q (asks)' }, { k: 'R', n: 'R (responds)' }, { k: 'S', n: 'S (states)' }]
const d = ref(null)
const error = ref('')
const { getAccessToken } = useAuth()

const podIds = computed(() => (d.value ? d.value.sources.filter(s => s.id !== 'seeds').map(s => s.id) : []))
const podLabel = (id) => (d.value?.sources.find(s => s.id === id)?.label || id)
const stamp = computed(() => (d.value ? new Date(d.value.generatedAt).toLocaleString('en-GB') : ''))
const cellText = (c) => [c.seeds].concat(podIds.value.map(p => c.pods[p])).join(' · ')
const quoted = (xs) => xs.map(x => `"${x.text}" (${x.id})`).join(' / ')

async function load (fresh = false) {
  error.value = ''
  try {
    const token = await getAccessToken()
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${getApiUrl()}/api/admin/speakability-grid${fresh ? '?fresh=1' : ''}`, { headers })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
    d.value = await res.json()
  } catch (e) {
    error.value = e.message || String(e)
  }
}
onMounted(() => load())
</script>

<style scoped>
.cell { border: 1px solid var(--line); padding: 3px 8px; white-space: nowrap; }
.cell.head { background: var(--surface); font-weight: 600; }
.cell.thin { color: var(--faint); }
</style>
