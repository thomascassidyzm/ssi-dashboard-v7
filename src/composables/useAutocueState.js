/**
 * Autocue State Management Composable
 * Manages the two-mode teleprompter recording system state
 *
 * This composable will later integrate with the production Pinia store
 * from Master Agent 1 when available.
 */

import { ref, computed, reactive, watch } from 'vue'

// Singleton state for the entire autocue session
const state = reactive({
  // Session phase
  currentPhase: 'mode-select', // mode-select, role-select, recording, review

  // Mode selection
  selectedMode: null, // 'new-course' or 'regeneration'

  // Role selection
  selectedRole: null, // 'known', 'target1', 'target2'

  // Course data
  courseCode: null,
  courseName: 'Welsh for English Speakers',
  knownLanguage: 'English',
  targetLanguage: 'Welsh',

  // Recording state
  currentPass: 1, // 1 = Natural Speed, 2 = Slow with Gaps
  currentPhraseIndex: 0,
  isRecording: false,
  isPaused: false,
  scrollSpeed: 3, // seconds per phrase

  // Recording timing
  recordingStartTime: null,
  elapsedSeconds: 0,

  // Phrases
  phrases: [],

  // Recorded segments for review
  recordedSegments: [],

  // Review state
  approvedSegments: new Set(),
  rejectedSegments: new Set(),

  // Loading state (for API calls)
  isLoading: false,
  error: null
})

// Sample phrases - now loaded from API via loadCourse()
// Legacy mock data kept for reference/fallback:
// const samplePhrases = [
//   { id: 1, text: 'Sut mae! Sut dych chi heddiw?', translation: 'Hello! How are you today?' },
//   { id: 2, text: 'Hoffwn i goffi os gwelwch yn dda', translation: 'I would like coffee please' },
//   { id: 3, text: "Ble mae'r ty bach?", translation: 'Where is the bathroom?' },
//   { id: 4, text: 'Diolch yn fawr iawn', translation: 'Thank you very much' },
//   { id: 5, text: "Mae'n braf cwrdd a chi", translation: 'Nice to meet you' },
//   { id: 6, text: "Beth yw'r amser?", translation: 'What time is it?' },
//   { id: 7, text: 'Dw i ddim yn deall', translation: "I don't understand" },
//   { id: 8, text: 'Allwch chi fy helpu i?', translation: 'Can you help me?' },
//   { id: 9, text: "Faint mae hwn yn costio?", translation: 'How much does this cost?' },
//   { id: 10, text: "Ble mae'r orsaf tren?", translation: 'Where is the train station?' },
//   { id: 11, text: "Dw i'n dysgu Cymraeg", translation: "I'm learning Welsh" },
//   { id: 12, text: 'Bore da!', translation: 'Good morning!' }
// ]

