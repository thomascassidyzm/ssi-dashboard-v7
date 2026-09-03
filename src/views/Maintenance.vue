<template>
  <div class="maintenance-page">
    <div class="maintenance-inner">
      <RecoveryPanel />

      <UptimePanel />

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
        <span v-if="lastResult.more_remaining"> More remaining — click again to continue.</span>
      </p>

      <p class="auto-prune-note">
        <strong>Auto-prune:</strong> handled by the nightly <strong>archive + prune</strong> below
        (03:00 UTC, when <code>AUDIT_ARCHIVE_CRON=on</code>) — older days are copied to S3 cold storage
        <em>before</em> deletion, so they stay recoverable via
        <code>recover-pod-audio-from-audit.cjs --archive</code>. The delete-only cleanup above is for
        pruning sooner without archiving. (The old pg_cron job is dead; this replaces it.)
      </p>

      <h2 class="section-title section-title-secondary">Archive to S3 (cold tiering)</h2>
      <p class="section-blurb">
        Archive audit days older than the hot window to S3 as gzipped NDJSON, then —
        with prune — delete them from Postgres. <strong>Preview</strong> is read-only;
        <strong>Archive + Prune</strong> writes to S3 and deletes, but only after each day's
        upload is verified. Capped at ~110s per click — click again to continue a long run.
      </p>
      <div class="cleanup-row">
        <label class="days-input">
          Hot window
          <input type="number" v-model.number="archiveHotDays" min="1" max="365" step="1" />
          days
        </label>
        <label class="days-input">
          Scan back
          <input type="number" v-model.number="archiveMaxDays" min="1" max="400" step="1" />
          days
        </label>
        <button class="cleanup-btn" :disabled="archiving" @click="runArchive(false)">
          {{ archiving ? 'Running…' : 'Preview (dry run)' }}
        </button>
        <button class="cleanup-btn" :disabled="archiving" @click="confirmArchivePrune">
          {{ archiving ? 'Running…' : 'Archive + Prune now' }}
        </button>
      </div>
      <pre v-if="archiveOutput" class="archive-output">{{ archiveOutput }}</pre>

      <h2 class="section-title section-title-secondary">Recent changes</h2>
      <p class="section-blurb">
        Feed of recent UPDATE / DELETE activity. Click a row to inspect the
        captured old value. Search hits primary keys + the most common text
        fields (<code>known_text</code>, <code>target_text</code>).
      </p>

      <div class="filter-row">
        <FilterSelect
          v-model="filterTable"
          :options="tableOptions"
          placeholder="All tables"
          filter-placeholder="Type a table…"
          button-class="maint-select"
          @change="resetAndLoad"
        />

        <FilterSelect
          v-model="filterChangeType"
          :options="changeTypeOptions"
          placeholder="All ops"
          button-class="maint-select"
          @change="resetAndLoad"
        />

        <FilterSelect
          v-model="filterHours"
          :options="hoursOptions"
          placeholder="Last 24h"
          button-class="maint-select"
          @change="resetAndLoad"
        />

        <input
          v-model="filterQuery"
          @keyup.enter="resetAndLoad"
          type="text"
          placeholder="Search id or text…"
          class="search-input"
        />
        <button class="filter-apply" @click="resetAndLoad">Search</button>
      </div>

      <div v-if="selectedIds.size > 0" class="selection-bar">
        <span>{{ selectedIds.size }} selected</span>
        <button class="bulk-restore-btn" @click="showRestoreConfirm = true">
          Restore {{ selectedIds.size }} {{ selectedIds.size === 1 ? 'row' : 'rows' }}
        </button>
        <button class="link-btn" @click="selectedIds.clear()">Clear</button>
      </div>

      <div v-if="eventsError" class="error-banner">{{ eventsError }}</div>

      <div v-if="eventsLoading && events.length === 0" class="loading">Loading events…</div>

      <div v-else-if="events.length === 0" class="empty">No events match these filters.</div>

      <table v-else class="events-table">
        <thead>
          <tr>
            <th class="cell-check">
              <input
                type="checkbox"
                :checked="allOnPageSelected"
                :indeterminate.prop="someOnPageSelected && !allOnPageSelected"
                @change="toggleSelectAllOnPage"
              />
            </th>
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
            <tr class="event-row" :class="{ expanded: expandedId === ev.id, selected: selectedIds.has(ev.id) }">
              <td class="cell-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(ev.id)"
                  @change="toggleSelect(ev.id)"
                />
              </td>
              <td class="cell-time" @click="toggleExpand(ev.id)">{{ formatEventTime(ev.changed_at) }}</td>
              <td class="cell-table" @click="toggleExpand(ev.id)"><code>{{ ev.table_name }}</code></td>
              <td @click="toggleExpand(ev.id)">
                <span class="op-tag" :class="`op-${ev.change_type.toLowerCase()}`">
                  {{ ev.change_type }}
                </span>
              </td>
              <td class="cell-pk" @click="toggleExpand(ev.id)"><code>{{ ev.primary_key || '—' }}</code></td>
              <td class="cell-by" @click="toggleExpand(ev.id)">{{ ev.changed_by_uid || ev.changed_by_role }}</td>
              <td class="cell-expand" @click="toggleExpand(ev.id)">{{ expandedId === ev.id ? '▾' : '▸' }}</td>
            </tr>
            <tr v-if="expandedId === ev.id" class="expanded-row">
              <td colspan="7">
                <div v-if="currentRows[ev.id] === 'loading'" class="diff-loading">
                  Loading current row…
                </div>
                <div v-else-if="currentRows[ev.id]?.error" class="diff-error">
                  Couldn't fetch current row: {{ currentRows[ev.id].error }}
                </div>
                <div v-else class="diff-container">
                  <div class="diff-header">
                    <div></div>
                    <div class="diff-col-label">Captured (will restore to)</div>
                    <div class="diff-col-label">
                      Current
                      <span v-if="currentRows[ev.id]?.current === null" class="missing-tag">deleted</span>
                    </div>
                  </div>
                  <div
                    v-for="field in diffFields(currentRows[ev.id]?.old_row, currentRows[ev.id]?.current)"
                    :key="field.key"
                    class="diff-row"
                    :class="{ 'diff-changed': field.changed }"
                  >
                    <div class="diff-field-name">{{ field.key }}</div>
                    <div class="diff-value diff-captured">{{ formatValue(field.captured) }}</div>
                    <div class="diff-value diff-current">{{ formatValue(field.current) }}</div>
                  </div>
                </div>
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

      <h2 class="section-title section-title-secondary">Phrase decomposition</h2>
      <p class="section-blurb">
        Each <code>course_practice_phrases</code> row carries a precomputed
        <code>decomposition</code> — the LEGO/ghost block list the player
        renders without runtime alignment. When the course's LEGO set changes
        (a new M-LEGO that would absorb characters previously ghosted),
        downstream phrases go stale until they're recomputed. A row's
        <code>decomposition_course_version</code> &lt; <code>courses.version</code>
        means "stale". This panel surfaces drift and runs the backfill.
        See <code>new_vision/PHRASE_DECOMPOSITION_SPEC.md</code>.
      </p>

      <div class="decomp-controls">
        <label class="course-select">
          Course
          <FilterSelect
            v-model="decompCourse"
            :options="decompCourseOptions"
            placeholder="— select —"
            filter-placeholder="Type a course…"
            button-class="maint-course-select"
            @change="loadDecompAudit"
          />
        </label>
        <button
          class="page-btn"
          :disabled="!decompCourse || decompAuditLoading"
          @click="loadDecompAudit"
        >
          {{ decompAuditLoading ? 'Loading…' : 'Refresh audit' }}
        </button>
      </div>

      <div v-if="decompAuditError" class="error-banner">{{ decompAuditError }}</div>

      <div v-if="decompAudit" class="stats-grid decomp-stats">
        <div class="stat-card">
          <div class="stat-label">Total phrases</div>
          <div class="stat-value">{{ decompAudit.total.toLocaleString() }}</div>
        </div>
        <div class="stat-card" :class="{ stale: decompAudit.null_count > 0 }">
          <div class="stat-label">Never computed</div>
          <div class="stat-value">{{ decompAudit.null_count.toLocaleString() }}</div>
        </div>
        <div class="stat-card" :class="{ stale: decompAudit.stale_count > 0 }">
          <div class="stat-label">Stale</div>
          <div class="stat-value">{{ decompAudit.stale_count.toLocaleString() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Clean (v{{ decompAudit.course_version }})</div>
          <div class="stat-value">{{ decompAudit.clean_count.toLocaleString() }}</div>
        </div>
      </div>

      <div v-if="decompCourse" class="decomp-actions">
        <button
          class="page-btn"
          :disabled="decompBusy || !decompCourse"
          @click="runDecompDryRun"
        >
          {{ decompBusy && decompMode === 'dry' ? 'Running…' : 'Dry-run (20 phrases)' }}
        </button>
        <button
          class="cleanup-btn decomp-backfill-btn"
          :disabled="decompBusy || !decompCourse || !decompAudit || (decompAudit.null_count + decompAudit.stale_count === 0)"
          @click="runDecompBackfill"
        >
          {{ decompBusy && decompMode === 'live' ? `Backfilling… ${decompProgress.processed}/${(decompAudit?.null_count || 0) + (decompAudit?.stale_count || 0)}` : 'Backfill' }}
        </button>
      </div>

      <p v-if="decompResultLine" class="result-line">{{ decompResultLine }}</p>

      <div v-if="decompSample.length > 0" class="decomp-sample">
        <div class="decomp-sample-title">Dry-run sample ({{ decompSample.length }})</div>
        <div v-for="(item, idx) in decompSample" :key="idx" class="decomp-sample-item">
          <div class="decomp-sample-head">
            <code>{{ item.phrase_id }}</code>
            <span class="decomp-target bidi-isolate" :dir="dirFor(item.target_text)">{{ item.target_text }}</span>
          </div>
          <div class="decomp-blocks">
            <span
              v-for="(b, i) in item.blocks"
              :key="i"
              class="decomp-block"
              :class="{ 'decomp-ghost': b.isGhost }"
              :title="b.legoId ? `${b.legoId} — ${b.known}` : 'ghost block'"
            >
              <span class="decomp-block-target bidi-isolate" :dir="dirFor(b.target)">{{ b.target }}</span>
              <span v-if="!b.isGhost" class="decomp-block-lego">{{ b.legoId }}</span>
              <span v-else class="decomp-block-lego decomp-ghost-tag">ghost</span>
            </span>
          </div>
        </div>
      </div>

      <div v-if="decompFailures.length > 0" class="decomp-failures">
        <div class="decomp-failures-title">First failures ({{ decompFailures.length }})</div>
        <ul>
          <li v-for="f in decompFailures" :key="f.phrase_id">
            <code>{{ f.phrase_id }}</code>: {{ f.reason }}
          </li>
        </ul>
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

    <div v-if="showRestoreConfirm" class="modal-backdrop" @click.self="showRestoreConfirm = false">
      <div class="modal modal-wide">
        <h3>Confirm restore</h3>
        <p>
          Restore <strong>{{ selectedIds.size }}</strong>
          {{ selectedIds.size === 1 ? 'row' : 'rows' }} to their captured state.
          Each restore is itself a write that will be captured in the audit log,
          so this is rollback-able too.
        </p>
        <p class="modal-note">
          If the same row appears in multiple selected events, only the oldest
          snapshot is applied (restores to the earliest pre-change state).
        </p>
        <div v-if="restoreResult" class="restore-result">
          <div v-if="restoreResult.restored.length" class="restore-ok">
            ✓ Restored {{ restoreResult.restored.length }}
          </div>
          <div v-if="restoreResult.skipped.length" class="restore-skipped">
            • Skipped {{ restoreResult.skipped.length }} (newer event selected for same row)
          </div>
          <div v-if="restoreResult.failed.length" class="restore-failed">
            ✗ Failed {{ restoreResult.failed.length }}:
            <ul>
              <li v-for="f in restoreResult.failed" :key="f.event_id">
                #{{ f.event_id }}: {{ f.reason }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-cancel" @click="closeRestoreModal">{{ restoreResult ? 'Close' : 'Cancel' }}</button>
          <button v-if="!restoreResult" class="modal-confirm" :disabled="restoring" @click="runRestore">
            {{ restoring ? 'Restoring…' : 'Yes, restore' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useCourses } from '../composables/useCourses'
import { dirFor } from '../utils/textDirection.js'
import UptimePanel from '../components/UptimePanel.vue'
import RecoveryPanel from '../components/RecoveryPanel.vue'
import FilterSelect from '../components/ui/FilterSelect.vue'

const { getAccessToken } = useAuth()
const { getCourseName } = useCourses()

const stats = ref(null)
const loading = ref(false)
const loadError = ref('')
const keepDays = ref(3)
const cleaning = ref(false)
const showConfirm = ref(false)
const lastResult = ref(null)

// Audit archive (S3 cold tiering)
const archiveHotDays = ref(14)
const archiveMaxDays = ref(30)
const archiving = ref(false)
const archiveOutput = ref('')

// Recent-changes feed state
const events = ref([])
const totalEvents = ref(0)
const eventsLoading = ref(false)
const eventsError = ref('')
const filterTable = ref('')
const filterChangeType = ref('')
const filterHours = ref(24)

// Dropdown option lists for the change-feed filters. Same values, same order
// and same groupings the native <select>s carried — FilterSelect just puts a
// filter field above them once the list is longer than 8.
const tableOptions = [
  { value: '', label: 'All tables' },
  {
    label: 'Course content',
    options: ['course_legos', 'course_seeds', 'course_practice_phrases', 'course_audio', 'courses'],
  },
  {
    label: 'Shared / canonical',
    options: ['canonical_seeds', 'canonical_seed_translations', 'lego_introductions', 'voices', 'shared_audio'],
  },
  {
    label: 'Listening pods',
    options: ['listening_pods', 'listening_pod_sentences'],
  },
]
const changeTypeOptions = [
  { value: '', label: 'All ops' },
  { value: 'UPDATE', label: 'UPDATE only' },
  { value: 'DELETE', label: 'DELETE only' },
]
// Numeric values, so the hours land in the model as numbers exactly as
// v-model.number used to deliver them.
const hoursOptions = [
  { value: 0.25, label: 'Last 15 min' },
  { value: 0.5, label: 'Last 30 min' },
  { value: 1, label: 'Last hour' },
  { value: 6, label: 'Last 6h' },
  { value: 24, label: 'Last 24h' },
  { value: 72, label: 'Last 3 days' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
]
const filterQuery = ref('')
const PAGE_SIZE = 50
const offset = ref(0)
const expandedId = ref(null)

// Selection + bulk restore state
const selectedIds = ref(new Set())
const showRestoreConfirm = ref(false)
const restoring = ref(false)
const restoreResult = ref(null)

// Current-row state per expanded event id:
//   'loading' | { current: row | null } | { error: msg }
const currentRows = ref({})

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

function confirmArchivePrune() {
  if (window.confirm(
    'Archive every audit day older than the hot window to S3, then DELETE those rows from Postgres?\n\n' +
    'Each day is uploaded and verified BEFORE deletion, and pruned rows stay recoverable via ' +
    'recover-pod-audio-from-audit.cjs --archive.'
  )) {
    runArchive(true)
  }
}

// prune=false → dry-run preview (read-only). prune=true → archive to S3 + delete.
async function runArchive(prune) {
  archiving.value = true
  archiveOutput.value = ''
  loadError.value = ''
  try {
    const r = await authedFetch('/api/admin/audit-archive', {
      method: 'POST',
      body: JSON.stringify({
        hotDays: archiveHotDays.value,
        maxDays: archiveMaxDays.value,
        execute: prune,
        prune
      })
    })
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    archiveOutput.value = body.output || '(no output)'
    if (body.timedOut) archiveOutput.value += '\n\n⏱ hit the 110s cap — partial progress is saved, click again to continue.'
    await loadStats()
  } catch (e) {
    loadError.value = `Archive failed: ${e.message}`
  } finally {
    archiving.value = false
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
    if (filterChangeType.value) params.set('change_type', filterChangeType.value)
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

async function toggleExpand(id) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  // Fetch the current live row state if we don't already have it cached
  if (currentRows.value[id]) return
  const ev = events.value.find(e => e.id === id)
  if (!ev) return
  currentRows.value = { ...currentRows.value, [id]: 'loading' }
  try {
    const params = new URLSearchParams({
      table: ev.table_name,
      pk: ev.primary_key || '',
      event_id: String(ev.id),
    })
    const r = await authedFetch(`/api/admin/audit-row?${params.toString()}`)
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    currentRows.value = { ...currentRows.value, [id]: { current: body.current, old_row: body.old_row } }
  } catch (e) {
    currentRows.value = { ...currentRows.value, [id]: { error: e.message } }
  }
}

// Build a unified field list across captured + current rows, marking which
// fields differ so the UI can highlight them.
function diffFields(captured, current) {
  const captObj = captured || {}
  const currObj = current || {}
  const keys = new Set([...Object.keys(captObj), ...Object.keys(currObj)])
  // Stable order: keys present in captured first (preserve their order), then
  // any extras from current. Within those, alphabetical for predictability.
  const orderedKeys = [
    ...Object.keys(captObj),
    ...Object.keys(currObj).filter(k => !(k in captObj))
  ]
  return orderedKeys.map(key => {
    const c = captObj[key]
    const u = currObj[key]
    return {
      key,
      captured: c,
      current: u,
      changed: !valuesEqual(c, u)
    }
  })
}

function valuesEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) return a === b
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

function formatValue(v) {
  if (v === null) return 'null'
  if (v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// Selection helpers
const allOnPageSelected = computed(() =>
  events.value.length > 0 && events.value.every(e => selectedIds.value.has(e.id))
)
const someOnPageSelected = computed(() =>
  events.value.some(e => selectedIds.value.has(e.id))
)

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  selectedIds.value = next
}

function toggleSelectAllOnPage() {
  const next = new Set(selectedIds.value)
  if (allOnPageSelected.value) {
    for (const ev of events.value) next.delete(ev.id)
  } else {
    for (const ev of events.value) next.add(ev.id)
  }
  selectedIds.value = next
}

async function runRestore() {
  restoring.value = true
  restoreResult.value = null
  try {
    const r = await authedFetch('/api/admin/audit-restore', {
      method: 'POST',
      body: JSON.stringify({ event_ids: Array.from(selectedIds.value) })
    })
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    restoreResult.value = body
    // Clear selection on success (failures still shown in modal)
    if (body.failed.length === 0) selectedIds.value = new Set()
    // Refresh the feed + stats so the restore writes appear
    loadStats()
    loadEvents()
  } catch (e) {
    restoreResult.value = { restored: [], skipped: [], failed: [{ event_id: 0, reason: e.message }] }
  } finally {
    restoring.value = false
  }
}

function closeRestoreModal() {
  showRestoreConfirm.value = false
  restoreResult.value = null
}

// ---------------------------------------------------------------------------
// Phrase decomposition section state + actions
// ---------------------------------------------------------------------------

const availableCourses = ref([])
const decompCourse = ref('')
const decompCourseOptions = computed(() => [
  { value: '', label: '— select —' },
  ...availableCourses.value.map((c) => ({ value: c.code, label: getCourseName(c.code), hint: c.code })),
])
const decompAudit = ref(null)
const decompAuditLoading = ref(false)
const decompAuditError = ref('')
const decompBusy = ref(false)
const decompMode = ref(null) // 'dry' | 'live'
const decompProgress = ref({ processed: 0, updated: 0, failed: 0 })
const decompResultLine = ref('')
const decompSample = ref([])
const decompFailures = ref([])

async function loadAvailableCourses() {
  try {
    const r = await authedFetch('/api/courses')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const body = await r.json()
    // /api/courses returns { courses: [{ code, course_code, ... }] }
    availableCourses.value = (body.courses || []).map(c => ({ code: c.code || c.course_code }))
  } catch (e) {
    // Non-critical for this section — UI still works with manual typing
    console.warn('[decomposition] courses list failed:', e.message)
  }
}

async function loadDecompAudit() {
  if (!decompCourse.value) return
  decompAuditLoading.value = true
  decompAuditError.value = ''
  // Don't clear decompAudit on refresh — keep the old numbers visible during reload
  try {
    const r = await authedFetch(`/api/admin/decomposition-audit/${decompCourse.value}`)
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    decompAudit.value = body
  } catch (e) {
    decompAuditError.value = `Failed to load audit: ${e.message}`
  } finally {
    decompAuditLoading.value = false
  }
}

async function runDecompDryRun() {
  if (!decompCourse.value || decompBusy.value) return
  decompBusy.value = true
  decompMode.value = 'dry'
  decompResultLine.value = ''
  decompSample.value = []
  decompFailures.value = []
  try {
    const r = await authedFetch('/api/admin/decomposition-backfill', {
      method: 'POST',
      body: JSON.stringify({ courseCode: decompCourse.value, dryRun: true, limit: 20 })
    })
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    decompSample.value = body.sample || []
    decompFailures.value = body.failures || []
    decompResultLine.value =
      `Dry-run: processed ${body.processed}, would update ${body.processed - (body.failed || 0)}, ` +
      `failed ${body.failed || 0}. Sample of ${decompSample.value.length} shown below.`
  } catch (e) {
    decompResultLine.value = `Dry-run failed: ${e.message}`
  } finally {
    decompBusy.value = false
    decompMode.value = null
  }
}

async function runDecompBackfill() {
  if (!decompCourse.value || decompBusy.value) return
  decompBusy.value = true
  decompMode.value = 'live'
  decompResultLine.value = ''
  decompSample.value = []
  decompFailures.value = []
  decompProgress.value = { processed: 0, updated: 0, failed: 0 }

  // Loop the endpoint until more_remaining is false. Each request is capped
  // at ~60s server-side; we just keep firing.
  let totalProcessed = 0
  let totalUpdated = 0
  let totalFailed = 0
  let safetyIterations = 0
  try {
    while (true) {
      if (++safetyIterations > 200) {
        // Hard cap — 200 batches × 500 phrases each = 100k phrases. Anything
        // bigger probably means a bug.
        decompResultLine.value = 'Stopped after 200 batches — refresh audit and re-run if needed.'
        break
      }
      const r = await authedFetch('/api/admin/decomposition-backfill', {
        method: 'POST',
        body: JSON.stringify({ courseCode: decompCourse.value, dryRun: false, limit: 500 })
      })
      const body = await r.json()
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
      totalProcessed += body.processed || 0
      totalUpdated += body.updated || 0
      totalFailed += body.failed || 0
      decompProgress.value = { processed: totalProcessed, updated: totalUpdated, failed: totalFailed }
      if (body.failures && decompFailures.value.length < 5) {
        decompFailures.value = [...decompFailures.value, ...body.failures].slice(0, 5)
      }
      if (!body.more_remaining) break
    }
    decompResultLine.value =
      `Backfill done: processed ${totalProcessed}, updated ${totalUpdated}, failed ${totalFailed}.`
    // Refresh audit so the panel reflects the new state
    await loadDecompAudit()
  } catch (e) {
    decompResultLine.value = `Backfill failed: ${e.message} (processed ${totalProcessed} so far)`
  } finally {
    decompBusy.value = false
    decompMode.value = null
  }
}

onMounted(() => {
  loadStats()
  loadEvents()
  loadAvailableCourses()
})
</script>

<style scoped>
.maintenance-page {
  padding: 32px 28px;
  color: var(--ink);
}
.maintenance-inner {
  width: 100%;
}
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}
.section-blurb {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 24px 0;
  line-height: 1.6;
}
.section-blurb code {
  background: var(--surface-3);
  color: var(--ink);
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
[data-theme="light"] .error-banner {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 14px 16px;
  border-radius: 8px;
}
.stat-card.stale {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.08);
}
.stat-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
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
[data-theme="light"] .stale-tag {
  background: rgba(180, 83, 9, 0.18);
  color: #92400e;
}
.loading {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
}
.cleanup-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.days-input {
  font-size: 14px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
}
.days-input input {
  width: 64px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
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
  color: var(--faint);
  cursor: not-allowed;
}
.result-line {
  margin-top: 16px;
  font-size: 13px;
  color: #86efac;
}
[data-theme="light"] .result-line {
  color: var(--success);
}

.archive-output {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow-y: auto;
}
/* Keep the console-style dark block in light mode but force legible light text */
[data-theme="light"] .archive-output {
  color: #e2e8f0;
}

.auto-prune-note {
  margin-top: 18px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink);
}
.auto-prune-note strong { color: var(--ink); }

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
  background: var(--surface);
  border: 1px solid var(--line);
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
  color: var(--ink);
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
  background: var(--surface-3);
  color: var(--ink);
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
.filter-row :deep(.maint-select),
.filter-row .search-input {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
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
  color: var(--muted);
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
  color: var(--muted);
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
[data-theme="light"] .event-row.expanded {
  background: var(--surface-2);
}
[data-theme="light"] .event-row:hover {
  background: var(--surface-2);
}
.cell-time {
  color: var(--ink);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cell-table code,
.cell-pk code {
  background: var(--surface-3);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--ink);
}
.cell-by {
  color: var(--muted);
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-expand {
  text-align: right;
  color: var(--faint);
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
[data-theme="light"] .op-update {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}
[data-theme="light"] .op-delete {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}
.expanded-row td {
  background: rgba(15, 23, 42, 0.6);
  padding: 0;
}
[data-theme="light"] .expanded-row td {
  background: var(--surface-2);
}
.diff-loading,
.diff-error {
  padding: 14px;
  font-size: 12px;
  color: var(--muted);
}
.diff-error { color: #fca5a5; }
[data-theme="light"] .diff-error { color: #b91c1c; }
.diff-container {
  padding: 8px 0;
  max-height: 360px;
  overflow-y: auto;
}
.diff-header,
.diff-row {
  display: grid;
  grid-template-columns: 180px 1fr 1fr;
  gap: 12px;
  padding: 4px 14px;
  font-size: 12px;
  align-items: start;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}
.diff-header {
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  padding-bottom: 6px;
  margin-bottom: 4px;
}
.diff-col-label {
  color: var(--muted);
}
.diff-field-name {
  font-family: 'Geist Mono', ui-monospace, monospace;
  color: var(--ink);
  font-size: 11px;
  padding-top: 2px;
}
.diff-value {
  font-family: 'Geist Mono', ui-monospace, monospace;
  color: var(--muted);
  font-size: 11px;
  word-break: break-word;
  white-space: pre-wrap;
}
.diff-row.diff-changed {
  background: rgba(245, 158, 11, 0.08);
}
.diff-row.diff-changed .diff-captured {
  color: #86efac;
}
.diff-row.diff-changed .diff-current {
  color: #fca5a5;
}
[data-theme="light"] .diff-row.diff-changed .diff-captured {
  color: var(--success);
}
[data-theme="light"] .diff-row.diff-changed .diff-current {
  color: #b91c1c;
}
.diff-row.diff-changed .diff-field-name {
  color: var(--ink);
  font-weight: 500;
}
.missing-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 9px;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
[data-theme="light"] .missing-tag {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
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
  color: var(--ink);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.page-btn:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.9);
}
[data-theme="light"] .page-btn {
  background: var(--surface-2);
  border-color: var(--line);
}
[data-theme="light"] .page-btn:hover:not(:disabled) {
  background: var(--surface-3);
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-info {
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: rgba(29, 78, 216, 0.15);
  border: 1px solid rgba(29, 78, 216, 0.4);
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #bfdbfe;
}
[data-theme="light"] .selection-bar {
  background: rgba(29, 78, 216, 0.08);
  color: #1e40af;
}
.selection-bar > span {
  font-weight: 500;
  color: var(--ink);
}
.bulk-restore-btn {
  padding: 6px 14px;
  background: #1d4ed8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.bulk-restore-btn:hover {
  background: #2563eb;
}
.link-btn {
  background: none;
  border: none;
  color: #93c5fd;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 4px 8px;
}
[data-theme="light"] .link-btn {
  color: #1d4ed8;
}

.cell-check {
  width: 32px;
  text-align: center;
}
.event-row.selected {
  background: rgba(29, 78, 216, 0.1);
}
.event-row.selected:hover {
  background: rgba(29, 78, 216, 0.18);
}

.modal-wide {
  max-width: 560px;
}
.modal-note {
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
  margin-top: -8px !important;
  margin-bottom: 16px !important;
}
.restore-result {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 13px;
}
[data-theme="light"] .restore-result {
  background: var(--surface-2);
  border-color: var(--line);
}
.restore-ok { color: #86efac; }
.restore-skipped { color: var(--muted); margin-top: 4px; }
.restore-failed { color: #fca5a5; margin-top: 4px; }
[data-theme="light"] .restore-ok { color: var(--success); }
[data-theme="light"] .restore-failed { color: #b91c1c; }
.restore-failed ul {
  margin: 4px 0 0 18px;
  font-size: 12px;
}

/* -----------------------------------------------------------------------
   Phrase decomposition section
   ----------------------------------------------------------------------- */

.decomp-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.course-select {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink);
}
.course-select :deep(.maint-course-select) {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  min-width: 180px;
}

.decomp-stats {
  grid-template-columns: repeat(4, 1fr);
}

.decomp-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.decomp-backfill-btn {
  background: #1d4ed8;
}
.decomp-backfill-btn:hover:not(:disabled) {
  background: #2563eb;
}

.decomp-sample {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.decomp-sample-title {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}
.decomp-sample-item + .decomp-sample-item {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}
.decomp-sample-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
}
.decomp-sample-head code {
  background: var(--surface-3);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--ink);
}
.decomp-target {
  color: var(--ink);
  font-weight: 500;
}
.decomp-blocks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.decomp-block {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 5px;
  font-size: 12px;
  min-width: 32px;
}
.decomp-block.decomp-ghost {
  background: rgba(148, 163, 184, 0.08);
  border-style: dashed;
  border-color: rgba(148, 163, 184, 0.4);
}
.decomp-block-target {
  color: var(--ink);
  font-weight: 500;
  white-space: pre;
}
.decomp-block-lego {
  margin-top: 2px;
  font-size: 9px;
  color: #93c5fd;
  font-family: 'Geist Mono', ui-monospace, monospace;
  letter-spacing: 0.02em;
}
[data-theme="light"] .decomp-block-lego {
  color: #1d4ed8;
}
.decomp-ghost-tag {
  color: var(--muted);
}

.decomp-failures {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 6px;
  font-size: 12px;
  color: #fca5a5;
}
[data-theme="light"] .decomp-failures {
  background: rgba(220, 38, 38, 0.06);
  color: #b91c1c;
}
.decomp-failures-title {
  font-weight: 500;
  margin-bottom: 6px;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}
.decomp-failures ul {
  margin: 0;
  padding-left: 18px;
}
.decomp-failures code {
  background: rgba(239, 68, 68, 0.12);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: #fecaca;
}
[data-theme="light"] .decomp-failures code {
  color: #991b1b;
}
</style>
