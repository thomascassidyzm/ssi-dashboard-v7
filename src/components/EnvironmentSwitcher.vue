<template>
  <div class="env-switcher-inline">
    <!-- Environment Selector with inline status dot -->
    <div class="selector-wrapper">
      <select
        v-model="selectedEnv"
        @change="switchEnvironment"
        class="env-select"
      >
        <option value="tom">Tom's Machine</option>
        <option value="kai">Kai's Machine</option>
        <option value="ssi">SSi Machine</option>
        <option value="watson">SSi Machine (Cloud)</option>
        <option value="api">API Server</option>
      </select>
      <div class="select-arrow">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <!-- Status dot inside the select area -->
      <div
        class="status-dot"
        :class="connectionStatus.connected ? 'connected' : 'disconnected'"
        :title="connectionStatus.message || (connectionStatus.connected ? 'Connected' : 'Disconnected')"
      ></div>
    </div>

    <!-- Why the machine changed under you. A green dot alone explains nothing to
         someone whose saves just started working again. -->
    <span v-if="fellBackFrom" class="env-fallback-note" :title="connectionStatus.message">
      {{ fellBackFrom }} was unreachable — using {{ ENVIRONMENTS[selectedEnv].name }}
    </span>

    <!-- Deploy button for remote machines -->
    <button
      v-if="isRemote && connectionStatus.connected"
      @click="deploy"
      :disabled="deploying || repairing"
      class="deploy-btn"
      :title="deployMessage || 'Pull latest code and restart services'"
    >
      {{ deploying ? 'Deploying...' : 'Deploy' }}
    </button>

    <!-- Repair fallback: only ever appears AFTER a deploy has failed on this machine -->
    <button
      v-if="repairToken && !repairing"
      @click="showRepairConfirm = !showRepairConfirm"
      class="repair-btn"
      title="Deploy failed — force-reset this machine's checkout to match origin/main"
    >
      Repair
    </button>
    <span v-if="repairing" class="repair-progress">Repairing…</span>

    <!-- Explicit confirm step: a hard reset on a production machine is never accidental -->
    <div v-if="showRepairConfirm && repairToken" class="repair-confirm">
      <p class="repair-title">Repair {{ ENVIRONMENTS[selectedEnv]?.name }}?</p>
      <p>
        Deploy failed on this machine. Repair force-resets its checkout to exactly match
        <code>origin/{{ repairBranch }}</code>.
      </p>
      <p class="repair-warn">
        Any local changes on that machine — edits, untracked files, a diverged branch — will be
        discarded.
      </p>
      <p>
        Before resetting, everything being discarded is snapshotted on that machine
        (<code>logs/repair-snapshots/</code> plus a <code>refs/repair-snapshots/…</code> git ref),
        so it stays recoverable. The repair is written to the deploy history.
      </p>
      <div class="repair-actions">
        <button class="repair-cancel" @click="showRepairConfirm = false">Cancel</button>
        <button class="repair-go" @click="runRepair">Discard local changes and repair</button>
      </div>
    </div>

    <span v-if="deployMessage" class="deploy-message" :class="{ error: deployFailed }">{{ deployMessage }}</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { shouldFallBackToDefault } from '@/services/default-environment.js'

const ENVIRONMENTS = {
  tom: {
    name: "Tom's Machine",
    url: 'https://popty.ngrok.app',
    machineProfile: 'tom'
  },
  kai: {
    name: "Kai's Machine",
    url: 'https://kai-lizard-function.ngrok-free.dev',
    machineProfile: 'kai'
  },
  ssi: {
    name: "SSi Machine",
    url: 'https://ssi-machine.ngrok.app',
    machineProfile: 'kai'  // Similar specs to Kai's machine (8GB RAM)
  },
  watson: {
    name: 'SSi Machine (Cloud)',
    url: 'https://watson-1.tail4968cb.ts.net:8443',  // Tailscale Funnel → production-api :3470 on watson-1
    machineProfile: 'default'  // watson-1 has 15GB RAM — matches the 16GB 'default' profile
  },
  api: {
    name: 'API Server',
    url: 'http://localhost:3470',  // Production API (consolidated Jan 2026)
    machineProfile: 'default'  // API mode will use default until we add API-specific profiles
  }
}

