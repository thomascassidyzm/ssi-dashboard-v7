<template>
  <div
    class="bg-slate-900/50 rounded-lg p-4 border transition-all hover:border-slate-600"
    :class="borderClass"
  >
    <div class="flex items-center justify-between gap-4">
      <!-- Left: Text and Voice Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <!-- Status Badge -->
          <span
            class="px-2 py-0.5 rounded text-xs font-semibold"
            :class="statusBadgeClass"
          >
            {{ statusLabel }}
          </span>

          <!-- Voice Badge -->
          <span class="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
            {{ item.voiceId }}
          </span>
        </div>

        <!-- Text Being Generated -->
        <p class="text-sm text-slate-300 truncate" :title="item.text">
          {{ item.text }}
        </p>

        <!-- Error Message (if failed) -->
        <p v-if="item.error" class="text-xs text-red-400 mt-2">
          {{ item.error }}
        </p>
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <!-- Audio Preview (when complete) -->
        <button
          v-if="item.status === 'complete' && item.audioUrl"
          @click="toggleAudio"
          class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center justify-center"
          title="Play/Pause audio"
        >
          <svg v-if="isPlaying" class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path>
          </svg>
          <svg v-else class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        </button>

        <!-- Retry Button (when failed) -->
        <button
          v-if="item.status === 'failed'"
          @click="$emit('retry', item.uuid)"
          class="p-2 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg transition flex items-center justify-center"
          title="Retry generation"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>

        <!-- Generating Spinner -->
        <div v-if="item.status === 'generating'" class="p-2">
          <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- Queued Icon -->
        <div v-if="item.status === 'queued'" class="p-2">
          <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Hidden audio element -->
    <audio
      v-if="item.audioUrl"
      ref="audioElement"
      :src="item.audioUrl"
      @ended="isPlaying = false"
    ></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface QueueItemData {
  uuid: string
  text: string
  voiceId: string
  status: 'queued' | 'generating' | 'complete' | 'failed'
  audioUrl?: string
  error?: string
}

interface Props {
  item: QueueItemData
}

const props = defineProps<Props>()

defineEmits<{
  retry: [uuid: string]
}>()

const audioElement = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)

// Status styling
const statusBadgeClass = computed(() => {
  switch (props.item.status) {
    case 'queued':
      return 'bg-slate-500/20 text-slate-400'
    case 'generating':
      return 'bg-blue-500/20 text-blue-400'
    case 'complete':
      return 'bg-emerald-500/20 text-emerald-400'
    case 'failed':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-slate-500/20 text-slate-400'
  }
})

const borderClass = computed(() => {
  switch (props.item.status) {
    case 'generating':
      return 'border-blue-500/30'
    case 'complete':
      return 'border-emerald-500/30'
    case 'failed':
      return 'border-red-500/30'
    default:
      return 'border-slate-700'
  }
})

const statusLabel = computed(() => {
  switch (props.item.status) {
    case 'queued':
      return 'Queued'
    case 'generating':
      return 'Generating'
    case 'complete':
      return 'Complete'
    case 'failed':
      return 'Failed'
    default:
      return props.item.status
  }
})

// Audio playback
const toggleAudio = () => {
  if (!audioElement.value) return

  if (isPlaying.value) {
    audioElement.value.pause()
    isPlaying.value = false
  } else {
    audioElement.value.play()
    isPlaying.value = true
  }
}
</script>
