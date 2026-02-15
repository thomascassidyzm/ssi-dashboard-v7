<template>
  <div class="learning-journey-view">
    <!-- Stats Header -->
    <div v-if="stats" class="stats-bar bg-slate-700 rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-6">
        <div class="stat-item">
          <span class="text-slate-400 text-sm">Rounds</span>
          <span class="text-white font-bold text-lg ml-2">{{ stats.roundsGenerated }}</span>
        </div>
        <div class="stat-item">
          <span class="text-slate-400 text-sm">Total Items</span>
          <span class="text-white font-bold text-lg ml-2">{{ stats.totalItems }}</span>
        </div>
        <div class="stat-item">
          <span class="text-emerald-400 text-sm">With Audio</span>
          <span class="text-emerald-300 font-bold text-lg ml-2">{{ stats.itemsWithAudio }}</span>
        </div>
        <div v-if="stats.itemsMissingAudio > 0" class="stat-item">
          <span class="text-amber-400 text-sm">Missing Audio</span>
          <span class="text-amber-300 font-bold text-lg ml-2">{{ stats.itemsMissingAudio }}</span>
        </div>
        <div class="stat-item ml-auto">
          <span class="text-slate-400 text-sm">Generated in</span>
          <span class="text-slate-300 text-lg ml-2">{{ stats.generationTimeMs }}ms</span>
        </div>
      </div>
    </div>

    <!-- Controls Row: Legend (Expand/Collapse moved to parent when hideControls) -->
    <div class="controls-row flex items-center justify-between mb-6">
      <!-- Item Type Legend -->
      <div class="legend flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-purple-500"></span>
          <span class="text-slate-300">Intro</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-300">LEGO</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500"></span>
          <span class="text-slate-300">BUILD</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-slate-300">REVIEW</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span class="text-slate-300">CONSOLIDATE</span>
        </div>
      </div>

      <!-- Expand/Collapse Buttons (only shown when controls not hidden) -->
      <div v-if="!hideControls" class="expand-collapse-btns flex gap-2">
        <button
          @click="collapseAll"
          class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Collapse All
        </button>
        <button
          @click="expandAll"
          class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          Expand All
        </button>
      </div>
    </div>

    <!-- Rounds List -->
    <div class="rounds-list space-y-4">
      <div
        v-for="round in rounds"
        :key="round.roundNumber"
        class="round-card bg-slate-800 rounded-lg overflow-hidden"
      >
        <!-- Round Header -->
        <div
          class="round-header px-4 py-3 bg-slate-700 flex items-center justify-between cursor-pointer"
          @click="toggleRound(round.roundNumber)"
        >
          <div class="flex items-center gap-4">
            <!-- Play Round Button -->
            <button
              v-if="hasPlayableItems(round)"
              class="play-round-btn w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              :class="isRoundPlaying(round.roundNumber)
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-500 bg-opacity-50 text-slate-300 hover:bg-emerald-500 hover:text-white'"
              :title="`Play Round ${round.roundNumber}`"
              @click.stop="playRound(round)"
            >
              <svg v-if="isRoundPlaying(round.roundNumber) && player.isPlaying.value" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <div class="round-number bg-slate-600 text-white px-3 py-1 rounded-full text-sm font-mono">
              R{{ round.roundNumber }}
            </div>
            <div class="lego-info">
              <span class="text-emerald-400 font-mono text-sm">{{ round.legoId }}</span>
            </div>
            <!-- LEGO Text: known = target -->
            <div class="lego-text text-slate-300 text-sm">
              <span class="text-slate-400">{{ getLegoKnownText(round) }}</span>
              <span class="text-slate-500 mx-2">=</span>
              <span class="text-white">{{ getLegoTargetText(round) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Spaced Rep Indicators -->
            <div v-if="round.spacedRepReviews.length > 0" class="spaced-rep-badges flex gap-1">
              <span
                v-for="reviewIdx in round.spacedRepReviews.slice(0, 5)"
                :key="reviewIdx"
                class="px-2 py-0.5 bg-amber-500 bg-opacity-20 text-amber-400 text-xs rounded font-mono"
                :title="`Reviewing R${reviewIdx}`"
              >
                R{{ reviewIdx }}
              </span>
              <span
                v-if="round.spacedRepReviews.length > 5"
                class="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded"
              >
                +{{ round.spacedRepReviews.length - 5 }}
              </span>
            </div>

            <div class="item-count text-slate-400 text-sm">
              {{ round.itemCount }} items
            </div>

            <svg
              class="w-5 h-5 text-slate-400 transition-transform"
              :class="{ 'rotate-180': expandedRounds.has(round.roundNumber) }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- Round Items (Collapsible) -->
        <Transition name="slide">
          <div v-if="expandedRounds.has(round.roundNumber)" class="round-items p-4 space-y-2">
            <div
              v-for="(item, idx) in round.items"
              :key="`${round.roundNumber}-${idx}`"
              :ref="el => setItemRef(round.roundNumber, idx, el)"
              class="item-row flex items-center gap-3 p-3 rounded-lg transition-all"
              :class="[
                getItemBgClass(item),
                isItemPlaying(round.roundNumber, idx) ? 'ring-2 ring-emerald-400 bg-emerald-900 bg-opacity-20' : 'hover:bg-slate-700'
              ]"
            >
              <!-- Play Item Button -->
              <button
                v-if="item.hasAudio"
                class="play-item-btn w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                :class="isItemPlaying(round.roundNumber, idx)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-600 text-slate-400 hover:bg-emerald-500 hover:text-white'"
                :title="isItemPlaying(round.roundNumber, idx) ? 'Playing...' : 'Play from here'"
                @click="playFromItem(round, idx)"
              >
                <svg v-if="isItemPlaying(round.roundNumber, idx) && player.isPlaying.value" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <!-- No-audio placeholder to keep alignment -->
              <div v-else class="w-7 h-7 flex-shrink-0"></div>

              <!-- Item Type Badge -->
              <div
                class="type-badge px-2 py-1 rounded text-xs font-medium uppercase min-w-20 text-center"
                :class="getTypeBadgeClass(item.type)"
              >
                {{ formatItemType(item.type, item.phrasePosition, item.consolidateIndex) }}
              </div>

              <!-- Review Badge - shows which round is being reviewed -->
              <div
                v-if="item.type === 'review'"
                class="review-badge px-2 py-1 bg-amber-600 text-white text-xs rounded font-mono font-bold"
                :title="`Reviewing Round ${item.reviewOf}`"
              >
                R{{ item.reviewOf }}
              </div>

              <!-- Content -->
              <div class="item-content flex-1 min-w-0">
                <div class="flex gap-4">
                  <span class="text-slate-400 truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-slate-500">&rarr;</span>
                  <span class="text-white truncate flex-1">{{ item.target_text }}</span>
                </div>
              </div>

              <!-- Phase indicator when this item is playing -->
              <div v-if="isItemPlaying(round.roundNumber, idx)" class="phase-indicator flex gap-1">
                <span
                  v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
                  :key="phase"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="player.currentPhase.value === phase ? 'bg-emerald-400' : 'bg-slate-600'"
                  :title="phase"
                ></span>
              </div>

              <!-- Audio Status (only show when NOT playing this item) -->
              <div v-else class="audio-status flex gap-2">
                <span
                  v-if="item.hasAudio"
                  class="text-emerald-400"
                  title="Audio available"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </span>
                <span
                  v-else-if="item.type !== 'intro'"
                  class="text-amber-400"
                  title="Audio missing"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </span>
              </div>

              <!-- LEGO Badge (for review items showing which LEGO) -->
              <div
                v-if="item.type === 'review' && item.legoId !== round.legoId"
                class="lego-badge px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded font-mono"
              >
                {{ item.legoId }}
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="rounds.length === 0 && !isLoading" class="empty-state text-center py-12">
      <svg class="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <h3 class="text-lg font-medium text-slate-400">No Learning Journey Data</h3>
      <p class="text-slate-500 mt-2">This course may not have any LEGOs or practice phrases yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useScriptPlayer } from '@/composables/useScriptPlayer'

