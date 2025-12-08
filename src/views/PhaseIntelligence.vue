<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Dashboard</span>
        </router-link>
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
            v-for="phase in activePhases"
            :key="phase.id"
            @click="selectPhase(phase.id)"
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
                    phase.status === 'integrated' ? 'bg-teal-500/20 text-teal-400' :
                    phase.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                    phase.status === 'todo' ? 'bg-yellow-500/20 text-yellow-400' :
                    phase.status === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                    phase.status === 'documented' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-500/20 text-gray-400'
                  ]"
                >
                  {{ phase.status }}
                </span>
                <span v-if="phase.version" class="text-xs text-emerald-400 ml-2">
                  v{{ phase.version }}
                </span>
                <span v-if="phase.locked" class="text-xs text-amber-400 ml-1" title="Locked SSoT">
                  🔒
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Intelligence Content -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
        <div v-if="!currentPhase">
          <p class="text-slate-400 text-center py-12">Select a phase to view its intelligence</p>
        </div>

        <div v-else>
          <!-- Intelligence metadata -->
          <div class="mb-4 pb-4 border-b border-slate-600">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-slate-100">
                  Phase {{ selectedPhase }}: {{ currentPhase.name }}
                </h3>
                <p class="text-sm text-slate-400 mt-1">
                  <span v-if="currentPhase.status === 'active'" class="text-green-400">
                    ✅ Active module
                  </span>
                  <span v-else-if="currentPhase.status === 'integrated'" class="text-teal-400">
                    🔗 Integrated into another phase
                  </span>
                  <span v-else-if="currentPhase.status === 'inactive'" class="text-gray-400">
                    ❌ Deprecated
                  </span>
                  <span v-else-if="currentPhase.status === 'complete'" class="text-blue-400">
                    ✅ Complete
                  </span>
                  <span v-else-if="currentPhase.status === 'documented'" class="text-purple-400">
                    📚 Documented
                  </span>
                  <span v-else class="text-gray-400">
                    🔮 Future phase
                  </span>
                  <span v-if="currentPhase.version" class="ml-2">
                    • Version {{ currentPhase.version }}
                  </span>
                  <span v-if="currentPhase.locked" class="ml-2 text-amber-400">
                    🔒 Locked
                  </span>
                </p>
              </div>
              <div class="text-sm text-slate-400">
                <span class="font-mono">{{ currentPhase.path }}</span>
              </div>
            </div>
          </div>

          <!-- Raw markdown display -->
          <pre class="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto">{{ intelligence }}</pre>
        </div>
      </div>

      <!-- Workflow Info -->
      <div class="mt-8 bg-slate-800/30 rounded-lg border border-slate-600/30 p-6">
        <h3 class="text-lg font-semibold text-slate-100 mb-3">Update Workflow (APML v11.0)</h3>
        <ol class="text-slate-400 space-y-2 text-sm">
          <li>1. Edit: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">services/phases/{phase}/PROMPT.md</code></li>
          <li>2. Rebuild app: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">npm run build</code></li>
          <li>3. Deploy: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">git push</code> (auto-deploys to Vercel)</li>
          <li>4. Done: Prompts are co-located with services and served via API</li>
        </ol>
        <p class="text-slate-500 text-xs mt-4">
          SSoT: Each phase's PROMPT.md lives alongside its service code in services/phases/
        </p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Import phase intelligence files from co-located service directories (APML v11.0)
// SSoT: Prompts live alongside their services
import phase1Raw from '../../services/phases/phase1-translation/PROMPT.md?raw'
import phase2Raw from '../../services/phases/phase1-lego-extraction/PROMPT.md?raw'
import phase3Raw from '../../services/phases/phase3-basket-generation/PROMPT.md?raw'
import phase8Raw from '../../services/phases/phase8-audio-generation/PROMPT.md?raw'
import phase9Raw from '../../services/phases/phase9-manifest-compilation/PROMPT.md?raw'

const phaseContent = {
  '1': phase1Raw,
  '2': phase2Raw,
  '3': phase3Raw,
  '8': phase8Raw,
  '9': phase9Raw,
  // Aliases for legacy/friendly names
  'audio': phase8Raw,
  'manifest': phase9Raw
}

const phases = [
  { id: '1', name: 'Translation + LEGO Extraction', status: 'active', version: '4.2', locked: true, path: 'services/phases/phase1-translation/PROMPT.md' },
  { id: '2', name: 'Conflict Resolution', status: 'active', version: '11.0.0', locked: true, path: 'services/phases/phase1-lego-extraction/PROMPT.md' },
  { id: '3', name: 'Basket Generation', status: 'active', version: '7.0', locked: true, path: 'services/phases/phase3-basket-generation/PROMPT.md' },
  { id: '8', name: 'Audio Generation', status: 'active', version: '1.1', locked: true, path: 'services/phases/phase8-audio-generation/PROMPT.md' },
  { id: '9', name: 'Manifest Compilation', status: 'active', version: '11.0.0', locked: true, path: 'services/phases/phase9-manifest-compilation/PROMPT.md' }
]

const selectedPhase = ref('1')
const intelligence = ref('')

const activePhases = computed(() => {
  // Show all phases (no deprecated phases in v11.0)
  return phases
})

const currentPhase = computed(() => {
  return phases.find(p => p.id === selectedPhase.value)
})

function selectPhase(phase) {
  selectedPhase.value = phase
  intelligence.value = phaseContent[phase] || `# Phase ${phase}\n\nIntelligence file not yet created.`
}

// Load Phase 1 by default
selectPhase('1')
</script>
