<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Quality Review Dashboard</h1>
            <p class="text-slate-400">{{ courseCode }} - {{ totalSeeds }} SEEDs</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="exportReport('csv')"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Export CSV
            </button>
            <button
              @click="exportReport('pdf')"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Export PDF
            </button>
            <button
              @click="refreshData"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              :disabled="loading"
            >
              {{ loading ? 'Refreshing...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- Course Health Stats -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Average Quality</div>
            <div class="text-3xl font-bold" :class="getQualityColor(stats.avgQuality)">
              {{ stats.avgQuality.toFixed(1) }}
            </div>
            <div class="text-xs text-slate-500 mt-1">out of 10.0</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Flagged SEEDs</div>
            <div class="text-3xl font-bold text-yellow-400">{{ stats.flaggedCount }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ stats.flaggedPercent }}% need review</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Accepted</div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.acceptedCount }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ stats.acceptedPercent }}% approved</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Avg Attempts</div>
            <div class="text-3xl font-bold text-blue-400">{{ stats.avgAttempts.toFixed(1) }}</div>
            <div class="text-xs text-slate-500 mt-1">per SEED</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Ready for Review</div>
            <div class="text-3xl font-bold text-purple-400">{{ stats.pendingReview }}</div>
            <div class="text-xs text-slate-500 mt-1">awaiting action</div>
          </div>
        </div>
      </div>

      <!-- Quality Distribution Chart -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Quality Score Distribution</h3>
        <div class="flex items-end gap-2 h-48">
          <div
            v-for="(bucket, idx) in qualityDistribution"
            :key="idx"
            class="flex-1 relative group cursor-pointer"
            @click="filterByQualityRange(bucket.min, bucket.max)"
          >
            <div
              class="absolute bottom-0 w-full rounded-t transition-all"
              :class="bucket.color"
              :style="{ height: `${bucket.percentage}%` }"
            >
              <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
            </div>
            <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-slate-400">
              {{ bucket.label }}
            </div>
            <div class="absolute top-0 left-0 right-0 text-center text-xs font-semibold text-slate-300 -mt-5 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ bucket.count }}
            </div>
          </div>
        </div>
        <div class="text-xs text-slate-500 mt-8 text-center">Click a bar to filter by quality range</div>
      </div>

      <!-- Filters and Controls -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-emerald-400">Filters & Actions</h3>
          <button
            @click="clearFilters"
            class="text-sm text-slate-400 hover:text-slate-300"
          >
            Clear All Filters
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <!-- Search -->
          <div>
            <label class="block text-sm text-slate-400 mb-2">Search</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="SEED ID, content..."
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm text-slate-400 mb-2">Status</label>
            <select
              v-model="filters.status"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="flagged">Flagged</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <!-- Quality Range -->
          <div>
            <label class="block text-sm text-slate-400 mb-2">Quality Score</label>
            <select
              v-model="filters.qualityRange"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Scores</option>
              <option value="9-10">Excellent (9.0-10.0)</option>
              <option value="8-9">Good (8.0-8.9)</option>
              <option value="7-8">Fair (7.0-7.9)</option>
              <option value="0-7">Poor (&lt; 7.0)</option>
            </select>
          </div>

          <!-- Concerns Filter -->
          <div>
            <label class="block text-sm text-slate-400 mb-2">Concerns</label>
            <select
              v-model="filters.concern"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Concerns</option>
              <option value="boundary">Boundary Issues</option>
              <option value="overlap">Overlapping LEGOs</option>
              <option value="missing">Missing LEGOs</option>
              <option value="semantic">Semantic Mismatch</option>
              <option value="complex">Too Complex</option>
            </select>
          </div>
        </div>

        <!-- Sort Controls -->
        <div class="flex items-center gap-4">
          <label class="text-sm text-slate-400">Sort by:</label>
          <button
            v-for="sort in sortOptions"
            :key="sort.value"
            @click="setSortBy(sort.value)"
            class="px-3 py-1 rounded text-sm transition-colors"
            :class="filters.sortBy === sort.value
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
          >
            {{ sort.label }}
            <span v-if="filters.sortBy === sort.value" class="ml-1">
              {{ filters.sortDesc ? '↓' : '↑' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                v-model="selectAll"
                @change="toggleSelectAll"
                class="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
              />
              Select All ({{ selectedSeeds.length }} selected)
            </label>
          </div>
          <div class="flex gap-2">
            <button
              @click="bulkAction('accept')"
              :disabled="selectedSeeds.length === 0"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
            >
              Accept Selected
            </button>
            <button
              @click="bulkAction('rerun')"
              :disabled="selectedSeeds.length === 0"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
            >
              Re-run Selected
            </button>
            <button
              @click="bulkAction('remove')"
              :disabled="selectedSeeds.length === 0"
              class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
            >
              Remove Selected
            </button>
          </div>
        </div>
      </div>

      <!-- SEED List -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg">
        <div class="p-4 border-b border-slate-700">
          <h3 class="text-lg font-semibold text-emerald-400">
            SEEDs ({{ filteredSeeds.length }} of {{ totalSeeds }})
          </h3>
        </div>

        <div class="divide-y divide-slate-700">
          <div
            v-for="seed in paginatedSeeds"
            :key="seed.id"
            class="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
            @click="viewSeedDetail(seed)"
          >
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <input
                type="checkbox"
                v-model="selectedSeeds"
                :value="seed.id"
                @click.stop
                class="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500 mt-1"
              />

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-1">
                      <span class="text-slate-400 font-mono text-sm">{{ seed.id }}</span>
                      <span
                        class="px-2 py-1 rounded text-xs font-medium"
                        :class="getStatusBadgeClass(seed.status)"
                      >
                        {{ seed.status }}
                      </span>
                      <span
                        v-if="seed.concerns && seed.concerns.length > 0"
                        class="px-2 py-1 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-600/50"
                      >
                        {{ seed.concerns.length }} concern{{ seed.concerns.length > 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="text-slate-300 mb-1">{{ seed.source }}</div>
                    <div class="text-slate-500 text-sm">{{ seed.target }}</div>
                  </div>

                  <!-- Quality Score -->
                  <div class="text-right ml-4">
                    <div
                      class="text-3xl font-bold mb-1"
                      :class="getQualityColor(seed.quality_score)"
                    >
                      {{ seed.quality_score.toFixed(1) }}
                    </div>
                    <div class="text-xs text-slate-400">{{ seed.attempt_count }} attempt{{ seed.attempt_count > 1 ? 's' : '' }}</div>
                  </div>
                </div>

                <!-- Concerns -->
                <div v-if="seed.concerns && seed.concerns.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="concern in seed.concerns"
                    :key="concern"
                    class="px-2 py-1 rounded text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-600/30"
                  >
                    {{ concern }}
                  </span>
                </div>

                <!-- Agent's Assessment Preview -->
                <div v-if="seed.agent_assessment" class="mt-2 text-sm text-slate-400 italic">
                  "{{ truncate(seed.agent_assessment, 120) }}"
                </div>

                <!-- Quick Actions -->
                <div class="flex gap-2 mt-3">
                  <button
                    @click.stop="quickAccept(seed.id)"
                    class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    @click.stop="quickRerun(seed.id)"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors"
                  >
                    Re-run
                  </button>
                  <button
                    @click.stop="viewSeedDetail(seed)"
                    class="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                  >
                    Review Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredSeeds.length === 0" class="p-12 text-center">
            <div class="text-slate-400 mb-2">No SEEDs match your filters</div>
            <button
              @click="clearFilters"
              class="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              Clear filters
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredSeeds.length > 0" class="p-4 border-t border-slate-700 flex items-center justify-between">
          <div class="text-sm text-slate-400">
            Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredSeeds.length) }} of {{ filteredSeeds.length }}
          </div>
          <div class="flex gap-2">
            <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded text-sm transition-colors"
            >
              Previous
            </button>
            <div class="flex gap-1">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="currentPage = page"
                class="px-3 py-1 rounded text-sm transition-colors"
                :class="currentPage === page
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div
      v-if="showShortcutsHelp"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      @click="showShortcutsHelp = false"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md" @click.stop>
        <h3 class="text-xl font-bold text-emerald-400 mb-4">Keyboard Shortcuts</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">j/k</kbd>
            <span class="text-slate-300">Navigate up/down</span>
          </div>
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">Enter</kbd>
            <span class="text-slate-300">View details</span>
          </div>
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">a</kbd>
            <span class="text-slate-300">Accept current</span>
          </div>
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">r</kbd>
            <span class="text-slate-300">Re-run current</span>
          </div>
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">x</kbd>
            <span class="text-slate-300">Toggle selection</span>
          </div>
          <div class="flex justify-between">
            <kbd class="px-2 py-1 bg-slate-900 rounded border border-slate-600">?</kbd>
            <span class="text-slate-300">Show this help</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

// State
const loading = ref(false)
const seeds = ref([])
const selectedSeeds = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const showShortcutsHelp = ref(false)
const focusedIndex = ref(0)

// Filters
const filters = ref({
  search: '',
  status: '',
  qualityRange: '',
  concern: '',
  sortBy: 'quality',
  sortDesc: true
})

const sortOptions = [
  { value: 'quality', label: 'Quality Score' },
  { value: 'attempts', label: 'Attempts' },
  { value: 'id', label: 'SEED ID' },
  { value: 'status', label: 'Status' }
]

// Computed
const totalSeeds = computed(() => seeds.value.length)

const stats = computed(() => {
  const total = seeds.value.length
  if (total === 0) return {
    avgQuality: 0,
    flaggedCount: 0,
    flaggedPercent: 0,
    acceptedCount: 0,
    acceptedPercent: 0,
    avgAttempts: 0,
    pendingReview: 0
  }

  const totalQuality = seeds.value.reduce((sum, s) => sum + s.quality_score, 0)
  const flagged = seeds.value.filter(s => s.status === 'flagged')
  const accepted = seeds.value.filter(s => s.status === 'accepted')
  const pending = seeds.value.filter(s => s.status === 'pending')
  const totalAttempts = seeds.value.reduce((sum, s) => sum + s.attempt_count, 0)

  return {
    avgQuality: totalQuality / total,
    flaggedCount: flagged.length,
    flaggedPercent: ((flagged.length / total) * 100).toFixed(1),
    acceptedCount: accepted.length,
    acceptedPercent: ((accepted.length / total) * 100).toFixed(1),
    avgAttempts: totalAttempts / total,
    pendingReview: pending.length
  }
})

const qualityDistribution = computed(() => {
  const buckets = [
    { min: 0, max: 5, label: '0-5', count: 0, color: 'bg-red-600', percentage: 0 },
    { min: 5, max: 6, label: '5-6', count: 0, color: 'bg-orange-600', percentage: 0 },
    { min: 6, max: 7, label: '6-7', count: 0, color: 'bg-yellow-600', percentage: 0 },
    { min: 7, max: 8, label: '7-8', count: 0, color: 'bg-lime-600', percentage: 0 },
    { min: 8, max: 9, label: '8-9', count: 0, color: 'bg-emerald-600', percentage: 0 },
    { min: 9, max: 10.1, label: '9-10', count: 0, color: 'bg-green-600', percentage: 0 }
  ]

  seeds.value.forEach(seed => {
    const bucket = buckets.find(b => seed.quality_score >= b.min && seed.quality_score < b.max)
    if (bucket) bucket.count++
  })

  const maxCount = Math.max(...buckets.map(b => b.count), 1)
  buckets.forEach(b => {
    b.percentage = (b.count / maxCount) * 100
  })

  return buckets
})

const filteredSeeds = computed(() => {
  let result = [...seeds.value]

  // Search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(s =>
      s.id.toLowerCase().includes(search) ||
      s.source.toLowerCase().includes(search) ||
      s.target.toLowerCase().includes(search)
    )
  }

  // Status filter
  if (filters.value.status) {
    result = result.filter(s => s.status === filters.value.status)
  }

  // Quality range filter
  if (filters.value.qualityRange) {
    const [min, max] = filters.value.qualityRange.split('-').map(Number)
    result = result.filter(s => s.quality_score >= min && s.quality_score < max)
  }

  // Concern filter
  if (filters.value.concern) {
    result = result.filter(s => s.concerns && s.concerns.includes(filters.value.concern))
  }

  // Sorting
  result.sort((a, b) => {
    let aVal, bVal
    switch (filters.value.sortBy) {
      case 'quality':
        aVal = a.quality_score
        bVal = b.quality_score
        break
      case 'attempts':
        aVal = a.attempt_count
        bVal = b.attempt_count
        break
      case 'id':
        aVal = a.id
        bVal = b.id
        break
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      default:
        return 0
    }

    if (aVal < bVal) return filters.value.sortDesc ? 1 : -1
    if (aVal > bVal) return filters.value.sortDesc ? -1 : 1
    return 0
  })

  return result
})

