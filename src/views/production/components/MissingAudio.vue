<template>
  <div class="missing-audio bg-surface border border-line rounded-lg overflow-hidden">
    <!-- Header -->
    <button
      @click="expanded = !expanded"
      class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-2/30 transition-colors"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <span class="text-lg font-semibold text-ink">Missing Audio</span>
        <span v-if="totalMissing > 0" class="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {{ totalMissing }} missing
        </span>
        <span v-else class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
          All Complete
        </span>
      </div>
      <svg
        class="w-5 h-5 text-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Content -->
    <div v-show="expanded" class="border-t border-line p-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-3 text-muted">Loading missing audio data...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-red-400 text-center py-4">
        {{ error }}
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Summary by Process -->
        <div class="space-y-4">
          <!-- Process Groups -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- Azure TTS (Phrases) -->
            <div class="bg-surface-2 border border-line rounded-lg p-3 border-l-4 border-l-blue-500">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-blue-400 uppercase tracking-wide">Azure</span>
                <span class="text-xs text-faint">(Phrases)</span>
              </div>
              <p class="text-xl font-bold" :class="byProcess.azure?.missing > 0 ? 'text-amber-400' : 'text-emerald-400'">
                {{ byProcess.azure?.missing || 0 }}
              </p>
            </div>

            <!-- Azure TTS (Seeds) -->
            <div class="bg-surface-2 border border-line rounded-lg p-3 border-l-4 border-l-cyan-500">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-cyan-400 uppercase tracking-wide">Azure</span>
                <span class="text-xs text-faint">(Seeds)</span>
              </div>
              <p class="text-xl font-bold" :class="byProcess.azureSeeds?.missing > 0 ? 'text-amber-400' : 'text-emerald-400'">
                {{ byProcess.azureSeeds?.missing || 0 }}
              </p>
            </div>

            <!-- Azure TTS (LEGOs) -->
            <div class="bg-surface-2 border border-line rounded-lg p-3 border-l-4 border-l-teal-500">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-teal-400 uppercase tracking-wide">Azure</span>
                <span class="text-xs text-faint">(LEGOs)</span>
              </div>
              <p class="text-xl font-bold" :class="byProcess.azureLegos?.missing > 0 ? 'text-amber-400' : 'text-emerald-400'">
                {{ byProcess.azureLegos?.missing || 0 }}
              </p>
            </div>

            <!-- ElevenLabs (UI Audio) row removed — shared audio (encouragements/instructions/welcome)
                 now lives in the Shared Audio section below. Generate Missing Audio doesn't produce them. -->
          </div>

          <!-- Total -->
          <div class="flex items-center justify-between bg-surface-2 border border-line rounded-lg px-4 py-2">
            <span class="text-muted text-sm">Total Missing <span class="text-faint">— no audio exists, needs TTS</span></span>
            <span class="text-xl font-bold" :class="totalMissing > 0 ? 'text-amber-400' : 'text-emerald-400'">
              {{ totalMissing }}
            </span>
          </div>

          <!-- Unlinked — audio already rendered and confirmed in storage, slot
               just isn't bound to it. Never TTS these; Generate links them free. -->
          <div v-if="totalUnlinked > 0" class="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2">
            <span class="text-sm text-blue-300">Unlinked <span class="text-faint">— audio exists in storage, just needs linking</span></span>
            <span class="text-xl font-bold text-blue-400">{{ totalUnlinked }}</span>
          </div>

          <!-- Copyable — voiced for another course in this course's own voice. -->
          <div v-if="copyable > 0" class="flex items-center justify-between bg-surface-2 border border-line rounded-lg px-4 py-2">
            <span class="text-sm text-muted">Copyable <span class="text-faint">— same voice already rendered elsewhere, no TTS</span></span>
            <span class="text-lg font-bold text-cyan-400">{{ copyable }}</span>
          </div>

          <!-- Storage-broken — the row promises audio the bucket doesn't have. -->
          <div v-if="storageBroken > 0" class="flex items-center justify-between bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2">
            <span class="text-sm text-red-300">Storage broken <span class="text-faint">— audio row points at a file that no longer exists</span></span>
            <span class="text-lg font-bold text-red-400">{{ storageBroken }}</span>
          </div>

          <!-- Orphan LEGOs Warning -->
          <div v-if="orphanLegos.length > 0" class="flex items-center justify-between bg-amber-900/20 rounded-lg px-4 py-3 border border-amber-500/30">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm text-amber-300">{{ orphanLegos.length }} orphan LEGO{{ orphanLegos.length === 1 ? '' : 's' }} missing debut phrases</span>
            </div>
            <button
              @click="fixOrphanLegos"
              :disabled="fixingOrphans"
              class="px-3 py-1.5 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ fixingOrphans ? 'Fixing...' : `Fix ${orphanLegos.length} orphan${orphanLegos.length === 1 ? '' : 's'}` }}
            </button>
          </div>

          <!-- Ungeneratable Items Warning -->
          <!-- Items where text is empty/punctuation-only and TTS can't generate them.
               These are silently skipped during audio generation, so we surface them
               here so the user knows exactly what won't be generated and why. -->
          <div v-if="ungeneratableItems.length > 0" class="bg-rose-900/20 rounded-lg border border-rose-500/30">
            <button
              @click="ungeneratableExpanded = !ungeneratableExpanded"
              class="w-full flex items-center justify-between px-4 py-3 hover:bg-rose-900/10 transition-colors"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
                <span class="text-sm text-rose-300 font-medium">
                  {{ ungeneratableItems.length }} item{{ ungeneratableItems.length === 1 ? '' : 's' }} cannot be generated
                </span>
                <span class="text-xs text-rose-400/70">(empty / punctuation-only — TTS will skip these)</span>
              </div>
              <svg
                class="w-4 h-4 text-rose-400 transition-transform"
                :class="{ 'rotate-180': ungeneratableExpanded }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div v-show="ungeneratableExpanded" class="border-t border-rose-500/20 max-h-64 overflow-y-auto">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-rose-950/50">
                  <tr class="text-left text-rose-300/70">
                    <th class="py-2 px-3 font-medium">From</th>
                    <th class="py-2 px-3 font-medium">Role</th>
                    <th class="py-2 px-3 font-medium">ID</th>
                    <th class="py-2 px-3 font-medium">Text</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in ungeneratableItems" :key="idx" class="border-t border-rose-500/10">
                    <td class="py-1.5 px-3 text-rose-300/80">{{ item.source }}</td>
                    <td class="py-1.5 px-3 text-rose-300/80">{{ item.role }}</td>
                    <td class="py-1.5 px-3 text-rose-300/60 font-mono">{{ item.id }}</td>
                    <td class="py-1.5 px-3 text-rose-100 font-mono">{{ item.text || '(empty)' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="border-b border-line">
          <!-- Azure Phrases -->
          <div class="flex items-center gap-1 mb-2">
            <span class="text-xs text-blue-400 font-medium px-2">Azure (Phrases)</span>
          </div>
          <div class="flex flex-wrap gap-2 pb-2">
            <button
              v-for="role in phraseRoles"
              :key="role.id"
              @click="selectCategory('phrase', role.id)"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'phrase' && selectedRole === role.id
                ? 'bg-blue-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              {{ role.label }}
              <span class="ml-1 text-xs opacity-70">({{ missingCounts[role.id] }})</span>
            </button>
          </div>

          <!-- Azure Seeds -->
          <div class="flex items-center gap-1 mb-2 mt-3">
            <span class="text-xs text-cyan-400 font-medium px-2">Azure (Seeds)</span>
          </div>
          <div class="flex flex-wrap gap-2 pb-2">
            <button
              v-for="role in seedRoles"
              :key="role.id"
              @click="selectCategory('seed', role.id)"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'seed' && selectedRole === role.id
                ? 'bg-cyan-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              {{ role.label }}
              <span class="ml-1 text-xs opacity-70">({{ seedMissingCounts[role.id] }})</span>
            </button>
          </div>

          <!-- Azure LEGOs -->
          <div class="flex items-center gap-1 mb-2 mt-3">
            <span class="text-xs text-teal-400 font-medium px-2">Azure (LEGOs)</span>
          </div>
          <div class="flex flex-wrap gap-2 pb-2">
            <button
              v-for="role in legoRoles"
              :key="role.id"
              @click="selectCategory('lego', role.id)"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'lego' && selectedRole === role.id
                ? 'bg-teal-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              {{ role.label }}
              <span class="ml-1 text-xs opacity-70">({{ legoMissingCounts[role.id] }})</span>
            </button>
          </div>

          <!-- ElevenLabs UI Audio -->
          <div class="flex items-center gap-1 mb-2 mt-3">
            <span class="text-xs text-purple-400 font-medium px-2">ElevenLabs (UI Audio)</span>
          </div>
          <div class="flex flex-wrap gap-2 pb-3">
            <button
              @click="selectCategory('shared', 'encouragements')"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'shared' && selectedRole === 'encouragements'
                ? 'bg-purple-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              Encouragements
              <span class="ml-1 text-xs opacity-70">({{ sharedAudio?.encouragements?.missing || 0 }})</span>
            </button>
            <button
              @click="selectCategory('shared', 'instructions')"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'shared' && selectedRole === 'instructions'
                ? 'bg-purple-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              Instructions
              <span class="ml-1 text-xs opacity-70">({{ sharedAudio?.instructions?.missing || 0 }})</span>
            </button>
            <button
              @click="selectCategory('shared', 'welcome')"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="selectedCategory === 'shared' && selectedRole === 'welcome'
                ? 'bg-purple-600 text-white'
                : 'bg-surface-2 border border-line text-muted hover:text-ink'"
            >
              Welcome
              <span class="ml-1 text-xs opacity-70">({{ welcomeMissing }})</span>
            </button>
          </div>
        </div>

        <!-- Sample Audio Player for Voice Matching (phrase roles only) -->
        <div v-if="selectedCategory === 'phrase' && samples[selectedRole]" class="bg-surface-2 border border-line rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted mb-1">Sample audio for voice matching:</p>
              <p class="text-ink font-medium">"{{ samples[selectedRole].text }}"</p>
              <p class="text-xs text-faint mt-1">Voice: {{ samples[selectedRole].voiceId }}</p>
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

        <!-- Shared Audio Info (ElevenLabs categories) -->
        <div v-else-if="selectedCategory === 'shared'" class="bg-surface-2 border border-line rounded-lg p-4">
          <div v-if="selectedRole === 'encouragements'" class="space-y-2">
            <p class="text-ink">
              <span class="text-purple-400 font-medium">Encouragements</span> are pooled feedback phrases played randomly during lessons.
            </p>
            <p class="text-sm text-muted">
              Required: {{ sharedAudio?.encouragements?.expected || 26 }} |
              Existing: {{ sharedAudio?.encouragements?.existing || 0 }} |
              Missing: <span :class="sharedAudio?.encouragements?.missing > 0 ? 'text-amber-400' : 'text-emerald-400'">{{ sharedAudio?.encouragements?.missing || 0 }}</span>
            </p>
            <p class="text-xs text-faint">Language: {{ sharedAudio?.language || 'eng' }} | Generated via ElevenLabs</p>
          </div>
          <div v-else-if="selectedRole === 'instructions'" class="space-y-2">
            <p class="text-ink">
              <span class="text-purple-400 font-medium">Instructions</span> are ordered prompts that guide learners through exercises.
            </p>
            <p class="text-sm text-muted">
              Required: {{ sharedAudio?.instructions?.expected || 48 }} |
              Existing: {{ sharedAudio?.instructions?.existing || 0 }} |
              Missing: <span :class="sharedAudio?.instructions?.missing > 0 ? 'text-amber-400' : 'text-emerald-400'">{{ sharedAudio?.instructions?.missing || 0 }}</span>
            </p>
            <p class="text-xs text-faint">Language: {{ sharedAudio?.language || 'eng' }} | Generated via ElevenLabs</p>
          </div>
          <div v-else-if="selectedRole === 'welcome'" class="space-y-2">
            <p class="text-ink">
              <span class="text-purple-400 font-medium">Welcome</span> is the introduction message played when starting the course.
            </p>
            <div v-if="welcome?.hasAudio" class="text-sm text-emerald-400">
              Welcome audio exists ({{ welcome.details?.duration?.toFixed(1) }}s)
            </div>
            <div v-else class="text-sm text-amber-400">
              Welcome audio missing
            </div>
            <p class="text-xs text-faint">Generated via ElevenLabs</p>
          </div>
        </div>

        <!-- Missing Items List -->
        <div class="max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-surface">
              <tr class="text-left text-muted border-b border-line">
                <th class="py-2 px-3">Location</th>
                <th class="py-2 px-3">Text</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in currentMissingItems"
                :key="idx"
                class="border-b border-line/50 hover:bg-surface-2/30"
              >
                <td class="py-2 px-3 text-faint font-mono text-xs">{{ item.legoId || item.seedId || '-' }}</td>
                <td class="py-2 px-3 text-ink">{{ item.text }}</td>
              </tr>
              <tr v-if="currentMissingItems.length === 0">
                <td colspan="2" class="py-8 text-center text-faint">
                  <span v-if="selectedCategory === 'shared'">
                    {{ selectedRole === 'welcome' ? (welcome?.hasAudio ? 'Welcome audio exists' : 'Welcome audio needs to be generated in ElevenLabs') : `${selectedRole} need to be generated in ElevenLabs` }}
                  </span>
                  <span v-else>
                    No missing audio for {{ selectedRole }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Non-destructive repair of audio that EXISTS but sounds wrong.
         Machines flag, only humans pass — the accept lives in there. -->
    <div class="border-t border-line p-4">
      <AudioRepairPanel :course-code="courseCode" :refresh-trigger="refreshTrigger" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getApiUrl } from '@/services/api'
import AudioRepairPanel from './AudioRepairPanel.vue'

function getApiBaseUrl() {
  return getApiUrl()
}

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const expanded = ref(false)
const loading = ref(false)
const error = ref(null)
const data = ref(null)

// Orphan LEGO state
const fixingOrphans = ref(false)
const orphanLegos = ref([])

// Ungeneratable items state (empty/punctuation-only text that TTS can't generate)
const ungeneratableItems = ref([])
const ungeneratableExpanded = ref(false)

// Category and role selection
const selectedCategory = ref('phrase')  // 'phrase', 'seed', 'lego', 'shared'
const selectedRole = ref('target1')

// Role definitions
const phraseRoles = [
  { id: 'known', label: 'Known' },
  { id: 'target1', label: 'Target 1' },
  { id: 'target2', label: 'Target 2' },
  { id: 'presentation', label: 'Presentation' }
]
const seedRoles = [
  { id: 'known', label: 'Known' },
  { id: 'target1', label: 'Target 1' },
  { id: 'target2', label: 'Target 2' }
]
const legoRoles = [
  { id: 'known', label: 'Known' },
  { id: 'target1', label: 'Target 1' },
  { id: 'target2', label: 'Target 2' }
]

const audioRefs = ref({})
const isPlaying = ref({
  known: false,
  target1: false,
  target2: false,
  presentation: false
})

// Computed properties
const totalMissing = computed(() => data.value?.totalMissing || 0)
// Slots whose audio is already rendered and confirmed present in storage —
// they were never missing, just unbound. Linking them costs nothing.
const totalUnlinked = computed(() => data.value?.totalUnlinked || 0)
// Text already voiced for another course in this course's own voice: /generate
// binds these by copy, no TTS.
const copyable = computed(() => data.value?.copyable || 0)
// Bound slots whose course_audio row names an object the bucket doesn't have.
const storageBroken = computed(() => data.value?.storageBroken || 0)
const releaseTarget = computed(() => data.value?.releaseTarget || 300)

// Phrase missing counts - from phase8 /plan (single source of truth)
const missingCounts = computed(() => data.value?.missingCounts || {
  known: 0,
  target1: 0,
  target2: 0,
  presentation: 0
})

// Seed missing counts
const seedMissingCounts = computed(() => ({
  known: data.value?.seeds?.missing?.known?.length || 0,
  target1: data.value?.seeds?.missing?.target1?.length || 0,
  target2: data.value?.seeds?.missing?.target2?.length || 0
}))

// LEGO missing counts
const legoMissingCounts = computed(() => ({
  known: data.value?.legos?.missing?.known?.length || 0,
  target1: data.value?.legos?.missing?.target1?.length || 0,
  target2: data.value?.legos?.missing?.target2?.length || 0
}))

// Shared audio data
const sharedAudio = computed(() => data.value?.sharedAudio || null)
const welcome = computed(() => data.value?.welcome || null)
const welcomeMissing = computed(() => data.value?.welcome?.hasAudio ? 0 : 1)

// By process summary
const byProcess = computed(() => data.value?.byProcess || {})

const samples = computed(() => data.value?.samples || {})

// Current missing items based on selected category and role
const currentMissingItems = computed(() => {
  if (selectedCategory.value === 'phrase') {
    return data.value?.missing?.[selectedRole.value] || []
  } else if (selectedCategory.value === 'seed') {
    return data.value?.seeds?.missing?.[selectedRole.value] || []
  } else if (selectedCategory.value === 'lego') {
    return data.value?.legos?.missing?.[selectedRole.value] || []
  } else if (selectedCategory.value === 'shared') {
    // Shared audio doesn't have individual items, just counts
    return []
  }
  return []
})

// Category selection helper
function selectCategory(category, role) {
  selectedCategory.value = category
  selectedRole.value = role
}

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
    for (const r of phraseRoles) {
      if (audioRefs.value[r.id]) {
        audioRefs.value[r.id].pause()
        isPlaying.value[r.id] = false
      }
    }
    audio.play()
    isPlaying.value[role] = true
  }
}

