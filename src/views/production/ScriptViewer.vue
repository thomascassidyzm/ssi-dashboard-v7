<template>
  <div class="script-viewer flex flex-col h-screen bg-canvas">
    <!-- Header -->
    <div class="script-header bg-surface border-b border-line px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="header-left flex items-center gap-4">
          <h1 class="text-xl font-bold text-ink">Script Viewer</h1>
          <div v-if="totalSeeds > 0" class="stats text-sm text-muted">
            <span v-if="journeySearching" class="text-emerald-400">Searching...</span>
            <span v-else-if="journeySearch.trim() && journeySearchResults !== null">
              {{ filteredJourneyRounds.length }} results
            </span>
            <span v-else>
              {{ filteredJourneyRounds.length }} rounds, {{ learningJourneyData?.stats?.totalItems || 0 }} items
            </span>
          </div>
          <!-- Search box -->
          <div class="relative">
            <input
              v-model="journeySearch"
              type="text"
              placeholder="Search text, seed, LEGO..."
              class="w-56 px-3 py-1.5 pl-8 text-sm bg-surface-2 text-ink placeholder-muted rounded border border-line focus:border-emerald-500 focus:outline-none"
              @keydown.escape="journeySearch = ''"
            />
            <!-- Spinner while searching, magnifying glass otherwise -->
            <svg v-if="journeySearching" class="absolute left-2.5 top-2 w-3.5 h-3.5 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <button
              v-if="journeySearch"
              @click="journeySearch = ''"
              class="absolute right-2 top-1.5 text-muted hover:text-ink"
            >&times;</button>
          </div>
        </div>

        <div class="header-right flex items-center gap-3">

          <!-- Pagination for journey mode -->
          <template v-if="viewMode === 'journey'">
            <!-- Single expand/collapse-all toggle -->
            <div class="flex gap-2">
              <button
                @click="toggleExpandAllJourney"
                class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        :d="journeyAllExpanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                </svg>
                {{ journeyAllExpanded ? 'Collapse all' : 'Expand all' }}
              </button>
              <!-- Audio-gap toggle: production view (default) shows items awaiting
                   audio so QA can fix them; learner view applies the learner app's
                   audio gate server-side (no-audio LEGOs/phrases dropped, rounds
                   renumbered — generateLearningScript.ts:816-823 port). -->
              <button
                @click="toggleLearnerAudioView"
                :class="learnerAudioView ? 'bg-emerald-700 text-emerald-100 hover:bg-emerald-600' : 'text-ink hover:text-ink bg-surface-2 hover:bg-surface-3'"
                class="px-3 py-1.5 text-sm rounded transition-colors"
                :title="learnerAudioView
                  ? 'Learner view: LEGOs & phrases awaiting audio are dropped and rounds are renumbered — exactly what the learner hears. Click for the production view.'
                  : 'Production view: includes items awaiting audio — learners skip these until fixed. Click to see the script as the learner hears it.'"
              >
                {{ learnerAudioView ? 'As the learner hears it' : 'Production view (incl. awaiting audio)' }}
              </button>
              <!-- Missing-audio filter (edit-cascade Delta D): show ONLY items
                   awaiting audio (intros included) so QA can review everything
                   pending before running Generate Missing Audio. -->
              <button
                @click="toggleMissingAudioOnly"
                :disabled="learnerAudioView"
                :class="[
                  missingAudioOnly ? 'bg-amber-700 text-amber-50 hover:bg-amber-600' : 'text-ink hover:text-ink bg-surface-2 hover:bg-surface-3',
                  learnerAudioView ? 'opacity-50 cursor-not-allowed' : ''
                ]"
                class="px-3 py-1.5 text-sm rounded transition-colors"
                :title="learnerAudioView
                  ? 'Switch to the production view to filter by missing audio.'
                  : (missingAudioOnly
                    ? 'Showing only items awaiting audio (intros included). Click to show everything.'
                    : 'Show only items awaiting audio (intros included) — review what Generate Missing Audio will render.')"
              >
                {{ missingAudioOnly ? 'Missing audio only ✓' : 'Missing audio only' }}
              </button>
              <!-- Whole-course sweep. "Missing audio only" above can only filter
                   the 20 rounds this page has loaded, so a 1,400-round course
                   takes 70 pages to audit. This runs the same check over every
                   round at once, server-side (audio-preview/missing-clips). -->
              <button
                @click="toggleCourseGaps"
                :class="courseGapsOpen ? 'bg-amber-700 text-amber-50 hover:bg-amber-600' : 'text-ink hover:text-ink bg-surface-2 hover:bg-surface-3'"
                class="px-3 py-1.5 text-sm rounded transition-colors"
                title="Every missing clip in the WHOLE course in one report — the same check as Missing audio only, run across every round instead of the 20 on this page. Takes a few seconds the first time."
              >
                {{ courseGapsOpen ? 'Whole-course audio report ✓' : 'Whole-course audio report' }}
              </button>
              <button
                @click="exportLearnerScript"
                :disabled="!learningJourneyData"
                class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors flex items-center gap-1"
                :class="{ 'opacity-50 cursor-not-allowed': !learningJourneyData }"
                title="Export learner script as markdown"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>

            <!-- Pagination Controls (only show when data is loaded) -->
            <div v-if="totalJourneyRounds > 0" class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="journeyOffset === 0"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="journeyOffset === 0
                  ? 'text-faint cursor-not-allowed'
                  : 'text-ink hover:text-ink hover:bg-surface-3'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-ink">
                <span class="font-medium text-ink">{{ journeyPageStart }}-{{ journeyPageEnd }}</span>
                <span class="text-faint"> rounds</span>
              </span>
              <button
                @click="nextPage"
                :disabled="!journeyHasMore"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="!journeyHasMore
                  ? 'text-faint cursor-not-allowed'
                  : 'text-ink hover:text-ink hover:bg-surface-3'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- Jump to round -->
              <div class="flex items-center gap-1 ml-1 pl-2 border-l border-line">
                <input
                  v-model="jumpToRoundInput"
                  type="number"
                  min="1"
                  :max="maxJourneyRoundNumber || undefined"
                  placeholder="Round #"
                  title="Jump to round"
                  class="w-20 px-2 py-1 text-sm bg-surface-2 text-ink placeholder-muted rounded border border-line focus:border-emerald-500 focus:outline-none"
                  @keydown.enter="jumpToRound()"
                />
                <button
                  @click="jumpToRound()"
                  :disabled="!jumpToRoundInput"
                  class="px-2 py-1 text-sm rounded transition-colors"
                  :class="!jumpToRoundInput
                    ? 'text-faint cursor-not-allowed'
                    : 'text-ink hover:text-ink hover:bg-surface-3'"
                >
                  Go
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div ref="scriptContentRef" class="script-content flex-1 overflow-y-auto p-6" :class="{ 'pb-24': journeyPlayerActive }">
      <!-- Loading State (only show full-screen spinner when no seeds loaded yet) -->
      <div v-if="isLoading && seeds.length === 0" class="loading-state flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-muted">{{ loadingProgress || 'Loading course data...' }}</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state flex items-center justify-center h-64">
        <div class="text-center max-w-md">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-ink mb-2">Error Loading Course</h3>
          <p class="text-muted mb-4">{{ error }}</p>
          <button
            @click="loadCourseData"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Learning Journey View Mode -->
      <template v-else>
        <!-- Whole-course missing-audio report — every round at once, not just
             the 20 loaded here. Same component the Audio Preview page uses, so
             the two surfaces can never quote different numbers. -->
        <AudioPreviewCourseGaps
          v-if="courseGapsOpen"
          :gaps="courseGaps"
          :loading="courseGapsLoading"
          :error="courseGapsError"
        />

        <!-- Loading Journey -->
        <div v-if="isLoadingJourney" class="loading-state flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-muted">Generating learning journey...</p>
          </div>
        </div>

        <!-- Journey Error -->
        <div v-else-if="journeyError" class="error-state flex items-center justify-center h-64">
          <div class="text-center max-w-md">
            <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-ink mb-2">Error Generating Journey</h3>
            <p class="text-muted mb-4">{{ journeyError }}</p>
            <button
              @click="reloadLearningJourney"
              class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Learning Journey View Component -->
        <LearningJourneyView
          v-else-if="learningJourneyData"
          ref="learningJourneyRef"
          :rounds="filteredJourneyRounds"
          :all-items="filteredJourneyAllItems"
          :course-code="courseCode"
          :stats="learningJourneyData.stats"
          :is-loading="isLoadingJourney"
          :hide-controls="true"
          :flagged-phrase-ids="journeyFlaggedPhraseIds"
          :can-edit-mapping="canEditMapping"
          @playback-state="onJourneyPlaybackState"
          @item-edit="onJourneyItemEdit"
          @presentation-edit="onJourneyPresentationEdit"
          @lego-audio-edit="onJourneyLegoAudioEdit"
          @phrase-flag="onJourneyPhraseFlag"
        />
      </template>
    </div>

    <!-- Playback Bar (Sticky Bottom) -->
    <Transition name="slide-up">
      <div v-if="currentPlayingSample" class="playback-bar bg-surface border-t border-line px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="playback-info flex-1">
            <div class="text-sm font-medium text-ink mb-1">{{ currentPlayingSample.text }}</div>
            <div class="text-xs text-muted">
              <span class="font-mono">{{ currentPlayingSample.uuid }}</span>
              <span class="mx-2">•</span>
              <span>{{ currentPlayingSample.role }} ({{ currentPlayingSample.cadence }})</span>
            </div>
          </div>

          <AudioPlayer
            :audio-url="currentPlayingSample.url"
            :show-waveform="false"
            :auto-play="true"
            @ended="onPlaybackEnded"
            @error="onPlaybackError"
          />

          <button
            @click="closePlaybackBar"
            class="p-2 text-muted hover:text-ink transition-colors"
            title="Close playback bar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Journey Playback Bar (4-Phase) — fixed bottom of viewport in journey mode -->
    <div v-if="journeyPlayerActive" class="journey-playback-bar fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line px-6 py-3">
      <div class="flex items-center gap-4">
        <template v-if="journeyPlayback?.currentItem">
          <!-- Position Info -->
          <div v-if="journeyPlayingRoundInfo" class="position-info text-xs text-muted font-mono min-w-24">
            R{{ journeyPlayingRoundInfo.roundNumber }}, {{ journeyPlayingRoundInfo.itemIndex }}/{{ journeyPlayingRoundInfo.itemCount }}
          </div>

          <!-- Type Badge -->
          <div
            class="type-badge px-2 py-0.5 rounded text-xs font-medium uppercase"
            :class="{
              'bg-purple-600 text-white': journeyPlayback.currentItem.type === 'intro',
              'bg-emerald-600 text-white': journeyPlayback.currentItem.type === 'debut',
              'bg-blue-600 text-white': journeyPlayback.currentItem.type === 'build',
              'bg-amber-600 text-white': journeyPlayback.currentItem.type === 'review',
              'bg-cyan-600 text-white': journeyPlayback.currentItem.type === 'consolidate',
            }"
          >
            {{ journeyPlayback.currentItem.type }}
          </div>

          <!-- Current Item Text -->
          <div class="item-text flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted truncate">{{ journeyPlayback.currentItem.known_text || '' }}</span>
              <span class="text-faint flex-shrink-0">&rarr;</span>
              <span
                class="text-ink truncate text-left"
                :dir="dirFor(journeyPlayback.currentItem.target_text || '')"
                style="unicode-bidi: isolate"
              >{{ journeyPlayback.currentItem.target_text || '' }}</span>
            </div>
          </div>

          <!-- 4-Phase Indicator -->
          <div class="phase-indicator flex gap-1 items-center">
            <div
              v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
              :key="phase"
              class="phase-segment px-2 py-0.5 rounded text-xs font-mono transition-colors"
              :class="journeyPlayback?.currentPhase === phase
                ? 'bg-emerald-500 text-white'
                : 'bg-surface-2 text-faint'"
            >
              {{ journeyPhaseLabel(phase) }}
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-100"
              :style="{ width: (journeyPlayback?.progress || 0) + '%' }"
            ></div>
          </div>

          <!-- Controls -->
          <div class="controls flex items-center gap-1">
            <!-- Previous -->
            <button
              @click="journeyPlayerPrevious"
              class="p-2 text-muted hover:text-ink transition-colors"
              title="Previous"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <!-- Play/Pause -->
            <button
              @click="journeyPlayback?.isPlaying ? journeyPlayerPause() : journeyPlayerPlay()"
              class="p-2 text-ink hover:text-emerald-400 transition-colors"
              :title="journeyPlayback?.isPlaying ? 'Pause' : 'Play'"
            >
              <svg v-if="journeyPlayback?.isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <!-- Next -->
            <button
              @click="journeyPlayerSkip"
              class="p-2 text-muted hover:text-ink transition-colors"
              title="Next"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            <!-- Stop -->
            <button
              @click="journeyPlayerStop"
              class="p-2 text-muted hover:text-red-400 transition-colors"
              title="Stop"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </div>

          <!-- Item Counter -->
          <div class="text-xs text-faint font-mono">
            {{ (journeyPlayback?.currentIndex || 0) + 1 }}/{{ journeyPlayback?.totalItems || 0 }}
          </div>
        </template>

        <!-- Idle state — nothing playing yet -->
        <template v-else>
          <div class="text-sm text-faint flex-1">Click play on any item or round to start preview</div>
          <div class="phase-indicator flex gap-1 items-center">
            <div
              v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
              :key="phase"
              class="phase-segment px-2 py-0.5 rounded text-xs font-mono bg-surface-2 text-faint"
            >
              {{ journeyPhaseLabel(phase) }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Phrase Edit Modal -->
    <PhraseEditModal
      ref="phraseEditModalRef"
      :visible="phraseEditModalVisible"
      :phrase="phraseToEdit"
      :mode="phraseEditMode"
      @close="closePhraseEditModal"
      @save="savePhraseEdit"
    />

    <!-- Presentation (Intro Narration) Edit + Regenerate Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="presentationModalVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="closePresentationModal"
        >
          <div class="bg-surface rounded-lg shadow-xl max-w-2xl w-full">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 class="text-lg font-semibold text-ink flex items-center gap-2">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                </svg>
                Intro Narration
                <span class="text-sm font-mono text-muted">{{ presentationLegoId }}</span>
              </h3>
              <button @click="closePresentationModal" class="text-muted hover:text-ink">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <div class="text-sm text-muted">
                <span class="text-ink">{{ presentationKnownText }}</span>
                <span class="mx-2 text-faint">&rarr;</span>
                <span
                  class="text-ink"
                  :dir="dirFor(presentationTargetText)"
                  style="unicode-bidi: isolate"
                >{{ presentationTargetText }}</span>
              </div>

              <!-- Loading current text -->
              <div v-if="presentationLoading" class="flex items-center gap-3 text-muted text-sm py-6">
                <svg class="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading current narration text...
              </div>

              <template v-else>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide">
                  Presentation text (spoken in the known language)
                </label>

                <!-- Un-authored LEGO: the box below is a DRAFT, not the course's -->
                <!-- stored narration. Say so — the old grey placeholder held a -->
                <!-- Chinese example and read as this course's real text. -->
                <div
                  v-if="presentationIsSuggested"
                  class="bg-amber-900 bg-opacity-20 border border-amber-800 rounded-lg p-3 text-sm text-amber-200"
                >
                  No intro narration is stored for this LEGO yet. The text below is a
                  suggested draft built from this course's own template — edit it and save
                  to record it.
                </div>

                <textarea
                  v-model="presentationText"
                  rows="4"
                  class="w-full px-3 py-2 text-sm bg-canvas text-ink rounded border border-line focus:border-purple-500 focus:outline-none resize-y"
                ></textarea>
                <p class="text-xs text-faint">
                  This is the authoritative store for the intro audio. Saving regenerates only this LEGO's clip.
                </p>

                <!-- Result / audition -->
                <div v-if="presentationResult" class="bg-emerald-900 bg-opacity-20 border border-emerald-800 rounded-lg p-3 space-y-2">
                  <div class="text-sm text-emerald-300">
                    Regenerated ({{ presentationResult.duration_ms }}ms){{ presentationResult.created ? ' — created new row' : '' }}.
                  </div>
                  <audio
                    v-if="presentationAudioUrl"
                    :src="presentationAudioUrl"
                    controls
                    class="w-full h-9"
                  ></audio>
                </div>

                <div v-if="presentationError" class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                  {{ presentationError }}
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                @click="closePresentationModal"
                class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                @click="savePresentationAndRegen"
                :disabled="presentationBusy || presentationLoading || !presentationText.trim()"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="presentationBusy" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ presentationBusy ? 'Regenerating...' : 'Save & regenerate audio' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- LEGO Audio Regenerate Modal — TEXT IS LOCKED, punctuation goes to the voice only -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="legoAudioModalVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="closeLegoAudioModal"
        >
          <div class="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 class="text-lg font-semibold text-ink flex items-center gap-2">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                </svg>
                Regenerate LEGO audio
                <span class="text-sm font-mono text-muted">{{ legoAudioLegoId }}</span>
              </h3>
              <button @click="closeLegoAudioModal" class="text-muted hover:text-ink">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <!-- Canonical LEGO text: read-only, visibly locked -->
              <div class="bg-surface-2 bg-opacity-60 border border-line rounded-lg p-3 space-y-1">
                <div class="flex items-center gap-2 text-xs font-medium text-muted uppercase tracking-wide">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  LEGO text — locked
                </div>
                <div class="text-sm">
                  <span class="text-ink">{{ legoAudioKnownText }}</span>
                  <span class="mx-2 text-faint">&rarr;</span>
                  <span
                    class="text-ink"
                    :dir="dirFor(legoAudioTargetText)"
                    style="unicode-bidi: isolate"
                  >{{ legoAudioTargetText }}</span>
                </div>
                <p class="text-xs text-faint">
                  The LEGO text cannot be edited here — every BUILD phrase contains it, so a change would cascade across the course.
                </p>
              </div>

              <!-- Spoken text overrides -->
              <div class="space-y-2">
                <label class="block text-xs font-medium text-muted uppercase tracking-wide">
                  Spoken text (sent to the voice only) — Known
                </label>
                <input
                  v-model="legoSpokenKnown"
                  type="text"
                  class="w-full px-3 py-2 text-sm bg-canvas text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
                />
                <div class="flex items-center gap-1.5">
                  <button
                    v-for="v in punctuationVariants"
                    :key="`k-${v.label}`"
                    class="px-2 py-1 text-xs rounded bg-surface-2 hover:bg-surface-3 text-ink border border-line transition-colors"
                    :title="v.title"
                    @click="applyPunctuation('known', v)"
                  >{{ v.label }}</button>
                  <button
                    class="px-2 py-1 text-xs rounded text-muted hover:text-ink transition-colors"
                    @click="legoSpokenKnown = legoAudioKnownText"
                  >reset</button>
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-xs font-medium text-muted uppercase tracking-wide">
                  Spoken text (sent to the voice only) — Target
                </label>
                <input
                  v-model="legoSpokenTarget"
                  type="text"
                  :dir="dirFor(legoSpokenTarget)"
                  class="w-full px-3 py-2 text-sm bg-canvas text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
                />
                <div class="flex items-center gap-1.5">
                  <button
                    v-for="v in punctuationVariants"
                    :key="`t-${v.label}`"
                    class="px-2 py-1 text-xs rounded bg-surface-2 hover:bg-surface-3 text-ink border border-line transition-colors"
                    :title="v.title"
                    @click="applyPunctuation('target', v)"
                  >{{ v.label }}</button>
                  <button
                    class="px-2 py-1 text-xs rounded text-muted hover:text-ink transition-colors"
                    @click="legoSpokenTarget = legoAudioTargetText"
                  >reset</button>
                </div>
              </div>

              <!-- Measured 2026-08-07: clip identity normalises a trailing full stop
                   away, so a "." tuning shares its key with the plain clip and a later
                   course-wide pass can overwrite it. "," and "…" keep their own rows. -->
              <p class="text-xs text-faint">
                A trailing &ldquo;.&rdquo; is normalised away in the clip's identity, so a later
                course-wide pass can overwrite that tuning. Use &ldquo;,&rdquo; or &ldquo;…&rdquo;
                if it needs to stick.
              </p>

              <!-- Role checkboxes (same choice as the phrase edit modal) -->
              <div class="space-y-2">
                <div class="text-xs font-medium text-muted uppercase tracking-wide">Regenerate which clips</div>
                <label class="flex items-center gap-3 p-3 rounded-lg border-2 border-line bg-surface-3 bg-opacity-10 cursor-pointer">
                  <input v-model="legoRegenFlags.known" type="checkbox" class="w-4 h-4 bg-surface-2 border-line rounded" />
                  <span class="text-sm font-medium text-ink">Known</span>
                  <span class="text-xs text-faint truncate">{{ legoSpokenKnown }}</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer"
                  :class="legoRegenFlags.target1 ? 'border-emerald-500 bg-emerald-500 bg-opacity-10' : 'border-line'">
                  <input v-model="legoRegenFlags.target1" type="checkbox" class="w-4 h-4 text-emerald-500 bg-surface-2 border-line rounded" />
                  <span class="voice-badge inline-flex items-center gap-0.5 text-xs font-medium text-muted px-1.5 py-0.5 bg-surface-3 rounded">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>Voice 1
                  </span>
                  <span
                    class="text-xs text-faint truncate text-left"
                    :dir="dirFor(legoSpokenTarget)"
                    style="unicode-bidi: isolate"
                  >{{ legoSpokenTarget }}</span>
                </label>
                <label class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer"
                  :class="legoRegenFlags.target2 ? 'border-emerald-500 bg-emerald-500 bg-opacity-10' : 'border-line'">
                  <input v-model="legoRegenFlags.target2" type="checkbox" class="w-4 h-4 text-emerald-500 bg-surface-2 border-line rounded" />
                  <span class="voice-badge inline-flex items-center gap-0.5 text-xs font-medium text-muted px-1.5 py-0.5 bg-surface-3 rounded">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>Voice 2
                  </span>
                  <span
                    class="text-xs text-faint truncate text-left"
                    :dir="dirFor(legoSpokenTarget)"
                    style="unicode-bidi: isolate"
                  >{{ legoSpokenTarget }}</span>
                </label>
              </div>

              <!-- Result / audition per role -->
              <div v-if="legoAudioResults.length" class="bg-emerald-900 bg-opacity-20 border border-emerald-800 rounded-lg p-3 space-y-3">
                <div class="text-xs text-emerald-400">
                  Live on this LEGO already — nothing to save. Not right? Change the punctuation and regenerate again.
                </div>
                <div v-for="r in legoAudioResults" :key="r.role" class="space-y-1">
                  <div class="text-sm text-emerald-300">
                    {{ r.label }} — {{ r.durationMs }}ms · spoke &ldquo;{{ r.spoken }}&rdquo;
                  </div>
                  <audio v-if="r.url" :src="r.url" controls class="w-full h-9"></audio>
                  <div v-else class="text-xs text-faint">Regenerated, but no audition URL available.</div>
                </div>
              </div>

              <!-- Nothing went wrong, but a role was deliberately left alone -->
              <div v-if="legoAudioNotice" class="bg-amber-900 bg-opacity-20 border border-amber-800 rounded-lg p-3 text-sm text-amber-200">
                {{ legoAudioNotice }}
              </div>

              <div v-if="legoAudioError" class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                {{ legoAudioError }}
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                @click="closeLegoAudioModal"
                class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                @click="regenerateLegoAudio"
                :disabled="legoAudioBusy || !legoSelectedRoles.length"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="legoAudioBusy" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ legoAudioBusy ? 'Regenerating...' : 'Regenerate audio' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Batch Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteConfirmModal"
          class="delete-confirm-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showDeleteConfirmModal = false"
        >
          <div class="modal-content bg-surface rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 class="text-lg font-semibold text-ink flex items-center gap-2">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Deletion
              </h3>
              <button
                @click="showDeleteConfirmModal = false"
                class="text-muted hover:text-ink transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body px-6 py-5">
              <p class="text-ink mb-4">
                You are about to permanently delete
                <span class="font-semibold text-ink">{{ selectedCount }}</span>
                phrase{{ selectedCount !== 1 ? 's' : '' }} from this course.
              </p>
              <div class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-sm text-red-300">
                <strong>Warning:</strong> This action cannot be undone. The phrases will be removed from the database.
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
              <button
                @click="showDeleteConfirmModal = false"
                class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="handleBatchDelete"
                :disabled="isDeleting"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="isDeleting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {{ isDeleting ? 'Deleting...' : 'Delete Phrases' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Journey Phrase Flagging: Floating Action Bar -->
    <Transition name="modal">
      <div
        v-if="journeyFlaggedPhraseIds.size > 0 && viewMode === 'journey'"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-red-900 bg-opacity-95 border border-red-700 rounded-lg shadow-xl px-5 py-3 flex items-center gap-4"
      >
        <span class="text-red-200 text-sm font-medium">
          {{ journeyFlaggedPhraseIds.size }} phrase{{ journeyFlaggedPhraseIds.size !== 1 ? 's' : '' }} flagged
        </span>
        <button
          @click="journeyFlaggedPhraseIds.clear()"
          class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors"
        >Clear</button>
        <button
          @click="showJourneyDeleteStep = 1"
          class="px-4 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Delete Flagged
        </button>
      </div>
    </Transition>

    <!-- Journey Phrase Delete: Two-Step Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showJourneyDeleteStep > 0"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showJourneyDeleteStep = 0"
        >
          <div class="bg-surface rounded-lg shadow-xl max-w-lg w-full">
            <!-- Step 1: Review flagged phrases -->
            <template v-if="showJourneyDeleteStep === 1">
              <div class="px-6 py-4 border-b border-line">
                <h3 class="text-lg font-semibold text-ink">Review Flagged Phrases</h3>
              </div>
              <div class="px-6 py-4 max-h-80 overflow-y-auto space-y-2">
                <div
                  v-for="item in journeyFlaggedPhraseDetails"
                  :key="item.phrase_id"
                  class="flex items-center gap-3 p-2 bg-surface-2 rounded text-sm"
                >
                  <span class="text-muted truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-faint">&rarr;</span>
                  <span
                    class="text-ink truncate flex-1 text-left"
                    :dir="dirFor(item.target_text)"
                    style="unicode-bidi: isolate"
                  >{{ item.target_text }}</span>
                  <button
                    @click="onRemoveJourneyFlaggedPhrase(item.phrase_id)"
                    class="text-faint hover:text-red-400 flex-shrink-0"
                    title="Remove from list"
                  >&times;</button>
                </div>
                <p v-if="journeyFlaggedPhraseDetails.length === 0" class="text-faint text-sm">No phrases flagged.</p>
              </div>
              <div class="px-6 py-4 border-t border-line flex justify-end gap-3">
                <button @click="showJourneyDeleteStep = 0" class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm rounded-lg transition-colors">Cancel</button>
                <button @click="showJourneyDeleteStep = 2" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors">Confirm Delete</button>
              </div>
            </template>

            <!-- Step 2: Final confirmation -->
            <template v-if="showJourneyDeleteStep === 2">
              <div class="px-6 py-4 border-b border-line">
                <h3 class="text-lg font-semibold text-ink flex items-center gap-2">
                  <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  Final Confirmation
                </h3>
              </div>
              <div class="px-6 py-5">
                <p class="text-ink mb-4">
                  Delete <span class="font-semibold text-ink">{{ journeyFlaggedPhraseIds.size }}</span>
                  phrase{{ journeyFlaggedPhraseIds.size !== 1 ? 's' : '' }}? This cannot be undone.
                </p>
                <div class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-sm text-red-300">
                  <strong>Warning:</strong> The phrases will be permanently removed from the database.
                </div>
              </div>
              <div class="px-6 py-4 border-t border-line flex justify-end gap-3">
                <button @click="showJourneyDeleteStep = 0" class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm rounded-lg transition-colors">Cancel</button>
                <button
                  @click="handleJourneyBatchDelete"
                  :disabled="isDeletingJourneyPhrases"
                  class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg v-if="isDeletingJourneyPhrases" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDeletingJourneyPhrases ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Keyboard Shortcuts Help Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showShortcutsHelp"
          class="shortcuts-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showShortcutsHelp = false"
        >
          <div class="modal-content bg-surface rounded-lg shadow-xl max-w-lg w-full p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-ink">Keyboard Shortcuts</h3>
              <button @click="showShortcutsHelp = false" class="text-muted hover:text-ink">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="shortcuts-list space-y-3">
              <div v-for="shortcut in keyboardShortcuts" :key="shortcut.key" class="shortcut-item flex items-center justify-between py-2 border-b border-line">
                <span class="text-ink">{{ shortcut.description }}</span>
                <kbd class="px-2 py-1 bg-surface-2 text-ink rounded text-sm font-mono">{{ shortcut.key }}</kbd>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Scroll buttons (fixed bottom-right) -->
    <div class="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      <button
        @click="scrollUp"
        class="w-10 h-10 rounded-full bg-surface-2 hover:bg-surface-3 text-ink shadow-lg flex items-center justify-center transition-colors"
        title="Scroll up"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
        </svg>
      </button>
      <button
        @click="scrollDown"
        class="w-10 h-10 rounded-full bg-surface-2 hover:bg-surface-3 text-ink shadow-lg flex items-center justify-center transition-colors"
        title="Scroll down"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import AudioPlayer from './components/AudioPlayer.vue';
import PhraseEditModal from './components/PhraseEditModal.vue';
import LearningJourneyView from './components/LearningJourneyView.vue';
import AudioPreviewCourseGaps from './components/AudioPreviewCourseGaps.vue';
import { getApiUrl } from '@/services/api';
import { useAuth } from '@/composables/useAuth.js';
import { dirFor } from '@/utils/textDirection.js';
// CyclePlayer removed - not useful for QA workflow
import type {
  SeedRowData,
  PhraseRowData,
  AudioSample,
  KeyboardShortcut
} from '@/types/production';

// Route
const route = useRoute();
const courseCode = computed(() => route.params.courseCode as string || 'spa_for_eng');

// Scroll refs
const scriptContentRef = ref<HTMLElement | null>(null);
const scrollUp = () => scriptContentRef.value?.scrollBy({ top: -400, behavior: 'smooth' });
const scrollDown = () => scriptContentRef.value?.scrollBy({ top: 400, behavior: 'smooth' });

// State
const isLoading = ref(false);
const loadingProgress = ref('');  // e.g. "Loading seeds 11-20..."
const error = ref<string | null>(null);
const seeds = ref<SeedRowData[]>([]);
const totalSeedsInCourse = ref(0);  // Total seeds in course (from API)

// Filter State — default window derived from the course's own seed range on
// mount (initDefaultSeedRange); 50 is only the pre-fetch placeholder and the
// performance cap for large courses.
const DEFAULT_SEED_WINDOW = 50;
const filterSeedStart = ref('S0001');
const filterSeedEnd = ref('S' + String(DEFAULT_SEED_WINDOW).padStart(4, '0'));

// Track when seed range changes to trigger reload
const lastLoadedRange = ref({ start: '', end: '' });

// Playback State
const currentPlayingSample = ref<AudioSample | null>(null);

// Phrase Edit Modal State
const phraseEditModalVisible = ref(false);
const phraseEditModalRef = ref<InstanceType<typeof PhraseEditModal> | null>(null);
const phraseToEdit = ref<{
  id: string;
  known_text: string;
  target_text: string;
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;
  // The live journey/seed row object — rebound in-place after regen so the
  // *_audio_uuid pointers update reactively without a full reload.
  sourceItem?: any;
} | null>(null);
const phraseEditMode = ref<'phrase' | 'lego'>('phrase');


// Shortcuts Help
const showShortcutsHelp = ref(false);

// Learning Journey View Mode
const viewMode = ref<'script' | 'journey'>('journey');
const learningJourneyData = ref<{
  rounds: any[];
  allItems: any[];
  stats: any;
  totalLegoCount?: number;
} | null>(null);
const isLoadingJourney = ref(false);
// Whether this user may re-pair a word mapping in the journey rows. Decided by
// the API (editor/admin), not by the client; the client only uses it to avoid
// offering a gesture that would be refused.
const canEditMapping = ref(false);
const journeyError = ref<string | null>(null);

// Server-side pagination for journey view (20 LEGOs per page)
const journeyPageSize = 20;
const journeyOffset = ref(0);
const journeyHasMore = ref(true);

// Journey search (server-side across all content)
const journeySearch = ref('');
const journeySearchResults = ref<any[] | null>(null);
const journeySearchAllItems = ref<any[] | null>(null);
const journeySearching = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Watch search input and debounce server-side search
watch(journeySearch, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const trimmed = q.trim();
  if (!trimmed) {
    journeySearchResults.value = null;
    journeySearchAllItems.value = null;
    journeySearching.value = false;
    return;
  }
  journeySearching.value = true;
  searchDebounceTimer = setTimeout(() => searchJourney(trimmed), 400);
});

