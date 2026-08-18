<template>
  <div class="seed-editor">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">Seed Editor</h2>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-label">{{ complete }} / {{ courseTotal || total }} seeds complete</span>
      </div>
      <div class="header-right">
        <select v-model="filter" class="filter-select">
          <option value="all">All</option>
          <option value="needs_review">Needs review</option>
          <option value="complete">Complete</option>
        </select>
        <input
          v-model="search"
          type="text"
          placeholder="Search seeds..."
          class="search-input"
          @input="debouncedLoad"
        />
        <button
          class="btn-approve"
          :disabled="courseTotal === 0 || complete < courseTotal || approving"
          :title="courseTotal > 0 && complete < courseTotal ? `${courseTotal - complete} of ${courseTotal} seeds still need both languages` : ''"
          @click="approveSeeds"
        >
          {{ approving ? 'Approving...' : 'Approve Seeds' }}
        </button>
      </div>
    </header>

    <!-- Table -->
    <div class="table-container">
      <table class="seed-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-canonical">Canonical English</th>
            <th class="col-known">Known</th>
            <th class="col-target">Target</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && seeds.length === 0">
            <td colspan="4" class="loading-cell">Loading seeds...</td>
          </tr>
          <tr v-for="(seed, idx) in seeds" :key="seed.seed_number" class="seed-row" :class="{ 'row-alt': idx % 2 === 1 }">
            <td class="col-num">
              <span class="seed-number">{{ seed.seed_number }}</span>
              <span class="status-dot" :class="statusClass(seed)"></span>
            </td>
            <td class="col-canonical">{{ seed.canonical }}</td>
            <td
              class="col-known editable"
              @click="startEdit(seed, 'known_text')"
            >
              <div class="cell-wrap">
                <template v-if="editingKey === `${seed.seed_number}-known_text`">
                  <input
                    ref="editInput"
                    v-model="editValue"
                    class="cell-input"
                    @blur="saveEdit(seed, 'known_text')"
                    @keydown.enter="saveEdit(seed, 'known_text')"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span :class="{ empty: !seed.known_text }">
                    {{ seed.known_text || '—' }}
                  </span>
                </template>
                <transition name="tick">
                  <span v-if="savedKey === `${seed.seed_number}-known_text`" class="save-tick">&#10003;</span>
                </transition>
              </div>
            </td>
            <td
              class="col-target editable"
              @click="startEdit(seed, 'target_text')"
            >
              <div class="cell-wrap">
                <template v-if="editingKey === `${seed.seed_number}-target_text`">
                  <input
                    ref="editInput"
                    v-model="editValue"
                    class="cell-input"
                    :dir="dirFor(editValue)"
                    @blur="saveEdit(seed, 'target_text')"
                    @keydown.enter="saveEdit(seed, 'target_text')"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span
                    class="target-run"
                    :class="{ empty: !seed.target_text }"
                    :dir="dirFor(seed.target_text)"
                  >{{ seed.target_text || '—' }}</span>
                  <button
                    v-if="seed.target_text"
                    class="rebuild-btn"
                    title="Re-translate &amp; rebuild this seed (new breakdown + audio)"
                    @click.stop="openCascade(seed)"
                  >↻ rebuild</button>
                </template>
                <transition name="tick">
                  <span v-if="savedKey === `${seed.seed_number}-target_text`" class="save-tick">&#10003;</span>
                </transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button :disabled="page === 1" @click="page--; loadSeeds()">← Prev</button>
      <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++; loadSeeds()">Next →</button>
    </div>

    <!-- Re-translate & rebuild (edit-cascade) modal -->
    <div v-if="cascade.open" class="cascade-overlay" @click.self="closeCascade">
      <div class="cascade-modal">
        <h3 class="cascade-title">Re-translate &amp; rebuild — Seed {{ cascade.seed?.seed_number }}</h3>
        <p class="cascade-sub">
          The known/English side stays fixed. Revising the target text rebuilds this
          seed's LEGO breakdown, phrases, intros and the audio for the changed items.
        </p>

        <label class="cascade-label">Known (unchanged)</label>
        <div class="cascade-readonly">{{ cascade.seed?.known_text || '—' }}</div>

        <label class="cascade-label">New target translation</label>
        <textarea v-model="cascade.target" class="cascade-input" rows="2" :dir="dirFor(cascade.target)"
                  placeholder="Revised target-language translation…"></textarea>

        <label class="cascade-checkbox">
          <input type="checkbox" v-model="cascade.autoDecompose" />
          Auto re-decompose (let the pipeline build the new breakdown)
        </label>

        <details class="cascade-advanced" v-if="!cascade.autoDecompose">
          <summary>Provide breakdown (advanced)</summary>
          <p class="cascade-hint">Paste a <code>legos</code> JSON array (same shape as a build submission).</p>
          <textarea v-model="cascade.legosJson" class="cascade-input mono" rows="6"
                    placeholder='[{"idx":1,"type":"A","known":"…","target":"…","phrases":[…]}]'></textarea>
        </details>

        <label class="cascade-checkbox">
          <input type="checkbox" v-model="cascade.generateAudio" />
          Generate the now-missing audio automatically
        </label>

        <!-- Result -->
        <div v-if="cascade.result" class="cascade-result" :class="cascade.error ? 'err' : 'ok'">
          <template v-if="cascade.error">
            <strong>Failed:</strong> {{ cascade.error }}
            <pre v-if="cascade.result.gate_errors">{{ JSON.stringify(cascade.result.gate_errors, null, 2) }}</pre>
          </template>
          <template v-else-if="cascade.result.mode === 'auto-decompose'">
            <strong>Target updated.</strong> {{ cascade.result.message }}
          </template>
          <template v-else-if="cascade.result.mode === 'dry-run'">
            <strong>Preview — {{ cascade.result.case || cascade.result.sub_mode }} (no changes made).</strong>
            <div>{{ cascade.result.message }}</div>
            <div v-if="cascade.result.vocabDelta">
              <span v-if="cascade.result.vocabDelta.removed?.length">Removed vocab: <code>{{ cascade.result.vocabDelta.removed.join(', ') }}</code>. </span>
              <span v-if="cascade.result.vocabDelta.added?.length">Added vocab: <code>{{ cascade.result.vocabDelta.added.join(', ') }}</code>. </span>
            </div>
            <div v-if="cascade.result.wouldGenerateAudio && !cascade.result.wouldGenerateAudio.skipped">
              Audio: {{ cascade.result.wouldGenerateAudio.approxClips }} clip(s) ({{ cascade.result.wouldGenerateAudio.note }})
            </div>
            <div v-if="cascade.result.blastRadius?.failures?.length" class="cascade-blast">
              <strong>Predicted blast radius — {{ cascade.result.blastRadius.failures.length }} seed(s):</strong>
              <ul>
                <li v-for="f in cascade.result.blastRadius.failures" :key="f.seed">
                  Seed {{ f.seed }}: {{ f.issues.join('; ') }}
                </li>
              </ul>
            </div>
            <div v-else class="cascade-clear">No downstream breakage predicted.</div>
          </template>
          <template v-else>
            <strong>Done — {{ cascade.result.case }}.</strong>
            <div>{{ cascade.result.message }}</div>
            <div v-if="cascade.result.audio?.errors?.length" class="cascade-warn">
              Audio issues: {{ cascade.result.audio.errors.join(', ') }}
            </div>
            <div v-if="cascade.result.blastRadius?.failures?.length" class="cascade-blast">
              <strong>Blast radius — {{ cascade.result.blastRadius.failures.length }} seed(s) need attention:</strong>
              <ul>
                <li v-for="f in cascade.result.blastRadius.failures" :key="f.seed">
                  Seed {{ f.seed }}: {{ f.issues.join('; ') }}
                </li>
              </ul>
            </div>
            <div v-else class="cascade-clear">No new validation failures downstream.</div>
          </template>
        </div>

        <div class="cascade-actions">
          <button class="btn-secondary" @click="closeCascade" :disabled="cascade.running">Close</button>
          <button class="btn-secondary" @click="runCascade(true)" :disabled="cascade.running || !cascade.target.trim()"
                  title="Preview the plan (Case, blast radius, audio estimate) — no changes, no audio spend">
            Preview (dry run)
          </button>
          <button class="btn-approve" @click="runCascade(false)" :disabled="cascade.running || !cascade.target.trim()">
            {{ cascade.running ? 'Rebuilding…' : 'Re-translate & rebuild' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { getApiUrl } from '@/services/api'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const apiBase = getApiUrl()
const PAGE_SIZE = 50

const seeds = ref([])
const total = ref(0)
const courseTotal = ref(0) // full course seed count (stable across filter/search)
const complete = ref(0)
const page = ref(1)
const filter = ref('all')
const search = ref('')
const loading = ref(false)
const approving = ref(false)

// Inline editing state
const editingKey = ref(null)
const editValue = ref('')
const editInput = ref(null)
const savedKey = ref(null)
let savedTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const progressPercent = computed(() => {
  const denom = courseTotal.value || total.value
  return denom > 0 ? (complete.value / denom) * 100 : 0
})

function statusClass(seed) {
  if (seed.known_text && seed.target_text) return 'green'
  if (seed.known_text || seed.target_text) return 'yellow'
  return 'red'
}

let debounceTimer = null
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    loadSeeds()
  }, 300)
}

