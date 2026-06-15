<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Recording Studio</h1>
            <p class="text-muted">Record audio samples for phrases that need human voice</p>
          </div>
          <!-- Voice ID Badge -->
          <div v-if="voiceId" class="text-right">
            <span class="text-xs text-faint">Recording as</span>
            <div class="text-emerald-400 font-mono text-sm">{{ voiceId }}</div>
            <button @click="changeRecorder" class="text-xs text-faint hover:text-muted">
              change
            </button>
          </div>
        </div>
      </div>

      <!-- Name Prompt Modal -->
      <div v-if="showNamePrompt" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div class="bg-surface border border-line rounded-lg p-8 max-w-md w-full mx-4">
          <h2 class="text-2xl font-bold text-emerald-400 mb-4">Welcome to Recording Studio</h2>
          <p class="text-muted mb-6">Enter your name to identify your recordings:</p>
          <input
            v-model="recorderName"
            type="text"
            placeholder="e.g., Maria"
            class="w-full bg-canvas border border-line rounded-lg px-4 py-3 text-ink mb-4 focus:border-emerald-500 focus:outline-none"
            @keyup.enter="setRecorderName"
            autofocus
          />
          <p class="text-xs text-faint mb-4">
            Your voice ID will be: <span class="text-emerald-400 font-mono">human_{{ recorderName || 'name' }}_[lang]</span>
          </p>
          <button
            @click="setRecorderName"
            :disabled="!recorderName.trim()"
            class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 disabled:text-faint text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Start Recording
          </button>
        </div>
      </div>

      <!-- Course Selection View (Card Grid) -->
      <template v-if="!selectedCourse && !showNamePrompt">
        <!-- Test Mode Banner -->
        <div class="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🧪</span>
            <div>
              <p class="text-amber-400 font-semibold">Test Mode Active</p>
              <p class="text-muted text-sm">Using sample phrases. Select "Test Course" to try the recording flow.</p>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="mb-6">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search courses..."
            class="w-full bg-surface border border-line rounded-lg px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <!-- Loading State -->
        <div v-if="loadingCourses" class="text-center py-12">
          <div class="text-muted">Loading courses...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredCourses.length === 0" class="text-center py-12">
          <div v-if="searchQuery" class="text-muted mb-4">
            No courses matching "{{ searchQuery }}"
          </div>
          <div v-else class="text-muted mb-4">No courses available for recording</div>
        </div>

        <!-- Courses Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="course in filteredCourses"
            :key="course.course_code"
            @click="selectCourse(course.course_code)"
            :class="[
              'bg-surface rounded-lg p-6 transition-all hover:-translate-y-0.5 cursor-pointer border',
              course.course_code === 'test_course'
                ? 'border-amber-500/50 hover:border-amber-400'
                : 'border-line hover:border-emerald-500/50'
            ]"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xl font-semibold text-emerald-400">
                    {{ course.course_code }}
                  </h3>
                  <span v-if="course.course_code === 'test_course'" class="text-xs bg-amber-500 text-black px-2 py-0.5 rounded">TEST</span>
                </div>
                <p class="text-xs text-faint mb-1">
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
              <div class="bg-canvas/50 rounded p-3">
                <div class="text-muted text-xs mb-1">PHRASES</div>
                <div class="text-amber-400 font-semibold">{{ course.total_phrases || 0 }}</div>
              </div>
              <div class="bg-canvas/50 rounded p-3">
                <div class="text-muted text-xs mb-1">RECORDED</div>
                <div class="text-emerald-400 font-semibold">{{ course.recorded || 0 }}</div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 transition-all duration-300"
                  :style="{ width: `${getRecordingProgress(course)}%` }"
                ></div>
              </div>
              <div class="text-xs text-faint mt-1 text-right">
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
      <template v-else-if="selectedCourse">
        <!-- Back to Courses -->
        <button
          @click="selectedCourse = ''"
          class="text-emerald-400 hover:text-emerald-300 mb-6 inline-flex items-center gap-2"
        >
          ← Back to Course Selection
        </button>

        <!-- Course Info Header -->
        <div class="bg-surface border border-line rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-emerald-400">{{ selectedCourse }}</h2>
              <p class="text-muted">{{ getFullCourseName(selectedCourse) }}</p>
            </div>
            <div class="text-right">
              <span class="text-faint text-sm">
                {{ recordedCount }} / {{ phrases.length }} recorded
              </span>
            </div>
          </div>
        </div>

        <!-- Phrase to Record -->
        <div v-if="currentPhrase" class="space-y-6">
          <!-- Phrase Display -->
          <div class="bg-surface border border-line rounded-lg p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <span class="text-xs text-faint uppercase tracking-wide">
                  {{ currentPhrase.role }} • {{ currentPhrase.language }} • {{ currentPhrase.cadence }}
                </span>
                <h2 class="text-3xl font-bold text-emerald-400 mt-2">
                  {{ currentPhrase.text }}
                </h2>
                <p v-if="currentPhrase.translation" class="text-muted mt-2">
                  {{ currentPhrase.translation }}
                </p>
              </div>
              <div class="text-right">
                <span class="text-faint text-sm">
                  {{ currentIndex + 1 }} of {{ phrases.length }}
                </span>
                <div class="text-xs text-faint font-mono mt-1">
                  {{ currentPhrase.uuid?.slice(0, 8) }}...
                </div>
              </div>
            </div>

            <!-- Cadence Instructions -->
            <div v-if="currentPhrase.cadence === 'slow'" class="bg-amber-900/20 border border-amber-500/30 rounded p-3 mt-4">
              <p class="text-amber-400 text-sm">
                <strong>Slow recording:</strong> Speak clearly with small pauses between words.
                This helps with LEGO extraction.
              </p>
            </div>

            <!-- Reference Audio (if exists) -->
            <div v-if="currentPhrase.ttsUrl" class="mt-4">
              <p class="text-xs text-faint mb-2">Reference (TTS):</p>
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
              class="px-6 py-2 bg-surface-2 hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              ← Previous
            </button>

            <button
              @click="saveAndNext"
              :disabled="!recorderHasRecording || saving"
              class="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              <span v-if="saving">Saving...</span>
              <span v-else>Save & Next →</span>
            </button>

            <button
              @click="skipPhrase"
              class="px-6 py-2 bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors"
            >
              Skip →
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="mt-8">
            <div class="flex justify-between text-sm text-faint mb-2">
              <span>Progress</span>
              <span>{{ recordedCount }} / {{ phrases.length }} recorded</span>
            </div>
            <div class="h-2 bg-surface rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 transition-all duration-300"
                :style="{ width: `${(recordedCount / phrases.length) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Save Status -->
          <div v-if="lastSaveStatus" class="text-center">
            <span :class="lastSaveStatus.success ? 'text-emerald-400' : 'text-red-400'" class="text-sm">
              {{ lastSaveStatus.message }}
            </span>
          </div>

          <!-- Keyboard Shortcuts Help -->
          <div class="mt-6 bg-surface/50 border border-line/50 rounded-lg p-4">
            <p class="text-xs text-faint mb-2 font-semibold">KEYBOARD SHORTCUTS</p>
            <div class="flex flex-wrap gap-4 text-xs text-muted">
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">SPACE</kbd> Record</span>
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">ENTER</kbd> Save & Next</span>
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">S</kbd> Skip</span>
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">P</kbd> Play</span>
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">R</kbd> Re-record</span>
              <span><kbd class="bg-surface-2 px-2 py-0.5 rounded text-ink">←/→</kbd> Navigate</span>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="text-center py-12 text-faint">
          Loading phrases...
        </div>

        <!-- All Done -->
        <div v-else-if="phrases.length === 0" class="text-center py-12">
          <div class="text-6xl mb-4">🎉</div>
          <p class="text-emerald-400 text-xl">All phrases recorded!</p>
          <button
            @click="selectedCourse = ''"
            class="mt-4 px-6 py-2 bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors"
          >
            Back to Course Selection
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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

