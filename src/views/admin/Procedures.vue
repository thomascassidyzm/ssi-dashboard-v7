<template>
  <div class="proc-page">
    <header class="proc-head">
      <h1>Procedures</h1>
      <p class="lede">
        The deterministic jobs Popty can run. Pick one, fill in its inputs, read the plan, run it.
        Nothing else can be started from here: a new job arrives as a new registered procedure.
      </p>
    </header>

    <p v-if="loadError" class="err">{{ loadError }}</p>

    <div v-else class="proc-grid">
      <nav class="proc-list">
        <div v-for="g in groups" :key="g.name" class="proc-group">
          <h3>{{ g.name }}</h3>
          <button
            v-for="p in g.items" :key="p.id" type="button"
            class="proc-item" :class="{ active: selected && selected.id === p.id, locked: p.locked }"
            @click="select(p)"
          >
            <span>{{ p.title }}</span>
            <span class="chip" :class="p.locked ? 'chip-locked' : p.kind === 'change' ? 'chip-change' : 'chip-report'">
              {{ p.locked ? 'locked' : p.kind }}
            </span>
          </button>
        </div>
      </nav>

      <section v-if="selected" class="proc-panel">
        <h2>{{ selected.title }}</h2>
        <p class="summary">{{ selected.summary }}</p>

        <dl class="decl">
          <dt>Reads</dt><dd>{{ selected.reads }}</dd>
          <dt>Writes</dt><dd>{{ selected.writes }}</dd>
          <dt>Cost</dt><dd>{{ selected.cost }}</dd>
        </dl>

        <p v-if="selected.locked" class="locked-note">Not runnable yet. {{ selected.locked }}</p>

        <template v-else>
          <form class="inputs" @submit.prevent>
            <label v-for="i in selected.inputs" :key="i.name">
              <span>{{ i.label }}</span>
              <select v-if="i.type === 'course'" v-model="form[i.name]" :disabled="busy">
                <option value="" disabled>Choose a course</option>
                <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
              </select>
              <select v-else-if="i.type === 'enum'" v-model="form[i.name]" :disabled="busy">
                <option v-for="o in i.options" :key="o" :value="o">{{ o }}</option>
              </select>
              <input v-else-if="i.type === 'int'" v-model.number="form[i.name]" type="number" :min="i.min" :max="i.max" :disabled="busy" />
            </label>
            <p v-if="!selected.inputs.length" class="muted">No inputs.</p>
          </form>

          <div class="actions">
            <button v-if="selected.kind === 'change'" type="button" class="btn" :disabled="!inputsReady || busy" @click="launch('dry-run')">
              Dry run
            </button>
            <button
              type="button" class="btn btn-primary"
              :disabled="!inputsReady || busy || (selected.kind === 'change' && !planReady)"
              @click="launch('run')"
            >
              {{ selected.kind === 'change' ? 'Run this plan' : 'Run' }}
            </button>
            <span v-if="selected.kind === 'change' && !planReady" class="muted">A change runs only after its dry run succeeds on these inputs.</span>
          </div>
          <p v-if="actionError" class="err">{{ actionError }}</p>
        </template>

        <div v-if="current" class="run">
          <div class="run-head">
            <span class="chip" :class="'st-' + current.state">{{ current.state }}</span>
            <strong>{{ current.mode === 'dry-run' ? 'Plan (dry run)' : 'Run' }}</strong>
            <span class="muted">{{ fmtInputs(current.inputs) }} · {{ fmtTime(current.startedAt) }}<template v-if="current.exitCode !== null"> · exit {{ current.exitCode }}</template></span>
          </div>
          <pre ref="logEl" class="log">{{ log }}</pre>
          <div v-if="current.undoTarget" class="actions">
            <button type="button" class="btn" @click="openUndo(current.undoTarget)">Undo this run…</button>
          </div>
        </div>
      </section>
      <section v-else class="proc-panel muted">Choose a procedure.</section>
    </div>

    <section class="history">
      <h3>Recent runs</h3>
      <table v-if="runs.length">
        <tr v-for="r in runs" :key="r.id" :class="{ active: current && current.id === r.id }" @click="openRun(r)">
          <td><span class="chip" :class="'st-' + r.state">{{ r.state }}</span></td>
          <td>{{ r.title || r.procedure }}</td>
          <td>{{ r.mode }}</td>
          <td class="muted">{{ fmtInputs(r.inputs) }}</td>
          <td class="muted">{{ fmtTime(r.startedAt) }}</td>
        </tr>
      </table>
      <p v-else class="muted">No runs yet.</p>
    </section>
  </div>
</template>

<script setup>
// The admin Procedures panel. It can only name a registered procedure and its inputs; the server
// (services/procedures/router.cjs) builds every command from services/procedures/registry.cjs and
// refuses anything else, so this page has no way to ask for an arbitrary job.
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { getApiUrl } from '../../services/api'
import { useAuth } from '../../composables/useAuth'

const procedures = ref([])
const courses = ref([])
const runs = ref([])
const selected = ref(null)
const form = ref({})
const current = ref(null)
const log = ref('')
const logFrom = ref(0)
const loadError = ref('')
const actionError = ref('')
const busy = ref(false)
const logEl = ref(null)
let timer = null

