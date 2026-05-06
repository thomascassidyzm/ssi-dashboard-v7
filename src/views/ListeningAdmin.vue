<template>
  <div class="listening-admin">
    <header class="admin-header">
      <button class="back-btn" @click="goBack" title="Back">←</button>
      <div>
        <h1>Listening &amp; algorithm config</h1>
        <p class="sub">
          Global settings — applies to every course, every learner.
          Changes propagate to new sessions within ~5 min (cache TTL).
        </p>
      </div>
      <span v-if="!isAdmin && currentUser" class="admin-warn">
        Signed in as {{ currentUser.email }} (not admin) — saves will fail.
      </span>
    </header>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="loadError" class="err"><strong>Failed to load:</strong> {{ loadError }}</div>

    <div v-else class="rows">
      <!-- ==================== LISTENING ==================== -->
      <section v-if="drafts.listening" class="config-row">
        <RowHeader
          title="Layer 1 listening"
          desc="Per-seed playback at the round-end listening cluster, plus the graduation + window rules that pick which seeds play."
          :row="rowMap.listening"
          :dirty="isDirty('listening')"
          :saving="savingKey === 'listening'"
          :error="rowErrors.listening"
          @save="save('listening')"
          @reset="reset('listening')"
        />

        <div class="field-block">
          <label>Per-seed playlist <span class="hint">tap to cycle role · arrows reorder · × removes · + adds</span></label>
          <PlaylistEditor v-model="drafts.listening.layer1Playlist" />
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.listening.offset" label="Graduation offset" suffix="rounds"
            help="Rounds after a seed's last LEGO before it graduates into Layer 1 listening." />
          <NumField v-model="drafts.listening.l1ActiveSize" label="Active window size" suffix="seeds"
            help="Most-recently-graduated seeds in the active rotation." />
          <NumField v-model="drafts.listening.l1ActiveInterval" label="Active fires every" suffix="rounds" />
          <NumField v-model="drafts.listening.l1ReserveSize" label="Reserve window size" suffix="seeds"
            help="Older graduated seeds (next slice after active)." />
          <NumField v-model="drafts.listening.l1ReserveInterval" label="Reserve fires every" suffix="rounds" />
          <NumField v-model="drafts.listening.podActivationRound" label="Pod activation default" suffix="rounds"
            help="First main-round at which Layer 2 pods fire (per-learner pin still wins)." />
        </div>
      </section>

      <!-- ==================== PODS ==================== -->
      <section v-if="drafts.pods" class="config-row">
        <RowHeader
          title="Layer 2 pods"
          desc="Per-stage playlist progression for the runtime pod scheduler, plus the inter-play timing matrix."
          :row="rowMap.pods"
          :dirty="isDirty('pods')"
          :saving="savingKey === 'pods'"
          :error="rowErrors.pods"
          @save="save('pods')"
          @reset="reset('pods')"
        />

        <div class="field-block">
          <label>Stage playlists <span class="hint">stage 7 is the eternal hold</span></label>
          <div class="stage-grid">
            <div v-for="stage in 7" :key="stage" class="stage-row">
              <span class="stage-label">stage {{ stage }}</span>
              <PlaylistEditor :modelValue="getStageList(stage)" @update:modelValue="setStageList(stage, $event)" :compact="true" />
            </div>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.pods.stageDuration" label="Stage duration" suffix="pod-rounds"
            help="Pod-rounds spent in each of stages 1–6 before promoting (stage 7 is eternal)." />
          <NumField v-model="drafts.pods.gapSuperTightMs" label="Gap: super tight" suffix="ms"
            help="known→target, target→target inside one chunk." />
          <NumField v-model="drafts.pods.gapTightMs" label="Gap: tight" suffix="ms"
            help="target→known inside one chunk." />
          <NumField v-model="drafts.pods.gapGluedMs" label="Gap: glued" suffix="ms"
            help="Between chunks marked glue_to_next (early stages)." />
          <NumField v-model="drafts.pods.gapBetweenMs" label="Gap: between" suffix="ms"
            help="Default chunk gap. Also intro→first play and last play→outro." />
        </div>
      </section>

      <!-- ==================== SCRIPT SHAPE ==================== -->
      <section v-if="drafts.script_shape" class="config-row">
        <RowHeader
          title="Script shape"
          desc="Per-round phrase counts and the Fibonacci spaced-rep schedule. Changing these reshapes every round generated after the change."
          :row="rowMap.script_shape"
          :dirty="isDirty('script_shape')"
          :saving="savingKey === 'script_shape'"
          :error="rowErrors.script_shape"
          @save="save('script_shape')"
          @reset="reset('script_shape')"
        />

        <div class="field-block">
          <label>Spaced-rep offsets <span class="hint">comma-separated, ascending</span></label>
          <NumListField :modelValue="drafts.script_shape.spacedRepOffsets" @update:modelValue="drafts.script_shape.spacedRepOffsets = $event" />
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.script_shape.maxBuildPhrases" label="Max BUILD phrases" suffix="per round" />
          <NumField v-model="drafts.script_shape.useConsolidationCount" label="USE consolidation count" suffix="per LEGO" />
          <NumField v-model="drafts.script_shape.maxSpacedRepPhrases" label="Max spaced-rep phrases" suffix="per round" />
          <NumField v-model="drafts.script_shape.n1PhraseCount" label="N-1 phrase count" suffix="reps"
            help="Phrases at the N-1 review (1st-back). Other offsets get 1." />
        </div>
      </section>

      <!-- ==================== TURBO ==================== -->
      <section v-if="drafts.turbo_boost" class="config-row">
        <RowHeader
          title="Turbo boost"
          desc="What Turbo culls (script side) and how it tightens timing (runtime). fibKeep gates which fib-offset spaced-rep cycles survive."
          :row="rowMap.turbo_boost"
          :dirty="isDirty('turbo_boost')"
          :saving="savingKey === 'turbo_boost'"
          :error="rowErrors.turbo_boost"
          @save="save('turbo_boost')"
          @reset="reset('turbo_boost')"
        />

        <div class="field-block" v-if="scriptShapeOffsets.length">
          <label>Fib offsets Turbo keeps <span class="hint">tap to toggle</span></label>
          <div class="fib-row">
            <button
              v-for="(off, idx) in scriptShapeOffsets" :key="idx"
              class="fib-pill"
              :class="{ on: (drafts.turbo_boost.fibKeep || []).includes(idx) }"
              @click="toggleFib(idx)"
            >N-{{ off }}</button>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.turbo_boost.buildKeep" label="BUILD keep" suffix="phrases"
            help="Turbo plays the first N BUILD phrases per LEGO; the rest get tagged for skip." />
          <NumField v-model="drafts.turbo_boost.useKeep" label="USE keep" suffix="phrases"
            help="Turbo plays the first N USE phrases per LEGO." />
          <NumField v-model="drafts.turbo_boost.playback_speed" label="Playback speed" suffix="×" :step="0.05" />
          <NumField v-model="drafts.turbo_boost.pause_base_ms" label="Pause base" suffix="ms" />
          <NumField v-model="drafts.turbo_boost.pause_multiplier" label="Pause multiplier" suffix="× target dur" :step="0.05" />
          <NumField v-model="drafts.turbo_boost.min_pause_ms" label="Pause floor" suffix="ms" />
          <NumField v-model="drafts.turbo_boost.max_pause_ms" label="Pause ceiling" suffix="ms" />
        </div>
      </section>

      <!-- ==================== NORMAL ==================== -->
      <section v-if="drafts.normal_mode" class="config-row">
        <RowHeader
          title="Normal mode"
          desc="Default playback timing — pauses are computed from these. The other ModeConfig fields aren't read in normal mode (kept for parity)."
          :row="rowMap.normal_mode"
          :dirty="isDirty('normal_mode')"
          :saving="savingKey === 'normal_mode'"
          :error="rowErrors.normal_mode"
          @save="save('normal_mode')"
          @reset="reset('normal_mode')"
        />

        <div class="field-grid">
          <NumField v-model="drafts.normal_mode.playback_speed" label="Playback speed" suffix="×" :step="0.05" />
          <NumField v-model="drafts.normal_mode.pause_base_ms" label="Pause base" suffix="ms" />
          <NumField v-model="drafts.normal_mode.pause_multiplier" label="Pause multiplier" suffix="× target dur" :step="0.05" />
          <NumField v-model="drafts.normal_mode.min_pause_ms" label="Pause floor" suffix="ms" />
          <NumField v-model="drafts.normal_mode.max_pause_ms" label="Pause ceiling" suffix="ms" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, defineComponent, h, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { getAccessToken, isAdmin, learner: currentUser } = useAuth()

