<template>
  <div class="text-generation">
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <!-- Language Selection (Create Mode) -->
      <section v-if="isCreateMode" class="bg-slate-800/30 border border-emerald-500/30 rounded-lg p-6">
        <h2 class="text-sm font-medium text-emerald-400 uppercase tracking-wide mb-4">New Course</h2>

        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="block text-xs text-slate-500 mb-2">Known Language (Learning FROM)</label>
            <select
              v-model="knownLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">Target Language (Learning TO)</label>
            <select
              v-model="targetLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select target language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
        </div>

        <div v-if="computedCourseCode" class="mt-4 flex items-center justify-between bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3">
          <p class="text-sm">
            <span class="text-slate-400">Course code:</span>
            <span class="text-emerald-400 font-mono ml-2">{{ computedCourseCode }}</span>
          </p>
          <button
            @click="createCourse"
            :disabled="creatingCourse"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
          >
            {{ creatingCourse ? 'Creating...' : 'Create Course' }}
          </button>
        </div>
      </section>

      <!-- Target seeds control -->
      <section v-if="!isCreateMode" class="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-2">
        <div class="flex items-center gap-4">
          <span class="text-xs text-slate-500 uppercase">Target</span>
          <div class="flex items-center gap-2">
            <button
              v-for="size in courseSizes"
              :key="size.seeds"
              @click="seedCount = size.seeds"
              class="px-2.5 py-1 rounded border transition-all text-xs font-medium"
              :class="seedCount === size.seeds
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
            >
              {{ size.label }}
            </button>
            <input
              v-model.number="seedCount"
              type="number"
              min="1"
              max="1000"
              class="w-16 px-2 py-1 rounded border bg-slate-700/50 border-slate-600/50 text-slate-200 text-xs text-center font-mono"
            />
          </div>
        </div>
      </section>

      <!-- Course Stats Summary Bar -->
      <section v-if="progress.currentSeed > 0 || progress.legosInserted > 0" class="bg-slate-800/30 border border-slate-700/50 rounded-lg px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Seeds</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.currentSeed }}/{{ progress.totalSeeds || seedCount }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">LEGOs</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.legosInserted }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Phrases</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.phrasesInserted.toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Ratio</span>
              <span class="text-sm font-mono font-semibold" :class="ratioClass">{{ ratio }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Quality</span>
              <span class="text-sm font-mono font-semibold" :class="qualityScoreClass">{{ progress.avgPhraseScore || '—' }}</span>
            </div>
          </div>
          <!-- Active Agents indicator -->
          <div v-if="agents.running_count > 0" class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span class="text-xs text-cyan-400">{{ agents.running_count }} agent{{ agents.running_count > 1 ? 's' : '' }}</span>
          </div>
        </div>
      </section>

      <!-- PIPELINE -->
      <section v-if="!isCreateMode" class="space-y-2">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-medium text-slate-500 uppercase tracking-wide">Pipeline</h2>
          <div class="flex items-center gap-2">
            <button
              @click="chatExpanded = !chatExpanded"
              class="px-2 py-1 rounded border text-xs font-medium transition-all relative"
              :class="chatExpanded
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-400'
                : orchestratorHasPending
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 animate-pulse'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-500 hover:border-violet-500/50 hover:text-violet-400'"
            >
              Chat
              <span v-if="unreadChatCount > 0 && !chatExpanded" class="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-900 px-1">{{ unreadChatCount > 99 ? '99+' : unreadChatCount }}</span>
            </button>
          </div>
        </div>

        <!-- Chat Panel -->
        <div v-if="chatExpanded" class="mb-3 bg-slate-900/60 border rounded-lg overflow-hidden flex flex-col"
          :class="orchestratorHasPending ? 'border-amber-500/40' : 'border-slate-600/40'"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="agents.running_count > 0 ? 'bg-emerald-400' : 'bg-slate-600'"></span>
              <span class="text-xs font-medium" :class="agents.running_count > 0 ? 'text-emerald-400' : 'text-slate-500'">
                Agent Chat
              </span>
              <span v-if="visibleChatMessages.length" class="text-xs text-slate-600">{{ visibleChatMessages.length }} messages</span>
            </div>
            <button @click="clearChat" class="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
          </div>

          <!-- Message thread -->
          <div ref="chatScrollEl" class="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-72">
            <div v-if="!visibleChatMessages.length" class="text-xs text-slate-600 text-center py-4">
              Messages with the decompose agent will appear here
            </div>
            <div
              v-for="msg in visibleChatMessages"
              :key="msg.id"
              class="flex"
              :class="msg.direction === 'human_to_agent' || msg._human ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[85%] rounded-lg px-3 py-2 text-xs"
                :class="msg.direction === 'human_to_agent' || msg._human
                  ? 'bg-violet-600/20 border border-violet-500/30 text-slate-200'
                  : msg.status === 'responded'
                    ? 'bg-slate-800/60 border border-slate-700/40 text-slate-400'
                    : 'bg-slate-800/80 border border-slate-600/40 text-slate-200'"
              >
                <div>{{ msg.message || msg.response }}</div>
                <div class="text-slate-600 mt-1">{{ formatTime(msg.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="px-3 py-2 border-t border-slate-700/50 flex gap-2">
            <textarea
              v-model="chatInput"
              placeholder="Message the agent..."
              rows="2"
              class="flex-1 bg-slate-800/50 border border-slate-600/40 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/50"
              @keydown.meta.enter="sendChat"
            />
            <button
              @click="sendChat"
              :disabled="chatSending || !chatInput.trim()"
              class="px-3 py-1 rounded border text-xs font-medium self-end transition-all disabled:opacity-30"
              :class="chatSending ? 'bg-violet-600/20 border-violet-500/50 text-violet-400 animate-pulse' : 'bg-violet-600/20 border-violet-500/50 text-violet-400 hover:bg-violet-600/30'"
            >
              {{ chatSending ? '...' : 'Send' }}
            </button>
          </div>
        </div>

        <!-- Stage 1: Translate -->
        <div class="pipeline-card" :class="stageCardClass('translate')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('translate')">1</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Translate</div>
                <div class="text-xs text-slate-500">668 seed translations</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ progress.seedsTranslated || 0 }}/668</span>
              <span v-if="stageComplete('translate')" class="stage-badge-complete">Done</span>
              <button
                v-else-if="!translateRunning"
                @click="startTranslation"
                :disabled="translateStarting"
                class="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:border-blue-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ translateStarting ? 'Spawning...' : 'Start Translate' }}
              </button>
              <span v-if="translateRunning" class="text-xs text-blue-400 animate-pulse">Running...</span>
            </div>
          </div>
          <div class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-blue-500 transition-all duration-500" :style="{ width: `${translatePercent}%` }"></div>
          </div>
        </div>

        <!-- Stage 2: Build Team -->
        <div class="pipeline-card" :class="stageCardClass('build-team')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('build-team')">2</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Build Team</div>
                <div class="text-xs text-slate-500">Creator/checker — Opus orchestrator</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ progress.currentSeed || 0 }}/{{ seedCount }}</span>
              <span v-if="stageComplete('build-team')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('build-team')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="!buildTeamRunning"
                @click="startBuildTeam"
                :disabled="buildTeamStarting"
                class="px-3 py-1 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ buildTeamStarting ? 'Spawning...' : 'Start Build' }}
              </button>
              <span v-if="buildTeamRunning" class="text-xs text-emerald-400 animate-pulse">Running...</span>
            </div>
          </div>
          <div v-if="!stageLocked('build-team')" class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" :style="{ width: `${buildPercent}%` }"></div>
          </div>
        </div>

        <!-- Stage 3: Final Pass -->
        <div class="pipeline-card" :class="stageCardClass('final-pass')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('final-pass')">3</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Final Pass</div>
                <div class="text-xs text-slate-500">Grammar audit — delete bad phrases</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="seedGridFlagged > 0" class="text-xs text-rose-400">{{ seedGridFlagged }} flagged</span>
              <span v-if="stageComplete('final-pass')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('final-pass')" class="stage-badge-locked">Locked</span>
              <span v-else-if="finalPassRunning" class="text-xs text-violet-400 animate-pulse">Running...</span>
              <button
                v-else-if="finalPassRan && seedGridDrafted > 0"
                @click="massApproveSeeds"
                :disabled="massApproving"
                class="px-3 py-1 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ massApproving ? 'Approving...' : `Approve ${seedGridDrafted} Seeds` }}
              </button>
              <button
                v-else
                @click="startFinalPass"
                :disabled="finalPassStarting"
                class="px-3 py-1 bg-violet-600/20 border border-violet-500/50 text-violet-400 hover:border-violet-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ finalPassStarting ? 'Spawning...' : 'Start Final Pass' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stage 4: Gender Prep -->
        <div class="pipeline-card" :class="stageCardClass('gender')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('gender')">4</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Gender Prep</div>
                <div class="text-xs text-slate-500">Gender expansions</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="stageComplete('gender')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('gender')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="!genderRunning"
                @click="startGenderPrep"
                :disabled="genderStarting"
                class="px-3 py-1 bg-pink-600/20 border border-pink-500/50 text-pink-400 hover:border-pink-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ genderStarting ? 'Starting...' : 'Start Gender Prep' }}
              </button>
              <span v-if="genderRunning" class="text-xs text-pink-400 animate-pulse">Running...</span>
            </div>
          </div>
        </div>

      </section>

      <!-- Seed Grid -->
      <section v-if="seedGrid.length > 0" class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          @click="seedGridExpanded = !seedGridExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-300 uppercase tracking-wide">Seed Grid</span>
            <span class="text-xs text-slate-500">
              {{ seedGridFinalized }}/{{ seedGrid.length }} finalized
            </span>
            <span v-if="seedGridDrafted > 0" class="text-xs text-amber-400">
              {{ seedGridDrafted }} drafted
            </span>
            <span v-if="seedGridCollision > 0" class="text-xs text-red-400">
              {{ seedGridCollision }} collision
            </span>
          </div>
          <svg
            class="w-5 h-5 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': seedGridExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="seedGridExpanded" class="border-t border-slate-700/50 px-6 py-5">
          <!-- Grid -->
          <div class="flex flex-wrap gap-1">
            <div
              v-for="cell in seedGrid"
              :key="cell.seed"
              class="w-5 h-5 rounded-sm cursor-pointer transition-colors"
              :class="[seedCellClass(cell), selectedSeed === cell.seed ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-slate-900' : '']"
              :title="`S${cell.seed}: ${cell.status} (${cell.legos}L, ${cell.phrases}P)`"
              @click="selectSeed(cell.seed)"
            ></div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-700/30"></span> Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-indigo-400/60"></span> Building</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-cyan-500/60"></span> Decomposed</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-rose-500/70 ring-1 ring-inset ring-rose-400"></span> Flagged</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-400/70"></span> Drafted</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500/80"></span> Complete</span>
          </div>
        </div>
      </section>

      <!-- Phrase Viewer (standalone, below grid) -->
      <section v-if="selectedSeed !== null" class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <div class="px-6 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-mono font-medium text-slate-300">Seed {{ selectedSeed }}</span>
            <button @click="selectedSeed = null; seedViewPhrases = []; seedViewSeedText = null" class="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕ close</button>
          </div>
          <!-- Seed sentence -->
          <div v-if="seedViewSeedText" class="mb-4 p-3 bg-slate-800/60 border border-slate-700/40 rounded">
            <div class="text-[10px] text-slate-500 mb-1 font-mono tracking-wider uppercase">Seed</div>
            <div class="flex items-start gap-2 flex-wrap">
              <span class="text-base font-medium text-slate-200">{{ seedViewSeedText.known_text || '…' }}</span>
              <span class="text-slate-500 text-sm mt-0.5">→</span>
              <span class="text-base text-emerald-400">{{ seedViewSeedText.target_text || '…' }}</span>
            </div>
          </div>
          <div v-if="seedViewLoading" class="text-sm text-slate-500 animate-pulse py-2">Loading...</div>
          <div v-else-if="seedViewPhrases.length === 0" class="text-sm text-slate-600 py-2">No phrases found for this seed.</div>
          <div v-else class="space-y-3">
            <div v-for="lego in seedViewPhrases" :key="lego.lego_index" class="border border-slate-700/40 rounded p-3">
              <!-- LEGO header -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-mono text-slate-600">L{{ lego.lego_index }}</span>
                <template v-if="lego.meta">
                  <span class="text-[10px] px-1 rounded font-mono" :class="(lego.meta.type || lego.meta.lego_type) === 'M' ? 'bg-violet-900/40 text-violet-400' : 'bg-slate-700/40 text-slate-400'">{{ lego.meta.type || lego.meta.lego_type }}</span>
                  <span class="text-base font-medium text-slate-200">{{ lego.meta.known_text }}</span>
                  <span class="text-slate-600 text-sm">→</span>
                  <span class="text-base font-medium text-emerald-400">{{ lego.meta.target_text }}</span>
                </template>
              </div>
              <!-- Phrases -->
              <div v-for="phrase in lego.phrases" :key="phrase.id" class="flex gap-2 text-sm py-0.5 pl-3">
                <span class="font-mono w-8 shrink-0 text-xs" :class="phrase.phrase_role === 'use' ? 'text-emerald-400/70' : phrase.phrase_role === 'component' ? 'text-slate-500' : 'text-amber-400/70'">
                  {{ phrase.phrase_role === 'use' ? 'USE' : phrase.phrase_role === 'component' ? 'CMP' : 'BLD' }}
                </span>
                <span class="text-slate-300">{{ phrase.known_text }}</span>
                <span class="text-slate-600 shrink-0">→</span>
                <span class="text-slate-400">{{ phrase.target_text }}</span>
              </div>
            </div>
          </div>

          <!-- Approve / Redo controls -->
          <div class="mt-4 pt-4 border-t border-slate-700/50 flex gap-3 items-start">
            <textarea
              v-model="seedReviewNotes"
              placeholder="Notes for redo (optional)..."
              rows="2"
              class="flex-1 bg-slate-800/80 border border-slate-700 rounded text-sm text-slate-300 placeholder-slate-600 px-3 py-2 resize-none"
            />
            <button
              @click="redoSeed"
              :disabled="seedRedoing"
              class="px-4 py-2 bg-orange-600/20 border border-orange-500/50 text-orange-400 hover:border-orange-400/70 disabled:opacity-50 text-sm font-medium rounded transition-all shrink-0"
            >{{ seedRedoing ? 'Sending...' : 'Redo' }}</button>
            <button
              @click="approveSeed"
              :disabled="seedApproving"
              class="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-sm font-medium rounded transition-all shrink-0"
            >{{ seedApproving ? 'Approving...' : 'Approve' }}</button>
          </div>
        </div>
      </section>

      <!-- Controls -->
      <section v-if="progress.status === 'running' && agents.running_count === 0" class="flex justify-end gap-3">
        <button
          @click="forceResetBuilder"
          class="px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
          title="Force reset when no agents are running"
        >
          Force Reset
        </button>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { useTextGenSocket } from '@/composables/useTextGenSocket'
