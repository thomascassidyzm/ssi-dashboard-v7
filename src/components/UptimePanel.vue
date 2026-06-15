<template>
  <section class="uptime-panel">
    <h2 class="section-title">Uptime &amp; DB health</h2>
    <p class="section-blurb">
      Outside-view check on the learner-facing URLs (via Better Stack) plus a
      live scrape of the Supabase Metrics API. Diagnostic only — when "the app
      went down" or "queries got slow", this panel answers
      <em>"is the platform actually unhealthy right now?"</em>. Auto-refreshes
      every 60 seconds.
    </p>

    <!-- ─────────────── Better Stack monitors ─────────────── -->
    <div v-if="uptimeError" class="error-banner">{{ uptimeError }}</div>

    <div v-else-if="uptimeLoading && !uptime" class="loading">Loading uptime…</div>

    <div v-else-if="uptime && !uptime.configured" class="setup-cta">
      <div class="setup-cta-title">Better Stack not connected</div>
      <p class="setup-cta-body">
        Add <code>BETTERSTACK_API_KEY</code> to <code>.env</code> and create monitors for:
      </p>
      <ul class="setup-cta-list">
        <li><code>https://saysomethingin.app/</code> — learner-path prod</li>
        <li><code>https://staging.saysomethingin.app/</code> — learner-path staging</li>
        <li>Audio proxy health endpoint (TBD — ping prod root for now)</li>
      </ul>
      <p class="setup-cta-body">
        Free tier covers 10 monitors at 3-min intervals. Then
        <code>pm2 restart production-api</code> and refresh.
      </p>
    </div>

    <template v-else-if="uptime">
      <div class="monitor-grid">
        <div
          v-for="m in uptime.monitors"
          :key="m.id"
          class="monitor-row"
        >
          <span class="monitor-dot" :class="`dot-${m.status || 'unknown'}`"></span>
          <div class="monitor-name">{{ m.name }}</div>
          <div class="monitor-status" :class="`status-${m.status || 'unknown'}`">
            {{ m.status || '—' }}
          </div>
          <div class="monitor-last">{{ formatRelative(m.last_checked_at) }}</div>
          <div class="monitor-rt">{{ formatMs(m.last_response_time_ms) }}</div>
        </div>
        <div v-if="uptime.monitors.length === 0" class="empty-inline">
          No monitors found. Add some in Better Stack.
        </div>
      </div>

      <h3 class="subsection-title">Last 24h</h3>
      <div class="availability-grid">
        <div
          v-for="m in uptime.monitors"
          :key="m.id"
          class="availability-row"
        >
          <div class="availability-label">{{ m.name }}</div>
          <div class="availability-bar">
            <div
              class="availability-bar-fill"
              :style="{ width: `${availabilityPct(m.id) * 100}%` }"
            ></div>
          </div>
          <div class="availability-pct">{{ (availabilityPct(m.id) * 100).toFixed(2) }}%</div>
          <div class="availability-incidents">
            {{ incidentCount(m.id) }} {{ incidentCount(m.id) === 1 ? 'incident' : 'incidents' }}
          </div>
        </div>
      </div>

      <h3 class="subsection-title">Recent incidents</h3>
      <div v-if="uptime.incidents.length === 0" class="empty-inline">
        Nothing in the last 24 hours. Good.
      </div>
      <table v-else class="incident-table">
        <thead>
          <tr>
            <th>Started</th>
            <th>Resolved</th>
            <th>Monitor</th>
            <th>Duration</th>
            <th>Cause</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in uptime.incidents" :key="i.id">
            <td>{{ formatTime(i.started_at) }}</td>
            <td>{{ i.resolved_at ? formatTime(i.resolved_at) : 'ongoing' }}</td>
            <td>{{ monitorName(i.monitor_id) }}</td>
            <td>{{ formatDuration(i.started_at, i.resolved_at) }}</td>
            <td class="incident-cause">{{ i.cause || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- ─────────────── DB health (Supabase Metrics API) ─────────────── -->
    <h3 class="subsection-title subsection-title-spaced">DB health (Supabase Metrics)</h3>
    <p class="subsection-blurb">
      Scraped from Supabase's Prometheus endpoint. Cache hit-rate and pool
      utilization are the two leading indicators; deadlocks/conflicts jumping
      is usually statement-timeout cancellations stacking up.
    </p>

    <div v-if="dbError" class="error-banner">{{ dbError }}</div>

    <div v-else-if="dbLoading && !db" class="loading">Loading DB metrics…</div>

    <template v-else-if="db">
      <div class="metric-grid">
        <div class="metric-card" :class="cacheClass">
          <div class="metric-label">Cache hit rate</div>
          <div class="metric-value">{{ formatPct(db.metrics.cache_hit_rate) }}</div>
          <div class="metric-sublabel">target &gt; 99%</div>
        </div>
        <div class="metric-card" :class="poolClass">
          <div class="metric-label">Pool utilization</div>
          <div class="metric-value">
            {{ formatPct(db.metrics.pool_utilization) }}
          </div>
          <div class="metric-sublabel">
            {{ db.metrics.active_connections ?? '—' }}/{{ db.metrics.max_connections ?? '—' }} connections
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Replication lag</div>
          <div class="metric-value">{{ formatLag(db.metrics.replication_lag_seconds) }}</div>
          <div class="metric-sublabel">null = no replica</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Deadlocks (total)</div>
          <div class="metric-value">{{ formatInt(db.metrics.deadlocks_total) }}</div>
          <div class="metric-sublabel">cumulative counter</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Conflicts (total)</div>
          <div class="metric-value">{{ formatInt(db.metrics.conflicts_total) }}</div>
          <div class="metric-sublabel">incl. statement_timeout</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tx committed</div>
          <div class="metric-value">{{ formatInt(db.metrics.transactions_committed) }}</div>
          <div class="metric-sublabel">cumulative</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tx rolled back</div>
          <div class="metric-value">{{ formatInt(db.metrics.transactions_rolled_back) }}</div>
          <div class="metric-sublabel">cumulative</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">DB size</div>
          <div class="metric-value">{{ formatBytes(db.metrics.db_size_bytes) }}</div>
          <div class="metric-sublabel">on disk</div>
        </div>
      </div>
      <div class="db-meta">
        Scraped {{ formatRelative(db.scraped_at) }} · {{ db.scrape_ms }}ms · {{ db.sample_count }} samples
        <span v-if="db.missing?.length" class="db-missing">
          · missing: {{ db.missing.join(', ') }}
        </span>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { getApiUrl } from '../services/api'

const { getAccessToken } = useAuth()

const uptime = ref(null)
const uptimeLoading = ref(false)
const uptimeError = ref('')

const db = ref(null)
const dbLoading = ref(false)
const dbError = ref('')

let pollTimer = null

function apiBase() {
  // getApiUrl() already honours the EnvironmentSwitcher's api_base_url override,
  // then resolves popty.app → the SSi Machine tunnel (never a dead localhost).
  return getApiUrl()
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

async function loadUptime() {
  uptimeLoading.value = true
  uptimeError.value = ''
  try {
    const r = await authedFetch('/api/admin/uptime-summary')
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    uptime.value = body
  } catch (e) {
    uptimeError.value = `Failed to load uptime: ${e.message}`
  } finally {
    uptimeLoading.value = false
  }
}

async function loadDb() {
  dbLoading.value = true
  dbError.value = ''
  try {
    const r = await authedFetch('/api/admin/db-health')
    const body = await r.json()
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    db.value = body
  } catch (e) {
    dbError.value = `Failed to load DB metrics: ${e.message}`
  } finally {
    dbLoading.value = false
  }
}

function refreshAll() {
  loadUptime()
  loadDb()
}

onMounted(() => {
  refreshAll()
  pollTimer = setInterval(refreshAll, 60_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// ────────────── helpers ──────────────

function monitorName(id) {
  if (!uptime.value) return id
  const m = uptime.value.monitors.find(x => String(x.id) === String(id))
  return m ? m.name : id
}

function incidentCount(monitorId) {
  if (!uptime.value) return 0
  return uptime.value.incidents.filter(i => String(i.monitor_id) === String(monitorId)).length
}

// Compute uptime over the 24h window as (1 - downtime / window).
// Treats unresolved incidents as ongoing through "now".
function availabilityPct(monitorId) {
  if (!uptime.value) return 1
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000
  const start = now - windowMs
  let downMs = 0
  for (const i of uptime.value.incidents) {
    if (String(i.monitor_id) !== String(monitorId)) continue
    const s = new Date(i.started_at).getTime()
    const e = i.resolved_at ? new Date(i.resolved_at).getTime() : now
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue
    downMs += Math.max(0, Math.min(e, now) - Math.max(s, start))
  }
  return Math.max(0, Math.min(1, 1 - downMs / windowMs))
}

function formatRelative(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(startIso, endIso) {
  if (!startIso) return '—'
  const s = new Date(startIso).getTime()
  const e = endIso ? new Date(endIso).getTime() : Date.now()
  const sec = Math.max(0, Math.floor((e - s) / 1000))
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function formatMs(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return `${Math.round(Number(v))}ms`
}

function formatPct(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return `${(Number(v) * 100).toFixed(2)}%`
}

function formatLag(v) {
  if (v == null) return '—'
  if (!Number.isFinite(Number(v))) return '—'
  return `${Number(v).toFixed(2)}s`
}

function formatInt(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  return Math.round(Number(v)).toLocaleString()
}

function formatBytes(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  const n = Number(v)
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let x = n
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++ }
  return `${x.toFixed(x >= 100 ? 0 : 1)} ${units[i]}`
}

const cacheClass = computed(() => {
  const v = db.value?.metrics?.cache_hit_rate
  if (v == null) return ''
  if (v >= 0.99) return 'metric-good'
  if (v >= 0.95) return 'metric-warn'
  return 'metric-bad'
})

const poolClass = computed(() => {
  const v = db.value?.metrics?.pool_utilization
  if (v == null) return ''
  if (v < 0.7) return 'metric-good'
  if (v < 0.9) return 'metric-warn'
  return 'metric-bad'
})
</script>

<style scoped>
.uptime-panel {
  color: var(--ink);
  margin-bottom: 48px;
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
.section-blurb code,
.subsection-blurb code,
.setup-cta-body code {
  background: rgba(148, 163, 184, 0.12);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.subsection-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 28px 0 12px 0;
}
.subsection-title-spaced {
  margin-top: 36px;
}
.subsection-blurb {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 16px 0;
  line-height: 1.6;
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
.loading {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
}
.empty-inline {
  font-size: 13px;
  color: var(--muted);
  padding: 14px;
  text-align: center;
  border: 1px dashed rgba(148, 163, 184, 0.2);
  border-radius: 6px;
}

/* ─── Setup CTA ─── */
.setup-cta {
  background: rgba(30, 41, 59, 0.6);
  border: 1px dashed rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.setup-cta-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}
.setup-cta-body {
  font-size: 13px;
  color: var(--ink);
  margin: 0 0 10px 0;
  line-height: 1.6;
}
.setup-cta-list {
  font-size: 13px;
  color: var(--ink);
  margin: 0 0 10px 18px;
  line-height: 1.7;
}

/* ─── Monitor rows ─── */
.monitor-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  padding: 14px 18px;
}
.monitor-row {
  display: grid;
  grid-template-columns: 14px 1fr 80px 110px 90px;
  gap: 14px;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
}
.monitor-row + .monitor-row {
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}
.monitor-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--faint);
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.15);
}
.dot-up { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18); }
.dot-down { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.22); }
.dot-paused { background: var(--muted); }
.dot-pending,
.dot-validating { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18); }
.monitor-name {
  color: var(--ink);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.monitor-status {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: var(--ink);
}
.status-up { color: #86efac; }
.status-down { color: #fca5a5; }
.status-pending,
.status-validating { color: #fbbf24; }
.monitor-last,
.monitor-rt {
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.monitor-rt { text-align: right; }

/* ─── Availability bars ─── */
.availability-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.availability-row {
  display: grid;
  grid-template-columns: 200px 1fr 80px 110px;
  gap: 14px;
  align-items: center;
  font-size: 13px;
}
.availability-label {
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.availability-bar {
  height: 10px;
  background: rgba(239, 68, 68, 0.25);
  border-radius: 3px;
  overflow: hidden;
}
.availability-bar-fill {
  height: 100%;
  background: #22c55e;
  transition: width 0.4s ease;
}
.availability-pct {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.availability-incidents {
  color: var(--muted);
  font-size: 12px;
}

/* ─── Incident table ─── */
.incident-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.incident-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}
.incident-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  color: var(--ink);
}
.incident-cause {
  color: var(--muted);
  font-size: 12px;
}

/* ─── DB metric grid ─── */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}
@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
}
.metric-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  padding: 14px 16px;
  border-radius: 8px;
}
.metric-card.metric-good {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.06);
}
.metric-card.metric-warn {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.06);
}
.metric-card.metric-bad {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.08);
}
.metric-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.metric-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.metric-sublabel {
  font-size: 11px;
  color: var(--faint);
  margin-top: 4px;
}
.db-meta {
  font-size: 11px;
  color: var(--faint);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.db-missing {
  color: #fbbf24;
}
</style>
