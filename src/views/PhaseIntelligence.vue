<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>&larr;</span>
          <span>Back to Dashboard</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Phase Intelligence
        </h1>
        <p class="mt-2 text-slate-400">
          Methodology modules for each phase - the single source of truth for agent instructions
        </p>
        <div class="mt-2 inline-flex items-center gap-2 text-xs">
          <span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">APML v14.0</span>
          <span class="text-slate-500">Course Builder Consolidation</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- v14 Architecture Notice -->
      <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div class="flex items-start gap-3">
          <span class="text-amber-400 text-xl">&#x26A0;</span>
          <div>
            <h3 class="text-amber-400 font-semibold">v14 Architecture Change</h3>
            <p class="text-slate-400 text-sm mt-1">
              Phases 0-3 (translation, conflict resolution, basket generation) have been
              <strong class="text-amber-300">consolidated into the Course Builder API</strong>.
              The methodology skills in <code class="text-emerald-400">.claude/commands/</code> now define how content is created.
            </p>
          </div>
        </div>
      </div>

      <!-- Phase Selector -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">Select Phase</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            v-for="phase in phases"
            :key="phase.id"
            @click="selectPhase(phase.id)"
            :class="[
              'p-4 rounded-lg border transition hover:-translate-y-0.5',
              selectedPhase === phase.id
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : phase.status === 'deprecated'
                  ? 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
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
                    phase.status === 'primary' ? 'bg-emerald-500/20 text-emerald-400' :
                    phase.status === 'deprecated' ? 'bg-red-500/20 text-red-400' :
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
        <div v-if="!currentPhase">
          <p class="text-slate-400 text-center py-12">Select a phase to view its intelligence</p>
        </div>

        <div v-else>
          <!-- Intelligence metadata -->
          <div class="mb-4 pb-4 border-b border-slate-600">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-slate-100">
                  {{ currentPhase.id === 'CB' ? 'Course Builder' : `Phase ${selectedPhase}` }}: {{ currentPhase.name }}
                </h3>
                <p class="text-sm text-slate-400 mt-1">
                  <span v-if="currentPhase.status === 'primary'" class="text-emerald-400">
                    &#x2B50; Primary content creation method (v14)
                  </span>
                  <span v-else-if="currentPhase.status === 'active'" class="text-green-400">
                    &#x2705; Active module
                  </span>
                  <span v-else-if="currentPhase.status === 'deprecated'" class="text-red-400">
                    &#x274C; Deprecated in v14 - use Course Builder
                  </span>
                  <span v-if="currentPhase.version" class="ml-2">
                    &bull; Version {{ currentPhase.version }}
                  </span>
                </p>
              </div>
              <div class="text-sm text-slate-400">
                <span class="font-mono">{{ currentPhase.path }}</span>
              </div>
            </div>
          </div>

          <!-- Deprecation notice for phases 1-3 -->
          <div v-if="currentPhase.status === 'deprecated'" class="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-300 text-sm">
              <strong>This phase is deprecated.</strong> In v14, content creation uses the Course Builder API
              (<code class="text-emerald-400">POST /api/seed/complete</code>).
              The methodology is defined in <code class="text-emerald-400">.claude/commands/</code> skills.
            </p>
          </div>

          <!-- Raw markdown display -->
          <pre class="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto">{{ intelligence }}</pre>
        </div>
      </div>

      <!-- Workflow Info -->
      <div class="mt-8 bg-slate-800/30 rounded-lg border border-slate-600/30 p-6">
        <h3 class="text-lg font-semibold text-slate-100 mb-3">v14 Content Creation Workflow</h3>
        <ol class="text-slate-400 space-y-2 text-sm">
          <li>1. Read methodology skills: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">.claude/commands/ssi-*.md</code></li>
          <li>2. Agent submits seeds: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">POST /api/seed/complete</code></li>
          <li>3. API validates atomically (tiling, ZUT, vocabulary, phrases)</li>
          <li>4. Generate audio: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">Phase 8 (port 3465)</code></li>
          <li>5. Compile manifest: <code class="text-emerald-400 bg-slate-900/50 px-2 py-1 rounded">Phase 9 (port 3466)</code></li>
        </ol>
        <p class="text-slate-500 text-xs mt-4">
          Pipeline: Course Builder &rarr; Audio Generation &rarr; Manifest Compilation
        </p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Import methodology skills (v14 Course Builder approach)
