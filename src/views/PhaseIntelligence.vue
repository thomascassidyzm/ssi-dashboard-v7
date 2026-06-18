<template>
  <div class="phase-intelligence-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">Phase Intelligence</h1>
      <p class="page-subtitle">
        Methodology modules for each phase - the single source of truth for agent instructions
      </p>
      <div class="page-badges">
        <span class="version-badge">APML v14.0</span>
        <span class="version-label">Course Builder Consolidation</span>
      </div>
    </div>

    <!-- Main Content -->
    <main class="content-area">

      <!-- v14 Architecture Notice -->
      <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div class="flex items-start gap-3">
          <span class="text-accent text-xl">&#x26A0;</span>
          <div>
            <h3 class="text-accent font-semibold">v14 Architecture Change</h3>
            <p class="text-muted text-sm mt-1">
              Phases 0-3 (translation, conflict resolution, basket generation) have been
              <strong class="text-accent">consolidated into the Course Builder API</strong>.
              The methodology skills in <code class="text-accent-2">.claude/commands/</code> now define how content is created.
            </p>
          </div>
        </div>
      </div>

      <!-- Phase Selector -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-ink mb-4">Select Phase</h2>
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
                  ? 'bg-surface-2 border-line text-faint hover:border-line'
                  : 'bg-surface border-line text-ink hover:border-emerald-500/50'
            ]"
          >
            <div class="text-center">
              <div class="text-2xl font-bold mb-1">{{ phase.id }}</div>
              <div class="text-xs">{{ phase.name }}</div>
              <div class="mt-2">
                <span
                  :class="[
                    'text-xs px-2 py-1 rounded',
                    phase.status === 'active' ? 'bg-green-500/20 text-accent-2' :
                    phase.status === 'primary' ? 'bg-emerald-500/20 text-accent-2' :
                    phase.status === 'deprecated' ? 'bg-red-500/20 text-danger' :
                    'bg-surface-3 text-muted'
                  ]"
                >
                  {{ phase.status }}
                </span>
                <span v-if="phase.version" class="text-xs text-accent-2 ml-2">
                  v{{ phase.version }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Intelligence Content -->
      <div class="bg-surface rounded-lg border border-line p-6">
        <div v-if="!currentPhase">
          <p class="text-muted text-center py-12">Select a phase to view its intelligence</p>
        </div>

        <div v-else>
          <!-- Intelligence metadata -->
          <div class="mb-4 pb-4 border-b border-line">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-semibold text-ink">
                  {{ currentPhase.id === 'CB' ? 'Course Builder' : `Phase ${selectedPhase}` }}: {{ currentPhase.name }}
                </h3>
                <p class="text-sm text-muted mt-1">
                  <span v-if="currentPhase.status === 'primary'" class="text-accent-2">
                    &#x2B50; Primary content creation method (v14)
                  </span>
                  <span v-else-if="currentPhase.status === 'active'" class="text-accent-2">
                    &#x2705; Active module
                  </span>
                  <span v-else-if="currentPhase.status === 'deprecated'" class="text-danger">
                    &#x274C; Deprecated in v14 - use Course Builder
                  </span>
                  <span v-if="currentPhase.version" class="ml-2">
                    &bull; Version {{ currentPhase.version }}
                  </span>
                </p>
              </div>
              <div class="text-sm text-muted">
                <span class="font-mono">{{ currentPhase.path }}</span>
              </div>
            </div>
          </div>

          <!-- Deprecation notice for phases 1-3 -->
          <div v-if="currentPhase.status === 'deprecated'" class="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-danger text-sm">
              <strong>This phase is deprecated.</strong> In v14, content creation uses the Course Builder API
              (<code class="text-accent-2">POST /api/seed/complete</code>).
              The methodology is defined in <code class="text-accent-2">.claude/commands/</code> skills.
            </p>
          </div>

          <!-- Raw markdown display -->
          <pre class="whitespace-pre-wrap font-mono text-sm text-ink leading-relaxed overflow-x-auto">{{ intelligence }}</pre>
        </div>
      </div>

      <!-- Workflow Info -->
      <div class="mt-8 bg-surface rounded-lg border border-line p-6">
        <h3 class="text-lg font-semibold text-ink mb-3">v14 Content Creation Workflow</h3>
        <ol class="text-muted space-y-2 text-sm">
          <li>1. Read methodology skills: <code class="text-accent-2 bg-surface-2 px-2 py-1 rounded">.claude/commands/ssi-*.md</code></li>
          <li>2. Agent submits seeds: <code class="text-accent-2 bg-surface-2 px-2 py-1 rounded">POST /api/seed/complete</code></li>
          <li>3. API validates atomically (tiling, ZUT, vocabulary, phrases)</li>
          <li>4. Generate audio: <code class="text-accent-2 bg-surface-2 px-2 py-1 rounded">Phase 8 (port 3465)</code></li>
          <li>5. Compile manifest: <code class="text-accent-2 bg-surface-2 px-2 py-1 rounded">Phase 9 (port 3466)</code></li>
        </ol>
        <p class="text-faint text-xs mt-4">
          Pipeline: Course Builder &rarr; Audio Generation &rarr; Manifest Compilation
        </p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Audio pipeline prompts (still active in v14)
// Note: Phase 8/9 PROMPT.md files may not exist on Vercel - using inline content
const phase8Raw = `# Phase 8: Audio Generation
Generates TTS audio for all phrases using Azure/ElevenLabs.
See services/phases/phase8-audio-v13.cjs for implementation.`

const phase9Raw = `# Phase 9: Manifest Compilation
Compiles final course manifest from Supabase data.
See services/phases/phase9-manifest-supabase.cjs for implementation.`

// Combined Course Builder methodology (inline - skills files are local-only)
const courseBuilderContent = `# Course Builder Methodology (v14)

The Course Builder API (\`POST /api/seed/complete\`) handles all content creation.
Agent learns methodology from example patterns, then submits seeds directly.

## Core Skills

The methodology is defined in local \`.claude/commands/\` skill files:

---

## 1. SSi Learner Pattern
What the learner experiences - understand this to build courses correctly.

- LEGOs are introduced with ~7 phrases on debut
- N-1 review uses 3 phrases
- Subsequent reviews use 1 phrase each
- Components taught before compounds

---

## 2. SSi Decompose Seed
How to break seeds into LEGOs (pedagogical order, not sentence order).

- Identify atomic (A-type) and molecular (M-type) pieces
- Order by dependency, not sentence order
- Mark vocabulary reuse with is_new flag

---

## 3. SSi Build Phrases
How to generate practice phrases with build-up progression.

- Component → Partial → Full LEGO → Contextual use
- Vary length, context, and LEGO position
- Minimum counts based on LEGO position in seed
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

<style scoped>
.phase-intelligence-view {
  padding: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--muted);
  margin: 0;
}

.page-badges {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.version-badge {
  padding: 0.25rem 0.5rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.version-label {
  color: var(--faint);
  font-size: 0.75rem;
}

.content-area {
  max-width: 100%;
}

/* Light mode: emerald #10b981 fails contrast on the pale canvas/tint;
   use the darker themed accent-2 (#047857) so dark mode is untouched. */
:root[data-theme="light"] .page-title {
  color: var(--accent-2);
}

:root[data-theme="light"] .version-badge {
  background: rgba(4, 120, 87, 0.14);
  color: var(--accent-2);
}
</style>