const KEYS = ['listening', 'pods', 'script_shape', 'turbo_boost', 'normal_mode']

const rows = ref([])
const loading = ref(true)
const loadError = ref(null)
const savingKey = ref(null)
const rowErrors = reactive({})

// `drafts` mirrors each row's config and is what the form mutates.
// `rowMap` is the pristine server state — used for dirty-checks and Reset.
const drafts = reactive({})
const rowMap = computed(() => Object.fromEntries(rows.value.map(r => [r.key, r])))

const scriptShapeOffsets = computed(() => drafts.script_shape?.spacedRepOffsets || [])

function deepClone(v) { return JSON.parse(JSON.stringify(v)) }

function isDirty(key) {
  if (!drafts[key] || !rowMap.value[key]) return false
  return JSON.stringify(drafts[key]) !== JSON.stringify(rowMap.value[key].config)
}

function reset(key) {
  if (!rowMap.value[key]) return
  drafts[key] = deepClone(rowMap.value[key].config)
  rowErrors[key] = null
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

function getStageList(stage) {
  if (!drafts.pods) return []
  const sp = drafts.pods.stagePlaylist || {}
  return sp[String(stage)] || sp[stage] || []
}
function setStageList(stage, list) {
  if (!drafts.pods) return
  if (!drafts.pods.stagePlaylist) drafts.pods.stagePlaylist = {}
  drafts.pods.stagePlaylist[String(stage)] = list
}

function toggleFib(idx) {
  const tb = drafts.turbo_boost
  if (!tb) return
  const set = new Set(tb.fibKeep || [])
  if (set.has(idx)) set.delete(idx)
  else set.add(idx)
  tb.fibKeep = [...set].sort((a, b) => a - b)
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
  } catch (e) {
    loadError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

function goBack() { router.back() }

onMounted(loadAll)

// ============================================================================
// PlaylistEditor — pills for ['ps','ps2x','trans']. Tap to cycle role,
// arrows to reorder, × to remove, + to add. Reusable for layer1Playlist
// and the 7 stage playlists.
// ============================================================================
const PlaylistEditor = defineComponent({
  name: 'PlaylistEditor',
  props: {
    modelValue: { type: Array, required: true },
    compact: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const ROLES = ['ps', 'ps2x', 'trans']
    const ROLE_LABEL = { ps: '1×', ps2x: '2×', trans: 'EN' }

    function update(next) { emit('update:modelValue', next) }
    function cycle(idx) {
      const cur = props.modelValue[idx]
      const nextRole = ROLES[(ROLES.indexOf(cur) + 1) % ROLES.length]
      const next = [...props.modelValue]
      next[idx] = nextRole
      update(next)
    }
    function moveLeft(idx) {
      if (idx === 0) return
      const next = [...props.modelValue]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      update(next)
    }
    function moveRight(idx) {
      if (idx === props.modelValue.length - 1) return
      const next = [...props.modelValue]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      update(next)
    }
    function removeAt(idx) {
      const next = [...props.modelValue]
      next.splice(idx, 1)
      update(next)
    }
    function add() {
      update([...props.modelValue, 'ps'])
    }

    return () => h('div', { class: ['playlist-editor', { compact: props.compact }] },
      [
        ...props.modelValue.map((role, idx) =>
          h('div', { class: 'pill-wrap', key: `${idx}-${role}` }, [
            h('button', {
              class: ['role-pill', `role-${role}`],
              title: 'Tap to cycle role',
              onClick: () => cycle(idx),
            }, [
              h('span', { class: 'pill-num' }, String(idx + 1)),
              ROLE_LABEL[role] || role,
            ]),
            h('div', { class: 'pill-controls' }, [
              h('button', {
                class: 'micro', title: 'Move left',
                disabled: idx === 0, onClick: () => moveLeft(idx),
              }, '←'),
              h('button', {
                class: 'micro', title: 'Move right',
                disabled: idx === props.modelValue.length - 1, onClick: () => moveRight(idx),
              }, '→'),
              h('button', {
                class: 'micro remove', title: 'Remove',
                disabled: props.modelValue.length <= 1, onClick: () => removeAt(idx),
              }, '×'),
            ]),
          ])
        ),
        h('button', { class: 'add-pill', title: 'Add', onClick: add }, '+'),
      ]
    )
  },
})

// ============================================================================
// NumField — labelled number input with suffix + tooltip help.
// ============================================================================
const NumField = defineComponent({
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
const NumListField = defineComponent({
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
const RowHeader = defineComponent({
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
</script>

<style scoped>
.listening-admin {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  color: var(--color-paper, #f7f7f2);
}

.admin-header {
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  column-gap: 0.75rem;
  row-gap: 0.5rem;
}
.admin-header > .admin-warn { grid-column: 1 / -1; }
.back-btn {
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  width: 36px; height: 36px;
  cursor: pointer;
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
  gap: 1.25rem;
}

.config-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}

/* RowHeader */
:deep(.row-header) { margin-bottom: 1.25rem; }
:deep(.row-title-line) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
:deep(.row-title-line h2) {
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.01em;
}
:deep(.row-actions) { display: flex; gap: 0.5rem; }
:deep(.row-meta) {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
:deep(.row-desc) {
  margin: 0.5rem 0 0;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.8125rem;
  line-height: 1.5;
}
:deep(.save-err) {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  font-size: 0.8125rem;
}

/* Field block + grid */
.field-block { margin-bottom: 1rem; }
.field-block label,
.field-block > label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, #94a3b8);
  margin-bottom: 0.5rem;
}
.hint {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  color: var(--color-paper-dim, #64748b);
  margin-left: 0.5rem;
  font-size: 0.7rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem 1rem;
}

/* NumField */
:deep(.num-field) {
  display: flex;
  flex-direction: column;
}
:deep(.num-field label) {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, #94a3b8);
  margin-bottom: 0.25rem;
}
:deep(.num-input-wrap) {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  overflow: hidden;
}
:deep(.num-input-wrap:focus-within) { border-color: #60a5fa; }
:deep(.num-input-wrap input) {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--color-paper, #f7f7f2);
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
}
:deep(.suffix) {
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  white-space: nowrap;
}

/* NumListField */
:deep(.num-list-input) {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
}
:deep(.num-list-input:focus) { border-color: #60a5fa; }

/* PlaylistEditor */
:deep(.playlist-editor) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-start;
}
:deep(.pill-wrap) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
:deep(.role-pill) {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem 0.4rem 0.5rem;
  border-radius: 999px;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.1s ease, filter 0.15s ease;
}
:deep(.role-pill:active) { transform: scale(0.96); }
:deep(.role-pill:hover) { filter: brightness(1.1); }
:deep(.role-pill.role-ps)    { background: #fbbf24; color: #422006; }
:deep(.role-pill.role-ps2x)  { background: #f97316; color: #431407; }
:deep(.role-pill.role-trans) { background: #6b7280; color: #f9fafb; }
:deep(.pill-num) {
  background: rgba(0,0,0,0.18);
  color: inherit;
  font-size: 0.65rem;
  border-radius: 999px;
  width: 16px; height: 16px;
  display: inline-flex;
  align-items: center; justify-content: center;
}
:deep(.pill-controls) { display: inline-flex; gap: 2px; }
:deep(.micro) {
  width: 22px; height: 18px;
  border-radius: 4px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center; justify-content: center;
}
:deep(.micro:hover:not(:disabled)) { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }
:deep(.micro:disabled) { opacity: 0.3; cursor: not-allowed; }
:deep(.micro.remove:hover:not(:disabled)) { color: #f87171; border-color: #f87171; }
:deep(.add-pill) {
  width: 32px; height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  cursor: pointer;
}
:deep(.add-pill:hover) { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }

:deep(.playlist-editor.compact .role-pill) { padding: 0.25rem 0.6rem 0.25rem 0.35rem; font-size: 0.7rem; }
:deep(.playlist-editor.compact .pill-num) { width: 14px; height: 14px; font-size: 0.6rem; }
:deep(.playlist-editor.compact .micro) { height: 16px; font-size: 0.65rem; }
:deep(.playlist-editor.compact .add-pill) { width: 26px; height: 26px; font-size: 0.85rem; }

/* Stage grid */
.stage-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.stage-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}
.stage-label {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Fib pills */
.fib-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.fib-pill {
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.fib-pill:hover { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }
.fib-pill.on {
  background: rgba(96, 165, 250, 0.15);
  border-color: #60a5fa;
  color: #93c5fd;
}

/* Buttons (primary / secondary) */
.btn-primary, .btn-secondary,
:deep(.btn-primary), :deep(.btn-secondary) {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
:deep(.btn-primary) { background: #3b82f6; border-color: #2563eb; color: white; }
:deep(.btn-primary:hover:not(:disabled)) { background: #2563eb; }
:deep(.btn-primary:disabled) { background: #334155; border-color: #334155; cursor: not-allowed; opacity: 0.5; }
:deep(.btn-secondary) {
  background: transparent;
  border-color: var(--color-graphite, #475569);
  color: var(--color-paper-dim, #94a3b8);
}
:deep(.btn-secondary:hover:not(:disabled)) { border-color: var(--color-paper, #f7f7f2); color: var(--color-paper, #f7f7f2); }
:deep(.btn-secondary:disabled) { opacity: 0.4; cursor: not-allowed; }
</style>