async function searchJourney(query: string) {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/learning-journey/search?q=${encodeURIComponent(query)}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    // Only update if search query hasn't changed during fetch
    if (journeySearch.value.trim() === query) {
      journeySearchResults.value = data.rounds || [];
      journeySearchAllItems.value = data.allItems || [];
    }
  } catch (err) {
    console.error('Journey search error:', err);
    journeySearchResults.value = [];
    journeySearchAllItems.value = [];
  } finally {
    journeySearching.value = false;
  }
}

// Use search results when searching, otherwise current page rounds
const filteredJourneyRounds = computed(() => {
  let rounds;
  if (journeySearch.value.trim() && journeySearchResults.value !== null) {
    rounds = journeySearchResults.value;
  } else {
    rounds = learningJourneyData.value?.rounds || [];
  }
  if (missingAudioOnly.value) {
    // Filter each round to its awaiting-audio items, drop rounds left empty.
    rounds = rounds
      .map((r) => ({ ...r, items: keepMissingAudio(r.items) }))
      .filter((r) => r.items.length > 0);
  }
  return rounds;
});

// Player needs items for whichever rounds are currently displayed.
// When searching, the search endpoint returns full items for matched rounds
// (which may be outside the loaded page window) — use those so the player
// can resolve audio for hits like R603 even when only R1-R20 are loaded.
const filteredJourneyAllItems = computed(() => {
  let items;
  if (journeySearch.value.trim() && journeySearchAllItems.value !== null) {
    items = journeySearchAllItems.value;
  } else {
    items = learningJourneyData.value?.allItems || [];
  }
  return missingAudioOnly.value ? keepMissingAudio(items) : items;
});

