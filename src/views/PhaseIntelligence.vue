<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-emerald-400">
          Phase Intelligence
        </h1>
        <p class="mt-2 text-slate-400">
          Methodology modules for each phase - the single source of truth for agent instructions
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Phase Selector -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">Select Phase</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            v-for="phase in phases"
            :key="phase.id"
            @click="loadPhase(phase.id)"
            :class="[
              'p-4 rounded-lg border transition hover:-translate-y-0.5',
              selectedPhase === phase.id
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500/50'
            ]"
          >
            <div class="text-center">
              <div class="text-2xl font-bold mb-1">{{ phase.id }}</div>
              <div class="text-xs">{{ phase.name }}</div>
              <div class="mt-2">
                <span
                  :class="[
                    'text-xs px-2 py-1 rounded',
                    phase.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    phase.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  ]"
                >
                  {{ phase.status }}
                </span>
                <span v-if="phase.version" class="text-xs text-emerald-400 ml-2">
                  v{{ phase.version }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Intelligence Content -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p class="text-slate-400 mt-4">Loading phase {{ selectedPhase }} intelligence...</p>
        </div>

        <div v-else-if="error" class="text-center py-12">
          <p class="text-red-400 mb-2">{{ error }}</p>
          <p class="text-slate-400 text-sm">Phase {{ selectedPhase }} intelligence not available</p>
        </div>

        <div v-else>
          <!-- Intelligence metadata -->
          <div class="mb-4 pb-4 border-b border-slate-600">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-slate-100">
                  Phase {{ selectedPhase }}: {{ currentPhase?.name }}
                </h3>
                <p class="text-sm text-slate-400 mt-1">
                  <span v-if="currentPhase?.status === 'active'" class="text-green-400">
                    ✅ Active module
                  </span>
                  <span v-else-if="currentPhase?.status === 'pending'" class="text-yellow-400">
                    ⏳ Pending creation (showing legacy APML prompt)
                  </span>
                  <span v-else class="text-gray-400">
                    🔮 Future phase
                  </span>
                  <span v-if="currentPhase?.version" class="ml-2">
                    • Version {{ currentPhase.version }}
                  </span>
                </p>
              </div>
              <div class="text-sm text-slate-400">
                <span class="font-mono">GET /phase-intelligence/{{ selectedPhase }}</span>
              </div>
            </div>
          </div>

          <!-- Raw markdown display -->
          <pre class="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto">{{ intelligence }}</pre>
        </div>
      </div>

      <!-- Workflow Info -->
      <div class="mt-8 bg-slate-800/30 rounded-lg border border-slate-600/30 p-6">
        <h3 class="text-lg font-semibold text-slate-100 mb-3">Update Workflow</h3>
        <ol class="text-slate-400 space-y-2 text-sm">
          <li>1. Edit: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">docs/phase_intelligence/phase_X.md</code></li>
          <li>2. Commit: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">git commit -m "Update phase X"</code></li>
          <li>3. Restart: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">pm2 restart automation-server</code></li>
          <li>4. Done: Agents fetch latest from <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">/phase-intelligence/X</code></li>
        </ol>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const phases = [
  { id: '1', name: 'Translation', status: 'active', version: '1.0' },
  { id: '2', name: 'Corpus', status: 'active', version: '1.0' },
  { id: '3', name: 'LEGO Extraction', status: 'active', version: '2.0' },
  { id: '3.5', name: 'Graph', status: 'active', version: '1.0' },
  { id: '5', name: 'Baskets', status: 'active', version: '1.0' },
  { id: '5.5', name: 'Deduplication', status: 'active', version: '1.0' },
  { id: '6', name: 'Introductions', status: 'pending' },
  { id: '7', name: 'Compilation', status: 'pending' },
  { id: '8', name: 'Audio (Kai)', status: 'pending' }
]

const selectedPhase = ref('3')
const intelligence = ref('')
const loading = ref(false)
const error = ref(null)

const currentPhase = computed(() => {
  return phases.find(p => p.id === selectedPhase.value)
})

async function loadPhase(phase) {
  loading.value = true
  error.value = null
  selectedPhase.value = phase

  try {
    const response = await fetch(`http://localhost:3456/phase-intelligence/${phase}`)

    if (!response.ok) {
      throw new Error(`Phase ${phase} not found`)
    }

    intelligence.value = await response.text()
  } catch (err) {
    error.value = err.message
    intelligence.value = ''
  } finally {
    loading.value = false
  }
}

// Load Phase 3 by default
onMounted(() => loadPhase('3'))
</script>