// Test phrases - longer seed-sentence-length phrases only
const TEST_PHRASES = {
  test_course: [
    // Spanish - natural speed (seed sentence length)
    { text: 'Quiero un café con leche por favor', language: 'spa', role: 'target', cadence: 'natural', translation: 'I want a coffee with milk please' },
    { text: 'Me gustaría ir al cine esta noche', language: 'spa', role: 'target', cadence: 'natural', translation: 'I would like to go to the cinema tonight' },
    { text: 'Necesito comprar pan en la tienda', language: 'spa', role: 'target', cadence: 'natural', translation: 'I need to buy bread at the shop' },
    { text: 'Ella trabaja en una oficina grande', language: 'spa', role: 'target', cadence: 'natural', translation: 'She works in a big office' },
    { text: 'Vamos a la playa el domingo', language: 'spa', role: 'target', cadence: 'natural', translation: 'We are going to the beach on Sunday' },
    // Spanish - slow with gaps
    { text: 'Quiero un café con leche por favor', language: 'spa', role: 'target', cadence: 'slow', translation: 'I want a coffee with milk please (slow)' },
    { text: 'Me gustaría ir al cine esta noche', language: 'spa', role: 'target', cadence: 'slow', translation: 'I would like to go to the cinema tonight (slow)' },
    { text: 'Necesito comprar pan en la tienda', language: 'spa', role: 'target', cadence: 'slow', translation: 'I need to buy bread at the shop (slow)' },
    { text: 'Ella trabaja en una oficina grande', language: 'spa', role: 'target', cadence: 'slow', translation: 'She works in a big office (slow)' },
    { text: 'Vamos a la playa el domingo', language: 'spa', role: 'target', cadence: 'slow', translation: 'We are going to the beach on Sunday (slow)' },
  ],
  mkd_for_cat: [
    // Macedonian - natural speed (seed sentence length)
    { text: 'Јас сакам да одам на работа', language: 'mkd', role: 'target', cadence: 'natural', translation: 'I want to go to work' },
    { text: 'Таа готви вечера во кујната', language: 'mkd', role: 'target', cadence: 'natural', translation: 'She is cooking dinner in the kitchen' },
    { text: 'Ние живееме во голем град', language: 'mkd', role: 'target', cadence: 'natural', translation: 'We live in a big city' },
    { text: 'Тој чита книга секој ден', language: 'mkd', role: 'target', cadence: 'natural', translation: 'He reads a book every day' },
    { text: 'Децата играат во паркот', language: 'mkd', role: 'target', cadence: 'natural', translation: 'The children play in the park' },
    // Macedonian - slow with gaps
    { text: 'Јас сакам да одам на работа', language: 'mkd', role: 'target', cadence: 'slow', translation: 'I want to go to work (slow)' },
    { text: 'Таа готви вечера во кујната', language: 'mkd', role: 'target', cadence: 'slow', translation: 'She is cooking dinner in the kitchen (slow)' },
    { text: 'Ние живееме во голем град', language: 'mkd', role: 'target', cadence: 'slow', translation: 'We live in a big city (slow)' },
    { text: 'Тој чита книга секој ден', language: 'mkd', role: 'target', cadence: 'slow', translation: 'He reads a book every day (slow)' },
    { text: 'Децата играат во паркот', language: 'mkd', role: 'target', cadence: 'slow', translation: 'The children play in the park (slow)' },
  ],
  wel_for_eng: [
    // Welsh - natural speed (seed sentence length)
    { text: 'Dw i eisiau mynd i\'r dref heddiw', language: 'cym', role: 'target', cadence: 'natural', translation: 'I want to go to town today' },
    { text: 'Mae hi\'n bwrw glaw y tu allan', language: 'cym', role: 'target', cadence: 'natural', translation: 'It is raining outside' },
    { text: 'Rydyn ni\'n hoffi bwyta pizza', language: 'cym', role: 'target', cadence: 'natural', translation: 'We like to eat pizza' },
    { text: 'Mae\'r plant yn chwarae yn yr ardd', language: 'cym', role: 'target', cadence: 'natural', translation: 'The children are playing in the garden' },
    { text: 'Dw i\'n gweithio mewn swyddfa fawr', language: 'cym', role: 'target', cadence: 'natural', translation: 'I work in a big office' },
    // Welsh - slow with gaps
    { text: 'Dw i eisiau mynd i\'r dref heddiw', language: 'cym', role: 'target', cadence: 'slow', translation: 'I want to go to town today (slow)' },
    { text: 'Mae hi\'n bwrw glaw y tu allan', language: 'cym', role: 'target', cadence: 'slow', translation: 'It is raining outside (slow)' },
    { text: 'Rydyn ni\'n hoffi bwyta pizza', language: 'cym', role: 'target', cadence: 'slow', translation: 'We like to eat pizza (slow)' },
    { text: 'Mae\'r plant yn chwarae yn yr ardd', language: 'cym', role: 'target', cadence: 'slow', translation: 'The children are playing in the garden (slow)' },
    { text: 'Dw i\'n gweithio mewn swyddfa fawr', language: 'cym', role: 'target', cadence: 'slow', translation: 'I work in a big office (slow)' },
  ]
}

