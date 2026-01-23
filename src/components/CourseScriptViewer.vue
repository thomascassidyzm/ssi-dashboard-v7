<template>
  <div class="journey-viewer" :class="{ 'is-playing': isPlaying }">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="noise-overlay"></div>
    </div>

    <!-- Header Console -->
    <header class="console-header">
      <div class="console-brand">
        <span class="brand-icon">◈</span>
        <span class="brand-text">JOURNEY</span>
      </div>
      <div class="console-controls">
        <div class="seed-range">
          <span class="range-label">SEEDS</span>
          <input
            v-model.number="startSeed"
            type="number"
            min="1"
            max="668"
            class="range-input"
          />
          <span class="range-sep">→</span>
          <input
            v-model.number="endSeed"
            type="number"
            min="1"
            max="668"
            class="range-input"
          />
        </div>
        <button
          @click="generateScript"
          :disabled="loading"
          class="launch-btn"
        >
          <span class="btn-text">{{ loading ? 'LOADING' : 'LAUNCH' }}</span>
          <span class="btn-glow"></span>
        </button>
      </div>
      <div v-if="scriptItems.length" class="console-stats">
        <div class="stat">
          <span class="stat-value">{{ scriptItems.length }}</span>
          <span class="stat-label">cycles</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ estimatedDuration }}</span>
          <span class="stat-label">duration</span>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="pulse-ring"></div>
      <div class="pulse-ring delay-1"></div>
      <div class="pulse-ring delay-2"></div>
      <span class="loading-text">Mapping journey...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠</span>
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- Journey Timeline -->
    <div
      v-else-if="scriptItems.length"
      ref="scriptContainer"
      class="timeline-container"
    >
      <!-- Fade overlays -->
      <div class="fade-top"></div>
      <div class="fade-bottom"></div>

      <!-- Timeline track -->
      <div class="timeline-track">
        <!-- Timeline spine -->
        <div class="timeline-spine">
          <div class="spine-progress" :style="{ height: progressHeight }"></div>
        </div>

        <!-- Waypoints -->
        <div
          v-for="(item, index) in scriptItems"
          :key="item.uuid"
          :ref="el => setItemRef(el, index)"
          :class="['waypoint', getLineState(index)]"
          @click="jumpToItem(index)"
        >
          <!-- Waypoint marker -->
          <div class="waypoint-marker">
            <div class="marker-dot" :class="{ pulse: currentIndex === index && isPlaying }"></div>
            <div v-if="currentIndex === index" class="marker-ring"></div>
          </div>

          <!-- Waypoint content -->
          <div class="waypoint-content">
            <div class="waypoint-meta">
              <span class="meta-code">{{ item.seedCode || `S${String(item.seedNum || index + 1).padStart(4, '0')}` }}{{ item.legoCode ? `·L${item.legoCode}` : '' }}</span>
              <span :class="['meta-type', item.type]">{{ getTypeLabel(item.type) }}</span>
            </div>
            <div class="waypoint-phrases">
              <span class="phrase-known" :class="{ active: currentIndex === index && currentPhase === 'prompt' }">{{ item.knownText }}</span>
              <span class="phrase-arrow">→</span>
              <span class="phrase-target" :class="{
                'voice1': currentIndex === index && currentPhase === 'voice1',
                'voice2': currentIndex === index && currentPhase === 'voice2'
              }">{{ item.targetText }}</span>
            </div>
            <!-- Phase indicators -->
            <div v-if="currentIndex === index" class="phase-strip">
              <div :class="['phase-segment', { active: currentPhase === 'prompt' }]">
                <span class="phase-icon">◉</span>
                <span class="phase-name">PROMPT</span>
              </div>
              <div :class="['phase-segment pause', { active: currentPhase === 'pause' }]">
                <span class="phase-icon">⏸</span>
                <span class="phase-name">THINK</span>
              </div>
              <div :class="['phase-segment', { active: currentPhase === 'voice1' }]">
                <span class="phase-icon">◉</span>
                <span class="phase-name">VOICE 1</span>
              </div>
              <div :class="['phase-segment', { active: currentPhase === 'voice2' }]">
                <span class="phase-icon">◉</span>
                <span class="phase-name">VOICE 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-visual">
        <div class="empty-orbit">
          <div class="orbit-dot"></div>
        </div>
        <div class="empty-center">◈</div>
      </div>
      <h2 class="empty-title">Begin Your Journey</h2>
      <p class="empty-subtitle">Select a seed range and launch to preview the learning path</p>
    </div>

    <!-- Floating Transport -->
    <div v-if="scriptItems.length" class="transport-bar">
      <div class="transport-inner">
        <button
          @click="previousItem"
          :disabled="currentIndex <= 0"
          class="transport-btn"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>

        <button
          @click="togglePlayback"
          class="transport-btn play"
          :class="{ playing: isPlaying }"
        >
          <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <div class="play-glow"></div>
        </button>

        <button
          @click="nextItem"
          :disabled="currentIndex >= scriptItems.length - 1"
          class="transport-btn"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>

        <div class="transport-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${(currentIndex / (scriptItems.length - 1)) * 100}%` }"></div>
          </div>
          <span class="progress-text">{{ currentIndex + 1 }} / {{ scriptItems.length }}</span>
        </div>
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
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    },
    progressHeight() {
      if (!this.scriptItems.length) return '0%'
      return `${(this.currentIndex / (this.scriptItems.length - 1)) * 100}%`
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
      this.preloadedBatches = new Set()
      this.audioCache = new Map()

      try {
        // Query Supabase directly - no backend middleware needed
        const { generateLearningScript } = await import('../services/supabase.js')
        const result = await generateLearningScript(this.courseCode, this.startSeed, this.endSeed)

        this.scriptItems = result.items || []
        console.log(`[ScriptViewer] Loaded ${this.scriptItems.length} items (direct from Supabase)`)

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
        intro: 'INTRO',           // LEGO introduction/presentation
        debut: 'DEBUT',           // LEGO itself (known → target)
        build: 'BUILD',           // BUILD phrases (drilling, SHORT→MEDIUM)
        spaced_rep: 'USE',        // USE phrases from older LEGOs (spaced rep)
        use: 'USE',               // USE phrases for current LEGO (consolidation)
        // Legacy types
        debut_phrase: 'BUILD',
        consolidation: 'USE',
        component: 'COMP',
        practice: 'BUILD',
        review: 'USE'
      }
      return labels[type] || type?.toUpperCase() || '—'
    },

    jumpToItem(index) {
      this.currentIndex = index
      this.currentPhase = null
      this.scrollToCurrentItem()
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

    async preloadBatch(batchIndex) {
      if (this.preloadedBatches.has(batchIndex)) {
        return
      }

      this.preloadedBatches.add(batchIndex)

      const startIdx = batchIndex * this.preloadBatchSize
      const endIdx = Math.min(startIdx + this.preloadBatchSize, this.scriptItems.length)

      console.log(`[ScriptViewer] Preloading batch ${batchIndex}: cycles ${startIdx + 1}-${endIdx}`)

      const uuids = []
      for (let i = startIdx; i < endIdx; i++) {
        const item = this.scriptItems[i]
        if (item.sourceId) uuids.push(item.sourceId)
        if (item.target1Id) uuids.push(item.target1Id)
        if (item.target2Id) uuids.push(item.target2Id)
      }

      for (const uuid of uuids) {
        if (!this.audioCache.has(uuid)) {
          const audio = new Audio()
          audio.preload = 'auto'
          audio.src = `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/${uuid.toUpperCase()}.mp3`
          this.audioCache.set(uuid, audio)
        }
      }
    },

    async playCycle() {
      if (!this.isPlaying || this.currentIndex >= this.scriptItems.length) {
        this.stopPlayback()
        return
      }

      const currentBatch = Math.floor(this.currentIndex / this.preloadBatchSize)
      await this.preloadBatch(currentBatch)
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

      // Phase 2: PAUSE
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

        let audioElement = this.audioCache.get(uuid)
        if (!audioElement) {
          audioElement = this.audio
          if (!audioElement) {
            resolve()
            return
          }
          audioElement.src = `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/${uuid.toUpperCase()}.mp3`
        }

        const onEnded = () => {
          audioElement.removeEventListener('ended', onEnded)
          audioElement.removeEventListener('error', onError)
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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&display=swap');

.journey-viewer {
  --void: #030305;
  --surface: #0a0a0f;
  --surface-elevated: #12121a;
  --line: #1a1a24;
  --text-bright: #f0f0f5;
  --text-dim: #6a6a7a;
  --text-muted: #3a3a4a;
  --accent: #00ffc8;
  --accent-glow: rgba(0, 255, 200, 0.15);
  --accent-soft: rgba(0, 255, 200, 0.08);
  --voice2: #c4a7ff;
  --voice2-glow: rgba(196, 167, 255, 0.2);
  --pause: #ffd700;

  font-family: 'JetBrains Mono', monospace;
  background: var(--void);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.4;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation: float 20s ease-in-out infinite;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--voice2-glow) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
  animation: float 25s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -30px); }
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
}