// SYNCHRONOUS: Ensure localStorage is set BEFORE any async code runs
// This prevents race conditions with production store loading
// Default environment can be set via VITE_DEFAULT_ENVIRONMENT in .env (kai, tom, watson or api).
// This module writes api_base_url on import, so THIS is what a browser with no stored
// preference actually gets. Unset: a local checkout talks to its own API; anything else
// (popty.app included) talks to watson-1, the always-on cloud machine.
const isLocalHost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const DEFAULT_ENV = import.meta.env.VITE_DEFAULT_ENVIRONMENT || (isLocalHost ? 'api' : 'watson')
const savedEnv = localStorage.getItem('ssi_environment')
const initialEnv = (savedEnv && ENVIRONMENTS[savedEnv]) ? savedEnv : DEFAULT_ENV
if (!savedEnv) {
  localStorage.setItem('ssi_environment', DEFAULT_ENV)
}
const expectedUrl = ENVIRONMENTS[initialEnv].url
const expectedProfile = ENVIRONMENTS[initialEnv].machineProfile
if (localStorage.getItem('api_base_url') !== expectedUrl) {
  localStorage.setItem('api_base_url', expectedUrl)
  console.log(`[EnvironmentSwitcher] Initialized api_base_url to: ${expectedUrl}`)
}
if (localStorage.getItem('ssi_machine_profile') !== expectedProfile) {
  localStorage.setItem('ssi_machine_profile', expectedProfile)
  console.log(`[EnvironmentSwitcher] Initialized machine_profile to: ${expectedProfile}`)
}

const selectedEnv = ref(initialEnv)
const connectionStatus = ref({ connected: false, message: 'Checking...' })
const showDebug = ref(false)
// Name of the machine we healed away from, so the navbar can say why.
const fellBackFrom = ref('')
const deploying = ref(false)
const deployMessage = ref('')
const deployFailed = ref(false)
// Repair is a fallback, not a first option: the token only exists once a deploy has
// failed on the target machine, and the server refuses a repair without it.
const repairToken = ref('')
const repairBranch = ref('main')
const repairing = ref(false)
const showRepairConfirm = ref(false)

// Any machine that isn't this browser's own localhost is deployable — the ngrok string
// test used to hide Deploy on watson-1, which is now the default environment.
const isRemote = computed(() => {
  const url = ENVIRONMENTS[selectedEnv.value]?.url || ''
  return !!url && !url.includes('localhost') && !url.includes('127.0.0.1')
})

const currentApiUrl = computed(() => {
  return ENVIRONMENTS[selectedEnv.value]?.url || ENVIRONMENTS.tom.url
})