interface ScriptItem {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  type: 'intro' | 'debut' | 'build' | 'review' | 'consolidate'
  known_text: string
  target_text: string
  hasAudio: boolean
  reviewOf?: number
  isFirstRevisit?: boolean
  fibonacciPosition?: number
  phrasePosition?: number
  consolidateIndex?: number
  known_audio_uuid?: string
  target1_audio_uuid?: string
  target2_audio_uuid?: string
  known_duration_ms?: number
  target1_duration_ms?: number
  target2_duration_ms?: number
}

interface RoundData {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  legoType: string
  isNew: boolean
  items: ScriptItem[]
  spacedRepReviews: number[]
  itemCount: number
}

interface Stats {
  roundsGenerated: number
  totalItems: number
  itemsWithAudio: number
  itemsMissingAudio: number
  generationTimeMs: number
}

const props = defineProps<{
  rounds: RoundData[]
  allItems: ScriptItem[]
  stats: Stats | null
  isLoading?: boolean
  hideControls?: boolean
}>()

const emit = defineEmits<{
  'playback-state': [state: {
    isPlaying: boolean
    isPaused: boolean
    currentItem: any
    currentPhase: string | null
    currentIndex: number
    progress: number
    totalItems: number
  }]
}>()

// ============================================================================
// PLAYER SETUP
// ============================================================================

