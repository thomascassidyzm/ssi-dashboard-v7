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

    <!-- Controls Row: Legend + Expand/Collapse -->
    <div class="controls-row flex items-center justify-between mb-6">
      <!-- Item Type Legend -->
      <div class="legend flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-purple-500"></span>
          <span class="text-slate-300">Intro</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-pink-500"></span>
          <span class="text-slate-300">Component</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-300">LEGO</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500"></span>
          <span class="text-slate-300">Debut</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-slate-300">Spaced Rep</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span class="text-slate-300">Consolidation</span>
        </div>
      </div>

      <!-- Expand/Collapse Buttons -->
      <div class="expand-collapse-btns flex gap-2">
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
              class="item-row flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition-colors"
              :class="getItemBgClass(item)"
            >
              <!-- Item Type Badge -->
              <div
                class="type-badge px-2 py-1 rounded text-xs font-medium uppercase min-w-20 text-center"
                :class="getTypeBadgeClass(item.type)"
              >
                {{ formatItemType(item.type, item.phrasePosition) }}
              </div>

              <!-- Review Badge (for spaced rep) -->
              <div
                v-if="item.type === 'spaced_rep'"
                class="review-badge px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded font-mono"
                :title="item.isFirstRevisit ? 'First revisit (3x phrases)' : 'Fibonacci review'"
              >
                {{ item.isFirstRevisit ? 'N-1' : `R${item.reviewOf}` }}
              </div>

              <!-- Content -->
              <div class="item-content flex-1 min-w-0">
                <div class="flex gap-4">
                  <span class="text-slate-400 truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-slate-500">&rarr;</span>
                  <span class="text-white truncate flex-1">{{ item.target_text }}</span>
                </div>
              </div>

              <!-- Audio Status -->
              <div class="audio-status flex gap-2">
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

              <!-- LEGO Badge (for spaced rep showing which LEGO) -->
              <div
                v-if="item.type === 'spaced_rep' && item.legoId !== round.legoId"
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
import { ref, computed, watch } from 'vue'

interface ScriptItem {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  type: 'intro' | 'component' | 'debut' | 'debut_phrase' | 'spaced_rep' | 'consolidation'
  known_text: string
  target_text: string
  hasAudio: boolean
  reviewOf?: number
  isFirstRevisit?: boolean
  fibonacciPosition?: number
  phrasePosition?: number
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
  stats: Stats | null
  isLoading?: boolean
}>()

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

// Get LEGO text from the debut or intro item in the round
const getLegoKnownText = (round: RoundData): string => {
  // Look for debut or intro item which has the LEGO's text
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.known_text || ''
}

const getLegoTargetText = (round: RoundData): string => {
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.target_text || ''
}

const formatItemType = (type: string, phrasePosition?: number): string => {
  switch (type) {
    case 'intro': return 'Intro'
    case 'component': return 'Component'
    case 'debut': return 'LEGO'
    case 'debut_phrase': return phrasePosition ? `Debut-${phrasePosition}` : 'Debut'
    case 'spaced_rep': return 'Review'
    case 'consolidation': return 'Consolidate'
    default: return type
  }
}

const getTypeBadgeClass = (type: string): string => {
  switch (type) {
    case 'intro': return 'bg-purple-500 bg-opacity-20 text-purple-400'
    case 'component': return 'bg-pink-500 bg-opacity-20 text-pink-400'
    case 'debut': return 'bg-emerald-500 bg-opacity-20 text-emerald-400'
    case 'debut_phrase': return 'bg-blue-500 bg-opacity-20 text-blue-400'
    case 'spaced_rep': return 'bg-amber-500 bg-opacity-20 text-amber-400'
    case 'consolidation': return 'bg-cyan-500 bg-opacity-20 text-cyan-400'
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
