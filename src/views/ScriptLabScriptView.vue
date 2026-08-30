<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/canonical/scripts" class="text-accent-2 hover:opacity-80">Script Lab</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">{{ slug }}</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-accent-2 mb-1">{{ title }}</h1>
      <p class="text-muted text-sm mb-1">
        The whole script, scene by scene, with no course loaded — and what it does to the graph.
      </p>
      <p v-if="readOnly" class="text-accent text-xs mb-4">
        Read-only: this script lives in a document, not in the canonical store.
      </p>
      <p v-else class="text-accent text-xs mb-4">
        Edits change the language-neutral English master every course flexes from. They change no generated pod.
      </p>

      <div v-if="loading" class="text-faint py-12 text-center">Loading…</div>
      <div v-else-if="error" class="error-box border rounded-lg p-4">{{ error }}</div>

      <template v-else>
        <!-- ══ COVERAGE — the reason this page exists ══ -->
        <section class="bg-surface border border-line rounded-lg mb-6 overflow-hidden">
          <div class="px-4 sm:px-5 py-3 border-b border-line">
            <h2 class="font-semibold text-ink">Coverage — this script as a walk over the graph</h2>
          </div>

          <div class="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
            <div class="py-3">
              <div class="text-2xl font-bold text-ink">{{ cov.totals.traversed }}<span class="text-faint text-base">/{{ cov.totals.nodes }}</span></div>
              <div class="text-xs text-muted">shapes traversed</div>
            </div>
            <div class="py-3">
              <div class="text-2xl font-bold text-ink">{{ cov.totals.hitTwice }}</div>
              <div class="text-xs text-muted">hit twice or more</div>
            </div>
            <div class="py-3">
              <div class="text-2xl font-bold" :class="cov.totals.neverReached ? 'text-danger' : 'text-accent-2'">{{ cov.totals.neverReached }}</div>
              <div class="text-xs text-muted">never reached</div>
            </div>
          </div>

          <!-- the deficit list, live -->
          <div class="px-4 sm:px-5 py-4 deficit border-b border-line">
            <h3 class="text-sm font-semibold text-danger mb-2">Never reached — the deficit list</h3>
            <p v-if="!cov.neverReached.length" class="text-xs text-accent-2">Every shape in the graph is traversed by this walk.</p>
            <ul v-else class="space-y-1.5">
              <li v-for="n in cov.neverReached" :key="n.id" class="text-sm flex flex-wrap gap-x-2">
                <span class="font-mono text-xs text-danger pt-0.5">{{ n.id }}</span>
                <span class="text-ink">{{ n.title }}</span>
                <span class="text-xs text-faint w-full sm:w-auto">{{ n.sequence }}</span>
                <span v-if="n.partialGroups" class="text-xs text-accent">{{ n.partialGroups }} attestation{{ n.partialGroups === 1 ? '' : 's' }} only partly present</span>
              </li>
            </ul>
          </div>

          <!-- the overlay's nine -->
          <div class="px-4 sm:px-5 py-4 border-b border-line">
            <h3 class="text-sm font-semibold text-ink mb-1">Outcome shapes — {{ cov.totals.outcomesDelivered }} delivered, {{ cov.totals.outcomesMissing }} missing</h3>
            <p class="text-xs text-faint mb-2">
              An outcome counts as delivered only when a line declares it. The ask it is <em>sited on</em> being present is not delivery.
            </p>
            <ul class="space-y-1">
              <li v-for="o in cov.outcomes" :key="o.id" class="text-sm flex flex-wrap gap-x-2 items-baseline">
                <span class="font-mono text-xs" :class="o.delivered ? 'text-accent-2' : 'text-danger'">{{ o.id }}</span>
                <span :class="o.delivered ? 'text-muted' : 'text-ink'">{{ o.name }}</span>
                <span v-if="o.mustBeMinted" class="text-xs text-accent">attested nowhere — must be minted</span>
                <span v-else-if="!o.delivered" class="text-xs text-faint">{{ o.attested }}</span>
                <span class="text-xs text-faint w-full sm:w-auto">recovery: {{ o.recovery }}</span>
              </li>
            </ul>
          </div>

          <!-- survivability, carrying the corpus's null result -->
          <div class="px-4 sm:px-5 py-4 border-b border-line">
            <h3 class="text-sm font-semibold text-ink mb-1">
              Survivability — {{ exercised.length }} of {{ cov.survivability.length }} edges exercised
            </h3>
            <p class="text-xs text-faint mb-2">
              The graph carries no safety weight of its own. What it does carry is whether the recovery was ever attested — the honest proxy, surfaced rather than invented.
            </p>
            <ul class="space-y-1">
              <li v-for="s in exercised" :key="s.id" class="text-sm flex flex-wrap gap-x-2 items-baseline">
                <span class="font-mono text-xs text-accent-2">{{ s.id }}</span>
                <span class="text-ink">{{ s.presupposes }}</span>
                <span class="text-xs" :class="s.recoveryRank === 0 ? 'text-danger font-semibold' : s.recoveryRank === 1 ? 'text-accent' : 'text-muted'">
                  <span v-if="s.recoveryRank === 0">⚠ </span>recovery: {{ s.recoveryAttested }}
                </span>
              </li>
            </ul>
          </div>

          <!-- what the graph could not say -->
          <div class="px-4 sm:px-5 py-3 text-xs text-faint space-y-1">
            <p>
              {{ cov.totals.steps }} lines · {{ cov.totals.mapped }} mapped to a shape ·
              {{ cov.totals.branches }} on a branch ·
              {{ cov.totals.codas }} scene-exit vocabulary drips ·
              {{ cov.totals.alternatives }} surface variants ·
              <span :class="cov.totals.unmapped ? 'text-accent' : ''">{{ cov.totals.unmapped }} UNMAPPED</span>
            </p>
            <p v-if="cov.totals.unmapped">
              Unmapped means the graph has nothing to say about the line — not that the line is wrong.
              <template v-if="graph.accounting">
                The store encodes {{ graph.accounting.complete_walks_encoded_here }} of the {{ graph.accounting.complete_walks_in_corpus }} complete walks,
                so {{ graph.accounting.rows_on_complete_walks_not_yet_placed }} rows that lie on a complete walk are counted but not yet placed on one,
                and the {{ graph.accounting.drill_rows_scenes_15_21 }} truncated drill rows of scenes 15–21 carry no shape.
                Encoding the remaining walks is what moves this number.
              </template>
            </p>
            <p v-if="walk.declarations && walk.declarations.length">
              <span class="text-muted">Shape declarations:</span>
              {{ walk.declarations.length }} declared ·
              {{ walk.declarations.length - walk.unresolved.length }} resolved against the store ·
              <span class="text-accent">{{ walk.unresolved.length }} UNRESOLVED</span>
              ({{ unresolvedByRegister }}).
              An unresolved declaration is a shape the pod names that the store has no id for. It is
              counted, never guessed into a mapping.
            </p>
            <p>Graph: <code>{{ graph.source }}</code> — {{ graph.provenance }}</p>
          </div>
        </section>

        <!-- ══ THE SCRIPT ══ -->
        <div class="space-y-6">
          <div v-for="(scene, idx) in walk.scenes" :key="scene.number" class="bg-surface border border-line rounded-lg overflow-hidden">
            <div class="px-4 sm:px-5 py-3 border-b border-line flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span class="text-xs font-mono text-accent-2 bg-surface-2 border border-line px-1.5 py-0.5 rounded">{{ idx + 1 }}/{{ walk.scenes.length }}</span>
              <span class="text-xs font-mono text-faint">{{ scene.label || ('Scene ' + scene.number) }}</span>
              <span class="font-semibold text-ink">{{ scene.title }}</span>
              <span v-if="scene.subtitle" class="text-xs italic text-faint">{{ scene.subtitle }}</span>
              <span class="ml-auto text-xs" :class="sceneShapes(scene).length ? 'text-accent-2' : 'text-faint'">
                {{ sceneShapes(scene).join(' ') || 'no shape' }}
              </span>
              <span v-if="sceneUnresolved(scene).length" class="basis-full text-xs text-accent">
                declared, unresolved: {{ sceneUnresolved(scene).join(' · ') }}
              </span>
            </div>
            <div class="divide-y divide-line/60">
              <div v-for="(step, i) in scene.steps" :key="step.payload.id || i" class="px-4 sm:px-5 py-2.5 flex flex-wrap sm:flex-nowrap items-start gap-2 sm:gap-3 hover:bg-surface-2">
                <span class="text-xs font-mono text-faint w-8 flex-shrink-0 pt-2">{{ step.ref || '·' }}</span>
                <span class="text-xs font-mono flex-shrink-0 pt-2 w-12" :title="stepTitle(step)"
                      :class="step.kind === 'move' ? 'text-accent-2' : step.kind === 'branch' ? 'text-accent' : step.kind === 'unmapped' ? 'text-danger' : 'text-faint'">
                  {{ step.nodeId || (step.kind === 'move' ? '' : KIND_TAG[step.kind]) }}
                </span>
                <span class="text-xs text-muted w-24 flex-shrink-0 truncate pt-2" :title="step.payload.speaker">{{ step.payload.speaker }}</span>
                <textarea
                  v-if="!readOnly"
                  v-model="step.payload.text"
                  rows="1"
                  @focus="step.payload._orig = step.payload.text"
                  @blur="saveLine(step)"
                  class="flex-1 min-w-0 basis-full sm:basis-auto bg-surface-2 border border-line focus:border-accent-2 rounded px-2 py-1.5 text-sm text-ink resize-y outline-none"
                />
                <div v-else class="flex-1 min-w-0 basis-full sm:basis-auto text-sm">
                  <div class="text-ink">{{ step.payload.text }}</div>
                  <div v-if="step.payload.target" class="text-xs text-muted italic">{{ step.payload.target }}</div>
                </div>
                <div v-if="!readOnly && step.payload.target" class="basis-full text-xs text-muted italic pl-2">
                  {{ step.payload.target }}<span class="text-faint not-italic"> · {{ step.payload.targetLang }} specimen, not editable here</span>
                </div>
                <span v-if="step.branch" class="text-xs text-accent flex-shrink-0 pt-2 basis-full sm:basis-auto">
                  fork · {{ step.branch.key }} arm{{ step.branch.continues ? '' : ' · no uptake' }}
                </span>
                <span v-else-if="step.variant" class="text-xs text-faint flex-shrink-0 pt-2 basis-full sm:basis-auto">
                  another way of saying {{ step.variant.of }}
                </span>
                <span v-if="!readOnly" class="w-14 flex-shrink-0 text-right pt-2 text-xs">
                  <span v-if="step.payload._saving" class="text-accent">saving…</span>
                  <span v-else-if="step.payload._saved" class="text-accent-2">saved ✓</span>
                  <span v-else-if="step.payload._err" class="text-danger" :title="step.payload._err">error</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph, loadMethodPodFlow } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromFlow, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'