import { useBuildMonitor } from '@/composables/useBuildMonitor'

const router = useRouter()

const props = defineProps({
  courseCode: {
    type: String,
    default: 'new'
  }
})

// Create mode detection
const isCreateMode = computed(() => props.courseCode === 'new')

// Language selection state
const knownLanguage = ref('')
const targetLanguage = ref('')
const languages = ref([])
const languagesLoading = ref(true)
const creatingCourse = ref(false)

// Computed course code from language selection
const computedCourseCode = computed(() => {
  if (!knownLanguage.value || !targetLanguage.value) return ''
  return `${targetLanguage.value}_for_${knownLanguage.value}`
})

// Effective course code (from prop or computed)
const effectiveCourseCode = computed(() => {
  return isCreateMode.value ? computedCourseCode.value : props.courseCode
})

// Configuration
const seedCount = ref(300)

const courseSizes = [
  { seeds: 300, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

// Progress state
const progress = ref({
  status: 'idle',
  currentSeed: 0,
  seedsTranslated: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
})

// Agent tracking state
const agents = ref({
  running: [],
  running_count: 0,
  total_tracked: 0
})

// WebSocket for real-time updates
const socket = useTextGenSocket()

// Chat state
const chatExpanded = ref(false)
const chatInput = ref('')
const chatSending = ref(false)
const chatClearedAt = ref(localStorage.getItem('chat_cleared_at') || null)
const chatScrollEl = ref(null)

// Orchestrator messages (used for chat display)
const orchestratorMessages = ref([])

// Translation agent state
const translateStarting = ref(false)
const translateRunning = ref(false)

// Build Team agent state
const buildTeamStarting = ref(false)
const buildTeamRunning = ref(false)

// Final Pass agent state
const finalPassStarting = ref(false)
const finalPassRunning = ref(false)
const massApproving = ref(false)

// Gender Prep state
const genderStarting = ref(false)
const genderRunning = ref(false)


// Seed grid state
const seedGrid = ref([])
const seedGridExpanded = ref(true)

// Build monitor — direct Supabase reads + Realtime (replaces HTTP polling)
const buildMonitor = useBuildMonitor(effectiveCourseCode)

// Sync buildMonitor data into existing component state
watch(buildMonitor.stats, (s) => {
  if (!s) return
  const totalSeeds = progress.value.totalSeeds || seedCount.value
  progress.value = {
    ...progress.value,
    currentSeed: s.completeSeeds || 0,
    seedsTranslated: s.seeds || 0,
    legosInserted: s.legos || 0,
    phrasesInserted: s.practicePhrases || 0,
    totalSeeds
  }
}, { deep: true })

watch(buildMonitor.seedGrid, (grid) => {
  if (grid && grid.length > 0) seedGrid.value = grid
}, { deep: true })

watch(buildMonitor.buildStatus, (bs) => {
  if (!bs) return
  const pass = bs.build?.pass
  translateRunning.value = bs.active && pass === 'translate'
  buildTeamRunning.value = bs.active && pass === 'build-team'
  finalPassRunning.value = bs.active && pass === 'final-pass'
  finalPassRan.value = bs.finalPassCompleted || buildMonitor.pipeline.value?.finalPassCompleted || false
  if (bs.active) {
    progress.value.status = 'running'
    progress.value.buildPass = pass || null
    if (bs.build?.total_seeds && (pass === 'build-team' || pass === 'decompose')) {
      seedCount.value = bs.build.total_seeds
    }
  } else {
    translateRunning.value = false
    buildTeamRunning.value = false
    finalPassRunning.value = false
    progress.value.buildPass = null
    if (bs.progress?.isComplete) {
      progress.value.status = 'complete'
    } else if (progress.value.status === 'running') {
      progress.value.status = 'idle'
    }
  }
}, { deep: true })

watch(buildMonitor.messages, (msgs) => {
  if (msgs && msgs.length > 0) orchestratorMessages.value = msgs
}, { deep: true })

// Seed grid phrase viewer state
const selectedSeed = ref(null)
const seedViewPhrases = ref([])
const seedViewSeedText = ref(null)
const seedViewLoading = ref(false)
const seedReviewNotes = ref('')
const seedApproving = ref(false)
const seedRedoing = ref(false)

const seedGridFinalized = computed(() => seedGrid.value.filter(s => s.status === 'complete').length)
const seedGridDrafted = computed(() => seedGrid.value.filter(s => s.status === 'drafted').length)
const seedGridCollision = computed(() => seedGrid.value.filter(s => s.status === 'collision' || s.status === 'rework').length)
const seedGridFlagged = computed(() => seedGrid.value.filter(s => s.status === 'flagged').length)
const finalPassRan = ref(false)

// --- Pipeline computeds ---

const translatePercent = computed(() => {
  const total = progress.value.totalSeeds || 668
  return Math.round(((progress.value.seedsTranslated || 0) / total) * 100)
})

const buildPercent = computed(() => {
  if (seedCount.value <= 0) return 0
  return Math.round(((progress.value.currentSeed || 0) / seedCount.value) * 100)
})

const pipelinePhase = computed(() => {
  if (!stageComplete('translate')) return 'translate'
  if (!stageComplete('build-team')) return 'build-team'
  if (!stageComplete('final-pass')) return 'final-pass'
  return 'gender'
})

function stageComplete(stage) {
  switch (stage) {
    case 'translate': return (progress.value.seedsTranslated || 0) >= (progress.value.totalSeeds || 668)
    case 'build-team': return (progress.value.currentSeed || 0) >= seedCount.value
    case 'final-pass': return finalPassRan.value && seedGridDrafted.value === 0
    case 'gender': return progress.value.genderDone === true
    default: return false
  }
}

function stageLocked(stage) {
  switch (stage) {
    case 'translate': return false
    case 'build-team': return !stageComplete('translate')
    case 'final-pass': return !stageComplete('build-team')
    case 'gender': return !stageComplete('final-pass')
    default: return false
  }
}

function stageCardClass(stage) {
  if (stageLocked(stage)) return 'border-slate-700/30 opacity-50'
  if (pipelinePhase.value === stage) return 'border-cyan-500/30'
  if (stageComplete(stage)) return 'border-emerald-500/20'
  return 'border-slate-700/50'
}

function stageNumberClass(stage) {
  if (stageComplete(stage)) return 'bg-emerald-500/20 text-emerald-400'
  if (pipelinePhase.value === stage) return 'bg-cyan-500/20 text-cyan-400'
  if (stageLocked(stage)) return 'bg-slate-700/50 text-slate-500'
  return 'bg-slate-700/50 text-slate-400'
}

function seedCellClass(cell) {
  switch (cell.status) {
    case 'flagged':
      return 'bg-rose-500/70 ring-1 ring-inset ring-rose-400'
    case 'collision':
    case 'rework':
      return 'bg-rose-500/60 ring-1 ring-inset ring-rose-400'
    case 'complete':
      return 'bg-emerald-500/80'
    case 'decomposed':
      return 'bg-cyan-500/60'
    case 'drafted':
      return 'bg-amber-400/70'
    case 'building':
      return 'bg-indigo-400/60'
    default:
      return 'bg-slate-700/30'
  }
}

// Computed
const ratio = computed(() => {
  if (!progress.value.legosInserted) return '0.0'
  return (progress.value.phrasesInserted / progress.value.legosInserted).toFixed(1)
})

const ratioClass = computed(() => {
  const r = parseFloat(ratio.value)
  if (r >= 7) return 'text-emerald-400'
  if (r >= 5) return 'text-yellow-400'
  return 'text-slate-200'
})

const qualityScoreClass = computed(() => {
  const score = parseFloat(progress.value.avgPhraseScore)
  if (isNaN(score)) return 'text-slate-400'
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6.5) return 'text-cyan-400'
  if (score >= 5.5) return 'text-yellow-400'
  return 'text-orange-400'
})

// Chat computeds
const orchestratorHasPending = computed(() =>
  orchestratorMessages.value.some(m => m.direction === 'agent_to_human' && m.status === 'pending')
)

const visibleChatMessages = computed(() => {
  if (!chatClearedAt.value) return orchestratorMessages.value
  return orchestratorMessages.value.filter(m => m.created_at > chatClearedAt.value)
})

const unreadChatCount = computed(() => visibleChatMessages.value.length)

// Methods
async function fetchProgress() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const apiBase = getApiUrl()

    const [statsResponse, buildResponse] = await Promise.all([
      fetch(`${apiBase}/api/stats/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }),
      fetch(`${apiBase}/api/build/status/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    ])

    if (statsResponse.ok) {
      const data = await statsResponse.json()
      const totalSeeds = data.total_seeds || seedCount.value

      progress.value = {
        ...progress.value,
        currentSeed: data.seeds_with_legos || data.seeds || 0,
        seedsTranslated: data.completed_seeds || data.seeds_translated || 0,
        totalSeeds: totalSeeds,
        legosInserted: data.legos || 0,
        phrasesInserted: data.phrases || 0,
        avgPhraseScore: data.avg_phrase_score || null,
        scoredPhrases: data.scored_phrases || 0
      }

      if (buildResponse.ok) {
        const buildData = await buildResponse.json()
        const pass = buildData.build?.pass
        translateRunning.value = buildData.active && pass === 'translate'
        buildTeamRunning.value = buildData.active && pass === 'build-team'
        finalPassRunning.value = buildData.active && pass === 'final-pass'
        if (buildData.active) {
          progress.value.status = 'running'
          progress.value.buildPass = pass || null
          if (buildData.build?.total_seeds && (pass === 'build-team' || pass === 'decompose')) {
            seedCount.value = buildData.build.total_seeds
          }
        } else {
          translateRunning.value = false
          buildTeamRunning.value = false
          finalPassRunning.value = false
          progress.value.buildPass = null
          if (data.seeds_with_legos >= totalSeeds && data.seeds_with_legos > 0) {
            progress.value.status = 'complete'
          } else if (progress.value.status === 'running') {
            progress.value.status = 'idle'
          }
        }
      }

      if (data.seeds === 0 && progress.value.status === 'complete') {
        progress.value.status = 'idle'
      }
    }

    fetchSeedGrid()
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function fetchSeedGrid() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/build/seed-grid/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      seedGrid.value = data.seeds || []
    }
  } catch (err) {
    console.error('Failed to fetch seed grid:', err)
  }
}

