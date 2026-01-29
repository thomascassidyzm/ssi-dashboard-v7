<template>
  <div class="phrase-qa flex flex-col h-full bg-slate-900">
    <!-- Header -->
    <div class="qa-header bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="header-left flex items-center gap-4">
          <h1 class="text-xl font-bold text-white">Phrase QA</h1>
          <div v-if="summary" class="stats text-sm text-slate-400">
            {{ summary.phrases.checked.toLocaleString() }} / {{ summary.phrases.total.toLocaleString() }} checked
            <span class="text-slate-500 mx-2">|</span>
            <span :class="summary.flags.errors > 0 ? 'text-red-400' : 'text-slate-400'">
              {{ summary.flags.errors }} errors
            </span>
            <span class="text-slate-500 mx-1">/</span>
            <span :class="summary.flags.warnings > 0 ? 'text-amber-400' : 'text-slate-400'">
              {{ summary.flags.warnings }} warnings
            </span>
          </div>
        </div>

        <div class="header-right flex items-center gap-3">
          <!-- Progress Bar -->
          <div v-if="summary" class="w-48 bg-slate-700 rounded-full h-2">
            <div
              class="bg-emerald-500 h-2 rounded-full transition-all"
              :style="{ width: `${summary.phrases.progress_percent}%` }"
            />
          </div>
          <span v-if="summary" class="text-sm text-slate-400">{{ summary.phrases.progress_percent }}%</span>

          <!-- Filter -->
          <select
            v-model="severityFilter"
            class="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded border-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Flags</option>
            <option value="error">Errors Only</option>
            <option value="warning">Warnings Only</option>
          </select>

          <!-- Run Phrase Check Button -->
          <button
            @click="spawnMonitor"
            :disabled="spawning"
            class="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <svg v-if="spawning" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            {{ spawning ? 'Spawning...' : 'Run Phrase Check' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="text-slate-400">Loading flags...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="flags.length === 0" class="flex flex-col items-center justify-center h-64 text-center">
        <svg class="w-16 h-16 text-emerald-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h2 class="text-xl text-white mb-2">No Flags Found</h2>
        <p class="text-slate-400 max-w-md">
          {{ summary?.phrases.checked === 0
            ? 'No phrases have been checked yet. Click "Run Phrase Check" to start the QA monitor.'
            : 'All checked phrases passed QA. Looking good!' }}
        </p>
      </div>

      <!-- Flags List -->
      <div v-else class="space-y-4">
        <div
          v-for="flag in flags"
          :key="flag.id"
          class="flag-card bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
        >
          <!-- Flag Header -->
          <div class="flex items-center justify-between px-4 py-3 bg-slate-750 border-b border-slate-700">
            <div class="flex items-center gap-3">
              <!-- Severity Badge -->
              <span
                class="px-2 py-0.5 text-xs font-medium rounded"
                :class="{
                  'bg-red-500/20 text-red-400': flag.severity === 'error',
                  'bg-amber-500/20 text-amber-400': flag.severity === 'warning',
                  'bg-blue-500/20 text-blue-400': flag.severity === 'info'
                }"
              >
                {{ flag.severity }}
              </span>
              <!-- Check Type -->
              <span class="text-sm text-slate-400">{{ flag.check_type }}</span>
              <!-- Seed Number -->
              <span class="text-xs text-slate-500">S{{ String(flag.seed_number).padStart(4, '0') }}</span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                @click="dismissFlag(flag)"
                class="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                title="Dismiss (false positive)"
              >
                Dismiss
              </button>
              <button
                @click="deletePhrase(flag)"
                class="px-3 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                title="Delete phrase"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Phrase Content -->
          <div v-if="flag.phrase" class="p-4">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div class="text-xs text-slate-500 mb-1">Known (English)</div>
                <div class="text-white">{{ flag.phrase.known_text }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">Target</div>
                <div class="text-white">{{ flag.phrase.target_text }}</div>
              </div>
            </div>

            <!-- Issue Description -->
            <div class="mt-3 p-3 bg-slate-900 rounded border border-slate-700">
              <div class="text-xs text-slate-500 mb-1">Issue</div>
              <div class="text-sm text-slate-300">{{ flag.issue }}</div>
            </div>

            <!-- Suggestion if available -->
            <div v-if="flag.details?.suggestion" class="mt-2 p-3 bg-emerald-900/20 rounded border border-emerald-700/30">
              <div class="text-xs text-emerald-400 mb-1">Suggestion</div>
              <div class="text-sm text-emerald-300">{{ flag.details.suggestion }}</div>
            </div>
          </div>

          <!-- No phrase data -->
          <div v-else class="p-4 text-slate-400 text-sm">
            {{ flag.issue }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const API_BASE = import.meta.env.VITE_COURSE_BUILDER_URL || 'http://localhost:3471'

const loading = ref(true)
const spawning = ref(false)
const summary = ref(null)
const flags = ref([])
const severityFilter = ref('')

// Fetch QA summary
async function fetchSummary() {
  try {
    const res = await fetch(`${API_BASE}/api/qa/summary/${props.courseCode}`)
    summary.value = await res.json()
  } catch (err) {
    console.error('Failed to fetch QA summary:', err)
  }
}

// Fetch flagged phrases
async function fetchFlags() {
  loading.value = true
  try {
    const url = new URL(`${API_BASE}/api/qa/flagged-phrases/${props.courseCode}`)
    if (severityFilter.value) {
      url.searchParams.set('severity', severityFilter.value)
    }
    const res = await fetch(url)
    const data = await res.json()
    flags.value = data.flags || []
  } catch (err) {
    console.error('Failed to fetch flags:', err)
  } finally {
    loading.value = false
  }
}

// Spawn Haiku monitor
async function spawnMonitor() {
  spawning.value = true
  try {
    await fetch(`${API_BASE}/api/qa/spawn-monitor/${props.courseCode}`, {
      method: 'POST'
    })
    // Refresh after a short delay
    setTimeout(() => {
      fetchSummary()
      fetchFlags()
    }, 2000)
  } catch (err) {
    console.error('Failed to spawn monitor:', err)
  } finally {
    spawning.value = false
  }
}

// Dismiss flag as false positive
async function dismissFlag(flag) {
  try {
    await fetch(`${API_BASE}/api/qa/flag/${flag.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'false_positive' })
    })
    // Remove from list
    flags.value = flags.value.filter(f => f.id !== flag.id)
    fetchSummary()
  } catch (err) {
    console.error('Failed to dismiss flag:', err)
  }
}

// Delete the flagged phrase
async function deletePhrase(flag) {
  if (!flag.phrase_id) return
  if (!confirm(`Delete this phrase?\n\n"${flag.phrase?.known_text}"\n→ "${flag.phrase?.target_text}"`)) return

  try {
    await fetch(`${API_BASE}/api/qa/phrase/${flag.phrase_id}`, {
      method: 'DELETE'
    })
    // Remove from list
    flags.value = flags.value.filter(f => f.id !== flag.id)
    fetchSummary()
  } catch (err) {
    console.error('Failed to delete phrase:', err)
  }
}

// Watch for filter changes
watch(severityFilter, () => {
  fetchFlags()
})

// Watch for course changes
watch(() => props.courseCode, () => {
  fetchSummary()
  fetchFlags()
})

onMounted(() => {
  fetchSummary()
  fetchFlags()
})
</script>

<style scoped>
.bg-slate-750 {
  background-color: rgb(41 52 71);
}
</style>
