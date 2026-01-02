<template>
  <div class="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
    <!-- Header -->
    <button
      @click="expanded = !expanded"
      class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <span class="text-lg font-semibold text-slate-100">Missing Audio</span>
        <span v-if="totalMissing > 0" class="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {{ totalMissing }} missing
        </span>
        <span v-else class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
          All Complete
        </span>
      </div>
      <svg
        class="w-5 h-5 text-slate-400 transition-transform"
        :class="{ 'rotate-180': expanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Content -->
    <div v-show="expanded" class="border-t border-slate-700 p-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-3 text-slate-400">Loading missing audio data...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-red-400 text-center py-4">
        {{ error }}
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Summary -->
        <div class="grid grid-cols-4 gap-4 text-center">
          <div class="bg-slate-700/50 rounded-lg p-3">
            <p class="text-2xl font-bold text-slate-100">{{ totalMissing }}</p>
            <p class="text-xs text-slate-400">Total Missing</p>
          </div>
          <div class="bg-slate-700/50 rounded-lg p-3">
            <p class="text-2xl font-bold text-blue-400">{{ missingCounts.known }}</p>
            <p class="text-xs text-slate-400">Known</p>
          </div>
          <div class="bg-slate-700/50 rounded-lg p-3">
            <p class="text-2xl font-bold text-emerald-400">{{ missingCounts.target1 }}</p>
            <p class="text-xs text-slate-400">Target 1</p>
          </div>
          <div class="bg-slate-700/50 rounded-lg p-3">
            <p class="text-2xl font-bold text-purple-400">{{ missingCounts.target2 }}</p>
            <p class="text-xs text-slate-400">Target 2</p>
          </div>
        </div>

        <!-- Role Tabs -->
        <div class="flex gap-2 border-b border-slate-700 pb-2">
          <button
            v-for="role in roles"
            :key="role.id"
            @click="selectedRole = role.id"
            class="px-4 py-2 rounded-t text-sm font-medium transition-colors"
            :class="selectedRole === role.id
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200'"
          >
            {{ role.label }}
            <span class="ml-1 text-xs opacity-70">({{ missingCounts[role.id] }})</span>
          </button>
        </div>

        <!-- Sample Audio Player for Voice Matching -->
        <div v-if="samples[selectedRole]" class="bg-slate-700/30 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400 mb-1">Sample audio for voice matching:</p>
              <p class="text-slate-200 font-medium">"{{ samples[selectedRole].text }}"</p>
              <p class="text-xs text-slate-500 mt-1">Voice: {{ samples[selectedRole].voiceId }}</p>
            </div>
            <button
              @click="playSample(selectedRole)"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              <svg v-if="!isPlaying[selectedRole]" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              {{ isPlaying[selectedRole] ? 'Pause' : 'Play Sample' }}
            </button>
          </div>
          <audio
            :ref="el => audioRefs[selectedRole] = el"
            :src="samples[selectedRole]?.url"
            @ended="isPlaying[selectedRole] = false"
            class="hidden"
          ></audio>
        </div>
        <div v-else class="bg-slate-700/30 rounded-lg p-4 text-slate-400 text-center">
          No sample audio available for {{ selectedRole }}
        </div>

        <!-- Missing Items List -->
        <div class="max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-800">
              <tr class="text-left text-slate-400 border-b border-slate-700">
                <th class="py-2 px-3">Location</th>
                <th class="py-2 px-3">Text</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in missingItems"
                :key="idx"
                class="border-b border-slate-700/50 hover:bg-slate-700/30"
              >
                <td class="py-2 px-3 text-slate-500 font-mono text-xs">{{ item.legoId }}</td>
                <td class="py-2 px-3 text-slate-200">{{ item.text }}</td>
              </tr>
              <tr v-if="missingItems.length === 0">
                <td colspan="2" class="py-8 text-center text-slate-500">
                  No missing audio for {{ selectedRole }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

function getApiBaseUrl() {
  // Use ngrok URL in development if available, otherwise use relative path for production
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3470'
  }
  // In production, use the same origin (Vercel serverless functions)
  return ''
}

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const expanded = ref(false)
const loading = ref(false)
const error = ref(null)
const data = ref(null)

const selectedRole = ref('target1')
const roles = [
  { id: 'known', label: 'Known' },
  { id: 'target1', label: 'Target 1' },
  { id: 'target2', label: 'Target 2' }
]

const audioRefs = ref({})
const isPlaying = ref({
  known: false,
  target1: false,
  target2: false
})

const totalMissing = computed(() => data.value?.totalMissing || 0)
const missingCounts = computed(() => ({
  known: data.value?.missing?.known?.length || 0,
  target1: data.value?.missing?.target1?.length || 0,
  target2: data.value?.missing?.target2?.length || 0
}))
const samples = computed(() => data.value?.samples || {})
const missingItems = computed(() => data.value?.missing?.[selectedRole.value] || [])

async function fetchMissingAudio() {
  if (!props.courseCode) return

  loading.value = true
  error.value = null

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/production/${props.courseCode}/audio-pipeline/missing`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    data.value = await response.json()
  } catch (err) {
    console.error('Failed to fetch missing audio:', err)
    error.value = `Failed to load: ${err.message}`
  } finally {
    loading.value = false
  }
}

function playSample(role) {
  const audio = audioRefs.value[role]
  if (!audio) return

  if (isPlaying.value[role]) {
    audio.pause()
    isPlaying.value[role] = false
  } else {
    // Stop other playing audio
    for (const r of roles) {
      if (audioRefs.value[r.id]) {
        audioRefs.value[r.id].pause()
        isPlaying.value[r.id] = false
      }
    }
    audio.play()
    isPlaying.value[role] = true
  }
}

// Fetch when expanded
watch(expanded, (isExpanded) => {
  if (isExpanded && !data.value) {
    fetchMissingAudio()
  }
})

// Also fetch on mount if already expanded
onMounted(() => {
  if (expanded.value) {
    fetchMissingAudio()
  }
})
</script>