async function createCourse() {
  const courseCode = computedCourseCode.value
  if (!courseCode) return

  creatingCourse.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode,
        knownLanguage: knownLanguage.value,
        targetLanguage: targetLanguage.value,
        seedStart: 1,
        seedEnd: seedCount.value,
        seedCount: seedCount.value
      })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to create course')
    router.push(`/production/${courseCode}/text`)
  } catch (error) {
    console.error('Failed to create course:', error)
    alert(`Failed to create course: ${error.message}`)
  } finally {
    creatingCourse.value = false
  }
}

async function startTranslation() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  translateStarting.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/build/translate/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      translateRunning.value = true
    } else {
      console.error('Failed to start translation:', result.error)
    }
  } catch (err) {
    console.error('Failed to start translation:', err)
  } finally {
    translateStarting.value = false
  }
}

async function startBuildTeam() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  buildTeamStarting.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/build/team-start/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      buildTeamRunning.value = true
    } else {
      console.error('Failed to start build team:', result.error)
    }
  } catch (err) {
    console.error('Failed to start build team:', err)
  } finally {
    buildTeamStarting.value = false
  }
}

async function startFinalPass() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  finalPassStarting.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/build/final-pass/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      finalPassRunning.value = true
    } else {
      console.error('Failed to start final pass:', result.error)
    }
  } catch (err) {
    console.error('Failed to start final pass:', err)
  } finally {
    finalPassStarting.value = false
  }
}

