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
                <span class="font-mono">public/docs/phase_intelligence/phase_{{ selectedPhase }}.md</span>
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
          <li>1. Edit: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">public/docs/phase_intelligence/phase_X_*.md</code></li>
          <li>2. Rebuild app: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">npm run build</code></li>
          <li>3. Deploy: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">git push</code> (auto-deploys to Vercel)</li>
          <li>4. Done: Intelligence files are embedded in app and accessible at /docs URLs</li>
        </ol>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Import phase intelligence files directly
import phase1Raw from '../../public/docs/phase_intelligence/phase_1_seed_pairs.md?raw'
import phase2Raw from '../../public/docs/phase_intelligence/phase_2_conflict_resolution.md?raw'
import phase3Raw from '../../public/docs/phase_intelligence/phase_3_lego_baskets.md?raw'
import manifestRaw from '../../public/docs/phase_intelligence/manifest_compilation.md?raw'
import audioRaw from '../../public/docs/phase_intelligence/audio_generation.md?raw'

const phaseContent = {
  '1': phase1Raw || `# Phase 1: Translation + LEGO Extraction\n\n**Version**: 9.0.0\n**Status**: Active\n\n## Overview\n\nPhase 1 translates canonical seeds and extracts LEGOs in a single pass.\n\n## Output\n\n- draft_lego_pairs.json (may contain conflicts)\n\n## Key Concepts\n\n- Seed pairs embedded in lego_pairs.json (no separate seed_pairs.json)\n- A-type LEGOs: Atomic, single word either side\n- M-type LEGOs: Molecular, 2+ words both sides, teaches pattern\n\nSee APML v9.0 specification for full details.`,
  '2': phase2Raw || `# Phase 2: Conflict Resolution\n\n**Version**: 9.0.0\n**Status**: Active\n\n## Overview\n\nPhase 2 resolves KNOWN->TARGET conflicts through upchunking.\n\n## Input\n\n- draft_lego_pairs.json (from Phase 1)\n\n## Output\n\n- lego_pairs.json (SINGLE SOURCE OF TRUTH - conflict-free)\n- upchunk_resolutions.json (record of conflict resolutions)\n\n## Key Concepts\n\n- Upchunking: Creating M-types to resolve KNOWN->TARGET conflicts\n- All conflicts must be resolved before Phase 3\n\nSee APML v9.0 specification for full details.`,
  '3': phase3Raw || `# Phase 3: Basket Generation\n\n**Version**: 9.0.0\n**Status**: Active\n\n## Overview\n\nPhase 3 generates practice baskets from conflict-free LEGOs.\n\n## Input\n\n- lego_pairs.json (from Phase 2)\n\n## Output\n\n- lego_baskets.json\n\n## Key Properties\n\n- One basket per new LEGO\n- 10 phrases per basket (progressive complexity)\n- Only uses previously-learned LEGOs\n\nSee APML v9.0 specification for full details.`,
  'manifest': manifestRaw || `# Manifest: Course Compilation\n\n**Version**: 9.0.0\n**Status**: Script\n\n## Overview\n\nCompiles phase outputs into final course manifest for audio generation.\n\n## Input\n\n- lego_pairs.json\n- lego_baskets.json\n- introductions.json\n\n## Output\n\n- course_manifest.json\n\nSee APML v9.0 specification for full details.`,
  'audio': audioRaw || `# Audio: TTS Generation\n\n**Version**: 9.0.0\n**Status**: Separate\n\n## Overview\n\nGenerates audio files from course manifest using TTS services.\n\n## Input\n\n- course_manifest.json\n\n## Output\n\n- audio/*.mp3 files\n\n## Notes\n\n- Handled by Kai (separate process)\n- Uses Azure TTS / ElevenLabs\n\nSee APML v9.0 specification for full details.`
}

const phases = [
  { id: '1', name: 'Translation + LEGO Extraction', status: 'active', version: '9.0.0', locked: true },
  { id: '2', name: 'Conflict Resolution', status: 'active', version: '9.0.0', locked: true },
  { id: '3', name: 'Basket Generation', status: 'active', version: '9.0.0', locked: true },
  { id: 'manifest', name: 'Course Compilation', status: 'active', version: '9.0.0', locked: true },
  { id: 'audio', name: 'TTS Generation', status: 'documented', version: '9.0.0' }
]

const selectedPhase = ref('1')
const intelligence = ref('')

const activePhases = computed(() => {
  // Show all phases (no deprecated phases in v9.0)
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
