<template>
  <div class="flex items-center gap-3">
    <!-- Environment Selector -->
    <div class="relative">
      <select
        v-model="selectedEnv"
        @change="switchEnvironment"
        class="bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded px-3 py-1.5 pr-8 appearance-none cursor-pointer hover:border-slate-500 transition-colors"
      >
        <option value="tom">Tom's Machine</option>
        <option value="kai">Kai's Machine</option>
        <option value="api">API Server</option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- Connection Status -->
    <div class="flex items-center gap-2 text-xs">
      <div
        class="w-2 h-2 rounded-full"
        :class="connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'"
      ></div>
      <span class="text-slate-400">{{ connectionStatus.message }}</span>
    </div>

    <!-- Current URL (dev only) -->
    <div v-if="showDebug" class="text-xs text-slate-500 max-w-xs truncate">
      {{ currentApiUrl }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const ENVIRONMENTS = {
  tom: {
    name: "Tom's Machine",
    url: 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev'
  },
  kai: {
    name: "Kai's Machine",
    url: 'https://kai-machine-placeholder.ngrok-free.dev'  // Update when Kai provides ngrok URL
  },
  api: {
    name: 'API Server',
    url: 'http://localhost:3456'  // Or deployed API URL
  }
}

const selectedEnv = ref('tom')
const connectionStatus = ref({ connected: false, message: 'Checking...' })
const showDebug = ref(false)

const currentApiUrl = computed(() => {
  return ENVIRONMENTS[selectedEnv.value]?.url || ENVIRONMENTS.tom.url
})

onMounted(() => {
  // Load saved environment from localStorage
  const saved = localStorage.getItem('ssi_environment')
  if (saved && ENVIRONMENTS[saved]) {
    selectedEnv.value = saved
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

  // Store in localStorage for api.js to pick up
  localStorage.setItem('api_base_url', newUrl)

  // Check connection to new environment
  await checkConnection()

  // Reload page to reinitialize API client with new URL
  window.location.reload()
}

async function checkConnection() {
  try {
    const url = currentApiUrl.value
    const response = await fetch(`${url}/api/health`, {
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

// Expose current URL for parent components
defineExpose({
  currentApiUrl
})
</script>