const player = useScriptPlayer()

// Build player-compatible items from allItems
const playerItems = computed(() => {
  return props.allItems.map(item => ({
    sourceId: item.known_audio_uuid || null,
    target1Id: item.target1_audio_uuid || null,
    target2Id: item.target2_audio_uuid || null,
    known_text: item.known_text,
    target_text: item.target_text,
    type: item.type,
    roundNumber: item.roundNumber,
    legoId: item.legoId,
  }))
})

// Build a lookup: for each round+itemIdx, what's the global index in allItems?
const globalIndexMap = computed(() => {
  const map = new Map<string, number>()
  props.allItems.forEach((item, globalIdx) => {
    // Find which local index this item is within its round
    const round = props.rounds.find(r => r.roundNumber === item.roundNumber)
    if (round) {
      const localIdx = round.items.indexOf(item)
      if (localIdx !== -1) {
        map.set(`${item.roundNumber}-${localIdx}`, globalIdx)
      }
    }
  })
  return map
})

// Reverse lookup: global index -> round number + local index
const currentPlayingLocation = computed(() => {
  if (!player.isPlaying.value && !player.isPaused.value) return null
  const idx = player.currentIndex.value
  if (idx < 0 || idx >= props.allItems.length) return null
  const item = props.allItems[idx]
  if (!item) return null

  const round = props.rounds.find(r => r.roundNumber === item.roundNumber)
  if (!round) return null
  const localIdx = round.items.indexOf(item)
  return { roundNumber: item.roundNumber, localIdx }
})

// ============================================================================
// PLAYBACK ACTIONS
// ============================================================================

const playFromItem = (round: RoundData, localIdx: number) => {
  const key = `${round.roundNumber}-${localIdx}`
  const globalIdx = globalIndexMap.value.get(key)
  if (globalIdx === undefined) return

  // If already playing this item, toggle pause
  if (isItemPlaying(round.roundNumber, localIdx)) {
    if (player.isPlaying.value) {
      player.pause()
    } else {
      player.play()
    }
    return
  }

  player.playFrom(playerItems.value, globalIdx)
}

const playRound = (round: RoundData) => {
  // If this round is already playing, toggle pause
  if (isRoundPlaying(round.roundNumber)) {
    if (player.isPlaying.value) {
      player.pause()
    } else {
      player.play()
    }
    return
  }

  // Find global index of first item in this round
  const key = `${round.roundNumber}-0`
  const globalIdx = globalIndexMap.value.get(key)
  if (globalIdx === undefined) return
  player.playFrom(playerItems.value, globalIdx)
}

const isItemPlaying = (roundNumber: number, localIdx: number): boolean => {
  const loc = currentPlayingLocation.value
  if (!loc) return false
  return loc.roundNumber === roundNumber && loc.localIdx === localIdx
}

const isRoundPlaying = (roundNumber: number): boolean => {
  const loc = currentPlayingLocation.value
  if (!loc) return false
  return loc.roundNumber === roundNumber
}

