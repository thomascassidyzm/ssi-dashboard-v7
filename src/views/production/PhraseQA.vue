<template>
  <div class="phrase-qa">
    <!-- Header Bar -->
    <header class="qa-header">
      <div class="header-left">
        <h1>Phrase QA</h1>
        <div v-if="summary" class="summary-stats">
          <span class="stat">
            <span class="stat-value">{{ summary.phrases.checked.toLocaleString() }}</span>
            <span class="stat-label">checked</span>
          </span>
          <span class="stat-divider">/</span>
          <span class="stat">
            <span class="stat-value dim">{{ summary.phrases.total.toLocaleString() }}</span>
          </span>
        </div>
      </div>

      <div class="header-center">
        <div v-if="summary" class="flag-counts">
          <span class="flag-count error" v-if="summary.flags.errors > 0">
            {{ summary.flags.errors }} errors
          </span>
          <span class="flag-count warning" v-if="summary.flags.warnings > 0">
            {{ summary.flags.warnings }} warnings
          </span>
          <span class="flag-count info" v-if="summary.flags.info > 0">
            {{ summary.flags.info }} info
          </span>
          <span v-if="summary.flags.total === 0" class="all-clear">All clear</span>
        </div>
      </div>

      <div class="header-right">
        <select v-model="severityFilter" class="filter-select">
          <option value="">All Flags</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
        </select>
        <button @click="spawnMonitor" :disabled="spawning" class="btn-secondary">
          <span v-if="spawning" class="spinner"></span>
          {{ spawning ? 'Starting...' : 'Run Check' }}
        </button>
        <button @click="spawnFixer" :disabled="fixing || total === 0" class="btn-primary">
          <span v-if="fixing" class="spinner"></span>
          {{ fixing ? 'Starting...' : 'Fix Issues' }}
        </button>
        <button @click="spawnPolisher" :disabled="polishing" class="btn-opus">
          <span v-if="polishing" class="spinner"></span>
          {{ polishing ? 'Polishing...' : 'Polish' }}
        </button>
      </div>
    </header>

    <!-- Progress Bar -->
    <div v-if="summary" class="progress-strip">
      <div class="progress-fill" :style="{ width: `${summary.phrases.progress_percent}%` }"></div>
      <span class="progress-label">{{ summary.phrases.progress_percent }}% checked</span>
    </div>

    <!-- Content Area -->
    <main class="qa-content">
      <!-- Loading -->
      <div v-if="loading" class="state-message">
        <div class="spinner large"></div>
        <p>Loading flags...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="flags.length === 0" class="state-message success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h2>{{ summary?.phrases.checked === 0 ? 'No phrases checked yet' : 'No issues found' }}</h2>
        <p>{{ summary?.phrases.checked === 0
          ? 'Click "Run Check" to start the QA monitor'
          : 'All checked phrases look good!' }}</p>
      </div>

      <!-- Flags Table -->
      <div v-else class="flags-table">
        <table>
          <thead>
            <tr>
              <th class="col-severity">Type</th>
              <th class="col-seed">Seed</th>
              <th class="col-known">English</th>
              <th class="col-target">Target</th>
              <th class="col-issue">Issue</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="flag in flags" :key="flag.id" :class="flag.severity">
              <td class="col-severity">
                <span class="severity-badge" :class="flag.severity">
                  {{ flag.severity === 'error' ? 'ERR' : flag.severity === 'warning' ? 'WARN' : 'INFO' }}
                </span>
              </td>
              <td class="col-seed">{{ flag.seed_number }}</td>
              <td class="col-known">{{ flag.phrase?.known_text || flag.details?.known_text || '—' }}</td>
              <td class="col-target" :dir="dirFor(flagTargetText(flag))" style="text-align: left">{{ flagTargetText(flag) || '—' }}</td>
              <td class="col-issue">
                <span class="issue-text">{{ flag.issue }}</span>
                <span v-if="flag.check_type" class="check-type">{{ flag.check_type }}</span>
              </td>
              <td class="col-actions">
                <button @click="dismissFlag(flag)" class="btn-sm" title="False positive">Dismiss</button>
                <button @click="deletePhrase(flag)" class="btn-sm danger" title="Delete phrase">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination" v-if="total > limit">
          <button @click="prevPage" :disabled="offset === 0" class="btn-page">
            &larr; Prev
          </button>
          <span class="page-info">
            {{ offset + 1 }}-{{ Math.min(offset + flags.length, total) }} of {{ total }}
          </span>
          <button @click="nextPage" :disabled="!hasMore" class="btn-page">
            Next &rarr;
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getApiUrl, fetchJson } from '@/services/api'
import { dirFor } from '@/utils/textDirection.js'

