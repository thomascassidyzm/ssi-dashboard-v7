<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">Recording Studio</h1>
        <p class="text-slate-400">Record audio samples for phrases that need human voice</p>
      </div>

      <!-- Course Selector -->
      <div class="mb-8">
        <label class="block text-sm text-slate-400 mb-2">Select Course</label>
        <select
          v-model="selectedCourse"
          class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100"
        >
          <option value="">Choose a course...</option>
          <option v-for="course in availableCourses" :key="course" :value="course">
            {{ course }}
          </option>
        </select>
      </div>

      <!-- Phrase to Record -->
      <div v-if="selectedCourse && currentPhrase" class="space-y-6">
        <!-- Phrase Display -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <span class="text-xs text-slate-500 uppercase tracking-wide">
                {{ currentPhrase.role }} • {{ currentPhrase.language }}
              </span>
              <h2 class="text-2xl font-bold text-emerald-400 mt-1">
                {{ currentPhrase.text }}
              </h2>
            </div>
            <div class="text-right">
              <span class="text-slate-500 text-sm">
                {{ currentIndex + 1 }} of {{ phrases.length }}
              </span>
            </div>
          </div>

          <!-- Reference Audio (if exists) -->
          <div v-if="currentPhrase.ttsUrl" class="mb-4">
            <p class="text-xs text-slate-500 mb-2">Reference (TTS):</p>
            <audio :src="currentPhrase.ttsUrl" controls class="w-full h-10"></audio>
          </div>
        </div>

        <!-- Recorder -->
        <AudioRecorder
          ref="recorder"
          @recorded="onRecorded"
          @cleared="onCleared"
        />

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <button
            @click="prevPhrase"
            :disabled="currentIndex === 0"
            class="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            ← Previous
          </button>

          <button
            @click="saveAndNext"
            :disabled="!hasRecording || saving"
            class="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            <span v-if="saving">Saving...</span>
            <span v-else>Save & Next →</span>
          </button>

          <button
            @click="skipPhrase"
            class="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Skip →
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="mt-8">
          <div class="flex justify-between text-sm text-slate-500 mb-2">
            <span>Progress</span>
            <span>{{ recordedCount }} / {{ phrases.length }} recorded</span>
          </div>
          <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 transition-all duration-300"
              :style="{ width: `${(recordedCount / phrases.length) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- No Course Selected -->
      <div v-else-if="!selectedCourse" class="text-center py-12 text-slate-500">
        Select a course to begin recording
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="text-center py-12 text-slate-500">
        Loading phrases...
      </div>

      <!-- All Done -->
      <div v-else-if="phrases.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🎉</div>
        <p class="text-emerald-400 text-xl">All phrases recorded!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import AudioRecorder from '../components/AudioRecorder.vue'

const { user, canAccessCourse } = useAuth()

// State
const selectedCourse = ref('')
const phrases = ref([])
const currentIndex = ref(0)
const loading = ref(false)
const saving = ref(false)
const hasRecording = ref(false)
const recordedPhrases = ref(new Set())
const recorder = ref(null)

// Computed
const availableCourses = computed(() => {
  // In real implementation, filter by user.courses
  if (user.value?.courses === '*') {
    return ['mkd_for_cat', 'wel_for_eng', 'spa_for_eng']
  }
  return user.value?.courses || []
})

const currentPhrase = computed(() => phrases.value[currentIndex.value])
const recordedCount = computed(() => recordedPhrases.value.size)

// Watch course selection
watch(selectedCourse, async (course) => {
  if (course) {
    await loadPhrases(course)
  }
})

async function loadPhrases(courseCode) {
  loading.value = true
  phrases.value = []
  currentIndex.value = 0

  try {
    // TODO: Fetch phrases that need recording from API
    // For now, mock data
    phrases.value = [
      { id: '1', text: 'Сакам', language: 'mkd', role: 'target1', cadence: 'normal' },
      { id: '2', text: 'Јас сакам', language: 'mkd', role: 'target1', cadence: 'normal' },
      { id: '3', text: 'Ти сакаш', language: 'mkd', role: 'target1', cadence: 'normal' },
    ]
  } catch (err) {
    console.error('Failed to load phrases:', err)
  } finally {
    loading.value = false
  }
}

function onRecorded(blob) {
  hasRecording.value = true
}

function onCleared() {
  hasRecording.value = false
}

async function saveAndNext() {
  if (!recorder.value?.hasRecording()) return

  saving.value = true

  try {
    const blob = recorder.value.getRecording()
    const phrase = currentPhrase.value

    // Create form data
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('metadata', JSON.stringify({
      text: phrase.text,
      language: phrase.language,
      role: phrase.role,
      cadence: phrase.cadence,
      courseCode: selectedCourse.value,
      voiceId: user.value?.voice_id || `human_${user.value?.email?.split('@')[0]}_${phrase.language}`
    }))

    // Upload to API
    const response = await fetch('/api/audio/record', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error('Upload failed')

    recordedPhrases.value.add(phrase.id)
    nextPhrase()
  } catch (err) {
    console.error('Save failed:', err)
  } finally {
    saving.value = false
  }
}

function nextPhrase() {
  hasRecording.value = false
  if (currentIndex.value < phrases.length - 1) {
    currentIndex.value++
  }
}

function prevPhrase() {
  hasRecording.value = false
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function skipPhrase() {
  nextPhrase()
}
</script>
