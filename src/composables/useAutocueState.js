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
import { useCourses } from '@/composables/useCourses'

const { getCourseName } = useCourses()

// Singleton state for the entire autocue session
const state = reactive({
  // Session phase
  currentPhase: 'mode-select', // mode-select, role-select, script-loaded, script-empty, recording, summary, review

  // Mode selection
  selectedMode: null, // 'new-course' or 'regeneration'

  // Role selection
  selectedRole: null, // 'known', 'target1', 'target2'

  // Recording identity — which voice slot this session records FOR, and the
  // human voice id it belongs to (from courses.voice_config via Record Room).
  // Null when entered via the production console (defaults to target1 there).
  recordingSlot: null, // 'known' | 'target1' | 'target2' | 'presentation' | null
  voiceId: null,

  // Script mode flag — when true, phrases come from optimizer and recording is continuous
  scriptMode: false,

  // Script metadata (optimizer mode only)
  scriptInfo: null, // { totalItems, totalPhrases, totalDirect, estimatedMinutes, maxSeed }

  // Cap the script to seeds 1..N (from ?maxSeed=N on the recorder link).
  // null = whole course.
  maxSeed: null,

  // Session ID for grouping recordings
  scriptSessionId: null,

  // Course data
  courseCode: null,
  courseName: '',
  knownLanguage: '',
  targetLanguage: '',

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

  // Re-record pass (script mode). Kai listens through a whole pass flagging bad
  // takes, then re-records ONLY those. These hold that second pass: the item
  // indices to revisit, in script order, and how far through them we are.
  // Empty queue = not in a re-record pass.
  retakeQueue: [],
  retakeCursor: 0,
  playingSegmentId: null,
  // Confidence band the review grid is narrowed to, or null for everything.
  reviewFilter: null,

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

  // Bind this session to a voice slot + human voice id (set by Record Room).
  // Called with nulls when mounted from the production console so a previous
  // Record Room session can never leak its identity into an editor session.
  function setRecordingIdentity({ role = null, voiceId = null } = {}) {
    state.recordingSlot = role
    state.voiceId = voiceId
  }

  // Cap this session's script to seeds 1..N (from ?maxSeed=N on the recorder
  // link). Anything not a positive integer means "whole course".
  function setMaxSeed(value) {
    const n = parseInt(value, 10)
    state.maxSeed = Number.isInteger(n) && n > 0 ? n : null
  }

  function selectMode(mode) {
    state.selectedMode = mode
    if (mode === 'new-course') {
      // New course mode: skip role selection, go straight to loading optimizer script
      state.scriptMode = true
      // Record FOR the assigned voice slot; explicit target1 default when
      // entered without one (the editor/admin production console path).
      state.selectedRole = state.recordingSlot || 'target1'
      // Without a course the fetch would go to /api/production/null/... and
      // 404 with a misleading "no LEGOs" message — say what's actually wrong.
      if (!state.courseCode) {
        state.error = 'No course selected — open the Record Room from a course link.'
        state.scriptMode = false
        return
      }
      // Clear any previous failure and move OFF mode-select before the await,
      // so the loading spinner is actually rendered while the optimizer runs
      // (it can take tens of seconds on a large course).
      state.error = null
      state.currentPhase = 'loading'
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
    state.reviewFilter = null
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

    if (state.retakeQueue.length) {
      // A re-record pass was launched FROM review and belongs back there — the
      // summary screen is the end of a whole session, which this is not.
      endRetakePass()
    } else if (state.scriptMode) {
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
  //
  // A second take of the same phrase SUPERSEDES the first — it never lands
  // beside it. Appending was the 2026-08-10 duplicate report: every take of a
  // slot got its own review card, and because the card id is derived from the
  // phrase (`seg_<phrase.id>`, deliberately stable) all of those cards shared
  // one identity. So they lit up together on play, took each other's
  // Approve/Redo verdict, and collided on SessionReview's :key. One row per
  // slot, replaced in place, is the fix for all of that at once.
  function onSegmentCaptured(segment, itemIndex) {
    const phrase = state.phrases[itemIndex]
    if (!phrase) return

    const segmentId = `seg_${phrase.id}`
    const existingIndex = state.recordedSegments.findIndex(s => s.phraseId === phrase.id)
    const previous = existingIndex === -1 ? null : state.recordedSegments[existingIndex]
    const previousUrl = state.audioRecordings.get(phrase.id)?.url || previous?.audioUrl || null

    // Store the recording
    const url = URL.createObjectURL(segment.blob)
    state.audioRecordings.set(phrase.id, {
      blob: segment.blob,
      url,
      mimeType: segment.blob.type || 'audio/webm'
    })

    // Track as recorded. Script mode hands these very rows straight to the
    // review screen, so they carry everything SegmentCard/SessionReview read —
    // above all audioUrl, without which the play button has nothing to play.
    const row = {
      id: segmentId,
      phraseId: phrase.id,
      itemIndex,
      label: `Phrase #${String(itemIndex + 1).padStart(3, '0')}`,
      text: phrase.text,
      translation: phrase.translation,
      cadence: phrase.cadence,
      duration: ((segment.durationMs ?? 0) / 1000).toFixed(1),
      confidence: segment.blob.size > 1000 ? 90 : 70,
      confidenceLevel: segment.blob.size > 1000 ? 'high' : 'medium',
      quality: segment.blob.size > 1000 ? 'Excellent' : 'Good',
      issues: [],
      hasRecording: true,
      audioUrl: url,
      // Shown on the card, so a recordist can SEE that the retake landed —
      // a new take in the same voice is otherwise indistinguishable.
      takeNumber: (previous?.takeNumber || 1) + (previous ? 1 : 0)
    }

    if (existingIndex === -1) {
      state.recordedSegments.push(row)
    } else {
      // The superseded take must stop playing before its URL dies, or the
      // review screen is left holding a revoked src.
      if (state.playingSegmentId === segmentId) stopPlayback()
      state.recordedSegments.splice(existingIndex, 1, row)
      if (previousUrl && previousUrl !== url) URL.revokeObjectURL(previousUrl)
      // A verdict belongs to the take it was given to, not to the slot.
      state.approvedSegments.delete(segmentId)
      state.rejectedSegments.delete(segmentId)
      console.log(`[Autocue] Take ${row.takeNumber} supersedes the previous take of item ${itemIndex}`)
    }

    console.log(`[Autocue] Segment captured for item ${itemIndex}: ${phrase.text.substring(0, 30)}...`)
  }

  // Auto-advance to next phrase (called after segment captured in script mode)
  function advanceToNext() {
    // In a re-record pass the script is the flagged list, not the whole course:
    // stepping to currentPhraseIndex + 1 would walk the recordist off into
    // items they never flagged and re-record them over good takes.
    if (state.retakeQueue.length) {
      if (state.retakeCursor < state.retakeQueue.length - 1) {
        state.retakeCursor++
        state.currentPhraseIndex = state.retakeQueue[state.retakeCursor]
      } else {
        // Every flagged item has a fresh take — stop the mic and go back to
        // review, where the new takes are waiting to be judged.
        stopRecording()
      }
      return
    }

    if (state.currentPhraseIndex < totalPhrases.value - 1) {
      state.currentPhraseIndex++
    } else {
      // Last item — stop recording
      stopRecording()
    }
  }

  function navigatePhrase(direction) {
    // Manual skip inside a re-record pass moves along the flagged list too, so
    // Next/Previous stay consistent with what the pass is for.
    if (state.retakeQueue.length) {
      const cursor = state.retakeCursor + direction
      if (cursor >= 0 && cursor < state.retakeQueue.length) {
        state.retakeCursor = cursor
        state.currentPhraseIndex = state.retakeQueue[cursor]
      }
      return
    }

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

  // --- Review playback -------------------------------------------------
  // One shared element: starting a new segment stops whatever is playing, so
  // "Play All" and stabbing at cards never overlap into a chorus.
  let reviewAudio = null

  function segmentAudioUrl(segment) {
    if (!segment) return null
    return segment.audioUrl || state.audioRecordings.get(segment.phraseId)?.url || null
  }

  function stopPlayback() {
    if (reviewAudio) {
      reviewAudio.pause()
      reviewAudio.currentTime = 0
    }
    state.playingSegmentId = null
  }

  // Resolves when the clip finishes (or immediately if there is nothing to
  // play), so playAllSegments can simply await each one in turn.
  function playSegment(segment) {
    const url = segmentAudioUrl(segment)
    if (!url) {
      console.warn('[Autocue] No audio for segment', segment?.id)
      return Promise.resolve(false)
    }

    stopPlayback()
    if (!reviewAudio) reviewAudio = new Audio()
    reviewAudio.src = url
    state.playingSegmentId = segment.id

    return new Promise((resolve) => {
      const finish = (ok) => {
        reviewAudio.onended = null
        reviewAudio.onerror = null
        if (state.playingSegmentId === segment.id) state.playingSegmentId = null
        resolve(ok)
      }
      reviewAudio.onended = () => finish(true)
      reviewAudio.onerror = () => {
        console.error('[Autocue] Playback failed for segment', segment.id)
        finish(false)
      }
      const started = reviewAudio.play()
      if (started && typeof started.catch === 'function') {
        started.catch((err) => {
          console.error('[Autocue] Playback rejected:', err)
          finish(false)
        })
      }
    })
  }

  async function playAllSegments() {
    for (const segment of state.recordedSegments) {
      if (!segmentAudioUrl(segment)) continue
      await playSegment(segment)
    }
  }

  // Approve/Redo are toggles: a mis-stab is undone by clicking the same button
  // again, and the two verdicts are mutually exclusive.
  function approveSegment(segment) {
    if (!segment?.id) return
    if (state.approvedSegments.has(segment.id)) {
      state.approvedSegments.delete(segment.id)
      return
    }
    state.approvedSegments.add(segment.id)
    state.rejectedSegments.delete(segment.id)
  }

  function rejectSegment(segment) {
    if (!segment?.id) return
    if (state.rejectedSegments.has(segment.id)) {
      state.rejectedSegments.delete(segment.id)
      return
    }
    state.rejectedSegments.add(segment.id)
    state.approvedSegments.delete(segment.id)
    // A take you've just condemned shouldn't carry on playing.
    if (state.playingSegmentId === segment.id) stopPlayback()
  }

  function approveAllByConfidence(level) {
    state.recordedSegments.forEach(seg => {
      if (seg.confidenceLevel === level || (level === 'high' && seg.confidence >= 90)) {
        state.approvedSegments.add(seg.id)
        state.rejectedSegments.delete(seg.id)
      }
    })
  }

  // "Queue Low for Re-record" does what it says: condemns the whole band and
  // shows you exactly those cards, rather than silently filtering.
  function queueRedoByConfidence(level) {
    state.recordedSegments.forEach(seg => {
      if (seg.confidenceLevel === level) {
        state.rejectedSegments.add(seg.id)
        state.approvedSegments.delete(seg.id)
      }
    })
    state.reviewFilter = level
  }

  // Clicking the same band again clears the filter — no dead-end view.
  function setReviewFilter(level) {
    state.reviewFilter = state.reviewFilter === level ? null : (level || null)
  }

  function clearReviewFilter() {
    state.reviewFilter = null
  }

  function backToRecording() {
    state.currentPhase = 'recording'
  }

  // --- Re-record pass ---------------------------------------------------
  // The flag is only half a feature on its own: in script mode every take was
  // already uploaded as it was captured, so flagging one changes nothing on the
  // server by itself. What makes the flag mean something is coming BACK and
  // recording that item again — a new take of the same item supersedes the old
  // one through the path that already exists (onSegmentCaptured replaces the
  // row in place, queueUpload drops the earlier take and re-POSTs the slot).
  // This pass is the front end for that: walk only the flagged items, in script
  // order, and hand each one to the ordinary capture path.

  // The flagged items as item indices, in script order. Segments carry
  // itemIndex; the phrase list is what the teleprompter is driven by.
  const flaggedIndices = computed(() => (
    state.recordedSegments
      .filter(seg => state.rejectedSegments.has(seg.id))
      .map(seg => seg.itemIndex)
      .filter(i => Number.isInteger(i))
      .sort((a, b) => a - b)
  ))

  const isRetakePass = computed(() => state.retakeQueue.length > 0)

  // The item the pass is currently parked on, or null outside a pass — used by
  // the studio to caption the teleprompter with "retake 2 of 5".
  const retakeProgress = computed(() => (
    isRetakePass.value
      ? { current: state.retakeCursor + 1, total: state.retakeQueue.length }
      : null
  ))

  // Returns false when there is nothing flagged, so the caller can say so
  // rather than dropping the recordist into an empty recording screen.
  function startRetakePass() {
    const queue = flaggedIndices.value
    if (!queue.length) return false

    stopPlayback()
    state.retakeQueue = [...queue]
    state.retakeCursor = 0
    state.currentPhraseIndex = queue[0]
    state.currentPhase = 'recording'
    console.log(`[Autocue] Re-record pass over ${queue.length} flagged item(s):`, queue)
    return true
  }

  // Leaving the pass returns to review rather than the summary screen: the
  // recordist came FROM review and still has the rest of the pass to judge.
  function endRetakePass() {
    state.retakeQueue = []
    state.retakeCursor = 0
    state.currentPhase = 'review'
  }

  async function finalizeSession() {
    console.log('[Autocue] Finalizing session...')
    console.log('[Autocue] Approved:', [...state.approvedSegments])
    console.log('[Autocue] Flagged:', [...state.rejectedSegments])

    // Script mode already uploaded every take as it was captured, and the
    // latest take of each item is the live one. Re-POSTing the approved ones
    // here would upload the same bytes a second time — under `phrase.id`
    // ("script-7"), which is not the identity the server minted for them.
    // Approval in script mode is the recordist's own tick-list, not a gate.
    if (state.scriptMode) {
      console.log('[Autocue] Script mode — takes already uploaded; ending session')
      resetSession()
      return
    }

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
                text: phrase.text,
                voiceId: state.voiceId || null
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
    // Singleton state: a stale cap or a previous mount's error banner would
    // otherwise follow the user into a fresh session.
    state.maxSeed = null
    state.error = null
    state.currentPass = 1
    state.currentPhraseIndex = 0
    state.isRecording = false
    state.isPaused = false
    state.recordingStartTime = null
    state.elapsedSeconds = 0
    state.phrases = []
    state.recordedSegments = []
    // Blob URLs outlive their Map entry unless revoked — and a revoked URL is
    // exactly what makes a later play button silent, so revoke only here,
    // where the segments referencing them are dropped in the same breath.
    stopPlayback()
    state.audioRecordings.forEach((rec) => {
      if (rec?.url) URL.revokeObjectURL(rec.url)
    })
    state.audioRecordings.clear()
    state.approvedSegments.clear()
    state.rejectedSegments.clear()
    // Singleton state again: a half-finished re-record pass left in place would
    // hijack the next session's advance into a stale list of item indices.
    state.retakeQueue = []
    state.retakeCursor = 0
    state.reviewFilter = null
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

      // Fetch interleaved script from optimizer endpoint, capped to seeds
      // 1..maxSeed when the recorder link carried ?maxSeed=N. `role` scopes the
      // already-recorded pruning to THIS voice slot — without it a target2
      // recorder gets a script shortened by target1's takes.
      const params = new URLSearchParams()
      if (state.maxSeed) params.set('maxSeed', String(state.maxSeed))
      if (state.selectedRole) params.set('role', state.selectedRole)
      const query = params.toString() ? `?${params}` : ''
      const res = await fetch(
        `${baseUrl}/api/production/${courseCode}/recording-script${query}`,
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
        estimatedMinutes: data.estimatedMinutes,
        maxSeed: data.maxSeed ?? null
      }

      // Transform items to autocue phrase format
      // Target text only — no known-language hints on the autocue
      // `id` is a LOCAL key only (recordings map / segment tracking) — it is never
      // sent as an audio identity; the server mints the uuid per uploaded take.
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
        seedNumber: item.seedNumber ?? null,
        legoId: item.legoId || '',
        role: state.selectedRole || 'target1',
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
        state.courseName = getCourseName(courseCode)
        state.knownLanguage = course.known_lang || 'English'
        state.targetLanguage = course.target_lang || 'Unknown'
      }

      // An empty script is a real, expected outcome, not a loaded one: the
      // endpoint prunes items already recorded for this role, so re-running a
      // capped test batch that is finished returns 200 with zero items. Landing
      // that in script-loaded showed "0 / 0" behind a live Begin Recording
      // button. Give it its own phase so the UI can say what actually happened.
      const isEmpty = state.phrases.length === 0 &&
        !(data.totalPhrases > 0) && !(data.totalDirect > 0)

      state.currentPhase = isEmpty ? 'script-empty' : 'script-loaded'

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
        state.courseName = getCourseName(courseCode)
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
    setRecordingIdentity,
    setMaxSeed,
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
    playSegment,
    playAllSegments,
    stopPlayback,
    approveAllByConfidence,
    queueRedoByConfidence,
    setReviewFilter,
    clearReviewFilter,
    backToRecording,
    startRetakePass,
    endRetakePass,
    flaggedIndices,
    isRetakePass,
    retakeProgress,
    finalizeSession,
    resetSession,
    loadCourse,
    loadOptimizedScript,
    cleanup
  }
}