const totalPages = computed(() => Math.ceil(filteredSeeds.value.length / pageSize.value))

const paginatedSeeds = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredSeeds.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// Methods
function getQualityColor(score) {
  if (score >= 9) return 'text-emerald-400'
  if (score >= 8) return 'text-lime-400'
  if (score >= 7) return 'text-yellow-400'
  if (score >= 6) return 'text-orange-400'
  return 'text-red-400'
}

function getStatusBadgeClass(status) {
  const classes = {
    pending: 'bg-blue-900/50 text-blue-400 border border-blue-600/50',
    flagged: 'bg-yellow-900/50 text-yellow-400 border border-yellow-600/50',
    accepted: 'bg-emerald-900/50 text-emerald-400 border border-emerald-600/50',
    rejected: 'bg-red-900/50 text-red-400 border border-red-600/50'
  }
  return classes[status] || 'bg-slate-700 text-slate-300'
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function setSortBy(value) {
  if (filters.value.sortBy === value) {
    filters.value.sortDesc = !filters.value.sortDesc
  } else {
    filters.value.sortBy = value
    filters.value.sortDesc = true
  }
}

function filterByQualityRange(min, max) {
  filters.value.qualityRange = `${min}-${max}`
}

function clearFilters() {
  filters.value = {
    search: '',
    status: '',
    qualityRange: '',
    concern: '',
    sortBy: 'quality',
    sortDesc: true
  }
  currentPage.value = 1
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedSeeds.value = filteredSeeds.value.map(s => s.id)
  } else {
    selectedSeeds.value = []
  }
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

async function refreshData() {
  loading.value = true
  try {
    // TODO: Fetch real data from API
    await new Promise(resolve => setTimeout(resolve, 1000))
  } finally {
    loading.value = false
  }
}

function viewSeedDetail(seed) {
  // Emit event or use router to navigate to detail view
  // For now, we'll use a modal (SeedQualityReview component)
  router.push(`/quality/${props.courseCode}/${seed.id}`)
}

async function quickAccept(seedId) {
  // TODO: API call to accept seed
  console.log('Accepting seed:', seedId)
  const seed = seeds.value.find(s => s.id === seedId)
  if (seed) seed.status = 'accepted'
}

async function quickRerun(seedId) {
  // TODO: API call to trigger re-run
  console.log('Re-running seed:', seedId)
}

async function bulkAction(action) {
  if (selectedSeeds.value.length === 0) return

  const confirmed = confirm(`${action.toUpperCase()} ${selectedSeeds.value.length} selected SEEDs?`)
  if (!confirmed) return

  // TODO: API call for bulk action
  console.log(`Bulk ${action}:`, selectedSeeds.value)

  if (action === 'accept') {
    selectedSeeds.value.forEach(seedId => {
      const seed = seeds.value.find(s => s.id === seedId)
      if (seed) seed.status = 'accepted'
    })
  }

  selectedSeeds.value = []
  selectAll.value = false
}

function exportReport(format) {
  // TODO: Implement export functionality
  console.log(`Exporting report as ${format}`)
}

// Keyboard shortcuts
function handleKeyPress(e) {
  // Ignore if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  switch (e.key) {
    case 'j':
      focusedIndex.value = Math.min(focusedIndex.value + 1, paginatedSeeds.value.length - 1)
      break
    case 'k':
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      break
    case 'Enter':
      if (paginatedSeeds.value[focusedIndex.value]) {
        viewSeedDetail(paginatedSeeds.value[focusedIndex.value])
      }
      break
    case 'a':
      if (paginatedSeeds.value[focusedIndex.value]) {
        quickAccept(paginatedSeeds.value[focusedIndex.value].id)
      }
      break
    case 'r':
      if (paginatedSeeds.value[focusedIndex.value]) {
        quickRerun(paginatedSeeds.value[focusedIndex.value].id)
      }
      break
    case 'x':
      if (paginatedSeeds.value[focusedIndex.value]) {
        const seedId = paginatedSeeds.value[focusedIndex.value].id
        const idx = selectedSeeds.value.indexOf(seedId)
        if (idx > -1) {
          selectedSeeds.value.splice(idx, 1)
        } else {
          selectedSeeds.value.push(seedId)
        }
      }
      break
    case '?':
      showShortcutsHelp.value = !showShortcutsHelp.value
      break
  }
}

