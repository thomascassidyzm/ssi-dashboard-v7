<template>
  <div class="autocue-viewer" :class="{ 'is-playing': isPlaying }">
    <!-- Compact Controls Bar -->
    <div class="controls-bar">
      <div class="controls-left">
        <label class="seed-label">Seeds:</label>
        <input
          v-model.number="startSeed"
          type="number"
          min="1"
          max="668"
          class="seed-input"
        />
        <span class="seed-divider">to</span>
        <input
          v-model.number="endSeed"
          type="number"
          min="1"
          max="668"
          class="seed-input"
        />
        <button
          @click="generateScript"
          :disabled="loading"
          class="generate-btn"
        >
          {{ loading ? 'Loading...' : 'Generate' }}
        </button>
      </div>
      <div v-if="scriptItems.length" class="controls-right">
        {{ scriptItems.length }} cycles • {{ estimatedDuration }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Generating script...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>

    <!-- Autocue Script Display -->
    <div
      v-else-if="scriptItems.length"
      ref="scriptContainer"
      class="autocue-container"
    >
      <!-- Gradient overlays for depth -->
      <div class="gradient-top"></div>
      <div class="gradient-bottom"></div>

      <!-- Script items - teleprompter style -->
      <div class="script-track" :style="trackStyle">
        <div
          v-for="(item, index) in scriptItems"
          :key="item.uuid"
          :ref="el => setItemRef(el, index)"
          :class="[
            'script-line',
            getLineState(index)
          ]"
          @click="jumpToItem(index)"
        >
          <!-- Line meta: code and type -->
          <div class="line-meta">
            <span class="line-code">{{ item.seedCode || `S${String(item.seedNum || index + 1).padStart(4, '0')}` }}{{ item.legoCode ? `L${String(item.legoCode).padStart(2, '0')}` : '' }}</span>
            <span :class="['line-type', item.type]">{{ getTypeLabel(item.type) }}</span>
            <span v-if="item.isNew === false" class="review-badge">rev</span>
          </div>

          <!-- Main content - known : target side by side with inline phase dots -->
          <div class="line-content">
            <span class="known-text" :class="{ active: currentIndex === index && currentPhase === 'prompt' }">{{ item.knownText }}</span>
            <span class="separator">:</span>
            <span class="target-text" :class="{
              'voice1': currentIndex === index && currentPhase === 'voice1',
              'voice2': currentIndex === index && currentPhase === 'voice2'
            }">{{ item.targetText }}</span>
            <!-- Inline phase dots -->
            <span v-if="currentIndex === index" class="phase-dots-inline">
              <span :class="['dot', { active: currentPhase === 'prompt' }]"></span>
              <span :class="['dot pause', { active: currentPhase === 'pause' }]"></span>
              <span :class="['dot', { active: currentPhase === 'voice1' }]"></span>
              <span :class="['dot', { active: currentPhase === 'voice2' }]"></span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📜</div>
      <div class="empty-text">Select seed range and click Generate</div>
      <div class="empty-subtext">Preview the complete learning sequence</div>
    </div>

    <!-- Floating Playback Controls -->
    <div v-if="scriptItems.length" class="playback-controls">
      <button
        @click="previousItem"
        :disabled="currentIndex <= 0"
        class="control-btn nav-btn"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>

      <button
        @click="togglePlayback"
        class="control-btn play-btn"
      >
        <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <button
        @click="nextItem"
        :disabled="currentIndex >= scriptItems.length - 1"
        class="control-btn nav-btn"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>

      <div class="progress-indicator">
        {{ currentIndex + 1 }} / {{ scriptItems.length }}
      </div>

      <!-- Phase dots -->
      <div class="phase-dots">
        <div :class="['dot', { active: currentPhase === 'prompt' }]" title="Prompt"></div>
        <div :class="['dot', { active: currentPhase === 'pause' }]" title="Pause"></div>
        <div :class="['dot', { active: currentPhase === 'voice1' }]" title="Voice 1"></div>
        <div :class="['dot', { active: currentPhase === 'voice2' }]" title="Voice 2"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { baseURL } from '@/services/api'