export function useAutocueState() {
  // Timer interval ref
  let timerInterval = null

  // Computed properties
  const totalPhrases = computed(() => state.phrases.length)

  const recordedCount = computed(() => state.recordedSegments.length)

  const completionPercent = computed(() => {
    if (totalPhrases.value === 0) return 0
    return Math.round((recordedCount.value / totalPhrases.value) * 100)
  })

  const currentPhrase = computed(() => state.phrases[state.currentPhraseIndex])

  const sessionInfo = computed(() => {
    if (!state.selectedRole) return 'Select a mode to begin'
    return `${state.targetLanguage} Session 001`
  })

  const formattedTime = computed(() => {
    const hours = Math.floor(state.elapsedSeconds / 3600)
    const minutes = Math.floor((state.elapsedSeconds % 3600) / 60)
    const seconds = state.elapsedSeconds % 60
    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':')
  })

  const estimatedTime = computed(() => {
    // Rough estimate: 3 seconds per phrase for both passes
    return Math.round((totalPhrases.value * 6) / 60)
  })

  // Actions
  function setPhase(phase) {
    state.currentPhase = phase
  }

  function selectMode(mode) {
    state.selectedMode = mode
    state.currentPhase = 'role-select'
  }

  function selectRole(role) {
    state.selectedRole = role
  }

  function beginSession(role, language) {
    state.selectedRole = role
    state.currentPhase = 'recording'
    // Phrases are now loaded via loadCourse() - no need to set them here
    // state.phrases should already be populated from API call
    state.currentPhraseIndex = 0
    state.currentPass = 1
    state.recordedSegments = []
    state.approvedSegments.clear()
    state.rejectedSegments.clear()
  }

  function startRecording() {
    state.isRecording = true
    state.recordingStartTime = Date.now()
    state.elapsedSeconds = 0

    // Start timer
    timerInterval = setInterval(() => {
      state.elapsedSeconds++
    }, 1000)
  }

  function stopRecording() {
    state.isRecording = false

    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    // Generate mock recorded segments for review
    generateMockSegments()

    // Move to review phase
    state.currentPhase = 'review'
  }

  function toggleRecording() {
    if (state.isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  function togglePause() {
    state.isPaused = !state.isPaused
  }

  function navigatePhrase(direction) {
    const newIndex = state.currentPhraseIndex + direction
    if (newIndex >= 0 && newIndex < totalPhrases.value) {
      state.currentPhraseIndex = newIndex
    }
  }

  function adjustSpeed(delta) {
    state.scrollSpeed = Math.max(1, Math.min(10, state.scrollSpeed + delta))
  }

  function generateMockSegments() {
    // Generate mock segments with confidence levels
    state.recordedSegments = state.phrases.map((phrase, index) => {
      // Simulate varying confidence
      const rand = Math.random()
      let confidence, level
      if (rand > 0.7) {
        confidence = 90 + Math.floor(Math.random() * 10)
        level = 'high'
      } else if (rand > 0.2) {
        confidence = 70 + Math.floor(Math.random() * 20)
        level = 'medium'
      } else {
        confidence = 50 + Math.floor(Math.random() * 20)
        level = 'low'
      }

      return {
        id: `seg_${phrase.id}`,
        phraseId: phrase.id,
        label: `Phrase #${String(phrase.id).padStart(3, '0')}`,
        text: phrase.text,
        translation: phrase.translation,
        duration: (1 + Math.random() * 2).toFixed(1),
        confidence,
        confidenceLevel: level,
        quality: confidence > 85 ? 'Excellent' : confidence > 70 ? 'Good' : 'Needs Review',
        issues: confidence < 70 ? ['Slight noise'] : []
      }
    })
  }

  function approveSegment(segment) {
    state.approvedSegments.add(segment.id)
    state.rejectedSegments.delete(segment.id)
  }

  function rejectSegment(segment) {
    state.rejectedSegments.add(segment.id)
    state.approvedSegments.delete(segment.id)
  }

  function approveAllByConfidence(level) {
    state.recordedSegments.forEach(seg => {
      if (seg.confidenceLevel === level || (level === 'high' && seg.confidence >= 90)) {
        state.approvedSegments.add(seg.id)
      }
    })
  }

  function backToRecording() {
    state.currentPhase = 'recording'
  }

  function finalizeSession() {
    console.log('Finalizing session...')
    console.log('Approved:', [...state.approvedSegments])
    console.log('Rejected:', [...state.rejectedSegments])

    // Reset state
    resetSession()
  }

  function resetSession() {
    state.currentPhase = 'mode-select'
    state.selectedMode = null
    state.selectedRole = null
    state.currentPass = 1
    state.currentPhraseIndex = 0
    state.isRecording = false
    state.isPaused = false
    state.recordingStartTime = null
    state.elapsedSeconds = 0
    state.phrases = []
    state.recordedSegments = []
    state.approvedSegments.clear()
    state.rejectedSegments.clear()

    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  async function loadCourse(courseCode) {
    state.courseCode = courseCode
    state.isLoading = true

    try {
      // Get API base URL
      const baseUrl = localStorage.getItem('api_base_url') ||
                      import.meta.env.VITE_API_BASE_URL ||
                      'http://localhost:3456'

      // Fetch recording queue (phrases needing human recording)
      const queueRes = await fetch(
        `${baseUrl}/api/production/${courseCode}/recording/queue`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )

      if (queueRes.ok) {
        const queueData = await queueRes.json()

        // Transform to autocue format
        state.phrases = (queueData.items || []).map((item, idx) => ({
          id: item.uuid || item.id || `phrase-${idx}`,
          text: item.target_text || item.text,
          translation: item.known_text || '',
          seedId: item.seed_id || '',
          legoId: item.lego_id || '',
          role: item.role || 'target1',
          cadence: item.cadence || 'slow'
        }))

        console.log(`[Autocue] Loaded ${state.phrases.length} phrases for recording`)
      } else {
        console.warn('[Autocue] No recording queue available')
        state.phrases = []
      }

      // Get course info
      const courseRes = await fetch(
        `${baseUrl}/api/production/${courseCode}/manifest`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )

      if (courseRes.ok) {
        const courseData = await courseRes.json()
        state.courseName = courseData.course_name || courseCode
        state.knownLanguage = courseData.known_language || 'English'
        state.targetLanguage = courseData.target_language || 'Unknown'
      }

    } catch (err) {
      console.error('[Autocue] Failed to load course:', err)
      state.error = err.message
    } finally {
      state.isLoading = false
    }
  }

  // Cleanup timer on composable disposal
  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  // Stats computed
  const reviewStats = computed(() => {
    const high = state.recordedSegments.filter(s => s.confidenceLevel === 'high').length
    const medium = state.recordedSegments.filter(s => s.confidenceLevel === 'medium').length
    const low = state.recordedSegments.filter(s => s.confidenceLevel === 'low').length
    const approved = state.approvedSegments.size
    const pending = state.recordedSegments.length - approved

    return { high, medium, low, approved, pending, total: state.recordedSegments.length }
  })

  return {
    // State (reactive)
    state,

    // Computed
    totalPhrases,
    recordedCount,
    completionPercent,
    currentPhrase,
    sessionInfo,
    formattedTime,
    estimatedTime,
    reviewStats,

    // Actions
    setPhase,
    selectMode,
    selectRole,
    beginSession,
    startRecording,
    stopRecording,
    toggleRecording,
    togglePause,
    navigatePhrase,
    adjustSpeed,
    approveSegment,
    rejectSegment,
    approveAllByConfidence,
    backToRecording,
    finalizeSession,
    resetSession,
    loadCourse,
    cleanup
  }
}