async function massApproveSeeds() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  massApproving.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/build/mass-approve/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      // Refresh the seed grid
      const gridResp = await fetch(`${apiBase}/api/build/seed-grid/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      const data = await gridResp.json()
      seedGrid.value = data.seeds || []
    } else {
      console.error('Failed to mass approve:', result.error)
    }
  } catch (err) {
    console.error('Failed to mass approve:', err)
  } finally {
    massApproving.value = false
  }
}

async function startGenderPrep() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  genderStarting.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/production/${courseCode}/gender-prep/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok !== false) {
      genderRunning.value = true
    } else {
      console.error('Failed to start gender prep:', result.error)
    }
  } catch (err) {
    console.error('Failed to start gender prep:', err)
  } finally {
    genderStarting.value = false
  }
}


async function stopBuilder() {
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    progress.value.status = 'idle'
  } catch (error) {
    console.error('Failed to stop builder:', error)
  }
}

async function forceResetBuilder() {
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
  } catch (error) {
    console.warn('Stop API call failed during force reset:', error)
  }

  stopPolling()
  progress.value = {
    status: 'idle',
    currentSeed: progress.value.currentSeed,
    totalSeeds: progress.value.totalSeeds,
    legosInserted: progress.value.legosInserted,
    phrasesInserted: progress.value.phrasesInserted,
    avgPhraseScore: progress.value.avgPhraseScore,
    scoredPhrases: progress.value.scoredPhrases
  }
  startPolling()
}

async function killAgent(pid) {
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/agents/${pid}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      fetchProgress()
    }
  } catch (error) {
    console.error('Failed to kill agent:', error)
  }
}

// Seed grid phrase viewer
async function selectSeed(seedNum) {
  const courseCode = effectiveCourseCode.value
  if (selectedSeed.value === seedNum) {
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    return
  }
  selectedSeed.value = seedNum
  seedViewPhrases.value = []
  seedViewSeedText.value = null
  seedViewLoading.value = true
  try {
    const apiBase = getApiUrl()
    const h = { 'ngrok-skip-browser-warning': 'true' }
    const [legosResp, phrasesResp, seedsResp] = await Promise.all([
      fetch(`${apiBase}/api/legos/${courseCode}?seed=${seedNum}`, { headers: h }),
      fetch(`${apiBase}/api/phrases/${courseCode}?seed_min=${seedNum}&seed_max=${seedNum}&limit=300`, { headers: h }),
      fetch(`${apiBase}/api/seeds/${courseCode}?offset=${seedNum - 1}&limit=1`, { headers: h })
    ])
    // Seed sentence
    if (seedsResp.ok) {
      const sd = await seedsResp.json()
      const seed = (sd.seeds || []).find(s => s.seed_number === seedNum)
      if (seed) seedViewSeedText.value = { known_text: seed.known_text, target_text: seed.target_text }
    }
    // LEGO metadata
    const legoMeta = {}
    if (legosResp.ok) {
      const d = await legosResp.json()
      for (const l of (d.legos || [])) legoMeta[l.lego_index] = l
    }
    // Phrases grouped by lego
    if (phrasesResp.ok) {
      const data = await phrasesResp.json()
      const legoMap = new Map()
      for (const p of (data.phrases || [])) {
        const key = p.lego_index ?? 0
        if (!legoMap.has(key)) legoMap.set(key, { lego_index: key, meta: legoMeta[key] || null, phrases: [] })
        legoMap.get(key).phrases.push(p)
      }
      for (const [idx, meta] of Object.entries(legoMeta)) {
        if (!legoMap.has(parseInt(idx))) legoMap.set(parseInt(idx), { lego_index: parseInt(idx), meta, phrases: [] })
      }
      seedViewPhrases.value = [...legoMap.values()].sort((a, b) => a.lego_index - b.lego_index)
    }
  } catch (err) {
    console.error('Failed to fetch seed phrases:', err)
  } finally {
    seedViewLoading.value = false
  }
}

// Approve / Redo seed — posts to chat endpoint, server finds & responds to pending agent message
async function approveSeed() {
  const courseCode = effectiveCourseCode.value
  const seedNum = selectedSeed.value
  if (!courseCode || !seedNum) return
  seedApproving.value = true
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/orchestrator/chat/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ role: 'human', message: `Approved seed ${seedNum}`, action: 'approve', metadata: { seed_number: seedNum } })
    })
    seedReviewNotes.value = ''
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    await Promise.all([fetchOrchestratorMessages(), fetchSeedGrid()])
    // Auto-select next amber (drafted) seed
    const nextDrafted = seedGrid.value.find(s => s.status === 'drafted')
    if (nextDrafted) selectSeed(nextDrafted.seed)
  } catch (err) {
    console.error('Failed to approve seed:', err)
  } finally {
    seedApproving.value = false
  }
}

async function redoSeed() {
  const courseCode = effectiveCourseCode.value
  const seedNum = selectedSeed.value
  if (!courseCode || !seedNum) return
  seedRedoing.value = true
  try {
    const apiBase = getApiUrl()
    const notes = seedReviewNotes.value.trim()
    await fetch(`${apiBase}/api/orchestrator/chat/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ role: 'human', message: `Redo seed ${seedNum}.${notes ? ' ' + notes : ''}`, action: 'redo' })
    })
    seedReviewNotes.value = ''
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    // Optimistically clear the seed from the grid so it's no longer amber
    const cell = seedGrid.value.find(s => s.seed === seedNum)
    if (cell) cell.status = 'building'
    await Promise.all([fetchOrchestratorMessages(), fetchSeedGrid()])
    // Auto-select next amber seed
    const nextDrafted = seedGrid.value.find(s => s.status === 'drafted')
    if (nextDrafted) selectSeed(nextDrafted.seed)
    seedRedoing.value = false
  } catch (err) {
    console.error('Failed to send redo:', err)
    seedRedoing.value = false
  }
}