// Batch Selection State
const selectionMode = ref(false);
const selectedPhraseIds = ref<Set<string>>(new Set());
const showDeleteConfirmModal = ref(false);

const isDeleting = ref(false);

const handleBatchDelete = async () => {
  if (selectedPhraseIds.value.size === 0) return;

  isDeleting.value = true;
  const apiBaseUrl = getApiBaseUrl();

  try {
    const phraseIdsToDelete = Array.from(selectedPhraseIds.value);

    // Call the batch delete API
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrases/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phraseIds: phraseIdsToDelete }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete phrases');
    }

    // Remove phrases from local state (optimistic update already done by API success)
    const idsToDelete = new Set(phraseIdsToDelete);

    seeds.value = seeds.value.map(seed => ({
      ...seed,
      introduction_phrases: seed.introduction_phrases.filter(
        phrase => !idsToDelete.has(phrase.phrase_id)
      ),
      legos: seed.legos.map(lego => ({
        ...lego,
        phrases: lego.phrases.filter(phrase => !idsToDelete.has(phrase.phrase_id)),
      })),
    }));

    // Close modal and exit selection mode
    showDeleteConfirmModal.value = false;
    selectedPhraseIds.value = new Set();
    selectionMode.value = false;

    console.log(`Successfully deleted ${phraseIdsToDelete.length} phrases`);
  } catch (err) {
    console.error('Failed to delete phrases:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete phrases';
  } finally {
    isDeleting.value = false;
  }
};