// Fetch ungeneratable items - texts that TTS will silently skip during generation
async function fetchUngeneratable() {
  if (!props.courseCode) return

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/production/${props.courseCode}/audio-pipeline/ungeneratable`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    )

    if (!response.ok) {
      console.warn('Failed to fetch ungeneratable items:', response.status)
      return
    }

    const result = await response.json()
    ungeneratableItems.value = result.items || []
  } catch (err) {
    console.warn('Error fetching ungeneratable items:', err)
  }
}

// Orphan LEGO functions - detect orphans, let user decide when to fix
async function fetchOrphanLegos() {
  if (!props.courseCode) return

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/production/${props.courseCode}/audio-pipeline/orphan-legos`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    )

    if (!response.ok) {
      console.warn('Failed to fetch orphan LEGOs:', response.status)
      return
    }

    const result = await response.json()
    orphanLegos.value = result.orphanLegos || []
  } catch (err) {
    console.warn('Error fetching orphan LEGOs:', err)
  }
}

async function fixOrphanLegos() {
  if (!props.courseCode || fixingOrphans.value) return

  fixingOrphans.value = true

  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/production/${props.courseCode}/audio-pipeline/fix-orphan-legos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ dryRun: false })
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()

    if (result.success && result.addedCount > 0) {
      console.log(`Added ${result.addedCount} debut phrases for orphan LEGOs`)
      orphanLegos.value = []
      // Refresh missing audio data to show the new items
      data.value = null
      await fetchMissingAudio()
    }
  } catch (err) {
    console.error('Failed to fix orphan LEGOs:', err)
    error.value = `Failed to fix orphan LEGOs: ${err.message}`
  } finally {
    fixingOrphans.value = false
  }
}

