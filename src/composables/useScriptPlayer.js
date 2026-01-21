import { ref, computed, onUnmounted } from 'vue'

/**
 * Script Player Composable
 *
 * Manages continuous playback of script items through a 4-phase cycle:
 * 1. PROMPT - Play source audio (known language)
 * 2. PAUSE - Wait for learner response (2x target duration or 3s default)
 * 3. VOICE_1 - Play target1 audio
 * 4. VOICE_2 - Play target2 audio
 *
 * @returns {Object} Player state and control methods
 */
export function useScriptPlayer() {
  // ============================================================================
  // STATE
  // ============================================================================

  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentItem = ref(null)
  const currentPhase = ref(null) // 'prompt' | 'pause' | 'voice1' | 'voice2'
  const currentIndex = ref(0)
  const progress = ref(0) // 0-100 through current item

  // Internal state
  const items = ref([])
  const audioElement = ref(null)
  const targetAudioDuration = ref(3000) // Default 3s, updated when target audio loads

  // Timers
  let pauseTimer = null
  let pauseProgressInterval = null
  let progressUpdateInterval = null

  // Event callbacks
  const callbacks = {
    onItemChange: [],
    onPhaseChange: [],
    onComplete: []
  }

  // Audio API base URL
  const API_BASE_URL = getApiUrl()

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const totalItems = computed(() => items.value.length)
  const hasNextItem = computed(() => currentIndex.value < items.value.length - 1)
  const hasPrevItem = computed(() => currentIndex.value > 0)

  // ============================================================================
  // AUDIO HELPERS
  // ============================================================================

  /**
   * Get audio URL from UUID - direct S3 access (like learning app)
   */
  function getAudioUrl(uuid) {
    if (!uuid) return null
    // S3 bucket: ssi-audio-stage, prefix: mastered/, UUID must be uppercase
    return `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/${uuid.toUpperCase()}.mp3`
  }

  /**
   * Check if audio URL exists
   */
  function hasAudio(uuid) {
    return !!uuid && uuid.trim() !== ''
  }

  /**
   * Play audio and return a Promise that resolves when done
   */
  function playAudio(url) {
    return new Promise((resolve) => {
      if (!audioElement.value || !url) {
        console.warn('[ScriptPlayer] No audio element or URL')
        resolve()
        return
      }

      const onEnded = () => {
        cleanup()
        resolve()
      }

      const onError = (e) => {
        console.error('[ScriptPlayer] Audio playback error:', e)
        cleanup()
        resolve() // Resolve anyway to continue playback
      }

      const cleanup = () => {
        audioElement.value.removeEventListener('ended', onEnded)
        audioElement.value.removeEventListener('error', onError)
      }

      audioElement.value.addEventListener('ended', onEnded)
      audioElement.value.addEventListener('error', onError)

      audioElement.value.src = url
      audioElement.value.load()
      audioElement.value.play().catch(err => {
        console.error('[ScriptPlayer] Play failed:', err)
        cleanup()
        resolve()
      })
    })
  }

  /**
   * Preload audio to get duration
   */
  async function preloadTargetAudio(uuid) {
    if (!uuid) return

    const url = getAudioUrl(uuid)
    if (!url) return

    try {
      const tempAudio = new Audio()
      tempAudio.src = url

      await new Promise((resolve, reject) => {
        tempAudio.addEventListener('loadedmetadata', () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            targetAudioDuration.value = tempAudio.duration * 1000 // Convert to ms
          }
          resolve()
        })
        tempAudio.addEventListener('error', reject)
        tempAudio.load()

        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000)
      })
    } catch (err) {
      console.warn('[ScriptPlayer] Failed to preload target audio:', err)
    }
  }

  /**
   * Preload next item's audio in background
   */
  function preloadNextItem() {
    if (!hasNextItem.value) return

    const nextItem = items.value[currentIndex.value + 1]
    if (!nextItem) return

    // Preload target1 to get duration for pause calculation
    if (nextItem.target1Id) {
      preloadTargetAudio(nextItem.target1Id)
    }
  }

  // ============================================================================
  // PHASE PROGRESSION
  // ============================================================================

  /**
   * Update progress during audio playback
   */
  function startProgressTracking() {
    stopProgressTracking()

    progressUpdateInterval = setInterval(() => {
      if (!audioElement.value || audioElement.value.paused) return

      const duration = audioElement.value.duration
      const current = audioElement.value.currentTime

      if (!duration || isNaN(duration)) return

      // Calculate progress for current phase
      // Each phase is 25% of total item progress
      let phaseProgress = 0

      switch (currentPhase.value) {
        case 'prompt':
          phaseProgress = (current / duration) * 25
          break
        case 'voice1':
          phaseProgress = 50 + (current / duration) * 25
          break
        case 'voice2':
          phaseProgress = 75 + (current / duration) * 25
          break
      }

      progress.value = Math.min(phaseProgress, 100)
    }, 50)
  }

  function stopProgressTracking() {
    if (progressUpdateInterval) {
      clearInterval(progressUpdateInterval)
      progressUpdateInterval = null
    }
  }

  /**
   * Start pause timer with progress updates
   */
  function startPausePhase() {
    currentPhase.value = 'pause'
    emitPhaseChange('pause')

    const pauseDuration = targetAudioDuration.value * 2 // 2x target audio duration
    const startTime = Date.now()

    // Base progress at 25% (after prompt phase)
    const baseProgress = 25

    pauseProgressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pausePercent = Math.min(elapsed / pauseDuration, 1)
      progress.value = baseProgress + (pausePercent * 25) // Pause is 25% of total
    }, 50)

    pauseTimer = setTimeout(() => {
      clearInterval(pauseProgressInterval)
      pauseProgressInterval = null

      if (isPlaying.value && !isPaused.value) {
        moveToNextPhase()
      }
    }, pauseDuration)
  }

  /**
   * Move to the next phase in the cycle
   */
  async function moveToNextPhase() {
    const item = currentItem.value
    if (!item) return

    switch (currentPhase.value) {
      case null:
      case 'voice2': // Coming from previous item
        // Start PROMPT phase
        currentPhase.value = 'prompt'
        emitPhaseChange('prompt')
        progress.value = 0

        if (hasAudio(item.sourceId)) {
          startProgressTracking()
          await playAudio(getAudioUrl(item.sourceId))
          stopProgressTracking()
        }

        if (isPlaying.value && !isPaused.value) {
          startPausePhase()
        }
        break

      case 'prompt':
        // Already handled by startPausePhase
        break

      case 'pause':
        // Move to VOICE_1 phase
        currentPhase.value = 'voice1'
        emitPhaseChange('voice1')
        progress.value = 50

        if (hasAudio(item.target1Id)) {
          startProgressTracking()
          await playAudio(getAudioUrl(item.target1Id))
          stopProgressTracking()
        }

        if (isPlaying.value && !isPaused.value) {
          moveToNextPhase()
        }
        break

      case 'voice1':
        // Move to VOICE_2 phase
        currentPhase.value = 'voice2'
        emitPhaseChange('voice2')
        progress.value = 75

        const target2Id = item.target2Id || item.target1Id // Fallback to target1 if no target2

        if (hasAudio(target2Id)) {
          startProgressTracking()
          await playAudio(getAudioUrl(target2Id))
          stopProgressTracking()
        }

        progress.value = 100

        if (isPlaying.value && !isPaused.value) {
          // Item complete, move to next item
          if (hasNextItem.value) {
            skip() // Move to next item
          } else {
            // Course complete
            stop()
            emitComplete()
          }
        }
        break
    }
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  /**
   * Start playback from a specific index
   */
  async function playFrom(scriptItems, startIndex = 0) {
    if (!scriptItems || scriptItems.length === 0) {
      console.warn('[ScriptPlayer] No items to play')
      return
    }

    // Initialize audio element if needed
    if (!audioElement.value) {
      audioElement.value = new Audio()
    }

    items.value = scriptItems
    currentIndex.value = Math.max(0, Math.min(startIndex, scriptItems.length - 1))
    currentItem.value = items.value[currentIndex.value]
    currentPhase.value = null
    progress.value = 0
    isPlaying.value = true
    isPaused.value = false

    emitItemChange(currentItem.value)

    // Preload target audio to get duration
    if (currentItem.value.target1Id) {
      await preloadTargetAudio(currentItem.value.target1Id)
    }

    // Start playback from PROMPT phase
    moveToNextPhase()

    // Preload next item
    preloadNextItem()
  }

  /**
   * Resume playback if paused
   */
  function play() {
    if (!isPaused.value) {
      console.warn('[ScriptPlayer] Already playing')
      return
    }

    isPaused.value = false
    isPlaying.value = true

    // Resume from current phase
    if (audioElement.value && audioElement.value.paused) {
      audioElement.value.play().catch(err => {
        console.error('[ScriptPlayer] Resume failed:', err)
      })
    } else {
      // Restart current phase if not in audio playback
      moveToNextPhase()
    }
  }

  /**
   * Pause playback
   */
  function pause() {
    if (!isPlaying.value) return

    isPaused.value = true
    isPlaying.value = false

    // Pause audio
    if (audioElement.value && !audioElement.value.paused) {
      audioElement.value.pause()
    }

    // Pause timers
    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
    if (pauseProgressInterval) {
      clearInterval(pauseProgressInterval)
      pauseProgressInterval = null
    }

    stopProgressTracking()
  }

  /**
   * Stop playback completely
   */
  function stop() {
    isPlaying.value = false
    isPaused.value = false
    currentPhase.value = null
    progress.value = 0

    // Stop audio
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.currentTime = 0
    }

    // Clear timers
    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
    if (pauseProgressInterval) {
      clearInterval(pauseProgressInterval)
      pauseProgressInterval = null
    }

    stopProgressTracking()
  }

  /**
   * Skip to next item
   */
  function skip() {
    if (!hasNextItem.value) {
      stop()
      emitComplete()
      return
    }

    // Stop current playback
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.currentTime = 0
    }

    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
    if (pauseProgressInterval) {
      clearInterval(pauseProgressInterval)
      pauseProgressInterval = null
    }

    stopProgressTracking()

    // Move to next item
    currentIndex.value++
    currentItem.value = items.value[currentIndex.value]
    currentPhase.value = null
    progress.value = 0

    emitItemChange(currentItem.value)

    // Preload target audio
    if (currentItem.value.target1Id) {
      preloadTargetAudio(currentItem.value.target1Id)
    }

    // Continue playback if playing
    if (isPlaying.value && !isPaused.value) {
      moveToNextPhase()
    }

    // Preload next item
    preloadNextItem()
  }

  /**
   * Jump to specific item index
   */
  async function seekTo(index) {
    if (index < 0 || index >= items.value.length) {
      console.warn('[ScriptPlayer] Invalid index:', index)
      return
    }

    const wasPlaying = isPlaying.value && !isPaused.value

    // Stop current playback
    stop()

    // Update position
    currentIndex.value = index
    currentItem.value = items.value[index]

    emitItemChange(currentItem.value)

    // Preload target audio
    if (currentItem.value.target1Id) {
      await preloadTargetAudio(currentItem.value.target1Id)
    }

    // Resume if was playing
    if (wasPlaying) {
      isPlaying.value = true
      isPaused.value = false
      moveToNextPhase()
    }

    // Preload next item
    preloadNextItem()
  }

  // ============================================================================
  // EVENT EMITTERS
  // ============================================================================

  function emitItemChange(item) {
    callbacks.onItemChange.forEach(cb => cb(item))
  }

  function emitPhaseChange(phase) {
    callbacks.onPhaseChange.forEach(cb => cb(phase))
  }

  function emitComplete() {
    callbacks.onComplete.forEach(cb => cb())
  }

  // ============================================================================
  // EVENT REGISTRATION
  // ============================================================================

  function onItemChange(callback) {
    callbacks.onItemChange.push(callback)
    // Return unregister function
    return () => {
      const index = callbacks.onItemChange.indexOf(callback)
      if (index > -1) {
        callbacks.onItemChange.splice(index, 1)
      }
    }
  }

  function onPhaseChange(callback) {
    callbacks.onPhaseChange.push(callback)
    return () => {
      const index = callbacks.onPhaseChange.indexOf(callback)
      if (index > -1) {
        callbacks.onPhaseChange.splice(index, 1)
      }
    }
  }

  function onComplete(callback) {
    callbacks.onComplete.push(callback)
    return () => {
      const index = callbacks.onComplete.indexOf(callback)
      if (index > -1) {
        callbacks.onComplete.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  onUnmounted(() => {
    stop()

    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.src = ''
      audioElement.value = null
    }
  })

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    // State (reactive refs)
    isPlaying,
    isPaused,
    currentItem,
    currentPhase,
    currentIndex,
    progress,
    totalItems,
    hasNextItem,
    hasPrevItem,

    // Methods
    playFrom,
    play,
    pause,
    stop,
    skip,
    seekTo,

    // Event registration
    onItemChange,
    onPhaseChange,
    onComplete
  }
}