const KIND_TAG = { coda: 'ADMITS', branch: 'BRANCH', alternative: 'VARIANT', unmapped: 'UNMAPPED' }
const route = useRoute()
const slug = route.params.slug || 'pod-0'
const readOnly = slug === 'method-pod'

const graph = loadGraph()
const walk = ref({ scenes: [], steps: [] })
const cov = ref(null)
const loading = ref(true)
const error = ref(null)
const title = computed(() => readOnly ? 'The Method Pod — the re-cut' : `Canonical script · ${slug}`)
const exercised = computed(() => (cov.value?.survivability || []).filter(s => s.exercised))
const unresolvedByRegister = computed(() => {
  const by = {}
  for (const d of walk.value?.unresolved || []) by[d.register] = (by[d.register] || 0) + 1
  return Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')
})

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

function sceneShapes (scene) {
  return [...new Set(scene.steps.flatMap(s => s.nodeIds || []))]
}
function sceneUnresolved (scene) {
  return (scene.declarations || []).filter(d => d.resolution === 'unresolved').map(d => d.declared_as)
}
function stepTitle (step) {
  if (step.kind === 'unmapped') return 'the graph has nothing to say about this line'
  if (step.kind === 'coda') return 'scene-exit vocabulary drip — ADMITS, never a move'
  if (step.branch) {
    return `the ${step.branch.polarity} arm of a fork at ${step.branch.node} — ${step.branch.alternative}. `
      + `${step.branch.continues ? 'The walk continues down this arm.' : 'This arm has no uptake in the corpus.'}`
  }
  if (step.variant) return `surface variance — another way of saying ${step.variant.of}. A phrasing, not a fork.`
  if (step.kind === 'alternative') return 'an alternative at a node, not a step on the path'
  const node = graph.nodes.find(n => n.id === step.nodeId)
  return node ? `${node.id} ${node.title} — ${node.sequence}` : ''
}

async function load () {
  loading.value = true
  error.value = null
  try {
    if (readOnly) {
      walk.value = walkFromFlow(loadMethodPodFlow(), graph)
    } else {
      const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(slug)}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      walk.value = (body.walk || []).length
        ? walkFromStoredPod(body.scenarios || [], body.walk, graph, { id: slug, slug })
        : walkFromCanonicalRows(body.scenarios || [], graph, { id: slug, slug })
    }
    cov.value = computeCoverage(graph, walk.value)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function saveLine (step) {
  const p = step.payload
  if (p.text === p._orig) return
  p._saving = true; p._saved = false; p._err = ''
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(p.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ english_text: p.text })
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    p._orig = p.text
    p._saved = true
    setTimeout(() => { p._saved = false }, 2000)
  } catch (err) {
    p._err = err.message
  } finally {
    p._saving = false
  }
}

onMounted(load)
</script>

<style scoped>
.error-box { color: var(--danger); border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface)); }
:root[data-theme="light"] .error-box { background: color-mix(in srgb, var(--danger) 8%, #ffffff); }
.deficit { background: color-mix(in srgb, var(--danger) 8%, var(--surface)); }
</style>
