<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-6xl mx-auto">
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
      <p class="text-accent text-xs mb-4">
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

        <!-- ══ THE SCRIPT ══
             The row/table treatment is lifted from src/views/production/SeedEditor.vue —
             a real table with named columns, generous cell padding, alternating rows and a
             hover state — because the complaint this fixes is that a `rows="1"` textarea
             clipped the sentence being edited. Here every cell simply renders its text, so
             the row grows to fit two- or three-line dialogue and nothing is ever truncated,
             at rest OR while editing.
        -->
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

            <table class="script-table">
              <thead>
                <tr>
                  <th class="col-ref">#</th>
                  <th class="col-speaker">Speaker</th>
                  <th class="col-canonical">Canonical English</th>
                  <th class="col-state">State</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(step, i) in scene.steps" :key="step.payload.id || i">
                  <tr class="script-row" :class="{ 'row-alt': i % 2 === 1, dirty: isDirty(step) }">
                    <td class="col-ref">
                      <span class="ref-num">{{ step.ref || '·' }}</span>
                      <span class="ref-kind" :title="stepTitle(step)"
                            :class="step.kind === 'move' ? 'text-accent-2' : step.kind === 'branch' ? 'text-accent' : step.kind === 'unmapped' ? 'text-danger' : 'text-faint'">
                        {{ step.nodeId || (step.kind === 'move' ? '' : KIND_TAG[step.kind]) }}
                      </span>
                    </td>

                    <td class="col-speaker" :title="step.payload.speaker">{{ step.payload.speaker }}</td>

                    <td class="col-canonical">
                      <!-- RESTING: the whole line, wrapped, never clipped. One tap opens it. -->
                      <div v-if="!isEditing(step)" class="canonical-read" @click="startEdit(step)">
                        <span class="canonical-text">{{ step.payload.text }}</span>
                        <span class="edit-hint">tap to edit</span>
                      </div>

                      <!-- EDITING: the draft is held locally. Blur does NOT save. Only the
                           explicit Save canonical button commits — canonical text is the
                           English master every course flexes from, so an accidental
                           keystroke or a stray click must never write it. -->
                      <div v-else class="canonical-edit">
                        <textarea
                          :ref="el => registerGrower(el, step.payload.id)"
                          v-model="drafts[step.payload.id]"
                          class="canonical-input"
                          rows="1"
                          @input="autoGrow($event.target)"
                          @keydown.escape.prevent="discardEdit(step)"
                          @keydown.enter.ctrl.prevent="commitEdit(step)"
                          @keydown.enter.meta.prevent="commitEdit(step)"
                        />
                        <p v-if="isDirty(step)" class="was-line">
                          <span class="was-label">was</span> {{ step.payload.text }}
                        </p>
                        <div class="confirm-bar">
                          <button type="button" class="btn-confirm" :disabled="!isDirty(step) || step.payload._saving" @click="commitEdit(step)">
                            {{ step.payload._saving ? 'Saving…' : 'Save canonical' }}
                          </button>
                          <button type="button" class="btn-discard" @click="discardEdit(step)">Discard</button>
                          <span v-if="isDirty(step)" class="unsaved-flag">unsaved — nothing is written until you save</span>
                          <span v-else class="text-xs text-faint">no change yet · Esc closes · Ctrl/⌘+Enter saves</span>
                        </div>
                      </div>

                      <!-- The target specimen is a rendering of THIS line, not a parallel
                           column of its own: it is read-only here and absent on most rows,
                           so it sits under the canonical text rather than costing every row
                           a column of width. -->
                      <p v-if="step.payload.target" class="specimen">
                        <span class="specimen-run" :dir="dirFor(step.payload.target)">{{ step.payload.target }}</span>
                        <span class="text-faint not-italic"> · {{ step.payload.targetLang }} specimen, not editable here</span>
                      </p>

                      <p v-if="step.branch" class="row-note text-accent">
                        fork · {{ step.branch.key }} arm{{ step.branch.continues ? '' : ' · no uptake' }}
                      </p>
                      <p v-else-if="step.variant" class="row-note text-faint">
                        another way of saying {{ step.variant.of }}
                      </p>
                    </td>

                    <td class="col-state">
                      <div class="state-stack">
                        <span v-if="step.payload._saving" class="text-accent text-xs">saving…</span>
                        <span v-else-if="step.payload._saved" class="text-accent-2 text-xs">saved ✓</span>
                        <span v-else-if="step.payload._err" class="text-danger text-xs" :title="step.payload._err">error</span>
                        <span v-else-if="isDirty(step)" class="text-accent text-xs">unsaved</span>

                        <!-- The chip is the whole affordance: tap to see what this line
                             used to say, tap a version to put it back. No drag, no
                             swipe, no long-press. -->
                        <button
                          v-if="edits(step.payload.id)"
                          type="button"
                          class="chip"
                          :class="{ on: openLine === step.payload.id }"
                          @click="toggleHistory(step.payload.id)"
                        >
                          edited {{ edits(step.payload.id).edits }}× ·
                          {{ shortWho(edits(step.payload.id).lastSavedBy) }} ·
                          {{ ago(edits(step.payload.id).lastSavedAt) }}
                          <span class="text-faint">{{ openLine === step.payload.id ? '▲' : '▼' }}</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="openLine === step.payload.id" class="history-row" :class="{ 'row-alt': i % 2 === 1 }">
                    <td colspan="4">
                      <div class="history">
                        <p v-if="hist(step.payload.id).loading" class="text-xs text-faint py-2">Loading history…</p>
                        <p v-else-if="hist(step.payload.id).error" class="text-xs text-danger py-2">{{ hist(step.payload.id).error }}</p>
                        <template v-else>
                          <p class="text-xs text-faint pb-2">
                            Newest first. Each one is diffed against the line as it stands now — struck-through words go, underlined words come in.
                            The frozen original at the bottom is what it said before anyone edited it.
                          </p>
                          <div v-for="v in hist(step.payload.id).versions" :key="v.versionId" class="version">
                            <div class="version-head">
                              <span class="text-xs" :class="v.kind === 'original' ? 'text-accent' : 'text-muted'">
                                {{ v.kind === 'original' ? 'original' : 'save' }} #{{ v.versionId }}
                              </span>
                              <span class="text-xs text-faint">{{ stamp(v.savedAt) }}</span>
                              <span class="text-xs text-muted truncate">{{ v.savedBy }}</span>
                              <button
                                v-if="v.englishText !== step.payload.text"
                                type="button"
                                class="chip restore"
                                :disabled="hist(step.payload.id).restoring === v.versionId"
                                @click="restore(step, v.versionId)"
                              >{{ hist(step.payload.id).restoring === v.versionId ? 'restoring…' : 'restore' }}</button>
                              <span v-else class="text-xs text-accent-2">this is the line now</span>
                            </div>
                            <p class="diff">
                              <span v-for="(r, k) in diffOf(v, step)" :key="k" :class="r.kind">{{ r.text }}</span>
                            </p>
                          </div>
                        </template>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'