async function loadSeeds() {
  loading.value = true
  try {
    const offset = (page.value - 1) * PAGE_SIZE
    const params = new URLSearchParams({
      limit: PAGE_SIZE,
      offset,
      filter: filter.value
    })
    if (search.value) params.set('search', search.value)

    const res = await fetch(`${apiBase}/api/course/${props.courseCode}/seed-editor?${params}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      const data = await res.json()
      seeds.value = data.seeds
      total.value = data.total
      complete.value = data.complete
      // data.total is the FILTERED count; only an unfiltered load reflects the
      // course's true seed count. Approval gates on the course's own size.
      if (filter.value === 'all' && !search.value) {
        courseTotal.value = data.total
      }
    }
  } catch (err) {
    console.error('Failed to load seeds:', err)
  } finally {
    loading.value = false
  }
}

function startEdit(seed, field) {
  const key = `${seed.seed_number}-${field}`
  if (editingKey.value === key) return
  editingKey.value = key
  editValue.value = seed[field] || ''
  nextTick(() => {
    const input = document.querySelector('.cell-input')
    if (input) input.focus()
  })
}

function cancelEdit() {
  editingKey.value = null
  editValue.value = ''
}

async function saveEdit(seed, field) {
  const newValue = editValue.value.trim()
  const oldValue = seed[field] || ''
  editingKey.value = null

  if (newValue === oldValue) return

  // Optimistic update
  seed[field] = newValue

  // Update complete count optimistically
  const wasComplete = oldValue && seed[field === 'known_text' ? 'target_text' : 'known_text']
  const isNowComplete = newValue && seed[field === 'known_text' ? 'target_text' : 'known_text']
  if (!wasComplete && isNowComplete) complete.value++
  if (wasComplete && !isNowComplete) complete.value--

  try {
    const resp = await fetch(`${apiBase}/api/course/${props.courseCode}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({
        translations: [{ seed_number: seed.seed_number, [field]: newValue }]
      })
    })
    if (resp.ok) {
      // Show green tick confirmation
      clearTimeout(savedTimer)
      savedKey.value = `${seed.seed_number}-${field}`
      savedTimer = setTimeout(() => { savedKey.value = null }, 1500)
    }
  } catch (err) {
    console.error('Failed to save:', err)
    seed[field] = oldValue
  }
}