/* Console Header */
.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  position: relative;
  z-index: 100;
}

.console-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 20px;
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent-glow);
}

.brand-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--text-dim);
}

.console-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.seed-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.range-input {
  width: 56px;
  padding: 8px 10px;
  background: var(--void);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text-bright);
  font-family: inherit;
  font-size: 12px;
  text-align: center;
  transition: all 0.2s;
}

.range-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.range-sep {
  color: var(--text-muted);
  font-size: 14px;
}

.launch-btn {
  position: relative;
  padding: 10px 24px;
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--accent);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
}

.launch-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--void);
  box-shadow: 0 0 30px var(--accent-glow);
}

.launch-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
  transform: translateX(-100%);
}

.launch-btn:hover .btn-glow {
  animation: shimmer 1s ease-in-out;
}

@keyframes shimmer {
  to { transform: translateX(100%); }
}

.console-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-value {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-bright);
}

.stat-label {
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  position: relative;
}

.pulse-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  animation: pulse-out 2s ease-out infinite;
}

.pulse-ring.delay-1 { animation-delay: 0.4s; }
.pulse-ring.delay-2 { animation-delay: 0.8s; }

@keyframes pulse-out {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

.loading-text {
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-transform: uppercase;
}

/* Error State */
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #ff6b6b;
}