// Chat functions
function clearChat() {
  const now = new Date().toISOString()
  chatClearedAt.value = now
  localStorage.setItem('chat_cleared_at', now)
}

async function sendChat() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || !chatInput.value.trim()) return
  chatSending.value = true
  const text = chatInput.value.trim()
  try {
    const apiBase = getApiUrl()

    await fetch(`${apiBase}/api/orchestrator/chat/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ role: 'human', message: text })
    })
    await fetchOrchestratorMessages()

    chatInput.value = ''
    await nextTick()
    if (chatScrollEl.value) chatScrollEl.value.scrollTop = chatScrollEl.value.scrollHeight
  } catch (err) {
    console.error('Failed to send chat:', err)
  } finally {
    chatSending.value = false
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function fetchOrchestratorMessages() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = getApiUrl()
    const resp = await fetch(`${apiBase}/api/orchestrator/messages/${courseCode}?limit=200`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (resp.ok) {
      const data = await resp.json()
      orchestratorMessages.value = data.messages || []
    }
  } catch (err) {
    console.error('Failed to fetch orchestrator messages:', err)
  }
}

// Polling — now handled by useBuildMonitor (Realtime + 30s fallback)
function startPolling() {
  buildMonitor.start()
}

function stopPolling() {
  buildMonitor.stop()
}

// Load languages from API
async function loadLanguages() {
  languagesLoading.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/languages?tts=true&format=legacy`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      languages.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load languages:', error)
    languages.value = [
      { code: 'eng', name: 'English' },
      { code: 'deu', name: 'German' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'zho', name: 'Chinese' },
      { code: 'jpn', name: 'Japanese' }
    ]
  } finally {
    languagesLoading.value = false
  }
}