export default {
  name: 'CourseScriptViewer',
  props: {
    courseCode: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      startSeed: 1,
      endSeed: 5,
      loading: false,
      error: null,
      scriptItems: [],
      currentIndex: 0,
      currentPhase: null,
      isPlaying: false,
      audio: null,
      phaseTimer: null,
      itemRefs: {},
      // Lazy loading: track which audio batches have been preloaded
      preloadedBatches: new Set(),
      preloadBatchSize: 10,
      audioCache: new Map()
    }
  },
  computed: {
    estimatedDuration() {
      const totalSeconds = this.scriptItems.length * 10
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `~${minutes}:${String(seconds).padStart(2, '0')}`
    },
    trackStyle() {
      // No transform needed - we use scrollIntoView instead
      return {}
    }
  },
  methods: {
    setItemRef(el, index) {
      if (el) {
        this.itemRefs[index] = el
      }
    },

    async generateScript() {
      if (!this.courseCode || !this.startSeed || !this.endSeed) {
        this.error = 'Please provide valid seed range'
        return
      }

      this.loading = true
      this.error = null
      this.scriptItems = []
      this.currentIndex = 0
      this.currentPhase = null
      this.stopPlayback()
      // Reset lazy loading state
      this.preloadedBatches = new Set()
      this.audioCache = new Map()

      try {
        const response = await fetch(
          `${baseURL}/api/courses/${this.courseCode}/script?startSeed=${this.startSeed}&endSeed=${this.endSeed}`,
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        this.scriptItems = data.items || []
        console.log(`[ScriptViewer] Loaded ${this.scriptItems.length} items`)

        // Immediately preload first batch of audio
        if (this.scriptItems.length > 0) {
          this.preloadBatch(0)
        }
      } catch (err) {
        console.error('[ScriptViewer] Error:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    getLineState(index) {
      if (index === this.currentIndex) return 'current'
      if (index < this.currentIndex) return 'past'
      return 'future'
    },

    getTypeLabel(type) {
      const labels = {
        introduction: 'INTRO',
        component: 'COMP',
        debut: 'DEBUT',
        practice: 'PRAC',
        review: 'REV'
      }
      return labels[type] || type?.toUpperCase() || '—'
    },

    jumpToItem(index) {
      this.currentIndex = index
      this.currentPhase = null
      this.scrollToCurrentItem()
      // Preload this batch if user jumps ahead
      const batch = Math.floor(index / this.preloadBatchSize)
      this.preloadBatch(batch)
    },

    scrollToCurrentItem() {
      this.$nextTick(() => {
        const el = this.itemRefs[this.currentIndex]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },

    togglePlayback() {
      if (this.isPlaying) {
        this.stopPlayback()
      } else {
        this.startPlayback()
      }
    },

    async startPlayback() {
      if (!this.scriptItems.length) return

      this.isPlaying = true

      if (!this.audio) {
        this.audio = new Audio()
      }

      await this.playCycle()
    },

    stopPlayback() {
      this.isPlaying = false
      this.currentPhase = null

      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
        this.phaseTimer = null
      }

      if (this.audio) {
        this.audio.pause()
        this.audio.currentTime = 0
      }
    },

    // Preload audio for a batch of cycles (lazy loading)
    async preloadBatch(batchIndex) {
      if (this.preloadedBatches.has(batchIndex)) {
        return // Already preloaded
      }

      this.preloadedBatches.add(batchIndex)

      const startIdx = batchIndex * this.preloadBatchSize
      const endIdx = Math.min(startIdx + this.preloadBatchSize, this.scriptItems.length)

      console.log(`[ScriptViewer] Preloading batch ${batchIndex}: cycles ${startIdx + 1}-${endIdx}`)

      // Collect all UUIDs for this batch
      const uuids = []
      for (let i = startIdx; i < endIdx; i++) {
        const item = this.scriptItems[i]
        if (item.sourceId) uuids.push(item.sourceId)
        if (item.target1Id) uuids.push(item.target1Id)
        if (item.target2Id) uuids.push(item.target2Id)
      }

      // Preload each audio file (don't wait for all - just start the requests)
      for (const uuid of uuids) {
        if (!this.audioCache.has(uuid)) {
          const audio = new Audio()
          audio.preload = 'auto'
          audio.src = `${baseURL}/api/audio/stream/${uuid}`
          this.audioCache.set(uuid, audio)
        }
      }
    },

    async playCycle() {
      if (!this.isPlaying || this.currentIndex >= this.scriptItems.length) {
        this.stopPlayback()
        return
      }

      // Lazy load: preload current batch and next batch
      const currentBatch = Math.floor(this.currentIndex / this.preloadBatchSize)
      await this.preloadBatch(currentBatch)
      // Preload next batch in advance
      if ((this.currentIndex + 1) % this.preloadBatchSize === 0) {
        this.preloadBatch(currentBatch + 1)
      }

      const item = this.scriptItems[this.currentIndex]
      this.scrollToCurrentItem()

      // Phase 1: PROMPT
      this.currentPhase = 'prompt'
      if (item.sourceId) {
        await this.playAudio(item.sourceId)
      } else {
        await this.wait(1500)
      }

      if (!this.isPlaying) return

      // Phase 2: PAUSE (2s default)
      this.currentPhase = 'pause'
      await this.wait(2000)

      if (!this.isPlaying) return

      // Phase 3: VOICE_1
      this.currentPhase = 'voice1'
      if (item.target1Id) {
        await this.playAudio(item.target1Id)
      } else {
        await this.wait(1500)
      }

      if (!this.isPlaying) return

      // Phase 4: VOICE_2
      this.currentPhase = 'voice2'
      if (item.target2Id) {
        await this.playAudio(item.target2Id)
      } else {
        await this.wait(1500)
      }

      if (!this.isPlaying) return

      // Move to next
      this.currentIndex++
      this.currentPhase = null

      // 2s gap between cycles
      await this.wait(2000)

      if (this.isPlaying && this.currentIndex < this.scriptItems.length) {
        this.playCycle()
      } else {
        this.stopPlayback()
      }
    },

    playAudio(uuid) {
      return new Promise((resolve) => {
        if (!uuid) {
          resolve()
          return
        }

        // Use cached audio element if available, otherwise use the main audio element
        let audioElement = this.audioCache.get(uuid)
        if (!audioElement) {
          // Fallback to main audio if not cached
          audioElement = this.audio
          if (!audioElement) {
            resolve()
            return
          }
          audioElement.src = `${baseURL}/api/audio/stream/${uuid}`
        }

        const onEnded = () => {
          audioElement.removeEventListener('ended', onEnded)
          audioElement.removeEventListener('error', onError)
          // Reset cached audio for potential replay
          audioElement.currentTime = 0
          resolve()
        }

        const onError = () => {
          console.warn('[ScriptViewer] Audio error for', uuid)
          audioElement.removeEventListener('ended', onEnded)
          audioElement.removeEventListener('error', onError)
          resolve()
        }

        audioElement.addEventListener('ended', onEnded)
        audioElement.addEventListener('error', onError)

        audioElement.currentTime = 0
        audioElement.play().catch(() => {
          onError()
        })
      })
    },

    wait(ms) {
      return new Promise(resolve => {
        this.phaseTimer = setTimeout(resolve, ms)
      })
    },

    previousItem() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.currentPhase = null
        this.scrollToCurrentItem()
      }
    },

    nextItem() {
      if (this.currentIndex < this.scriptItems.length - 1) {
        this.currentIndex++
        this.currentPhase = null
        this.scrollToCurrentItem()
      }
    }
  },

  beforeUnmount() {
    this.stopPlayback()
    if (this.audio) {
      this.audio.src = ''
      this.audio = null
    }
    // Clean up cached audio elements
    if (this.audioCache) {
      for (const audio of this.audioCache.values()) {
        audio.src = ''
      }
      this.audioCache.clear()
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.autocue-viewer {
  --bg-dark: #0a0a0a;
  --bg-surface: #141414;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #10b981;
  --accent-glow: rgba(16, 185, 129, 0.3);

  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-dark);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Controls Bar - Minimal */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid #222;
  position: sticky;
  top: 0;
  z-index: 100;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seed-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.seed-input {
  width: 60px;
  padding: 6px 10px;
  background: var(--bg-dark);
  border: 1px solid #333;
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
}

.seed-input:focus {
  outline: none;
  border-color: var(--accent);
}

.seed-divider {
  color: var(--text-muted);
  font-size: 12px;
}

.generate-btn {
  padding: 6px 16px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover {
  background: #0ea571;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.controls-right {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #333;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  padding: 40px;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
}

.empty-subtext {
  font-size: 14px;
  color: var(--text-muted);
}

/* Autocue Container - The main teleprompter view */
.autocue-container {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

/* Gradient overlays for depth effect */
.gradient-top,
.gradient-bottom {
  position: fixed;
  left: 0;
  right: 0;
  height: 120px;
  pointer-events: none;
  z-index: 10;
}

.gradient-top {
  top: 48px;
  background: linear-gradient(to bottom, var(--bg-dark) 0%, transparent 100%);
}

.gradient-bottom {
  bottom: 80px;
  background: linear-gradient(to top, var(--bg-dark) 0%, transparent 100%);
}

/* Script Track */
.script-track {
  padding: 20vh 0;
  max-width: 900px;
  margin: 0 auto;
}

/* Individual Script Lines - compact */
.script-line {
  padding: 10px 20px;
  margin: 2px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.script-line.past {
  opacity: 0.25;
  transform: scale(0.95);
}

.script-line.future {
  opacity: 0.4;
}

.script-line.current {
  opacity: 1;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  transform: scale(1);
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.1);
}

.script-line:hover:not(.current) {
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.02);
}

/* Line Meta - compact */
.line-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.line-code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.line-type {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

.line-type.introduction { background: #7c3aed20; color: #a78bfa; }
.line-type.component { background: #3b82f620; color: #60a5fa; }
.line-type.debut { background: #f59e0b20; color: #fbbf24; }
.line-type.practice { background: #10b98120; color: #34d399; }
.line-type.review { background: #06b6d420; color: #22d3ee; }

.review-badge {
  font-size: 9px;
  color: #06b6d4;
  font-style: italic;
}

/* Line Content - horizontal layout */
.line-content {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.known-text {
  font-size: 18px;
  font-weight: 400;
  color: var(--text-secondary);
  line-height: 1.3;
  transition: all 0.2s;
}

.known-text.active {
  color: var(--text-primary);
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
}

.separator {
  font-size: 18px;
  color: var(--text-muted);
}

.target-text {
  font-size: 19px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.3;
  transition: all 0.2s;
  opacity: 0.35;
}

/* Voice 1 - slightly brighter */
.target-text.voice1 {
  opacity: 0.6;
}

/* Voice 2 - full brightness, purple tint */
.target-text.voice2 {
  opacity: 1;
  color: #a78bfa;
  text-shadow: 0 0 16px rgba(167, 139, 250, 0.4);
}

/* Current line - boost visibility */
.script-line.current .known-text {
  color: rgba(255, 255, 255, 0.95);
}

.script-line.current .target-text {
  opacity: 0.5;
}

/* Inline Phase Dots */
.phase-dots-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}

.phase-dots-inline .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #333;
  transition: all 0.2s;
}

.phase-dots-inline .dot.active {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent-glow);
}

.phase-dots-inline .dot.pause.active {
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.4);
}

/* Playback Controls */
.playback-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(to top, var(--bg-dark) 0%, rgba(10, 10, 10, 0.95) 100%);
  border-top: 1px solid #222;
  z-index: 100;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn {
  width: 40px;
  height: 40px;
  background: #222;
  border-radius: 50%;
  color: var(--text-secondary);
}

.nav-btn:hover:not(:disabled) {
  background: #333;
  color: var(--text-primary);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-btn svg {
  width: 20px;
  height: 20px;
}

.play-btn {
  width: 56px;
  height: 56px;
  background: var(--accent);
  border-radius: 50%;
  color: white;
}

.play-btn:hover {
  background: #0ea571;
  transform: scale(1.05);
  box-shadow: 0 0 24px var(--accent-glow);
}

.play-btn svg {
  width: 28px;
  height: 28px;
}

.progress-indicator {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

.phase-dots {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.phase-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333;
  transition: all 0.2s;
}

.phase-dots .dot.active {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
  transform: scale(1.3);
}

/* Custom Scrollbar */
.autocue-container::-webkit-scrollbar {
  width: 4px;
}

.autocue-container::-webkit-scrollbar-track {
  background: transparent;
}

.autocue-container::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

.autocue-container::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* Playing state glow */
.autocue-viewer.is-playing .script-line.current {
  box-shadow: 0 0 60px rgba(16, 185, 129, 0.15);
}
</style>
