<template>
  <div class="maintenance-page">
    <div class="maintenance-inner">
      <h2 class="section-title">Content audit log</h2>
      <p class="section-blurb">
        Every UPDATE and DELETE on the at-risk content tables
        (<code>course_legos</code>, <code>course_seeds</code>,
        <code>course_practice_phrases</code>, <code>course_audio</code>,
        <code>courses</code>) is captured here so a corruption — agent run
        amok, accidental bulk delete — can be rolled back row by row from
        the SQL editor without restoring the whole DB.
      </p>

      <div v-if="loadError" class="error-banner">{{ loadError }}</div>

      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Rows in log</div>
          <div class="stat-value">{{ stats.total_rows.toLocaleString() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Oldest entry</div>
          <div class="stat-value">{{ formatOldest(stats.oldest_at) }}</div>
        </div>
        <div class="stat-card" :class="{ stale: isStale }">
          <div class="stat-label">Days since oldest</div>
          <div class="stat-value">
            {{ stats.days_since_oldest === null ? '—' : stats.days_since_oldest }}
            <span v-if="isStale" class="stale-tag">cleanup overdue</span>
          </div>
        </div>
      </div>

      <div v-else-if="loading" class="loading">Loading stats…</div>

      <div class="cleanup-row">
        <label class="days-input">
          Keep last
          <input
            type="number"
            v-model.number="keepDays"
            min="1"
            max="365"
            step="1"
          />
          days
        </label>
        <button
          class="cleanup-btn"
          :disabled="cleaning || !stats || stats.total_rows === 0"
          @click="confirmCleanup"
        >
          {{ cleaning ? 'Cleaning…' : `Delete entries older than ${keepDays} days` }}
        </button>
      </div>

      <p v-if="lastResult" class="result-line">
        Deleted {{ lastResult.deleted.toLocaleString() }} row{{ lastResult.deleted === 1 ? '' : 's' }}
        older than {{ lastResult.days }} days.
      </p>

      <h2 class="section-title section-title-secondary">Recent changes</h2>
      <p class="section-blurb">
        Feed of recent UPDATE / DELETE activity. Click a row to inspect the
        captured old value. Search hits primary keys + the most common text
        fields (<code>known_text</code>, <code>target_text</code>).
      </p>

      <div class="filter-row">
        <select v-model="filterTable" @change="resetAndLoad">
          <option value="">All tables</option>
          <option value="course_legos">course_legos</option>
          <option value="course_seeds">course_seeds</option>
          <option value="course_practice_phrases">course_practice_phrases</option>
          <option value="course_audio">course_audio</option>
          <option value="courses">courses</option>
        </select>

        <select v-model.number="filterHours" @change="resetAndLoad">
          <option :value="1">Last hour</option>
          <option :value="6">Last 6h</option>
          <option :value="24">Last 24h</option>
          <option :value="72">Last 3 days</option>
          <option :value="168">Last 7 days</option>
          <option :value="720">Last 30 days</option>
        </select>

        <input
          v-model="filterQuery"
          @keyup.enter="resetAndLoad"
          type="text"
          placeholder="Search id or text…"
          class="search-input"
        />
        <button class="filter-apply" @click="resetAndLoad">Search</button>
      </div>

      <div v-if="eventsError" class="error-banner">{{ eventsError }}</div>

      <div v-if="eventsLoading && events.length === 0" class="loading">Loading events…</div>

      <div v-else-if="events.length === 0" class="empty">No events match these filters.</div>

      <table v-else class="events-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Table</th>
            <th>Op</th>
            <th>Primary key</th>
            <th>By</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="ev in events" :key="ev.id">
            <tr @click="toggleExpand(ev.id)" class="event-row" :class="{ expanded: expandedId === ev.id }">
              <td class="cell-time">{{ formatEventTime(ev.changed_at) }}</td>
              <td class="cell-table"><code>{{ ev.table_name }}</code></td>
              <td>
                <span class="op-tag" :class="`op-${ev.change_type.toLowerCase()}`">
                  {{ ev.change_type }}
                </span>
              </td>
              <td class="cell-pk"><code>{{ ev.primary_key || '—' }}</code></td>
              <td class="cell-by">{{ ev.changed_by_uid || ev.changed_by_role }}</td>
              <td class="cell-expand">{{ expandedId === ev.id ? '▾' : '▸' }}</td>
            </tr>
            <tr v-if="expandedId === ev.id" class="expanded-row">
              <td colspan="6">
                <pre class="json-preview">{{ JSON.stringify(ev.old_row, null, 2) }}</pre>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="events.length > 0" class="pagination">
        <button
          class="page-btn"
          :disabled="offset === 0"
          @click="prevPage"
        >‹ Prev</button>
        <span class="page-info">
          {{ offset + 1 }}–{{ Math.min(offset + events.length, totalEvents) }}
          of {{ totalEvents.toLocaleString() }}
        </span>
        <button
          class="page-btn"
          :disabled="offset + events.length >= totalEvents"
          @click="nextPage"
        >Next ›</button>
      </div>
    </div>

    <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false">
      <div class="modal">
        <h3>Confirm cleanup</h3>
        <p>
          Delete every audit row older than <strong>{{ keepDays }} days</strong>?
          This drops your rollback runway for any corruption that happened
          before that window — current data is unaffected.
        </p>
        <div class="modal-actions">
          <button class="modal-cancel" @click="showConfirm = false">Cancel</button>
          <button class="modal-confirm" @click="runCleanup">Yes, delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { getAccessToken } = useAuth()

const stats = ref(null)
const loading = ref(false)
const loadError = ref('')
const keepDays = ref(3)
const cleaning = ref(false)
const showConfirm = ref(false)
const lastResult = ref(null)

// Recent-changes feed state
const events = ref([])
const totalEvents = ref(0)
const eventsLoading = ref(false)
const eventsError = ref('')
const filterTable = ref('')
const filterHours = ref(24)
const filterQuery = ref('')
const PAGE_SIZE = 50
const offset = ref(0)
const expandedId = ref(null)

const isStale = computed(() => {
  return stats.value?.days_since_oldest !== null && stats.value?.days_since_oldest > 30
})

function apiBase() {
  return localStorage.getItem('api_base_url') || 'http://localhost:3470'
}

async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...(init.headers || {})
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${apiBase()}${path}`, { ...init, headers })
}

async function loadStats() {
  loading.value = true
  loadError.value = ''
  try {
    const r = await authedFetch('/api/admin/audit-stats')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    stats.value = await r.json()
  } catch (e) {
    loadError.value = `Failed to load stats: ${e.message}`
  } finally {
    loading.value = false
  }
}

function confirmCleanup() {
  showConfirm.value = true
}

async function runCleanup() {
  showConfirm.value = false
  cleaning.value = true
  loadError.value = ''
  try {
    const r = await authedFetch('/api/admin/audit-cleanup', {
      method: 'POST',
      body: JSON.stringify({ days: keepDays.value })
    })
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    lastResult.value = body
    await loadStats()
  } catch (e) {
    loadError.value = `Cleanup failed: ${e.message}`
  } finally {
    cleaning.value = false
  }
}

function formatOldest(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatEventTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function loadEvents() {
  eventsLoading.value = true
  eventsError.value = ''
  try {
    const params = new URLSearchParams({
      hours: String(filterHours.value),
      limit: String(PAGE_SIZE),
      offset: String(offset.value)
    })
    if (filterTable.value) params.set('table', filterTable.value)
    if (filterQuery.value.trim()) params.set('q', filterQuery.value.trim())
    const r = await authedFetch(`/api/admin/audit-events?${params.toString()}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const body = await r.json()
    events.value = body.events
    totalEvents.value = body.total
  } catch (e) {
    eventsError.value = `Failed to load events: ${e.message}`
  } finally {
    eventsLoading.value = false
  }
}