// State - Recorder Identity
const showNamePrompt = ref(false)
const recorderName = ref('')
const voiceId = ref('')

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
const lastSaveStatus = ref(null)

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

// Fix: Use component method to check for recording (not local ref)
const recorderHasRecording = computed(() => recorder.value?.hasRecording() || false)

// Generate deterministic UUID from phrase metadata
function generatePhraseUUID(phrase) {
  const key = `${phrase.text}:${phrase.language}:${phrase.role}:${phrase.cadence}`
  // Simple hash function for demo - in production use proper UUID v5
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  // Format as UUID-like string
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(1, 4)}-${hex.slice(0, 12).padEnd(12, '0')}`
}

function setRecorderName() {
  if (!recorderName.value.trim()) return
  const name = recorderName.value.trim()
  localStorage.setItem('ssi_recorder_name', name)
  voiceId.value = `human_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  showNamePrompt.value = false
}

function changeRecorder() {
  showNamePrompt.value = true
}

// Keyboard shortcuts for rapid recording
function handleKeyPress(e) {
  // Ignore if in input/textarea or modal is showing
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if (showNamePrompt.value) return
  if (!selectedCourse.value) return // Only active in recording view

  switch (e.key) {
    case ' ': // Spacebar - toggle recording
      e.preventDefault()
      if (recorder.value?.toggleRecording) {
        recorder.value.toggleRecording()
      }
      break
    case 'Enter': // Save & next
      e.preventDefault()
      if (recorderHasRecording.value && !saving.value) {
        saveAndNext()
      }
      break
    case 's': // Skip
    case 'S':
      e.preventDefault()
      skipPhrase()
      break
    case 'p': // Play back
    case 'P':
      e.preventDefault()
      if (recorder.value?.playRecording) {
        recorder.value.playRecording()
      }
      break
    case 'r': // Re-record (clear)
    case 'R':
      e.preventDefault()
      if (recorder.value?.clearRecording) {
        recorder.value.clearRecording()
      }
      break
    case 'ArrowLeft': // Previous phrase
      e.preventDefault()
      prevPhrase()
      break
    case 'ArrowRight': // Next phrase (without saving)
      e.preventDefault()
      nextPhrase()
      break
  }
}

