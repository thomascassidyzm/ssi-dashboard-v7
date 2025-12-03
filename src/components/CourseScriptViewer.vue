<template>
  <div class="course-script-viewer">
    <!-- Header -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-emerald-400 mb-4">Course Script Viewer</h2>

      <!-- Course Info -->
      <div class="mb-4 pb-4 border-b border-slate-700">
        <div class="text-lg text-slate-200">
          Course: <span class="font-semibold text-emerald-400">{{ courseCode }}</span>
        </div>
      </div>

      <!-- Seed Range Selector -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label class="text-sm font-medium text-slate-300 mb-2 block">Start Seed:</label>
          <input
            v-model.number="startSeed"
            type="number"
            min="1"
            max="668"
            class="w-full px-4 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="1"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-300 mb-2 block">End Seed:</label>
          <input
            v-model.number="endSeed"
            type="number"
            min="1"
            max="668"
            class="w-full px-4 py-2 bg-slate-700 text-slate-200 border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="10"
          />
        </div>
        <div>
          <button
            @click="generateScript"
            :disabled="loading || !startSeed || !endSeed"
            class="w-full px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Generating...' : 'Generate Script' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div v-if="scriptData" class="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-emerald-400">{{ totalItems }}</div>
          <div class="text-xs text-slate-400 mt-1">Total Items</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-blue-400">{{ seedsCovered }}</div>
          <div class="text-xs text-slate-400 mt-1">Seeds Covered</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-400">{{ introductionCount }}</div>
          <div class="text-xs text-slate-400 mt-1">Introductions</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-amber-400">{{ debutCount }}</div>
          <div class="text-xs text-slate-400 mt-1">Debuts</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-slate-400">
      <div class="text-lg">Loading script...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-400">
      <h3 class="font-bold mb-2">Error Loading Script</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Script Display -->
    <div v-else-if="scriptData" class="space-y-4 max-h-[600px] overflow-y-auto">
      <div
        v-for="seed in groupedBySeed"
        :key="seed.seedId"
        class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
      >
        <!-- Seed Header -->
        <div class="bg-slate-700/50 px-4 py-3 border-b border-slate-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-emerald-400">{{ seed.seedId }}</h3>
            <span class="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300">
              {{ seed.items.length }} items
            </span>
          </div>
        </div>

        <!-- Items in this seed -->
        <div class="p-4 space-y-2">
          <div
            v-for="(item, idx) in seed.items"
            :key="`${seed.seedId}-${idx}`"
            :class="[
              'flex items-center gap-3 p-3 rounded transition-all',
              getItemTypeColor(item.type),
              currentlyPlaying === item.uuid ? 'ring-2 ring-emerald-400' : ''
            ]"
          >
            <!-- Play Button -->
            <button
              @click="playItem(item)"
              :disabled="!item.hasAudio"
              :class="[
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
                item.hasAudio
                  ? 'bg-slate-700 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              ]"
              :title="item.hasAudio ? 'Play audio' : 'No audio available'"
            >
              <span class="text-sm">{{ currentlyPlaying === item.uuid ? '⏸' : '▶' }}</span>
            </button>

            <!-- Type Icon -->
            <div class="flex-shrink-0 text-xl">
              {{ getItemIcon(item.type) }}
            </div>

            <!-- Text Content -->
            <div class="flex-1 min-w-0">
              <div class="text-sm text-slate-300 truncate">
                {{ item.knownText }}
              </div>
              <div class="text-sm text-emerald-400 truncate mt-1">
                {{ item.targetText }}
              </div>
            </div>

            <!-- Audio Indicator -->
            <div class="flex-shrink-0">
              <span
                :class="[
                  'inline-block w-2 h-2 rounded-full',
                  item.hasAudio ? 'bg-emerald-400' : 'bg-slate-600'
                ]"
                :title="item.hasAudio ? 'Audio available' : 'No audio'"
              ></span>
            </div>

            <!-- Play From Here Button -->
            <button
              @click="playFromHere(item, seed.items)"
              class="flex-shrink-0 px-2 py-1 text-xs bg-slate-700 hover:bg-blue-600 text-slate-400 hover:text-white rounded transition-colors"
              title="Play from here (continuous)"
            >
              ▶▶
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 text-slate-400">
      <div class="text-lg">Select a seed range and generate a script</div>
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
      endSeed: 10,
      loading: false,
      error: null,
      scriptData: null,
      currentlyPlaying: null
    }
  },
  computed: {
    groupedBySeed() {
      if (!this.scriptData || !this.scriptData.items) return []

      // Group items by seed ID
      const seedMap = new Map()

      this.scriptData.items.forEach(item => {
        const seedId = item.seedId || 'UNKNOWN'
        if (!seedMap.has(seedId)) {
          seedMap.set(seedId, {
            seedId,
            items: []
          })
        }
        seedMap.get(seedId).items.push(item)
      })

      // Convert to array and sort by seed ID
      return Array.from(seedMap.values()).sort((a, b) =>
        a.seedId.localeCompare(b.seedId)
      )
    },
    totalItems() {
      return this.scriptData?.items?.length || 0
    },
    seedsCovered() {
      return this.groupedBySeed.length
    },
    introductionCount() {
      return this.scriptData?.items?.filter(item => item.type === 'introduction').length || 0
    },
    debutCount() {
      return this.scriptData?.items?.filter(item => item.type === 'debut').length || 0
    }
  },
  methods: {
    async generateScript() {
      if (!this.courseCode || !this.startSeed || !this.endSeed) {
        this.error = 'Please provide valid seed range'
        return
      }

      if (this.startSeed > this.endSeed) {
        this.error = 'Start seed must be less than or equal to end seed'
        return
      }

      this.loading = true
      this.error = null
      this.scriptData = null

      try {
        const response = await fetch(
          `${baseURL}/api/courses/${this.courseCode}/script?startSeed=${this.startSeed}&endSeed=${this.endSeed}`,
          {
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        this.scriptData = await response.json()
        console.log('[ScriptViewer] Loaded script:', this.scriptData)
      } catch (err) {
        console.error('[ScriptViewer] Failed to load script:', err)
        this.error = err.message || 'Failed to load script'
      } finally {
        this.loading = false
      }
    },
    getItemIcon(type) {
      const icons = {
        introduction: '🎤',
        component: '🧩',
        debut: '⭐',
        practice: '📝'
      }
      return icons[type] || '•'
    },
    getItemTypeColor(type) {
      const colors = {
        introduction: 'bg-purple-900/20 border-l-4 border-purple-400',
        component: 'bg-blue-900/20 border-l-4 border-blue-400',
        debut: 'bg-amber-900/20 border-l-4 border-amber-400',
        practice: 'bg-emerald-900/20 border-l-4 border-emerald-400'
      }
      return colors[type] || 'bg-slate-700/20 border-l-4 border-slate-400'
    },
    playItem(item) {
      if (!item.hasAudio) return

      // Toggle play/pause
      if (this.currentlyPlaying === item.uuid) {
        this.currentlyPlaying = null
      } else {
        this.currentlyPlaying = item.uuid
      }

      // Emit event for parent component to handle actual audio playback
      this.$emit('play-item', { item })
    },
    playFromHere(item, allItems) {
      // Find the index of this item in the seed's items
      const startIndex = allItems.findIndex(i => i.uuid === item.uuid)

      if (startIndex === -1) return

      // Get remaining items from this point
      const remainingItems = allItems.slice(startIndex)

      // Emit event for continuous playback (Phase 3 will handle this)
      this.$emit('play-from-here', {
        item,
        items: remainingItems
      })
    }
  }
}
</script>

<style scoped>
.course-script-viewer {
  @apply max-w-7xl mx-auto p-6;
}

/* Custom scrollbar for script container */
.course-script-viewer > div:last-child {
  scrollbar-width: thin;
  scrollbar-color: #475569 #1e293b;
}

.course-script-viewer > div:last-child::-webkit-scrollbar {
  width: 8px;
}

.course-script-viewer > div:last-child::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 4px;
}

.course-script-viewer > div:last-child::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

.course-script-viewer > div:last-child::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
