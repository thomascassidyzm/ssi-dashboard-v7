/**
 * Autocue State Management Composable
 * Manages the two-mode teleprompter recording system state
 *
 * Supports two recording modes:
 * - Queue mode (regeneration): phrase-by-phrase recording with manual advance
 * - Script mode (new-course): continuous VAD-based recording with background uploads
 */

import { ref, computed, reactive, watch } from 'vue'
import { getApiUrl } from '@/services/api'

// Singleton state for the entire autocue session
const state = reactive({
  // Session phase
  currentPhase: 'mode-select', // mode-select, role-select, script-loaded, recording, summary, review

  // Mode selection
  selectedMode: null, // 'new-course' or 'regeneration'

  // Role selection
  selectedRole: null, // 'known', 'target1', 'target2'

  // Script mode flag — when true, phrases come from optimizer and recording is continuous
  scriptMode: false,

  // Script metadata (optimizer mode only)
  scriptInfo: null, // { totalItems, totalPhrases, totalDirect, estimatedMinutes }

  // Session ID for grouping recordings
  scriptSessionId: null,

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

  // Audio recordings (map of phrase id -> { blob, url })
  audioRecordings: new Map(),

  // Review state
  approvedSegments: new Set(),
  rejectedSegments: new Set(),

  // Loading state (for API calls)
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null
})

