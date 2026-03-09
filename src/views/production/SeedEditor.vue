<template>
  <div class="seed-editor">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">Seed Editor</h2>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-label">{{ complete }} / {{ total }} seeds complete</span>
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
          :disabled="complete < 300 || approving"
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
                    @blur="saveEdit(seed, 'target_text')"
                    @keydown.enter="saveEdit(seed, 'target_text')"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span :class="{ empty: !seed.target_text }">
                    {{ seed.target_text || '—' }}
                  </span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { getApiUrl } from '@/services/api'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const apiBase = getApiUrl()
const PAGE_SIZE = 50

const seeds = ref([])
const total = ref(0)
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
const progressPercent = computed(() => total.value > 0 ? (complete.value / total.value) * 100 : 0)

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
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  white-space: nowrap;
}

.progress-bar-container {
  width: 120px;
  height: 6px;
  background: var(--color-graphite, #475569);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-emerald, #06ffa5);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
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
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px;
  cursor: pointer;
}

.search-input {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px;
  width: 160px;
}
.search-input::placeholder {
  color: var(--color-graphite, #475569);
}

.btn-approve {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, #0f172a);
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

/* Table */
.table-container {
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  overflow: hidden;
}

.seed-table {
  width: 100%;
  border-collapse: collapse;
}

.seed-table thead {
  background: var(--color-shadow, #1e293b);
}

.seed-table th {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-paper-dim, #94a3b8);
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.seed-table td {
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  color: var(--color-paper, #f7f7f2);
  border-bottom: 1px solid rgba(71, 85, 105, 0.3);
  vertical-align: middle;
}

.seed-row.row-alt {
  background: rgba(255, 255, 255, 0.025);
}

.seed-row:hover {
  background: rgba(255, 255, 255, 0.055);
}

.col-num {
  width: 60px;
  white-space: nowrap;
}

.seed-number {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-paper-dim, #94a3b8);
  margin-right: 0.5rem;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.green { background: #34d399; }
.status-dot.yellow { background: #fbbf24; }
.status-dot.red { background: #f87171; }

.col-canonical {
  color: var(--color-paper-dim, #64748b);
  font-style: italic;
}

.editable {
  cursor: pointer;
  transition: background 0.1s;
}
.editable:hover {
  background: rgba(255, 255, 255, 0.04);
}

.editable .empty {
  color: var(--color-graphite, #475569);
}

.cell-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-tick {
  color: #34d399;
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
  background: var(--color-void, #0f172a);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-tungsten, #ffa630);
  border-radius: 3px;
  outline: none;
}

.loading-cell {
  text-align: center;
  padding: 2rem;
  color: var(--color-paper-dim, #94a3b8);
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
  background: var(--color-slate, #334155);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pagination button:hover:not(:disabled) {
  background: var(--color-graphite, #475569);
}

.page-info {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-paper-dim, #94a3b8);
}

@media (max-width: 800px) {
  .editor-header { flex-direction: column; align-items: flex-start; }
  .header-right { flex-wrap: wrap; }
}
</style>