onMounted(() => {
  // Load saved environment from localStorage, or default to configured environment
  const saved = localStorage.getItem('ssi_environment')
  if (saved && ENVIRONMENTS[saved]) {
    selectedEnv.value = saved
  } else {
    // No saved environment - default to configured machine and save it
    selectedEnv.value = DEFAULT_ENV
    localStorage.setItem('ssi_environment', DEFAULT_ENV)
  }

  // Always ensure api_base_url is synced with current environment
  const targetUrl = ENVIRONMENTS[selectedEnv.value].url
  const currentApiUrl = localStorage.getItem('api_base_url')
  if (currentApiUrl !== targetUrl) {
    localStorage.setItem('api_base_url', targetUrl)
    console.log(`[EnvironmentSwitcher] Set api_base_url to ${selectedEnv.value}: ${targetUrl}`)
  }

  // Check connection — and if a SAVED choice is dead, heal off it rather than
  // leaving every write to die as the browser's bare "Failed to fetch". The
  // status line alone was not enough: it says "Connection failed" in the navbar
  // while the person is looking at the sentence they just tried to save.
  checkConnection().then(async (connected) => {
    if (!shouldFallBackToDefault({
      savedEnv: localStorage.getItem('ssi_environment'),
      currentEnv: selectedEnv.value,
      defaultEnv: DEFAULT_ENV,
      isLocalHost,
      connected,
    })) return

    const deadName = ENVIRONMENTS[selectedEnv.value].name
    selectedEnv.value = DEFAULT_ENV
    localStorage.setItem('ssi_environment', DEFAULT_ENV)
    localStorage.setItem('api_base_url', ENVIRONMENTS[DEFAULT_ENV].url)
    localStorage.setItem('ssi_machine_profile', ENVIRONMENTS[DEFAULT_ENV].machineProfile)
    console.warn(`[EnvironmentSwitcher] ${deadName} is unreachable — fell back to ${ENVIRONMENTS[DEFAULT_ENV].name}`)
    const healed = await checkConnection()
    if (!healed) return
    fellBackFrom.value = deadName
    connectionStatus.value = {
      connected: true,
      message: `${deadName} was unreachable — using ${ENVIRONMENTS[DEFAULT_ENV].name}`
    }
    // Re-pinning localStorage does not un-break THIS page: its data fetches
    // already went to the dead machine and failed. switchEnvironment() reloads
    // for exactly this reason — do the same, so the person is not left looking
    // at a "failed to fetch" screen that is already fixed underneath them.
    // Safe against a loop: ssi_environment is now the default, so
    // shouldFallBackToDefault() returns false on the next load.
    sessionStorage.setItem('ssi_env_fell_back_from', deadName)
    window.location.reload()
  })

  // Surviving notice from a fallback that reloaded the page.
  const healedFrom = sessionStorage.getItem('ssi_env_fell_back_from')
  if (healedFrom) {
    fellBackFrom.value = healedFrom
    sessionStorage.removeItem('ssi_env_fell_back_from')
  }

  // Check for debug mode
  showDebug.value = localStorage.getItem('ssi_debug') === 'true'
})

async function switchEnvironment() {
  // Save to localStorage
  localStorage.setItem('ssi_environment', selectedEnv.value)

  // Update API base URL globally
  const newUrl = ENVIRONMENTS[selectedEnv.value].url
  const newProfile = ENVIRONMENTS[selectedEnv.value].machineProfile

  // Store in localStorage for api.js and CourseManager to pick up
  localStorage.setItem('api_base_url', newUrl)
  localStorage.setItem('ssi_machine_profile', newProfile)

  console.log(`[EnvironmentSwitcher] Switched to ${selectedEnv.value}: url=${newUrl}, profile=${newProfile}`)

  // Check connection to new environment
  await checkConnection()

  // Reload page to reinitialize API client with new URL
  window.location.reload()
}

async function checkConnection() {
  try {
    const url = currentApiUrl.value
    // ngrok proxy uses /health, local API uses /api/health
    const healthPath = selectedEnv.value === 'api' ? '/api/health' : '/health'
    const response = await fetch(`${url}${healthPath}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      },
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      connectionStatus.value = {
        connected: true,
        message: `Connected to ${ENVIRONMENTS[selectedEnv.value].name}`
      }
      return true
    }
    connectionStatus.value = {
      connected: false,
      message: 'Server error'
    }
    return false
  } catch (error) {
    connectionStatus.value = {
      connected: false,
      message: 'Connection failed'
    }
    return false
  }
}

async function deploy() {
  if (deploying.value || repairing.value) return
  deploying.value = true
  deployMessage.value = ''
  deployFailed.value = false
  repairToken.value = ''
  showRepairConfirm.value = false

  try {
    const url = currentApiUrl.value
    const response = await fetch(`${url}/api/deploy`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(120000)
    })

    const data = await response.json()
    if (data.repair_available && data.repair_token) {
      repairToken.value = data.repair_token
    }
    if (data.success) {
      const parts = []
      if (data.already_up_to_date) parts.push('Already up to date')
      else parts.push(`Pulled new code`)
      if (data.npm_installed) parts.push('npm installed')
      parts.push(`${data.services_restarted?.length || 0} services restarted`)
      parts.push(`${data.elapsed_seconds}s`)
      deployMessage.value = parts.join(' | ')

      // Brief delay then re-check connection (services are restarting)
      setTimeout(() => checkConnection(), 3000)
    } else {
      deployFailed.value = true
      deployMessage.value = `Deploy failed: ${data.error}`
    }
  } catch (err) {
    deployFailed.value = true
    deployMessage.value = `Deploy error: ${err.message}`
  } finally {
    deploying.value = false
  }
}

async function runRepair() {
  if (repairing.value || !repairToken.value) return
  repairing.value = true
  showRepairConfirm.value = false
  deployMessage.value = 'Repairing: snapshotting local state, then resetting to origin…'
  deployFailed.value = false

  const token = repairToken.value
  repairToken.value = '' // single use — a fresh failure is needed for another repair

  try {
    const url = currentApiUrl.value
    const response = await fetch(`${url}/api/deploy/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ repair_token: token, confirm: true, branch: repairBranch.value }),
      signal: AbortSignal.timeout(300000)
    })

    const data = await response.json()
    if (data.success) {
      const parts = [`Repaired to ${data.branch} @ ${(data.head || '').slice(0, 8)}`]
      if (data.snapshot) {
        parts.push(`snapshot ${data.snapshot.id} (${data.snapshot.dirty_files} changed, ${data.snapshot.untracked_count} untracked)`)
      }
      if (data.npm_installed) parts.push('npm installed')
      parts.push(`${data.services_restarted?.length || 0} services restarted`)
      parts.push(`${data.elapsed_seconds}s`)
      deployMessage.value = parts.join(' | ')
      setTimeout(() => checkConnection(), 5000)
    } else {
      deployFailed.value = true
      deployMessage.value = `Repair failed: ${data.error}`
    }
  } catch (err) {
    deployFailed.value = true
    deployMessage.value = `Repair error: ${err.message}`
  } finally {
    repairing.value = false
  }
}