// MediaRecorder instance
let mediaRecorder = null
let audioStream = null
let currentRecordingChunks = []
let currentRecordingPhraseId = null

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
    if (state.scriptMode && state.scriptInfo) {
      return `${state.targetLanguage} — ${state.scriptInfo.totalPhrases} phrases, ~${state.scriptInfo.estimatedMinutes} min`
    }
    if (!state.selectedRole && !state.scriptMode) return 'Select a mode to begin'
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
    if (mode === 'new-course') {
      // New course mode: skip role selection, go straight to loading optimizer script
      state.scriptMode = true
      state.selectedRole = 'target1' // optimizer is always target language
      loadOptimizedScript(state.courseCode)
    } else {
      state.scriptMode = false
      state.currentPhase = 'role-select'
    }
  }

  function selectRole(role) {
    state.selectedRole = role
  }

  function beginSession(role, language) {
    state.selectedRole = role
    state.currentPhase = 'recording'
    state.currentPhraseIndex = 0
    state.currentPass = 1
    state.recordedSegments = []
    state.approvedSegments.clear()
    state.rejectedSegments.clear()
  }

  // Begin a continuous recording session (from script-loaded confirmation)
  function beginContinuousSession() {
    state.currentPhase = 'recording'
    state.currentPhraseIndex = 0
    state.recordedSegments = []
    state.audioRecordings.clear()
  }

  // Initialize microphone access
  async function initializeMicrophone() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      console.log('[Autocue] Microphone initialized')
      return true
    } catch (err) {
      console.error('[Autocue] Failed to get microphone access:', err)
      state.error = 'Microphone access denied. Please allow microphone access.'
      return false
    }
  }

  // Start recording for current phrase
  function startPhraseRecording() {
    if (!audioStream) {
      console.warn('[Autocue] No audio stream available')
      return false
    }

    const phrase = state.phrases[state.currentPhraseIndex]
    if (!phrase) return false

    currentRecordingChunks = []
    currentRecordingPhraseId = phrase.id

    // Prefer webm for compatibility, fallback to other formats
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

    mediaRecorder = new MediaRecorder(audioStream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        currentRecordingChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      // Create blob from chunks
      const blob = new Blob(currentRecordingChunks, { type: mimeType })
      const url = URL.createObjectURL(blob)

      // Store the recording
      state.audioRecordings.set(currentRecordingPhraseId, { blob, url, mimeType })
      console.log(`[Autocue] Recorded phrase ${currentRecordingPhraseId}: ${blob.size} bytes`)
    }

    mediaRecorder.start()
    return true
  }

  // Stop recording for current phrase
  function stopPhraseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }

  function startRecording() {
    state.isRecording = true
    state.recordingStartTime = Date.now()
    state.scriptSessionId = `session_${Date.now()}`
    state.elapsedSeconds = 0

    // Start timer
    timerInterval = setInterval(() => {
      state.elapsedSeconds++
    }, 1000)

    // In script mode, continuous recorder is managed externally (AutocueStudio)
    if (!state.scriptMode) {
      startPhraseRecording()
    }
  }

  function stopRecording() {
    state.isRecording = false

    // Stop current phrase recording
    if (!state.scriptMode) {
      stopPhraseRecording()
    }

    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    if (state.scriptMode) {
      // In script mode, go to summary instead of review
      state.currentPhase = 'summary'
    } else {
      // Generate segments from actual recordings
      generateRecordedSegments()
      // Move to review phase
      state.currentPhase = 'review'
    }
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

  // Called by continuous recorder when a segment is captured via VAD
  function onSegmentCaptured(segment, itemIndex) {
    const phrase = state.phrases[itemIndex]
    if (!phrase) return

    // Store the recording
    state.audioRecordings.set(phrase.id, {
      blob: segment.blob,
      url: URL.createObjectURL(segment.blob),
      mimeType: segment.blob.type || 'audio/webm'
    })

    // Track as recorded
    state.recordedSegments.push({
      id: `seg_${phrase.id}`,
      phraseId: phrase.id,
      itemIndex,
      text: phrase.text,
      cadence: phrase.cadence,
      hasRecording: true
    })

    console.log(`[Autocue] Segment captured for item ${itemIndex}: ${phrase.text.substring(0, 30)}...`)
  }

  // Auto-advance to next phrase (called after segment captured in script mode)
  function advanceToNext() {
    if (state.currentPhraseIndex < totalPhrases.value - 1) {
      state.currentPhraseIndex++
    } else {
      // Last item — stop recording
      stopRecording()
    }
  }

  function navigatePhrase(direction) {
    const newIndex = state.currentPhraseIndex + direction
    if (newIndex >= 0 && newIndex < totalPhrases.value) {
      // If recording, stop current phrase and start new one
      if (state.isRecording && !state.scriptMode) {
        stopPhraseRecording()
        state.currentPhraseIndex = newIndex
        // Small delay to allow previous recording to save
        setTimeout(() => startPhraseRecording(), 100)
      } else {
        state.currentPhraseIndex = newIndex
      }
    }
  }

  function adjustSpeed(delta) {
    state.scrollSpeed = Math.max(1, Math.min(10, state.scrollSpeed + delta))
  }

  function generateRecordedSegments() {
    // Generate segments from actual recordings
    state.recordedSegments = state.phrases.map((phrase, index) => {
      const recording = state.audioRecordings.get(phrase.id)
      const hasRecording = !!recording

      // Estimate confidence based on whether we have a recording
      let confidence, level
      if (hasRecording && recording.blob.size > 1000) {
        confidence = 85 + Math.floor(Math.random() * 15)
        level = 'high'
      } else if (hasRecording) {
        confidence = 70 + Math.floor(Math.random() * 15)
        level = 'medium'
      } else {
        confidence = 0
        level = 'low'
      }

      return {
        id: `seg_${phrase.id}`,
        phraseId: phrase.id,
        label: `Phrase #${String(index + 1).padStart(3, '0')}`,
        text: phrase.text,
        translation: phrase.translation,
        duration: hasRecording ? (recording.blob.size / 10000).toFixed(1) : '0.0',
        confidence,
        confidenceLevel: level,
        quality: hasRecording ? (confidence > 85 ? 'Excellent' : 'Good') : 'Not Recorded',
        issues: hasRecording ? [] : ['No recording'],
        hasRecording,
        audioUrl: recording?.url || null
      }
    })
  }

  // Legacy mock function - kept for testing without microphone
  function generateMockSegments() {
    state.recordedSegments = state.phrases.map((phrase, index) => {
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
        issues: confidence < 70 ? ['Slight noise'] : [],
        hasRecording: false,
        audioUrl: null
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

  async function finalizeSession() {
    console.log('[Autocue] Finalizing session...')
    console.log('[Autocue] Approved:', [...state.approvedSegments])
    console.log('[Autocue] Rejected:', [...state.rejectedSegments])

    // Upload approved recordings
    const approvedSegments = state.recordedSegments.filter(seg =>
      state.approvedSegments.has(seg.id) && seg.hasRecording
    )

    if (approvedSegments.length === 0) {
      console.log('[Autocue] No approved recordings to upload')
      resetSession()
      return
    }

    state.isUploading = true
    state.uploadProgress = 0

    const baseUrl = localStorage.getItem('api_base_url') || getApiUrl()

    let uploaded = 0
    const total = approvedSegments.length

    for (const segment of approvedSegments) {
      try {
        const phrase = state.phrases.find(p => p.id === segment.phraseId)
        const recording = state.audioRecordings.get(segment.phraseId)

        if (!recording || !phrase) continue

        // Convert blob to base64
        const base64 = await blobToBase64(recording.blob)

        // Upload to server
        const response = await fetch(
          `${baseUrl}/api/production/${state.courseCode}/recording/upload`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
              uuid: phrase.id,
              audioData: base64,
              format: recording.mimeType.includes('webm') ? 'webm' : 'mp4',
              metadata: {
                role: phrase.role || state.selectedRole,
                cadence: phrase.cadence || 'slow',
                text: phrase.text
              },
              provenance: {
                recorded_by: 'autocue-studio',
                recorded_at: new Date().toISOString(),
                session_id: state.recordingStartTime
              }
            })
          }
        )

        if (response.ok) {
          console.log(`[Autocue] Uploaded: ${phrase.id}`)
          uploaded++
        } else {
          console.error(`[Autocue] Failed to upload ${phrase.id}:`, await response.text())
        }
      } catch (err) {
        console.error(`[Autocue] Error uploading ${segment.phraseId}:`, err)
      }

      state.uploadProgress = Math.round((uploaded / total) * 100)
    }

    console.log(`[Autocue] Upload complete: ${uploaded}/${total}`)
    state.isUploading = false

    // Reset state
    resetSession()
  }

  // Helper to convert blob to base64
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  function resetSession() {
    state.currentPhase = 'mode-select'
    state.selectedMode = null
    state.selectedRole = null
    state.scriptMode = false
    state.scriptInfo = null
    state.scriptSessionId = null
    state.currentPass = 1
    state.currentPhraseIndex = 0
    state.isRecording = false
    state.isPaused = false
    state.recordingStartTime = null
    state.elapsedSeconds = 0
    state.phrases = []
    state.recordedSegments = []
    state.audioRecordings.clear()
    state.approvedSegments.clear()
    state.rejectedSegments.clear()
    state.isUploading = false
    state.uploadProgress = 0

    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    // Clean up audio stream
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
      audioStream = null
    }
  }

  // Load optimized recording script (new-course mode)
  async function loadOptimizedScript(courseCode) {
    state.isLoading = true
    state.error = null

    try {
      const baseUrl = localStorage.getItem('api_base_url') || getApiUrl()

      // Fetch interleaved script from optimizer endpoint
      const res = await fetch(
        `${baseUrl}/api/production/${courseCode}/recording-script`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to load recording script (${res.status})`)
      }

      const data = await res.json()

      // Store script metadata
      state.scriptInfo = {
        totalItems: data.totalItems,
        totalPhrases: data.totalPhrases,
        totalDirect: data.totalDirect,
        estimatedMinutes: data.estimatedMinutes
      }

      // Transform items to autocue phrase format
      // Target text only — no known-language hints on the autocue
      state.phrases = data.items.map((item, idx) => ({
        id: `script-${idx}`,
        text: item.text,
        translation: '', // target only — clean autocue
        cadence: item.cadence,
        type: item.type,
        phraseIndex: item.phraseIndex,
        wordCount: item.wordCount,
        coversLegos: item.coversLegos,
        known: item.known,
        legoId: item.legoId || '',
        role: 'target1',
        // LEGO-level chunking — PhraseCard uses these in Pass 2 (slow) to
        // render pause boundaries between LEGO chunks rather than every word.
        recordingChunks: item.recordingChunks || null,
        legoChunks: item.legoChunks || null,
        chunksString: item.chunksString || null,
        chunkCount: item.chunkCount || null
      }))

      console.log(`[Autocue] Loaded optimizer script: ${state.phrases.length} items (${data.totalPhrases} phrases + ${data.totalDirect} direct)`)

      // Also load course info
      const courseRes = await fetch(
        `${baseUrl}/api/production/${courseCode}/info`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )

      if (courseRes.ok) {
        const courseData = await courseRes.json()
        const course = courseData.course || courseData
        state.courseName = course.display_name || course.name || courseCode
        state.knownLanguage = course.known_lang || 'English'
        state.targetLanguage = course.target_lang || 'Unknown'
      }

      // Go to script-loaded confirmation
      state.currentPhase = 'script-loaded'

    } catch (err) {
      console.error('[Autocue] Failed to load optimizer script:', err)
      state.error = err.message
      state.currentPhase = 'mode-select'
      state.scriptMode = false
    } finally {
      state.isLoading = false
    }
  }

  async function loadCourse(courseCode) {
    state.courseCode = courseCode
    state.isLoading = true

    try {
      // Get API base URL
      const baseUrl = localStorage.getItem('api_base_url') || getApiUrl()

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

      // Get course info from database (not manifest)
      const courseRes = await fetch(
        `${baseUrl}/api/production/${courseCode}/info`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )

      if (courseRes.ok) {
        const courseData = await courseRes.json()
        const course = courseData.course || courseData
        state.courseName = course.display_name || course.name || courseCode
        state.knownLanguage = course.known_lang || 'English'
        state.targetLanguage = course.target_lang || 'Unknown'
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
    beginContinuousSession,
    initializeMicrophone,
    startRecording,
    stopRecording,
    toggleRecording,
    togglePause,
    navigatePhrase,
    adjustSpeed,
    onSegmentCaptured,
    advanceToNext,
    approveSegment,
    rejectSegment,
    approveAllByConfidence,
    backToRecording,
    finalizeSession,
    resetSession,
    loadCourse,
    loadOptimizedScript,
    cleanup
  }
}