// Lifecycle
onMounted(() => {
  // Load initial data
  // For now, use mock data
  seeds.value = generateMockSeeds()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})

// Mock data generator
function generateMockSeeds() {
  const mockSeeds = []
  const concerns = ['boundary', 'overlap', 'missing', 'semantic', 'complex']
  const statuses = ['pending', 'flagged', 'accepted', 'rejected']

  for (let i = 1; i <= 668; i++) {
    const quality = Math.random() * 10
    const hasConcerns = quality < 7.5 || Math.random() > 0.7

    mockSeeds.push({
      id: `SEED_${String(i).padStart(4, '0')}`,
      source: `Example English sentence ${i} that needs translation`,
      target: `Ejemplo de oración en español ${i}`,
      quality_score: quality,
      attempt_count: Math.floor(Math.random() * 5) + 1,
      status: quality >= 8 ? 'accepted' : (quality < 6 ? 'flagged' : statuses[Math.floor(Math.random() * statuses.length)]),
      concerns: hasConcerns ? [concerns[Math.floor(Math.random() * concerns.length)]] : [],
      agent_assessment: hasConcerns
        ? 'Identified potential boundary overlap between LEGOs 3 and 4. Recommend manual review.'
        : 'Extraction successful with high confidence. All boundaries align with semantic units.'
    })
  }

  return mockSeeds
}
</script>