function resetAndLoad() {
  offset.value = 0
  expandedId.value = null
  loadEvents()
}

function prevPage() {
  offset.value = Math.max(0, offset.value - PAGE_SIZE)
  expandedId.value = null
  loadEvents()
}

function nextPage() {
  offset.value = offset.value + PAGE_SIZE
  expandedId.value = null
  loadEvents()
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

onMounted(() => {
  loadStats()
  loadEvents()
})
</script>

<style scoped>
.maintenance-page {
  padding: 32px 28px;
  color: #e2e8f0;
}
.maintenance-inner {
  max-width: 800px;
}
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}
.section-blurb {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 24px 0;
  line-height: 1.6;
}
.section-blurb code {
  background: rgba(148, 163, 184, 0.12);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  padding: 14px 16px;
  border-radius: 8px;
}
.stat-card.stale {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.08);
}
.stat-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #f1f5f9;
}
.stale-tag {
  display: inline-block;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
  padding: 2px 8px;
  border-radius: 4px;
  vertical-align: middle;
}
.loading {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 24px;
}
.cleanup-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
}
.days-input {
  font-size: 14px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.days-input input {
  width: 64px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f1f5f9;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
}
.cleanup-btn {
  padding: 8px 16px;
  background: #b91c1c;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.cleanup-btn:hover:not(:disabled) {
  background: #dc2626;
}
.cleanup-btn:disabled {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
  cursor: not-allowed;
}
.result-line {
  margin-top: 16px;
  font-size: 13px;
  color: #86efac;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 20px 24px;
  max-width: 440px;
  width: 90%;
}
.modal h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}
.modal p {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin: 0 0 20px 0;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.modal-cancel,
.modal-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
}
.modal-cancel {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}
.modal-confirm {
  background: #b91c1c;
  color: white;
}

.section-title-secondary {
  margin-top: 40px;
}

.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-row select,
.filter-row .search-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f1f5f9;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}
.filter-row .search-input {
  flex: 1;
  min-width: 200px;
}
.filter-apply {
  padding: 6px 14px;
  background: #1d4ed8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.filter-apply:hover {
  background: #2563eb;
}

.empty {
  font-size: 13px;
  color: #94a3b8;
  padding: 24px;
  text-align: center;
  border: 1px dashed rgba(148, 163, 184, 0.2);
  border-radius: 6px;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.events-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}
.events-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  vertical-align: top;
}
.event-row {
  cursor: pointer;
  transition: background 0.1s;
}
.event-row:hover {
  background: rgba(148, 163, 184, 0.05);
}
.event-row.expanded {
  background: rgba(30, 41, 59, 0.5);
}
.cell-time {
  color: #cbd5e1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cell-table code,
.cell-pk code {
  background: rgba(148, 163, 184, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: #cbd5e1;
}
.cell-by {
  color: #94a3b8;
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-expand {
  text-align: right;
  color: #64748b;
  width: 20px;
}
.op-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.op-update {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}
.op-delete {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
.expanded-row td {
  background: rgba(15, 23, 42, 0.6);
  padding: 0;
}
.json-preview {
  margin: 0;
  padding: 12px 14px;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 11px;
  color: #cbd5e1;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding: 8px;
}
.page-btn {
  padding: 6px 12px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.page-btn:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.9);
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-info {
  font-size: 12px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
</style>
