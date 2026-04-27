<template>
  <div v-if="isAdmin" class="remote-control" ref="rootRef">
    <button
      class="rc-toggle"
      :class="{ warn: health?.mem?.used_percent >= 85, crit: health?.mem?.used_percent >= 95 }"
      @click="toggle"
      :title="toggleTitle"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span v-if="health" class="rc-ram">{{ ramLabel }}</span>
    </button>

    <div v-if="open" class="rc-popover" @click.stop>
      <div class="rc-header">
        <div class="rc-title">Remote control</div>
        <div class="rc-host" v-if="health">{{ health.hostname }}</div>
        <button class="rc-close" @click="open = false">×</button>
      </div>

      <div v-if="loading && !health" class="rc-loading">Loading health…</div>
      <div v-else-if="loadError" class="rc-error">{{ loadError }}</div>

      <div v-if="health" class="rc-section">
        <div class="rc-row">
          <span class="rc-label">RAM</span>
          <div class="rc-bar">
            <div
              class="rc-bar-fill"
              :class="{ warn: health.mem.used_percent >= 85, crit: health.mem.used_percent >= 95 }"
              :style="{ width: health.mem.used_percent + '%' }"
            ></div>
          </div>
          <span class="rc-meta">{{ formatGB(health.mem.used_bytes) }} / {{ formatGB(health.mem.total_bytes) }} ({{ health.mem.used_percent }}%)</span>
        </div>
        <div class="rc-row">
          <span class="rc-label">Load</span>
          <span class="rc-meta">{{ health.load_avg.map(n => n.toFixed(2)).join(' · ') }} on {{ health.cpu_count }} cores</span>
        </div>
        <div class="rc-row">
          <span class="rc-label">Up</span>
          <span class="rc-meta">{{ formatUptime(health.uptime_seconds) }}</span>
        </div>
      </div>

      <div v-if="health?.pm2?.length" class="rc-section">
        <div class="rc-section-head">
          <span>PM2 processes ({{ health.pm2.length }})</span>
          <button class="rc-refresh" @click="fetchHealth" :disabled="loading">↻</button>
        </div>
        <ul class="rc-procs">
          <li v-for="p in sortedProcs" :key="p.pm_id" class="rc-proc">
            <div class="rc-proc-main">
              <span class="rc-proc-dot" :class="p.status"></span>
              <span class="rc-proc-name">{{ p.name }}</span>
              <span class="rc-proc-meta">{{ formatMB(p.mem_bytes) }} · {{ p.cpu_percent }}%</span>
            </div>
            <button
              class="rc-btn"
              :disabled="busy[p.name]"
              @click="restartProc(p.name)"
              title="Restart this PM2 process"
            >{{ busy[p.name] ? '…' : 'Restart' }}</button>
          </li>
        </ul>
      </div>

      <div class="rc-section">
        <button
          class="rc-btn-wide"
          :disabled="busy.__killapps"
          @click="killApps"
          title="Kill Chrome + iTerm2 to free RAM on the remote machine"
        >{{ busy.__killapps ? 'Killing…' : 'Free RAM (kill Chrome + iTerm)' }}</button>
        <button
          class="rc-btn-wide rc-btn-restart-all"
          :disabled="busy.__restartall"
          @click="restartAll"
          title="pm2 restart all — restarts every PM2 process on the remote machine"
        >{{ busy.__restartall ? 'Restarting all…' : 'Restart all PM2 services' }}</button>
      </div>

      <div v-if="health?.reboot_readiness" class="rc-section rc-readiness">
        <div class="rc-section-head"><span>Boot readiness</span></div>
        <div class="rc-row">
          <span class="rc-readiness-dot" :class="{ ok: health.reboot_readiness.pm2_launch_agent.exists }"></span>
          <span class="rc-readiness-label">PM2 launch agent</span>
          <span class="rc-meta">{{ health.reboot_readiness.pm2_launch_agent.exists ? 'installed' : 'missing' }}</span>
        </div>
        <div class="rc-row">
          <span class="rc-readiness-dot" :class="{ ok: health.reboot_readiness.pm2_dump.exists }"></span>
          <span class="rc-readiness-label">PM2 saved state</span>
          <span class="rc-meta">{{ health.reboot_readiness.pm2_dump.exists ? formatAge(health.reboot_readiness.pm2_dump.age_seconds) : 'missing' }}</span>
        </div>
        <div v-if="!health.reboot_readiness.ready" class="rc-fix">
          <div class="rc-fix-label">One-time fix, run on target machine:</div>
          <code class="rc-fix-cmd">{{ health.reboot_readiness.fix_command }}</code>
        </div>
      </div>

      <div class="rc-section rc-danger">
        <button
          class="rc-btn rc-btn-danger"
          :disabled="busy.__reboot || !canReboot"
          @click="rebootMachine"
          :title="canReboot ? 'Reboot the whole machine' : 'Blocked: PM2 would not auto-resurrect after reboot'"
        >{{ busy.__reboot ? 'Rebooting…' : (canReboot ? 'Reboot machine' : 'Reboot blocked') }}</button>
      </div>

      <div v-if="lastMessage" class="rc-message" :class="{ error: lastIsError }">
        {{ lastMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { isAdmin, getAccessToken } = useAuth()

const rootRef = ref(null)
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const health = ref(null)
const busy = ref({})
const lastMessage = ref('')
const lastIsError = ref(false)
let pollTimer = null

const ramLabel = computed(() => {
  if (!health.value) return ''
  return `${health.value.mem.used_percent}%`
})

const toggleTitle = computed(() => {
  if (!health.value) return 'Remote control'
  return `RAM ${health.value.mem.used_percent}% · load ${health.value.load_avg[0].toFixed(2)}`
})

const sortedProcs = computed(() => {
  if (!health.value?.pm2) return []
  return [...health.value.pm2].sort((a, b) => (b.mem_bytes || 0) - (a.mem_bytes || 0))
})

const canReboot = computed(() => health.value?.reboot_readiness?.ready === true)

function apiBase() {
  return localStorage.getItem('api_base_url') || 'http://localhost:3470'
}

async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...(init.headers || {})
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${apiBase()}${path}`, {
    signal: AbortSignal.timeout(init.timeout || 8000),
    ...init,
    headers
  })
}

async function fetchHealth() {
  loading.value = true
  loadError.value = ''
  try {
    const r = await authedFetch('/api/admin/system-health')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    health.value = await r.json()
  } catch (e) {
    loadError.value = `Health check failed: ${e.message}`
  } finally {
    loading.value = false
  }
}

function flash(msg, isErr = false) {
  lastMessage.value = msg
  lastIsError.value = isErr
  setTimeout(() => { if (lastMessage.value === msg) lastMessage.value = '' }, 5000)
}

async function restartProc(name) {
  busy.value = { ...busy.value, [name]: true }
  try {
    const r = await authedFetch('/api/admin/pm2/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      timeout: 15000
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    flash(`Restarted ${name}`)
    setTimeout(fetchHealth, 1500)
  } catch (e) {
    flash(`Restart failed: ${e.message}`, true)
  } finally {
    const next = { ...busy.value }; delete next[name]; busy.value = next
  }
}

async function killApps() {
  if (!window.confirm('Kill Chrome and iTerm2 on the remote machine? Any unsaved work there will be lost.')) return
  busy.value = { ...busy.value, __killapps: true }
  try {
    const r = await authedFetch('/api/admin/kill-apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apps: ['Google Chrome', 'iTerm2'] }),
      timeout: 15000
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    const killed = Object.entries(data.results || {})
      .filter(([, v]) => v === 'killed')
      .map(([k]) => k)
    flash(killed.length ? `Killed: ${killed.join(', ')}` : 'No target apps were running')
    setTimeout(fetchHealth, 1500)
  } catch (e) {
    flash(`Kill failed: ${e.message}`, true)
  } finally {
    const next = { ...busy.value }; delete next.__killapps; busy.value = next
  }
}

async function restartAll() {
  if (!window.confirm('Restart every PM2 process on the remote machine? Services will blip for ~5–10 seconds.')) return
  busy.value = { ...busy.value, __restartall: true }
  try {
    const r = await authedFetch('/api/admin/pm2/fix', {
      method: 'POST',
      timeout: 10000
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    flash(data.message || 'Restart-all initiated')
    setTimeout(fetchHealth, 6000)
  } catch (e) {
    flash(`Restart-all failed: ${e.message}`, true)
  } finally {
    const next = { ...busy.value }; delete next.__restartall; busy.value = next
  }
}

async function rebootMachine() {
  if (!window.confirm('Reboot the entire machine? All services will go offline for ~1–2 minutes.')) return
  busy.value = { ...busy.value, __reboot: true }
  try {
    const r = await authedFetch('/api/admin/restart-machine', {
      method: 'POST',
      timeout: 10000
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
    flash(data.message || 'Reboot scheduled')
  } catch (e) {
    flash(`Reboot failed: ${e.message}`, true)
  } finally {
    const next = { ...busy.value }; delete next.__reboot; busy.value = next
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) fetchHealth()
}

function handleClickOutside(e) {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}

function formatGB(bytes) {
  if (!bytes) return '0 GB'
  return (bytes / 1024 ** 3).toFixed(1) + ' GB'
}
function formatMB(bytes) {
  if (!bytes) return '0 MB'
  return (bytes / 1024 ** 2).toFixed(0) + ' MB'
}
function formatUptime(s) {
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}
function formatAge(s) {
  if (s == null) return '—'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

onMounted(() => {
  if (isAdmin.value) fetchHealth()
  pollTimer = setInterval(() => { if (open.value) fetchHealth() }, 10000)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.remote-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
}

.rc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: border-color 0.2s, color 0.2s;
}
.rc-toggle:hover { border-color: var(--color-tungsten, #ffa630); }
.rc-toggle.warn { color: #fbbf24; border-color: #b45309; }
.rc-toggle.crit { color: #fca5a5; border-color: #b91c1c; }

.rc-ram { font-variant-numeric: tabular-nums; }

.rc-popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 22rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  padding: 0.75rem;
  z-index: 1000;
  color: #e2e8f0;
}

.rc-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.rc-title { font-weight: 600; font-size: 0.875rem; }
.rc-host { font-size: 0.7rem; color: #94a3b8; margin-left: auto; }
.rc-close { background: transparent; border: 0; color: #94a3b8; font-size: 1.25rem; cursor: pointer; line-height: 1; padding: 0 0.25rem; }
.rc-close:hover { color: #e2e8f0; }

.rc-section { border-top: 1px solid #334155; padding-top: 0.5rem; margin-top: 0.5rem; }
.rc-section:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
.rc-section-head { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.375rem; }
.rc-refresh { background: transparent; border: 0; color: #94a3b8; cursor: pointer; font-size: 0.875rem; }
.rc-refresh:hover { color: #e2e8f0; }

.rc-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.25rem; }
.rc-label { width: 2.5rem; color: #94a3b8; }
.rc-meta { color: #cbd5e1; font-variant-numeric: tabular-nums; font-size: 0.7rem; }

.rc-bar { flex: 1; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; }
.rc-bar-fill { height: 100%; background: #22c55e; transition: width 0.3s; }
.rc-bar-fill.warn { background: #fbbf24; }
.rc-bar-fill.crit { background: #ef4444; }

.rc-procs { list-style: none; margin: 0; padding: 0; max-height: 14rem; overflow-y: auto; }
.rc-proc { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; border-bottom: 1px solid #273445; }
.rc-proc:last-child { border-bottom: 0; }
.rc-proc-main { flex: 1; display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.rc-proc-dot { width: 8px; height: 8px; border-radius: 50%; background: #64748b; flex-shrink: 0; }
.rc-proc-dot.online { background: #22c55e; }
.rc-proc-dot.stopped { background: #64748b; }
.rc-proc-dot.errored { background: #ef4444; }
.rc-proc-name { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-proc-meta { font-size: 0.65rem; color: #94a3b8; margin-left: auto; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.rc-btn {
  padding: 0.25rem 0.5rem; font-size: 0.7rem; font-weight: 500;
  background: #334155; border: 1px solid #475569; color: #e2e8f0;
  border-radius: 4px; cursor: pointer; transition: background 0.15s;
  flex-shrink: 0;
}
.rc-btn:hover:not(:disabled) { background: #475569; }
.rc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rc-btn-wide {
  width: 100%; padding: 0.5rem; font-size: 0.75rem; font-weight: 500;
  background: #334155; border: 1px solid #475569; color: #e2e8f0;
  border-radius: 4px; cursor: pointer; transition: background 0.15s;
}
.rc-btn-wide:hover:not(:disabled) { background: #475569; }
.rc-btn-wide:disabled { opacity: 0.5; cursor: not-allowed; }
.rc-btn-restart-all { margin-top: 0.4rem; }

.rc-danger { display: flex; gap: 0.5rem; align-items: center; }
.rc-btn-danger {
  flex: 1; padding: 0.5rem;
  background: #7f1d1d; border-color: #991b1b; color: #fecaca; font-size: 0.75rem;
}
.rc-btn-danger:hover:not(:disabled) { background: #991b1b; }

.rc-readiness .rc-row { margin-bottom: 0.2rem; }
.rc-readiness-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
.rc-readiness-dot.ok { background: #22c55e; }
.rc-readiness-label { flex: 1; font-size: 0.7rem; color: #cbd5e1; }

.rc-fix { margin-top: 0.4rem; padding: 0.4rem 0.5rem; background: #0f172a; border-radius: 4px; }
.rc-fix-label { font-size: 0.65rem; color: #94a3b8; margin-bottom: 0.2rem; }
.rc-fix-cmd { display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.65rem; color: #fbbf24; word-break: break-all; user-select: all; }

.rc-loading, .rc-error { font-size: 0.75rem; color: #94a3b8; padding: 0.5rem 0; }
.rc-error { color: #fca5a5; }

.rc-message { margin-top: 0.5rem; font-size: 0.7rem; color: #86efac; padding: 0.375rem 0.5rem; background: #064e3b; border-radius: 4px; }
.rc-message.error { color: #fca5a5; background: #7f1d1d; }
</style>