// The target string a flag row paints, resolved once so the `dir` binding and the
// rendered text can never disagree about which string they are describing.
const flagTargetText = (flag) => flag.phrase?.target_text || flag.details?.target_text || ''
import { isConfigured as isSupabaseConfigured, getQASummary } from '@/services/supabase'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const API_BASE = getApiUrl()

const loading = ref(true)
const spawning = ref(false)
const fixing = ref(false)
const polishing = ref(false)
const summary = ref(null)
const flags = ref([])
const severityFilter = ref('')
const limit = ref(50)
const offset = ref(0)
const total = ref(0)
const hasMore = ref(false)

async function fetchSummary() {
  try {
    if (isSupabaseConfigured()) {
      summary.value = await getQASummary(props.courseCode)
    } else {
      summary.value = await fetchJson(`${API_BASE}/api/qa/summary/${props.courseCode}`)
    }
  } catch (err) {
    console.error('Failed to fetch QA summary:', err)
  }
}

async function fetchFlags() {
  loading.value = true
  try {
    const url = new URL(`${API_BASE}/api/qa/flagged-phrases/${props.courseCode}`)
    url.searchParams.set('limit', limit.value)
    url.searchParams.set('offset', offset.value)
    if (severityFilter.value) {
      url.searchParams.set('severity', severityFilter.value)
    }
    const data = await fetchJson(url)
    flags.value = data.flags || []
    total.value = data.total || 0
    hasMore.value = data.has_more || false
  } catch (err) {
    console.error('Failed to fetch flags:', err)
  } finally {
    loading.value = false
  }
}

function nextPage() {
  if (hasMore.value) {
    offset.value += limit.value
    fetchFlags()
  }
}

function prevPage() {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value)
    fetchFlags()
  }
}

async function spawnMonitor() {
  spawning.value = true
  try {
    await fetch(`${API_BASE}/api/qa/spawn-monitor/${props.courseCode}`, { method: 'POST' })
    setTimeout(() => {
      fetchSummary()
      fetchFlags()
    }, 2000)
  } catch (err) {
    console.error('Failed to spawn monitor:', err)
  } finally {
    spawning.value = false
  }
}

async function spawnFixer() {
  fixing.value = true
  try {
    await fetch(`${API_BASE}/api/qa/spawn-fixer/${props.courseCode}`, { method: 'POST' })
    // Fixer will process in background - refresh after a delay
    setTimeout(() => {
      fetchSummary()
      fetchFlags()
    }, 5000)
  } catch (err) {
    console.error('Failed to spawn fixer:', err)
  } finally {
    fixing.value = false
  }
}

async function spawnPolisher() {
  polishing.value = true
  try {
    await fetch(`${API_BASE}/api/qa/spawn-polisher/${props.courseCode}`, { method: 'POST' })
    // Opus polisher runs on first 50 rounds - takes longer
    setTimeout(() => {
      fetchSummary()
      fetchFlags()
    }, 10000)
  } catch (err) {
    console.error('Failed to spawn polisher:', err)
  } finally {
    polishing.value = false
  }
}

