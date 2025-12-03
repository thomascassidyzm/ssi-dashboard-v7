<template>
  <div class="course-script-viewer">
    <!-- Header Controls -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-400">Seeds:</label>
          <input
            v-model.number="startSeed"
            type="number"
            min="1"
            max="668"
            class="w-20 px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-sm"
          />
          <span class="text-slate-500">to</span>
          <input
            v-model.number="endSeed"
            type="number"
            min="1"
            max="668"
            class="w-20 px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-sm"
          />
        </div>
        <button
          @click="generateScript"
          :disabled="loading"
          class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {{ loading ? 'Loading...' : 'Generate' }}
        </button>
        <div v-if="scriptItems.length" class="text-sm text-slate-400 ml-auto">
          {{ scriptItems.length }} cycles • {{ estimatedDuration }}
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-400">
      Generating script...
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
      {{ error }}
    </div>

    <!-- Script Display - Spotify Lyrics Style -->
    <div
      v-else-if="scriptItems.length"
      ref="scriptContainer"
      class="script-container bg-slate-900 rounded-lg overflow-hidden"
    >
      <!-- Each cycle is a "lyric line" -->
      <div
        v-for="(item, index) in scriptItems"
        :key="item.uuid"
        :ref="el => { if (currentIndex === index) currentItemRef = el }"
        :class="[
          'script-item p-4 border-b border-slate-800 transition-all duration-300',
          currentIndex === index ? 'bg-slate-800 scale-[1.02]' : 'opacity-60 hover:opacity-80',
          index < currentIndex ? 'opacity-40' : ''
        ]"
        @click="jumpToItem(index)"
      >
        <!-- Cycle number and type badge -->
        <div class="flex items-center gap-3 mb-2">
          <span class="text-xs text-slate-500 font-mono w-12">{{ String(index + 1).padStart(3, '0') }}</span>
          <span :class="getTypeBadgeClass(item.type)" class="text-xs px-2 py-0.5 rounded">
            {{ item.type.toUpperCase() }}
          </span>
          <span class="text-xs text-slate-600">{{ item.seedId }}</span>
          <span
            v-if="item.hasAudio"
            class="w-2 h-2 rounded-full bg-emerald-500"
            title="Audio available"
          ></span>
        </div>

        <!-- The 4-phase cycle visualization -->
        <div class="flex items-stretch gap-1 mb-3">
          <!-- PROMPT phase -->
          <div :class="[
            'flex-1 rounded-l px-3 py-2 text-center transition-all',
            currentIndex === index && currentPhase === 'prompt'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/50 text-slate-400'
          ]">
            <div class="text-[10px] uppercase tracking-wider mb-1 opacity-70">Prompt</div>
            <div class="text-sm truncate">{{ item.knownText }}</div>
          </div>

          <!-- PAUSE phase -->
          <div :class="[
            'w-16 px-2 py-2 text-center transition-all flex flex-col justify-center',
            currentIndex === index && currentPhase === 'pause'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-700/50 text-slate-400'
          ]">
            <div class="text-[10px] uppercase tracking-wider opacity-70">Pause</div>
            <div class="text-lg">⏸</div>
          </div>

          <!-- VOICE_1 phase -->
          <div :class="[
            'flex-1 px-3 py-2 text-center transition-all',
            currentIndex === index && currentPhase === 'voice1'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700/50 text-slate-400'
          ]">
            <div class="text-[10px] uppercase tracking-wider mb-1 opacity-70">Voice 1</div>
            <div class="text-sm truncate">{{ item.targetText }}</div>
          </div>

          <!-- VOICE_2 phase -->
          <div :class="[
            'flex-1 rounded-r px-3 py-2 text-center transition-all',
            currentIndex === index && currentPhase === 'voice2'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700/50 text-slate-400'
          ]">
            <div class="text-[10px] uppercase tracking-wider mb-1 opacity-70">Voice 2</div>
            <div class="text-sm truncate">{{ item.targetText }}</div>
          </div>
        </div>

        <!-- Full text display when this item is current -->
        <div v-if="currentIndex === index" class="mt-3 pt-3 border-t border-slate-700">
          <div class="text-slate-300 text-lg">{{ item.knownText }}</div>
          <div class="text-emerald-400 text-xl font-medium mt-1">{{ item.targetText }}</div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-500">
      Select seed range and click Generate to preview the learning script
    </div>

    <!-- Playback Controls (sticky at bottom) -->
    <div v-if="scriptItems.length" class="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 mt-4 rounded-b-lg">
      <div class="flex items-center justify-center gap-4">
        <!-- Previous -->
        <button
          @click="previousItem"
          :disabled="currentIndex <= 0"
          class="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <!-- Play/Pause -->
        <button
          @click="togglePlayback"
          class="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <svg v-if="!isPlaying" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>

        <!-- Next -->
        <button
          @click="nextItem"
          :disabled="currentIndex >= scriptItems.length - 1"
          class="p-2 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <!-- Progress indicator -->
        <div class="ml-4 text-sm text-slate-400">
          {{ currentIndex + 1 }} / {{ scriptItems.length }}
        </div>
      </div>

      <!-- Phase dots -->
      <div class="flex justify-center gap-2 mt-3">
        <div :class="['w-3 h-3 rounded-full transition-all', currentPhase === 'prompt' ? 'bg-blue-500 scale-125' : 'bg-slate-600']"></div>
        <div :class="['w-3 h-3 rounded-full transition-all', currentPhase === 'pause' ? 'bg-amber-500 scale-125' : 'bg-slate-600']"></div>
        <div :class="['w-3 h-3 rounded-full transition-all', currentPhase === 'voice1' ? 'bg-emerald-500 scale-125' : 'bg-slate-600']"></div>
        <div :class="['w-3 h-3 rounded-full transition-all', currentPhase === 'voice2' ? 'bg-purple-500 scale-125' : 'bg-slate-600']"></div>
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
      currentPhase: null, // 'prompt' | 'pause' | 'voice1' | 'voice2'
      isPlaying: false,
      audio: null,
      phaseTimer: null,
      currentItemRef: null
    }
  },
  computed: {
    estimatedDuration() {
      // Rough estimate: ~10 seconds per cycle
      const totalSeconds = this.scriptItems.length * 10
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `~${minutes}:${String(seconds).padStart(2, '0')}`
    }
  },
  methods: {
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
      } catch (err) {
        console.error('[ScriptViewer] Error:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    getTypeBadgeClass(type) {
      const classes = {
        introduction: 'bg-purple-600/50 text-purple-200',
        component: 'bg-blue-600/50 text-blue-200',
        debut: 'bg-amber-600/50 text-amber-200',
        practice: 'bg-emerald-600/50 text-emerald-200'
      }
      return classes[type] || 'bg-slate-600 text-slate-300'
    },

    jumpToItem(index) {
      this.currentIndex = index
      this.currentPhase = null
      this.scrollToCurrentItem()
    },

    scrollToCurrentItem() {
      this.$nextTick(() => {
        if (this.currentItemRef) {
          this.currentItemRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

      // Initialize audio element if needed
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

    async playCycle() {
      if (!this.isPlaying || this.currentIndex >= this.scriptItems.length) {
        this.stopPlayback()
        return
      }

      const item = this.scriptItems[this.currentIndex]
      this.scrollToCurrentItem()

      // Phase 1: PROMPT (play known audio)
      this.currentPhase = 'prompt'
      if (item.sourceId) {
        await this.playAudio(item.sourceId)
      } else {
        await this.wait(1500) // Simulate if no audio
      }

      if (!this.isPlaying) return

      // Phase 2: PAUSE (learner response time)
      this.currentPhase = 'pause'
      await this.wait(3000) // Default 3 second pause

      if (!this.isPlaying) return

      // Phase 3: VOICE_1 (first target voice)
      this.currentPhase = 'voice1'
      if (item.target1Id) {
        await this.playAudio(item.target1Id)
      } else {
        await this.wait(1500)
      }

      if (!this.isPlaying) return

      // Phase 4: VOICE_2 (second target voice)
      this.currentPhase = 'voice2'
      if (item.target2Id) {
        await this.playAudio(item.target2Id)
      } else {
        await this.wait(1500)
      }

      if (!this.isPlaying) return

      // Move to next item
      this.currentIndex++
      this.currentPhase = null

      // Small gap between cycles
      await this.wait(500)

      // Continue with next cycle
      if (this.isPlaying && this.currentIndex < this.scriptItems.length) {
        this.playCycle()
      } else {
        this.stopPlayback()
      }
    },

    playAudio(uuid) {
      return new Promise((resolve) => {
        if (!this.audio || !uuid) {
          resolve()
          return
        }

        const onEnded = () => {
          this.audio.removeEventListener('ended', onEnded)
          this.audio.removeEventListener('error', onError)
          resolve()
        }

        const onError = () => {
          console.warn('[ScriptViewer] Audio error for', uuid)
          this.audio.removeEventListener('ended', onEnded)
          this.audio.removeEventListener('error', onError)
          resolve()
        }

        this.audio.addEventListener('ended', onEnded)
        this.audio.addEventListener('error', onError)

        this.audio.src = `${baseURL}/api/audio/stream/${uuid}`
        this.audio.load()
        this.audio.play().catch(() => {
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
  }
}
</script>

<style scoped>
.course-script-viewer {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.script-container {
  max-height: 60vh;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.script-item {
  cursor: pointer;
}

.script-item:hover {
  background: rgba(51, 65, 85, 0.5);
}

/* Custom scrollbar */
.script-container::-webkit-scrollbar {
  width: 6px;
}

.script-container::-webkit-scrollbar-track {
  background: #1e293b;
}

.script-container::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

.script-container::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
