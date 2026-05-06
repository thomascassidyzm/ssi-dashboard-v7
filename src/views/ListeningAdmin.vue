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
      <ConfigRow
        v-for="row in orderedRows"
        :key="row.key"
        :row="row"
        :description="descriptions[row.key]"
        :saving="savingKey === row.key"
        :error="rowErrors[row.key]"
        @save="onSave"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h, defineComponent } from 'vue'
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
const rowErrors = ref({})

const orderedRows = computed(() => {
  const byKey = new Map(rows.value.map(r => [r.key, r]))
  const ordered = []
  for (const k of KEY_ORDER) if (byKey.has(k)) ordered.push(byKey.get(k))
  // Append any unknown keys at the end so we don't hide future rows.
  for (const r of rows.value) if (!KEY_ORDER.includes(r.key)) ordered.push(r)
  return ordered
})

async function loadAll() {
  loading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/algorithm-config')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    rows.value = data.rows || []
  } catch (e) {
    loadError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

async function onSave({ key, config }) {
  savingKey.value = key
  rowErrors.value = { ...rowErrors.value, [key]: null }
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
    // Replace the row in-place so updated_at / updated_by show the latest.
    const idx = rows.value.findIndex(r => r.key === key)
    if (idx >= 0 && data.row) rows.value[idx] = data.row
  } catch (e) {
    rowErrors.value = { ...rowErrors.value, [key]: e.message || String(e) }
  } finally {
    savingKey.value = null
  }
}

function goBack() {
  router.back()
}

onMounted(loadAll)

// ============================================================================
// ConfigRow — single section per algorithm_config row.
// JSON textarea + Save. Validates JSON on each keystroke; Save is gated.
// ============================================================================
const ConfigRow = defineComponent({
  name: 'ConfigRow',
  props: {
    row: { type: Object, required: true },
    description: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    error: { type: String, default: null },
  },
  emits: ['save'],
  setup(props, { emit }) {
    const text = ref(JSON.stringify(props.row.config, null, 2))
    const parseError = ref(null)
    const dirty = ref(false)

    const onInput = (e) => {
      text.value = e.target.value
      dirty.value = text.value.trim() !== JSON.stringify(props.row.config, null, 2).trim()
      try {
        JSON.parse(text.value)
        parseError.value = null
      } catch (err) {
        parseError.value = err.message
      }
    }

    const reset = () => {
      text.value = JSON.stringify(props.row.config, null, 2)
      dirty.value = false
      parseError.value = null
    }

    const save = () => {
      try {
        const config = JSON.parse(text.value)
        emit('save', { key: props.row.key, config })
        dirty.value = false
      } catch (err) {
        parseError.value = err.message
      }
    }

    const lastSaved = computed(() => {
      const t = props.row.updated_at
      if (!t) return ''
      try {
        const d = new Date(t)
        return d.toLocaleString()
      } catch { return t }
    })

    return () => h('section', { class: 'config-row' }, [
      h('div', { class: 'row-head' }, [
        h('h2', null, props.row.key),
        h('span', { class: 'meta' }, [
          'Last saved: ', lastSaved.value || '—',
          props.row.updated_by ? ` by ${props.row.updated_by}` : '',
        ]),
      ]),
      props.description ? h('p', { class: 'row-desc' }, props.description) : null,
      h('textarea', {
        class: ['json-area', { invalid: !!parseError.value }],
        value: text.value,
        onInput,
        spellcheck: false,
        rows: Math.min(20, Math.max(6, text.value.split('\n').length)),
      }),
      parseError.value ? h('div', { class: 'parse-err' }, ['Invalid JSON: ', parseError.value]) : null,
      props.error ? h('div', { class: 'save-err' }, ['Save failed: ', props.error]) : null,
      h('div', { class: 'row-actions' }, [
        h('button', {
          class: 'btn-secondary',
          onClick: reset,
          disabled: !dirty.value || props.saving,
        }, 'Reset'),
        h('button', {
          class: 'btn-primary',
          onClick: save,
          disabled: !dirty.value || !!parseError.value || props.saving,
        }, props.saving ? 'Saving…' : 'Save'),
      ]),
    ])
  },
})
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
}
.btn-primary {
  background: #3b82f6;
  border: 1px solid #2563eb;
  color: white;
}
.btn-primary:hover:not(:disabled) { background: #2563eb; }
.btn-primary:disabled { background: #475569; border-color: #475569; cursor: not-allowed; opacity: 0.5; }
.btn-secondary {
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #94a3b8);
}
.btn-secondary:hover:not(:disabled) { border-color: var(--color-paper, #f7f7f2); color: var(--color-paper, #f7f7f2); }
.btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