async function dismissFlag(flag) {
  try {
    await fetch(`${API_BASE}/api/qa/flag/${flag.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'false_positive' })
    })
    flags.value = flags.value.filter(f => f.id !== flag.id)
    fetchSummary()
  } catch (err) {
    console.error('Failed to dismiss flag:', err)
  }
}

async function deletePhrase(flag) {
  if (!flag.phrase_id) return
  const text = flag.phrase?.known_text || flag.details?.known_text || 'this phrase'
  if (!confirm(`Delete "${text}"?`)) return

  try {
    await fetch(`${API_BASE}/api/qa/phrase/${flag.phrase_id}`, { method: 'DELETE' })
    flags.value = flags.value.filter(f => f.id !== flag.id)
    fetchSummary()
  } catch (err) {
    console.error('Failed to delete phrase:', err)
  }
}

watch(severityFilter, () => {
  offset.value = 0
  fetchFlags()
})

watch(() => props.courseCode, () => {
  offset.value = 0
  fetchSummary()
  fetchFlags()
})

onMounted(() => {
  fetchSummary()
  fetchFlags()
})
</script>

<style scoped>
.phrase-qa {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-ink, var(--canvas));
}

/* Header */
.qa-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--color-shadow, var(--surface));
  border-bottom: 1px solid var(--color-graphite, var(--surface-2));
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.qa-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0;
}

.summary-stats {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.stat-value { color: var(--color-paper, var(--ink)); font-weight: 600; }
.stat-value.dim { color: var(--color-paper-dim, var(--muted)); font-weight: 400; }
.stat-label { color: var(--color-paper-dim, var(--muted)); margin-left: 0.25rem; }
.stat-divider { color: var(--color-graphite, var(--surface-3)); margin: 0 0.25rem; }

.header-center { display: flex; gap: 1rem; }

.flag-counts { display: flex; gap: 0.75rem; }
.flag-count {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
.flag-count.error { color: #f87171; background: rgba(248, 113, 113, 0.15); }
.flag-count.warning { color: #fbbf24; background: rgba(251, 191, 36, 0.15); }
.flag-count.info { color: #60a5fa; background: rgba(96, 165, 250, 0.15); }
[data-theme="light"] .flag-count.error { color: #b91c1c; background: rgba(220, 38, 38, 0.12); }
[data-theme="light"] .flag-count.warning { color: #92400e; background: rgba(180, 83, 9, 0.12); }
[data-theme="light"] .flag-count.info { color: #1d4ed8; background: rgba(37, 99, 235, 0.12); }
.all-clear { color: var(--accent-2); font-size: 0.875rem; }

.header-right { display: flex; align-items: center; gap: 0.75rem; }

.filter-select {
  padding: 0.5rem 0.75rem;
  background: var(--color-slate, var(--surface-2));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  font-size: 0.875rem;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-slate, var(--surface-2));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover { background: var(--color-graphite, var(--surface-3)); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-tungsten, var(--accent));
  color: var(--color-ink, var(--canvas));
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-opus {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-opus:hover { opacity: 0.9; }
.btn-opus:disabled { opacity: 0.5; cursor: not-allowed; }

/* Progress Strip */
.progress-strip {
  position: relative;
  height: 4px;
  background: var(--color-slate, var(--surface-2));
}
.progress-fill {
  height: 100%;
  background: var(--color-tungsten, var(--accent));
  transition: width 0.3s;
}
.progress-label {
  position: absolute;
  right: 1rem;
  top: 8px;
  font-size: 0.7rem;
  color: var(--color-paper-dim, var(--muted));
}

/* Content */
.qa-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-paper-dim, var(--muted));
}
.state-message svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
}
.state-message.success svg { color: var(--accent-2); }
.state-message h2 {
  font-size: 1.125rem;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem;
}
.state-message p { margin: 0; font-size: 0.875rem; }

/* Table */
.flags-table {
  background: var(--color-shadow, var(--surface));
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-paper-dim, var(--muted));
  background: var(--color-slate, var(--surface-2));
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--color-paper, var(--ink));
  border-bottom: 1px solid var(--color-graphite, var(--surface-2));
  vertical-align: top;
}
[data-theme="light"] td { border-bottom-color: var(--line); }

tr:hover td { background: var(--color-graphite, var(--surface-3)); }
tr.error td { border-left: 3px solid #f87171; }
tr.warning td { border-left: 3px solid #fbbf24; }
[data-theme="light"] tr:hover td { background: var(--surface-2); }
[data-theme="light"] tr.error td { border-left-color: #dc2626; }
[data-theme="light"] tr.warning td { border-left-color: #b45309; }

.col-severity { width: 60px; }
.col-seed { width: 60px; font-family: monospace; color: var(--color-paper-dim, var(--muted)); }
.col-known, .col-target { width: 20%; }
.col-issue { width: auto; }
.col-actions { width: 140px; text-align: right; }

.severity-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 3px;
  text-transform: uppercase;
}
.severity-badge.error { color: #f87171; background: rgba(248,113,113,0.2); }
.severity-badge.warning { color: #fbbf24; background: rgba(251,191,36,0.2); }
.severity-badge.info { color: #60a5fa; background: rgba(96,165,250,0.2); }
[data-theme="light"] .severity-badge.error { color: #b91c1c; background: rgba(220,38,38,0.13); }
[data-theme="light"] .severity-badge.warning { color: #92400e; background: rgba(180,83,9,0.13); }
[data-theme="light"] .severity-badge.info { color: #1d4ed8; background: rgba(37,99,235,0.13); }

.issue-text { display: block; line-height: 1.4; }
.check-type {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--color-paper-dim, var(--faint));
  background: var(--color-slate, var(--surface-2));
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--color-slate, var(--surface-2));
  color: var(--color-paper-dim, var(--muted));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  cursor: pointer;
  margin-left: 0.5rem;
}
.btn-sm:hover { background: var(--color-graphite, var(--surface-3)); color: var(--color-paper, var(--ink)); }
.btn-sm.danger:hover { background: rgba(248,113,113,0.2); color: #f87171; border-color: #f87171; }
[data-theme="light"] .btn-sm.danger:hover { background: rgba(220,38,38,0.1); color: #b91c1c; border-color: #dc2626; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--color-graphite, var(--surface-2));
}

.btn-page {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  background: var(--color-slate, var(--surface-2));
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  cursor: pointer;
}
.btn-page:hover:not(:disabled) { background: var(--color-graphite, var(--surface-3)); }
.btn-page:disabled { opacity: 0.4; cursor: not-allowed; }

.page-info {
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
.spinner.large { width: 32px; height: 32px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
