<template>
  <div class="min-h-screen bg-canvas text-ink">
    <div class="max-w-[1600px] mx-auto p-6 lg:p-8">

      <!-- Header -->
      <header class="mb-8">
        <div class="flex items-center gap-3 mb-6">
          <router-link :to="`/production/${courseCode}`" class="text-muted hover:text-accent-2 transition-colors text-sm">
            &larr; Production Suite
          </router-link>
          <span class="text-faint">|</span>
          <h1 class="text-xl font-semibold text-ink">Recording Optimizer</h1>
          <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm font-medium">
            {{ courseCode }}
          </span>
          <div class="ml-auto flex items-center gap-6 text-sm">
            <div class="text-right">
              <span class="text-faint uppercase tracking-wider text-xs">Phrases</span>
              <div class="text-lg font-semibold">
                <span class="text-accent-2">{{ recordedCount }}</span>
                <span class="text-faint"> / </span>
                <span class="text-ink">{{ totalRecordings }}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-faint uppercase tracking-wider text-xs">Coverage</span>
              <div class="text-lg font-semibold text-accent-2">{{ totalCoverage }}%</div>
            </div>
          </div>
        </div>
        <div class="h-px bg-gradient-to-r from-emerald-500/50 via-surface-2 to-transparent"></div>
      </header>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-6">

        <!-- Left Column -->
        <div class="space-y-6">

          <!-- Algorithm Results -->
          <section class="rounded-xl border border-line bg-surface/50 overflow-hidden">
            <div class="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink uppercase tracking-wider">
                Your reading plan
              </h2>
              <button @click="runAlgorithm"
                      :disabled="isCalculating"
                      class="text-sm px-4 py-1.5 bg-surface-2 text-ink rounded
                             hover:bg-surface-3 transition-colors disabled:opacity-50">
                {{ isCalculating ? 'Calculating...' : 'Recalculate' }}
              </button>
            </div>

            <div class="p-6">
              <!-- Stats Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <div class="bg-canvas rounded-lg p-4 border border-line">
                  <div class="text-2xl font-bold text-ink">{{ stats.totalLegos }}</div>
                  <div class="text-xs text-faint uppercase tracking-wider mt-1">Building blocks</div>
                </div>
                <div class="bg-canvas rounded-lg p-4 border border-line">
                  <div class="text-2xl font-bold text-accent-2">{{ stats.phrasesToRecord }}</div>
                  <div class="text-xs text-faint uppercase tracking-wider mt-1">Phrases</div>
                </div>
                <div class="bg-canvas rounded-lg p-4 border border-line">
                  <div class="text-2xl font-bold text-accent">{{ stats.directRecord }}</div>
                  <div class="text-xs text-faint uppercase tracking-wider mt-1">Direct</div>
                </div>
                <div class="bg-canvas rounded-lg p-4 border border-line">
                  <div class="text-2xl font-bold text-ink">~{{ stats.estimatedMinutes }}m</div>
                  <div class="text-xs text-faint uppercase tracking-wider mt-1">Est. Time</div>
                </div>
                <div class="bg-canvas rounded-lg p-4 border border-line">
                  <div class="text-2xl font-bold text-accent-2">{{ stats.reductionPercent }}%</div>
                  <div class="text-xs text-faint uppercase tracking-wider mt-1">Reduction</div>
                </div>
              </div>

              <!-- Efficiency Bar -->
              <div class="bg-canvas rounded-lg p-4 border border-line">
                <div class="flex items-center justify-between mb-2 text-sm">
                  <span class="text-muted">Recording Efficiency</span>
                  <span class="text-ink">{{ totalRecordings }} recordings &rarr; {{ stats.totalPhrases.toLocaleString() }} phrases</span>
                </div>
                <div class="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full" :style="{ width: stats.reductionPercent + '%' }"></div>
                </div>
              </div>
            </div>
          </section>

          <!-- Start Recording Session CTA -->
          <section class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-accent-2">Ready to Record?</h2>
                <p class="text-muted text-sm mt-1">
                  Open the teleprompter-style Recording Studio to flow through all {{ totalRecordings }} phrases
                </p>
              </div>
              <router-link
                :to="`/production/${courseCode}/recording-studio`"
                class="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium
                       hover:bg-emerald-500 transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                </svg>
                Open Recording Studio
              </router-link>
            </div>
          </section>

          <!-- Audio stitching demo -->
          <section class="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
            <div class="px-6 py-4 border-b border-violet-500/20">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🧬</span>
                <div>
                  <h2 class="text-lg font-semibold text-violet-300 lt-violet-strong">How phrases get stitched</h2>
                  <p class="text-sm text-muted">New phrases are built from pieces your voices already recorded</p>
                </div>
              </div>
            </div>

            <div class="p-6 space-y-6">
              <!-- Target phrase with audio -->
              <div class="text-center">
                <p class="text-xs text-faint uppercase tracking-wider mb-2">Stitched phrase</p>
                <p class="text-xl text-ink font-medium">{{ currentExample.welsh }}</p>
                <p class="text-sm text-muted mt-1">"{{ currentExample.english }}"</p>
                <!-- Play button for target -->
                <div class="mt-3 flex justify-center">
                  <button v-if="demoAudio[currentExample.seed]"
                          @click="playDemoAudio(currentExample.seed)"
                          :class="[
                            'flex items-center gap-2 px-4 py-2 text-ink lt-on-fill rounded-lg transition-colors',
                            currentlyPlaying === currentExample.seed
                              ? 'bg-violet-700 ring-2 ring-violet-400'
                              : 'bg-violet-600 hover:bg-violet-500'
                          ]">
                    <svg v-if="currentlyPlaying !== currentExample.seed" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 3.3l10 6.7a1 1 0 010 1.6l-10 6.7A1 1 0 015 17V3a1 1 0 011.3-.7z"/>
                    </svg>
                    <svg v-else class="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="5" y="4" width="3" height="12" rx="1"/>
                      <rect x="12" y="4" width="3" height="12" rx="1"/>
                    </svg>
                    {{ currentlyPlaying === currentExample.seed ? 'Playing...' : 'Play the stitched result' }}
                  </button>
                  <span v-else class="text-sm text-faint italic">Loading audio...</span>
                </div>
              </div>

              <!-- Build visualization -->
              <div class="bg-canvas rounded-lg p-4 border border-line">
                <p class="text-xs text-faint uppercase tracking-wider mb-4 text-center">Built from these recorded phrases:</p>

                <div class="flex flex-wrap justify-center gap-2 mb-6">
                  <span v-for="(word, idx) in currentExample.buildOrder" :key="idx"
                        :class="[
                          'px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer hover:scale-105',
                          word.sourceColor
                        ]"
                        @click="playDemoAudio(word.from)">
                    {{ word.text }}
                    <span class="text-xs opacity-60 ml-1">S{{ word.from }}</span>
                  </span>
                </div>

                <!-- Source phrases with play buttons -->
                <div class="space-y-3 mt-6">
                  <div v-for="source in usedSources" :key="source.seed"
                       :class="['p-3 rounded-lg border', source.borderClass]">
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span :class="['text-xs font-semibold uppercase tracking-wider', source.textClass]">
                            Seed {{ source.seed }}
                          </span>
                          <!-- Play button -->
                          <button v-if="demoAudio[source.seed]"
                                  @click="playDemoAudio(source.seed)"
                                  :class="[
                                    'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                                    currentlyPlaying === source.seed ? 'ring-2 ring-white/50' : '',
                                    source.playBtnClass
                                  ]">
                            <svg class="w-3 h-3 text-ink lt-on-fill ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 3.3l10 6.7a1 1 0 010 1.6l-10 6.7A1 1 0 015 17V3a1 1 0 011.3-.7z"/>
                            </svg>
                          </button>
                        </div>
                        <p class="text-sm text-ink mt-1">{{ source.welsh }}</p>
                        <p class="text-xs text-faint">"{{ source.english }}"</p>
                      </div>
                      <div class="flex flex-wrap gap-1 ml-4">
                        <span v-for="lego in sourceProvides[source.seed]" :key="lego"
                              :class="['text-xs px-2 py-0.5 rounded', source.badgeClass]">
                          {{ lego }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Key insight -->
              <div class="bg-gradient-to-r from-violet-500/10 to-emerald-500/10 rounded-lg p-4 border border-violet-500/20">
                <div class="flex items-start gap-3">
                  <span class="text-xl">💡</span>
                  <div>
                    <p class="text-sm text-ink font-medium">The Magic</p>
                    <p class="text-sm text-muted mt-1">
                      By recording just <span class="text-accent-2 font-semibold">{{ totalRecordings }} phrases</span>,
                      we can stitch together audio for all <span class="text-violet-400 font-semibold lt-violet-strong">{{ stats.totalPhrases.toLocaleString() }} phrases</span> in the course.
                      That's a <span class="text-accent font-semibold">{{ stats.reductionPercent }}% reduction</span> in recording effort.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Hidden audio element for playback -->
            <audio ref="demoAudioPlayer" @ended="currentlyPlaying = null"></audio>
          </section>

          <!-- Recording Script Preview -->
          <section class="rounded-xl border border-line bg-surface/50 overflow-hidden">
            <div class="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink uppercase tracking-wider">
                Recording Script Preview
              </h2>
              <div class="flex items-center gap-3">
                <span class="text-xs text-faint">{{ filteredPhrases.length }} phrases</span>
                <button @click="exportPDF"
                        disabled
                        title="Not implemented yet"
                        class="text-sm px-4 py-1.5 bg-surface-2 text-ink rounded
                               hover:bg-surface-3 transition-colors disabled:opacity-50">
                  Export PDF
                </button>
              </div>
            </div>

            <!-- Phrase List -->
            <div class="max-h-[400px] overflow-y-auto">
              <div v-for="(phrase, index) in filteredPhrases.slice(0, 20)" :key="phrase.id"
                   class="px-6 py-3 border-b border-line/50">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                      <span class="text-faint text-xs font-mono">{{ String(index + 1).padStart(3, '0') }}</span>
                      <span class="text-xs text-faint">{{ phrase.legoCount }} building blocks</span>
                    </div>
                    <p class="text-sm text-ink">{{ phrase.target }}</p>
                    <p class="text-xs text-faint mt-0.5">{{ phrase.source }}</p>
                  </div>
                </div>
              </div>

              <div v-if="filteredPhrases.length > 20" class="px-6 py-4 text-center text-faint text-sm">
                + {{ filteredPhrases.length - 20 }} more phrases...
              </div>

              <div v-if="filteredPhrases.length === 0" class="p-12 text-center text-faint">
                Run the algorithm to generate the recording script
              </div>
            </div>
          </section>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">

          <!-- Coverage Overview -->
          <section class="rounded-xl border border-line bg-surface/50 overflow-hidden">
            <div class="px-6 py-4 border-b border-line">
              <h2 class="text-sm font-semibold text-ink uppercase tracking-wider">
                Coverage
              </h2>
            </div>
            <div class="p-6">
              <!-- Ring Chart -->
              <div class="flex justify-center mb-6">
                <div class="relative w-32 h-32">
                  <svg class="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                            class="text-faint" stroke-width="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                            class="text-emerald-500" stroke-width="8"
                            :stroke-dasharray="`${recordedPercent * 2.51} 251`"
                            stroke-linecap="round"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                            class="text-violet-500" stroke-width="8"
                            :stroke-dasharray="`${splicedPercent * 2.51} 251`"
                            :stroke-dashoffset="`-${recordedPercent * 2.51}`"
                            stroke-linecap="round"/>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-2xl font-bold text-ink">{{ totalCoverage }}%</span>
                    <span class="text-xs text-faint uppercase tracking-wider">Audio</span>
                  </div>
                </div>
              </div>

              <!-- Legend -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span class="text-sm text-muted">Recorded</span>
                  </div>
                  <span class="text-sm text-ink">{{ recordedCount }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-violet-500"></div>
                    <span class="text-sm text-muted">Spliced</span>
                  </div>
                  <span class="text-sm text-ink">{{ splicedCount }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-surface-3"></div>
                    <span class="text-sm text-muted">Pending</span>
                  </div>
                  <span class="text-sm text-ink">{{ pendingCount }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Progressive Quality -->
          <section class="rounded-xl border border-line bg-surface/50 overflow-hidden">
            <div class="px-6 py-4 border-b border-line">
              <h2 class="text-sm font-semibold text-ink uppercase tracking-wider">
                Quality Progression
              </h2>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-muted">
                Start with spliced audio, add human recordings over time:
              </p>
              <div class="space-y-3 text-sm">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span class="text-ink">Day 1: {{ totalRecordings }} recorded &rarr; {{ stats.totalPhrases.toLocaleString() }} spliced</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-surface-3"></div>
                  <span class="text-faint">Community adds more over time</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-surface-3"></div>
                  <span class="text-faint">Priority: flagged splices first</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Priority Queue -->
          <section class="rounded-xl border border-dashed border-line bg-surface/30 overflow-hidden">
            <div class="px-6 py-4 border-b border-line">
              <h2 class="text-sm font-semibold text-ink uppercase tracking-wider">
                Flagged Splices
              </h2>
              <p class="text-xs text-accent-2 mt-1">
                {{ flaggedPhrases.length }} need re-recording
              </p>
            </div>

            <div class="max-h-[250px] overflow-y-auto">
              <div v-for="flag in flaggedPhrases" :key="flag.id"
                   class="px-6 py-3 border-b border-line/50">
                <div class="flex items-start gap-3">
                  <div :class="[
                    'w-6 h-6 rounded flex items-center justify-center text-xs font-semibold',
                    flag.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    flag.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-surface-2 text-muted'
                  ]">
                    {{ flag.score }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-ink truncate">{{ flag.phrase }}</p>
                    <p class="text-xs text-faint">{{ flag.reason }}</p>
                  </div>
                </div>
              </div>

              <div v-if="flaggedPhrases.length === 0" class="p-6 text-center text-faint text-sm">
                No flagged splices yet
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api'

const route = useRoute()
const courseCode = computed(() => route.params.courseCode || 'cym_n_for_eng')

// API base URL
const API_BASE = getApiUrl()

// Loading & error state
const isCalculating = ref(false)
const isLoading = ref(true)
const error = ref(null)

// Algorithm results
const stats = ref({
  totalLegos: 0,
  phrasesToRecord: 0,
  directRecord: 0,
  estimatedMinutes: 0,
  reductionPercent: 0,
  totalPhrases: 0,
  coveragePercent: 0
})

// Recording script phrases
const filteredPhrases = ref([])
const directRecordItems = ref([])

// Coverage stats — real numbers from the voice engine's honest coverage
// endpoint (recorded takes / spliced per human slot), not estimates.
const totalRecordings = computed(() => stats.value.phrasesToRecord + stats.value.directRecord)
const recordedCount = ref(0)
const splicedCount = ref(0)

async function fetchHonestCoverage() {
  try {
    const response = await fetch(`${API_BASE}/api/production/${courseCode.value}/voice-engine/coverage`)
    if (!response.ok) return // engine not mounted / no access — leave zeros
    const c = await response.json()
    const slots = Array.isArray(c.slots) ? c.slots : []
    const targets = slots.filter(s => s.role === 'target1' || s.role === 'target2')
    const pool = targets.some(s => s.isHuman) ? targets.filter(s => s.isHuman) : targets
    recordedCount.value = pool.reduce((n, s) => n + (s.recordedTakes ?? 0), 0)
    splicedCount.value = pool.reduce((n, s) => n + (s.spliced ?? 0), 0)
    // The course's REAL phrase total (replaces the totalLegos × 10 estimate).
    if (typeof c.counts?.phrases === 'number' && c.counts.phrases > 0) {
      stats.value.totalPhrases = c.counts.phrases
    }
  } catch { /* coverage is additive — the planner view works without it */ }
}
const pendingCount = computed(() => totalRecordings.value - recordedCount.value)
const recordedPercent = computed(() => {
  const total = recordedCount.value + splicedCount.value + pendingCount.value
  return total > 0 ? Math.round((recordedCount.value / total) * 100) : 0
})
const splicedPercent = computed(() => {
  const total = recordedCount.value + splicedCount.value + pendingCount.value
  return total > 0 ? Math.round((splicedCount.value / total) * 100) : 0
})
const totalCoverage = computed(() => stats.value.coveragePercent || 0)

// Flagged phrases (to be fetged from flags system)
const flaggedPhrases = ref([])

// Styling constants for LEGO word sources
const sourceStyles = {
  1: { sourceColor: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' },
  6: { sourceColor: 'bg-amber-500/20 border-amber-500/50 text-amber-300' },
  11: { sourceColor: 'bg-violet-500/20 border-violet-500/50 text-violet-300' }
}

// Synthesized example demonstrating LEGO audio splicing
const synthesizedExample = {
  seed: 60,
  welsh: "dw i ddim isio siarad Cymraeg rŵan",
  english: "I don't want to speak Welsh now",
  buildOrder: [
    { text: 'dw', from: 1 },
    { text: 'i', from: 1 },
    { text: 'ddim', from: 6 },
    { text: 'isio', from: 1 },
    { text: 'siarad', from: 1 },
    { text: 'Cymraeg', from: 1 },
    { text: 'rŵan', from: 11 }
  ]
}

// Computed: synthesized example with styling applied
const currentExample = computed(() => {
  return {
    ...synthesizedExample,
    buildOrder: synthesizedExample.buildOrder.map(word => ({
      ...word,
      sourceColor: sourceStyles[word.from].sourceColor
    }))
  }
})

// Source phrases that provide the LEGOs
const sourcePhrases = [
  {
    seed: 1,
    welsh: "dw i isio siarad Cymraeg",
    english: "I want to speak Welsh",
    provides: ['dw', 'i', 'isio', 'siarad', 'Cymraeg'],
    borderClass: 'border-emerald-500/30 bg-emerald-500/5',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    playBtnClass: 'bg-emerald-600 hover:bg-emerald-500'
  },
  {
    seed: 6,
    welsh: "fedra i ddim cofio sut i siarad Cymraeg",
    english: "I can't remember how to speak Welsh",
    provides: ['fedra', 'ddim', 'cofio', 'sut'],
    borderClass: 'border-amber-500/30 bg-amber-500/5',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300',
    playBtnClass: 'bg-amber-600 hover:bg-amber-500'
  },
  {
    seed: 11,
    welsh: "ond well i mi ymarfer siarad Cymraeg rŵan",
    english: "but I'd better practice speaking Welsh now",
    provides: ['ond', 'well', 'mi', 'ymarfer', 'rŵan'],
    borderClass: 'border-violet-500/30 bg-violet-500/5',
    textClass: 'text-violet-400',
    badgeClass: 'bg-violet-500/20 text-violet-300',
    playBtnClass: 'bg-violet-600 hover:bg-violet-500'
  }
]

// Computed: which sources are used by the current example
const usedSources = computed(() => {
  const usedSeeds = new Set(currentExample.value.buildOrder.map(w => w.from))
  return sourcePhrases.filter(s => usedSeeds.has(s.seed))
})

// Computed: which LEGOs each source provides for the current example
const sourceProvides = computed(() => {
  const example = currentExample.value
  const provides = {}
  for (const source of sourcePhrases) {
    provides[source.seed] = example.buildOrder
      .filter(w => w.from === source.seed)
      .map(w => w.text)
  }
  return provides
})

// Demo audio URLs (fetched from API)
const demoAudio = ref({})
const demoAudioPlayer = ref(null)
const currentlyPlaying = ref(null)

// Fetch demo audio URLs
async function fetchDemoAudio() {
  try {
    const response = await fetch(`${API_BASE}/api/production/${courseCode.value}/frankenstein-demo`)
    if (response.ok) {
      const data = await response.json()
      // Map by seed number for easy lookup
      const audioMap = {}
      for (const phrase of data.phrases) {
        if (phrase.url) {
          audioMap[phrase.seed] = phrase.url
        }
      }
      demoAudio.value = audioMap
    }
  } catch (err) {
    console.error('Failed to fetch demo audio:', err)
  }
}

// Play demo audio for a specific seed
function playDemoAudio(seedNumber) {
  const url = demoAudio.value[seedNumber]
  if (!url || !demoAudioPlayer.value) return

  // Stop current playback
  demoAudioPlayer.value.pause()

  // Play new audio
  demoAudioPlayer.value.src = url
  demoAudioPlayer.value.play()
  currentlyPlaying.value = seedNumber
}

// Fetch algorithm results from API
async function runAlgorithm() {
  isCalculating.value = true
  error.value = null

  try {
    const response = await fetch(`${API_BASE}/api/production/${courseCode.value}/recording-optimizer`)

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to run algorithm')
    }

    const data = await response.json()

    // Update stats
    stats.value = {
      totalLegos: data.statistics.totalLegos,
      phrasesToRecord: data.statistics.phrasesToRecord,
      directRecord: data.statistics.directRecord,
      estimatedMinutes: data.statistics.estimatedMinutes,
      reductionPercent: data.statistics.reductionPercent,
      totalPhrases: data.statistics.totalPhrases,
      coveragePercent: data.statistics.coveragePercent
    }

    // Update recording script
    filteredPhrases.value = data.recordingScript.map((p, i) => ({
      id: i + 1,
      target: p.target,
      wordCount: p.wordCount,
      legoCount: p.coversLegos
    }))

    // Update direct record items
    directRecordItems.value = data.directRecord || []

  } catch (err) {
    error.value = err.message
    console.error('Recording optimizer error:', err)
  } finally {
    isCalculating.value = false
    isLoading.value = false
  }
}

function exportPDF() {
  alert("Export PDF isn't available yet.")
}

// Load data on mount
onMounted(() => {
  runAlgorithm().then(fetchHonestCoverage)
  fetchDemoAudio()
})
</script>

<style scoped>
/* Light-mode contrast lifts for the hardcoded Tailwind palette accents used as
   foreground text / pill labels. Dark mode is untouched — these only apply under
   [data-theme="light"]. Hues are preserved, darkened to pass WCAG AA on the light
   pastel (/5–/20) fills and white/canvas surfaces. */
:root[data-theme="light"] :deep(.lt-violet-strong) { color: #6d28d9; }      /* violet-700, 7.1:1 on white */
:root[data-theme="light"] :deep(.text-emerald-400) { color: #047857; }       /* emerald-700 */
:root[data-theme="light"] :deep(.text-emerald-300) { color: #047857; }
:root[data-theme="light"] :deep(.text-amber-400)   { color: #92400e; }        /* amber-800 */
:root[data-theme="light"] :deep(.text-amber-300)   { color: #92400e; }
:root[data-theme="light"] :deep(.text-violet-400)  { color: #6d28d9; }        /* violet-700 */
:root[data-theme="light"] :deep(.text-violet-300)  { color: #6d28d9; }
:root[data-theme="light"] :deep(.text-red-400)     { color: #b91c1c; }        /* red-700 */
/* Solid saturated (violet/emerald/amber-600) fills carry text-ink, which is
   near-black in light mode → weak. Force white label/icon on those fills in light
   only; dark mode keeps its light text-ink. */
:root[data-theme="light"] :deep(.lt-on-fill) { color: #ffffff; }
</style>