// Expose current URL for parent components
defineExpose({
  currentApiUrl
})
</script>

<style scoped>
.env-switcher-inline {
  display: flex;
  align-items: center;
}

.selector-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.env-select {
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--line);
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.8125rem;
  padding: 0.375rem 2.5rem 0.375rem 0.75rem;
  border-radius: 6px;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.env-select:hover {
  border-color: var(--color-tungsten, var(--accent));
}

.select-arrow {
  position: absolute;
  right: 1.75rem;
  pointer-events: none;
  color: var(--color-paper-dim, var(--muted));
}

/* Fallback notice — why the backend changed under you. Amber, the same
   "something is degraded but working" register the DRAFT badge uses. */
.env-fallback-note {
  font-size: 11px;
  line-height: 1.2;
  color: var(--color-tungsten, #ffa630);
  max-width: 22rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:root[data-theme="light"] .env-fallback-note { color: #92400e; }

.status-dot {
  position: absolute;
  right: 0.625rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  pointer-events: none;
}

.status-dot.connected {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

.status-dot.disconnected {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
}

.deploy-btn {
  margin-left: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #ffffff;
  background: #1e40af;
  border: 1px solid #2563eb;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  white-space: nowrap;
}

.deploy-btn:hover {
  background: #2563eb;
  border-color: #3b82f6;
}

.deploy-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.env-switcher-inline {
  position: relative;
}

.repair-btn {
  margin-left: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #451a03;
  background: #f59e0b;
  border: 1px solid #d97706;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.repair-btn:hover {
  background: #fbbf24;
}

.repair-progress {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #f59e0b;
}

.repair-confirm {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 50;
  width: 22rem;
  padding: 0.875rem;
  background: var(--surface-2, #1f2937);
  border: 1px solid #d97706;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--muted, #d1d5db);
}

.repair-confirm p {
  margin: 0 0 0.5rem;
}

.repair-confirm code {
  font-size: 0.7rem;
}

.repair-title {
  font-weight: 700;
  color: var(--fg, #f9fafb);
}

.repair-warn {
  color: #fbbf24;
  font-weight: 600;
}

.repair-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.repair-cancel,
.repair-go {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}

.repair-cancel {
  background: transparent;
  border: 1px solid var(--line, #4b5563);
  color: var(--muted, #d1d5db);
}

.repair-go {
  background: #b45309;
  border: 1px solid #d97706;
  color: #fff;
  font-weight: 600;
}

.repair-go:hover {
  background: #d97706;
}

.deploy-message {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  color: var(--muted, #9ca3af);
  max-width: 26rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deploy-message.error {
  color: #f87171;
}
</style>
