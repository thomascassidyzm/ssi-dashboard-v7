// ============================================================================
// Shared form helpers + load/save composable for the algorithm_config editors.
//
// The config lives in one place (the algorithm_config table, one row per key,
// edited via PATCH /api/algorithm-config). The UI is split across pages by
// domain — Listening (/admin/configs/listening) edits the listening rows,
// Speaking (/admin/configs/speaking) edits the script/playback rows — but both
// load the SAME rows and share these presentational helpers, so nothing is
// duplicated and a save on either page hits the same endpoint.
// ============================================================================
import { ref, computed, reactive, defineComponent, h } from 'vue'
import { useAuth } from '../../composables/useAuth'

// ============================================================================
// useAlgorithmConfig — loads every algorithm_config row, tracks drafts +
// dirty state, and saves a single keyed row. Each page renders the subset of
// keys it cares about; the full set is loaded so cross-row reads still work
// (e.g. the Listening preview reads script_shape to estimate speaking cycles).
//
// opts.onLoaded(drafts)  — backfill defaults after the rows land.
// opts.onReset(key, drafts) — per-key fix-up after a Reset (same backfill).
// ============================================================================
export function useAlgorithmConfig(opts = {}) {
  const { getAccessToken } = useAuth()

  const rows = ref([])
  const loading = ref(true)
  const loadError = ref(null)
  const savingKey = ref(null)
  const rowErrors = reactive({})

  // `drafts` mirrors each row's config and is what the forms mutate.
  // `rowMap` is the pristine server state — used for dirty-checks and Reset.
  const drafts = reactive({})
  const rowMap = computed(() => Object.fromEntries(rows.value.map(r => [r.key, r])))

  function deepClone(v) { return JSON.parse(JSON.stringify(v)) }

  function isDirty(key) {
    if (!drafts[key] || !rowMap.value[key]) return false
    return JSON.stringify(drafts[key]) !== JSON.stringify(rowMap.value[key].config)
  }

  function reset(key) {
    if (!rowMap.value[key]) return
    drafts[key] = deepClone(rowMap.value[key].config)
    rowErrors[key] = null
    opts.onReset?.(key, drafts)
  }

  async function save(key) {
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
        body: JSON.stringify({ key, config: deepClone(drafts[key]) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
      const idx = rows.value.findIndex(r => r.key === key)
      if (idx >= 0 && data.row) rows.value[idx] = data.row
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
      for (const r of rows.value) {
        drafts[r.key] = deepClone(r.config)
        rowErrors[r.key] = null
      }
      opts.onLoaded?.(drafts)
    } catch (e) {
      loadError.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  return {
    rows, loading, loadError, savingKey, rowErrors,
    drafts, rowMap, isDirty, reset, save, loadAll, deepClone,
  }
}

// ============================================================================
// NumField — labelled number input with suffix + tooltip help.
// ============================================================================
export const NumField = defineComponent({
  name: 'NumField',
  props: {
    modelValue: { type: [Number, String], default: 0 },
    label: { type: String, required: true },
    suffix: { type: String, default: '' },
    step: { type: Number, default: 1 },
    help: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'num-field', title: props.help || undefined }, [
      h('label', null, props.label),
      h('div', { class: 'num-input-wrap' }, [
        h('input', {
          type: 'number',
          step: props.step,
          value: props.modelValue,
          onInput: (e) => {
            const n = Number(e.target.value)
            emit('update:modelValue', Number.isNaN(n) ? e.target.value : n)
          },
        }),
        props.suffix ? h('span', { class: 'suffix' }, props.suffix) : null,
      ]),
    ])
  },
})

// ============================================================================
// NumListField — comma-separated number list (for spacedRepOffsets).
// ============================================================================
export const NumListField = defineComponent({
  name: 'NumListField',
  props: { modelValue: { type: Array, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const text = ref(props.modelValue.join(', '))
    return () => h('input', {
      type: 'text',
      class: 'num-list-input',
      value: text.value,
      onInput: (e) => {
        text.value = e.target.value
        const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
        const nums = parts.map(s => Number(s)).filter(n => !Number.isNaN(n))
        emit('update:modelValue', nums)
      },
    })
  },
})

// ============================================================================
// RowHeader — title + last-saved meta + Save/Reset buttons + error display.
// ============================================================================
export const RowHeader = defineComponent({
  name: 'RowHeader',
  props: {
    title: String,
    desc: String,
    row: Object,
    dirty: Boolean,
    saving: Boolean,
    error: String,
  },
  emits: ['save', 'reset'],
  setup(props, { emit }) {
    function fmt(t) { try { return new Date(t).toLocaleString() } catch { return t } }
    return () => h('div', { class: 'row-header' }, [
      h('div', { class: 'row-title-line' }, [
        h('h2', null, props.title),
        h('div', { class: 'row-actions' }, [
          h('button', {
            class: 'btn-secondary',
            disabled: !props.dirty || props.saving,
            onClick: () => emit('reset'),
          }, 'Reset'),
          h('button', {
            class: 'btn-primary',
            disabled: !props.dirty || props.saving,
            onClick: () => emit('save'),
          }, props.saving ? 'Saving…' : 'Save'),
        ]),
      ]),
      h('div', { class: 'row-meta' },
        `Last saved: ${props.row ? fmt(props.row.updated_at) : '—'}` +
        (props.row?.updated_by ? ` by ${props.row.updated_by}` : '')
      ),
      props.desc ? h('p', { class: 'row-desc' }, props.desc) : null,
      props.error ? h('div', { class: 'save-err' }, ['Save failed: ', props.error]) : null,
    ])
  },
})
