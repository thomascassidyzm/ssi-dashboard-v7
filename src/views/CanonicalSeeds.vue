<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Dashboard</span>
        </router-link>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-emerald-400">
              Canonical Seeds
            </h1>
            <p class="mt-2 text-slate-400">
              All {{ totalSeeds }} canonical seeds (16 years empirical optimization) • Single Source of Truth
            </p>
          </div>
          <div class="flex items-center gap-4">
            <button
              v-if="!editing"
              @click="editing = true"
              class="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition">
              Edit Seeds
            </button>
            <template v-if="editing">
              <button
                @click="saveSeeds"
                class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold rounded transition">
                Save Changes
              </button>
              <button
                @click="cancelEdit"
                class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-300 rounded transition">
                Cancel
              </button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-emerald-400">Loading canonical seeds...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-8">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Seeds Display -->
      <div v-else>
        <!-- Search and Filter -->
        <div class="mb-6 flex items-center gap-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search seeds by ID or text..."
            class="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:outline-none">
          <div class="text-slate-400">
            {{ filteredSeeds.length }} of {{ totalSeeds }} seeds
          </div>
        </div>

        <!-- Seeds List -->
        <div class="space-y-3">
          <div
            v-for="seed in paginatedSeeds"
            :key="seed.seed_id"
            class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-5 hover:border-emerald-500/50 transition">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <div class="font-mono text-sm text-emerald-400 font-semibold px-3 py-1 bg-emerald-500/10 rounded">
                  {{ seed.seed_id }}
                </div>
              </div>
              <div class="flex-1">
                <div v-if="!editing" class="text-slate-300">
                  {{ seed.source }}
                </div>
                <textarea
                  v-else
                  v-model="seed.source"
                  rows="2"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-slate-300 focus:border-emerald-500 focus:outline-none resize-none"></textarea>
                <div class="mt-1 text-xs text-slate-500">
                  Canonical ID: {{ seed.canonical_id }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="mt-8 flex items-center justify-between">
          <div class="text-slate-400 text-sm">
            Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredSeeds.length) }} of {{ filteredSeeds.length }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500 transition">
              Previous
            </button>
            <div class="px-4 py-2 bg-slate-800 border border-emerald-500/50 rounded text-emerald-400">
              Page {{ currentPage }} of {{ totalPages }}
            </div>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500 transition">
              Next
            </button>
          </div>
        </div>

        <!-- About Section (Collapsed by default) -->
        <div class="mt-12">
          <button
            @click="showAbout = !showAbout"
            class="w-full flex items-center justify-between bg-slate-800/50 border border-slate-400/20 rounded-lg p-4 hover:border-emerald-500/50 transition">
            <h2 class="text-xl font-semibold text-emerald-400">About Canonical Seeds</h2>
            <span class="text-slate-400">{{ showAbout ? '▼' : '▶' }}</span>
          </button>

          <div v-show="showAbout" class="mt-4 bg-slate-800/50 border border-slate-400/20 rounded-lg p-8">
            <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
              <p>The {{ totalSeeds }} canonical seeds represent 16 years of empirical optimization in language course design. Each seed is a foundational language concept expressed in English (not because English is special, but because they need to be expressed in something).</p>

              <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Concept: Language-Agnostic Foundation</h3>
              <p>Canonical seeds are <strong>NOT language pairs</strong>. They are English-expressed concepts that get translated into:</p>
              <ul class="space-y-2">
                <li><strong>Target Language:</strong> The language being learned (e.g., Irish, Italian, Spanish)</li>
                <li><strong>Known Language:</strong> The learner's language (e.g., English, French, German)</li>
              </ul>
              <p class="text-sm text-slate-400 mt-2"><em>Note: If one of the course languages happens to be English, that translation is not required.</em></p>

              <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Seed Characteristics</h3>
              <ul class="space-y-2">
                <li><strong>Empirically Optimized:</strong> Refined over 16 years of real-world learner data</li>
                <li><strong>Pedagogically Sequenced:</strong> Ordered for optimal learning progression</li>
                <li><strong>High-Frequency Coverage:</strong> Cover the most useful vocabulary and structures</li>
                <li><strong>Universal Concepts:</strong> Language-agnostic foundations that work across all languages</li>
              </ul>

              <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Role in Pipeline</h3>
              <p>Canonical seeds are the <strong>universal foundation</strong> for all courses:</p>
              <ul class="space-y-1">
                <li><strong>Phase 1:</strong> Translated into target + known languages using 6 pedagogical heuristics</li>
                <li><strong>Phase 3:</strong> Extracted into LEGOs with S{seed}L{position} provenance</li>
                <li><strong>Edit Propagation:</strong> Changes to seeds automatically propagate through all language directions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const seeds = ref([])
const loading = ref(true)
const error = ref(null)
const editing = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(50)
const showAbout = ref(false)

const originalSeeds = ref([])

const totalSeeds = computed(() => seeds.value.length)

const filteredSeeds = computed(() => {
  if (!searchQuery.value) return seeds.value

  const query = searchQuery.value.toLowerCase()
  return seeds.value.filter(seed =>
    seed.seed_id.toLowerCase().includes(query) ||
    seed.source.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.ceil(filteredSeeds.value.length / pageSize.value))

const paginatedSeeds = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredSeeds.value.slice(start, end)
})

async function loadSeeds() {
  try {
    loading.value = true
    error.value = null

    const response = await fetch('/vfs/seeds/canonical_seeds.json')
    if (!response.ok) {
      throw new Error(`Failed to load seeds: ${response.statusText}`)
    }

    const data = await response.json()
    seeds.value = data
    originalSeeds.value = JSON.parse(JSON.stringify(data)) // Deep copy

    console.log(`✅ Loaded ${data.length} canonical seeds`)
  } catch (err) {
    error.value = `Error loading canonical seeds: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

function saveSeeds() {
  // TODO: Implement save functionality (POST to API endpoint)
  console.log('💾 Saving seeds...', seeds.value)

  // For now, just show a message
  alert(`Saving ${seeds.value.length} canonical seeds...\n\nTODO: Implement API endpoint to save seeds back to canonical_seeds.json`)

  editing.value = false
  originalSeeds.value = JSON.parse(JSON.stringify(seeds.value))
}

function cancelEdit() {
  seeds.value = JSON.parse(JSON.stringify(originalSeeds.value))
  editing.value = false
}

onMounted(() => {
  loadSeeds()
})

console.log('🌱 Canonical Seeds (SSoT) Loaded')
</script>
