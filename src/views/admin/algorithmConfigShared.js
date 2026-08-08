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
//
// VERSIONING (2026-08-06, additive). Every save is content-addressed server-
// side, so a row now carries a config_hash and a key has a history. Three new
// actions expose it — saveDraft(key), loadVersions(key), rollback(key, hash) —
// plus a reactive `versions` object keyed by config key. Nothing existing
// changed: save() still publishes, the same fields come back in the same
// shapes, and ListeningConfig / SpeakingConfig / VadLab need no edits.
//
// saveDraft is the one worth knowing about: it records the config and moves a
// DRAFT pointer without touching the live row, so tuning on a bench no longer
// deploys to every learner within the learning app's five-minute cache.
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

  /**
   * JSON with object keys in a stable order. Arrays keep their order — for
   * spacedRepOffsets the order IS the value.
   *
   * The dirty-check needs this because algorithm_config.config is a Postgres
   * `jsonb` column, and jsonb stores object keys in ITS canonical order (by key
   * length, then bytewise), not the order they were written in. So the config
   * that comes back from a save is never the same STRING as the draft that was
   * sent, even when it is the same value. A plain JSON.stringify comparison
   * therefore reports a row as permanently dirty from the moment it gains a new
   * key — Save works, the row updates, and the button stays lit as though
   * nothing happened. Observed live on 2026-08-07 when easy_mode gained
   * post_voice2_gap_ms and maxPhraseSyllables.
   */
  function stableStringify(v) {
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
    if (v && typeof v === 'object') {
      return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`
    }
    return JSON.stringify(v) ?? 'null'
  }

  function isDirty(key) {
    if (!drafts[key] || !rowMap.value[key]) return false
    return stableStringify(drafts[key]) !== stableStringify(rowMap.value[key].config)
  }

  function reset(key) {
    if (!rowMap.value[key]) return
    drafts[key] = deepClone(rowMap.value[key].config)
    rowErrors[key] = null
    opts.onReset?.(key, drafts)
  }

  async function authedFetch(url, options = {}) {
    const token = await getAccessToken()
    if (!token) throw new Error('Not signed in')
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
    return data
  }

  async function save(key) {
    savingKey.value = key
    rowErrors[key] = null
    try {
      const data = await authedFetch('/api/algorithm-config', {
        method: 'PATCH',
        body: JSON.stringify({ key, config: deepClone(drafts[key]) }),
      })
      const idx = rows.value.findIndex(r => r.key === key)
      if (idx >= 0 && data.row) {
        // The PATCH response is the algorithm_config row, which carries no
        // config_hash — keep the one the server just named so the history view
        // and the "you are running X" line agree without a reload.
        rows.value[idx] = { ...data.row, config_hash: data.config_hash ?? rows.value[idx].config_hash ?? null }
      }
      if (versions[key]) await loadVersions(key)
      return data
    } catch (e) {
      rowErrors[key] = e.message || String(e)
    } finally {
      savingKey.value = null
    }
  }

  // ==========================================================================
  // Versioning — additive. A draft is recorded and pointed at WITHOUT touching
  // the live row, so nothing reaches a learner; rollback repoints published.
  // ==========================================================================

  // key → array of { config_hash, config, created_at, created_by, note,
  //                  is_published, is_draft }, newest first.
  const versions = reactive({})
  const versionsLoading = reactive({})

  /**
   * Save the current form draft as a DRAFT version: it gets a hash and a draft
   * pointer, and the live config is untouched. Returns { key, config_hash,
   * config }; the form stays dirty on purpose, because the live value has not
   * changed and pretending otherwise would be the lie this whole change removes.
   */
  async function saveDraft(key) {
    savingKey.value = key
    rowErrors[key] = null
    try {
      const data = await authedFetch('/api/algorithm-config', {
        method: 'PATCH',
        body: JSON.stringify({ key, config: deepClone(drafts[key]), channel: 'draft' }),
      })
      if (versions[key]) await loadVersions(key)
      return data.draft
    } catch (e) {
      rowErrors[key] = e.message || String(e)
    } finally {
      savingKey.value = null
    }
  }

  /** Load a key's history (newest first). Unauthenticated — reads are public. */
  async function loadVersions(key) {
    versionsLoading[key] = true
    try {
      const res = await fetch(`/api/algorithm-config-versions?key=${encodeURIComponent(key)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
      versions[key] = data.versions || []
      return versions[key]
    } catch (e) {
      rowErrors[key] = e.message || String(e)
      versions[key] = versions[key] || []
    } finally {
      versionsLoading[key] = false
    }
  }

  /**
   * Roll `key` back to an earlier version: the server repoints published and
   * rewrites the live config, minting no new version. The form is reset to the
   * restored value, because after a rollback the editor should show what is
   * actually live.
   */
  async function rollback(key, hash) {
    savingKey.value = key
    rowErrors[key] = null
    try {
      const data = await authedFetch('/api/algorithm-config-versions', {
        method: 'POST',
        body: JSON.stringify({ key, config_hash: hash }),
      })
      const idx = rows.value.findIndex(r => r.key === key)
      if (idx >= 0 && data.row) rows.value[idx] = { ...data.row, config_hash: data.config_hash }
      if (data.row) {
        drafts[key] = deepClone(data.row.config)
        opts.onReset?.(key, drafts)
      }
      await loadVersions(key)
      return data
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
    // Versioning (additive — every field above is unchanged).
    versions, versionsLoading, saveDraft, loadVersions, rollback,
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
  // A config row that has never carried this key reads as undefined, and a
  // missing list is a normal state — it means "inherit", not "broken". Reading
  // it unguarded took the whole Speaking page to a blank screen below the
  // header on 2026-08-08, so the empty list lives here rather than at each
  // call site, where the next one added will forget it again.
  props: { modelValue: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const text = ref((props.modelValue || []).join(', '))
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
