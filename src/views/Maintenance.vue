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

onMounted(loadStats)
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
</style>
