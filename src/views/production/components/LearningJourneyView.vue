<template>
  <div class="learning-journey-view">
    <!-- Stats Header -->
    <div v-if="stats" class="stats-bar bg-surface border border-line rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-6">
        <div class="stat-item">
          <span class="text-muted text-sm">Rounds</span>
          <span class="text-ink font-bold text-lg ml-2">{{ stats.roundsGenerated }}</span>
        </div>
        <div class="stat-item">
          <span class="text-muted text-sm">Total Items</span>
          <span class="text-ink font-bold text-lg ml-2">{{ stats.totalItems }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label-audio text-emerald-400 text-sm">With Audio</span>
          <span class="stat-val-audio text-emerald-300 font-bold text-lg ml-2">{{ stats.itemsWithAudio }}</span>
        </div>
        <div v-if="stats.itemsMissingAudio > 0" class="stat-item">
          <span class="stat-label-missing text-amber-400 text-sm">Missing Audio</span>
          <span class="stat-val-missing text-amber-300 font-bold text-lg ml-2">{{ stats.itemsMissingAudio }}</span>
        </div>
        <!-- What the live player cannot deliver from the intended script.
             Everything stays visible; this is the count of flagged rows. -->
        <div v-if="(stats.itemsPlayerCannotDeliver || 0) > 0" class="stat-item">
          <span class="stat-label-undeliverable text-amber-400 text-sm">Player can't deliver</span>
          <span
            class="stat-val-undeliverable text-amber-300 font-bold text-lg ml-2"
            :title="`${stats.itemsPlayerCannotDeliver} rows in this window are flagged: the live player skips them today. They are still shown.`"
          >{{ stats.itemsPlayerCannotDeliver }}</span>
          <span v-if="(stats.roundsPlayerDrops || 0) > 0" class="text-amber-400 text-sm ml-2">
            and {{ stats.roundsPlayerDrops }} round{{ stats.roundsPlayerDrops === 1 ? ' has' : 's have' }} nothing playable
          </span>
        </div>
        <!-- Learner view: how much content is hidden because audio is missing -->
        <div v-if="stats.learnerView" class="stat-item">
          <span class="stat-label-audio text-emerald-400 text-sm">Learner view</span>
          <span class="stat-val-audio text-emerald-300 text-sm ml-2">
            {{ (stats.phrasesDroppedForAudio || 0) }} phrases awaiting audio skipped — every round keeps its number
          </span>
        </div>
        <div class="stat-item ml-auto">
          <span class="text-muted text-sm">Generated in</span>
          <span class="text-ink text-lg ml-2">{{ stats.generationTimeMs }}ms</span>
        </div>
      </div>
    </div>

    <!-- Controls Row: Legend (Expand/Collapse moved to parent when hideControls) -->
    <div class="controls-row flex items-center justify-between mb-6">
      <!-- Item Type Legend -->
      <div class="legend flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-purple-500"></span>
          <span class="text-ink">Intro</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-ink">LEGO</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500"></span>
          <span class="text-ink">BUILD</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-ink">REVIEW</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span class="text-ink">CONSOLIDATE</span>
        </div>
      </div>

      <!-- Expand/Collapse Buttons (only shown when controls not hidden) -->
      <div v-if="!hideControls" class="expand-collapse-btns flex gap-2">
        <button
          @click="collapseAll"
          class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors"
        >
          Collapse All
        </button>
        <button
          @click="expandAll"
          class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors"
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
        :id="`journey-round-${round.roundNumber}`"
        class="round-card bg-surface border border-line rounded-lg overflow-hidden transition-shadow"
        :class="{ 'ring-2 ring-emerald-400': highlightedRound === round.roundNumber }"
      >
        <!-- Round Header -->
        <div
          class="round-header px-4 py-3 bg-surface-2 flex items-center justify-between cursor-pointer"
          @click="toggleRound(round.roundNumber)"
        >
          <div class="flex items-center gap-4">
            <!-- Play Round Button -->
            <button
              v-if="hasPlayableItems(round)"
              class="play-round-btn w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              :class="isRoundPlaying(round.roundNumber)
                ? 'bg-emerald-500 text-white'
                : 'bg-surface-3 bg-opacity-50 text-white hover:bg-emerald-500 hover:text-white'"
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

            <div
              class="round-number bg-surface-3 text-ink px-3 py-1 rounded-full text-sm font-mono"
              :title="roundNumberTitle(round)"
            >
              R{{ round.roundNumber }}
            </div>
            <div class="lego-info">
              <span class="lego-id-text text-emerald-400 font-mono text-sm">{{ round.legoId }}</span>
            </div>

            <!-- Player-delivery flag: only when the round has NOTHING the
                 player can play. An audio gap costs the cycle, not the round —
                 the round keeps its number and plays what it has. -->
            <span
              v-if="round.playerDelivers === false"
              class="round-undeliverable-badge text-xs px-2 py-0.5 rounded border border-amber-700 bg-amber-900/30 text-amber-300 whitespace-nowrap"
              :title="roundFlagTitle(round)"
            >⚠ nothing playable in this round yet</span>
            <span
              v-else-if="(round.undeliverableItemCount || 0) > 0"
              class="round-partial-badge text-xs px-2 py-0.5 rounded border border-line text-muted whitespace-nowrap"
              :title="roundPartialTitle(round)"
            >{{ round.undeliverableItemCount }} cycle{{ round.undeliverableItemCount === 1 ? '' : 's' }} skipped for audio</span>
            <!-- LEGO Text: known = target -->
            <div class="lego-text text-ink text-sm">
              <span class="text-muted">{{ getLegoKnownText(round) }}</span>
              <span class="text-faint mx-2">=</span>
              <span class="text-ink">{{ getLegoTargetText(round) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Spaced Rep Indicators -->
            <div v-if="round.spacedRepReviews.length > 0" class="spaced-rep-badges flex gap-1">
              <span
                v-for="reviewIdx in round.spacedRepReviews.slice(0, 5)"
                :key="reviewIdx"
                class="px-2 py-0.5 bg-amber-600 text-white text-xs rounded font-mono"
                :title="`Reviewing R${reviewIdx}`"
              >
                R{{ reviewIdx }}
              </span>
              <span
                v-if="round.spacedRepReviews.length > 5"
                class="px-2 py-0.5 bg-surface-3 text-muted text-xs rounded"
              >
                +{{ round.spacedRepReviews.length - 5 }}
              </span>
            </div>

            <div class="item-count text-muted text-sm">
              {{ round.itemCount }} items
            </div>

            <!-- Approval-gate standing for this round. Machines may flag
                 audio; only humans may pass it, so this badge only ever goes
                 green off the back of a recorded human play-through. -->
            <span
              v-if="qaStatus.get(round.roundNumber)"
              class="qa-badge text-xs px-2 py-0.5 rounded border"
              :class="qaBadgeClass(qaStatus.get(round.roundNumber))"
              :title="qaBadgeTitle(qaStatus.get(round.roundNumber))"
            >{{ qaBadgeLabel(qaStatus.get(round.roundNumber)) }}</span>

            <!-- Open this round in the real learning app — leaves Popty -->
            <button
              class="open-round-btn w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-surface-3 transition-colors text-base leading-none"
              title="Open this round in the learning app"
              @click.stop="openRoundInLearningApp(round)"
            >&nearr;</button>

            <svg
              class="w-5 h-5 text-muted transition-transform"
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
                isItemPlaying(round.roundNumber, idx) ? 'ring-2 ring-emerald-400 bg-emerald-900 bg-opacity-20' : 'hover:bg-surface-2',
                item.playerCanDeliver === false ? 'border-l-2 border-amber-600' : ''
              ]"
            >
              <!-- Play Item Button -->
              <button
                v-if="item.hasAudio"
                class="play-item-btn w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                :class="isItemPlaying(round.roundNumber, idx)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-3 text-muted hover:bg-emerald-500 hover:text-white'"
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

              <!-- Content: known → target -->
              <div class="item-content flex-1 min-w-0">
                <div class="flex gap-4">
                  <span class="text-muted truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-faint">&rarr;</span>
                  <span class="text-ink truncate flex-1">{{ item.target_text }}</span>
                </div>
              </div>

              <!-- Player-delivery flag, only where nothing else on the row says
                   it. Missing phrase audio already shows as a dropped play
                   button and an amber triangle, so a chip repeating it would be
                   noise; an intro whose narration is missing looks healthy on
                   the row, so it needs saying. -->
              <span
                v-if="item.playerDropReason === 'intro-audio'"
                class="item-undeliverable-badge flex-shrink-0 text-xs px-2 py-0.5 rounded border border-amber-700 bg-amber-900/30 text-amber-300 whitespace-nowrap"
                :title="itemFlagTitle(item)"
              >⚠ {{ itemFlagLabel(item) }}</span>

              <!-- Edit & Flag Buttons -->
              <div class="edit-flags flex items-center gap-1 flex-shrink-0">
                <!-- Pencil edit button — LEGO text (debut) is NOT editable; only phrases -->
                <button
                  v-if="item.type !== 'debut'"
                  class="w-6 h-6 flex items-center justify-center rounded text-faint hover:text-ink hover:bg-surface-3 transition-colors"
                  title="Edit text"
                  @click.stop="emit('item-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <!-- Presentation (intro narration) edit + regen -->
                <button
                  v-if="item.type === 'intro'"
                  class="w-6 h-6 flex items-center justify-center rounded text-purple-400 hover:text-white hover:bg-purple-500 hover:bg-opacity-30 transition-colors"
                  title="Edit intro narration & regenerate audio"
                  @click.stop="emit('presentation-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                  </svg>
                </button>
                <!-- LEGO (debut) AUDIO regen — text stays locked, punctuation goes to the TTS job only -->
                <button
                  v-if="item.type === 'debut'"
                  class="w-6 h-6 flex items-center justify-center rounded text-purple-400 hover:text-white hover:bg-purple-500 hover:bg-opacity-30 transition-colors"
                  title="Regenerate LEGO audio (text is locked)"
                  @click.stop="emit('lego-audio-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                  </svg>
                </button>
                <!-- Voice 1 (target1) — play -->
                <button
                  v-if="item.target1_audio_uuid"
                  class="h-5 px-1.5 flex items-center gap-0.5 rounded text-xs font-semibold transition-colors"
                  :class="playingTrackUuid === item.target1_audio_uuid ? 'bg-emerald-500 text-white' : 'text-muted hover:text-ink hover:bg-surface-3'"
                  title="Play Voice 1"
                  @click.stop="playTrack(item.target1_audio_uuid!)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>
                  1
                </button>
                <!-- Voice 2 (target2) — play -->
                <button
                  v-if="item.target2_audio_uuid"
                  class="h-5 px-1.5 flex items-center gap-0.5 rounded text-xs font-semibold transition-colors"
                  :class="playingTrackUuid === item.target2_audio_uuid ? 'bg-emerald-500 text-white' : 'text-muted hover:text-ink hover:bg-surface-3'"
                  title="Play Voice 2"
                  @click.stop="playTrack(item.target2_audio_uuid!)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>
                  2
                </button>
                <!-- Trash/flag phrase for deletion -->
                <button
                  v-if="item.phrase_id"
                  class="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors"
                  :class="flaggedPhraseIds.has(item.phrase_id!) ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500 hover:bg-opacity-20'"
                  :title="flaggedPhraseIds.has(item.phrase_id!) ? 'Unflag phrase' : 'Flag phrase for deletion'"
                  @click.stop="emit('phrase-flag', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
                <!-- Open this cycle in the real learning app — leaves Popty -->
                <button
                  class="open-cycle-btn w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-surface-3 transition-colors text-base leading-none"
                  title="Open the learning app from here"
                  @click.stop="openRoundInLearningApp(round, idx + 1)"
                >&nearr;</button>
              </div>

              <!-- Phase indicator when this item is playing -->
              <div v-if="isItemPlaying(round.roundNumber, idx)" class="phase-indicator flex gap-1">
                <span
                  v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
                  :key="phase"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="player.currentPhase.value === phase ? 'bg-emerald-400' : 'bg-surface-3'"
                  :title="phase"
                ></span>
              </div>

              <!-- Audio Status (only show when NOT playing this item).
                   Green means the LIVE PLAYER can deliver the row, not merely
                   that Popty's preview has something to play — a row whose
                   second target voice is missing previews fine here and is
                   dropped by the player, so playerCanDeliver decides. -->
              <div v-else class="audio-status flex gap-2">
                <span
                  v-if="item.playerCanDeliver !== undefined ? item.playerCanDeliver : item.hasAudio"
                  class="audio-ok-icon text-emerald-400"
                  title="Audio available — the player delivers this row"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </span>
                <span
                  v-else
                  class="audio-missing-icon text-amber-400"
                  :title="item.playerCanDeliver === false ? itemFlagTitle(item) : 'Audio missing'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </span>
              </div>

              <!-- LEGO Badge (for review items showing which LEGO) -->
              <div
                v-if="item.type === 'review' && item.legoId !== round.legoId"
                class="lego-badge px-2 py-1 bg-surface-3 text-ink text-xs rounded font-mono"
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
      <svg class="w-16 h-16 mx-auto text-faint mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <h3 class="text-lg font-medium text-muted">No Learning Journey Data</h3>
      <p class="text-faint mt-2">This course may not have any LEGOs or practice phrases yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useScriptPlayer } from '@/composables/useScriptPlayer'
import { getApiUrl } from '@/services/api'
import { buildLearningAppUrl } from '@/utils/learningAppUrl'
import { qaGate } from '@/services/qaGate'

// Mirrors the learner session's cycle types: the generator emits ONLY
// intro/debut/build/review/consolidate. Component priming, listening clusters
// and pod laps are never played in the learner's main flow (Listening MODE
// and the per-learner pod scheduler own those) so Script View no longer
// projects them — see docs/voice-engine/script-divergence-report.md.
interface ScriptItem {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  type: 'intro' | 'debut' | 'build' | 'review' | 'consolidate'
  phrase_id?: string
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
  // Player-delivery annotation (learning-script-generator annotatePlayerDelivery).
  // The row is ALWAYS shown; these only say whether the live player can play it.
  playerCanDeliver?: boolean
  playerDropReason?: 'intro-audio' | 'debut-audio' | 'phrase-audio' | 'seed-audio'
  missingAudioRoles?: string[]
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
  playerDelivers?: boolean
  playerDropReason?: string
  missingAudioRoles?: string[]
  playerRoundNumber?: number | null
  undeliverableItemCount?: number
}

interface Stats {
  roundsGenerated: number
  totalItems: number
  itemsWithAudio: number
  itemsMissingAudio: number
  itemsPlayerCannotDeliver?: number
  roundsPlayerDrops?: number
  generationTimeMs: number
  graduatedSeeds?: number
  // Audio-gap toggle ("As the learner hears it") — set by the generator
  learnerView?: boolean
  phrasesDroppedForAudio?: number
}

const props = defineProps<{
  rounds: RoundData[]
  allItems: ScriptItem[]
  stats: Stats | null
  courseCode: string
  isLoading?: boolean
  hideControls?: boolean
  flaggedPhraseIds?: Set<string>
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
  'item-edit': [item: ScriptItem]
  'presentation-edit': [item: ScriptItem]
  'lego-audio-edit': [item: ScriptItem]
  'phrase-flag': [item: ScriptItem]
}>()

// Default empty sets for optional props
const emptySet = new Set<string>()
const flaggedPhraseIds = computed(() => props.flaggedPhraseIds || emptySet)

// ── Player-delivery annotation ────────────────────────────────────────────
// The Script Viewer always shows the FULL intended course. These helpers turn
// the generator's per-row / per-round annotation into a plain-English flag, so
// a reviewer can see at a glance what the live player cannot deliver today.
// Display only — nothing here filters, gates or publishes anything.
const ROLE_LABELS: Record<string, string> = {
  known: 'prompt',
  target1: 'voice 1',
  target2: 'voice 2',
}
const rolesPhrase = (roles?: string[]) =>
  (roles || []).map(r => ROLE_LABELS[r] || r).join(' + ')

const itemFlagLabel = (item: ScriptItem): string =>
  item.playerDropReason === 'intro-audio' ? 'intro skipped' : 'audio missing'

const itemFlagTitle = (item: ScriptItem): string => {
  switch (item.playerDropReason) {
    case 'intro-audio':
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this intro — the player skips the intro cycle only; the rest of the round plays.`
    case 'debut-audio':
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this LEGO — the player skips the debut cycle only; the rest of the round plays.`
    case 'seed-audio':
      return 'The player needs voice 1 on this seed sentence; without it it substitutes a use phrase, so this row never plays.'
    case 'phrase-audio':
    default:
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this phrase — the player skips this row.`
  }
}

// Only fires when the round has nothing playable at all — a missing clip costs
// its own cycle, never the round (learner app, 2026-08-06).
const roundFlagTitle = (round: RoundData): string =>
  'Every cycle in this round is still awaiting audio, so the live player has nothing to play here. '
  + 'The round is still shown because it is part of the intended course, and its number is unaffected.'

const roundPartialTitle = (round: RoundData): string =>
  `The player plays this round as R${round.roundNumber} and skips ${round.undeliverableItemCount} cycle`
  + `${round.undeliverableItemCount === 1 ? '' : 's'} that are awaiting audio.`

// Round numbers no longer move: an audio gap costs the cycle, not the number.
const roundNumberTitle = (round: RoundData): string => {
  if (round.playerDelivers === false) return 'Nothing in this round is playable yet — the player skips straight past it'
  return `Round ${round.roundNumber}`
}

// ── Approval-gate standing per round ──────────────────────────────────────
// Read-only and non-blocking: Script View is a proofing tool and must not
// depend on the gate being reachable. If the fetch fails, no badges render
// and nothing else changes. Sign-off itself lives on the QA Gate page — this
// only shows what a human has already recorded.
const qaStatus = ref(new Map<number, string>())

const qaBadgeLabel = (s: string) => ({
  passed: 'signed off', flagged: 'flagged', stale: 'stale',
}[s] || '')
const qaBadgeTitle = (s: string) => ({
  passed: 'A human played this round through in the real app and passed it',
  flagged: 'A human flagged this round',
  stale: 'Signed off, but the audio or content has changed since',
}[s] || '')
const qaBadgeClass = (s: string) => ({
  passed: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
  flagged: 'border-red-700 bg-red-900/30 text-red-300',
  stale: 'border-amber-700 bg-amber-900/30 text-amber-300',
}[s] || 'hidden')

async function loadQaStatus() {
  try {
    const { rounds } = await qaGate.rounds(props.courseCode, { from: 1, limit: 500 })
    const map = new Map<number, string>()
    for (const r of rounds || []) {
      if (r.status && r.status !== 'not_signed_off') map.set(r.round_index, r.status)
    }
    qaStatus.value = map
  } catch {
    qaStatus.value = new Map()
  }
}
onMounted(loadQaStatus)
watch(() => props.courseCode, loadQaStatus)

// Quick audition of a single voice track (F = target1, M = target2).
const playingTrackUuid = ref<string | null>(null)
let trackAudioEl: HTMLAudioElement | null = null
async function playTrack(uuid: string) {
  if (!uuid) return
  // Toggle off if the same track is already playing.
  if (trackAudioEl && playingTrackUuid.value === uuid) {
    trackAudioEl.pause();
    playingTrackUuid.value = null;
    return;
  }
  try {
    let url = `${apiBaseUrl}/api/production/${props.courseCode}/audio/${uuid}/url`
    const s3Key = introS3KeyMap.value.get(uuid)
    if (s3Key) url += `?s3Key=${encodeURIComponent(s3Key)}`
    const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (!resp.ok) return
    const data = await resp.json()
    if (!data.url) return
    if (trackAudioEl) trackAudioEl.pause()
    trackAudioEl = new Audio(data.url)
    playingTrackUuid.value = uuid
    trackAudioEl.onended = () => { playingTrackUuid.value = null }
    await trackAudioEl.play()
  } catch {
    playingTrackUuid.value = null
  }
}

// ============================================================================
// PLAYER SETUP
// ============================================================================

// Resolve audio UUIDs to signed URLs via the production API
const apiBaseUrl = localStorage.getItem('api_base_url') || getApiUrl()

// Build a map of UUID -> s3_key from intro items (presentation_audio has both)
// This lets the resolver pass the s3_key directly, bypassing the course_audio lookup
const introS3KeyMap = computed(() => {
  const map = new Map<string, string>()
  for (const item of props.allItems) {
    const pa = (item as any).presentation_audio
    if (pa?.id && pa?.s3_key) {
      map.set(pa.id, pa.s3_key)
    }
  }
  return map
})

const player = useScriptPlayer({
  audioUrlResolver: async (uuid: string) => {
    let url = `${apiBaseUrl}/api/production/${props.courseCode}/audio/${uuid}/url`
    const s3Key = introS3KeyMap.value.get(uuid)
    if (s3Key) {
      url += `?s3Key=${encodeURIComponent(s3Key)}`
    }
    const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.url
  }
})

// Build player-compatible items from allItems
// Intro cycle: presentation audio (PROMPT) → pause → LEGO target1 → LEGO target2
const playerItems = computed(() => {
  return props.allItems.map(item => {
    if (item.type === 'intro') {
      const presId = (item as any).presentation_audio?.id || null
      return {
        sourceId: presId,
        target1Id: item.target1_audio_uuid || null,
        target2Id: item.target2_audio_uuid || null,
        known_text: item.known_text,
        target_text: item.target_text,
        type: item.type,
        roundNumber: item.roundNumber,
        legoId: item.legoId,
      }
    }
    return {
      sourceId: item.known_audio_uuid || null,
      target1Id: item.target1_audio_uuid || null,
      target2Id: item.target2_audio_uuid || null,
      known_text: item.known_text,
      target_text: item.target_text,
      type: item.type,
      roundNumber: item.roundNumber,
      legoId: item.legoId,
    }
  })
})

// Build a lookup: for each round+itemIdx, what's the global index in allItems?
// Uses a per-round counter instead of indexOf (allItems are separate object references)
const globalIndexMap = computed(() => {
  const map = new Map<string, number>()
  const roundCounters = new Map<number, number>()

  props.allItems.forEach((item, globalIdx) => {
    const roundNum = item.roundNumber
    const localIdx = roundCounters.get(roundNum) || 0
    map.set(`${roundNum}-${localIdx}`, globalIdx)
    roundCounters.set(roundNum, localIdx + 1)
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

  // Count how many allItems with the same roundNumber come before this one
  let localIdx = 0
  for (let i = 0; i < idx; i++) {
    if (props.allItems[i].roundNumber === item.roundNumber) localIdx++
  }
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

// Leaves Popty for the real learning app, anchored on this round's LEGO.
// The preview player here is a proofing instrument; real playback fidelity
// lives in the learning app.
// `cycleText` is what actually anchors a per-cycle launch: this view's round
// list and the player's disagree on both membership and order, so the ordinal
// alone opens the wrong row. See learningAppUrl.ts.
const openRoundInLearningApp = (round: RoundData, cycle?: number) => {
  const cycleText = typeof cycle === 'number' ? round.items?.[cycle - 1]?.known_text : undefined
  const url = buildLearningAppUrl({
    courseCode: props.courseCode,
    round: round.roundNumber,
    legoId: round.legoId,
    cycle,
    cycleText
  })
  window.open(url, '_blank')
}

const expandAll = () => {
  props.rounds.forEach(round => {
    expandedRounds.value.add(round.roundNumber)
  })
}

const collapseAll = () => {
  expandedRounds.value.clear()
}

// Jump-to-round: expand + scroll + briefly highlight the target round card.
const highlightedRound = ref<number | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | null = null

const scrollToRound = async (roundNumber: number) => {
  expandedRounds.value.add(roundNumber)
  await nextTick()
  const el = document.getElementById(`journey-round-${roundNumber}`)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (highlightTimer) clearTimeout(highlightTimer)
  highlightedRound.value = roundNumber
  highlightTimer = setTimeout(() => { highlightedRound.value = null }, 2000)
  return true
}

// Expose methods + player for parent component
defineExpose({
  expandAll,
  collapseAll,
  scrollToRound,
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
    // Solid badge + white text reads in BOTH themes (the tint+light-text pattern washed out on
    // white). White stays white here regardless of theme — high contrast on a saturated -600.
    case 'intro': return 'bg-purple-600 text-white'
    case 'debut': return 'bg-emerald-600 text-white'
    case 'build': return 'bg-blue-600 text-white'
    case 'review': return 'bg-amber-600 text-white'
    case 'consolidate': return 'bg-cyan-600 text-white'
    default: return 'bg-surface-3 text-muted'
  }
}

const getItemBgClass = (item: ScriptItem): string => {
  if (item.type === 'intro') return 'bg-surface'
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

/* Light-mode legibility: the raw Tailwind emerald/amber-300/400 text and icons
   fall to ~1.3–1.5:1 on the light surfaces. Re-tint to the darkened accent
   tokens (same hue family) so they pass WCAG AA. Dark mode is untouched. */
:root[data-theme="light"] .stat-label-audio,
:root[data-theme="light"] .stat-val-audio,
:root[data-theme="light"] .lego-id-text,
:root[data-theme="light"] .audio-ok-icon {
  color: var(--accent-2); /* #047857 emerald family, 4.9:1 on surface, 4.5:1 on surface-2 */
}

:root[data-theme="light"] .stat-label-missing,
:root[data-theme="light"] .stat-val-missing,
:root[data-theme="light"] .audio-missing-icon {
  color: var(--accent); /* #a85508 amber/orange family, 5.4:1 on surface */
}
</style>
