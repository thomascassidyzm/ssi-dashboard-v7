<template>
  <div class="learned-rules-view min-h-screen bg-slate-900 text-slate-100 p-6">
    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8">
      <router-link :to="`/quality/${courseCode}/evolution`" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
        <span>←</span>
        <span>Back to Prompt Evolution</span>
      </router-link>
      <h1 class="text-3xl font-bold text-emerald-400 mb-2">🧠 Self-Learning Rules</h1>
      <p class="text-slate-400">
        Rules extracted from manual edits - the system learns and improves with every correction
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto text-center py-12">
      <div class="text-emerald-400 text-lg">Loading learned rules...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto">
      <div class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
        {{ error }}
      </div>
    </div>

    <!-- Rules Display -->
    <div v-else class="max-w-7xl mx-auto space-y-6">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div class="text-sm text-slate-400">Total Rules</div>
          <div class="text-3xl font-bold text-emerald-400">{{ summary.total_rules }}</div>
        </div>
        <div class="bg-slate-800 border border-yellow-700 rounded-lg p-4">
          <div class="text-sm text-slate-400">Experimental</div>
          <div class="text-3xl font-bold text-yellow-400">{{ summary.experimental }}</div>
        </div>
        <div class="bg-slate-800 border border-blue-700 rounded-lg p-4">
          <div class="text-sm text-slate-400">Validated</div>
          <div class="text-3xl font-bold text-blue-400">{{ summary.validated }}</div>
        </div>
        <div class="bg-slate-800 border border-emerald-700 rounded-lg p-4">
          <div class="text-sm text-slate-400">Committed</div>
          <div class="text-3xl font-bold text-emerald-400">{{ summary.committed }}</div>
        </div>
      </div>

      <!-- Learning Process Explanation -->
      <div class="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-blue-300 mb-3">📚 How Learning Works</h2>
        <div class="text-sm text-blue-200 space-y-2">
          <p>• Every manual edit is analyzed to extract patterns</p>
          <p>• Rules start as <span class="text-yellow-400 font-semibold">experimental</span> (confidence: 50%)</p>
          <p>• After 5 occurrences, promoted to <span class="text-blue-400 font-semibold">validated</span> (confidence: 80%)</p>
          <p>• After 10 occurrences, <span class="text-emerald-400 font-semibold">committed</span> to prompt DNA (confidence: 95%)</p>
          <p>• Committed rules are automatically injected into Phase 3 prompts for future courses</p>
        </div>
      </div>

      <!-- Rules List -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">
          Learned Rules ({{ rules.length }})
        </h2>

        <div v-if="rules.length === 0" class="text-center py-8 text-slate-400">
          No rules learned yet. Start editing LEGO breakdowns to teach the system!
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(rule, index) in sortedRules"
            :key="index"
            class="bg-slate-700/50 border rounded-lg p-4"
            :class="{
              'border-yellow-600': rule.status === 'experimental',
              'border-blue-600': rule.status === 'validated',
              'border-emerald-600': rule.status === 'committed'
            }"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span
                    class="text-xs font-semibold px-2 py-1 rounded uppercase"
                    :class="{
                      'bg-yellow-900/30 text-yellow-400': rule.status === 'experimental',
                      'bg-blue-900/30 text-blue-400': rule.status === 'validated',
                      'bg-emerald-900/30 text-emerald-400': rule.status === 'committed'
                    }"
                  >
                    {{ rule.status }}
                  </span>
                  <span class="text-xs text-slate-400">
                    Confidence: {{ (rule.confidence * 100).toFixed(0) }}%
                  </span>
                  <span class="text-xs text-slate-400">
                    Occurrences: {{ rule.occurrences }}
                  </span>
                </div>

                <div class="text-slate-100 font-medium mb-1">
                  {{ rule.description }}
                </div>

                <div class="text-xs text-slate-400">
                  <span>First seen: {{ formatDate(rule.first_seen) }}</span>
                  <span class="ml-4">Last seen: {{ formatDate(rule.last_seen) }}</span>
                </div>
              </div>

              <div v-if="rule.status === 'committed'" class="text-emerald-400 text-2xl">
                🎯
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Manual Edits -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">
          Recent Manual Edits (Last 10)
        </h2>

        <div v-if="manual_edits.length === 0" class="text-center py-8 text-slate-400">
          No manual edits recorded yet
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(edit, index) in manual_edits"
            :key="index"
            class="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
          >
            <div class="flex items-center gap-3 mb-2">
              <span class="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                SEED {{ edit.seed_id }}
              </span>
              <span class="text-xs text-slate-400">
                {{ formatDate(edit.timestamp) }}
              </span>
            </div>

            <div class="text-sm text-slate-300 mb-2">
              Changed from {{ edit.original_count }} LEGOs to {{ edit.edited_count }} LEGOs
            </div>

            <div v-if="edit.patterns && edit.patterns.length > 0" class="text-xs text-slate-400">
              Patterns: {{ edit.patterns.map(p => p.type).join(', ') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../../services/api'

const route = useRoute()
const courseCode = ref(route.params.courseCode)

const loading = ref(false)
const error = ref(null)
const rules = ref([])
const manual_edits = ref([])
const summary = ref({
  total_rules: 0,
  experimental: 0,
  validated: 0,
  committed: 0,
  total_edits: 0
})

const sortedRules = computed(() => {
  // Sort by status priority (committed > validated > experimental), then by occurrences
  const statusPriority = { committed: 3, validated: 2, experimental: 1 }
  return [...rules.value].sort((a, b) => {
    const priorityDiff = statusPriority[b.status] - statusPriority[a.status]
    if (priorityDiff !== 0) return priorityDiff
    return b.occurrences - a.occurrences
  })
})

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

async function loadLearnedRules() {
  try {
    loading.value = true
    error.value = null

    const response = await api.default.get(`/api/courses/${courseCode.value}/learned-rules`)

    rules.value = response.data.rules || []
    manual_edits.value = response.data.manual_edits || []
    summary.value = response.data.summary || {}

    console.log('Loaded learned rules:', response.data)
  } catch (err) {
    error.value = `Failed to load learned rules: ${err.message}`
    console.error('Error loading learned rules:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLearnedRules()
})
</script>