const selectedCount = computed(() => selectedPhraseIds.value.size);
const learningJourneyRef = ref<any>(null);

// Journey playback state (emitted by LearningJourneyView)
const journeyPlayback = ref<{
  isPlaying: boolean
  isPaused: boolean
  currentItem: any
  currentPhase: string | null
  currentIndex: number
  progress: number
  totalItems: number
} | null>(null);

const onJourneyPlaybackState = (state: any) => {
  journeyPlayback.value = state;
};

const journeyPlayerActive = computed(() => {
  return viewMode.value === 'journey';
});

const journeyPhaseLabel = (phase: string | null): string => {
  switch (phase) {
    case 'prompt': return 'PROMPT';
    case 'pause': return 'PAUSE';
    case 'voice1': return 'VOICE 1';
    case 'voice2': return 'VOICE 2';
    default: return '';
  }
};

// Find which round the current playing item belongs to
const journeyPlayingRoundInfo = computed(() => {
  if (!journeyPlayback.value || !learningJourneyData.value?.allItems) return null;
  const idx = journeyPlayback.value.currentIndex;
  const item = learningJourneyData.value.allItems[idx];
  if (!item) return null;

  // Find the round
  const round = learningJourneyData.value.rounds.find((r: any) => r.roundNumber === item.roundNumber);
  if (!round) return null;
  const localIdx = round.items.indexOf(item);
  return {
    roundNumber: item.roundNumber,
    itemIndex: localIdx + 1,
    itemCount: round.items.length,
  };
});

// Journey player controls (proxied through the ref)
const journeyPlayerPrevious = () => learningJourneyRef.value?.player?.previous();
const journeyPlayerPlay = () => learningJourneyRef.value?.player?.play();
const journeyPlayerPause = () => learningJourneyRef.value?.player?.pause();
const journeyPlayerSkip = () => learningJourneyRef.value?.player?.skip();
const journeyPlayerStop = () => learningJourneyRef.value?.player?.stop();

// Computed for pagination (server-side)
const totalJourneyRounds = computed(() => learningJourneyData.value?.rounds?.length || 0);
const journeyPageStart = computed(() => journeyOffset.value + 1);
const journeyPageEnd = computed(() => journeyOffset.value + totalJourneyRounds.value);

// Pagination methods (server-side — reload from API)
const prevPage = () => {
  const newOffset = Math.max(0, journeyOffset.value - journeyPageSize);
  if (newOffset !== journeyOffset.value) {
    journeyOffset.value = newOffset;
    loadLearningJourney();
  }
};

const nextPage = () => {
  if (journeyHasMore.value) {
    journeyOffset.value += journeyPageSize;
    loadLearningJourney();
  }
};

// Jump-to-round: round numbers are 1:1 with the underlying LEGO ordinal
// (journeyPageStart/End are already computed this way), so totalLegoCount
// from the API doubles as the max round number for clamping.
const jumpToRoundInput = ref('');
const maxJourneyRoundNumber = computed(() => learningJourneyData.value?.totalLegoCount || 0);

const jumpToRound = async (roundNumberArg?: number) => {
  const raw = roundNumberArg ?? parseInt(jumpToRoundInput.value, 10);
  if (!raw || Number.isNaN(raw) || raw < 1) return;
  const max = maxJourneyRoundNumber.value;
  const target = max > 0 ? Math.min(Math.max(1, raw), max) : Math.max(1, raw);
  jumpToRoundInput.value = String(target);

  // Deep-linkable: keep the URL shareable to this round.
  updateRoundQueryParam(target);

  // Search results aren't paginated by offset — if a search is active, just
  // try to scroll within whatever's already loaded rather than fighting the
  // search endpoint's own result set.
  if (journeySearch.value.trim()) {
    const found = await learningJourneyRef.value?.scrollToRound(target);
    if (!found) {
      // Round isn't among the search results — nothing sensible to jump to;
      // degrade gracefully rather than breaking the search view.
      console.warn(`Round ${target} not found in current search results`);
    }
    return;
  }

  // Start the window AT the requested round (320 → 320-339), rather than
  // snapping to the page-of-20 that contains it.
  const targetOffset = target - 1;
  if (targetOffset !== journeyOffset.value) {
    journeyOffset.value = targetOffset;
    await loadLearningJourney();
  }
  await learningJourneyRef.value?.scrollToRound(target);
};

// Keep ?round= in sync so the current view is shareable/bookmarkable.
const updateRoundQueryParam = (roundNumber: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set('round', String(roundNumber));
  window.history.replaceState(window.history.state, '', url);
};

// Collapse/Expand all methods for journey view
const collapseAllJourney = () => {
  learningJourneyRef.value?.collapseAll();
};

const expandAllJourney = () => {
  learningJourneyRef.value?.expandAll();
};

// Single expand/collapse-all toggle for the journey view.
const journeyAllExpanded = ref(false);
const toggleExpandAllJourney = () => {
  journeyAllExpanded.value = !journeyAllExpanded.value;
  if (journeyAllExpanded.value) expandAllJourney();
  else collapseAllJourney();
};

