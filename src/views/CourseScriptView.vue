<template>
  <div class="course-script-view">
    <!-- Header -->
    <div class="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <router-link
            to="/"
            class="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-2"
          >
            <span>←</span>
            <span class="text-sm">Back to Dashboard</span>
          </router-link>
          <h1 class="text-2xl font-bold text-emerald-400">Course Script Viewer</h1>
          <p class="text-slate-400 text-sm mt-1">Preview the complete learning sequence with audio playback</p>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">Demo / QA Tool</div>
          <div class="text-sm text-slate-400">Spotify-style script preview</div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Script Viewer -->
      <div class="flex-1 overflow-auto p-6">
        <CourseScriptViewer
          :course-code="courseCode"
          :currently-playing="currentItem?.id"
          @play-item="handlePlayItem"
          @play-from-here="handlePlayFromHere"
        />
      </div>

      <!-- Playback Controls (sticky at bottom) -->
      <div v-if="hasItems" class="border-t border-slate-700">
        <ScriptPlaybackControls
          :is-playing="isPlaying"
          :is-paused="isPaused"
          :current-item="currentItem"
          :current-phase="currentPhase"
          :current-index="currentIndex"
          :total-items="totalItems"
          :progress="progress"
          @play="play"
          @pause="pause"
          @stop="stop"
          @skip="handleSkip"
          @seek="handleSeek"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import CourseScriptViewer from '@/components/CourseScriptViewer.vue'
import ScriptPlaybackControls from '@/components/ScriptPlaybackControls.vue'
import { useScriptPlayer } from '@/composables/useScriptPlayer'

const route = useRoute()
const courseCode = computed(() => route.params.courseCode || 'spa_for_eng')

// Script player composable
const {
  isPlaying,
  isPaused,
  currentItem,
  currentPhase,
  currentIndex,
  progress,
  totalItems,
  playFrom,
  play,
  pause,
  stop,
  skip,
  seekTo,
  onItemChange,
  onComplete
} = useScriptPlayer()

// Track if we have items loaded
const scriptItems = ref([])
const hasItems = computed(() => scriptItems.value.length > 0)

// Event handlers
function handlePlayItem({ item }) {
  // Play single item
  scriptItems.value = [item]
  playFrom([item], 0)
}

function handlePlayFromHere({ item, items }) {
  // Play from this item through the rest
  scriptItems.value = items
  const startIndex = items.findIndex(i => i.id === item.id)
  playFrom(items, startIndex >= 0 ? startIndex : 0)
}

function handleSkip(direction) {
  skip(direction)
}

function handleSeek(index) {
  seekTo(index)
}

// Register event listeners
const unsubItemChange = onItemChange((item) => {
  console.log('[CourseScriptView] Now playing:', item?.id)
})

const unsubComplete = onComplete(() => {
  console.log('[CourseScriptView] Playback complete')
})

// Cleanup
onUnmounted(() => {
  stop()
  unsubItemChange()
  unsubComplete()
})
</script>

<style scoped>
.course-script-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}
</style>
