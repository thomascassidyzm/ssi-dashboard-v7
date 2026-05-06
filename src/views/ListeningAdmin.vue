<template>
  <div class="listening-admin">
    <header class="admin-header">
      <div class="title-block">
        <button class="back-btn" @click="goBack" title="Back">←</button>
        <div>
          <h1>Listening &amp; algorithm config</h1>
          <p class="sub">
            Global settings — applies to every course, every learner. Changes propagate to new
            sessions within ~5 min (cache TTL); existing in-flight sessions keep their loaded
            values until reload.
          </p>
        </div>
      </div>
      <span v-if="!isAdmin && currentUser" class="admin-warn">
        You're signed in as {{ currentUser.email }} but not as admin — saves will fail.
      </span>
    </header>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="loadError" class="err">
      <strong>Failed to load:</strong> {{ loadError }}
    </div>

    <div v-else class="rows">
      <section v-for="row in orderedRows" :key="row.key" class="config-row">
        <div class="row-head">
          <h2>{{ row.key }}</h2>
          <span class="meta">
            Last saved: {{ formatTime(row.updated_at) || '—' }}
            <span v-if="row.updated_by"> by {{ row.updated_by }}</span>
          </span>
        </div>
        <p v-if="descriptions[row.key]" class="row-desc">{{ descriptions[row.key] }}</p>
        <textarea
          class="json-area"
          :class="{ invalid: !!parseErrors[row.key] }"
          :value="texts[row.key]"
          @input="onInput(row.key, $event)"
          spellcheck="false"
          :rows="textareaRows(row.key)"
        ></textarea>
        <div v-if="parseErrors[row.key]" class="parse-err">
          Invalid JSON: {{ parseErrors[row.key] }}
        </div>
        <div v-if="rowErrors[row.key]" class="save-err">
          Save failed: {{ rowErrors[row.key] }}
        </div>
        <div class="row-actions">
          <button
            class="btn-secondary"
            @click="resetRow(row)"
            :disabled="!isDirty(row.key) || savingKey === row.key"
          >Reset</button>
          <button
            class="btn-primary"
            @click="saveRow(row.key)"
            :disabled="!isDirty(row.key) || !!parseErrors[row.key] || savingKey === row.key"
          >{{ savingKey === row.key ? 'Saving…' : 'Save' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
// `learner` is the dashboard_users row in popty's auth (kept that name for
// backwards compat). It's the user record we want for the email + role.
const { getAccessToken, isAdmin, learner: currentUser } = useAuth()

const KEY_ORDER = ['listening', 'pods', 'script_shape', 'turbo_boost', 'normal_mode']
const descriptions = {
  listening: 'Layer 1 + Layer 2 schedule. layer1Playlist drives per-seed playback (ps=target@1×, ps2x=target@2×, trans=known@1×). offset is the graduation threshold in rounds.',
  pods: 'Layer 2 pod scheduler. stagePlaylist defines the per-stage role sequence (1–7); stageDuration is pod-rounds per stage 1–6 (stage 7 is eternal). gap*Ms is the inter-play timing matrix.',
  script_shape: 'Per-round shape. spacedRepOffsets is the Fibonacci review schedule. maxBuildPhrases / useConsolidationCount cap the practice phrases per round. n1PhraseCount is the N-1 review depth.',
  turbo_boost: 'Turbo mode. fibKeep, buildKeep, useKeep control which cycles get tagged for skipping in Turbo. playback_speed and pause_* control the live timing.',
  normal_mode: 'Normal mode timing — pauses are computed from these. spaced_rep_fraction / debut_phrases_fraction / skip_voice2 are unused in normal mode (defaults are sane no-ops).',
}

const rows = ref([])
const loading = ref(true)
const loadError = ref(null)
const savingKey = ref(null)

// Per-row reactive state, keyed by config key.
const texts = reactive({})         // current textarea contents
const parseErrors = reactive({})   // last JSON.parse error per row
const rowErrors = reactive({})     // last save error per row

const orderedRows = computed(() => {
  const byKey = new Map(rows.value.map(r => [r.key, r]))
  const ordered = []
  for (const k of KEY_ORDER) if (byKey.has(k)) ordered.push(byKey.get(k))
  for (const r of rows.value) if (!KEY_ORDER.includes(r.key)) ordered.push(r)
  return ordered
})

function pristineText(row) {
  return JSON.stringify(row.config, null, 2)
}

function isDirty(key) {
  const row = rows.value.find(r => r.key === key)
  if (!row) return false
  return texts[key] !== pristineText(row)
}

function textareaRows(key) {
  const t = texts[key] || ''
  return Math.min(20, Math.max(6, t.split('\n').length))
}

function onInput(key, ev) {
  const v = ev.target.value
  texts[key] = v
  try {
    JSON.parse(v)
    parseErrors[key] = null
  } catch (err) {
    parseErrors[key] = err.message
  }
}

function resetRow(row) {
  texts[row.key] = pristineText(row)
  parseErrors[row.key] = null
  rowErrors[row.key] = null
}

function formatTime(t) {
  if (!t) return ''
  try { return new Date(t).toLocaleString() } catch { return t }
}

async function saveRow(key) {
  let config
  try {
    config = JSON.parse(texts[key])
  } catch (err) {
    parseErrors[key] = err.message
    return
  }

  savingKey.value = key
  rowErrors[key] = null
  try {
    const token = await getAccessToken()
    if (!token) throw new Error('Not signed in')
    const res = await fetch('/api/algorithm-config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ key, config }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
    const idx = rows.value.findIndex(r => r.key === key)
    if (idx >= 0 && data.row) {
      rows.value[idx] = data.row
      // Re-pin the pristine text so the dirty check now reads false.
      texts[key] = pristineText(data.row)
    }
  } catch (e) {
    rowErrors[key] = e.message || String(e)
  } finally {
    savingKey.value = null
  }
}

async function loadAll() {
  loading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/algorithm-config')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    rows.value = data.rows || []
    // Seed per-row text + clear errors.
    for (const r of rows.value) {
      texts[r.key] = pristineText(r)
      parseErrors[r.key] = null
      rowErrors[r.key] = null
    }
  } catch (e) {
    loadError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(loadAll)
</script>

<style scoped>
.listening-admin {
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
  color: var(--color-paper, #f7f7f2);
}

.admin-header {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.title-block {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.back-btn {
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  width: 36px;
  height: 36px;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0.25rem;
}
.back-btn:hover { border-color: var(--color-paper-dim, #94a3b8); color: var(--color-paper, #f7f7f2); }
h1 { font-size: 1.25rem; margin: 0 0 0.25rem; letter-spacing: -0.01em; }
.sub { margin: 0; color: var(--color-paper-dim, #94a3b8); font-size: 0.875rem; line-height: 1.5; max-width: 700px; }
.admin-warn {
  background: rgba(251, 146, 60, 0.12);
  border: 1px solid rgba(251, 146, 60, 0.3);
  color: #fbbf24;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.loading, .err {
  padding: 2rem;
  text-align: center;
  color: var(--color-paper-dim, #94a3b8);
}
.err { color: #f87171; background: rgba(248, 113, 113, 0.08); border-radius: 8px; }

.rows {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.config-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 10px;
  padding: 1rem 1.25rem;
}
.row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.row-head h2 {
  margin: 0;
  font-size: 0.875rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  color: var(--color-paper, #f7f7f2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.meta {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
}
.row-desc {
  margin: 0.5rem 0 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.json-area {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  padding: 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  display: block;
  box-sizing: border-box;
}
.json-area:focus { border-color: #60a5fa; }
.json-area.invalid { border-color: #f87171; }

.parse-err, .save-err {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #f87171;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}
.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.btn-primary {
  background: #3b82f6;
  border-color: #2563eb;
  color: white;
}
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { background: #475569; border-color: #475569; cursor: not-allowed; opacity: 0.5; }
.btn-secondary {
  background: transparent;
  border-color: var(--color-graphite, #475569);
  color: var(--color-paper-dim, #94a3b8);
}
.btn-secondary:hover:not(:disabled) { border-color: var(--color-paper, #f7f7f2); color: var(--color-paper, #f7f7f2); }
.btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
