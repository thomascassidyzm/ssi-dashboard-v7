import { ref, computed, onUnmounted } from 'vue'

/**
 * Script Player Composable - Event-Driven Pattern (v2.0)
 *
 * Ported from SimplePlayer.ts in ssi-learning-app.
 * Key improvements over v1:
 * - Single 'ended' listener attached once (no per-play listeners)
 * - onAudioEnded() callback drives all transitions (no async/await chains)
 * - isPlaying guard at start of every onAudioEnded() prevents race conditions
 * - Clean stop(): pause audio, clear src, clear timers — done
 *
 * 4-phase cycle: PROMPT → PAUSE → VOICE_1 → VOICE_2 → next item
 */
export function useScriptPlayer(options = {}) {
  // State
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentItem = ref(null)
  const currentPhase = ref(null) // 'prompt' | 'pause' | 'voice1' | 'voice2'
  const currentIndex = ref(0)
  const progress = ref(0)

  // Internal
  const items = ref([])
  let audio = null
  let pauseTimer = null
  let playbackGeneration = 0 // Incremented on every stop/playFrom to reject stale callbacks

  // Event callbacks
  const callbacks = { onItemChange: [], onPhaseChange: [], onComplete: [] }

  // URL resolver + cache
  //
  // Entries EXPIRE. A regen keeps the clip's row id and writes a new s3_key, so
  // a URL resolved before the regen still plays — the PRE-swap object, which
  // make-before-break leaves in the bucket for ever. Caching for ever against a
  // uuid that outlives its bytes is what made a regenerated clip audition
  // correctly in the edit modal and then play the old take in the round player
  // (Deborah, eus_for_eng, 2026-08-12). The signed URLs expire after an hour
  // anyway, so an unbounded cache was already handing out dead links on long
  // sessions. A short TTL self-heals both without per-phrase round-trips inside
  // a cycle; regenerating callers should also call forgetAudioUrl(uuid) to see
  // their own change immediately.
  const audioUrlResolver = options.audioUrlResolver || null
  const URL_CACHE_TTL_MS = 5 * 60 * 1000
  const resolvedUrlCache = new Map()

  /** Drop a clip's cached URL — call after regenerating that clip. */
  function forgetAudioUrl(uuid) {
    if (uuid) resolvedUrlCache.delete(uuid)
    else resolvedUrlCache.clear()
  }

  // Computed
  const totalItems = computed(() => items.value.length)
  const hasNextItem = computed(() => currentIndex.value < items.value.length - 1)
  const hasPrevItem = computed(() => currentIndex.value > 0)

  // ============================================================================
  // AUDIO HELPERS
  // ============================================================================

  function ensureAudio() {
    if (audio) return
    audio = new Audio()
    audio.addEventListener('ended', onAudioEnded)
    audio.addEventListener('error', (e) => {
      console.error('[ScriptPlayer] Audio error:', e)
      onAudioEnded() // Continue despite errors
    })
  }

  async function getAudioUrl(uuid) {
    if (!uuid) return null
    if (audioUrlResolver) {
      const hit = resolvedUrlCache.get(uuid)
      if (hit && Date.now() - hit.at < URL_CACHE_TTL_MS) return hit.url
      try {
        const url = await audioUrlResolver(uuid)
        if (url) resolvedUrlCache.set(uuid, { url, at: Date.now() })
        return url
      } catch (err) {
        console.warn('[ScriptPlayer] URL resolver failed for', uuid, err)
        return null
      }
    }
    // No resolver supplied — go through the s3_key-reading endpoint rather
    // than building `mastered/<uuid>.mp3` by convention. That convention
    // serves the PRE-SWAP object once a clip has been versioned, because the
    // swap keeps the row id and changes the s3_key.
    const base = import.meta.env.VITE_API_BASE_URL || ''
    return `${base}/api/production/audio/${uuid}/stream`
  }

  // ============================================================================
  // PHASE TRANSITIONS (event-driven, no async chains)
  // ============================================================================

  function getNextPhase() {
    const transitions = {
      prompt: 'pause',
      pause: 'voice1',
      voice1: 'voice2',
      voice2: null, // End of cycle
    }
    return transitions[currentPhase.value] || null
  }

  function onAudioEnded() {
    // Abort guard — if stopped mid-playback, do nothing
    if (!isPlaying.value) return

    const nextPhase = getNextPhase()
    if (nextPhase) {
      startPhase(nextPhase)
    } else {
      // Cycle complete — advance to next item
      advanceItem()
    }
  }

  async function startPhase(phase) {
    const gen = playbackGeneration // Capture generation for stale detection
    currentPhase.value = phase
    emitPhaseChange(phase)

    const item = currentItem.value
    if (!item) return

    switch (phase) {
      case 'prompt': {
        progress.value = 0
        if (item.sourceId) {
          const url = await getAudioUrl(item.sourceId)
          if (gen !== playbackGeneration) return // Stale — playback was restarted
          if (url) {
            playAudioSrc(url)
          } else {
            onAudioEnded()
          }
        } else {
          onAudioEnded()
        }
        break
      }

      case 'pause': {
        progress.value = 25
        clearPauseTimer()
        pauseTimer = setTimeout(() => {
          if (gen !== playbackGeneration) return // Stale
          if (isPlaying.value && !isPaused.value) {
            onAudioEnded()
          }
        }, 1000) // Fixed 1s for QA preview
        break
      }

      case 'voice1': {
        progress.value = 50
        if (item.target1Id) {
          const url = await getAudioUrl(item.target1Id)
          if (gen !== playbackGeneration) return // Stale
          if (url) {
            playAudioSrc(url)
          } else {
            onAudioEnded()
          }
        } else {
          onAudioEnded()
        }
        break
      }

      case 'voice2': {
        progress.value = 75
        const target2Id = item.target2Id || item.target1Id
        if (target2Id) {
          const url = await getAudioUrl(target2Id)
          if (gen !== playbackGeneration) return // Stale
          if (url) {
            playAudioSrc(url)
          } else {
            onAudioEnded()
          }
        } else {
          onAudioEnded()
        }
        break
      }
    }
  }

  function playAudioSrc(url) {
    if (!audio) return
    audio.src = url
    audio.play().catch((err) => {
      console.error('[ScriptPlayer] Play failed:', err)
      onAudioEnded()
    })
  }

  function advanceItem() {
    if (hasNextItem.value) {
      currentIndex.value++
      currentItem.value = items.value[currentIndex.value]
      progress.value = 0
      emitItemChange(currentItem.value)
      startPhase('prompt')
    } else {
      progress.value = 100
      stop()
      emitComplete()
    }
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  function playFrom(scriptItems, startIndex = 0) {
    if (!scriptItems || scriptItems.length === 0) return

    stop()
    ensureAudio()

    items.value = scriptItems
    currentIndex.value = Math.max(0, Math.min(startIndex, scriptItems.length - 1))
    currentItem.value = items.value[currentIndex.value]
    currentPhase.value = null
    progress.value = 0
    isPlaying.value = true
    isPaused.value = false

    emitItemChange(currentItem.value)
    startPhase('prompt')
  }

  function play() {
    if (!isPaused.value) return

    isPaused.value = false
    isPlaying.value = true

    if (currentPhase.value === 'pause') {
      // Restart the pause timer
      startPhase('pause')
    } else if (audio && audio.paused && audio.src) {
      audio.play().catch(err => {
        console.error('[ScriptPlayer] Resume failed:', err)
      })
    } else {
      startPhase(currentPhase.value || 'prompt')
    }
  }

  function pause() {
    if (!isPlaying.value) return

    isPaused.value = true
    isPlaying.value = false

    if (audio && !audio.paused) {
      audio.pause()
    }
    clearPauseTimer()
  }

  function stop() {
    playbackGeneration++ // Invalidate any in-flight async operations
    clearPauseTimer()

    isPlaying.value = false
    isPaused.value = false
    currentPhase.value = null
    progress.value = 0

    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
  }

  function skip() {
    if (!hasNextItem.value) {
      stop()
      emitComplete()
      return
    }

    // Stop current audio/timer without clearing playing state
    playbackGeneration++
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
    clearPauseTimer()

    currentIndex.value++
    currentItem.value = items.value[currentIndex.value]
    currentPhase.value = null
    progress.value = 0

    emitItemChange(currentItem.value)

    if (isPlaying.value && !isPaused.value) {
      startPhase('prompt')
    }
  }

  function previous() {
    if (!hasPrevItem.value) return

    playbackGeneration++
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
    clearPauseTimer()

    currentIndex.value--
    currentItem.value = items.value[currentIndex.value]
    currentPhase.value = null
    progress.value = 0

    emitItemChange(currentItem.value)

    if (isPlaying.value && !isPaused.value) {
      startPhase('prompt')
    }
  }

  function seekTo(index) {
    if (index < 0 || index >= items.value.length) return

    const wasPlaying = isPlaying.value && !isPaused.value
    stop()

    currentIndex.value = index
    currentItem.value = items.value[index]
    emitItemChange(currentItem.value)

    if (wasPlaying) {
      ensureAudio()
      isPlaying.value = true
      isPaused.value = false
      startPhase('prompt')
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  function clearPauseTimer() {
    if (pauseTimer) {
      clearTimeout(pauseTimer)
      pauseTimer = null
    }
  }

  function emitItemChange(item) {
    callbacks.onItemChange.forEach(cb => cb(item))
  }

  function emitPhaseChange(phase) {
    callbacks.onPhaseChange.forEach(cb => cb(phase))
  }

  function emitComplete() {
    callbacks.onComplete.forEach(cb => cb())
  }

  function onItemChange(callback) {
    callbacks.onItemChange.push(callback)
    return () => {
      const idx = callbacks.onItemChange.indexOf(callback)
      if (idx > -1) callbacks.onItemChange.splice(idx, 1)
    }
  }

  function onPhaseChange(callback) {
    callbacks.onPhaseChange.push(callback)
    return () => {
      const idx = callbacks.onPhaseChange.indexOf(callback)
      if (idx > -1) callbacks.onPhaseChange.splice(idx, 1)
    }
  }

  function onComplete(callback) {
    callbacks.onComplete.push(callback)
    return () => {
      const idx = callbacks.onComplete.indexOf(callback)
      if (idx > -1) callbacks.onComplete.splice(idx, 1)
    }
  }

  // Cleanup
  onUnmounted(() => {
    stop()
    if (audio) {
      audio.removeEventListener('ended', onAudioEnded)
      audio.pause()
      audio.src = ''
      audio = null
    }
  })

  return {
    // State
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
    previous,
    seekTo,
    forgetAudioUrl,

    // Event registration
    onItemChange,
    onPhaseChange,
    onComplete,
  }
}