onMounted(async () => {
  // Add keyboard listener
  window.addEventListener('keydown', handleKeyPress)

  const savedName = localStorage.getItem('ssi_recorder_name')
  if (savedName) {
    recorderName.value = savedName
    voiceId.value = `human_${savedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  } else {
    showNamePrompt.value = true
  }
  await loadCourses()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
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
    // Add test course first
    const testCourses = [
      {
        course_code: 'test_course',
        total_phrases: TEST_PHRASES.test_course.length,
        recorded: 0
      },
      {
        course_code: 'mkd_for_cat',
        total_phrases: TEST_PHRASES.mkd_for_cat.length,
        recorded: 0
      },
      {
        course_code: 'wel_for_eng',
        total_phrases: TEST_PHRASES.wel_for_eng.length,
        recorded: 0
      }
    ]

    // Try to load real courses too
    try {
      const response = await api.course.list()
      const realCourses = (response.courses || []).map(course => ({
        ...course,
        total_phrases: course.total_seeds || 0,
        recorded: 0
      }))
      courses.value = [...testCourses, ...realCourses.filter(c =>
        !testCourses.find(t => t.course_code === c.course_code)
      )]
    } catch {
      courses.value = testCourses
    }
  } catch (err) {
    console.error('Failed to load courses:', err)
    courses.value = []
  } finally {
    loadingCourses.value = false
  }
}

function getFullCourseName(courseCode) {
  if (courseCode === 'test_course') return 'Test Course (Spanish samples)'
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
  return 'bg-surface-3 text-ink'
}

function getRecordingProgress(course) {
  const total = course.total_phrases || 0
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
  lastSaveStatus.value = null

  try {
    // Check for test phrases first
    if (TEST_PHRASES[courseCode]) {
      phrases.value = TEST_PHRASES[courseCode].map(p => ({
        ...p,
        uuid: generatePhraseUUID(p)
      }))
    } else {
      // TODO: Fetch real phrases from course lego_pairs
      const lang = courseCode.split('_')[0]
      phrases.value = [
        { text: 'Sample phrase 1', language: lang, role: 'target', cadence: 'natural', translation: 'Sample 1' },
        { text: 'Sample phrase 2', language: lang, role: 'target', cadence: 'natural', translation: 'Sample 2' },
      ].map(p => ({ ...p, uuid: generatePhraseUUID(p) }))
    }
  } catch (err) {
    console.error('Failed to load phrases:', err)
  } finally {
    loading.value = false
  }
}

// Convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
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
  lastSaveStatus.value = null

  try {
    const blob = recorder.value.getRecording()
    const phrase = currentPhrase.value
    const phraseVoiceId = `${voiceId.value}_${phrase.language}`

    // Convert blob to base64
    const base64Audio = await blobToBase64(blob)

    // Send as JSON (avoids multipart parsing issues)
    const response = await fetch('/api/audio/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio: base64Audio,
        mimeType: blob.type,
        metadata: {
          text: phrase.text,
          language: phrase.language,
          role: phrase.role,
          cadence: phrase.cadence,
          courseCode: selectedCourse.value,
          voiceId: phraseVoiceId,
          uuid: phrase.uuid
        }
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error || 'Upload failed')
    }

    const result = await response.json()

    recordedPhrases.value.add(phrase.uuid)
    lastSaveStatus.value = { success: true, message: `Saved: ${result.key || phrase.uuid}` }

    // Auto-advance after short delay
    setTimeout(() => {
      nextPhrase()
    }, 500)

  } catch (err) {
    console.error('Save failed:', err)
    lastSaveStatus.value = { success: false, message: `Error: ${err.message}` }
  } finally {
    saving.value = false
  }
}

function nextPhrase() {
  hasRecording.value = false
  lastSaveStatus.value = null
  if (currentIndex.value < phrases.length - 1) {
    currentIndex.value++
  }
}

function prevPhrase() {
  hasRecording.value = false
  lastSaveStatus.value = null
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function skipPhrase() {
  nextPhrase()
}
</script>
