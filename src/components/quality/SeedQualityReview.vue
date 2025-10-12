<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link
          :to="`/quality/${courseCode}`"
          class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block"
        >
          ← Back to Quality Dashboard
        </router-link>

        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">{{ seedId }}</h1>
            <p class="text-slate-400">Attempt {{ currentAttemptIndex + 1 }} of {{ attempts.length }}</p>
          </div>

          <!-- Quality Score -->
          <div class="text-center">
            <div class="text-sm text-slate-400 mb-1">Quality Score</div>
            <div
              class="text-6xl font-bold mb-2"
              :class="getQualityColor(currentAttempt.quality_score)"
            >
              {{ currentAttempt.quality_score.toFixed(1) }}
            </div>
            <div
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="getStatusBadgeClass(seed.status)"
            >
              {{ seed.status }}
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation between attempts -->
      <div v-if="attempts.length > 1" class="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <button
            @click="previousAttempt"
            :disabled="currentAttemptIndex === 0"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-colors"
          >
            ← Previous Attempt
          </button>

          <!-- Timeline -->
          <div class="flex-1 mx-8">
            <div class="relative">
              <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700"></div>
              <div class="relative flex justify-between">
                <button
                  v-for="(attempt, idx) in attempts"
                  :key="idx"
                  @click="currentAttemptIndex = idx"
                  class="relative flex flex-col items-center group"
                >
                  <div
                    class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                    :class="idx === currentAttemptIndex
                      ? 'bg-emerald-600 border-emerald-400 scale-125'
                      : 'bg-slate-800 border-slate-600 hover:border-emerald-500'"
                  >
                    <span class="text-xs font-bold">{{ idx + 1 }}</span>
                  </div>
                  <div class="absolute top-10 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    <div :class="getQualityColor(attempt.quality_score)">
                      {{ attempt.quality_score.toFixed(1) }}
                    </div>
                    <div class="text-slate-500">
                      {{ new Date(attempt.timestamp).toLocaleDateString() }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <button
            @click="nextAttempt"
            :disabled="currentAttemptIndex === attempts.length - 1"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-colors"
          >
            Next Attempt →
          </button>
        </div>
      </div>

      <!-- Quality Breakdown -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div
          v-for="criterion in currentAttempt.quality_breakdown"
          :key="criterion.name"
          class="bg-slate-800 border border-slate-700 rounded-lg p-4"
        >
          <div class="text-sm text-slate-400 mb-2">{{ criterion.name }}</div>
          <div class="flex items-end justify-between">
            <div
              class="text-2xl font-bold"
              :class="getQualityColor(criterion.score)"
            >
              {{ criterion.score.toFixed(1) }}
            </div>
            <div class="text-xs text-slate-500">/10</div>
          </div>
          <div class="mt-2 w-full bg-slate-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="getQualityColor(criterion.score).replace('text-', 'bg-')"
              :style="{ width: `${criterion.score * 10}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Agent's Self-Assessment -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Agent's Self-Assessment</h3>
        <div class="space-y-4">
          <div>
            <div class="text-sm text-slate-400 mb-2">Overall Assessment</div>
            <div class="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              {{ currentAttempt.agent_assessment }}
            </div>
          </div>

          <!-- Concerns -->
          <div v-if="currentAttempt.concerns && currentAttempt.concerns.length > 0">
            <div class="text-sm text-slate-400 mb-2">Identified Concerns</div>
            <div class="space-y-2">
              <div
                v-for="concern in currentAttempt.concerns"
                :key="concern.type"
                class="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <div class="text-yellow-400 text-xl">⚠️</div>
                  <div class="flex-1">
                    <div class="text-yellow-400 font-semibold mb-1">{{ concern.type }}</div>
                    <div class="text-slate-300 text-sm mb-2">{{ concern.description }}</div>
                    <div v-if="concern.suggestion" class="text-slate-400 text-sm italic">
                      Suggestion: {{ concern.suggestion }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Suggestions -->
          <div v-if="currentAttempt.suggestions && currentAttempt.suggestions.length > 0">
            <div class="text-sm text-slate-400 mb-2">Improvement Suggestions</div>
            <ul class="list-disc list-inside space-y-1 text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <li v-for="suggestion in currentAttempt.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Side-by-side Comparison -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-emerald-400">LEGO Extraction Comparison</h3>
          <div v-if="attempts.length > 1" class="flex gap-2">
            <label class="text-sm text-slate-400">Compare with:</label>
            <select
              v-model="compareWithIndex"
              class="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-slate-300"
            >
              <option :value="null">None (current only)</option>
              <option
                v-for="(attempt, idx) in attempts"
                :key="idx"
                :value="idx"
                :disabled="idx === currentAttemptIndex"
              >
                Attempt {{ idx + 1 }} ({{ attempt.quality_score.toFixed(1) }})
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-6" :class="compareWithIndex !== null ? 'md:grid-cols-2' : 'md:grid-cols-1'">
          <!-- Current Attempt -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-medium text-emerald-400">
                Current: Attempt {{ currentAttemptIndex + 1 }}
              </div>
              <div class="text-xs text-slate-400">
                {{ currentAttempt.legos.length }} LEGOs
              </div>
            </div>

            <!-- Original Sentence -->
            <div class="mb-4">
              <div class="text-xs text-slate-500 mb-1">Source</div>
              <div class="text-slate-300 mb-2">{{ seed.source }}</div>
              <div class="text-xs text-slate-500 mb-1">Target</div>
              <div class="text-slate-300">{{ seed.target }}</div>
            </div>

            <!-- LEGO Visualization -->
            <LegoVisualizer
              :sentence="seed.target"
              :legos="currentAttempt.legos"
              :highlight="true"
            />
          </div>

          <!-- Comparison Attempt -->
          <div v-if="compareWithIndex !== null">
            <div class="flex items-center justify-between mb-3">
              <div class="text-sm font-medium text-blue-400">
                Compare: Attempt {{ compareWithIndex + 1 }}
              </div>
              <div class="text-xs text-slate-400">
                {{ attempts[compareWithIndex].legos.length }} LEGOs
              </div>
            </div>

            <!-- Original Sentence (same) -->
            <div class="mb-4">
              <div class="text-xs text-slate-500 mb-1">Source</div>
              <div class="text-slate-300 mb-2">{{ seed.source }}</div>
              <div class="text-xs text-slate-500 mb-1">Target</div>
              <div class="text-slate-300">{{ seed.target }}</div>
            </div>

            <!-- LEGO Visualization -->
            <LegoVisualizer
              :sentence="seed.target"
              :legos="attempts[compareWithIndex].legos"
              :highlight="true"
            />

            <!-- Diff Summary -->
            <div class="mt-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
              <div class="text-xs text-slate-400 mb-2">Changes</div>
              <div class="flex gap-4 text-sm">
                <div>
                  <span class="text-emerald-400">+{{ diffStats.added }}</span> added
                </div>
                <div>
                  <span class="text-red-400">-{{ diffStats.removed }}</span> removed
                </div>
                <div>
                  <span class="text-blue-400">~{{ diffStats.modified }}</span> modified
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LEGO Details Table -->
        <div class="mt-6">
          <div class="text-sm font-medium text-slate-400 mb-3">LEGO Details</div>
          <div class="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-slate-800">
                <tr>
                  <th class="text-left p-3 text-slate-400 font-medium">#</th>
                  <th class="text-left p-3 text-slate-400 font-medium">Text</th>
                  <th class="text-left p-3 text-slate-400 font-medium">Span</th>
                  <th class="text-left p-3 text-slate-400 font-medium">Type</th>
                  <th class="text-left p-3 text-slate-400 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                <tr
                  v-for="(lego, idx) in currentAttempt.legos"
                  :key="idx"
                  class="hover:bg-slate-800/50"
                >
                  <td class="p-3 text-slate-500">{{ idx + 1 }}</td>
                  <td class="p-3 text-emerald-400 font-medium">"{{ lego.text }}"</td>
                  <td class="p-3 text-slate-400 font-mono text-xs">[{{ lego.start }}:{{ lego.end }}]</td>
                  <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs bg-blue-900/50 text-blue-400">
                      {{ lego.type }}
                    </span>
                  </td>
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 bg-slate-700 rounded-full h-2">
                        <div
                          class="h-2 rounded-full bg-emerald-600"
                          :style="{ width: `${lego.confidence * 100}%` }"
                        ></div>
                      </div>
                      <span class="text-xs text-slate-400">{{ (lego.confidence * 100).toFixed(0) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Prompt Version Used -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Extraction Context</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-slate-400 mb-1">Prompt Version</div>
            <div class="text-slate-300 font-mono">{{ currentAttempt.prompt_version }}</div>
          </div>
          <div>
            <div class="text-slate-400 mb-1">Model</div>
            <div class="text-slate-300 font-mono">{{ currentAttempt.model }}</div>
          </div>
          <div>
            <div class="text-slate-400 mb-1">Timestamp</div>
            <div class="text-slate-300">{{ formatTimestamp(currentAttempt.timestamp) }}</div>
          </div>
          <div>
            <div class="text-slate-400 mb-1">Processing Time</div>
            <div class="text-slate-300">{{ currentAttempt.processing_time }}ms</div>
          </div>
        </div>

        <!-- View Prompt Button -->
        <button
          @click="showPrompt = !showPrompt"
          class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
        >
          {{ showPrompt ? 'Hide' : 'View' }} Full Prompt
        </button>

        <!-- Prompt Display -->
        <div v-if="showPrompt" class="mt-4 bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{{ currentAttempt.prompt_text }}</pre>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between gap-4 sticky bottom-8 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-xl">
        <div class="flex gap-3">
          <button
            @click="acceptAttempt"
            class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-lg font-medium transition-colors"
          >
            ✓ Accept This Attempt
          </button>
          <button
            @click="rejectAttempt"
            class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-lg font-medium transition-colors"
          >
            ✗ Reject
          </button>
        </div>

        <div class="flex gap-3">
          <button
            @click="triggerRerun"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-lg font-medium transition-colors"
          >
            ↻ Trigger Re-run
          </button>
          <button
            @click="removeFromCorpus"
            class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-lg font-medium transition-colors"
          >
            🗑 Remove from Corpus
          </button>
        </div>
      </div>

      <!-- Keyboard Shortcuts Hint -->
      <div class="mt-4 text-center text-xs text-slate-500">
        Press <kbd class="px-2 py-1 bg-slate-800 rounded border border-slate-700">a</kbd> to accept,
        <kbd class="px-2 py-1 bg-slate-800 rounded border border-slate-700">r</kbd> to re-run,
        <kbd class="px-2 py-1 bg-slate-800 rounded border border-slate-700">←/→</kbd> to navigate attempts
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import LegoVisualizer from '../LegoVisualizer.vue'

const router = useRouter()
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  seedId: {
    type: String,
    required: true
  }
})

// State
const seed = ref(null)
const attempts = ref([])
const currentAttemptIndex = ref(0)
const compareWithIndex = ref(null)
const showPrompt = ref(false)

// Computed
const currentAttempt = computed(() => attempts.value[currentAttemptIndex.value] || {})

const diffStats = computed(() => {
  if (compareWithIndex.value === null) return { added: 0, removed: 0, modified: 0 }

  const current = currentAttempt.value.legos || []
  const compare = attempts.value[compareWithIndex.value]?.legos || []

  // Simple diff based on text matching
  const currentTexts = new Set(current.map(l => l.text))
  const compareTexts = new Set(compare.map(l => l.text))

  const added = current.filter(l => !compareTexts.has(l.text)).length
  const removed = compare.filter(l => !currentTexts.has(l.text)).length
  const modified = Math.abs(current.length - compare.length - (added - removed))

  return { added, removed, modified }
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

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString()
}

function previousAttempt() {
  if (currentAttemptIndex.value > 0) {
    currentAttemptIndex.value--
  }
}

function nextAttempt() {
  if (currentAttemptIndex.value < attempts.value.length - 1) {
    currentAttemptIndex.value++
  }
}

async function acceptAttempt() {
  const confirmed = confirm(`Accept this extraction for ${props.seedId}?`)
  if (!confirmed) return

  // TODO: API call to accept
  console.log('Accepting attempt:', currentAttemptIndex.value)
  seed.value.status = 'accepted'

  // Navigate back to dashboard
  setTimeout(() => {
    router.push(`/quality/${props.courseCode}`)
  }, 500)
}

async function rejectAttempt() {
  const confirmed = confirm(`Reject this extraction for ${props.seedId}?`)
  if (!confirmed) return

  // TODO: API call to reject
  console.log('Rejecting attempt:', currentAttemptIndex.value)
  seed.value.status = 'rejected'
}

async function triggerRerun() {
  const confirmed = confirm(`Trigger a new extraction attempt for ${props.seedId}?`)
  if (!confirmed) return

  // TODO: API call to trigger re-run
  console.log('Triggering re-run for:', props.seedId)
}

async function removeFromCorpus() {
  const confirmed = confirm(`Remove ${props.seedId} from the corpus entirely? This cannot be undone.`)
  if (!confirmed) return

  // TODO: API call to remove
  console.log('Removing from corpus:', props.seedId)

  // Navigate back to dashboard
  router.push(`/quality/${props.courseCode}`)
}

// Keyboard shortcuts
function handleKeyPress(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  switch (e.key) {
    case 'a':
      acceptAttempt()
      break
    case 'r':
      triggerRerun()
      break
    case 'ArrowLeft':
      previousAttempt()
      break
    case 'ArrowRight':
      nextAttempt()
      break
    case 'Escape':
      router.push(`/quality/${props.courseCode}`)
      break
  }
}

// Lifecycle
onMounted(() => {
  loadSeedData()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})

async function loadSeedData() {
  // TODO: Load real data from API
  // For now, use mock data
  seed.value = generateMockSeed()
  attempts.value = generateMockAttempts()
  currentAttemptIndex.value = attempts.value.length - 1 // Start with latest
}

// Mock data generators
function generateMockSeed() {
  return {
    id: props.seedId,
    source: 'I would like to go to the beach tomorrow',
    target: 'Me gustaría ir a la playa mañana',
    status: 'pending'
  }
}

function generateMockAttempts() {
  return [
    {
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      quality_score: 6.5,
      prompt_version: 'v1.0.0',
      model: 'claude-3-5-sonnet-20241022',
      processing_time: 2340,
      agent_assessment: 'Initial extraction attempt. Identified potential boundary issues between "me gustaría" and "ir a".',
      concerns: [
        {
          type: 'Boundary Overlap',
          description: 'LEGOs 2 and 3 may have overlapping semantic units',
          suggestion: 'Consider splitting "ir a la" differently'
        }
      ],
      suggestions: [
        'Review the split between verb phrase and prepositional phrase',
        'Consider treating "ir a" as a single unit'
      ],
      quality_breakdown: [
        { name: 'Boundaries', score: 6.0 },
        { name: 'Coverage', score: 8.0 },
        { name: 'Semantics', score: 7.0 },
        { name: 'Overlap', score: 5.5 },
        { name: 'Complexity', score: 6.5 }
      ],
      legos: [
        { text: 'Me gustaría', start: 0, end: 10, type: 'verb_phrase', confidence: 0.85 },
        { text: 'ir a', start: 11, end: 15, type: 'verb_infinitive', confidence: 0.75 },
        { text: 'la playa', start: 16, end: 24, type: 'noun_phrase', confidence: 0.90 },
        { text: 'mañana', start: 25, end: 31, type: 'temporal', confidence: 0.95 }
      ],
      prompt_text: 'Extract LEGOs from the following Spanish sentence...\n\n[Full prompt would be here]'
    },
    {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      quality_score: 8.2,
      prompt_version: 'v1.1.0',
      model: 'claude-3-5-sonnet-20241022',
      processing_time: 2120,
      agent_assessment: 'Improved extraction after applying learned rules. Boundary issues resolved.',
      concerns: [],
      suggestions: [
        'Could potentially merge "a la playa" as destination phrase'
      ],
      quality_breakdown: [
        { name: 'Boundaries', score: 8.5 },
        { name: 'Coverage', score: 9.0 },
        { name: 'Semantics', score: 8.0 },
        { name: 'Overlap', score: 8.0 },
        { name: 'Complexity', score: 7.5 }
      ],
      legos: [
        { text: 'Me gustaría', start: 0, end: 10, type: 'verb_phrase', confidence: 0.92 },
        { text: 'ir', start: 11, end: 13, type: 'verb_infinitive', confidence: 0.88 },
        { text: 'a la playa', start: 14, end: 24, type: 'destination', confidence: 0.93 },
        { text: 'mañana', start: 25, end: 31, type: 'temporal', confidence: 0.95 }
      ],
      prompt_text: 'Extract LEGOs from the following Spanish sentence...\n\nLearned rule: Treat destination phrases as single units\n\n[Full prompt would be here]'
    },
    {
      timestamp: new Date().toISOString(),
      quality_score: 9.1,
      prompt_version: 'v1.2.0',
      model: 'claude-3-5-sonnet-20241022',
      processing_time: 1980,
      agent_assessment: 'High-quality extraction with clear semantic boundaries and optimal granularity.',
      concerns: [],
      suggestions: [],
      quality_breakdown: [
        { name: 'Boundaries', score: 9.5 },
        { name: 'Coverage', score: 10.0 },
        { name: 'Semantics', score: 9.0 },
        { name: 'Overlap', score: 9.0 },
        { name: 'Complexity', score: 8.0 }
      ],
      legos: [
        { text: 'Me gustaría', start: 0, end: 10, type: 'conditional_desire', confidence: 0.95 },
        { text: 'ir a la playa', start: 11, end: 24, type: 'action_destination', confidence: 0.94 },
        { text: 'mañana', start: 25, end: 31, type: 'temporal', confidence: 0.96 }
      ],
      prompt_text: 'Extract LEGOs from the following Spanish sentence...\n\nLearned rules:\n- Treat "ir a [location]" as action+destination unit\n- Conditional desires are semantic units\n\n[Full prompt would be here]'
    }
  ]
}
</script>
