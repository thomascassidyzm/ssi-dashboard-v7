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
        :title="connectionStatus.connected ? 'Connected' : 'Disconnected'"
      ></div>
    </div>

    <!-- Deploy button for remote machines -->
    <button
      v-if="isRemote && connectionStatus.connected"
      @click="deploy"
      :disabled="deploying"
      class="deploy-btn"
      :title="deployMessage || 'Pull latest code and restart services'"
    >
      {{ deploying ? 'Deploying...' : 'Deploy' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

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
  api: {
    name: 'API Server',
    url: 'http://localhost:3470',  // Production API (consolidated Jan 2026)
    machineProfile: 'default'  // API mode will use default until we add API-specific profiles
  }
}

// SYNCHRONOUS: Ensure localStorage is set BEFORE any async code runs
// This prevents race conditions with production store loading
// Default environment can be set via VITE_DEFAULT_ENVIRONMENT in .env (kai, tom, or api)
const DEFAULT_ENV = import.meta.env.VITE_DEFAULT_ENVIRONMENT || 'tom'
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
const deploying = ref(false)
const deployMessage = ref('')

const isRemote = computed(() => {
  const url = ENVIRONMENTS[selectedEnv.value]?.url || ''
  return url.includes('ngrok')
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

  // Check connection
  checkConnection()

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
    } else {
      connectionStatus.value = {
        connected: false,
        message: 'Server error'
      }
    }
  } catch (error) {
    connectionStatus.value = {
      connected: false,
      message: 'Connection failed'
    }
  }
}

async function deploy() {
  if (deploying.value) return
  deploying.value = true
  deployMessage.value = ''

  try {
    const url = currentApiUrl.value
    const response = await fetch(`${url}/api/deploy`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(120000)
    })

    const data = await response.json()
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
      deployMessage.value = `Deploy failed: ${data.error}`
    }
  } catch (err) {
    deployMessage.value = `Deploy error: ${err.message}`
  } finally {
    deploying.value = false
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
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.8125rem;
  padding: 0.375rem 2.5rem 0.375rem 0.75rem;
  border-radius: 6px;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.env-select:hover {
  border-color: var(--color-tungsten, #ffa630);
}

.select-arrow {
  position: absolute;
  right: 1.75rem;
  pointer-events: none;
  color: var(--color-paper-dim, #c1c1bb);
}

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
  color: #e2e8f0;
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
</style>