import { wordDiff } from '@/lib/wordDiff.js'
import { dirFor } from '@/utils/textDirection.js'

const KIND_TAG = { coda: 'ADMITS', branch: 'BRANCH', alternative: 'VARIANT', unmapped: 'UNMAPPED' }
const route = useRoute()
const slug = route.params.slug || 'pod-1'

const graph = loadGraph()
const walk = ref({ scenes: [], steps: [] })
const cov = ref(null)
const loading = ref(true)
const error = ref(null)
const title = computed(() => `Canonical script · ${slug}`)
const exercised = computed(() => (cov.value?.survivability || []).filter(s => s.exercised))
const unresolvedByRegister = computed(() => {
  const by = {}
  for (const d of walk.value?.unresolved || []) by[d.register] = (by[d.register] || 0) + 1
  return Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')
})

/*
 * CANONICAL EDITING IS EXPLICIT — TWO STEPS, ALWAYS.
 *
 * The text in this column is the language-neutral English master every course's
 * pod flexes from, so a stray keystroke, a paste into the wrong row or a blur on
 * the way past must never write it. Tapping a cell opens a draft held ONLY in
 * `drafts`; blur does nothing; the value reaches /api/canonical-script only when
 * the Save canonical button (or Ctrl/⌘+Enter) is pressed. Escape discards.
 *
 * A draft outlives the click that opened it: open another row and this one stays
 * open, flagged unsaved, so an edit is never silently thrown away either.
 */
const drafts = reactive({})            // scenario_id -> uncommitted text
const isEditing = step => Object.prototype.hasOwnProperty.call(drafts, step.payload.id)
const isDirty = step => isEditing(step) && drafts[step.payload.id] !== step.payload.text

function startEdit (step) {
  const id = step.payload.id
  if (!id) return
  drafts[id] = step.payload.text ?? ''
  step.payload._err = ''
  nextTick(() => autoGrow(growers[id]))
}

function discardEdit (step) {
  delete drafts[step.payload.id]
}