async function approveSeeds() {
  approving.value = true
  try {
    const res = await fetch(`${apiBase}/api/course/${props.courseCode}/approve-seeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      alert('Seeds approved! The course is now ready for building.')
    }
  } catch (err) {
    console.error('Failed to approve seeds:', err)
  } finally {
    approving.value = false
  }
}

// ── Re-translate & rebuild (edit-cascade) ──────────────────────────────────
const cascade = ref({
  open: false,
  seed: null,
  target: '',
  autoDecompose: true,
  legosJson: '',
  generateAudio: true,
  running: false,
  result: null,
  error: null,
})

function openCascade(seed) {
  cascade.value = {
    open: true,
    seed,
    target: seed.target_text || '',
    autoDecompose: true,
    legosJson: '',
    generateAudio: true,
    running: false,
    result: null,
    error: null,
  }
}

function closeCascade() {
  if (cascade.value.running) return
  cascade.value.open = false
}

async function runCascade(dryRun = false) {
  const c = cascade.value
  c.running = true
  c.result = null
  c.error = null

  const body = {
    seed_number: c.seed.seed_number,
    target_text: c.target.trim(),
    autoDecompose: c.autoDecompose,
    generateAudio: c.generateAudio,
    dryRun,
  }

  // Optional hand-authored breakdown (only when not auto-decomposing).
  if (!c.autoDecompose && c.legosJson.trim()) {
    try {
      const parsed = JSON.parse(c.legosJson)
      if (!Array.isArray(parsed)) throw new Error('legos must be a JSON array')
      body.legos = parsed
    } catch (err) {
      c.error = `Invalid breakdown JSON: ${err.message}`
      c.running = false
      return
    }
  }

  try {
    const resp = await fetch(`${apiBase}/api/course/${props.courseCode}/edit-cascade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(body),
    })
    const json = await resp.json().catch(() => ({}))
    c.result = json
    if (!resp.ok || json.error) {
      c.error = json.error || `Request failed (${resp.status})`
    } else if (json.mode === 'cascade') {
      // Reflect the new target in the table.
      c.seed.target_text = body.target_text
    }
  } catch (err) {
    c.error = err.message
  } finally {
    c.running = false
  }
}

