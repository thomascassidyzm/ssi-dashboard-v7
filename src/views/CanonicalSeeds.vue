<template>
  <div class="canonical-seeds-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1 class="page-title">Canonical Seeds</h1>
          <p class="page-subtitle">
            All {{ totalSeeds }} canonical seeds (16 years empirical optimization) - Single Source of Truth
          </p>
        </div>
        <div class="header-actions">
          <button
            v-if="!editing"
            @click="editing = true"
            class="btn-edit">
            Edit Seeds
          </button>
          <template v-if="editing">
            <button @click="saveSeeds" :disabled="saving" class="btn-save">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button @click="cancelEdit" :disabled="saving" class="btn-cancel">
              Cancel
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="content-area">

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-accent-2">Loading canonical seeds...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-danger/10 border border-danger/50 rounded-lg p-6 mb-8">
        <p class="text-danger">{{ error }}</p>
      </div>

      <!-- Seeds Display -->
      <div v-else>
        <!-- Search and Filter -->
        <div class="mb-6 flex items-center gap-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search seeds by ID or text..."
            class="flex-1 px-4 py-2 bg-surface border border-line rounded text-ink placeholder-faint focus:border-accent-2 focus:outline-none">
          <div class="text-muted">
            {{ filteredSeeds.length }} of {{ totalSeeds }} seeds
          </div>
        </div>

        <!-- Seeds List -->
        <div class="space-y-3">
          <div
            v-for="seed in paginatedSeeds"
            :key="seed.seed_id"
            class="bg-surface border border-line shadow-sm rounded-lg p-5 hover:border-accent-2 transition">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <div class="ident text-sm font-semibold px-3 py-1 bg-accent-2/10 rounded">
                  {{ seed.seed_id }}
                </div>
              </div>
              <div class="flex-1">
                <div v-if="!editing" class="text-ink">
                  {{ seed.source }}
                </div>
                <textarea
                  v-else
                  v-model="seed.source"
                  rows="2"
                  class="w-full px-3 py-2 bg-surface-2 border border-line rounded text-ink focus:border-accent-2 focus:outline-none resize-none"></textarea>
                <div class="mt-1 text-xs text-faint">
                  Canonical ID: {{ seed.canonical_id }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="mt-8 flex items-center justify-between">
          <div class="text-muted text-sm">
            Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredSeeds.length) }} of {{ filteredSeeds.length }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-4 py-2 bg-surface border border-line rounded text-ink disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent-2 transition">
              Previous
            </button>
            <div class="px-4 py-2 bg-surface border border-accent-2 rounded text-accent-2">
              Page {{ currentPage }} of {{ totalPages }}
            </div>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="px-4 py-2 bg-surface border border-line rounded text-ink disabled:opacity-50 disabled:cursor-not-allowed hover:border-accent-2 transition">
              Next
            </button>
          </div>
        </div>

        <!-- About Section (Collapsed by default) -->
        <div class="mt-12">
          <button
            @click="showAbout = !showAbout"
            class="w-full flex items-center justify-between bg-surface border border-line shadow-sm rounded-lg p-4 hover:border-accent-2 transition">
            <h2 class="text-xl font-semibold text-accent-2">About Canonical Seeds</h2>
            <span class="text-muted">{{ showAbout ? '▼' : '▶' }}</span>
          </button>

          <div v-show="showAbout" class="mt-4 bg-surface border border-line shadow-sm rounded-lg p-8">
            <div class="prose prose-invert prose-emerald max-w-none text-muted">
              <p>The {{ totalSeeds }} canonical seeds represent 16 years of empirical optimization in language course design. Each seed is a foundational language concept expressed in English (not because English is special, but because they need to be expressed in something).</p>

              <h3 class="text-xl font-semibold text-accent-2 mt-6 mb-3">Key Concept: Language-Agnostic Foundation</h3>
              <p>Canonical seeds are <strong>NOT language pairs</strong>. They are English-expressed concepts that get translated into:</p>
              <ul class="space-y-2">
                <li><strong>Target Language:</strong> The language being learned (e.g., Irish, Italian, Spanish)</li>
                <li><strong>Known Language:</strong> The learner's language (e.g., English, French, German)</li>
              </ul>
              <p class="text-sm text-muted mt-2"><em>Note: If one of the course languages happens to be English, that translation is not required.</em></p>

              <h3 class="text-xl font-semibold text-accent-2 mt-6 mb-3">Seed Characteristics</h3>
              <ul class="space-y-2">
                <li><strong>Empirically Optimized:</strong> Refined over 16 years of real-world learner data</li>
                <li><strong>Pedagogically Sequenced:</strong> Ordered for optimal learning progression</li>
                <li><strong>High-Frequency Coverage:</strong> Cover the most useful vocabulary and structures</li>
                <li><strong>Universal Concepts:</strong> Language-agnostic foundations that work across all languages</li>
              </ul>

              <h3 class="text-xl font-semibold text-accent-2 mt-6 mb-3">Role in Pipeline (v14)</h3>
              <p>Canonical seeds are the <strong>universal foundation</strong> for all courses:</p>
              <ul class="space-y-1">
                <li><strong>Course Builder:</strong> Translates seeds, extracts LEGOs, and generates practice phrases atomically</li>
                <li><strong>Supabase:</strong> Seeds stored in course_seeds table (database-first architecture)</li>
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
import { getApiUrl } from '@/services/api.js'
import { getCanonicalSeeds } from '@/services/supabase.js'
import { useAuth } from '@/composables/useAuth.js'

const { getAccessToken } = useAuth()

const seeds = ref([])
const loading = ref(true)
const error = ref(null)
const editing = ref(false)
const saving = ref(false)
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
    (seed.seed_id || '').toLowerCase().includes(query) ||
    (seed.source || '').toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.ceil(filteredSeeds.value.length / pageSize.value))