async function commitEdit (step) {
  const id = step.payload.id
  if (!isDirty(step)) { discardEdit(step); return }
  const ok = await saveLine(step, drafts[id])
  if (ok) delete drafts[id]
}

/* The row must grow with its content — that is the whole complaint being fixed —
   so the textarea is sized to its own scrollHeight on mount and on every input. */
const growers = {}
function registerGrower (el, id) {
  if (el) { growers[id] = el; autoGrow(el) } else { delete growers[id] }
}
function autoGrow (el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/* Uncommitted canonical edits must not vanish silently on a reload. */
function warnUnsaved (e) {
  if (!Object.keys(drafts).length) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))

// The history, per line: the summary chips come from one read of the whole
// script, the versions themselves are fetched the first time a chip is tapped.
const summary = ref({})     // scenario_id -> { edits, lastSavedAt, lastSavedBy }
const histories = ref({})   // scenario_id -> { loading, error, versions, restoring }
const openLine = ref(null)

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

/**
 * The versioning endpoints are Vercel routes (api/canonical-script.js), served
 * from THIS origin — not from the production API that serves the read above.
 * That is deliberate: api/* ships with every front-end deploy, whereas a new
 * route in services/production-api.cjs 404s live until somebody restarts a
 * shared long-lived process.
 */
async function vercelFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
  return body
}

const edits = id => summary.value[id] || null
const hist = id => histories.value[id] || { loading: true, versions: [] }

function shortWho (email) {
  return String(email || 'someone').split('@')[0]
}
function stamp (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function ago (iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

/** Every version is diffed against the line AS IT STANDS NOW — the comparison
 *  the reader is actually making: what would change if I put this back? */
function diffOf (version, step) {
  return wordDiff(version.englishText, step.payload.text ?? '')
}

async function loadSummary () {
  try {
    const body = await vercelFetch(`/api/canonical-script?slug=${encodeURIComponent(slug)}&history=1`)
    summary.value = Object.fromEntries((body.lines || []).map(l => [l.scenarioId, l]))
  } catch (err) {
    // A missing history is not a reason to hide the script. The chips simply
    // do not appear, and the page says so nowhere rather than crying wolf.
    console.warn('[ScriptLab] history summary unavailable:', err.message)
  }
}

async function toggleHistory (id) {
  if (openLine.value === id) { openLine.value = null; return }
  openLine.value = id
  await loadHistory(id)
}

async function loadHistory (id) {
  histories.value = { ...histories.value, [id]: { loading: true, versions: [], error: null } }
  try {
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(id)}`)
    histories.value = { ...histories.value, [id]: { loading: false, versions: body.versions || [], error: null } }
  } catch (err) {
    histories.value = { ...histories.value, [id]: { loading: false, versions: [], error: err.message } }
  }
}

async function restore (step, versionId) {
  const id = step.payload.id
  histories.value = { ...histories.value, [id]: { ...hist(id), restoring: versionId } }
  try {
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(id)}&restore=1`, {
      method: 'POST',
      body: JSON.stringify({ versionId })
    })
    step.payload.text = body.line?.englishText ?? step.payload.text
    delete drafts[id]
    step.payload._saved = true
    setTimeout(() => { step.payload._saved = false }, 2000)
    await Promise.all([loadHistory(id), loadSummary()])
  } catch (err) {
    histories.value = { ...histories.value, [id]: { ...hist(id), restoring: null, error: err.message } }
  }
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
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(slug)}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    walk.value = (body.walk || []).length
      ? walkFromStoredPod(body.scenarios || [], body.walk, graph, { id: slug, slug })
      : walkFromCanonicalRows(body.scenarios || [], graph, { id: slug, slug })
    cov.value = computeCoverage(graph, walk.value)
    await loadSummary()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

/**
 * The versioned save. Called ONLY from commitEdit — never from a blur, never from
 * a watcher. Returns true when the text is safely stored.
 */