// Audio-gap toggle. Default = production view: rows awaiting audio are SHOWN
// and flagged (that's the review tool's job). ON = "As the learner hears it":
// the journey is regenerated server-side with the learner app's audio gates —
// LEGOs/phrases missing any of known/target1/target2 audio are dropped BEFORE
// the round walk, so round numbers compress exactly the way the learner's do.
const learnerAudioView = ref(false);
const toggleLearnerAudioView = () => {
  learnerAudioView.value = !learnerAudioView.value;
  // Round numbering changes between the two views — restart from page 1.
  journeyOffset.value = 0;
  loadLearningJourney();
};

// Missing-audio filter (edit-cascade Delta D). When ON, the journey is filtered
// client-side to ONLY items awaiting audio (no known/target1/target2, or — for
// intros — no presentation/target1) so QA can flick through every pending item
// before triggering Generate Missing Audio. Unlike the learner view (which DROPS
// awaiting-audio rows), this keeps only those rows, so the two are mutually
// exclusive: turning this on forces the production data set.
const missingAudioOnly = ref(false);
const toggleMissingAudioOnly = () => {
  missingAudioOnly.value = !missingAudioOnly.value;
  // Missing-audio needs the production data (the learner view drops the very rows
  // we want to surface), so flip back to production and refetch when needed.
  if (missingAudioOnly.value && learnerAudioView.value) {
    learnerAudioView.value = false;
    journeyOffset.value = 0;
    loadLearningJourney();
  }
};

// ── Whole-course missing-audio report ─────────────────────────────────────
// "Missing audio only" above can only filter the rounds this page has loaded —
// 20 at a time — so auditing a 1,400-round course by hand means 70 pages. The
// server already runs the same check over the whole journey for the Audio
// Preview page (audio-preview/missing-clips, ~7.5s uncached, cached 60s); this
// just brings that report to the surface where a reviewer is already reading
// the script. Read-only, and it never touches what the rounds view shows.
const courseGapsOpen = ref(false);
const courseGaps = ref(null);
const courseGapsLoading = ref(false);
const courseGapsError = ref('');

const fetchCourseGaps = async () => {
  if (!courseCode.value) return;
  courseGapsLoading.value = true;
  courseGapsError.value = '';
  try {
    const resp = await authedFetch(
      `/api/production/${courseCode.value}/audio-preview/missing-clips`
    );
    if (!resp.ok) throw new Error(`missing-clips ${resp.status}`);
    courseGaps.value = await resp.json();
  } catch (err) {
    // Shown in the block's own place: a report that silently renders nothing
    // is indistinguishable from a course with no gaps.
    courseGapsError.value = err.message;
    console.error('[ScriptViewer] whole-course missing-clip scan failed', err);
  } finally {
    courseGapsLoading.value = false;
  }
};

const toggleCourseGaps = () => {
  courseGapsOpen.value = !courseGapsOpen.value;
  if (courseGapsOpen.value && !courseGaps.value && !courseGapsLoading.value) {
    fetchCourseGaps();
  }
};

// A different course is a different report.
watch(courseCode, () => {
  courseGaps.value = null;
  courseGapsError.value = '';
  if (courseGapsOpen.value) fetchCourseGaps();
});

// Keep only items awaiting audio; intros are INCLUDED here (unlike the default
// amber/stats view which exempts them, since intro audio has a fallback).
// Prefer the generator's player-delivery annotation when present: hasAudio only
// checks known+target1, so a row missing its SECOND target voice looks fine
// here yet is dropped by the live player.
const keepMissingAudio = (items) =>
  (items || []).filter((it) => (it.playerCanDeliver !== undefined ? !it.playerCanDeliver : !it.hasAudio));

