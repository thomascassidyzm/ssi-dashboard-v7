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
          Canonical Content
        </h1>
        <p class="mt-2 text-slate-400">
          Language-agnostic source data for all SSi courses - the 3-parameter input model
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Overview -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8 mb-8">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-4">3-Parameter Input Model</h2>
        <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
          <p class="mb-4">
            All SSi courses are generated from <strong>3 inputs</strong>:
          </p>
          <ol class="space-y-2 mb-4">
            <li><strong>Target language</strong> (e.g., "spa", "fra", "cmn")</li>
            <li><strong>Known language</strong> (e.g., "eng")</li>
            <li><strong>Canonical content</strong> (seeds, encouragements, welcomes)</li>
          </ol>
          <p>
            This architecture means we maintain a single source of truth for curriculum and motivational content,
            which is then transformed by Phase 1 (Translation with LEGOs) into language-specific courses.
          </p>
        </div>
      </div>

      <!-- Canonical Seeds -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-emerald-400">Canonical Seeds</h2>
            <p class="text-slate-400 mt-1">668 pedagogically-ordered seeds with {target} placeholders</p>
          </div>
          <span class="text-xs text-slate-500 font-mono">canonical_seeds.json</span>
        </div>

        <div class="bg-slate-900/50 rounded p-4 mb-4">
          <p class="text-sm text-slate-300 mb-2"><strong>Location:</strong> <code class="text-emerald-400">/public/vfs/canonical/canonical_seeds.json</code></p>
          <p class="text-sm text-slate-300 mb-2"><strong>Total Seeds:</strong> <code class="text-emerald-400">668</code></p>
          <p class="text-sm text-slate-300"><strong>Optimization:</strong> <code class="text-emerald-400">16 years empirical refinement</code></p>
        </div>

        <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
          <h3 class="text-sm font-semibold text-emerald-300 mb-2">Sample Seeds (First 10)</h3>
          <pre class="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap" v-if="canonicalSeeds.length > 0">{{ JSON.stringify(canonicalSeeds.slice(0, 10), null, 2) }}</pre>
          <p v-else class="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>

      <!-- Encouragements -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-emerald-400">Encouragements</h2>
            <p class="text-slate-400 mt-1">Motivational content spoken in known language</p>
          </div>
          <span class="text-xs text-slate-500 font-mono">{lang}_encouragements.json</span>
        </div>

        <div class="bg-slate-900/50 rounded p-4 mb-4">
          <p class="text-sm text-slate-300 mb-2"><strong>Location:</strong> <code class="text-emerald-400">/public/vfs/canonical/eng_encouragements.json</code></p>
          <p class="text-sm text-slate-300 mb-2"><strong>Pooled Encouragements:</strong> <code class="text-emerald-400">{{ encouragements.pooledEncouragements?.length || 0 }}</code> (random selection)</p>
          <p class="text-sm text-slate-300 mb-2"><strong>Ordered Encouragements:</strong> <code class="text-emerald-400">{{ encouragements.orderedEncouragements?.length || 0 }}</code> (sequential delivery)</p>
          <p class="text-sm text-slate-300"><strong>Note:</strong> One file per source language (currently only English)</p>
        </div>

        <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
          <h3 class="text-sm font-semibold text-emerald-300 mb-2">Pooled Encouragements (First 5)</h3>
          <pre class="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap" v-if="encouragements.pooledEncouragements">{{ JSON.stringify(encouragements.pooledEncouragements.slice(0, 5), null, 2) }}</pre>
          <p v-else class="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>

      <!-- Welcomes -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-emerald-400">Welcome Messages</h2>
            <p class="text-slate-400 mt-1">Course introduction templates (one per language pair)</p>
          </div>
          <span class="text-xs text-slate-500 font-mono">welcomes.json</span>
        </div>

        <div class="bg-slate-900/50 rounded p-4 mb-4">
          <p class="text-sm text-slate-300 mb-2"><strong>Location:</strong> <code class="text-emerald-400">/public/vfs/canonical/welcomes.json</code></p>
          <p class="text-sm text-slate-300 mb-2"><strong>Structure:</strong> Course-specific welcome per language pair</p>
          <p class="text-sm text-slate-300"><strong>Spoken in:</strong> Known language (source language)</p>
        </div>

        <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
          <h3 class="text-sm font-semibold text-emerald-300 mb-2">Welcomes Template</h3>
          <pre class="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(welcomes, null, 2) }}</pre>
        </div>
      </div>

      <!-- Future: Editing Note -->
      <div class="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-amber-400 mb-2">📝 Future Enhancement</h3>
        <p class="text-slate-300 text-sm">
          In-browser editing of canonical content is planned for a future release. For now, edit the JSON files directly in:
          <code class="text-emerald-400 text-xs">/public/vfs/canonical/</code>
        </p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const canonicalSeeds = ref([])
const encouragements = ref({})
const welcomes = ref({})

onMounted(async () => {
  try {
    // Load canonical seeds
    const seedsResponse = await fetch('/vfs/canonical/canonical_seeds.json')
    canonicalSeeds.value = await seedsResponse.json()

    // Load encouragements
    const encouragementsResponse = await fetch('/vfs/canonical/eng_encouragements.json')
    encouragements.value = await encouragementsResponse.json()

    // Load welcomes
    const welcomesResponse = await fetch('/vfs/canonical/welcomes.json')
    welcomes.value = await welcomesResponse.json()
  } catch (error) {
    console.error('Failed to load canonical content:', error)
  }
})

console.log('🌱 Canonical Content Loaded')
</script>