// Debounced socket watchers
let socketDebounceTimers = {}
function debouncedFetch(key, fn, delay = 2000) {
  if (socketDebounceTimers[key]) clearTimeout(socketDebounceTimers[key])
  socketDebounceTimers[key] = setTimeout(fn, delay)
}

watch(() => socket.lastSeedComplete.value, (v) => { if (v) debouncedFetch('seed', () => { fetchSeedGrid(); fetchProgress() }) })
watch(() => socket.lastBuildStatus.value, (v) => { if (v) debouncedFetch('build', fetchProgress) })
watch(() => socket.lastOrchestratorMessage.value, () => { fetchOrchestratorMessages() })
watch(() => socket.lastOrchestratorResponse.value, () => { fetchOrchestratorMessages() })

// Lifecycle
onMounted(() => {
  startPolling()
  if (!isCreateMode.value) {
    socket.connect(effectiveCourseCode.value)
    fetchOrchestratorMessages()
  }
  if (isCreateMode.value) {
    loadLanguages()
  }
})

onUnmounted(() => {
  stopPolling()
  socket.disconnect()
})
</script>

<style scoped>
.text-generation {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
}

.pipeline-card {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  transition: all 0.2s;
}

.stage-number {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  flex-shrink: 0;
}

.stage-badge-complete {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(16, 185, 129, 0.2);
  color: rgb(52, 211, 153);
}

.stage-badge-locked {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(71, 85, 105, 0.3);
  color: rgb(148, 163, 184);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--color-graphite, #475569);
  border-radius: 3px;
}
</style>
