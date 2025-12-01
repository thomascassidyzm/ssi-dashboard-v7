<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Recording Studio</h1>
            <p class="text-slate-400">Record audio samples for phrases that need human voice</p>
          </div>
        </div>
      </div>

      <!-- Course Selection View (Card Grid) -->
      <template v-if="!selectedCourse">
        <!-- Search Bar -->
        <div class="mb-6">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search courses..."
            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <!-- Loading State -->
        <div v-if="loadingCourses" class="text-center py-12">
          <div class="text-slate-400">Loading courses...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredCourses.length === 0" class="text-center py-12">
          <div v-if="searchQuery" class="text-slate-400 mb-4">
            No courses matching "{{ searchQuery }}"
          </div>
          <div v-else class="text-slate-400 mb-4">No courses available for recording</div>
        </div>

        <!-- Courses Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="course in filteredCourses"
            :key="course.course_code"
            @click="selectCourse(course.course_code)"
            class="bg-slate-800 rounded-lg p-6 transition-all hover:-translate-y-0.5 cursor-pointer border border-slate-700 hover:border-emerald-500/50"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-xl font-semibold text-emerald-400">
                  {{ course.course_code }}
                </h3>
                <p class="text-xs text-slate-500 mb-1">
                  {{ getFullCourseName(course.course_code) }}
                </p>
              </div>
              <span
                class="px-3 py-1 rounded-full text-xs font-medium"
                :class="getRecordingStatusClass(course)"
              >
                {{ getRecordingStatus(course) }}
              </span>
            </div>

            <!-- Recording Stats -->
            <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div class="bg-slate-900/50 rounded p-3">
                <div class="text-slate-400 text-xs mb-1">NEEDS RECORDING</div>
                <div class="text-amber-400 font-semibold">{{ course.needs_recording || 0 }}</div>
              </div>
              <div class="bg-slate-900/50 rounded p-3">
                <div class="text-slate-400 text-xs mb-1">RECORDED</div>
                <div class="text-emerald-400 font-semibold">{{ course.recorded || 0 }}</div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 transition-all duration-300"
                  :style="{ width: `${getRecordingProgress(course)}%` }"
                ></div>
              </div>
              <div class="text-xs text-slate-500 mt-1 text-right">
                {{ getRecordingProgress(course) }}% complete
              </div>
            </div>

            <!-- Action -->
            <div class="flex gap-2">
              <button
                class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-center px-4 py-2 rounded transition-colors text-sm font-medium"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Recording View (when course is selected) -->
      <template v-else>
        <!-- Back to Courses -->
        <button
          @click="selectedCourse = ''"
          class="text-emerald-400 hover:text-emerald-300 mb-6 inline-flex items-center gap-2"
        >
          ← Back to Course Selection
        </button>

        <!-- Course Info Header -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-emerald-400">{{ selectedCourse }}</h2>
              <p class="text-slate-400">{{ getFullCourseName(selectedCourse) }}</p>
            </div>
            <div class="text-right">
              <span class="text-slate-500 text-sm">
                {{ recordedCount }} / {{ phrases.length }} recorded
              </span>
            </div>
          </div>
        </div>

        <!-- Phrase to Record -->
        <div v-if="currentPhrase" class="space-y-6">
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

        <!-- Loading -->
        <div v-else-if="loading" class="text-center py-12 text-slate-500">
          Loading phrases...
        </div>

        <!-- All Done -->
        <div v-else-if="phrases.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">🎉</div>
          <p class="text-emerald-400 text-xl">All phrases recorded!</p>
          <button
            @click="selectedCourse = ''"
            class="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Back to Course Selection
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AudioRecorder from '../components/AudioRecorder.vue'
import api from '../services/api'

// Language name mapping
const languageNames = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'cmn': 'Chinese',
  'gle': 'Irish',
  'cym': 'Welsh',
  'wel': 'Welsh',
  'ita': 'Italian',
  'deu': 'German',
  'por': 'Portuguese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'rus': 'Russian',
  'tur': 'Turkish',
  'mkd': 'Macedonian',
  'cat': 'Catalan'
}