import ssiLearnerPattern from '../../.claude/commands/ssi-learner-pattern.md?raw'
import ssiDecomposeSeed from '../../.claude/commands/ssi-decompose-seed.md?raw'
import ssiBuildPhrases from '../../.claude/commands/ssi-build-phrases.md?raw'

// Import audio pipeline prompts (still active in v14)
import phase8Raw from '../../services/phases/phase8-audio-generation/PROMPT.md?raw'
import phase9Raw from '../../services/phases/phase9-manifest-compilation/PROMPT.md?raw'

// Combined Course Builder methodology
const courseBuilderContent = `# Course Builder Methodology (v14)

The Course Builder API (\`POST /api/seed/complete\`) handles all content creation.
Agent learns methodology from example patterns, then submits seeds directly.

## Core Skills

The following skills define the SSi methodology:

---

## 1. SSi Learner Pattern
What the learner experiences - understand this to build courses correctly.

${ssiLearnerPattern}

---

## 2. SSi Decompose Seed
How to break seeds into LEGOs (pedagogical order, not sentence order).

${ssiDecomposeSeed}

---

## 3. SSi Build Phrases
How to generate practice phrases with build-up progression.

${ssiBuildPhrases}
`

// Placeholder for deprecated phases
const deprecatedNotice = (phaseName) => `# ${phaseName}

## DEPRECATED in APML v14.0

This phase has been consolidated into the **Course Builder API**.

### What Changed

In v14, content creation uses a single endpoint:
- \`POST /api/seed/complete\` handles translation, LEGO extraction, conflict resolution, and basket generation
- The API validates all constraints atomically
- No separate phase orchestration needed

### New Approach

Instead of separate phases, agents:
1. Read the methodology skills in \`.claude/commands/\`
2. Learn the SSi pattern from Welsh/Spanish examples
3. Submit seeds directly via curl
4. API validates and stores in Supabase

### Migration

- Use **Course Builder** tab to see the current methodology
- Phase 8 (Audio) and Phase 9 (Manifest) are unchanged
`

const phaseContent = {
  'CB': courseBuilderContent,
  '1': deprecatedNotice('Phase 1: Translation + LEGO Extraction'),
  '2': deprecatedNotice('Phase 2: Conflict Resolution'),
  '3': deprecatedNotice('Phase 3: Basket Generation'),
  '8': phase8Raw,
  '9': phase9Raw
}

const phases = [
  { id: 'CB', name: 'Course Builder', status: 'primary', version: '14.0', path: '.claude/commands/ssi-*.md' },
  { id: '1', name: 'Translation', status: 'deprecated', version: null, path: 'ARCHIVED' },
  { id: '2', name: 'Conflict Resolution', status: 'deprecated', version: null, path: 'ARCHIVED' },
  { id: '3', name: 'Basket Generation', status: 'deprecated', version: null, path: 'ARCHIVED' },
  { id: '8', name: 'Audio Generation', status: 'active', version: '2.0', path: 'services/phases/phase8-audio-generation/PROMPT.md' },
  { id: '9', name: 'Manifest Compilation', status: 'active', version: '14.0', path: 'services/phases/phase9-manifest-compilation/PROMPT.md' }
]

const selectedPhase = ref('CB')
const intelligence = ref('')

const currentPhase = computed(() => {
  return phases.find(p => p.id === selectedPhase.value)
})

function selectPhase(phase) {
  selectedPhase.value = phase
  intelligence.value = phaseContent[phase] || `# Phase ${phase}\n\nIntelligence file not yet created.`
}

// Load Course Builder by default (v14 primary)
selectPhase('CB')
</script>