.error-icon {
  font-size: 32px;
}

.error-text {
  font-size: 13px;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.empty-visual {
  position: relative;
  width: 120px;
  height: 120px;
}

.empty-orbit {
  position: absolute;
  inset: 0;
  border: 1px dashed var(--line);
  border-radius: 50%;
  animation: orbit-spin 10s linear infinite;
}

.orbit-dot {
  position: absolute;
  top: -4px;
  left: 50%;
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 10px var(--accent);
}

@keyframes orbit-spin {
  to { transform: rotate(360deg); }
}

.empty-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: var(--text-muted);
}

.empty-title {
  font-family: 'Crimson Pro', serif;
  font-size: 28px;
  font-weight: 400;
  color: var(--text-bright);
  margin: 0;
}

.empty-subtitle {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0;
}

/* Timeline Container */
.timeline-container {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1;
}

.fade-top,
.fade-bottom {
  position: fixed;
  left: 0;
  right: 0;
  height: 100px;
  pointer-events: none;
  z-index: 10;
}

.fade-top {
  top: 65px;
  background: linear-gradient(to bottom, var(--void) 0%, transparent 100%);
}

.fade-bottom {
  bottom: 80px;
  background: linear-gradient(to top, var(--void) 0%, transparent 100%);
}

/* Timeline Track */
.timeline-track {
  position: relative;
  padding: 15vh 0 20vh;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 60px;
  padding-right: 24px;
}

.timeline-spine {
  position: absolute;
  left: 28px;
  top: 15vh;
  bottom: 20vh;
  width: 2px;
  background: var(--line);
}

.spine-progress {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to bottom, var(--accent), var(--voice2));
  transition: height 0.3s ease;
  box-shadow: 0 0 10px var(--accent-glow);
}

/* Waypoints */
.waypoint {
  position: relative;
  padding: 12px 20px 12px 40px;
  margin: 4px 0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.waypoint.past {
  opacity: 0.3;
}

.waypoint.future {
  opacity: 0.5;
}

.waypoint.current {
  opacity: 1;
}

.waypoint:hover:not(.current) {
  opacity: 0.8;
  background: var(--surface);
  border-radius: 8px;
}

/* Waypoint Marker */
.waypoint-marker {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-dot {
  width: 8px;
  height: 8px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: all 0.3s;
}

.waypoint.current .marker-dot {
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}

.marker-dot.pulse {
  animation: marker-pulse 1.5s ease-in-out infinite;
}

@keyframes marker-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 12px var(--accent); }
  50% { transform: scale(1.3); box-shadow: 0 0 20px var(--accent); }
}