async function api(path, init = {}) {
  let token = null
  try { token = await useAuth().getAccessToken() } catch { /* the server answers 401 */ }
  const res = await fetch(`${getApiUrl()}/api/procedures${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

const groups = computed(() => {
  const by = new Map()
  for (const p of procedures.value) { if (!by.has(p.group)) by.set(p.group, []); by.get(p.group).push(p) }
  return [...by].map(([name, items]) => ({ name, items }))
})
const inputsReady = computed(() => selected.value && selected.value.inputs.every((i) => i.optional || (form.value[i.name] !== undefined && form.value[i.name] !== '')))
const sameInputs = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort())
const planReady = computed(() => current.value && current.value.mode === 'dry-run' && current.value.state === 'ok'
  && current.value.procedure === selected.value?.id && sameInputs(current.value.inputs, form.value))

const fmtInputs = (i) => Object.values(i || {}).join(', ') || '—'
const fmtTime = (t) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '')

function select(p, inputs = null) {
  selected.value = p
  form.value = inputs ? { ...inputs } : Object.fromEntries(p.inputs.map((i) => [i.name, '']))
  actionError.value = ''
  clearTimeout(timer); current.value = null; log.value = ''
}

async function launch(mode) {
  busy.value = true; actionError.value = ''
  try {
    const body = { inputs: form.value }
    if (mode === 'run' && selected.value.kind === 'change') body.planRunId = current.value.id
    const { run } = await api(`/${selected.value.id}/${mode}`, { method: 'POST', body: JSON.stringify(body) })
    openRun(run, false)
    refreshRuns()
  } catch (e) { actionError.value = e.message } finally { busy.value = false }
}

function openRun(run, reselect = true) {
  if (reselect) {
    const p = procedures.value.find((x) => x.id === run.procedure)
    if (p) select(p, run.inputs)
  }
  current.value = { ...run, undoTarget: null }
  log.value = ''; logFrom.value = 0
  poll()
}

function openUndo(target) {
  const p = procedures.value.find((x) => x.id === target.procedure)
  if (p) select(p, target.inputs)
}

async function poll() {
  clearTimeout(timer)
  if (!current.value) return
  try {
    const { run, log: chunk } = await api(`/runs/${current.value.id}?from=${logFrom.value}`)
    current.value = run
    if (chunk.text) {
      log.value += chunk.text; logFrom.value = chunk.next
      await nextTick(); if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
    }
    if (run.state === 'running' || chunk.next < chunk.size) timer = setTimeout(poll, 1500)
    else refreshRuns()
  } catch (e) { actionError.value = e.message }
}

async function refreshRuns() {
  try { runs.value = (await api('/runs?limit=30')).runs } catch { /* the list is a convenience */ }
}

onMounted(async () => {
  try {
    procedures.value = (await api('')).procedures
    courses.value = (await api('/courses')).courses
    refreshRuns()
  } catch (e) { loadError.value = e.message }
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.proc-page { max-width: 72rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
.proc-head h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem; }
.lede { opacity: 0.8; margin: 0 0 1.5rem; line-height: 1.5; max-width: 44rem; }
.proc-grid { display: grid; grid-template-columns: 17rem 1fr; gap: 1.25rem; align-items: start; }
@media (max-width: 800px) { .proc-grid { grid-template-columns: 1fr; } }
.proc-group h3, .history h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 1rem 0 0.4rem; }
.proc-item { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 0.5rem; text-align: left;
  background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.55rem 0.7rem; margin-bottom: 0.4rem; cursor: pointer; }
.proc-item.active { border-color: var(--accent); }
.proc-item.locked { opacity: 0.6; }
.proc-panel { min-width: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 0.75rem; padding: 1.25rem; min-height: 12rem; }
.proc-panel h2 { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.4rem; }
.summary { line-height: 1.5; margin: 0 0 1rem; }
.decl { display: grid; grid-template-columns: 5rem 1fr; gap: 0.3rem 0.75rem; margin: 0 0 1rem; font-size: 0.9rem; }
.decl dt { color: var(--muted); }
.decl dd { margin: 0; }
.inputs { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.inputs label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: var(--muted); }
.inputs select, .inputs input { background: var(--canvas); color: var(--ink); border: 1px solid var(--line); border-radius: 0.4rem; padding: 0.45rem 0.6rem; min-width: 14rem; font-family: var(--font-mono); }
.actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.btn { background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--canvas); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.run { margin-top: 1.25rem; border-top: 1px solid var(--line); padding-top: 1rem; }
.run-head { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; }
.log { background: var(--canvas); border: 1px solid var(--line); border-radius: 0.5rem; padding: 0.75rem; font-family: var(--font-mono); font-size: 0.78rem; line-height: 1.45;
  max-height: 28rem; overflow: auto; white-space: pre; margin: 0 0 0.75rem; }
.chip { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid var(--line); border-radius: 999px; padding: 0.1rem 0.5rem; white-space: nowrap; }
.chip-change { color: var(--accent); border-color: var(--accent); }
.chip-locked { color: var(--faint); }
.st-running { color: var(--accent); border-color: var(--accent); }
.st-ok { color: var(--success); border-color: var(--success); }
.st-failed, .st-lost { color: var(--danger); border-color: var(--danger); }
.locked-note { color: var(--muted); border-left: 3px solid var(--line); padding-left: 0.75rem; }
.muted { color: var(--muted); }
.err { color: var(--danger); }
.history { margin-top: 2rem; }
.history table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.history td { padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--line); }
.history tr { cursor: pointer; }
.history tr.active td { background: var(--surface); }
</style>