// Export learner script as markdown download
const exportLearnerScript = () => {
  if (!learningJourneyData.value?.rounds) return;

  const rounds = learningJourneyData.value.rounds;
  const stats = learningJourneyData.value.stats;
  const lines: string[] = [];

  lines.push(`# ${courseCode.value} — Learner Script`);
  lines.push('');
  lines.push(`> ${stats.roundsGenerated} rounds | ${stats.totalItems} items | ${stats.legosLoaded} LEGOs`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const round of rounds) {
    const intro = round.items.find((i: any) => i.type === 'intro');
    const known = intro?.known_text || '';
    const target = intro?.target_text || '';
    const reviews = round.spacedRepReviews || [];
    const reviewStr = reviews.length > 0 ? `  [reviews: ${reviews.map((r: number) => 'R' + r).join(', ')}]` : '';

    lines.push(`## R${round.roundNumber}  ${round.legoId}  "${known}" = **${target}**${reviewStr}`);
    lines.push('');

    for (const item of round.items) {
      let label = item.type.toUpperCase();
      if (item.type === 'intro') label = 'INTRO';
      else if (item.type === 'debut') label = 'LEGO';
      else if (item.type === 'build') label = `BUILD-${item.phrasePosition || '?'}`;
      else if (item.type === 'use') label = `USE-${item.phrasePosition || '?'}`;
      else if (item.type === 'review') label = `REVIEW R${item.reviewOf || '?'}`;
      else if (item.type === 'consolidate') label = `CONSOLIDATE-${item.consolidateIndex || '?'}`;

      const pad = Math.max(1, 18 - label.length);
      lines.push(`  ${label}${' '.repeat(pad)}${item.known_text || ''}  →  ${item.target_text || ''}`);
    }

    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${courseCode.value}-learner-script.md`;
  a.click();
  URL.revokeObjectURL(url);
};

// API Base URL - use localStorage (set by EnvironmentSwitcher), then env, then localhost orchestrator
const getApiBaseUrl = (): string => {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;
  return getApiUrl();
};

// Admin-gated fetch — attach a fresh Supabase access token as Bearer.
// Mirrors the PodDetailView authedFetch pattern. Required for the
// regenerate-phrase endpoint (requireAdmin — it costs TTS, D3).
const { getAccessToken } = useAuth();
const authedFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
};

// Computed
const totalSeeds = computed(() => totalSeedsInCourse.value || seeds.value.length);
const loadedSeeds = computed(() => seeds.value.length);

// Seed View pagination (server-side via filter range)
const seedPageSize = 50;
const formatSeedNum = (n: number) => 'S' + String(n).padStart(4, '0');

// Keyboard Shortcuts
const keyboardShortcuts: KeyboardShortcut[] = [
  { key: 'Space', description: 'Play/Pause audio', action: () => {/* handled by audio player */} },
  { key: 'F', description: 'Flag selected sample', action: () => {/* TODO: implement */} },
  { key: 'Esc', description: 'Close modals', action: () => { closePhraseEditModal(); showShortcutsHelp.value = false; showDeleteConfirmModal.value = false; } },
  { key: '?', description: 'Show keyboard shortcuts', action: () => { showShortcutsHelp.value = !showShortcutsHelp.value; } },
];

// Methods
const CHUNK_SIZE = 10; // Load 10 seeds at a time to keep queries fast

const loadCourseData = async (seedStart?: string, seedEnd?: string) => {
  isLoading.value = true;
  error.value = null;
  loadingProgress.value = '';

  // Use provided values or current filter values
  const start = seedStart ?? filterSeedStart.value;
  const end = seedEnd ?? filterSeedEnd.value;

  try {
    const apiBaseUrl = getApiBaseUrl();

    seeds.value = []; // Clear before progressive load

    const startNum = parseInt((start || 'S0001').replace(/\D/g, '')) || 1;
    const endNum = parseInt((end || 'S0050').replace(/\D/g, '')) || 50;

    // Load in chunks of CHUNK_SIZE, appending results as they arrive
    for (let chunkStart = startNum; chunkStart <= endNum; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, endNum);
      const chunkStartStr = 'S' + String(chunkStart).padStart(4, '0');
      const chunkEndStr = 'S' + String(chunkEnd).padStart(4, '0');

      loadingProgress.value = `Loading seeds ${chunkStart}–${chunkEnd}...`;

      const params = new URLSearchParams();
      params.set('seedStart', chunkStartStr);
      params.set('seedEnd', chunkEndStr);

      const url = `${apiBaseUrl}/api/production/${courseCode.value}/script-view?${params.toString()}`;

      const response = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: AbortSignal.timeout(60000) // 60s per chunk (not 5 min for everything)
      });

      if (!response.ok) {
        console.warn(`Failed to load chunk ${chunkStartStr}-${chunkEndStr}, skipping`);
        continue;
      }

      const data = await response.json();
      const chunkSeeds = transformScriptViewToSeeds(data);

      // Append to existing seeds (progressive update)
      seeds.value = [...seeds.value, ...chunkSeeds];

      // Store total from first chunk's pagination
      if (data.pagination && !totalSeedsInCourse.value) {
        totalSeedsInCourse.value = data.pagination.total;
      }
    }

    lastLoadedRange.value = { start, end };
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading course data:', err);
  } finally {
    isLoading.value = false;
    loadingProgress.value = '';
  }
};

// Load learning journey data (server-side pagination, 50 LEGOs per page).
// silent: refresh the data without flipping isLoadingJourney — the spinner
// swap unmounts the rounds list, which is what snapped the scroll to the top.
const loadLearningJourney = async (opts: { silent?: boolean } = {}) => {
  if (!opts.silent) isLoadingJourney.value = true;
  journeyError.value = null;

  try {
    // Authed: the response now carries canEditMapping, which the API can only
    // decide if it knows who is asking. The course-scope gate accepts this
    // token on every other /api/production route already.
    const response = await authedFetch(
      `/api/production/${courseCode.value}/learning-journey?maxLegos=${journeyPageSize}&offset=${journeyOffset.value}${learnerAudioView.value ? '&learnerView=1' : ''}`
    );

    if (!response.ok) throw new Error('Failed to load learning journey');

    const data = await response.json();
    learningJourneyData.value = {
      rounds: data.rounds || [],
      allItems: data.allItems || [],
      stats: data.stats || null,
      totalLegoCount: data.totalLegoCount || 0,
    };
    // A reader still sees every mapping; only the re-pairing gesture is gated.
    canEditMapping.value = !!data.canEditMapping;

    // Detect if there are more pages
    journeyHasMore.value = (data.pagination?.returned || 0) >= journeyPageSize;
  } catch (err) {
    journeyError.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading learning journey:', err);
  } finally {
    isLoadingJourney.value = false;
  }
};

// Reload learning journey
const reloadLearningJourney = () => {
  loadLearningJourney();
};

// Silent in-place refresh after a phrase edit. The rounds list and allItems are
// separate objects client-side, so rebinding the edited row alone leaves the
// 4-phase player (allItems) and review copies in other rounds stale — a full
// re-fetch is the only way to true everything up. Done silently (list stays
// mounted) with the scroll position restored, so the editor keeps their spot.
//
// When a search is ACTIVE the screen is rendered from journeySearchResults /
// journeySearchAllItems, NOT from learningJourneyData — refreshing only the
// paginated page left the visible rows and the player on the old audio (the
// 2026-08-08 "regenerate doesn't save" report: the LEGO was found by searching
// "explain", so nothing on screen was ever trued up). Re-run the search too.
const refreshJourneyInPlace = async () => {
  const scrollTop = scriptContentRef.value?.scrollTop ?? 0;
  const activeSearch = journeySearch.value.trim();
  await Promise.all([
    loadLearningJourney({ silent: true }),
    activeSearch ? searchJourney(activeSearch) : Promise.resolve(),
  ]);
  await nextTick();
  if (scriptContentRef.value) scriptContentRef.value.scrollTop = scrollTop;
};

// Transform new /script-view endpoint data into SeedRowData format
const transformScriptViewToSeeds = (data: any): SeedRowData[] => {
  if (!data || !data.seeds) return [];

  return data.seeds.map((seed: any) => {
    // Transform LEGOs
    const legos = (seed.legos || []).map((lego: any) => {
      // Transform phrases
      const phrases: PhraseRowData[] = (lego.phrases || []).map((phrase: any) => {
        return {
          phrase_id: phrase.id,
          type: 'PRAC' as any, // All practice phrases for QA
          known_text: phrase.known_text,
          target_text: phrase.target_text,
          // Audio UUIDs from script-view (for direct S3 playback)
          known_audio_uuid: phrase.known_audio_uuid || null,
          target1_audio_uuid: phrase.target1_audio_uuid || null,
          target2_audio_uuid: phrase.target2_audio_uuid || null,
          // S3 keys for v13 audio URLs
          known_s3_key: phrase.known_s3_key || null,
          target1_s3_key: phrase.target1_s3_key || null,
          target2_s3_key: phrase.target2_s3_key || null,
          // Flag status from database
          is_flagged: phrase.is_flagged || false,
          known_flag: phrase.known_flag || null,
          target1_flag: phrase.target1_flag || null,
          target2_flag: phrase.target2_flag || null,
          seed_id: seed.seed_id,
          cycle_index: phrase.position,
          word_count: phrase.word_count,
          lego_count: phrase.lego_count,
          introduce: phrase.introduce,
        };
      });

      // Sort by target text character length (shortest first = DEBUT-like, longest = ETERNAL-like)
      phrases.sort((a, b) => a.target_text.length - b.target_text.length);

      return {
        lego_id: lego.lego_id,
        type: lego.type,
        target: lego.target_text,
        known: lego.known_text,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos,
      introduction_phrases: [], // Introduction phrases are now part of LEGOs
      expanded: false,
    };
  });
};

// Legacy transform function for manifest format (kept for backwards compatibility)
const transformManifestToSeeds = (manifest: any): SeedRowData[] => {
  if (!manifest || !manifest.seeds) return [];

  return manifest.seeds.map((seed: any) => {
    // Extract introduction cycles (type === 'introduction')
    const introductionCycles = seed.cycles?.filter((c: any) => c.type === 'introduction') || [];
    const introduction_phrases: PhraseRowData[] = introductionCycles.map((cycle: any, idx: number) => ({
      phrase_id: cycle.uuid,
      type: 'ETER' as any,
      known_text: cycle.known,
      target_text: cycle.target,
      known_audio: {
        uuid: cycle.known_audio_uuid,
        text: cycle.known,
        role: 'source' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      target_audio_1: {
        uuid: cycle.target_audio_uuid,
        text: cycle.target,
        role: 'target' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      is_flagged: false,
      seed_id: seed.seed_id,
      cycle_index: idx,
    }));

    // Build legos with their phrases
    const legos = (seed.legos || []).map((lego: any) => {
      // Get all cycles for this lego
      const legoCycles = seed.cycles?.filter((c: any) => c.lego_id === lego.id) || [];

      const phrases: PhraseRowData[] = legoCycles.map((cycle: any, idx: number) => {
        // Determine phrase type based on cycle type
        let phraseType = 'PRAC';
        if (cycle.type === 'lego_component') phraseType = 'COMP';
        else if (cycle.type === 'lego_debut') phraseType = 'DEBU';

        return {
          phrase_id: cycle.uuid,
          type: phraseType as any,
          known_text: cycle.known,
          target_text: cycle.target,
          known_audio: {
            uuid: cycle.known_audio_uuid,
            text: cycle.known,
            role: 'source' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          target_audio_1: {
            uuid: cycle.target_audio_uuid,
            text: cycle.target,
            role: 'target' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          is_flagged: false,
          seed_id: seed.seed_id,
          cycle_index: idx,
          is_debut: cycle.context?.is_debut,
          is_component: cycle.context?.is_component,
        };
      });

      return {
        lego_id: lego.id,
        type: lego.type,
        target: lego.target,
        known: lego.known,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.seed_pair[1], // second element is known
      target_text: seed.seed_pair[0], // first element is target
      legos,
      introduction_phrases,
      expanded: false,
    };
  });
};

const closePlaybackBar = () => {
  currentPlayingSample.value = null;
};

const onPlaybackEnded = () => {
  // Keep playback bar visible after audio ends
  // User can manually close it
};

const onPlaybackError = (error: Error) => {
  console.error('Playback error:', error);
  // TODO: Show error toast
};

// Phrase Edit Modal Methods
const closePhraseEditModal = () => {
  phraseEditModalVisible.value = false;
  phraseToEdit.value = null;
};

// RegenFlags type for per-audio regeneration
interface RegenFlags {
  known: boolean;
  target1: boolean;
  target2: boolean;
}

// Fetch a signed audition URL for a freshly-minted audio uuid (verbatim
// reuse of the savePresentationAndRegen audition snippet, ~2382-2395).
const fetchAuditionUrl = async (audioUuid: string): Promise<string | null> => {
  try {
    const urlResp = await fetch(
      `${getApiBaseUrl()}/api/production/${courseCode.value}/audio/${audioUuid}/url`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (urlResp.ok) {
      const urlData = await urlResp.json();
      return urlData.url || null;
    }
  } catch (e) {
    // Non-fatal: regen succeeded, just couldn't fetch the audition URL
  }
  return null;
};

const savePhraseEdit = async (data: { known_text: string; target_text: string; regen_flags: RegenFlags }) => {
  if (!phraseToEdit.value) return;

  // LEGO text (course_legos) is NOT editable — editing is for phrases only.
  // Blocked path: even if 'lego' mode is somehow reached, never PATCH LEGO text.
  if (phraseEditMode.value === 'lego') {
    console.warn('LEGO text editing is disallowed — only phrases are editable.');
    phraseEditModalRef.value?.onSaveComplete(false, 'LEGO text is not editable.');
    return;
  }

  try {
    // Save phrase text changes (course_practice_phrases).
    // (LEGO/intro narration never reaches the regenerate-phrase path — D4 sends
    //  intro/component_intro narration edits through onJourneyPresentationEdit.)
    const response = await authedFetch(
      `/api/production/${courseCode.value}/phrase/${phraseToEdit.value.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          known_text: data.known_text,
          target_text: data.target_text,
        })
      }
    );

    if (!response.ok) throw new Error('Failed to save phrase');

    // Update local text state immediately
    const phraseId = phraseToEdit.value.id;
    const applyLocalText = () => {
      seeds.value.forEach(seed => {
        seed.legos.forEach(lego => {
          const phrase = lego.phrases.find(p => p.phrase_id === phraseId);
          if (phrase) {
            phrase.known_text = data.known_text;
            phrase.target_text = data.target_text;
          }
        });
      });
      if (phraseToEdit.value?.sourceItem) {
        phraseToEdit.value.sourceItem.known_text = data.known_text;
        phraseToEdit.value.sourceItem.target_text = data.target_text;
      }
    };
    applyLocalText();

    // ── Phrase mode: OPTIMISTIC auto-approved regen of ONLY the changed role(s) (D2) ──
    // A known_text edit → ['known']; a target_text edit → ['target1','target2']
    // (two voices of the same target text). We honour the modal's checkboxes,
    // which default to the changed role(s).
    const roles: Array<'known' | 'target1' | 'target2'> = [];
    if (data.regen_flags.known && phraseToEdit.value.known_audio_uuid) roles.push('known');
    if (data.regen_flags.target1 && phraseToEdit.value.target1_audio_uuid) roles.push('target1');
    if (data.regen_flags.target2 && phraseToEdit.value.target2_audio_uuid) roles.push('target2');

    // No roles selected → text-only save, no TTS cost. Done.
    // applyLocalText() updated the edited row instantly; the silent refresh
    // trues up review copies in other rounds (scroll preserved).
    if (roles.length === 0) {
      phraseEditModalRef.value?.onSaveComplete(true);
      if (viewMode.value === 'journey') refreshJourneyInPlace();
      return;
    }

    // Tell the modal which roles are regenerating (inline audition spinners)
    phraseEditModalRef.value?.beginAudition(roles);
    phraseEditModalRef.value?.onSaveComplete(true);

    // Admin-only endpoint (it costs TTS, D3). TTSes the NEW text, mints a fresh
    // UUID/S3 key per role, rebinds the phrase pointer, returns fresh *_audio_id.
    // CRITICAL: a TEXT edit must use regenerate-PHRASE, never regenerate-single
    // (which re-reads stale course_audio.text → audio/text desync).
    const regenResp = await authedFetch(
      `/api/audio/regenerate-phrase/${courseCode.value}/${encodeURIComponent(phraseId)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          known_text: data.known_text,
          target_text: data.target_text,
          roles,
        }),
      }
    );

    if (!regenResp.ok) {
      const errBody = await regenResp.json().catch(() => ({}));
      const msg = errBody.error || `Regeneration failed (${regenResp.status})`;
      roles.forEach(r => phraseEditModalRef.value?.setAuditionError(r, msg));
      throw new Error(msg);
    }

    // Response: { known_audio_id, target1_audio_id, target2_audio_id, durations:{role:ms} }
    // Only regenerated roles carry fresh ids; HTTP 200 == success (no `success` field).
    const result = await regenResp.json();
    const REGEN_FIELDS = {
      known: { column: 'known_audio_id', uuidField: 'known_audio_uuid' },
      target1: { column: 'target1_audio_id', uuidField: 'target1_audio_uuid' },
      target2: { column: 'target2_audio_id', uuidField: 'target2_audio_uuid' },
    } as const;

    // Rebind the live row's *_audio_uuid pointers + audition each regenerated role.
    for (const role of roles) {
      const { column, uuidField } = REGEN_FIELDS[role];
      const newUuid: string | null = result[column] ?? null;

      // Rebind on the modal's working copy + the live source item (journey/seed row)
      if (phraseToEdit.value) (phraseToEdit.value as any)[uuidField] = newUuid;
      if (phraseToEdit.value?.sourceItem) phraseToEdit.value.sourceItem[uuidField] = newUuid;

      const durationMs: number | null = result.durations?.[role] ?? null;
      if (newUuid) {
        // The upsert on the audio table can land on the SAME row id when the
        // regenerated text/voice key is unchanged (writes a fresh s3_key in
        // place) — the round player's resolvedUrlCache would otherwise keep
        // serving the pre-regen object for its 5-minute TTL.
        learningJourneyRef.value?.player?.forgetAudioUrl(newUuid);
        const url = await fetchAuditionUrl(newUuid);
        phraseEditModalRef.value?.setAuditionResult(role, { url, durationMs });
      } else {
        phraseEditModalRef.value?.setAuditionError(role, 'No audio returned for this role');
      }
    }

    console.log(`Regenerated phrase ${phraseId} roles [${roles.join(', ')}] → fresh audio`);

    // The edited row was rebound in place above for instant feedback, but the
    // 4-phase player reads allItems (separate objects) and review copies of
    // this phrase live in other rounds — silent refresh trues those up without
    // losing the editor's scroll spot.
    if (viewMode.value === 'journey') refreshJourneyInPlace();
  } catch (err) {
    console.error('Error saving phrase:', err);
    phraseEditModalRef.value?.onSaveComplete(false, err instanceof Error ? err.message : 'Save failed');
  }
};

// Journey view: item edit handler
const onJourneyItemEdit = (item: any) => {
  // D4: intro / component_intro narration is NOT phrase-role audio — it lives in
  // course_audio as a presentation clip. Route those edits through the dedicated
  // presentation path (regenerate-presentation), never regenerate-phrase.
  if (item.type === 'intro' || item.type === 'component_intro') {
    onJourneyPresentationEdit(item);
    return;
  }

  // LEGO text (the 'debut' item, stored in course_legos) is NOT editable —
  // editing is for phrases only. Block the edit modal for LEGO-text items.
  if (item.type === 'debut') return;

  phraseEditMode.value = 'phrase';
  phraseToEdit.value = {
    id: item.phrase_id,
    known_text: item.known_text,
    target_text: item.target_text,
    known_audio_uuid: item.known_audio_uuid,
    target1_audio_uuid: item.target1_audio_uuid,
    target2_audio_uuid: item.target2_audio_uuid,
    // Keep a handle on the live journey row so regen can rebind its audio
    // pointers in-place (reactive) without waiting for a full reload.
    sourceItem: item,
  };
  phraseEditModalVisible.value = true;
};

// =========================================================================
// Presentation (intro narration) edit + surgical per-LEGO regen
// =========================================================================
const presentationModalVisible = ref(false);
const presentationLegoId = ref<string>('');
const presentationKnownText = ref<string>('');
const presentationTargetText = ref<string>('');
const presentationText = ref<string>('');
const presentationLoading = ref(false);
const presentationBusy = ref(false);
const presentationError = ref<string | null>(null);
const presentationResult = ref<{ audio_id: string; duration_ms: number; created: boolean } | null>(null);
const presentationAudioUrl = ref<string | null>(null);
// True when nothing is stored for this LEGO and the box holds a suggested draft.
const presentationIsSuggested = ref(false);

const onJourneyPresentationEdit = async (item: any) => {
  const legoId = item.legoId || item.lego_id;
  if (!legoId) return;
  presentationLegoId.value = legoId;
  presentationKnownText.value = item.known_text || '';
  presentationTargetText.value = item.target_text || '';
  presentationText.value = '';
  presentationIsSuggested.value = false;
  presentationError.value = null;
  presentationResult.value = null;
  presentationAudioUrl.value = null;
  presentationModalVisible.value = true;
  presentationLoading.value = true;

  // Fetch the current authoritative presentation text (course_audio.text)
  try {
    const apiBaseUrl = getApiBaseUrl();
    const resp = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/presentation/${encodeURIComponent(legoId)}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      presentationText.value = data.text || '';
      presentationIsSuggested.value = !!data.is_suggested;
    }
  } catch (err) {
    console.error('Failed to load presentation text:', err);
  } finally {
    presentationLoading.value = false;
  }
};

const closePresentationModal = () => {
  presentationModalVisible.value = false;
};

const savePresentationAndRegen = async () => {
  if (presentationBusy.value || !presentationText.value.trim()) return;
  presentationBusy.value = true;
  presentationError.value = null;
  presentationResult.value = null;
  presentationAudioUrl.value = null;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const resp = await fetch(
      `${apiBaseUrl}/api/audio/regenerate-presentation/${courseCode.value}/${encodeURIComponent(presentationLegoId.value)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ text: presentationText.value.trim() }),
      }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Regeneration failed (${resp.status})`);
    }
    const result = await resp.json();
    presentationResult.value = {
      audio_id: result.audio_id,
      duration_ms: result.duration_ms,
      created: !!result.created,
    };

    // Fetch a signed URL so the reviewer can audition the fresh clip
    if (result.audio_id) {
      try {
        const urlResp = await fetch(
          `${apiBaseUrl}/api/production/${courseCode.value}/audio/${result.audio_id}/url`,
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        );
        if (urlResp.ok) {
          const urlData = await urlResp.json();
          presentationAudioUrl.value = urlData.url || null;
        }
      } catch (e) {
        // Non-fatal: regen succeeded, just couldn't fetch audition URL
      }
    }

    console.log(`Regenerated presentation for ${presentationLegoId.value} → audio ${result.audio_id} (${result.duration_ms}ms)`);
    // The presentation row is keyed by lego_id, so a regen usually lands on the
    // SAME audio id with a fresh s3_key — drop any cached URL before reload.
    if (result.audio_id) learningJourneyRef.value?.player?.forgetAudioUrl(result.audio_id);
    // Refresh the journey so the intro item picks up the new audio
    reloadLearningJourney();
  } catch (err) {
    console.error('Presentation regen failed:', err);
    presentationError.value = err instanceof Error ? err.message : 'Regeneration failed';
  } finally {
    presentationBusy.value = false;
  }
};

// =========================================================================
// LEGO (debut) AUDIO regen — the LEGO TEXT IS LOCKED
// =========================================================================
// Tom's ruling 2026-08-07: "we must NOT allow people to edit the lego TEXT —
// we have done this before - we just add the punctuation to the TTS job, not to
// the canonical LEGO text". This dialog therefore shows the canonical text
// read-only and sends any punctuation variant as tts_* SPOKEN text only.
const legoAudioModalVisible = ref(false);
const legoAudioLegoId = ref<string>('');
const legoAudioKnownText = ref<string>('');
const legoAudioTargetText = ref<string>('');
const legoSpokenKnown = ref<string>('');
const legoSpokenTarget = ref<string>('');
const legoRegenFlags = ref({ known: false, target1: true, target2: true });
const legoAudioBusy = ref(false);
const legoAudioError = ref<string | null>(null);
// Not an error: the server deliberately declined a role (a human recording is
// precious, or the whole course is human-voiced). Said in plain words, in its
// own panel — a red box read as "the regeneration broke".
const legoAudioNotice = ref<string | null>(null);
const legoAudioResults = ref<Array<{ role: string; label: string; durationMs: number | null; url: string | null; spoken: string }>>([]);
const legoAudioSourceItem = ref<any>(null);

// The point of the feature: one-tap variants for an A/B by ear.
const punctuationVariants = [
  { label: '.', title: 'Append a full stop', suffix: '.' },
  { label: ',', title: 'Append a comma', suffix: ',' },
  { label: '…', title: 'Append an ellipsis', suffix: '…' },
  { label: '… before', title: 'Prepend an ellipsis', prefix: '… ' },
];

const applyPunctuation = (side: 'known' | 'target', v: { suffix?: string; prefix?: string }) => {
  const ref_ = side === 'known' ? legoSpokenKnown : legoSpokenTarget;
  let text = ref_.value || '';
  if (v.prefix) text = v.prefix + text;
  if (v.suffix) text = text + v.suffix;
  ref_.value = text;
};

const legoSelectedRoles = computed(() =>
  (['known', 'target1', 'target2'] as const).filter(r => legoRegenFlags.value[r])
);

const onJourneyLegoAudioEdit = (item: any) => {
  const legoId = item.legoId || item.lego_id;
  if (!legoId) return;
  legoAudioLegoId.value = legoId;
  legoAudioKnownText.value = item.known_text || '';
  legoAudioTargetText.value = item.target_text || '';
  legoSpokenKnown.value = item.known_text || '';
  legoSpokenTarget.value = item.target_text || '';
  legoRegenFlags.value = { known: false, target1: true, target2: true };
  legoAudioError.value = null;
  legoAudioNotice.value = null;
  legoAudioResults.value = [];
  legoAudioSourceItem.value = item;
  legoAudioModalVisible.value = true;
};

const closeLegoAudioModal = () => {
  legoAudioModalVisible.value = false;
};

// A LEGO's own clips (known / Voice 1 / Voice 2) are carried by its intro and
// debut rows, and the same LEGO is rendered from several separate arrays:
// the paginated rounds, the paginated allItems the player reads, and — when a
// search is active — the search rounds and search allItems. They are distinct
// objects, so a new clip has to be written into all of them for auto-accept to
// mean anything on screen. Phrase rows carry their own clips and are left alone.
const rebindLegoAudioEverywhere = (legoId: string, uuidField: string, audioId: string) => {
  const lists: any[][] = [
    learningJourneyData.value?.allItems || [],
    journeySearchAllItems.value || [],
    ...(learningJourneyData.value?.rounds || []).map((r: any) => r.items || []),
    ...(journeySearchResults.value || []).map((r: any) => r.items || []),
  ];
  for (const items of lists) {
    for (const item of items) {
      if (item?.legoId !== legoId) continue;
      if (item.type !== 'intro' && item.type !== 'debut') continue;
      item[uuidField] = audioId;
    }
  }
};

const regenerateLegoAudio = async () => {
  const roles = legoSelectedRoles.value;
  if (legoAudioBusy.value || !roles.length) return;
  legoAudioBusy.value = true;
  legoAudioError.value = null;
  legoAudioNotice.value = null;
  legoAudioResults.value = [];

  const ROLE_LABEL: Record<string, string> = { known: 'Known', target1: 'Voice 1', target2: 'Voice 2' };
  const apiBaseUrl = getApiBaseUrl();

  try {
    const resp = await fetch(
      `${apiBaseUrl}/api/audio/regenerate-lego/${courseCode.value}/${encodeURIComponent(legoAudioLegoId.value)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          roles,
          tts_known_text: legoSpokenKnown.value,
          tts_target_text: legoSpokenTarget.value,
        }),
      }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Regeneration failed (${resp.status})`);
    }
    const result = await resp.json();
    if (result.skipped) {
      legoAudioNotice.value = result.reason === 'human-voice-only-course'
        ? 'Nothing regenerated: this course is voiced by people, so it never gets TTS.'
        : `Nothing regenerated: ${result.reason}.`;
      return;
    }

    const COLUMN: Record<string, string> = {
      known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id',
    };
    const UUID_FIELD: Record<string, string> = {
      known: 'known_audio_uuid', target1: 'target1_audio_uuid', target2: 'target2_audio_uuid',
    };

    for (const role of roles) {
      const audioId = result[COLUMN[role]];
      // AUTO-ACCEPT: the new clip IS the LEGO's clip the moment it renders, so
      // every loaded copy of that LEGO's row moves with it, immediately — the
      // row under the dialog, the intro row above it, the 4-phase player's
      // allItems, and the search arrays when a search is what's on screen.
      // Rebinding only legoAudioSourceItem left every other copy on the old
      // clip until (or unless) a re-fetch landed.
      if (audioId) {
        rebindLegoAudioEverywhere(legoAudioLegoId.value, UUID_FIELD[role], audioId);
        if (legoAudioSourceItem.value) legoAudioSourceItem.value[UUID_FIELD[role]] = audioId;
        // Text is locked for LEGO regen, so the upsert key is usually unchanged
        // and lands on the SAME audio row with a fresh s3_key — drop any cached
        // URL so the round player re-resolves instead of riding out the TTL.
        learningJourneyRef.value?.player?.forgetAudioUrl(audioId);
      }
      let url: string | null = null;
      if (audioId) {
        try {
          const urlResp = await fetch(
            `${apiBaseUrl}/api/production/${courseCode.value}/audio/${audioId}/url`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          if (urlResp.ok) url = (await urlResp.json()).url || null;
        } catch (e) { /* non-fatal: regen succeeded */ }
      }
      legoAudioResults.value.push({
        role,
        label: ROLE_LABEL[role],
        durationMs: result.durations?.[role] ?? null,
        url,
        spoken: result.spoken?.[role] ?? (role === 'known' ? legoSpokenKnown.value : legoSpokenTarget.value),
      });
    }

    if (result.skipped_human?.length) {
      const kept = result.skipped_human
        .map((r: string) => ({ known: 'Known', target1: 'Voice 1', target2: 'Voice 2' } as any)[r] || r)
        .join(', ');
      legoAudioNotice.value = `${kept}: kept the human recording — it is precious, so no TTS was written and that clip is unchanged.`;
    }

    // True up the journey (other rows referencing this LEGO's clips).
    if (viewMode.value === 'journey') refreshJourneyInPlace();
  } catch (err) {
    console.error('LEGO audio regen failed:', err);
    legoAudioError.value = err instanceof Error ? err.message : 'Regeneration failed';
  } finally {
    legoAudioBusy.value = false;
  }
};

// Journey view: phrase flagging for deletion
const journeyFlaggedPhraseIds = ref<Set<string>>(new Set());
const showJourneyDeleteStep = ref(0); // 0=hidden, 1=review list, 2=final confirm
const isDeletingJourneyPhrases = ref(false);

const onJourneyPhraseFlag = (item: any) => {
  if (!item.phrase_id) return;
  const newSet = new Set(journeyFlaggedPhraseIds.value);
  if (newSet.has(item.phrase_id)) {
    newSet.delete(item.phrase_id);
  } else {
    newSet.add(item.phrase_id);
  }
  journeyFlaggedPhraseIds.value = newSet;
};

// Build details for the review modal from allItems.
//
// ONE ROW PER PHRASE, not per appearance. A phrase legitimately appears many
// times across the journey — reviewed at every Fibonacci offset, and since
// 2026-08-08 played twice back to back in every Easy round — but this modal
// lists what you are about to DELETE, and a phrase is deleted once. It is also
// keyed by phrase_id in the template, so duplicates were duplicate Vue keys.
const journeyFlaggedPhraseDetails = computed(() => {
  if (!learningJourneyData.value?.allItems) return [];
  const byId = new Map<string, any>();
  for (const item of learningJourneyData.value.allItems as any[]) {
    if (!item.phrase_id || byId.has(item.phrase_id)) continue;
    if (!journeyFlaggedPhraseIds.value.has(item.phrase_id)) continue;
    byId.set(item.phrase_id, {
      phrase_id: item.phrase_id, known_text: item.known_text, target_text: item.target_text,
    });
  }
  return [...byId.values()];
});

const onRemoveJourneyFlaggedPhrase = (phraseId: string) => {
  const newSet = new Set(journeyFlaggedPhraseIds.value);
  newSet.delete(phraseId);
  journeyFlaggedPhraseIds.value = newSet;
  if (newSet.size === 0) showJourneyDeleteStep.value = 0;
};

const handleJourneyBatchDelete = async () => {
  if (journeyFlaggedPhraseIds.value.size === 0) return;
  isDeletingJourneyPhrases.value = true;
  const apiBaseUrl = getApiBaseUrl();
  try {
    const phraseIds = Array.from(journeyFlaggedPhraseIds.value);
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrases/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phraseIds }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete phrases');
    }
    console.log(`Successfully deleted ${phraseIds.length} phrases from journey view`);
    journeyFlaggedPhraseIds.value = new Set();
    showJourneyDeleteStep.value = 0;
    reloadLearningJourney();
  } catch (err) {
    console.error('Failed to delete phrases:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete phrases';
  } finally {
    isDeletingJourneyPhrases.value = false;
  }
};

// Keyboard event handler
const handleKeydown = (event: KeyboardEvent) => {
  // Ignore if typing in input field
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (event.key) {
    case '?':
      event.preventDefault();
      showShortcutsHelp.value = !showShortcutsHelp.value;
      break;
    case 'Escape':
      event.preventDefault();
      closePhraseEditModal();
      showShortcutsHelp.value = false;
      break;
  }
};

// Derive the default seed window from the course's ACTUAL seed range instead
// of assuming the canonical S0001–S0050. Small community courses get their
// full range (no fetches for seeds that don't exist); courses larger than the
// performance window keep the first DEFAULT_SEED_WINDOW seeds.
const initDefaultSeedRange = async () => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/stats/${courseCode.value}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return;
    const data = await res.json();
    const total = parseInt(data.total_seeds, 10) || 0;
    if (total > 0) {
      totalSeedsInCourse.value = total;
      filterSeedEnd.value = formatSeedNum(Math.min(total, DEFAULT_SEED_WINDOW));
    }
  } catch {
    // Stats unavailable — keep the placeholder window
  }
};

// Lifecycle
onMounted(async () => {
  // Script View is the learner-order (journey) view only — the old seed-order
  // mode was retired 2026-06-19 (authoring lives in Text Generation). All
  // legacy ?view=* links resolve to the journey.
  viewMode.value = 'journey';
  const journeyLoaded = loadLearningJourney();
  window.addEventListener('keydown', handleKeydown);
  await initDefaultSeedRange();
  loadCourseData();

  // Deep link: ?round=N jumps to (and highlights) that round once loaded.
  const initialRound = parseInt(String(route.query.round || ''), 10);
  if (initialRound > 0) {
    await journeyLoaded;
    await jumpToRound(initialRound);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Slide-up transition for playback bar */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Custom scrollbar for script content */
.script-content::-webkit-scrollbar {
  width: 8px;
}

.script-content::-webkit-scrollbar-track {
  background: var(--surface); /* slate-800 */
}

.script-content::-webkit-scrollbar-thumb {
  background: var(--surface-3); /* slate-600 */
  border-radius: 4px;
}

.script-content::-webkit-scrollbar-thumb:hover {
  background: var(--faint); /* slate-500 */
}

/*
 * Light-mode legibility overrides.
 * The pale Tailwind palette shades below are tuned for the dark canvas; on the
 * light theme they sit on white/slate-50 surfaces and fall well under WCAG AA
 * (e.g. emerald-400 1.75:1, amber-400 1.67:1, red-400 2.77:1, blue-300 1.44:1).
 * Darken to the ~600/700 shade of the SAME hue so the status colour identity is
 * preserved while text/icons become legible. Scoped to [data-theme="light"] so
 * dark mode is completely untouched. Only applies to elements in THIS component
 * (scoped style attribute), so the pale-on-dark-fill chips elsewhere are safe.
 */
:root[data-theme="light"] .text-emerald-400 { color: #047857; } /* emerald-700 */
:root[data-theme="light"] .text-amber-400 { color: #b45309; }   /* amber-700 */
:root[data-theme="light"] .text-red-400 { color: #dc2626; }     /* red-600 */
:root[data-theme="light"] .text-blue-400 { color: #2563eb; }    /* blue-600 */
:root[data-theme="light"] .text-blue-300 { color: #1d4ed8; }    /* blue-700 */
:root[data-theme="light"] .text-purple-400 { color: #7c3aed; }  /* violet-600 */
:root[data-theme="light"] .hover\:text-emerald-400:hover { color: #047857; }
:root[data-theme="light"] .hover\:text-red-400:hover { color: #dc2626; }

/* Performance-notice panel: blue-500 @ 10% over the light canvas is barely
 * tinted (#dce7f6) and its border vanishes. Give it a readable light-blue fill
 * and a visible border so the panel separates. */
:root[data-theme="light"] .performance-notice {
  background-color: #eff6ff; /* blue-50 */
  border-color: #93c5fd;     /* blue-300 */
}
</style>