const hasPlayableItems = (round: RoundData): boolean => {
  return round.items.some(item => item.hasAudio)
}

// ============================================================================
// AUTO-EXPAND & AUTO-SCROLL
// ============================================================================

// Store refs to item DOM elements
const itemRefs = new Map<string, HTMLElement>()

const setItemRef = (roundNumber: number, idx: number, el: any) => {
  if (el) {
    itemRefs.set(`${roundNumber}-${idx}`, el as HTMLElement)
  }
}

// Watch for playing item changes to auto-expand round and scroll into view
watch(currentPlayingLocation, async (loc) => {
  if (!loc) return

  // Auto-expand the round containing the current item
  if (!expandedRounds.value.has(loc.roundNumber)) {
    expandedRounds.value.add(loc.roundNumber)
  }

  // Wait for DOM update after expand
  await nextTick()

  // Scroll the item into view
  const el = itemRefs.get(`${loc.roundNumber}-${loc.localIdx}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

// Emit playback state to parent whenever it changes
watch(
  [player.isPlaying, player.isPaused, player.currentIndex, player.currentPhase, player.progress],
  () => {
    emit('playback-state', {
      isPlaying: player.isPlaying.value,
      isPaused: player.isPaused.value,
      currentItem: player.currentItem.value,
      currentPhase: player.currentPhase.value,
      currentIndex: player.currentIndex.value,
      progress: player.progress.value,
      totalItems: player.totalItems.value,
    })
  }
)

// ============================================================================
// ROUND EXPAND/COLLAPSE
// ============================================================================

// Track which rounds are expanded
const expandedRounds = ref<Set<number>>(new Set())

// Auto-expand first round
watch(() => props.rounds, (newRounds) => {
  if (newRounds.length > 0 && expandedRounds.value.size === 0) {
    expandedRounds.value.add(newRounds[0].roundNumber)
  }
}, { immediate: true })

const toggleRound = (roundNumber: number) => {
  if (expandedRounds.value.has(roundNumber)) {
    expandedRounds.value.delete(roundNumber)
  } else {
    expandedRounds.value.add(roundNumber)
  }
}

const expandAll = () => {
  props.rounds.forEach(round => {
    expandedRounds.value.add(round.roundNumber)
  })
}

const collapseAll = () => {
  expandedRounds.value.clear()
}

// Expose methods + player for parent component
defineExpose({
  expandAll,
  collapseAll,
  player
})

// ============================================================================
// HELPERS
// ============================================================================

// Get LEGO text from the debut or intro item in the round
const getLegoKnownText = (round: RoundData): string => {
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.known_text || ''
}

const getLegoTargetText = (round: RoundData): string => {
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.target_text || ''
}

const formatItemType = (type: string, phrasePosition?: number, consolidateIndex?: number): string => {
  switch (type) {
    case 'intro': return 'Intro'
    case 'debut': return 'LEGO'
    case 'build': return phrasePosition ? `BUILD-${phrasePosition}` : 'BUILD'
    case 'review': return 'REVIEW'
    case 'consolidate': return consolidateIndex ? `CONSOLIDATE-${consolidateIndex}` : 'CONSOLIDATE'
    default: return type
  }
}

const getTypeBadgeClass = (type: string): string => {
  switch (type) {
    case 'intro': return 'bg-purple-500 bg-opacity-30 text-purple-300'
    case 'debut': return 'bg-emerald-500 bg-opacity-30 text-emerald-300'
    case 'build': return 'bg-blue-500 bg-opacity-30 text-blue-300'
    case 'review': return 'bg-amber-500 bg-opacity-40 text-amber-300'
    case 'consolidate': return 'bg-cyan-500 bg-opacity-40 text-cyan-300'
    default: return 'bg-slate-600 text-slate-400'
  }
}

const getItemBgClass = (item: ScriptItem): string => {
  if (item.type === 'intro') return 'bg-slate-800'
  if (!item.hasAudio && item.type !== 'intro') return 'bg-amber-900 bg-opacity-10'
  return ''
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 2000px;
  opacity: 1;
}
</style>