.marker-ring {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  animation: ring-expand 2s ease-out infinite;
}

@keyframes ring-expand {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2); opacity: 0; }
}

/* Waypoint Content */
.waypoint-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waypoint-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-code {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.meta-type {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 2px;
  letter-spacing: 1px;
}

/* Script item types (v3.0) */
.meta-type.intro { background: #7c3aed20; color: #a78bfa; }        /* Purple - INTRO */
.meta-type.debut { background: #f59e0b20; color: #fbbf24; }        /* Yellow - DEBUT */
.meta-type.build { background: var(--accent-soft); color: var(--accent); }  /* Cyan - BUILD */
.meta-type.spaced_rep { background: #06b6d420; color: #22d3ee; }   /* Teal - USE (spaced rep) */
.meta-type.use { background: #06b6d420; color: #22d3ee; }          /* Teal - USE (consolidation) */
/* Legacy types */
.meta-type.introduction { background: #7c3aed20; color: #a78bfa; }
.meta-type.debut_phrase { background: var(--accent-soft); color: var(--accent); }
.meta-type.consolidation { background: #06b6d420; color: #22d3ee; }
.meta-type.component { background: #3b82f620; color: #60a5fa; }
.meta-type.practice { background: var(--accent-soft); color: var(--accent); }
.meta-type.review { background: #06b6d420; color: #22d3ee; }

.waypoint-phrases {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.phrase-known {
  font-family: 'Crimson Pro', serif;
  font-size: 22px;
  color: var(--text-dim);
  transition: all 0.3s;
}

.phrase-known.active {
  color: var(--text-bright);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.phrase-arrow {
  color: var(--text-muted);
  font-size: 14px;
}

.phrase-target {
  font-family: 'Crimson Pro', serif;
  font-size: 24px;
  font-weight: 500;
  color: var(--accent);
  opacity: 0.4;
  transition: all 0.3s;
}

.phrase-target.voice1 {
  opacity: 0.7;
}

.phrase-target.voice2 {
  opacity: 1;
  color: var(--voice2);
  text-shadow: 0 0 20px var(--voice2-glow);
}

.waypoint.current .phrase-known {
  color: var(--text-bright);
}

.waypoint.current .phrase-target {
  opacity: 0.6;
}

/* Phase Strip */
.phase-strip {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.phase-segment {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--surface);
  border-radius: 3px;
  opacity: 0.3;
  transition: all 0.2s;
}

.phase-segment.active {
  opacity: 1;
  background: var(--accent-soft);
}

.phase-segment.pause.active {
  background: rgba(255, 215, 0, 0.15);
}

.phase-segment.pause.active .phase-icon,
.phase-segment.pause.active .phase-name {
  color: var(--pause);
}

.phase-icon {
  font-size: 8px;
  color: var(--accent);
}

.phase-name {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--accent);
}

/* Transport Bar */
.transport-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  background: linear-gradient(to top, var(--surface) 0%, var(--surface) 80%, transparent 100%);
  z-index: 100;
}

.transport-inner {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--surface-elevated);
  border: 1px solid var(--line);
  border-radius: 40px;
  padding: 8px 20px;
}

.transport-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}

.transport-btn:hover:not(:disabled) {
  border-color: var(--text-dim);
  color: var(--text-bright);
}

.transport-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.transport-btn svg {
  width: 18px;
  height: 18px;
}

.transport-btn.play {
  width: 52px;
  height: 52px;
  background: var(--accent);
  border-color: var(--accent);
  color: var(--void);
  position: relative;
}

.transport-btn.play:hover {
  transform: scale(1.05);
}

.transport-btn.play.playing {
  background: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}

.play-glow {
  position: absolute;
  inset: -8px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.3s;
}

.transport-btn.play.playing .play-glow {
  opacity: 0.3;
  animation: play-pulse 2s ease-in-out infinite;
}

@keyframes play-pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0; }
}

.transport-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
}

.progress-bar {
  height: 3px;
  background: var(--line);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--voice2));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}

/* Scrollbar */
.timeline-container::-webkit-scrollbar {
  width: 6px;
}

.timeline-container::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-container::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 3px;
}

.timeline-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Playing state enhancements */
.journey-viewer.is-playing .waypoint.current {
  background: var(--accent-soft);
  border-radius: 8px;
  margin-left: -8px;
  padding-left: 48px;
}
</style>