watch(filter, () => {
  page.value = 1
  loadSeeds()
})

watch(() => props.courseCode, () => {
  page.value = 1
  filter.value = 'all'
  search.value = ''
  loadSeeds()
})

onMounted(loadSeeds)
</script>

<style scoped>
.seed-editor {
  padding: 1.5rem;
  max-width: 1200px;
}

/* Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.editor-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0;
  white-space: nowrap;
}

.progress-bar-container {
  width: 120px;
  height: 6px;
  background: var(--color-graphite, var(--surface-3));
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--accent-2);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-select {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-shadow, var(--surface));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  cursor: pointer;
}

.search-input {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-shadow, var(--surface));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  width: 160px;
}
.search-input::placeholder {
  color: var(--color-graphite, var(--surface-3));
}
:root[data-theme="light"] .search-input::placeholder {
  color: var(--faint);
}

.btn-approve {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-approve:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-approve:hover:not(:disabled) {
  opacity: 0.85;
}
:root[data-theme="light"] .btn-approve {
  background: var(--accent-2);
  color: #ffffff;
}

/* Table */
.table-container {
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  overflow: hidden;
}
:root[data-theme="light"] .table-container {
  border-color: var(--line);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.seed-table {
  width: 100%;
  border-collapse: collapse;
}

.seed-table thead {
  background: var(--color-shadow, var(--surface));
}

.seed-table th {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-paper-dim, var(--muted));
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

.seed-table td {
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  color: var(--color-paper, var(--ink));
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  vertical-align: middle;
}

.seed-row.row-alt {
  background: rgba(255, 255, 255, 0.025);
}

.seed-row:hover {
  background: rgba(255, 255, 255, 0.055);
}

:root[data-theme="light"] .seed-row.row-alt {
  background: var(--surface-2);
}
:root[data-theme="light"] .seed-row:hover {
  background: var(--surface-3);
}

.col-num {
  width: 60px;
  white-space: nowrap;
}

.seed-number {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
  margin-right: 0.5rem;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.green { background: var(--accent-2); }
.status-dot.yellow { background: #fbbf24; }
.status-dot.red { background: #f87171; }
:root[data-theme="light"] .status-dot.yellow { background: #d97706; }
:root[data-theme="light"] .status-dot.red { background: #dc2626; }

.col-canonical {
  color: var(--color-paper-dim, var(--faint));
  font-style: italic;
}

.editable {
  cursor: pointer;
  transition: background 0.1s;
}
.editable:hover {
  background: rgba(255, 255, 255, 0.04);
}
:root[data-theme="light"] .editable:hover {
  background: var(--surface-3);
}

.editable .empty {
  color: var(--color-graphite, var(--surface-3));
}
:root[data-theme="light"] .editable .empty {
  color: var(--faint);
}

.cell-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/*
 * RTL target text carries dir="rtl" so trailing NEUTRAL punctuation (`!` `.` `,`)
 * resolves against the Arabic run instead of the LTR paragraph. `.cell-wrap` is a
 * flex container, so this span is blockified and dir="rtl" would otherwise also
 * flip its default text-align — pin it back to left so the fix moves the mark
 * without moving the column.
 */
.target-run {
  unicode-bidi: isolate;
  text-align: left;
}

.save-tick {
  color: var(--accent-2);
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.tick-enter-active {
  transition: all 0.2s ease;
}
.tick-leave-active {
  transition: all 0.4s ease;
}
.tick-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.tick-leave-to {
  opacity: 0;
}

.cell-input {
  width: 100%;
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.25rem 0.4rem;
  background: var(--color-void, var(--canvas));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-tungsten, var(--accent));
  border-radius: 3px;
  outline: none;
}

.loading-cell {
  text-align: center;
  padding: 2rem;
  color: var(--color-paper-dim, var(--muted));
  font-style: italic;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0;
}

.pagination button {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-slate, var(--surface-2));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pagination button:hover:not(:disabled) {
  background: var(--color-graphite, var(--surface-3));
}

.page-info {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
}

/* Light-mode: faint --surface-3 borders disappear on white inputs/buttons; use --line */
:root[data-theme="light"] .filter-select,
:root[data-theme="light"] .search-input,
:root[data-theme="light"] .pagination button {
  border-color: var(--line);
}

@media (max-width: 800px) {
  .editor-header { flex-direction: column; align-items: flex-start; }
  .header-right { flex-wrap: wrap; }
}

/* Re-translate & rebuild trigger */
.rebuild-btn {
  margin-left: 0.5rem;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.col-target:hover .rebuild-btn { opacity: 1; }
.rebuild-btn:hover { color: var(--accent-2); border-color: var(--accent-2); }

/* Cascade modal */
.cascade-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.cascade-modal {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
}
.cascade-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.25rem;
}
.cascade-sub {
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0 0 1rem;
}
.cascade-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-paper-dim, var(--muted));
  margin: 0.75rem 0 0.25rem;
}
.cascade-readonly {
  padding: 0.5rem 0.75rem;
  background: var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  color: var(--color-paper, var(--ink));
  font-size: 0.9rem;
}
.cascade-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-shadow, var(--surface-2));
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--color-paper, var(--ink));
  font-size: 0.9rem;
  box-sizing: border-box;
  resize: vertical;
}
.cascade-input.mono { font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 0.8rem; }
.cascade-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-paper, var(--ink));
  margin: 0.75rem 0 0;
  cursor: pointer;
}
.cascade-advanced { margin-top: 0.75rem; }
.cascade-advanced summary { cursor: pointer; font-size: 0.85rem; color: var(--accent-2); }
.cascade-hint { font-size: 0.75rem; color: var(--color-paper-dim, var(--muted)); margin: 0.5rem 0; }
.cascade-result {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-paper, var(--ink));
  background: var(--color-graphite, var(--surface-3));
}
.cascade-result.err { border: 1px solid #b91c1c; }
.cascade-result.ok { border: 1px solid var(--accent-2); }
.cascade-result pre { white-space: pre-wrap; font-size: 0.75rem; margin: 0.5rem 0 0; }
.cascade-blast { margin-top: 0.5rem; }
.cascade-blast ul { margin: 0.25rem 0 0; padding-left: 1.2rem; }
.cascade-clear { margin-top: 0.5rem; color: var(--accent-2); }
.cascade-warn { margin-top: 0.5rem; color: #d97706; }
.cascade-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.btn-secondary {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--color-paper, var(--ink));
  cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
