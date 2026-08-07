<script setup>
/**
 * PROCESS — layer 3, and the layer that makes this a lab rather than a toy.
 *
 * Every run is saved with its config, its sentences, its clips and its gate
 * verdicts. From here you can re-open one, put two beside each other, re-run
 * one against the same sentences to see whether a difference was real or was
 * the provider having a bad afternoon, and export the config once it has earned
 * it.
 *
 * EXPORT IS AN EXPORT, NOT A DEPLOY — the same gesture as Pod Lab and for the
 * same reason: an `algorithm_config` write reaches every learner inside the
 * learning app's five-minute cache. The lab hands you the JSON; a human applies
 * it deliberately.
 */
import { ref, watch } from 'vue'
import { api } from './labApi'
import RunResult from './RunResult.vue'

const props = defineProps({
  /** Bumped by the parent when a run finishes, so the shelf refreshes itself. */
  refreshToken: { type: Number, default: 0 },
})

const experiments = ref([])
const loading = ref(false)
const error = ref('')

const openA = ref(null)
const openB = ref(null)
const compare = ref(false)

const exported = ref('')
const exportedFor = ref('')
const busyId = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    const data = await api.listRuns(50)
    experiments.value = data.experiments || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
load()

// Reload whenever the parent says a run landed.
watch(() => props.refreshToken, load)

async function open (id, slot = 'A') {
  busyId.value = id
  try {
    const { experiment } = await api.getRun(id)
    if (slot === 'B') openB.value = experiment
    else openA.value = experiment
  } catch (e) {
    error.value = e.message
  } finally {
    busyId.value = ''
  }
}

async function rerun (id) {
  busyId.value = id
  error.value = ''
  try {
    const { experiment } = await api.rerun(id)
    openA.value = experiment
    await load()
  } catch (e) {
    error.value = e.message
  } finally {
    busyId.value = ''
  }
}

async function exportConfig (id) {
  busyId.value = id
  error.value = ''
  try {
    const data = await api.exportConfig(id)
    exported.value = JSON.stringify(data.config, null, 2)
    exportedFor.value = id
    try { await navigator.clipboard.writeText(exported.value) } catch { /* the textarea below is the fallback */ }
  } catch (e) {
    error.value = e.message
  } finally {
    busyId.value = ''
  }
}

function summarise (e) {
  const c = (e.configs || [])[0]
  return [c?.provider, c?.voiceName || c?.voiceId, c?.language].filter(Boolean).join(' · ')
}
</script>

<template>
  <div>
    <div class="vl-panel">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:1rem;">
        <h3>Experiments</h3>
        <button class="vl-btn" :disabled="loading" @click="load">{{ loading ? 'Loading…' : 'Refresh' }}</button>
      </div>
      <p class="vl-note">
        Every run this lab has ever done, newest first — config, sentences, clips and gate
        verdicts, kept together. Open one, put a second beside it, or re-run it against the
        same sentences.
      </p>
      <p v-if="error" class="vl-err">{{ error }}</p>

      <table v-if="experiments.length" class="vl-grid">
        <thead>
          <tr><th>when</th><th>title</th><th>kind</th><th>config</th><th>clips</th><th>admitted</th><th>$</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="e in experiments" :key="e.id">
            <td class="vl-muted">{{ String(e.at || '').slice(0, 16).replace('T', ' ') }}</td>
            <td>{{ e.title || e.id }}</td>
            <td>{{ e.kind }}</td>
            <td class="vl-muted">{{ summarise(e) }}</td>
            <td>{{ e.totals?.clips ?? (e.clips || []).length }}</td>
            <td>
              <span v-if="e.status === 'running'" class="vl-chip unchecked">running</span>
              <span v-else>{{ e.totals?.admitted ?? '—' }}</span>
            </td>
            <td class="vl-muted">{{ (e.totals?.usd ?? 0).toFixed(4) }}</td>
            <td>
              <button class="vl-btn" :disabled="busyId === e.id" @click="open(e.id, 'A')">Open</button>
              <button class="vl-btn" :disabled="busyId === e.id" @click="open(e.id, 'B'); compare = true">Beside</button>
              <button class="vl-btn" :disabled="busyId === e.id" @click="rerun(e.id)">Re-run</button>
              <button class="vl-btn" :disabled="busyId === e.id" @click="exportConfig(e.id)">Export config</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!loading" class="vl-muted">No experiments yet — run one from the Tests tab.</p>
    </div>

    <div v-if="exported" class="vl-panel">
      <h3>Exported config <span class="vl-muted">· {{ exportedFor }}</span></h3>
      <p class="vl-note">
        Copied to your clipboard. This is an export, not a deploy — the lab never writes
        <code>algorithm_config</code>, because those writes reach every learner within about
        five minutes. Apply it deliberately.
      </p>
      <textarea class="vl-json" rows="16" readonly :value="exported"></textarea>
    </div>

    <div v-if="openA || openB" :class="compare && openA && openB ? 'vl-cols' : ''">
      <div v-if="openA" class="vl-panel">
        <RunResult :experiment="openA" :compact="compare && Boolean(openB)" />
      </div>
      <div v-if="openB" class="vl-panel">
        <RunResult :experiment="openB" :compact="compare && Boolean(openA)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './lab.css';
.vl-grid td button { margin-right: 0.3rem; }
.vl-json {
  width: 100%;
  padding: 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--surface-3);
  background: var(--surface-2);
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}
</style>