async function saveLine (step, value) {
  const p = step.payload
  const text = String(value ?? '')
  if (text === p.text) return true
  p._saving = true; p._saved = false; p._err = ''
  try {
    // The versioned save: it freezes the pre-edit words the first time this
    // line is touched, appends this edit, and only then moves the live text.
    // The old PATCH straight onto canonical_pod_scenarios kept nothing.
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(p.id)}`, {
      method: 'POST',
      body: JSON.stringify({ english_text: text })
    })
    p.text = body.line?.englishText ?? text
    p._saved = true
    setTimeout(() => { p._saved = false }, 2000)
    if (!body.unchanged) {
      await loadSummary()
      if (openLine.value === p.id) await loadHistory(p.id)
    }
    return true
  } catch (err) {
    p._err = err.message
    return false
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

/* Tap is the only affordance: every control here is a button with a finger-sized
   target. No drag, no swipe, no long-press — Tom reads this on a 430px phone. */
/* ── The row/table treatment, lifted from src/views/production/SeedEditor.vue ──
   Named column heads, 0.6rem/1rem cell padding, a per-row bottom border,
   alternating shading and a hover state. Cells render text and let the row grow:
   that is what makes a three-line pod sentence readable without dragging a
   resize handle. Legibility beats density here — the complaint being fixed is
   that the line under edit could not be read. */
.script-table { width: 100%; border-collapse: collapse; }
.script-table thead { background: var(--surface-2); }
.script-table th {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  text-align: left;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--line);
}
.script-table td {
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: var(--ink);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  vertical-align: top;
}
.script-row.row-alt { background: color-mix(in srgb, var(--ink) 3%, transparent); }
.script-row:hover { background: color-mix(in srgb, var(--ink) 6%, transparent); }
/* An uncommitted canonical edit LOOKS different from a saved row. */
.script-row.dirty { box-shadow: inset 3px 0 0 var(--accent); }

.col-ref { width: 6.5rem; white-space: nowrap; }
.ref-num { font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 0.75rem; color: var(--faint); }
.ref-kind { display: block; font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 0.7rem; }
.col-speaker { width: 6rem; font-size: 0.8rem; color: var(--muted); }
.col-state { width: 11rem; }
.state-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

/* The editable canonical cell. Full text, wrapped, never clipped. */
.canonical-read { cursor: pointer; }
.canonical-text { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
.edit-hint { margin-left: 0.5rem; font-size: 0.7rem; color: transparent; white-space: nowrap; }
.canonical-read:hover .edit-hint { color: var(--faint); }

.canonical-input {
  width: 100%;
  display: block;
  overflow: hidden;          /* height is driven by autoGrow, never by a scrollbar */
  resize: none;
  font: inherit;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  color: var(--ink);
  background: var(--canvas);
  border: 1px solid var(--accent);
  outline: none;
}
.was-line {
  margin-top: 6px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
}
.was-label { color: var(--faint); text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; margin-right: 0.35rem; }
.confirm-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
.btn-confirm {
  min-height: 34px;
  padding: 4px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--canvas);
  background: var(--accent-2);
  border: 1px solid var(--accent-2);
}
.btn-confirm[disabled] { opacity: 0.4; }
.btn-discard {
  min-height: 34px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
}
.unsaved-flag { font-size: 11px; color: var(--accent); }

.specimen { margin-top: 6px; font-size: 0.78rem; font-style: italic; color: var(--muted); line-height: 1.45; }
/* An RTL specimen resolves its own trailing neutrals without moving the column. */
.specimen-run { unicode-bidi: isolate; text-align: left; }
.row-note { margin-top: 6px; font-size: 0.72rem; }

.history-row td { padding: 0 1rem 0.75rem; }

/* Phone: a four-column table at 430px would re-create the squeeze this fixes, so
   the rows stack and each cell keeps its full width. */
@media (max-width: 760px) {
  .script-table thead { display: none; }
  .script-table tr { display: block; border-bottom: 1px solid var(--line); }
  .script-table td { display: block; border-bottom: 0; padding: 0.25rem 0.9rem; }
  .script-table td:first-child { padding-top: 0.7rem; }
  .script-table td:last-child { padding-bottom: 0.7rem; }
  .col-ref, .col-speaker, .col-state { width: auto; }
  .ref-kind { display: inline; margin-left: 0.5rem; }
  .state-stack { flex-direction: row; align-items: center; justify-content: flex-start; flex-wrap: wrap; }
  .edit-hint { color: var(--faint); }
}

.chip {
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.chip.on { background: color-mix(in srgb, var(--accent) 22%, transparent); }
.chip.restore { color: var(--accent-2); border-color: color-mix(in srgb, var(--accent-2) 45%, transparent); background: color-mix(in srgb, var(--accent-2) 10%, transparent); }
.chip[disabled] { opacity: 0.5; }

.history {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.version { padding: 8px 0; border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
.version:first-of-type { border-top: 0; }
.version-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 4px; }
.diff { font-size: 13px; line-height: 1.5; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.diff .add { color: var(--accent-2); text-decoration: underline; }
.diff .del { color: var(--danger); text-decoration: line-through; }
.diff .same { opacity: 0.6; }
</style>