const paginatedSeeds = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredSeeds.value.slice(start, end)
})

async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

async function loadSeeds() {
  try {
    loading.value = true
    error.value = null

    // Read DIRECT from Supabase — surfacing data needs no machine/tunnel up.
    // (Saving an edit goes via the SSi Machine API; see saveSeeds.)
    const list = await getCanonicalSeeds()
    seeds.value = list
    originalSeeds.value = JSON.parse(JSON.stringify(list)) // deep copy for diff/cancel
  } catch (err) {
    error.value = `Error loading canonical seeds: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

// Persist only the seeds whose English source actually changed (admin-gated).
async function saveSeeds() {
  if (saving.value) return
  const origById = new Map(originalSeeds.value.map(s => [s.id, s.source]))
  const changed = seeds.value.filter(s => origById.get(s.id) !== s.source)
  if (changed.length === 0) { editing.value = false; return }
  try {
    saving.value = true
    error.value = null
    let ok = 0
    for (const s of changed) {
      const res = await authedFetch(`/api/admin/canonical-seeds/${encodeURIComponent(s.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ source: s.source }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || `HTTP ${res.status} saving ${s.seed_id}`)
      }
      ok++
    }
    originalSeeds.value = JSON.parse(JSON.stringify(seeds.value))
    editing.value = false
    console.log(`✅ Saved ${ok} canonical seed(s)`)
  } catch (err) {
    error.value = `Error saving seeds: ${err.message}`
    console.error(err)
  } finally {
    saving.value = false
  }
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

<style scoped>
.canonical-seeds-view {
  padding: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

/* Colour and weight come from the shared house look in
   assets/ui-tokens.css — this page sets only its own size. */
.page-title {
  font-size: 1.875rem;
  margin: 0 0 0.5rem 0;
}

.page-subtitle { margin: 0; }

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-edit {
  padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: rgba(16, 185, 129, 0.3);
}

.btn-save {
  padding: 0.5rem 1rem;
  background: #10b981;
  color: var(--canvas);
  font-weight: 600;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover {
  background: #059669;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: var(--surface-3);
  color: var(--ink);
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: var(--surface-2);
}

.content-area {
  max-width: 100%;
}

/* Light-mode legibility overrides — dark mode keeps the brighter emerald untouched.
   #10b981 on the light canvas/white is ~2:1 (fails); --accent-2 (#047857) passes AA. */
:root[data-theme="light"] .btn-edit {
  background: rgba(4, 120, 87, 0.12);
  color: var(--accent-2);
}

:root[data-theme="light"] .btn-edit:hover {
  background: rgba(4, 120, 87, 0.2);
}

:root[data-theme="light"] .btn-save {
  background: var(--accent-2);
  color: #ffffff;
}

:root[data-theme="light"] .btn-save:hover {
  background: #036b4d;
}
</style>