// State - Course Selection
const courses = ref([])
const loadingCourses = ref(true)
const searchQuery = ref('')
const selectedCourse = ref('')

// State - Recording
const phrases = ref([])
const currentIndex = ref(0)
const loading = ref(false)
const saving = ref(false)
const hasRecording = ref(false)
const recordedPhrases = ref(new Set())
const recorder = ref(null)

// Computed
const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value

  const query = searchQuery.value.toLowerCase()
  return courses.value.filter(course => {
    if (course.course_code.toLowerCase().includes(query)) return true
    const fullName = getFullCourseName(course.course_code).toLowerCase()
    if (fullName.includes(query)) return true
    return false
  })
})

const currentPhrase = computed(() => phrases.value[currentIndex.value])
const recordedCount = computed(() => recordedPhrases.value.size)

// Load courses on mount
onMounted(async () => {
  await loadCourses()
})

// Watch course selection
watch(selectedCourse, async (course) => {
  if (course) {
    await loadPhrases(course)
  }
})

async function loadCourses() {
  loadingCourses.value = true

  try {
    const response = await api.course.list()
    // Add recording stats to each course (mock for now)
    courses.value = (response.courses || []).map(course => ({
      ...course,
      needs_recording: Math.floor(Math.random() * 50) + 10, // Mock data
      recorded: Math.floor(Math.random() * 30) // Mock data
    }))
  } catch (err) {
    console.error('Failed to load courses:', err)
    courses.value = []
  } finally {
    loadingCourses.value = false
  }
}

function getFullCourseName(courseCode) {
  const [target, , known] = courseCode.split('_')
  const targetName = languageNames[target] || target.toUpperCase()
  const knownName = languageNames[known] || known.toUpperCase()
  return `${targetName} for ${knownName} speakers`
}

function getRecordingStatus(course) {
  const progress = getRecordingProgress(course)
  if (progress === 100) return 'Complete'
  if (progress > 0) return 'In Progress'
  return 'Not Started'
}

function getRecordingStatusClass(course) {
  const progress = getRecordingProgress(course)
  if (progress === 100) return 'bg-emerald-600 text-white'
  if (progress > 0) return 'bg-yellow-600 text-white'
  return 'bg-slate-600 text-slate-300'
}

function getRecordingProgress(course) {
  const total = (course.needs_recording || 0) + (course.recorded || 0)
  if (total === 0) return 0
  return Math.round((course.recorded || 0) / total * 100)
}

function selectCourse(courseCode) {
  selectedCourse.value = courseCode
}

async function loadPhrases(courseCode) {
  loading.value = true
  phrases.value = []
  currentIndex.value = 0
  recordedPhrases.value = new Set()

  try {
    // TODO: Fetch phrases that need recording from API
    // For now, mock data based on course
    const lang = courseCode.split('_')[0]

    if (lang === 'mkd') {
      phrases.value = [
        { id: '1', text: 'Сакам', language: 'mkd', role: 'target1', cadence: 'normal' },
        { id: '2', text: 'Јас сакам', language: 'mkd', role: 'target1', cadence: 'normal' },
        { id: '3', text: 'Ти сакаш', language: 'mkd', role: 'target1', cadence: 'normal' },
      ]
    } else if (lang === 'wel' || lang === 'cym') {
      phrases.value = [
        { id: '1', text: 'Dw i', language: 'cym', role: 'target1', cadence: 'normal' },
        { id: '2', text: 'Dw i eisiau', language: 'cym', role: 'target1', cadence: 'normal' },
        { id: '3', text: 'Rwyt ti', language: 'cym', role: 'target1', cadence: 'normal' },
      ]
    } else {
      phrases.value = [
        { id: '1', text: 'Sample phrase 1', language: lang, role: 'target1', cadence: 'normal' },
        { id: '2', text: 'Sample phrase 2', language: lang, role: 'target1', cadence: 'normal' },
      ]
    }
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
      voiceId: `human_recorder_${phrase.language}`
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