// Fetch when expanded
watch(expanded, (isExpanded) => {
  if (isExpanded && !data.value) {
    fetchMissingAudio()
    fetchOrphanLegos()
    fetchUngeneratable()
  }
})

// Refetch when refreshTrigger changes (e.g., voice config saved)
watch(() => props.refreshTrigger, () => {
  if (expanded.value) {
    // Clear existing data and refetch with new voice config
    data.value = null
    fetchMissingAudio()
    fetchOrphanLegos()
    fetchUngeneratable()
  }
})

// Also fetch on mount if already expanded
onMounted(() => {
  if (expanded.value) {
    fetchMissingAudio()
    fetchOrphanLegos()
    fetchUngeneratable()
  }
})
</script>

<style scoped>
/*
 * LIGHT-MODE color fixes ONLY.
 * The template uses dark-tuned Tailwind literals (amber/emerald/blue/cyan/teal/
 * purple/rose -400/-300 + low-alpha tints) that wash out on a light canvas.
 * Everything below is scoped under [data-theme="light"] so DARK MODE IS UNTOUCHED.
 * Each override keeps the same hue family but darkens text / solidifies fills to
 * meet WCAG AA on the new light surfaces (#ffffff / #f1f5f9 / #eef2f6).
 */

/* --- Status / accent TEXT (was ~1.4-2.6:1 on white -> now >=4.5:1) --- */
:root[data-theme="light"] .missing-audio :deep(.text-amber-400) { color: #b45309; }  /* amber-700  ~5.0:1 */
:root[data-theme="light"] .missing-audio :deep(.text-amber-300) { color: #92400e; }  /* amber-800  ~6.7:1 */
:root[data-theme="light"] .missing-audio :deep(.text-emerald-400) { color: #047857; } /* emerald-700 ~4.8:1 */
:root[data-theme="light"] .missing-audio :deep(.text-blue-400)  { color: #1d4ed8; }  /* blue-700   ~6.3:1 */
:root[data-theme="light"] .missing-audio :deep(.text-cyan-400)  { color: #0e7490; }  /* cyan-700   ~4.6:1 */
:root[data-theme="light"] .missing-audio :deep(.text-teal-400)  { color: #0f766e; }  /* teal-700   ~5.2:1 */
:root[data-theme="light"] .missing-audio :deep(.text-purple-400){ color: #7e22ce; }  /* purple-700 ~6.4:1 */
:root[data-theme="light"] .missing-audio :deep(.text-red-400)   { color: #b91c1c; }  /* red-700    ~5.9:1 */

/* --- "missing/all complete" pills in the header (translucent tint -> near-white) --- */
:root[data-theme="light"] .missing-audio :deep(.bg-amber-500\/20) {
  background-color: #fef3c7; /* amber-100 */
}
:root[data-theme="light"] .missing-audio :deep(.bg-emerald-500\/20) {
  background-color: #d1fae5; /* emerald-100 */
}

/* --- Orphan-LEGO warning banner (amber-900/20 fill, amber text) --- */
:root[data-theme="light"] .missing-audio :deep(.bg-amber-900\/20) {
  background-color: #fef3c7; /* amber-100 */
}
:root[data-theme="light"] .missing-audio :deep(.border-amber-500\/30) {
  border-color: #fbbf24; /* amber-400 — readable border on light */
}

/* --- Ungeneratable warning panel (rose family) --- */
:root[data-theme="light"] .missing-audio :deep(.bg-rose-900\/20) { background-color: #ffe4e6; } /* rose-100 */
:root[data-theme="light"] .missing-audio :deep(.bg-rose-950\/50) { background-color: #fecdd3; } /* rose-200 (sticky header) */
:root[data-theme="light"] .missing-audio :deep(.border-rose-500\/30) { border-color: #fb7185; }
:root[data-theme="light"] .missing-audio :deep(.border-rose-500\/20) { border-color: #fda4af; }
:root[data-theme="light"] .missing-audio :deep(.border-rose-500\/10) { border-color: #fecaca; }
:root[data-theme="light"] .missing-audio :deep(.text-rose-400) { color: #be123c; }      /* rose-700 */
:root[data-theme="light"] .missing-audio :deep(.text-rose-400\/70) { color: #9f1239; }  /* rose-800 */
:root[data-theme="light"] .missing-audio :deep(.text-rose-300) { color: #9f1239; }      /* rose-800 ~6:1 on rose-100 */
:root[data-theme="light"] .missing-audio :deep(.text-rose-300\/80) { color: #9f1239; }
:root[data-theme="light"] .missing-audio :deep(.text-rose-300\/70) { color: #9f1239; }
:root[data-theme="light"] .missing-audio :deep(.text-rose-300\/60) { color: #9f1239; }
:root[data-theme="light"] .missing-audio :deep(.text-rose-100) { color: #881337; }      /* rose-900 (the actual text value) */
</style>
