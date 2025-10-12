<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">SEED Visualizer Demo</h1>
        <p class="text-slate-400">
          Interactive visualization of SEED translations and LEGO boundaries
        </p>
      </div>

      <!-- Course & Translation Selector -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Course Code -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Course Code
            </label>
            <input
              v-model="selectedCourse"
              type="text"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="mkd_for_eng_574seeds"
            />
          </div>

          <!-- Translation UUID -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Translation UUID
            </label>
            <input
              v-model="selectedTranslation"
              type="text"
              class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="e5e82f717bc05ee954a80ad21f216c44"
            />
          </div>
        </div>

        <!-- Quick Select Buttons -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="example in exampleTranslations"
            :key="example.uuid"
            @click="loadExample(example)"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            {{ example.label }}
          </button>
        </div>
      </div>

      <!-- Visualizer Component -->
      <div v-if="selectedCourse && selectedTranslation">
        <SeedVisualizer
          :key="visualizerKey"
          :translation-uuid="selectedTranslation"
          :course-code="selectedCourse"
          :editable="true"
          @boundaries-changed="handleBoundariesChanged"
        />
      </div>

      <!-- No Selection State -->
      <div v-else class="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
        <div class="text-slate-400 mb-4">
          Select a course and translation to visualize
        </div>
        <div class="text-sm text-slate-500">
          Or click one of the example buttons above
        </div>
      </div>

      <!-- Changes Log -->
      <div v-if="changes.length > 0" class="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Boundary Changes Log</h3>
        <div class="space-y-2">
          <div
            v-for="(change, idx) in changes"
            :key="idx"
            class="bg-slate-900/50 border border-slate-700 rounded p-3 text-sm"
          >
            <div class="flex items-center justify-between">
              <div class="text-slate-300">
                Translation: <span class="text-emerald-400 font-mono">{{ change.translationUuid.substring(0, 16) }}...</span>
              </div>
              <div class="text-xs text-slate-500">{{ change.timestamp }}</div>
            </div>
            <div class="mt-2 text-xs text-slate-400">
              Boundaries: [{{ change.boundaries.join(', ') }}]
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Instructions -->
      <div class="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">How to Use</h3>
        <div class="space-y-3 text-sm text-slate-300">
          <p>
            1. Enter a course code and translation UUID, or select an example above
          </p>
          <p>
            2. The visualizer will load the SEED translation and its LEGOs
          </p>
          <p>
            3. Click on the <span class="text-emerald-400 font-bold">|</span> dividers between words to add or remove LEGO boundaries
          </p>
          <p>
            4. Changes will be logged below and emitted via the <code class="bg-slate-900 px-2 py-0.5 rounded">@boundaries-changed</code> event
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SeedVisualizer from '../components/SeedVisualizer.vue'

// State
const selectedCourse = ref('mkd_for_eng_574seeds')
const selectedTranslation = ref('e5e82f717bc05ee954a80ad21f216c44')
const changes = ref([])
const visualizerKey = ref(0)

// Example translations from the Macedonian course
const exampleTranslations = [
  {
    label: 'Example 1: "I know how to practise"',
    uuid: 'e5e82f717bc05ee954a80ad21f216c44',
    course: 'mkd_for_eng_574seeds'
  },
  {
    label: 'Example 2: "I think that..."',
    uuid: '04e26f811c296d7ea0a9ac33f69d906a',
    course: 'mkd_for_eng_574seeds'
  }
]

// Methods
function loadExample(example) {
  selectedCourse.value = example.course
  selectedTranslation.value = example.uuid
  // Force re-render by changing key
  visualizerKey.value++
}

function handleBoundariesChanged(event) {
  const timestamp = new Date().toLocaleTimeString()
  changes.value.unshift({
    ...event,
    timestamp
  })

  // Keep only last 10 changes
  if (changes.value.length > 10) {
    changes.value = changes.value.slice(0, 10)
  }

  console.log('Boundaries changed:', event)
}
</script>

<style scoped>
code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}
</style>
